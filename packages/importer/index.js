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
const FUNCTION_STYLE_COLOR_KEYS = new Map([
  ['normalColor', '功能键背景颜色-普通'],
  ['highlightColor', '功能键背景颜色-高亮'],
  ['normalLowerEdgeColor', '底边缘颜色-普通'],
  ['highlightLowerEdgeColor', '底边缘颜色-高亮'],
  ['borderColor', '按键边缘颜色'],
]);
const ENTER_STYLE_COLOR_KEYS = new Map([
  ['normalColor', 'enter键背景(蓝色)'],
]);
const BUTTON_STYLE_KEYS = ['cornerRadius', 'borderSize', 'shadowRadius', 'shadowOpacity', 'shadowOffset'];
const KNOWN_PUNCTUATION_ACTIONS = new Map([
  [',', 'spaceRight'],
  ['，', 'spaceRight'],
  ['.', 'period'],
  ['。', 'period'],
  [';', 'semicolon'],
  ['；', 'semicolon'],
]);
const FUNCTION_BUTTON_KEY_ALIASES = new Map([
  ['123', '123'],
  ['numeric', '123'],
  ['number', '123'],
  ['symbol', 'symbol'],
  ['symbolic', 'symbol'],
  ['shift', 'shift'],
  ['backspace', 'backspace'],
  ['delete', 'backspace'],
  ['return', 'return'],
  ['enter', 'enter'],
  ['space', 'space'],
  ['cnen', 'cnen'],
  ['alphabetic', 'cnen'],
  ['comma', 'spaceRight'],
  ['period', 'period'],
  ['semicolon', 'semicolon'],
  ['clear', 'reinput'],
  ['reinput', 'reinput'],
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

function bytesToBase64(bytes) {
  const value = bytes instanceof Uint8Array
    ? bytes
    : bytes instanceof ArrayBuffer
      ? new Uint8Array(bytes)
      : new TextEncoder().encode(String(bytes ?? ''));
  if (typeof Buffer !== 'undefined') return Buffer.from(value).toString('base64');
  let binary = '';
  for (let index = 0; index < value.length; index += 1) {
    binary += String.fromCharCode(value[index]);
  }
  return btoa(binary);
}

function imageDataUrlFromEntryContent(content) {
  if (typeof content === 'string' && content.startsWith('data:image/')) return content;
  return `data:image/png;base64,${bytesToBase64(content)}`;
}

function normalizeEntryPath(path = '') {
  return String(path).replaceAll('\\', '/').replace(/^\/+/, '');
}

function stripPackageRoot(path) {
  const normalized = normalizeEntryPath(path);
  const parts = normalized.split('/').filter(Boolean);
  if (parts[0] === '__MACOSX' || parts.at(-1)?.startsWith('._')) return '';
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
  const object = parseJsonnetObject(text);
  if (isPlainObject(object) || Array.isArray(object)) return object;
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
  if (/^(light|dark)\/resources\//i.test(stripped)) return null;
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

function collectResourceAssetsFromEntries(entries = []) {
  const resources = {};
  const resourceEntries = {};
  for (const entry of entries) {
    const stripped = stripPackageRoot(entry.path);
    const match = stripped.match(/^(light|dark)\/resources\/([^/]+)\.(png|yaml)$/i);
    if (!match) continue;
    const [, themeName, fileBase, extension] = match;
    resources[themeName] = resources[themeName] || {};
    resourceEntries[`${themeName}/${fileBase}`] = resourceEntries[`${themeName}/${fileBase}`] || {};
    resourceEntries[`${themeName}/${fileBase}`][extension.toLowerCase()] = entry.content;
  }
  for (const [key, entry] of Object.entries(resourceEntries)) {
    const [themeName, fileBase] = key.split('/');
    if (!entry.png && !entry.yaml) continue;
    resources[themeName][fileBase] = {
      source: entry.png ? imageDataUrlFromEntryContent(entry.png) : `resources/${fileBase}.png`,
      sprites: entry.yaml ? parseSimpleYaml(decodeEntryContent(entry.yaml)) : {},
    };
  }
  return resources;
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
    if (/^(light|dark)\/resources\//i.test(stripped)) continue;
    payloads[stripped] = parseSimpleYaml(content);
  }
  return payloads;
}

function setThemeColor(project, themeName, key, value) {
  if (typeof value !== 'string' || !value.startsWith('#')) return;
  project.theme[themeName].colors[key] = value;
}

function styleRefNames(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === 'string') return [item];
      if (isPlainObject(item) && typeof item.styleName === 'string') return [item.styleName];
      return [];
    });
  }
  if (isPlainObject(value) && typeof value.styleName === 'string') return [value.styleName];
  return [];
}

