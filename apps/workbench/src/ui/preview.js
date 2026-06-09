import { renderSystemImageSvg } from '../../../../packages/preview-engine/index.js';
import { escapeHtml } from '../utils.js';

const FUNCTION_KEYS = new Set(['shift', 'backspace', '123', 'cnen', 'enter', 'return', 'symbol', 'spaceRight', 'semicolon', 'word', 'mnemonic', 'reinput', 'punctuationColumn']);
const LETTER_KEYS = new Set('abcdefghijklmnopqrstuvwxyz'.split(''));
const PREVIEW_LOGICAL_SIZE = {
  portrait: { width: 393, displayWidth: 558 },
  landscape: { width: 784, displayWidth: 700 },
};
const PREVIEW_LOGICAL_WIDTH = PREVIEW_LOGICAL_SIZE.portrait.width;

const SYSTEM_IMAGE_BY_KEY = {
  shift: 'shift',
  backspace: 'delete.left',
  menu: 'slider.horizontal.3',
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
    ['word', 'zx', 'cv', 'bn', 'm', 'backspace'],
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
const HINT_PREVIEW_CELL_HEIGHT = 52;
const HINT_PREVIEW_MIN_CELL_WIDTH = 46;
const HINT_PREVIEW_TEXT_CELL_WIDTH = 58;
const HINT_PREVIEW_LONG_TEXT_CELL_WIDTH = 72;
const CANDIDATES = [
  { index: 1, text: '一', comment: '' },
  { index: 2, text: '二', comment: '' },
  { index: 3, text: '三', comment: '' },
  { index: 4, text: '四', comment: '' },
  { index: 5, text: '五', comment: '' },
  { index: 6, text: '六', comment: '' },
  { index: 7, text: '七', comment: '' },
  { index: 8, text: '八', comment: '' },
  { index: 9, text: '九', comment: '' },
  { index: 10, text: '十', comment: '' },
  { index: 11, text: '十一', comment: '' },
  { index: 12, text: '十二', comment: '' },
  { index: 13, text: '十三', comment: '' },
  { index: 14, text: '十四', comment: '' },
  { index: 15, text: '十五', comment: '' },
  { index: 16, text: '十六', comment: '' },
  { index: 17, text: '十七', comment: '' },
  { index: 18, text: '十八', comment: '' },
];
const EXPANDED_CANDIDATES = [
  '回', '花', '会', '和', '好', '还',
  '很', '后', '话', '号', '哈', '喝',
  '或', '黑', '换', '活', '红', '货',
  '黄', '海', '画', '坏', '火', '韩',
].map((text, index) => ({ index: index + 1, text, comment: '' }));

function resolveColor(project, theme, key, fallback) {
  return project.theme?.[theme]?.colors?.[key] || fallback;
}

function resolveFontSize(project, key, fallback) {
  return project.theme?.shared?.fontSize?.[key] || fallback;
}

function resolveCenter(project, key, fallback = { x: 0.5, y: 0.5 }) {
  return project.theme?.shared?.center?.[key] || fallback;
}

function frameForOrientation(project, orientation = 'portrait') {
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
  return insets.panel?.normal || {};
}

function layerStyles(project, theme) {
  const keyText = resolveColor(project, theme, '按键前景颜色', theme === 'dark' ? '#ffffff' : '#000000');
  const swipeText = resolveColor(project, theme, '划动字符颜色', theme === 'dark' ? '#b6b7b9' : '#838383ff');
  const toolbarText = resolveColor(project, theme, 'toolbar按键颜色', theme === 'dark' ? '#e5e5e5' : '#4a4a4a');
  const candidateText = resolveColor(project, theme, '候选字体未选中字体颜色', keyText);
  const preferredCandidateText = resolveColor(project, theme, '候选字体选中字体颜色', candidateText);
  const keyboardPreviewBackground = solidPreviewColor(
    resolveColor(project, theme, '键盘背景颜色', theme === 'dark' ? '#474747' : '#d0d3da'),
    theme === 'dark' ? '#474747' : '#d0d3da',
  );

  return {
    keyboardStyle: {
      backgroundStyle: 'keyboardBackgroundStyle',
      insets: { top: 3, left: 4, bottom: 3, right: 4 },
    },
    keyboardBackgroundStyle: {
      buttonStyleType: 'geometry',
      normalColor: keyboardPreviewBackground,
    },
    alphabeticBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.keyboard26?.normal || {},
      cornerRadius: 8.5,
      normalColor: resolveColor(project, theme, '字母键背景颜色-普通', '#ffffff'),
      highlightColor: resolveColor(project, theme, '字母键背景颜色-高亮', '#abb0ba'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      highlightLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-高亮', 'rgba(0,0,0,.18)'),
      borderColor: resolveColor(project, theme, '按键边缘颜色', 'transparent'),
      borderSize: 0,
    },
    systemButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.keyboard26?.functionKey || {},
      cornerRadius: 8.5,
      normalColor: resolveColor(project, theme, '功能键背景颜色-普通', '#979faf80'),
      highlightColor: resolveColor(project, theme, '功能键背景颜色-高亮', '#ffffffE6'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      highlightLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-高亮', 'rgba(0,0,0,.18)'),
    },
    numberButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: resolveInsets(project, 'numeric', '1'),
      cornerRadius: 7,
      normalColor: resolveColor(project, theme, '字母键背景颜色-普通', '#ffffff'),
      highlightColor: resolveColor(project, theme, '字母键背景颜色-高亮', '#abb0ba'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      highlightLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-高亮', 'rgba(0,0,0,.18)'),
    },
    numericSystemButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.numeric?.functionKey || {},
      cornerRadius: 7,
      normalColor: resolveColor(project, theme, '功能键背景颜色-普通', '#979faf80'),
      highlightColor: resolveColor(project, theme, '功能键背景颜色-高亮', '#ffffffE6'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      highlightLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-高亮', 'rgba(0,0,0,.18)'),
    },
    numericCollectionBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: resolveInsets(project, 'numeric', 'collection'),
      cornerRadius: 7,
      normalColor: resolveColor(project, theme, '功能键背景颜色-普通', '#979faf80'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
    },
    numericCollectionCellBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: resolveInsets(project, 'numeric', 'collectionCell'),
      cornerRadius: 7,
      normalColor: '#ffffff00',
      highlightColor: '#ffffff',
    },
    enterButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: resolveInsets(project, 'keyboard26', 'enter'),
      cornerRadius: 8.5,
      normalColor: resolveColor(project, theme, 'enter键背景(蓝色)', '#1162ff'),
      highlightColor: resolveColor(project, theme, 'enter键背景(蓝色)', '#1162ff'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
    },
    toolbarBackgroundStyle: {
      buttonStyleType: 'geometry',
      normalColor: keyboardPreviewBackground,
    },
    toolbarButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      normalColor: '#00000000',
      cornerRadius: 0,
    },
    verticalCandidateBackgroundStyle: {
      buttonStyleType: 'geometry',
      normalColor: keyboardPreviewBackground,
      cornerRadius: 0,
    },
    verticalCandidateButtonBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.toolbar?.verticalCandidates?.functionInsets
        || project.keyStyles?.buttonInsets?.toolbar?.verticalCandidateFunction
        || {},
      cornerRadius: 7,
      normalColor: resolveColor(project, theme, '功能键背景颜色-普通', '#979faf80'),
      highlightColor: resolveColor(project, theme, '功能键背景颜色-高亮', '#ffffffE6'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
    },
    keyForegroundStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '26键中文前景偏移', { x: 0.5, y: 0.54 }),
      fontSize: resolveFontSize(project, '按键前景文字大小', 18),
      normalColor: keyText,
    },
    functionForegroundStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '功能键前景文字偏移', { x: 0.5, y: 0.47 }),
      fontSize: resolveFontSize(project, '按键前景sf符号大小', 15),
      normalColor: keyText,
    },
    spaceForegroundStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '功能键前景文字偏移', { x: 0.5, y: 0.47 }),
      fontSize: resolveFontSize(project, '按键前景sf符号大小', 15),
      normalColor: keyText,
    },
    spaceRightPrimaryForegroundStyle: {
      buttonStyleType: 'text',
      center: project.keyboards?.keyboard26?.spaceRight?.pinyin?.primary?.center || { x: 0.64, y: 0.45 },
      fontSize: resolveFontSize(project, '按键前景文字大小', 18),
      normalColor: keyText,
    },
    spaceRightSecondaryForegroundStyle: {
      buttonStyleType: 'text',
      center: project.keyboards?.keyboard26?.spaceRight?.pinyin?.secondary?.center || { x: 0.6, y: 0.3 },
      fontSize: resolveFontSize(project, '按键前景sf符号大小', 16),
      normalColor: keyText,
    },
    numericNumberForegroundStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '数字键盘数字前景偏移', { x: 0.5, y: 0.5 }),
      fontSize: resolveFontSize(project, '数字键盘数字前景字体大小', 20),
      normalColor: keyText,
    },
    numericTextForegroundStyle: {
      buttonStyleType: 'text',
      center: { x: 0.5, y: 0.5 },
      fontSize: 15,
      normalColor: keyText,
    },
    numericPeriodForegroundStyle: {
      buttonStyleType: 'text',
      center: { x: 0.5, y: 0.5 },
      fontSize: 20,
      normalColor: keyText,
    },
    numericIconForegroundStyle: {
      buttonStyleType: 'systemImage',
      center: { x: 0.5, y: 0.53 },
      fontSize: 17,
      normalColor: keyText,
    },
    numericCollectionForegroundStyle: {
      buttonStyleType: 'text',
      center: { x: 0.5, y: 0.5 },
      fontSize: 18,
      normalColor: keyText,
    },
    symbolicCategoryCollectionBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: resolveInsets(project, 'symbolic', 'categoryCollection'),
      cornerRadius: 7,
      normalColor: resolveColor(project, theme, '符号键盘左侧collection背景颜色', '#979faf80'),
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
      cornerRadius: 7,
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
      cornerRadius: 7,
      normalColor: resolveColor(project, theme, '功能键背景颜色-普通', '#979faf80'),
      highlightColor: resolveColor(project, theme, '功能键背景颜色-高亮', '#ffffffE6'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
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
      cornerRadius: 7,
      normalColor: resolveColor(project, theme, '字母键背景颜色-普通', '#ffffff'),
      highlightColor: resolveColor(project, theme, '字母键背景颜色-高亮', '#abb0ba'),
      normalLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-普通', 'rgba(0,0,0,.18)'),
      highlightLowerEdgeColor: resolveColor(project, theme, '底边缘颜色-高亮', 'rgba(0,0,0,.18)'),
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
      center: resolveCenter(project, '上划文字偏移', { x: 0.25, y: 0.28 }),
      fontSize: resolveFontSize(project, '上划文字大小', 9),
      normalColor: swipeText,
    },
    swipeDownForegroundStyle: {
      buttonStyleType: 'text',
      center: resolveCenter(project, '下划文字偏移', { x: 0.75, y: 0.28 }),
      fontSize: resolveFontSize(project, '下划文字大小', 9),
      normalColor: swipeText,
    },
    toolbarForegroundStyle: {
      buttonStyleType: 'systemImage',
      center: resolveCenter(project, 'toolbar按键sf符号偏移', { x: 0.5, y: 0.53 }),
      fontSize: project.toolbar?.iconFontSize || resolveFontSize(project, 'toolbar按键前景sf符号大小', 16),
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
      preferredBackgroundColor: resolveColor(project, theme, '选中候选背景颜色', theme === 'dark' ? '#d1d1d165' : '#ffffff'),
      textFontSize: resolveFontSize(project, '未展开候选字体选中字体大小', 18),
      indexFontSize: 0,
      commentFontSize: resolveFontSize(project, '未展开comment字体大小', 14),
      selectedPadding: { top: 4, right: 9, bottom: 4, left: 9 },
    },
    verticalCandidateCellStyle: {
      textColor: candidateText,
      indexColor: candidateText,
      commentColor: candidateText,
      preferredTextColor: preferredCandidateText,
      preferredIndexColor: preferredCandidateText,
      preferredCommentColor: preferredCandidateText,
      preferredBackgroundColor: resolveColor(project, theme, '选中候选背景颜色', theme === 'dark' ? '#d1d1d165' : '#ffffff'),
      textFontSize: resolveFontSize(project, '展开候选字体选中字体大小', 16),
      indexFontSize: 0,
      commentFontSize: resolveFontSize(project, '展开comment字体大小', 13),
      insets: { top: 8, left: 8, bottom: 8, right: 8 },
      selectedPadding: { top: 6, right: 11, bottom: 6, left: 11 },
    },
    hintBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.hint?.symbols || {},
      cornerRadius: 12,
      normalColor: resolveColor(project, theme, '长按背景颜色', theme === 'dark' ? '#6b6b6b' : '#ffffff'),
      borderColor: resolveColor(project, theme, '气泡边缘颜色', '#606060'),
      borderSize: 0.5,
      normalShadowColor: resolveColor(project, theme, '长按背景阴影颜色', 'rgba(0,0,0,.18)'),
      shadowOffset: { y: 3 },
      shadowRadius: 10,
    },
    hintSelectedBackgroundStyle: {
      buttonStyleType: 'geometry',
      insets: project.keyStyles?.buttonInsets?.hint?.selectedBackground || {},
      cornerRadius: 9,
      normalColor: resolveColor(project, theme, '长按选中背景颜色', '#007aff'),
    },
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
  };
}

