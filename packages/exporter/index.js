import { assertValidProject } from '../project-schema/validators/project-validator.js';
import {
  buildEffectiveNativeKeyboardPayload,
  buildEffectiveProject,
  buildSkinEffectFileEntries,
  cleanPerItemFontSize,
  swipesFor,
} from '../skin-effect/index.js';
import TEMPLATE_PACKAGE_ASSETS from '../../apps/web/data/templates/hamster-ios/package-assets.json' with { type: 'json' };

export { buildEffectiveNativeKeyboardPayload } from '../skin-effect/index.js';

const TEXT_ENCODER = new TextEncoder();
const YAML_FILE_NAMES = new Set(['config.yaml']);
const DEFAULT_SKIN_NAME = '皮肤1';
const JSONNET_LIB_PATH = 'jsonnet/lib';
const EFFECT_FILE_PATH_FILTER = (file) => file.path === 'config.yaml' || file.path.startsWith('light/') || file.path.startsWith('dark/');

function projectWithoutPerItemFontSize(project) {
  const next = structuredClone(project);
  if (next.data?.swipes) next.data.swipes = cleanPerItemFontSize(next.data.swipes);
  if (next.data?.hints) next.data.hints = cleanPerItemFontSize(next.data.hints);
  return next;
}

const JSONNET_LIB_BUILDERS = {
  'color.libsonnet': (project) => ({
    light: project.theme.light.colors,
    dark: project.theme.dark.colors,
  }),
  'fontSize.libsonnet': (project) => project.theme.shared.fontSize,
  'center.libsonnet': (project) => project.theme.shared.center,
  'animation.libsonnet': (project) => project.theme.shared.animation,
  'others.libsonnet': (project) => ({
    '中文键盘方案': project.config?.rimeSchema || 'rime_ice',
    '竖屏': {
      'preedit高度': project.keyboardFrame.portrait.preeditHeight,
      'toolbar高度': project.keyboardFrame.portrait.toolbarHeight,
      'keyboard高度': project.keyboardFrame.portrait.keyboardHeight,
    },
    '横屏': {
      'preedit高度': project.keyboardFrame.landscape.preeditHeight,
      'toolbar高度': project.keyboardFrame.landscape.toolbarHeight,
      'keyboard高度': project.keyboardFrame.landscape.keyboardHeight,
    },
    'panel': project.keyboardFrame.panel,
  }),
  'layout.libsonnet': (project) => ({
    keyboard26: project.keyboards.keyboard26.layout,
    numeric: project.keyboards.numeric?.layout || {},
    symbolic: project.keyboards.symbolic?.layout || {},
    buttonInsets: project.keyStyles.buttonInsets,
  }),
  'keyboard26.libsonnet': (project) => project.keyboards.keyboard26,
  'numeric.libsonnet': (project) => project.keyboards.numeric || {},
  'symbolic.libsonnet': (project) => project.keyboards.symbolic || {},
  'panel.libsonnet': (project) => project.keyboards.panel || {},
  'toolbar.libsonnet': (project) => project.toolbar,
  'hintSymbolsData.libsonnet': (project) => cleanPerItemFontSize(project.data.hints || {}),
  'swipeData.libsonnet': (project) => swipesFor(project, 'pinyin') || {},
  'swipeData-en.libsonnet': (project) => swipesFor(project, 'alphabetic') || {},
  'collectionData.libsonnet': (project) => project.data.collections || {},
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function ensureTrailingNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`;
}

function decodeBase64ToBytes(input) {
  const value = String(input || '');
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }
  if (typeof atob === 'function') {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  throw new Error('当前环境不支持 base64 资源解码。');
}

function quoteYamlString(value) {
  return JSON.stringify(String(value));
}

function quoteYamlKey(key) {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : quoteYamlString(key);
}

export function toYaml(value, indent = 0) {
  const space = ' '.repeat(indent);

  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return value.map((item) => {
      if (isPlainObject(item) || Array.isArray(item)) {
        return `${space}- ${toYaml(item, indent + 2).trimStart()}`;
      }
      return `${space}- ${toYaml(item, 0)}`;
    }).join('\n');
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (!entries.length) return '{}';
    return entries.map(([key, item]) => {
      const yamlKey = quoteYamlKey(key);
      if (isPlainObject(item) || Array.isArray(item)) {
        const rendered = toYaml(item, indent + 2);
        return `${space}${yamlKey}:\n${rendered}`;
      }
      return `${space}${yamlKey}: ${toYaml(item, 0)}`;
    }).join('\n');
  }

  if (typeof value === 'string') return quoteYamlString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  return quoteYamlString(value ?? '');
}

export function normalizeFileName(value, fallback = 'hamster-skin') {
  const cleaned = String(value || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || fallback;
}

export function buildConfigYaml(project) {
  assertValidProject(project);
  const exportProject = buildEffectiveProject(project);
  const configEntry = buildSkinEffectFileEntries(exportProject).find((entry) => entry.path === 'config.yaml');
  return ensureTrailingNewline(toYaml(configEntry?.value || {}));
}

function toLibsonnet(value) {
  return ensureTrailingNewline(JSON.stringify(value ?? {}, null, 2));
}

function buildJsonnetMainFile() {
  return ensureTrailingNewline([
    "local files = import 'generated/effect-yaml.libsonnet';",
    '',
    '{',
    '  [path]: files[path]',
    '  for path in std.sort(std.objectFields(files))',
    '}',
  ].join('\n'));
}

function buildJsonnetEffectEntries(project) {
  return buildSkinEffectFileEntries(project).filter(EFFECT_FILE_PATH_FILTER);
}

function buildJsonnetEffectFiles(entries) {
  const files = {};
  for (const entry of entries) files[entry.path] = entry.value;
  return files;
}

function buildJsonnetEffectYamlFiles(entries) {
  const files = {};
  for (const entry of entries) files[entry.path] = ensureTrailingNewline(toYaml(entry.value));
  return files;
}

export function buildJsonnetSourceFiles(project) {
  assertValidProject(project);
  const exportProject = buildEffectiveProject(project);
  const sourceProject = projectWithoutPerItemFontSize(exportProject);
  const effectEntries = buildJsonnetEffectEntries(exportProject);
  const configEntry = effectEntries.find((entry) => entry.path === 'config.yaml');
  const files = [
    { path: 'config.yaml', content: ensureTrailingNewline(toYaml(configEntry?.value || {})) },
    { path: 'project.json', content: ensureTrailingNewline(JSON.stringify(sourceProject, null, 2)) },
    { path: 'jsonnet/main.jsonnet', content: buildJsonnetMainFile() },
    { path: 'jsonnet/generated/effect-files.libsonnet', content: toLibsonnet(buildJsonnetEffectFiles(effectEntries)) },
    { path: 'jsonnet/generated/effect-yaml.libsonnet', content: toLibsonnet(buildJsonnetEffectYamlFiles(effectEntries)) },
  ];

  for (const [fileName, buildValue] of Object.entries(JSONNET_LIB_BUILDERS)) {
    files.push({
      path: `${JSONNET_LIB_PATH}/${fileName}`,
      content: toLibsonnet(buildValue(exportProject)),
    });
  }

  return files;
}

export function buildYamlSkinFiles(project) {
  assertValidProject(project);
  const exportProject = buildEffectiveProject(project);
  return buildSkinEffectFileEntries(exportProject).map((entry) => ({
    path: entry.path,
    content: ensureTrailingNewline(toYaml(entry.value)),
  }));
}

function buildExportReadme(project) {
  return [
    `# ${project.meta.name || DEFAULT_SKIN_NAME}`,
    '',
    '此目录由元书输入法皮肤工作台导出。',
    '',
    '## 文件说明',
    '',
    '- `config.yaml`：皮肤键盘文件映射。',
    '- `light/` 与 `dark/`：按当前 project.json 生成的 YAML 皮肤文件。',
    '- `jsonnet/lib/`：可继续复用的 Jsonnet 数据源。',
    '- `project.json`：工作台可回读的项目源配置。',
    '',
  ].join('\n');
}

