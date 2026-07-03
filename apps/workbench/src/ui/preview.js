import { renderSystemImageSvg } from '../../../../packages/preview-engine/index.js';
import { escapeHtml } from '../utils.js';
import {
  buildPreviewNativeKeyboardPayload,
  keyboard26PreviewTextCenter,
} from './preview-adapter.js';

const FUNCTION_KEYS = new Set(['shift', 'backspace', '123', 'cnen', 'enter', 'return', 'symbol', 'spaceRight', 'semicolon', 'word', 'mnemonic', 'reinput', 'punctuationColumn']);
const LETTER_KEYS = new Set('abcdefghijklmnopqrstuvwxyz'.split(''));
const PREVIEW_LOGICAL_SIZE = {
  portrait: { width: 393, displayWidth: 616 },
  landscape: { width: 784, displayWidth: 760 },
};
const PREVIEW_LOGICAL_WIDTH = PREVIEW_LOGICAL_SIZE.portrait.width;

const SYSTEM_IMAGE_BY_KEY = {
  shift: 'shift',
  backspace: 'delete.left',
  menu: 'gear',
  symbol: 'xmark.triangle.circle.square',
  translate: 'translate',
  emoji: 'face.smiling',
  phrase: 'list.bullet.clipboard',
  pasteboard: 'doc.on.clipboard',
  script: 'apple.terminal',
  close: 'keyboard.chevron.compact.down',
  pageUp: 'chevron.up',
  pageDown: 'chevron.down',
  lock: 'lock',
};
const PANEL_BUTTONS = [
  ['Hamster', 'keyboard', 'Script'],
  ['Switcher', 'switch.2', 'RimeSwitcher'],
  ['settings', 'slider.horizontal.3', 'KeyboardSetting'],
  ['Phrase', 'square.and.pencil', 'EmbeddedInputMode'],
  ['Finder', 'folder', 'FileManager'],
  ['HamsterSkin', 'tshirt', 'HamsterSetting'],
  ['Upload', 'rectangle.center.inset.filled.badge.plus', 'KeyboardPiP'],
  ['Deploy', 'command.circle', 'Deploy'],
  ['emoji', 'character.textbox', 'Simplified'],
  ['Lenovo', 'bolt.horizontal.circle', 'Lenovo'],
];

const TOOLBAR_ORDER = ['menu', 'symbol', 'translate', 'emoji', 'phrase', 'pasteboard', 'script', 'close'];
const TOOLBAR_PREVIEW_ICON_SCALE = 0.6;
const DEFAULT_NUMERIC_SYMBOLS = ['+', '-', '×', '/', '()', '.', '@', ',', '#', ':', '_', '?', '￥'];
const DEFAULT_NUMERIC_COLUMNS = [
  ['collection', 'symbol'],
  ['1', '4', '7', 'return'],
  ['2', '5', '8', '0'],
  ['3', '6', '9', 'space'],
  ['backspace', 'period', 'equal', 'enter'],
];
const DEFAULT_SYMBOLIC_FUNCTION_ROW = ['return', 'pageUp', 'pageDown', 'lock', 'backspace'];
const DEFAULT_PINYIN9_PUNCTUATION_ITEMS = ['，', '。', '？', '！'];
const PINYIN_VARIANT_ROWS = {
  '9': [
    ['punctuationColumn', 'number1', 'number2', 'number3', 'backspace'],
    ['punctuationColumn', 'number4', 'number5', 'number6', 'reinput'],
    ['punctuationColumn', 'number7', 'number8', 'number9'],
    ['symbol', '123', 'space', 'cnen', 'enter'],
  ],
  '14': [
    ['qw', 'er', 'ty', 'ui', 'op'],
    ['as', 'df', 'gh', 'jk', 'l'],
    ['shift', 'zx', 'cv', 'bn', 'm', 'backspace'],
    ['123', 'spaceRight', 'space', 'cnen', 'enter'],
  ],
  '17': [
    ['h', 's', 'z', 'b', 'x', 'm'],
    ['l', 'd', 'y', 'w', 'j', 'n'],
    ['c', 'q', 'g', 'f', 't', 'backspace'],
    ['123', 'spaceRight', 'space', 'cnen', 'enter'],
  ],
  '18': [
    ['q', 'we', 'rt', 'y', 'u', 'io', 'p'],
    ['a', 'sd', 'fg', 'h', 'jk', 'l'],
    ['word', 'z', 'xc', 'v', 'bn', 'm', 'backspace'],
    ['123', 'spaceRight', 'space', 'cnen', 'enter'],
  ],
};
const PINYIN_LANDSCAPE_VARIANT_ROWS = {
  '9': [
    ['punctuationColumn', 'number1', 'number2', 'number3', 'backspace'],
    ['punctuationColumn', 'number4', 'number5', 'number6', 'reinput'],
    ['punctuationColumn', 'number7', 'number8', 'number9', 'number0'],
    ['symbol', '123', 'space', 'cnen', 'enter'],
  ],
  '14': [
    ['qw', 'er', 'ty', 'number1', 'number2', 'number3', 'ty', 'ui', 'op'],
    ['as', 'df', 'gh', 'number4', 'number5', 'number6', 'gh', 'jk', 'l'],
    ['word', 'zx', 'cv', 'number7', 'number8', 'number9', 'bn', 'm', 'backspace'],
    ['symbol', 'semicolon', 'space', 'number0', 'space', 'cnen', 'enter'],
  ],
  '17': [
    ['h', 's', 'z', 'b', 'x', 'm'],
    ['l', 'd', 'y', 'w', 'j', 'n'],
    ['c', 'q', 'g', 'f', 't', 'backspace'],
    ['123', 'cnen', 'space', 'space', 'semicolon', 'enter'],
  ],
  '18': [
    ['q', 'we', 'rt', 'y', 'u', 'io', 'p'],
    ['a', 'sd', 'fg', 'h', 'jk', 'l'],
    ['word', 'z', 'xc', 'v', 'bn', 'm', 'backspace'],
    ['123', 'semicolon', 'space', 'cnen', 'enter'],
  ],
};
const PINYIN_VARIANT_LABELS = {
  h: 'HP',
  s: 'Sh',
  z: 'Zh',
  b: 'B',
  x: 'oXv',
  m: 'MS',
  l: 'L',
  d: 'D',
  y: 'Y',
  w: 'WZ',
  j: 'JK',
  n: 'NR',
  c: 'Ch',
  q: 'Q~',
  g: 'G',
  f: 'CF',
  t: 'T',
  number1: '1',
  number2: '2',
  number3: '3',
  number4: '4',
  number5: '5',
  number6: '6',
  number7: '7',
  number8: '8',
  number9: '9',
  number0: '0',
};

function pinyinLetterCase(project = {}) {
  return project.guide?.preferences?.pinyin26LetterCase === 'upper' ? 'upper' : 'lower';
}

function applyPinyinLetterCase(label = '', project = {}) {
  const text = String(label);
  return pinyinLetterCase(project) === 'upper' ? text.toUpperCase() : text.toLowerCase();
}

function pinyinVariantLettersLabel(key = '', project = {}) {
  return /^[a-z]{1,3}$/.test(key) ? applyPinyinLetterCase(key, project) : '';
}

const HINT_PREVIEW_CELL_HEIGHT = 52;
const HINT_PREVIEW_MIN_CELL_WIDTH = 46;
const HINT_PREVIEW_TEXT_CELL_WIDTH = 58;
const HINT_PREVIEW_LONG_TEXT_CELL_WIDTH = 72;
const CANDIDATES = [
  { index: 1, text: '的', comment: '' },
  { index: 2, text: '和', comment: '' },
  { index: 3, text: '是', comment: '' },
  { index: 4, text: '们', comment: '' },
  { index: 5, text: '作', comment: '' },
  { index: 6, text: '说', comment: '' },
  { index: 7, text: '在', comment: '' },
  { index: 8, text: '上', comment: '' },
];
const EXPANDED_CANDIDATES = [
  ['的', ''],
  ['和', ''],
  ['是', ''],
  ['们', ''],
  ['作', ''],
  ['说', ''],
  ['在', ''],
  ['上', ''],
  ['这', ''],
  ['可', ''],
  ['没', ''],
  ['个', ''],
  ['我', ''],
  ['自', ''],
  ['输', ''],
  ['皮', ''],
  ['预', ''],
  ['候', ''],
  ['键', ''],
  ['符', ''],
  ['数', ''],
  ['面', ''],
  ['展', ''],
  ['高', ''],
  ['间', ''],
  ['排', ''],
  ['效', ''],
  ['一', ''],
  ['调', ''],
  ['完', ''],
].map(([text, comment], index) => ({ index: index + 1, text, comment }));

function resolveColor(project, theme, key, fallback) {
  return project.theme?.[theme]?.colors?.[key] || fallback;
}

function resolveFontSize(project, key, fallback) {
  return project.theme?.shared?.fontSize?.[key] || fallback;
}

function resolveScale(project, key, fallback = 1) {
  const value = Number(project.theme?.shared?.scale?.[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolveCenter(project, key, fallback = { x: 0.5, y: 0.5 }) {
  const centerMap = project.theme?.shared?.center;
  if (centerMap && Object.prototype.hasOwnProperty.call(centerMap, key)) {
    return centerMap[key];
  }
  return fallback;
}

function resolveToolbarCenter(project, fallback = { x: 0.5, y: 0.6 }) {
  return resolveCenter(project, 'toolbar按键偏移',
    resolveCenter(project, 'toolbar按键文字偏移',
      resolveCenter(project, 'toolbar按键sf符号偏移', fallback)));
}

function buildEffectiveNativeKeyboardPayloadSafe(project, themeName, keyboardName, options = {}) {
  if (!keyboardName) return null;
  const cache = options.__nativePayloadCache;
  const cacheKey = `${themeName}:${keyboardName}:${options.calibrationMode ? 'calibration' : 'normal'}`;
  if (cache instanceof Map && cache.has(cacheKey)) {
    const cachedPayload = cache.get(cacheKey);
    return cachedPayload ? structuredClone(cachedPayload) : null;
  }
  const effectPayload = buildPreviewNativeKeyboardPayload(project, themeName, keyboardName, options);
  if (effectPayload && typeof effectPayload === 'object' && !Array.isArray(effectPayload)) {
    if (cache instanceof Map) cache.set(cacheKey, structuredClone(effectPayload));
    return structuredClone(effectPayload);
  }
  if (cache instanceof Map) cache.set(cacheKey, null);
  return null;
}

function frameForOrientation(project, theme = 'light', orientation = 'portrait', mode = 'keyboard26', options = {}) {
  const keyboardName = nativeKeyboardNameForPreview(project, mode, orientation, options);
  const nativePayload = keyboardName ? buildEffectiveNativeKeyboardPayloadSafe(project, theme, keyboardName, options) : null;
  if (nativePayload && typeof nativePayload === 'object' && !Array.isArray(nativePayload)) {
    return {
      preeditHeight: Number(nativePayload.preeditHeight || 0),
      toolbarHeight: Number(nativePayload.toolbarHeight || 41),
      keyboardHeight: Number(nativePayload.keyboardHeight || 216),
    };
  }
  const frame = project.keyboardFrame?.[orientation] || project.keyboardFrame?.portrait || {};
  return {
    preeditHeight: Number(frame.preeditHeight || 0),
    toolbarHeight: Number(frame.toolbarHeight || 41),
    keyboardHeight: Number(frame.keyboardHeight || 216),
  };
}

function resolveInsets(project, mode, key) {
  const insets = project.keyStyles?.buttonInsets || {};
  const customInsets = (group, targetKey) => {
    const items = insets[group] || {};
    if (items.mode === 'custom') {
      const customRule = (items.custom || []).find((rule) => (rule.keys || []).includes(targetKey));
      if (customRule?.insets) return customRule.insets;
    }
    return null;
  };
  if (mode === 'keyboard26') {
    const custom = customInsets('keyboard26', key);
    if (custom) return custom;
    if (FUNCTION_KEYS.has(key)) return insets.keyboard26?.functionKey || {};
    return insets.keyboard26?.normal || {};
  }
  if (mode === 'numeric') {
    const custom = customInsets('numeric', key);
    if (custom) return custom;
    if (/^\d$/.test(key)) return insets.numeric?.normal || {};
    return insets.numeric?.functionKey || insets.numeric?.normal || {};
  }
  if (mode === 'symbolic') {
    const custom = customInsets('symbolic', key);
    if (custom) return custom;
    return insets.symbolic?.functionKey || {};
  }
  if (mode === 'toolbar') {
    const custom = customInsets('toolbar', key);
    if (custom) return custom;
    if (key === 'menu') return insets.toolbar?.menu || {};
    return {};
  }
  return insets.panel?.normal || {};
}

function layerStyles(project, theme, options = {}) {
  const keyText = resolveColor(project, theme, '按键前景颜色', theme === 'dark' ? '#ffffff' : '#000000');
  const swipeText = resolveColor(project, theme, '划动字符颜色', theme === 'dark' ? '#b6b7b9' : '#838383ff');
  const toolbarText = resolveColor(project, theme, 'toolbar按键颜色', theme === 'dark' ? '#e5e5e5' : '#4a4a4a');
  const candidateText = resolveColor(project, theme, '候选字体未选中字体颜色', '#000000');
  const preferredCandidateText = resolveColor(project, theme, '候选字体选中字体颜色', theme === 'dark' ? '#ffffff' : '#000000');
  const keyboardPreviewBackground = solidPreviewColor(
    resolveColor(project, theme, '键盘背景颜色', theme === 'dark' ? '#474747' : '#E1E2E7'),
    theme === 'dark' ? '#474747' : '#E1E2E7',
  );
  const fallbackNativePayload = buildEffectiveNativeKeyboardPayloadSafe(project, theme, 'pinyin_26_portrait', options) || {};
  const nativeStyle = (styleName, fallback) => {
    const style = fallbackNativePayload[styleName];
    return style && typeof style === 'object' && !Array.isArray(style) ? style : fallback;
  };
  const keyboardBackgroundStyle = fallbackNativePayload.keyboardBackgroundStyle || {
    buttonStyleType: 'geometry',
    normalColor: keyboardPreviewBackground,
  };
  const surfaceStyle = (group, key, fallback = {}) => ({
    ...fallback,
    ...(project.keyStyles?.surfaceStyles?.[group]?.[key] || {}),
  });
  const keySurfaceStyle = (key, fallback = {}) => surfaceStyle('keyboard26', key, {
    cornerRadius: 8.5,
    borderSize: 0,
    shadowRadius: 0,
    shadowOpacity: 0,
    shadowOffset: { x: 0, y: 0 },
    ...fallback,
  });

  return {
    keyboardStyle: {
      backgroundStyle: 'keyboardBackgroundStyle',
      insets: project.keyStyles?.buttonInsets?.keyboard26?.container || { top: 3, left: 4, bottom: 3, right: 4 },
    },
    previewBackgroundColor: keyboardPreviewBackground,
    keyboardBackgroundStyle,
    alphabeticBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.keyboard26?.normal || {},
      ...keySurfaceStyle('normal'),
      normalColor: resolveColor(project, theme, '字母键背景颜色-普通', theme === 'dark' ? '#3A3A3C' : '#ffffff'),
      highlightColor: resolveColor(project, theme, '字母键背景颜色-高亮', '#abb0ba'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      highlightLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-高亮', 'rgba(0,0,0,.18)'),
      borderColor: resolveColor(project, theme, '按键边缘颜色', 'transparent'),
    },
    systemButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.keyboard26?.functionKey || {},
      ...keySurfaceStyle('functionKey'),
      normalColor: resolveColor(project, theme, '功能键背景颜色-普通', theme === 'dark' ? '#3A3A3C' : '#BDC1CC'),
      highlightColor: resolveColor(project, theme, '功能键背景颜色-高亮', '#ffffffE6'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      highlightLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-高亮', 'rgba(0,0,0,.18)'),
      borderColor: resolveColor(project, theme, '按键边缘颜色', 'transparent'),
    },
    numberButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: resolveInsets(project, 'numeric', '1'),
      ...keySurfaceStyle('normal'),
      normalColor: resolveColor(project, theme, '字母键背景颜色-普通', theme === 'dark' ? '#3A3A3C' : '#ffffff'),
      highlightColor: resolveColor(project, theme, '字母键背景颜色-高亮', '#abb0ba'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      highlightLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-高亮', 'rgba(0,0,0,.18)'),
    },
    numericSystemButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.numeric?.functionKey || {},
      ...keySurfaceStyle('functionKey'),
      normalColor: resolveColor(project, theme, '功能键背景颜色-普通', theme === 'dark' ? '#3A3A3C' : '#BDC1CC'),
      highlightColor: resolveColor(project, theme, '功能键背景颜色-高亮', '#ffffffE6'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      highlightLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-高亮', 'rgba(0,0,0,.18)'),
    },
    numericCollectionBackgroundStyle: {
      ...keySurfaceStyle('functionKey'),
      insets: resolveInsets(project, 'keyboard26', 'punctuationColumn'),
      normalColor: resolveColor(project, theme, '功能键背景颜色-普通', theme === 'dark' ? '#3A3A3C' : '#BDC1CC'),
      highlightColor: resolveColor(project, theme, '功能键背景颜色-高亮', '#ffffffE6'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      highlightLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-高亮', 'rgba(0,0,0,.18)'),
      borderColor: resolveColor(project, theme, '按键边缘颜色', 'transparent'),
    },
    numericCollectionCellBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: resolveInsets(project, 'numeric', 'collectionCell'),
      cornerRadius: 0,
      normalColor: '#ffffff00',
      highlightColor: '#ffffff00',
    },
    enterButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: resolveInsets(project, 'keyboard26', 'enter'),
      ...keySurfaceStyle('enterAccent'),
      normalColor: resolveColor(project, theme, 'enter键背景(蓝色)', '#1162ff'),
      highlightColor: resolveColor(project, theme, 'enter键背景(蓝色)', '#1162ff'),
      borderColor: 'rgba(0,0,0,0.08)',
    },
    toolbarBackgroundStyle: nativeStyle('toolbarBackgroundStyle', {
      buttonStyleType: 'geometry',
      normalColor: keyboardPreviewBackground,
    }),
    toolbarButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      ...surfaceStyle('toolbar', 'functionKey', {
        cornerRadius: 7,
        borderSize: 0,
        shadowRadius: 0,
        shadowOpacity: 0,
        shadowOffset: { x: 0, y: 0 },
      }),
      normalColor: resolveColor(project, theme, '功能键背景颜色-普通', theme === 'dark' ? '#3A3A3C' : '#BDC1CC'),
      highlightColor: resolveColor(project, theme, '功能键背景颜色-高亮', '#ffffffE6'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      highlightLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-高亮', 'rgba(0,0,0,.18)'),
      borderColor: resolveColor(project, theme, '按键边缘颜色', 'transparent'),
    },
    verticalCandidateBackgroundStyle: nativeStyle('verticalCandidateBackgroundStyle', {
      buttonStyleType: 'geometry',
      normalColor: keyboardPreviewBackground,
      cornerRadius: 0,
    }),
    verticalCandidateButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.toolbar?.verticalCandidates?.functionInsets
        || project.keyStyles?.buttonInsets?.toolbar?.verticalCandidateFunction
        || {},
      ...surfaceStyle('toolbar', 'verticalCandidateFunction', {
        cornerRadius: 7,
        borderSize: 0,
        shadowRadius: 0,
        shadowOpacity: 0,
        shadowOffset: { x: 0, y: 0 },
      }),
      normalColor: resolveColor(project, theme, '功能键背景颜色-普通', theme === 'dark' ? '#3A3A3C' : '#BDC1CC'),
      highlightColor: resolveColor(project, theme, '功能键背景颜色-高亮', '#ffffffE6'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      borderColor: resolveColor(project, theme, '按键边缘颜色', 'transparent'),
    },
    keyForegroundStyle: {
      buttonStyleType: 'text',
      center: options.calibrationMode
        ? resolveCenter(project, '26键中文前景偏移', { x: 0.5, y: 0.5 })
        : keyboard26PreviewTextCenter(resolveCenter(project, '26键中文前景偏移', { x: 0.5, y: 0.54 })),
      fontSize: resolveFontSize(project, '按键前景文字大小', 18),
      previewFontScale: options.calibrationMode ? 1 : resolveScale(project, '26键中文前景缩放', 1),
      normalColor: keyText,
      className: options.calibrationMode ? 'is-calibration-main' : '',
    },
    functionForegroundStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '功能键前景文字偏移', { x: 0.5, y: 0.47 }),
      fontSize: resolveFontSize(project, '按键前景sf符号大小', 18),
      previewFontScale: 0.68,
      normalColor: keyText,
    },
    spaceForegroundStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '功能键前景文字偏移', { x: 0.5, y: 0.47 }),
      fontSize: resolveFontSize(project, '按键前景sf符号大小', 18),
      previewFontScale: 0.68,
      normalColor: keyText,
    },
    spaceRightPrimaryForegroundStyle: {
      buttonStyleType: 'text',
      center: project.keyboards?.keyboard26?.spaceRight?.pinyin?.primary?.center || { x: 0.64, y: 0.45 },
      fontSize: resolveFontSize(project, '按键前景文字大小', 18),
      previewFontScale: 0.62,
      normalColor: keyText,
    },
    spaceRightSecondaryForegroundStyle: {
      buttonStyleType: 'text',
      center: project.keyboards?.keyboard26?.spaceRight?.pinyin?.secondary?.center || { x: 0.6, y: 0.3 },
      fontSize: resolveFontSize(project, '按键前景sf符号大小', 16),
      previewFontScale: 0.62,
      normalColor: keyText,
    },
    numericNumberForegroundStyle: {
      buttonStyleType: 'text',
      center: { x: 0.5, y: 0.53 },
      fontSize: Math.max(21, resolveFontSize(project, '按键前景文字大小', 18) + 2),
      previewFontScale: 0.9,
      normalColor: keyText,
    },
    numericTextForegroundStyle: {
      buttonStyleType: 'text',
      center: { x: 0.5, y: 0.53 },
      fontSize: Math.max(14, resolveFontSize(project, '按键前景sf符号大小', 18) - 3),
      previewFontScale: 0.78,
      normalColor: keyText,
    },
    numericPeriodForegroundStyle: {
      buttonStyleType: 'text',
      center: { x: 0.5, y: 0.53 },
      fontSize: Math.max(18, resolveFontSize(project, '按键前景文字大小', 18)),
      previewFontScale: 0.9,
      normalColor: keyText,
    },
    numericIconForegroundStyle: {
      buttonStyleType: 'systemImage',
      center: { x: 0.5, y: 0.53 },
      fontSize: Math.max(17, resolveFontSize(project, '按键前景sf符号大小', 18) - 1),
      previewFontScale: 0.78,
      normalColor: keyText,
    },
    numericCollectionForegroundStyle: {
      buttonStyleType: 'text',
      center: { x: 0.5, y: 0.53 },
      fontSize: Math.max(14, resolveFontSize(project, '按键前景sf符号大小', 18) - 2),
      previewFontScale: 0.78,
      normalColor: keyText,
    },
    symbolicCategoryCollectionBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: resolveInsets(project, 'symbolic', 'categoryCollection'),
      ...surfaceStyle('symbolic', 'categoryCollection', {
        cornerRadius: 7,
        borderSize: 0,
        shadowRadius: 0,
        shadowOpacity: 0,
        shadowOffset: { x: 0, y: 0 },
      }),
      normalColor: resolveColor(project, theme, '符号键盘左侧collection背景颜色', '#BDC1CC'),
      normalLowerEdgeColor: resolveColor(project, theme, '符号键盘左侧collection背景下边缘颜色', 'rgba(0,0,0,.18)'),
    },
    symbolicCategoryCellBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: resolveInsets(project, 'symbolic', 'categoryCell'),
      cornerRadius: 7,
      normalColor: '#00000000',
      highlightColor: resolveColor(project, theme, '字母键背景颜色-普通', '#ffffff'),
    },
    symbolicCategoryForegroundStyle: {
      buttonStyleType: 'text',
      center: { x: 0.5, y: 0.5 },
      fontSize: resolveFontSize(project, '符号键盘左侧collection前景字体大小', 13),
      normalColor: resolveColor(project, theme, '列表未选中字体颜色', keyText),
    },
    symbolicDescriptionCollectionBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: resolveInsets(project, 'symbolic', 'descriptionCollection'),
      ...surfaceStyle('symbolic', 'descriptionCollection', {
        cornerRadius: 7,
        borderSize: 0,
        shadowRadius: 0,
        shadowOpacity: 0,
        shadowOffset: { x: 0, y: 0 },
      }),
      normalColor: resolveColor(project, theme, '符号键盘右侧collection背景颜色', '#ffffff'),
      normalLowerEdgeColor: resolveColor(project, theme, '符号键盘右侧collection背景下边缘颜色', 'rgba(0,0,0,.18)'),
    },
    symbolicDescriptionForegroundStyle: {
      buttonStyleType: 'text',
      center: { x: 0.5, y: 0.5 },
      fontSize: resolveFontSize(project, '符号键盘右侧collection前景字体大小', 16),
      normalColor: resolveColor(project, theme, '列表未选中字体颜色', keyText),
    },
    symbolicFunctionButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.symbolic?.functionKey || {},
      ...surfaceStyle('symbolic', 'functionKey', keySurfaceStyle('functionKey')),
      normalColor: resolveColor(project, theme, '功能键背景颜色-普通', theme === 'dark' ? '#3A3A3C' : '#BDC1CC'),
      highlightColor: resolveColor(project, theme, '功能键背景颜色-高亮', '#ffffffE6'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      borderColor: resolveColor(project, theme, '按键边缘颜色', 'transparent'),
    },
    symbolicTextForegroundStyle: {
      buttonStyleType: 'text',
      center: { x: 0.5, y: 0.5 },
      fontSize: Math.max(12, resolveFontSize(project, '按键前景文字大小', 18) - 3),
      normalColor: keyText,
    },
    symbolicIconForegroundStyle: {
      buttonStyleType: 'systemImage',
      center: {
        x: project.keyboards?.symbolic?.text?.iconCenter?.x ?? 0.5,
        y: project.keyboards?.symbolic?.text?.iconCenter?.y ?? 0.53,
      },
      fontSize: resolveFontSize(project, '按键前景sf符号大小', 15),
      normalColor: keyText,
    },
    panelKeyboardBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.panel?.frame || {},
      cornerRadius: project.keyboardFrame?.panel?.cornerRadius ?? 15,
      normalColor: keyboardPreviewBackground,
    },
    panelButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.panel?.normal || {},
      ...surfaceStyle('panel', 'normal', {
        cornerRadius: 7,
        borderSize: 0,
        shadowRadius: 0,
        shadowOpacity: 0,
        shadowOffset: { x: 0, y: 0 },
      }),
      normalColor: resolveColor(project, theme, '字母键背景颜色-普通', '#ffffff'),
      highlightColor: resolveColor(project, theme, '字母键背景颜色-高亮', '#abb0ba'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      highlightLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-高亮', 'rgba(0,0,0,.18)'),
      borderColor: resolveColor(project, theme, '按键边缘颜色', 'transparent'),
    },
    panelIconForegroundStyle: {
      buttonStyleType: 'systemImage',
      center: resolveCenter(project, 'panel键盘按键sf符号前景偏移', { x: 0.5, y: 0.4 }),
      fontSize: resolveFontSize(project, 'panel按键前景sf符号大小', 16),
      normalColor: keyText,
    },
    panelTextForegroundStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, 'panel键盘按键文字前景偏移', { x: 0.5, y: 0.7 }),
      fontSize: resolveFontSize(project, 'panel按键前景文字大小', 12),
      normalColor: keyText,
    },
    enterForegroundStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '功能键前景文字偏移', { x: 0.5, y: 0.47 }),
      fontSize: resolveFontSize(project, '按键前景sf符号大小', 15),
      normalColor: '#ffffff',
    },
    swipeUpForegroundStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '上划文字偏移', { x: 0.5, y: 0.24 }),
      fontSize: resolveFontSize(project, '上划文字大小', 9),
      normalColor: swipeText,
    },
    swipeDownForegroundStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '下划文字偏移', { x: 0.5, y: 0.76 }),
      fontSize: resolveFontSize(project, '下划文字大小', 9),
      normalColor: swipeText,
    },
    toolbarForegroundStyle: {
      buttonStyleType: 'systemImage',
      center: resolveToolbarCenter(project),
      fontSize: project.toolbar?.iconFontSize || resolveFontSize(project, 'toolbar按键前景sf符号大小', 16),
      previewFontScale: 1.08,
      normalColor: toolbarText,
    },
    verticalCandidateIconStyle: {
      buttonStyleType: 'systemImage',
      center: {
        x: project.toolbar?.verticalCandidateIconCenter?.x ?? 0.5,
        y: project.toolbar?.verticalCandidateIconCenter?.y ?? 0.53,
      },
      fontSize: 17,
      normalColor: keyText,
    },
    verticalCandidateReturnStyle: {
      buttonStyleType: 'text',
      center: { x: 0.5, y: 0.5 },
      fontSize: 15,
      normalColor: keyText,
    },
    candidateStyle: {
      textColor: candidateText,
      indexColor: candidateText,
      commentColor: candidateText,
      preferredTextColor: preferredCandidateText,
      preferredIndexColor: preferredCandidateText,
      preferredCommentColor: preferredCandidateText,
      backgroundColor: 'transparent',
      preferredBackgroundColor: resolveColor(project, theme, '选中候选背景颜色', theme === 'dark' ? '#5f5f5f' : '#ffffff'),
      textFontSize: resolveFontSize(project, '未展开候选字体选中字体大小', 17),
      indexFontSize: resolveFontSize(project, '未展开候选字体选中字体大小', 17),
      commentFontSize: resolveFontSize(project, '未展开comment字体大小', 12),
      insets: { top: 4, right: 1, bottom: 4, left: 1 },
      selectedPadding: { top: 6, right: 14, bottom: 6, left: 14 },
      selectedCornerRadius: 10,
    },
    verticalCandidateCellStyle: {
      textColor: candidateText,
      indexColor: candidateText,
      commentColor: candidateText,
      preferredTextColor: preferredCandidateText,
      preferredIndexColor: preferredCandidateText,
      preferredCommentColor: preferredCandidateText,
      backgroundColor: 'transparent',
      preferredBackgroundColor: resolveColor(project, theme, '选中候选背景颜色', theme === 'dark' ? '#d1d1d165' : '#ffffff'),
      textFontSize: resolveFontSize(project, '展开候选字体选中字体大小', 15),
      indexFontSize: resolveFontSize(project, '展开候选字体选中字体大小', 15),
      commentFontSize: resolveFontSize(project, '展开comment字体大小', 14),
      insets: { top: 6, left: 6, bottom: 6, right: 6 },
      selectedPadding: { top: 5, right: 10, bottom: 5, left: 10 },
      selectedCornerRadius: 10,
    },
    hintBackgroundStyle: nativeStyle('alphabeticHintSymbolsBackgroundStyle', {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.hint?.symbols || {},
      ...surfaceStyle('hint', 'bubble', {
        cornerRadius: 12,
        borderSize: 0.5,
        shadowRadius: 10,
        shadowOpacity: 1,
        shadowOffset: { x: 0, y: 3 },
      }),
      normalColor: resolveColor(project, theme, '长按背景颜色', theme === 'dark' ? '#6b6b6b' : '#ffffff'),
      borderColor: resolveColor(project, theme, '气泡边缘颜色', '#606060'),
      normalShadowColor: resolveColor(project, theme, '长按背景阴影颜色', 'rgba(0,0,0,.18)'),
    }),
    pressedBubbleBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.hint?.symbols || {},
      ...surfaceStyle('hint', 'bubble', {
        cornerRadius: 12,
        borderSize: 0.5,
        shadowRadius: 10,
        shadowOpacity: 1,
        shadowOffset: { x: 0, y: 3 },
      }),
      normalColor: resolveColor(project, theme, '气泡背景颜色', theme === 'dark' ? '#6b6b6b' : '#ffffff'),
      highlightColor: resolveColor(project, theme, '气泡高亮颜色', '#0279FE'),
      borderColor: resolveColor(project, theme, '气泡边缘颜色', '#606060'),
      normalShadowColor: resolveColor(project, theme, '长按背景阴影颜色', 'rgba(0,0,0,.18)'),
    },
    hintSelectedBackgroundStyle: nativeStyle('alphabeticHintSymbolsSelectedStyle', {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.hint?.selectedBackground || {},
      ...surfaceStyle('hint', 'selectedBackground', {
        cornerRadius: 9,
        borderSize: 0,
        shadowRadius: 0,
        shadowOpacity: 0,
        shadowOffset: { x: 0, y: 0 },
      }),
      normalColor: resolveColor(project, theme, '长按选中背景颜色', '#007aff'),
    }),
    hintTextStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '长按气泡文字偏移', { x: 0.5, y: 0.5 }),
      fontSize: resolveFontSize(project, '长按气泡文字大小', 20),
      normalColor: resolveColor(project, theme, '长按非选中字体颜色', keyText),
    },
    hintSelectedTextStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '长按气泡文字偏移', { x: 0.5, y: 0.5 }),
      fontSize: resolveFontSize(project, '长按气泡文字大小', 20),
      normalColor: resolveColor(project, theme, '长按选中字体颜色', '#ffffff'),
    },
    hintIconStyle: {
      buttonStyleType: 'systemImage',
      center: resolveCenter(project, '长按气泡sf符号偏移', { x: 0.5, y: 0.42 }),
      fontSize: resolveFontSize(project, '长按气泡sf符号大小', 12),
      normalColor: resolveColor(project, theme, '长按非选中字体颜色', keyText),
    },
    hintSelectedIconStyle: {
      buttonStyleType: 'systemImage',
      center: resolveCenter(project, '长按气泡sf符号偏移', { x: 0.5, y: 0.42 }),
      fontSize: resolveFontSize(project, '长按气泡sf符号大小', 12),
      normalColor: resolveColor(project, theme, '长按选中字体颜色', '#ffffff'),
    },
    pressedBubbleTextStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '按下气泡文字偏移', { x: 0.5, y: 0.6 }),
      fontSize: resolveFontSize(project, '划动气泡前景文字大小', 28),
      previewFontScale: 0.72,
      normalColor: resolveColor(project, theme, '按下气泡文字颜色', keyText),
    },
  };
}