function cssColor(value, fallback = 'transparent') {
  if (value === 0 || value === '0') return 'transparent';
  if (!value) return fallback;
  if (typeof value === 'string' && /^[0-9a-fA-F]{8}$/.test(value)) return `#${value}`;
  return value;
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

function geometryCss(style = {}) {
  const rawLowerEdge = style.normalLowerEdgeColor || style.highlightLowerEdgeColor;
  const lowerEdge = rawLowerEdge ? cssColor(rawLowerEdge) : null;
  const shadows = [
    lowerEdge ? `inset 0 -1.5px ${lowerEdge}` : '',
    style.normalShadowColor ? `0 ${style.shadowOffset?.y ?? 2}px ${style.shadowRadius ?? 4}px ${cssColor(style.normalShadowColor)}` : '',
  ].filter(Boolean).join(',');
  return [
    `background:${cssColor(style.normalColor)}`,
    `border-radius:${Number(style.cornerRadius ?? 0)}px`,
    `border:${Number(style.borderSize || 0)}px solid ${cssColor(style.borderColor)}`,
    shadows ? `box-shadow:${shadows}` : '',
  ].join(';');
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

function pinyinVariantKeyLabel(variant, key) {
  if (variant === '17' && PINYIN_VARIANT_LABELS[key]) return PINYIN_VARIANT_LABELS[key];
  if (['14', '18'].includes(variant) && /^[a-z]{2}$/.test(key)) return key.toUpperCase();
  if (variant === '9') {
    const labels = {
      number1: '@/.',
      number2: 'ABC',
      number3: 'DEF',
      number4: 'GHI',
      number5: 'JKL',
      number6: 'MNO',
      number7: 'PQRS',
      number8: 'TUV',
      number9: 'WXYZ',
      number0: '0',
      symbol: '#+=',
    };
    if (labels[key]) return labels[key];
  }
  if (variant === '14' && key === 'word') return "'词";
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
  const customLabel = keyboard.keyDisplays?.[key];
  if (customLabel) return customLabel;
  if (['14', '17', '18'].includes(variant) && key === 'space') return '';
  const variantLabel = pinyinVariantKeyLabel(variant, key);
  if (variantLabel) return variantLabel;
  const labels = {
    '123': text.numericSwitch || '123',
    space: ['9', '14', '17', '18'].includes(variant) ? '' : (text.space || '空格'),
    symbol: text.symbol || '#+=',
    cnen: profile === 'alphabetic' ? '英' : '中',
    semicolon: ';',
    spaceRight: keyboard.spaceRight?.[profile]?.primary?.text || keyboard.spaceRight?.pinyin?.primary?.text || '，',
    enter: variant === '26' ? (text.enter?.default || '回车') : '发送',
  };
  return labels[key] || key.toUpperCase();
}

function renderPinyin9Keyboard(project, theme, styles, frame, options = {}) {
  const height = frame.keyboardHeight;
  const keyboardInsets = styles.keyboardStyle.insets || {};
  const rowGap = 0;
  const sideColGap = 0;
  const mainColGap = 0;
  const footerColGap = 0;
  const leftInset = Number(keyboardInsets.left || 0);
  const topInset = Number(keyboardInsets.top || 0);
  const contentWidth = previewLogicalWidth(options) - leftInset - Number(keyboardInsets.right || 0);
  const contentHeight = height - topInset - Number(keyboardInsets.bottom || 0);
  const rowHeight = contentHeight / 4;
  const mergedEnterHeight = rowHeight * 2 + rowGap;
  const leftWidth = contentWidth * (87 / 549);
  const rightWidth = contentWidth * (87 / 549);
  const mainStartX = leftInset + leftWidth + sideColGap;
  const mainUsableWidth = contentWidth - leftWidth - rightWidth - sideColGap * 2;
  const mainKeyWidth = mainUsableWidth / 3;
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
        ${[1, 2, 3].map((index) => `<span class="punctuation-divider" style="position:absolute;left:21%;right:21%;top:${(index * 100) / punctuationLabels.length}%;height:1px;background:rgba(0,0,0,.12)"></span>`).join('')}
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
    let rowX = mainStartX;
    return row.map((item, keyIndex) => {
      const key = item.key;
      const cellWidth = item.width;
      const label = labelForMode(project, 'keyboard26', key, options);
      const isBackspace = key === 'backspace';
      const actualX = item.fixedX ?? rowX;
      const foreground = isBackspace
        ? renderForeground({ ...styles.functionForegroundStyle, buttonStyleType: 'systemImage' }, 'delete.left')
        : key === 'reinput'
          ? renderForeground({
            ...styles.functionForegroundStyle,
            center: { x: 0.5, y: 0.5 },
            fontSize: Math.max(14, Number(styles.functionForegroundStyle.fontSize || 18) - 4),
          }, label)
          : renderForeground(/^(number)/.test(key) ? styles.keyForegroundStyle : styles.functionForegroundStyle, label);
      const decoration = /^number\d$/.test(key) && key !== 'number0'
        ? renderForeground({
          ...styles.functionForegroundStyle,
          center: { x: 0.87, y: 0.17 },
          fontSize: 8,
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
  const footerWeightTotal = 1.1 + 0.84 + 3.58 + 1.02;
  const footerAvailableWidth = contentWidth - rightWidth - footerColGap * 3;
  const footerItems = [
    { key: 'symbol', width: footerAvailableWidth * (1.1 / footerWeightTotal), background: styles.systemButtonBackgroundStyle, foreground: styles.functionForegroundStyle },
    { key: '123', width: footerAvailableWidth * (0.84 / footerWeightTotal), background: styles.systemButtonBackgroundStyle, foreground: styles.functionForegroundStyle },
    { key: 'space', width: footerAvailableWidth * (3.58 / footerWeightTotal), background: styles.alphabeticBackgroundStyle, foreground: styles.spaceForegroundStyle },
    { key: 'cnen', width: footerAvailableWidth * (1.02 / footerWeightTotal), background: styles.systemButtonBackgroundStyle, foreground: styles.functionForegroundStyle },
  ];
  let footerX = leftInset;
  const footerY = topInset + 3 * (rowHeight + rowGap);
  const footerHtml = footerItems.map((item) => {
    const width = item.width;
    const label = labelForMode(project, 'keyboard26', item.key, options);
    const html = `
      <div class="calayer-cell is-${item.key} ${item.key === 'space' ? 'is-letter' : 'is-function'}" style="position:absolute;left:${footerX}px;top:${footerY}px;width:${width}px;height:${rowHeight}px">
        <div class="calayer-visible" style="width:100%;height:100%">
          <div class="calayer-background is-layer-bg" style="${geometryCss(item.background)};${insetPositionCss(resolveInsets(project, 'keyboard26', item.key))}"></div>
          ${item.key === 'space'
            ? renderForeground({ ...item.foreground, fontSize: 24 }, '⌴')
            : item.key === 'cnen'
              ? [
                  renderForeground({ ...item.foreground, center: { x: 0.42, y: 0.42 }, fontSize: Math.max(14, Number(item.foreground.fontSize || 15)) }, profileLabelForCnen(options)),
                  renderForeground({ ...item.foreground, center: { x: 0.61, y: 0.66 }, fontSize: 10, normalColor: 'rgba(0,0,0,.68)' }, subLabelForCnen(options)),
                ].join('')
            : item.key === 'enter'
              ? renderForeground({
                ...item.foreground,
                center: { x: 0.5, y: 0.5 },
                fontSize: Math.max(15, Number(item.foreground.fontSize || 18) - 3),
              }, label)
            : renderForeground(item.foreground, label)}
        </div>
      </div>
    `;
    footerX += width + footerColGap;
    return html;
  }).join('');
  const enterX = leftInset + contentWidth - rightWidth;
  const enterY = topInset + 2 * (rowHeight + rowGap);
  const enterHtml = `
    <div class="calayer-cell is-enter is-function" style="position:absolute;left:${enterX}px;top:${enterY}px;width:${rightWidth}px;height:${mergedEnterHeight}px">
      <div class="calayer-visible" style="width:100%;height:100%">
        <div class="calayer-background is-layer-bg" style="${geometryCss(styles.enterButtonBackgroundStyle)};${insetPositionCss(resolveInsets(project, 'keyboard26', 'enter'))}"></div>
        ${renderForeground({
    ...styles.enterForegroundStyle,
    center: { x: 0.5, y: 0.5 },
    fontSize: Math.max(15, Number(styles.enterForegroundStyle.fontSize || 18) - 3),
  }, labelForMode(project, 'keyboard26', 'enter', options))}
      </div>
    </div>
  `;
  return `
    <div class="calayer-keyboard is-pinyin9-keyboard" style="${geometryCss(styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
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
}, styles) {
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
    : key === 'cnen' && displayLabelOverride === null
      ? [
          renderForeground({ ...foregroundOverride, center: { x: 0.44, y: 0.42 }, fontSize: Math.max(14, Number(foregroundOverride.fontSize || 15)) }, profileLabelForCnen(options)),
          renderForeground({ ...foregroundOverride, center: { x: 0.62, y: 0.62 }, fontSize: Math.max(10, Number(foregroundOverride.fontSize || 11) - 2), normalColor: 'rgba(0,0,0,.68)' }, subLabelForCnen(options)),
        ].join('')
      : renderForeground(buttonStyleTypeOverride ? { ...foregroundOverride, buttonStyleType: buttonStyleTypeOverride } : foregroundOverride, displayLabel);
  const previewAttrs = previewKey === null ? '' : ` data-preview-key="${escapeHtml(previewKey)}"`;
  return `
    <div class="calayer-cell is-${key} ${isFunction ? 'is-function' : 'is-letter'}" style="position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px"${previewAttrs}>
      <div class="calayer-visible" style="width:100%;height:100%">
        <div class="calayer-background is-layer-bg" style="${geometryCss(backgroundStyle)};${insetPositionCss(resolveInsets(project, 'keyboard26', key))}"></div>
        ${content}
      </div>
    </div>
  `;
}

function profileLabelForCnen(options = {}) {
  return '中';
}

function subLabelForCnen(options = {}) {
  return '/En';
}

function renderPinyinVariantKeyboard(project, theme, styles, frame, options = {}) {
  const variant = activePinyinVariantForPreview(project, options);
  const height = frame.keyboardHeight;
  const keyboardInsets = styles.keyboardStyle.insets || {};
  const outerInsetX = 5;
  const outerInsetY = 4;
  const leftInset = Number(keyboardInsets.left || 0) + outerInsetX;
  const topInset = Number(keyboardInsets.top || 0) + outerInsetY;
  const contentWidth = previewLogicalWidth(options) - leftInset - Number(keyboardInsets.right || 0) - outerInsetX;
  const contentHeight = height - topInset - Number(keyboardInsets.bottom || 0) - outerInsetY;
  const rowGap = 4;
  const colGap = 5;
  const rowHeight = (contentHeight - rowGap * 3) / 4;
  const cells = [];
  const layoutRowByWeights = (items, width = contentWidth, xStart = leftInset) => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const usableWidth = width - colGap * Math.max(items.length - 1, 0);
    let x = xStart;
    return items.map((item, index) => {
      const cellWidth = usableWidth * (item.weight / totalWeight);
      const placed = { ...item, x, width: cellWidth };
      x += cellWidth + (index === items.length - 1 ? 0 : colGap);
      return placed;
    });
  };

  if (variant === '14') {
    [['qw','er','ty','ui','op'],['as','df','gh','jk','l']].forEach((row, rowIndex) => {
      const width = rowIndex === 1 ? contentWidth * 0.94 : contentWidth;
      const xStart = rowIndex === 1 ? leftInset + contentWidth * 0.03 : leftInset;
      layoutRowByWeights(row.map((key) => ({ key, weight: key === 'l' ? 0.82 : 1 })), width, xStart).forEach((item) => {
        cells.push(renderVariantCell(project, theme, item.key, item.key.toUpperCase(), {
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
      { key: 'word', weight: 1.12, isFunction: true },
      { key: 'zx', weight: 1.62 },
      { key: 'cv', weight: 1.46 },
      { key: 'bn', weight: 1.46 },
      { key: 'm', weight: 0.95 },
      { key: 'backspace', weight: 0.82, isFunction: true },
    ]).forEach((item) => {
      cells.push(renderVariantCell(project, theme, item.key, item.key, { x: item.x, y: thirdY, width: item.width, height: rowHeight, isFunction: item.isFunction, options }, styles));
    });
    layoutRowByWeights([
      { key: '123', weight: 1.18, isFunction: true },
      { key: 'semicolon', weight: 1.02, isFunction: true },
      { key: 'space', weight: 2.92 },
      { key: 'cnen', weight: 1.02, isFunction: true },
      { key: 'enter', weight: 1.7, isFunction: true, accent: true },
    ]).forEach((item) => {
      cells.push(renderVariantCell(project, theme, item.key, item.key, { x: item.x, y: footerY, width: item.width, height: rowHeight, isFunction: item.isFunction, accent: item.accent, options }, styles));
    });
  } else if (variant === '17') {
    [['h','s','z','b','x','m'],['l','d','y','w','j','n']].forEach((row, rowIndex) => {
      const width = rowIndex === 1 ? contentWidth * 0.95 : contentWidth;
      const xStart = rowIndex === 1 ? leftInset + contentWidth * 0.025 : leftInset;
      layoutRowByWeights(row.map((key) => ({ key, weight: 1 })), width, xStart).forEach((item) => {
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
    layoutRowByWeights([
      { key: 'c', weight: 1.2 },
      { key: 'q', weight: 1.2 },
      { key: 'g', weight: 1.1 },
      { key: 'f', weight: 1.1 },
      { key: 't', weight: 0.95 },
      { key: 'backspace', weight: 0.9, isFunction: true },
    ]).forEach((item) => {
      cells.push(renderVariantCell(project, theme, item.key, item.key, { x: item.x, y: thirdY, width: item.width, height: rowHeight, isFunction: item.isFunction, options }, styles));
    });
    layoutRowByWeights([
      { key: '123', weight: 1.18, isFunction: true },
      { key: 'cnen', weight: 0.98, isFunction: true },
      { key: 'space', weight: 2.95 },
      { key: 'semicolon', weight: 1.02, isFunction: true },
      { key: 'enter', weight: 1.66, isFunction: true, accent: true },
    ]).forEach((item) => {
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
    const footer = layoutRowByWeights([
      { key: '123', weight: 1.15, isFunction: true },
      { key: 'semicolon', weight: 0.95, isFunction: true },
      { key: 'space', weight: 3.0 },
      { key: 'cnen', weight: 1.0, isFunction: true },
      { key: 'enter', weight: 1.7, isFunction: true, accent: true },
    ]);
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
    <div class="calayer-keyboard is-pinyin-variant-keyboard" style="${geometryCss(styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
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
  };
  if (overrides.displayLabel !== undefined) {
    cell.displayLabelOverride = overrides.displayLabel;
  } else if (empty) {
    cell.displayLabelOverride = '';
  }
  return renderVariantCell(project, theme, actualKey, actualKey, cell, styles);
}

function renderPinyin9LandscapeKeyboard(project, theme, styles, frame, options = {}) {
  const rows = keyboard26VariantRowsForOrientation(project, 'landscape', options);
  const height = frame.keyboardHeight;
  const width = previewLogicalWidth({ ...options, orientation: 'landscape' });
  const keyboardInsets = styles.keyboardStyle.insets || {};
  const leftInset = Number(keyboardInsets.left || 0) + 6;
  const rightInset = Number(keyboardInsets.right || 0) + 6;
  const topInset = Number(keyboardInsets.top || 0) + 4;
  const bottomInset = Number(keyboardInsets.bottom || 0) + 4;
  const contentWidth = width - leftInset - rightInset;
  const contentHeight = height - topInset - bottomInset;
  const rowGap = 4;
  const rowHeight = (contentHeight - rowGap * 3) / 4;
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
    displayLabel: item.key === 'space' ? '空格' : undefined,
    isFunction: item.key ? undefined : false,
    backgroundStyleOverride: item.key ? null : styles.alphabeticBackgroundStyle,
  })).join('');
  return `
    <div class="calayer-keyboard is-pinyin9-landscape-keyboard" style="${geometryCss(styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
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
  const width = previewLogicalWidth({ ...options, orientation: 'landscape' });
  const keyboardInsets = styles.keyboardStyle.insets || {};
  const leftInset = Number(keyboardInsets.left || 0) + 6;
  const rightInset = Number(keyboardInsets.right || 0) + 6;
  const topInset = Number(keyboardInsets.top || 0) + 4;
  const bottomInset = Number(keyboardInsets.bottom || 0) + 4;
  const contentWidth = width - leftInset - rightInset;
  const contentHeight = height - topInset - bottomInset;
  const rowGap = 4;
  const rowHeight = (contentHeight - rowGap * 3) / 4;
  const sectionGap = 8;
  const leftWidth = contentWidth * 0.32;
  const middleWidth = contentWidth * 0.29;
  const rightWidth = contentWidth - leftWidth - middleWidth - sectionGap * 2;
  const middleSymbolWidth = Math.max(50, middleWidth * 0.2);
  const middleNumberWidth = middleWidth - middleSymbolWidth - 6;
  const leftX = leftInset;
  const middleX = leftX + leftWidth + sectionGap;
  const rightX = middleX + middleWidth + sectionGap;
  const middleNumberX = middleX + middleSymbolWidth + 6;
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
  const leftHtml = leftWeights.map((weightRow, rowIndex) => layoutWeightedPreviewRow(
    weightRow.map((weight, slotIndex) => ({ key: variantLandscapeKeyAt(rows, rowIndex, slotIndex), weight })),
    leftWidth,
    leftX,
    6,
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
  const rightHtml = rightWeights.map((weightRow, rowIndex) => layoutWeightedPreviewRow(
    weightRow.map((weight, slotIndex) => ({ key: variantLandscapeKeyAt(rows, rowIndex, slotIndex + 6), weight })),
    rightWidth,
    rightX,
    6,
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
    return renderVariantLayoutSlot(project, theme, key, {
      x: middleNumberX + columnIndex * middleNumberCellWidth,
      y: topInset + rowIndex * (rowHeight + rowGap),
      width: middleNumberCellWidth,
      height: rowHeight,
      options,
    }, styles, {
      displayLabel: key.replace('number', ''),
      foregroundStyleOverride: styles.keyForegroundStyle,
    });
  }).join('')).join('');
  const footerY = topInset + 3 * (rowHeight + rowGap);
  const leftFooter = layoutWeightedPreviewRow([
    { key: variantLandscapeKeyAt(rows, 3, 0), weight: 1.05 },
    { key: variantLandscapeKeyAt(rows, 3, 1), weight: 0.9 },
    { key: variantLandscapeKeyAt(rows, 3, 2), weight: 2.4 },
  ], leftWidth, leftX, 6).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: footerY,
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    displayLabel: item.key === 'semicolon' ? '，' : item.key === 'space' ? '空格' : undefined,
  })).join('');
  const middleFooter = layoutWeightedPreviewRow([
    { key: '', weight: 1, label: '=' },
    { key: '', weight: 1, label: '@' },
    { key: middleNumberKeyAt(3, 3, 'number0'), weight: 1 },
    { key: '', weight: 1, label: '.' },
  ], middleWidth, middleX, 6).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: footerY,
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    isFunction: item.label ? true : undefined,
    displayLabel: item.label ?? (item.key === 'number0' ? '0' : undefined),
    previewKey: item.label ? null : undefined,
    foregroundStyleOverride: item.key && !FUNCTION_KEYS.has(item.key) ? styles.keyForegroundStyle : null,
    backgroundStyleOverride: item.label ? styles.systemButtonBackgroundStyle : (!item.key ? styles.alphabeticBackgroundStyle : null),
    buttonStyleTypeOverride: item.label ? 'text' : null,
  })).join('');
  const rightFooter = layoutWeightedPreviewRow([
    { key: variantLandscapeKeyAt(rows, 3, 4), weight: 2.45 },
    { key: variantLandscapeKeyAt(rows, 3, 5), weight: 1.05 },
    { key: variantLandscapeKeyAt(rows, 3, 6), weight: 1.42 },
  ], rightWidth, rightX, 6).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: footerY,
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    accent: item.key === 'enter',
    displayLabel: item.key === 'space' ? '空格' : undefined,
  })).join('');
  return `
    <div class="calayer-keyboard is-pinyin14-landscape-keyboard" style="${geometryCss(styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
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
  const width = previewLogicalWidth({ ...options, orientation: 'landscape' });
  const keyboardInsets = styles.keyboardStyle.insets || {};
  const leftInset = Number(keyboardInsets.left || 0) + 6;
  const rightInset = Number(keyboardInsets.right || 0) + 6;
  const topInset = Number(keyboardInsets.top || 0) + 4;
  const bottomInset = Number(keyboardInsets.bottom || 0) + 4;
  const contentWidth = width - leftInset - rightInset;
  const contentHeight = height - topInset - bottomInset;
  const rowGap = 4;
  const rowHeight = (contentHeight - rowGap * 3) / 4;
  const middleGap = contentWidth * 0.16;
  const sideWidth = (contentWidth - middleGap) / 2;
  const leftX = leftInset;
  const rightX = leftX + sideWidth + middleGap;
  const leftHtml = [0, 1, 2].map((rowIndex) => layoutWeightedPreviewRow(
    [0, 1, 2].map((slotIndex) => ({ key: variantLandscapeKeyAt(rows, rowIndex, slotIndex), weight: 1 })),
    sideWidth,
    leftX,
    6,
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
      weight: rowIndex === 2 && slotIndex === 2 ? 1.08 : 1,
    })),
    sideWidth,
    rightX,
    6,
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
    { key: variantLandscapeKeyAt(rows, 3, 1), weight: 1.05 },
    { key: variantLandscapeKeyAt(rows, 3, 2), weight: 2.7 },
  ], sideWidth, leftX, 6).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: footerY,
    width: item.width,
    height: rowHeight,
    options,
  }, styles, {
    displayLabel: item.key === 'space' ? '空格' : undefined,
  })).join('');
  const rightFooter = layoutWeightedPreviewRow([
    { key: variantLandscapeKeyAt(rows, 3, 3), weight: 2.55 },
    { key: variantLandscapeKeyAt(rows, 3, 4), weight: 1.0 },
    { key: variantLandscapeKeyAt(rows, 3, 5), weight: 1.35 },
  ], sideWidth, rightX, 6).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
    x: item.x,
    y: footerY,
    width: item.width,
    height: rowHeight,
    options,
    }, styles, {
      accent: item.key === 'enter',
      displayLabel: item.key === 'space' ? '空格' : undefined,
    })).join('');
  return `
    <div class="calayer-keyboard is-pinyin17-landscape-keyboard" style="${geometryCss(styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
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
  const width = previewLogicalWidth({ ...options, orientation: 'landscape' });
  const keyboardInsets = styles.keyboardStyle.insets || {};
  const leftInset = Number(keyboardInsets.left || 0) + 5;
  const topInset = Number(keyboardInsets.top || 0) + 4;
  const contentWidth = width - leftInset - Number(keyboardInsets.right || 0) - 5;
  const contentHeight = height - topInset - Number(keyboardInsets.bottom || 0) - 4;
  const rowGap = 4;
  const colGap = 6;
  const rowHeight = (contentHeight - rowGap * 3) / 4;
  const rowWeights = [
    [0.95, 1.14, 1.14, 0.88, 0.88, 1.14, 0.92],
    [1.12, 1, 1, 0.9, 1, 1.08],
    [1.08, 1.02, 1.06, 0.9, 1.12, 0.94, 0.82],
    [1.15, 0.95, 3.0, 1.0, 1.7],
  ];
  const html = rowWeights.map((weightRow, rowIndex) => {
    const rowWidth = rowIndex === 1 ? contentWidth * 0.91 : contentWidth;
    const rowStart = rowIndex === 1 ? leftInset + contentWidth * 0.045 : leftInset;
    return layoutWeightedPreviewRow(
      weightRow.map((weight, slotIndex) => ({ key: variantLandscapeKeyAt(rows, rowIndex, slotIndex), weight })),
      rowWidth,
      rowStart,
      colGap,
    ).map((item) => renderVariantLayoutSlot(project, theme, item.key, {
      x: item.x,
      y: topInset + rowIndex * (rowHeight + rowGap),
      width: item.width,
      height: rowHeight,
      options,
    }, styles, {
      accent: item.key === 'enter',
      displayLabel: item.key === 'space' ? '空格' : undefined,
      isFunction: rowIndex < 3 && !item.key ? false : undefined,
      backgroundStyleOverride: rowIndex < 3 && !item.key ? styles.alphabeticBackgroundStyle : null,
    })).join('');
  }).join('');
  return `
    <div class="calayer-keyboard is-pinyin18-landscape-keyboard" style="${geometryCss(styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)};position:relative">
      ${html}
    </div>
  `;
}

