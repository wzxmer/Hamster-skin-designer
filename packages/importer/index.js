import { extractZipArchive } from '../exporter/index.js';

const TEXT_DECODER = new TextDecoder();
const THEME_NAMES = new Set(['light', 'dark']);
const YAML_TO_PROJECT_COLOR_KEYS = new Map([
  ['normalColor', '字母键背景颜色-普通'],
  ['highlightColor', '字母键背景颜色-高亮'],
  ['normalLowerEdgeColor', '底边缘颜色-普通'],
  ['highlightLowerEdgeColor', '底边缘颜色-高亮'],
  ['borderColor', '按键边缘颜色'],
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepClone(value) {
  return value == null ? value : structuredClone(value);
}

function mergePlainObjectPatch(target, patch) {
  if (!isPlainObject(patch)) return target;
  for (const [key, value] of Object.entries(patch)) {
    if (Array.isArray(value)) {
      target[key] = deepClone(value);
    } else if (isPlainObject(value)) {
      if (!isPlainObject(target[key])) target[key] = {};
      mergePlainObjectPatch(target[key], value);
    } else if (value !== undefined) {
      target[key] = value;
    }
  }
  return target;
}

function decodeEntryContent(content) {
  if (typeof content === 'string') return content;
  if (content instanceof Uint8Array) return TEXT_DECODER.decode(content);
  if (content instanceof ArrayBuffer) return TEXT_DECODER.decode(new Uint8Array(content));
  return String(content ?? '');
}

function normalizeEntryPath(path = '') {
  return String(path).replaceAll('\\', '/').replace(/^\/+/, '');
}

function stripPackageRoot(path) {
  const normalized = normalizeEntryPath(path);
  const parts = normalized.split('/').filter(Boolean);
  const jsonnetIndex = parts.indexOf('jsonnet');
  if (jsonnetIndex > 0) return parts.slice(jsonnetIndex).join('/');
  const themeIndex = parts.findIndex((part) => THEME_NAMES.has(part));
  if (themeIndex > 0) return parts.slice(themeIndex).join('/');
  const configIndex = parts.lastIndexOf('config.yaml');
  if (configIndex > 0) return parts.slice(configIndex).join('/');
  const projectIndex = parts.lastIndexOf('project.json');
  if (projectIndex > 0) return parts.slice(projectIndex).join('/');
  return normalized;
}

function entryName(path) {
  return stripPackageRoot(path).split('/').at(-1) || '';
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error };
  }
}

function parseYamlScalar(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).replace(/\\"/g, '"');
  }
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === 'null') return null;
  const number = Number(text);
  if (Number.isFinite(number) && /^-?\d+(?:\.\d+)?$/.test(text)) return number;
  return text;
}

function parseSimpleYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) continue;
    const indent = rawLine.match(/^\s*/)?.[0].length || 0;
    const line = rawLine.trim();
    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1).value;
    if (line.startsWith('- ')) {
      if (!Array.isArray(parent)) continue;
      parent.push(parseYamlScalar(line.slice(2)));
      continue;
    }
    const colon = line.indexOf(':');
    if (colon <= 0 || !isPlainObject(parent)) continue;
    const key = parseYamlScalar(line.slice(0, colon));
    const rest = line.slice(colon + 1).trim();
    if (!rest) {
      const child = {};
      parent[key] = child;
      stack.push({ indent, value: child });
    } else if (rest === '[]') {
      parent[key] = [];
    } else if (rest === '{}') {
      parent[key] = {};
    } else {
      parent[key] = parseYamlScalar(rest);
    }
  }
  return root;
}