function buildTemplateResourceFiles(options = {}) {
  const files = [];
  for (const [relativePath, content] of Object.entries(TEMPLATE_PACKAGE_ASSETS?.textFiles || {})) {
    if (!relativePath.startsWith('light/resources/') && !relativePath.startsWith('dark/resources/')) continue;
    files.push({
      path: relativePath,
      content: ensureTrailingNewline(String(content || '')),
    });
  }
  for (const [relativePath, content] of Object.entries(TEMPLATE_PACKAGE_ASSETS?.binaryFiles || {})) {
    if (!relativePath.startsWith('light/resources/') && !relativePath.startsWith('dark/resources/')) continue;
    files.push({
      path: relativePath,
      content: decodeBase64ToBytes(content),
    });
  }
  if (options.demoPng instanceof Uint8Array) {
    files.push({
      path: 'demo.png',
      content: options.demoPng,
    });
    return files;
  }
  if (typeof TEMPLATE_PACKAGE_ASSETS?.binaryFiles?.['demo.png'] === 'string') {
    files.push({
      path: 'demo.png',
      content: decodeBase64ToBytes(TEMPLATE_PACKAGE_ASSETS.binaryFiles['demo.png']),
    });
  }
  return files;
}

export function buildSkinPackageFiles(project, options = {}) {
  assertValidProject(project);
  const packageRoot = normalizeFileName(project?.meta?.name, 'hamster-skin');
  const files = new Map();
  const yamlFiles = buildYamlSkinFiles(project);
  for (const file of yamlFiles) {
    if (file.path === 'resources/asset-manifest.yaml') continue;
    files.set(`${packageRoot}/${file.path}`, { ...file, path: `${packageRoot}/${file.path}` });
  }
  for (const file of buildJsonnetSourceFiles(project)) {
    files.set(`${packageRoot}/${file.path}`, { ...file, path: `${packageRoot}/${file.path}` });
  }
  for (const file of buildTemplateResourceFiles(options)) {
    files.set(`${packageRoot}/${file.path}`, { ...file, path: `${packageRoot}/${file.path}` });
  }
  files.set(`${packageRoot}/README.md`, { path: `${packageRoot}/README.md`, content: buildExportReadme(project) });
  return [...files.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function makeCrc32Table() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

const CRC32_TABLE = makeCrc32Table();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function normalizeZipContent(content) {
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  return TEXT_ENCODER.encode(String(content ?? ''));
}

function dosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

export function createZipArchive(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, date } = dosDateTime();

  for (const file of files) {
    const pathBytes = TEXT_ENCODER.encode(file.path.replaceAll('\\', '/'));
    const contentBytes = normalizeZipContent(file.content);
    const checksum = crc32(contentBytes);

    const localHeader = new Uint8Array(30 + pathBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, time);
    writeUint16(localHeader, 12, date);
    writeUint32(localHeader, 14, checksum);
    writeUint32(localHeader, 18, contentBytes.length);
    writeUint32(localHeader, 22, contentBytes.length);
    writeUint16(localHeader, 26, pathBytes.length);
    localHeader.set(pathBytes, 30);
    localParts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + pathBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, time);
    writeUint16(centralHeader, 14, date);
    writeUint32(centralHeader, 16, checksum);
    writeUint32(centralHeader, 20, contentBytes.length);
    writeUint32(centralHeader, 24, contentBytes.length);
    writeUint16(centralHeader, 28, pathBytes.length);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(pathBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + contentBytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const endRecord = new Uint8Array(22);
  writeUint32(endRecord, 0, 0x06054b50);
  writeUint16(endRecord, 8, files.length);
  writeUint16(endRecord, 10, files.length);
  writeUint32(endRecord, 12, centralDirectory.length);
  writeUint32(endRecord, 16, offset);

  return concatBytes([...localParts, centralDirectory, endRecord]);
}

export async function extractZipArchive(input) {
  const bytes = input instanceof Uint8Array
    ? input
    : input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : normalizeZipContent(input);
  const files = [];
  let offset = 0;
  const decoder = new TextDecoder();
  while (offset + 30 <= bytes.length) {
    const signature = readUint32(bytes, offset);
    if (signature === 0x02014b50 || signature === 0x06054b50) break;
    if (signature !== 0x04034b50) break;
    const flags = readUint16(bytes, offset + 6);
    const method = readUint16(bytes, offset + 8);
    const compressedSize = readUint32(bytes, offset + 18);
    const uncompressedSize = readUint32(bytes, offset + 22);
    const fileNameLength = readUint16(bytes, offset + 26);
    const extraLength = readUint16(bytes, offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) throw new Error('zip 文件结构不完整。');
    const path = decoder.decode(bytes.slice(nameStart, nameStart + fileNameLength)).replaceAll('\\', '/');
    if ((flags & 0x08) !== 0) throw new Error('暂不支持带 data descriptor 的 zip 文件。');
    if (![0, 8].includes(method)) throw new Error(`暂不支持压缩方式 ${method}。`);
    if (!path.endsWith('/')) {
      const compressed = bytes.slice(dataStart, dataEnd);
      const content = method === 8 ? await inflateRawZipEntry(compressed) : compressed;
      if (uncompressedSize !== content.length) throw new Error(`zip 条目大小异常：${path}`);
      files.push({ path, content });
    }
    offset = dataEnd;
  }
  return files;
}

async function inflateRawZipEntry(content) {
  if (typeof DecompressionStream === 'function') {
    const stream = new Blob([content]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  if (typeof process !== 'undefined' && process.versions?.node) {
    const { inflateRawSync } = await import('node:zlib');
    return new Uint8Array(inflateRawSync(content));
  }
  throw new Error('当前环境不支持解压 deflate zip 条目。');
}

function readUint16(source, offset) {
  return source[offset] | (source[offset + 1] << 8);
}

function readUint32(source, offset) {
  return (source[offset]
    | (source[offset + 1] << 8)
    | (source[offset + 2] << 16)
    | (source[offset + 3] << 24)) >>> 0;
}

export function createZipBlob(files) {
  return new Blob([createZipArchive(files)], { type: 'application/zip' });
}

export function defaultPackageFileName(project, extension = 'cskin') {
  return `${normalizeFileName(project?.meta?.name, 'hamster-skin')}.${extension}`;
}

export function isYamlFile(path) {
  return YAML_FILE_NAMES.has(path) || path.endsWith('.yaml');
}
