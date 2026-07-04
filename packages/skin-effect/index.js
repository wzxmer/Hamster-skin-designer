import { NATIVE_KEYBOARD_PRESET_PAYLOADS } from '../../apps/workbench/src/data/native-keyboard-presets.generated.js';
import TEMPLATE_PACKAGE_ASSETS from '../../templates/hamster-ios/package-assets.json' with { type: 'json' };
import { sanitizeLegacyNativeSeed } from './legacy-seed-sanitizer.js';

const DEFAULT_NATIVE_PAYLOAD_PRESET = 'ios-26';
const AVAILABLE_TEMPLATE_RESOURCE_FILES = new Set(
  Object.keys(TEMPLATE_PACKAGE_ASSETS?.binaryFiles || {})
    .filter((path) => /^(light|dark)\/resources\/[^/]+\.png$/i.test(path))
    .map((path) => path.split('/').pop().replace(/\.png$/i, '')),
);
const ACTION_AUX_KEYS = new Set(['actionType', 'actionValue', 'actionKeyboardSelection', 'presetValue']);
const STANDARD_ACTION_VALUES = new Set([
  'space',
  'enter',
  'tab',
  'shift',
  'backspace',
  'dismissKeyboard',
  'moveCursorBackward',
  'moveCursorForward',
  'returnPrimaryKeyboard',
  'returnLastKeyboard',
  'symbolicKeyboardLockStateToggle',
  'settings',
  'nextKeyboard',
]);
const LEGACY_SHORTCUT_VALUE_MAP = {
  pasteboard: '#showPasteboardView',
  '#Pasteboard': '#showPasteboardView',
  phrase: '#showPhraseView',
  '#Phrase': '#showPhraseView',
};
const SYMBOLIC_KEYBOARD_LAYOUT = [
  {
    HStack: {
      style: 'HStackStyle1',
      subviews: [{ Cell: 'categoryCollection' }, { Cell: 'descriptionCollection' }],
    },
  },
  {
    HStack: {
      style: 'HStackStyle2',
      subviews: [
        { Cell: 'symbolreturnButton' },
        { Cell: 'pageUpButton' },
        { Cell: 'pageDownButton' },
        { Cell: 'lockButton' },
        { Cell: 'symbolbackspaceButton' },
      ],
    },
  },
];
const PANEL_BUTTONS = [
  ['HamsterButton', 'SwitcherButton', 'settingsButton', 'PhraseButton', 'FinderButton'],
  ['HamsterSkinButton', 'UploadButton', 'DeployButton', 'emojiButton', 'LenovoButton'],
];
const PANEL_BUTTON_CONFIG = {
  HamsterButton: { textKey: 'Script', text: '元书', systemImageName: 'keyboard', action: { openURL: 'hamster3://com.ihsiao.apps.hamster3/' } },
  SwitcherButton: { textKey: 'RimeSwitcher', text: 'Switcher', systemImageName: 'switch.2', action: { shortcut: '#RimeSwitcher' } },
  settingsButton: { textKey: 'KeyboardSetting', text: '键盘设置', systemImageName: 'slider.horizontal.3', action: { openURL: 'hamster3://com.ihsiao.apps.hamster3/keyboardSettings' } },
  PhraseButton: { textKey: 'EmbeddedInputMode', text: '内嵌开关', systemImageName: 'square.and.pencil', action: { shortcut: '#toggleEmbeddedInputMode' } },
  FinderButton: { textKey: 'FileManager', text: '文件', systemImageName: 'folder', action: { openURL: 'hamster3://com.ihsiao.apps.hamster3/finder' } },
  HamsterSkinButton: { textKey: 'HamsterSetting', text: '皮肤设置', systemImageName: 'tshirt', action: { openURL: 'hamster3://com.ihsiao.apps.hamster3/keyboardSkins' } },
  UploadButton: { textKey: 'KeyboardPiP', text: '画中画', systemImageName: 'rectangle.center.inset.filled.badge.plus', action: { openURL: 'hamster3://com.ihsiao.apps.hamster3/clipboard?action=openPictureInPicture' } },
  DeployButton: { textKey: 'Deploy', text: '部署', systemImageName: 'command.circle', action: { openURL: 'hamster3://com.ihsiao.apps.hamster3/rime?action=deploy' } },
  emojiButton: { textKey: 'Simplified', text: '简繁', systemImageName: 'character.textbox', action: { shortcut: '#简繁切换' } },
  LenovoButton: { textKey: 'Lenovo', text: '联想', systemImageName: 'bolt.horizontal.circle', action: { sendKeys: 'Shift+p' } },
};

function emptySwipeData() {
  return { swipe_up: {}, swipe_down: {} };
}

function cloneSwipeLabelsHidden(value) {
  if (Array.isArray(value)) return value.map((item) => cloneSwipeLabelsHidden(item));
  if (!isPlainObject(value)) return value;
  const next = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'label' && isPlainObject(item)) {
      next[key] = { text: '' };
      continue;
    }
    next[key] = cloneSwipeLabelsHidden(item);
  }
  return next;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeResourceFileName(fileName = '') {
  return String(fileName || '').replace(/\.[^.]+$/, '');
}

function availableResourceFilesForProject(project = {}) {
  const files = new Set(AVAILABLE_TEMPLATE_RESOURCE_FILES);
  const resources = project.assets?.resources;
  if (!isPlainObject(resources)) return files;
  for (const [themeName, themeResources] of Object.entries(resources)) {
    if (!isPlainObject(themeResources)) continue;
    for (const [fileName, resource] of Object.entries(themeResources)) {
      const normalizedFile = normalizeResourceFileName(fileName);
      const source = String(resource?.source || `resources/${normalizedFile}.png`);
      const packagePath = `${themeName}/resources/${source.split('/').pop() || `${normalizedFile}.png`}`;
      if (/^data:image\//i.test(source) || TEMPLATE_PACKAGE_ASSETS?.binaryFiles?.[packagePath]) {
        files.add(normalizedFile);
      }
    }
  }
  return files;
}

function mergePlainObjectPatch(target, patch) {
  for (const [key, value] of Object.entries(patch || {})) {
    if (Array.isArray(value)) {
      target[key] = structuredClone(value);
      continue;
    }
    if (isPlainObject(value)) {
      if (!isPlainObject(target[key])) target[key] = {};
      mergePlainObjectPatch(target[key], value);
      continue;
    }
    target[key] = value;
  }
  return target;
}

function decimalFractionToIntegerFraction(value) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/.test(value)) return value;
  const [leftText, rightText] = value.split('/');
  if (!leftText.includes('.') && !rightText.includes('.')) return value;
  const scaleFor = (text) => {
    const digits = text.includes('.') ? text.split('.')[1].length : 0;
    return 10 ** digits;
  };
  const scale = Math.max(scaleFor(leftText), scaleFor(rightText));
  let left = Math.round(Number(leftText) * scale);
  let right = Math.round(Number(rightText) * scale);
  if (!Number.isFinite(left) || !Number.isFinite(right) || right === 0) return value;
  const gcd = (a, b) => {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) {
      const next = x % y;
      x = y;
      y = next;
    }
    return x || 1;
  };
  const divisor = gcd(left, right);
  left /= divisor;
  right /= divisor;
  return `${left}/${right}`;
}

export function normalizeActionObject(value) {
  if (typeof value === 'string') {
    if (STANDARD_ACTION_VALUES.has(value)) return { action: value };
    const shortcutValue = normalizeShortcutValue(value);
    return shortcutValue ? { shortcut: shortcutValue } : {};
  }
  if (!isPlainObject(value)) return {};
  if (isPlainObject(value.action)) {
    return normalizeActionObject(value.action);
  }
  if (typeof value.action === 'string') {
    return value.action ? { action: value.action } : {};
  }
  const realEntry = Object.entries(value).find(([key]) => !ACTION_AUX_KEYS.has(key));
  if (realEntry) {
    const [type, actionValue] = realEntry;
    if (type === 'floatKeyboardType' && actionValue === 'panel') {
      return { keyboardType: 'panel' };
    }
    if (type === 'shortcut' || type === 'shortcutCommand') {
      const shortcutValue = normalizeShortcutValue(actionValue);
      return shortcutValue ? { shortcut: shortcutValue } : {};
    }
    return actionValue === undefined || actionValue === null || actionValue === ''
      ? {}
      : { [type]: actionValue };
  }
  const type = typeof value.actionType === 'string' && value.actionType ? value.actionType : 'character';
  const actionValue = value.actionValue === undefined || value.actionValue === null ? '' : String(value.actionValue).trim();
  if (type === 'floatKeyboardType' && actionValue === 'panel') {
    return { keyboardType: 'panel' };
  }
  if (type === 'shortcut' || type === 'shortcutCommand') {
    const shortcutValue = normalizeShortcutValue(actionValue);
    return shortcutValue ? { shortcut: shortcutValue } : {};
  }
  return actionValue ? { [type]: actionValue } : {};
}

function normalizeShortcutValue(value) {
  const text = String(value ?? '').trim();
  return LEGACY_SHORTCUT_VALUE_MAP[text] || text;
}

export function cleanPerItemFontSize(value) {
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

export function resolveKeyboardKind(name) {
  if (name.startsWith('numeric')) return 'numeric';
  if (name.startsWith('symbolic')) return 'symbolic';
  if (name.startsWith('emoji')) return 'emoji';
  if (name.startsWith('panel')) return 'panel';
  if (name.startsWith('alphabetic')) return 'alphabetic';
  return 'pinyin';
}

function swipeUiKeyForKeyboard(kind, keyboardName = '') {
  if (kind === 'pinyin' && keyboardName.startsWith('pinyin_9_')) return 'pinyin9';
  if (kind === 'numeric') return 'numeric';
  if (kind === 'alphabetic') return 'alphabetic';
  if (kind === 'pinyin') return 'pinyin';
  return kind;
}

export function swipesFor(project, kind, keyboardName = '') {
  if (project.data?.swipesEnabled === false || project.keyboardCombo?.swipeBehavior?.mode === 'disabled') {
    return emptySwipeData();
  }
  const layoutBehavior = project.keyboardCombo?.swipeBehavior?.layouts?.[kind];
  if (layoutBehavior?.mode === 'disabled') return emptySwipeData();
  const uiBehavior = project.keyboardCombo?.swipeBehavior?.ui?.[swipeUiKeyForKeyboard(kind, keyboardName)];
  if (uiBehavior?.mode === 'disabled') return emptySwipeData();
  const source = {
    pinyin: project.data?.swipes?.pinyin,
    alphabetic: project.data?.swipes?.alphabetic,
    numeric: project.data?.swipes?.numeric,
  }[kind];
  const next = cleanPerItemFontSize(source || emptySwipeData());
  if (layoutBehavior?.showSwipeUp === false) next.swipe_up = {};
  if (layoutBehavior?.showSwipeDown === false) next.swipe_down = {};
  return next;
}

function normalizeEmbeddedActionNodes(value) {
  if (Array.isArray(value)) return value.map((item) => normalizeEmbeddedActionNodes(item));
  if (!isPlainObject(value)) return value;
  const next = {};
  for (const [key, item] of Object.entries(value)) {
    if (ACTION_AUX_KEYS.has(key)) continue;
    if (key === 'action') {
      const normalizedAction = normalizeActionObject(item);
      if (Object.keys(normalizedAction).length) next.action = normalizedAction;
      continue;
    }
    next[key] = normalizeEmbeddedActionNodes(item);
  }
  return next;
}

function normalizeToolbarActions(actions = {}) {
  if (!isPlainObject(actions)) return {};
  const next = {};
  for (const [key, value] of Object.entries(actions)) {
    next[key] = normalizeActionObject(value);
  }
  return next;
}

function effectiveConfigForExport(config = {}, keyboardCombo = {}) {
  const next = structuredClone(config || {});
  const slots = keyboardCombo.slots || {};
  const inputStrategy = keyboardCombo.inputStrategy || 'separateAlphabetic';
  next.pinyin = next.pinyin || {};
  next.alphabetic = next.alphabetic || {};
  next.numeric = next.numeric || {};
  next.symbolic = next.symbolic || {};
  next.emoji = next.emoji || {};
  next.panel = next.panel || {};

  if (['9', '14', '17', '18'].includes(slots.pinyin?.variant)) {
    for (const device of ['iPhone', 'iPad']) {
      next.pinyin[device] = next.pinyin[device] || {};
      next.pinyin[device].portrait = `pinyin_${slots.pinyin.variant}_portrait`;
      next.pinyin[device].landscape = `pinyin_${slots.pinyin.variant}_landscape`;
      if (device === 'iPad') next.pinyin[device].floating = `pinyin_${slots.pinyin.variant}_portrait`;
    }
  }
  if (slots.pinyin?.variant === '26' && slots.pinyin?.source !== 'disabled' && slots.pinyin?.enabled !== false) {
    for (const device of ['iPhone', 'iPad']) {
      next.pinyin[device] = next.pinyin[device] || {};
      next.pinyin[device].portrait = 'pinyin_26_portrait';
      next.pinyin[device].landscape = 'pinyin_26_landscape';
      if (device === 'iPad') next.pinyin[device].floating = 'pinyin_26_portrait';
    }
  }

  if (inputStrategy !== 'separateAlphabetic' || slots.alphabetic?.source === 'disabled') {
    next.alphabetic = {};
  }

  if (slots.numeric?.variant === 'ios') {
    for (const device of ['iPhone', 'iPad']) {
      next.numeric[device] = next.numeric[device] || {};
      next.numeric[device].portrait = 'numeric_ios_portrait';
      next.numeric[device].landscape = 'numeric_ios_landscape';
      if (device === 'iPad') next.numeric[device].floating = 'numeric_ios_portrait';
    }
  }
  if (slots.numeric?.variant === '9') {
    for (const device of ['iPhone', 'iPad']) {
      next.numeric[device] = next.numeric[device] || {};
      next.numeric[device].portrait = 'numeric_9_portrait';
      next.numeric[device].landscape = 'numeric_9_landscape';
      if (device === 'iPad') next.numeric[device].floating = 'numeric_9_portrait';
    }
  }

  if (slots.symbolic?.source === 'system') next.symbolic = {};
  if (slots.symbolic?.source === 'custom') {
    for (const device of ['iPhone', 'iPad']) {
      next.symbolic[device] = next.symbolic[device] || {};
      next.symbolic[device].portrait = 'symbolic_portrait';
      next.symbolic[device].landscape = 'symbolic_landscape';
      if (device === 'iPad') next.symbolic[device].floating = 'symbolic_portrait';
    }
  }
  if (slots.symbolic?.source === 'disabled' || slots.symbolic?.enabled === false) {
    next.symbolic = {};
  }

  if (slots.emoji?.source === 'system') next.emoji = {};
  if (slots.emoji?.source === 'custom') {
    for (const device of ['iPhone', 'iPad']) {
      next.emoji[device] = next.emoji[device] || {};
      next.emoji[device].portrait = 'emoji_portrait';
      next.emoji[device].landscape = 'emoji_landscape';
      if (device === 'iPad') next.emoji[device].floating = 'emoji_portrait';
    }
  }
  if (slots.emoji?.source === 'disabled' || slots.emoji?.enabled === false) {
    next.emoji = {};
  }

  if (slots.panel?.source === 'disabled' || slots.panel?.enabled === false) {
    next.panel = {};
  }

  return next;
}

function effectiveToolbarForExport(toolbar = {}, keyboardCombo = {}) {
  const next = structuredClone(toolbar || {});
  const layout = Array.isArray(next.layout) ? next.layout : [];
  next.layout = (keyboardCombo.toolbar?.enabled === false ? [] : layout).filter((button) => {
    if (button === 'menu') return keyboardCombo.slots?.panel?.source !== 'disabled' && keyboardCombo.slots?.panel?.enabled !== false;
    if (button === 'symbol') return keyboardCombo.slots?.symbolic?.source !== 'disabled' && keyboardCombo.slots?.symbolic?.enabled !== false;
    if (button === 'emoji') return keyboardCombo.slots?.emoji?.source !== 'disabled' && keyboardCombo.slots?.emoji?.enabled !== false;
    return true;
  });
  if (keyboardCombo.toolbar?.displayStyle === 'text') {
    next.display = next.display || {};
    for (const key of Object.keys(next.display)) {
      next.display[key] = { ...(next.display[key] || {}), type: 'text' };
    }
  }
  next.actions = normalizeToolbarActions(next.actions);
  return next;
}

export function buildEffectiveProject(project) {
  const next = structuredClone(project);
  next.keyboardCombo = next.keyboardCombo || {};
  next.config = effectiveConfigForExport(next.config, next.keyboardCombo);
  next.toolbar = effectiveToolbarForExport(next.toolbar, next.keyboardCombo);
  next.keyboards = normalizeEmbeddedActionNodes(next.keyboards || {});
  next.data = normalizeEmbeddedActionNodes(next.data || {});
  next.keyboards.keyboard26 = next.keyboards.keyboard26 || {};
  next.keyboards.keyboard26.pinyinSchemaName = next.keyboards.keyboard26.pinyinSchemaName || {};
  next.keyboards.keyboard26.spaceRight = next.keyboards.keyboard26.spaceRight || {};
  next.keyboards.keyboard26.spaceRight.pinyin = next.keyboards.keyboard26.spaceRight.pinyin || {};
  next.keyboards.keyboard26.spaceRight.pinyin.secondary = next.keyboards.keyboard26.spaceRight.pinyin.secondary || {};
  if (next.keyboardCombo?.spaceRow?.showSchemaNameOnSpace === false) {
    next.keyboards.keyboard26.pinyinSchemaName.text = '';
  }
  if (typeof next.keyboardCombo?.spaceRow?.commaKey?.swipeUp === 'string') {
    next.keyboards.keyboard26.spaceRight.pinyin.secondary.text = next.keyboardCombo.spaceRow.commaKey.swipeUp;
    next.data = next.data || {};
    next.data.swipes = next.data.swipes || {};
    next.data.swipes.pinyin = next.data.swipes.pinyin || {};
    next.data.swipes.pinyin.swipe_up = next.data.swipes.pinyin.swipe_up || {};
    next.data.swipes.pinyin.swipe_up.spaceRight = next.data.swipes.pinyin.swipe_up.spaceRight || {};
    next.data.swipes.pinyin.swipe_up.spaceRight.action = { character: next.keyboardCombo.spaceRow.commaKey.swipeUp };
    next.data.swipes.pinyin.swipe_up.spaceRight.label = { text: '' };
  }
  if (next.keyboardCombo?.spaceRow?.semicolonKey?.enabled === true) {
    next.data = next.data || {};
    next.data.swipes = next.data.swipes || {};
    next.data.swipes.pinyin = next.data.swipes.pinyin || {};
    next.data.swipes.pinyin.swipe_up = next.data.swipes.pinyin.swipe_up || {};
    next.data.swipes.pinyin.swipe_up.semicolon = next.data.swipes.pinyin.swipe_up.semicolon || {};
    next.data.swipes.pinyin.swipe_up.semicolon.action = { shortcut: next.keyboardCombo.spaceRow.semicolonKey.swipeUpAction || '#次选上屏' };
    next.data.swipes.pinyin.swipe_up.semicolon.label = { text: '' };
  }
  if (next.keyboardCombo?.swipeBehavior?.mode === 'hidden') {
    next.data = next.data || {};
    next.data.swipes = cloneSwipeLabelsHidden(next.data.swipes || {});
  }
  return next;
}

function pruneEmptyPlainObjects(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => pruneEmptyPlainObjects(item))
      .filter((item) => item !== undefined && item !== null);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const next = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || item === null) continue;
    const prunedItem = pruneEmptyPlainObjects(item);
    if (prunedItem === undefined || prunedItem === null) continue;
    if (isPlainObject(prunedItem) && !Object.keys(prunedItem).length) continue;
    next[key] = prunedItem;
  }
  return next;
}