function parseJsonnetObject(text) {
  const trimmed = String(text || '').trim();
  const jsonStart = trimmed.search(/[\[{]/);
  if (jsonStart < 0) return null;
  const candidate = trimmed.slice(jsonStart);
  const parsed = safeJsonParse(candidate);
  return parsed.ok ? parsed.value : null;
}

function parseEffectYamlLibsonnet(text) {
  const object = parseJsonnetObject(text);
  if (!isPlainObject(object)) return {};
  const result = {};
  for (const [path, yamlText] of Object.entries(object)) {
    if (typeof yamlText === 'string') result[normalizeEntryPath(path)] = parseSimpleYaml(yamlText);
  }
  return result;
}

function parseEffectFilesLibsonnet(text) {
  const object = parseJsonnetObject(text);
  return isPlainObject(object) ? object : {};
}

function keyboardNameFromPath(path) {
  const stripped = stripPackageRoot(path);
  const parts = stripped.split('/');
  if (parts.length < 2) return null;
  const themeName = parts[0];
  if (!THEME_NAMES.has(themeName)) return null;
  const fileName = parts.at(-1) || '';
  if (!fileName.endsWith('.yaml')) return null;
  return {
    themeName,
    keyboardName: fileName.replace(/\.yaml$/i, ''),
  };
}

function collectFilesFromEntries(entries = []) {
  const files = {};
  for (const entry of entries) {
    const stripped = stripPackageRoot(entry.path);
    if (!stripped) continue;
    files[stripped] = decodeEntryContent(entry.content);
  }
  return files;
}

export async function readImportFileEntries(file) {
  const name = file?.name || '';
  const lowerName = name.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (lowerName.endsWith('.cskin') || lowerName.endsWith('.zip')) {
    return (await extractZipArchive(buffer)).map((entry) => ({
      path: entry.path,
      content: entry.content,
    }));
  }
  return [{ path: name || 'imported', content: new Uint8Array(buffer) }];
}

function extractProjectJson(files) {
  const entry = Object.entries(files).find(([path]) => entryName(path) === 'project.json');
  const fallbackEntry = entry || Object.entries(files).find(([path]) => path.toLowerCase().endsWith('.json'));
  if (!fallbackEntry) return null;
  const parsed = safeJsonParse(fallbackEntry[1]);
  return parsed.ok && isPlainObject(parsed.value) ? parsed.value : null;
}

function collectJsonnetPayloads(files) {
  const payloads = {};
  for (const [path, content] of Object.entries(files)) {
    const stripped = stripPackageRoot(path);
    if (stripped.endsWith('jsonnet/generated/effect-files.libsonnet')) {
      mergePlainObjectPatch(payloads, parseEffectFilesLibsonnet(content));
    }
    if (stripped.endsWith('jsonnet/generated/effect-yaml.libsonnet')) {
      mergePlainObjectPatch(payloads, parseEffectYamlLibsonnet(content));
    }
  }
  return payloads;
}

function collectYamlPayloads(files) {
  const payloads = {};
  for (const [path, content] of Object.entries(files)) {
    const stripped = stripPackageRoot(path);
    if (!stripped.endsWith('.yaml')) continue;
    payloads[stripped] = parseSimpleYaml(content);
  }
  return payloads;
}

function setThemeColor(project, themeName, key, value) {
  if (typeof value !== 'string' || !value.startsWith('#')) return;
  project.theme[themeName].colors[key] = value;
}

function applyConfig(project, config) {
  if (!isPlainObject(config)) return;
  project.config = mergePlainObjectPatch(project.config || {}, config);
  if (typeof config.name === 'string') project.meta.name = config.name;
  if (typeof config.author === 'string') project.meta.author = config.author;
}

function applyNativePayload(project, path, payload) {
  const descriptor = keyboardNameFromPath(path);
  if (!descriptor || !isPlainObject(payload)) return;
  const { themeName, keyboardName } = descriptor;
  project.nativeKeyboardPayloads[themeName] = project.nativeKeyboardPayloads[themeName] || {};
  project.nativeKeyboardPayloads[themeName][keyboardName] = payload;
  if (Number.isFinite(Number(payload.preeditHeight))) {
    const orientation = keyboardName.includes('landscape') ? 'landscape' : 'portrait';
    project.keyboardFrame[orientation].preeditHeight = Number(payload.preeditHeight);
  }
  if (Number.isFinite(Number(payload.toolbarHeight))) {
    const orientation = keyboardName.includes('landscape') ? 'landscape' : 'portrait';
    project.keyboardFrame[orientation].toolbarHeight = Number(payload.toolbarHeight);
  }
  if (Number.isFinite(Number(payload.keyboardHeight))) {
    const orientation = keyboardName.includes('landscape') ? 'landscape' : 'portrait';
    project.keyboardFrame[orientation].keyboardHeight = Number(payload.keyboardHeight);
  }
  const keyBg = payload.alphabeticBackgroundStyle;
  if (isPlainObject(keyBg)) {
    for (const [yamlKey, projectKey] of YAML_TO_PROJECT_COLOR_KEYS) {
      setThemeColor(project, themeName, projectKey, keyBg[yamlKey]);
    }
    for (const key of ['cornerRadius', 'borderSize', 'shadowRadius', 'shadowOpacity', 'shadowOffset']) {
      if (keyBg[key] !== undefined) {
        project.keyStyles.surfaceStyles.keyboard26.normal[key] = deepClone(keyBg[key]);
      }
    }
    if (isPlainObject(keyBg.insets)) {
      project.keyStyles.buttonInsets.keyboard26.normal = deepClone(keyBg.insets);
    }
  }
  const foreground = payload.qButtonForegroundStyle;
  if (isPlainObject(foreground)) {
    if (Number.isFinite(Number(foreground.fontSize))) {
      project.theme.shared.fontSize['按键前景文字大小'] = Number(foreground.fontSize);
    }
    if (isPlainObject(foreground.center)) {
      project.theme.shared.center['26键中文前景偏移'] = deepClone(foreground.center);
    }
    if (typeof foreground.normalColor === 'string') {
      setThemeColor(project, themeName, '按键前景颜色', foreground.normalColor);
    }
  }
  const keyboardInsets = payload.keyboardStyle?.insets;
  if (isPlainObject(keyboardInsets)) {
    project.keyStyles.buttonInsets.keyboard26.container = deepClone(keyboardInsets);
  }
  const toolbar = payload.toolbarMenuButtonForegroundStyle;
  if (isPlainObject(toolbar)) {
    if (Number.isFinite(Number(toolbar.fontSize))) project.toolbar.iconFontSize = Number(toolbar.fontSize);
    if (isPlainObject(toolbar.center)) project.theme.shared.center['toolbar按键偏移'] = deepClone(toolbar.center);
  }
}

function buildProjectFromSkinPayloads(sampleProject, payloads, sourceName = '') {
  const project = deepClone(sampleProject);
  project.meta = {
    ...project.meta,
    name: sourceName ? sourceName.replace(/\.(cskin|zip|yaml|yml|jsonnet|libsonnet|json)$/i, '') : project.meta.name,
    description: '从皮肤包导入',
  };
  project.nativeKeyboardPayloads = { light: {}, dark: {} };
  const config = payloads['config.yaml'];
  applyConfig(project, config);
  for (const [path, payload] of Object.entries(payloads)) {
    applyNativePayload(project, path, payload);
  }
  return project;
}

export async function importSkinProjectFromFile(file, sampleProject) {
  const entries = await readImportFileEntries(file);
  const files = collectFilesFromEntries(entries);
  const projectJson = extractProjectJson(files);
  if (projectJson) {
    return {
      project: projectJson,
      source: 'project.json',
      importedFiles: Object.keys(files),
    };
  }
  const yamlPayloads = collectYamlPayloads(files);
  const jsonnetPayloads = collectJsonnetPayloads(files);
  const payloads = mergePlainObjectPatch(yamlPayloads, jsonnetPayloads);
  if (!Object.keys(payloads).length) {
    throw new Error('未找到可识别的 project.json、Jsonnet 或 YAML 皮肤文件。');
  }
  return {
    project: buildProjectFromSkinPayloads(sampleProject, payloads, file?.name || ''),
    source: Object.keys(jsonnetPayloads).length ? 'jsonnet+yaml' : 'yaml',
    importedFiles: Object.keys(files),
  };
}