function cssColor(value, fallback = 'transparent') {
  if (value === 0 || value === '0') return 'transparent';
  if (!value) return fallback;
  if (typeof value === 'string' && /^[0-9a-fA-F]{8}$/.test(value)) return `#${value}`;
  return value;
}

function cssShadowColor(value, opacity = 1, fallback = 'transparent') {
  const color = cssColor(value, fallback);
  if (typeof color !== 'string' || !color.startsWith('#')) return color;
  const hex = color.slice(1);
  const expanded = hex.length === 3 || hex.length === 4
    ? hex.split('').map((item) => item + item).join('')
    : hex;
  if (![6, 8].includes(expanded.length)) return color;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  const finalAlpha = Math.max(0, Math.min(1, alpha * opacity));
  return `rgba(${r}, ${g}, ${b}, ${finalAlpha})`;
}

function solidPreviewColor(value, fallback) {
  if (typeof value !== 'string') return value || fallback;
  const hex = value.trim();
  const match = hex.match(/^#?([0-9a-fA-F]{8})$/);
  if (!match) return value || fallback;
  const alpha = Number.parseInt(match[1].slice(6, 8), 16);
  return alpha <= 2 ? fallback : value;
}

function cssInsets(insets = {}) {
  return `${Number(insets.top || 0)}px ${Number(insets.right || 0)}px ${Number(insets.bottom || 0)}px ${Number(insets.left || 0)}px`;
}

function parseFraction(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.includes('/')) {
    const [left, right] = value.split('/').map(Number);
    if (Number.isFinite(left) && Number.isFinite(right) && right !== 0) return left / right;
  }
  return null;
}

function sizeRatio(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'object' && Number.isFinite(value.percentage)) return value.percentage;
  return parseFraction(value);
}

function geometryCss(style = {}) {
  const rawLowerEdge = style.normalLowerEdgeColor || style.highlightLowerEdgeColor;
  const lowerEdge = rawLowerEdge ? cssColor(rawLowerEdge) : null;
  const shadowOpacity = Number.isFinite(Number(style.shadowOpacity)) ? Number(style.shadowOpacity) : 1;
  const shadowColor = style.normalShadowColor ? cssShadowColor(style.normalShadowColor, shadowOpacity) : null;
  const shadowOffsetX = Number(style.shadowOffset?.x ?? 0);
  const shadowOffsetY = Number(style.shadowOffset?.y ?? 2);
  const shadowRadius = Number(style.shadowRadius ?? 4);
  const shadows = [
    lowerEdge ? `inset 0 -1.5px ${lowerEdge}` : '',
    shadowColor && shadowOpacity > 0 ? `${shadowOffsetX}px ${shadowOffsetY}px ${shadowRadius}px ${shadowColor}` : '',
  ].filter(Boolean).join(',');
  return [
    `background:${cssColor(style.normalColor)}`,
    `border-radius:${Number(style.cornerRadius ?? 0)}px`,
    `border:${Number(style.borderSize || 0)}px solid ${cssColor(style.borderColor)}`,
    shadows ? `box-shadow:${shadows}` : '',
  ].join(';');
}

function nativeKeyboardNameForPreview(project, mode, orientation = 'portrait', options = {}) {
  if (mode === 'numeric') {
    const source = options.previewSourceName || '';
    if (/^numeric_[^/]+_(portrait|landscape)$/.test(source)) return source;
    const variant = project.keyboardCombo?.slots?.numeric?.variant === 'ios' ? 'numeric_ios' : 'numeric_9';
    return `${variant}_${orientation}`;
  }
  if (mode === 'keyboard26') {
    const source = options.previewSourceName || '';
    if (/^(pinyin|alphabetic)_[^/]+_(portrait|landscape)$/.test(source)) return source;
    const variant = activePinyinVariantForPreview(project, options);
    return `pinyin_${variant}_${orientation}`;
  }
  if (mode === 'symbolic') return `symbolic_${orientation}`;
  if (mode === 'emoji') return `emoji_${orientation}`;
  if (mode === 'panel') return `panel_${orientation}`;
  return null;
}

function nativePreviewConditionState(options = {}) {
  const numericReturnKeyType = Number(options.returnKeyType);
  const rimeOptions = options.rimeOptions && typeof options.rimeOptions === 'object' ? options.rimeOptions : {};
  return {
    '$returnKeyType': Number.isFinite(numericReturnKeyType) ? numericReturnKeyType : 7,
    '$symbolicKeyboardLockState': options.symbolicKeyboardLockState === true,
    'rime$simplification': rimeOptions.simplification === true,
  };
}

function normalizeNativeStyleRefs(ref) {
  if (Array.isArray(ref)) return ref;
  return ref === undefined || ref === null ? [] : [ref];
}

function nativeConditionMatches(expected, actual) {
  if (Array.isArray(expected)) return expected.some((item) => nativeConditionMatches(item, actual));
  if (typeof expected === 'boolean' || typeof actual === 'boolean') return Boolean(expected) === Boolean(actual);
  const expectedNumber = Number(expected);
  const actualNumber = Number(actual);
  if (Number.isFinite(expectedNumber) && Number.isFinite(actualNumber)) return expectedNumber === actualNumber;
  return String(expected) === String(actual);
}

function resolveNativeStyleEntry(entry, conditionState = {}) {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return null;
  if (entry.conditionKey) {
    const actual = conditionState[entry.conditionKey];
    if (!nativeConditionMatches(entry.conditionValue, actual)) return null;
  }
  return typeof entry.styleName === 'string' ? entry.styleName : entry;
}

function resolveNativeStyleObjects(payload = {}, ref, options = {}) {
  const conditionState = nativePreviewConditionState(options);
  return normalizeNativeStyleRefs(ref)
    .map((entry) => resolveNativeStyleEntry(entry, conditionState))
    .map((entry) => (typeof entry === 'string' ? payload[entry] : entry))
    .filter((entry) => entry && typeof entry === 'object');
}

function resolveNativeStyleObject(payload = {}, ref, options = {}, fallback = {}) {
  return resolveNativeStyleObjects(payload, ref, options)[0] || fallback;
}

function nativeForegroundRefs(button = {}, key = '', options = {}) {
  return normalizeNativeStyleRefs(button.foregroundStyle);
}

function nativeShiftedForegroundContent(key = '', styleName = '', content = '') {
  if (!/^[a-z]$/.test(key)) return content;
  if (!new RegExp(`^${key}ButtonForegroundStyle$`, 'i').test(styleName)) return content;
  return typeof content === 'string' && content.length === 1 ? content.toUpperCase() : content;
}

function schemaNameForeground(project, theme) {
  const schemaName = project.keyboards?.keyboard26?.pinyinSchemaName;
  const schemaNameText = String(schemaName?.text || '').trim();
  if (!schemaName || !schemaNameText) return '';
  return renderForeground({
    buttonStyleType: 'text',
    center: schemaName.center || { x: 0.17, y: 0.2 },
    fontSize: resolveFontSize(project, '方案名字号', Number(schemaName.fontSize || 8)),
    normalColor: resolveColor(
      project,
      theme,
      '方案名颜色',
      resolveColor(project, theme, schemaName.colorKey || '划动字符颜色', '#838383ff'),
    ),
  }, schemaNameText, { project, theme });
}

function nativeForegrounds(project, theme, payload = {}, buttonName = '', options = {}) {
  const button = payload[buttonName] || {};
  const key = nativeCellKey(buttonName);
  const refs = nativeForegroundRefs(button, key, options);
  const foregrounds = refs.map((ref) => {
    const resolvedRef = resolveNativeStyleEntry(ref, nativePreviewConditionState(options));
    const style = typeof resolvedRef === 'string' ? payload[resolvedRef] : resolvedRef;
    if (!style || typeof style !== 'object') return '';
    const content = style.systemImageName
      || style.assetImageName
      || style.text
      || style.normalImage?.file
      || style.highlightImage?.file;
    const isSchemaNamePlaceholder = typeof content === 'string' && /^\$rimeSchemaName$/i.test(content.trim());
    const shouldShowSchemaName = project.keyboardCombo?.spaceRow?.showSchemaNameOnSpace === true;
    if (isSchemaNamePlaceholder && !shouldShowSchemaName) return '';
    const styleName = typeof resolvedRef === 'string' ? resolvedRef : '';
    const previewStyle = buttonName.startsWith('toolbar') && styleDisplayType(style) === 'systemImage'
      ? { ...style, previewFontScale: TOOLBAR_PREVIEW_ICON_SCALE }
      : style;
    const displayContent = options.shiftActive
      ? nativeShiftedForegroundContent(key, styleName, content)
      : content;
    return renderForeground(previewStyle, displayContent, { project, theme, active: options.activePressedKey === key });
  });
  if (
    key === 'space'
    && project.keyboardCombo?.spaceRow?.showSchemaNameOnSpace === true
    && activePinyinVariantForPreview(project, options) === '26'
  ) {
    foregrounds.push(schemaNameForeground(project, theme));
  }
  return foregrounds.join('');
}

function nativeCellKey(cellName = '') {
  const aliases = {
    alphabeticButton: 'cnen',
    numericButton: '123',
  };
  if (aliases[cellName]) return aliases[cellName];
  if (/^toolbar[A-Z]/.test(cellName) && cellName.endsWith('Button')) {
    const raw = cellName.slice('toolbar'.length, -'Button'.length);
    return raw ? raw.charAt(0).toLowerCase() + raw.slice(1) : cellName;
  }
  return cellName.endsWith('Button') ? cellName.slice(0, -'Button'.length) : cellName;
}

function nativePayloadForPreview(project, theme, mode, options = {}) {
  const orientation = previewOrientation(options);
  const keyboardName = nativeKeyboardNameForPreview(project, mode, orientation, options);
  if (!keyboardName) return null;
  const payload = buildEffectiveNativeKeyboardPayloadSafe(project, theme, keyboardName, options);
  if (!payload) return null;
  return {
    orientation,
    keyboardName,
    payload,
  };
}

