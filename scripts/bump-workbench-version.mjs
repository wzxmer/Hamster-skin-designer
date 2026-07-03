import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = path.join(root, 'package.json');
const versionPath = path.join(root, 'apps', 'workbench', 'version.json');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function semverParts(value) {
  const match = String(value || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return match.slice(1).map((part) => Number(part));
}

const packageJson = readJson(packagePath);
const current = readJson(versionPath);
const baseParts = semverParts(current.version) || semverParts(packageJson.version) || [0, 1, 0];
const nextVersion = `${baseParts[0]}.${baseParts[1]}.${baseParts[2] + 1}`;

const payload = {
  ...current,
  version: nextVersion,
  generatedAt: new Date().toISOString(),
};

writeFileSync(versionPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`workbench version: ${current.version || 'unknown'} -> ${nextVersion}`);
