import { createSampleProject } from '../project-schema/index.js';
import { buildSkinPackageFiles, createZipArchive, toYaml } from '../exporter/index.js';
import { importSkinProjectFromFile } from './index.js';
import { buildEffectiveNativeKeyboardPayload } from '../skin-effect/index.js';
import { deflateRawSync } from 'node:zlib';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fileLike(name, bytes) {
  return {
    name,
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  };
}

function textBytes(text) {
  return new TextEncoder().encode(String(text));
}

const sampleProject = createSampleProject();
const importedJson = await importSkinProjectFromFile(fileLike('project.json', textBytes(JSON.stringify(sampleProject))), sampleProject);
assert(importedJson.source === 'project.json', '单独导入 project.json 应按项目文件回读。');
assert(importedJson.project.templateId === sampleProject.templateId, '单独导入 project.json 应保留模板 id。');

const packageBytes = createZipArchive(buildSkinPackageFiles(sampleProject));
const importedPackage = await importSkinProjectFromFile(fileLike('sample.cskin', packageBytes), sampleProject);
assert(importedPackage.source === 'yaml', '本工具导出的 cskin 应按规范 YAML/Jsonnet 包回读，不再依赖 project.json。');
assert(importedPackage.project.templateId === sampleProject.templateId, '回读规范皮肤包应保留模板 id。');
assert(importedPackage.project.config?.pinyin?.iPhone?.portrait === sampleProject.config.pinyin.iPhone.portrait, '回读规范皮肤包应同步 config.yaml 映射。');

