import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getPackageRoot } from './sst-config.js';

export function ensurePackageSstLink(
  cwd = process.cwd(),
  packageRoot = getPackageRoot(),
): boolean {
  const projectSstPath = path.resolve(cwd, '.sst');
  const packageSstPath = path.resolve(packageRoot, '.sst');

  if (!fs.existsSync(projectSstPath)) {
    return false;
  }

  if (packageSstPath === projectSstPath) {
    return true;
  }

  if (fs.existsSync(packageSstPath)) {
    const existing = fs.lstatSync(packageSstPath);

    if (
      existing.isSymbolicLink() &&
      fs.realpathSync(packageSstPath) === fs.realpathSync(projectSstPath)
    ) {
      return true;
    }

    fs.rmSync(packageSstPath, { recursive: true, force: true });
  }

  fs.symlinkSync(projectSstPath, packageSstPath, 'dir');

  return true;
}

export function repairSstPlatformEsbuild(cwd = process.cwd()): void {
  const platformPath = path.resolve(cwd, '.sst/platform');
  const esbuildPath = path.resolve(platformPath, 'node_modules/esbuild/bin/esbuild');

  if (!fs.existsSync(esbuildPath)) {
    return;
  }

  const result = spawnSync(esbuildPath, ['--version'], { encoding: 'utf8' });

  if (result.status === 0) {
    return;
  }

  fs.rmSync(path.resolve(platformPath, 'node_modules/esbuild'), {
    recursive: true,
    force: true,
  });
  fs.rmSync(path.resolve(platformPath, 'node_modules/@esbuild/darwin-arm64'), {
    recursive: true,
    force: true,
  });

  execFileSync('npm', ['install', '--prefix', platformPath, '--include=optional'], {
    stdio: 'inherit',
  });
}
