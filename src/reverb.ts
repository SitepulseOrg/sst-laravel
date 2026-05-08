export interface ReverbEnvironmentOptions {
  serverHost?: string;
  serverPort?: number;
  publicHost?: string;
  publicPort?: number;
  publicScheme?: string;
}

export function buildReverbEnvironmentVariables(
  options: ReverbEnvironmentOptions = {},
): Record<string, string> {
  const vars: Record<string, string> = {
    REVERB_SERVER_HOST: options.serverHost ?? '0.0.0.0',
    REVERB_SERVER_PORT: (options.serverPort ?? 8080).toString(),
  };

  if (!options.publicHost) {
    return vars;
  }

  vars.REVERB_HOST = options.publicHost;
  vars.REVERB_PORT = (options.publicPort ?? 443).toString();
  vars.REVERB_SCHEME = options.publicScheme ?? 'https';

  return vars;
}
