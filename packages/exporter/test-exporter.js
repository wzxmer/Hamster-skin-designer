import { createZipArchive, buildJsonnetSourceFiles, buildSkinPackageFiles, buildYamlSkinFiles } from './index.js';
import { createSampleProject } from '../project-schema/index.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function findFile(files, path) {
  return files.find((file) => file.path === path);
}

const project = createSampleProject();
const yamlFiles = buildYamlSkinFiles(project);
const jsonnetFiles = buildJsonnetSourceFiles(project);
const packageFiles = buildSkinPackageFiles(project);
const zipBytes = createZipArchive(packageFiles);
const hiddenProject = {
  ...createSampleProject(),
  hiddenPreviewKeyboards: ['pinyin_26_portrait'],
};
const hiddenYamlFiles = buildYamlSkinFiles(hiddenProject);
const hiddenConfig = findFile(hiddenYamlFiles, 'config.yaml')?.content || '';
const disabledSwipeBaseProject = createSampleProject();
const disabledSwipeProject = {
  ...disabledSwipeBaseProject,
  data: {
    ...disabledSwipeBaseProject.data,
    swipesEnabled: false,
  },
};
const disabledSwipeJsonnetFiles = buildJsonnetSourceFiles(disabledSwipeProject);
const disabledSwipeYamlFiles = buildYamlSkinFiles(disabledSwipeProject);
const disabledSwipeData = findFile(disabledSwipeJsonnetFiles, 'jsonnet/lib/swipeData.libsonnet')?.content || '';
const disabledSwipeKeyboard = findFile(disabledSwipeYamlFiles, 'light/pinyin_26_portrait.yaml')?.content || '';
const hintData = findFile(jsonnetFiles, 'jsonnet/lib/hintSymbolsData.libsonnet')?.content || '';
const pinyinKeyboard = findFile(yamlFiles, 'light/pinyin_26_portrait.yaml')?.content || '';

assert(findFile(yamlFiles, 'config.yaml'), '缺少 config.yaml。');
assert(findFile(yamlFiles, 'light/pinyin_26_portrait.yaml'), '缺少浅色 26 键竖屏 YAML。');
assert(findFile(yamlFiles, 'dark/numeric_9_landscape.yaml'), '缺少深色数字横屏 YAML。');
assert(!findFile(hiddenYamlFiles, 'light/pinyin_26_portrait.yaml'), '隐藏键盘不应生成浅色 YAML。');
assert(!findFile(hiddenYamlFiles, 'dark/pinyin_26_portrait.yaml'), '隐藏键盘不应生成深色 YAML。');
assert(!hiddenConfig.includes('pinyin_26_portrait'), '隐藏键盘不应写入 config.yaml。');
assert(findFile(jsonnetFiles, 'jsonnet/lib/color.libsonnet'), '缺少 color.libsonnet。');
assert(findFile(jsonnetFiles, 'jsonnet/lib/hintSymbolsData.libsonnet'), '缺少 hintSymbolsData.libsonnet。');
assert(findFile(jsonnetFiles, 'jsonnet/lib/swipeData-en.libsonnet'), '缺少 swipeData-en.libsonnet。');
assert(hintData.includes('"pinyin"') && hintData.includes('"q"'), 'Jsonnet 长按数据应包含 26 键提示。');
assert(pinyinKeyboard.includes('hints:') && pinyinKeyboard.includes('selectedIndex: 0'), 'YAML 键盘应导出长按候选数据。');
assert(!disabledSwipeData.includes('"q"'), '关闭滑动后 Jsonnet 不应导出滑动键。');
assert(!disabledSwipeKeyboard.includes('character: "1"'), '关闭滑动后 YAML 不应导出滑动动作。');
assert(findFile(packageFiles, 'README.md'), '缺少导出 README。');
assert(findFile(packageFiles, 'project.json'), '缺少 project.json。');
assert(zipBytes[0] === 0x50 && zipBytes[1] === 0x4b, 'zip 文件头无效。');

console.log(`exporter ok: ${packageFiles.length} files, ${zipBytes.length} bytes`);