const yamlPayload = {
  preeditHeight: 11,
  toolbarHeight: 22,
  keyboardHeight: 333,
  keyboardStyle: { insets: { top: 1, left: 2, bottom: 3, right: 4 } },
  alphabeticBackgroundStyle: {
    normalColor: '#111111',
    highlightColor: '#222222',
    normalLowerEdgeColor: '#333333',
    borderColor: '#444444',
    cornerRadius: 6,
    borderSize: 0.7,
    shadowRadius: 1.5,
    shadowOpacity: 0.8,
    shadowOffset: { x: 0, y: 1 },
    insets: { top: 5, left: 6, bottom: 7, right: 8 },
  },
  qButtonForegroundStyle: {
    buttonStyleType: 'text',
    text: 'q',
    fontSize: 19,
    normalColor: '#555555',
    center: { x: 0.4, y: 0.6 },
  },
  toolbarMenuButtonForegroundStyle: {
    buttonStyleType: 'systemImage',
    fontSize: 18,
    center: { x: 0.5, y: 0.61 },
  },
  keyboardLayout: [
    { HStack: { subviews: [{ Cell: 'qButton' }, { Cell: 'wButton' }] } },
    { HStack: { subviews: [{ Cell: '123Button' }, { Cell: 'spaceButton' }] } },
  ],
  systemButtonBackgroundStyle: {
    normalColor: '#666666',
    highlightColor: '#777777',
    cornerRadius: 8,
    insets: { top: 1, left: 1, bottom: 2, right: 2 },
  },
  enterButtonBlueBackgroundStyle: {
    normalColor: '#0088ff',
    cornerRadius: 9,
  },
  qButton: {
    action: { character: 'q' },
    foregroundStyle: ['qButtonForegroundStyle', 'qButtonUpForegroundStyle', 'qButtonDownForegroundStyle'],
    swipeUpAction: { character: '1' },
    swipeDownAction: { shortcut: '#paste' },
  },
  wButton: {
    action: { character: 'w' },
    foregroundStyle: 'wButtonForegroundStyle',
    swipeUpAction: 'selectSecondCandidate',
  },
  enterButton: {
    action: 'enter',
    foregroundStyle: 'enterButtonForegroundStyle',
  },
  enterButtonForegroundStyle: {
    buttonStyleType: 'text',
    text: '发送',
  },
  wButtonForegroundStyle: {
    buttonStyleType: 'text',
    text: 'w',
  },
  qButtonUpForegroundStyle: {
    buttonStyleType: 'text',
    text: '1',
    fontSize: 8,
    normalColor: '#777777',
    center: { x: 0.2, y: 0.3 },
  },
  qButtonDownForegroundStyle: {
    buttonStyleType: 'text',
    text: '粘贴',
    fontSize: 9,
    normalColor: '#888888',
    center: { x: 0.8, y: 0.7 },
  },
};
const jsonnetPayload = {
  ...yamlPayload,
  keyboardHeight: 444,
  alphabeticBackgroundStyle: {
    ...yamlPayload.alphabeticBackgroundStyle,
    normalColor: '#abcdef',
  },
  qButtonForegroundStyle: {
    ...yamlPayload.qButtonForegroundStyle,
    fontSize: 24,
  },
};
const thirdPartyBytes = createZipArchive([
  { path: 'Third/config.yaml', content: toYaml({ name: '第三方皮肤', author: '作者A' }) },
  { path: 'Third/light/pinyin_26_portrait.yaml', content: toYaml(yamlPayload) },
  { path: 'Third/jsonnet/generated/effect-files.libsonnet', content: JSON.stringify({ 'light/pinyin_26_portrait.yaml': jsonnetPayload }, null, 2) },
]);
const importedThirdParty = await importSkinProjectFromFile(fileLike('third.cskin', thirdPartyBytes), sampleProject);
assert(importedThirdParty.source === 'jsonnet+yaml', '存在 Jsonnet 时导入来源应标记为 jsonnet+yaml。');
assert(importedThirdParty.project.meta.name === '第三方皮肤', '导入 config.yaml 应同步皮肤名称。');
assert(importedThirdParty.project.meta.author === '作者A', '导入 config.yaml 应同步作者。');
assert(importedThirdParty.project.keyboardFrame.portrait.keyboardHeight === 444, 'Jsonnet 应覆盖 YAML 的键盘高度。');
assert(importedThirdParty.project.theme.light.colors['字母键背景颜色-普通'] === '#abcdef', 'Jsonnet 应覆盖 YAML 的普通键背景色。');
assert(importedThirdParty.project.theme.shared.fontSize['按键前景文字大小'] === 24, 'Jsonnet 应覆盖 YAML 的字母字号。');
assert(importedThirdParty.project.theme.light.colors['功能键背景颜色-普通'] === '#666666', '导入应同步功能键背景配色到模块字段。');
assert(importedThirdParty.project.theme.light.colors['enter键背景(蓝色)'] === '#0088ff', '导入应同步发送键背景配色到模块字段。');
assert(importedThirdParty.project.keyStyles.buttonInsets.keyboard26.functionKey.top === 1, '导入应同步功能键 insets 到模块字段。');
assert(importedThirdParty.project.data.swipes.pinyin.swipe_up.q.action.character === '1', '导入应同步上滑动作到划动模块。');
assert(importedThirdParty.project.data.swipes.pinyin.swipe_down.q.action.shortcut === '#paste', '导入应同步下滑动作到划动模块。');
assert(importedThirdParty.project.data.swipes.pinyin.swipe_up.q.label.text === '1', '导入应同步上滑显示文案。');
assert(importedThirdParty.project.data.swipes.pinyin.swipe_up.w.label.text === 'selectSecondCandidate', '字符串划动动作应保留可见标签。');
assert(importedThirdParty.project.keyboards.keyboard26.variants['26'].portraitRows[0][0] === 'q', '导入应从 keyboardLayout 回填 26 键布局行。');
assert(importedThirdParty.project.keyboards.keyboard26.keyDisplays.q === 'q', '导入应把按键显示迁移到统一 keyDisplays 字段。');
assert(importedThirdParty.project.keyboards.keyboard26.keyDisplayTypes.q === 'text', '导入应把文字显示类型迁移到统一 keyDisplayTypes 字段。');
assert(importedThirdParty.project.keyboards.keyboard26.keyEditorModes.q === 'character', '导入普通按键应迁移为统一 character 编辑模式。');
assert(importedThirdParty.project.keyboards.keyboard26.keyTypes.q === 'character', '导入普通按键触发类型应迁移到统一 keyTypes 字段。');
assert(importedThirdParty.project.keyboards.keyboard26.keyTriggers.q === 'q', '导入普通按键触发值应迁移到统一 keyTriggers 字段。');
assert(importedThirdParty.project.keyboards.keyboard26.keyEditorModes.enter === 'function', '导入功能键应迁移为统一 function 编辑模式。');
assert(importedThirdParty.project.keyboards.keyboard26.keyActions.enter.actionType === 'action', '导入功能键动作应迁移到统一 keyActions 字段。');
assert(importedThirdParty.project.keyboards.keyboard26.keyDisplays.enter === '发送', '导入功能键显示应迁移到统一 keyDisplays 字段。');
assert(importedThirdParty.project.nativeKeyboardPayloads.light.pinyin_26_portrait.keyboardHeight === 444, '导入 raw payload 应只作为 nativeKeyboardPayloads 兼容输入保存。');

