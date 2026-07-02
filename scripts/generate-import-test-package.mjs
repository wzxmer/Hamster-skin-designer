import { mkdirSync, writeFileSync } from 'node:fs';
import { createSampleProject } from '../packages/project-schema/index.js';
import { buildSkinPackageFiles, createZipArchive, defaultPackageFileName } from '../packages/exporter/index.js';

const project = createSampleProject();
const files = buildSkinPackageFiles(project);
const bytes = createZipArchive(files);
mkdirSync('dist/import-test', { recursive: true });
const out = `dist/import-test/${defaultPackageFileName(project)}`;
writeFileSync(out, bytes);
console.log(`${out} ${files.length} files ${bytes.length} bytes`);
