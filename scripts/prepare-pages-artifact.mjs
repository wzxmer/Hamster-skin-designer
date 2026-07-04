import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'dist', 'pages');

const publishPaths = [
  'index.html',
  'apps/workbench',
  'packages',
  'templates',
];

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

for (const relativePath of publishPaths) {
  const source = path.join(root, relativePath);
  if (!existsSync(source)) {
    throw new Error(`Pages artifact source missing: ${relativePath}`);
  }
  cpSync(source, path.join(outputDir, relativePath), { recursive: true });
}

console.log(`Prepared GitHub Pages artifact at ${path.relative(root, outputDir)}`);