export function collectMappedKeyboardNames(project) {
  const names = new Set();
  const keyboardCombo = project.keyboardCombo || {};
  for (const group of Object.values(project.config || {})) {
    if (!isPlainObject(group)) continue;
    for (const device of Object.values(group)) {
      if (!isPlainObject(device)) continue;
      for (const keyboardName of Object.values(device)) {
        if (typeof keyboardName === 'string' && keyboardName) {
          names.add(keyboardName);
        }
      }
    }
  }
  if (keyboardCombo.slots?.symbolic?.source === 'system') {
    names.delete('symbolic_system');
  }
  if (keyboardCombo.slots?.emoji?.source === 'system') {
    names.delete('emoji_system');
    names.delete('emoji_portrait');
    names.delete('emoji_landscape');
  }
  return [...names].sort();
}

export function collectNativeKeyboardNames(project) {
  return new Set(collectMappedKeyboardNames(project).filter((keyboardName) => (
    buildEffectiveNativeKeyboardPayload(project, 'light', keyboardName)
    || buildEffectiveNativeKeyboardPayload(project, 'dark', keyboardName)
  )));
}

function isSystemKeyboardName(keyboardName) {
  return keyboardName === 'symbolic_system' || keyboardName === 'emoji_system';
}

function resolveOrientation(name) {
  if (name.includes('landscape')) return 'landscape';
  return 'portrait';
}

function keyboardLayoutFor(project, kind, orientation) {
  if (kind === 'numeric') return project.keyboards.numeric?.layout?.[orientation] || {};
  if (kind === 'symbolic') return project.keyboards.symbolic?.layout?.[orientation] || project.keyboards.symbolic?.layout || {};
  if (kind === 'emoji') return project.keyboards.symbolic?.layout?.[orientation] || project.keyboards.symbolic?.layout || {};
  if (kind === 'panel') return project.keyboards.panel?.layout?.[orientation] || project.keyboards.panel?.layout || {};
  const variant = project.keyboardCombo?.slots?.pinyin?.variant;
  const variantLayout = project.keyboards.keyboard26?.variants?.[variant];
  if (variant && variant !== '26' && variantLayout) {
    return {
      rows: structuredClone(variantLayout[orientation === 'landscape' ? 'landscapeRows' : 'portraitRows'] || variantLayout.portraitRows || []),
    };
  }
  return project.keyboards.keyboard26.layout?.[orientation] || project.keyboards.keyboard26.layout?.portrait || {};
}

function buildFallbackKeyboardPayload(project, themeName, keyboardName) {
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
        swipes: kind === 'emoji' ? emptySwipeData() : swipesFor(project, kind, keyboardName),
        collections: kind === 'emoji'
          ? { emojiDataSource: project.data.collections?.emojiDataSource || {} }
          : project.data.collections,
        hints: cleanPerItemFontSize(project.data.hints || {}),
      },
      assets: project.assets.images,
    },
  };
}

function buildSymbolicNativeKeyboardPayload(project, themeName, keyboardName) {
  const kind = resolveKeyboardKind(keyboardName);
  if (kind !== 'symbolic' && kind !== 'emoji') return null;
  const themeColors = project.theme?.[themeName]?.colors || {};
  const sharedFontSize = project.theme?.shared?.fontSize || {};
  const orientation = resolveOrientation(keyboardName);
  const frame = project.keyboardFrame?.[orientation] || project.keyboardFrame?.portrait || {};
  const isLandscape = orientation === 'landscape';
  const dataSource = kind === 'emoji'
    ? project.data?.collections?.emojiDataSource
    : project.data?.collections?.symbolicDataSource;
  const categoryWidth = isLandscape ? '56/667' : '56/375';
  const descriptionWidth = isLandscape ? '611/667' : '319/375';
  const keyboardHeight = Number(frame.keyboardHeight) || (isLandscape ? 144 : 268);
  const foregroundColor = themeColors['按键前景颜色'] || (themeName === 'dark' ? '#FFFFFF' : '#000000');
  const keyboardBackground = themeColors['键盘背景颜色'] || (themeName === 'dark' ? '#1f2024' : '#E1E2E7');
  const functionNormal = themeColors['功能键背景颜色-普通'] || (themeName === 'dark' ? '#4d535d' : '#BDC1CC');
  const functionHighlight = themeColors['功能键背景颜色-高亮'] || (themeName === 'dark' ? '#5c6370' : '#FFFFFFE6');
  const lowerEdge = themeColors['底边缘颜色-普通'] || (themeName === 'dark' ? '#2b2d31' : '#88898D');
  const categoryBg = themeColors['符号键盘左侧collection背景颜色'] || functionNormal;
  const descriptionBg = themeColors['符号键盘右侧collection背景颜色'] || (themeName === 'dark' ? '#2f3136' : '#ffffff');
  const listNormal = themeColors['列表未选中字体颜色'] || foregroundColor;
  const listHighlight = themeColors['列表选中字体颜色'] || foregroundColor;
  return {
    keyboardHeight,
    keyboardLayout: structuredClone(SYMBOLIC_KEYBOARD_LAYOUT),
    keyboardStyle: {
      backgroundStyle: 'keyboardBackgroundStyle',
      insets: { top: 3, left: 4, bottom: 3, right: 4 },
    },
    keyboardBackgroundStyle: {
      buttonStyleType: 'geometry',
      normalColor: keyboardBackground,
    },
    HStackStyle1: {
      size: { height: isLandscape ? '96/144' : '227/281' },
    },
    HStackStyle2: {
      size: { height: isLandscape ? '48/144' : '54/281' },
    },
    categoryCollection: {
      backgroundStyle: 'categoryCollectionBackgroundStyle',
      cellStyle: 'categoryCollectionCellStyle',
      dataSource: 'category',
      size: { width: categoryWidth },
      type: 'classifiedSymbols',
    },
    categoryCollectionBackgroundStyle: {
      buttonStyleType: 'geometry',
      cornerRadius: 7,
      insets: { top: 5, left: 3, bottom: 5, right: 3 },
      normalColor: categoryBg,
      normalLowerEdgeColor: lowerEdge,
      normalShadowColor: lowerEdge,
    },
    categoryCollectionCellStyle: {
      backgroundStyle: 'categoryCollectionCellBackgroundStyle',
      foregroundStyle: 'categoryCollectionCellForegroundStyle',
    },
    categoryCollectionCellBackgroundStyle: {
      buttonStyleType: 'geometry',
      cornerRadius: 7,
      highlightColor: themeColors['字母键背景颜色-普通'] || (themeName === 'dark' ? '#5b616b' : '#FFFFFF'),
      insets: { top: 7, left: 4, bottom: 7, right: 4 },
      normalColor: '#00000000',
    },
    categoryCollectionCellForegroundStyle: {
      buttonStyleType: 'text',
      fontSize: sharedFontSize['符号键盘左侧collection前景字体大小'] || 13,
      fontWeight: 0,
      highlightColor: listHighlight,
      normalColor: listNormal,
    },
    descriptionCollection: {
      backgroundStyle: 'descriptionCollectionBackgroundStyle',
      cellStyle: 'descriptionCollectionCellStyle',
      insets: { top: 4, left: 4, bottom: 4, right: 4 },
      maximumColumn: isLandscape ? 5 : undefined,
      maximumRow: isLandscape ? 4 : undefined,
      size: { width: descriptionWidth },
      type: 'subClassifiedSymbols',
    },
    descriptionCollectionBackgroundStyle: {
      buttonStyleType: 'geometry',
      cornerRadius: 7,
      insets: { top: 5, left: 3, bottom: 5, right: 3 },
      normalColor: descriptionBg,
      normalLowerEdgeColor: lowerEdge,
    },
    descriptionCollectionCellStyle: {
      foregroundStyle: 'descriptionCollectionCellForegroundStyle',
    },
    descriptionCollectionCellForegroundStyle: {
      buttonStyleType: 'text',
      fontSize: sharedFontSize['符号键盘右侧collection前景字体大小'] || 16,
      fontWeight: 0,
      highlightColor: listHighlight,
      normalColor: listNormal,
    },
    systemButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      cornerRadius: 7,
      highlightColor: functionHighlight,
      highlightLowerEdgeColor: themeColors['底边缘颜色-高亮'] || lowerEdge,
      insets: { top: 4, left: 3, bottom: 4, right: 3 },
      normalColor: functionNormal,
      normalLowerEdgeColor: lowerEdge,
    },
    symbolreturnButton: {
      action: 'returnLastKeyboard',
      animation: ['ButtonScaleAnimation'],
      backgroundStyle: 'systemButtonBackgroundStyle',
      foregroundStyle: 'symbolreturnButtonForegroundStyle',
    },
    symbolreturnButtonForegroundStyle: {
      buttonStyleType: 'text',
      fontSize: 15,
      highlightColor: foregroundColor,
      normalColor: foregroundColor,
      text: project.keyboards?.symbolic?.text?.return || '返回',
    },
    pageUpButton: {
      action: { shortcut: '#subCollectionPageUp' },
      animation: ['ButtonScaleAnimation'],
      backgroundStyle: 'systemButtonBackgroundStyle',
      foregroundStyle: 'pageUpButtonForegroundStyle',
      size: { width: isLandscape ? '160/667' : '87/375' },
    },
    pageUpButtonForegroundStyle: {
      buttonStyleType: 'systemImage',
      center: { y: 0.53 },
      fontSize: 15,
      highlightColor: foregroundColor,
      normalColor: foregroundColor,
      systemImageName: 'chevron.up',
    },
    pageDownButton: {
      action: { shortcut: '#subCollectionPageDown' },
      animation: ['ButtonScaleAnimation'],
      backgroundStyle: 'systemButtonBackgroundStyle',
      foregroundStyle: 'pageDownButtonForegroundStyle',
      size: { width: isLandscape ? '160/667' : '87/375' },
    },
    pageDownButtonForegroundStyle: {
      buttonStyleType: 'systemImage',
      center: { y: 0.53 },
      fontSize: 15,
      highlightColor: foregroundColor,
      normalColor: foregroundColor,
      systemImageName: 'chevron.down',
    },
    lockButton: {
      action: 'symbolicKeyboardLockStateToggle',
      animation: ['ButtonScaleAnimation'],
      backgroundStyle: 'systemButtonBackgroundStyle',
      foregroundStyle: [
        { conditionKey: '$symbolicKeyboardLockState', conditionValue: false, styleName: 'lockButtonUnlockedForegroundStyle' },
        { conditionKey: '$symbolicKeyboardLockState', conditionValue: true, styleName: 'lockButtonForegroundStyle' },
      ],
      size: { width: isLandscape ? '160/667' : '87/375' },
    },
    lockButtonForegroundStyle: {
      buttonStyleType: 'systemImage',
      center: { y: 0.53 },
      fontSize: 15,
      highlightColor: foregroundColor,
      normalColor: foregroundColor,
      systemImageName: 'lock',
    },
    lockButtonUnlockedForegroundStyle: {
      buttonStyleType: 'systemImage',
      center: { y: 0.53 },
      fontSize: 15,
      highlightColor: foregroundColor,
      normalColor: foregroundColor,
      systemImageName: 'lock.open',
    },
    symbolbackspaceButton: {
      action: 'backspace',
      animation: ['ButtonScaleAnimation'],
      backgroundStyle: 'systemButtonBackgroundStyle',
      foregroundStyle: 'symbolbackspaceButtonForegroundStyle',
      repeatAction: 'backspace',
      size: { width: isLandscape ? '127/667' : '60/375' },
    },
    symbolbackspaceButtonForegroundStyle: {
      buttonStyleType: 'systemImage',
      center: { y: 0.53 },
      fontSize: 17,
      highlightColor: foregroundColor,
      normalColor: foregroundColor,
      systemImageName: 'delete.left',
    },
    ButtonScaleAnimation: {
      animationType: 'scale',
      isAutoReverse: true,
      pressDuration: 60,
      releaseDuration: 80,
      scale: 0.87,
    },
    ...(isPlainObject(dataSource) ? structuredClone(dataSource) : {}),
  };
}

