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
const comboBaseProject = createSampleProject();
const comboProject = {
  ...comboBaseProject,
  keyboardCombo: {
    ...comboBaseProject.keyboardCombo,
    inputStrategy: 'schemaToggle',
    slots: {
      ...comboBaseProject.keyboardCombo.slots,
      numeric: {
        ...comboBaseProject.keyboardCombo.slots.numeric,
        variant: 'ios',
      },
    },
  },
};
const comboYamlFiles = buildYamlSkinFiles(comboProject);
const comboConfig = findFile(comboYamlFiles, 'config.yaml')?.content || '';
const comboSpaceBaseProject = createSampleProject();
const comboSpaceProject = {
  ...comboSpaceBaseProject,
  keyboardCombo: {
    ...comboSpaceBaseProject.keyboardCombo,
    spaceRow: {
      ...comboSpaceBaseProject.keyboardCombo.spaceRow,
      showSchemaNameOnSpace: false,
      commaKey: {
        ...comboSpaceBaseProject.keyboardCombo.spaceRow.commaKey,
        swipeUp: '！',
      },
    },
  },
};
const comboSpaceYamlFiles = buildYamlSkinFiles(comboSpaceProject);
const comboSpaceKeyboard = findFile(comboSpaceYamlFiles, 'light/pinyin_26_portrait.yaml')?.content || '';
const comboSwipeDisabledBaseProject = createSampleProject();
const comboSwipeDisabledProject = {
  ...comboSwipeDisabledBaseProject,
  keyboardCombo: {
    ...comboSwipeDisabledBaseProject.keyboardCombo,
    swipeBehavior: {
      ...comboSwipeDisabledBaseProject.keyboardCombo.swipeBehavior,
      mode: 'disabled',
    },
  },
};
const comboSwipeDisabledYamlFiles = buildYamlSkinFiles(comboSwipeDisabledProject);
const comboSwipeDisabledKeyboard = findFile(comboSwipeDisabledYamlFiles, 'light/pinyin_26_portrait.yaml')?.content || '';
const comboPinyin14Project = {
  ...createSampleProject(),
  keyboardCombo: {
    ...createSampleProject().keyboardCombo,
    slots: {
      ...createSampleProject().keyboardCombo.slots,
      pinyin: {
        ...createSampleProject().keyboardCombo.slots.pinyin,
        variant: '14',
      },
    },
  },
};
const comboPinyin14YamlFiles = buildYamlSkinFiles(comboPinyin14Project);
const comboPinyin14Config = findFile(comboPinyin14YamlFiles, 'config.yaml')?.content || '';
const comboPinyin14Keyboard = findFile(comboPinyin14YamlFiles, 'light/pinyin_14_portrait.yaml')?.content || '';
const comboSystemBaseProject = createSampleProject();
const comboSystemProject = {
  ...comboSystemBaseProject,
  keyboardCombo: {
    ...comboSystemBaseProject.keyboardCombo,
    slots: {
      ...comboSystemBaseProject.keyboardCombo.slots,
      symbolic: {
        ...comboSystemBaseProject.keyboardCombo.slots.symbolic,
        source: 'system',
      },
      emoji: {
        ...comboSystemBaseProject.keyboardCombo.slots.emoji,
        source: 'system',
      },
    },
  },
};
const comboSystemYamlFiles = buildYamlSkinFiles(comboSystemProject);
const comboSystemConfig = findFile(comboSystemYamlFiles, 'config.yaml')?.content || '';
const comboEmojiCustomBaseProject = createSampleProject();
const comboEmojiCustomProject = {
  ...comboEmojiCustomBaseProject,
  keyboardCombo: {
    ...comboEmojiCustomBaseProject.keyboardCombo,
    slots: {
      ...comboEmojiCustomBaseProject.keyboardCombo.slots,
      emoji: {
        ...comboEmojiCustomBaseProject.keyboardCombo.slots.emoji,
        source: 'custom',
      },
    },
  },
};
const comboEmojiCustomYamlFiles = buildYamlSkinFiles(comboEmojiCustomProject);
const comboEmojiCustomConfig = findFile(comboEmojiCustomYamlFiles, 'config.yaml')?.content || '';
const comboSymbolicCustomBaseProject = createSampleProject();
const comboSymbolicCustomProject = {
  ...comboSymbolicCustomBaseProject,
  keyboardCombo: {
    ...comboSymbolicCustomBaseProject.keyboardCombo,
    slots: {
      ...comboSymbolicCustomBaseProject.keyboardCombo.slots,
      symbolic: {
        ...comboSymbolicCustomBaseProject.keyboardCombo.slots.symbolic,
        source: 'custom',
      },
    },
  },
};
const comboSymbolicCustomYamlFiles = buildYamlSkinFiles(comboSymbolicCustomProject);
const comboSymbolicCustomConfig = findFile(comboSymbolicCustomYamlFiles, 'config.yaml')?.content || '';
const comboNumericBaseProject = createSampleProject();
const comboNumericProject = {
  ...comboNumericBaseProject,
  data: {
    ...comboNumericBaseProject.data,
    swipes: {
      ...comboNumericBaseProject.data.swipes,
      numeric: {
        swipe_up: {
          '1': {
            label: { text: '一' },
            action: { character: '一' },
          },
        },
        swipe_down: {},
      },
    },
  },
};
const comboNumericYamlFiles = buildYamlSkinFiles(comboNumericProject);
const comboNumericKeyboard = findFile(comboNumericYamlFiles, 'light/numeric_9_portrait.yaml')?.content || '';
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
assert(!comboConfig.includes('alphabetic_26_portrait'), 'schemaToggle 不应继续导出独立英文键盘映射。');
assert(comboConfig.includes('numeric_ios_portrait') && comboConfig.includes('numeric_ios_landscape'), 'iOS 数字键盘组合应导出新的数字键盘映射。');
assert(findFile(comboYamlFiles, 'light/numeric_ios_portrait.yaml'), 'iOS 数字键盘组合应生成竖屏 YAML。');
assert(!comboSpaceKeyboard.includes('$rimeSchemaName'), '关闭空格方案名后不应继续导出方案名文本。');
assert(comboSpaceKeyboard.includes('character: "！"'), '自定义逗号上划字符应导出到 spaceRight 划动动作。');
assert(!comboSwipeDisabledKeyboard.includes('character: "1"'), '组合层关闭划动后 YAML 不应继续导出划动动作。');
assert(comboNumericKeyboard.includes('character: "一"'), '数字键盘 YAML 应导出 numeric 划动数据，而不是复用拼音划动。');
assert(comboPinyin14Config.includes('pinyin_14_portrait') && comboPinyin14Config.includes('pinyin_14_landscape'), '中文14键组合应导出新的拼音键盘映射。');
assert(comboPinyin14Keyboard.includes('"q"') && comboPinyin14Keyboard.includes('"v"'), '中文14键导出应使用 14 键布局骨架。');
assert(comboSystemConfig.includes('symbolic_system'), '系统符号键盘来源应保留 config 映射。');
assert(comboSystemConfig.includes('emoji_system'), '系统 Emoji 来源应保留 config 映射。');
assert(!findFile(comboSystemYamlFiles, 'light/symbolic_system.yaml'), '系统符号键盘来源不应导出自定义 symbolic YAML。');
assert(!findFile(comboSystemYamlFiles, 'light/emoji_portrait.yaml'), '系统 Emoji 来源不应继续导出 emoji YAML。');
assert(comboSymbolicCustomConfig.includes('symbolic_portrait') && comboSymbolicCustomConfig.includes('symbolic_landscape'), '自定义符号来源应导出自定义 symbolic 键盘映射。');
assert(findFile(comboSymbolicCustomYamlFiles, 'light/symbolic_portrait.yaml'), '自定义符号来源应继续导出 symbolic 竖屏 YAML。');
assert(comboEmojiCustomConfig.includes('emoji_portrait') && comboEmojiCustomConfig.includes('emoji_landscape'), '自定义 Emoji 来源应导出自定义 emoji 键盘映射。');
assert(findFile(comboEmojiCustomYamlFiles, 'light/emoji_portrait.yaml'), '自定义 Emoji 来源应继续导出 emoji 竖屏 YAML。');
assert(findFile(packageFiles, 'README.md'), '缺少导出 README。');
assert(findFile(packageFiles, 'project.json'), '缺少 project.json。');
assert(zipBytes[0] === 0x50 && zipBytes[1] === 0x4b, 'zip 文件头无效。');

console.log(`exporter ok: ${packageFiles.length} files, ${zipBytes.length} bytes`);
