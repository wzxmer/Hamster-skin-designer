import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const templateRoot = path.join(root, 'templates', 'hamster-ios');
const sampleRoot = path.join(root, '示例生成的皮肤');

function walkFiles(rootDir) {
  const results = [];
  function visit(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
        continue;
      }
      results.push(path.relative(rootDir, fullPath).split(path.sep).join('/'));
    }
  }
  visit(rootDir);
  return results.sort();
}

function printSection(title, items) {
  console.log(`\n[${title}]`);
  if (!items.length) {
    console.log('(none)');
    return;
  }
  for (const item of items) {
    console.log(item);
  }
}

function main() {
  const templateFiles = walkFiles(templateRoot);
  const sampleFiles = walkFiles(sampleRoot);

  const onlyTemplate = templateFiles.filter((item) => !sampleFiles.includes(item));
  const onlySample = sampleFiles.filter((item) => !templateFiles.includes(item));

  console.log('Hamster template/sample diff');
  console.log(`template file count: ${templateFiles.length}`);
  console.log(`sample file count: ${sampleFiles.length}`);

  printSection('only-template', onlyTemplate);
  printSection('only-sample', onlySample);
}

main();
