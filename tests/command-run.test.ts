import { describe, expect, it } from 'vitest';
import { buildCommandToRun } from '../bin/commands/command-run';

describe('buildCommandToRun', () => {
  it('prefixes artisan commands with php artisan', () => {
    expect(buildCommandToRun(['migrate', '--force'], false)).toBe('php artisan migrate --force');
  });

  it('runs raw commands without an artisan prefix', () => {
    expect(buildCommandToRun(['php', '-v'], true)).toBe('php -v');
  });

  it('requires a command', () => {
    expect(() => buildCommandToRun([], false)).toThrow('Command is required.');
  });
});
