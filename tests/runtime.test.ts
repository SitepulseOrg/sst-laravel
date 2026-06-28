import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildSstLaravelRuntimeUrl,
  loadSitepulseSstEnv,
  loadSstLaravel,
  sitepulseAppConfig,
  sitepulseDeploymentConfig,
} from '../runtime.js';

const tempRoots: string[] = [];

function makeTempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'sst-laravel-runtime-'));
  tempRoots.push(root);

  return root;
}

function makeRuntimeFixture() {
  const projectRoot = makeTempRoot();
  const packageRoot = makeTempRoot();
  const esbuildPath = join(projectRoot, '.sst/platform/node_modules/esbuild/bin/esbuild');

  mkdirSync(dirname(esbuildPath), { recursive: true });
  writeFileSync(join(packageRoot, 'laravel-sst.ts'), 'export {};\n');
  writeFileSync(
    esbuildPath,
    [
      '#!/bin/sh',
      'for arg in "$@"; do',
      '  case "$arg" in',
      '    --outfile=*) outfile="${arg#--outfile=}" ;;',
      '  esac',
      'done',
      'mkdir -p "$(dirname "$outfile")"',
      'printf "var import_meta = {};\\nmodule.exports = { LaravelService: function LaravelService() {}, RemoteEnvVault: function RemoteEnvVault() {} };\\n" > "$outfile"',
    ].join('\n'),
  );
  chmodSync(esbuildPath, 0o755);

  return { projectRoot, packageRoot };
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }

  delete process.env.SST_LARAVEL_PACKAGE_ROOT;
  delete process.env.SITEPULSE_DOMAIN;
  delete process.env.SITEPULSE_REVERB_DOMAIN;
  delete process.env.SITEPULSE_DNS_PROVIDER;
  delete process.env.SITEPULSE_CERT_ARN;
  delete process.env.SITEPULSE_REVERB_CERT_ARN;
  delete process.env.SITEPULSE_REVERB_ENABLED;
  delete process.env.SITEPULSE_ALLOW_PRODUCTION_DESTROY;
  delete process.env.SITEPULSE_CLOUDFLARE_PROXY;
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_ZONE_ID;
  delete process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID;
  delete (globalThis as Record<string, unknown>).sst;
  delete (globalThis as Record<string, unknown>).$app;
});

describe('buildSstLaravelRuntimeUrl', () => {
  it('builds the runtime in the project SST platform directory', () => {
    const { projectRoot, packageRoot } = makeRuntimeFixture();
    const runtimeUrl = buildSstLaravelRuntimeUrl({ projectRoot, packageRoot });
    const runtimePath = join(projectRoot, '.sst/platform/sst-laravel-runtime.cjs');

    expect(runtimeUrl).toBe(`file://${runtimePath}`);
    expect(existsSync(runtimePath)).toBe(true);
    expect(readFileSync(runtimePath, 'utf8')).toContain(`var import_meta = { url: ${JSON.stringify(runtimeUrl)} };`);
    expect(realpathSync(join(packageRoot, '.sst'))).toBe(realpathSync(join(projectRoot, '.sst')));
    expect(process.env.SST_LARAVEL_PACKAGE_ROOT).toBe(packageRoot);
  });
});

describe('loadSstLaravel', () => {
  it('bridges SST globals and returns the runtime exports', async () => {
    const { projectRoot, packageRoot } = makeRuntimeFixture();
    const sst = { aws: {} };
    const app = { name: 'sitepulse', stage: 'production' };
    const runtime = await loadSstLaravel({ sst, app, projectRoot, packageRoot });

    expect(globalThis.sst).toBe(sst);
    expect(globalThis.$app).toBe(app);
    expect(runtime.LaravelService.name).toBe('LaravelService');
    expect(runtime.RemoteEnvVault.name).toBe('RemoteEnvVault');
  });
});

describe('loadSitepulseSstEnv', () => {
  it('reloads Sitepulse SST variables from .env.sst', () => {
    const projectRoot = makeTempRoot();

    process.env.SITEPULSE_DOMAIN = 'stale.example.com';
    writeFileSync(join(projectRoot, '.env.sst'), [
      'SITEPULSE_DOMAIN=sitepulse.example.com',
      'SITEPULSE_REVERB_DOMAIN=reverb.example.com',
    ].join('\n'));

    loadSitepulseSstEnv({ projectRoot });

    expect(process.env.SITEPULSE_DOMAIN).toBe('sitepulse.example.com');
    expect(process.env.SITEPULSE_REVERB_DOMAIN).toBe('reverb.example.com');
  });
});