function buildPanelNativeKeyboardPayload(project, themeName, keyboardName) {
  if (resolveKeyboardKind(keyboardName) !== 'panel') return null;
  const themeColors = project.theme?.[themeName]?.colors || {};
  const sharedFontSize = project.theme?.shared?.fontSize || {};
  const sharedCenter = project.theme?.shared?.center || {};
  const orientation = resolveOrientation(keyboardName);
  const panelFrame = project.keyboardFrame?.panel || {};
  const textMap = project.keyboards?.panel?.text || {};
  const foregroundColor = themeColors['按键前景颜色'] || (themeName === 'dark' ? '#FFFFFF' : '#000000');
  const normalColor = themeColors['字母键背景颜色-普通'] || (themeName === 'dark' ? '#3b3f46' : '#FFFFFF');
  const highlightColor = themeColors['字母键背景颜色-高亮'] || (themeName === 'dark' ? '#505762' : '#ABB0BA');
  const lowerEdge = themeColors['底边缘颜色-普通'] || (themeName === 'dark' ? '#2b2d31' : '#88898D');
  const payload = {
    floatTargetScale: panelFrame.floatTargetScale?.[orientation] || panelFrame.floatTargetScale?.portrait || (orientation === 'landscape' ? { x: 0.58, y: 0.72 } : { x: 0.8, y: 0.6 }),
    keyboardLayout: PANEL_BUTTONS.map((row) => ({
      HStack: {
        spacing: 3,
        subviews: row.map((buttonName) => ({ Cell: buttonName })),
      },
    })),
    keyboardStyle: {
      backgroundStyle: 'keyboardBackgroundStyle',
      insets: project.keyStyles?.buttonInsets?.panel?.frame || { top: 15, left: 15, bottom: 15, right: 15 },
    },
    keyboardBackgroundStyle: {
      buttonStyleType: 'geometry',
      cornerRadius: panelFrame.cornerRadius ?? 15,
      normalColor: themeColors['键盘背景颜色'] || '#E1E2E7',
    },
    ButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      cornerRadius: project.keyStyles?.surfaceStyles?.panel?.normal?.cornerRadius ?? 7,
      highlightColor,
      highlightLowerEdgeColor: themeColors['底边缘颜色-高亮'] || lowerEdge,
      insets: project.keyStyles?.buttonInsets?.panel?.normal || { top: 5, left: 3, bottom: 5, right: 3 },
      normalColor,
      normalLowerEdgeColor: lowerEdge,
    },
    ButtonScaleAnimation: {
      animationType: 'scale',
      isAutoReverse: true,
      pressDuration: 60,
      releaseDuration: 80,
      scale: 0.87,
    },
    animation: ['ButtonScaleAnimation'],
  };
  for (const [buttonName, config] of Object.entries(PANEL_BUTTON_CONFIG)) {
    const editorKey = buttonName.replace(/Button$/, '');
    const panelConfig = project.keyboards?.panel || {};
    const actionOverride = normalizeActionObject(panelConfig.keyActions?.[editorKey]);
    payload[buttonName] = {
      action: structuredClone(config.action),
      backgroundStyle: 'ButtonBackgroundStyle',
      foregroundStyle: [`${buttonName}ForegroundStyle`, `${buttonName}ForegroundStyle2`],
      size: { height: '1/4' },
    };
    if (panelConfig.keyEditorModes?.[editorKey] === 'character') {
      const actionType = panelConfig.keyTypes?.[editorKey] === 'symbol' ? 'symbol' : 'character';
      const trigger = Object.prototype.hasOwnProperty.call(panelConfig.keyTriggers || {}, editorKey)
        ? panelConfig.keyTriggers[editorKey]
        : editorKey;
      payload[buttonName].action = { [actionType]: String(trigger) };
    } else if (Object.keys(actionOverride).length) {
      payload[buttonName].action = actionOverride;
    }
    payload[`${buttonName}ForegroundStyle`] = {
      buttonStyleType: 'systemImage',
      center: sharedCenter['panel键盘按键sf符号前景偏移'] || { y: 0.4 },
      fontSize: sharedFontSize['panel按键前景sf符号大小'] || 16,
      highlightColor: foregroundColor,
      normalColor: foregroundColor,
      systemImageName: config.systemImageName,
    };
    const displayType = panelConfig.keyDisplayTypes?.[editorKey] || 'text';
    const hasDisplay = Object.prototype.hasOwnProperty.call(panelConfig.keyDisplays || {}, editorKey);
    const displayValue = hasDisplay ? panelConfig.keyDisplays[editorKey] : (textMap[config.textKey] || config.text);
    const displayText = displayType === 'systemImageName' ? (textMap[config.textKey] || config.text) : displayValue;
    if (displayType === 'systemImageName') {
      payload[`${buttonName}ForegroundStyle`].systemImageName = displayValue;
    }
    payload[`${buttonName}ForegroundStyle2`] = {
      buttonStyleType: 'text',
      center: sharedCenter['panel键盘按键文字前景偏移'] || { y: 0.7 },
      fontSize: sharedFontSize['panel按键前景文字大小'] || 12,
      highlightColor: foregroundColor,
      normalColor: foregroundColor,
      text: displayText,
    };
  }
  return payload;
}

function pinyinProjectLetterCase(project = {}) {
  return project.guide?.preferences?.pinyin26LetterCase === 'upper' ? 'upper' : 'lower';
}

function applyPinyinProjectLetterCase(project = {}, label = '') {
  const text = String(label);
  return pinyinProjectLetterCase(project) === 'upper' ? text.toUpperCase() : text.toLowerCase();
}

function pinyinVariantBaseLabel(project, key) {
  if (!key) return '';
  if (/^[a-z]{1,2}$/.test(key)) return applyPinyinProjectLetterCase(project, key);
  return '';
}

function actionDisplayText(action) {
  if (typeof action === 'string') return '';
  if (!isPlainObject(action)) return '';
  return action.character || action.symbol || '';
}

