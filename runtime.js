import { execFileSync } from 'child_process';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const packageRootFromRuntime = path.dirname(fileURLToPath(import.meta.url));
const cloudflareDnsProvider = 'cloudflare';
const manualDnsProvider = 'manual';
const sitepulseSstEnvKeys = [
  'SITEPULSE_DOMAIN',
  'SITEPULSE_REVERB_DOMAIN',
  'SITEPULSE_DNS_PROVIDER',
  'SITEPULSE_CERT_ARN',
  'SITEPULSE_REVERB_CERT_ARN',
  'SITEPULSE_REVERB_ENABLED',
  'SITEPULSE_ALLOW_PRODUCTION_DESTROY',
  'SITEPULSE_CLOUDFLARE_PROXY',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ZONE_ID',
  'CLOUDFLARE_DEFAULT_ACCOUNT_ID',
];

export async function loadSstLaravel({
  sst,
  app,
  projectRoot = process.cwd(),
  packageRoot,
} = {}) {
  if (!sst) {
    throw new Error('loadSstLaravel requires the SST global: loadSstLaravel({ sst, app: $app }).');
  }

  if (!app) {
    throw new Error('loadSstLaravel requires the SST app global: loadSstLaravel({ sst, app: $app }).');
  }

  globalThis.sst = sst;
  globalThis.$app = app;

  const runtimeUrl = buildSstLaravelRuntimeUrl({ projectRoot, packageRoot });
  const module = await import(runtimeUrl);
  const exports = module.LaravelService ? module : module.default;

  if (!exports?.LaravelService || !exports?.RemoteEnvVault) {
    throw new Error('Unable to load LaravelService and RemoteEnvVault from the SST Laravel runtime.');
  }

  return {
    LaravelService: exports.LaravelService,
    RemoteEnvVault: exports.RemoteEnvVault,
  };
}

export function buildSstLaravelRuntimeUrl({
  projectRoot = process.cwd(),
  packageRoot,
} = {}) {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const resolvedPackageRoot = path.resolve(packageRoot ?? resolvePackageRoot(resolvedProjectRoot));
  const sourcePath = path.join(resolvedPackageRoot, 'laravel-sst.ts');
  const outputPath = path.resolve(resolvedProjectRoot, '.sst/platform/sst-laravel-runtime.cjs');
  const esbuildPath = path.resolve(resolvedProjectRoot, '.sst/platform/node_modules/esbuild/bin/esbuild');
  const outputUrl = pathToFileURL(outputPath).href;

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Unable to find SST Laravel component source at ${sourcePath}. Run pnpm install first.`);
  }

  if (!fs.existsSync(esbuildPath)) {
    throw new Error(`Unable to find SST's esbuild binary at ${esbuildPath}. Run pnpm exec sst-laravel install first.`);
  }

  ensurePackageSstLink(resolvedProjectRoot, resolvedPackageRoot);

  try {
    execFileSync(esbuildPath, [
      sourcePath,
      '--bundle',
      '--platform=node',
      '--format=cjs',
      '--packages=external',
      `--outfile=${outputPath}`,
    ], {
      cwd: resolvedProjectRoot,
      stdio: 'pipe',
    });
  } catch (error) {
    const stderr = error.stderr?.toString().trim();

    throw new Error(
      stderr
        ? `Failed to build the SST Laravel runtime:\n${stderr}`
        : `Failed to build the SST Laravel runtime: ${error.message}`,
    );
  }

  fs.writeFileSync(
    outputPath,
    fs.readFileSync(outputPath, 'utf8').replace('var import_meta = {};', `var import_meta = { url: ${JSON.stringify(outputUrl)} };`),
  );

  process.env.SST_LARAVEL_PACKAGE_ROOT = resolvedPackageRoot;

  return outputUrl;
}