function renderNativeCollectionCell(project, theme, payload, cellName, width, height, className = '', options = {}) {
  const collection = payload[cellName] || {};
  const cellStyle = resolveNativeStyleObject(payload, collection.cellStyle, options);
  const foregroundStyle = resolveNativeStyleObject(payload, cellStyle.foregroundStyle, options);
  const backgroundStyle = resolveNativeStyleObject(payload, collection.backgroundStyle, options);
  const categorySource = Array.isArray(payload.category) ? payload.category : [];
  const fallbackCategory = categorySource[0] || Object.keys(payload || {}).find((key) => key !== 'category' && Array.isArray(payload[key]));
  const selectedCategory = categorySource.includes(options.symbolicCategory) ? options.symbolicCategory : fallbackCategory;
  const sourceKey = collection.dataSource || (cellName === 'descriptionCollection' ? selectedCategory : null);
  const source = sourceKey ? payload[sourceKey] || [] : [];
  const items = Array.isArray(source)
    ? source
    : Object.keys(source || {}).filter((key) => key !== 'category');
  const visibleItems = items.slice(0, cellName === 'categoryCollection' ? 8 : 24);
  const columns = cellName === 'descriptionCollection' ? 5 : 1;
  const rowHeight = cellName === 'descriptionCollection' ? 28 : 31;
  return `
    <div class="calayer-cell is-${escapeHtml(cellName)} is-native-collection ${className}" style="width:${width}px;height:${height}px">
      <div class="calayer-visible">
        ${renderBackgroundLayer(project, theme, backgroundStyle)}
        <div class="native-collection-grid" style="${insetPositionCss(backgroundStyle.insets)};grid-template-columns:repeat(${columns}, minmax(0, 1fr));grid-auto-rows:${rowHeight}px">
          ${visibleItems.map((item) => renderLayerCell({
    className: 'native-collection-item',
    height: rowHeight,
    backgroundStyle: { buttonStyleType: 'geometry', normalColor: '#00000000', cornerRadius: 0 },
    foregrounds: [renderForeground(foregroundStyle, normalizeCollectionLabel(item), { project, theme })],
  })).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderNativeCandidateCell(project, theme, payload, cellName, width, height, className = '', options = {}) {
  const cell = payload[cellName] || {};
  const candidateStyle = resolveNativeStyleObject(payload, cell.candidateStyle, options);
  const backgroundStyle = resolveNativeStyleObject(payload, cell.backgroundStyle, options);
  const isVertical = cellName === 'verticalCandidates';
  const candidates = isVertical ? EXPANDED_CANDIDATES.slice(0, 30) : CANDIDATES.slice(0, 8);
  const columns = isVertical
    ? Math.max(1, Number(cell.maxColumns || 5))
    : Math.max(candidates.length, 1);
  const rows = isVertical
    ? Math.max(1, Number(cell.maxRows || Math.ceil(candidates.length / columns)))
    : 1;
  const gridTemplate = `repeat(${columns}, minmax(0, 1fr))`;
  const itemClass = isVertical ? 'calayer-expanded-candidate' : 'calayer-candidate';
  return `
    <div class="calayer-cell is-${escapeHtml(cellName)} is-native-candidates ${className}" style="width:${width}px;height:${height}px">
      <div class="calayer-visible">
        ${renderBackgroundLayer(project, theme, { ...backgroundStyle, insets: cell.insets || backgroundStyle.insets })}
        <div class="native-candidate-grid ${isVertical ? 'is-vertical' : 'is-horizontal'}" style="${insetPositionCss(cell.insets || {})};grid-template-columns:${gridTemplate};${isVertical ? `grid-template-rows:repeat(${rows}, minmax(0, 1fr));` : ''}">
          ${candidates.map((candidate, index) => renderCandidateItem(candidate, index, candidateStyle, itemClass)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderNativeCell(project, theme, payload, cellName, width, height, className = '', options = {}) {
  const cell = payload[cellName] || {};
  if (['symbols', 'classifiedSymbols', 'subClassifiedSymbols', 'emojis'].includes(cell.type)) {
    return renderNativeCollectionCell(project, theme, payload, cellName, width, height, className, options);
  }
  if (['horizontalCandidates', 'verticalCandidates'].includes(cell.type)) {
    return renderNativeCandidateCell(project, theme, payload, cellName, width, height, className, options);
  }
  const button = payload[cellName] || {};
  const backgroundStyle = resolveNativeStyleObject(payload, button.backgroundStyle, options);
  const key = nativeCellKey(cellName);
  const visibleStyle = boundsCss(button.bounds);
  return `
    <div class="calayer-cell is-${escapeHtml(key)} ${className}" style="width:${width}px;height:${height}px" data-preview-key="${escapeHtml(key)}">
      <div class="calayer-visible" style="${visibleStyle}">
        ${renderBackgroundLayer(project, theme, backgroundStyle, '', { active: options.activePressedKey === key })}
        ${nativeForegrounds(project, theme, payload, cellName, options)}
      </div>
    </div>
  `;
}

function nativeSubviewWidthRatio(payload, item = {}) {
  if (item.Cell) return sizeRatio(payload[item.Cell]?.size?.width);
  if (item.VStack?.style) return sizeRatio(payload[item.VStack.style]?.size?.width);
  if (item.HStack?.style) return sizeRatio(payload[item.HStack.style]?.size?.width);
  return null;
}

function nativeSubviewHeightRatio(payload, item = {}) {
  if (item.Cell) return sizeRatio(payload[item.Cell]?.size?.height);
  if (item.VStack?.style) return sizeRatio(payload[item.VStack.style]?.size?.height);
  if (item.HStack?.style) return sizeRatio(payload[item.HStack.style]?.size?.height);
  return null;
}

function renderNativeSubview(project, theme, payload, item = {}, width, height, options = {}) {
  if (item.Cell) return renderNativeCell(project, theme, payload, item.Cell, width, height, '', options);
  if (item.HStack) {
    const style = item.HStack.style ? payload[item.HStack.style] : {};
    return renderNativeHStack(project, theme, payload, item.HStack.subviews || [], width, height, style || {}, options);
  }
  if (item.VStack) {
    const style = item.VStack.style ? payload[item.VStack.style] : {};
    return renderNativeVStack(project, theme, payload, item.VStack.subviews || [], width, height, style || {}, options);
  }
  return '';
}

function renderNativeHStack(project, theme, payload, subviews = [], contentWidth, rowHeight, style = {}, options = {}) {
  const visibleWidthRatio = sizeRatio(style.contentWidth) || 1;
  const visibleWidth = contentWidth * Math.max(0, Math.min(1, visibleWidthRatio));
  const offsetX = style.alignment === 'center'
    ? (contentWidth - visibleWidth) / 2
    : style.alignment === 'right'
      ? contentWidth - visibleWidth
      : 0;
  const fixedWidths = subviews.map((item) => {
    const ratio = nativeSubviewWidthRatio(payload, item);
    return ratio ? visibleWidth * ratio : null;
  });
  const fixedTotal = fixedWidths.reduce((sum, width) => sum + (width || 0), 0);
  const flexCount = fixedWidths.filter((width) => width === null).length;
  const flexWidth = flexCount ? Math.max(visibleWidth - fixedTotal, 0) / flexCount : 0;
  const height = rowHeight;
  return `
    <div class="calayer-row native-row" style="height:${height}px">
      ${offsetX > 0 ? `<div class="native-row-spacer" style="flex:0 0 ${offsetX}px"></div>` : ''}
      ${subviews.map((item, index) => renderNativeSubview(project, theme, payload, item, fixedWidths[index] ?? flexWidth, height, options)).join('')}
    </div>
  `;
}

function renderNativeVStack(project, theme, payload, subviews = [], width, contentHeight, style = {}, options = {}) {
  const fixedHeights = subviews.map((item) => {
    const ratio = nativeSubviewHeightRatio(payload, item);
    return ratio ? contentHeight * ratio : null;
  });
  const fixedTotal = fixedHeights.reduce((sum, height) => sum + (height || 0), 0);
  const flexCount = fixedHeights.filter((height) => height === null).length;
  const fallbackRatio = options.usePayloadRowHeight && subviews.length > 1
    ? sizeRatio(payload.HStackStyle?.size?.height) || null
    : null;
  const flexHeight = flexCount
    ? Math.max(contentHeight - fixedTotal, 0) / flexCount
    : 0;
  return `
    <div class="native-column" style="width:${width}px;height:${contentHeight}px">
      ${subviews.map((item, index) => renderNativeSubview(
    project,
    theme,
    payload,
    item,
    width,
    fixedHeights[index] ?? (fallbackRatio ? contentHeight * fallbackRatio : flexHeight),
    options,
  )).join('')}
    </div>
  `;
}

function renderNativeLayout(project, theme, payload, rows = [], contentWidth, contentHeight, options = {}) {
  if (!Array.isArray(rows) || !rows.length) return '';
  const isVerticalLayout = rows.some((item) => item.VStack);
  const usePayloadRowHeight = options.usePayloadRowHeight !== false;
  if (isVerticalLayout) {
    const fixedWidthRatios = rows.map((item) => {
      const stack = item.VStack;
      return stack ? sizeRatio(payload[stack.style]?.size?.width) : null;
    });
    const fixedTotal = fixedWidthRatios.reduce((sum, ratio) => sum + (ratio || 0), 0);
    const flexCount = fixedWidthRatios.filter((ratio) => ratio === null).length;
    const flexRatio = flexCount ? Math.max(1 - fixedTotal, 0) / flexCount : 0;
    return rows.map((item, index) => {
      const stack = item.VStack;
      if (!stack) return '';
      const widthRatio = fixedWidthRatios[index] ?? flexRatio;
      return renderNativeVStack(project, theme, payload, stack.subviews || [], contentWidth * widthRatio, contentHeight, payload[stack.style], { usePayloadRowHeight, ...options });
    }).join('');
  }
  return rows.map((item) => {
    const stack = item.HStack;
    if (!stack) return '';
    const style = stack.style ? payload[stack.style] : null;
    const rowHeightRatio = sizeRatio(style?.size?.height)
      || (usePayloadRowHeight ? sizeRatio(payload.HStackStyle?.size?.height) : null)
      || 1 / Math.max(rows.length, 1);
    return renderNativeHStack(project, theme, payload, stack.subviews || [], contentWidth, contentHeight * rowHeightRatio, style || {}, options);
  }).join('');
}

function renderNativeKeyboard(project, theme, mode, styles, frame, options = {}) {
  const nativePreview = nativePayloadForPreview(project, theme, mode, options);
  if (!nativePreview) return null;
  const { payload } = nativePreview;
  const keyboardInsets = payload.keyboardStyle?.insets || styles.keyboardStyle.insets || {};
  const keyboardBackgroundStyle = resolveNativeStyleObject(
    payload,
    payload.keyboardStyle?.backgroundStyle,
    options,
    styles.keyboardBackgroundStyle,
  );
  const width = previewLogicalWidth(options);
  const contentWidth = width - numberInset(keyboardInsets, 'left') - numberInset(keyboardInsets, 'right');
  const contentHeight = frame.keyboardHeight - numberInset(keyboardInsets, 'top') - numberInset(keyboardInsets, 'bottom');
  const rows = Array.isArray(payload.keyboardLayout) ? payload.keyboardLayout : [];
  if (!rows.length) return null;
  const isVerticalLayout = rows.some((item) => item.VStack);
  const body = renderNativeLayout(project, theme, payload, rows, contentWidth, contentHeight, { usePayloadRowHeight: true, mode, ...options });

  return `
    <div class="calayer-keyboard is-native-keyboard is-native-${escapeHtml(mode)}" style="${backgroundCssForStyle(project, theme, keyboardBackgroundStyle)};height:${frame.keyboardHeight}px;padding:${cssInsets(keyboardInsets)}">
      <div class="${isVerticalLayout ? 'native-column-layout' : 'native-row-layout'}">
        ${body}
      </div>
    </div>
  `;
}

function nativeToolbarLayout(payload = {}) {
  if (Array.isArray(payload.toolbarLayout) && payload.toolbarLayout.length) return payload.toolbarLayout;
  const toolbar = payload.toolbar || {};
  const primary = typeof toolbar.primaryButtonStyle === 'string' ? [toolbar.primaryButtonStyle] : [];
  const secondary = Array.isArray(toolbar.secondaryButtonStyle)
    ? toolbar.secondaryButtonStyle.filter((item) => typeof item === 'string')
    : typeof toolbar.secondaryButtonStyle === 'string'
      ? [toolbar.secondaryButtonStyle]
      : [];
  const subviews = [...primary, ...secondary].map((cellName) => ({ Cell: cellName }));
  return subviews.length ? [{ HStack: { subviews } }] : [];
}

function nativeToolbarStyle(payload = {}) {
  return payload.toolbarStyle || payload.toolbar || {};
}

function resolveKeyMetric(project, mode, key, orientation = 'portrait', options = {}) {
  const keyboardId = mode === 'panel' ? 'panel' : mode;
  let metrics = project.keyboards?.[keyboardId]?.metrics?.[orientation]
    || project.keyboards?.[keyboardId]?.metrics?.portrait
    || {};
  if (keyboardId === 'keyboard26') {
    const variant = activePinyinVariantForPreview(project, options);
    const variantMetrics = project.keyboards?.keyboard26?.variants?.[variant]?.metrics?.[orientation]
      || project.keyboards?.keyboard26?.variants?.[variant]?.metrics?.portrait;
    if (variantMetrics) metrics = variantMetrics;
  }
  const metric = metrics[key] || metrics.normal;
  const width = metric?.width;
  let basis = null;
  if (typeof width === 'object' && Number.isFinite(width.percentage)) {
    basis = `${width.percentage * 100}%`;
  } else {
    const fraction = parseFraction(width);
    if (fraction) basis = `${fraction * 100}%`;
  }
  return { basis, bounds: metric?.bounds || null };
}

function keyboard26RowWithComboSpace(project, row = []) {
  return project.keyboardCombo?.spaceRow?.semicolonKey?.enabled === true && row.includes('spaceRight')
    ? row.flatMap((key) => (key === 'spaceRight' ? ['semicolon', 'spaceRight'] : [key]))
    : row;
}

function optionsPreviewPinyinVariant(options = {}) {
  return ['9', '14', '17', '18', '26'].includes(options?.pinyinVariant) ? options.pinyinVariant : null;
}

function activePinyinVariantForPreview(project, options = {}) {
  return optionsPreviewPinyinVariant(options) || project.keyboardCombo?.slots?.pinyin?.variant || '26';
}

function variantMetricKey(project, key, options = {}) {
  const variant = activePinyinVariantForPreview(project, options);
  if (variant === '14') {
    const map = {
      qw: 'normal',
      er: 'normal',
      ty: 'normal',
      ui: 'normal',
      op: 'normal',
      as: 'normal',
      df: 'normal',
      gh: 'normal',
      jk: 'normal',
      zx: 'z',
      cv: 'c',
      bn: 'normal',
    };
    return map[key] || key;
  }
  if (variant === '18') {
    const map = {
      we: 'normal',
      rt: 'normal',
      io: 'normal',
      sd: 'normal',
      fg: 'normal',
      jk: 'normal',
      xc: 'x',
      bn: 'normal',
    };
    return map[key] || key;
  }
  return key;
}

function sameKeyRows(left, right) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
}

function keyboard26VariantRowsForOrientation(project, orientation = 'portrait', options = {}) {
  const variant = activePinyinVariantForPreview(project, options);
  const variantData = project.keyboards?.keyboard26?.variants?.[variant] || {};
  const portraitRows = variantData.portraitRows;
  const storedLandscapeRows = variantData.landscapeRows;
  const resolvedLandscapeRows = Array.isArray(storedLandscapeRows) && storedLandscapeRows.length
    ? (
      sameKeyRows(storedLandscapeRows, portraitRows) && Array.isArray(PINYIN_LANDSCAPE_VARIANT_ROWS[variant])
        ? PINYIN_LANDSCAPE_VARIANT_ROWS[variant]
        : storedLandscapeRows
    )
    : (PINYIN_LANDSCAPE_VARIANT_ROWS[variant] || portraitRows);
  const variantRows = orientation === 'landscape'
    ? resolvedLandscapeRows
    : portraitRows;
  if (Array.isArray(variantRows) && variantRows.length) {
    return variantRows.map((row) => keyboard26RowWithComboSpace(project, Array.isArray(row) ? row : []));
  }
  if (Array.isArray(PINYIN_VARIANT_ROWS[variant])) {
    return PINYIN_VARIANT_ROWS[variant].map((row) => keyboard26RowWithComboSpace(project, row));
  }
  return [];
}

function previewOrientation(options = {}) {
  return options.orientation === 'landscape' ? 'landscape' : 'portrait';
}

function previewLogicalWidth(options = {}) {
  return PREVIEW_LOGICAL_SIZE[previewOrientation(options)]?.width || PREVIEW_LOGICAL_WIDTH;
}

function previewKeyboardMetrics(styles, frame, options = {}, overrides = {}) {
  const keyboardInsets = overrides.keyboardInsets || styles.keyboardStyle.insets || {};
  const width = overrides.width || previewLogicalWidth(options);
  const outerInsetX = Number(overrides.outerInsetX || 0);
  const outerInsetY = Number(overrides.outerInsetY || 0);
  const leftInset = Number(keyboardInsets.left || 0) + Number(overrides.leftInsetExtra ?? outerInsetX);
  const rightInset = Number(keyboardInsets.right || 0) + Number(overrides.rightInsetExtra ?? outerInsetX);
  const topInset = Number(keyboardInsets.top || 0) + Number(overrides.topInsetExtra ?? outerInsetY);
  const bottomInset = Number(keyboardInsets.bottom || 0) + Number(overrides.bottomInsetExtra ?? outerInsetY);
  const rowGap = Number(overrides.rowGap ?? 4);
  const colGap = Number(overrides.colGap ?? 5);
  const rows = Math.max(1, Number(overrides.rows || 4));
  const contentWidth = width - leftInset - rightInset;
  const contentHeight = frame.keyboardHeight - topInset - bottomInset;
  const rowHeight = (contentHeight - rowGap * Math.max(rows - 1, 0)) / rows;
  return {
    keyboardInsets,
    width,
    leftInset,
    rightInset,
    topInset,
    bottomInset,
    contentWidth,
    contentHeight,
    rowGap,
    colGap,
    rowHeight,
  };
}

function pinyinVariantKeyLabel(project, variant, key) {
  if (variant === '17' && PINYIN_VARIANT_LABELS[key]) return applyPinyinLetterCase(PINYIN_VARIANT_LABELS[key], project);
  if (['14', '18'].includes(variant) && /^[a-z]{2}$/.test(key)) return pinyinVariantLettersLabel(key, project);
  if (variant === '9') {
    const labels = {
      number1: '@/.',
      number2: applyPinyinLetterCase('ABC', project),
      number3: applyPinyinLetterCase('DEF', project),
      number4: applyPinyinLetterCase('GHI', project),
      number5: applyPinyinLetterCase('JKL', project),
      number6: applyPinyinLetterCase('MNO', project),
      number7: applyPinyinLetterCase('PQRS', project),
      number8: applyPinyinLetterCase('TUV', project),
      number9: applyPinyinLetterCase('WXYZ', project),
      number0: '0',
      symbol: '#+=',
    };
    if (labels[key]) return labels[key];
  }
  if (variant === '14' && key === 'shift') return "'词";
  if (variant === '18' && key === 'word') return "'词";
  if (variant === '9' && key === 'reinput') return '重输';
  if (variant === '18' && key === 'space') return '天行键';
  return null;
}

function variantDecorations(variant, key) {
  return [];
}

function rowsForMode(project, mode, orientation = 'portrait', options = {}) {
  if (mode === 'keyboard26') {
    const variantRows = keyboard26VariantRowsForOrientation(project, orientation, options);
    if (variantRows.length) return variantRows;
    const layout = project.keyboards?.keyboard26?.layout || {};
    if (orientation === 'landscape') {
      const landscape = layout.landscape || {};
      const sections = ['left', 'middle', 'right'].map((section) => landscape[section] || []);
      const maxRows = Math.max(...sections.map((sectionRows) => sectionRows.length), 0);
      const rows = Array.from({ length: maxRows }, (_, index) => (
        sections.flatMap((sectionRows) => sectionRows[index] || [])
      )).filter((row) => row.length);
      if (rows.length) return rows;
    }
    const portrait = layout.portrait || {};
    if (Array.isArray(portrait.rows) && portrait.rows.length) {
      return portrait.rows.map((row) => (
        row.label === '底排' ? keyboard26RowWithComboSpace(project, row.keys || []) : (row.keys || [])
      )).filter((row) => row.length);
    }
    return ['top', 'middle', 'bottom', 'footer']
      .map((row) => row === 'footer' ? keyboard26RowWithComboSpace(project, portrait[row] || []) : (portrait[row] || []))
      .filter((row) => row.length);
  }
  if (mode === 'numeric') {
    return [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['return', 'space', 'enter'],
    ];
  }
  if (mode === 'symbolic') {
    return [
      ['，', '。', '？', '！', '~'],
      ['@', '#', '¥', '&', '*'],
      ['return', 'pageUp', 'pageDown', 'lock', 'backspace'],
    ];
  }
  const panelKeys = Object.keys(project.keyboards.panel.text || {});
  return [
    panelKeys.slice(0, 3),
    panelKeys.slice(3, 6),
    panelKeys.slice(6, 10),
  ];
}

function labelForMode(project, mode, key, options = {}) {
  if (mode !== 'keyboard26') {
    return project.keyboards?.[mode]?.text?.[key] || project.keyboards.panel.text?.[key] || key;
  }
  const keyboard = project.keyboards?.keyboard26 || {};
  const variant = activePinyinVariantForPreview(project, options);
  const profile = keyboard26ProfileFromOptions(options);
  const text = keyboard.text || {};
  const customLabel = profile === 'alphabetic'
    ? keyboard.keyDisplays?.[`alphabetic.${key}`] || keyboard.keyDisplays?.[`english.${key}`]
    : keyboard.keyDisplays?.[key];
  if (customLabel) return customLabel;
  if (['14', '17', '18'].includes(variant) && key === 'space') return '';
  const variantLabel = pinyinVariantKeyLabel(project, variant, key);
  if (variantLabel) return variantLabel;
  const labels = {
    '123': text.numericSwitch || '123',
    space: ['9', '14', '17', '18'].includes(variant) ? '' : (text.space ?? ''),
    symbol: text.symbol || '#+=',
    cnen: profile === 'alphabetic' ? '英' : '中',
    semicolon: ';',
    spaceRight: keyboard.spaceRight?.[profile]?.primary?.text || keyboard.spaceRight?.pinyin?.primary?.text || '，',
    enter: variant === '26' ? (text.enter?.default || '回车') : '发送',
  };
  if (profile === 'alphabetic' && /^[a-z]$/.test(key)) return key;
  return labels[key] || pinyinVariantLettersLabel(key, project) || key;
}

function renderPinyin9Keyboard(project, theme, styles, frame, options = {}) {
  const height = frame.keyboardHeight;
  const sideColGap = 0;
  const mainColGap = 0;
  const footerColGap = 0;
  const layout = previewKeyboardMetrics(styles, frame, options, { rowGap: 0, colGap: 0 });
  const { leftInset, topInset, contentWidth, rowGap, rowHeight } = layout;
  const mergedEnterHeight = rowHeight * 2 + rowGap;
  const pinyin9Metrics = project.keyboards?.keyboard26?.variants?.['9']?.metrics?.portrait || {};
  const metricWidth = (key, fallbackRatio) => {
    const ratio = sizeRatio(pinyin9Metrics[key]?.width);
    return contentWidth * (Number.isFinite(ratio) && ratio > 0 ? ratio : fallbackRatio);
  };
  const leftWidth = metricWidth('punctuationColumn', 0.16);
  const rightWidth = Math.max(
    metricWidth('backspace', 0.16),
    metricWidth('reinput', 0.16),
    metricWidth('enter', 0.16),
  );
  const mainStartX = leftInset + leftWidth + sideColGap;
  const metricNormalWidth = metricWidth('normal', 0);
  const mainUsableWidth = contentWidth - leftWidth - rightWidth - sideColGap * 2;
  const mainKeyWidth = metricNormalWidth > 0
    ? Math.min(metricNormalWidth, mainUsableWidth / 3)
    : mainUsableWidth / 3;
  const mainBlockWidth = mainKeyWidth * 3;
  const mainBlockInset = Math.max(0, (mainUsableWidth - mainBlockWidth) / 2);
  const mainGridStartX = mainStartX + mainBlockInset;
  const pinyin9MainForegroundStyle = {
    ...styles.keyForegroundStyle,
    center: { x: 0.5, y: 0.53 },
    fontSize: Math.max(21, Number(styles.keyForegroundStyle.fontSize || 18) + 2),
    previewFontScale: 0.9,
  };
  const pinyin9FunctionForegroundStyle = {
    ...styles.functionForegroundStyle,
    center: { x: 0.5, y: 0.53 },
    previewFontScale: 0.78,
  };
  const punctuationLabels = pinyin9PunctuationItems(project);
  const leftColumnHtml = `
    <div class="calayer-cell is-punctuation-column is-function" style="position:absolute;left:${leftInset}px;top:${topInset}px;width:${leftWidth}px;height:${rowHeight * 3}px">
      <div class="calayer-visible" style="width:100%;height:100%">
        <div class="calayer-background is-layer-bg" style="${geometryCss(styles.systemButtonBackgroundStyle)};${insetPositionCss(resolveInsets(project, 'keyboard26', 'punctuationColumn'))}"></div>
        ${punctuationLabels.map((label, index) => renderForeground({
    ...styles.functionForegroundStyle,
    buttonStyleType: 'text',
    center: { x: 0.5, y: (index + 0.5) / punctuationLabels.length },
  }, label)).join('')}
        ${[1, 2, 3].map((index) => `<span class="punctuation-divider" style="position:absolute;left:24%;right:24%;top:${(index * 100) / punctuationLabels.length}%;height:1px;background:rgba(0,0,0,.1)"></span>`).join('')}
      </div>
    </div>
  `;
  const topRows = [
    [
      { key: 'number1', width: mainKeyWidth, function: false },
      { key: 'number2', width: mainKeyWidth, function: false },
      { key: 'number3', width: mainKeyWidth, function: false },
      { key: 'backspace', width: rightWidth, function: true, fixedX: leftInset + contentWidth - rightWidth },
    ],
    [
      { key: 'number4', width: mainKeyWidth, function: false },
      { key: 'number5', width: mainKeyWidth, function: false },
      { key: 'number6', width: mainKeyWidth, function: false },
      { key: 'reinput', width: rightWidth, function: true, fixedX: leftInset + contentWidth - rightWidth },
    ],
    [
      { key: 'number7', width: mainKeyWidth, function: false },
      { key: 'number8', width: mainKeyWidth, function: false },
      { key: 'number9', width: mainKeyWidth, function: false },
    ],
  ];
  const topRowsHtml = topRows.map((row, rowIndex) => {
    const y = topInset + rowIndex * (rowHeight + rowGap);
    let rowX = mainGridStartX;
    return row.map((item, keyIndex) => {
      const key = item.key;
      const cellWidth = item.width;
      const label = labelForMode(project, 'keyboard26', key, options);
      const isBackspace = key === 'backspace';
      const actualX = item.fixedX ?? rowX;
      const foreground = isBackspace
        ? renderForeground({ ...pinyin9FunctionForegroundStyle, buttonStyleType: 'systemImage' }, 'delete.left')
        : key === 'reinput'
          ? renderForeground({
            ...pinyin9FunctionForegroundStyle,
            center: { x: 0.5, y: 0.5 },
            fontSize: Math.max(14, Number(styles.functionForegroundStyle.fontSize || 18) - 3),
          }, label)
          : renderForeground(/^(number)/.test(key) ? pinyin9MainForegroundStyle : pinyin9FunctionForegroundStyle, label);
      const decoration = /^number\d$/.test(key) && key !== 'number0'
        ? renderForeground({
          ...pinyin9FunctionForegroundStyle,
          center: { x: 0.84, y: 0.18 },
          fontSize: 9,
          previewFontScale: 0.86,
          normalColor: 'rgba(0,0,0,.58)',
        }, key.replace('number', ''))
        : '';
      const background = /^(number)/.test(key) ? styles.alphabeticBackgroundStyle : styles.systemButtonBackgroundStyle;
      if (item.fixedX === undefined) rowX += cellWidth + mainColGap;
      return `
        <div class="calayer-cell is-${key} ${/^(number)/.test(key) ? 'is-letter' : 'is-function'}" style="position:absolute;left:${actualX}px;top:${y}px;width:${cellWidth}px;height:${rowHeight}px">
          <div class="calayer-visible" style="width:100%;height:100%">
            <div class="calayer-background is-layer-bg" style="${geometryCss(background)};${insetPositionCss(resolveInsets(project, 'keyboard26', key))}"></div>
            ${foreground}
            ${decoration}
          </div>
        </div>
      `;
    }).join('');
  }).join('');
  const footerRatios = {
    symbol: sizeRatio(pinyin9Metrics.symbol?.width) ?? 0.14,
    '123': sizeRatio(pinyin9Metrics['123']?.width) ?? 0.11,
    space: sizeRatio(pinyin9Metrics.space?.width) ?? 0.43,
    cnen: sizeRatio(pinyin9Metrics.cnen?.width) ?? 0.16,
  };
  const footerAvailableWidth = contentWidth - rightWidth - footerColGap * 3;
  const footerRatioTotal = Object.values(footerRatios).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0) || 1;
  const footerItems = [
    { key: 'symbol', width: footerAvailableWidth * (footerRatios.symbol / footerRatioTotal), background: styles.systemButtonBackgroundStyle, foreground: styles.functionForegroundStyle },
    { key: '123', width: footerAvailableWidth * (footerRatios['123'] / footerRatioTotal), background: styles.systemButtonBackgroundStyle, foreground: styles.functionForegroundStyle },
    { key: 'space', width: footerAvailableWidth * (footerRatios.space / footerRatioTotal), background: styles.alphabeticBackgroundStyle, foreground: styles.spaceForegroundStyle },
    { key: 'cnen', width: footerAvailableWidth * (footerRatios.cnen / footerRatioTotal), background: styles.systemButtonBackgroundStyle, foreground: styles.functionForegroundStyle },
  ];
  let footerX = leftInset;
  const footerY = topInset + 3 * (rowHeight + rowGap);
  const footerHtml = footerItems.map((item) => {
    const width = item.width;
    const label = labelForMode(project, 'keyboard26', item.key, options);
    const html = `
      <div class="calayer-cell is-${item.key} ${item.key === 'space' ? 'is-letter' : 'is-function'}" style="position:absolute;left:${footerX}px;top:${footerY}px;width:${width}px;height:${rowHeight}px" data-preview-key="${escapeHtml(item.key)}">
        <div class="calayer-visible" style="width:100%;height:100%">
          <div class="calayer-background is-layer-bg" style="${geometryCss(item.background)};${insetPositionCss(resolveInsets(project, 'keyboard26', item.key))}"></div>
          ${item.key === 'space'
            ? renderForeground({ ...item.foreground, fontSize: 24 }, '⌴')
            : item.key === 'cnen'
              ? [
                  renderForeground({ ...pinyin9FunctionForegroundStyle, center: { x: 0.43, y: 0.43 }, fontSize: Math.max(14, Number(item.foreground.fontSize || 15)) }, profileLabelForCnen(options)),
                  renderForeground({ ...pinyin9FunctionForegroundStyle, center: { x: 0.62, y: 0.66 }, fontSize: 10, normalColor: 'rgba(0,0,0,.68)' }, subLabelForCnen(options)),
                ].join('')
            : item.key === 'enter'
              ? renderForeground({
                ...pinyin9FunctionForegroundStyle,
                center: { x: 0.5, y: 0.5 },
                fontSize: Math.max(15, Number(item.foreground.fontSize || 18) - 3),
              }, label)
            : renderForeground(pinyin9FunctionForegroundStyle, label)}
        </div>
      </div>
    `;
    footerX += width + footerColGap;
    return html;
  }).join('');
  const enterX = leftInset + contentWidth - rightWidth;
  const enterY = topInset + 2 * (rowHeight + rowGap);
  const enterHtml = `
    <div class="calayer-cell is-enter is-function" style="position:absolute;left:${enterX}px;top:${enterY}px;width:${rightWidth}px;height:${mergedEnterHeight}px" data-preview-key="enter">
      <div class="calayer-visible" style="width:100%;height:100%">
        <div class="calayer-background is-layer-bg" style="${geometryCss(styles.enterButtonBackgroundStyle)};${insetPositionCss(resolveInsets(project, 'keyboard26', 'enter'))}"></div>
        ${renderForeground({
    ...styles.enterForegroundStyle,
    center: { x: 0.5, y: 0.5 },
    previewFontScale: 0.78,
    fontSize: Math.max(15, Number(styles.enterForegroundStyle.fontSize || 18) - 3),
  }, labelForMode(project, 'keyboard26', 'enter', options))}
      </div>
    </div>
  `;
  return `
    <div class="calayer-keyboard is-pinyin9-keyboard" style="${backgroundCssForStyle(project, theme, styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
      ${leftColumnHtml}
      ${topRowsHtml}
      ${footerHtml}
      ${enterHtml}
    </div>
  `;
}

function renderVariantCell(project, theme, key, label, {
  x,
  y,
  width,
  height,
  isFunction = false,
  accent = false,
  options = {},
  displayLabelOverride = null,
  previewKey = key,
  foregroundStyleOverride = null,
  backgroundStyleOverride = null,
  buttonStyleTypeOverride = null,
  preserveFullHeight = false,
}, styles) {
  const orientation = previewOrientation(options);
  const backgroundStyle = backgroundStyleOverride || (accent
    ? styles.enterButtonBackgroundStyle
    : isFunction
      ? styles.systemButtonBackgroundStyle
      : styles.alphabeticBackgroundStyle);
  const foregroundStyle = foregroundStyleOverride || (accent
    ? styles.enterForegroundStyle
    : isFunction
      ? styles.functionForegroundStyle
      : styles.keyForegroundStyle);
  const functionStyle = key === 'cnen'
    ? { ...foregroundStyle, fontSize: Math.max(11, Number(foregroundStyle.fontSize || 15) - 4) }
    : foregroundStyle;
  const variant = activePinyinVariantForPreview(project, options);
  const resolvedLabel = labelForMode(project, 'keyboard26', key, options);
  const displayLabel = displayLabelOverride ?? (resolvedLabel === undefined || resolvedLabel === null ? label : resolvedLabel);
  const compressedVariantKeys = new Set(['qw', 'er', 'ty', 'ui', 'op', 'as', 'df', 'gh', 'jk', 'zx', 'cv', 'bn', 'we', 'rt', 'io', 'sd', 'fg', 'xc']);
  const foregroundOverride = compressedVariantKeys.has(key)
    ? { ...functionStyle, fontSize: Math.max(14, Number(foregroundStyle.fontSize || 18) - (variant === '18' ? 4 : 3)) }
    : ['word', 'mnemonic', 'cnen'].includes(key)
      ? { ...functionStyle, fontSize: key === 'cnen' ? Math.max(10, Number(functionStyle.fontSize || 11)) : Math.max(12, Number(foregroundStyle.fontSize || 15) - 1), lineHeight: 1.1 }
      : functionStyle;
  const content = key === 'backspace'
    ? renderForeground({ ...foregroundOverride, buttonStyleType: 'systemImage' }, 'delete.left')
    : key === 'shift' && orientation === 'landscape'
      ? renderForeground({ ...foregroundOverride, buttonStyleType: 'systemImage' }, 'shift')
    : key === 'cnen' && displayLabelOverride === null
      ? [
          renderForeground({ ...foregroundOverride, center: { x: 0.44, y: 0.42 }, fontSize: Math.max(14, Number(foregroundOverride.fontSize || 15)) }, profileLabelForCnen(options)),
          renderForeground({ ...foregroundOverride, center: { x: 0.62, y: 0.62 }, fontSize: Math.max(10, Number(foregroundOverride.fontSize || 11) - 2), normalColor: 'rgba(0,0,0,.68)' }, subLabelForCnen(options)),
        ].join('')
      : renderForeground(buttonStyleTypeOverride ? { ...foregroundOverride, buttonStyleType: buttonStyleTypeOverride } : foregroundOverride, displayLabel);
  const previewAttrs = previewKey === null ? '' : ` data-preview-key="${escapeHtml(previewKey)}"`;
  const metricKey = previewKey === null ? null : variantMetricKey(project, previewKey, options);
  const metric = metricKey === null ? null : resolveKeyMetric(project, 'keyboard26', metricKey, orientation, options);
  const shouldPreserveFullHeight = preserveFullHeight || ['9', '14', '17', '18'].includes(variant);
  const variantKeycapInsets = shouldPreserveFullHeight
    ? (project.keyStyles?.buttonInsets?.keyboard26?.normal || {})
    : resolveInsets(project, 'keyboard26', key);
  const visibleBounds = shouldPreserveFullHeight && metric?.bounds
    ? { ...metric.bounds, height: 1 }
    : metric?.bounds;
  const visibleRect = metric ? visibleRectWithinCell({ x: 0, y: 0, width, height }, visibleBounds) : { x: 0, y: 0, width, height };
  const visibleStyle = [
    'position:absolute',
    `left:${visibleRect.x}px`,
    `top:${visibleRect.y}px`,
    `width:${visibleRect.width}px`,
    `height:${visibleRect.height}px`,
  ].join(';');
  return `
    <div class="calayer-cell is-${key} ${isFunction ? 'is-function' : 'is-letter'}" style="position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px"${previewAttrs}>
      <div class="calayer-visible" style="${visibleStyle}">
        <div class="calayer-background is-layer-bg" style="${geometryCss(backgroundStyle)};${insetPositionCss(variantKeycapInsets)}"></div>
        ${content}
      </div>
    </div>
  `;
}

function profileLabelForCnen(options = {}) {
  return keyboard26ProfileFromOptions(options) === 'alphabetic' ? '英' : '中';
}

function subLabelForCnen(options = {}) {
  return keyboard26ProfileFromOptions(options) === 'alphabetic' ? '/中' : '/En';
}

function renderPinyinVariantKeyboard(project, theme, styles, frame, options = {}) {
  const variant = activePinyinVariantForPreview(project, options);
  const height = frame.keyboardHeight;
  const variantLayoutOptions = variant === '14'
    ? { outerInsetX: 3, outerInsetY: 3, rowGap: 2, colGap: 4 }
    : { outerInsetX: 5, outerInsetY: 4, rowGap: 4, colGap: 5 };
  const layout = previewKeyboardMetrics(styles, frame, options, variantLayoutOptions);
  const { leftInset, topInset, contentWidth, rowGap, colGap, rowHeight } = layout;
  const cells = [];
  const layoutRowByWeights = (items, width = contentWidth, xStart = leftInset) => {
    return layoutPreviewMetricRow(project, 'keyboard26', items, width, xStart, colGap, 'portrait', options);
  };

  if (variant === '14') {
    [['qw','er','ty','ui','op'],['as','df','gh','jk','l']].forEach((row, rowIndex) => {
      const width = rowIndex === 1 ? contentWidth * 0.94 : contentWidth;
      const xStart = rowIndex === 1 ? leftInset + contentWidth * 0.03 : leftInset;
      layoutRowByWeights(row.map((key) => ({ key, weight: key === 'l' ? 0.82 : 1 })), width, xStart).forEach((item) => {
        cells.push(renderVariantCell(project, theme, item.key, pinyinVariantLettersLabel(item.key, project), {
          x: item.x,
          y: topInset + rowIndex * (rowHeight + rowGap),
          width: item.width,
          height: rowHeight,
          options,
        }, styles));
      });
    });
    const thirdY = topInset + 2 * (rowHeight + rowGap);
    const footerY = topInset + 3 * (rowHeight + rowGap);
    layoutRowByWeights([
      { key: 'shift', weight: 1.12, isFunction: true },
      { key: 'zx', weight: 1.62 },
      { key: 'cv', weight: 1.46 },
      { key: 'bn', weight: 1.46 },
      { key: 'm', weight: 0.95 },
      { key: 'backspace', weight: 0.82, isFunction: true },
    ]).forEach((item) => {
      cells.push(renderVariantCell(project, theme, item.key, item.key, {
        x: item.x,
        y: thirdY,
        width: item.width,
        height: rowHeight,
        isFunction: item.isFunction,
        options,
        buttonStyleTypeOverride: item.key === 'shift' ? 'text' : null,
      }, styles));
    });
    layoutWeightedPreviewRow([
      { key: '123', weight: 1.15, isFunction: true },
      { key: 'semicolon', weight: 0.85, isFunction: true },
      { key: 'space', weight: 3 },
      { key: 'cnen', weight: 0.85, isFunction: true },
      { key: 'enter', weight: 1.15, isFunction: true, accent: true },
    ], contentWidth, leftInset, colGap).forEach((item) => {
      cells.push(renderVariantCell(project, theme, item.key, item.key, {
        x: item.x,
        y: footerY,
        width: item.width,
        height: rowHeight,
        isFunction: item.isFunction,
        accent: item.accent,
        options,
      }, styles));
    });
  } else if (variant === '17') {
    [['h','s','z','b','x','m'],['l','d','y','w','j','n']].forEach((row, rowIndex) => {
      layoutWeightedPreviewRow(row.map((key) => ({ key, weight: 1 })), contentWidth, leftInset, colGap).forEach((item) => {
        cells.push(renderVariantCell(project, theme, item.key, item.key, {
          x: item.x,
          y: topInset + rowIndex * (rowHeight + rowGap),
          width: item.width,
          height: rowHeight,
          options,
        }, styles));
      });
    });
    const thirdY = topInset + 2 * (rowHeight + rowGap);
    const footerY = topInset + 3 * (rowHeight + rowGap);
    layoutWeightedPreviewRow([
      { key: 'c', weight: 1 },
      { key: 'q', weight: 1 },
      { key: 'g', weight: 1 },
      { key: 'f', weight: 1 },
      { key: 't', weight: 1 },
      { key: 'backspace', weight: 1, isFunction: true },
    ], contentWidth, leftInset, colGap).forEach((item) => {
      cells.push(renderVariantCell(project, theme, item.key, item.key, { x: item.x, y: thirdY, width: item.width, height: rowHeight, isFunction: item.isFunction, options }, styles));
    });
    layoutWeightedPreviewRow([
      { key: '123', weight: 1.15, isFunction: true },
      { key: 'cnen', weight: 0.85, isFunction: true },
      { key: 'space', weight: 3 },
      { key: 'semicolon', weight: 0.85, isFunction: true },
      { key: 'enter', weight: 1.15, isFunction: true, accent: true },
    ], contentWidth, leftInset, colGap).forEach((item) => {
      cells.push(renderVariantCell(project, theme, item.key, item.key, { x: item.x, y: footerY, width: item.width, height: rowHeight, isFunction: item.isFunction, accent: item.accent, options }, styles));
    });
  } else if (variant === '18') {
    const top = layoutRowByWeights([
      { key: 'q', weight: 0.95 },
      { key: 'we', weight: 1.14 },
      { key: 'rt', weight: 1.14 },
      { key: 'y', weight: 0.88 },
      { key: 'u', weight: 0.88 },
      { key: 'io', weight: 1.14 },
      { key: 'p', weight: 0.92 },
    ]);
    const second = layoutRowByWeights([
      { key: 'a', weight: 1.12 },
      { key: 'sd', weight: 1 },
      { key: 'fg', weight: 1 },
      { key: 'h', weight: 0.9 },
      { key: 'jk', weight: 1 },
      { key: 'l', weight: 1.08 },
    ], contentWidth * 0.91, leftInset + contentWidth * 0.045);
    const third = layoutRowByWeights([
      { key: 'word', weight: 1.08, isFunction: true },
      { key: 'z', weight: 1.02 },
      { key: 'xc', weight: 1.06 },
      { key: 'v', weight: 0.9 },
      { key: 'bn', weight: 1.12 },
      { key: 'm', weight: 0.94 },
      { key: 'backspace', weight: 0.82, isFunction: true },
    ]);
    const footer = layoutWeightedPreviewRow([
      { key: '123', weight: 0.2, isFunction: true },
      { key: 'semicolon', weight: 0.12, isFunction: true },
      { key: 'space', weight: 0.4 },
      { key: 'cnen', weight: 0.12, isFunction: true },
      { key: 'enter', weight: 0.22, isFunction: true, accent: true },
    ], contentWidth, leftInset, colGap);
    [top, second, third, footer].forEach((row, rowIndex) => {
      row.forEach((item) => {
        cells.push(renderVariantCell(project, theme, item.key, item.key, {
          x: item.x,
          y: topInset + rowIndex * (rowHeight + rowGap),
          width: item.width,
          height: rowHeight,
          isFunction: item.isFunction,
          accent: item.accent,
          options,
        }, styles));
      });
    });
  }

  return `
    <div class="calayer-keyboard is-pinyin-variant-keyboard" style="${backgroundCssForStyle(project, theme, styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
      ${cells.join('')}
    </div>
  `;
}

function layoutWeightedPreviewRow(items, width, xStart = 0, gap = 0) {
  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight || 1), 0);
  const usableWidth = width - gap * Math.max(items.length - 1, 0);
  let x = xStart;
  return items.map((item, index) => {
    const cellWidth = usableWidth * (Number(item.weight || 1) / totalWeight);
    const placed = { ...item, x, width: cellWidth };
    x += cellWidth + (index === items.length - 1 ? 0 : gap);
    return placed;
  });
}

