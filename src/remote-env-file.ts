import * as fs from 'fs';
import * as path from 'path';
import { CustomResourceOptions, Input, dynamic } from '@pulumi/pulumi';
import { pullSecrets, toEnvFileContent } from './secrets-manager';

export interface RemoteEnvFileLinkedSecret {
  name: Input<string>;
  value: Input<string>;
}

export interface RemoteEnvFileInputs {
  secretPath: Input<string>;
  envFilePath: Input<string>;
  fingerprint: Input<string>;
  autoInject?: Input<boolean>;
  appUrl?: Input<string | undefined>;
  linkedEnvironment?: Input<Record<string, Input<string | undefined> | undefined>>;
  linkedSecrets?: Input<RemoteEnvFileLinkedSecret[]>;
}

interface ResolvedRemoteEnvFileInputs {
  secretPath: string;
  envFilePath: string;
  fingerprint: string;
  autoInject?: boolean;
  appUrl?: string;
  linkedEnvironment?: Record<string, string | undefined>;
  linkedSecrets?: Array<{
    name: string;
    value: string;
  }>;
}

const provider: dynamic.ResourceProvider<ResolvedRemoteEnvFileInputs, ResolvedRemoteEnvFileInputs> = {
  async create(inputs) {
    const outs = await writeRemoteEnvironmentFile(inputs);

    return {
      id: `${inputs.secretPath}:${inputs.envFilePath}`,
      outs,
    };
  },

  async diff(_, olds, news) {
    return {
      changes: stableStringify(olds) !== stableStringify(news),
    };
  },

  async update(_, __, news) {
    const outs = await writeRemoteEnvironmentFile(news);

    return {
      outs,
    };
  },
};

export class RemoteEnvFile extends dynamic.Resource {
  constructor(
    name: string,
    args: RemoteEnvFileInputs,
    opts?: CustomResourceOptions,
  ) {
    super(provider, `${name}.sst.aws.RemoteEnvFile`, args, opts);
  }
}

async function writeRemoteEnvironmentFile(inputs: ResolvedRemoteEnvFileInputs) {
  const secrets = await pullSecrets(inputs.secretPath);

  if (!secrets) {
    throw new Error(`RemoteEnvVault secret not found at ${inputs.secretPath}.`);
  }

  const envContent = buildEnvFileContent(secrets, inputs);

  fs.mkdirSync(path.dirname(inputs.envFilePath), { recursive: true });
  fs.writeFileSync(inputs.envFilePath, envContent + '\n');
  fs.chmodSync(inputs.envFilePath, 0o755);

  return {
    ...inputs,
  };
}

function buildEnvFileContent(
  secrets: Record<string, string>,
  inputs: ResolvedRemoteEnvFileInputs,
) {
  const baseEnv = toEnvFileContent(secrets);

  if (inputs.autoInject === false) {
    return baseEnv;
  }

  const autoInjected: Record<string, string> = {};

  if (!hasOwnVariable(secrets, 'APP_URL') && inputs.appUrl) {
    autoInjected.APP_URL = inputs.appUrl;
  }

  if (!hasOwnVariable(secrets, 'LOG_CHANNEL')) {
    autoInjected.LOG_CHANNEL = 'stderr';
  }

  Object.entries(inputs.linkedEnvironment || {}).forEach(([key, value]) => {
    if (typeof value === 'string') {
      autoInjected[key] = value;
    }
  });

  (inputs.linkedSecrets || []).forEach((secret) => {
    autoInjected[secret.name] = secret.value;
  });

  if (Object.keys(autoInjected).length === 0) {
    return baseEnv;
  }

  return [
    baseEnv,
    '# --- SST-LARAVEL AUTO-INJECTED VARIABLES ---',
    toEnvFileContent(autoInjected),
  ].filter(Boolean).join('\n\n');
}

function hasOwnVariable(vars: Record<string, string>, key: string) {
  return Object.prototype.hasOwnProperty.call(vars, key);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce((result, key) => {
        result[key] = sortValue((value as Record<string, unknown>)[key]);
        return result;
      }, {} as Record<string, unknown>);
  }

  return value;
}