function firstStyleObject(payload, refs) {
  for (const ref of refs) {
    if (isPlainObject(payload?.[ref])) return payload[ref];
  }
  return null;
}

function firstForegroundStyle(payload, button, matcher = null, fallbackToAny = true) {
  const refs = styleRefNames(button?.foregroundStyle);
  const matchedRefs = matcher ? refs.filter((ref) => matcher(ref)) : refs;
  return firstStyleObject(payload, matchedRefs.length || !fallbackToAny ? matchedRefs : refs);
}

function actionText(action) {
  if (typeof action === 'string') return action;
  if (!isPlainObject(action)) return '';
  return action.character || action.symbol || action.shortcut || action.keyboardType || '';
}

function actionEntry(action) {
  if (typeof action === 'string') return { type: 'action', value: action };
  if (!isPlainObject(action)) return null;
  if (isPlainObject(action.action)) return actionEntry(action.action);
  if (typeof action.action === 'string') return { type: 'action', value: action.action };
  for (const key of ['character', 'symbol', 'shortcut', 'keyboardType', 'openURL', 'command', 'option']) {
    if (action[key] !== undefined && action[key] !== null) return { type: key, value: action[key] };
  }
  return null;
}

function actionFieldsFromEntry(entry) {
  if (!entry) return {};
  const { type, value } = entry;
  if (type === 'action') return { action: value, actionType: 'action', actionValue: value };
  return { [type]: value, actionType: type, actionValue: value };
}

function normalizeImportedButtonKey(rawKey = '', button = null) {
  let key = String(rawKey || '').replace(/Button$/i, '');
  key = key.replace(/^number(\d)$/i, '$1');
  const lower = key.toLowerCase();
  if (/^\d$/.test(key)) return key;
  if (/^[a-z]{1,3}$/.test(key)) return key.toLowerCase();
  if (FUNCTION_BUTTON_KEY_ALIASES.has(lower)) return FUNCTION_BUTTON_KEY_ALIASES.get(lower);
  const action = button?.action;
  const actionValue = actionText(action);
  if (KNOWN_PUNCTUATION_ACTIONS.has(actionValue)) return KNOWN_PUNCTUATION_ACTIONS.get(actionValue);
  if (isPlainObject(action)) {
    if (action.keyboardType === 'numeric') return '123';
    if (action.keyboardType === 'alphabetic') return 'cnen';
    if (action.keyboardType === 'symbolic') return 'symbol';
  }
  return key;
}

