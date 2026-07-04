import { createZipArchive, buildEffectiveNativeKeyboardPayload, buildJsonnetSourceFiles, buildSkinPackageFiles, buildYamlSkinFiles, toYaml } from './index.js';
import { createSampleProject } from '../project-schema/index.js';
import { buildEffectiveProject } from '../skin-effect/index.js';
import { LEGACY_RUNTIME_COLORS, LEGACY_RUNTIME_STYLE_NAMES } from '../skin-effect/legacy-seed-sanitizer.js';
import { KEYBOARD_SKIN_PRESETS } from '../../apps/workbench/src/data/keyboard-presets.js';
import { NATIVE_KEYBOARD_PRESET_PAYLOADS } from '../../apps/workbench/src/data/native-keyboard-presets.generated.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function findFile(files, path) {
  return files.find((file) => file.path === path);
}

function yamlBlock(content, key) {
  const match = content.match(new RegExp(`^${key}:\\n[\\s\\S]*?(?=^\\S[^\\n]*:\\n|\\Z)`, 'm'));
  return match?.[0] || '';
}

function ensureTrailingNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`;
}

function assertNativeKeyboardYaml(content, label) {
  assert(content.includes('keyboardLayout:'), `${label} 应导出 Hamster 原生 keyboardLayout。`);
  assert(!content.includes('\nkeyboard:'), `${label} 不应导出工作台中间模型 keyboard 字段。`);
}

function collectConfigKeyboardNames(configContent) {
  return [...new Set(
    [...configContent.matchAll(/:\s*"([^"\n]+)"/g)]
      .map((match) => match[1])
      .filter((name) => /^[a-z]+_[a-z0-9_]+$/i.test(name)),
  )];
}

function assertConfigKeyboardFilesExist(files, configContent, label) {
  const names = collectConfigKeyboardNames(configContent);
  assert(names.length, `${label} config.yaml 应至少引用一个键盘文件。`);
  for (const name of names) {
    assert(findFile(files, `light/${name}.yaml`), `${label} config 引用缺少 light/${name}.yaml。`);
    assert(findFile(files, `dark/${name}.yaml`), `${label} config 引用缺少 dark/${name}.yaml。`);
  }
}

function assertPackagedImageReferencesExist(files, label) {
  const paths = new Set(files.map((file) => file.path));
  for (const file of files) {
    if (!/^(light|dark)\/.+\.yaml$/.test(file.path)) continue;
    const theme = file.path.split('/')[0];
    const refs = [...String(file.content || '').matchAll(/file:\s+"([^"\n]+)"/g)]
      .map((match) => match[1]);
    for (const ref of refs) {
      assert(paths.has(`${theme}/resources/${ref}.yaml`), `${label} ${file.path} 引用缺少 ${theme}/resources/${ref}.yaml。`);
      assert(paths.has(`${theme}/resources/${ref}.png`), `${label} ${file.path} 引用缺少 ${theme}/resources/${ref}.png。`);
    }
  }
}

function assertNoBareColorYaml(content, label) {
  const bareColorMatch = content.match(/^\s*[A-Za-z][A-Za-z0-9]*Color:\s+"[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?"$/m);
  assert(!bareColorMatch, `${label} 不应导出无 # 颜色：${bareColorMatch?.[0] || ''}`);
}

function collectLayoutCells(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectLayoutCells(item, out);
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  if (typeof node.Cell === 'string') out.push(node.Cell);
  for (const value of Object.values(node)) collectLayoutCells(value, out);
  return out;
}