export function loadSitepulseSstEnv({ projectRoot = process.cwd() } = {}) {
  for (const key of sitepulseSstEnvKeys) {
    delete process.env[key];
  }

  try {
    process.loadEnvFile(path.resolve(projectRoot, '.env.sst'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export function sitepulseAppConfig({ appName = 'sitepulse', projectRoot = process.cwd() } = {}) {
  loadSitepulseSstEnv({ projectRoot });

  const allowDestroy = process.env.SITEPULSE_ALLOW_PRODUCTION_DESTROY === 'true';
  const providers = {
    aws: {
      profile: process.env.AWS_PROFILE ?? 'sitepulse-sst',
      region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
    },
  };

  if (usesCloudflareDns() && process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID) {
    providers.cloudflare = {
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
    };
  }

  return {
    name: appName,
    home: 'aws',
    providers,
    removal: allowDestroy ? 'remove' : 'retain',
    protect: !allowDestroy,
  };
}

export function sitepulseDeploymentConfig({ sst, projectRoot = process.cwd() }) {
  loadSitepulseSstEnv({ projectRoot });

  const webDomain = process.env.SITEPULSE_DOMAIN;
  const reverbDomain = process.env.SITEPULSE_REVERB_DOMAIN;
  const webCertificateArn = process.env.SITEPULSE_CERT_ARN;
  const reverbCertificateArn = process.env.SITEPULSE_REVERB_CERT_ARN ?? webCertificateArn;
  const reverbEnabled = process.env.SITEPULSE_REVERB_ENABLED !== 'false' && Boolean(reverbDomain);
  const dns = cloudflareDns(sst);

  return {
    webDomain,
    reverbDomain,
    reverbEnabled,
    web: {
      domain: domainConfig(webDomain, webCertificateArn, dns),
    },
    reverb: {
      domain: domainConfig(reverbDomain, reverbCertificateArn, dns),
    },
    urls(app) {
      return {
        url: webDomain ? `https://${webDomain}` : app.url,
        reverbUrl: reverbEnabled && reverbDomain ? `https://${reverbDomain}` : undefined,
      };
    },
  };
}

function dnsProvider() {
  return process.env.SITEPULSE_DNS_PROVIDER === manualDnsProvider ? manualDnsProvider : cloudflareDnsProvider;
}

function usesCloudflareDns() {
  return dnsProvider() === cloudflareDnsProvider && Boolean(process.env.SITEPULSE_DOMAIN || process.env.SITEPULSE_REVERB_DOMAIN);
}

function cloudflareDns(sst) {
  if (!usesCloudflareDns()) {
    return undefined;
  }

  requiredEnv('CLOUDFLARE_API_TOKEN', 'so SST can call the Cloudflare API');

  return sst.cloudflare.dns({
    zone: requiredEnv('CLOUDFLARE_ZONE_ID', 'so SST can create production DNS and ACM validation records in Cloudflare'),
    accountId: requiredEnv('CLOUDFLARE_DEFAULT_ACCOUNT_ID', 'so SST can use the correct Cloudflare account'),
    proxy: process.env.SITEPULSE_CLOUDFLARE_PROXY === 'true',
  });
}

function domainConfig(domainName, certArn, dns) {
  if (!domainName) {
    return undefined;
  }

  if (dns) {
    return { name: domainName, dns };
  }

  if (!certArn) {
    throw new Error(`SITEPULSE_CERT_ARN must be set to a validated ACM certificate ARN when using SITEPULSE_DNS_PROVIDER=manual for ${domainName}.`);
  }

  return { name: domainName, dns: false, cert: certArn };
}

function requiredEnv(name, reason) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be set ${reason}.`);
  }

  return value;
}

function resolvePackageRoot(projectRoot) {
  try {
    const require = createRequire(path.join(projectRoot, 'package.json'));

    return path.dirname(require.resolve('@sitepulse/sst-laravel/runtime'));
  } catch {
    return packageRootFromRuntime;
  }
}

function ensurePackageSstLink(projectRoot, packageRoot) {
  const projectSstPath = path.resolve(projectRoot, '.sst');
  const packageSstPath = path.resolve(packageRoot, '.sst');

  if (!fs.existsSync(projectSstPath) || packageSstPath === projectSstPath) {
    return;
  }

  if (fs.existsSync(packageSstPath)) {
    const existing = fs.lstatSync(packageSstPath);

    if (
      existing.isSymbolicLink() &&
      fs.realpathSync(packageSstPath) === fs.realpathSync(projectSstPath)
    ) {
      return;
    }

    fs.rmSync(packageSstPath, { recursive: true, force: true });
  }

  fs.symlinkSync(projectSstPath, packageSstPath, 'dir');
}
