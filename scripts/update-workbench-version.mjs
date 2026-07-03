import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'apps', 'workbench', 'version.json');

function gitValue(args, fallback) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

const commit = process.env.GITHUB_SHA || gitValue(['rev-parse', '--short=12', 'HEAD'], 'unknown');
const version = process.env.GITHUB_SHA
  ? process.env.GITHUB_SHA.slice(0, 12)
  : `${commit}-${Date.now()}`;

const payload = {
  version,
  commit,
  generatedAt: new Date().toISOString(),
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