function collectStyleRefs(value, out = []) {
  const refKeys = [
    'backgroundStyle',
    'foregroundStyle',
    'hintStyle',
    'uppercasedStateForegroundStyle',
    'capsLockedStateForegroundStyle',
    'selectedBackgroundStyle',
    'cellStyle',
    'swipeUpForegroundStyle',
    'swipeDownForegroundStyle',
  ];
  const collectRefValue = (item) => {
    if (Array.isArray(item)) {
      for (const child of item) collectRefValue(child);
    } else if (typeof item === 'string' && !item.startsWith('// JavaScript')) {
      out.push(item);
    }
  };
  if (Array.isArray(value)) {
    for (const item of value) collectStyleRefs(item, out);
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  for (const refKey of refKeys) collectRefValue(value[refKey]);
  for (const [key, item] of Object.entries(value)) {
    if (refKeys.includes(key)) continue;
    collectStyleRefs(item, out);
  }
  return out;
}

function assertNativePayloadRenderable(payload, label) {
  const missingCells = [...new Set(collectLayoutCells(payload.keyboardLayout).filter((name) => !payload[name]))];
  assert(!missingCells.length, `${label} 不应引用不存在的 Cell：${missingCells.join(', ')}`);
  const missingStyles = [...new Set(collectStyleRefs(payload).filter((name) => !payload[name]))];
  assert(!missingStyles.length, `${label} 不应引用不存在的样式：${missingStyles.join(', ')}`);
  const invalidStyles = [];
  for (const [key, value] of Object.entries(payload)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const file = value.normalImage?.file || value.highlightImage?.file || value.file;
    if ((/(Fg|ForegroundStyle)$/.test(key)
      || value.text !== undefined
      || value.systemImageName !== undefined
      || value.normalImage
      || value.highlightImage)
      && value.buttonStyleType === undefined) {
      invalidStyles.push(`${key}:missing buttonStyleType`);
    }
    if (value.buttonStyleType === 'fileImage'
      && file
      && !['bg', 'cnen', 'encn', 'float_back', 'hint', 'hold_back'].includes(file)) {
      invalidStyles.push(`${key}:missing image ${file}`);
    }
  }
  assert(!invalidStyles.length, `${label} 不应包含 App 无法渲染的样式：${invalidStyles.join(', ')}`);
}

function assertNoLegacyRuntimeResidue(payload, label, options = {}) {
  const hits = [];
  const walk = (value, path) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}.${index}`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      const nextPath = `${path}.${key}`;
      if (LEGACY_RUNTIME_STYLE_NAMES.includes(key)) hits.push(`${nextPath}:legacy-key`);
      if (typeof item === 'string') {
        const normalized = item.toLowerCase();
        if (LEGACY_RUNTIME_STYLE_NAMES.includes(item)) hits.push(`${nextPath}:${item}`);
        if (options.checkColors !== false && LEGACY_RUNTIME_COLORS.includes(normalized)) hits.push(`${nextPath}:${item}`);
        if (/(?:normalImage|highlightImage|\.file)$/.test(nextPath) && /hold_back|hint|T14|yy|T9/i.test(item)) {
          hits.push(`${nextPath}:${item}`);
        }
      } else {
        walk(item, nextPath);
      }
    }
  };
  walk(payload, '$');
  assert(!hits.length, `${label} 不应残留旧 seed 运行数据：${hits.slice(0, 12).join(', ')}`);
}

function mergeProjectPatch(target, patch) {
  for (const [key, value] of Object.entries(patch || {})) {
    if (Array.isArray(value)) {
      target[key] = structuredClone(value);
    } else if (value && typeof value === 'object') {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
      mergeProjectPatch(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function projectWithPreset(preset) {
  const sample = createSampleProject();
  const next = structuredClone(sample);
  mergeProjectPatch(next, preset.patch);
  if (preset.value === 'ios-26') {
    next.keyboards.keyboard26.metrics.portrait = structuredClone(sample.keyboards.keyboard26.metrics.portrait);
  }
  next.nativeKeyboardPayloads = structuredClone(preset.nativePayloads || {});
  next.keyboardCombo = {
    ...next.keyboardCombo,
    slots: {
      ...next.keyboardCombo.slots,
      pinyin: {
        ...next.keyboardCombo.slots.pinyin,
        variant: preset.layout,
      },
      numeric: {
        ...next.keyboardCombo.slots.numeric,
        variant: '9',
      },
    },
  };
  return next;
}

const project = createSampleProject();
const yamlFiles = buildYamlSkinFiles(project);
const jsonnetFiles = buildJsonnetSourceFiles(project);
const packageFiles = buildSkinPackageFiles(project);
const packageRoot = project.meta.name;
const zipBytes = createZipArchive(packageFiles);
const legacyTransparentProject = createSampleProject();
legacyTransparentProject.theme.light.colors['键盘背景颜色'] = '#D0D3DA01';
legacyTransparentProject.theme.dark.colors['键盘背景颜色'] = '#47474701';
const legacyZeroTransparentProject = createSampleProject();
legacyZeroTransparentProject.theme.light.colors['键盘背景颜色'] = '#D0D3DA00';
legacyZeroTransparentProject.theme.dark.colors['键盘背景颜色'] = '#47474700';
legacyTransparentProject.nativeKeyboardPayloads = {
  light: {
    pinyin_26_portrait: {
      ...legacyTransparentProject.nativeKeyboardPayloads?.light?.pinyin_26_portrait,
      keyboardBackgroundStyle: { buttonStyleType: 'geometry', normalColor: '#D0D3DA01' },
      toolbarBackgroundStyle: { buttonStyleType: 'geometry', normalColor: '#D0D3DA01' },
      preeditBackgroundStyle: { buttonStyleType: 'geometry', normalColor: '#D0D3DA01' },
    },
  },
};
const legacyTransparentKeyboard = findFile(buildYamlSkinFiles(legacyTransparentProject), 'light/pinyin_26_portrait.yaml')?.content || '';
const legacyZeroTransparentKeyboard = findFile(buildYamlSkinFiles(legacyZeroTransparentProject), 'light/pinyin_26_portrait.yaml')?.content || '';
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
const combineActionProject = createSampleProject();
combineActionProject.keyboards.keyboard26.keyActions = combineActionProject.keyboards.keyboard26.keyActions || {};
combineActionProject.keyboards.keyboard26.keyActions.cnen = {
  action: {
    combine: [
      { keyboardType: 'alphabetic' },
      { switchRimeSchema: 'melt_eng' },
    ],
  },
};
const combineActionKeyboard = findFile(buildYamlSkinFiles(combineActionProject), 'light/pinyin_26_portrait.yaml')?.content || '';
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
    swipeBehavior: {
      ...comboSpaceBaseProject.keyboardCombo.swipeBehavior,
      mode: 'visible',
      showSwipeUp: true,
      layouts: {
        ...(comboSpaceBaseProject.keyboardCombo.swipeBehavior.layouts || {}),
        pinyin: { mode: 'visible', showSwipeUp: true, showSwipeDown: false },
      },
    },
  },
};
const comboSpaceYamlFiles = buildYamlSkinFiles(comboSpaceProject);
const comboSpaceKeyboard = findFile(comboSpaceYamlFiles, 'light/pinyin_26_portrait.yaml')?.content || '';
const alphabeticKeyboard = findFile(yamlFiles, 'light/alphabetic_26_portrait.yaml')?.content || '';
const numericKeyboard = findFile(yamlFiles, 'light/numeric_9_portrait.yaml')?.content || '';
const uppercasePinyinBaseProject = createSampleProject();
const uppercasePinyinProject = {
  ...uppercasePinyinBaseProject,
  keyboards: {
    ...uppercasePinyinBaseProject.keyboards,
    keyboard26: {
      ...uppercasePinyinBaseProject.keyboards.keyboard26,
      keyDisplays: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((char) => [char, char.toUpperCase()])),
    },
  },
};
const uppercasePinyinKeyboard = findFile(buildYamlSkinFiles(uppercasePinyinProject), 'light/pinyin_26_portrait.yaml')?.content || '';
const uppercaseAlphabeticBaseProject = createSampleProject();
const uppercaseAlphabeticProject = {
  ...uppercaseAlphabeticBaseProject,
  keyboards: {
    ...uppercaseAlphabeticBaseProject.keyboards,
    keyboard26: {
      ...uppercaseAlphabeticBaseProject.keyboards.keyboard26,
      keyDisplays: Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').flatMap((char) => [
        [`alphabetic.${char}`, char.toUpperCase()],
        [`english.${char}`, char.toUpperCase()],
      ])),
    },
  },
};
const uppercaseAlphabeticKeyboard = findFile(buildYamlSkinFiles(uppercaseAlphabeticProject), 'light/alphabetic_26_portrait.yaml')?.content || '';
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
const splitSwipeBaseProject = createSampleProject();
const splitSwipeProject = {
  ...splitSwipeBaseProject,
  keyboardCombo: {
    ...splitSwipeBaseProject.keyboardCombo,
    swipeBehavior: {
      ...splitSwipeBaseProject.keyboardCombo.swipeBehavior,
      mode: 'visible',
      layouts: {
        pinyin: { mode: 'disabled', showSwipeUp: false, showSwipeDown: false },
        alphabetic: { mode: 'visible', showSwipeUp: true, showSwipeDown: true },
      },
    },
  },
};
const splitSwipeYamlFiles = buildYamlSkinFiles(splitSwipeProject);
const splitSwipePinyinKeyboard = findFile(splitSwipeYamlFiles, 'light/pinyin_26_portrait.yaml')?.content || '';
const splitSwipeAlphabeticKeyboard = findFile(splitSwipeYamlFiles, 'light/alphabetic_26_portrait.yaml')?.content || '';
const enabledSwipeBaseProject = createSampleProject();
const enabledSwipeProject = {
  ...enabledSwipeBaseProject,
  keyboardCombo: {
    ...enabledSwipeBaseProject.keyboardCombo,
    swipeBehavior: {
      ...enabledSwipeBaseProject.keyboardCombo.swipeBehavior,
      mode: 'visible',
      showSwipeUp: true,
      showSwipeDown: true,
      layouts: {
        ...(enabledSwipeBaseProject.keyboardCombo.swipeBehavior.layouts || {}),
        pinyin: { mode: 'visible', showSwipeUp: true, showSwipeDown: true },
      },
    },
  },
};
const enabledSwipeKeyboard = findFile(buildYamlSkinFiles(enabledSwipeProject), 'light/pinyin_26_portrait.yaml')?.content || '';
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
const symbolicCollectionProject = createSampleProject();
symbolicCollectionProject.keyboardCombo.slots.symbolic.source = 'custom';
symbolicCollectionProject.keyboardCombo.slots.symbolic.variant = 'custom';
symbolicCollectionProject.data.collections.symbolicDataSource.category = ['测试分类'];
symbolicCollectionProject.data.collections.symbolicDataSource['测试分类'] = ['甲', { label: '乙', value: 'B' }];
const symbolicCollectionKeyboard = findFile(buildYamlSkinFiles(symbolicCollectionProject), 'light/symbolic_portrait.yaml')?.content || '';
const comboNumericBaseProject = createSampleProject();
const comboNumericProject = {
  ...comboNumericBaseProject,
  keyboardCombo: {
    ...comboNumericBaseProject.keyboardCombo,
    swipeBehavior: {
      ...comboNumericBaseProject.keyboardCombo.swipeBehavior,
      mode: 'visible',
      showSwipeUp: true,
      showSwipeDown: true,
      layouts: {
        ...(comboNumericBaseProject.keyboardCombo.swipeBehavior.layouts || {}),
        numeric: {
          mode: 'visible',
          showSwipeUp: true,
          showSwipeDown: true,
        },
      },
      ui: {
        ...(comboNumericBaseProject.keyboardCombo.swipeBehavior.ui || {}),
        numeric: { mode: 'visible' },
      },
    },
  },
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
const styledBaseProject = createSampleProject();
const styledProject = {
  ...styledBaseProject,
  keyboardCombo: {
    ...styledBaseProject.keyboardCombo,
    slots: {
      ...styledBaseProject.keyboardCombo.slots,
      pinyin: {
        ...styledBaseProject.keyboardCombo.slots.pinyin,
        variant: '14',
      },
    },
  },
  keyStyles: {
    ...styledBaseProject.keyStyles,
    surfaceStyles: {
      ...styledBaseProject.keyStyles.surfaceStyles,
      keyboard26: {
        ...styledBaseProject.keyStyles.surfaceStyles.keyboard26,
        normal: {
          ...styledBaseProject.keyStyles.surfaceStyles.keyboard26.normal,
          borderSize: 1.2,
          shadowRadius: 5.5,
          shadowOpacity: 0.66,
          shadowOffset: { x: 0, y: 2.5 },
        },
      },
    },
  },
};
const styledYamlFiles = buildYamlSkinFiles(styledProject);
const styledPinyinKeyboard = findFile(styledYamlFiles, 'light/pinyin_14_portrait.yaml')?.content || '';
const styleOverrideBaseProject = projectWithPreset(KEYBOARD_SKIN_PRESETS.find((item) => item.value === 'ios-26'));
const styleOverrideProject = {
  ...styleOverrideBaseProject,
  theme: {
    ...styleOverrideBaseProject.theme,
    light: {
      ...styleOverrideBaseProject.theme.light,
      colors: {
        ...styleOverrideBaseProject.theme.light.colors,
        '键盘背景颜色': '#123456',
        '字母键背景颜色-普通': '#abcdef',
        '按键前景颜色': '#654321',
      },
    },
  },
};
const styleOverridePayload = buildEffectiveNativeKeyboardPayload(styleOverrideProject, 'light', 'pinyin_26_portrait');
const opaqueContainerProject = {
  ...styleOverrideBaseProject,
  theme: {
    ...styleOverrideBaseProject.theme,
    dark: {
      ...styleOverrideBaseProject.theme.dark,
      colors: {
        ...styleOverrideBaseProject.theme.dark.colors,
        '键盘背景颜色': '#474747FF',
      },
    },
  },
};
const opaqueContainerPayload = buildEffectiveNativeKeyboardPayload(opaqueContainerProject, 'dark', 'pinyin_26_portrait');
const customCenterProject = createSampleProject();
customCenterProject.theme.shared.customCenters = {
  keyboard26: {
    q: { x: 0.44, y: 0.62 },
  },
  toolbar: {
    menu: { x: 0.48, y: 0.58 },
  },
};
const customCenterKeyboard = findFile(buildYamlSkinFiles(customCenterProject), 'light/pinyin_26_portrait.yaml')?.content || '';
const customCenterPayload = buildEffectiveNativeKeyboardPayload(customCenterProject, 'light', 'pinyin_26_portrait');
const customMetricsProject = createSampleProject();
customMetricsProject.keyboards.keyboard26.metrics.portrait = {
  ...customMetricsProject.keyboards.keyboard26.metrics.portrait,
  a: { width: { percentage: 0.18 }, bounds: { width: '5/9', alignment: 'right' } },
  l: { width: { percentage: 0.18 }, bounds: { width: '5/9', alignment: 'left' } },
  space: { width: { percentage: 0.46 } },
};
const customMetricsKeyboard = findFile(buildYamlSkinFiles(customMetricsProject), 'light/pinyin_26_portrait.yaml')?.content || '';
const presetChecks = KEYBOARD_SKIN_PRESETS.map((preset) => {
  const presetProject = projectWithPreset(preset);
  const files = buildYamlSkinFiles(presetProject);
  const keyboardName = `pinyin_${preset.layout}_portrait`;
  return {
    preset,
    project: presetProject,
    files,
    config: findFile(files, 'config.yaml')?.content || '',
    keyboardName,
    keyboard: findFile(files, `light/${keyboardName}.yaml`)?.content || '',
    payload: buildEffectiveNativeKeyboardPayload(presetProject, 'light', keyboardName),
  };
});
const hintData = findFile(jsonnetFiles, 'jsonnet/lib/hintSymbolsData.libsonnet')?.content || '';
const fontSizeData = findFile(jsonnetFiles, 'jsonnet/lib/fontSize.libsonnet')?.content || '';
const keyboard26JsonnetData = findFile(jsonnetFiles, 'jsonnet/lib/keyboard26.libsonnet')?.content || '';
const othersJsonnetData = findFile(jsonnetFiles, 'jsonnet/lib/others.libsonnet')?.content || '';
const jsonnetBuildData = JSON.parse(findFile(jsonnetFiles, 'jsonnet/core/build.libsonnet')?.content || '{}');
const pinyinKeyboard = findFile(yamlFiles, 'light/pinyin_26_portrait.yaml')?.content || '';
const pinyinLandscapeKeyboard = findFile(yamlFiles, 'light/pinyin_26_landscape.yaml')?.content || '';

for (const file of yamlFiles) {
  assert(!/^\{\}$/m.test(file.content), `${file.path} 不应出现顶层独立空对象行，否则会导致 YAML parse error。`);
  if (file.path.endsWith('.yaml') && file.path !== 'resources/asset-manifest.yaml') {
    assert(!file.content.includes('\nkeyboard:'), `${file.path} 不应导出工作台中间模型 keyboard 字段。`);
  }
}

assert(findFile(yamlFiles, 'config.yaml'), '缺少 config.yaml。');
assertConfigKeyboardFilesExist(yamlFiles, findFile(yamlFiles, 'config.yaml')?.content || '', '默认导出');
assert(project.keyboardCombo.slots.symbolic.source === 'system' && project.keyboardCombo.slots.emoji.source === 'system', '默认 sample 应按使用引导选择 App 内符号键盘和 App 内 Emoji 键盘。');
assert(!findFile(yamlFiles, 'light/symbolic_portrait.yaml') && !findFile(yamlFiles, 'light/emoji_portrait.yaml'), '默认导出不应生成自定义符号/Emoji YAML，除非使用引导明确选择自定义。');
assertPackagedImageReferencesExist(packageFiles.map((file) => ({
  ...file,
  path: file.path.slice(packageRoot.length + 1),
})), '默认应用包');
assert(findFile(yamlFiles, 'light/pinyin_26_portrait.yaml'), '缺少浅色 26 键竖屏 YAML。');
assert(findFile(yamlFiles, 'dark/numeric_9_landscape.yaml'), '缺少深色数字横屏 YAML。');
assert(findFile(hiddenYamlFiles, 'light/pinyin_26_portrait.yaml'), '隐藏预览项不应删除浅色 26 键 YAML。');
assert(findFile(hiddenYamlFiles, 'dark/pinyin_26_portrait.yaml'), '隐藏预览项不应删除深色 26 键 YAML。');
assert(hiddenConfig.includes('pinyin_26_portrait'), '隐藏预览项不应删除 config.yaml 中的 26 键映射。');
assert(findFile(jsonnetFiles, 'jsonnet/lib/color.libsonnet'), '缺少 color.libsonnet。');
assert(findFile(jsonnetFiles, 'jsonnet/lib/hintSymbolsData.libsonnet'), '缺少 hintSymbolsData.libsonnet。');
assert(findFile(jsonnetFiles, 'jsonnet/lib/swipeData-en.libsonnet'), '缺少 swipeData-en.libsonnet。');
assert(findFile(jsonnetFiles, 'jsonnet/main.jsonnet'), 'Jsonnet 源码导出应包含 main.jsonnet 主入口。');
assert(findFile(jsonnetFiles, 'jsonnet/core/build.libsonnet'), 'Jsonnet 源码导出应包含 core/build.libsonnet。');
assert(findFile(jsonnetFiles, 'jsonnet/keyboard/keyboard26Template.libsonnet'), 'Jsonnet 源码导出应包含 keyboard26Template.libsonnet。');
assert(!findFile(jsonnetFiles, 'jsonnet/generated/effect-files.libsonnet'), '规范源码包不应包含 generated/effect-files.libsonnet。');
assert(!findFile(jsonnetFiles, 'jsonnet/generated/effect-yaml.libsonnet'), '规范源码包不应包含 generated/effect-yaml.libsonnet。');
assert(findFile(jsonnetFiles, 'jsonnet/main.jsonnet')?.content.trim() === "import 'core/build.libsonnet'", 'jsonnet/main.jsonnet 应按规范导入 core/build.libsonnet。');
for (const file of yamlFiles.filter((item) => item.path === 'config.yaml' || item.path.startsWith('light/') || item.path.startsWith('dark/'))) {
  assert(jsonnetBuildData[file.path] === file.content, `Jsonnet core/build 输出应与直接 YAML 同源：${file.path}。`);
}
assert(fontSizeData.includes('"方案名字号"') && !fontSizeData.includes('pinyinSchemaName'), '方案名字号应归入字号模块，不应继续放在自定义键盘 pinyinSchemaName。');
assert(fontSizeData.includes('"英文键盘小写字母大小"'), 'Jsonnet 字号库必须保留模板依赖的英文小写字母字号键。');
assert(keyboard26JsonnetData.includes('rows:') && keyboard26JsonnetData.includes('enterLabels:') && keyboard26JsonnetData.includes('systemKeys:'), 'Jsonnet 26 键库必须保留模板结构，不能被 project.keyboards.keyboard26 schema 覆盖。');
assert(othersJsonnetData.includes("'键盘总高度'") && othersJsonnetData.includes('sumHeights'), 'Jsonnet others 库必须保留模板所需的键盘总高度计算。');
assert(hintData.includes('"pinyin"') && hintData.includes('"q"'), 'Jsonnet 长按数据应包含 26 键提示。');
assert(pinyinKeyboard.includes('keyboardLayout:'), 'YAML 键盘应导出 Hamster 原生 keyboardLayout。');
assert(pinyinKeyboard.includes('HStackStyle:') && pinyinKeyboard.includes('height: "1/5"'), '26 键 YAML 应保留原始实机行高，预览压缩不能污染导出。');
assert(pinyinKeyboard.includes('qButton:') && pinyinKeyboard.includes('qButtonForegroundStyle:'), 'YAML 键盘应导出 Hamster 原生按键和前景样式。');
assert(yamlBlock(pinyinKeyboard, 'qButtonForegroundStyle').includes('fontSize: 15'), '默认 26 键字母字号应使用实机校准后的默认预设。');
assert(yamlBlock(pinyinKeyboard, 'qButtonForegroundStyle').includes('text: "q"'), '默认中文 26 键字母应导出小写文案，与使用引导默认一致。');
assert(yamlBlock(alphabeticKeyboard, 'qButtonForegroundStyle').includes('text: "q"'), '默认英文 26 键字母应导出小写文案。');
assert(yamlBlock(uppercasePinyinKeyboard, 'qButtonForegroundStyle').includes('text: "Q"'), '中文 26 键字母大写设置应联动到导出实际按键前景。');
assert(yamlBlock(uppercaseAlphabeticKeyboard, 'qButtonForegroundStyle').includes('text: "Q"'), '英文 26 键字母大写设置应联动到导出实际按键前景。');
assert(yamlBlock(pinyinKeyboard, 'qButton').includes('- "qButtonUppercasedForegroundStyle"')
  && !yamlBlock(pinyinKeyboard, 'qButton').includes('- "qButtonUppercasedStateForegroundStyle"')
  && !yamlBlock(pinyinKeyboard, 'qButton').includes('- "qButtonUpForegroundStyle"')
  && !yamlBlock(pinyinKeyboard, 'qButton').includes('- "qButtonDownForegroundStyle"'), '默认关闭划动时，26 键锁定大写状态不应叠旧前景或上下划前景。');
assert(yamlBlock(enabledSwipeKeyboard, 'qButton').includes('- "qButtonUpForegroundStyle"')
  && yamlBlock(enabledSwipeKeyboard, 'qButton').includes('- "qButtonDownForegroundStyle"'), '显式开启划动后，26 键锁定大写状态应继承原始上下划前景引用。');
assert(!yamlBlock(pinyinKeyboard, 'qButton').includes('qButtonSwipeUpForegroundStyle') && !yamlBlock(pinyinKeyboard, 'qButton').includes('qButtonSwipeDownForegroundStyle'), '26 键按钮引用不应包含预览 SwipeUp/SwipeDown 别名。');
assert(yamlBlock(pinyinKeyboard, 'cnenButtonForegroundStyle').includes('text: "中"'), '默认中英切换键应显示单字“中”。');
assert(yamlBlock(pinyinKeyboard, 'cnenButtonForegroundStyle').includes('fontSize: 16'), '默认功能键文字字号应独立于 26 键字母字号，并与参考工具一致。');
assert(yamlBlock(pinyinKeyboard, 'toolbarCloseButton').includes('action: "dismissKeyboard"')
  && !yamlBlock(pinyinKeyboard, 'toolbarCloseButton').includes('action:\n    action:'), '工具栏收起键应导出可执行的 dismissKeyboard 字符串，不应嵌套 action 对象。');
assert(yamlBlock(pinyinKeyboard, 'cnenButton').includes('shortcut: "#中英切换"'), '默认中英切换键应导出真实中英切换指令。');
assert(!yamlBlock(pinyinKeyboard, 'cnenButton').includes('keyboardType: "alphabetic"'), '默认中英切换键不应再退化成仅切英文键盘。');
assert(yamlBlock(pinyinKeyboard, 'shiftButtonForegroundStyle').includes('systemImageName: "shift"'), '默认 Shift 键普通态应导出空心 Shift 图标，保持与预览一致。');
assert(yamlBlock(pinyinKeyboard, 'shiftButton').includes('hintSymbolsStyle: "shiftButtonHintSymbolsStyle"') && yamlBlock(pinyinKeyboard, 'shiftButtonHintSymbolsStyle').includes('shiftButtonHintSymbol0') && yamlBlock(pinyinKeyboard, 'shiftButtonHintSymbol0ForegroundStyle').includes('systemImageName: "shift.fill"'), '默认 Shift 键应导出长按候选，并保留填充 Shift 图标。');
assert(yamlBlock(pinyinKeyboard, 'alphabeticBackgroundStyle').includes('normalLowerEdgeColor: "#88898D"') && yamlBlock(pinyinKeyboard, 'alphabeticBackgroundStyle').includes('borderColor: "#C7C7CC"'), '字母键背景应导出下边缘和边框，避免预览过于扁平。');
assert(yamlBlock(pinyinKeyboard, 'qButton').includes('size:') && yamlBlock(pinyinKeyboard, 'qButton').includes('percentage: 0.1'), '26 键 YAML 应导出普通键尺寸。');
assert(yamlBlock(pinyinKeyboard, 'aButton').includes('percentage: 0.15') && yamlBlock(pinyinKeyboard, 'aButton').includes('alignment: "right"'), '默认 26 键 A 左侧空白应属于 A 键命中区，并通过 bounds 让可见键帽右对齐。');
assert(yamlBlock(pinyinKeyboard, 'lButton').includes('percentage: 0.15') && yamlBlock(pinyinKeyboard, 'lButton').includes('alignment: "left"'), '默认 26 键 L 右侧空白应属于 L 键命中区，并通过 bounds 让可见键帽左对齐。');
assert(yamlBlock(pinyinKeyboard, 'shiftButton').includes('percentage: 0.15') && yamlBlock(pinyinKeyboard, 'backspaceButton').includes('percentage: 0.15'), '默认 26 键 Shift/退格应按参考皮肤宽度导出。');
assert(yamlBlock(pinyinKeyboard, '123Button').includes('percentage: 0.18') && yamlBlock(pinyinKeyboard, 'enterButton').includes('percentage: 0.18') && yamlBlock(pinyinKeyboard, 'cnenButton').includes('percentage: 0.1') && yamlBlock(pinyinKeyboard, 'spaceRightButton').includes('percentage: 0.1') && yamlBlock(pinyinKeyboard, 'spaceButton').includes('percentage: 0.44'), '默认 26 键底排宽度应满足 123=回车、中英=逗号，并缩短空格。');
assert(yamlBlock(pinyinKeyboard, 'toolbarMenuButtonForegroundStyle').includes('previewFontScale') === false, '导出的 toolbar 前景不应包含工作台预览专用缩放字段。');
const removedToolbarScaleKey = 'toolbar按键' + '缩放';
assert(!Object.prototype.hasOwnProperty.call(project.theme.shared.scale, removedToolbarScaleKey), '前景缩放不应包含 toolbar 按键缩放。');
assert(project.theme.light.colors['键盘背景颜色'] === '#E1E2E7' && project.theme.dark.colors['键盘背景颜色'] === '#47474701', '默认浅色键盘背景应使用实机校准后的键盘灰，深色仍保持当前预设。');
assert(!legacyZeroTransparentKeyboard.includes('D0D3DA00') && legacyZeroTransparentKeyboard.includes('normalColor: "#D0D3DA01"'), '旧项目中的 00 全透明背景导出时应自动迁移为示例同款 01 近透明。');
assert(yamlBlock(legacyTransparentKeyboard, 'keyboardBackgroundStyle').includes('normalColor: "#D0D3DA01"')
  && yamlBlock(legacyTransparentKeyboard, 'toolbarBackgroundStyle').includes('normalColor: "#D0D3DA01"')
  && yamlBlock(legacyTransparentKeyboard, 'preeditBackgroundStyle').includes('normalColor: "#D0D3DA01"'), '键盘、toolbar、preedit 三个容器背景都应按示例 26 键格式导出 01 近透明。');
assert(pinyinKeyboard.includes('toolbarSymbolButton:') && pinyinKeyboard.includes('toolbarTranslateButton:') && pinyinKeyboard.includes('toolbarScriptButton:'), '默认 26 键工具栏应按参考皮肤导出 8 个图标槽位。');
assert(yamlBlock(pinyinKeyboard, 'toolbarMenuButton').includes('keyboardType: "panel"'), '默认工具栏菜单应导出 keyboardType: panel。');
assert(!yamlBlock(pinyinKeyboard, 'toolbarMenuButton').includes('floatKeyboardType:'), '默认工具栏菜单不应导出 floatKeyboardType。');
assert(yamlBlock(pinyinKeyboard, 'toolbarPhraseButton').includes('shortcut: "#showPhraseView"'), '默认工具栏常用语应导出 showPhraseView 指令。');
assert(yamlBlock(pinyinKeyboard, 'toolbarPasteboardButton').includes('shortcut: "#showPasteboardView"'), '默认工具栏剪贴板应导出 showPasteboardView 指令。');
assert(yamlBlock(pinyinKeyboard, 'toolbarMenuButtonForegroundStyle').includes('systemImageName: "gear"'), '默认 26 键工具栏菜单按钮应使用参考皮肤 gear 图标。');
assert(yamlBlock(pinyinKeyboard, 'toolbarMenuButtonForegroundStyle').includes('fontSize: 20') && yamlBlock(pinyinKeyboard, 'toolbarMenuButtonForegroundStyle').includes('y: 0.6'), '默认 26 键工具栏图标字号和偏移应与实际 App 效果一致。');
assert(yamlBlock(pinyinKeyboard, 'toolbarTranslateButtonForegroundStyle').includes('y: 0.6'), '默认 26 键工具栏文字和图标应共用 toolbar 按键偏移。');
assert(yamlBlock(customCenterKeyboard, 'qButtonForegroundStyle').includes('x: 0.44') && yamlBlock(customCenterKeyboard, 'qButtonForegroundStyle').includes('y: 0.62'), '自定义单键偏移应覆盖普通按键前景中心。');
assert(yamlBlock(customCenterKeyboard, 'toolbarMenuButtonForegroundStyle').includes('x: 0.48') && yamlBlock(customCenterKeyboard, 'toolbarMenuButtonForegroundStyle').includes('y: 0.58'), '自定义 toolbar 单项偏移应覆盖对应工具栏前景中心。');
assert(customCenterPayload.qButtonForegroundStyle.center?.y === 0.62 && customCenterPayload.toolbarMenuButtonForegroundStyle.center?.y === 0.58, '自定义单键偏移应同步进入 effective native payload，供预览和导出同源使用。');
assert(yamlBlock(pinyinKeyboard, 'toolbarPhraseButtonForegroundStyle').includes('systemImageName: "list.bullet.clipboard"'), '默认 26 键工具栏短语按钮应使用参考皮肤图标。');
assert(yamlBlock(pinyinKeyboard, 'toolbarPasteboardButtonForegroundStyle').includes('systemImageName: "doc.on.clipboard"'), '默认 26 键工具栏剪贴板按钮应使用参考皮肤图标。');
assert(pinyinKeyboard.includes('qButtonUpForegroundStyle:') && pinyinKeyboard.includes('qButtonDownForegroundStyle:'), 'YAML 键盘应导出原始划动前景样式。');
assert(!pinyinKeyboard.includes('qButtonSwipeUpForegroundStyle:') && !pinyinKeyboard.includes('qButtonSwipeDownForegroundStyle:'), '26 键 YAML 不应导出预览 SwipeUp/SwipeDown 别名样式。');
assert(!yamlBlock(pinyinKeyboard, 'qButton').includes('- "qButtonUpForegroundStyle"'), '默认关闭划动时，26 键按键不应引用上划显示前景。');
assert(yamlBlock(enabledSwipeKeyboard, 'qButton').includes('- "qButtonForegroundStyle"') && yamlBlock(enabledSwipeKeyboard, 'qButton').includes('- "qButtonUpForegroundStyle"'), '26 键显式开启划动显示后，按键应引用基础前景和原始上划前景。');
assert(pinyinKeyboard.includes('normalColor: "#838383ff"'), '划动前景颜色应使用预览中的划动字符颜色。');
assert(yamlBlock(pinyinKeyboard, 'qButtonUpForegroundStyle').includes('x: 0.5') && yamlBlock(pinyinKeyboard, 'qButtonUpForegroundStyle').includes('y: 0.18'), '上划提示应导出为更靠上的按键上方居中显示。');
assert(yamlBlock(pinyinKeyboard, 'qButtonDownForegroundStyle').includes('x: 0.5') && yamlBlock(pinyinKeyboard, 'qButtonDownForegroundStyle').includes('y: 0.84'), '下划提示应导出为更靠下的按键下方居中显示。');
assert(pinyinKeyboard.includes('horizontalCandidatesLayout:') && pinyinKeyboard.includes('horizontalCandidates:'), 'YAML 键盘应导出横向候选布局和集合。');
assert(pinyinKeyboard.includes('type: "horizontalCandidates"') && pinyinKeyboard.includes('candidateStyle: "candidateStyle"'), '横向候选集合应声明原生候选类型和候选样式。');
assert(pinyinKeyboard.includes('verticalCandidatesLayout:') && pinyinKeyboard.includes('verticalCandidates:'), 'YAML 键盘应导出纵向候选布局和集合。');
assert(pinyinKeyboard.includes('type: "verticalCandidates"') && pinyinKeyboard.includes('candidateStyle: "verticalCandidateCellStyle"'), '纵向候选集合应声明原生候选类型和候选样式。');
assert(!pinyinKeyboard.includes('selectedPadding:'), 'YAML 键盘不应导出仅供工作台预览使用的候选内边距字段。');
assert(pinyinKeyboard.includes('expandButton:') && pinyinKeyboard.includes('shortcut: "#candidatesBarStateToggle"'), '候选栏展开按钮应导出切换动作。');
assert(pinyinKeyboard.includes('hintSymbolsStyle: "qButtonHintSymbolsStyle"') && pinyinKeyboard.includes('selectedIndex: 0'), 'YAML 键盘应导出 Hamster 原生长按候选样式。');
assert(!pinyinKeyboard.includes('\nkeyboard:'), 'YAML 键盘不应继续导出工作台中间模型 keyboard 字段。');
assert(pinyinLandscapeKeyboard.includes('Cell: "qButton"') && pinyinLandscapeKeyboard.includes('Cell: "pButton"'), '横屏 26 键应从左右分栏导出有效按键。');
assert(!pinyinLandscapeKeyboard.includes('subviews: []'), '横屏 26 键不应导出空 subviews。');
assert(numericKeyboard.includes('style: "VStackStyle1"') && numericKeyboard.includes('style: "VStackStyle2"'), '数字 9 键 YAML 应导出左右窄列和中间宽列。');
assertNativeKeyboardYaml(numericKeyboard, '数字 9 键 YAML');
assertNoBareColorYaml(numericKeyboard, '数字 9 键 YAML');
assert(numericKeyboard.includes('VStackStyle1:') && numericKeyboard.includes('width: "29/183"') && numericKeyboard.includes('VStackStyle2:') && numericKeyboard.includes('width: "125/549"'), '数字 9 键 YAML 应导出 Hamster 原生列宽比例。');
assert(!numericKeyboard.includes('swipeUpAction:') && !numericKeyboard.includes('swipeDownAction:'), '数字 9 键默认不应导出上下划动动作。');
assert(!disabledSwipeData.includes('"q"'), '关闭滑动后 Jsonnet 不应导出滑动键。');
assert(!disabledSwipeKeyboard.includes('swipeUpAction:') && !disabledSwipeKeyboard.includes('swipeDownAction:'), '关闭滑动后 YAML 不应导出滑动动作。');
assert(!comboConfig.includes('alphabetic_26_portrait'), 'schemaToggle 不应继续导出独立英文键盘映射。');
assert(yamlBlock(combineActionKeyboard, 'cnenButton').includes('combine:') && yamlBlock(combineActionKeyboard, 'cnenButton').includes('keyboardType: "alphabetic"') && yamlBlock(combineActionKeyboard, 'cnenButton').includes('switchRimeSchema: "melt_eng"'), '组合动作应按 action.combine 数组导出。');
assert(comboConfig.includes('numeric_ios_portrait') && comboConfig.includes('numeric_ios_landscape'), 'iOS 数字键盘组合应导出新的数字键盘映射。');
assert(findFile(comboYamlFiles, 'light/numeric_ios_portrait.yaml'), 'iOS 数字键盘组合应生成竖屏 YAML。');
const numericBackTo9Project = createSampleProject();
numericBackTo9Project.keyboardCombo.slots.numeric.variant = 'ios';
numericBackTo9Project.config = buildEffectiveProject(numericBackTo9Project).config;
numericBackTo9Project.keyboardCombo.slots.numeric.variant = '9';
const numericBackTo9Config = findFile(buildYamlSkinFiles(numericBackTo9Project), 'config.yaml')?.content || '';
assert(numericBackTo9Config.includes('numeric_9_portrait') && !numericBackTo9Config.includes('numeric_ios_portrait'), '数字键盘从 iOS 切回 9 后导出 config 不应残留 iOS 映射。');
assert(!comboSpaceKeyboard.includes('$rimeSchemaName'), '关闭空格方案名后不应继续导出方案名文本。');
assert(comboSpaceKeyboard.includes('character: "！"'), '自定义逗号上划字符应导出到 spaceRight 划动动作。');
assert(yamlBlock(pinyinKeyboard, 'spaceRightButtonForegroundStyle').includes('text: "，"')
  && yamlBlock(pinyinKeyboard, 'spaceRightButton').includes('character: "，"')
  && !yamlBlock(pinyinKeyboard, 'spaceRightButton').includes('spaceRightButtonForegroundStyle2'), '默认关闭划动时，中文逗号键只显示并点击逗号。');
assert(yamlBlock(alphabeticKeyboard, 'spaceRightButtonForegroundStyle').includes('text: "."')
  && yamlBlock(alphabeticKeyboard, 'spaceRightButton').includes('character: "."')
  && !yamlBlock(alphabeticKeyboard, 'spaceRightButton').includes('spaceRightButtonForegroundStyle2'), '默认关闭划动时，英文逗号键只显示并点击句号。');
assert(!comboSwipeDisabledKeyboard.includes('swipeUpAction:') && !comboSwipeDisabledKeyboard.includes('swipeDownAction:'), '组合层关闭划动后 YAML 不应继续导出划动动作。');
assert(!splitSwipePinyinKeyboard.includes('swipeUpAction:') && splitSwipeAlphabeticKeyboard.includes('swipeUpAction:'), '中文/英文划动开关应能独立影响各自导出。');
assert(comboNumericKeyboard.includes('character: "一"'), '数字键盘 YAML 应导出 numeric 划动数据，而不是复用拼音划动。');
assert(yamlBlock(styledPinyinKeyboard, 'alphabeticBackgroundStyle').includes('borderSize: 1.2'), '通过工具调整普通键边框宽度后，14 键等 26 键变体导出应同步更新。');
assert(yamlBlock(styledPinyinKeyboard, 'alphabeticBackgroundStyle').includes('shadowRadius: 5.5') && yamlBlock(styledPinyinKeyboard, 'alphabeticBackgroundStyle').includes('shadowOpacity: 0.66'), '通过工具调整普通键阴影参数后，导出应保留阴影半径和强度。');
assert(yamlBlock(styledPinyinKeyboard, 'alphabeticBackgroundStyle').includes('y: 2.5'), '通过工具调整普通键阴影偏移后，导出应保留新的阴影偏移。');
assert(styleOverridePayload.keyboardBackgroundStyle?.normalColor === '#123456', '主题键盘背景色应覆盖示例 raw payload 的 legacy 透明容器背景。');
assert(styleOverridePayload.alphabeticBackgroundStyle?.normalColor === '#abcdef', '普通键背景主题色应覆盖 native 预设里的静态键帽背景色。');
assert(styleOverridePayload.qButtonForegroundStyle?.normalColor === '#654321', '按键前景主题色应覆盖 native 预设里的静态前景色。');
assert(styleOverridePayload.alphabeticHintSymbolsBackgroundStyle?.buttonStyleType === 'fileImage', '图片类长按样式不应被几何样式覆盖。');
assert(opaqueContainerPayload.keyboardBackgroundStyle?.normalColor === '#474747FF'
  && opaqueContainerPayload.toolbarBackgroundStyle?.normalColor === '#474747FF'
  && opaqueContainerPayload.preeditBackgroundStyle?.normalColor === '#474747FF', '显式不透明主题色应覆盖示例 raw payload 的 legacy 容器背景。');
assert(yamlBlock(customMetricsKeyboard, 'aButton').includes('percentage: 0.18') && yamlBlock(customMetricsKeyboard, 'aButton').includes('width: "5/9"'), '左侧按键尺寸模块修改 A 键后，导出 YAML 应同步命中宽度和可见 bounds。');
assert(yamlBlock(customMetricsKeyboard, 'lButton').includes('percentage: 0.18') && yamlBlock(customMetricsKeyboard, 'lButton').includes('alignment: "left"'), '左侧按键尺寸模块修改 L 键后，导出 YAML 应同步命中宽度和可见 bounds。');
assert(yamlBlock(customMetricsKeyboard, 'spaceButton').includes('percentage: 0.46'), '左侧按键尺寸模块修改空格宽度后，导出 YAML 应同步。');
for (const { preset, project: presetProject, files, config, keyboardName, keyboard, payload } of presetChecks) {
  const rawPayload = NATIVE_KEYBOARD_PRESET_PAYLOADS[preset.value]?.light?.[keyboardName];
  const presetNativePayload = preset.nativePayloads?.light?.[keyboardName];
  const alphabeticKeyboard = findFile(files, 'light/alphabetic_26_portrait.yaml')?.content || '';
  assert(presetProject.guide.preferences.symbolLayout === 'system', `${preset.label} 默认符号键盘应选择 App 内键盘。`);
  assert(presetProject.guide.preferences.emojiLayout === 'system', `${preset.label} 默认 Emoji 键盘应选择 App 内键盘。`);
  assert(presetProject.keyboardCombo.slots.symbolic.source === 'system' && presetProject.keyboardCombo.slots.symbolic.variant === 'system', `${preset.label} symbolic slot 应默认使用 App 内键盘。`);
  assert(presetProject.keyboardCombo.slots.emoji.source === 'system' && presetProject.keyboardCombo.slots.emoji.variant === 'system', `${preset.label} emoji slot 应默认使用 App 内键盘。`);
  assert(!config.includes('symbolic:') && !config.includes('symbolic_system') && !findFile(files, 'light/symbolic_portrait.yaml'), `${preset.label} 默认不应导出自定义符号键盘。`);
  assert(!config.includes('emoji:') && !config.includes('emoji_system') && !findFile(files, 'light/emoji_portrait.yaml'), `${preset.label} 默认不应导出自定义 Emoji 键盘。`);
  assert(config.includes(`${keyboardName}`), `${preset.label} 应写入 config 映射。`);
  assert(keyboard.includes('keyboardLayout:'), `${preset.label} 应生成原生键盘 YAML。`);
  assert(alphabeticKeyboard.includes('keyboardLayout:') && !alphabeticKeyboard.includes('\nkeyboard:'), `${preset.label} 同包英文 26 键也应导出原生键盘 YAML。`);
  assert(payload.keyboardHeight > 0 && payload.toolbarHeight > 0, `${preset.label} 应写入有效 frame 高度。`);
  assert(rawPayload, `${preset.label} 应存在示例皮肤实际 raw payload。`);
  if (/^(pinyin_(9|14|18)|numeric_9)_/.test(keyboardName)) {
    assertNoLegacyRuntimeResidue(presetNativePayload, `${preset.label} preset.nativePayloads/${keyboardName}`, { checkColors: false });
  }
  assert(payload.keyboardHeight === 216 && payload.toolbarHeight === 41, `${preset.label} 应使用统一竖屏 toolbar/keyboard 高度。`);
  if (preset.value === 'ios-26') {
    assert(JSON.stringify(payload.keyboardLayout) !== JSON.stringify(rawPayload.keyboardLayout) && !JSON.stringify(payload.keyboardLayout).includes('pinyin26RowInsetButton'), '仿 iOS 26键导出不应使用伪空白 Cell，避免 App 解析皮肤格式失败。');
  } else if (preset.value === 'ios-18') {
    assert(JSON.stringify(payload.keyboardLayout) !== JSON.stringify(rawPayload.keyboardLayout)
      && payload.HStackStyle?.size?.height === '1/4'
      && payload.keyboardLayout.every((row) => row?.HStack?.style === 'HStackStyle'), '示例18键预设应补齐行样式，避免 App 按 0 尺寸渲染为空白。');
  } else {
    assert(JSON.stringify(payload.keyboardLayout) === JSON.stringify(rawPayload.keyboardLayout), `${preset.label} 导出应使用示例皮肤实际 keyboardLayout。`);
  }
}
const preset14 = presetChecks.find((item) => item.preset.value === 'ios-14');
assert(preset14.payload.toolbarHeight === 41 && preset14.payload.keyboardHeight === 216, '示例14键预设应使用统一竖屏 toolbar/keyboard 高度。');
assert(preset14.payload.toolbarStyle.insets?.top === 5 && preset14.payload.toolbarStyle.insets?.left === 3, '示例14键预设应使用统一 toolbarStyle 顶部/左侧边距。');
assert(preset14.payload.toolbarStyle.backgroundStyle === 'toolbarBackgroundStyle'
  && preset14.payload.keyboardStyle.backgroundStyle === 'keyboardBackgroundStyle'
  && preset14.payload.toolbarBackgroundStyle?.normalColor === preset14.payload.keyboardBackgroundStyle?.normalColor
  && preset14.payload.toolbarBackgroundStyle?.normalColor !== '#00000001', '示例14键预设 toolbar/keyboard 容器背景应使用统一背景样式，不能残留 raw seed 透明圆角背景。');
assert(preset14.payload.horizontalCandidates?.candidateStyle === 'candidateStyle'
  && preset14.payload.horizontalCandidatesStyle?.backgroundStyle === 'toolbarBackgroundStyle'
  && preset14.payload.candidateStyle?.preferredTextColor !== '#00c381'
  && !preset14.payload.horizontalCandidateStyle
  && !preset14.keyboard.includes('horizontalCandidateStyle:'), '示例14键预设候选栏应使用统一 candidateStyle，不能残留 raw seed 绿色候选样式。');
assert(preset14.payload.erButton?.hintStyle === 'erButtonHintStyle'
  && preset14.payload.erButton?.hintSymbolsStyle === 'erButtonHintSymbolsStyle'
  && preset14.payload.erButtonHintStyle?.backgroundStyle === 'alphabeticHintBackgroundStyle'
  && preset14.payload.erButtonHintSymbolsStyle?.backgroundStyle === 'alphabeticHintSymbolsBackgroundStyle'
  && preset14.payload.alphabeticHintSymbolsBackgroundStyle?.buttonStyleType === 'geometry'
  && preset14.payload.alphabeticHintSymbolsSelectedStyle?.buttonStyleType === 'geometry'
  && preset14.payload.erButtonHintSymbolsForegroundStyleOf0?.text === 'e'
  && preset14.payload.erButtonHintSymbolsForegroundStyleOf1?.text === 'r', '示例14键组合键长按应导出统一 hint/hintSymbols 样式，不能依赖旧 seed 缺省图层。');
assert(preset14.keyboard.includes('Cell: "qwButton"') && preset14.keyboard.includes('Cell: "cvButton"'), '示例14键预设应导出 14 键布局骨架。');
assert(preset14.payload['123Button'].size.width.percentage === preset14.payload.enterButton.size.width.percentage
  && preset14.payload.commaButton.size.width.percentage === preset14.payload.cnenButton.size.width.percentage
  && preset14.payload.spaceButton.size.width.percentage === 3 / 7,
  '示例14键预设底排比例应与预览同源：123=发送，逗号=中英，剩余给空格。');
assert(preset14.keyboard.includes('normalShadowColor: "#00000026"'), '示例14键预设应导出示例皮肤实际按键阴影颜色。');
assert(!preset14.keyboard.includes('swipeUpAction:') && !preset14.keyboard.includes('swipeDownAction:'), '示例14键预设默认不应导出上下划动动作。');
assert(preset14.payload.spaceBg?.normalColor === preset14.payload.alphabeticBackgroundStyle?.normalColor
  && preset14.payload.periodBg?.normalColor === preset14.payload.systemButtonBackgroundStyle?.normalColor, '示例14键底栏空格/遗留标点背景应走中文键盘统一风格，不能残留 raw seed 灰白。');
const preset14AlphabeticKeyboard = findFile(preset14.files, 'light/alphabetic_26_portrait.yaml')?.content || '';
const preset14Pinyin9Payload = buildEffectiveNativeKeyboardPayload(preset14.project, 'light', 'pinyin_9_portrait');
const preset14NumericPayload = buildEffectiveNativeKeyboardPayload(preset14.project, 'light', 'numeric_9_portrait');
assert(yamlBlock(preset14AlphabeticKeyboard, 'cnenButton').includes('action: "returnLastKeyboard"')
  && preset14AlphabeticKeyboard.includes('style: "字母竖屏"')
  && preset14AlphabeticKeyboard.includes('style: "底栏竖屏"'), '示例14键切到英文26键后应使用参考行样式，并用中英键返回上一键盘。');
assert(preset14NumericPayload.collection?.type === 'numericSymbols'
  && preset14NumericPayload.keyboardLayout.some((node) => JSON.stringify(node).includes('"Cell":"collection"')), '示例14键切数字9键时应生成真实 collection Cell，避免数字键盘空白。');
assert(preset14NumericPayload.number1Fg?.buttonStyleType === 'text'
  && preset14NumericPayload.number1Fg?.text === '1'
  && preset14NumericPayload.number1Button?.foregroundStyle?.includes('number1Fg'), '示例14键切数字9键时数字主键应导出文字前景，不能沿用缺资源 fileImage。');
assert(preset14NumericPayload.keyboardStyle?.backgroundStyle === 'keyboardBackgroundStyle'
  && preset14NumericPayload.keyboardBackgroundStyle?.normalColor === preset14Pinyin9Payload.keyboardBackgroundStyle?.normalColor, '示例14键切数字9键时键盘背景应与中文9键同源，不能沿用旧 seed 图片背景。');
assert(preset14NumericPayload.toolbarStyle?.backgroundStyle === 'toolbarBackgroundStyle'
  && preset14NumericPayload.toolbarBackgroundStyle?.normalColor === preset14Pinyin9Payload.toolbarBackgroundStyle?.normalColor, '示例14键切数字9键时 toolbar 背景应与中文9键同源。');
assert(preset14NumericPayload.symbolsCollectionBg?.normalColor === preset14Pinyin9Payload.collectionBackgroundStyle?.normalColor
  && preset14NumericPayload.symbolsCollectionBg?.shadowRadius === preset14Pinyin9Payload.collectionBackgroundStyle?.shadowRadius, '示例14键切数字9键时左侧符号栏应与中文9键 collection 风格一致。');
assert(preset14NumericPayload.backspaceBg?.normalColor === preset14Pinyin9Payload.systemButtonBackgroundStyle?.normalColor
  && preset14NumericPayload.enterBgCol?.normalColor === preset14Pinyin9Payload.systemButtonBackgroundStyle?.normalColor
  && preset14NumericPayload.returnBgCol?.normalColor === preset14Pinyin9Payload.systemButtonBackgroundStyle?.normalColor, '示例14键切数字9键时功能键和条件返回/确认键应使用中文9键功能键色，不应残留绿色旧 seed。');
assert(preset14NumericPayload.clearBg?.normalColor === preset14Pinyin9Payload.systemButtonBackgroundStyle?.normalColor
  && preset14NumericPayload.equalBg?.normalColor === preset14Pinyin9Payload.systemButtonBackgroundStyle?.normalColor
  && preset14NumericPayload.commaBg?.normalColor === preset14Pinyin9Payload.systemButtonBackgroundStyle?.normalColor
  && preset14NumericPayload.periodBg?.normalColor === preset14Pinyin9Payload.systemButtonBackgroundStyle?.normalColor
  && preset14NumericPayload.spaceBg?.normalColor === preset14Pinyin9Payload.numberButtonBackgroundStyle?.normalColor, '示例14键切数字9键时右侧功能键/标点/空格背景应统一到中文9键风格，不能残留 #f6f6f6/#fafafa。');
assert(preset14NumericPayload.spaceButton?.backgroundStyle === 'clearBg'
  && preset14NumericPayload.clearBg?.normalColor === preset14Pinyin9Payload.systemButtonBackgroundStyle?.normalColor
  && preset14NumericPayload.numspaceFg?.text === '空格'
  && preset14NumericPayload.numspaceFg?.normalColor !== '#FFFFFF', '示例14键切数字9键时空格键应显示深色“空格”，并使用功能键背景。');
assert(preset14NumericPayload.numperiodFg?.buttonStyleType === 'text'
  && preset14NumericPayload.numperiodFg?.text === '.'
  && !preset14NumericPayload.numperiodFg?.normalImage
  && preset14NumericPayload.numperiodFg?.normalColor !== '#FFFFFF', '示例14键切数字9键时句点键应导出文字前景，不能依赖缺失图片导致实机空白。');
assert(preset14NumericPayload.returnFgCol?.normalColor === preset14NumericPayload.returnFgGray?.normalColor
  && preset14NumericPayload.enterFgCol9?.normalColor === preset14NumericPayload.enterFgGray?.normalColor
  && preset14NumericPayload.returnFgCol?.normalColor !== '#FFFFFF'
  && preset14NumericPayload.enterFgCol9?.normalColor !== '#FFFFFF', '示例14键切数字9键时返回/搜索类条件按钮文字应统一到功能键文字色，不能残留 raw seed 白字。');
assert(!JSON.stringify(preset14NumericPayload).includes('horizontalCandidateStyle')
  && !JSON.stringify(preset14NumericPayload).includes('hold_back')
  && !/"file":"hint"/.test(JSON.stringify(preset14NumericPayload)), '示例14键切数字9键时 resolved payload 不应残留旧候选别名或旧长按图片样式。');
const preset17 = presetChecks.find((item) => item.preset.value === 'ios-17');
assert(preset17.payload.hButton.size.width === '1/6' || preset17.payload.hButton.size.width.percentage > 0.16, '示例17键预设普通键应接近六等分。');
assert(preset17.keyboard.includes('Cell: "hButton"') && preset17.keyboard.includes('Cell: "wButton"'), '示例17键预设应导出 17 键关键按键。');
assert(preset17.payload.HStackStyle.size.height === '1/4', '示例17键竖屏只有四行，行高应统一为 1/4。');
const preset18 = presetChecks.find((item) => item.preset.value === 'ios-18');
assert(preset18.payload.toolbarStyle.insets?.top === 5, '示例18键预设应使用统一 toolbarStyle 顶部边距。');
assert(preset18.payload.horizontalCandidates?.candidateStyle === 'candidateStyle'
  && preset18.payload.horizontalCandidatesStyle?.backgroundStyle === 'toolbarBackgroundStyle'
  && preset18.payload.candidateStyle?.preferredTextColor !== '#00c381'
  && !preset18.payload.horizontalCandidateStyle
  && !preset18.keyboard.includes('horizontalCandidateStyle:')
  && preset18.payload.toolbarStyle?.backgroundStyle === 'toolbarBackgroundStyle'
  && preset18.payload.toolbarBackgroundStyle?.normalColor === preset18.payload.keyboardBackgroundStyle?.normalColor
  && preset18.payload.alphabeticHintSymbolsBackgroundStyle?.buttonStyleType === 'geometry', '示例18键预设候选栏应使用统一 candidateStyle，不能残留 raw seed 绿色候选样式。');
assert(!preset18.payload.toolbarMenuButton?.size && !preset18.payload.toolbarCloseButton?.size, '示例18键工具栏不应保留 raw seed 的 1/7 按钮宽度，8 个槽位应由 App 均分排列。');
assert(preset18.payload.aButton.bounds?.alignment === 'right' && preset18.payload.lButton.bounds?.alignment === 'left', '示例18键预设应保留 A/L 可见区域对齐。');
assert(preset18.keyboard.includes('Cell: "wButton"') && preset18.keyboard.includes('Cell: "xButton"'), '示例18键预设应导出示例皮肤实际 18 键关键按键。');
assert(!preset18.keyboard.includes('swipeUpAction:')
  && !preset18.keyboard.includes('swipeDownAction:')
  && !preset18.keyboard.includes('Notification:')
  && !preset18.keyboard.includes('KeyboardAction:'), '示例18键预设默认不应导出旧 seed 的划动/通知/动作装饰，避免实机应用后空白。');
const preset26 = presetChecks.find((item) => item.preset.value === 'ios-26');
assert(preset26.payload.aButton.bounds?.alignment === 'right' && preset26.payload.lButton.bounds?.alignment === 'left', '仿 iOS 26键预设应保留参考皮肤 A/L 命中区裁切，让两侧空白点击仍归属 A/L。');
assert(yamlBlock(preset26.keyboard, 'spaceButton').includes('percentage: 0.44'), '仿 iOS 26键预设底排空格比例应与当前 26 键参数源一致。');
assert(preset26.payload.toolbarMenuButtonForegroundStyle.center?.y === 0.6, '仿 iOS 26键预设 toolbar 按键偏移纵向默认值应为 0.6。');
assert(preset26.payload['123Button'].size.width.percentage === 0.18
  && preset26.payload.enterButton.size.width.percentage === 0.18
  && preset26.payload.cnenButton.size.width.percentage === 0.1
  && preset26.payload.spaceRightButton.size.width.percentage === 0.1
  && preset26.payload.spaceButton.size.width.percentage === 0.44, '仿 iOS 26键 effective payload 底排宽度应同步到右侧原生预览。');
const preset9 = presetChecks.find((item) => item.preset.value === 'ios-9');
assert(preset9.keyboard.includes('Cell: "collection"') && preset9.keyboard.includes('Cell: "number1Button"'), '仿 iOS 9键预设应导出示例皮肤实际 9 键布局。');
assert(yamlBlock(preset9.keyboard, 'toolbarStyle').includes('backgroundStyle: "toolbarBackgroundStyle"')
  && yamlBlock(preset9.keyboard, 'preeditStyle').includes('backgroundStyle: "preeditBackgroundStyle"'), '仿 iOS 9键应补齐 toolbar/preedit 容器样式，避免实机工具栏空白。');
assert(yamlBlock(preset9.keyboard, 'collection').includes('type: "t9Symbols"')
  && yamlBlock(preset9.keyboard, 'collection').includes('dataSource: "symbols"')
  && preset9.keyboard.includes('dataSource:')
  && preset9.keyboard.includes('symbols:')
  && preset9.keyboard.includes('value: "，"'), '仿 iOS 9键左侧符号列表应有默认符号数据。');
assert(!preset9.keyboard.includes('horizontalCandidateStyle:')
  && !preset9.keyboard.includes('hold_back')
  && !preset9.keyboard.includes('file: "hint"'), '仿 iOS 9键导出不应残留旧候选别名或旧长按图片样式。');
for (const variant of ['9', '14', '18']) {
  const variantProject = createSampleProject();
  variantProject.keyboardCombo.slots.pinyin.variant = variant;
  for (const themeName of ['light', 'dark']) {
    for (const orientation of ['portrait', 'landscape']) {
      const keyboardName = `pinyin_${variant}_${orientation}`;
      const payload = buildEffectiveNativeKeyboardPayload(variantProject, themeName, keyboardName);
      assertNativePayloadRenderable(payload, `中文${variant}键${themeName}/${orientation} payload`);
      assertNoLegacyRuntimeResidue(payload, `中文${variant}键${themeName}/${orientation} payload`);
    }
    for (const orientation of ['portrait', 'landscape']) {
      const keyboardName = `numeric_9_${orientation}`;
      const payload = buildEffectiveNativeKeyboardPayload(variantProject, themeName, keyboardName);
      assertNativePayloadRenderable(payload, `数字9键${themeName}/${orientation} payload`);
      assertNoLegacyRuntimeResidue(payload, `数字9键${themeName}/${orientation} payload`);
    }
  }
}
const stablePinyin9Project = createSampleProject();
stablePinyin9Project.keyboardCombo.slots.pinyin.variant = '9';
const stablePinyin9Payload = buildEffectiveNativeKeyboardPayload(stablePinyin9Project, 'light', 'pinyin_9_portrait');
const stablePinyin9UpperProject = createSampleProject();
stablePinyin9UpperProject.guide = { preferences: { pinyin26LetterCase: 'upper' } };
stablePinyin9UpperProject.keyboardCombo.slots.pinyin.variant = '9';
const stablePinyin9UpperPayload = buildEffectiveNativeKeyboardPayload(stablePinyin9UpperProject, 'light', 'pinyin_9_portrait');
assert(stablePinyin9Payload.number1ButtonForegroundStyle.center?.y === 0.54
  && stablePinyin9Payload.number1ButtonForegroundStyle.fontSize === 17, '中文9键主文字应居中显示，避免实机文字压到键帽底部。');
assert(stablePinyin9Payload.number2ButtonForegroundStyle.text === 'abc'
  && stablePinyin9UpperPayload.number2ButtonForegroundStyle.text === 'ABC', '中文9键导出应随使用引导大小写联动。');
assert(stablePinyin9Payload.enterButton.backgroundStyle === 'systemButtonBackgroundStyle'
  && stablePinyin9Payload.enterButton.foregroundStyle === 'enterButtonForegroundStyle', '中文9键发送/换行键不应依赖 App 可能不解析的 JS 样式引用。');
assert(!stablePinyin9Payload.number1Button.swipeUpAction && !stablePinyin9Payload.number1Button.swipeDownAction, '中文9键预设滑动功能默认关闭时不应导出上下划动作。');
const stablePinyin14Payload = buildEffectiveNativeKeyboardPayload(comboPinyin14Project, 'light', 'pinyin_14_portrait');
const stablePinyin14LandscapePayload = buildEffectiveNativeKeyboardPayload(comboPinyin14Project, 'light', 'pinyin_14_landscape');
const stablePinyin14UpperProject = createSampleProject();
stablePinyin14UpperProject.guide = { preferences: { pinyin26LetterCase: 'upper' } };
stablePinyin14UpperProject.keyboardCombo.slots.pinyin.variant = '14';
const stablePinyin14UpperPayload = buildEffectiveNativeKeyboardPayload(stablePinyin14UpperProject, 'light', 'pinyin_14_portrait');
assert(stablePinyin14Payload['字母竖屏'].size.height === '1/4'
  && stablePinyin14Payload['底栏竖屏'].size.height === '1/4', '中文14键竖屏每一行高度应统一，删除键行和空格行不得变矮。');
assert(stablePinyin14Payload['123Button'].size.width.percentage === stablePinyin14Payload.enterButton.size.width.percentage
  && stablePinyin14Payload.commaButton.size.width.percentage === stablePinyin14Payload.cnenButton.size.width.percentage
  && stablePinyin14Payload.spaceButton.size.width.percentage > stablePinyin14Payload['123Button'].size.width.percentage,
  '中文14键竖屏导出底排应与预览一致：123=发送，逗号=中英，剩余给空格。');
assert(stablePinyin14Payload.shiftButton.action?.sendKeys === '`'
  && stablePinyin14Payload.shiftFg?.text === "'词"
  && !stablePinyin14Payload.shiftButton.uppercasedStateForegroundStyle,
  '中文14键竖屏导出 shiftButton 应为实机分词键，不应保留 Shift 状态旧数据。');
