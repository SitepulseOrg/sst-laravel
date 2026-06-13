import { describe, expect, it } from 'vitest';
import { buildWebServerEnvironment } from '../src/web-server';

describe('buildWebServerEnvironment', () => {
  it('leaves the web server defaults untouched when no options are given', () => {
    expect(buildWebServerEnvironment({})).toEqual({});
  });

  it('keeps nginx access logs streaming when explicitly enabled', () => {
    expect(buildWebServerEnvironment({ accessLogs: true })).toEqual({});
  });

  it('silences nginx access logs when disabled', () => {
    expect(buildWebServerEnvironment({ accessLogs: false })).toEqual({
      NGINX_ACCESS_LOG: '/dev/null',
    });
  });
});