function keyboard26ProfileFromOptions(options = {}) {
  return options.keyboardProfile === 'alphabetic' ? 'alphabetic' : 'pinyin';
}

function keyboard26PreviewSourceVariant(options = {}) {
  return options.previewSourceName || '';
}

function keyboard26DisplaySpec(project, key, options = {}) {
  const keyboard = project.keyboards?.keyboard26 || {};
  const customLabel = keyboard.keyDisplays?.[key];
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
  return project.keyboardCombo?.spaceRow?.commaKey?.swipeUp
    || project.keyboards?.keyboard26?.spaceRight?.[profile]?.secondary?.text
    || project.keyboards?.keyboard26?.spaceRight?.pinyin?.secondary?.text
    || '';
}

function foregroundCss(style = {}) {
  const center = style.center || { x: 0.5, y: 0.5 };
  return [
    `left:${Number(center.x ?? 0.5) * 100}%`,
    `top:${Number(center.y ?? 0.5) * 100}%`,
    `font-size:${Number(style.fontSize || 14)}px`,
    `color:${cssColor(style.normalColor, 'currentColor')}`,
    style.fontWeight ? `font-weight:${style.fontWeight}` : '',
  ].filter(Boolean).join(';');
}

function renderForeground(style, content) {
  if (!content) return '';
  const safeContent = style.buttonStyleType === 'systemImage'
    ? renderSystemImageSvg(content)
    : escapeHtml(content);
  const extraClass = style.className ? ` ${style.className}` : '';
  return `<span class="calayer-foreground is-${style.buttonStyleType}${extraClass}" style="${foregroundCss(style)}">${safeContent}</span>`;
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
  if (mode === 'keyboard26') return project.data?.swipes?.[keyboard26ProfileFromOptions(options)] || {};
  if (mode === 'numeric') return project.data?.swipes?.numeric || {};
  return {};
}

