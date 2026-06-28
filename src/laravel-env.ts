import { Email } from "../.sst/platform/src/components/aws/email.js";
import { Mysql } from "../.sst/platform/src/components/aws/mysql.js";
import { Postgres } from "../.sst/platform/src/components/aws/postgres.js";
import { Redis } from "../.sst/platform/src/components/aws/redis.js";
import { Output } from "@pulumi/pulumi";
import * as pulumiAws from "@pulumi/aws";
import { Queue } from "../.sst/platform/src/components/aws/queue.js";
import { Aurora } from "../.sst/platform/src/components/aws/aurora.js";
import { Bucket } from "../.sst/platform/src/components/aws/bucket.js";
import { Secret } from "../.sst/platform/src/components/secret.js";

type EnvType = Record<string, string | Output<string>>|Record<string, string | Output<string | undefined> | undefined>;
type Database = Postgres | Mysql | Aurora | pulumiAws.rds.Instance;
type LinkSupportedTypes = Database | Email | Queue | Redis | Bucket | Secret;

export type EnvCallback = (resource: any) => EnvType;
export type EnvCallbacks = {
  postgres?: EnvCallback;
  mysql?: EnvCallback;
  redis?: EnvCallback;
  email?: EnvCallback;
  queue?: EnvCallback;
};

export function applyLinkedResourcesEnv(links: LinkSupportedTypes[], callbacks?: EnvCallbacks): EnvType {
  let environment: EnvType  = {};

  links.forEach((link: LinkSupportedTypes) => {
    if (isPostgresResource(link)) {
      const defaultEnv = applyDatabaseEnv(link);

      environment = {
        ...environment,
        ...defaultEnv,
        ...(callbacks?.postgres ? callbacks.postgres(link) : {}),
      };
    }

    if (isRedisResource(link)) {
      const defaultEnv = applyRedisEnv(link);

      environment = {
        ...environment,
        ...defaultEnv,
        ...(callbacks?.redis ? callbacks.redis(link) : {}),
      };
    }

    if (isEmailResource(link)) {
      const defaultEnv = applyEmailEnv(link);

      environment = {
        ...environment,
        ...defaultEnv,
        ...(callbacks?.email ? callbacks.email(link) : {}),
      };
    }

    if (isQueueResource(link)) {
      const defaultEnv = applyQueueEnv(link);

      environment = {
        ...environment,
        ...defaultEnv,
        ...(callbacks?.queue ? callbacks.queue(link) : {}),
      };
    }

    if (isBucketResource(link)) {
      const defaultEnv = applyBucketEnv(link);

      environment = {
        ...environment,
        ...defaultEnv,
      };
    }

  });

  return environment;
}

export function extractSecrets(links: LinkSupportedTypes[]): Secret[] {
  return links.filter((link): link is Secret => isSecretResource(link));
}

function applyDatabaseEnv(database: Database, callbacks?: EnvCallbacks): EnvType {
  let port: number | undefined;
database.port.apply(value => port = value);

  if (isPostgresResource(database) || (isAuroraResource(database) && port === 5432)) {
    return applyPostgresEnv(database);
  }

  if (isMysqlResource(database) || (isAuroraResource(database) && port === 3306) || database instanceof pulumiAws.rds.Instance) {
    return applyMySqlEnv(database);
  }

  return {};
}

function applyPostgresEnv(database: Postgres|Aurora): EnvType {
  const port: Output<number> = database.port;

  return {
    DB_CONNECTION: 'pgsql',
    DB_HOST: database.host,
    DB_DATABASE: database.database,
    DB_USERNAME: database.username,
    DB_PASSWORD: database.password,
    DB_PORT: port.apply(port => port.toString()),
  };
}

function applyMySqlEnv(database: Mysql|Aurora|pulumiAws.rds.Instance): EnvType {
  const port: Output<number> = database.port;

  return {
    DB_CONNECTION: 'mysql',
    DB_HOST: database instanceof Aurora || database instanceof Mysql ? database.host : database.endpoint,
    DB_DATABASE: database instanceof Aurora || database instanceof Mysql ? database.database : database.dbName,
    DB_USERNAME: database.username,
    DB_PASSWORD: database.password,
    DB_PORT: port.apply(port => port.toString()),
  };
}

export function applyRedisEnv(database: Redis): EnvType {
  // TODO: Check if when encryption at rest is disabled, TLS is not required/throw errors
  return {
    REDIS_HOST: database.host.apply(host => host ? `tls://${host}` : ''),
    REDIS_PORT: database.port.apply(port => port.toString()),
    REDIS_PASSWORD: database.password,
  };
}

export function applyEmailEnv(mail: Email): EnvType {
  return {
    MAIL_MAILER: 'ses',
    // MAIL_FROM_ADDRESS: link.sender,
  };
}

export function applyQueueEnv(queue: Queue): EnvType {
  const queueUrl: Output<string> = queue.url;

  return {
    SQS_QUEUE: queue.url,
  };
}

export function applyBucketEnv(bucket: Bucket): EnvType {
  return {
      FILESYSTEM_DISK: 's3',
      AWS_BUCKET: bucket.name,
  };
}

function isPostgresResource(resource: any): resource is Postgres|Aurora {
  return resource instanceof Postgres || resourceType(resource).includes('postgres');
}

function isMysqlResource(resource: any): resource is Mysql|Aurora {
  return resource instanceof Mysql || resourceType(resource).includes('mysql');
}

function isAuroraResource(resource: any): resource is Aurora {
  return resource instanceof Aurora || resourceType(resource).includes('aurora');
}

function isRedisResource(resource: any): resource is Redis {
  return resource instanceof Redis || resourceType(resource).includes('redis');
}

function isEmailResource(resource: any): resource is Email {
  return resource instanceof Email || resourceType(resource).includes('email');
}

function isQueueResource(resource: any): resource is Queue {
  return resource instanceof Queue || resourceType(resource).includes('queue');
}

function isBucketResource(resource: any): resource is Bucket {
  return resource instanceof Bucket || resourceType(resource).includes('bucket');
}

function isSecretResource(resource: any): resource is Secret {
  return resource instanceof Secret || resourceType(resource).includes('secret');
}

function resourceType(resource: any): string {
  return [
    resource?.constructor?.__pulumiType,
    resource?.__pulumiType,
    resource?.constructor?.name,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(':')
    .toLowerCase();
}
