export interface SstLaravelRuntimeContext {
  sst: unknown;
  app: {
    name: string;
    stage: string;
  };
  projectRoot?: string;
  packageRoot?: string;
}

export interface LoadedSstLaravel {
  LaravelService: new (name: string, args: Record<string, unknown>, opts?: Record<string, unknown>) => {
    url: unknown;
    reverbUrl?: unknown;
  };
  RemoteEnvVault: new (name: string, args?: Record<string, unknown>, opts?: Record<string, unknown>) => {
    path: unknown;
  };
}

export function loadSstLaravel(context: SstLaravelRuntimeContext): Promise<LoadedSstLaravel>;

export function buildSstLaravelRuntimeUrl(options?: {
  projectRoot?: string;
  packageRoot?: string;
}): string;

export function loadSitepulseSstEnv(options?: {
  projectRoot?: string;
}): void;

export interface SitepulseAppConfigContext {
  appName?: string;
  projectRoot?: string;
}

export interface SitepulseDeploymentConfigContext {
  sst: {
    cloudflare: {
      dns(args: Record<string, unknown>): unknown;
    };
  };
  projectRoot?: string;
}

export interface SitepulseDeploymentConfig {
  webDomain?: string;
  reverbDomain?: string;
  reverbEnabled: boolean;
  web: {
    domain: unknown;
  };
  reverb: {
    domain: unknown;
  };
  urls(app: { url: unknown }): {
    url: unknown;
    reverbUrl?: unknown;
  };
}

export function sitepulseAppConfig(context?: SitepulseAppConfigContext): unknown;

export function sitepulseDeploymentConfig(context: SitepulseDeploymentConfigContext): SitepulseDeploymentConfig;
