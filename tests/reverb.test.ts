import { describe, expect, it } from 'vitest';
import { buildReverbEnvironmentVariables } from '../src/reverb';

describe('buildReverbEnvironmentVariables', () => {
  it('defaults the Reverb server to the Laravel production listener', () => {
    expect(buildReverbEnvironmentVariables()).toEqual({
      REVERB_SERVER_HOST: '0.0.0.0',
      REVERB_SERVER_PORT: '8080',
    });
  });

  it('adds public Reverb routing variables when a domain is configured', () => {
    expect(buildReverbEnvironmentVariables({
      publicHost: 'ws.example.com',
    })).toEqual({
      REVERB_HOST: 'ws.example.com',
      REVERB_PORT: '443',
      REVERB_SCHEME: 'https',
      REVERB_SERVER_HOST: '0.0.0.0',
      REVERB_SERVER_PORT: '8080',
    });
  });

  it('allows the listener and public endpoint to be customized', () => {
    expect(buildReverbEnvironmentVariables({
      publicHost: 'socket.example.com',
      publicPort: 8443,
      publicScheme: 'http',
      serverHost: '127.0.0.1',
      serverPort: 9000,
    })).toEqual({
      REVERB_HOST: 'socket.example.com',
      REVERB_PORT: '8443',
      REVERB_SCHEME: 'http',
      REVERB_SERVER_HOST: '127.0.0.1',
      REVERB_SERVER_PORT: '9000',
    });
  });
});