function buildConfigPayload(project, allowedKeyboardNames = null) {
  const config = JSON.parse(JSON.stringify(project.config || {}));
  for (const group of Object.values(config)) {
    if (!isPlainObject(group)) continue;
    for (const device of Object.values(group)) {
      if (!isPlainObject(device)) continue;
      for (const [orientation, keyboardName] of Object.entries(device)) {
        if (allowedKeyboardNames && !allowedKeyboardNames.has(keyboardName)) {
          delete device[orientation];
        }
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
    author: project.meta.author,
    name: project.meta.name,
  };
}

export function buildSkinEffectFileEntries(project) {
  const keyboardNames = new Set(collectMappedKeyboardNames(project));
  const entries = [
    { path: 'config.yaml', value: pruneEmptyPlainObjects(buildConfigPayload(project, keyboardNames)) },
  ];

  for (const themeName of ['light', 'dark']) {
    for (const keyboardName of keyboardNames) {
      if (isSystemKeyboardName(keyboardName)) continue;
      const payload = buildEffectiveNativeKeyboardPayload(project, themeName, keyboardName)
        || buildFallbackKeyboardPayload(project, themeName, keyboardName);
      if (!payload) continue;
      entries.push({
        path: `${themeName}/${keyboardName}.yaml`,
        value: pruneEmptyPlainObjects(payload),
      });
    }
  }

  entries.push({
    path: 'resources/asset-manifest.yaml',
    value: pruneEmptyPlainObjects({
      images: project.assets.images,
      resources: project.assets.resources,
    }),
  });

  return entries;
}

function nativePresetForProject(project = {}) {
  const variant = project.keyboardCombo?.slots?.pinyin?.variant || '26';
  const preset = `ios-${variant}`;
  return NATIVE_KEYBOARD_PRESET_PAYLOADS[preset] ? preset : DEFAULT_NATIVE_PAYLOAD_PRESET;
}

function nativePresetForKeyboardName(project = {}, keyboardName = '') {
  const pinyinVariantMatch = String(keyboardName).match(/^pinyin_(9|14|17|18|26)_/);
  if (pinyinVariantMatch) {
    const preset = `ios-${pinyinVariantMatch[1]}`;
    if (NATIVE_KEYBOARD_PRESET_PAYLOADS[preset]) return preset;
  }
  return nativePresetForProject(project);
}

function nativePayloadSourceName(keyboardName) {
  if (keyboardName === 'numeric_ios_portrait') return 'numeric_9_portrait';
  if (keyboardName === 'numeric_ios_landscape') return 'numeric_9_landscape';
  if (keyboardName === 'alphabetic_26_portrait') return 'pinyin_26_portrait';
  if (keyboardName === 'alphabetic_26_landscape') return 'pinyin_26_landscape';
  return keyboardName;
}

export function buildEffectiveNativeKeyboardPayload(project, themeName, keyboardName) {
  const preset = nativePresetForKeyboardName(project, keyboardName);
  const sourceName = nativePayloadSourceName(keyboardName);
  const presetPayload = NATIVE_KEYBOARD_PRESET_PAYLOADS[preset]?.[themeName]?.[sourceName];
  const defaultPresetPayload = preset === DEFAULT_NATIVE_PAYLOAD_PRESET
    ? null
    : NATIVE_KEYBOARD_PRESET_PAYLOADS[DEFAULT_NATIVE_PAYLOAD_PRESET]?.[themeName]?.[sourceName];
  const projectPayload = project.nativeKeyboardPayloads?.[themeName]?.[keyboardName]
    || project.nativeKeyboardPayloads?.[themeName]?.[sourceName];
  const seedPayload = isPlainObject(presetPayload) ? presetPayload : defaultPresetPayload;
  const generatedPayload = isPlainObject(seedPayload)
    ? null
    : buildSymbolicNativeKeyboardPayload(project, themeName, keyboardName)
      || buildPanelNativeKeyboardPayload(project, themeName, keyboardName);
  const mergedPayload = structuredClone(isPlainObject(seedPayload) ? seedPayload : generatedPayload || {});
  if (isPlainObject(projectPayload)) mergePlainObjectPatch(mergedPayload, projectPayload);
  return Object.keys(mergedPayload).length ? sanitizeNativePayload(mergedPayload, project, themeName, keyboardName) : null;
}

function sanitizeNativePayload(payload, project, themeName, keyboardName) {
  const themeColors = project.theme?.[themeName]?.colors || {};
  const sharedFontSize = project.theme?.shared?.fontSize || {};
  const sharedCenter = project.theme?.shared?.center || {};
  const availableResourceFiles = availableResourceFilesForProject(project);
  const customCenters = project.theme?.shared?.customCenters || {};
  const keyDisplays = project.keyboards?.keyboard26?.keyDisplays || {};
  const keyActions = project.keyboards?.keyboard26?.keyActions || {};
  const keyTriggers = project.keyboards?.keyboard26?.keyTriggers || {};
  const numericConfig = project.keyboards?.numeric || {};
  const symbolicConfig = project.keyboards?.symbolic || {};
  const keyTextColor = themeColors['按键前景颜色'] || (themeName === 'dark' ? '#FFFFFF' : '#000000');
  const swipeTextColor = themeColors['划动字符颜色'] || (themeName === 'dark' ? '#b6b7b9' : '#838383ff');
  const toolbarTextColor = themeColors['toolbar按键颜色'] || (themeName === 'dark' ? '#e5e5e5' : '#4a4a4a');
  const orientationFrame = project.keyboardFrame?.[keyboardName.includes('landscape') ? 'landscape' : 'portrait'];
  if (isPlainObject(orientationFrame)) {
    for (const frameKey of ['preeditHeight', 'toolbarHeight', 'keyboardHeight']) {
      if (Number.isFinite(Number(orientationFrame[frameKey]))) payload[frameKey] = Number(orientationFrame[frameKey]);
    }
  }
  const normalizeContainerColor = (value, fallback = '#00000001') => {
    const input = String(value || fallback);
    return /^#?[0-9a-fA-F]{6}00$/.test(input) ? `${input.slice(0, -2)}01` : input;
  };
  const syncChineseEnglishToggleButton = (buttonName) => {
    const button = payload[buttonName];
    const style = payload[`${buttonName}ForegroundStyle`];
    if (!isPlainObject(button) || !isPlainObject(style)) return false;
    const cnenLabel = keyboardName.startsWith('alphabetic_')
      ? (keyDisplays['alphabetic.cnen'] || keyDisplays['english.cnen'] || '英')
      : (keyDisplays.cnen || '中');
    const normalizedAction = normalizeActionObject(keyActions.cnen || { shortcut: '#中英切换' });
    button.action = Object.keys(normalizedAction).length ? normalizedAction : { shortcut: '#中英切换' };
    button.foregroundStyle = `${buttonName}ForegroundStyle`;
    button.backgroundStyle = button.backgroundStyle || 'systemButtonBackgroundStyle';
    button.hintStyle = button.hintStyle || `${buttonName}HintStyle`;
    style.buttonStyleType = 'text';
    delete style.systemImageName;
    style.text = cnenLabel;
    applyTextStyle(style, {
      fontSize: sharedFontSize['功能键前景文字大小'],
      center: sharedCenter['功能键前景文字偏移'],
      normalColor: keyTextColor,
      highlightColor: keyTextColor,
    });
    return true;
  };
  const ensureBottomRowChineseEnglishToggle = () => {
    if (keyboardName !== 'pinyin_26_portrait' && keyboardName !== 'alphabetic_26_portrait') return;
    const rows = payload?.keyboardLayout;
    if (!Array.isArray(rows) || !rows.length) return;
    const lastRow = rows[rows.length - 1];
    const subviews = lastRow?.HStack?.subviews;
    if (!Array.isArray(subviews) || subviews.length < 5) return;
    const symbolButton = payload.symbolButton;
    const symbolForeground = payload.symbolButtonForegroundStyle;
    if (!payload.cnenButton) {
      payload.cnenButton = structuredClone(isPlainObject(symbolButton) ? symbolButton : {});
      if (!payload.cnenButton.size) payload.cnenButton.size = { width: { percentage: 0.1 } };
    }
    if (!payload.cnenButtonForegroundStyle) {
      payload.cnenButtonForegroundStyle = structuredClone(isPlainObject(symbolForeground) ? symbolForeground : {
        buttonStyleType: 'text',
      });
    }
    syncChineseEnglishToggleButton('cnenButton');
    lastRow.HStack.subviews = [
      { Cell: '123Button' },
      { Cell: 'cnenButton' },
      { Cell: 'spaceButton' },
      { Cell: 'spaceRightButton' },
      { Cell: 'enterButton' },
    ];
  };
  const ensureShiftHintSymbols = () => {
    if (!isPlainObject(payload.shiftButton)) return;
    payload.shiftButton.hintSymbolsStyle = 'shiftButtonHintSymbolsStyle';
    payload.shiftButtonHintSymbolsStyle = payload.shiftButtonHintSymbolsStyle || {
      backgroundStyle: 'alphabeticHintSymbolsBackgroundStyle',
      selectedBackgroundStyle: 'alphabeticHintSymbolsSelectedStyle',
      selectedIndex: 0,
      symbolStyles: ['shiftButtonHintSymbol0'],
    };
    payload.shiftButtonHintSymbol0 = payload.shiftButtonHintSymbol0 || {
      action: 'shift',
      foregroundStyle: 'shiftButtonHintSymbol0ForegroundStyle',
    };
    payload.shiftButtonHintSymbol0ForegroundStyle = payload.shiftButtonHintSymbol0ForegroundStyle || {
      buttonStyleType: 'systemImage',
      fontSize: sharedFontSize['按键前景sf符号大小'] || 18,
      normalColor: keyTextColor,
      highlightColor: keyTextColor,
      systemImageName: 'shift.fill',
    };
  };
  const ensureToolbarButtons = () => {
    const toolbarMap = {
      menu: 'toolbarMenuButton',
      symbol: 'toolbarSymbolButton',
      translate: 'toolbarTranslateButton',
      emoji: 'toolbarEmojiButton',
      phrase: 'toolbarPhraseButton',
      pasteboard: 'toolbarPasteboardButton',
      script: 'toolbarScriptButton',
      simp2tran: 'toolbarSimp2tranButton',
      close: 'toolbarCloseButton',
    };
    const layout = Array.isArray(project.toolbar?.layout) ? project.toolbar.layout : [];
    if (!layout.length) return;
    payload.toolbarLayout = [{
      HStack: {
        subviews: layout
          .map((key) => toolbarMap[key])
          .filter(Boolean)
          .map((buttonName) => ({ Cell: buttonName })),
      },
    }];
    for (const [toolbarKey, buttonName] of Object.entries(toolbarMap)) {
      if (!layout.includes(toolbarKey)) continue;
      payload[buttonName] = payload[buttonName] || {
        backgroundStyle: 'toolbarButtonBackgroundStyle',
      };
      payload[buttonName].backgroundStyle = 'toolbarButtonBackgroundStyle';
      payload[buttonName].foregroundStyle = `${buttonName}ForegroundStyle`;
      delete payload[buttonName].size;
      delete payload[buttonName].bounds;
      const configuredAction = project.toolbar?.actions?.[toolbarKey];
      if (toolbarKey === 'close' && normalizeActionObject(configuredAction)?.action === 'dismissKeyboard') {
        payload[buttonName].action = 'dismissKeyboard';
      } else if (isPlainObject(configuredAction)) {
        payload[buttonName].action = structuredClone(configuredAction);
      } else if (toolbarKey === 'close') {
        payload[buttonName].action = 'dismissKeyboard';
      }
      const display = project.toolbar?.display?.[toolbarKey] || {};
      const style = payload[`${buttonName}ForegroundStyle`] || {};
      if (display.type === 'systemImageName' && display.systemImageName) {
        payload[`${buttonName}ForegroundStyle`] = {
          ...style,
          buttonStyleType: 'systemImage',
          center: customCenters.toolbar?.[toolbarKey] || sharedCenter['toolbar按键偏移'] || style.center,
          fontSize: project.toolbar?.iconFontSize || sharedFontSize['toolbar按键前景sf符号大小'] || style.fontSize,
          highlightColor: toolbarTextColor,
          normalColor: toolbarTextColor,
          systemImageName: display.systemImageName,
        };
        delete payload[`${buttonName}ForegroundStyle`].text;
      } else {
        const text = display.text || project.toolbar?.text?.[toolbarKey] || style.text || '';
        payload[`${buttonName}ForegroundStyle`] = {
          ...style,
          buttonStyleType: 'text',
          center: customCenters.toolbar?.[toolbarKey] || sharedCenter['toolbar按键偏移'] || style.center,
          fontSize: sharedFontSize['toolbar按键前景文字大小'] || style.fontSize,
          fontWeight: style.fontWeight || 'medium',
          highlightColor: toolbarTextColor,
          normalColor: toolbarTextColor,
          text,
        };
        delete payload[`${buttonName}ForegroundStyle`].systemImageName;
      }
    }
  };
  const normalizeToolbarContainerStyle = () => {
    if (!/^(pinyin|alphabetic|numeric)_/.test(keyboardName)) return;
    payload.toolbarStyle = payload.toolbarStyle && isPlainObject(payload.toolbarStyle) ? payload.toolbarStyle : {};
    payload.toolbarStyle.backgroundStyle = payload.toolbarStyle.backgroundStyle || 'toolbarBackgroundStyle';
    const toolbarInsets = project.keyStyles?.buttonInsets?.toolbar?.menu;
    if (isPlainObject(toolbarInsets)) {
      payload.toolbarStyle.insets = structuredClone(toolbarInsets);
    }
  };
  const stripSchemaNameOnSpaceWhenDisabled = () => {
    if (project.keyboardCombo?.spaceRow?.showSchemaNameOnSpace !== false) return;
    const spaceButton = payload.spaceButton;
    if (isPlainObject(spaceButton)) {
      if (Array.isArray(spaceButton.foregroundStyle)) {
        spaceButton.foregroundStyle = spaceButton.foregroundStyle.filter((styleName) => {
          const style = typeof styleName === 'string' ? payload[styleName] : null;
          return styleName !== 'spaceButtonForegroundStyle2'
            && !/RimeSchema/i.test(String(styleName))
            && String(style?.text || '') !== '$rimeSchemaName';
        });
      } else if (spaceButton.foregroundStyle === 'spaceButtonForegroundStyle2') {
        delete spaceButton.foregroundStyle;
      }
    }
    delete payload.spaceButtonForegroundStyle2;
    delete payload.spaceButtonRimeSchemaForegroundStyle;
  };
  const applySwipeActions = () => {
    const kind = resolveKeyboardKind(keyboardName);
    const swipeData = swipesFor(project, kind, keyboardName);
    const buttonNameForSwipeKey = (keyId) => {
      if (kind === 'numeric' && /^[0-9]$/.test(keyId)) return `number${keyId}Button`;
      return `${keyId}Button`;
    };
    const fallbackSwipeStyle = (direction) => ({
      buttonStyleType: 'text',
      center: sharedCenter[direction === 'swipe_up' ? '数字键盘上划文字偏移' : '数字键盘下划文字偏移'],
      fontSize: sharedFontSize[direction === 'swipe_up' ? '上划文字大小' : '下划文字大小'],
      normalColor: swipeTextColor,
      highlightColor: swipeTextColor,
      text: '',
    });
    const applyDirection = (direction, actionKey, styleSuffix) => {
      const entries = swipeData?.[direction] || {};
      for (const [keyId, entry] of Object.entries(entries)) {
        if (!isPlainObject(entry)) continue;
        const buttonName = buttonNameForSwipeKey(keyId);
        if (!isPlainObject(payload[buttonName])) continue;
        const normalizedAction = normalizeActionObject(entry.action);
        if (Object.keys(normalizedAction).length) payload[buttonName][actionKey] = normalizedAction;
        const styleName = `${buttonName}${styleSuffix}`;
        if (!isPlainObject(payload[styleName]) && kind === 'numeric') payload[styleName] = fallbackSwipeStyle(direction);
        const labelText = String(entry.label?.text || '').trim();
        if (labelText && isPlainObject(payload[styleName])) payload[styleName].text = labelText;
        if (isPlainObject(payload[styleName])) {
          if (Array.isArray(payload[buttonName].foregroundStyle)) {
            if (!payload[buttonName].foregroundStyle.includes(styleName)) payload[buttonName].foregroundStyle.push(styleName);
          } else if (payload[buttonName].foregroundStyle) {
            payload[buttonName].foregroundStyle = [payload[buttonName].foregroundStyle, styleName];
          } else {
            payload[buttonName].foregroundStyle = [styleName];
          }
        }
      }
    };
    applyDirection('swipe_up', 'swipeUpAction', 'SwipeUpForegroundStyle');
    applyDirection('swipe_down', 'swipeDownAction', 'SwipeDownForegroundStyle');
  };
  const applySpaceRightProfile = () => {
    const kind = resolveKeyboardKind(keyboardName);
    if (kind !== 'pinyin' && kind !== 'alphabetic') return;
    const profile = kind === 'alphabetic' ? 'alphabetic' : 'pinyin';
    const config = project.keyboards?.keyboard26?.spaceRight?.[profile];
    if (!isPlainObject(config) || !isPlainObject(payload.spaceRightButton)) return;
    const primaryText = String(config.primary?.text || '').trim();
    const secondaryText = String(config.secondary?.text || '').trim();
    if (primaryText) {
      payload.spaceRightButton.action = { character: primaryText };
      if (isPlainObject(payload.spaceRightButtonForegroundStyle)) {
        payload.spaceRightButtonForegroundStyle.text = primaryText;
        if (config.primary?.center) payload.spaceRightButtonForegroundStyle.center = structuredClone(config.primary.center);
      }
    }
    if (secondaryText) {
      if (!isPlainObject(payload.spaceRightButton.swipeUpAction)) {
        payload.spaceRightButton.swipeUpAction = profile === 'alphabetic' ? { symbol: secondaryText } : { character: secondaryText };
      }
      if (isPlainObject(payload.spaceRightButtonForegroundStyle2)) {
        payload.spaceRightButtonForegroundStyle2.text = secondaryText;
        if (config.secondary?.center) payload.spaceRightButtonForegroundStyle2.center = structuredClone(config.secondary.center);
      }
    }
  };
  const stripSwipeActionsWhenDisabled = () => {
    const kind = resolveKeyboardKind(keyboardName);
    const swipeData = swipesFor(project, kind, keyboardName);
    const hasSwipeUp = Object.keys(swipeData?.swipe_up || {}).length > 0;
    const hasSwipeDown = Object.keys(swipeData?.swipe_down || {}).length > 0;
    if (hasSwipeUp && hasSwipeDown) return;
    const isSwipeStyleRef = (item, direction) => {
      const text = String(item);
      if (direction === 'up') return /(?:SwipeUp|UpSwipe|UpSwipeFg|UpForegroundStyle)$/i.test(text);
      return /(?:SwipeDown|DownSwipe|DownSwipeFg|DownForegroundStyle)$/i.test(text);
    };
    for (const [key, value] of Object.entries(payload)) {
      if (!/Button$/.test(key) || !isPlainObject(value)) continue;
      if (!hasSwipeUp) delete value.swipeUpAction;
      if (!hasSwipeDown) delete value.swipeDownAction;
      if (Array.isArray(value.foregroundStyle)) {
        value.foregroundStyle = value.foregroundStyle.filter((item) => {
          if (hasSwipeUp === false && isSwipeStyleRef(item, 'up')) return false;
          if (hasSwipeDown === false && isSwipeStyleRef(item, 'down')) return false;
          if (hasSwipeUp === false && key === 'spaceRightButton' && item === 'spaceRightButtonForegroundStyle2') return false;
          return true;
        });
      }
      if (Array.isArray(value.uppercasedStateForegroundStyle)) {
        value.uppercasedStateForegroundStyle = value.uppercasedStateForegroundStyle.filter((item) => {
          if (hasSwipeUp === false && isSwipeStyleRef(item, 'up')) return false;
          if (hasSwipeDown === false && isSwipeStyleRef(item, 'down')) return false;
          return true;
        });
      }
      if (Array.isArray(value.capsLockedStateForegroundStyle)) {
        value.capsLockedStateForegroundStyle = value.capsLockedStateForegroundStyle.filter((item) => {
          if (hasSwipeUp === false && isSwipeStyleRef(item, 'up')) return false;
          if (hasSwipeDown === false && isSwipeStyleRef(item, 'down')) return false;
          return true;
        });
      }
    }
  };
  const stripPinyinVariantInteractionDecorations = () => {
    if (!/^pinyin_(14|17|18)_/.test(keyboardName)) return;
    for (const key of Object.keys(payload)) {
      if (/Notification$/i.test(key)) delete payload[key];
      if (/Hint|KeyboardAction/i.test(key)) delete payload[key];
      if (/(?:SwipeUp|SwipeDown|UpSwipe|DownSwipe|UpSwipeFg|DownSwipeFg|UpForegroundStyle|DownForegroundStyle)/i.test(key)) delete payload[key];
    }
    for (const [buttonName, button] of Object.entries(payload)) {
      if (!/Button$/.test(buttonName) || !isPlainObject(button)) continue;
      delete button.notification;
      delete button.animation;
      delete button.hintStyle;
      delete button.hintSymbolsStyle;
      delete button.uppercasedStateAction;
      delete button.uppercasedStateForegroundStyle;
      delete button.capsLockedStateForegroundStyle;
      delete button.preeditStateAction;
      delete button.preeditStateForegroundStyle;
      if (Array.isArray(button.foregroundStyle)) {
        const primaryRefs = button.foregroundStyle.filter((styleName) => {
          if (typeof styleName !== 'string') return false;
          if (/(?:SwipeUp|SwipeDown|UpSwipe|DownSwipe|UpSwipeFg|DownSwipeFg|UpForegroundStyle|DownForegroundStyle)$/i.test(styleName)) return false;
          if (/ForegroundStyle[TF]$/i.test(styleName)) return false;
          if (/RimeSchema/i.test(styleName)) return false;
          return true;
        });
        if (primaryRefs.length) button.foregroundStyle = primaryRefs.slice(0, 1);
        else delete button.foregroundStyle;
      }
    }
  };
  const preserveKeyboard26LegacySwipeReferences = () => {
    if (!/^pinyin_26_|^alphabetic_26_/.test(keyboardName)) return;
    for (const [buttonName, button] of Object.entries(payload)) {
      if (!/^[a-z]Button$/.test(buttonName) || !isPlainObject(button)) continue;
      for (const refKey of ['foregroundStyle', 'uppercasedStateForegroundStyle', 'capsLockedStateForegroundStyle']) {
        if (!Array.isArray(button[refKey])) continue;
        button[refKey] = button[refKey].filter((item) => (
          item !== `${buttonName}SwipeUpForegroundStyle`
          && item !== `${buttonName}SwipeDownForegroundStyle`
        ));
      }
    }
  };
  const applyKeyboard26Metrics = () => {
    if (!keyboardName.startsWith('pinyin_26_') && !keyboardName.startsWith('alphabetic_26_')) return;
    const orientation = keyboardName.includes('landscape') ? 'landscape' : 'portrait';
    const metrics = project.keyboards?.keyboard26?.metrics?.[orientation];
    if (!isPlainObject(metrics)) return;
    const metricKeyToButtonName = {
      '123': '123Button',
      cnen: 'cnenButton',
      symbol: 'symbolButton',
      space: 'spaceButton',
      spaceRight: 'spaceRightButton',
      enter: 'enterButton',
      shift: 'shiftButton',
      backspace: 'backspaceButton',
    };
    for (const [metricKey, metricValue] of Object.entries(metrics)) {
      if (!isPlainObject(metricValue) || metricKey === 'normal') continue;
      const buttonName = metricKeyToButtonName[metricKey] || `${metricKey}Button`;
      if (!isPlainObject(payload[buttonName])) continue;
      if (metricValue.width !== undefined) {
        payload[buttonName].size = payload[buttonName].size || {};
        payload[buttonName].size.width = structuredClone(metricValue.width);
      }
      if (metricValue.bounds !== undefined) {
        payload[buttonName].bounds = structuredClone(metricValue.bounds);
      }
    }
  };
  const reorderTopLevelKeys = (object, keysToMove, beforeKey) => {
    if (!isPlainObject(object)) return object;
    const entries = Object.entries(object);
    const moved = [];
    const kept = [];
    for (const [key, value] of entries) {
      if (keysToMove.includes(key)) moved.push([key, value]);
      else kept.push([key, value]);
    }
    if (!moved.length) return object;
    const next = {};
    let inserted = false;
    for (const [key, value] of kept) {
      if (!inserted && key === beforeKey) {
        for (const [movedKey, movedValue] of moved) next[movedKey] = movedValue;
        inserted = true;
      }
      next[key] = value;
    }
    if (!inserted) {
      for (const [movedKey, movedValue] of moved) next[movedKey] = movedValue;
    }
    return next;
  };
  for (const styleName of ['keyboardBackgroundStyle', 'toolbarBackgroundStyle', 'preeditBackgroundStyle', 'verticalCandidateBackgroundStyle']) {
    const style = payload?.[styleName];
    const fileName = style?.normalImage?.file;
    if (!fileName || availableResourceFiles.has(normalizeResourceFileName(fileName))) continue;
    payload[styleName] = {
      buttonStyleType: 'geometry',
      normalColor: normalizeContainerColor(themeColors['键盘背景颜色'], '#00000001'),
    };
  }
  for (const styleName of ['keyboardBackgroundStyle', 'toolbarBackgroundStyle', 'preeditBackgroundStyle', 'verticalCandidateBackgroundStyle']) {
    const style = payload?.[styleName];
    if (!isPlainObject(style)) continue;
    if (style.normalColor !== undefined) {
      const themedBackground = themeColors['键盘背景颜色'];
      const currentColor = String(style.normalColor || '');
      if (themedBackground && /^#?[0-9a-fA-F]{6}0[01]$/.test(currentColor)) {
        style.normalColor = normalizeContainerColor(themedBackground, '#00000001');
      } else {
        style.normalColor = normalizeContainerColor(style.normalColor, themedBackground || '#00000001');
      }
    }
  }
  if ((keyboardName.startsWith('pinyin_') || keyboardName.startsWith('alphabetic_'))
    && isPlainObject(project.keyStyles?.buttonInsets?.keyboard26?.container)) {
    payload.keyboardStyle = payload.keyboardStyle && isPlainObject(payload.keyboardStyle) ? payload.keyboardStyle : {};
    payload.keyboardStyle.insets = structuredClone(project.keyStyles.buttonInsets.keyboard26.container);
  }

  for (const [buttonName, button] of Object.entries(payload)) {
    if (!/^[a-z]Button$/.test(buttonName) || !isPlainObject(button)) continue;
    const swipeUpAlias = `${buttonName}SwipeUpForegroundStyle`;
    const swipeDownAlias = `${buttonName}SwipeDownForegroundStyle`;
    const legacySwipeUpStyle = payload[`${buttonName}UpForegroundStyle`];
    const legacySwipeDownStyle = payload[`${buttonName}DownForegroundStyle`];
    const shouldRewriteLegacySwipeRefs = !/^pinyin_26_|^alphabetic_26_/.test(keyboardName);
    if (shouldRewriteLegacySwipeRefs && legacySwipeUpStyle && !payload[swipeUpAlias]) {
      payload[swipeUpAlias] = structuredClone(legacySwipeUpStyle);
    }
    if (shouldRewriteLegacySwipeRefs && legacySwipeDownStyle && !payload[swipeDownAlias]) {
      payload[swipeDownAlias] = structuredClone(legacySwipeDownStyle);
    }
    if (shouldRewriteLegacySwipeRefs && Array.isArray(button.foregroundStyle)) {
      button.foregroundStyle = [
        ...button.foregroundStyle.map((item) => item === `${buttonName}UpForegroundStyle` ? swipeUpAlias : item === `${buttonName}DownForegroundStyle` ? swipeDownAlias : item),
      ];
    }
    if (Array.isArray(button.uppercasedStateForegroundStyle)
      && !button.uppercasedStateForegroundStyle.includes(`${buttonName}UppercasedForegroundStyle`)) {
      button.uppercasedStateForegroundStyle = [
        `${buttonName}UppercasedForegroundStyle`,
        ...button.uppercasedStateForegroundStyle.filter((item) => item !== `${buttonName}UppercasedForegroundStyle`),
      ];
    }
    if (shouldRewriteLegacySwipeRefs && Array.isArray(button.uppercasedStateForegroundStyle)) {
      button.uppercasedStateForegroundStyle = button.uppercasedStateForegroundStyle.map((item) => (
        item === `${buttonName}UpForegroundStyle` ? swipeUpAlias
          : item === `${buttonName}DownForegroundStyle` ? swipeDownAlias
            : item
      ));
    }
    if (Array.isArray(button.capsLockedStateForegroundStyle)
      && !button.capsLockedStateForegroundStyle.includes(`${buttonName}UppercasedForegroundStyle`)) {
      button.capsLockedStateForegroundStyle = [
        `${buttonName}UppercasedForegroundStyle`,
        ...button.capsLockedStateForegroundStyle.filter((item) => item !== `${buttonName}UppercasedForegroundStyle`),
      ];
    }
    if (shouldRewriteLegacySwipeRefs && Array.isArray(button.capsLockedStateForegroundStyle)) {
      button.capsLockedStateForegroundStyle = button.capsLockedStateForegroundStyle.map((item) => (
        item === `${buttonName}UpForegroundStyle` ? swipeUpAlias
          : item === `${buttonName}DownForegroundStyle` ? swipeDownAlias
            : item
      ));
    }
    const legacyUppercasedStyle = payload[`${buttonName}UppercasedStateForegroundStyle`];
    if (legacyUppercasedStyle && !payload[`${buttonName}UppercasedForegroundStyle`]) {
      payload[`${buttonName}UppercasedForegroundStyle`] = structuredClone(legacyUppercasedStyle);
    }
    if (keyboardName.startsWith('alphabetic_26_') && isPlainObject(button.action) && button.action.character !== undefined) {
      button.action = { symbol: String(button.action.character) };
    }
    if (/^pinyin_26_|^alphabetic_26_/.test(keyboardName)) {
      for (const refKey of ['uppercasedStateForegroundStyle', 'capsLockedStateForegroundStyle']) {
        if (!Array.isArray(button[refKey])) continue;
        const upperRef = `${buttonName}UppercasedForegroundStyle`;
        const legacyRef = `${buttonName}UppercasedStateForegroundStyle`;
        button[refKey] = button[refKey]
          .filter((item) => item !== legacyRef)
          .filter((item, index, items) => items.indexOf(item) === index);
        if (!button[refKey].includes(upperRef)) button[refKey].unshift(upperRef);
      }
    }
  }

  const applyTextStyle = (style, options = {}) => {
    if (!isPlainObject(style) || style.buttonStyleType !== 'text') return;
    if (options.fontSize !== undefined) style.fontSize = options.fontSize;
    if (options.center) style.center = { ...(style.center || {}), ...options.center };
    if (options.normalColor) style.normalColor = options.normalColor;
    if (options.highlightColor) style.highlightColor = options.highlightColor;
  };

  const applyImageStyle = (style, options = {}) => {
    if (!isPlainObject(style) || style.buttonStyleType !== 'systemImage') return;
    if (options.fontSize !== undefined) style.fontSize = options.fontSize;
    if (options.center) style.center = { ...(style.center || {}), ...options.center };
    if (options.normalColor) style.normalColor = options.normalColor;
    if (options.highlightColor) style.highlightColor = options.highlightColor;
  };
  const applySurfaceStyle = (style, surface = {}) => {
    if (!isPlainObject(style) || !isPlainObject(surface)) return;
    for (const key of ['cornerRadius', 'borderSize', 'shadowRadius', 'shadowOpacity']) {
      if (surface[key] !== undefined) style[key] = surface[key];
    }
    if (surface.shadowOffset !== undefined) style.shadowOffset = structuredClone(surface.shadowOffset);
  };
  const applyInsets = (style, insets = {}) => {
    if (!isPlainObject(style) || !isPlainObject(insets)) return;
    style.insets = structuredClone(insets);
  };
  const normalizeColorStrings = (value, parentKey = '') => {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        value[index] = normalizeColorStrings(value[index], parentKey);
      }
      return value;
    }
    if (!isPlainObject(value)) {
      if (typeof value === 'number' && value === 0 && /color$/i.test(parentKey)) {
        return '#00000000';
      }
      if (typeof value === 'string'
        && /color$/i.test(parentKey)
        && /^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value)) {
        return `#${value}`;
      }
      return value;
    }
    for (const [key, item] of Object.entries(value)) value[key] = normalizeColorStrings(item, key);
    return value;
  };
  const normalizeDecimalFractionStrings = (value) => {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) value[index] = normalizeDecimalFractionStrings(value[index]);
      return value;
    }
    if (!isPlainObject(value)) return decimalFractionToIntegerFraction(value);
    for (const [key, item] of Object.entries(value)) value[key] = normalizeDecimalFractionStrings(item);
    return value;
  };
  const normalizeLegacyStyleTypes = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) normalizeLegacyStyleTypes(item);
      return;
    }
    if (!isPlainObject(value)) return;
    if (value.buttonStyleType === undefined && value.type === 'original') {
      value.buttonStyleType = 'geometry';
      delete value.type;
    }
    for (const item of Object.values(value)) normalizeLegacyStyleTypes(item);
  };
  const inferMissingButtonStyleTypes = (value, parentKey = '') => {
    if (Array.isArray(value)) {
      for (const item of value) inferMissingButtonStyleTypes(item, parentKey);
      return;
    }
    if (!isPlainObject(value)) return;
    if (value.buttonStyleType === undefined) {
      if (value.normalImage || value.highlightImage || value.file) {
        value.buttonStyleType = 'fileImage';
      } else if (value.systemImageName) {
        value.buttonStyleType = 'systemImage';
      } else if (value.text !== undefined
        || /(?:Fg|ForegroundStyle|SFg(?:Of\d+)?)$/i.test(parentKey)
        || (/Foreground/i.test(parentKey) && (value.fontSize !== undefined || value.normalColor !== undefined))) {
        value.buttonStyleType = 'text';
      } else if (value.normalColor !== undefined
        || value.highlightColor !== undefined
        || value.cornerRadius !== undefined
        || value.borderSize !== undefined
        || value.shadowRadius !== undefined) {
        value.buttonStyleType = 'geometry';
      }
    }
    for (const [key, item] of Object.entries(value)) {
      if (key === 'normalImage' || key === 'highlightImage') continue;
      inferMissingButtonStyleTypes(item, key);
    }
  };
  const cleanImageStyleNodes = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) cleanImageStyleNodes(item);
      return;
    }
    if (!isPlainObject(value)) return;
    if (isPlainObject(value.normalImage)) delete value.normalImage.buttonStyleType;
    if (isPlainObject(value.highlightImage)) delete value.highlightImage.buttonStyleType;
    for (const item of Object.values(value)) cleanImageStyleNodes(item);
  };
  const fallbackTextForStyle = (styleName, button = null) => {
    const key = styleName
      .replace(/(?:Button)?(?:Swipe)?(?:Up|Down)?ForegroundStyle$/i, '')
      .replace(/(?:Up|Down)SwipeFg$/i, '')
      .replace(/Fg$/i, '');
    if (/Up(?:Swipe)?Fg$|SwipeUpForegroundStyle$/i.test(styleName)) return actionDisplayText(button?.swipeUpAction);
    if (/Down(?:Swipe)?Fg$|SwipeDownForegroundStyle$/i.test(styleName)) return actionDisplayText(button?.swipeDownAction);
    const known = {
      '123': '123',
      numeric: '123',
      symbol: '#+=',
      symbolic: '符',
      space: '空格',
      spaceRight: project.keyboards?.keyboard26?.spaceRight?.pinyin?.primary?.text || '，',
      comma: '，',
      period: '。',
      numperiod: '.',
      cnen: keyboardName.startsWith('alphabetic_')
        ? (keyDisplays['alphabetic.cnen'] || keyDisplays['english.cnen'] || '英')
        : (keyDisplays.cnen || '中'),
      alphabetic: keyboardName.startsWith('alphabetic_')
        ? (keyDisplays['alphabetic.cnen'] || keyDisplays['english.cnen'] || '英')
        : (keyDisplays.cnen || '中'),
      return: '返回',
      clear: '重输',
      reverseLookup: '换行',
    };
    if (known[key]) return known[key];
    const numberMatch = key.match(/^number([0-9])$/);
    if (numberMatch) return numberMatch[1];
    return pinyinVariantBaseLabel(project, key);
  };
  const fallbackForegroundStyle = (styleName, button = null) => {
    const isSwipeUp = /Up(?:Swipe)?Fg$|SwipeUpForegroundStyle$/i.test(styleName);
    const isSwipeDown = /Down(?:Swipe)?Fg$|SwipeDownForegroundStyle$/i.test(styleName);
    const isSwipe = isSwipeUp || isSwipeDown;
    return {
      buttonStyleType: 'text',
      center: isSwipe
        ? sharedCenter[isSwipeUp ? '上划文字偏移' : '下划文字偏移'] || { x: 0.5, y: isSwipeUp ? 0.18 : 0.84 }
        : sharedCenter['26键中文前景偏移'] || sharedCenter['按键前景文字偏移'] || { x: 0.5, y: 0.5 },
      fontSize: isSwipe ? sharedFontSize[isSwipeUp ? '上划文字大小' : '下划文字大小'] || 7 : sharedFontSize['按键前景文字大小'] || 14,
      highlightColor: isSwipe ? swipeTextColor : keyTextColor,
      normalColor: isSwipe ? swipeTextColor : keyTextColor,
      text: fallbackTextForStyle(styleName, button),
    };
  };
  const fallbackBackgroundStyle = (styleName) => ({
    buttonStyleType: 'geometry',
    cornerRadius: styleName === 'toolbarButtonBackgroundStyle' ? 7 : 8,
    highlightColor: '#00000001',
    normalColor: '#00000001',
  });
  const sharedFunctionBackgroundStyle = () => {
    const style = structuredClone(payload.systemButtonBackgroundStyle || payload.alphabeticBackgroundStyle || fallbackBackgroundStyle('systemButtonBackgroundStyle'));
    applySurfaceStyle(style, project.keyStyles?.surfaceStyles?.keyboard26?.functionKey);
    applyInsets(style, project.keyStyles?.buttonInsets?.keyboard26?.functionKey);
    style.normalColor = themeColors['功能键背景颜色-普通'] || style.normalColor;
    style.highlightColor = themeColors['功能键背景颜色-高亮'] || style.highlightColor;
    style.normalLowerEdgeColor = themeColors['底边缘颜色-普通'] || style.normalLowerEdgeColor;
    style.highlightLowerEdgeColor = themeColors['底边缘颜色-高亮'] || style.highlightLowerEdgeColor;
    style.borderColor = themeColors['按键边缘颜色'] || style.borderColor;
    return style;
  };
  const sharedCollectionBackgroundStyle = () => {
    const style = sharedFunctionBackgroundStyle();
    applyInsets(style, project.keyStyles?.buttonInsets?.keyboard26?.punctuationColumn || project.keyStyles?.buttonInsets?.keyboard26?.functionKey);
    return style;
  };
  const sharedKeyboardContainerBackgroundStyle = () => ({
    buttonStyleType: 'geometry',
    normalColor: normalizeContainerColor(themeColors['键盘背景颜色'], '#00000001'),
  });
  const setTextStyle = (styleName, text, options = {}) => {
    payload[styleName] = {
      ...(isPlainObject(payload[styleName]) ? payload[styleName] : {}),
      buttonStyleType: 'text',
      center: options.center || payload[styleName]?.center || { x: 0.5, y: 0.5 },
      fontSize: options.fontSize || payload[styleName]?.fontSize || sharedFontSize['按键前景文字大小'] || 14,
      highlightColor: options.highlightColor || payload[styleName]?.highlightColor || keyTextColor,
      normalColor: options.normalColor || payload[styleName]?.normalColor || keyTextColor,
      text,
    };
    delete payload[styleName].systemImageName;
    delete payload[styleName].assetImageName;
    delete payload[styleName].normalImage;
    delete payload[styleName].highlightImage;
  };
  const setSystemImageStyle = (styleName, systemImageName, options = {}) => {
    payload[styleName] = {
      ...(isPlainObject(payload[styleName]) ? payload[styleName] : {}),
      buttonStyleType: 'systemImage',
      systemImageName,
      center: options.center || payload[styleName]?.center || sharedCenter['toolbar按键sf符号偏移'] || { x: 0.5, y: 0.53 },
      fontSize: options.fontSize || payload[styleName]?.fontSize || sharedFontSize['toolbar按键前景sf符号大小'] || 16,
      highlightColor: options.highlightColor || payload[styleName]?.highlightColor || toolbarTextColor,
      normalColor: options.normalColor || payload[styleName]?.normalColor || toolbarTextColor,
    };
    delete payload[styleName].text;
    delete payload[styleName].assetImageName;
    delete payload[styleName].normalImage;
    delete payload[styleName].highlightImage;
  };
  const applyStandardKeyConfig = ({
    keyboardConfig = {},
    key,
    buttonName,
    styleName,
    defaultAction = {},
    defaultText = '',
    defaultMode = 'character',
    defaultType = 'character',
    defaultDisplayType = 'text',
    textOptions = {},
    applyWithoutConfig = true,
  }) => {
    const button = payload[buttonName];
    if (!isPlainObject(button)) return;
    const hasConfiguredKey = [
      keyboardConfig.keyEditorModes,
      keyboardConfig.keyActions,
      keyboardConfig.keyTypes,
      keyboardConfig.keyDisplays,
      keyboardConfig.keyDisplayTypes,
      keyboardConfig.text,
    ].some((collection) => Object.prototype.hasOwnProperty.call(collection || {}, key));
    if (!applyWithoutConfig && !hasConfiguredKey) return;
    const mode = keyboardConfig.keyEditorModes?.[key] || defaultMode;
    const actionOverride = normalizeActionObject(keyboardConfig.keyActions?.[key]);
    if (mode === 'function') {
      if (Object.keys(actionOverride).length) button.action = actionOverride;
      else if (Object.keys(defaultAction).length) button.action = structuredClone(defaultAction);
    } else {
      const actionType = keyboardConfig.keyTypes?.[key] || defaultType;
      button.action = { [actionType === 'symbol' ? 'symbol' : 'character']: String(key) };
    }
    const hasKeyDisplay = Object.prototype.hasOwnProperty.call(keyboardConfig.keyDisplays || {}, key);
    const hasTextDisplay = Object.prototype.hasOwnProperty.call(keyboardConfig.text || {}, key);
    const displayValue = hasKeyDisplay
      ? keyboardConfig.keyDisplays[key]
      : hasTextDisplay
        ? keyboardConfig.text[key]
        : (defaultText || String(key));
    if ((keyboardConfig.keyDisplayTypes?.[key] || defaultDisplayType) === 'systemImageName') {
      setSystemImageStyle(styleName, displayValue, {
        normalColor: keyTextColor,
        highlightColor: keyTextColor,
        ...textOptions,
      });
    } else {
      setTextStyle(styleName, displayValue, textOptions);
    }
    button.foregroundStyle = [styleName];
  };
  const normalizeCandidateBarStyle = () => {
    if (isPlainObject(payload.horizontalCandidates)) {
      payload.horizontalCandidates.candidateStyle = 'candidateStyle';
    }
    if (isPlainObject(payload.horizontalCandidatesStyle)) {
      payload.horizontalCandidatesStyle.backgroundStyle = 'toolbarBackgroundStyle';
    }
    payload.candidateStyle = {
      ...(isPlainObject(payload.candidateStyle) ? payload.candidateStyle : {}),
      commentColor: themeColors['候选字体未选中字体颜色'] || keyTextColor,
      commentFontSize: sharedFontSize['未展开comment字体大小'] || 12,
      highlightBackgroundColor: '#00000000',
      indexColor: themeColors['候选字体未选中字体颜色'] || keyTextColor,
      indexFontSize: sharedFontSize['未展开候选字体选中字体大小'] || 17,
      preferredBackgroundColor: themeColors['选中候选背景颜色'] || '#FFFFFF',
      preferredCommentColor: themeColors['候选字体选中字体颜色'] || keyTextColor,
      preferredIndexColor: themeColors['候选字体选中字体颜色'] || keyTextColor,
      preferredTextColor: themeColors['候选字体选中字体颜色'] || keyTextColor,
      textColor: themeColors['候选字体未选中字体颜色'] || keyTextColor,
      textFontSize: sharedFontSize['未展开候选字体选中字体大小'] || 17,
    };
    if (isPlainObject(payload.expandButton)) {
      payload.expandButton.backgroundStyle = 'toolbarButtonBackgroundStyle';
      payload.expandButton.foregroundStyle = 'expandButtonForegroundStyle';
    }
    setSystemImageStyle('expandButtonForegroundStyle', 'chevron.down', {
      center: sharedCenter['toolbar按键sf符号偏移'] || { x: 0.5, y: 0.53 },
      fontSize: sharedFontSize['toolbar按键前景sf符号大小'] || 16,
      normalColor: toolbarTextColor,
      highlightColor: toolbarTextColor,
    });
  };
  const ensureAlphabeticHintBackgroundStyle = () => {
    payload.alphabeticHintBackgroundStyle = {
      ...(isPlainObject(payload.alphabeticHintBackgroundStyle) ? payload.alphabeticHintBackgroundStyle : {}),
      buttonStyleType: 'geometry',
      cornerRadius: 7,
      normalColor: themeName === 'dark' ? '#6B6B6B' : '#ffffff',
      highlightColor: '#0279FE',
      shadowOffset: { x: 0, y: 5 },
    };
  };
  const normalizePinyin9Payload = () => {
    if (!keyboardName.startsWith('pinyin_9_')) return;
    const containerBackgroundStyle = sharedKeyboardContainerBackgroundStyle();
    payload.keyboardBackgroundStyle = structuredClone(containerBackgroundStyle);
    payload.toolbarBackgroundStyle = structuredClone(containerBackgroundStyle);
    payload.keyboardStyle = payload.keyboardStyle && isPlainObject(payload.keyboardStyle) ? payload.keyboardStyle : {};
    payload.keyboardStyle.backgroundStyle = 'keyboardBackgroundStyle';
    payload.toolbarStyle = payload.toolbarStyle && isPlainObject(payload.toolbarStyle) ? payload.toolbarStyle : {};
    payload.toolbarStyle.backgroundStyle = payload.toolbarStyle.backgroundStyle || 'toolbarBackgroundStyle';
    normalizeCandidateBarStyle();
    ensureAlphabeticHintBackgroundStyle();
    payload.preeditStyle = payload.preeditStyle && isPlainObject(payload.preeditStyle) ? payload.preeditStyle : {};
    payload.preeditStyle.backgroundStyle = payload.preeditStyle.backgroundStyle || 'preeditBackgroundStyle';
    payload.preeditStyle.foregroundStyle = payload.preeditStyle.foregroundStyle || 'preeditForegroundStyle';
    payload.preeditBackgroundStyle = payload.preeditBackgroundStyle || {
      buttonStyleType: 'geometry',
      normalColor: normalizeContainerColor(themeColors['键盘背景颜色'], '#00000001'),
    };
    payload.preeditForegroundStyle = payload.preeditForegroundStyle || {
      buttonStyleType: 'text',
      fontSize: sharedFontSize['未展开候选字体选中字体大小'] || 16,
      normalColor: keyTextColor,
    };
    if (isPlainObject(payload.collectionBackgroundStyle)) {
      const collectionBackgroundStyle = sharedCollectionBackgroundStyle();
      payload.collectionBackgroundStyle = {
        ...payload.collectionBackgroundStyle,
        ...collectionBackgroundStyle,
      };
    }
    if (isPlainObject(payload.collection)) {
      payload.collection.type = 't9Symbols';
      payload.collection.dataSource = 'symbols';
      const defaultSymbols = ['#', '+', '=', '@', '/', '.', ',', '?', '!', ':', ';'];
      payload.symbols = Array.isArray(payload.symbols) && payload.symbols.length ? payload.symbols : defaultSymbols;
      payload.dataSource = payload.dataSource && isPlainObject(payload.dataSource) ? payload.dataSource : {};
      payload.dataSource.symbols = Array.isArray(payload.dataSource.symbols) && payload.dataSource.symbols.length
        ? payload.dataSource.symbols
        : defaultSymbols;
    }
    for (let index = 0; index <= 9; index += 1) {
      const button = payload[`number${index}Button`];
      if (index >= 1 && index <= 9 && isPlainObject(button)) {
        button.action = { character: String(index) };
      }
      const style = payload[`number${index}ButtonForegroundStyle`];
      if (isPlainObject(style)) {
        style.buttonStyleType = 'text';
        style.center = { ...(style.center || {}), x: 0.5, y: 0.54 };
        style.fontSize = Math.max(Number(style.fontSize || 0), 17);
        style.normalColor = keyTextColor;
        style.highlightColor = keyTextColor;
      }
    }
    const enterText = project.keyboards?.keyboard26?.text?.enter?.default || '换行';
    if (isPlainObject(payload.enterButton)) {
      payload.enterButton.backgroundStyle = 'systemButtonBackgroundStyle';
      payload.enterButton.foregroundStyle = 'enterButtonForegroundStyle';
    }
    setTextStyle('enterButtonForegroundStyle', enterText, {
      center: sharedCenter['功能键前景文字偏移'] || { x: 0.5, y: 0.47 },
      fontSize: sharedFontSize['功能键前景文字大小'] || 16,
    });
    if (isPlainObject(payload.clearButton)) {
      payload.clearButton.backgroundStyle = 'systemButtonBackgroundStyle';
      payload.clearButton.foregroundStyle = 'clearButtonForegroundStyle';
      delete payload.clearButton.preeditStateForegroundStyle;
    }
    setTextStyle('clearButtonForegroundStyle', '重输', {
      center: sharedCenter['功能键前景文字偏移'] || { x: 0.5, y: 0.5 },
      fontSize: sharedFontSize['功能键前景文字大小'] || 16,
    });
  };
  const normalizePinyinNumberButtonActions = () => {
    if (!keyboardName.startsWith('pinyin_')) return;
    for (let index = 0; index <= 9; index += 1) {
      const key = `number${index}`;
      const button = payload[`${key}Button`];
      if (!isPlainObject(button)) continue;
      const override = normalizeActionObject(keyActions[key]);
      if (project.keyboards?.keyboard26?.keyEditorModes?.[key] === 'function' && Object.keys(override).length) {
        if (override.character === key) override.character = String(index);
        if (override.symbol === key) override.symbol = String(index);
        button.action = override;
        continue;
      }
      const trigger = Object.prototype.hasOwnProperty.call(keyTriggers, key)
        ? keyTriggers[key]
        : String(index);
      const actionType = project.keyboards?.keyboard26?.keyTypes?.[key] === 'symbol' ? 'symbol' : 'character';
      button.action = { [actionType]: String(trigger) };
    }
  };
  const normalizeNumeric9Payload = () => {
    if (!keyboardName.startsWith('numeric_9_')) return;
    const containerBackgroundStyle = sharedKeyboardContainerBackgroundStyle();
    payload.keyboardBackgroundStyle = structuredClone(containerBackgroundStyle);
    payload.toolbarBackgroundStyle = structuredClone(containerBackgroundStyle);
    payload.keyboardStyle = payload.keyboardStyle && isPlainObject(payload.keyboardStyle) ? payload.keyboardStyle : {};
    payload.keyboardStyle.backgroundStyle = 'keyboardBackgroundStyle';
    payload.toolbarStyle = payload.toolbarStyle && isPlainObject(payload.toolbarStyle) ? payload.toolbarStyle : {};
    payload.toolbarStyle.backgroundStyle = 'toolbarBackgroundStyle';
    normalizeCandidateBarStyle();
    ensureAlphabeticHintBackgroundStyle();
    const normalBackgroundStyle = structuredClone(payload.alphabeticBackgroundStyle || payload.number1Bg || fallbackBackgroundStyle('numericNumberBackgroundStyle'));
    applySurfaceStyle(normalBackgroundStyle, project.keyStyles?.surfaceStyles?.keyboard26?.normal);
    applyInsets(normalBackgroundStyle, project.keyStyles?.buttonInsets?.keyboard26?.normal);
    normalBackgroundStyle.normalColor = themeColors['字母键背景颜色-普通'] || themeColors['按键背景颜色-普通'] || normalBackgroundStyle.normalColor;
    normalBackgroundStyle.highlightColor = themeColors['字母键背景颜色-高亮'] || themeColors['按键背景颜色-高亮'] || normalBackgroundStyle.highlightColor;
    normalBackgroundStyle.normalLowerEdgeColor = themeColors['底边缘颜色-普通'] || normalBackgroundStyle.normalLowerEdgeColor;
    normalBackgroundStyle.highlightLowerEdgeColor = themeColors['底边缘颜色-高亮'] || normalBackgroundStyle.highlightLowerEdgeColor;
    normalBackgroundStyle.borderColor = themeColors['按键边缘颜色'] || normalBackgroundStyle.borderColor;
    const functionBackgroundStyle = sharedFunctionBackgroundStyle();
    const collectionBackgroundStyle = sharedCollectionBackgroundStyle();
    payload.systemButtonBackgroundStyle = structuredClone(functionBackgroundStyle);
    for (const styleName of [
      'backspaceBg',
      'clearBg',
      'commaBg',
      'equalBg',
      'periodBg',
      'returnBgGray',
      'returnBgCol',
      'enterBgGray',
      'enterBgCol',
      'symbolicBg',
    ]) {
      payload[styleName] = structuredClone(functionBackgroundStyle);
    }
    payload.spaceBg = structuredClone(normalBackgroundStyle);
    payload.symbolsCollectionBg = structuredClone(collectionBackgroundStyle);
    payload.collectionBackgroundStyle = structuredClone(collectionBackgroundStyle);
    if (isPlainObject(payload.numperiodButton)) {
      payload.numperiodButton.backgroundStyle = 'periodBg';
      payload.numperiodButton.foregroundStyle = ['numperiodFg'];
    }
    for (const styleName of [
      'returnFgGray',
      'returnFgCol',
      'enterFgGray',
      'enterFgCol1',
      'enterFgCol3',
      'enterFgCol6',
      'enterFgCol7',
      'enterFgCol9',
    ]) {
      if (isPlainObject(payload[styleName])) {
        payload[styleName].normalColor = keyTextColor;
        payload[styleName].highlightColor = keyTextColor;
      }
    }
    setTextStyle('numperiodFg', project.keyboards?.numeric?.text?.period || '.', {
      center: { ...(sharedCenter['数字键盘数字前景偏移'] || sharedCenter['26键中文前景偏移'] || {}), x: 0.5, y: 0.54 },
      fontSize: sharedFontSize['数字键盘数字前景字体大小'] || sharedFontSize['按键前景文字大小'] || 15,
      normalColor: keyTextColor,
      highlightColor: keyTextColor,
    });
    if (!isPlainObject(payload.collection) && isPlainObject(payload.Numeric)) {
      const source = isPlainObject(payload.Numeric.system) ? payload.Numeric.system : payload.Numeric.custom;
      if (isPlainObject(source)) payload.collection = structuredClone(source);
    }
    if (isPlainObject(payload.collection)) {
      payload.collection.type = payload.collection.type || 'numericSymbols';
      payload.collection.dataSource = payload.collection.dataSource || 'numericSymbols';
    }
    const numericNumberDefaultType = project.keyboardCombo?.slots?.pinyin?.variant === '9' ? 'symbol' : 'character';
    for (let index = 0; index <= 9; index += 1) {
      const buttonName = `number${index}Button`;
      const styleName = `number${index}Fg`;
      if (isPlainObject(payload[buttonName])) {
        payload[buttonName].backgroundStyle = `number${index}Bg`;
        payload[buttonName].foregroundStyle = [styleName];
      }
      payload[`number${index}Bg`] = structuredClone(normalBackgroundStyle);
      setTextStyle(styleName, String(index), {
        center: { ...(sharedCenter['数字键盘数字前景偏移'] || sharedCenter['26键中文前景偏移'] || {}), x: 0.5, y: 0.54 },
        fontSize: sharedFontSize['数字键盘数字前景字体大小'] || sharedFontSize['按键前景文字大小'] || 15,
      });
      payload[`${buttonName}ForegroundStyle`] = structuredClone(payload[styleName]);
      applyStandardKeyConfig({
        keyboardConfig: numericConfig,
        key: String(index),
        buttonName,
        styleName,
        defaultAction: { [numericNumberDefaultType]: String(index) },
        defaultText: String(index),
        defaultMode: 'character',
        defaultType: numericNumberDefaultType,
        textOptions: {
          center: { ...(sharedCenter['数字键盘数字前景偏移'] || sharedCenter['26键中文前景偏移'] || {}), x: 0.5, y: 0.54 },
          fontSize: sharedFontSize['数字键盘数字前景字体大小'] || sharedFontSize['按键前景文字大小'] || 15,
        },
      });
    }
    const numericFunctionButtons = {
      symbol: { buttonName: 'symbolicButton', styleName: 'symbolicFg', defaultAction: { keyboardType: 'symbolic' }, defaultText: project.keyboards?.numeric?.text?.symbol || '#+=' },
      return: { buttonName: 'returnButton', styleName: 'returnFgGray', defaultAction: { keyboardType: 'pinyin' }, defaultText: project.keyboards?.numeric?.text?.return || '返回' },
      backspace: { buttonName: 'backspaceButton', styleName: 'backspaceFg', defaultAction: { action: 'backspace' }, defaultText: 'delete.left', defaultDisplayType: 'systemImageName' },
      period: { buttonName: 'numperiodButton', styleName: 'numperiodFg', defaultAction: { symbol: '.' }, defaultText: project.keyboards?.numeric?.text?.period || '.' },
      equal: { buttonName: 'equalButton', styleName: 'equalFg', defaultAction: { character: '=' }, defaultText: project.keyboards?.numeric?.text?.equal || '=' },
      space: { buttonName: 'spaceButton', styleName: 'numspaceFg', defaultAction: { action: 'space' }, defaultText: project.keyboards?.numeric?.text?.space || '空格' },
      enter: { buttonName: 'enterButton', styleName: 'enterFgCol7', defaultAction: { action: 'enter' }, defaultText: project.keyboards?.numeric?.text?.enter || '发送' },
    };
    for (const [key, config] of Object.entries(numericFunctionButtons)) {
      applyStandardKeyConfig({
        keyboardConfig: numericConfig,
        key,
        buttonName: config.buttonName,
        styleName: config.styleName,
        defaultAction: config.defaultAction,
        defaultText: config.defaultText,
        defaultMode: 'function',
        defaultType: 'character',
        defaultDisplayType: config.defaultDisplayType || 'text',
        textOptions: {
          center: sharedCenter['功能键前景文字偏移'] || { x: 0.5, y: 0.5 },
          fontSize: sharedFontSize['功能键前景文字大小'] || 16,
          normalColor: keyTextColor,
          highlightColor: keyTextColor,
        },
      });
    }
  };
  const applySymbolicStandardKeyConfig = () => {
    if (!keyboardName.startsWith('symbolic_')) return;
    const symbolicFunctionButtons = {
      return: {
        buttonName: 'symbolreturnButton',
        styleName: 'symbolreturnButtonForegroundStyle',
        defaultAction: { action: 'returnLastKeyboard' },
        defaultText: project.keyboards?.symbolic?.text?.return || '返回',
      },
      pageUp: {
        buttonName: 'pageUpButton',
        styleName: 'pageUpButtonForegroundStyle',
        defaultAction: { shortcut: '#subCollectionPageUp' },
        defaultText: 'chevron.up',
        defaultDisplayType: 'systemImageName',
      },
      pageDown: {
        buttonName: 'pageDownButton',
        styleName: 'pageDownButtonForegroundStyle',
        defaultAction: { shortcut: '#subCollectionPageDown' },
        defaultText: 'chevron.down',
        defaultDisplayType: 'systemImageName',
      },
      lock: {
        buttonName: 'lockButton',
        styleName: 'lockButtonForegroundStyle',
        defaultAction: { action: 'symbolicKeyboardLockStateToggle' },
        defaultText: 'lock',
        defaultDisplayType: 'systemImageName',
      },
      backspace: {
        buttonName: 'symbolbackspaceButton',
        styleName: 'symbolbackspaceButtonForegroundStyle',
        defaultAction: { action: 'backspace' },
        defaultText: 'delete.left',
        defaultDisplayType: 'systemImageName',
      },
    };
    for (const [key, config] of Object.entries(symbolicFunctionButtons)) {
      applyStandardKeyConfig({
        keyboardConfig: symbolicConfig,
        key,
        buttonName: config.buttonName,
        styleName: config.styleName,
        defaultAction: config.defaultAction,
        defaultText: config.defaultText,
        defaultMode: 'function',
        defaultType: 'symbol',
        defaultDisplayType: config.defaultDisplayType || 'text',
        applyWithoutConfig: false,
        textOptions: {
          center: sharedCenter['功能键前景文字偏移'] || { x: 0.5, y: 0.5 },
          fontSize: sharedFontSize['功能键前景文字大小'] || 16,
          normalColor: keyTextColor,
          highlightColor: keyTextColor,
        },
      });
    }
  };
  const normalizeIos14AlphabeticPayload = () => {
    if (!keyboardName.startsWith('alphabetic_26_') || project.keyboardCombo?.slots?.pinyin?.variant !== '14') return;
    if (keyboardName.includes('portrait')) {
      payload.keyboardLayout = [
        { HStack: { style: '字母竖屏', subviews: 'qwertyuiop'.split('').map((key) => ({ Cell: `${key}Button` })) } },
        { HStack: { style: '字母竖屏', subviews: 'asdfghjkl'.split('').map((key) => ({ Cell: `${key}Button` })) } },
        { HStack: { style: '字母竖屏', subviews: ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'].map((key) => ({ Cell: `${key}Button` })) } },
        { HStack: { style: '底栏竖屏', subviews: ['123', 'spaceRight', 'space', 'cnen', 'enter'].map((key) => ({ Cell: `${key}Button` })) } },
      ];
      payload['字母竖屏'] = payload['字母竖屏'] && isPlainObject(payload['字母竖屏']) ? payload['字母竖屏'] : {};
      payload['字母竖屏'].size = { ...(payload['字母竖屏'].size || {}), height: '50/195' };
      payload['底栏竖屏'] = payload['底栏竖屏'] && isPlainObject(payload['底栏竖屏']) ? payload['底栏竖屏'] : {};
      payload['底栏竖屏'].size = { ...(payload['底栏竖屏'].size || {}), height: '45/195' };
    }
    if (isPlainObject(payload.cnenButton)) {
      payload.cnenButton.action = 'returnLastKeyboard';
      payload.cnenButton.foregroundStyle = 'cnenButtonForegroundStyle';
    }
    setTextStyle('cnenButtonForegroundStyle', keyDisplays['alphabetic.cnen'] || keyDisplays['english.cnen'] || '英', {
      center: sharedCenter['功能键前景文字偏移'] || { x: 0.5, y: 0.47 },
      fontSize: sharedFontSize['功能键前景文字大小'] || 16,
    });
  };
  const normalizePinyin14Payload = () => {
    if (!keyboardName.startsWith('pinyin_14_')) return;
    const containerBackgroundStyle = sharedKeyboardContainerBackgroundStyle();
    payload.keyboardBackgroundStyle = structuredClone(containerBackgroundStyle);
    payload.toolbarBackgroundStyle = structuredClone(containerBackgroundStyle);
    payload.keyboardStyle = payload.keyboardStyle && isPlainObject(payload.keyboardStyle) ? payload.keyboardStyle : {};
    payload.keyboardStyle.backgroundStyle = 'keyboardBackgroundStyle';
    payload.toolbarStyle = payload.toolbarStyle && isPlainObject(payload.toolbarStyle) ? payload.toolbarStyle : {};
    payload.toolbarStyle.backgroundStyle = 'toolbarBackgroundStyle';
    normalizeCandidateBarStyle();
    ensureAlphabeticHintBackgroundStyle();
    const letterBackgroundKeys = [
      'qwBg', 'erBg', 'tyBg', 'uiBg', 'opBg',
      'asBg', 'dfBg', 'ghBg', 'jkBg', 'lBg',
      'zxBg', 'cvBg', 'bnBg', 'mBg',
    ];
    const functionBackgroundKeys = ['shiftBg', 'backspaceBg', '123Bg', 'commaBg', 'cnenBg', 'periodBg', 'equalBg', 'symbolicBg', 'enterBgGray'];
    const normalBackgroundStyle = structuredClone(payload.alphabeticBackgroundStyle || fallbackBackgroundStyle('alphabeticBackgroundStyle'));
    applySurfaceStyle(normalBackgroundStyle, project.keyStyles?.surfaceStyles?.keyboard26?.normal);
    applyInsets(normalBackgroundStyle, project.keyStyles?.buttonInsets?.keyboard26?.normal);
    normalBackgroundStyle.normalColor = themeColors['按键背景颜色-普通'] || normalBackgroundStyle.normalColor;
    normalBackgroundStyle.highlightColor = themeColors['按键背景颜色-高亮'] || normalBackgroundStyle.highlightColor;
    normalBackgroundStyle.normalLowerEdgeColor = themeColors['底边缘颜色-普通'] || normalBackgroundStyle.normalLowerEdgeColor;
    normalBackgroundStyle.highlightLowerEdgeColor = themeColors['底边缘颜色-高亮'] || normalBackgroundStyle.highlightLowerEdgeColor;
    normalBackgroundStyle.borderColor = themeColors['按键边缘颜色'] || normalBackgroundStyle.borderColor;
    const functionBackgroundStyle = structuredClone(payload.systemButtonBackgroundStyle || payload.alphabeticBackgroundStyle || fallbackBackgroundStyle('systemButtonBackgroundStyle'));
    applySurfaceStyle(functionBackgroundStyle, project.keyStyles?.surfaceStyles?.keyboard26?.functionKey);
    applyInsets(functionBackgroundStyle, project.keyStyles?.buttonInsets?.keyboard26?.functionKey);
    functionBackgroundStyle.normalColor = themeColors['功能键背景颜色-普通'] || functionBackgroundStyle.normalColor;
    functionBackgroundStyle.highlightColor = themeColors['功能键背景颜色-高亮'] || functionBackgroundStyle.highlightColor;
    functionBackgroundStyle.normalLowerEdgeColor = themeColors['底边缘颜色-普通'] || functionBackgroundStyle.normalLowerEdgeColor;
    functionBackgroundStyle.highlightLowerEdgeColor = themeColors['底边缘颜色-高亮'] || functionBackgroundStyle.highlightLowerEdgeColor;
    functionBackgroundStyle.borderColor = themeColors['按键边缘颜色'] || functionBackgroundStyle.borderColor;
    payload.systemButtonBackgroundStyle = structuredClone(functionBackgroundStyle);
    const enterBackgroundStyle = structuredClone(payload.enterButtonBlueBackgroundStyle || functionBackgroundStyle);
    applySurfaceStyle(enterBackgroundStyle, project.keyStyles?.surfaceStyles?.keyboard26?.enterAccent);
    applyInsets(enterBackgroundStyle, project.keyStyles?.buttonInsets?.keyboard26?.enter || project.keyStyles?.buttonInsets?.keyboard26?.functionKey);
    enterBackgroundStyle.normalColor = themeColors['enter键背景(蓝色)'] || enterBackgroundStyle.normalColor;
    enterBackgroundStyle.highlightColor = themeColors['enter键背景(蓝色)'] || enterBackgroundStyle.highlightColor;
    delete enterBackgroundStyle.normalLowerEdgeColor;
    delete enterBackgroundStyle.highlightLowerEdgeColor;
    payload.enterButtonBlueBackgroundStyle = structuredClone(enterBackgroundStyle);
    for (const styleName of letterBackgroundKeys) {
      payload[styleName] = structuredClone(payload.alphabeticBackgroundStyle || fallbackBackgroundStyle(styleName));
    }
    for (const styleName of functionBackgroundKeys) {
      payload[styleName] = structuredClone(functionBackgroundStyle);
    }
    payload.spaceBg = structuredClone(normalBackgroundStyle);
    payload.enterBgCol = structuredClone(enterBackgroundStyle);
    const comboKeys = [
      'qw', 'er', 'ty', 'ui', 'op',
      'as', 'df', 'gh', 'jk',
      'zx', 'cv', 'bn',
    ];
    for (const comboKey of comboKeys) {
      const buttonName = `${comboKey}Button`;
      if (!isPlainObject(payload[buttonName])) continue;
      const symbols = comboKey.split('');
      payload[buttonName].hintStyle = `${buttonName}HintStyle`;
      payload[buttonName].hintSymbolsStyle = `${buttonName}HintSymbolsStyle`;
      payload[`${buttonName}HintStyle`] = {
        backgroundStyle: 'alphabeticHintBackgroundStyle',
        foregroundStyle: `${buttonName}HintForegroundStyle`,
        swipeUpForegroundStyle: `${buttonName}HintForegroundStyle`,
      };
      setTextStyle(`${buttonName}HintForegroundStyle`, applyPinyinProjectLetterCase(project, symbols[0]), {
        center: { x: 0.5, y: 0.6, ...(sharedCenter['长按气泡文字偏移'] || {}) },
        fontSize: sharedFontSize['按下气泡文字大小'] || 28,
        normalColor: themeName === 'dark' ? '#E6E6E6' : '#2E2E2E',
        highlightColor: themeName === 'dark' ? '#E6E6E6' : '#2E2E2E',
      });
      payload[`${buttonName}HintSymbolsStyle`] = {
        backgroundStyle: 'alphabeticHintSymbolsBackgroundStyle',
        insets: { bottom: 3, left: 8, right: 8, top: 3 },
        selectedBackgroundStyle: 'alphabeticHintSymbolsSelectedStyle',
        selectedIndex: 0,
        symbolStyles: symbols.map((_, index) => `${buttonName}HintSymbolsStyleOf${index}`),
      };
      symbols.forEach((symbol, index) => {
        payload[`${buttonName}HintSymbolsStyleOf${index}`] = {
          action: { character: symbol },
          foregroundStyle: `${buttonName}HintSymbolsForegroundStyleOf${index}`,
        };
        setTextStyle(`${buttonName}HintSymbolsForegroundStyleOf${index}`, applyPinyinProjectLetterCase(project, symbol), {
          center: { x: 0.5, y: 0.5, ...(sharedCenter['长按气泡文字偏移'] || {}) },
          fontSize: sharedFontSize['长按气泡文字大小'] || 20,
          normalColor: keyTextColor,
          highlightColor: '#FFFFFF',
        });
      });
    }
    if (keyboardName.includes('portrait')) {
      const footerWidths = {
        '123Button': 1.15 / 7,
        commaButton: 0.85 / 7,
        spaceButton: 3 / 7,
        cnenButton: 0.85 / 7,
        enterButton: 1.15 / 7,
      };
      for (const [buttonName, percentage] of Object.entries(footerWidths)) {
        if (!isPlainObject(payload[buttonName])) continue;
        payload[buttonName].size = payload[buttonName].size || {};
        payload[buttonName].size.width = { percentage };
      }
      if (isPlainObject(payload.shiftButton)) {
        payload.shiftButton.action = { sendKeys: '`' };
        payload.shiftButton.foregroundStyle = 'shiftFg';
        delete payload.shiftButton.uppercasedStateAction;
        delete payload.shiftButton.uppercasedStateForegroundStyle;
        delete payload.shiftButton.capsLockedStateForegroundStyle;
        delete payload.shiftButton.hintSymbolsStyle;
      }
      setTextStyle('shiftFg', "'词", {
        center: sharedCenter['功能键前景文字偏移'] || { x: 0.5, y: 0.5 },
        fontSize: sharedFontSize['功能键前景文字大小'] || 15,
      });
    }
    if (isPlainObject(payload.commaButton)) {
      const commaConfig = project.keyboards?.keyboard26?.spaceRight?.pinyin || {};
      const primaryText = String(commaConfig.primary?.text || '，').trim();
      payload.commaButton.action = { character: primaryText || '，' };
      payload.commaButton.foregroundStyle = 'commaFg';
      delete payload.commaButton.swipeUpAction;
      delete payload.commaButton.swipeDownAction;
      setTextStyle('commaFg', primaryText || '，', {
        center: commaConfig.primary?.center || sharedCenter['功能键前景文字偏移'] || { x: 0.5, y: 0.5 },
        fontSize: sharedFontSize['功能键前景文字大小'] || 14,
      });
    }
  };
  const normalizePinyin17Payload = () => {
    if (!keyboardName.startsWith('pinyin_17_')) return;
    if (keyboardName.includes('portrait')) {
      const footerWidths = {
        '123Button': 1.15 / 7,
        cnenButton: 0.85 / 7,
        spaceButton: 3 / 7,
        spaceRightButton: 0.85 / 7,
        enterButton: 1.15 / 7,
      };
      for (const [buttonName, percentage] of Object.entries(footerWidths)) {
        if (!isPlainObject(payload[buttonName])) continue;
        payload[buttonName].size = payload[buttonName].size || {};
        payload[buttonName].size.width = { percentage };
      }
      if (isPlainObject(payload.backspaceButton)) {
        payload.backspaceButton.size = payload.backspaceButton.size || {};
        payload.backspaceButton.size.width = '1/6';
      }
    }
  };
  const normalizeVariantEnterButton = () => {
    if (!/^pinyin_(14|17|18)_/.test(keyboardName)) return;
    const enterText = project.keyboards?.keyboard26?.text?.enter?.send
      || project.keyboards?.keyboard26?.text?.enter?.default
      || '发送';
    if (isPlainObject(payload.enterButton)) {
      payload.enterButton.foregroundStyle = 'enterButtonForegroundStyle';
    }
    setTextStyle('enterButtonForegroundStyle', enterText, {
      center: sharedCenter['功能键前景文字偏移'] || { x: 0.5, y: 0.47 },
      fontSize: sharedFontSize['功能键前景文字大小'] || 16,
      normalColor: '#ffffff',
      highlightColor: '#ffffff',
    });
  };
  const normalizePinyinVariantRowHeights = () => {
    if (!/^pinyin_(14|17)_/.test(keyboardName)) return;
    if (keyboardName.includes('portrait')) {
      const rowHeight = '1/4';
      if (isPlainObject(payload.HStackStyle)) {
        payload.HStackStyle.size = { ...(payload.HStackStyle.size || {}), height: rowHeight };
      }
      for (const row of payload.keyboardLayout || []) {
        const styleName = row?.HStack?.style;
        if (!styleName) continue;
        payload[styleName] = payload[styleName] && isPlainObject(payload[styleName]) ? payload[styleName] : {};
        payload[styleName].size = { ...(payload[styleName].size || {}), height: rowHeight };
      }
    }
  };
  const normalizePinyin18Payload = () => {
    if (!keyboardName.startsWith('pinyin_18_')) return;
    const containerBackgroundStyle = sharedKeyboardContainerBackgroundStyle();
    payload.keyboardBackgroundStyle = structuredClone(containerBackgroundStyle);
    payload.toolbarBackgroundStyle = structuredClone(containerBackgroundStyle);
    payload.keyboardStyle = payload.keyboardStyle && isPlainObject(payload.keyboardStyle) ? payload.keyboardStyle : {};
    payload.keyboardStyle.backgroundStyle = 'keyboardBackgroundStyle';
    payload.toolbarStyle = payload.toolbarStyle && isPlainObject(payload.toolbarStyle) ? payload.toolbarStyle : {};
    payload.toolbarStyle.backgroundStyle = 'toolbarBackgroundStyle';
    normalizeCandidateBarStyle();
    ensureAlphabeticHintBackgroundStyle();
    const orientation = keyboardName.includes('landscape') ? 'landscape' : 'portrait';
    const metrics = project.keyboards?.keyboard26?.variants?.['18']?.metrics?.[orientation]
      || project.keyboards?.keyboard26?.variants?.['18']?.metrics?.portrait
      || {};
    const metricKeyForButton = (buttonName) => ({
      shiftButton: 'shift',
      backspaceButton: 'backspace',
      numericButton: '123',
      commaButton: 'spaceRight',
      alphabeticButton: 'cnen',
      enterButton: 'enter',
    }[buttonName] || buttonName.replace(/Button$/, ''));
    payload.HStackStyle = payload.HStackStyle && isPlainObject(payload.HStackStyle) ? payload.HStackStyle : {};
    payload.HStackStyle.size = { ...(payload.HStackStyle.size || {}), height: '1/4' };
    for (const row of payload.keyboardLayout || []) {
      if (isPlainObject(row?.HStack)) row.HStack.style = row.HStack.style || 'HStackStyle';
    }
    if (isPlainObject(payload.alphabeticButtonBackgroundStyle)) {
      payload.alphabeticBackgroundStyle = structuredClone(payload.alphabeticButtonBackgroundStyle);
    }
    if (isPlainObject(payload.colorButtonBackgroundStyle)) {
      payload.enterButtonBlueBackgroundStyle = structuredClone(payload.colorButtonBackgroundStyle);
    }
    for (const [buttonName, button] of Object.entries(payload)) {
      if (!/Button$/.test(buttonName) || !isPlainObject(button)) continue;
      if (/^toolbar/.test(buttonName)) continue;
      if (/^[a-z]Button$/.test(buttonName) || ['commaButton', 'spaceButton'].includes(buttonName)) {
        button.backgroundStyle = 'alphabeticBackgroundStyle';
      } else if (buttonName === 'enterButton') {
        button.backgroundStyle = 'enterButtonBlueBackgroundStyle';
      }
      const metricKey = metricKeyForButton(buttonName);
      const width = metrics[metricKey]?.width || metrics.normal?.width;
      if (width !== undefined) {
        button.size = button.size || {};
        button.size.width = structuredClone(width);
      }
      if (metrics[metricKey]?.bounds !== undefined) {
        button.bounds = structuredClone(metrics[metricKey].bounds);
      }
    }
    const variantText = {
      wButtonForegroundStyle: 'we',
      rButtonForegroundStyle: 'rt',
      iButtonForegroundStyle: 'io',
      sButtonForegroundStyle: 'sd',
      fButtonForegroundStyle: 'fg',
      jButtonForegroundStyle: 'jk',
      xButtonForegroundStyle: 'xc',
      bButtonForegroundStyle: 'bn',
    };
    for (const [styleName, text] of Object.entries(variantText)) {
      if (isPlainObject(payload[styleName])) payload[styleName].text = applyPinyinProjectLetterCase(project, text);
    }
    setTextStyle('spaceButtonForegroundStyle', project.keyboards?.keyboard26?.text?.space || '空格', {
      center: sharedCenter['功能键前景文字偏移'] || { x: 0.5, y: 0.5 },
      fontSize: sharedFontSize['功能键前景文字大小'] || 16,
    });
    setTextStyle('enterButtonForegroundStyle', project.keyboards?.keyboard26?.text?.enter?.default || '发送', {
      center: sharedCenter['功能键前景文字偏移'] || { x: 0.5, y: 0.47 },
      fontSize: sharedFontSize['功能键前景文字大小'] || 16,
      normalColor: '#ffffff',
      highlightColor: '#ffffff',
    });
    if (isPlainObject(payload.enterButton)) payload.enterButton.foregroundStyle = 'enterButtonForegroundStyle';
  };
  const applyPinyinVariantLetterCaseLabels = () => {
    if (!/^pinyin_(9|14|17|18)_/.test(keyboardName)) return;
    for (const [styleName, style] of Object.entries(payload)) {
      if (!isPlainObject(style) || style.buttonStyleType !== 'text' || typeof style.text !== 'string') continue;
      const isVariantLetterStyle = /^[a-z]{1,3}(?:ButtonForegroundStyle|Fg)$/i.test(styleName)
        || /^number[2-9]ButtonForegroundStyle$/i.test(styleName);
      if (!isVariantLetterStyle || !/[A-Za-z]/.test(style.text)) continue;
      style.text = applyPinyinProjectLetterCase(project, style.text);
    }
  };
  const ensureCoreFallbackStyles = () => {
    payload.alphabeticHintSymbolsBackgroundStyle = payload.alphabeticHintSymbolsBackgroundStyle || {
      buttonStyleType: 'fileImage',
      normalImage: { file: 'hold_back', image: 'IMG1' },
      targetScale: { x: 1, y: 1.1 },
    };
    payload.alphabeticHintSymbolsSelectedStyle = payload.alphabeticHintSymbolsSelectedStyle || {
      buttonStyleType: 'fileImage',
      highlightImage: { file: 'hint', image: 'IMG1' },
      insets: { top: 8, left: 4, bottom: 8, right: 3 },
      normalImage: { file: 'hint', image: 'IMG1' },
      targetScale: { x: 0.8, y: 0.7 },
    };
    payload.toolbarButtonBackgroundStyle = payload.toolbarButtonBackgroundStyle || fallbackBackgroundStyle('toolbarButtonBackgroundStyle');
  };
  const ensureReferencedStyles = () => {
    const addRef = (buttonName, button, refName, refKind) => {
      if (!refName || typeof refName !== 'string' || refName.startsWith('// JavaScript') || payload[refName]) return;
      if (refKind === 'backgroundStyle' || /(?:Bg|BackgroundStyle)$/i.test(refName)) {
        payload[refName] = fallbackBackgroundStyle(refName);
        return;
      }
      if (refKind === 'hintStyle' || /Hint$/i.test(refName)) {
        const foregroundStyle = Array.isArray(button.foregroundStyle) ? button.foregroundStyle[0] : button.foregroundStyle;
        payload[refName] = {
          backgroundStyle: 'alphabeticHintSymbolsBackgroundStyle',
          selectedBackgroundStyle: 'alphabeticHintSymbolsSelectedStyle',
          selectedIndex: 0,
          symbolStyles: [foregroundStyle].filter(Boolean),
        };
        return;
      }
      payload[refName] = fallbackForegroundStyle(refName, button);
    };
    for (const [buttonName, button] of Object.entries(payload)) {
      if (!isPlainObject(button)) continue;
      for (const refKind of ['backgroundStyle', 'foregroundStyle', 'hintStyle', 'uppercasedStateForegroundStyle', 'capsLockedStateForegroundStyle']) {
        const refValue = button[refKind];
        if (Array.isArray(refValue)) {
          for (const refName of refValue) addRef(buttonName, button, refName, refKind);
        } else {
          addRef(buttonName, button, refValue, refKind);
        }
      }
    }
  };
  const pruneMissingLayoutCells = () => {
    const pruneNode = (node) => {
      if (Array.isArray(node)) return node.map(pruneNode).filter(Boolean);
      if (!isPlainObject(node)) return node;
      if (typeof node.Cell === 'string') return payload[node.Cell] ? node : null;
      const next = {};
      for (const [key, item] of Object.entries(node)) {
        const pruned = pruneNode(item);
        if (Array.isArray(pruned) && !pruned.length && key === 'subviews') return null;
        if (pruned !== null && pruned !== undefined) next[key] = pruned;
      }
      return Object.keys(next).length ? next : null;
    };
    if (Array.isArray(payload.keyboardLayout)) {
      payload.keyboardLayout = payload.keyboardLayout.map(pruneNode).filter(Boolean);
    }
  };
  const replaceMissingVariantImageForegrounds = () => {
    const variantMatch = keyboardName.match(/^pinyin_(9|14|18)_/);
    if (!variantMatch) return;
    for (const [styleName, style] of Object.entries(payload)) {
      if (!isPlainObject(style) || style.buttonStyleType !== 'fileImage') continue;
      const fileName = style.normalImage?.file || style.highlightImage?.file;
      if (!fileName || availableResourceFiles.has(normalizeResourceFileName(fileName))) continue;
      const baseMatch = styleName.match(/^(.+?)(?:ButtonForegroundStyle|Fg)$/);
      const upMatch = styleName.match(/^(.+?)(?:ButtonSwipeUpForegroundStyle|UpSwipeFg)$/);
      const downMatch = styleName.match(/^(.+?)(?:ButtonSwipeDownForegroundStyle|DownSwipeFg)$/);
      if (!baseMatch && !upMatch && !downMatch) {
        payload[styleName] = fallbackBackgroundStyle(styleName);
        continue;
      }
      const key = baseMatch?.[1] || upMatch?.[1] || downMatch?.[1] || '';
      const button = payload[`${key}Button`];
      const text = baseMatch
        ? fallbackTextForStyle(styleName, button)
        : upMatch
          ? actionDisplayText(button?.swipeUpAction)
          : actionDisplayText(button?.swipeDownAction);
      payload[styleName] = {
        buttonStyleType: 'text',
        center: baseMatch
          ? sharedCenter['26键中文前景偏移'] || sharedCenter['按键前景文字偏移'] || { x: 0.5, y: 0.5 }
          : sharedCenter[upMatch ? '上划文字偏移' : '下划文字偏移'] || { x: 0.5, y: upMatch ? 0.18 : 0.84 },
        fontSize: baseMatch ? sharedFontSize['按键前景文字大小'] || 14 : sharedFontSize[upMatch ? '上划文字大小' : '下划文字大小'] || 7,
        highlightColor: baseMatch ? keyTextColor : swipeTextColor,
        normalColor: baseMatch ? keyTextColor : swipeTextColor,
        text: text || '',
      };
    }
  };

  inferMissingButtonStyleTypes(payload);
  ensureCoreFallbackStyles();

  for (const [styleName, style] of Object.entries(payload)) {
    if (!isPlainObject(style)) continue;

    if (styleName === 'alphabeticBackgroundStyle' || [
      'qwBg',
      'erBg',
      'tyBg',
      'uiBg',
      'opBg',
      'asBg',
      'dfBg',
      'ghBg',
      'jkBg',
      'lBg',
      'zxBg',
      'cvBg',
      'bnBg',
      'mBg',
    ].includes(styleName)) {
      applySurfaceStyle(style, project.keyStyles?.surfaceStyles?.keyboard26?.normal);
      applyInsets(style, project.keyStyles?.buttonInsets?.keyboard26?.normal);
      style.normalColor = themeColors['字母键背景颜色-普通'] || style.normalColor;
      style.highlightColor = themeColors['字母键背景颜色-高亮'] || style.highlightColor;
      style.normalLowerEdgeColor = themeColors['底边缘颜色-普通'] || style.normalLowerEdgeColor;
      style.highlightLowerEdgeColor = themeColors['底边缘颜色-高亮'] || style.highlightLowerEdgeColor;
      style.borderColor = themeColors['按键边缘颜色'] || style.borderColor;
      continue;
    }

    if (styleName === 'systemButtonBackgroundStyle' || styleName === 'verticalCandidateButtonBackgroundStyle') {
      applySurfaceStyle(style, project.keyStyles?.surfaceStyles?.keyboard26?.functionKey);
      applyInsets(style, styleName === 'verticalCandidateButtonBackgroundStyle'
        ? project.keyStyles?.buttonInsets?.toolbar?.verticalCandidateFunction
        : project.keyStyles?.buttonInsets?.keyboard26?.functionKey);
      style.normalColor = themeColors['功能键背景颜色-普通'] || style.normalColor;
      style.highlightColor = themeColors['功能键背景颜色-高亮'] || style.highlightColor;
      style.normalLowerEdgeColor = themeColors['底边缘颜色-普通'] || style.normalLowerEdgeColor;
      style.highlightLowerEdgeColor = themeColors['底边缘颜色-高亮'] || style.highlightLowerEdgeColor;
      style.borderColor = themeColors['按键边缘颜色'] || style.borderColor;
      continue;
    }

    if (styleName === 'enterButtonBlueBackgroundStyle') {
      applySurfaceStyle(style, project.keyStyles?.surfaceStyles?.keyboard26?.enterAccent);
      applyInsets(style, project.keyStyles?.buttonInsets?.keyboard26?.enter || project.keyStyles?.buttonInsets?.keyboard26?.functionKey);
      style.normalColor = themeColors['enter键背景(蓝色)'] || style.normalColor;
      style.highlightColor = themeColors['enter键背景(蓝色)'] || style.highlightColor;
      delete style.normalLowerEdgeColor;
      delete style.highlightLowerEdgeColor;
      continue;
    }

    if (styleName === 'toolbarButtonBackgroundStyle') {
      applySurfaceStyle(style, project.keyStyles?.surfaceStyles?.toolbar?.functionKey);
      continue;
    }

    if (/^[a-z]ButtonForegroundStyle$/i.test(styleName)) {
      const keyId = styleName.slice(0, styleName.indexOf('ButtonForegroundStyle'));
      applyTextStyle(style, {
        fontSize: sharedFontSize['按键前景文字大小'],
        center: customCenters.keyboard26?.[keyId],
        normalColor: keyTextColor,
        highlightColor: keyTextColor,
      });
      if (keyboardName.startsWith('alphabetic_') && /^[a-z]$/.test(keyId)) {
        style.text = keyDisplays[`alphabetic.${keyId}`] || keyDisplays[`english.${keyId}`] || keyId;
      }
      if (keyboardName.startsWith('pinyin_26_') && /^[a-z]$/.test(keyId)) {
        style.text = keyDisplays[keyId] || keyId;
      }
      continue;
    }

    if (/^[a-z]Button(?:Uppercased|UppercasedState)ForegroundStyle$/i.test(styleName)) {
      const keyId = styleName
        .replace(/ButtonUppercasedStateForegroundStyle$/i, '')
        .replace(/ButtonUppercasedForegroundStyle$/i, '');
      applyTextStyle(style, {
        fontSize: sharedFontSize['按键前景文字大小'],
        center: customCenters.keyboard26?.[keyId],
        normalColor: keyTextColor,
        highlightColor: keyTextColor,
      });
      if (/^[a-z]$/i.test(keyId)) style.text = keyId.toUpperCase();
      continue;
    }

    if (/^[a-z]Button(?:Swipe)?UpForegroundStyle$/i.test(styleName)) {
      const keyId = styleName
        .replace(/ButtonSwipeUpForegroundStyle$/i, '')
        .replace(/ButtonUpForegroundStyle$/i, '');
      applyTextStyle(style, {
        fontSize: sharedFontSize['上划文字大小'],
        center: customCenters.keyboard26?.[keyId] || sharedCenter['上划文字偏移'],
        normalColor: swipeTextColor,
        highlightColor: swipeTextColor,
      });
      continue;
    }

    if (/^[a-z]Button(?:Swipe)?DownForegroundStyle$/i.test(styleName)) {
      const keyId = styleName
        .replace(/ButtonSwipeDownForegroundStyle$/i, '')
        .replace(/ButtonDownForegroundStyle$/i, '');
      applyTextStyle(style, {
        fontSize: sharedFontSize['下划文字大小'],
        center: customCenters.keyboard26?.[keyId] || sharedCenter['下划文字偏移'],
        normalColor: swipeTextColor,
        highlightColor: swipeTextColor,
      });
      continue;
    }

    if (/^number[0-9]Button(?:Swipe)?UpForegroundStyle$/i.test(styleName)) {
      const keyId = styleName
        .replace(/^number/i, '')
        .replace(/ButtonSwipeUpForegroundStyle$/i, '')
        .replace(/ButtonUpForegroundStyle$/i, '');
      applyTextStyle(style, {
        fontSize: sharedFontSize['上划文字大小'],
        center: customCenters.numeric?.[keyId] || sharedCenter['数字键盘上划文字偏移'],
        normalColor: swipeTextColor,
        highlightColor: swipeTextColor,
      });
      continue;
    }

    if (/^number[0-9]Button(?:Swipe)?DownForegroundStyle$/i.test(styleName)) {
      const keyId = styleName
        .replace(/^number/i, '')
        .replace(/ButtonSwipeDownForegroundStyle$/i, '')
        .replace(/ButtonDownForegroundStyle$/i, '');
      applyTextStyle(style, {
        fontSize: sharedFontSize['下划文字大小'],
        center: customCenters.numeric?.[keyId] || sharedCenter['数字键盘下划文字偏移'],
        normalColor: swipeTextColor,
        highlightColor: swipeTextColor,
      });
      continue;
    }

    if (styleName === 'cnenButtonForegroundStyle' || styleName === 'alphabeticButtonForegroundStyle') {
      syncChineseEnglishToggleButton(styleName === 'cnenButtonForegroundStyle' ? 'cnenButton' : 'alphabeticButton');
      continue;
    }

    if (/^enterButtonForegroundStyle/.test(styleName)) {
      applyTextStyle(style, {
        center: sharedCenter['功能键前景文字偏移'],
      });
      continue;
    }

    if (styleName === 'spaceButtonForegroundStyle') {
      applyTextStyle(style, {
        center: sharedCenter['功能键前景文字偏移'],
        normalColor: keyTextColor,
        highlightColor: keyTextColor,
      });
      continue;
    }

    if (/^toolbar.+ButtonForegroundStyle$/.test(styleName)) {
      const toolbarKey = styleName
        .replace(/^toolbar/, '')
        .replace(/ButtonForegroundStyle$/, '');
      const toolbarId = toolbarKey ? toolbarKey.charAt(0).toLowerCase() + toolbarKey.slice(1) : '';
      applyTextStyle(style, {
        fontSize: sharedFontSize['toolbar按键前景文字大小'],
        center: customCenters.toolbar?.[toolbarId] || sharedCenter['toolbar按键偏移'],
        normalColor: toolbarTextColor,
        highlightColor: toolbarTextColor,
      });
      applyImageStyle(style, {
        fontSize: project.toolbar?.iconFontSize || sharedFontSize['toolbar按键前景sf符号大小'],
        center: customCenters.toolbar?.[toolbarId] || sharedCenter['toolbar按键偏移'],
        normalColor: toolbarTextColor,
        highlightColor: toolbarTextColor,
      });
      continue;
    }

    if (styleName === 'candidateStyle') {
      style.textFontSize = sharedFontSize['未展开候选字体选中字体大小'] || style.textFontSize;
      style.indexFontSize = sharedFontSize['未展开候选字体选中字体大小'] || style.indexFontSize;
      style.commentFontSize = sharedFontSize['未展开comment字体大小'] || style.commentFontSize;
      style.textColor = themeColors['候选字体未选中字体颜色'] || style.textColor;
      style.indexColor = themeColors['候选字体未选中字体颜色'] || style.indexColor;
      style.commentColor = themeColors['候选字体未选中字体颜色'] || style.commentColor;
      style.preferredTextColor = themeColors['候选字体选中字体颜色'] || style.preferredTextColor;
      style.preferredIndexColor = themeColors['候选字体选中字体颜色'] || style.preferredIndexColor;
      style.preferredCommentColor = themeColors['候选字体选中字体颜色'] || style.preferredCommentColor;
      style.preferredBackgroundColor = themeColors['选中候选背景颜色'] || style.preferredBackgroundColor;
      continue;
    }
  }
  syncChineseEnglishToggleButton('cnenButton');
  syncChineseEnglishToggleButton('alphabeticButton');
  ensureBottomRowChineseEnglishToggle();
  ensureShiftHintSymbols();
  normalizeToolbarContainerStyle();
  ensureToolbarButtons();
  applyKeyboard26Metrics();
  stripSchemaNameOnSpaceWhenDisabled();
  applySwipeActions();
  applySpaceRightProfile();
  stripSwipeActionsWhenDisabled();
  stripPinyinVariantInteractionDecorations();
  preserveKeyboard26LegacySwipeReferences();
  if (!payload.alphabeticBackgroundStyle && isPlainObject(payload.cvBg)) {
    payload.alphabeticBackgroundStyle = structuredClone(payload.cvBg);
  }
  normalizePinyin9Payload();
  normalizeNumeric9Payload();
  applySymbolicStandardKeyConfig();
  normalizeIos14AlphabeticPayload();
  normalizePinyin14Payload();
  normalizePinyin17Payload();
  normalizePinyinVariantRowHeights();
  normalizePinyin18Payload();
  normalizeVariantEnterButton();
  normalizePinyinNumberButtonActions();
  applyPinyinVariantLetterCaseLabels();
  inferMissingButtonStyleTypes(payload);
  ensureCoreFallbackStyles();
  replaceMissingVariantImageForegrounds();
  ensureReferencedStyles();
  sanitizeLegacyNativeSeed(payload, { keyboardName });
  pruneMissingLayoutCells();
  normalizeLegacyStyleTypes(payload);
  inferMissingButtonStyleTypes(payload);
  cleanImageStyleNodes(payload);
  normalizeDecimalFractionStrings(payload);
  normalizeColorStrings(payload);
  return reorderTopLevelKeys(
    payload,
    [
      'cnenButton',
      'cnenButtonForegroundStyle',
      'keyboardBackgroundStyle',
      'alphabeticBackgroundStyle',
      'toolbarBackgroundStyle',
      'preeditBackgroundStyle',
      'shiftButtonHintSymbolsStyle',
      'shiftButtonHintSymbol0',
      'shiftButtonHintSymbol0ForegroundStyle',
    ],
    'keyboardLayout',
  );
}

export function buildSkinEffectModel(project, options = {}) {
  const theme = options.theme || 'light';
  const keyboardName = options.keyboardName || 'pinyin_26_portrait';
  return {
    version: 1,
    theme,
    keyboardName,
    nativePayload: buildEffectiveNativeKeyboardPayload(project, theme, keyboardName),
  };
}