const darkSharedPayload = {
  ...yamlPayload,
  qButtonForegroundStyle: {
    ...yamlPayload.qButtonForegroundStyle,
    fontSize: 99,
  },
};
const lightDarkBytes = createZipArchive([
  { path: 'LightDark/config.yaml', content: toYaml({ name: '明暗主题', pinyin: { iPhone: { portrait: 'pinyin_26_portrait' } } }) },
  { path: 'LightDark/light/pinyin_26_portrait.yaml', content: toYaml(jsonnetPayload) },
  { path: 'LightDark/dark/pinyin_26_portrait.yaml', content: toYaml(darkSharedPayload) },
]);
const importedLightDark = await importSkinProjectFromFile(fileLike('light-dark.zip', lightDarkBytes), sampleProject);
assert(importedLightDark.project.theme.shared.fontSize['按键前景文字大小'] === 24, '存在 light payload 时 dark 不应覆盖 shared 字号字段。');
assert(importedLightDark.project.theme.dark.colors['按键前景颜色'] === '#555555', 'dark 主题颜色仍应导入到 dark colors。');

const jsonStyleYamlBytes = createZipArchive([
  { path: 'JsonStyle/config.yaml', content: toYaml({ name: 'JSON 风格 YAML', pinyin: { iPhone: { portrait: 'pinyin_26_portrait' } } }) },
  { path: 'JsonStyle/light/pinyin_26_portrait.yaml', content: JSON.stringify(yamlPayload) },
]);
const importedJsonStyleYaml = await importSkinProjectFromFile(fileLike('json-style.zip', jsonStyleYamlBytes), sampleProject);
assert(importedJsonStyleYaml.project.nativeKeyboardPayloads.light.pinyin_26_portrait.qButton.swipeUpAction.character === '1', '导入器应解析 JSON 风格 YAML payload。');
assert(importedJsonStyleYaml.project.data.swipes.pinyin.swipe_up.q.action.character === '1', 'JSON 风格 YAML 的上滑动作应同步到模块字段。');