function variantLandscapeKeyAt(rows, rowIndex, keyIndex, fallback = '') {
  return rows[rowIndex]?.[keyIndex] ?? fallback;
}

function renderVariantLayoutSlot(project, theme, key, geometry, styles, overrides = {}) {
  const empty = !key;
  const actualKey = empty ? 'static' : key;
  const previewKey = empty ? null : (overrides.previewKey ?? actualKey);
  const cell = {
    ...geometry,
    isFunction: overrides.isFunction ?? (empty ? true : FUNCTION_KEYS.has(actualKey)),
    accent: overrides.accent ?? actualKey === 'enter',
    previewKey,
    foregroundStyleOverride: overrides.foregroundStyleOverride ?? null,
    backgroundStyleOverride: overrides.backgroundStyleOverride ?? null,
    buttonStyleTypeOverride: overrides.buttonStyleTypeOverride ?? null,
    preserveFullHeight: overrides.preserveFullHeight ?? true,
  };
  if (overrides.displayLabel !== undefined) {
    cell.displayLabelOverride = overrides.displayLabel;
  } else if (empty) {
    cell.displayLabelOverride = '';
  }
  return renderVariantCell(project, theme, actualKey, actualKey, cell, styles);
}

function layoutVariantLandscapeMetricRow(project, items, width, xStart, gap, options = {}) {
  return layoutPreviewMetricRow(project, 'keyboard26', items, width, xStart, gap, 'landscape', options);
}