assert(stablePinyin14Payload.qwFg?.text === 'qw' && stablePinyin14UpperPayload.qwFg?.text === 'QW', '中文14键导出应随使用引导大小写联动。');
assert(stablePinyin14LandscapePayload.equalBg?.normalColor !== '#fafafa'
  && stablePinyin14LandscapePayload.symbolicBg?.normalColor !== '#f6f6f6'
  && !stablePinyin14LandscapePayload.horizontalCandidateStyle, '中文14键横屏候选和功能键背景不应残留 raw seed 旧色值。');
assert(stablePinyin14Payload.enterButton.foregroundStyle === 'enterButtonForegroundStyle'
  && stablePinyin14Payload.enterButtonForegroundStyle?.text === '发送', '中文14键发送键文案应使用共享预设，不应沿用 raw returnKeyType 条件文案。');
assert(Array.isArray(stablePinyin14Payload.enterButton.backgroundStyle), '中文14键发送键背景应保留该预设自己的条件模板。');
const stablePinyin17Project = createSampleProject();
stablePinyin17Project.keyboardCombo.slots.pinyin.variant = '17';
const stablePinyin17Payload = buildEffectiveNativeKeyboardPayload(stablePinyin17Project, 'light', 'pinyin_17_portrait');
const stablePinyin17UpperProject = createSampleProject();
stablePinyin17UpperProject.guide = { preferences: { pinyin26LetterCase: 'upper' } };
stablePinyin17UpperProject.keyboardCombo.slots.pinyin.variant = '17';
const stablePinyin17UpperPayload = buildEffectiveNativeKeyboardPayload(stablePinyin17UpperProject, 'light', 'pinyin_17_portrait');
assert(stablePinyin17Payload['123Button'].size.width.percentage === stablePinyin17Payload.enterButton.size.width.percentage
  && stablePinyin17Payload.spaceRightButton.size.width.percentage === stablePinyin17Payload.cnenButton.size.width.percentage
  && stablePinyin17Payload.spaceButton.size.width.percentage > stablePinyin17Payload['123Button'].size.width.percentage,
  '中文17键竖屏导出底排应与预览一致：123=发送，逗号=中英，剩余给空格。');