function collectLayoutRows(payload = {}) {
  if (!Array.isArray(payload.keyboardLayout)) return [];
  const rows = [];
  const collectCells = (node, cells = []) => {
    if (Array.isArray(node)) {
      for (const item of node) collectCells(item, cells);
      return cells;
    }
    if (!isPlainObject(node)) return cells;
    if (typeof node.Cell === 'string') {
      cells.push(node.Cell);
      return cells;
    }
    for (const value of Object.values(node)) collectCells(value, cells);
    return cells;
  };
  for (const row of payload.keyboardLayout) {
    const cells = collectCells(row)
      .map((cell) => normalizeImportedButtonKey(cell, payload[cell] || payload[`${String(cell).replace(/Button$/i, '')}Button`]))
      .filter(Boolean);
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function setSurfaceAndInsets(project, group, slot, style) {
  if (!isPlainObject(style)) return;
  project.keyStyles.surfaceStyles[group] = project.keyStyles.surfaceStyles[group] || {};
  project.keyStyles.surfaceStyles[group][slot] = project.keyStyles.surfaceStyles[group][slot] || {};
  for (const key of BUTTON_STYLE_KEYS) {
    if (style[key] !== undefined) project.keyStyles.surfaceStyles[group][slot][key] = deepClone(style[key]);
  }
  if (isPlainObject(style.insets)) {
    project.keyStyles.buttonInsets[group] = project.keyStyles.buttonInsets[group] || {};
    project.keyStyles.buttonInsets[group][slot] = deepClone(style.insets);
  }
}

function applyStyleColors(project, themeName, style, colorMap) {
  if (!isPlainObject(style)) return;
  for (const [yamlKey, projectKey] of colorMap) {
    setThemeColor(project, themeName, projectKey, style[yamlKey]);
  }
}

function projectSwipeProfileForKeyboardName(keyboardName) {
  if (keyboardName.startsWith('numeric_')) return 'numeric';
  if (keyboardName.startsWith('alphabetic_')) return 'alphabetic';
  if (keyboardName.startsWith('pinyin_')) return 'pinyin';
  return '';
}

function keyboardTargetForProfile(project, profile) {
  if (profile === 'numeric') return project.keyboards.numeric = project.keyboards.numeric || {};
  return project.keyboards.keyboard26 = project.keyboards.keyboard26 || {};
}

function displayKeyForProfile(profile, key) {
  return profile === 'alphabetic' && /^[a-z]$/.test(key) ? `alphabetic.${key}` : key;
}

function triggerKeyForProfile(profile, key) {
  if ((profile === 'pinyin' || profile === 'alphabetic') && /^\d$/.test(key)) return `number${key}`;
  return key;
}

function importedEditorKey(profile, key) {
  return profile === 'pinyin' && /^\d$/.test(key) ? `number${key}` : key;
}

function isFunctionKey(key) {
  return ['shift', 'backspace', 'space', 'enter', '123', 'cnen', 'symbol', 'return', 'pageUp', 'pageDown', 'lock', 'period', 'equal'].includes(key);
}

function assignImportedDisplay(keyboardTarget, profile, key, foreground) {
  if (!isPlainObject(foreground)) return;
  const editorKey = importedEditorKey(profile, key);
  const displayKey = displayKeyForProfile(profile, editorKey);
  keyboardTarget.keyDisplays = keyboardTarget.keyDisplays || {};
  keyboardTarget.keyDisplayTypes = keyboardTarget.keyDisplayTypes || {};
  if (typeof foreground.systemImageName === 'string' && foreground.systemImageName) {
    keyboardTarget.keyDisplays[displayKey] = foreground.systemImageName;
    keyboardTarget.keyDisplayTypes[editorKey] = 'systemImageName';
    return;
  }
  if (typeof foreground.text === 'string' && !/^\$/.test(foreground.text)) {
    keyboardTarget.keyDisplays[displayKey] = foreground.text;
    keyboardTarget.keyDisplayTypes[editorKey] = 'text';
  }
}

function assignImportedAction(keyboardTarget, profile, key, action) {
  const entry = actionEntry(action);
  if (!entry) return;
  const editorKey = importedEditorKey(profile, key);
  keyboardTarget.keyEditorModes = keyboardTarget.keyEditorModes || {};
  keyboardTarget.keyActions = keyboardTarget.keyActions || {};
  keyboardTarget.keyTypes = keyboardTarget.keyTypes || {};
  keyboardTarget.keyTriggers = keyboardTarget.keyTriggers || {};
  if (entry.type === 'character' || entry.type === 'symbol') {
    const triggerKey = triggerKeyForProfile(profile, editorKey);
    keyboardTarget.keyEditorModes[editorKey] = 'character';
    keyboardTarget.keyTypes[editorKey] = entry.type;
    keyboardTarget.keyTriggers[triggerKey] = String(entry.value);
    return;
  }
  keyboardTarget.keyEditorModes[editorKey] = 'function';
  keyboardTarget.keyActions[editorKey] = actionFieldsFromEntry(entry);
}

function ensureSwipeProfile(project, profile) {
  if (!profile) return null;
  project.data = project.data || {};
  project.data.swipes = project.data.swipes || {};
  project.data.swipes[profile] = project.data.swipes[profile] || { swipe_up: {}, swipe_down: {} };
  project.data.swipes[profile].swipe_up = project.data.swipes[profile].swipe_up || {};
  project.data.swipes[profile].swipe_down = project.data.swipes[profile].swipe_down || {};
  return project.data.swipes[profile];
}

function assignImportedSwipe(project, profile, direction, key, action, labelStyle) {
  const normalizedAction = isPlainObject(action) || typeof action === 'string' ? deepClone(action) : null;
  if (!normalizedAction) return;
  const swipes = ensureSwipeProfile(project, profile);
  if (!swipes) return;
  swipes[direction][key] = {
    ...(swipes[direction][key] || {}),
    action: normalizedAction,
    label: {
      ...(swipes[direction][key]?.label || {}),
      text: typeof labelStyle?.text === 'string' ? labelStyle.text : actionText(action),
    },
  };
  project.data.swipesEnabled = true;
  project.keyboardCombo = project.keyboardCombo || {};
  project.keyboardCombo.swipeBehavior = {
    ...(project.keyboardCombo.swipeBehavior || {}),
    mode: 'visible',
  };
}

function applyImportedButtonData(project, keyboardName, payload) {
  const profile = projectSwipeProfileForKeyboardName(keyboardName);
  if (!profile) return;
  const keyboardTarget = keyboardTargetForProfile(project, profile);
  keyboardTarget.keyDisplays = keyboardTarget.keyDisplays || {};
  keyboardTarget.keyDisplayTypes = keyboardTarget.keyDisplayTypes || {};
  keyboardTarget.keyTypes = keyboardTarget.keyTypes || {};
  keyboardTarget.keyTriggers = keyboardTarget.keyTriggers || {};
  keyboardTarget.keyActions = keyboardTarget.keyActions || {};
  keyboardTarget.keyEditorModes = keyboardTarget.keyEditorModes || {};
  for (const [buttonName, button] of Object.entries(payload)) {
    if (!/Button$/i.test(buttonName) || !isPlainObject(button)) continue;
    const key = normalizeImportedButtonKey(buttonName, button);
    if (!key || key === 'static') continue;
    const foreground = firstForegroundStyle(payload, button, (ref) => !/(?:Up|Down)Swipe|(?:Swipe)?(?:Up|Down)Foreground/i.test(ref));
    assignImportedDisplay(keyboardTarget, profile, key, foreground);
    if (button.action !== undefined && (isFunctionKey(key) || isPlainObject(button.action))) {
      assignImportedAction(keyboardTarget, profile, key, button.action);
    }
    if (button.swipeUpAction !== undefined) {
      assignImportedSwipe(project, profile, 'swipe_up', key, button.swipeUpAction, firstForegroundStyle(payload, button, (ref) => /(?:UpSwipe|SwipeUp|UpForeground)/i.test(ref), false));
    }
    if (button.swipeDownAction !== undefined) {
      assignImportedSwipe(project, profile, 'swipe_down', key, button.swipeDownAction, firstForegroundStyle(payload, button, (ref) => /(?:DownSwipe|SwipeDown|DownForeground)/i.test(ref), false));
    }
  }
}

function applyImportedLayoutRows(project, keyboardName, payload) {
  const rows = collectLayoutRows(payload);
  if (!rows.length) return;
  const orientation = keyboardName.includes('landscape') ? 'landscape' : 'portrait';
  if (keyboardName.startsWith('pinyin_')) {
    const variant = keyboardName.match(/^pinyin_(9|14|17|18|26)_/)?.[1] || inferImportedPinyinVariant(project, keyboardName);
    if (variant !== '26') return;
    project.keyboards.keyboard26 = project.keyboards.keyboard26 || {};
    project.keyboards.keyboard26.variants = project.keyboards.keyboard26.variants || {};
    project.keyboards.keyboard26.variants[variant] = project.keyboards.keyboard26.variants[variant] || {};
    project.keyboards.keyboard26.variants[variant][orientation === 'landscape' ? 'landscapeRows' : 'portraitRows'] = rows;
    return;
  }
  if (keyboardName.startsWith('alphabetic_26_')) {
    project.keyboards.keyboard26 = project.keyboards.keyboard26 || {};
    project.keyboards.keyboard26.layout = project.keyboards.keyboard26.layout || {};
    project.keyboards.keyboard26.layout[orientation] = rows;
    return;
  }
  if (keyboardName.startsWith('numeric_')) {
    project.keyboards.numeric = project.keyboards.numeric || {};
    project.keyboards.numeric.layout = project.keyboards.numeric.layout || {};
    project.keyboards.numeric.layout[orientation] = rows;
  }
}

function applyConfig(project, config) {
  if (!isPlainObject(config)) return;
  project.config = mergePlainObjectPatch(project.config || {}, config);
  if (typeof config.name === 'string') project.meta.name = config.name;
  if (typeof config.author === 'string') project.meta.author = config.author;
}

function applyImportedPayloadProperties(project, themeName, keyboardName, payload, options = {}) {
  if (!isPlainObject(payload)) return;
  const applyShared = options.applyShared !== false;
  applyImportedLayoutRows(project, keyboardName, payload);
  applyImportedButtonData(project, keyboardName, payload);
  if (keyboardName.startsWith('pinyin_') && Number.isFinite(Number(payload.preeditHeight))) {
    const orientation = keyboardName.includes('landscape') ? 'landscape' : 'portrait';
    project.keyboardFrame[orientation].preeditHeight = Number(payload.preeditHeight);
  }
  if (keyboardName.startsWith('pinyin_') && Number.isFinite(Number(payload.toolbarHeight))) {
    const orientation = keyboardName.includes('landscape') ? 'landscape' : 'portrait';
    project.keyboardFrame[orientation].toolbarHeight = Number(payload.toolbarHeight);
  }
  if (keyboardName.startsWith('pinyin_') && Number.isFinite(Number(payload.keyboardHeight))) {
    const orientation = keyboardName.includes('landscape') ? 'landscape' : 'portrait';
    project.keyboardFrame[orientation].keyboardHeight = Number(payload.keyboardHeight);
  }
  const keyBg = payload.alphabeticBackgroundStyle;
  if (isPlainObject(keyBg)) {
    applyStyleColors(project, themeName, keyBg, YAML_TO_PROJECT_COLOR_KEYS);
    setSurfaceAndInsets(project, 'keyboard26', 'normal', keyBg);
  }
  const functionBg = payload.systemButtonBackgroundStyle
    || payload['123Bg']
    || payload.shiftBg
    || payload.backspaceBg;
  if (isPlainObject(functionBg)) {
    applyStyleColors(project, themeName, functionBg, FUNCTION_STYLE_COLOR_KEYS);
    setSurfaceAndInsets(project, 'keyboard26', 'functionKey', functionBg);
  }
  const enterBg = payload.enterButtonBlueBackgroundStyle
    || payload.enterBgCol
    || payload.returnBgCol;
  if (isPlainObject(enterBg)) {
    applyStyleColors(project, themeName, enterBg, ENTER_STYLE_COLOR_KEYS);
    setSurfaceAndInsets(project, 'keyboard26', 'enterAccent', enterBg);
  }
  const foreground = payload.qButtonForegroundStyle;
  if (isPlainObject(foreground)) {
    if (applyShared && Number.isFinite(Number(foreground.fontSize))) {
      project.theme.shared.fontSize['按键前景文字大小'] = Number(foreground.fontSize);
    }
    if (applyShared && isPlainObject(foreground.center)) {
      project.theme.shared.center['26键中文前景偏移'] = deepClone(foreground.center);
    }
    if (typeof foreground.normalColor === 'string') {
      setThemeColor(project, themeName, '按键前景颜色', foreground.normalColor);
    }
  }
  const swipeForeground = firstStyleObject(payload, Object.keys(payload).filter((key) => /(?:UpSwipeFg|ButtonUpForegroundStyle|ButtonSwipeUpForegroundStyle)$/i.test(key)));
  if (isPlainObject(swipeForeground)) {
    if (applyShared && Number.isFinite(Number(swipeForeground.fontSize))) project.theme.shared.fontSize['上划文字大小'] = Number(swipeForeground.fontSize);
    if (applyShared && isPlainObject(swipeForeground.center)) project.theme.shared.center['上划文字偏移'] = deepClone(swipeForeground.center);
    if (typeof swipeForeground.normalColor === 'string') setThemeColor(project, themeName, '划动字符颜色', swipeForeground.normalColor);
  }
  const swipeDownForeground = firstStyleObject(payload, Object.keys(payload).filter((key) => /(?:DownSwipeFg|ButtonDownForegroundStyle|ButtonSwipeDownForegroundStyle)$/i.test(key)));
  if (isPlainObject(swipeDownForeground)) {
    if (applyShared && Number.isFinite(Number(swipeDownForeground.fontSize))) project.theme.shared.fontSize['下划文字大小'] = Number(swipeDownForeground.fontSize);
    if (applyShared && isPlainObject(swipeDownForeground.center)) project.theme.shared.center['下划文字偏移'] = deepClone(swipeDownForeground.center);
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

function applyNativePayload(project, path, payload) {
  const descriptor = keyboardNameFromPath(path);
  if (!descriptor || !isPlainObject(payload)) return;
  const { themeName, keyboardName } = descriptor;
  project.nativeKeyboardPayloads[themeName] = project.nativeKeyboardPayloads[themeName] || {};
  project.nativeKeyboardPayloads[themeName][keyboardName] = payload;
}

function collectConfigKeyboardNames(config = {}) {
  const names = new Set();
  const visit = (value) => {
    if (typeof value === 'string' && value.endsWith('_portrait') || typeof value === 'string' && value.endsWith('_landscape')) {
      names.add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (isPlainObject(value)) {
      Object.values(value).forEach(visit);
    }
  };
  visit(config);
  return [...names];
}

const STANDARD_KEYBOARD_NAME_PATTERN = /^(pinyin_(?:9|14|17|18|26)|alphabetic_26|numeric_(?:9|ios)|symbolic|emoji|panel)_(portrait|landscape)$/;

function configKeyboardName(config = {}, group, orientation, device = 'iPhone') {
  const value = config?.[group]?.[device]?.[orientation];
  return typeof value === 'string' && value ? value : '';
}

function inferImportedPinyinVariant(project, sourceName = '') {
  const text = [
    sourceName,
    project?.meta?.name,
    project?.config?.name,
    project?.config?.description,
  ].filter(Boolean).join(' ');
  const variantMatch = text.match(/(?:pinyin[_-]?)?(9|14|17|18|26)\s*键|T(9|14|17|18|26)|pinyin_(9|14|17|18|26)/i);
  return variantMatch?.[1] || variantMatch?.[2] || variantMatch?.[3] || '26';
}

function standardKeyboardNameForImportedPayload(project, group, orientation, sourceName) {
  if (!sourceName || STANDARD_KEYBOARD_NAME_PATTERN.test(sourceName)) return sourceName;
  if (group === 'pinyin') return `pinyin_${inferImportedPinyinVariant(project, sourceName)}_${orientation}`;
  if (group === 'alphabetic') return `alphabetic_26_${orientation}`;
  if (group === 'numeric') return `numeric_9_${orientation}`;
  if (group === 'symbolic') return `symbolic_${orientation}`;
  if (group === 'emoji') return `emoji_${orientation}`;
  if (group === 'panel') return `panel_${orientation}`;
  return '';
}

function syncImportedMappedPayloadsToWorkbenchNames(project) {
  const aliases = [];
  for (const group of ['pinyin', 'alphabetic', 'numeric', 'symbolic', 'emoji', 'panel']) {
    for (const orientation of ['portrait', 'landscape']) {
      const sourceName = configKeyboardName(project.config, group, orientation);
      const targetName = standardKeyboardNameForImportedPayload(project, group, orientation, sourceName);
      if (!sourceName || !targetName || sourceName === targetName) continue;
      aliases.push({ group, orientation, sourceName, targetName });
    }
  }
  if (!aliases.length) return;
  project.importCompatibility = {
    ...(project.importCompatibility || {}),
    originalConfig: deepClone(project.config || {}),
    keyboardNameAliases: aliases,
  };
  for (const themeName of ['light', 'dark']) {
    const payloads = project.nativeKeyboardPayloads?.[themeName];
    if (!isPlainObject(payloads)) continue;
    for (const alias of aliases) {
      if (!isPlainObject(payloads[alias.sourceName]) || isPlainObject(payloads[alias.targetName])) continue;
      payloads[alias.targetName] = deepClone(payloads[alias.sourceName]);
    }
  }
  for (const alias of aliases) {
    for (const device of ['iPhone', 'iPad']) {
      if (project.config?.[alias.group]?.[device]?.[alias.orientation] === alias.sourceName) {
        project.config[alias.group][device][alias.orientation] = alias.targetName;
      }
      if (alias.orientation === 'portrait' && project.config?.[alias.group]?.[device]?.floating === alias.sourceName) {
        project.config[alias.group][device].floating = alias.targetName;
      }
    }
  }
  const pinyinVariant = inferImportedPinyinVariant(project, aliases.find((item) => item.group === 'pinyin')?.sourceName || '');
  if (['9', '14', '17', '18', '26'].includes(pinyinVariant)) {
    project.keyboardCombo = project.keyboardCombo || {};
    project.keyboardCombo.slots = project.keyboardCombo.slots || {};
    project.keyboardCombo.slots.pinyin = {
      ...(project.keyboardCombo.slots.pinyin || {}),
      enabled: true,
      source: 'custom',
      variant: pinyinVariant,
    };
  }
}

function hasResourceImage(resources, themeName, file, image = 'IMG1') {
  return !!resources?.[themeName]?.[file]?.sprites?.[image];
}

function imageStyle(file, image = 'IMG1', highlightFile = null) {
  const style = {
    buttonStyleType: 'fileImage',
    normalImage: { file, image },
  };
  if (highlightFile) style.highlightImage = { file: highlightFile, image };
  return style;
}

function inferResourcePreviewPayload(resources, themeName, keyboardName) {
  const payload = {};
  if (hasResourceImage(resources, themeName, 'bj', 'IMG2')) {
    payload.keyboardBackgroundStyle = imageStyle('bj', 'IMG2');
  }
  if (hasResourceImage(resources, themeName, 'bj', 'IMG3')) {
    payload.toolbarBackgroundStyle = imageStyle('bj', 'IMG3');
  }
  if (hasResourceImage(resources, themeName, 'bj', 'IMG1')) {
    payload.preeditBackgroundStyle = imageStyle('bj', 'IMG1');
    payload.verticalCandidateBackgroundStyle = imageStyle('bj', 'IMG1');
  }
  if (/^(pinyin|alphabetic)_26_/.test(keyboardName) && hasResourceImage(resources, themeName, 'anjian26', 'IMG27')) {
    payload.alphabeticBackgroundStyle = imageStyle(
      'anjian26',
      'IMG27',
      hasResourceImage(resources, themeName, 'anjian26ax', 'IMG27') ? 'anjian26ax' : null,
    );
  }
  if (/^numeric_9_/.test(keyboardName) && hasResourceImage(resources, themeName, 'anjian9', 'IMG1')) {
    payload.alphabeticBackgroundStyle = imageStyle(
      'anjian9',
      'IMG1',
      hasResourceImage(resources, themeName, 'anjian9ax', 'IMG1') ? 'anjian9ax' : null,
    );
  }
  if (/^symbolic_/.test(keyboardName) && hasResourceImage(resources, themeName, 'anjian', 'IMG15')) {
    payload.alphabeticBackgroundStyle = imageStyle('anjian', 'IMG15');
  }
  return Object.keys(payload).length ? payload : null;
}

function applyResourcePreviewFallbacks(project, resources) {
  const keyboardNames = collectConfigKeyboardNames(project.config);
  for (const themeName of ['light', 'dark']) {
    for (const keyboardName of keyboardNames) {
      if (project.nativeKeyboardPayloads?.[themeName]?.[keyboardName]) continue;
      const inferred = inferResourcePreviewPayload(resources, themeName, keyboardName);
      if (!inferred) continue;
      project.nativeKeyboardPayloads[themeName] = project.nativeKeyboardPayloads[themeName] || {};
      project.nativeKeyboardPayloads[themeName][keyboardName] = inferred;
    }
  }
}

function applyImportedPayloadPropertiesFromStoredPayloads(project) {
  const hasLightPayloads = isPlainObject(project.nativeKeyboardPayloads?.light)
    && Object.values(project.nativeKeyboardPayloads.light).some((payload) => isPlainObject(payload));
  for (const themeName of ['light', 'dark']) {
    const payloads = project.nativeKeyboardPayloads?.[themeName];
    if (!isPlainObject(payloads)) continue;
    for (const [keyboardName, payload] of Object.entries(payloads)) {
      if (!STANDARD_KEYBOARD_NAME_PATTERN.test(keyboardName)) continue;
      applyImportedPayloadProperties(project, themeName, keyboardName, payload, {
        applyShared: themeName === 'light' || !hasLightPayloads,
      });
    }
  }
}

function buildProjectFromSkinPayloads(sampleProject, payloads, sourceName = '', resources = {}) {
  const project = deepClone(sampleProject);
  project.meta = {
    ...project.meta,
    name: sourceName ? sourceName.replace(/\.(cskin|zip|yaml|yml|jsonnet|libsonnet|json)$/i, '') : project.meta.name,
    description: '从皮肤包导入',
  };
  project.nativeKeyboardPayloads = { light: {}, dark: {} };
  project.assets = {
    ...(project.assets || {}),
    resources: mergePlainObjectPatch(project.assets?.resources || {}, resources),
  };
  const config = payloads['config.yaml'];
  applyConfig(project, config);
  for (const [path, payload] of Object.entries(payloads)) {
    applyNativePayload(project, path, payload);
  }
  syncImportedMappedPayloadsToWorkbenchNames(project);
  applyImportedPayloadPropertiesFromStoredPayloads(project);
  applyResourcePreviewFallbacks(project, resources);
  return project;
}

export async function importSkinProjectFromFile(file, sampleProject) {
  const entries = await readImportFileEntries(file);
  const files = collectFilesFromEntries(entries);
  const resources = collectResourceAssetsFromEntries(entries);
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
    project: buildProjectFromSkinPayloads(sampleProject, payloads, file?.name || '', resources),
    source: Object.keys(jsonnetPayloads).length ? 'jsonnet+yaml' : 'yaml',
    importedFiles: Object.keys(files),
  };
}
