import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensurePackageSstLink } from '../bin/utils/sst-platform';

const tempRoots: string[] = [];

function makeTempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'sst-laravel-'));
  tempRoots.push(root);

  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('ensurePackageSstLink', () => {
  it('does nothing before SST has created the project .sst folder', () => {
    const projectRoot = makeTempRoot();
    const packageRoot = makeTempRoot();

    expect(ensurePackageSstLink(projectRoot, packageRoot)).toBe(false);
  });

  it('links the package-local .sst folder to the consuming project', () => {
    const projectRoot = makeTempRoot();
    const packageRoot = makeTempRoot();
    mkdirSync(join(projectRoot, '.sst'));

    expect(ensurePackageSstLink(projectRoot, packageRoot)).toBe(true);
    expect(realpathSync(join(packageRoot, '.sst'))).toBe(
      realpathSync(join(projectRoot, '.sst')),
    );
  });

  it('replaces a stale package-local .sst entry', () => {
    const projectRoot = makeTempRoot();
    const packageRoot = makeTempRoot();
    mkdirSync(join(projectRoot, '.sst'));
    writeFileSync(join(packageRoot, '.sst'), 'stale');

    expect(ensurePackageSstLink(projectRoot, packageRoot)).toBe(true);
    expect(realpathSync(join(packageRoot, '.sst'))).toBe(
      realpathSync(join(projectRoot, '.sst')),
    );
  });
});
