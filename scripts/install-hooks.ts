import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Source archives and CI do not need local Git hooks.
if (existsSync('.git') && !process.env.CI) {
  const result = spawnSync('lefthook', ['install'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
}
