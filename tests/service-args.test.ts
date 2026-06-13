import { describe, expect, it } from 'vitest';
import { buildServiceArgs } from '../src/service-args';

describe('buildServiceArgs', () => {
  it('returns an empty object when no config is given', () => {
    expect(buildServiceArgs()).toEqual({});
    expect(buildServiceArgs({})).toEqual({});
  });

  it('forwards a configured cpu and memory to the underlying service args', () => {
    expect(buildServiceArgs({ cpu: '1 vCPU', memory: '2 GB' })).toEqual({
      cpu: '1 vCPU',
      memory: '2 GB',
    });
  });

  it('forwards every supported passthrough key', () => {
    const config = {
      architecture: 'arm64' as const,
      cpu: '0.5 vCPU' as const,
      memory: '1 GB' as const,
      storage: '30 GB' as const,
      logging: { retention: '1 week' as const },
      health: { command: ['CMD-SHELL', 'true'] },
      executionRole: 'arn:aws:iam::123456789012:role/exec',
    };

    expect(buildServiceArgs(config)).toEqual(config);
  });

  it('omits keys that were not set instead of forwarding undefined', () => {
    const result = buildServiceArgs({ cpu: '2 vCPU' });

    expect(result).toEqual({ cpu: '2 vCPU' });
    expect(result).not.toHaveProperty('memory');
  });

  it('ignores keys outside the supported passthrough set', () => {
    expect(
      buildServiceArgs({
        cpu: '1 vCPU',
        scaling: { min: 2, max: 4 },
        loadBalancer: {},
      } as Record<string, unknown>),
    ).toEqual({ cpu: '1 vCPU' });
  });
});