assert(stablePinyin17Payload.backspaceButton.size.width === '1/6', '中文17键竖屏第三行退格键宽度应与同排行字母键统一。');
assert(stablePinyin17Payload.hButtonForegroundStyle.text === 'hp'
  && stablePinyin17UpperPayload.hButtonForegroundStyle.text === 'HP', '中文17键导出应随使用引导大小写联动。');
assert(stablePinyin17Payload.enterButton.foregroundStyle === 'enterButtonForegroundStyle'
  && stablePinyin17Payload.enterButtonForegroundStyle?.text === '发送', '中文17键发送键文案应使用共享预设。');
assert(Array.isArray(stablePinyin17Payload.enterButton.backgroundStyle), '中文17键发送键背景应保留该预设自己的条件模板。');
const stablePinyin18Payload = buildEffectiveNativeKeyboardPayload(preset18.project, 'light', 'pinyin_18_portrait');
const stablePinyin18UpperProject = createSampleProject();
stablePinyin18UpperProject.guide = { preferences: { pinyin26LetterCase: 'upper' } };
stablePinyin18UpperProject.keyboardCombo.slots.pinyin.variant = '18';
const stablePinyin18UpperPayload = buildEffectiveNativeKeyboardPayload(stablePinyin18UpperProject, 'light', 'pinyin_18_portrait');
assert(!stablePinyin18Payload.qButton.notification
  && !stablePinyin18Payload.qButton.hintSymbolsStyle
  && !stablePinyin18Payload.qButton.uppercasedStateForegroundStyle, '中文18键默认导出应去掉复杂通知/长按/状态前景，先保证 Jsonnet 模式可渲染。');