describe('sitepulseAppConfig', () => {
  it('returns the default app provider config', () => {
    expect(sitepulseAppConfig({ projectRoot: makeTempRoot() })).toEqual({
      name: 'sitepulse',
      home: 'aws',
      providers: {
        aws: {
          profile: 'sitepulse-sst',
          region: 'us-east-1',
        },
      },
      removal: 'retain',
      protect: true,
    });
  });

  it('adds Cloudflare when domain DNS is managed by Cloudflare', () => {
    const projectRoot = makeTempRoot();

    writeFileSync(join(projectRoot, '.env.sst'), [
      'SITEPULSE_DOMAIN=sitepulse.example.com',
      'CLOUDFLARE_API_TOKEN=token',
      'CLOUDFLARE_DEFAULT_ACCOUNT_ID=account',
    ].join('\n'));

    expect(sitepulseAppConfig({ projectRoot })).toMatchObject({
      providers: {
        cloudflare: {
          apiToken: 'token',
        },
      },
    });
  });
});

describe('sitepulseDeploymentConfig', () => {
  it('returns undefined domains when custom domains are not configured', () => {
    const projectRoot = makeTempRoot();
    const deployment = sitepulseDeploymentConfig({
      projectRoot,
      sst: {
        cloudflare: {
          dns: () => {
            throw new Error('Cloudflare DNS should not be created without a custom domain.');
          },
        },
      },
    });

    expect(deployment.web.domain).toBeUndefined();
    expect(deployment.reverb.domain).toBeUndefined();
    expect(deployment.reverbEnabled).toBe(false);
    expect(deployment.urls({ url: 'https://generated.example.com' })).toEqual({
      url: 'https://generated.example.com',
      reverbUrl: undefined,
    });
  });

  it('requires a certificate ARN for manually managed domains', () => {
    const projectRoot = makeTempRoot();

    writeFileSync(join(projectRoot, '.env.sst'), [
      'SITEPULSE_DOMAIN=sitepulse.example.com',
      'SITEPULSE_DNS_PROVIDER=manual',
    ].join('\n'));

    expect(() => sitepulseDeploymentConfig({ sst: { cloudflare: { dns: () => undefined } }, projectRoot })).toThrow(
      'SITEPULSE_CERT_ARN must be set',
    );
  });

  it('configures manual domains with the supplied certificate ARN', () => {
    const projectRoot = makeTempRoot();

    writeFileSync(join(projectRoot, '.env.sst'), [
      'SITEPULSE_DOMAIN=sitepulse.example.com',
      'SITEPULSE_REVERB_DOMAIN=reverb.example.com',
      'SITEPULSE_DNS_PROVIDER=manual',
      'SITEPULSE_CERT_ARN=arn:aws:acm:us-east-1:123:certificate/web',
      'SITEPULSE_REVERB_CERT_ARN=arn:aws:acm:us-east-1:123:certificate/reverb',
    ].join('\n'));

    const deployment = sitepulseDeploymentConfig({ sst: { cloudflare: { dns: () => undefined } }, projectRoot });

    expect(deployment.web.domain).toEqual({
      name: 'sitepulse.example.com',
      dns: false,
      cert: 'arn:aws:acm:us-east-1:123:certificate/web',
    });
    expect(deployment.reverb.domain).toEqual({
      name: 'reverb.example.com',
      dns: false,
      cert: 'arn:aws:acm:us-east-1:123:certificate/reverb',
    });
    expect(deployment.urls({ url: 'https://generated.example.com' })).toEqual({
      url: 'https://sitepulse.example.com',
      reverbUrl: 'https://reverb.example.com',
    });
  });

  it('configures Cloudflare domains through SST DNS', () => {
    const projectRoot = makeTempRoot();
    const dns = {};

    writeFileSync(join(projectRoot, '.env.sst'), [
      'SITEPULSE_DOMAIN=sitepulse.example.com',
      'CLOUDFLARE_API_TOKEN=token',
      'CLOUDFLARE_ZONE_ID=zone',
      'CLOUDFLARE_DEFAULT_ACCOUNT_ID=account',
      'SITEPULSE_CLOUDFLARE_PROXY=true',
    ].join('\n'));

    const deployment = sitepulseDeploymentConfig({
      projectRoot,
      sst: {
        cloudflare: {
          dns: (args: Record<string, unknown>) => {
            expect(args).toEqual({
              zone: 'zone',
              accountId: 'account',
              proxy: true,
            });

            return dns;
          },
        },
      },
    });

    expect(deployment.web.domain).toEqual({
      name: 'sitepulse.example.com',
      dns,
    });
  });
});
