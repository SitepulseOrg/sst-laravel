export type Port = `${number}/${'http' | 'https' | 'tcp' | 'udp' | 'tcp_udp' | 'tls'}`;

export type Ports = {
  listen: Port;
  forward?: Port;
  redirect?: Port;
}[];

export interface DefaultPublicPortsOptions {
  /**
   * Whether a custom domain (and therefore an HTTPS listener) is configured.
   */
  hasDomain: boolean;

  /**
   * Container port the load balancer forwards application traffic to.
   *
   * @default 8080
   */
  forwardPort?: number;

  /**
   * When a domain is configured, redirect the HTTP (port 80) listener to the
   * HTTPS (port 443) listener instead of forwarding it to the application.
   * Ignored when no domain is configured, since there is no HTTPS listener to
   * redirect to.
   *
   * @default true
   */
  httpsRedirect?: boolean;
}

/**
 * Builds the default load balancer port mapping for a public service.
 *
 * Without a domain, only an HTTP listener is created (forwarding to the app).
 * With a domain, both HTTP and HTTPS listeners are created; the HTTP listener
 * redirects to HTTPS by default, or forwards to the app when
 * `httpsRedirect` is disabled.
 */
export function buildDefaultPublicPorts({
  hasDomain,
  forwardPort = 8080,
  httpsRedirect = true,
}: DefaultPublicPortsOptions): Ports {
  const forward: Port = `${forwardPort}/http`;
  const portHttp: Port = '80/http';
  const portHttps: Port = '443/https';

  if (!hasDomain) {
    return [{ listen: portHttp, forward }];
  }

  return [
    httpsRedirect
      ? { listen: portHttp, redirect: portHttps }
      : { listen: portHttp, forward },
    { listen: portHttps, forward },
  ];
}
