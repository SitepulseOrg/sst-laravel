import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

function output<T>(value: T) {
  return {
    apply: (callback: (value: T) => unknown) => callback(value),
  };
}

function resource<T extends object>(type: string, attributes: T): T {
  class Resource {
    public static __pulumiType = type;
  }

  return Object.assign(new Resource(), attributes) as T;
}

const packageSstPath = join(__dirname, '..', '.sst');
let applyLinkedResourcesEnv: typeof import('../src/laravel-env')['applyLinkedResourcesEnv'];

beforeAll(async () => {
  writeFakeSstClass('aws/email', 'Email');
  writeFakeSstClass('aws/mysql', 'Mysql');
  writeFakeSstClass('aws/postgres', 'Postgres');
  writeFakeSstClass('aws/redis', 'Redis');
  writeFakeSstClass('aws/queue', 'Queue');
  writeFakeSstClass('aws/aurora', 'Aurora');
  writeFakeSstClass('aws/bucket', 'Bucket');
  writeFakeSstClass('secret', 'Secret');

  ({ applyLinkedResourcesEnv } = await import('../src/laravel-env'));
});

afterAll(() => {
  rmSync(packageSstPath, { recursive: true, force: true });
});

function writeFakeSstClass(modulePath: string, className: string) {
  const filePath = join(packageSstPath, 'platform/src/components', `${modulePath}.js`);

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `export class ${className} {}\n`);
}

describe('applyLinkedResourcesEnv', () => {
  it('detects Postgres resources by Pulumi type metadata', () => {
    const env = applyLinkedResourcesEnv([
      resource('sst:aws:Postgres', {
        host: output('db.internal'),
        database: output('sitepulse'),
        username: output('sitepulse'),
        password: output('secret'),
        port: output(5432),
      }),
    ] as any);

    expect(env).toMatchObject({
      DB_CONNECTION: 'pgsql',
      DB_HOST: expect.any(Object),
      DB_DATABASE: expect.any(Object),
      DB_USERNAME: expect.any(Object),
      DB_PASSWORD: expect.any(Object),
      DB_PORT: '5432',
    });
  });

  it('detects Redis and bucket resources by Pulumi type metadata', () => {
    const env = applyLinkedResourcesEnv([
      resource('sst:aws:Redis', {
        host: output('redis.internal'),
        port: output(6379),
        password: output('secret'),
      }),
      resource('sst:aws:Bucket', {
        name: output('sitepulse-storage'),
      }),
    ] as any);

    expect(env).toMatchObject({
      REDIS_HOST: 'tls://redis.internal',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: expect.any(Object),
      FILESYSTEM_DISK: 's3',
      AWS_BUCKET: expect.any(Object),
    });
  });
});