const rootZipBytes = createZipArchive([
  { path: 'config.yaml', content: toYaml({ name: '根目录 zip 皮肤', author: '作者B', pinyin: { iPhone: { portrait: 'pinyin_26_portrait' } } }) },
  { path: 'light/pinyin_26_portrait.yaml', content: toYaml(yamlPayload) },
  { path: 'light/resources/root.png', content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
  { path: 'light/resources/root.yaml', content: toYaml({ IMG1: { rect: { x: 12, y: 0, width: 20, height: 20 } } }) },
]);
const importedRootZip = await importSkinProjectFromFile(fileLike('root.zip', rootZipBytes), sampleProject);
assert(importedRootZip.source === 'yaml', '无父级文件夹的 zip 应按 YAML 皮肤包读取。');
assert(importedRootZip.importedFiles.includes('config.yaml'), '无父级文件夹的 zip 应读取根目录 config.yaml。');
assert(importedRootZip.importedFiles.includes('light/pinyin_26_portrait.yaml'), '无父级文件夹的 zip 应读取根目录 light 键盘文件。');
assert(importedRootZip.project.meta.name === '根目录 zip 皮肤', '无父级文件夹的 zip 应同步 config.yaml 皮肤名称。');
assert(importedRootZip.project.meta.author === '作者B', '无父级文件夹的 zip 应同步 config.yaml 作者。');
assert(importedRootZip.project.keyboardFrame.portrait.keyboardHeight === 333, '无父级文件夹的 zip 应应用根目录 light YAML。');
assert(importedRootZip.project.assets.resources.light.root.sprites.IMG1.rect.x === 12, '无父级文件夹的 zip 应读取根目录 resources yaml。');

const externalMappedZipBytes = createZipArchive([
  {
    path: 'T14/config.yaml',
    content: toYaml({
      name: '外部T14',
      pinyin: { iPhone: { portrait: 'pinyin_Sp', landscape: 'pinyin_Hp' }, iPad: { portrait: 'pinyin_Hp', landscape: 'pinyin_Hp', floating: 'pinyin_Sp' } },
      alphabetic: { iPhone: { portrait: 'alphabetic_Sp', landscape: 'alphabetic_Hp' } },
      numeric: { iPhone: { portrait: 'numeric_Sp', landscape: 'alphabetic_Hp' } },
      symbolic: { iPhone: { portrait: 'symbolic_Sp', landscape: 'symbolic_Hp' } },
      emoji: { iPhone: { portrait: 'emoji_Sp', landscape: 'emoji_Hp' } },
      panel: { iPhone: { portrait: 'panel_Sp', landscape: 'panel_Hp' } },
    }),
  },
  { path: 'T14/light/pinyin_Sp.yaml', content: toYaml({ ...yamlPayload, keyboardHeight: 231 }) },
  { path: 'T14/light/pinyin_Hp.yaml', content: toYaml({ ...yamlPayload, keyboardHeight: 151 }) },
  { path: 'T14/light/alphabetic_Sp.yaml', content: toYaml({ ...yamlPayload, keyboardHeight: 232 }) },
  { path: 'T14/light/alphabetic_Hp.yaml', content: toYaml({ ...yamlPayload, keyboardHeight: 152 }) },
  { path: 'T14/light/numeric_Sp.yaml', content: toYaml({ ...yamlPayload, keyboardHeight: 233 }) },
  { path: 'T14/light/symbolic_Sp.yaml', content: toYaml({ ...yamlPayload, keyboardHeight: 234 }) },
  { path: 'T14/light/symbolic_Hp.yaml', content: toYaml({ ...yamlPayload, keyboardHeight: 154 }) },
  { path: 'T14/light/emoji_Sp.yaml', content: toYaml({ ...yamlPayload, keyboardHeight: 235 }) },
  { path: 'T14/light/emoji_Hp.yaml', content: toYaml({ ...yamlPayload, keyboardHeight: 155 }) },
  { path: 'T14/light/panel_Sp.yaml', content: toYaml({ ...yamlPayload, keyboardHeight: 236 }) },
  { path: 'T14/light/panel_Hp.yaml', content: toYaml({ ...yamlPayload, keyboardHeight: 156 }) },
  { path: '__MACOSX/T14/._pinyin_Sp.yaml', content: textBytes('mac metadata') },
]);
const importedExternalMapped = await importSkinProjectFromFile(fileLike('14键.zip', externalMappedZipBytes), sampleProject);
assert(importedExternalMapped.project.keyboardCombo.slots.pinyin.variant === '14', '外部 T14 命名包应推断为中文 14 键。');
assert(importedExternalMapped.project.config.pinyin.iPhone.portrait === 'pinyin_14_portrait', '外部命名 pinyin_Sp 应映射到标准竖屏 14 键。');
assert(importedExternalMapped.project.config.pinyin.iPhone.landscape === 'pinyin_14_landscape', '外部命名 pinyin_Hp 应映射到标准横屏 14 键。');
assert(importedExternalMapped.project.importCompatibility.originalConfig.pinyin.iPhone.portrait === 'pinyin_Sp', '导入兼容层应保留原始 config 映射。');
assert(importedExternalMapped.project.nativeKeyboardPayloads.light.pinyin_14_portrait.keyboardHeight === 231, '外部命名竖屏 payload 应复制到标准 14 键名。');
assert(importedExternalMapped.project.nativeKeyboardPayloads.light.pinyin_14_landscape.keyboardHeight === 151, '外部命名横屏 payload 应复制到标准 14 键名。');
assert(importedExternalMapped.project.keyboardFrame.landscape.keyboardHeight === 151, '外部命名横屏 payload 应回填横屏高度。');
assert(importedExternalMapped.project.keyboardFrame.portrait.keyboardHeight === 231, '外部命名竖屏后续 payload 不应污染主键盘高度。');
assert(importedExternalMapped.project.nativeKeyboardPayloads.light.numeric_9_landscape.keyboardHeight === 152, '外部 config 中复用英文横屏作为数字横屏时应复制到数字标准名。');
assert(JSON.stringify(importedExternalMapped.project.keyboards.keyboard26.variants['14'].portraitRows) === JSON.stringify(sampleProject.keyboards.keyboard26.variants['14'].portraitRows), '14 键导入不应使用第三方 keyboardLayout 覆盖预设 rows。');
assert(!importedExternalMapped.importedFiles.some((path) => path.includes('__MACOSX') || path.includes('/._')), '导入包应忽略 macOS zip 元数据文件。');

const resourcePayload = {
  keyboardHeight: 216,
  keyboardBackgroundStyle: {
    buttonStyleType: 'fileImage',
    normalImage: { file: 'flower', image: 'IMG2' },
  },
};
const resourcePackageBytes = createZipArchive([
  { path: 'Flower/config.yaml', content: toYaml({ name: '素材皮肤', pinyin: { iPhone: { portrait: 'pinyin_26_portrait' } } }) },
  { path: 'Flower/light/pinyin_26_portrait.yaml', content: toYaml(resourcePayload) },
  { path: 'Flower/light/resources/flower.png', content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
  { path: 'Flower/light/resources/flower.yaml', content: toYaml({ IMG2: { rect: { x: 100, y: 0, width: 100, height: 100 }, insets: { top: 1, right: 2, bottom: 3, left: 4 } } }) },
]);
const importedResourcePackage = await importSkinProjectFromFile(fileLike('flower.cskin', resourcePackageBytes), sampleProject);
assert(importedResourcePackage.project.assets.resources.light.flower.source.startsWith('data:image/png;base64,'), '导入第三方 cskin 应把 resources png 转为项目内 data URL。');
assert(importedResourcePackage.project.assets.resources.light.flower.sprites.IMG2.rect.x === 100, '导入第三方 cskin 应读取 resources yaml 切片。');
assert(!importedResourcePackage.project.nativeKeyboardPayloads.light.flower, 'resources yaml 不应被误当成键盘 payload。');
assert(buildEffectiveNativeKeyboardPayload(importedResourcePackage.project, 'light', 'pinyin_26_portrait')?.keyboardBackgroundStyle?.normalImage?.file === 'flower', '导入资源应被 skin-effect 视为有效资源，不应回退几何背景。');

const resourceOnlyPackageBytes = createZipArchive([
  { path: 'Only/config.yaml', content: toYaml({ name: '资源预览皮肤', pinyin: { iPhone: { portrait: 'pinyin_26_portrait' } } }) },
  { path: 'Only/light/resources/bj.png', content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
  { path: 'Only/light/resources/bj.yaml', content: toYaml({ IMG2: { rect: { x: 0, y: 0, width: 100, height: 100 } } }) },
  { path: 'Only/light/resources/anjian26.png', content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
  { path: 'Only/light/resources/anjian26.yaml', content: toYaml({ IMG27: { rect: { x: 0, y: 0, width: 100, height: 100 } } }) },
]);
const importedResourceOnly = await importSkinProjectFromFile(fileLike('resource-only.cskin', resourceOnlyPackageBytes), sampleProject);
assert(importedResourceOnly.project.nativeKeyboardPayloads.light.pinyin_26_portrait?.keyboardBackgroundStyle?.normalImage?.file === 'bj', 'Jsonnet-only 资源包导入后应生成最小背景预览 payload。');
assert(importedResourceOnly.project.nativeKeyboardPayloads.light.pinyin_26_portrait?.alphabeticBackgroundStyle?.normalImage?.file === 'anjian26', 'Jsonnet-only 资源包导入后应生成最小键帽预览 payload。');

function createDeflatedZipFile(path, contentText) {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(path);
  const raw = encoder.encode(contentText);
  const compressed = new Uint8Array(deflateRawSync(raw));
  const local = new Uint8Array(30 + nameBytes.length + compressed.length);
  const central = new Uint8Array(46 + nameBytes.length);
  const end = new Uint8Array(22);
  const write16 = (target, offset, value) => {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
  };
  const write32 = (target, offset, value) => {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
    target[offset + 2] = (value >>> 16) & 0xff;
    target[offset + 3] = (value >>> 24) & 0xff;
  };
  write32(local, 0, 0x04034b50);
  write16(local, 4, 20);
  write16(local, 8, 8);
  write32(local, 18, compressed.length);
  write32(local, 22, raw.length);
  write16(local, 26, nameBytes.length);
  local.set(nameBytes, 30);
  local.set(compressed, 30 + nameBytes.length);
  write32(central, 0, 0x02014b50);
  write16(central, 4, 20);
  write16(central, 6, 20);
  write16(central, 10, 8);
  write32(central, 20, compressed.length);
  write32(central, 24, raw.length);
  write16(central, 28, nameBytes.length);
  central.set(nameBytes, 46);
  write32(end, 0, 0x06054b50);
  write16(end, 8, 1);
  write16(end, 10, 1);
  write32(end, 12, central.length);
  write32(end, 16, local.length);
  const output = new Uint8Array(local.length + central.length + end.length);
  output.set(local, 0);
  output.set(central, local.length);
  output.set(end, local.length + central.length);
  return output;
}

function createDataDescriptorZipFile(path, contentText) {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(path);
  const raw = encoder.encode(contentText);
  const compressed = new Uint8Array(deflateRawSync(raw));
  const local = new Uint8Array(30 + nameBytes.length + compressed.length + 16);
  const central = new Uint8Array(46 + nameBytes.length);
  const end = new Uint8Array(22);
  const checksum = 0;
  const write16 = (target, offset, value) => {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
  };
  const write32 = (target, offset, value) => {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
    target[offset + 2] = (value >>> 16) & 0xff;
    target[offset + 3] = (value >>> 24) & 0xff;
  };
  write32(local, 0, 0x04034b50);
  write16(local, 4, 20);
  write16(local, 6, 0x08);
  write16(local, 8, 8);
  write16(local, 26, nameBytes.length);
  local.set(nameBytes, 30);
  local.set(compressed, 30 + nameBytes.length);
  const descriptorOffset = 30 + nameBytes.length + compressed.length;
  write32(local, descriptorOffset, 0x08074b50);
  write32(local, descriptorOffset + 4, checksum);
  write32(local, descriptorOffset + 8, compressed.length);
  write32(local, descriptorOffset + 12, raw.length);
  write32(central, 0, 0x02014b50);
  write16(central, 4, 20);
  write16(central, 6, 20);
  write16(central, 8, 0x08);
  write16(central, 10, 8);
  write32(central, 16, checksum);
  write32(central, 20, compressed.length);
  write32(central, 24, raw.length);
  write16(central, 28, nameBytes.length);
  central.set(nameBytes, 46);
  write32(end, 0, 0x06054b50);
  write16(end, 8, 1);
  write16(end, 10, 1);
  write32(end, 12, central.length);
  write32(end, 16, local.length);
  const output = new Uint8Array(local.length + central.length + end.length);
  output.set(local, 0);
  output.set(central, local.length);
  output.set(end, local.length + central.length);
  return output;
}

const deflatedPackage = createDeflatedZipFile('Skin/project.json', JSON.stringify(sampleProject));
const importedDeflated = await importSkinProjectFromFile(fileLike('deflated.zip', deflatedPackage), sampleProject);
assert(importedDeflated.project.templateId === sampleProject.templateId, '导入器应支持常见 deflate zip。');

const descriptorPackage = createDataDescriptorZipFile('project.json', JSON.stringify(sampleProject));
const importedDescriptor = await importSkinProjectFromFile(fileLike('descriptor.zip', descriptorPackage), sampleProject);
assert(importedDescriptor.project.templateId === sampleProject.templateId, '导入器应支持带 data descriptor 的常见 zip。');

console.log('importer ok');
