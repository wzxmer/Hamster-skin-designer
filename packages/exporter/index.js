import { assertValidProject } from '../project-schema/validators/project-validator.js';

const TEXT_ENCODER = new TextEncoder();
const YAML_FILE_NAMES = new Set(['config.yaml']);
const DEFAULT_SKIN_NAME = '皮肤1';
const DEFAULT_SKIN_AUTHOR = 'https://wzxmer.github.io/Hamster-skin-designer/';
const JSONNET_LIB_PATH = 'jsonnet/lib';

function emptySwipeData() {
  return { swipe_up: {}, swipe_down: {} };
}

function swipesFor(project, kind) {
  if (project.data?.swipesEnabled === false) return emptySwipeData();
  return cleanPerItemFontSize((kind === 'alphabetic' ? project.data.swipes?.alphabetic : project.data.swipes?.pinyin) || emptySwipeData());
}

function cleanPerItemFontSize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanPerItemFontSize(item));
  }
  if (!isPlainObject(value)) return value;
  const next = {};
  for (const [key, item] of Object.entries(value)) {
    if (key !== 'fontSize') next[key] = cleanPerItemFontSize(item);
  }
  return next;
}

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

function buildConfigPayload(project) {
  const hiddenNames = new Set(Array.isArray(project.hiddenPreviewKeyboards) ? project.hiddenPreviewKeyboards : []);
  const config = JSON.parse(JSON.stringify(project.config || {}));
  for (const group of Object.values(config)) {
    if (!isPlainObject(group)) continue;
    for (const device of Object.values(group)) {
      if (!isPlainObject(device)) continue;
      for (const [orientation, keyboardName] of Object.entries(device)) {
        if (hiddenNames.has(keyboardName)) delete device[orientation];
      }
    }
  }
  for (const [groupName, group] of Object.entries(config)) {
    if (!isPlainObject(group)) continue;
    for (const [deviceName, device] of Object.entries(group)) {
      if (isPlainObject(device) && !Object.keys(device).length) delete group[deviceName];
    }
    if (!Object.keys(group).length) delete config[groupName];
  }
  return {
    ...config,
    author: project.meta.author || config.author || DEFAULT_SKIN_AUTHOR,
    name: project.meta.name || config.name || DEFAULT_SKIN_NAME,
  };
}

export function buildConfigYaml(project) {
  assertValidProject(project);
  return ensureTrailingNewline(toYaml(buildConfigPayload(project)));
}

function toLibsonnet(value) {
  return ensureTrailingNewline(JSON.stringify(value ?? {}, null, 2));
}

export function buildJsonnetSourceFiles(project) {
  assertValidProject(project);
  const sourceProject = projectWithoutPerItemFontSize(project);
  const files = [
    { path: 'config.yaml', content: buildConfigYaml(project) },
    { path: 'project.json', content: ensureTrailingNewline(JSON.stringify(sourceProject, null, 2)) },
  ];

  for (const [fileName, buildValue] of Object.entries(JSONNET_LIB_BUILDERS)) {
    files.push({
      path: `${JSONNET_LIB_PATH}/${fileName}`,
      content: toLibsonnet(buildValue(project)),
    });
  }

  return files;
}

function collectMappedKeyboardNames(project) {
  const names = new Set();
  const hiddenNames = new Set(Array.isArray(project.hiddenPreviewKeyboards) ? project.hiddenPreviewKeyboards : []);
  for (const group of Object.values(project.config || {})) {
    if (!isPlainObject(group)) continue;
    for (const device of Object.values(group)) {
      if (!isPlainObject(device)) continue;
      for (const keyboardName of Object.values(device)) {
        if (typeof keyboardName === 'string' && keyboardName && !hiddenNames.has(keyboardName)) {
          names.add(keyboardName);
        }
      }
    }
  }
  return [...names].sort();
}

function resolveKeyboardKind(name) {
  if (name.startsWith('numeric')) return 'numeric';
  if (name.startsWith('symbolic')) return 'symbolic';
  if (name.startsWith('panel')) return 'panel';
  if (name.startsWith('alphabetic')) return 'alphabetic';
  return 'pinyin';
}

function resolveOrientation(name) {
  if (name.includes('landscape')) return 'landscape';
  return 'portrait';
}

function keyboardLayoutFor(project, kind, orientation) {
  if (kind === 'numeric') return project.keyboards.numeric?.layout?.[orientation] || {};
  if (kind === 'symbolic') return project.keyboards.symbolic?.layout?.[orientation] || project.keyboards.symbolic?.layout || {};
  if (kind === 'panel') return project.keyboards.panel?.layout?.[orientation] || project.keyboards.panel?.layout || {};
  return project.keyboards.keyboard26.layout?.[orientation] || project.keyboards.keyboard26.layout?.portrait || {};
}

function buildKeyboardPayload(project, themeName, keyboardName) {
  const kind = resolveKeyboardKind(keyboardName);
  const orientation = resolveOrientation(keyboardName);
  const theme = project.theme[themeName];
  return {
    name: keyboardName,
    meta: {
      project: project.meta.name,
      author: project.meta.author,
      templateId: project.templateId,
      schemaVersion: project.schemaVersion,
    },
    theme: themeName,
    keyboard: {
      kind,
      orientation,
      frame: project.keyboardFrame[orientation] || project.keyboardFrame.portrait,
      layout: keyboardLayoutFor(project, kind, orientation),
      toolbar: project.toolbar,
      styles: {
        colors: theme.colors,
        fontSize: {
          ...project.theme.shared.fontSize,
          ...theme.fontSize,
        },
        center: {
          ...project.theme.shared.center,
          ...theme.center,
        },
        buttonInsets: project.keyStyles.buttonInsets,
        animation: {
          ...project.theme.shared.animation,
          ...theme.animation,
        },
      },
      data: {
        swipes: swipesFor(project, kind),
        collections: project.data.collections,
        hints: cleanPerItemFontSize(project.data.hints || {}),
      },
      assets: project.assets.images,
    },
  };
}

export function buildYamlSkinFiles(project) {
  assertValidProject(project);
  const files = [
    { path: 'config.yaml', content: buildConfigYaml(project) },
  ];
  const keyboardNames = collectMappedKeyboardNames(project);

  for (const themeName of ['light', 'dark']) {
    for (const keyboardName of keyboardNames) {
      files.push({
        path: `${themeName}/${keyboardName}.yaml`,
        content: ensureTrailingNewline(toYaml(buildKeyboardPayload(project, themeName, keyboardName))),
      });
    }
  }

  files.push({
    path: 'resources/asset-manifest.yaml',
    content: ensureTrailingNewline(toYaml(project.assets.images)),
  });

  return files;
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

export function buildSkinPackageFiles(project) {
  assertValidProject(project);
  const files = new Map();
  for (const file of buildYamlSkinFiles(project)) files.set(file.path, file);
  for (const file of buildJsonnetSourceFiles(project)) files.set(file.path, file);
  files.set('README.md', { path: 'README.md', content: buildExportReadme(project) });
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

export function createZipBlob(files) {
  return new Blob([createZipArchive(files)], { type: 'application/zip' });
}

export function defaultPackageFileName(project, extension = 'cskin') {
  return `${normalizeFileName(project?.meta?.name, 'hamster-skin')}.${extension}`;
}

export function isYamlFile(path) {
  return YAML_FILE_NAMES.has(path) || path.endsWith('.yaml');
}