function renderPinyin9LandscapeKeyboard(project, theme, styles, frame, options = {}) {
  const rows = keyboard26VariantRowsForOrientation(project, 'landscape', options);
  const height = frame.keyboardHeight;
  const layout = previewKeyboardMetrics(styles, frame, { ...options, orientation: 'landscape' }, {
    leftInsetExtra: 6,
    rightInsetExtra: 6,
    topInsetExtra: 4,
    bottomInsetExtra: 4,
    rowGap: 4,
  });
  const { leftInset, topInset, contentWidth, rowGap, rowHeight } = layout;
  const sectionGap = 8;
  const leftPanelWidth = contentWidth * 0.56;
  const rightPanelWidth = contentWidth - leftPanelWidth - sectionGap;
  const leftStripWidth = Math.max(56, leftPanelWidth * 0.18);
  const candidateWidth = leftPanelWidth - leftStripWidth - 10;
  const rightPunctuationWidth = Math.max(58, rightPanelWidth * 0.16);
  const rightFunctionWidth = Math.max(72, rightPanelWidth * 0.18);
  const rightMainWidth = rightPanelWidth - rightPunctuationWidth - rightFunctionWidth - sectionGap * 2;
  const rightMainCellWidth = rightMainWidth / 3;
  const candidateHeight = rowHeight * 4 + rowGap * 3;
  const punctuationItems = pinyin9PunctuationItems(project);
  const leftStripX = leftInset;
  const candidateX = leftStripX + leftStripWidth + 10;
  const rightX = leftInset + leftPanelWidth + sectionGap;
  const punctuationX = rightX;
  const mainX = punctuationX + rightPunctuationWidth + sectionGap;
  const functionX = mainX + rightMainWidth + sectionGap;
  const leftStripHtml = punctuationItems.map((item, index) => renderVariantCell(project, theme, 'punctuationColumn', item, {
    x: leftStripX,
    y: topInset + index * (rowHeight + rowGap),
    width: leftStripWidth,
    height: rowHeight,
    isFunction: true,
    options,
    displayLabelOverride: item,
    previewKey: index === 0 ? 'punctuationColumn' : null,
    buttonStyleTypeOverride: 'text',
  }, styles)).join('');
  const candidateHtml = `
    <div class="calayer-cell is-pinyin9-landscape-candidate" style="position:absolute;left:${candidateX}px;top:${topInset}px;width:${candidateWidth}px;height:${candidateHeight}px">
      <div class="calayer-visible" style="width:100%;height:100%">
        <div class="calayer-background is-layer-bg" style="${geometryCss(styles.alphabeticBackgroundStyle)};${insetPositionCss(resolveInsets(project, 'keyboard26', 'space'))}"></div>
        ${renderForeground({ ...styles.functionForegroundStyle, buttonStyleType: 'text', center: { x: 0.5, y: 0.5 }, fontSize: 24, normalColor: 'rgba(0,0,0,.45)' }, '无候选字')}
      </div>
    </div>
  `;
  const rightPunctuationHtml = punctuationItems.map((item, index) => renderVariantCell(project, theme, 'static', item, {
    x: punctuationX,
    y: topInset + index * (rowHeight + rowGap),
    width: rightPunctuationWidth,
    height: rowHeight,
    isFunction: true,
    options,
    displayLabelOverride: item,
    previewKey: null,
    buttonStyleTypeOverride: 'text',
  }, styles)).join('');
  const numberHtml = [0, 1, 2].map((rowIndex) => {
    const y = topInset + rowIndex * (rowHeight + rowGap);
    const mainKeys = [1, 2, 3].map((columnIndex) => {
      const key = variantLandscapeKeyAt(rows, rowIndex, columnIndex);
      return renderVariantLayoutSlot(project, theme, key, {
        x: mainX + (columnIndex - 1) * rightMainCellWidth,
        y,
        width: rightMainCellWidth,
        height: rowHeight,
        options,
      }, styles, {
        isFunction: key ? undefined : false,
        foregroundStyleOverride: key && !FUNCTION_KEYS.has(key) ? styles.keyForegroundStyle : null,
        backgroundStyleOverride: key ? null : styles.alphabeticBackgroundStyle,
      });
    }).join('');
    const sideKey = variantLandscapeKeyAt(rows, rowIndex, 4);
    return `${mainKeys}${renderVariantLayoutSlot(project, theme, sideKey, {
      x: functionX,
      y,
      width: rightFunctionWidth,
      height: rowHeight,
      options,
    }, styles, {
      foregroundStyleOverride: sideKey && !FUNCTION_KEYS.has(sideKey) ? styles.keyForegroundStyle : null,
    })}`;
  }).join('');
  const footerY = topInset + 3 * (rowHeight + rowGap);
  const footerItems = layoutWeightedPreviewRow([
    { weight: 1.1, key: variantLandscapeKeyAt(rows, 3, 0) },
    { weight: 0.95, key: variantLandscapeKeyAt(rows, 3, 1) },
    { weight: 3.3, key: variantLandscapeKeyAt(rows, 3, 2) },
    { weight: 1.1, key: variantLandscapeKeyAt(rows, 3, 3) },
    { weight: 1.45, key: variantLandscapeKeyAt(rows, 3, 4) },
  ], rightMainWidth + rightFunctionWidth + sectionGap, mainX, 6);
  const footerHtml = footerItems.map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: footerY,
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    accent: item.key === 'enter',
    displayLabel: item.key === 'space' ? '' : undefined,
    isFunction: item.key ? undefined : false,
    backgroundStyleOverride: item.key ? null : styles.alphabeticBackgroundStyle,
  })).join('');
  return `
    <div class="calayer-keyboard is-pinyin9-landscape-keyboard" style="${backgroundCssForStyle(project, theme, styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
      ${leftStripHtml}
      ${candidateHtml}
      ${rightPunctuationHtml}
      ${numberHtml}
      ${footerHtml}
    </div>
  `;
}

function renderPinyin14LandscapeKeyboard(project, theme, styles, frame, options = {}) {
  const rows = keyboard26VariantRowsForOrientation(project, 'landscape', options);
  const height = frame.keyboardHeight;
  const layout = previewKeyboardMetrics(styles, frame, { ...options, orientation: 'landscape' }, {
    leftInsetExtra: 6,
    rightInsetExtra: 6,
    topInsetExtra: 4,
    bottomInsetExtra: 4,
    rowGap: 4,
  });
  const { leftInset, topInset, contentWidth, rowGap, rowHeight } = layout;
  const sectionGap = 7;
  const middleWidth = contentWidth * 0.245;
  const sideWidth = (contentWidth - middleWidth - sectionGap * 2) / 2;
  const leftWidth = sideWidth;
  const rightWidth = sideWidth;
  const middleSymbolWidth = Math.max(38, middleWidth * 0.18);
  const middleNumberWidth = middleWidth - middleSymbolWidth - 5;
  const leftX = leftInset;
  const middleX = leftX + leftWidth + sectionGap;
  const rightX = middleX + middleWidth + sectionGap;
  const middleNumberX = middleX + middleSymbolWidth + 5;
  const middleNumberCellWidth = middleNumberWidth / 3;
  const middleNumberKeyAt = (rowIndex, keyIndex, fallback) => {
    const key = variantLandscapeKeyAt(rows, rowIndex, keyIndex, fallback);
    return /^number\d$/.test(key) ? key : fallback;
  };
  const leftWeights = [
    [1.12, 1, 1.06],
    [1.12, 1, 1.06],
    [0.92, 1, 1.08],
  ];
  const rightWeights = [
    [1.08, 1, 1.04],
    [1.08, 1, 0.86],
    [1.08, 0.86, 0.94],
  ];
  const leftHtml = leftWeights.map((weightRow, rowIndex) => layoutVariantLandscapeMetricRow(project,
    weightRow.map((weight, slotIndex) => ({ key: variantLandscapeKeyAt(rows, rowIndex, slotIndex), weight })),
    leftWidth,
    leftX,
    5,
    options,
  ).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: topInset + rowIndex * (rowHeight + rowGap),
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    isFunction: item.key ? undefined : false,
    backgroundStyleOverride: item.key ? null : styles.alphabeticBackgroundStyle,
  })).join('')).join('');
  const rightHtml = rightWeights.map((weightRow, rowIndex) => layoutVariantLandscapeMetricRow(project,
    weightRow.map((weight, slotIndex) => ({ key: variantLandscapeKeyAt(rows, rowIndex, slotIndex + 6), weight })),
    rightWidth,
    rightX,
    5,
    options,
  ).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: topInset + rowIndex * (rowHeight + rowGap),
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    isFunction: item.key ? undefined : false,
    backgroundStyleOverride: item.key ? null : styles.alphabeticBackgroundStyle,
  })).join('')).join('');
  const middleSymbols = ['@', '%', '-', '+'];
  const middleSymbolsHtml = middleSymbols.map((label, index) => renderVariantLayoutSlot(project, theme, '', {
    x: middleX,
    y: topInset + index * (rowHeight + rowGap),
    width: middleSymbolWidth,
    height: rowHeight,
    options,
  }, styles, {
    isFunction: true,
    displayLabel: label,
    previewKey: null,
    buttonStyleTypeOverride: 'text',
  })).join('');
  const middleNumberKeys = [
    [
      middleNumberKeyAt(0, 3, 'number1'),
      middleNumberKeyAt(0, 4, 'number2'),
      middleNumberKeyAt(0, 5, 'number3'),
    ],
    [
      middleNumberKeyAt(1, 3, 'number4'),
      middleNumberKeyAt(1, 4, 'number5'),
      middleNumberKeyAt(1, 5, 'number6'),
    ],
    [
      middleNumberKeyAt(2, 3, 'number7'),
      middleNumberKeyAt(2, 4, 'number8'),
      middleNumberKeyAt(2, 5, 'number9'),
    ],
  ];
  const middleNumbersHtml = middleNumberKeys.map((numberRow, rowIndex) => numberRow.map((key, columnIndex) => {
    const label = String(key || '').replace('number', '');
    return renderVariantLayoutSlot(project, theme, key, {
      x: middleNumberX + columnIndex * middleNumberCellWidth,
      y: topInset + rowIndex * (rowHeight + rowGap),
      width: middleNumberCellWidth,
      height: rowHeight,
      options,
    }, styles, {
      displayLabel: label,
      foregroundStyleOverride: styles.numericNumberForegroundStyle,
      backgroundStyleOverride: styles.alphabeticBackgroundStyle,
      buttonStyleTypeOverride: 'text',
    });
  }).join('')).join('');
  const footerY = topInset + 3 * (rowHeight + rowGap);
  const leftFooter = layoutVariantLandscapeMetricRow(project, [
    { key: variantLandscapeKeyAt(rows, 3, 0), weight: 1.05 },
    { key: variantLandscapeKeyAt(rows, 3, 1), weight: 0.9 },
    { key: variantLandscapeKeyAt(rows, 3, 2), weight: 2.4 },
  ], leftWidth, leftX, 5, options).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: footerY,
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    displayLabel: item.key === 'semicolon' ? '，' : item.key === 'space' ? '' : undefined,
  })).join('');
  const middleFooter = layoutVariantLandscapeMetricRow(project, [
    { key: '', weight: 1, label: '=' },
    { key: '', weight: 1, label: '@' },
    { key: middleNumberKeyAt(3, 3, 'number0'), weight: 1 },
    { key: '', weight: 1, label: '.' },
  ], middleWidth, middleX, 5, options).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: footerY,
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    isFunction: item.label ? true : undefined,
    displayLabel: item.label ?? (item.key === 'number0' ? '0' : undefined),
    previewKey: item.label ? null : undefined,
    foregroundStyleOverride: item.key && !FUNCTION_KEYS.has(item.key) ? styles.numericNumberForegroundStyle : null,
    backgroundStyleOverride: item.label ? styles.systemButtonBackgroundStyle : (!item.key ? styles.alphabeticBackgroundStyle : null),
    buttonStyleTypeOverride: item.label ? 'text' : null,
  })).join('');
  const rightFooter = layoutVariantLandscapeMetricRow(project, [
    { key: variantLandscapeKeyAt(rows, 3, 4), weight: 2.45 },
    { key: variantLandscapeKeyAt(rows, 3, 5), weight: 1.05 },
    { key: variantLandscapeKeyAt(rows, 3, 6), weight: 1.42 },
  ], rightWidth, rightX, 5, options).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: footerY,
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    accent: item.key === 'enter',
    displayLabel: item.key === 'space' ? '' : undefined,
  })).join('');
  return `
    <div class="calayer-keyboard is-pinyin14-landscape-keyboard" style="${backgroundCssForStyle(project, theme, styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
      ${leftHtml}
      ${middleSymbolsHtml}
      ${middleNumbersHtml}
      ${rightHtml}
      ${leftFooter}
      ${middleFooter}
      ${rightFooter}
    </div>
  `;
}

function renderPinyin17LandscapeKeyboard(project, theme, styles, frame, options = {}) {
  const rows = keyboard26VariantRowsForOrientation(project, 'landscape', options);
  const height = frame.keyboardHeight;
  const layout = previewKeyboardMetrics(styles, frame, { ...options, orientation: 'landscape' }, {
    leftInsetExtra: 6,
    rightInsetExtra: 6,
    topInsetExtra: 4,
    bottomInsetExtra: 4,
    rowGap: 4,
  });
  const { leftInset, topInset, contentWidth, rowGap, rowHeight } = layout;
  const middleGap = contentWidth * 0.115;
  const sideWidth = (contentWidth - middleGap) / 2;
  const leftX = leftInset;
  const rightX = leftX + sideWidth + middleGap;
  const leftHtml = [0, 1, 2].map((rowIndex) => layoutWeightedPreviewRow(
    [0, 1, 2].map((slotIndex) => ({ key: variantLandscapeKeyAt(rows, rowIndex, slotIndex), weight: 1 })),
    sideWidth,
    leftX,
    5,
  ).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: topInset + rowIndex * (rowHeight + rowGap),
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    isFunction: item.key ? undefined : false,
    backgroundStyleOverride: item.key ? null : styles.alphabeticBackgroundStyle,
  })).join('')).join('');
  const rightHtml = [0, 1, 2].map((rowIndex) => layoutWeightedPreviewRow(
    [0, 1, 2].map((slotIndex) => ({
      key: variantLandscapeKeyAt(rows, rowIndex, slotIndex + 3),
      weight: 1,
    })),
    sideWidth,
    rightX,
    5,
  ).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: topInset + rowIndex * (rowHeight + rowGap),
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    isFunction: item.key ? undefined : false,
    backgroundStyleOverride: item.key ? null : styles.alphabeticBackgroundStyle,
  })).join('')).join('');
  const footerY = topInset + 3 * (rowHeight + rowGap);
  const leftFooter = layoutWeightedPreviewRow([
    { key: variantLandscapeKeyAt(rows, 3, 0), weight: 1.15 },
    { key: variantLandscapeKeyAt(rows, 3, 1), weight: 0.85 },
    { key: variantLandscapeKeyAt(rows, 3, 2), weight: 3 },
  ], sideWidth, leftX, 5).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: footerY,
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    displayLabel: item.key === 'space' ? '' : undefined,
  })).join('');
  const rightFooter = layoutWeightedPreviewRow([
    { key: variantLandscapeKeyAt(rows, 3, 3), weight: 3 },
    { key: variantLandscapeKeyAt(rows, 3, 4), weight: 0.85 },
    { key: variantLandscapeKeyAt(rows, 3, 5), weight: 1.15 },
  ], sideWidth, rightX, 5).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: footerY,
    width: item.width,
    height: rowHeight,
    options,
    }, styles, {
      accent: item.key === 'enter',
      displayLabel: item.key === 'space' ? '' : undefined,
    })).join('');
  return `
    <div class="calayer-keyboard is-pinyin17-landscape-keyboard" style="${backgroundCssForStyle(project, theme, styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
      ${leftHtml}
      ${rightHtml}
      ${leftFooter}
      ${rightFooter}
    </div>
  `;
}

function renderPinyin18LandscapeKeyboard(project, theme, styles, frame, options = {}) {
  const rows = keyboard26VariantRowsForOrientation(project, 'landscape', options);
  const height = frame.keyboardHeight;
  const layout = previewKeyboardMetrics(styles, frame, { ...options, orientation: 'landscape' }, {
    leftInsetExtra: 5,
    rightInsetExtra: 5,
    topInsetExtra: 4,
    bottomInsetExtra: 4,
    rowGap: 4,
    colGap: 5,
  });
  const { leftInset, topInset, contentWidth, rowGap, colGap, rowHeight } = layout;
  const splitGap = contentWidth * 0.075;
  const splitLayoutRows = [
    { left: [0, 1, 2], right: [3, 4, 5, 6], leftWeights: [0.9, 1.14, 1.14], rightWeights: [0.9, 0.9, 1.14, 0.92] },
    { left: [0, 1, 2], right: [3, 4, 5], leftWeights: [1.12, 1, 1], rightWeights: [0.9, 1, 1.08], inset: 0.035 },
    { left: [0, 1, 2], right: [3, 4, 5, 6], leftWeights: [1.08, 1.02, 1.06], rightWeights: [0.9, 1.12, 0.94, 0.82] },
  ];
  const sideWidth = (contentWidth - splitGap) / 2;
  const html = [0, 1, 2, 3].map((rowIndex) => {
    const y = topInset + rowIndex * (rowHeight + rowGap);
    if (rowIndex < 3) {
      const split = splitLayoutRows[rowIndex];
      const leftWidth = split.inset ? sideWidth * (1 - split.inset) : sideWidth;
      const rightWidth = split.inset ? sideWidth * (1 - split.inset) : sideWidth;
      const leftX = leftInset + (split.inset ? sideWidth * split.inset : 0);
      const rightX = leftInset + sideWidth + splitGap;
      const leftHtml = layoutVariantLandscapeMetricRow(project,
        split.left.map((slotIndex, index) => ({ key: variantLandscapeKeyAt(rows, rowIndex, slotIndex), weight: split.leftWeights[index] || 1 })),
        leftWidth,
        leftX,
        colGap,
        options,
      ).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
        x: item.x,
        y,
        width: item.width,
        height: rowHeight,
        options,
      }, styles, {
        isFunction: !item.key ? false : undefined,
        backgroundStyleOverride: !item.key ? styles.alphabeticBackgroundStyle : null,
      })).join('');
      const rightHtml = layoutVariantLandscapeMetricRow(project,
        split.right.map((slotIndex, index) => ({ key: variantLandscapeKeyAt(rows, rowIndex, slotIndex), weight: split.rightWeights[index] || 1 })),
        rightWidth,
        rightX,
        colGap,
        options,
      ).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
        x: item.x,
        y,
        width: item.width,
        height: rowHeight,
        options,
      }, styles, {
        isFunction: !item.key ? false : undefined,
        backgroundStyleOverride: !item.key ? styles.alphabeticBackgroundStyle : null,
      })).join('');
      return `${leftHtml}${rightHtml}`;
    }
    return layoutVariantLandscapeMetricRow(project,
      [
        { key: variantLandscapeKeyAt(rows, 3, 0), weight: 1.08 },
        { key: variantLandscapeKeyAt(rows, 3, 1), weight: 0.95 },
        { key: variantLandscapeKeyAt(rows, 3, 2), weight: 3.45 },
        { key: variantLandscapeKeyAt(rows, 3, 3), weight: 1.0 },
        { key: variantLandscapeKeyAt(rows, 3, 4), weight: 1.55 },
      ],
      contentWidth,
      leftInset,
      colGap,
      options,
    ).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
      x: item.x,
      y,
      width: item.width,
      height: rowHeight,
      options,
    }, styles, {
      accent: item.key === 'enter',
      displayLabel: item.key === 'space' ? '' : undefined,
    })).join('');
  }).join('');
  return `
    <div class="calayer-keyboard is-pinyin18-landscape-keyboard" style="${backgroundCssForStyle(project, theme, styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
      ${html}
    </div>
  `;
}

function landscapeSectionFallbackRows(project, section) {
  const rows = project.keyboards?.keyboard26?.layout?.landscape?.[section];
  return Array.isArray(rows) ? rows.filter((row) => Array.isArray(row) && row.length) : [];
}

function renderKeyboard26LandscapeSection(project, theme, styles, rows, geometry, options = {}) {
  const rowGap = 4;
  const colGap = 5;
  const rowHeight = (geometry.height - rowGap * Math.max(rows.length - 1, 0)) / Math.max(rows.length, 1);
  return rows.map((row, rowIndex) => {
    const weightedItems = row.map((key) => ({
      key,
      weight: key === 'space' ? 2.6 : key === 'enter' ? 1.35 : FUNCTION_KEYS.has(key) ? 1.05 : 1,
    }));
    return layoutVariantLandscapeMetricRow(project, weightedItems, geometry.width, geometry.x, colGap, options)
      .map((item) => renderVariantLayoutSlot(project, theme, item.key, {
        x: item.x,
        y: geometry.y + rowIndex * (rowHeight + rowGap),
        width: item.width,
        height: rowHeight,
        options,
      }, styles, {
        accent: item.key === 'enter',
      })).join('');
  }).join('');
}

function renderKeyboard26LandscapeKeyboard(project, theme, styles, frame, options = {}) {
  const height = frame.keyboardHeight;
  const layout = previewKeyboardMetrics(styles, frame, { ...options, orientation: 'landscape' }, {
    leftInsetExtra: 6,
    rightInsetExtra: 6,
    topInsetExtra: 4,
    bottomInsetExtra: 4,
  });
  const { leftInset, topInset, contentWidth, contentHeight } = layout;
  const sectionGap = 8;
  const sections = [
    { id: 'left', rows: landscapeSectionFallbackRows(project, 'left'), weight: 1 },
    { id: 'middle', rows: landscapeSectionFallbackRows(project, 'middle'), weight: 1 },
    { id: 'right', rows: landscapeSectionFallbackRows(project, 'right'), weight: 1 },
  ].filter((section) => section.rows.length);
  const rows = sections.length ? [] : rowsForMode(project, 'keyboard26', 'landscape', options);
  const renderFallbackRows = () => {
    if (!rows.length) return '';
    return renderKeyboard26LandscapeSection(project, theme, styles, rows, {
      x: leftInset,
      y: topInset,
      width: contentWidth,
      height: contentHeight,
    }, options);
  };
  let x = leftInset;
  const totalWeight = sections.reduce((sum, section) => sum + section.weight, 0) || 1;
  const sectionWidthBudget = contentWidth - sectionGap * Math.max(sections.length - 1, 0);
  const sectionHtml = sections.map((section, index) => {
    const sectionWidth = sectionWidthBudget * (section.weight / totalWeight);
    const html = renderKeyboard26LandscapeSection(project, theme, styles, section.rows, {
      x,
      y: topInset,
      width: sectionWidth,
      height: contentHeight,
    }, options);
    x += sectionWidth + (index === sections.length - 1 ? 0 : sectionGap);
    return html;
  }).join('');
  return `
    <div class="calayer-keyboard is-keyboard26-landscape-keyboard" style="${backgroundCssForStyle(project, theme, styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
      ${sections.length ? sectionHtml : renderFallbackRows()}
    </div>
  `;
}

function keyboard26ProfileFromOptions(options = {}) {
  return options.keyboardProfile === 'alphabetic' ? 'alphabetic' : 'pinyin';
}

function keyboard26LandscapeLayoutFromGuide(project, options = {}) {
  const profile = keyboard26ProfileFromOptions(options);
  const preferences = project?.guide?.preferences || {};
  const key = profile === 'alphabetic' ? 'alphabeticLandscapeLayout' : 'pinyinLandscapeLayout';
  return preferences[key] === 'standard' ? 'standard' : 'split';
}