function swipeMarksVisible(project) {
  return !['hidden', 'disabled'].includes(project.keyboardCombo?.swipeBehavior?.mode);
}

function resolveSwipeEntry(project, mode, key, direction, options = {}) {
  if (!swipeMarksVisible(project)) return null;
  const data = resolveSwipeData(project, mode, options);
  const source = data[direction === 'up' ? 'swipe_up' : 'swipe_down'] || {};
  return source[key] || null;
}

function swipeForeground(baseStyle, entry, theme, className) {
  const label = entry?.label || {};
  if (label.text === '') return null;
  const content = label.systemImageName || label.text;
  if (!content) return null;
  const color = entry?.color?.[theme];
  const buttonStyleType = label.systemImageName ? 'systemImage' : 'text';
  return {
    style: {
      ...baseStyle,
      className,
      buttonStyleType,
      center: entry.center || baseStyle.center,
      normalColor: color?.normalColor || baseStyle.normalColor,
    },
    content,
  };
}

function swipeForegroundStyleForMode(styles, project, mode, direction, entry = {}) {
  const baseStyle = direction === 'up' ? styles.swipeUpForegroundStyle : styles.swipeDownForegroundStyle;
  const icon = Boolean(entry?.label?.systemImageName);
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

function renderLayerCell({ className = '', basis = null, bounds = null, height = null, backgroundStyle, foregrounds = [], attrs = '' }) {
  const outerStyle = [
    basis ? `flex:0 0 ${basis}` : '',
    height ? `height:${height}px` : '',
  ].filter(Boolean).join(';');
  const visibleStyle = boundsCss(bounds);
  const backgroundCss = [
    geometryCss(backgroundStyle),
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
  const actionValue = action.symbol ?? action.character ?? action.shortcut;
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

function hintAnchorForMode(project, mode, targetKey, frame, orientation, options = {}) {
  const keyboardInsets = mode === 'symbolic'
    ? { top: 3, right: 4, bottom: 3, left: 4 }
    : layerStyles(project, 'light').keyboardStyle.insets;
  const top = frame.toolbarHeight + numberInset(keyboardInsets, 'top');
  const height = frame.keyboardHeight - numberInset(keyboardInsets, 'top') - numberInset(keyboardInsets, 'bottom');
  const availableWidth = PREVIEW_LOGICAL_SIZE[orientation]?.width || PREVIEW_LOGICAL_WIDTH;
  const contentWidth = availableWidth - numberInset(keyboardInsets, 'left') - numberInset(keyboardInsets, 'right');
  if (mode === 'numeric') {
    const columns = project.keyboards?.numeric?.layout?.portrait?.columns?.length
      ? project.keyboards.numeric.layout.portrait.columns
      : DEFAULT_NUMERIC_COLUMNS;
    const columnIndex = Math.max(columns.findIndex((column) => column.includes(targetKey)), 0);
    const rowIndex = Math.max(columns[columnIndex]?.indexOf(targetKey) ?? 0, 0);
    const columnWidth = contentWidth / Math.max(columns.length, 1);
    const rowHeight = height / Math.max(...columns.map((column) => column.length), 1);
    const metric = resolveKeyMetric(project, 'numeric', targetKey, orientation, options);
    const cellRect = {
      x: numberInset(keyboardInsets, 'left') + columnIndex * columnWidth,
      y: top + rowIndex * rowHeight,
      width: columnWidth,
      height: rowHeight,
    };
    const rect = visibleRectWithinCell(cellRect, metric.bounds);
    return {
      x: rect.x + rect.width / 2,
      y: rect.y,
    };
  }
  const rows = rowsForMode(project, mode, orientation, options);
  const rowIndex = Math.max(rows.findIndex((row) => row.includes(targetKey)), 0);
  const row = rows[rowIndex] || [];
  const rowHeight = height / Math.max(rows.length, 1);
  const rect = rowKeyRects(
    project,
    mode,
    row,
    top + rowIndex * rowHeight,
    rowHeight,
    contentWidth,
    orientation,
    options,
  ).find(([key]) => key === targetKey)?.[1];
  const fallbackWidth = contentWidth / Math.max(row.length, 1);
  const fallbackIndex = Math.max(row.indexOf(targetKey), 0);
  return {
    x: numberInset(keyboardInsets, 'left') + (rect ? rect.x + rect.width / 2 : fallbackIndex * fallbackWidth + fallbackWidth / 2),
    y: rect ? rect.y : top + rowIndex * rowHeight,
  };
}

function renderHintOverlay(project, mode, styles, frame, options = {}) {
  const sample = hintEntryForMode(project, mode, options.activeHintKey);
  const list = Array.isArray(sample?.entry?.list) ? sample.entry.list : [];
  if (!list.length) return '';

  const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  const labelSpecs = list.map((item) => hintLabelSpec(item));
  const selectedIndex = Math.min(Math.max(Number(sample.entry.selectedIndex || 0), 0), list.length - 1);
  const maxTextLength = Math.max(0, ...labelSpecs
    .filter((label) => label.type === 'text')
    .map((label) => label.visualLength || [...label.content].length));
  const cellWidth = maxTextLength > 3
    ? HINT_PREVIEW_LONG_TEXT_CELL_WIDTH
    : maxTextLength > 1
      ? HINT_PREVIEW_TEXT_CELL_WIDTH
      : HINT_PREVIEW_MIN_CELL_WIDTH;
  const width = Math.max(cellWidth * list.length, HINT_PREVIEW_MIN_CELL_WIDTH);
  const height = HINT_PREVIEW_CELL_HEIGHT;
  const anchor = hintAnchorForMode(project, mode, sample.key, frame, orientation, options);
  const previewWidth = PREVIEW_LOGICAL_SIZE[orientation]?.width || PREVIEW_LOGICAL_WIDTH;
  const left = Math.min(Math.max(anchor.x - width / 2, 6), previewWidth - width - 6);
  const top = Math.min(Math.max(anchor.y - height - 7, 4), frame.toolbarHeight + frame.keyboardHeight - height - 6);

  return `
    <div class="long-press-hint-preview" style="left:${left}px;top:${top}px;width:${width}px;height:${height}px">
      <div class="calayer-background is-layer-bg" style="${geometryCss(styles.hintBackgroundStyle)};${insetPositionCss(styles.hintBackgroundStyle.insets)}"></div>
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
      height,
      backgroundStyle: selected
        ? styles.hintSelectedBackgroundStyle
        : { buttonStyleType: 'geometry', normalColor: '#00000000', cornerRadius: 0 },
      foregrounds: [renderForeground(foregroundStyle, label.content)],
    });
  }).join('')}
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
  const spaceRightConfig = project.keyboards?.keyboard26?.spaceRight?.[spaceRightProfile]
    || project.keyboards?.keyboard26?.spaceRight?.pinyin
    || {};
  const showSpaceRightSecondary = swipeMarksVisible(project);
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
  if (
    mode === 'keyboard26'
    && key === 'space'
    && schemaName
    && project.keyboardCombo?.spaceRow?.showSchemaNameOnSpace !== false
    && activePinyinVariantForPreview(project, options) === '26'
  ) {
    foregrounds.push(renderForeground({
      buttonStyleType: 'text',
      center: schemaName.center || { x: 0.17, y: 0.2 },
      fontSize: Number(schemaName.fontSize || 8),
      normalColor: resolveColor(
        project,
        theme,
        '方案名颜色',
        resolveColor(project, theme, schemaName.colorKey || '划动字符颜色', '#838383ff'),
      ),
    }, schemaName.text === '$rimeSchemaName' ? '朙月拼音' : schemaName.text));
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
  const sourceButtons = project.toolbar?.layout?.length ? project.toolbar.layout : TOOLBAR_ORDER;
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
        const style = usesIcon ? styles.toolbarForegroundStyle : { ...styles.toolbarForegroundStyle, buttonStyleType: 'text' };
        return renderLayerCell({
          className: 'is-toolbar-button',
          height,
          backgroundStyle: styles.toolbarButtonBackgroundStyle,
          foregrounds: [renderForeground(style, usesIcon ? systemImage : text)],
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
  return `color:${cssColor(color, 'currentColor')};font-size:${Number(candidateStyle[fontSizeKey] || 14)}px`;
}

function renderCandidateItem(candidate, index, candidateStyle, className) {
  const selected = index === 0;
  const bg = selected ? cssColor(candidateStyle.preferredBackgroundColor) : 'transparent';
  const outerInsets = candidateStyle.insets ? `padding:${cssInsets(candidateStyle.insets)}` : '';
  const selectedPadding = candidateStyle.selectedPadding ? `padding:${cssInsets(candidateStyle.selectedPadding)}` : '';
  return `
    <div class="${className} ${selected ? 'is-selected' : ''}" style="${outerInsets}">
      <div class="calayer-candidate-content" style="background:${bg};${selected ? selectedPadding : ''}">
        ${candidateStyle.indexFontSize === 0 ? '' : `<span style="${candidateCss(candidateStyle, selected, 'Index')}">${candidate.index}</span>`}
        <strong style="${candidateCss(candidateStyle, selected, 'Text')}">${escapeHtml(candidate.text)}</strong>
        ${candidate.comment ? `<em style="${candidateCss(candidateStyle, selected, 'Comment')}">${escapeHtml(candidate.comment)}</em>` : ''}
      </div>
    </div>
  `;
}

function renderHorizontalCandidates(project, styles, height) {
  const candidateInsets = project.toolbar?.horizontalCandidates?.insets
    || project.keyStyles?.buttonInsets?.toolbar?.horizontalCandidates
    || {};
  return `
    <div class="calayer-candidate-bar" style="height:${height}px;padding:${cssInsets(candidateInsets)}">
      ${CANDIDATES.slice(0, 8).map((candidate, index) => renderCandidateItem(candidate, index, styles.candidateStyle, 'calayer-candidate')).join('')}
      ${renderLayerCell({
        className: 'is-candidate-toggle',
        height,
        backgroundStyle: styles.toolbarButtonBackgroundStyle,
        foregrounds: [renderForeground({ ...styles.toolbarForegroundStyle, buttonStyleType: 'systemImage' }, 'chevron.up')],
      })}
    </div>
  `;
}

function renderExpandedCandidates(project, styles, frame) {
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
    <div class="calayer-expanded-candidates" style="${geometryCss(styles.verticalCandidateBackgroundStyle)};height:${height}px;padding:${cssInsets(styleInsets)};grid-template-columns:minmax(0,1fr) ${actionWidth}px">
      <div class="calayer-expanded-list" style="padding:${cssInsets(candidateInsets)}">
        ${EXPANDED_CANDIDATES.map((candidate, index) => renderCandidateItem(candidate, index, styles.verticalCandidateCellStyle, 'calayer-expanded-candidate')).join('')}
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

function numericCell(project, key, height, styles, orientation = 'portrait', options = {}) {
  const customLabel = project.keyboards?.numeric?.keyDisplays?.[key];
  const metric = resolveKeyMetric(project, 'numeric', key, orientation);
  const isPressed = options.activePressedKey === key;
  if (/^\d$/.test(key)) {
    return renderLayerCell({
      className: `is-numeric-number is-${key} ${isPressed ? 'is-pressed' : ''}`,
      basis: metric.basis,
      bounds: metric.bounds,
      height,
      backgroundStyle: { ...styles.numberButtonBackgroundStyle, insets: resolveInsets(project, 'numeric', key) },
      foregrounds: [renderForeground(styles.numericNumberForegroundStyle, customLabel || key)],
      attrs: `data-preview-key="${escapeHtml(key)}"`,
    });
  }

  const systemImage = key === 'backspace' && !customLabel ? 'delete.left' : null;
  const foregroundStyle = systemImage
    ? styles.numericIconForegroundStyle
    : key === 'period' || key === 'equal'
      ? styles.numericPeriodForegroundStyle
      : styles.numericTextForegroundStyle;

  return renderLayerCell({
    className: `is-numeric-function is-${key} ${isPressed ? 'is-pressed' : ''}`,
    basis: metric.basis,
    bounds: metric.bounds,
    height,
    backgroundStyle: { ...styles.numericSystemButtonBackgroundStyle, insets: resolveInsets(project, 'numeric', key) },
    foregrounds: [renderForeground(foregroundStyle, systemImage || numericLabel(project, key))],
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

function renderNumericCollection(project, rowHeight, styles, orientation = 'portrait') {
  const height = rowHeight * 3;
  const metric = resolveKeyMetric(project, 'numeric', 'collection', orientation);
  const symbols = numericCollectionSymbols(project);
  const collectionCells = symbols.slice(0, 5).map((symbol) => renderLayerCell({
    className: 'is-numeric-symbol',
    backgroundStyle: styles.numericCollectionCellBackgroundStyle,
    foregrounds: [renderForeground(styles.numericCollectionForegroundStyle, symbol)],
  })).join('');

  return `
    <div class="calayer-cell is-numeric-collection" style="${[metric.basis ? `flex:0 0 ${metric.basis}` : '', `height:${height}px`].filter(Boolean).join(';')}">
      <div class="calayer-visible" style="${boundsCss(metric.bounds)}">
        <div class="calayer-background is-layer-bg" style="${geometryCss(styles.numericCollectionBackgroundStyle)};${insetPositionCss(styles.numericCollectionBackgroundStyle.insets)}"></div>
        <div class="numeric-symbol-grid" style="${insetPositionCss(styles.numericCollectionBackgroundStyle.insets)}">${collectionCells}</div>
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
    <div class="calayer-keyboard is-symbolic-keyboard" style="${geometryCss(styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(keyboardInsets)}">
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
    });
  }).join('')}
          </div>
        `;
  }).join('')}
      </div>
    </div>
  `;
}