assert(stablePinyin18Payload.qButtonForegroundStyle.text === 'q'
  && stablePinyin18UpperPayload.qButtonForegroundStyle.text === 'Q', '中文18键导出应随使用引导大小写联动。');
assert(stablePinyin18Payload.spaceButtonForegroundStyle.buttonStyleType === 'text'
  && stablePinyin18Payload.spaceButtonForegroundStyle.text === '空格', '中文18键空格键应使用保守文字前景，避免系统图标解析失败拖垮整盘。');
assert(stablePinyin18Payload.enterButton.foregroundStyle === 'enterButtonForegroundStyle'
  && stablePinyin18Payload.enterButtonForegroundStyle?.text === '发送', '中文18键发送键文案应使用共享预设。');
assert(stablePinyin18Payload.enterButton.backgroundStyle === 'enterButtonBlueBackgroundStyle', '中文18键发送键背景应保留该预设自己的模板别名。');
assert(!JSON.stringify(stablePinyin18Payload).match(/\d+\.\d+\/\d|\d+\/\d+\.\d/), '中文18键导出不应包含 App 可能不解析的小数分数字符串。');
assert(!JSON.stringify(stablePinyin18Payload).match(/Notification|KeyboardAction|swipe(?:Up|Down)Action/), '中文18键默认导出不应保留通知对象或划动动作，避免 App 解析整盘失败。');
assert(comboPinyin14Config.includes('pinyin_14_portrait') && comboPinyin14Config.includes('pinyin_14_landscape'), '中文14键组合应导出新的拼音键盘映射。');
assert(comboPinyin14Keyboard.includes('Cell: "qwButton"') && comboPinyin14Keyboard.includes('Cell: "cvButton"'), '中文14键导出应使用 14 键布局骨架。');
assert(!comboPinyin14Keyboard.includes('file: "T14yy"') && yamlBlock(comboPinyin14Keyboard, 'qwFg').includes('buttonStyleType: "text"') && yamlBlock(comboPinyin14Keyboard, 'qwFg').includes('text: "qw"'), '中文14键纯色导出不应依赖缺资源图片前景，应与预览同源使用文字。');
assert(!comboSystemConfig.includes('symbolic_system') && !comboSystemConfig.includes('symbolic:'), '系统符号键盘来源不应写入 config 映射，应由按钮指令调用 App 内键盘。');
assert(!comboSystemConfig.includes('emoji_system') && !comboSystemConfig.includes('emoji:'), '系统 Emoji 来源不应写入直接应用包 config 映射。');
assert(!findFile(comboSystemYamlFiles, 'light/symbolic_system.yaml'), '系统符号键盘来源不应导出自定义 symbolic YAML。');
assert(!findFile(comboSystemYamlFiles, 'light/emoji_portrait.yaml'), '系统 Emoji 来源不应继续导出 emoji YAML。');
assert(comboSymbolicCustomConfig.includes('symbolic_portrait') && comboSymbolicCustomConfig.includes('symbolic_landscape'), '自定义符号来源应导出自定义 symbolic 键盘映射。');
assert(findFile(comboSymbolicCustomYamlFiles, 'light/symbolic_portrait.yaml'), '自定义符号来源应继续导出 symbolic 竖屏 YAML。');
const comboSymbolicCustomKeyboard = findFile(comboSymbolicCustomYamlFiles, 'light/symbolic_portrait.yaml')?.content || '';
assertNativeKeyboardYaml(comboSymbolicCustomKeyboard, '自定义符号键盘 YAML');
assert(comboSymbolicCustomKeyboard.includes('categoryCollection:') && comboSymbolicCustomKeyboard.includes('descriptionCollection:'), '自定义符号键盘 YAML 应导出左右 collection。');
assertNoBareColorYaml(comboSymbolicCustomKeyboard, '自定义符号键盘 YAML');
assert(symbolicCollectionKeyboard.includes('测试分类') && symbolicCollectionKeyboard.includes('甲') && symbolicCollectionKeyboard.includes('乙'), '符号键盘 YAML 应同步左侧 collection 分类和条目。');
assert(comboEmojiCustomConfig.includes('emoji_portrait') && comboEmojiCustomConfig.includes('emoji_landscape'), '自定义 Emoji 来源应导出自定义 emoji 键盘映射。');
assert(findFile(comboEmojiCustomYamlFiles, 'light/emoji_portrait.yaml'), '自定义 Emoji 来源应继续导出 emoji 竖屏 YAML。');
const comboEmojiCustomKeyboard = findFile(comboEmojiCustomYamlFiles, 'light/emoji_portrait.yaml')?.content || '';
assertNativeKeyboardYaml(comboEmojiCustomKeyboard, '自定义 Emoji 键盘 YAML');
assert(comboEmojiCustomKeyboard.includes('categoryCollection:') && comboEmojiCustomKeyboard.includes('descriptionCollection:'), '自定义 Emoji 键盘 YAML 应导出左右 collection。');
assertNoBareColorYaml(comboEmojiCustomKeyboard, '自定义 Emoji 键盘 YAML');
assert(findFile(packageFiles, `${packageRoot}/README.md`), '缺少导出 README。');
assert(!findFile(packageFiles, `${packageRoot}/project.json`), '导出应用包不应包含 project.json，源码入口应为 jsonnet/main.jsonnet。');
assert(findFile(packageFiles, `${packageRoot}/config.yaml`), '导出包应在皮肤名文件夹内包含 config.yaml。');
assert(findFile(packageFiles, `${packageRoot}/light/pinyin_26_portrait.yaml`), '导出包应在皮肤名文件夹内包含 light 皮肤文件。');
assert(findFile(packageFiles, `${packageRoot}/jsonnet/main.jsonnet`)?.content.trim() === "import 'core/build.libsonnet'", '导出包应包含规范 jsonnet/main.jsonnet 入口。');
assert(findFile(packageFiles, `${packageRoot}/jsonnet/core/build.libsonnet`), '导出包应包含 jsonnet/core/build.libsonnet。');
assert(!packageFiles.some((file) => file.path.includes('/jsonnet/generated/')), '导出包不应包含 generated Jsonnet 快照目录。');
assert(!packageFiles.some((file) => /\/(light|dark)\/.+\.yaml$/.test(file.path) && String(file.content).includes('\nkeyboard:')), '直接应用包不应包含工作台中间模型 YAML。');
assert(!packageFiles.some((file) => /\/(light|dark)\/.+\.yaml$/.test(file.path) && /:\s+null(?:\n|$)/.test(String(file.content))), '直接应用包不应包含 null 字段，避免 App 解析失败。');
const staleComboVariantProject = createSampleProject();
staleComboVariantProject.meta.name = 'stale-combo';
staleComboVariantProject.keyboardCombo.slots.pinyin.variant = '26';
staleComboVariantProject.config.pinyin.iPhone.portrait = 'pinyin_14_portrait';
staleComboVariantProject.config.pinyin.iPhone.landscape = 'pinyin_14_landscape';
const staleComboPackageFiles = buildSkinPackageFiles(staleComboVariantProject);
const staleComboConfig = findFile(staleComboPackageFiles, 'stale-combo/config.yaml')?.content || '';
const staleComboKeyboard = findFile(staleComboPackageFiles, 'stale-combo/light/pinyin_26_portrait.yaml')?.content || '';
assert(staleComboConfig.includes('pinyin_26_portrait') && !staleComboConfig.includes('pinyin_14_portrait'), '中文预设切回 26 后导出 config 不应残留旧中文布局映射。');
assert(staleComboKeyboard.includes('keyboardLayout:') && !staleComboKeyboard.includes('\nkeyboard:'), '中文预设切回 26 后必须生成原生 26 键 YAML。');
const staleComboJsonnetBuild = JSON.parse(findFile(staleComboPackageFiles, 'stale-combo/jsonnet/core/build.libsonnet')?.content || '{}');
assert(staleComboJsonnetBuild['light/pinyin_26_portrait.yaml'] === staleComboKeyboard, 'Jsonnet 源码包必须按同源 26 键 YAML 输出，不能沿用旧布局。');
const demoPackageFiles = buildSkinPackageFiles(project, { demoPng: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) });
const demoFile = findFile(demoPackageFiles, `${packageRoot}/demo.png`);
assert(demoFile && demoFile.content instanceof Uint8Array, '导出包应支持在皮肤根目录写入 demo.png 二进制预览图。');
assert(!packageFiles.some((file) => !file.path.startsWith(`${packageRoot}/`)), '导出包不应在皮肤名文件夹外放置文件。');
assert(!packageFiles.some((file) => file.path.endsWith('/resources/asset-manifest.yaml')), '直接应用包不应包含工具内部资源清单。');
assert(zipBytes[0] === 0x50 && zipBytes[1] === 0x4b, 'zip 文件头无效。');

console.log(`exporter ok: ${packageFiles.length} files, ${zipBytes.length} bytes`);
