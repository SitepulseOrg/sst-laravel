import { describe, expect, it } from 'vitest';
import { buildDefaultPublicPorts } from '../src/load-balancer';

describe('buildDefaultPublicPorts', () => {
  it('forwards HTTP straight to the app when no domain is configured', () => {
    expect(buildDefaultPublicPorts({ hasDomain: false })).toEqual([
      { listen: '80/http', forward: '8080/http' },
    ]);
  });

  it('redirects HTTP to HTTPS by default when a domain is configured', () => {
    expect(buildDefaultPublicPorts({ hasDomain: true })).toEqual([
      { listen: '80/http', redirect: '443/https' },
      { listen: '443/https', forward: '8080/http' },
    ]);
  });

  it('forwards HTTP to the app when the HTTPS redirect is disabled', () => {
    expect(
      buildDefaultPublicPorts({ hasDomain: true, httpsRedirect: false }),
    ).toEqual([
      { listen: '80/http', forward: '8080/http' },
      { listen: '443/https', forward: '8080/http' },
    ]);
  });

  it('uses the provided forward port for both listeners', () => {
    expect(
      buildDefaultPublicPorts({ hasDomain: true, forwardPort: 9000 }),
    ).toEqual([
      { listen: '80/http', redirect: '443/https' },
      { listen: '443/https', forward: '9000/http' },
    ]);
  });

  it('ignores the HTTPS redirect when no domain is configured', () => {
    expect(
      buildDefaultPublicPorts({ hasDomain: false, httpsRedirect: true }),
    ).toEqual([{ listen: '80/http', forward: '8080/http' }]);
  });
});