function renderNumericKeyboard(project, styles, frame, options = {}) {
  const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  const height = frame.keyboardHeight;
  const columns = project.keyboards?.numeric?.layout?.portrait?.columns?.length
    ? project.keyboards.numeric.layout.portrait.columns
    : DEFAULT_NUMERIC_COLUMNS;
  const rowHeight = height / Math.max(...columns.map((column) => column.length), 1);
  return `
    <div class="calayer-keyboard is-numeric-keyboard" style="${geometryCss(styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)}">
      <div class="numeric-column-layout">
        ${columns.map((column, columnIndex) => `
          <div class="numeric-column is-column-${columnIndex + 1}">
            ${column.map((key) => key === 'collection'
      ? renderNumericCollection(project, rowHeight, styles, orientation)
      : numericCell(project, key, rowHeight, styles, orientation, options)).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPanelKeyboard(project, styles) {
  const scale = project.keyboardFrame?.panel?.floatTargetScale?.portrait || { x: 0.8, y: 0.6 };
  const width = PREVIEW_LOGICAL_WIDTH * Number(scale.x || 0.8);
  const height = (project.keyboardFrame?.portrait?.keyboardHeight || 210) * Number(scale.y || 0.6);
  const rowHeight = height / 2;
  const labels = project.keyboards?.panel?.text || {};
  const rows = [
    PANEL_BUTTONS.slice(0, 5),
    PANEL_BUTTONS.slice(5, 10),
  ];

  return `
    <div class="panel-preview-wrap" style="height:${project.keyboardFrame?.portrait?.keyboardHeight || 210}px">
      <div class="calayer-keyboard is-panel-keyboard" style="${geometryCss(styles.panelKeyboardBackgroundStyle)};width:${width}px;height:${height}px;padding:${cssInsets(styles.panelKeyboardBackgroundStyle.insets)}">
        ${rows.map((row) => `
          <div class="calayer-row panel-row" style="height:${rowHeight}px">
            ${row.map(([key, icon, textKey]) => {
    const metric = resolveKeyMetric(project, 'panel', key);
    return renderLayerCell({
    className: `is-panel-button is-${key}`,
    basis: metric.basis,
    bounds: metric.bounds,
    height: rowHeight,
    backgroundStyle: styles.panelButtonBackgroundStyle,
    foregrounds: [
      renderForeground(styles.panelIconForegroundStyle, icon),
      renderForeground(styles.panelTextForegroundStyle, labels[textKey] || textKey),
    ],
  });
  }).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderTopArea(project, candidateState, styles, frame) {
  if (candidateState === 'expanded') return renderExpandedCandidates(project, styles, frame);
  if (candidateState === 'toolbar') {
    return `
      <div class="calayer-top-strip" style="${geometryCss(styles.toolbarBackgroundStyle)};height:${frame.toolbarHeight}px">
        ${renderToolbar(project, styles, frame.toolbarHeight)}
      </div>
    `;
  }
  return `
    <div class="calayer-top-strip" style="${geometryCss(styles.toolbarBackgroundStyle)};height:${frame.toolbarHeight}px;padding:8px 0 3px 5px">
      ${renderHorizontalCandidates(project, styles, frame.toolbarHeight - 11)}
    </div>
  `;
}

function renderKeyboard(project, theme, mode, styles, frame, options = {}) {
  if (mode === 'numeric') return renderNumericKeyboard(project, styles, frame, options);
  if (mode === 'symbolic') return renderSymbolicKeyboard(project, theme, styles, frame, options);
  if (mode === 'emoji') return renderSymbolicKeyboard(project, theme, styles, frame, { ...options, collectionSourceKey: 'emojiDataSource' });
  if (mode === 'panel') return renderPanelKeyboard(project, styles);

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
  const height = frame.keyboardHeight;
  if (mode === 'keyboard26' && orientation === 'landscape') {
    const landscape = project.keyboards?.keyboard26?.layout?.landscape || {};
    const sections = ['left', 'middle', 'right']
      .map((section) => ({ id: section, rows: landscape[section] || [] }))
      .filter((section) => section.rows.length);
    if (sections.length) {
      const maxRows = Math.max(...sections.map((section) => section.rows.length), 1);
      const rowHeight = height / maxRows;
      return `
        <div class="calayer-keyboard is-landscape-keyboard" style="${geometryCss(styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)}">
          <div class="calayer-landscape-layout" style="grid-template-columns:repeat(${sections.length}, minmax(0, 1fr))">
            ${sections.map((section) => `
              <div class="calayer-landscape-section is-${section.id}">
                ${Array.from({ length: maxRows }, (_, rowIndex) => `
                  <div class="calayer-row" style="height:${rowHeight}px">
                    ${(section.rows[rowIndex] || []).map((key) => keyLayer(project, theme, mode, key, rowHeight, styles, orientation, options)).join('')}
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }
  const rows = rowsForMode(project, mode, orientation, options);
  const rowHeight = height / Math.max(rows.length, 1);

  return `
    <div class="calayer-keyboard" style="${geometryCss(styles.keyboardBackgroundStyle)};height:${height}px;padding:${cssInsets(styles.keyboardStyle.insets)}">
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
  const styles = layerStyles(project, theme);
  const frame = frameForOrientation(project, orientation);
  const requestedDisplayWidth = Number(options.maxDisplayWidth);
  const displayWidth = Number.isFinite(Number(options.maxDisplayWidth))
    ? Math.max(0, requestedDisplayWidth)
    : previewSize.displayWidth;
  const scale = displayWidth / previewSize.width;
  const logicalHeight = candidateState === 'expanded'
    ? frame.keyboardHeight + frame.toolbarHeight
    : frame.keyboardHeight + frame.toolbarHeight;
  const frameClass = candidateState === 'expanded' ? 'is-expanded' : candidateState === 'candidates' ? 'has-candidates' : 'has-toolbar';

  return `
    <div class="skin-preview-stage ${frameClass} is-${orientation}" style="width:${displayWidth}px;height:${logicalHeight * scale}px">
      <div class="skin-preview" data-renderer="calayer" data-orientation="${orientation}" style="width:${previewSize.width}px;height:${logicalHeight}px;transform:scale(${scale});background:${cssColor(styles.keyboardBackgroundStyle.normalColor)}">
        ${renderTopArea(project, candidateState, styles, frame)}
        ${candidateState === 'expanded' ? '' : renderKeyboard(project, theme, mode, styles, frame, options)}
        ${candidateState === 'expanded' ? '' : renderHintOverlay(project, mode, styles, frame, {
          orientation,
          activeHintKey: options.activeHintKey,
        })}
      </div>
    </div>
  `;
}
