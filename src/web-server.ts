export interface WebServerEnvironmentOptions {
  /**
   * Whether the nginx access logs should keep streaming to CloudWatch.
   *
   * @default true
   */
  accessLogs?: boolean;
}

/**
 * Builds the web-server-specific container environment overrides derived from
 * the web service options.
 *
 * Setting `accessLogs` to `false` points the serversideup `NGINX_ACCESS_LOG`
 * variable at `/dev/null`, which silences the nginx access logs (including the
 * load balancer health-check pings) while leaving the error logs untouched.
 */
export function buildWebServerEnvironment({
  accessLogs,
}: WebServerEnvironmentOptions): Record<string, string> {
  if (accessLogs === false) {
    return { NGINX_ACCESS_LOG: '/dev/null' };
  }

  return {};
}
