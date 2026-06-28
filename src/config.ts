import * as path from 'path';
import { fileURLToPath } from 'url';

const configModuleFilename = fileURLToPath(import.meta.url);
const configModuleDirname = path.dirname(configModuleFilename);

/**
 * Environment variables set by the CLI to pass configuration to the SST component.
 * These are prefixed with SST_LARAVEL_ to avoid collisions.
 */
export const SST_LARAVEL_ENV = {
  PACKAGE_ROOT: 'SST_LARAVEL_PACKAGE_ROOT',
} as const;

/**
 * Get the root path of the @sitepulse/sst-laravel package.
 *
 * When invoked via the CLI, this reads from the SST_LARAVEL_PACKAGE_ROOT env var.
 * Otherwise, falls back to this package's root. This keeps local `file:`
 * installs and pnpm's content-addressed package store from changing behavior.
 */
export function getPackagePath(): string {
  if (process.env[SST_LARAVEL_ENV.PACKAGE_ROOT]) {
    return process.env[SST_LARAVEL_ENV.PACKAGE_ROOT]!;
  }

  return path.resolve(configModuleDirname, '..');
}
