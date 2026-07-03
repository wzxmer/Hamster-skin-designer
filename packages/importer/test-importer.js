import { createSampleProject } from '../project-schema/index.js';
import { buildSkinPackageFiles, createZipArchive, toYaml } from '../exporter/index.js';
import { importSkinProjectFromFile } from './index.js';
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
assert(importedThirdParty.project.nativeKeyboardPayloads.light.pinyin_26_portrait.keyboardHeight === 444, '导入 raw payload 应只作为 nativeKeyboardPayloads 兼容输入保存。');

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

const deflatedPackage = createDeflatedZipFile('Skin/project.json', JSON.stringify(sampleProject));
const importedDeflated = await importSkinProjectFromFile(fileLike('deflated.zip', deflatedPackage), sampleProject);
assert(importedDeflated.project.templateId === sampleProject.templateId, '导入器应支持常见 deflate zip。');

console.log('importer ok');