function renderKeyboard26StandardLandscapeKeyboard(project, theme, styles, frame, options = {}) {
  const height = frame.keyboardHeight;
  const rows = rowsForMode(project, 'keyboard26', 'portrait', options);
  const rowHeight = height / Math.max(rows.length, 1);
  const keyOptions = { ...options, pinyinVariant: '26' };
  return `
    <div class="calayer-keyboard is-keyboard26-standard-landscape-keyboard" style="${backgroundCssForStyle(project, theme, styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)}">
      ${rows.map((row) => `
        <div class="calayer-row" style="height:${rowHeight}px">
          ${row.map((key) => keyLayer(project, theme, 'keyboard26', key, rowHeight, styles, 'portrait', keyOptions)).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

function keyboard26PreviewSourceVariant(options = {}) {
  return options.previewSourceName || '';
}

function keyboard26DisplaySpec(project, key, options = {}) {
  const keyboard = project.keyboards?.keyboard26 || {};
  const profile = keyboard26ProfileFromOptions(options);
  const customLabel = profile === 'alphabetic'
    ? keyboard.keyDisplays?.[`alphabetic.${key}`] || keyboard.keyDisplays?.[`english.${key}`]
    : keyboard.keyDisplays?.[key];
  const customType = keyboard.keyDisplayTypes?.[key] || 'text';
  if (customLabel) {
    const content = options.shiftActive && customType !== 'systemImageName' && /^[a-z]$/.test(customLabel)
      ? customLabel.toUpperCase()
      : customLabel;
    return {
      content,
      type: customType === 'systemImageName' ? 'systemImage' : 'text',
      custom: true,
    };
  }
  const systemImage = SYSTEM_IMAGE_BY_KEY[key];
  if (systemImage) {
    return { content: systemImage, type: 'systemImage', custom: false };
  }
  const label = labelForMode(project, 'keyboard26', key, options);
  const content = options.shiftActive && /^[a-z]$/.test(label) ? label.toUpperCase() : label;
  return { content, type: 'text', custom: false };
}

function spaceRowCommaSwipeUp(project, profile) {
  if (profile !== 'alphabetic') {
    return project.keyboardCombo?.spaceRow?.commaKey?.swipeUp
      || project.keyboards?.keyboard26?.spaceRight?.[profile]?.secondary?.text
      || project.keyboards?.keyboard26?.spaceRight?.pinyin?.secondary?.text
      || '';
  }
  return project.keyboards?.keyboard26?.spaceRight?.alphabetic?.secondary?.text
    || project.keyboards?.keyboard26?.spaceRight?.[profile]?.secondary?.text
    || '';
}

function foregroundCss(style = {}) {
  const type = styleDisplayType(style);
  const center = style.center || { x: 0.5, y: 0.5 };
  const fontSize = Number(style.fontSize || 14);
  const basePreviewFontScale = Number.isFinite(Number(style.previewFontScale))
    ? Number(style.previewFontScale)
    : 0.72;
  const previewFontScale = type === 'systemImage' ? basePreviewFontScale * 1.28 : basePreviewFontScale;
  const imageSize = imageBaseSize(style);
  return [
    `left:${Number(center.x ?? 0.5) * 100}%`,
    `top:${Number(center.y ?? 0.5) * 100}%`,
    `font-size:${Math.max(6, fontSize * previewFontScale)}px`,
    (type === 'fileImage' || type === 'assetImage') ? `width:${imageSize}px` : '',
    (type === 'fileImage' || type === 'assetImage') ? `height:${imageSize}px` : '',
    `color:${cssColor(style.normalColor, 'currentColor')}`,
    style.fontWeight ? `font-weight:${style.fontWeight}` : '',
  ].filter(Boolean).join(';');
}

function styleDisplayType(style = {}) {
  if (style.buttonStyleType) return style.buttonStyleType;
  if (style.systemImageName || style.highlightSystemImageName) return 'systemImage';
  if (style.assetImageName) return 'assetImage';
  if (style.normalImage || style.highlightImage) return 'fileImage';
  return 'text';
}

function imageScale(style = {}) {
  const scaleX = Number(style.targetScale?.x);
  const scaleY = Number(style.targetScale?.y);
  return {
    x: Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1,
    y: Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1,
  };
}

function imageBaseSize(style = {}) {
  const fontSize = Number(style.fontSize || 14);
  const basePreviewFontScale = Number.isFinite(Number(style.previewFontScale))
    ? Number(style.previewFontScale)
    : 0.72;
  const previewFontScale = styleDisplayType(style) === 'systemImage' ? basePreviewFontScale * 1.28 : basePreviewFontScale;
  return Math.max(12, fontSize * previewFontScale);
}

function assetSourceBaseName(source = '') {
  const fileName = String(source || '').split(/[\\/]/).pop() || '';
  return fileName.replace(/\.[^.]+$/, '');
}

function normalizePreviewImageSource(source = '', theme = 'light') {
  const value = String(source || '').trim();
  if (!value) return '';
  if (/^(data:|blob:|https?:|file:)/i.test(value)) return value;
  if (value.startsWith('/')) return value;
  if (value.startsWith('resources/')) {
    return new URL(`../../../../templates/hamster-ios/${theme}/${value}`, import.meta.url).href;
  }
  if (value.startsWith('templates/')) {
    return new URL(`../../../../${value}`, import.meta.url).href;
  }
  return value;
}

function templateResourceUrl(theme = 'light', file = '') {
  const value = String(file || '').trim();
  if (!value) return '';
  const fileName = /\.[^.]+$/.test(value) ? value : `${value}.png`;
  return new URL(`../../../../templates/hamster-ios/${theme}/resources/${fileName}`, import.meta.url).href;
}

function referenceBubbleUrl(theme = 'light') {
  const mode = theme === 'dark' ? 'dark' : 'light';
  const baseUrl = typeof import.meta !== 'undefined' && import.meta?.env?.BASE_URL
    ? import.meta.env.BASE_URL
    : '/';
  return `${baseUrl}reference-bubble/${mode}.png`;
}

function findProjectImageAsset(project, predicate) {
  const assets = project?.assets?.images && typeof project.assets.images === 'object'
    ? Object.entries(project.assets.images)
    : [];
  for (const [key, asset] of assets) {
    if (asset && predicate(asset, key)) return asset;
  }
  return null;
}

function resolveFileImageSource(project, theme = 'light', imageRef = null) {
  if (!imageRef || typeof imageRef !== 'object') return '';
  const fileName = String(imageRef.file || '').trim();
  const normalizedFile = fileName.replace(/\.[^.]+$/, '');
  const matchAssetByFile = (item, key) => {
    const itemFile = String(item.file || '').replace(/\.[^.]+$/, '');
    const itemSourceBase = assetSourceBaseName(item.source);
    return itemFile === normalizedFile
      || String(key || '').toLowerCase() === normalizedFile.toLowerCase()
      || itemSourceBase.toLowerCase() === normalizedFile.toLowerCase();
  };
  const asset = normalizedFile ? findProjectImageAsset(project, matchAssetByFile) : null;
  if (asset?.source) return normalizePreviewImageSource(asset.source, theme);
  const imageAsset = imageRef.image ? findProjectImageAsset(project, (item) => String(item.image || '') === String(imageRef.image)) : null;
  if (imageAsset?.source) return normalizePreviewImageSource(imageAsset.source, theme);
  if (normalizedFile) return templateResourceUrl(theme, normalizedFile);
  return '';
}

function resolveAssetImageSource(project, theme = 'light', assetImageName = '') {
  const target = String(assetImageName || '').trim();
  if (!target) return '';
  const direct = project?.assets?.images?.[target];
  if (direct?.source) return normalizePreviewImageSource(direct.source, theme);
  const normalizedTarget = target.toLowerCase();
  const matched = findProjectImageAsset(project, (asset, key) => {
    const itemFile = String(asset.file || '').replace(/\.[^.]+$/, '').toLowerCase();
    const itemImage = String(asset.image || '').toLowerCase();
    const itemSourceBase = assetSourceBaseName(asset.source).toLowerCase();
    return String(key || '').toLowerCase() === normalizedTarget
      || itemFile === normalizedTarget
      || itemImage === normalizedTarget
      || itemSourceBase === normalizedTarget;
  });
  if (matched?.source) return normalizePreviewImageSource(matched.source, theme);
  return templateResourceUrl(theme, target);
}

function resolveStyleImageSource(style = {}, project, theme = 'light', context = {}) {
  const type = styleDisplayType(style);
  if (type === 'assetImage') return resolveAssetImageSource(project, theme, style.assetImageName);
  if (type !== 'fileImage') return '';
  const active = context.active === true;
  const imageRef = active && style.highlightImage ? style.highlightImage : style.normalImage || style.highlightImage;
  return resolveFileImageSource(project, theme, imageRef);
}

function backgroundCssForStyle(project, theme, style = {}, context = {}) {
  const type = styleDisplayType(style);
  if (type === 'fileImage' || type === 'assetImage') {
    const imageUrl = resolveStyleImageSource(style, project, theme, context);
    if (imageUrl) {
      const scale = imageScale(style);
      return [
        geometryCss(style),
        `background-image:url("${escapeHtml(imageUrl)}")`,
        'background-position:center',
        'background-repeat:no-repeat',
        `background-size:${scale.x * 100}% ${scale.y * 100}%`,
      ].filter(Boolean).join(';');
    }
  }
  return geometryCss(style);
}

function renderBackgroundLayer(project, theme, style = {}, extraCss = '', context = {}) {
  const css = [
    backgroundCssForStyle(project, theme, style, context),
    insetPositionCss(style.insets),
    extraCss,
  ].filter(Boolean).join(';');
  return `<div class="calayer-background is-layer-bg" style="${css}"></div>`;
}

function renderForeground(style, content, context = {}) {
  const type = styleDisplayType(style);
  const fallbackContent = content || style.text || style.assetImageName || style.normalImage?.file || style.highlightImage?.file || '';
  if (type === 'text' && !fallbackContent) return '';
  if (type === 'systemImage' && !(content || style.systemImageName || style.highlightSystemImageName)) return '';
  const imageUrl = (type === 'fileImage' || type === 'assetImage')
    ? resolveStyleImageSource(style, context.project, context.theme, context)
    : '';
  const safeContent = type === 'systemImage'
    ? renderSystemImageSvg(content || style.systemImageName || style.highlightSystemImageName)
    : imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="" draggable="false" style="width:100%;height:100%;object-fit:contain;display:block">`
      : escapeHtml(fallbackContent);
  const extraClass = style.className ? ` ${style.className}` : '';
  return `<span class="calayer-foreground is-${type}${imageUrl ? ' has-image' : ''}${extraClass}" style="${foregroundCss(style)}">${safeContent}</span>`;
}

function visualTextLength(value) {
  return [...String(value || '')].reduce((sum, char) => (
    /[\u0000-\u00ff]/.test(char) ? sum + 0.55 : sum + 1
  ), 0);
}

function swipeStyle(baseStyle, content, className) {
  return {
    ...baseStyle,
    className,
  };
}

function resolveSwipeData(project, mode, options = {}) {
  if (mode === 'keyboard26' && keyboard26PreviewSourceVariant(options).startsWith('alphabetic_26_plain_')) return {};
  if (mode === 'keyboard26' && activePinyinVariantForPreview(project, options) !== '26') return {};
  if (project.data?.swipesEnabled === false || project.keyboardCombo?.swipeBehavior?.mode === 'disabled') return {};
  if (mode === 'keyboard26') {
    const profile = keyboard26ProfileFromOptions(options);
    if (project.keyboardCombo?.swipeBehavior?.layouts?.[profile]?.mode === 'disabled') return {};
    return project.data?.swipes?.[profile] || {};
  }
  if (mode === 'numeric') return project.data?.swipes?.numeric || {};
  return {};
}

function swipeMarksVisible(project) {
  return !['hidden', 'disabled'].includes(project.keyboardCombo?.swipeBehavior?.mode);
}

function swipeDirectionVisible(project, direction, profile = null) {
  if (!swipeMarksVisible(project)) return false;
  const behavior = project.keyboardCombo?.swipeBehavior || {};
  const layoutBehavior = profile ? behavior.layouts?.[profile] : null;
  const mode = layoutBehavior?.mode || behavior.mode;
  if (mode === 'hidden' || mode === 'disabled') return false;
  const showSwipeUp = layoutBehavior?.showSwipeUp ?? behavior.showSwipeUp;
  const showSwipeDown = layoutBehavior?.showSwipeDown ?? behavior.showSwipeDown;
  if (direction === 'up') return showSwipeUp !== false;
  if (direction === 'down') return showSwipeDown !== false;
  return true;
}

function resolveSwipeEntry(project, mode, key, direction, options = {}) {
  const profile = mode === 'keyboard26' ? keyboard26ProfileFromOptions(options) : null;
  if (!swipeDirectionVisible(project, direction, profile)) return null;
  const data = resolveSwipeData(project, mode, options);
  const source = data[direction === 'up' ? 'swipe_up' : 'swipe_down'] || {};
  return source[key] || null;
}

function swipeLabelSpec(entry = {}) {
  const label = entry?.label || {};
  if (label.systemImageName) return { content: label.systemImageName, type: 'systemImage' };
  if (label.text !== undefined) return { content: String(label.text), type: 'text' };
  const action = entry?.action;
  if (typeof action === 'string') {
    return action === 'tab' ? { content: 'tab', type: 'text' } : null;
  }
  if (!action || typeof action !== 'object') return null;
  if (action.character !== undefined && action.character !== null) return { content: String(action.character), type: 'text' };
  if (action.symbol !== undefined && action.symbol !== null) return { content: String(action.symbol), type: 'text' };
  if (action.shortcut !== undefined && action.shortcut !== null) {
    const shortcutLabels = {
      '#selectText': 'select',
      '#cut': 'cut',
      '#copy': 'copy',
      '#paste': 'paste',
      '#行首': 'home',
      '#行尾': 'end',
    };
    const content = shortcutLabels[String(action.shortcut)] || '';
    return content ? { content, type: 'text' } : null;
  }
  return null;
}

function swipeForeground(baseStyle, entry, theme, className) {
  const derived = swipeLabelSpec(entry);
  if (!derived?.content) return null;
  if (entry?.label?.text === '') return null;
  const color = entry?.color?.[theme];
  const buttonStyleType = derived.type === 'systemImage' ? 'systemImage' : 'text';
  return {
    style: {
      ...baseStyle,
      className,
      buttonStyleType,
      center: entry.center || baseStyle.center,
      normalColor: color?.normalColor || baseStyle.normalColor,
    },
    content: derived.content,
  };
}

function swipeForegroundStyleForMode(styles, project, mode, direction, entry = {}) {
  const baseStyle = direction === 'up' ? styles.swipeUpForegroundStyle : styles.swipeDownForegroundStyle;
  const icon = swipeLabelSpec(entry)?.type === 'systemImage';
  if (mode !== 'numeric') {
    const key = direction === 'up'
      ? icon ? '上划sf符号偏移' : '上划文字偏移'
      : icon ? '下划sf符号偏移' : '下划文字偏移';
    return {
      ...baseStyle,
      center: resolveCenter(project, key, baseStyle.center),
    };
  }
  const key = direction === 'up'
    ? icon ? '数字键盘上划sf符号偏移' : '数字键盘上划文字偏移'
    : icon ? '数字键盘下划sf符号偏移' : '数字键盘下划文字偏移';
  return {
    ...baseStyle,
    center: resolveCenter(project, key, direction === 'up' ? { x: 0.82, y: 0.28 } : { x: 0.5, y: 0.78 }),
  };
}

function boundsCss(bounds) {
  if (!bounds?.width && !bounds?.height) return '';
  const width = parseFraction(bounds.width);
  const height = parseFraction(bounds.height);
  const alignment = bounds.alignment || 'center';
  return [
    width ? `width:${width * 100}%` : '',
    height ? `height:${height * 100}%` : '',
    alignment.includes('right') ? 'margin-left:auto' : '',
    alignment.includes('left') ? 'margin-right:auto' : '',
    alignment.includes('Bottom') ? 'margin-top:auto' : '',
    alignment.includes('Top') ? 'margin-bottom:auto' : '',
  ].filter(Boolean).join(';');
}

function insetPositionCss(insets = {}) {
  return [
    `top:${Number(insets.top || 0)}px`,
    `right:${Number(insets.right || 0)}px`,
    `bottom:${Number(insets.bottom || 0)}px`,
    `left:${Number(insets.left || 0)}px`,
  ].join(';');
}

function numberInset(insets = {}, edge) {
  return Number(insets?.[edge] || 0);
}

function visibleRectWithinCell(cellRect, bounds = null) {
  const widthRatio = parseFraction(bounds?.width) || 1;
  const heightRatio = parseFraction(bounds?.height) || 1;
  const width = cellRect.width * widthRatio;
  const height = cellRect.height * heightRatio;
  const alignment = bounds?.alignment || 'center';
  const x = alignment.includes('left')
    ? cellRect.x
    : alignment.includes('right')
      ? cellRect.x + cellRect.width - width
      : cellRect.x + (cellRect.width - width) / 2;
  const y = alignment.includes('Top')
    ? cellRect.y
    : alignment.includes('Bottom')
      ? cellRect.y + cellRect.height - height
      : cellRect.y + (cellRect.height - height) / 2;
  return { x, y, width, height };
}

function rowKeyRects(project, mode, row, y, rowHeight, availableWidth, orientation, options = {}) {
  const metrics = row.map((key) => resolveKeyMetric(project, mode, key, orientation, options));
  const fixedWidths = metrics.map((metric) => {
    if (!metric.basis) return null;
    const percentage = Number.parseFloat(metric.basis) / 100;
    return Number.isFinite(percentage) ? availableWidth * percentage : null;
  });
  const flexibleCount = fixedWidths.filter((width) => width === null).length;
  const fixedTotal = fixedWidths.reduce((sum, width) => sum + (width || 0), 0);
  const flexWidth = flexibleCount ? Math.max(availableWidth - fixedTotal, 0) / flexibleCount : 0;
  let x = 0;
  return row.map((key, index) => {
    const width = fixedWidths[index] ?? flexWidth;
    const rect = visibleRectWithinCell({ x, y, width, height: rowHeight }, metrics[index].bounds);
    x += width;
    return [key, rect];
  });
}

function previewMetricWidthPx(project, mode, key, availableWidth, orientation = 'portrait', options = {}) {
  if (!key) return null;
  const metric = resolveKeyMetric(project, mode, variantMetricKey(project, key, options), orientation, options);
  if (!metric.basis) return null;
  const percentage = Number.parseFloat(metric.basis) / 100;
  return Number.isFinite(percentage) ? availableWidth * percentage : null;
}

function layoutPreviewMetricRow(project, mode, items, width, xStart = 0, gap = 0, orientation = 'portrait', options = {}) {
  const usableWidth = width - gap * Math.max(items.length - 1, 0);
  const preferredWidths = items.map((item) => previewMetricWidthPx(project, mode, item.key, usableWidth, orientation, options));
  const preferredTotal = preferredWidths.reduce((sum, itemWidth) => sum + (itemWidth || 0), 0);
  const flexibleItems = items.filter((_, index) => preferredWidths[index] === null);
  const flexibleWeightTotal = flexibleItems.reduce((sum, item) => sum + Number(item.weight || 1), 0);
  const remainingWidth = Math.max(usableWidth - preferredTotal, 0);
  const fixedScale = flexibleItems.length === 0 && preferredTotal > 0 ? usableWidth / preferredTotal : 1;
  let x = xStart;
  return items.map((item, index) => {
    const widthFromMetric = preferredWidths[index];
    const fallbackWeight = Number(item.weight || 1);
    const cellWidth = widthFromMetric !== null
      ? widthFromMetric * fixedScale
      : flexibleWeightTotal > 0
        ? remainingWidth * (fallbackWeight / flexibleWeightTotal)
        : 0;
    const placed = { ...item, x, width: cellWidth };
    x += cellWidth + (index === items.length - 1 ? 0 : gap);
    return placed;
  });
}

function renderLayerCell({ className = '', basis = null, width = null, bounds = null, height = null, backgroundStyle, foregrounds = [], attrs = '', project = null, theme = 'light' }) {
  const outerStyle = [
    basis ? `flex:0 0 ${basis}` : '',
    width !== null ? `flex:0 0 ${width}px;width:${width}px` : '',
    height ? `height:${height}px` : '',
  ].filter(Boolean).join(';');
  const visibleStyle = boundsCss(bounds);
  const backgroundCss = [
    project ? backgroundCssForStyle(project, theme, backgroundStyle) : geometryCss(backgroundStyle),
    insetPositionCss(backgroundStyle?.insets),
  ].filter(Boolean).join(';');

  return `
    <div class="calayer-cell ${className}" style="${outerStyle}" ${attrs}>
      <div class="calayer-visible" style="${visibleStyle}">
        <div class="calayer-background is-layer-bg" style="${backgroundCss}"></div>
        ${foregrounds.join('')}
      </div>
    </div>
  `;
}

function hintLabelSpec(item = {}) {
  const label = item.label || {};
  if (label.systemImageName) return { content: label.systemImageName, type: 'systemImage', visualLength: 1 };
  if (label.text !== undefined) {
    const content = String(label.text);
    return { content, type: 'text', visualLength: visualTextLength(content) };
  }
  const action = item.action || {};
  const actionValue = action.symbol ?? action.character ?? action.shortcut ?? action.shortcutCommand;
  const content = actionValue === undefined ? '' : String(actionValue);
  return { content, type: 'text', visualLength: visualTextLength(content) };
}

function hintEntryForMode(project, mode, targetKey) {
  if (!targetKey) return null;
  if (mode === 'numeric') {
    const entries = project.data?.hints?.number || {};
    const dataKey = /^\d$/.test(targetKey) ? `number${targetKey}` : targetKey;
    const entry = entries[dataKey];
    return entry ? { key: targetKey, entry } : null;
  }
  if (mode !== 'keyboard26') return null;
  const entries = project.data?.hints?.pinyin || {};
  const entry = entries[targetKey] || entries[String(targetKey).toLowerCase()];
  return entry ? { key: targetKey, entry } : null;
}

function keyRectForMode(project, mode, targetKey, frame, orientation, options = {}) {
  if (!targetKey) return null;
  const keyboardInsets = mode === 'symbolic'
    ? { top: 3, right: 4, bottom: 3, left: 4 }
    : layerStyles(project, 'light', options).keyboardStyle.insets;
  const top = frame.toolbarHeight + numberInset(keyboardInsets, 'top');
  const height = frame.keyboardHeight - numberInset(keyboardInsets, 'top') - numberInset(keyboardInsets, 'bottom');
  const availableWidth = PREVIEW_LOGICAL_SIZE[orientation]?.width || PREVIEW_LOGICAL_WIDTH;
  const contentWidth = availableWidth - numberInset(keyboardInsets, 'left') - numberInset(keyboardInsets, 'right');
  if (mode === 'numeric') {
    const columns = project.keyboards?.numeric?.layout?.portrait?.columns?.length
      ? project.keyboards.numeric.layout.portrait.columns
      : DEFAULT_NUMERIC_COLUMNS;
    const columnIndex = columns.findIndex((column) => column.includes(targetKey));
    if (columnIndex < 0) return null;
    const rowIndex = columns[columnIndex]?.indexOf(targetKey) ?? -1;
    if (rowIndex < 0) return null;
    const columnWidth = contentWidth / Math.max(columns.length, 1);
    const rowHeight = height / Math.max(...columns.map((column) => column.length), 1);
    const metric = resolveKeyMetric(project, 'numeric', targetKey, orientation, options);
    const cellRect = {
      x: numberInset(keyboardInsets, 'left') + columnIndex * columnWidth,
      y: top + rowIndex * rowHeight,
      width: columnWidth,
      height: rowHeight,
    };
    return visibleRectWithinCell(cellRect, metric.bounds);
  }
  const rows = rowsForMode(project, mode, orientation, options);
  const rowIndex = rows.findIndex((row) => row.includes(targetKey));
  if (rowIndex < 0) return null;
  const row = rows[rowIndex] || [];
  const rowHeight = height / Math.max(rows.length, 1);
  return rowKeyRects(
    project,
    mode,
    row,
    top + rowIndex * rowHeight,
    rowHeight,
    contentWidth,
    orientation,
    options,
  ).find(([key]) => key === targetKey)?.[1] || null;
}

function hintAnchorForMode(project, mode, targetKey, frame, orientation, options = {}) {
  const rect = keyRectForMode(project, mode, targetKey, frame, orientation, options);
  if (!rect) return null;
  return {
    x: rect.x + rect.width / 2,
    y: rect.y,
  };
}

function renderHintOverlay(project, theme, mode, styles, frame, options = {}) {
  const sample = hintEntryForMode(project, mode, options.activeHintKey);
  const list = Array.isArray(sample?.entry?.list) ? sample.entry.list : [];
  if (!list.length) return '';

  const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  const keyRect = keyRectForMode(project, mode, sample.key, frame, orientation, options) || { width: HINT_PREVIEW_MIN_CELL_WIDTH, height: HINT_PREVIEW_CELL_HEIGHT };
  const configuredSize = sample.entry?.size || {};
  const labelSpecs = list.map((item) => hintLabelSpec(item));
  const selectedIndex = Math.min(Math.max(Number(sample.entry.selectedIndex || 0), 0), list.length - 1);
  const maxTextLength = Math.max(0, ...labelSpecs
    .filter((label) => label.type === 'text')
    .map((label) => label.visualLength || [...label.content].length));
  const cellWidth = Math.max(
    keyRect.width * 0.76,
    maxTextLength > 3
      ? HINT_PREVIEW_LONG_TEXT_CELL_WIDTH - 8
      : maxTextLength > 1
        ? HINT_PREVIEW_TEXT_CELL_WIDTH - 8
        : HINT_PREVIEW_MIN_CELL_WIDTH - 6,
  );
  const configuredWidth = Number(configuredSize.width);
  const configuredHeight = Number(configuredSize.height);
  const width = Number.isFinite(configuredWidth) && configuredWidth > 0
    ? configuredWidth
    : Math.max(cellWidth * list.length, HINT_PREVIEW_MIN_CELL_WIDTH);
  const height = Number.isFinite(configuredHeight) && configuredHeight > 0
    ? configuredHeight
    : Math.max(HINT_PREVIEW_CELL_HEIGHT - 6, keyRect.height * 0.92);
  const itemHeight = Math.max(1, height - 8);
  const anchor = hintAnchorForMode(project, mode, sample.key, frame, orientation, options);
  const previewWidth = PREVIEW_LOGICAL_SIZE[orientation]?.width || PREVIEW_LOGICAL_WIDTH;
  const left = Math.min(Math.max(anchor.x - width / 2, 6), previewWidth - width - 6);
  const top = Math.min(Math.max(anchor.y - height - 9, 4), frame.toolbarHeight + frame.keyboardHeight - height - 6);

  return `
    <div class="long-press-hint-preview" style="left:${left}px;top:${top}px;width:${width}px;height:${height}px">
      ${renderBackgroundLayer(project, theme, styles.hintBackgroundStyle)}
      <div class="long-press-hint-items" style="${insetPositionCss(styles.hintBackgroundStyle.insets)};grid-template-columns:repeat(${list.length}, minmax(0, 1fr))">
        ${list.map((item, index) => {
    const selected = index === selectedIndex;
    const label = labelSpecs[index];
    const baseStyle = label.type === 'systemImage'
      ? selected ? styles.hintSelectedIconStyle : styles.hintIconStyle
      : selected ? styles.hintSelectedTextStyle : styles.hintTextStyle;
    const foregroundStyle = {
      ...baseStyle,
      buttonStyleType: label.type,
    };
    return renderLayerCell({
      className: `long-press-hint-item ${selected ? 'is-selected' : ''}`,
      height: itemHeight,
      backgroundStyle: selected
        ? styles.hintSelectedBackgroundStyle
        : { buttonStyleType: 'geometry', normalColor: '#00000000', cornerRadius: 0 },
      foregrounds: [renderForeground(foregroundStyle, label.content)],
      project,
      theme,
    });
  }).join('')}
      </div>
    </div>
  `;
}

function renderDefaultBubblePreview(project, theme, mode, styles, frame, options = {}) {
  if (mode !== 'keyboard26') return '';
  const key = options.activePressedKey;
  if (!key || options.activeHintKey) return '';
  const orientation = previewOrientation(options);
  const rect = keyRectForMode(project, mode, key, frame, orientation, options);
  if (!rect) return '';
  const display = keyboard26DisplaySpec(project, key, options);
  if (!display?.content) return '';
  const visualLength = display.type === 'systemImage' ? 1 : Math.max(1, visualTextLength(display.content));
  const width = Math.max(rect.width * 0.76, display.type === 'systemImage' ? 34 : 37);
  const height = Math.max(rect.height * 0.7, width * 0.84);
  const previewWidth = PREVIEW_LOGICAL_SIZE[orientation]?.width || PREVIEW_LOGICAL_WIDTH;
  const anchorX = rect.x + rect.width / 2;
  const left = Math.min(Math.max(anchorX - width / 2, 4), previewWidth - width - 4);
  const arrowX = Math.min(Math.max(anchorX - left, 8), width - 8);
  const top = Math.max(2, rect.y - height - 3);
  const pressedStyle = display.type === 'systemImage'
    ? {
      ...styles.hintIconStyle,
      buttonStyleType: display.type,
      center: { ...(styles.pressedBubbleTextStyle?.center || { x: 0.5, y: 0.48 }), y: 0.48 },
      fontSize: Math.max(13, Math.min(width * 0.32, 17)),
      previewFontScale: 0.82,
      normalColor: styles.pressedBubbleTextStyle?.normalColor
        || styles.hintSelectedTextStyle?.normalColor
        || styles.hintTextStyle?.normalColor,
    }
    : {
      ...styles.pressedBubbleTextStyle,
      buttonStyleType: display.type,
      center: { ...(styles.pressedBubbleTextStyle || {}).center, y: 0.48 },
      fontSize: Math.max(8, Math.min(Number(styles.pressedBubbleTextStyle?.fontSize || 28), width * 0.32)),
    };
  return `
    <div class="default-bubble-preview" style="left:${left}px;top:${top}px;width:${width}px;height:${height}px;--bubble-arrow-x:${arrowX}px">
      <div class="default-bubble-text">
        ${renderForeground(pressedStyle, display.content, { project, theme })}
      </div>
    </div>
  `;
}

function keyLayer(project, theme, mode, key, rowHeight, styles, orientation = 'portrait', options = {}) {
  const isFunction = FUNCTION_KEYS.has(key) || mode !== 'keyboard26';
  const metric = resolveKeyMetric(project, mode, key, orientation, options);
  const isPressed = options.activePressedKey === key;
  const backgroundStyle = key === 'enter'
    ? styles.enterButtonBackgroundStyle
    : isFunction
      ? { ...styles.systemButtonBackgroundStyle, insets: resolveInsets(project, mode, key) }
      : { ...styles.alphabeticBackgroundStyle, insets: resolveInsets(project, mode, key) };
  const mainStyle = key === 'enter'
    ? styles.enterForegroundStyle
    : key === 'space'
      ? styles.spaceForegroundStyle
    : isFunction
      ? styles.functionForegroundStyle
      : styles.keyForegroundStyle;
  const label = labelForMode(project, mode, key, options);
  const keyboard26Display = mode === 'keyboard26' ? keyboard26DisplaySpec(project, key, options) : null;
  const systemImage = mode === 'keyboard26' ? null : SYSTEM_IMAGE_BY_KEY[key];
  const swipeUpEntry = resolveSwipeEntry(project, mode, key, 'up', options);
  const swipeDownEntry = resolveSwipeEntry(project, mode, key, 'down', options);
  const swipeUp = swipeForeground(
    swipeForegroundStyleForMode(styles, project, mode, 'up', swipeUpEntry),
    swipeUpEntry,
    theme,
    'is-swipe is-swipe-up',
  );
  const swipeDown = swipeForeground(
    swipeForegroundStyleForMode(styles, project, mode, 'down', swipeDownEntry),
    swipeDownEntry,
    theme,
    'is-swipe is-swipe-down',
  );
  const spaceRightProfile = keyboard26ProfileFromOptions(options);
  const profile = mode === 'keyboard26' ? spaceRightProfile : null;
  const spaceRightConfig = project.keyboards?.keyboard26?.spaceRight?.[spaceRightProfile]
    || project.keyboards?.keyboard26?.spaceRight?.pinyin
    || {};
  const showSpaceRightSecondary = swipeDirectionVisible(project, 'up', profile);
  const foregrounds = key === 'spaceRight'
    ? [
      renderForeground(styles.spaceRightPrimaryForegroundStyle, spaceRightConfig.primary?.text || '，'),
      showSpaceRightSecondary
        ? renderForeground(styles.spaceRightSecondaryForegroundStyle, spaceRowCommaSwipeUp(project, spaceRightProfile))
        : '',
      swipeDown ? renderForeground(swipeDown.style, swipeDown.content) : '',
    ]
    : [
      renderForeground(
        keyboard26Display
          ? { ...mainStyle, buttonStyleType: keyboard26Display.type }
          : systemImage
            ? { ...mainStyle, buttonStyleType: 'systemImage' }
            : mainStyle,
        keyboard26Display?.content || systemImage || label,
      ),
      swipeUp ? renderForeground(swipeUp.style, swipeUp.content) : '',
      swipeDown ? renderForeground(swipeDown.style, swipeDown.content) : '',
    ];
  const schemaName = project.keyboards?.keyboard26?.pinyinSchemaName;
  const schemaNameText = String(schemaName?.text || '').trim();
  if (
    mode === 'keyboard26'
    && key === 'space'
    && schemaName
    && schemaNameText
    && project.keyboardCombo?.spaceRow?.showSchemaNameOnSpace !== false
    && activePinyinVariantForPreview(project, options) === '26'
  ) {
    foregrounds.push(renderForeground({
      buttonStyleType: 'text',
      center: schemaName.center || { x: 0.17, y: 0.2 },
      fontSize: resolveFontSize(project, '方案名字号', Number(schemaName.fontSize || 8)),
      normalColor: resolveColor(
        project,
        theme,
        '方案名颜色',
        resolveColor(project, theme, schemaName.colorKey || '划动字符颜色', '#838383ff'),
      ),
    }, schemaNameText));
  }

  return renderLayerCell({
    className: `is-${key} ${isFunction ? 'is-function' : 'is-letter'} ${isPressed ? 'is-pressed' : ''}`,
    basis: metric.basis,
    bounds: metric.bounds,
    height: rowHeight,
    backgroundStyle,
    foregrounds,
    attrs: `data-preview-key="${escapeHtml(key)}"`,
  });
}

function renderToolbar(project, styles, height) {
  const combo = project.keyboardCombo || {};
  const sourceButtons = Array.isArray(project.toolbar?.layout) ? project.toolbar.layout : TOOLBAR_ORDER;
  const buttons = (combo.toolbar?.enabled === false ? [] : sourceButtons).filter((button) => {
    if (button === 'menu') return combo.slots?.panel?.source !== 'disabled' && combo.slots?.panel?.enabled !== false;
    if (button === 'symbol') return combo.slots?.symbolic?.source !== 'disabled' && combo.slots?.symbolic?.enabled !== false;
    if (button === 'emoji') return combo.slots?.emoji?.source !== 'disabled' && combo.slots?.emoji?.enabled !== false;
    return true;
  });
  const comboDisplayStyle = project.keyboardCombo?.toolbar?.displayStyle || 'icon';
  return `
    <div class="calayer-toolbar" style="height:${height}px">
      ${buttons.map((button) => {
        const display = project.toolbar?.display?.[button] || {};
        const displayType = comboDisplayStyle === 'text'
          ? 'text'
          : (display.type || (SYSTEM_IMAGE_BY_KEY[button] ? 'systemImageName' : 'text'));
        const systemImage = display.systemImageName || SYSTEM_IMAGE_BY_KEY[button];
        const text = project.toolbar?.text?.[button] || button;
        const usesIcon = displayType === 'systemImageName' && systemImage;
        const style = usesIcon
          ? { ...styles.toolbarForegroundStyle, previewFontScale: TOOLBAR_PREVIEW_ICON_SCALE }
          : { ...styles.toolbarForegroundStyle, buttonStyleType: 'text' };
        return renderLayerCell({
          className: 'is-toolbar-button',
          height,
          backgroundStyle: {
            ...styles.toolbarButtonBackgroundStyle,
            insets: resolveInsets(project, 'toolbar', button),
          },
          foregrounds: [renderForeground(style, usesIcon ? systemImage : text)],
          attrs: `data-preview-key="${escapeHtml(button)}"`,
        });
      }).join('')}
    </div>
  `;
}

function candidateCss(candidateStyle, selected, part) {
  const lowerPart = part.charAt(0).toLowerCase() + part.slice(1);
  const preferredColorKey = `preferred${part}Color`;
  const colorKey = `${lowerPart}Color`;
  const fontSizeKey = `${lowerPart}FontSize`;
  const color = selected
    ? candidateStyle[preferredColorKey] || candidateStyle[colorKey]
    : candidateStyle[colorKey];
  const fallbackSize = part === 'Text'
    ? (selected ? 28 : 34)
    : 12;
  const baseSize = Number(candidateStyle[fontSizeKey] || fallbackSize);
  const size = part === 'Text' ? Math.max(8, baseSize - 4) : baseSize;
  return `color:${cssColor(color, 'currentColor')};font-size:${size}px`;
}

function insetCssWithDelta(insets = {}, delta = 0) {
  const adjusted = {};
  for (const edge of ['top', 'right', 'bottom', 'left']) {
    adjusted[edge] = Math.max(0, Number(insets?.[edge] || 0) + delta);
  }
  return cssInsets(adjusted);
}

function selectedCandidatePaddingCss(insets = {}) {
  const top = Math.max(0, Number(insets?.top || 0) - 6);
  const right = Math.max(0, Number(insets?.right || 0) - 10);
  const bottom = Math.max(0, Number(insets?.bottom || 0) - 5);
  const left = Math.max(0, Number(insets?.left || 0) - 10);
  return cssInsets({ top, right, bottom, left });
}

function selectedExpandedCandidatePaddingCss(insets = {}) {
  const top = Math.max(0, Number(insets?.top || 0) - 4);
  const right = Math.max(0, Number(insets?.right || 0) - 6);
  const bottom = Math.max(0, Number(insets?.bottom || 0) - 3);
  const left = Math.max(0, Number(insets?.left || 0) - 6);
  return cssInsets({ top, right, bottom, left });
}

function renderCandidateItem(candidate, index, candidateStyle, className) {
  const selected = index === 0;
  const isExpandedCandidate = className.includes('expanded');
  const bg = selected ? cssColor(candidateStyle.preferredBackgroundColor) : cssColor(candidateStyle.backgroundColor || 'transparent');
  const outerInsets = candidateStyle.insets ? `padding:${cssInsets(candidateStyle.insets)}` : '';
  const selectedPadding = candidateStyle.selectedPadding
    ? `padding:${isExpandedCandidate ? selectedExpandedCandidatePaddingCss(candidateStyle.selectedPadding) : selectedCandidatePaddingCss(candidateStyle.selectedPadding)};transform:translateY(-1px);min-width:0;width:auto`
    : 'padding:0';
  const radiusValue = Number(candidateStyle.selectedCornerRadius ?? candidateStyle.cornerRadius ?? 8);
  const radius = selected ? `border-radius:${Number.isFinite(radiusValue) ? radiusValue : 8}px;` : '';
  const outerClass = selected ? 'is-selected' : 'is-normal';
  return `
    <div class="${className} ${outerClass}" style="${outerInsets}">
      <div class="calayer-candidate-content" style="background:${bg};${radius}${selected ? selectedPadding : ''}">
        <strong style="${candidateCss(candidateStyle, selected, 'Text')}">${escapeHtml(candidate.text)}</strong>
        ${candidate.comment ? `<em style="${candidateCss(candidateStyle, selected, 'Comment')}">${escapeHtml(candidate.comment)}</em>` : ''}
      </div>
    </div>
  `;
}

function renderHorizontalCandidates(project, styles, height) {
  const candidateInsets = project.toolbar?.horizontalCandidates?.candidate?.insets
    || project.keyStyles?.buttonInsets?.toolbar?.horizontalCandidates
    || { top: 0, left: 3, bottom: 0, right: 0 };
  return `
    <div class="calayer-candidate-bar" style="height:${height}px;padding:${cssInsets(candidateInsets)};transform:translateY(1px)">
      ${CANDIDATES.slice(0, 8).map((candidate, index) => renderCandidateItem(candidate, index, styles.candidateStyle, 'calayer-candidate')).join('')}
      ${renderLayerCell({
        className: 'is-candidate-toggle',
        height,
        backgroundStyle: styles.toolbarButtonBackgroundStyle,
        foregrounds: [renderForeground({ ...styles.toolbarForegroundStyle, buttonStyleType: 'systemImage' }, 'chevron.right')],
      })}
    </div>
  `;
}

function renderExpandedCandidates(project, theme, styles, frame) {
  const actionButtons = [
    ['return', project.toolbar?.text?.verticalCandidateReturn || '返回'],
    ['backspace', 'delete.left'],
    ['pageUp', 'chevron.up'],
    ['pageDown', 'chevron.down'],
  ];
  const height = frame.keyboardHeight + frame.toolbarHeight;
  const actionWidth = PREVIEW_LOGICAL_WIDTH * (29 / 183);
  const actionHeight = height / actionButtons.length;
  const styleInsets = project.toolbar?.verticalCandidates?.styleInsets
    || project.keyStyles?.buttonInsets?.toolbar?.verticalCandidatesStyle
    || { top: 3, left: 3, bottom: 1, right: 0 };
  const candidateInsets = project.toolbar?.verticalCandidates?.candidateInsets
    || { top: 3, left: 4, bottom: 3, right: 4 };
  return `
    <div class="calayer-expanded-candidates" style="${backgroundCssForStyle(project, theme, styles.verticalCandidateBackgroundStyle)};height:${height}px;padding:${cssInsets(styleInsets)};grid-template-columns:minmax(0,1fr) ${actionWidth}px;transform:translateY(-3px)">
      <div class="calayer-expanded-list" style="padding:${cssInsets(candidateInsets)}">
        ${EXPANDED_CANDIDATES.slice(0, 30).map((candidate, index) => renderCandidateItem(candidate, index, styles.verticalCandidateCellStyle, 'calayer-expanded-candidate')).join('')}
      </div>
      <div class="calayer-expanded-actions">
        ${actionButtons.map(([key, content]) => renderLayerCell({
          className: `is-${key}`,
          height: actionHeight,
          backgroundStyle: styles.verticalCandidateButtonBackgroundStyle,
          foregrounds: [renderForeground(
            key === 'return' ? styles.verticalCandidateReturnStyle : styles.verticalCandidateIconStyle,
            content,
          )],
        })).join('')}
      </div>
    </div>
  `;
}

function numericLabel(project, key) {
  const numeric = project.keyboards?.numeric || {};
  const text = numeric.text || {};
  if (numeric.keyDisplays?.[key]) return numeric.keyDisplays[key];
  const labels = {
    symbol: text.symbol || '#+=',
    return: text.return || '返回',
    space: text.space || '空格',
    period: text.period || '.',
    equal: text.equal || '=',
    enter: text.enter || '换行',
  };
  return labels[key] || key;
}

function numericButtonNameForKey(key) {
  if (/^\d$/.test(key)) return `number${key}Button`;
  if (key === 'symbol') return 'symbolicButton';
  if (key === 'period') return 'numperiodButton';
  return `${key}Button`;
}

function fallbackNumericForeground(project, key, styles, customLabel = null) {
  const systemImage = key === 'backspace' && !customLabel ? 'delete.left' : null;
  const foregroundStyle = systemImage
    ? styles.numericIconForegroundStyle
    : key === 'period' || key === 'equal'
      ? styles.numericPeriodForegroundStyle
      : styles.numericTextForegroundStyle;
  return renderForeground(foregroundStyle, systemImage || customLabel || numericLabel(project, key));
}

function numericCell(project, theme, key, height, styles, orientation = 'portrait', options = {}, payload = null) {
  const customLabel = project.keyboards?.numeric?.keyDisplays?.[key];
  const metric = resolveKeyMetric(project, 'numeric', key, orientation);
  const isPressed = options.activePressedKey === key;
  const buttonName = numericButtonNameForKey(key);
  const nativeButton = payload?.[buttonName];
  if (/^\d$/.test(key)) {
    const numberBackgroundStyle = {
      ...styles.alphabeticBackgroundStyle,
      insets: resolveInsets(project, 'keyboard26', key),
    };
    const backgroundStyle = nativeButton
      ? resolveNativeStyleObject(payload, nativeButton.backgroundStyle, options, numberBackgroundStyle)
      : numberBackgroundStyle;
    const foregrounds = nativeButton
      ? nativeForegrounds(project, theme, payload, buttonName, options)
      : renderForeground(styles.numericNumberForegroundStyle, customLabel || key);
    return renderLayerCell({
      className: `is-numeric-number is-${key} ${isPressed ? 'is-pressed' : ''}`,
      basis: metric.basis,
      bounds: metric.bounds,
      height,
      backgroundStyle,
      foregrounds: [foregrounds],
      attrs: `data-preview-key="${escapeHtml(key)}"`,
    });
  }

  const fallbackBackgroundStyle = { ...styles.numericSystemButtonBackgroundStyle, insets: resolveInsets(project, 'numeric', key) };
  const backgroundStyle = nativeButton
    ? resolveNativeStyleObject(payload, nativeButton.backgroundStyle, options, fallbackBackgroundStyle)
    : fallbackBackgroundStyle;
  const foregrounds = nativeButton
    ? nativeForegrounds(project, theme, payload, buttonName, options)
    : fallbackNumericForeground(project, key, styles, customLabel);

  return renderLayerCell({
    className: `is-numeric-function is-${key} ${isPressed ? 'is-pressed' : ''}`,
    basis: metric.basis,
    bounds: metric.bounds,
    height,
    backgroundStyle,
    foregrounds: [foregrounds],
    attrs: `data-preview-key="${escapeHtml(key)}"`,
  });
}

function normalizeCollectionLabel(item) {
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (item?.label !== undefined) return normalizeCollectionLabel(item.label);
  if (item?.text !== undefined) return String(item.text);
  if (item?.value !== undefined) return String(item.value);
  return '';
}

function numericCollectionSymbols(project) {
  const collectionEntries = project.data?.collections?.numericSymbols;
  const collectionSymbols = Array.isArray(collectionEntries)
    ? collectionEntries.map(normalizeCollectionLabel).filter(Boolean)
    : [];
  if (collectionSymbols.length) return collectionSymbols;
  const keyboardEntries = project.keyboards?.numeric?.collectionSymbols;
  const keyboardSymbols = Array.isArray(keyboardEntries)
    ? keyboardEntries.map(normalizeCollectionLabel).filter(Boolean)
    : [];
  return keyboardSymbols.length ? keyboardSymbols : DEFAULT_NUMERIC_SYMBOLS;
}

function pinyin9PunctuationItems(project) {
  const collectionEntries = project.data?.collections?.pinyin9Symbols;
  const collectionItems = Array.isArray(collectionEntries)
    ? collectionEntries.map(normalizeCollectionLabel).filter(Boolean)
    : [];
  const configured = collectionItems.length
    ? collectionItems
    : project.keyboards?.keyboard26?.variants?.['9']?.punctuationColumn?.items;
  const items = Array.isArray(configured) ? configured.slice(0, DEFAULT_PINYIN9_PUNCTUATION_ITEMS.length) : [];
  while (items.length < DEFAULT_PINYIN9_PUNCTUATION_ITEMS.length) {
    items.push(DEFAULT_PINYIN9_PUNCTUATION_ITEMS[items.length]);
  }
  return items;
}

function renderNumericCollection(project, theme, rowHeight, styles, orientation = 'portrait', payload = null, options = {}) {
  const height = rowHeight * 3;
  const metric = resolveKeyMetric(project, 'numeric', 'collection', orientation);
  const collection = payload?.collection || {};
  const cellStyle = resolveNativeStyleObject(payload || {}, collection.cellStyle, options);
  const foregroundStyle = resolveNativeStyleObject(payload || {}, cellStyle.foregroundStyle, options, styles.numericCollectionForegroundStyle);
  const cellBackgroundStyle = resolveNativeStyleObject(payload || {}, cellStyle.backgroundStyle, options, styles.numericCollectionCellBackgroundStyle);
  const collectionBackgroundStyle = resolveNativeStyleObject(payload || {}, collection.backgroundStyle, options, styles.numericCollectionBackgroundStyle);
  const symbols = numericCollectionSymbols(project);
  const collectionCells = symbols.slice(0, 5).map((symbol) => renderLayerCell({
    className: 'is-numeric-symbol',
    backgroundStyle: cellBackgroundStyle,
    foregrounds: [renderForeground(foregroundStyle, symbol, { project, theme })],
  })).join('');

  return `
    <div class="calayer-cell is-numeric-collection" style="${[metric.basis ? `flex:0 0 ${metric.basis}` : '', `height:${height}px`].filter(Boolean).join(';')}">
      <div class="calayer-visible" style="${boundsCss(metric.bounds)}">
        <div class="calayer-background is-layer-bg" style="${geometryCss(collectionBackgroundStyle)};${insetPositionCss(collectionBackgroundStyle.insets)}"></div>
        <div class="numeric-symbol-grid" style="${insetPositionCss(collectionBackgroundStyle.insets)}">${collectionCells}</div>
      </div>
    </div>
  `;
}

function renderSymbolicCollectionCell(label, height, style, backgroundStyle = null, className = '', attrs = '') {
  return renderLayerCell({
    className,
    height,
    backgroundStyle: backgroundStyle || { buttonStyleType: 'geometry', normalColor: '#00000000', cornerRadius: 0 },
    foregrounds: [renderForeground(style, label)],
    attrs,
  });
}

function renderSymbolicKeyboard(project, theme, styles, frame, options = {}) {
  const height = frame.keyboardHeight;
  const dataSource = options.collectionSourceKey === 'emojiDataSource'
    ? (project.data?.collections?.emojiDataSource || {})
    : (project.data?.collections?.symbolicDataSource || {});
  const categories = Array.isArray(dataSource.category) ? dataSource.category : [];
  const fallbackCategory = categories[0] || Object.keys(dataSource).find((key) => key !== 'category') || '常用';
  const activeCategory = categories.includes(options.symbolicCategory) ? options.symbolicCategory : fallbackCategory;
  const symbols = (Array.isArray(dataSource[activeCategory]) ? dataSource[activeCategory] : [])
    .map(normalizeCollectionLabel)
    .filter(Boolean);
  const keyboardInsets = { top: 3, right: 4, bottom: 3, left: 4 };
  const contentHeight = height * (227 / 281);
  const functionHeight = height - contentHeight;
  const categoryWidth = PREVIEW_LOGICAL_WIDTH * (56 / 375);
  const descriptionWidth = PREVIEW_LOGICAL_WIDTH - categoryWidth;
  const categoryRows = categories.length ? categories : ['常用'];
  const categoryCellHeight = Number(project.keyboards?.symbolic?.layout?.portrait?.categoryCellHeight || 31);
  const descriptionRows = symbols;
  const descriptionColumns = 5;
  const descriptionCellHeight = Number(project.keyboards?.symbolic?.layout?.portrait?.descriptionCellHeight || 28);
  const functionRows = project.keyboards?.symbolic?.layout?.portrait?.functionRows?.length
    ? project.keyboards.symbolic.layout.portrait.functionRows
    : [DEFAULT_SYMBOLIC_FUNCTION_ROW];
  const symbolicFunctionRowHeight = functionHeight / Math.max(functionRows.length, 1);
  const symbolicLabels = project.keyboards?.symbolic?.keyDisplays || {};
  const symbolicText = project.keyboards?.symbolic?.text || {};
  const symbolicIconForKey = {
    pageUp: 'chevron.up',
    pageDown: 'chevron.down',
    lock: 'lock.open',
    backspace: 'delete.left',
  };
  const symbolicLabelForKey = (key) => {
    if (symbolicLabels[key]) return symbolicLabels[key];
    if (key === 'return') return symbolicText.return || '返回';
    return symbolicIconForKey[key] || key;
  };

  return `
    <div class="calayer-keyboard is-symbolic-keyboard" style="${backgroundCssForStyle(project, theme, styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(keyboardInsets)}">
      <div class="symbolic-collection-layout" style="height:${contentHeight}px;grid-template-columns:${categoryWidth}px ${descriptionWidth}px">
        <div class="symbolic-category-collection">
          <div class="calayer-background is-layer-bg" style="${geometryCss(styles.symbolicCategoryCollectionBackgroundStyle)};${insetPositionCss(styles.symbolicCategoryCollectionBackgroundStyle.insets)}"></div>
          <div class="symbolic-category-scroll" style="${insetPositionCss(styles.symbolicCategoryCollectionBackgroundStyle.insets)}">
            <div class="symbolic-category-grid">
            ${categoryRows.map((category) => {
    const selected = category === activeCategory;
    return renderSymbolicCollectionCell(
    category,
    categoryCellHeight,
    {
      ...styles.symbolicCategoryForegroundStyle,
      normalColor: selected
      ? resolveColor(project, theme, '列表选中字体颜色', styles.symbolicCategoryForegroundStyle.normalColor)
        : styles.symbolicCategoryForegroundStyle.normalColor,
    },
    selected ? styles.symbolicCategoryCellBackgroundStyle : null,
    `symbolic-category-cell ${selected ? 'is-selected-category' : ''}`,
    `data-symbolic-category="${escapeHtml(category)}" role="button" tabindex="0" aria-pressed="${selected ? 'true' : 'false'}"`,
  );
  }).join('')}
            </div>
          </div>
        </div>
        <div class="symbolic-description-collection">
          <div class="calayer-background is-layer-bg" style="${geometryCss(styles.symbolicDescriptionCollectionBackgroundStyle)};${insetPositionCss(styles.symbolicDescriptionCollectionBackgroundStyle.insets)}"></div>
          <div class="symbolic-description-scroll" style="${insetPositionCss(project.keyStyles?.buttonInsets?.symbolic?.descriptionContent || {})}">
            <div class="symbolic-description-grid" style="grid-template-columns:repeat(${descriptionColumns}, minmax(0, 1fr));grid-auto-rows:${descriptionCellHeight}px">
            ${descriptionRows.map((symbol) => renderSymbolicCollectionCell(
    symbol,
    descriptionCellHeight,
    styles.symbolicDescriptionForegroundStyle,
  )).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="symbolic-function-rows" style="height:${functionHeight}px">
        ${functionRows.map((row) => {
    const functionButtonWidth = PREVIEW_LOGICAL_WIDTH / Math.max(row.length, 1);
    return `
          <div class="calayer-row symbolic-function-row" style="height:${symbolicFunctionRowHeight}px">
            ${row.map((key) => {
    const content = symbolicLabelForKey(key);
    const isIcon = symbolicIconForKey[key] && !symbolicLabels[key];
    const metric = resolveKeyMetric(project, 'symbolic', key);
    return renderLayerCell({
      className: `is-symbolic-${key} is-function`,
      basis: metric.basis || `${functionButtonWidth}px`,
      bounds: metric.bounds,
      height: symbolicFunctionRowHeight,
      backgroundStyle: { ...styles.symbolicFunctionButtonBackgroundStyle, insets: resolveInsets(project, 'symbolic', key) },
      foregrounds: [renderForeground(isIcon ? styles.symbolicIconForegroundStyle : styles.symbolicTextForegroundStyle, content)],
      attrs: `data-preview-key="${escapeHtml(key)}"`,
    });
  }).join('')}
          </div>
        `;
  }).join('')}
      </div>
    </div>
  `;
}

function renderNumericKeyboard(project, theme, styles, frame, options = {}) {
  const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  const nativePreview = nativePayloadForPreview(project, theme, 'numeric', { ...options, orientation });
  const payload = nativePreview?.payload || null;
  const height = frame.keyboardHeight;
  const columns = project.keyboards?.numeric?.layout?.portrait?.columns?.length
    ? project.keyboards.numeric.layout.portrait.columns
    : DEFAULT_NUMERIC_COLUMNS;
  const keyboardInsets = payload?.keyboardStyle?.insets || styles.keyboardStyle.insets || {};
  const keyboardBackgroundStyle = payload
    ? resolveNativeStyleObject(payload, payload.keyboardStyle?.backgroundStyle || 'keyboardBackgroundStyle', options, styles.keyboardBackgroundStyle)
    : styles.keyboardBackgroundStyle;
  const contentHeight = height - Number(keyboardInsets.top || 0) - Number(keyboardInsets.bottom || 0);
  const rowHeight = contentHeight / Math.max(...columns.map((column) => column.length), 1);
  const columnTemplate = orientation === 'landscape'
    ? '0.75fr 1fr 1fr 1fr 0.75fr'
    : '0.7fr 1fr 1fr 1fr 0.7fr';
  return `
    <div class="calayer-keyboard is-numeric-keyboard" style="${backgroundCssForStyle(project, theme, keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(keyboardInsets)}">
      <div class="numeric-column-layout" style="grid-template-columns:${columnTemplate};gap:0">
        ${columns.map((column, columnIndex) => `
          <div class="numeric-column is-column-${columnIndex + 1}">
            ${column.map((key) => key === 'collection'
      ? renderNumericCollection(project, theme, rowHeight, styles, orientation, payload, options)
      : numericCell(project, theme, key, rowHeight, styles, orientation, options, payload)).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPanelButton(project, theme, payload, buttonName, fallbackIcon, fallbackText, rowHeight, styles) {
  const button = payload?.[buttonName] || {};
  const backgroundStyle = payload
    ? resolveNativeStyleObject(payload, button.backgroundStyle, {}, styles.panelButtonBackgroundStyle)
    : styles.panelButtonBackgroundStyle;
  const foregrounds = payload
    ? nativeForegrounds(project, theme, payload, buttonName, {})
    : [
        renderForeground(styles.panelIconForegroundStyle, fallbackIcon),
        renderForeground(styles.panelTextForegroundStyle, fallbackText),
      ].join('');
  return renderLayerCell({
    className: `is-panel-button is-${nativeCellKey(buttonName)}`,
    height: rowHeight,
    backgroundStyle,
    foregrounds: [foregrounds],
  });
}

function renderPanelKeyboard(project, theme, styles, frame, options = {}) {
  const orientation = previewOrientation(options);
  const nativePreview = nativePayloadForPreview(project, theme, 'panel', { ...options, orientation });
  const payload = nativePreview?.payload || null;
  const scale = payload?.floatTargetScale || project.keyboardFrame?.panel?.floatTargetScale?.portrait || { x: 0.8, y: 0.6 };
  const width = PREVIEW_LOGICAL_WIDTH * Number(scale.x || 0.8);
  const height = (project.keyboardFrame?.portrait?.keyboardHeight || 210) * Number(scale.y || 0.6);
  const keyboardInsets = payload?.keyboardStyle?.insets || styles.panelKeyboardBackgroundStyle.insets || {};
  const rowHeight = (height - numberInset(keyboardInsets, 'top') - numberInset(keyboardInsets, 'bottom')) / 2;
  const labels = project.keyboards?.panel?.text || {};
  const rows = Array.isArray(payload?.keyboardLayout) && payload.keyboardLayout.length
    ? payload.keyboardLayout.map((row) => row.HStack?.subviews?.map((item) => item.Cell).filter(Boolean) || []).filter((row) => row.length)
    : [
        PANEL_BUTTONS.slice(0, 5).map(([key]) => `${key}Button`),
        PANEL_BUTTONS.slice(5, 10).map(([key]) => `${key}Button`),
      ];
  const fallbackByButton = Object.fromEntries(PANEL_BUTTONS.map(([key, icon, textKey]) => [`${key}Button`, {
    icon,
    text: labels[textKey] || textKey,
  }]));

  return `
    <div class="panel-preview-wrap" style="height:${project.keyboardFrame?.portrait?.keyboardHeight || 210}px">
      <div class="calayer-keyboard is-panel-keyboard" style="${backgroundCssForStyle(project, theme, payload?.keyboardBackgroundStyle || styles.panelKeyboardBackgroundStyle)};width:${width}px;height:${height}px;padding:${cssInsets(keyboardInsets)}">
        ${rows.map((row) => `
          <div class="calayer-row panel-row" style="height:${rowHeight}px">
            ${row.map((buttonName) => {
    const fallback = fallbackByButton[buttonName] || {};
    return renderPanelButton(project, theme, payload, buttonName, fallback.icon || 'square.grid.3x3', fallback.text || nativeCellKey(buttonName), rowHeight, styles);
  }).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderNativeTopArea(project, theme, mode, candidateState, styles, frame, options = {}) {
  if (
    mode === 'keyboard26'
    && candidateState !== 'toolbar'
    && activePinyinVariantForPreview(project, options) !== '26'
  ) {
    return null;
  }
  const nativePreview = nativePayloadForPreview(project, theme, mode, options);
  if (!nativePreview) return null;
  const { payload } = nativePreview;
  const width = previewLogicalWidth(options);
  const topConfig = candidateState === 'expanded'
    ? {
      layout: payload.verticalCandidatesLayout,
      style: payload.verticalCandidatesStyle,
      height: frame.keyboardHeight + frame.toolbarHeight,
      className: 'calayer-expanded-candidates is-native-expanded',
    }
    : candidateState === 'toolbar'
      ? {
        layout: nativeToolbarLayout(payload),
        style: nativeToolbarStyle(payload),
        height: frame.toolbarHeight,
        className: 'calayer-top-strip is-native-toolbar',
      }
      : {
        layout: payload.horizontalCandidatesLayout,
        style: payload.horizontalCandidatesStyle,
        height: frame.toolbarHeight,
        className: 'calayer-top-strip is-native-candidates',
      };
  if (!Array.isArray(topConfig.layout) || !topConfig.layout.length) return null;
  const topStyle = topConfig.style || {};
  const backgroundStyle = resolveNativeStyleObject(
    payload,
    topStyle.backgroundStyle,
    options,
    styles.toolbarBackgroundStyle,
  );
  const insets = topStyle.insets || {};
  const contentWidth = width - numberInset(insets, 'left') - numberInset(insets, 'right');
  const contentHeight = topConfig.height - numberInset(insets, 'top') - numberInset(insets, 'bottom');
  const usePayloadRowHeight = candidateState === 'expanded';
  const isVerticalLayout = topConfig.layout.some((item) => item.VStack);
  const body = renderNativeLayout(project, theme, payload, topConfig.layout, contentWidth, contentHeight, { usePayloadRowHeight, ...options });
  const content = candidateState === 'toolbar'
    ? `<div class="native-toolbar-layout">${body}</div>`
    : usePayloadRowHeight
      ? `<div class="${isVerticalLayout ? 'native-column-layout' : 'native-row-layout'}">${body}</div>`
      : body;
  const previewShift = candidateState === 'toolbar'
    ? ''
    : candidateState === 'candidates'
      ? 'transform:translateY(1px);'
      : 'transform:translateY(-3px);';
  return `
    <div class="${topConfig.className}" style="${backgroundCssForStyle(project, theme, backgroundStyle)};height:${topConfig.height}px;padding:${cssInsets(insets)};${previewShift}">
      ${content}
    </div>
  `;
}

function renderTopArea(project, theme, mode, candidateState, styles, frame, options = {}) {
  const nativeTop = renderNativeTopArea(project, theme, mode, candidateState, styles, frame, options);
  if (nativeTop) return nativeTop;
  if (candidateState === 'expanded') return renderExpandedCandidates(project, theme, styles, frame);
  if (candidateState === 'toolbar') {
    return `
      <div class="calayer-top-strip" style="${backgroundCssForStyle(project, theme, styles.toolbarBackgroundStyle)};height:${frame.toolbarHeight}px">
        ${renderToolbar(project, styles, frame.toolbarHeight)}
      </div>
    `;
  }
  return `
    <div class="calayer-top-strip" style="${backgroundCssForStyle(project, theme, styles.toolbarBackgroundStyle)};height:${frame.toolbarHeight}px;padding:8px 0 3px 5px">
      ${renderHorizontalCandidates(project, styles, frame.toolbarHeight - 11)}
    </div>
  `;
}

function renderKeyboard(project, theme, mode, styles, frame, options = {}) {
  const orientation = previewOrientation(options);
  const variant = activePinyinVariantForPreview(project, options);
  if (mode === 'keyboard26' && variant === '9') {
    return orientation === 'landscape'
      ? renderPinyin9LandscapeKeyboard(project, theme, styles, frame, options)
      : renderPinyin9Keyboard(project, theme, styles, frame, options);
  }
  if (mode === 'keyboard26' && ['14', '17', '18'].includes(variant)) {
    if (orientation === 'landscape') {
      if (variant === '14') return renderPinyin14LandscapeKeyboard(project, theme, styles, frame, options);
      if (variant === '17') return renderPinyin17LandscapeKeyboard(project, theme, styles, frame, options);
      if (variant === '18') return renderPinyin18LandscapeKeyboard(project, theme, styles, frame, options);
    }
    return renderPinyinVariantKeyboard(project, theme, styles, frame, options);
  }
  if (mode === 'keyboard26' && orientation === 'landscape' && variant === '26') {
    if (keyboard26LandscapeLayoutFromGuide(project, options) === 'standard') {
      return renderKeyboard26StandardLandscapeKeyboard(project, theme, styles, frame, options);
    }
    return renderKeyboard26LandscapeKeyboard(project, theme, styles, frame, options);
  }
  if (mode === 'numeric' && project.keyboardCombo?.slots?.numeric?.variant !== 'ios') {
    return renderNumericKeyboard(project, theme, styles, frame, options);
  }
  if (mode === 'panel') return renderPanelKeyboard(project, theme, styles, frame, options);

  const nativeKeyboard = renderNativeKeyboard(project, theme, mode, styles, frame, options);
  if (nativeKeyboard) return nativeKeyboard;
  if (mode === 'numeric') {
    return renderNumericKeyboard(project, theme, styles, frame, options);
  }
  if (mode === 'symbolic') return renderSymbolicKeyboard(project, theme, styles, frame, options);
  if (mode === 'emoji') return renderSymbolicKeyboard(project, theme, styles, frame, { ...options, collectionSourceKey: 'emojiDataSource' });

  const height = frame.keyboardHeight;
  const rows = rowsForMode(project, mode, orientation, options);
  const rowHeight = height / Math.max(rows.length, 1);

  return `
    <div class="calayer-keyboard" style="${backgroundCssForStyle(project, theme, styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)}">
      ${rows.map((row) => `
        <div class="calayer-row" style="height:${rowHeight}px">
          ${row.map((key) => keyLayer(project, theme, mode, key, rowHeight, styles, orientation, options)).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

export function renderPreview(project, theme, mode, options = {}) {
  const candidateState = options.candidateState || 'toolbar';
  const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  const previewSize = PREVIEW_LOGICAL_SIZE[orientation];
  const renderOptions = {
    ...options,
    __nativePayloadCache: options.__nativePayloadCache instanceof Map ? options.__nativePayloadCache : new Map(),
  };
  const styles = layerStyles(project, theme, renderOptions);
  const frame = frameForOrientation(project, theme, orientation, mode, renderOptions);
  const logicalHeight = candidateState === 'expanded'
    ? frame.keyboardHeight + frame.toolbarHeight
    : frame.keyboardHeight + frame.toolbarHeight;
  const requestedDisplayWidth = Number(options.maxDisplayWidth);
  const requestedDisplayHeight = Number(options.maxDisplayHeight);
  const widthScale = Number.isFinite(requestedDisplayWidth)
    ? Math.max(0, requestedDisplayWidth) / previewSize.width
    : previewSize.displayWidth / previewSize.width;
  const heightScale = Number.isFinite(requestedDisplayHeight)
    ? Math.max(0, requestedDisplayHeight) / logicalHeight
    : widthScale;
  const scale = Math.max(0, Math.min(widthScale, heightScale));
  const displayWidth = previewSize.width * scale;
  const frameClass = candidateState === 'expanded' ? 'is-expanded' : candidateState === 'candidates' ? 'has-candidates' : 'has-toolbar';
  const previewBackground = cssColor(styles.previewBackgroundColor || styles.keyboardBackgroundStyle.normalColor);
  return `
    <div class="product-preview-shell is-${theme} is-${orientation} is-${candidateState}" style="--preview-keyboard-bg:${previewBackground}">
      <div class="product-preview-stage">
        <div class="product-preview-device">
          <div class="skin-preview-stage ${frameClass} is-${orientation}" style="width:${displayWidth}px;height:${logicalHeight * scale}px">
        <div class="skin-preview" data-renderer="calayer" data-orientation="${orientation}" style="width:${previewSize.width}px;height:${logicalHeight}px;transform:scale(${scale});background:${previewBackground}">
              ${renderDefaultBubblePreview(project, theme, mode, styles, frame, renderOptions)}
              ${renderTopArea(project, theme, mode, candidateState, styles, frame, renderOptions)}
              ${candidateState === 'expanded' ? '' : renderKeyboard(project, theme, mode, styles, frame, renderOptions)}
              ${candidateState === 'expanded' ? '' : renderHintOverlay(project, theme, mode, styles, frame, {
                ...renderOptions,
                orientation,
                activeHintKey: renderOptions.activeHintKey,
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
