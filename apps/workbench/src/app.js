import { validateProject } from '../../../packages/project-schema/validators/project-validator.js';
import { buildSkinPackageFiles, createZipBlob, defaultPackageFileName } from '../../../packages/exporter/index.js';
import { importSkinProjectFromFile } from '../../../packages/importer/index.js';
import { MODULES } from './data/modules.js';
import {
  DEFAULT_KEYBOARD_SKIN_PRESET,
  KEYBOARD_SKIN_PRESETS,
  keyboardSkinPresetByValue,
} from './data/keyboard-presets.js';
import {
  deleteTemplateSnapshot,
  listTemplateSnapshots,
  loadProject,
  loadTemplateSnapshot,
  saveProject,
  saveTemplateSnapshot,
} from './storage/local-store.js';
import { renderPreview } from './ui/preview.js';
import { buildSkinEffectModel } from '../../../packages/skin-effect/index.js';
import {
  deepClone,
  downloadBlob,
  escapeHtml,
  getPath,
  parseInputValue,
  safeJsonParse,
  setPath,
} from './utils.js';

const state = {
  project: null,
  original: null,
  moduleId: 'keyboardCombo',
  sidebarCollapsed: false,
  theme: 'light',
  previewMode: 'keyboard26',
  previewModeStack: [],
  previewOrientation: 'portrait',
  candidateState: 'toolbar',
  symbolicCategory: '常用',
  previewHintKey: null,
  previewPressedKey: null,
  previewShiftActive: false,
  previewCapsLocked: false,
  previewExpanded: false,
  keyDrag: null,
  skipNextKeyEditorClick: false,
  editingKey: null,
  suppressKeyEditorAutoCloseUntil: 0,
  customKeyboardPanel: 'preview',
  metricsKeyboardId: 'keyboard26',
  metricsOrientation: 'portrait',
  metricsSelectedKeys: {},
  metricsManualOverrides: {},
  swipeMode: 'swipe_up',
  confirmDialog: null,
  welcomeNotice: {
    visible: false,
    remainingSeconds: 0,
    timer: null,
  },
  jsonMode: false,
  jsonSearch: '',
  jsonSearchIndex: 0,
  savedAt: null,
  configDevice: 'iPhone',
  sampleProject: null,
  templateLibrary: [],
  templateLibraryOpen: false,
  templateLibraryStatus: '',
  downloadDirectoryHandle: null,
  undoStack: [],
  lastUndoSignature: '',
  isRestoringHistory: false,
  centerEditMode: 'uniform',
  selectedCenterTarget: null,
};

let pressedPreviewCell = null;
let previewLongPressTimer = null;
let previewReleaseTimer = null;
const PREVIEW_LONG_PRESS_DELAY_MS = 420;
const PREVIEW_PRESS_FEEDBACK_MS = 140;
const DEMO_SCREENSHOT_SCALE = 2;
const DEMO_IMAGE_WIDTH = 900;
const DEMO_IMAGE_HEIGHT = 730;

const VISITOR_ID_STORAGE_KEY = 'hamster-workbench-visitor-id';
const WELCOME_NOTICE_STORAGE_KEY = 'hamster-skin-workbench:welcome-notice:v1';
const WELCOME_NOTICE_SECONDS = 5;
const DEFAULT_DOWNLOAD_PATH = '浏览器默认下载位置';
const DEFAULT_SKIN_NAME_PREFIX = '皮肤';
const DEFAULT_SKIN_AUTHOR = 'https://wzxmer.github.io/Hamster-skin-designer/';
const KEYBOARD26_ROW_LABELS = {
  top: '上排',
  middle: '中排',
  bottom: '下排',
  footer: '底排',
};
const KEYBOARD26_ROW_ORDER = ['top', 'middle', 'bottom', 'footer'];
const KEYBOARD26_DEFAULT_ROWS = [
  { id: 'row-1', label: '上排', keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'] },
  { id: 'row-2', label: '中排', keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'] },
  { id: 'row-3', label: '下排', keys: ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'] },
  { id: 'row-4', label: '底排', keys: ['123', 'cnen', 'space', 'spaceRight', 'enter'] },
];
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
    ['123', 'semicolon', 'space', 'cnen', 'enter'],
  ],
  '17': [
    ['h', 's', 'z', 'b', 'x', 'm'],
    ['l', 'd', 'y', 'w', 'j', 'n'],
    ['c', 'q', 'g', 'f', 't', 'backspace'],
    ['123', 'cnen', 'space', 'semicolon', 'enter'],
  ],
  '18': [
    ['q', 'we', 'rt', 'y', 'u', 'io', 'p'],
    ['a', 'sd', 'fg', 'h', 'jk', 'l'],
    ['word', 'z', 'xc', 'v', 'bn', 'm', 'backspace'],
    ['123', 'semicolon', 'space', 'cnen', 'enter'],
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

function pinyinGuideLetterCase() {
  return guideState().preferences.pinyin26LetterCase === 'upper' ? 'upper' : 'lower';
}

function applyPinyinGuideLetterCase(label = '') {
  const text = String(label);
  return pinyinGuideLetterCase() === 'upper' ? text.toUpperCase() : text.toLowerCase();
}

function pinyinVariantLettersLabel(key = '') {
  return /^[a-z]{1,3}$/.test(key) ? applyPinyinGuideLetterCase(key) : '';
}

const FUNCTION_KEY_LABELS = {
  '123': '数字切换键',
  cnen: '中英切换键',
  shift: 'Shift键',
  backspace: '退格键',
  space: '空格键',
  spaceRight: '空格右侧键',
  semicolon: '分号键',
  enter: '回车键',
  symbol: '符号键',
  word: '分词键',
  mnemonic: '助记键',
  reinput: '重输键',
  punctuationColumn: '标点列',
};
const KEYBOARD26_FUNCTION_KEY_ORDER = ['123', 'cnen', 'shift', 'backspace', 'symbol', 'space', 'spaceRight', 'semicolon', 'enter', 'word', 'mnemonic', 'reinput', 'punctuationColumn'];
const KEYBOARD26_SPECIAL_LAYOUT_KEYS = ['punctuationColumn'];
const DEFAULT_PINYIN9_PUNCTUATION_ITEMS = ['，', '。', '？', '！'];
const SWIPE_KEY_SHORT_LABELS = {
  space: '空格',
  spaceRight: '空格右',
  semicolon: '分号',
  backspace: '退格',
  enter: '回车',
  shift: 'Shift键',
  cnen: '中英',
  '123': '数字',
  return: '返回',
  word: '词',
  mnemonic: '助记',
  reinput: '重输',
};
const NUMERIC_KEY_LABELS = {
  collection: '符号集合',
  symbol: '符号切换键',
  return: '返回键',
  backspace: '退格键',
  period: '句号键',
  equal: '等号键',
  space: '空格键',
  enter: '回车键',
};
const NUMERIC_FUNCTION_KEY_ORDER = ['collection', 'symbol', 'return', 'backspace', 'period', 'equal', 'space', 'enter'];
const DEFAULT_NUMERIC_COLUMNS = [
  ['collection', 'symbol'],
  ['1', '4', '7', 'return'],
  ['2', '5', '8', '0'],
  ['3', '6', '9', 'space'],
  ['backspace', 'period', 'equal', 'enter'],
];
const DEFAULT_NUMERIC_SYMBOLS = ['+', '-', '×', '/', '()', '.', '@', ',', '#', ':', '_', '?', '￥'];
const SYMBOLIC_KEY_LABELS = {
  return: '返回键',
  pageUp: '上一页',
  pageDown: '下一页',
  lock: '锁定键',
  backspace: '退格键',
};
const SYMBOLIC_FUNCTION_KEY_ORDER = ['return', 'pageUp', 'pageDown', 'lock', 'backspace'];
const DEFAULT_SYMBOLIC_FUNCTION_ROWS = [['return', 'pageUp', 'pageDown', 'lock', 'backspace']];
const SYMBOLIC_SPECIAL_LAYOUT_GROUPS = [
  {
    id: 'categoryCollection',
    title: '左侧分类列表',
    path: 'keyboards.symbolic.layout.portrait.categoryRows',
    defaultRows: [['categoryCollection']],
    labels: {
      categoryCollection: '左侧分类区',
    },
  },
];
const EMOJI_SPECIAL_LAYOUT_GROUPS = [
  {
    id: 'emojiCollection',
    title: '左侧 Emoji 列表',
    path: 'keyboards.emoji.layout.portrait.collectionRows',
    defaultRows: [['emojiCollection']],
    labels: {
      emojiCollection: 'Emoji 列表',
    },
  },
];
const DEFAULT_TOOLBAR_BUTTONS = ['menu', 'symbol', 'translate', 'emoji', 'phrase', 'pasteboard', 'script', 'close'];
const DEFAULT_TOOLBAR_SYSTEM_IMAGES = {
  menu: 'gear',
  symbol: 'xmark.triangle.circle.square',
  translate: 'translate',
  emoji: 'face.smiling',
  phrase: 'list.bullet.clipboard',
  pasteboard: 'doc.on.clipboard',
  script: 'apple.terminal',
  close: 'keyboard.chevron.compact.down',
};
const DEFAULT_TOOLBAR_ACTIONS = {
  menu: { keyboardType: 'panel' },
  symbol: { keyboardType: 'symbolic' },
  translate: { runScript: 'translate' },
  emoji: { keyboardType: 'emojis' },
  phrase: { shortcut: '#showPhraseView' },
  pasteboard: { shortcut: '#showPasteboardView' },
  script: { runScript: 'script' },
  close: { action: 'dismissKeyboard' },
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
const LANDSCAPE_SECTION_LABELS = {
  left: '横屏左区',
  middle: '横屏中区',
  right: '横屏右区',
};
const SWIPE_PROFILE_LABELS = {
  pinyin: '中文 26 键',
  alphabetic: '英文 26 键',
  numeric: '数字键盘',
};
const SWIPE_DIRECTION_LABELS = {
  swipe_up: '上划',
  swipe_down: '下划',
};
const SWIPE_DEFAULT_CENTER_KEYS = {
  pinyin: {
    swipe_up: '上划文字偏移',
    swipe_down: '下划文字偏移',
  },
  alphabetic: {
    swipe_up: '上划文字偏移',
    swipe_down: '下划文字偏移',
  },
  numeric: {
    swipe_up: '数字键盘上划文字偏移',
    swipe_down: '数字键盘下划文字偏移',
  },
};
const HINT_GROUP_LABELS = {
  pinyin: '26 键',
  pinyin9: '中文九键',
  number: '数字键盘',
};
const INSET_EDGE_LABELS = {
  top: '上',
  right: '右',
  bottom: '下',
  left: '左',
};
const INSET_GROUP_LABELS = {
  keyboard26: '26 键',
  numeric: '数字键盘',
  symbolic: '符号键盘',
  panel: '自定义面板',
  toolbar: '工具栏',
  hint: '长按候选',
};
const SURFACE_GROUP_LABELS = {
  keyboard26: '26 键',
  numeric: '数字键盘',
  symbolic: '符号键盘',
  panel: '自定义面板',
  toolbar: '工具栏',
  hint: '长按候选',
};
const INSET_ITEM_LABELS = {
  normal: '普通键',
  functionKey: '功能键',
  menu: '菜单键',
  collection: '左侧符号区',
  collectionCell: '单个符号',
  categoryCollection: '左侧分类区',
  categoryCell: '单个分类',
  descriptionCollection: '右侧符号区',
  descriptionContent: '单个符号',
  frame: '面板外框',
  horizontalCandidates: '横向候选',
  verticalCandidatesStyle: '纵向候选整体',
  verticalCandidateFunction: '纵向候选功能键',
  symbols: '长按符号',
  selectedBackground: '选中背景',
  translate: '翻译',
  emoji: '表情',
  phrase: '短语',
  pasteboard: '剪贴板',
  script: '脚本',
  close: '关闭',
};
const SURFACE_ITEM_LABELS = {
  normal: '普通键',
  functionKey: '功能键',
  enterAccent: '蓝色回车键',
  categoryCollection: '左侧分类区',
  descriptionCollection: '右侧符号区',
  verticalCandidateFunction: '纵向候选功能键',
  bubble: '气泡背景',
  selectedBackground: '选中背景',
};
const KEYBOARD_METRIC_LABELS = {
  keyboard26: '26 键',
  numeric: '数字键盘',
  symbolic: '符号键盘',
  emoji: 'Emoji 键盘',
  panel: '自定义面板',
};
const KEYBOARD_FRAME_LABELS = {
  preeditHeight: '预编辑区',
  toolbarHeight: '工具栏区',
  keyboardHeight: '按键区',
};
const FIELD_LABELS = {
  name: '皮肤名称',
  author: '作者',
  version: '版本',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  file: '文件名',
  image: '图片名',
  source: '来源',
  animationType: '动画类型',
  scale: '缩放比例',
  pressDuration: '按下时长',
  releaseDuration: '松开时长',
  text: '文字',
  fontSize: '字号',
  colorKey: '颜色设置',
  systemImageName: '系统图标',
  actionType: '指令类型',
  actionValue: '指令内容',
  labelType: '标签类型',
  labelValue: '标签值',
  selectedIndex: '默认选中序号',
  width: '宽度',
  height: '高度',
  x: '横向 x',
  y: '纵向 y',
  top: '上',
  right: '右',
  bottom: '下',
  left: '左',
  default: '默认',
  search: '搜索',
  send: '发送',
  go: '前往',
  done: '完成',
  cornerRadius: '圆角',
  borderSize: '边框宽度',
  shadowRadius: '阴影模糊',
  shadowOpacity: '阴影强度',
  iconCenter: '图标偏移',
  categoryCellHeight: '左侧分类项高度',
  descriptionCellHeight: '右侧符号项高度',
};
const ACTION_TYPE_LABELS = {
  action: '功能键',
  character: '输入字符',
  symbol: '切换符号',
  shortcut: '通用指令',
  sendKeys: '发送按键',
  openURL: '打开链接',
  runScript: '执行脚本',
  keyboardType: '键盘切换',
  floatKeyboardType: '打开浮动键盘',
  switchRimeSchema: '切换 RIME 方案',
  combine: '组合动作',
  raw: '原始值',
};
const ACTION_TYPES = ['action', 'character', 'symbol', 'sendKeys', 'openURL', 'runScript', 'keyboardType', 'floatKeyboardType', 'shortcut', 'switchRimeSchema', 'combine'];
const TOOLBAR_ACTION_TYPES = ['action', 'keyboardType', 'floatKeyboardType', 'shortcut', 'runScript', 'switchRimeSchema', 'combine', 'openURL', 'sendKeys', 'character', 'symbol'];
const FUNCTION_KEY_ACTION_TYPES = ACTION_TYPES.filter((item) => !['character', 'symbol'].includes(item));
const KEY_EDITOR_MODES = [
  { value: 'character', label: '普通按键' },
  { value: 'function', label: '功能键' },
];
const DEFAULT_SCHEMA_NAME_TEXT = '$RimeSchemaName';
const STANDARD_ACTION_VALUES = [
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
];
const STANDARD_ACTION_OPTIONS = [
  { value: 'space', selectedLabel: 'space', dropdownLabel: 'space - 空格键' },
  { value: 'enter', selectedLabel: 'enter', dropdownLabel: 'enter - 回车键' },
  { value: 'tab', selectedLabel: 'tab', dropdownLabel: 'tab - Tab 键' },
  { value: 'shift', selectedLabel: 'shift', dropdownLabel: 'shift - Shift 键' },
  { value: 'backspace', selectedLabel: 'backspace', dropdownLabel: 'backspace - 删除键' },
  { value: 'dismissKeyboard', selectedLabel: 'dismissKeyboard', dropdownLabel: 'dismissKeyboard - 收起键盘' },
  { value: 'moveCursorBackward', selectedLabel: 'moveCursorBackward', dropdownLabel: 'moveCursorBackward - 光标左移' },
  { value: 'moveCursorForward', selectedLabel: 'moveCursorForward', dropdownLabel: 'moveCursorForward - 光标右移' },
  { value: 'returnPrimaryKeyboard', selectedLabel: 'returnPrimaryKeyboard', dropdownLabel: 'returnPrimaryKeyboard - 返回主键盘' },
  { value: 'returnLastKeyboard', selectedLabel: 'returnLastKeyboard', dropdownLabel: 'returnLastKeyboard - 返回上一个键盘' },
  { value: 'symbolicKeyboardLockStateToggle', selectedLabel: 'symbolicKeyboardLockStateToggle', dropdownLabel: 'symbolicKeyboardLockStateToggle - 符号键盘锁定切换' },
  { value: 'settings', selectedLabel: 'settings', dropdownLabel: 'settings - 打开主应用界面' },
  { value: 'nextKeyboard', selectedLabel: 'nextKeyboard', dropdownLabel: 'nextKeyboard - 切换到 iOS 下一个键盘' },
];
const KEYBOARD_TYPE_VALUES = ['pinyin', 'alphabetic', 'symbolic', 'numeric', 'emojis', 'panel'];
const SHORTCUT_VALUES = [
  '#简繁切换',
  '#中英切换',
  '#RimeSwitcher',
  '#次选上屏',
  '#三选上屏',
  '#方案切换',
  '#左手模式',
  '#右手模式',
  '#行首',
  '#行尾',
  '#换行',
  '#Enter',
  '#重输',
  '#subCollectionPageUp',
  '#subCollectionPageDown',
  '#verticalCandidatesPageDown',
  '#verticalCandidatesPageUp',
  '#showPhraseView',
  '#showPasteboardView',
  '#clearSystemPasteboard',
  '#toggleScriptView',
  '#candidatesBarStateToggle',
  '#rimePreviousPage',
  '#rimeNextPage',
  '#toggleEmbeddedInputMode',
  '#keyboardPerformance',
  '#keyboardMenu',
  '#selectText',
  '#copy',
  '#cut',
  '#paste',
  '#undo',
  '#redo',
];
const LEGACY_SHORTCUT_VALUE_MAP = {
  pasteboard: '#showPasteboardView',
  '#Pasteboard': '#showPasteboardView',
  phrase: '#showPhraseView',
  '#Phrase': '#showPhraseView',
};
const OPEN_URL_VALUES = ['#pasteboardContent', '#selectText', '#pasteboardContent#selectText'];
const TOOLBAR_ACTION_VALUE_SUGGESTIONS = {
  action: ['dismissKeyboard', 'returnLastKeyboard', 'returnPrimaryKeyboard', 'nextKeyboard', ...STANDARD_ACTION_VALUES],
  keyboardType: KEYBOARD_TYPE_VALUES,
  shortcut: SHORTCUT_VALUES,
};
const FREE_TEXT_ACTION_TYPES = new Set(['sendKeys', 'openURL', 'runScript', 'floatKeyboardType', 'switchRimeSchema']);
const TOOLBAR_ACTION_PRESETS = [
  { label: '打开工具栏面板', type: 'keyboardType', value: 'panel' },
  { label: '切到符号键盘', type: 'keyboardType', value: 'symbolic' },
  { label: '切到 Emoji 键盘', type: 'keyboardType', value: 'emojis' },
  { label: '打开短语面板', type: 'shortcut', value: '#showPhraseView' },
  { label: '打开剪贴板面板', type: 'shortcut', value: '#showPasteboardView' },
  { label: '执行脚本', type: 'runScript', value: 'translate' },
  { label: '运行脚本', type: 'runScript', value: 'script' },
  { label: '切换候选栏状态', type: 'shortcut', value: '#candidatesBarStateToggle' },
  { label: '收起键盘', type: 'action', value: 'dismissKeyboard' },
];
const DISPLAY_TYPE_OPTIONS = [
  { value: 'text', selectedLabel: 'text', dropdownLabel: 'text' },
  { value: 'systemImageName', selectedLabel: 'systemImageName', dropdownLabel: 'systemImageName' },
];
const SYSTEM_IMAGE_SUGGESTIONS = [...new Set([
  ...Object.values(DEFAULT_TOOLBAR_SYSTEM_IMAGES),
  ...PANEL_BUTTONS.map(([, icon]) => icon),
  'capslock.fill',
  'chevron.down',
  'chevron.up',
  'delete.left',
  'globe',
  'lock',
  'lock.open',
  'shift',
  'shift.fill',
])];
const MAX_UNDO_STEPS = 30;

const KEYBOARD_COMBO_SOURCE_OPTIONS = [
  { value: 'custom', label: '自定义键盘' },
  { value: 'system', label: '输入法内置' },
  { value: 'disabled', label: '禁用' },
];
const KEYBOARD_COMBO_SOURCE_OPTIONS_BY_SLOT = {
  pinyin: KEYBOARD_COMBO_SOURCE_OPTIONS.filter((item) => item.value === 'custom'),
  alphabetic: KEYBOARD_COMBO_SOURCE_OPTIONS.filter((item) => item.value !== 'system'),
  numeric: KEYBOARD_COMBO_SOURCE_OPTIONS.filter((item) => item.value !== 'system'),
  symbolic: KEYBOARD_COMBO_SOURCE_OPTIONS,
  emoji: KEYBOARD_COMBO_SOURCE_OPTIONS,
  panel: KEYBOARD_COMBO_SOURCE_OPTIONS.filter((item) => item.value !== 'system'),
};
const KEYBOARD_COMBO_VARIANTS = {
  pinyin: ['9', '14', '17', '18', '26'],
  alphabetic: ['26'],
  numeric: ['9', 'ios'],
  symbolic: ['custom', 'system'],
  emoji: ['custom', 'system'],
  panel: ['panel', 'disabled'],
};
const KEYBOARD_COMBO_SLOT_LABELS = {
  pinyin: '中文键盘',
  alphabetic: '英文键盘',
  numeric: '数字键盘',
  symbolic: '符号键盘',
  emoji: 'Emoji 键盘',
  panel: '自定义面板',
};
const KEYBOARD_COMBO_VARIANT_LABELS = {
  '9': '9键',
  '14': '14键',
  '17': '17键',
  '18': '18键',
  '26': '26键',
  ios: '苹果数字键盘',
  custom: '自定义',
  system: '系统内置',
  panel: '示例面板',
  disabled: '禁用',
};
const SWIPE_BEHAVIOR_OPTIONS = [
  { value: 'disabled', label: '无上下划动功能' },
  { value: 'hidden', label: '有划动功能但不显示' },
  { value: 'visible', label: '有划动功能并显示在按键上' },
];
const TOOLBAR_DISPLAY_STYLE_OPTIONS = [
  { value: 'icon', label: '苹果图标' },
  { value: 'text', label: '纯文字按键名' },
];

const DEFAULT_ACTION_VALUE_BY_TYPE = {
  action: 'space',
  keyboardType: 'pinyin',
  shortcut: '#showPhraseView',
  openURL: '#pasteboardContent',
  sendKeys: 'Control+l',
  runScript: 'script',
  floatKeyboardType: 'panel',
  switchRimeSchema: 'schema',
};

const DEFAULT_KEYBOARD26_FUNCTION_ACTIONS = {
  '123': { type: 'keyboardType', value: 'numeric' },
  cnen: { type: 'shortcut', value: '#中英切换' },
  shift: { type: 'action', value: 'shift' },
  backspace: { type: 'action', value: 'backspace' },
  symbol: { type: 'keyboardType', value: 'symbolic' },
  space: { type: 'action', value: 'space' },
  spaceRight: { type: 'character', value: '，' },
  semicolon: { type: 'shortcut', value: '#次选上屏' },
  enter: { type: 'action', value: 'enter' },
  word: { type: 'shortcut', value: '#splitText' },
  mnemonic: { type: 'shortcut', value: '#mnemonic' },
  reinput: { type: 'shortcut', value: '#reinput' },
};
const GUIDE_KEYBOARD_PRESET_OPTIONS = KEYBOARD_SKIN_PRESETS.map((preset) => ({
  value: preset.value,
  label: preset.label,
}));
const GUIDE_ENGLISH_LAYOUT_OPTIONS = [
  { value: 'standard', label: '美式26键' },
];
const GUIDE_PINYIN26_LETTER_CASE_OPTIONS = [
  { value: 'lower', label: '小写 qwerty' },
  { value: 'upper', label: '大写 QWERTY' },
];
const GUIDE_ALPHABETIC26_LETTER_CASE_OPTIONS = [
  { value: 'lower', label: '小写 qwerty' },
  { value: 'upper', label: '大写 QWERTY' },
];
const GUIDE_SYMBOL_LAYOUT_OPTIONS = [
  { value: 'system', label: 'App内符号键盘' },
  { value: 'custom', label: '自定义符号键盘' },
];
const GUIDE_EMOJI_LAYOUT_OPTIONS = [
  { value: 'custom', label: '自定义 Emoji 键盘' },
  { value: 'system', label: 'App内emoji键盘' },
];
const GUIDE_BOOLEAN_OPTIONS = [
  { value: 'true', label: '需要' },
  { value: 'false', label: '不需要' },
];
const GUIDE_VISIBILITY_OPTIONS = [
  { value: 'true', label: '显示' },
  { value: 'false', label: '不显示' },
];
const GUIDE_SWIPE_PROFILE_CONFIGS = [
  { key: 'pinyin', title: '中文划动', prefix: 'pinyinSwipe' },
  { key: 'alphabetic', title: '英文划动', prefix: 'alphabeticSwipe' },
];
const GUIDE_SPACEBAR_KEY_OPTIONS = [
  { value: '123', label: '123' },
  { value: 'symbol', label: '符号' },
  { value: 'semicolon', label: '分号' },
  { value: 'cnen', label: '中英' },
  { value: 'space', label: '空格' },
  { value: 'spaceRight', label: '逗号' },
  { value: 'enter', label: '回车' },
];
const GUIDE_SPACEBAR_ALLOWED_KEYS = new Set(GUIDE_SPACEBAR_KEY_OPTIONS.map((item) => item.value));
const GUIDE_DEFAULT_SPACEBAR_ROW = ['123', 'cnen', 'space', 'spaceRight', 'enter'];
const DEMO_SYSTEM_IMAGE_LABELS = {
  shift: '⇧',
  backspace: '⌫',
  pageUp: '⌃',
  pageDown: '⌄',
  lock: '🔒',
  menu: '☰',
  symbol: '⌘#',
  translate: '译',
  emoji: '☺',
  phrase: '▤',
  pasteboard: '📋',
  script: '⌘',
  close: '⌄',
  return: '返回',
};

function toolbarActionPresetId(type, value) {
  return `${type}::${value}`;
}

const el = {
  workspace: document.getElementById('workspace'),
  sidebar: document.querySelector('.sidebar'),
  moduleList: document.getElementById('moduleList'),
  sidebarToggleButton: document.getElementById('sidebarToggleButton'),
  moduleKicker: document.getElementById('moduleKicker'),
  moduleTitle: document.getElementById('moduleTitle'),
  moduleDescription: document.getElementById('moduleDescription'),
  editorRoot: document.getElementById('editorRoot'),
  previewRoot: document.getElementById('previewRoot'),
  previewMode: document.getElementById('previewMode'),
  previewModeButton: document.getElementById('previewModeButton'),
  previewModeMenu: document.getElementById('previewModeMenu'),
  previewKeyboardNameInput: document.getElementById('previewKeyboardNameInput'),
  addPreviewKeyboardButton: document.getElementById('addPreviewKeyboardButton'),
  deletePreviewKeyboardButton: document.getElementById('deletePreviewKeyboardButton'),
  resetPreviewKeyboardListButton: document.getElementById('resetPreviewKeyboardListButton'),
  expandPreviewButton: document.getElementById('expandPreviewButton'),
  themeToggleButton: document.getElementById('themeToggleButton'),
  projectSummary: document.getElementById('projectSummary'),
  visitorStats: document.getElementById('visitorStats'),
  saveState: document.getElementById('saveState'),
  undoButton: document.getElementById('undoButton'),
  saveTemplateButton: document.getElementById('saveTemplateButton'),
  templateLibraryButton: document.getElementById('templateLibraryButton'),
  exportProjectButton: document.getElementById('exportProjectButton'),
  importProjectButton: document.getElementById('importProjectButton'),
  importProjectInput: document.getElementById('importProjectInput'),
  resetModuleButton: document.getElementById('resetModuleButton'),
  jsonModeButton: document.getElementById('jsonModeButton'),
};

function activeModule() {
  return MODULES.find((module) => module.id === state.moduleId) || MODULES[0];
}

function currentValue() {
  return getPath(state.project, activeModule().path);
}

function moduleResetPaths(module) {
  if (module.id === 'meta') return ['meta', 'config'];
  if (module.id === 'keyboardCombo') return ['guide', 'keyboardCombo', 'config', 'toolbar'];
  if (module.id === 'customKeyboards') {
    return [
      'keyboards',
      'data.collections.emojiDataSource',
      'toolbar.layout',
      'toolbar.display',
      'toolbar.text',
      'toolbar.actions',
      'keyboardCombo.toolbar',
    ];
  }
  if (module.id === 'candidateStyles') {
    return [
      'toolbar.horizontalCandidates',
      'toolbar.verticalCandidates',
      'theme.light.colors.选中候选背景颜色',
      'theme.light.colors.候选字体选中字体颜色',
      'theme.light.colors.候选字体未选中字体颜色',
      'theme.dark.colors.选中候选背景颜色',
      'theme.dark.colors.候选字体选中字体颜色',
      'theme.dark.colors.候选字体未选中字体颜色',
      'theme.shared.fontSize.未展开候选字体选中字体大小',
      'theme.shared.fontSize.展开候选字体选中字体大小',
      'theme.shared.fontSize.未展开comment字体大小',
      'theme.shared.fontSize.展开comment字体大小',
    ];
  }
  return [module.path];
}

function moduleResetSource() {
  const source = deepClone(state.sampleProject || state.original || {});
  if (source && typeof source === 'object') ensureProjectGuide(source, 'pending');
  return source;
}

function resetProjectPathFromSource(target, source, path) {
  const sourceValue = getPath(source, path);
  if (sourceValue === undefined) return;
  setPath(target, path, deepClone(sourceValue));
}

const PREVIEW_FIELD_SCOPE = {
  colors: {
    base: ['键盘背景颜色'],
    keyboardCommon: [
      '字母键背景颜色-普通',
      '字母键背景颜色-高亮',
      '功能键背景颜色-普通',
      '功能键背景颜色-高亮',
      '底边缘颜色-普通',
      '底边缘颜色-高亮',
      '按键前景颜色',
    ],
    keyboard26: [
      'enter键背景(蓝色)',
      '划动字符颜色',
      '方案名颜色',
      '按键边缘颜色',
      '气泡背景颜色',
      '气泡边缘颜色',
      '气泡高亮颜色',
      '长按选中字体颜色',
      '长按非选中字体颜色',
      '长按选中背景颜色',
      '长按背景阴影颜色',
      '长按背景颜色',
      '按下气泡文字颜色',
    ],
    numeric: [],
    symbolic: [
      '列表选中字体颜色',
      '列表未选中字体颜色',
      '符号键盘左侧collection背景颜色',
      '符号键盘左侧collection背景下边缘颜色',
      '符号键盘右侧collection背景颜色',
      '符号键盘右侧collection背景下边缘颜色',
    ],
    panel: [],
    toolbar: ['toolbar按键颜色'],
    candidates: ['候选字体选中字体颜色', '候选字体未选中字体颜色', '选中候选背景颜色', 'toolbar按键颜色'],
    expanded: [
      '候选字体选中字体颜色',
      '候选字体未选中字体颜色',
      '选中候选背景颜色',
      '功能键背景颜色-普通',
      '功能键背景颜色-高亮',
      '底边缘颜色-普通',
      '按键前景颜色',
    ],
  },
  fontSize: {
    keyboard26: [
      '按键前景文字大小',
      '功能键前景文字大小',
      '方案名字号',
      '按键前景sf符号大小',
      '上划文字大小',
      '下划文字大小',
      '划动气泡前景文字大小',
      '长按气泡文字大小',
      '长按气泡sf符号大小',
    ],
    numeric: ['数字键盘数字前景字体大小', '按键前景sf符号大小', '长按气泡文字大小', '长按气泡sf符号大小'],
    symbolic: ['按键前景文字大小', '按键前景sf符号大小', '符号键盘左侧collection前景字体大小', '符号键盘右侧collection前景字体大小', '长按气泡文字大小', '长按气泡sf符号大小'],
    panel: ['panel按键前景文字大小', 'panel按键前景sf符号大小'],
    toolbar: ['toolbar按键前景sf符号大小', 'toolbar按键前景文字大小'],
    candidates: ['未展开候选字体选中字体大小', '未展开comment字体大小', 'toolbar按键前景sf符号大小'],
    expanded: ['展开候选字体选中字体大小', '展开comment字体大小'],
  },
  center: {
    keyboard26: ['26键中文前景偏移', '功能键前景文字偏移', '上划文字偏移', '下划文字偏移'],
    numeric: ['数字键盘数字前景偏移', '功能键前景文字偏移'],
    symbolic: ['功能键前景文字偏移'],
    panel: ['panel键盘按键文字前景偏移', 'panel键盘按键sf符号前景偏移'],
    toolbar: ['toolbar按键偏移'],
    candidates: ['toolbar按键偏移'],
    expanded: [],
  },
  scale: {
    keyboard26: ['26键中文前景缩放', '26键英文小写前景缩放'],
    numeric: ['数字键盘前景缩放'],
    symbolic: [],
    panel: [],
    toolbar: [],
    candidates: [],
    expanded: [],
  },
};

const CENTER_CATEGORY_LABELS = {
  keyForeground: '按键前景',
  swipe: '滑动标记',
  hint: '长按气泡',
  toolbar: '工具栏 / 候选栏',
  panel: '自定义面板',
  special: '当前键盘单独项',
};

const CENTER_FIELD_DEFINITIONS = {
  '26键中文前景偏移': { category: 'keyForeground', modes: ['keyboard26'] },
  '26键英文小写前景偏移': { category: 'keyForeground', modes: ['keyboard26'] },
  '功能键前景文字偏移': { category: 'keyForeground', modes: ['keyboard26', 'numeric', 'symbolic'] },
  '数字键盘数字前景偏移': { category: 'keyForeground', modes: ['numeric'] },
  '上划文字偏移': { category: 'swipe', modes: ['keyboard26'] },
  '下划文字偏移': { category: 'swipe', modes: ['keyboard26'] },
  '上划sf符号偏移': { category: 'swipe', modes: ['keyboard26'] },
  '下划sf符号偏移': { category: 'swipe', modes: ['keyboard26'] },
  '数字键盘上划文字偏移': { category: 'swipe', modes: ['numeric'] },
  '数字键盘下划文字偏移': { category: 'swipe', modes: ['numeric'] },
  '数字键盘上划sf符号偏移': { category: 'swipe', modes: ['numeric'] },
  '数字键盘下划sf符号偏移': { category: 'swipe', modes: ['numeric'] },
  '长按气泡文字偏移': { category: 'hint', modes: ['keyboard26', 'numeric', 'symbolic'] },
  '长按气泡sf符号偏移': { category: 'hint', modes: ['keyboard26', 'numeric', 'symbolic'] },
  '划动气泡文字偏移': { category: 'hint', modes: ['keyboard26', 'numeric', 'symbolic'] },
  '划动气泡sf符号偏移': { category: 'hint', modes: ['keyboard26', 'numeric', 'symbolic'] },
  '按下气泡文字偏移': { category: 'hint', modes: ['keyboard26', 'numeric', 'symbolic'] },
  'toolbar按键偏移': { category: 'toolbar', states: ['toolbar', 'candidates', 'expanded'] },
  'panel键盘按键文字前景偏移': { category: 'panel', modes: ['panel'] },
  'panel键盘按键sf符号前景偏移': { category: 'panel', modes: ['panel'] },
};

const SWIPE_DIRECTION_CENTER_KEYS = new Set([
  '上划文字偏移',
  '上划sf符号偏移',
  '下划文字偏移',
  '下划sf符号偏移',
  '数字键盘上划文字偏移',
  '数字键盘上划sf符号偏移',
  '数字键盘下划文字偏移',
  '数字键盘下划sf符号偏移',
]);
const SWIPE_GLOBAL_CENTER_KEYS = new Set([
  '划动气泡文字偏移',
  '划动气泡sf符号偏移',
  '按下气泡文字偏移',
]);
const SWIPE_GLOBAL_STYLE_KEYS = new Set([
  '划动字符颜色',
  '划动气泡前景文字大小',
]);
const SWIPE_DIRECTION_STYLE_KEYS = new Set([
  '上划文字大小',
  '下划文字大小',
]);
const TOOLBAR_CENTER_KEYS = new Set(['toolbar按键偏移']);
const TOOLBAR_STYLE_KEYS = new Set(['toolbar按键颜色', 'toolbar按键前景sf符号大小', 'toolbar按键前景文字大小']);

const CENTER_TARGET_GROUP_LABELS = {
  keyboard26: '26 键',
  toolbar: '工具栏',
};

function guideToggleState(project = state.project) {
  const guide = guideState(project);
  const swipeMode = project?.keyboardCombo?.swipeBehavior?.mode;
  const swipesOn = project?.data?.swipesEnabled !== false && swipeMode !== 'disabled';
  const swipeMarksVisible = swipesOn && swipeMode !== 'hidden';
  const toolbarOn = guide.preferences.defaultToolbarEnabled !== false && project?.keyboardCombo?.toolbar?.enabled !== false;
  const pinyinSwipeOn = guide.preferences.pinyinSwipeUpEnabled === true || guide.preferences.pinyinSwipeDownEnabled === true;
  const alphabeticSwipeOn = guide.preferences.alphabeticSwipeUpEnabled === true || guide.preferences.alphabeticSwipeDownEnabled === true;
  return {
    toolbarEnabled: toolbarOn,
    swipeUpEnabled: swipesOn && (guide.preferences.pinyinSwipeUpEnabled === true || guide.preferences.alphabeticSwipeUpEnabled === true),
    swipeDownEnabled: swipesOn && (guide.preferences.pinyinSwipeDownEnabled === true || guide.preferences.alphabeticSwipeDownEnabled === true),
    swipeUpVisible: swipeMarksVisible && (
      (guide.preferences.pinyinSwipeUpEnabled === true && guide.preferences.pinyinSwipeUpVisible !== false)
      || (guide.preferences.alphabeticSwipeUpEnabled === true && guide.preferences.alphabeticSwipeUpVisible !== false)
    ),
    swipeDownVisible: swipeMarksVisible && (
      (guide.preferences.pinyinSwipeDownEnabled === true && guide.preferences.pinyinSwipeDownVisible !== false)
      || (guide.preferences.alphabeticSwipeDownEnabled === true && guide.preferences.alphabeticSwipeDownVisible !== false)
    ),
    pinyinSwipeEnabled: pinyinSwipeOn,
    alphabeticSwipeEnabled: alphabeticSwipeOn,
  };
}

function fieldVisibleByFeature(scopeName, key, project = state.project) {
  const toggles = guideToggleState(project);
  const swipeEnabled = toggles.swipeUpEnabled || toggles.swipeDownEnabled;
  if (scopeName === 'center') {
    if (TOOLBAR_CENTER_KEYS.has(key)) return toggles.toolbarEnabled;
    if (SWIPE_DIRECTION_CENTER_KEYS.has(key)) return key.includes('上划') ? toggles.swipeUpVisible : toggles.swipeDownVisible;
    if (SWIPE_GLOBAL_CENTER_KEYS.has(key)) return swipeEnabled;
  }
  if (['colors', 'fontSize'].includes(scopeName)) {
    if (TOOLBAR_STYLE_KEYS.has(key)) return toggles.toolbarEnabled;
    if (SWIPE_DIRECTION_STYLE_KEYS.has(key)) return key.includes('上划') ? toggles.swipeUpVisible : toggles.swipeDownVisible;
    if (SWIPE_GLOBAL_STYLE_KEYS.has(key)) return swipeEnabled;
  }
  return true;
}

function groupVisibleByFeature(group, project = state.project) {
  const toggles = guideToggleState(project);
  if (group === 'toolbar') return toggles.toolbarEnabled;
  return true;
}

const PREVIEW_INSET_SCOPE = {
  keyboard26: ['keyboard26', 'hint'],
  numeric: ['numeric'],
  symbolic: ['symbolic'],
  panel: ['panel'],
  toolbar: [],
  candidates: [],
  expanded: [],
};

const PREVIEW_SURFACE_SCOPE = {
  keyboard26: ['keyboard26', 'hint'],
  numeric: ['numeric'],
  symbolic: ['symbolic'],
  panel: ['panel'],
  toolbar: ['toolbar'],
  candidates: ['toolbar'],
  expanded: ['toolbar'],
};

const PREVIEW_INSET_ITEM_SCOPE = {
};

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function currentPreviewScope() {
  const mode = previewRenderMode(state.previewMode);
  const candidateState = state.candidateState || 'toolbar';
  const orientation = previewRenderOrientation(state.previewMode);
  const source = previewSourceName(state.previewMode);
  const pinyinVariant = source.startsWith('pinyin_')
    ? source.split('_')[1]
    : source.startsWith('alphabetic_')
      ? '26'
    : null;
  return {
    mode,
    source,
    pinyinVariant,
    candidateState,
    orientation,
    keyboardVisible: candidateState !== 'expanded',
  };
}

function previewScopeLabel(scope = currentPreviewScope()) {
  const modeLabel = {
    keyboard26: '26 键',
    numeric: '数字键盘',
    symbolic: '符号键盘',
    emoji: 'Emoji 键盘',
    panel: '面板',
  }[scope.mode] || '当前键盘';
  const variantLabel = scope.mode === 'keyboard26' && scope.pinyinVariant && ['9', '14', '17', '18', '26'].includes(scope.pinyinVariant)
    ? `中文${scope.pinyinVariant}键`
    : modeLabel;
  const stateLabel = {
    toolbar: '工具栏',
    candidates: '候选栏',
    expanded: '展开候选',
  }[scope.candidateState] || '当前界面';
  const orientationLabel = scope.orientation === 'landscape' ? '横屏' : '竖屏';
  return `${variantLabel} / ${stateLabel} / ${orientationLabel}`;
}

function scopeKeys(scopeName) {
  const scope = currentPreviewScope();
  const map = PREVIEW_FIELD_SCOPE[scopeName] || {};
  const keys = [...(map.base || [])];
  if (scope.keyboardVisible) {
    keys.push(...(map.keyboardCommon || []), ...(map[scope.mode] || []));
  }
  keys.push(...(map[scope.candidateState] || []));
  return uniqueValues(keys).filter((key) => fieldVisibleByFeature(scopeName, key));
}

function filterEntriesByScope(value, scopeName) {
  const allowed = scopeKeys(scopeName);
  const entries = Object.entries(value || {});
  if (!allowed.length) return [];
  return entries.filter(([key]) => allowed.includes(key));
}

function renderPreviewScopeNote() {
  return `<p class="scope-note">当前预览：${escapeHtml(previewScopeLabel())}</p>`;
}

function renderPreviewScopeHeader(title = '当前可编辑内容', description = '由右侧键盘预览自动匹配，需要编辑其他键盘时请切换右侧预览。', actions = '', options = {}) {
  const { showScopeBadge = true, scopeBadgeHtml = '' } = options;
  return `
    <div class="preview-scoped-header">
      <div class="preview-scoped-copy">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(description)}</p>
        </div>
        ${actions ? `<div class="preview-scoped-actions">${actions}</div>` : ''}
      </div>
      ${showScopeBadge ? (scopeBadgeHtml || `<span>${escapeHtml(previewScopeLabel())}</span>`) : ''}
    </div>
  `;
}

function renderScopedEmptyNote() {
  return '<p class="empty-note">当前预览界面没有匹配的可调项目。</p>';
}

function isPreviewScopedModule() {
  return ['colors', 'fontSize', 'center', 'scale', 'keyboardFrame', 'buttonInsets', 'customKeyboards', 'metrics', 'swipes', 'hints', 'collections', 'candidateStyles'].includes(activeModule().id);
}

function scopedInsetItems(group, items, scope = currentPreviewScope()) {
  const allowedItems = PREVIEW_INSET_ITEM_SCOPE[group]?.[scope.candidateState];
  if (!allowedItems) return items;
  return Object.fromEntries(Object.entries(items || {}).filter(([key]) => ['mode', 'custom', ...allowedItems].includes(key)));
}

function updateCurrentValue(value) {
  pushUndoSnapshot();
  setPath(state.project, activeModule().path, value);
  markDirty();
  renderAll();
}

function markDirty() {
  state.savedAt = null;
}

function formatLocalDateTime(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function defaultSkinName(index = 1) {
  return `${DEFAULT_SKIN_NAME_PREFIX}${Math.max(1, Number(index) || 1)}`;
}

function defaultSkinIndex(name) {
  const match = String(name || '').trim().match(/^皮肤(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function nextDefaultSkinIndex(records = []) {
  return records.reduce((max, record) => Math.max(max, defaultSkinIndex(record?.name)), 0) + 1;
}

function applyDefaultSkinMeta(project, index = 1, now = formatLocalDateTime()) {
  const next = deepClone(project);
  next.meta = next.meta || {};
  next.config = next.config || {};
  next.meta.name = defaultSkinName(index);
  next.meta.author = DEFAULT_SKIN_AUTHOR;
  next.meta.createdAt = now;
  next.meta.updatedAt = now;
  next.config.name = next.meta.name;
  next.config.author = next.meta.author;
  return next;
}

function stampProjectForGeneration(project, now = formatLocalDateTime()) {
  const next = deepClone(project);
  next.meta = next.meta || {};
  next.config = next.config || {};
  if (!String(next.meta.name || '').trim() || next.meta.name === '示例模板1') {
    next.meta.name = defaultSkinName(1);
  }
  if (!String(next.meta.author || '').trim() || ['浮生', '无名'].includes(next.meta.author)) {
    next.meta.author = DEFAULT_SKIN_AUTHOR;
  }
  next.meta.createdAt = now;
  next.meta.updatedAt = now;
  next.config.name = next.meta.name;
  next.config.author = next.meta.author;
  return next;
}

function nextGeneratedProject(project, now = formatLocalDateTime()) {
  const currentIndex = defaultSkinIndex(project?.meta?.name);
  const nextIndex = currentIndex ? currentIndex + 1 : 1;
  return applyDefaultSkinMeta(project, nextIndex, now);
}

function normalizedWorkbenchProject(project, sampleProject, fallbackStatus = 'pending') {
  const merged = mergeDefaultCollections(mergeDefaultSwipes(project, sampleProject), sampleProject);
  normalizeToolbarActionValues(merged);
  migrateLegacyDefaultVisualPreset(merged);
  syncDefaultGeneratedPresetData(
    merged,
    merged?.guide?.preferences?.keyboardPreset || project?.guide?.preferences?.keyboardPreset || DEFAULT_KEYBOARD_SKIN_PRESET,
  );
  syncGuideAndComboFromConfig(merged, { preserveGuideStatus: true });
  ensureProjectGuide(merged, fallbackStatus);
  return merged;
}

function normalizeToolbarActionValues(project) {
  const actions = project?.toolbar?.actions;
  if (!actions || typeof actions !== 'object') return;
  for (const [key, action] of Object.entries(actions)) {
    const fields = actionToFields(action);
    const normalizedValue = normalizeActionFieldValue(fields.type, fields.value);
    const normalizedType = displayActionTypeKey(fields.type);
    const fallback = DEFAULT_TOOLBAR_ACTIONS[key];
    const fallbackFields = fallback ? actionToFields(fallback) : { type: normalizedType, value: normalizedValue };
    const finalType = normalizedType || fallbackFields.type;
    const finalValue = normalizedValue || fallbackFields.value;
    actions[key] = {
      ...buildToolbarAction(finalType, finalValue),
      actionType: finalType,
      actionValue: finalValue,
    };
  }
  for (const [key, action] of Object.entries(DEFAULT_TOOLBAR_ACTIONS)) {
    if (actions[key] !== undefined) continue;
    const fields = actionToFields(action);
    actions[key] = {
      ...buildToolbarAction(fields.type, fields.value),
      actionType: fields.type,
      actionValue: fields.value,
    };
  }
}

function resetGuideGenerationForFreshBoot(project, sourceProject = project) {
  if (!project || typeof project !== 'object') return;
  const preferences = {
    ...(sourceProject?.guide?.preferences || project.guide?.preferences || {}),
    keyboardPreset: DEFAULT_KEYBOARD_SKIN_PRESET,
    chineseLayout: '26',
    pinyin26LetterCase: 'lower',
    alphabetic26LetterCase: 'lower',
    symbolLayout: 'system',
    emojiLayout: 'system',
  };
  project.guide = normalizedGuide({
    preferences,
    status: 'pending',
    generatedPlan: null,
  }, 'pending');
}

function isLegacyDefaultSkinMeta(project) {
  return project?.meta?.name === '示例模板1' && project?.meta?.author === '浮生';
}

function isDefaultGeneratedSkin(project) {
  const name = String(project?.meta?.name || '').trim();
  const author = String(project?.meta?.author || '').trim();
  return /^皮肤\d+$/.test(name) && author === DEFAULT_SKIN_AUTHOR;
}

function migrateLegacyDefaultVisualPreset(project) {
  if (!project || typeof project !== 'object') return project;
  const presetValue = project?.guide?.preferences?.keyboardPreset;
  const shouldApply = (
    isLegacyDefaultSkinMeta(project)
    || isDefaultGeneratedSkin(project)
  ) && !presetValue;
  if (!shouldApply) {
    if (isDefaultGeneratedSkin(project) && project.keyboardCombo?.spaceRow && state.sampleProject?.keyboardCombo?.spaceRow) {
      project.keyboardCombo.spaceRow.showSchemaNameOnSpace = state.sampleProject.keyboardCombo.spaceRow.showSchemaNameOnSpace;
    }
    return project;
  }
  const preset = applyKeyboardSkinPreset(project, DEFAULT_KEYBOARD_SKIN_PRESET);
  applyKeyboardPresetPreferences(project, preset);
  if (project.keyboardCombo?.spaceRow && state.sampleProject?.keyboardCombo?.spaceRow) {
    project.keyboardCombo.spaceRow.showSchemaNameOnSpace = state.sampleProject.keyboardCombo.spaceRow.showSchemaNameOnSpace;
  }
  return project;
}

function projectSignature(project) {
  try {
    return JSON.stringify(project);
  } catch {
    return '';
  }
}

function pushUndoSnapshot() {
  if (state.isRestoringHistory || !state.project) return;
  const signature = projectSignature(state.project);
  if (signature && signature === state.lastUndoSignature) return;
  state.undoStack.push({
    project: deepClone(state.project),
    original: deepClone(state.original),
  });
  state.lastUndoSignature = signature;
  if (state.undoStack.length > MAX_UNDO_STEPS) state.undoStack.shift();
  renderUndoState();
}

function renderUndoState() {
  if (!el.undoButton) return;
  const canUndo = state.undoStack.length > 0;
  el.undoButton.disabled = !canUndo;
  el.undoButton.title = canUndo ? '撤销上一步修改' : '暂无可撤销操作';
}

function undoLastChange() {
  const previous = state.undoStack.pop();
  if (!previous) return;
  const previousProject = previous.project || previous;
  state.isRestoringHistory = true;
  state.project = state.sampleProject
    ? normalizedWorkbenchProject(previousProject, state.sampleProject, previousProject?.guide?.status || 'ready')
    : previousProject;
  state.original = previous.original ? deepClone(previous.original) : deepClone(state.project);
  state.savedAt = null;
  state.editingKey = null;
  state.isRestoringHistory = false;
  state.lastUndoSignature = state.undoStack.length
    ? projectSignature(state.undoStack[state.undoStack.length - 1].project || state.undoStack[state.undoStack.length - 1])
    : '';
  if (!previewModeExists(state.previewMode)) {
    state.previewMode = defaultPreviewMode();
  }
  renderAll();
}

function displayFieldLabel(key) {
  return FIELD_LABELS[key] || KEYBOARD_FRAME_LABELS[key] || INSET_EDGE_LABELS[key] || key;
}

function displayActionTypeKey(type) {
  if (type === 'standard') return 'action';
  if (type === 'shortcutCommand') return 'shortcut';
  if (type === 'runTranslateScript') return 'runScript';
  return type || 'shortcut';
}

function displayActionType(type) {
  return ACTION_TYPE_LABELS[displayActionTypeKey(type)] || displayActionTypeKey(type);
}

function displayActionTypeWithCode(type) {
  const displayType = displayActionTypeKey(type);
  return `${displayActionType(displayType)}（${displayType}）`;
}

function actionTypeOption(type) {
  const label = displayActionType(type);
  const displayType = displayActionTypeKey(type);
  return {
    value: type,
    selectedLabel: label,
    dropdownLabel: displayActionTypeWithCode(displayType),
  };
}

function keyCodeLabel(key) {
  return FUNCTION_KEY_LABELS[key] || NUMERIC_KEY_LABELS[key] || SYMBOLIC_KEY_LABELS[key] || key;
}

function keyboard26PreviewProfile() {
  const source = previewSourceName(state.previewMode);
  if (source.startsWith('alphabetic')) return 'alphabetic';
  return 'pinyin';
}

function isChineseEnglishToggleAction(action) {
  const fields = actionToFields(action);
  if (fields.type === 'shortcut' && fields.value === '#中英切换') return true;
  if (fields.type !== 'combine' || !Array.isArray(fields.value)) return false;
  let hasChineseEnglishShortcut = false;
  let hasAlphabeticSwitch = false;
  for (const item of fields.value) {
    const child = actionToFields(item);
    if (child.type === 'shortcut' && child.value === '#中英切换') hasChineseEnglishShortcut = true;
    if (child.type === 'keyboardType' && child.value === 'alphabetic') hasAlphabeticSwitch = true;
  }
  return hasChineseEnglishShortcut || hasAlphabeticSwitch;
}

function colorSwatchValue(value) {
  const text = String(value || '').trim();
  return /^#[0-9a-fA-F]{3,4}$|^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{8}$/.test(text) ? text : 'transparent';
}

function syncColorSwatchForInput(inputElement) {
  if (inputElement?.dataset?.type !== 'color') return;
  const swatch = inputElement.closest('.color-field')?.querySelector('.color-swatch');
  if (!swatch) return;
  swatch.style.setProperty('--swatch-color', colorSwatchValue(inputElement.value));
}

function input(attrs = {}) {
  const {
    path,
    value,
    type = 'text',
    label,
    min,
    max,
    step,
    placeholder = '',
    suggestions = [],
    className = '',
  } = attrs;
  const id = `field-${Math.random().toString(36).slice(2)}`;
  const listId = suggestions.length ? `${id}-list` : '';
  const displayValue = value ?? '';
  const extra = [
    `data-path="${escapeHtml(path)}"`,
    `data-type="${escapeHtml(type)}"`,
    listId ? `list="${listId}"` : '',
    listId ? 'autocomplete="off"' : '',
    listId ? 'autocorrect="off"' : '',
    listId ? 'autocapitalize="off"' : '',
    listId ? 'spellcheck="false"' : '',
    min !== undefined ? `min="${min}"` : '',
    max !== undefined ? `max="${max}"` : '',
    step !== undefined ? `step="${step}"` : '',
    placeholder ? `placeholder="${escapeHtml(placeholder)}"` : '',
  ].filter(Boolean).join(' ');
  const dataList = listId
    ? `<datalist id="${listId}">${suggestions.map((item) => `<option value="${escapeHtml(item.value || item)}">${escapeHtml(item.label || item.value || item)}</option>`).join('')}</datalist>`
    : '';

  if (type === 'color') {
    const swatchColor = colorSwatchValue(displayValue);
    return `
      <div class="field-card${className ? ` ${escapeHtml(className)}` : ''}">
        <label for="${id}">${escapeHtml(label)}</label>
        <div class="color-field">
          <span class="color-swatch" style="--swatch-color:${escapeHtml(swatchColor)}" aria-hidden="true"></span>
          <input id="${id}" type="text" value="${escapeHtml(displayValue)}" ${extra}>
        </div>
      </div>
    `;
  }

  return `
    <div class="field-card${className ? ` ${escapeHtml(className)}` : ''}">
      <label for="${id}">${escapeHtml(label)}</label>
      <input id="${id}" type="${type}" value="${escapeHtml(displayValue)}" ${extra}>
      ${dataList}
    </div>
  `;
}

function tableInput(attrs = {}) {
  const {
    path,
    value,
    type = 'text',
    label,
    min,
    max,
    step,
    placeholder = '',
  } = attrs;
  const displayValue = value ?? '';
  const extra = [
    `data-path="${escapeHtml(path)}"`,
    `data-type="${escapeHtml(type)}"`,
    min !== undefined ? `min="${min}"` : '',
    max !== undefined ? `max="${max}"` : '',
    step !== undefined ? `step="${step}"` : '',
    placeholder ? `placeholder="${escapeHtml(placeholder)}"` : '',
  ].filter(Boolean).join(' ');

  return `
    <input
      class="table-input"
      type="${type}"
      value="${escapeHtml(displayValue)}"
      aria-label="${escapeHtml(label)}"
      title="${escapeHtml(label)}"
      ${extra}
    >
  `;
}

function tableReadonlyValue(label, value) {
  const displayValue = value === undefined || value === null || value === '' ? '未设置' : String(value);
  return `
    <span
      class="table-readonly-value"
      aria-label="${escapeHtml(label)}"
      title="${escapeHtml(label)}"
    >${escapeHtml(displayValue)}</span>
  `;
}

function defaultInput(attrs = {}) {
  const { path, label, value, defaultValue, type = 'text' } = attrs;
  const id = `field-${Math.random().toString(36).slice(2)}`;
  const usesDefault = value === undefined || value === null || value === '' || value === defaultValue;
  const displayValue = usesDefault ? defaultValue : value;
  return `
    <div class="field-card">
      <label for="${id}">${escapeHtml(label)}</label>
      <input
        id="${id}"
        class="default-hint-input"
        type="${type}"
        value="${escapeHtml(displayValue ?? '')}"
        data-path="${escapeHtml(path)}"
        data-type="${escapeHtml(type)}"
        data-default-value="${escapeHtml(defaultValue ?? '')}"
        data-uses-default="${usesDefault ? 'true' : 'false'}"
      >
    </div>
  `;
}

function renderObjectEditor(value, basePath = activeModule().path) {
  return `<div class="section-grid compact-field-grid">${
    Object.entries(value || {}).map(([key, fieldValue]) => input({
      path: `${basePath}.${key}`,
      label: displayFieldLabel(key),
      value: fieldValue,
      type: typeof fieldValue === 'number' ? 'number' : 'text',
      step: typeof fieldValue === 'number' ? '0.01' : undefined,
    })).join('')
  }</div>`;
}

const CONFIG_KEYBOARD_GROUP_LABELS = {
  pinyin: '中文键盘',
  alphabetic: '英文键盘',
  numeric: '数字键盘',
  symbolic: '符号键盘',
  emoji: 'Emoji 键盘',
  panel: '面板键盘',
};

const CONFIG_DEVICE_LABELS = {
  iPhone: '手机',
  iPad: '平板',
};

const CONFIG_ORIENTATION_LABELS = {
  portrait: '竖屏',
  landscape: '横屏',
  floating: '浮动',
};

const KEYBOARD_TEMPLATE_LABELS = {
  pinyin_9_portrait: '中文9键竖屏',
  pinyin_9_landscape: '中文9键横屏',
  pinyin_14_portrait: '中文14键竖屏',
  pinyin_14_landscape: '中文14键横屏',
  pinyin_17_portrait: '中文17键竖屏',
  pinyin_17_landscape: '中文17键横屏',
  pinyin_18_portrait: '中文18键竖屏',
  pinyin_18_landscape: '中文18键横屏',
  pinyin_26_portrait: '中文26键竖屏',
  pinyin_26_landscape: '中文26键横屏',
  alphabetic_26_portrait: '英文26键竖屏',
  alphabetic_26_landscape: '英文26键横屏',
  alphabetic_26_plain_portrait: '英文26键竖屏（无划动）',
  alphabetic_26_plain_landscape: '英文26键横屏（无划动）',
  numeric_9_portrait: '数字9键竖屏',
  numeric_9_landscape: '数字9键横屏',
  numeric_ios_portrait: '苹果数字键盘竖屏',
  numeric_ios_landscape: '苹果数字键盘横屏',
  symbolic_portrait: '符号键盘竖屏',
  symbolic_landscape: '符号键盘横屏',
  symbolic_system: 'App内符号键盘',
  emoji_portrait: '自定义 Emoji 竖屏',
  emoji_landscape: '自定义 Emoji 横屏',
  emoji_system: 'App内emoji键盘',
  panel_portrait: '自定义面板竖屏',
  panel_landscape: '自定义面板横屏',
};

const PREVIEW_KEYBOARD_GROUP_ORDER = ['pinyin', 'alphabetic', 'numeric', 'symbolic', 'emoji', 'panel'];
const PREVIEW_KEYBOARD_ORIENTATION_ORDER = ['portrait', 'landscape'];

function effectiveKeyboardCombo(project = state.project) {
  return normalizedKeyboardCombo(project?.keyboardCombo || {});
}

function effectiveConfig(config = state.project?.config || {}, comboOverride = null) {
  const next = deepClone(config || {});
  const combo = comboOverride ? normalizedKeyboardCombo(comboOverride) : effectiveKeyboardCombo();
  next.pinyin = next.pinyin || {};
  next.alphabetic = next.alphabetic || {};
  next.numeric = next.numeric || {};
  next.symbolic = next.symbolic || {};
  next.emoji = next.emoji || {};
  next.panel = next.panel || {};

  if (combo.slots.pinyin.source === 'disabled' || combo.slots.pinyin.enabled === false) {
    next.pinyin = {};
  }
  if (combo.slots.pinyin.variant === '9' && combo.slots.pinyin.source !== 'disabled' && combo.slots.pinyin.enabled !== false) {
    for (const device of ['iPhone', 'iPad']) {
      next.pinyin[device] = next.pinyin[device] || {};
      next.pinyin[device].portrait = 'pinyin_9_portrait';
      next.pinyin[device].landscape = 'pinyin_9_landscape';
      if (device === 'iPad') next.pinyin[device].floating = 'pinyin_9_portrait';
    }
  }
  if (['14', '17', '18'].includes(combo.slots.pinyin.variant) && combo.slots.pinyin.source !== 'disabled' && combo.slots.pinyin.enabled !== false) {
    for (const device of ['iPhone', 'iPad']) {
      next.pinyin[device] = next.pinyin[device] || {};
      next.pinyin[device].portrait = `pinyin_${combo.slots.pinyin.variant}_portrait`;
      next.pinyin[device].landscape = `pinyin_${combo.slots.pinyin.variant}_landscape`;
      if (device === 'iPad') next.pinyin[device].floating = `pinyin_${combo.slots.pinyin.variant}_portrait`;
    }
  }

  if (combo.inputStrategy !== 'separateAlphabetic' || combo.slots.alphabetic.source === 'disabled') {
    next.alphabetic = {};
  }

  if (combo.slots.numeric.source === 'disabled' || combo.slots.numeric.enabled === false) {
    next.numeric = {};
  }
  if (combo.slots.numeric.variant === 'ios' && combo.slots.numeric.source !== 'disabled' && combo.slots.numeric.enabled !== false) {
    for (const device of ['iPhone', 'iPad']) {
      next.numeric[device] = next.numeric[device] || {};
      next.numeric[device].portrait = 'numeric_ios_portrait';
      next.numeric[device].landscape = 'numeric_ios_landscape';
      if (device === 'iPad') next.numeric[device].floating = 'numeric_ios_portrait';
    }
  }
  if (combo.slots.numeric.variant === '9' && combo.slots.numeric.source !== 'disabled' && combo.slots.numeric.enabled !== false) {
    for (const device of ['iPhone', 'iPad']) {
      next.numeric[device] = next.numeric[device] || {};
      next.numeric[device].portrait = 'numeric_9_portrait';
      next.numeric[device].landscape = 'numeric_9_landscape';
      if (device === 'iPad') next.numeric[device].floating = 'numeric_9_portrait';
    }
  }

  if (combo.slots.symbolic.source === 'system') next.symbolic = {};
  if (combo.slots.symbolic.source === 'custom') {
    for (const device of ['iPhone', 'iPad']) {
      next.symbolic[device] = next.symbolic[device] || {};
      next.symbolic[device].portrait = 'symbolic_portrait';
      next.symbolic[device].landscape = 'symbolic_landscape';
      if (device === 'iPad') next.symbolic[device].floating = 'symbolic_portrait';
    }
  }
  if (combo.slots.symbolic.source === 'disabled' || combo.slots.symbolic.enabled === false) {
    next.symbolic = {};
  }

  if (combo.slots.emoji.source === 'system') next.emoji = {};
  if (combo.slots.emoji.source === 'custom') {
    for (const device of ['iPhone', 'iPad']) {
      next.emoji[device] = next.emoji[device] || {};
      next.emoji[device].portrait = 'emoji_portrait';
      next.emoji[device].landscape = 'emoji_landscape';
      if (device === 'iPad') next.emoji[device].floating = 'emoji_portrait';
    }
  }
  if (combo.slots.emoji.source === 'disabled' || combo.slots.emoji.enabled === false) {
    next.emoji = {};
  }

  if (combo.slots.panel.source === 'disabled' || combo.slots.panel.enabled === false) {
    next.panel = {};
  }

  return next;
}

function visibleConfigGroups() {
  const combo = effectiveKeyboardCombo();
  return ['pinyin', 'alphabetic', 'numeric', 'symbolic', 'emoji', 'panel'].filter((group) => {
    if (group === 'pinyin') return combo.slots.pinyin.source !== 'disabled' && combo.slots.pinyin.enabled !== false;
    if (group === 'alphabetic') return combo.inputStrategy === 'separateAlphabetic' && combo.slots.alphabetic.source !== 'disabled' && combo.slots.alphabetic.enabled !== false;
    if (group === 'numeric') return combo.slots.numeric.source !== 'disabled' && combo.slots.numeric.enabled !== false;
    if (group === 'symbolic') return combo.slots.symbolic.source !== 'disabled' && combo.slots.symbolic.enabled !== false;
    if (group === 'emoji') return combo.slots.emoji.source !== 'disabled' && combo.slots.emoji.enabled !== false;
    if (group === 'panel') return combo.slots.panel.source !== 'disabled' && combo.slots.panel.enabled !== false;
    return true;
  });
}

function keyboardTemplateLabel(name) {
  return KEYBOARD_TEMPLATE_LABELS[name] || name;
}

function previewKeyboardGroupIndex(name) {
  const group = PREVIEW_KEYBOARD_GROUP_ORDER.find((item) => name.startsWith(item));
  const index = PREVIEW_KEYBOARD_GROUP_ORDER.indexOf(group);
  return index === -1 ? PREVIEW_KEYBOARD_GROUP_ORDER.length : index;
}

function previewKeyboardOrientationIndex(name) {
  const orientation = PREVIEW_KEYBOARD_ORIENTATION_ORDER.find((item) => name.includes(item));
  const index = PREVIEW_KEYBOARD_ORIENTATION_ORDER.indexOf(orientation);
  return index === -1 ? PREVIEW_KEYBOARD_ORIENTATION_ORDER.length : index;
}

function comparePreviewKeyboardNames(left, right) {
  const groupDelta = previewKeyboardGroupIndex(left) - previewKeyboardGroupIndex(right);
  if (groupDelta) return groupDelta;
  const orientationDelta = previewKeyboardOrientationIndex(left) - previewKeyboardOrientationIndex(right);
  if (orientationDelta) return orientationDelta;
  return left.localeCompare(right, 'zh-CN');
}

function collectConfigKeyboardNames(config = effectiveConfig(state.project?.config || {}), { includePreviewKeyboards = true } = {}) {
  const combo = effectiveKeyboardCombo();
  const defaultsByGroup = {
    pinyin: [
      'pinyin_9_portrait', 'pinyin_9_landscape',
      'pinyin_14_portrait', 'pinyin_14_landscape',
      'pinyin_17_portrait', 'pinyin_17_landscape',
      'pinyin_18_portrait', 'pinyin_18_landscape',
      'pinyin_26_portrait', 'pinyin_26_landscape',
    ],
    alphabetic: ['alphabetic_26_portrait', 'alphabetic_26_landscape', 'alphabetic_26_plain_portrait', 'alphabetic_26_plain_landscape'],
    numeric: ['numeric_9_portrait', 'numeric_9_landscape', 'numeric_ios_portrait', 'numeric_ios_landscape'],
    symbolic: combo.slots.symbolic.source === 'system' ? [] : ['symbolic_portrait', 'symbolic_landscape'],
    emoji: combo.slots.emoji.source === 'system' ? [] : ['emoji_portrait', 'emoji_landscape'],
    panel: ['panel_portrait', 'panel_landscape'],
  };
  const names = new Set();
  for (const group of visibleConfigGroups()) {
    (defaultsByGroup[group] || []).forEach((name) => names.add(name));
    for (const deviceValue of Object.values(config[group] || {})) {
      if (!deviceValue || typeof deviceValue !== 'object') continue;
      Object.values(deviceValue).forEach((name) => {
        if (typeof name === 'string' && name.trim()) names.add(name);
      });
    }
  }
  if (includePreviewKeyboards) {
    previewKeyboards().forEach((item) => names.add(item.name));
  }
  return [...names].sort(comparePreviewKeyboardNames);
}

function collectConfigKeyboardNamesForGroup(group, orientation = '', config = effectiveConfig(state.project?.config || {}), { includePreviewKeyboards = true } = {}) {
  const preferredNames = isGuideReady(state.project) ? new Set(guidePreferredPreviewNames(state.project)) : null;
  return collectConfigKeyboardNames(config, { includePreviewKeyboards })
    .filter((name) => {
      if (preferredNames && !preferredNames.has(name)) return false;
      if (group === 'emoji') return name.startsWith('emoji_');
      return name.startsWith(`${group}_`);
    })
    .filter((name) => {
      if (name.endsWith('_system')) return true;
      if (orientation === 'portrait') return name.endsWith('_portrait');
      if (orientation === 'landscape') return name.endsWith('_landscape');
      if (orientation === 'floating') return name.endsWith('_portrait');
      return true;
    });
}

function configKeyboardSelect(path, value, keyboardOptions) {
  const options = keyboardOptions.includes(value) || !value
    ? keyboardOptions
    : [value, ...keyboardOptions];
  return selectField({
    path,
    label: '',
    value,
    options: options.map((name) => ({ value: name, label: keyboardTemplateLabel(name) })),
  });
}

function activeConfigDevice(group, devices) {
  const deviceNames = Object.keys(devices || {});
  const selected = state.configDevice;
  if (selected && deviceNames.includes(selected)) return selected;
  if (deviceNames.includes('iPhone')) return 'iPhone';
  return deviceNames[0] || '';
}

function collectConfigDevices(config = {}) {
  const devices = new Set();
  ['pinyin', 'alphabetic', 'numeric', 'symbolic', 'emoji', 'panel'].forEach((group) => {
    Object.keys(config[group] || {}).forEach((device) => devices.add(device));
  });
  return ['iPhone', 'iPad', ...devices].filter((device, index, list) => devices.has(device) && list.indexOf(device) === index);
}

function renderConfigDeviceSwitch(config = {}) {
  const deviceNames = collectConfigDevices(config);
  if (deviceNames.length <= 1) {
    const device = deviceNames[0];
    return device ? `<span class="config-device-pill">${escapeHtml(CONFIG_DEVICE_LABELS[device] || device)}</span>` : '';
  }
  const activeDevice = deviceNames.includes(state.configDevice) ? state.configDevice : deviceNames[0];
  return `
    <div class="mode-menu config-device-menu" role="tablist" aria-label="键盘配置设备">
      ${deviceNames.map((device) => `
        <button
          class="${device === activeDevice ? 'active' : ''}"
          type="button"
          data-config-device="${escapeHtml(device)}"
        >${escapeHtml(CONFIG_DEVICE_LABELS[device] || device)}</button>
      `).join('')}
    </div>
  `;
}

function renderConfigKeyboardMapping(config = effectiveConfig()) {
  return `
    <details class="group-card advanced-config-card">
      <summary>
        <span>高级配置：config.yaml 键盘映射</span>
        <small>使用引导已生成常规键盘方案，需要手动覆盖设备或横竖屏映射时再展开。</small>
      </summary>
      <div class="layout-toolbar config-keyboard-toolbar">
        ${renderConfigDeviceSwitch(config)}
      </div>
      <div class="config-keyboard-list">
        ${visibleConfigGroups().map((group) => {
    const devices = config[group] || {};
    const device = activeConfigDevice(group, devices);
    const mappings = devices[device] || {};
    return `
          <section class="field-card config-keyboard-card">
            <div class="config-keyboard-card-header">
              <label>${escapeHtml(CONFIG_KEYBOARD_GROUP_LABELS[group] || group)}</label>
            </div>
            <div class="config-device-card">
              <div class="config-orientation-grid">
                ${Object.entries(mappings || {}).map(([orientation, keyboardName]) => `
                  <div class="config-orientation-row">
                    <span>${escapeHtml(CONFIG_ORIENTATION_LABELS[orientation] || orientation)}</span>
                    ${configKeyboardSelect(`config.${group}.${device}.${orientation}`, keyboardName, collectConfigKeyboardNamesForGroup(group, orientation, config))}
                  </div>
                `).join('')}
              </div>
            </div>
          </section>
        `;
  }).join('')}
      </div>
    </details>
  `;
}

function renderMetaEditor() {
  const defaults = effectiveConfig(state.project.config || {});
  const value = state.project.meta || {};
  const defaultDescription = DEFAULT_DOWNLOAD_PATH;
  const directoryPickerSupported = typeof window.showDirectoryPicker === 'function';
  const directoryButtonText = state.downloadDirectoryHandle ? '更换文件夹' : '选择文件夹';
  const directoryHint = directoryPickerSupported
    ? state.downloadDirectoryHandle
      ? '导出时会直接写入已授权文件夹。'
      : '点击选择文件夹后，导出会直接写入该文件夹。'
    : '当前浏览器不支持文件夹选择，导出时使用浏览器默认下载目录。';
  return `
    <section class="group-card">
      <h3>皮肤信息</h3>
      <div class="section-grid meta-info-grid">
        ${defaultInput({ path: 'meta.name', label: '皮肤名称', value: value.name, defaultValue: defaults.name || defaultSkinName(1) })}
        ${defaultInput({ path: 'meta.author', label: '作者', value: value.author, defaultValue: defaults.author || DEFAULT_SKIN_AUTHOR })}
        <div class="field-card download-location-card">
          <label for="downloadLocationInput">下载位置</label>
          <div class="download-location-row">
            <input id="downloadLocationInput" class="default-hint-input" data-path="meta.description" data-type="text" data-default-value="${escapeHtml(defaultDescription)}" data-uses-default="${value.description ? 'false' : 'true'}" type="text" value="${escapeHtml(value.description || defaultDescription)}">
            <button class="mini-button download-folder-button" type="button" data-download-action="choose-directory" ${directoryPickerSupported ? '' : 'disabled title="当前浏览器不支持选择文件夹"'}>${escapeHtml(directoryButtonText)}</button>
          </div>
          <p class="field-help">${escapeHtml(directoryHint)}</p>
        </div>
        ${input({ path: 'meta.version', label: '版本', value: value.version || '' })}
        ${input({ path: 'meta.createdAt', label: '创建时间', value: value.createdAt || '' })}
        ${input({ path: 'meta.updatedAt', label: '更新时间', value: value.updatedAt || '' })}
      </div>
    </section>
    ${renderConfigKeyboardMapping(defaults)}
  `;
}

function renderStringMap(value, basePath = activeModule().path) {
  return renderObjectEditor(value, basePath);
}

function renderNumberMap(value, basePath = activeModule().path) {
  const moduleId = activeModule().id;
  const scopeName = moduleId === 'fontSize' || moduleId === 'scale' ? moduleId : null;
  const entries = scopeName ? filterEntriesByScope(value, scopeName) : Object.entries(value || {});
  const step = moduleId === 'fontSize' ? '1' : '0.01';
  return `<div class="section-grid compact-field-grid two-column-field-grid">${
    entries.map(([key, fieldValue]) => input({
      path: `${basePath}.${key}`,
      label: displayFieldLabel(key),
      value: fieldValue,
      type: 'number',
      step,
    })).join('') || renderScopedEmptyNote()
  }</div>${scopeName ? renderPreviewScopeNote() : ''}`;
}

function renderPointMap(value, basePath = activeModule().path) {
  const scoped = activeModule().id === 'center';
  if (scoped) return renderCenterModule(value, basePath);
  const entries = scoped ? filterEntriesByScope(value, 'center') : Object.entries(value || {});
  return `${entries.map(([key, point]) => `
    ${pointInputCard(`${basePath}.${key}`, displayFieldLabel(key), point)}
  `).join('') || renderScopedEmptyNote()}${scoped ? renderPreviewScopeNote() : ''}`;
}

function centerDefinitionVisible(definition, scope) {
  const modeAllowed = !definition.modes || definition.modes.includes(scope.mode);
  const stateAllowed = !definition.states || definition.states.includes(scope.candidateState);
  return modeAllowed && stateAllowed;
}

function centerEntriesForScope(value = {}) {
  const scope = currentPreviewScope();
  return Object.entries(value || {})
    .filter(([key]) => {
      if (!fieldVisibleByFeature('center', key)) return false;
      const definition = CENTER_FIELD_DEFINITIONS[key];
      if (!definition) return scopeKeys('center').includes(key);
      if (definition.category === 'hint') return ['keyboard26', 'numeric', 'symbolic'].includes(scope.mode);
      return centerDefinitionVisible(definition, scope);
    })
    .map(([key, point]) => ({
      key,
      path: `theme.shared.center.${key}`,
      label: displayFieldLabel(key),
      point,
      category: CENTER_FIELD_DEFINITIONS[key]?.category || 'keyForeground',
    }));
}

function centerSpecialEntriesForScope() {
  const scope = currentPreviewScope();
  const entries = [];
  if (scope.mode === 'keyboard26' && scope.keyboardVisible) {
    for (const mode of ['pinyin', 'alphabetic']) {
      for (const slot of ['primary', 'secondary']) {
        const path = `keyboards.keyboard26.spaceRight.${mode}.${slot}.center`;
        entries.push({
          path,
          label: `空格右侧键 ${mode === 'pinyin' ? '中文' : '英文'} ${slot === 'primary' ? '主显示位置' : '上划显示位置'}`,
          point: getPath(state.project, path),
          category: 'special',
        });
      }
    }
    entries.push({
      path: 'keyboards.keyboard26.pinyinSchemaName.center',
      label: '中文方案名显示位置',
      point: state.project.keyboards?.keyboard26?.pinyinSchemaName?.center,
      category: 'special',
    });
  }
  if (scope.mode === 'symbolic' && scope.keyboardVisible) {
    entries.push({
      path: 'keyboards.symbolic.text.iconCenter',
      label: '符号键盘底部图标',
      point: state.project.keyboards?.symbolic?.text?.iconCenter,
      category: 'special',
    });
  }
  if (scope.candidateState === 'expanded') {
    entries.push({
      path: 'toolbar.verticalCandidateIconCenter',
      label: '纵向候选翻页图标',
      point: state.project.toolbar?.verticalCandidateIconCenter,
      category: 'special',
    });
  }
  if (scope.keyboardVisible && ['keyboard26', 'numeric'].includes(scope.mode)) {
    const toggles = guideToggleState();
    for (const direction of ['swipe_up', 'swipe_down']) {
      if (direction === 'swipe_up' && !toggles.swipeUpEnabled) continue;
      if (direction === 'swipe_down' && !toggles.swipeDownEnabled) continue;
      for (const profile of swipeProfilesForPreview(state.project.data?.swipes || {}, direction)) {
        const source = state.project.data?.swipes?.[profile]?.[direction] || {};
        const keys = currentPreviewKeyboardKeys().filter((key) => source[key]);
        for (const key of keys) {
          const entry = source[key] || {};
          entries.push({
            path: `data.swipes.${profile}.${direction}.${key}.center`,
            label: `${swipeKeyLabel(key)} ${SWIPE_DIRECTION_LABELS[direction]}单键偏移`,
            point: entry.center,
            category: 'swipe',
          });
        }
      }
    }
  }
  return entries;
}

function renderCenterCategory(category, entries) {
  if (!entries.length) return '';
  return `
    <section class="group-card center-category-card">
      <h3>${escapeHtml(CENTER_CATEGORY_LABELS[category] || category)}</h3>
      <div class="center-point-list">
        ${entries.map((entry) => pointInputCard(entry.path, entry.label, entry.point, 'center-point-row')).join('')}
      </div>
    </section>
  `;
}

function centerTargetForPreviewKey(key) {
  if (!key) return null;
  const scope = currentPreviewScope();
  if (scope.candidateState === 'toolbar' && toolbarPreviewKeys().includes(key)) return { group: 'toolbar', key };
  if (scope.mode === 'keyboard26' && scope.keyboardVisible) return { group: 'keyboard26', key };
  return null;
}

function centerTargetPath(target = state.selectedCenterTarget) {
  if (!target?.group || !target?.key) return null;
  return `theme.shared.customCenters.${target.group}.${target.key}`;
}

function centerTargetLabel(target = state.selectedCenterTarget) {
  if (!target) return '';
  return `${CENTER_TARGET_GROUP_LABELS[target.group] || target.group} / ${keyCodeLabel(target.key)}`;
}

function toolbarEffectiveCenter() {
  const centers = state.project.theme?.shared?.center || {};
  return centers['toolbar按键偏移']
    || centers['toolbar按键文字偏移']
    || centers['toolbar按键sf符号偏移']
    || { x: 0.5, y: 0.6 };
}

function keyboard26EffectiveCenterForKey(key) {
  const centers = state.project.theme?.shared?.center || {};
  if (/^\d$/.test(key)) return centers['数字键盘数字前景偏移'] || { x: 0.5, y: 0.5 };
  if (FUNCTION_KEYS.has(key)) return centers['功能键前景文字偏移'] || { x: 0.5, y: 0.47 };
  return centers['26键中文前景偏移'] || { x: 0.5, y: 0.5 };
}

function effectiveCustomCenterPoint(target) {
  if (!target?.group || !target?.key) return {};
  const custom = getPath(state.project, centerTargetPath(target));
  if (custom && typeof custom === 'object' && !Array.isArray(custom)) return custom;
  if (target.group === 'toolbar') return toolbarEffectiveCenter();
  if (target.group === 'keyboard26') return keyboard26EffectiveCenterForKey(target.key);
  return {};
}

function toolbarPreviewKeys() {
  const combo = state.project.keyboardCombo || {};
  const sourceButtons = Array.isArray(state.project.toolbar?.layout) ? state.project.toolbar.layout : DEFAULT_TOOLBAR_BUTTONS;
  return sourceButtons.filter((button) => {
    if (button === 'menu') return combo.slots?.panel?.source !== 'disabled' && combo.slots?.panel?.enabled !== false;
    if (button === 'symbol') return combo.slots?.symbolic?.source !== 'disabled' && combo.slots?.symbolic?.enabled !== false;
    if (button === 'emoji') return combo.slots?.emoji?.source !== 'disabled' && combo.slots?.emoji?.enabled !== false;
    return true;
  });
}

function customCenterTargetsForScope() {
  const scope = currentPreviewScope();
  const targets = [];
  if (scope.candidateState === 'toolbar') {
    targets.push(...toolbarPreviewKeys().map((key) => ({ group: 'toolbar', key })));
  }
  if (scope.mode === 'keyboard26' && scope.keyboardVisible) {
    targets.push(...currentPreviewKeyboardKeys().map((key) => ({ group: 'keyboard26', key })));
  }
  return targets;
}

function renderCustomCenterToken(target, activePath = '') {
  const path = centerTargetPath(target);
  const active = (state.editingKey?.path === path || activePath === path) ? ' is-active' : '';
  const label = target.group === 'toolbar' ? toolbarLayoutTokenLabel(target.key) : swipeKeyLabel(target.key);
  return `
    <button class="swipe-token custom-center-token${active}" type="button" data-key-edit-path="${escapeHtml(path)}" data-center-group="${escapeHtml(target.group)}" data-center-key="${escapeHtml(target.key)}" title="编辑 ${escapeHtml(label)} 偏移">
      <span class="swipe-key">${escapeHtml(label)}</span>
    </button>
  `;
}

function renderCustomCenterTargetGroup(group, targets, activePath = '') {
  if (!targets.length) return '';
  const title = group === 'keyboard26'
    ? `中文 ${currentPreviewScope().pinyinVariant || '26'} 键`
    : CENTER_TARGET_GROUP_LABELS[group] || group;
  return `
    <section class="group-card keyboard-key-card custom-center-keyboard-card is-${escapeHtml(group)}">
      <div class="field-card-title row-heading">
        <span class="row-title">${escapeHtml(title)}</span>
        <span class="swipe-default-center">点击按键编辑偏移设置</span>
      </div>
      <div class="swipe-token-list custom-center-token-list">
        ${targets.map((target) => renderCustomCenterToken(target, activePath)).join('')}
      </div>
    </section>
  `;
}

function renderCenterModeSwitch() {
  return `
    <div class="center-mode-switch" role="tablist" aria-label="偏移设置模板">
      ${[
        ['uniform', '统一偏移'],
        ['custom', '自定义'],
      ].map(([mode, label]) => `
        <button type="button" class="${state.centerEditMode === mode ? 'active' : ''}" data-center-mode="${mode}" role="tab" aria-selected="${state.centerEditMode === mode ? 'true' : 'false'}">
          ${escapeHtml(label)}
        </button>
      `).join('')}
    </div>
  `;
}

function renderCustomCenterModule() {
  const targets = customCenterTargetsForScope();
  const activeTarget = state.selectedCenterTarget && targets.some((target) => target.group === state.selectedCenterTarget.group && target.key === state.selectedCenterTarget.key)
    ? state.selectedCenterTarget
    : targets[0] || null;
  const path = centerTargetPath(activeTarget);
  const point = path ? effectiveCustomCenterPoint(activeTarget) : null;
  const targetsByGroup = {
    toolbar: targets.filter((target) => target.group === 'toolbar'),
    keyboard26: targets.filter((target) => target.group === 'keyboard26'),
  };
  return `
    ${renderPreviewScopeHeader('偏移设置', '自定义模式：从按键列表选择一个按键，单独设置前景偏移。', '', { scopeBadgeHtml: renderCenterModeSwitch() })}
    ${targets.length ? `
      ${renderCustomCenterTargetGroup('toolbar', targetsByGroup.toolbar, path)}
      ${renderCustomCenterTargetGroup('keyboard26', targetsByGroup.keyboard26, path)}
    ` : '<p class="empty-note">当前预览没有可自定义偏移的按键。</p>'}
    ${activeTarget && path ? `
      <section class="group-card custom-center-card">
        <section class="key-edit-panel swipe-edit-panel custom-center-edit-panel" data-key-edit-panel-path="${escapeHtml(path)}">
          <section class="key-edit-section">
            <h4>${escapeHtml(centerTargetLabel(activeTarget))}</h4>
            <p class="empty-note">输入框默认显示当前生效偏移；修改后会保存为当前单个按键的自定义偏移。</p>
          </section>
        <div class="center-point-list">
          ${pointInputCard(path, '单键前景偏移', point, 'center-point-row')}
        </div>
          <span class="key-edit-focus-sentinel" tabindex="0" aria-hidden="true"></span>
        </section>
      </section>
    ` : ''}
    ${renderPreviewScopeNote()}
  `;
}

function renderCenterModule(value = {}, basePath = 'theme.shared.center') {
  if (state.centerEditMode === 'custom') return renderCustomCenterModule();
  const entries = [...centerEntriesForScope(value), ...centerSpecialEntriesForScope()];
  const categoryOrder = ['keyForeground', 'swipe', 'hint', 'toolbar', 'panel', 'special'];
  return `
    ${renderPreviewScopeHeader('偏移设置', '只显示右侧当前预览界面里可设置的偏移项；其他模块不再单独显示偏移输入。', '', { scopeBadgeHtml: renderCenterModeSwitch() })}
    ${categoryOrder.map((category) => renderCenterCategory(
    category,
    entries.filter((entry) => entry.category === category),
  )).join('') || renderScopedEmptyNote()}
    ${renderPreviewScopeNote()}
  `;
}

function renderInsetObject(path, label, insets = {}) {
  const displayLabel = INSET_ITEM_LABELS[label] || label;
  return `
    <section class="field-card">
      <label>${escapeHtml(displayLabel)}</label>
      <div class="edge-grid">
        ${['top', 'right', 'bottom', 'left'].map((edge) => input({
          path: `${path}.${edge}`,
          label: INSET_EDGE_LABELS[edge] || edge,
          value: insets?.[edge] ?? '',
          type: 'number',
          step: '0.1',
        })).join('')}
      </div>
    </section>
  `;
}

function renderInsetModeMenu(group, mode, title) {
  return `
    <div class="mode-menu inset-mode-menu" role="tablist" aria-label="${escapeHtml(title)}边距模式">
      <button class="${mode === 'regular' ? 'active' : ''}" type="button" data-inset-action="set-mode" data-group="${escapeHtml(group)}" data-mode="regular">常规</button>
      <button class="${mode === 'custom' ? 'active' : ''}" type="button" data-inset-action="set-mode" data-group="${escapeHtml(group)}" data-mode="custom">自定义</button>
    </div>
  `;
}

function ensureInsetGroup(value, group) {
  const items = value[group] || {};
  if (!value[group]) value[group] = items;
  if (!Array.isArray(items.custom)) items.custom = [];
  return items;
}

function insetGroupMode(items = {}) {
  return items.mode === 'custom' ? 'custom' : 'regular';
}

function insetSelectableKeys(group) {
  if (group === 'keyboard26') {
    if (currentPreviewScope().mode === 'keyboard26') return currentPreviewKeyboardKeys();
    const keyboard = state.project.keyboards?.keyboard26 || {};
    return [...new Set(keyboard26PortraitRows(keyboard).flatMap((row) => row.keys || []).filter(Boolean))];
  }
  if (group === 'numeric') {
    if (currentPreviewScope().mode === 'numeric') return currentPreviewKeyboardKeys();
    const columns = state.project.keyboards?.numeric?.layout?.portrait?.columns || DEFAULT_NUMERIC_COLUMNS;
    return [...new Set(columns.flat().filter(Boolean))];
  }
  if (group === 'symbolic') {
    const previewKeys = currentPreviewScope().mode === 'symbolic' ? currentPreviewKeyboardKeys() : [];
    const rows = state.project.keyboards?.symbolic?.layout?.portrait?.functionRows || DEFAULT_SYMBOLIC_FUNCTION_ROWS;
    return [...new Set(['categoryCollection', 'categoryCell', 'descriptionCollection', 'descriptionContent', ...(previewKeys.length ? previewKeys : rows.flat())].filter(Boolean))];
  }
  if (group === 'toolbar') return [...new Set([...(state.project.toolbar?.layout || DEFAULT_TOOLBAR_BUTTONS), 'horizontalCandidates', 'verticalCandidatesStyle', 'verticalCandidateFunction'])];
  if (group === 'hint') return ['symbols', 'selectedBackground'];
  if (group === 'panel') return currentPreviewScope().mode === 'panel' ? currentPreviewKeyboardKeys() : [];
  return [];
}

function insetSelectableLabel(key) {
  return INSET_ITEM_LABELS[key] || keyCodeLabel(key);
}

function renderInsetKeyPicker(group, rule, ruleIndex) {
  const selected = new Set(rule.keys || []);
  return `
    <div class="inset-key-picker" role="group" aria-label="按键选择">
      ${insetSelectableKeys(group).map((key) => `
        <label class="inset-key-option ${selected.has(key) ? 'is-selected' : ''}">
          <input type="checkbox" data-inset-action="toggle-custom-key" data-group="${escapeHtml(group)}" data-index="${ruleIndex}" data-key="${escapeHtml(key)}" ${selected.has(key) ? 'checked' : ''}>
          <span title="${escapeHtml(key)}">${escapeHtml(insetSelectableLabel(key))}</span>
        </label>
      `).join('')}
    </div>
  `;
}

function renderCustomInsetRule(group, rule, index) {
  return `
    <section class="field-card inset-custom-rule">
      <div class="field-card-title row-heading">
        <span class="row-title">自定义边距 ${index + 1}</span>
        ${closeIconButton(`data-inset-action="remove-custom-rule" data-group="${escapeHtml(group)}" data-index="${index}"`, '移除这条边距设置')}
      </div>
      <label>按键选择</label>
      ${renderInsetKeyPicker(group, rule, index)}
      <label>边距设置</label>
      <div class="edge-grid">
        ${['top', 'right', 'bottom', 'left'].map((edge) => input({
    path: `keyStyles.buttonInsets.${group}.custom.${index}.insets.${edge}`,
    label: INSET_EDGE_LABELS[edge] || edge,
    value: rule.insets?.[edge] ?? '',
    type: 'number',
    step: '0.1',
  })).join('')}
      </div>
    </section>
  `;
}

function regularInsetEntries(group, items) {
  return Object.entries(items || {}).filter(([key, value]) => (
    !['mode', 'custom'].includes(key)
    && value
    && typeof value === 'object'
    && !Array.isArray(value)
  ));
}

function renderRegularInsetGrid(group, items) {
  return `
    <div class="inset-regular-grid">
      ${regularInsetEntries(group, items).map(([key, insets]) => renderInsetObject(`keyStyles.buttonInsets.${group}.${key}`, key, insets)).join('')}
    </div>
  `;
}

function renderInsetGroup(group, items, { customEnabled = true } = {}) {
  const safeItems = customEnabled ? ensureInsetGroup({ [group]: items }, group) : (items || {});
  const mode = customEnabled ? insetGroupMode(safeItems) : 'regular';
  const title = INSET_GROUP_LABELS[group] || group;
  return `
    <section class="group-card">
      <div class="layout-toolbar">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <div class="inset-mode-row">
            ${customEnabled ? renderInsetModeMenu(group, mode, title) : ''}
            ${customEnabled && mode === 'custom' ? `<button class="tool-button primary inset-add-button" type="button" data-inset-action="add-custom-rule" data-group="${escapeHtml(group)}"><span aria-hidden="true">＋</span>添加</button>` : ''}
          </div>
        </div>
      </div>
      ${mode === 'regular'
    ? renderRegularInsetGrid(group, safeItems)
    : `<div class="inset-custom-list">
        ${(safeItems.custom || []).map((rule, index) => renderCustomInsetRule(group, rule, index)).join('') || '<p class="empty-note">暂无自定义边距，点击添加创建一条规则。</p>'}
      </div>`}
    </section>
  `;
}

function renderInsetsTree(value, basePath = activeModule().path) {
  const scope = currentPreviewScope();
  const allowedGroups = uniqueValues([
    ...(scope.keyboardVisible ? (PREVIEW_INSET_SCOPE[scope.mode] || []) : []),
    ...(PREVIEW_INSET_SCOPE[scope.candidateState] || []),
  ]).filter((group) => groupVisibleByFeature(group));
  const groupEntries = Object.entries(value || {}).filter(([group]) => group !== 'keyboard26' && allowedGroups.includes(group));
  groupEntries.sort(([groupA], [groupB]) => {
    if (groupA === 'panel') return 1;
    if (groupB === 'panel') return -1;
    return 0;
  });
  const renderedKeyboard26 = allowedGroups.includes('keyboard26') ? renderInsetGroup('keyboard26', (value || {}).keyboard26) : '';
  const renderedGroups = groupEntries.map(([group, items]) => `
    ${renderInsetGroup(group, scopedInsetItems(group, items, scope), { customEnabled: group !== 'panel' })}
  `).join('');
  return `
    ${renderedKeyboard26}
    ${renderedGroups || (renderedKeyboard26 ? '' : renderScopedEmptyNote())}
    ${renderPreviewScopeNote()}
  `;
}

function renderColors() {
  const theme = state.theme === 'dark' ? 'dark' : 'light';
  const colors = state.project.theme?.[theme]?.colors || {};
  const colorEntries = filterEntriesByScope(colors, 'colors');
  return `
    <section class="group-card">
      <div class="layout-toolbar color-theme-toolbar">
        <div>
          <h3>主题颜色</h3>
          <div class="mode-menu color-theme-menu" role="tablist" aria-label="主题颜色">
            <button class="${theme === 'light' ? 'active' : ''}" type="button" data-color-theme="light">浅色</button>
            <button class="${theme === 'dark' ? 'active' : ''}" type="button" data-color-theme="dark">深色</button>
          </div>
        </div>
      </div>
      <div class="section-grid">
        ${colorEntries.map(([key, value]) => input({
    path: `theme.${theme}.colors.${key}`,
    label: key === '方案名颜色' ? '方案名颜色设置' : key,
    value,
    type: 'color',
  })).join('') || renderScopedEmptyNote()}
      </div>
      ${renderPreviewScopeNote()}
    </section>
  `;
}

function renderCandidateStyleFields(title, basePath, style = {}, defaults = {}) {
  return `
    <section class="group-card candidate-style-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="section-grid compact-field-grid two-column-field-grid">
        ${defaultInput({
    path: `${basePath}.backgroundColor`,
    label: '普通背景',
    value: style.backgroundColor,
    defaultValue: defaults.backgroundColor || '',
    type: 'text',
  })}
        ${defaultInput({
    path: `${basePath}.preferredBackgroundColor`,
    label: '高亮背景',
    value: style.preferredBackgroundColor,
    defaultValue: defaults.preferredBackgroundColor || '',
    type: 'text',
  })}
        ${defaultInput({
    path: `${basePath}.preferredTextColor`,
    label: '高亮文字',
    value: style.preferredTextColor,
    defaultValue: defaults.preferredTextColor || '',
    type: 'text',
  })}
        ${defaultInput({
    path: `${basePath}.preferredIndexColor`,
    label: '高亮序号',
    value: style.preferredIndexColor,
    defaultValue: defaults.preferredIndexColor || '',
    type: 'text',
  })}
        ${defaultInput({
    path: `${basePath}.preferredCommentColor`,
    label: '高亮注释',
    value: style.preferredCommentColor,
    defaultValue: defaults.preferredCommentColor || '',
    type: 'text',
  })}
        ${defaultInput({
    path: `${basePath}.textColor`,
    label: '普通文字',
    value: style.textColor,
    defaultValue: defaults.textColor || '',
    type: 'text',
  })}
        ${defaultInput({
    path: `${basePath}.indexColor`,
    label: '普通序号',
    value: style.indexColor,
    defaultValue: defaults.indexColor || '',
    type: 'text',
  })}
        ${defaultInput({
    path: `${basePath}.commentColor`,
    label: '普通注释',
    value: style.commentColor,
    defaultValue: defaults.commentColor || '',
    type: 'text',
  })}
        ${defaultInput({
    path: `${basePath}.textFontSize`,
    label: '文字字号',
    value: style.textFontSize,
    defaultValue: defaults.textFontSize,
    type: 'number',
  })}
        ${defaultInput({
    path: `${basePath}.indexFontSize`,
    label: '序号字号',
    value: style.indexFontSize,
    defaultValue: defaults.indexFontSize,
    type: 'number',
  })}
        ${defaultInput({
    path: `${basePath}.commentFontSize`,
    label: '注释字号',
    value: style.commentFontSize,
    defaultValue: defaults.commentFontSize,
    type: 'number',
  })}
      </div>
      ${renderInsetObject(`${basePath}.insets`, '候选内容边距', style.insets || defaults.insets || {})}
    </section>
  `;
}

function renderCandidateStyles() {
  const theme = state.theme === 'dark' ? 'dark' : 'light';
  const colors = state.project.theme?.[theme]?.colors || {};
  const fontSizes = state.project.theme?.shared?.fontSize || {};
  const selectedColor = colors['候选字体选中字体颜色'] || colors['候选字体未选中字体颜色'] || '';
  const normalColor = colors['候选字体未选中字体颜色'] || selectedColor;
  const selectedBackground = colors['选中候选背景颜色'] || '';
  const horizontalStyle = state.project.toolbar?.horizontalCandidates?.candidateStyle || {};
  const verticalStyle = state.project.toolbar?.verticalCandidates?.candidateStyle || {};
  const horizontalCandidate = state.project.toolbar?.horizontalCandidates?.candidate || {};
  const verticalCandidate = state.project.toolbar?.verticalCandidates?.candidate || {};
  return `
    ${renderPreviewScopeHeader('候选样式', '进入本模块会自动显示候选栏预览；横向候选和展开候选可分开设置。', `
      <button class="tool-button secondary" type="button" data-candidate-style-action="show-horizontal">横向候选</button>
      <button class="tool-button secondary" type="button" data-candidate-style-action="show-expanded">展开候选</button>
    `, { showScopeBadge: true })}
    <section class="group-card candidate-style-card">
      <h3>全局候选颜色</h3>
      <div class="section-grid compact-field-grid three-column-field-grid">
        ${input({ path: `theme.${theme}.colors.选中候选背景颜色`, label: '高亮候选背景', value: selectedBackground, type: 'color' })}
        ${input({ path: `theme.${theme}.colors.候选字体选中字体颜色`, label: '高亮候选文字', value: selectedColor, type: 'color' })}
        ${input({ path: `theme.${theme}.colors.候选字体未选中字体颜色`, label: '普通候选文字', value: normalColor, type: 'color' })}
      </div>
    </section>
    <section class="group-card candidate-style-card">
      <h3>候选字号</h3>
      <div class="section-grid compact-field-grid three-column-field-grid">
        ${input({ path: 'theme.shared.fontSize.未展开候选字体选中字体大小', label: '横向候选字号', value: fontSizes['未展开候选字体选中字体大小'], type: 'number', step: '0.1' })}
        ${input({ path: 'theme.shared.fontSize.未展开comment字体大小', label: '横向注释字号', value: fontSizes['未展开comment字体大小'], type: 'number', step: '0.1' })}
        ${input({ path: 'theme.shared.fontSize.展开候选字体选中字体大小', label: '展开候选字号', value: fontSizes['展开候选字体选中字体大小'], type: 'number', step: '0.1' })}
        ${input({ path: 'theme.shared.fontSize.展开comment字体大小', label: '展开注释字号', value: fontSizes['展开comment字体大小'], type: 'number', step: '0.1' })}
      </div>
    </section>
    ${renderCandidateStyleFields('横向候选细节', 'toolbar.horizontalCandidates.candidateStyle', horizontalStyle, {
    preferredBackgroundColor: selectedBackground,
    preferredTextColor: selectedColor,
    preferredIndexColor: selectedColor,
    preferredCommentColor: selectedColor,
    backgroundColor: '#ffffff',
    textColor: normalColor,
    indexColor: normalColor,
    commentColor: normalColor,
    textFontSize: fontSizes['未展开候选字体选中字体大小'] ?? 18,
    indexFontSize: fontSizes['未展开候选字体选中字体大小'] ?? 18,
    commentFontSize: fontSizes['未展开comment字体大小'] ?? 14,
    insets: { top: 5, right: 1, bottom: 5, left: 1 },
  })}
    ${renderInsetObject('toolbar.horizontalCandidates.candidate.insets', '横向候选外边距', horizontalCandidate.insets || state.project.keyStyles?.buttonInsets?.toolbar?.horizontalCandidates || {})}
    ${renderCandidateStyleFields('展开候选细节', 'toolbar.verticalCandidates.candidateStyle', verticalStyle, {
    preferredBackgroundColor: selectedBackground,
    preferredTextColor: selectedColor,
    preferredIndexColor: selectedColor,
    preferredCommentColor: selectedColor,
    textColor: normalColor,
    indexColor: normalColor,
    commentColor: normalColor,
    textFontSize: fontSizes['展开候选字体选中字体大小'] ?? 16,
    indexFontSize: fontSizes['展开候选字体选中字体大小'] ?? 16,
    commentFontSize: fontSizes['展开comment字体大小'] ?? 18,
    insets: { top: 8, right: 8, bottom: 8, left: 8 },
  })}
    ${renderInsetObject('toolbar.verticalCandidates.candidate.insets', '展开候选外边距', verticalCandidate.insets || state.project.toolbar?.verticalCandidates?.candidateInsets || { top: 3, left: 4, bottom: 3, right: 4 })}
  `;
}

function renderAssets(value) {
  return `<div class="section-grid">${
    Object.entries(value || {}).map(([key, asset]) => `
      <section class="field-card">
        <label>${escapeHtml(key)}</label>
        <div class="field-row">
          ${input({ path: `assets.images.${key}.file`, label: '文件名', value: asset.file })}
          ${input({ path: `assets.images.${key}.image`, label: '图片名', value: asset.image })}
        </div>
        ${input({ path: `assets.images.${key}.source`, label: '来源', value: asset.source || '' })}
      </section>
    `).join('')
  }</div>`;
}

function renderKeyboardFrame(value) {
  const scope = currentPreviewScope();
  const nativeFrame = currentNativePreviewFrameValue(scope.orientation);
  const orientationValue = nativeFrame || value[scope.orientation] || {};
  const showPanel = scope.mode === 'panel';
  const containerInsets = state.project.keyStyles?.buttonInsets?.keyboard26?.container || nativeFrame?.keyboardInsets || { top: 3, left: 4, bottom: 3, right: 4 };
  const frameKeys = scope.candidateState === 'expanded'
    ? ['preeditHeight', 'toolbarHeight', 'keyboardHeight']
    : ['preeditHeight', 'toolbarHeight', 'keyboardHeight'];
  return `
    <section class="group-card">
      <h3>${scope.orientation === 'landscape' ? '横屏高度' : '竖屏高度'}</h3>
      <div class="section-grid compact-field-grid two-column-field-grid">
        ${frameKeys.map((key) => input({
    path: `keyboardFrame.${scope.orientation}.${key}`,
    label: displayFieldLabel(key),
    value: orientationValue[key],
    type: 'number',
    step: '0.01',
  })).join('')}
      </div>
      ${nativeFrame ? '<p class="scope-note">当前显示的是 SkinEffectModel 解析后的实际高度；修改后会同步到预览和导出的 native payload。</p>' : ''}
      ${renderPreviewScopeNote()}
    </section>
    ${nativeFrame ? `<section class="group-card">
      <h3>原生区域边距</h3>
      <div class="section-grid compact-field-grid two-column-field-grid">
        ${renderInsetObject('keyStyles.buttonInsets.keyboard26.container', 'keyboardStyle.insets', containerInsets)}
      </div>
      <p class="scope-note">这里写入 project.json 的外层键盘边距，并由预览与导出共同解析。</p>
    </section>` : ''}
    ${showPanel ? `<section class="group-card">
      <h3>面板</h3>
      <div class="section-grid">
        ${input({ path: 'keyboardFrame.panel.cornerRadius', label: '圆角', value: value.panel?.cornerRadius, type: 'number', step: '0.1' })}
        ${renderPointEditor('keyboardFrame.panel.floatTargetScale.portrait', '竖屏浮动缩放', value.panel?.floatTargetScale?.portrait)}
        ${renderPointEditor('keyboardFrame.panel.floatTargetScale.landscape', '横屏浮动缩放', value.panel?.floatTargetScale?.landscape)}
      </div>
    </section>` : ''}
  `;
}

function renderPointEditor(path, label, point) {
  return `
    <section class="field-card point-editor-card">
      <label>${escapeHtml(label)}</label>
      <div class="xy-grid">
        ${input({ path: `${path}.x`, label: '横向 x', value: point?.x ?? '', type: 'number', step: '0.01' })}
        ${input({ path: `${path}.y`, label: '纵向 y', value: point?.y ?? '', type: 'number', step: '0.01' })}
      </div>
    </section>
  `;
}

function pointInputCard(path, label, point = {}, className = '') {
  return `
    <section class="field-card point-map-row ${escapeHtml(className)}">
      <label class="point-map-title">${escapeHtml(label)}</label>
      <div class="xy-grid point-map-xy-grid">
        ${input({ path: `${path}.x`, label: '横向 x', value: point?.x ?? '', type: 'number', step: '0.01' })}
        ${input({ path: `${path}.y`, label: '纵向 y', value: point?.y ?? '', type: 'number', step: '0.01' })}
      </div>
    </section>
  `;
}

function option(item, selectedValue) {
  const value = item?.value ?? '';
  const label = item?.label ?? value;
  const selectedLabel = item?.selectedLabel ?? label;
  const dropdownLabel = item?.dropdownLabel ?? label;
  const disabled = item?.disabled ? 'disabled' : '';
  const title = item?.title ? `title="${escapeHtml(item.title)}"` : '';
  return `<option value="${escapeHtml(value)}" data-selected-label="${escapeHtml(selectedLabel)}" data-dropdown-label="${escapeHtml(dropdownLabel)}" ${value === selectedValue ? 'selected' : ''} ${disabled} ${title}>${escapeHtml(selectedLabel)}</option>`;
}

function selectField(attrs = {}) {
  const {
    path,
    label,
    value,
    options = [],
    className = '',
    selectClassName = '',
  } = attrs;
  const id = `field-${Math.random().toString(36).slice(2)}`;
  return `
    <div class="field-card ${escapeHtml(className)}">
      <label for="${id}">${escapeHtml(label)}</label>
      <select id="${id}" class="${escapeHtml(selectClassName)}" data-path="${escapeHtml(path)}" data-type="text">
        ${options.map((item) => option(item, value)).join('')}
      </select>
    </div>
  `;
}

function syncSelectOptionLabels(select, expanded = false) {
  if (!select) return;
  [...select.options].forEach((item) => {
    const fallback = item.value || '';
    const label = expanded
      ? (item.dataset.dropdownLabel || item.dataset.selectedLabel || fallback)
      : (item.dataset.selectedLabel || item.dataset.dropdownLabel || fallback);
    item.textContent = label;
  });
}

function actionToFields(action) {
  if (typeof action === 'string') {
    const shortcutValue = normalizeLegacyShortcutValue(action);
    return {
      type: STANDARD_ACTION_VALUES.includes(action) ? 'action' : 'shortcut',
      value: STANDARD_ACTION_VALUES.includes(action) ? action : shortcutValue,
    };
  }
  if (!action || typeof action !== 'object') return { type: 'shortcut', value: '' };
  if (typeof action.action === 'string') {
    return actionToFields(action.action);
  }
  if (action.action && typeof action.action === 'object' && !Array.isArray(action.action)) {
    const nested = actionToFields(action.action);
    if (nested.type !== 'character' || nested.value !== '' || Object.keys(action.action).length) return nested;
  }
  const realAction = Object.entries(action).find(([key]) => !['action', 'actionType', 'actionValue', 'actionKeyboardSelection', 'presetValue'].includes(key));
  if (realAction) {
    const [type, value] = realAction;
    return {
      type: displayActionTypeKey(type),
      value: type === 'combine' && Array.isArray(value)
        ? value
        : normalizeActionFieldValue(type, value),
    };
  }
  if (
    (typeof action.actionType === 'string' && action.actionType)
    || action.actionValue !== undefined
    || action.actionKeyboardSelection !== undefined
  ) {
    return {
      type: typeof action.actionType === 'string' && action.actionType
        ? displayActionTypeKey(action.actionType)
        : 'shortcut',
      value: action.actionValue !== undefined && action.actionValue !== null
        ? normalizeActionFieldValue(action.actionType || 'shortcut', action.actionValue)
        : '',
    };
  }
  return { type: 'shortcut', value: '' };
}

function swipeDisplayLabel(entry = {}) {
  const label = entry?.label || {};
  if (label.systemImageName) return { type: 'systemImageName', value: label.systemImageName };
  if (label.text !== undefined) return { type: 'text', value: String(label.text) };
  const action = actionToFields(entry?.action);
  if (!action?.value) return { type: 'text', value: '' };
  if (action.type === 'character' || action.type === 'symbol') return { type: 'text', value: String(action.value) };
  if (action.type === 'action' && action.value === 'tab') return { type: 'text', value: 'tab' };
  if (action.type === 'shortcut') {
    const shortcutLabels = {
      '#selectText': 'select',
      '#cut': 'cut',
      '#copy': 'copy',
      '#paste': 'paste',
      '#行首': 'home',
      '#行尾': 'end',
    };
    return { type: 'text', value: shortcutLabels[action.value] || '' };
  }
  return { type: 'text', value: '' };
}

function normalizeLegacyShortcutValue(value) {
  const text = String(value ?? '').trim();
  return LEGACY_SHORTCUT_VALUE_MAP[text] || text;
}

function normalizeActionFieldValue(type, value) {
  if (value === undefined || value === null) return '';
  const normalizedType = displayActionTypeKey(type);
  if (normalizedType === 'shortcut') return normalizeLegacyShortcutValue(value);
  return String(value);
}

function actionValueSuggestions(type) {
  const normalizedType = displayActionTypeKey(type);
  return {
    action: STANDARD_ACTION_VALUES,
    keyboardType: KEYBOARD_TYPE_VALUES,
    shortcut: SHORTCUT_VALUES,
  }[normalizedType] || [];
}

function toolbarActionValueSuggestions(type) {
  const displayType = displayActionTypeKey(type);
  return TOOLBAR_ACTION_VALUE_SUGGESTIONS[displayType] || actionValueSuggestions(displayType);
}

function normalizedActionValueForType(type, value, { toolbar = false } = {}) {
  const normalizedType = displayActionTypeKey(type);
  let text = normalizedType === 'shortcut'
    ? normalizeLegacyShortcutValue(value)
    : String(value || '').trim();
  if (!text && Object.prototype.hasOwnProperty.call(DEFAULT_ACTION_VALUE_BY_TYPE, normalizedType)) {
    text = DEFAULT_ACTION_VALUE_BY_TYPE[normalizedType];
  }
  if (!text) return '';
  const suggestions = toolbar ? toolbarActionValueSuggestions(normalizedType) : actionValueSuggestions(normalizedType);
  if (FREE_TEXT_ACTION_TYPES.has(normalizedType)) return text;
  if (!['action', 'keyboardType', 'shortcut'].includes(normalizedType)) return text;
  if (suggestions.includes(text)) return text;
  if (Object.prototype.hasOwnProperty.call(DEFAULT_ACTION_VALUE_BY_TYPE, normalizedType)) {
    return DEFAULT_ACTION_VALUE_BY_TYPE[normalizedType];
  }
  return '';
}

function toolbarActionPresetValue(type, value) {
  return TOOLBAR_ACTION_PRESETS.find((item) => item.type === type && item.value === value)
    ? toolbarActionPresetId(type, value)
    : '';
}

function toolbarActionPresetOptions() {
  return [
    { value: '', label: '手动输入' },
    ...TOOLBAR_ACTION_PRESETS.map((item) => ({
      value: toolbarActionPresetId(item.type, item.value),
      selectedLabel: item.label,
      dropdownLabel: `${item.label}（${item.type}: ${item.value}）`,
    })),
  ];
}

function combineActionItems(action) {
  return action?.type === 'combine' && Array.isArray(action.value) ? action.value : [];
}

function combineActionEditor({ basePath, action, toolbar = false, types = ACTION_TYPES }) {
  if (action.type !== 'combine') return '';
  const items = combineActionItems(action);
  const childTypes = types.filter((type) => type !== 'combine');
  return `
    <div class="combine-action-editor" data-combine-base-path="${escapeHtml(basePath)}" data-combine-toolbar="${toolbar ? 'true' : 'false'}">
      <div class="combine-action-list">
        ${items.map((item, index) => {
    const fields = actionToFields(item);
    return `
          <div class="combine-action-row">
            <span class="combine-action-index">${index + 1}</span>
            ${selectField({
      path: `${basePath}.combine.${index}.actionType`,
      label: '动作',
      value: fields.type,
      className: 'combine-action-type-field',
      selectClassName: 'action-type-select',
      options: childTypes.map((type) => actionTypeOption(type)),
    })}
            ${actionValueField({ basePath: `${basePath}.combine.${index}`, action: fields, toolbar })}
            <div class="combine-action-buttons">
              <button class="mini-button" type="button" data-combine-action="up" data-base-path="${escapeHtml(basePath)}" data-index="${index}" ${index === 0 ? 'disabled' : ''}>上移</button>
              <button class="mini-button" type="button" data-combine-action="down" data-base-path="${escapeHtml(basePath)}" data-index="${index}" ${index === items.length - 1 ? 'disabled' : ''}>下移</button>
              <button class="mini-button danger" type="button" data-combine-action="remove" data-base-path="${escapeHtml(basePath)}" data-index="${index}">删除</button>
            </div>
          </div>
        `;
  }).join('')}
      </div>
      <button class="mini-button row-add-button" type="button" data-combine-action="add" data-base-path="${escapeHtml(basePath)}"><span aria-hidden="true">＋</span>添加动作</button>
    </div>
  `;
}

function suppressKeyEditorAutoClose(duration = 250) {
  state.suppressKeyEditorAutoCloseUntil = Date.now() + duration;
}

function buildAction(type, value) {
  if (!value) return {};
  if (type === 'raw') return value;
  const normalizedType = displayActionTypeKey(type);
  if (normalizedType === 'combine') return { combine: Array.isArray(value) ? value : [] };
  if (normalizedType === 'action') return value;
  if (normalizedType === 'shortcut') return { shortcut: value };
  return { [normalizedType]: value };
}

function buildObjectAction(type, value) {
  const normalizedType = displayActionTypeKey(type);
  if (normalizedType === 'action') return { action: value };
  return buildAction(normalizedType, value);
}

function buildToolbarAction(type, value) {
  return buildObjectAction(type, value);
}

function combineActionPath(basePath, toolbar = false) {
  return toolbar ? basePath : `${basePath}.action`;
}

function combineActionsForPath(basePath, toolbar = false) {
  const action = actionToFields(getPath(state.project, combineActionPath(basePath, toolbar)));
  return combineActionItems(action).map((item) => {
    const fields = actionToFields(item);
    return buildObjectAction(fields.type, fields.value);
  });
}

function setCombineActions(basePath, items, toolbar = false) {
  const nextAction = { combine: items };
  if (toolbar) {
    setPath(state.project, basePath, {
      ...nextAction,
      actionType: 'combine',
      actionValue: '',
    });
    return;
  }
  setPath(state.project, `${basePath}.action`, nextAction);
  setPath(state.project, `${basePath}.actionType`, 'combine');
  setPath(state.project, `${basePath}.actionValue`, '');
}

function updateActionState(basePath, nextType, nextValue, { toolbar = false } = {}) {
  const normalizedType = displayActionTypeKey(nextType);
  if (normalizedType === 'combine') {
    const current = actionToFields(toolbar ? getPath(state.project, basePath) : getPath(state.project, `${basePath}.action`));
    const combine = Array.isArray(current.value) && current.type === 'combine'
      ? current.value
      : [{ keyboardType: 'alphabetic' }, { switchRimeSchema: 'melt_eng' }];
    const nextAction = { combine };
    if (toolbar) {
      setPath(state.project, basePath, {
        ...nextAction,
        actionType: normalizedType,
        actionValue: '',
      });
    } else {
      setPath(state.project, `${basePath}.action`, nextAction);
      setPath(state.project, `${basePath}.actionType`, normalizedType);
      setPath(state.project, `${basePath}.actionValue`, '');
    }
    return '';
  }
  const normalizedValue = normalizedActionValueForType(normalizedType, nextValue, { toolbar });
  if (toolbar) {
    setPath(state.project, basePath, {
      ...buildToolbarAction(normalizedType, normalizedValue),
      actionType: normalizedType,
      actionValue: normalizedValue,
    });
    return normalizedValue;
  }
  setPath(state.project, `${basePath}.actionType`, normalizedType);
  setPath(state.project, `${basePath}.actionValue`, normalizedValue);
  setPath(state.project, `${basePath}.action`, buildAction(normalizedType, normalizedValue));
  return normalizedValue;
}

function updateCombineActionState(basePath, index, nextType, nextValue, { toolbar = false } = {}) {
  const items = combineActionsForPath(basePath, toolbar);
  const current = actionToFields(items[index] || {});
  const type = nextType || current.type || 'keyboardType';
  const value = normalizedActionValueForType(type, nextValue ?? current.value, { toolbar });
  items[index] = buildObjectAction(type, value);
  setCombineActions(basePath, items, toolbar);
}

function handleCombineAction(button) {
  const basePath = button.dataset.basePath || '';
  const toolbar = basePath.startsWith('toolbar.actions.');
  const items = combineActionsForPath(basePath, toolbar);
  const index = Number(button.dataset.index);
  if (button.dataset.combineAction === 'add') items.push({ keyboardType: 'alphabetic' });
  if (button.dataset.combineAction === 'remove' && Number.isInteger(index)) items.splice(index, 1);
  if (button.dataset.combineAction === 'up' && index > 0) [items[index - 1], items[index]] = [items[index], items[index - 1]];
  if (button.dataset.combineAction === 'down' && index < items.length - 1) [items[index + 1], items[index]] = [items[index], items[index + 1]];
  setCombineActions(basePath, items, toolbar);
  markDirty();
  renderProjectSummary();
  renderSaveState();
  renderCurrentPreview();
  renderEditor();
}

function labelToFields(label = {}) {
  if (label.systemImageName) return { type: 'systemImageName', value: label.systemImageName };
  return { type: 'text', value: label.text || '' };
}

function toolbarDisplayMode(key) {
  const configured = getPath(state.project, `toolbar.display.${key}.type`);
  if (configured === 'text' || configured === 'systemImageName') return configured;
  return DEFAULT_TOOLBAR_SYSTEM_IMAGES[key] ? 'systemImageName' : 'text';
}

function effectiveToolbarLayout(layout = Array.isArray(state.project?.toolbar?.layout) ? state.project.toolbar.layout : DEFAULT_TOOLBAR_BUTTONS) {
  const combo = effectiveKeyboardCombo();
  if (combo.toolbar?.enabled === false) return [];
  return (layout || []).filter((button) => {
    if (button === 'menu') return combo.slots.panel.source !== 'disabled' && combo.slots.panel.enabled !== false;
    if (button === 'symbol') return combo.slots.symbolic.source !== 'disabled' && combo.slots.symbolic.enabled !== false;
    if (button === 'emoji') return combo.slots.emoji.source !== 'disabled' && combo.slots.emoji.enabled !== false;
    return true;
  });
}

function toolbarSystemImageValue(key) {
  return getPath(state.project, `toolbar.display.${key}.systemImageName`) || DEFAULT_TOOLBAR_SYSTEM_IMAGES[key] || '';
}

function toolbarTextValue(key) {
  return getPath(state.project, `toolbar.text.${key}`) || key;
}

function toolbarLayoutTokenLabel(key) {
  if (!key) return '空';
  const displayType = toolbarDisplayMode(key);
  if (displayType === 'systemImageName') {
    return toolbarSystemImageValue(key) || keyCodeLabel(key);
  }
  return toolbarTextValue(key) || keyCodeLabel(key);
}

function toolbarLayoutTokenActionLabel(key) {
  if (!key) return '空：空';
  const action = actionToFields(getPath(state.project, `toolbar.actions.${key}`) || DEFAULT_TOOLBAR_ACTIONS[key]);
  const typeLabel = displayActionType(action.type) || keyCodeLabel(key);
  if (action.type === 'combine') {
    return `${typeLabel}：${combineActionItems(action).length} 个动作`;
  }
  const valueLabel = String(action.value || '').trim() || '未设置';
  return `${typeLabel}：${valueLabel}`;
}

function displayValueSuggestions(type) {
  return type === 'systemImageName' ? SYSTEM_IMAGE_SUGGESTIONS : [];
}

function displayValueField({ path, type, value, label = '显示内容' }) {
  return input({
    path,
    label,
    value,
    suggestions: displayValueSuggestions(type),
  });
}

function iconValueField({ path, type, value }) {
  if (type !== 'systemImageName') return '';
  return input({
    path,
    label: '图标',
    value,
    suggestions: displayValueSuggestions(type),
  });
}

function spanTwoField(fieldMarkup = '') {
  if (!fieldMarkup) return '';
  return fieldMarkup.replace('class="field-card', 'class="field-card key-edit-span-two');
}

function toolbarActionFields(key) {
  const action = actionToFields(getPath(state.project, `toolbar.actions.${key}`) || DEFAULT_TOOLBAR_ACTIONS[key]);
  return { type: action.type, value: action.value || '' };
}

function keyboard26FunctionActionFields(key) {
  const action = actionToFields(getPath(state.project, `keyboards.keyboard26.keyActions.${key}`));
  if (!action.value && DEFAULT_KEYBOARD26_FUNCTION_ACTIONS[key]) {
    return { ...DEFAULT_KEYBOARD26_FUNCTION_ACTIONS[key] };
  }
  return { type: action.type, value: action.value || '' };
}

function keyboard26FunctionActionFieldsForPath(basePath) {
  const key = basePath.split('.').pop();
  const action = actionToFields(getPath(state.project, `${basePath}.action`));
  const explicitType = getPath(state.project, `${basePath}.actionType`);
  const explicitValue = getPath(state.project, `${basePath}.actionValue`);
  if (explicitType) {
    return {
      type: explicitType,
      value: explicitValue !== undefined && explicitValue !== null ? String(explicitValue) : action.value || '',
    };
  }
  if (!action.value && key && DEFAULT_KEYBOARD26_FUNCTION_ACTIONS[key]) {
    return { ...DEFAULT_KEYBOARD26_FUNCTION_ACTIONS[key] };
  }
  return { type: action.type, value: action.value || '' };
}

function actionValueField({ basePath, action, toolbar = false, label = '指令内容' }) {
  const actionType = displayActionTypeKey(action.type);
  if (actionType === 'action') {
    return selectField({
      path: `${basePath}.actionValue`,
      label,
      value: action.value || 'space',
      className: 'action-type-field',
      selectClassName: 'action-type-select',
      options: STANDARD_ACTION_OPTIONS,
    });
  }
  if (actionType === 'keyboardType') {
    return selectField({
      path: `${basePath}.actionKeyboardSelection`,
      label,
      value: keyboardTypeActionValueToSelection(action.value),
      options: keyboardTypeActionOptions(),
      className: 'action-type-field',
      selectClassName: 'action-type-select',
    });
  }
  if (actionType === 'shortcut') {
    const suggestions = toolbar ? toolbarActionValueSuggestions(actionType) : actionValueSuggestions(actionType);
    return selectField({
      path: `${basePath}.actionValue`,
      label,
      value: action.value || '',
      className: 'action-type-field',
      selectClassName: 'action-type-select',
      options: suggestions.map((item) => ({
        value: item,
        selectedLabel: item,
        dropdownLabel: item,
      })),
    });
  }
  return input({
    path: `${basePath}.actionValue`,
    label,
    value: action.value || '',
    className: FREE_TEXT_ACTION_TYPES.has(actionType) ? 'action-type-field' : '',
    suggestions: FREE_TEXT_ACTION_TYPES.has(actionType)
      ? []
      : (toolbar ? toolbarActionValueSuggestions(actionType) : actionValueSuggestions(actionType)),
  });
}

function actionEditorFields({ basePath, action, types = ACTION_TYPES, toolbar = false }) {
  return `
    ${selectField({
    path: `${basePath}.actionType`,
    label: '指令类型',
    value: action.type,
    className: 'action-type-field',
    selectClassName: 'action-type-select',
    options: types.map((item) => actionTypeOption(item)),
  })}
    ${action.type === 'combine' ? combineActionEditor({ basePath, action, toolbar, types }) : actionValueField({ basePath, action, toolbar })}
  `;
}

function keyboard26EditorModeForKey(key) {
  const configured = getPath(state.project, `keyboards.keyboard26.keyEditorModes.${key}`);
  if (configured === 'character' || configured === 'function') return configured;
  return KEYBOARD26_FUNCTION_KEY_ORDER.includes(key) ? 'function' : 'character';
}

function keyboardTypeActionOptions() {
  return [
    { value: 'pinyin', selectedLabel: '拼音中文键盘', dropdownLabel: '拼音中文键盘（pinyin）' },
    { value: 'alphabetic', selectedLabel: '英文键盘', dropdownLabel: '英文键盘（alphabetic）' },
    { value: 'symbolic', selectedLabel: '符号键盘', dropdownLabel: '符号键盘（symbolic）' },
    { value: 'numeric', selectedLabel: '数字键盘', dropdownLabel: '数字键盘（numeric）' },
    { value: 'emojis', selectedLabel: 'Emoji 键盘', dropdownLabel: 'Emoji 键盘（emojis）' },
  ];
}

function keyboardTypeActionValueToSelection(value = '') {
  if (!value) return '';
  if (KEYBOARD_TYPE_VALUES.includes(value)) return value;
  if (value === 'emoji' || value.startsWith('emoji')) return 'emojis';
  if (value.startsWith('symbolic')) return 'symbolic';
  if (value.startsWith('numeric')) return 'numeric';
  if (value.startsWith('alphabetic')) return 'alphabetic';
  if (value.startsWith('pinyin')) return 'pinyin';
  return '';
}

function keyboardTypeSelectionToActionValue(selection = '') {
  return KEYBOARD_TYPE_VALUES.includes(selection) ? selection : '';
}

function allKeyboard26Keys(value) {
  return [...new Set(keyboard26PortraitRows(value).flatMap((row) => row.keys || []))];
}

function previewScopedPinyinVariant(mode = state.previewMode) {
  const source = previewSourceName(mode);
  const variant = source.startsWith('pinyin_') ? source.split('_')[1] : '';
  if (['9', '14', '17', '18', '26'].includes(variant)) return variant;
  const comboVariant = effectiveKeyboardCombo().slots.pinyin.variant;
  return ['9', '14', '17', '18', '26'].includes(comboVariant) ? comboVariant : '26';
}

function activePinyinVariant() {
  return previewScopedPinyinVariant();
}

function pinyinVariantKeyLabel(variant, key) {
  if (variant === '17' && PINYIN_VARIANT_LABELS[key]) return applyPinyinGuideLetterCase(PINYIN_VARIANT_LABELS[key]);
  if (['14', '18'].includes(variant) && /^[a-z]{2}$/.test(key)) return pinyinVariantLettersLabel(key);
  if (variant === '9') {
    const labels = {
      number1: '@/.',
      number2: applyPinyinGuideLetterCase('ABC'),
      number3: applyPinyinGuideLetterCase('DEF'),
      number4: applyPinyinGuideLetterCase('GHI'),
      number5: applyPinyinGuideLetterCase('JKL'),
      number6: applyPinyinGuideLetterCase('MNO'),
      number7: applyPinyinGuideLetterCase('PQRS'),
      number8: applyPinyinGuideLetterCase('TUV'),
      number9: applyPinyinGuideLetterCase('WXYZ'),
      number0: '0',
      symbol: '#+=',
    };
    if (labels[key]) return labels[key];
  }
  if (variant === '14' && key === 'word') return "'词";
  if (variant === '18' && key === 'word') return "'词";
  if (variant === '9' && key === 'reinput') return '重输';
  return null;
}

function keyboard26RowWithComboSpace(row = []) {
  return state.project?.keyboardCombo?.spaceRow?.semicolonKey?.enabled === true && row.includes('spaceRight')
    ? row.flatMap((key) => (key === 'spaceRight' ? ['semicolon', 'spaceRight'] : [key]))
    : row;
}

function normalizePinyin9Rows(rows = []) {
  if (!Array.isArray(rows)) return rows;
  const isLegacyShape = rows.length >= 3
    && Array.isArray(rows[0])
    && Array.isArray(rows[2])
    && rows[0][0] === 'punctuationColumn'
    && rows[0][1] === 'number2'
    && rows[2].includes('number0')
    && !rows[0].includes('number1');
  if (!isLegacyShape) return rows;
  return rows.map((row, rowIndex) => {
    if (!Array.isArray(row)) return row;
    if (rowIndex === 0) return ['punctuationColumn', 'number1', ...row.slice(1)];
    if (rowIndex === 2) return row.filter((key) => key !== 'number0');
    return [...row];
  });
}

function sameKeyRows(left, right) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
}

function ensureNormalizedPinyin9Rows(value, orientation, rows) {
  if (activePinyinVariant() !== '9' || !Array.isArray(rows)) return rows;
  const normalized = normalizePinyin9Rows(rows);
  if (normalized === rows || value !== state.project?.keyboards?.keyboard26) return normalized;
  const variantPath = `keyboards.keyboard26.variants.9.${orientation === 'landscape' ? 'landscapeRows' : 'portraitRows'}`;
  setPath(state.project, variantPath, normalized);
  return normalized;
}

function keyboard26VariantRows(value = {}, orientation = 'portrait') {
  const variant = activePinyinVariant();
  const variantData = value.variants?.[variant] || {};
  const portraitRows = variantData.portraitRows;
  const storedLandscapeRows = variantData.landscapeRows;
  const resolvedLandscapeRows = Array.isArray(storedLandscapeRows) && storedLandscapeRows.length
    ? (
      sameKeyRows(storedLandscapeRows, portraitRows) && Array.isArray(PINYIN_LANDSCAPE_VARIANT_ROWS[variant])
        ? PINYIN_LANDSCAPE_VARIANT_ROWS[variant]
        : storedLandscapeRows
    )
    : (PINYIN_LANDSCAPE_VARIANT_ROWS[variant] || portraitRows);
  const rows = orientation === 'landscape'
    ? resolvedLandscapeRows
    : portraitRows;
  if (Array.isArray(rows) && rows.length) {
    const normalizedRows = variant === '9' ? ensureNormalizedPinyin9Rows(value, orientation, rows) : rows;
    return normalizedRows.map((row) => keyboard26RowWithComboSpace(Array.isArray(row) ? row : []));
  }
  if (variant !== '26' && Array.isArray(PINYIN_VARIANT_ROWS[variant])) {
    return PINYIN_VARIANT_ROWS[variant].map((row) => keyboard26RowWithComboSpace(row));
  }
  return [];
}

function keyboard26RowsFromLegacyPortrait(portrait = {}) {
  return KEYBOARD26_ROW_ORDER.map((row, index) => ({
    id: `row-${index + 1}`,
    label: KEYBOARD26_ROW_LABELS[row] || `第 ${index + 1} 行`,
    keys: portrait[row] || [],
  }));
}

function keyboard26PortraitRows(value = {}) {
  const variant = activePinyinVariant();
  const variantRows = keyboard26VariantRows(value, 'portrait');
  if (variantRows.length) {
    return variantRows.map((keys, index) => ({
      id: `variant-${variant}-row-${index + 1}`,
      label: index === variantRows.length - 1 ? '底排' : `第 ${index + 1} 行`,
      keys,
    }));
  }
  const rows = value.layout?.portrait?.rows;
  if (Array.isArray(rows) && rows.length) {
    return rows.map((row, index) => ({
      id: row.id || `row-${index + 1}`,
      label: row.label || `第 ${index + 1} 行`,
      keys: Array.isArray(row.keys) ? row.keys : [],
    }));
  }
  return keyboard26RowsFromLegacyPortrait(value.layout?.portrait || {});
}

function keyboard26RowsPath() {
  const variant = activePinyinVariant();
  if (variant !== '26') return `keyboards.keyboard26.variants.${variant}.portraitRows`;
  return 'keyboards.keyboard26.layout.portrait.rows';
}

function keyboard26LandscapeRowsPath() {
  const variant = activePinyinVariant();
  if (variant !== '26') return `keyboards.keyboard26.variants.${variant}.landscapeRows`;
  return '';
}

function keyboard26UsesVariantRows() {
  return activePinyinVariant() !== '26';
}

function ensureKeyboard26PortraitRows() {
  const path = keyboard26RowsPath();
  const rows = getPath(state.project, path);
  if (Array.isArray(rows)) return rows;
  const current = getPath(state.project, 'keyboards.keyboard26') || {};
  const nextRows = keyboard26PortraitRows(current);
  setPath(state.project, path, nextRows);
  syncKeyboard26LegacyPortrait(nextRows);
  return nextRows;
}

function syncKeyboard26LegacyPortrait(rows = getPath(state.project, keyboard26RowsPath()) || []) {
  if (activePinyinVariant() !== '26') return;
  const portraitPath = 'keyboards.keyboard26.layout.portrait';
  KEYBOARD26_ROW_ORDER.forEach((rowName, index) => {
    setPath(state.project, `${portraitPath}.${rowName}`, rows[index]?.keys || []);
  });
}

function keyboard26RowPath(index) {
  return keyboard26UsesVariantRows()
    ? `${keyboard26RowsPath()}.${index}`
    : `${keyboard26RowsPath()}.${index}.keys`;
}

function keyboard26EditableRows() {
  return [...ensureKeyboard26PortraitRows()];
}

function emptyKeyboard26Row(nextIndex = 0) {
  if (keyboard26UsesVariantRows()) return [];
  return { id: `row-${Date.now()}-${nextIndex}`, label: `第 ${nextIndex + 1} 行`, keys: [] };
}

function keyDisplayValue(value, key) {
  const text = value.text || {};
  const profile = keyboard26PreviewProfile();
  const variantLabel = pinyinVariantKeyLabel(activePinyinVariant(), key);
  if (variantLabel) return variantLabel;
  if (/^[a-z]$/.test(key)) {
    if (profile === 'alphabetic') {
      return value.keyDisplays?.[`alphabetic.${key}`]
        || value.keyDisplays?.[`english.${key}`]
        || (guideState().preferences.alphabetic26LetterCase === 'upper' ? key.toUpperCase() : key);
    }
    return value.keyDisplays?.[key] || (guideState().preferences.pinyin26LetterCase === 'upper' ? key.toUpperCase() : key);
  }
  if (key === '123') return text.numericSwitch || '123';
  if (key === 'symbol') return text.symbol || '#+=';
  if (key === 'space') return text.space || '空格';
  if (key === 'spaceRight') return value.spaceRight?.[profile]?.primary?.text || value.spaceRight?.pinyin?.primary?.text || '，';
  if (key === 'enter') return text.enter?.default || '回车';
  return value.keyDisplays?.[key] || FUNCTION_KEY_LABELS[key] || key;
}

function keyboard26DisplayPath(key) {
  if (key === '123') return 'keyboards.keyboard26.text.numericSwitch';
  if (key === 'symbol') return 'keyboards.keyboard26.text.symbol';
  if (key === 'enter') return 'keyboards.keyboard26.text.enter.default';
  if (key === 'space') return activePinyinVariant() === '26' ? 'keyboards.keyboard26.text.space' : '';
  if (key === 'spaceRight') return `keyboards.keyboard26.spaceRight.${keyboard26PreviewProfile()}.primary.text`;
  if (key === 'cnen') return 'keyboards.keyboard26.keyDisplays.cnen';
  if (['backspace', 'punctuationColumn'].includes(key)) return '';
  if (/^[a-z]$/.test(key) && keyboard26PreviewProfile() === 'alphabetic') return '';
  return `keyboards.keyboard26.keyDisplays.${key}`;
}

function keyboard26MappedDisplayKeys(value = {}) {
  const scopeKeys = currentPreviewScope().mode === 'keyboard26'
    ? currentPreviewKeyboardKeys()
    : allKeyboard26Keys(value);
  return [...new Set(scopeKeys.filter((key) => keyboard26DisplayPath(key)))];
}

function renderEnterDisplayFields(textEnter = state.project?.keyboards?.keyboard26?.text?.enter || {}) {
  const entries = Object.entries(textEnter);
  if (!entries.length) return '';
  return `
    <div class="key-edit-subsection key-edit-span-two">
      <h5>回车状态显示</h5>
      <div class="key-edit-fields enter-display-fields">
        ${entries.map(([key, fieldValue]) => input({
    path: `keyboards.keyboard26.text.enter.${key}`,
    label: key,
    value: fieldValue,
  })).join('')}
      </div>
    </div>
  `;
}

function closeIconButton(attrs = '', title = '移除', extraClass = '') {
  return `
    <button class="icon-button danger icon-only ${escapeHtml(extraClass)}" type="button" ${attrs} title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
      <span aria-hidden="true">×</span>
    </button>
  `;
}

function removeRowButton(attrs = '', title = '移除这一行') {
  return closeIconButton(`${attrs} data-confirm-row-remove="true"`, title);
}

function visualKeyTokenLabel(path = '', key = '') {
  if (!key) return '空';
  if (path.startsWith('toolbar.layout.')) return toolbarLayoutTokenLabel(key);
  if (path.startsWith('keyboards.numeric.layout.')) return numericDisplayValue(state.project.keyboards?.numeric || {}, key);
  if (path.startsWith('keyboards.symbolic.layout.')) return symbolicDisplayValue(state.project.keyboards?.symbolic || {}, key);
  if (path.startsWith('keyboards.panel.')) {
    return metricKeyLabel('panel', state.project.keyboards?.panel || {}, key);
  }
  if (path.startsWith('keyboards.emoji.layout.')) return keyCodeLabel(key);
  if (path.startsWith('keyboards.keyboard26.')) {
    return keyDisplayValue(state.project.keyboards?.keyboard26 || {}, key);
  }
  return keyCodeLabel(key);
}

function renderVisualKeyToken(path, key, removeAttrs = '', dragAttrs = '', editPath = path) {
  const isToolbarToken = path.startsWith('toolbar.layout.');
  const label = visualKeyTokenLabel(path, key);
  const actionLabel = isToolbarToken ? toolbarLayoutTokenActionLabel(key) : '';
  const tokenLabel = isToolbarToken && actionLabel ? actionLabel : label;
  const active = state.editingKey?.path === editPath ? ' is-active' : '';
  return `
    <div class="key-token-editor swipe-token is-visual-token${active}" ${dragAttrs} data-key-edit-path="${escapeHtml(editPath)}" data-key-value="${escapeHtml(key)}">
      <span class="drag-handle" aria-hidden="true">⋮⋮</span>
      <button class="key-token-main" type="button" title="编辑 ${escapeHtml(tokenLabel)}">
        <span class="swipe-key">${escapeHtml(tokenLabel)}</span>
      </button>
      ${removeAttrs ? closeIconButton(removeAttrs, '移除按键') : ''}
    </div>
  `;
}

function keyboard26PunctuationColumnPath() {
  return `keyboards.keyboard26.variants.${activePinyinVariant()}.punctuationColumn`;
}

function keyboard26PunctuationColumnItems() {
  const configured = getPath(state.project, `${keyboard26PunctuationColumnPath()}.items`);
  const source = Array.isArray(configured) ? configured : DEFAULT_PINYIN9_PUNCTUATION_ITEMS;
  const items = source.slice(0, DEFAULT_PINYIN9_PUNCTUATION_ITEMS.length);
  while (items.length < DEFAULT_PINYIN9_PUNCTUATION_ITEMS.length) {
    items.push(DEFAULT_PINYIN9_PUNCTUATION_ITEMS[items.length]);
  }
  return items;
}

function punctuationColumnInputValue() {
  return keyboard26PunctuationColumnItems().join(' ');
}

function parsePunctuationColumnInput(value = '') {
  const text = String(value || '').trim();
  if (!text) return [...DEFAULT_PINYIN9_PUNCTUATION_ITEMS];
  const tokens = /\s/.test(text)
    ? text.split(/\s+/).map((item) => item.trim()).filter(Boolean)
    : Array.from(text).filter((char) => char.trim());
  const items = tokens.slice(0, DEFAULT_PINYIN9_PUNCTUATION_ITEMS.length);
  while (items.length < DEFAULT_PINYIN9_PUNCTUATION_ITEMS.length) {
    items.push(DEFAULT_PINYIN9_PUNCTUATION_ITEMS[items.length]);
  }
  return items;
}

function collectionEntryLabels(entries = []) {
  if (!Array.isArray(entries)) return [];
  return entries.map((item) => {
    if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
    if (item?.label !== undefined) return String(item.label).trim();
    if (item?.text !== undefined) return String(item.text).trim();
    if (item?.value !== undefined) return String(item.value).trim();
    return '';
  }).filter(Boolean);
}

function normalizedPinyin9CollectionItems(entries = []) {
  const items = collectionEntryLabels(entries).slice(0, DEFAULT_PINYIN9_PUNCTUATION_ITEMS.length);
  while (items.length < DEFAULT_PINYIN9_PUNCTUATION_ITEMS.length) {
    items.push(DEFAULT_PINYIN9_PUNCTUATION_ITEMS[items.length]);
  }
  return items;
}

function syncCollectionDerivedFields(project, source = 'auto') {
  if (!project) return;
  project.data = project.data || {};
  project.data.collections = project.data.collections || {};
  project.keyboards = project.keyboards || {};
  project.keyboards.numeric = project.keyboards.numeric || {};
  project.keyboards.keyboard26 = project.keyboards.keyboard26 || {};
  project.keyboards.keyboard26.variants = project.keyboards.keyboard26.variants || {};
  project.keyboards.keyboard26.variants['9'] = project.keyboards.keyboard26.variants['9'] || {};
  project.keyboards.keyboard26.variants['9'].punctuationColumn = project.keyboards.keyboard26.variants['9'].punctuationColumn || {};

  const numericFromCollections = collectionEntryLabels(project.data.collections.numericSymbols);
  const numericFromKeyboard = collectionEntryLabels(project.keyboards.numeric.collectionSymbols);
  const numericSymbols = source === 'numericKeyboard'
    ? (numericFromKeyboard.length ? numericFromKeyboard : (numericFromCollections.length ? numericFromCollections : deepClone(DEFAULT_NUMERIC_SYMBOLS)))
    : source === 'collections'
      ? (numericFromCollections.length ? numericFromCollections : (numericFromKeyboard.length ? numericFromKeyboard : deepClone(DEFAULT_NUMERIC_SYMBOLS)))
      : (numericFromCollections.length ? numericFromCollections : (numericFromKeyboard.length ? numericFromKeyboard : deepClone(DEFAULT_NUMERIC_SYMBOLS)));
  project.keyboards.numeric.collectionSymbols = deepClone(numericSymbols);
  if (source === 'numericKeyboard') {
    project.data.collections.numericSymbols = deepClone(numericSymbols);
  } else if (!Array.isArray(project.data.collections.numericSymbols) || !project.data.collections.numericSymbols.length) {
    project.data.collections.numericSymbols = deepClone(numericSymbols);
  }

  const pinyin9FromCollections = normalizedPinyin9CollectionItems(project.data.collections.pinyin9Symbols);
  const pinyin9FromKeyboard = normalizedPinyin9CollectionItems(project.keyboards.keyboard26.variants['9'].punctuationColumn.items || []);
  const pinyin9Items = source === 'pinyin9Keyboard'
    ? pinyin9FromKeyboard
    : source === 'collections'
      ? pinyin9FromCollections
      : (Array.isArray(project.data.collections.pinyin9Symbols) && project.data.collections.pinyin9Symbols.length ? pinyin9FromCollections : pinyin9FromKeyboard);
  project.keyboards.keyboard26.variants['9'].punctuationColumn.items = deepClone(pinyin9Items);
  if (source === 'pinyin9Keyboard') {
    project.data.collections.pinyin9Symbols = deepClone(pinyin9Items.map((item) => ({ label: item, value: item })));
  } else if (!Array.isArray(project.data.collections.pinyin9Symbols) || !project.data.collections.pinyin9Symbols.length) {
    project.data.collections.pinyin9Symbols = deepClone(pinyin9Items.map((item) => ({ label: item, value: item })));
  }
}

function keyboard26SpecialLayoutGroups(value = {}) {
  if (activePinyinVariant() !== '9') return [];
  return KEYBOARD26_SPECIAL_LAYOUT_KEYS.map((key) => ({
    id: key,
    title: FUNCTION_KEY_LABELS[key] || key,
    occurrences: keyboard26PortraitRows(value)
      .flatMap((row, rowIndex) => (row.keys || [])
        .map((item, keyIndex) => (item === key ? { rowIndex, keyIndex } : null))
        .filter(Boolean)),
    editPath: key === 'punctuationColumn' ? keyboard26PunctuationColumnPath() : '',
  }));
}

function renderKeyboard26RowEditor(row, rowIndex) {
  const keyEntries = activePinyinVariant() === '9'
    ? (row.keys || [])
      .map((key, index) => ({ key, index }))
      .filter(({ key }) => !KEYBOARD26_SPECIAL_LAYOUT_KEYS.includes(key))
    : (row.keys || []).map((key, index) => ({ key, index }));
  const rowPath = keyboard26RowPath(rowIndex);
  return `
    <section class="field-card key-row-card" draggable="true" data-drag-row-path="${escapeHtml(keyboard26RowsPath())}" data-drag-row-index="${rowIndex}">
      <div class="field-card-title row-heading">
        <span class="row-title">第 ${rowIndex + 1} 行</span>
        <button class="mini-button row-add-button" type="button" data-keyboard-action="add-portrait-key" data-row-index="${rowIndex}"><span aria-hidden="true">＋</span>添加按键</button>
        ${removeRowButton(`data-keyboard-action="remove-portrait-row" data-index="${rowIndex}"`, '移除这一行')}
      </div>
      <div class="key-token-list">
        ${keyEntries.map(({ key, index }) => renderVisualKeyToken(
    `${rowPath}.${index}`,
    key,
    `data-keyboard-action="remove-portrait-key" data-row-index="${rowIndex}" data-index="${index}"`,
    `draggable="true" data-drag-path="${rowPath}" data-drag-index="${index}"`,
  )).join('') || '<p class="empty-note">这一行暂无按键。</p>'}
      </div>
      ${renderInlineKeyEditPanel(rowPath)}
    </section>
  `;
}

function renderKeyboard26VisualLayout(value) {
  const rows = keyboard26PortraitRows(value);
  const specialGroups = keyboard26SpecialLayoutGroups(value);
  return `
    <div class="key-row-list visual-layout-editor">
      ${rows.map((row, index) => renderKeyboard26RowEditor(row, index)).join('')}
    </div>
    ${specialGroups.map((group) => `
      <section class="group-card special-layout-group">
        <div class="layout-toolbar">
          <div>
            <h3>${escapeHtml(group.title)}</h3>
          </div>
        </div>
        <div class="key-row-list">
          <div class="field-card key-row-card special-layout-card">
            <div class="field-card-title row-heading">
              <span>${group.occurrences.length ? '关联符号列表' : '标点列未放入布局'}</span>
            </div>
            <div class="key-token-list">
              ${group.occurrences.length
      ? renderVisualKeyToken(group.editPath, group.id, '', '', group.editPath)
      : '<p class="empty-note">这一组暂无按键。</p>'}
            </div>
            ${renderInlineKeyEditPanel(group.editPath)}
          </div>
        </div>
      </section>
    `).join('')}
  `;
}

function renderKeyboard26LayoutWorkspace(value) {
  const orientation = currentPreviewScope().orientation === 'landscape' ? 'landscape' : 'portrait';
  const landscape = value.layout?.landscape || value.landscape || {};
  const rows = keyboard26PortraitRows(value.layout ? value : { layout: value });
  const landscapeRows = keyboard26VariantRows(value.layout ? value : { layout: value, variants: value.variants }, 'landscape');
  const landscapePath = keyboard26LandscapeRowsPath();
  const toolbarSection = orientation === 'portrait' ? renderToolbar(state.project.toolbar || {}) : '';
  return `
    <section class="group-card">
      <div class="layout-toolbar">
        <div>
          <h3>布局编辑</h3>
        </div>
        <div class="layout-actions">
          ${orientation === 'portrait'
    ? `<label class="row-count-control">行数
        <input data-path="keyboards.keyboard26.layout.portrait.rowCount" data-type="number" type="number" min="1" max="8" step="1" value="${rows.length}">
      </label>
      <button class="tool-button primary" type="button" data-keyboard-action="add-portrait-row"><span aria-hidden="true">＋</span>添加一行</button>`
    : ''}
        </div>
      </div>
      ${toolbarSection}
      ${orientation === 'portrait'
    ? renderKeyboard26VisualLayout(value.layout ? value : { layout: value })
    : activePinyinVariant() !== '26'
      ? renderRowListEditor({
        title: '横屏布局',
        path: landscapePath,
        rows: landscapeRows,
        rowLabel: '行',
        actionPrefix: 'keyboard26-landscape-variant',
      })
      : `<section class="field-card landscape-editor-card">
        <label>横屏布局</label>
        ${renderKeyboard26LandscapeEditor(landscape)}
      </section>`}
    </section>
  `;
}

function renderSurfaceLeaf(path, label, value = {}) {
  return `
    <section class="field-card">
      <label>${escapeHtml(label)}</label>
      <div class="edge-grid">
        ${input({ path: `${path}.cornerRadius`, label: '圆角', value: value.cornerRadius ?? '', type: 'number', step: '0.1' })}
        ${input({ path: `${path}.borderSize`, label: '边框宽度', value: value.borderSize ?? '', type: 'number', step: '0.1' })}
        ${input({ path: `${path}.shadowRadius`, label: '阴影模糊', value: value.shadowRadius ?? '', type: 'number', step: '0.1' })}
        ${input({ path: `${path}.shadowOpacity`, label: '阴影强度', value: value.shadowOpacity ?? '', type: 'number', step: '0.01', min: '0', max: '1' })}
      </div>
      <div class="xy-grid">
        ${input({ path: `${path}.shadowOffset.x`, label: '阴影 x', value: value.shadowOffset?.x ?? '', type: 'number', step: '0.1' })}
        ${input({ path: `${path}.shadowOffset.y`, label: '阴影 y', value: value.shadowOffset?.y ?? '', type: 'number', step: '0.1' })}
      </div>
    </section>
  `;
}

function surfaceEntriesForScope(value = {}) {
  const scope = currentPreviewScope();
  const groups = uniqueValues([
    ...(scope.keyboardVisible ? (PREVIEW_SURFACE_SCOPE[scope.mode] || []) : []),
    ...(PREVIEW_SURFACE_SCOPE[scope.candidateState] || []),
  ]).filter((group) => groupVisibleByFeature(group));
  return groups.map((group) => [group, value?.[group] || {}]);
}

function renderSurfaceStyles(value = {}, basePath = activeModule().path) {
  const entries = surfaceEntriesForScope(value);
  return `
    ${entries.map(([group, items]) => `
      <section class="group-card">
        <h3>${escapeHtml(SURFACE_GROUP_LABELS[group] || group)}</h3>
        <div class="inset-regular-grid">
          ${Object.entries(items || {}).map(([key, item]) => renderSurfaceLeaf(
            `${basePath}.${group}.${key}`,
            SURFACE_ITEM_LABELS[key] || key,
            item,
          )).join('')}
        </div>
      </section>
    `).join('') || renderScopedEmptyNote()}
    ${renderPreviewScopeNote()}
  `;
}

function renderKeyboard26LandscapeEditor(landscape = {}) {
  return Object.entries(landscape).map(([section, rows]) => `
    <section class="field-card">
      <label>${escapeHtml(LANDSCAPE_SECTION_LABELS[section] || section)}</label>
      <div class="key-row-list">
        ${(rows || []).map((keys, index) => `
          <div class="compact-row-editor key-row-card">
            <div class="field-card-title">
              <span>第 ${index + 1} 行</span>
              ${removeRowButton(`data-keyboard-action="remove-landscape-row" data-section="${escapeHtml(section)}" data-index="${index}"`, '移除这一行')}
            </div>
            <div class="key-token-list">
              ${(keys || []).map((key, keyIndex) => renderVisualKeyToken(
    `keyboards.keyboard26.layout.landscape.${section}.${index}.${keyIndex}`,
    key,
    `data-keyboard-action="remove-landscape-key" data-section="${escapeHtml(section)}" data-row-index="${index}" data-index="${keyIndex}"`,
    `draggable="true" data-drag-path="keyboards.keyboard26.layout.landscape.${section}.${index}" data-drag-index="${keyIndex}"`,
  )).join('') || '<p class="empty-note">这一行暂无按键。</p>'}
            </div>
            <div class="key-action-row">
              <button class="mini-button" type="button" data-keyboard-action="add-landscape-key" data-section="${escapeHtml(section)}" data-row-index="${index}">添加按键</button>
            </div>
            ${renderInlineKeyEditPanel(`keyboards.keyboard26.layout.landscape.${section}.${index}`)}
          </div>
        `).join('') || '<p class="empty-note">暂无横屏行。</p>'}
      </div>
      <div class="key-action-row">
        <button class="mini-button" type="button" data-keyboard-action="add-landscape-row" data-section="${escapeHtml(section)}">添加一行</button>
      </div>
    </section>
  `).join('');
}

function keyEditFieldsForKey(key) {
  if (!state.editingKey) return '';
  const path = state.editingKey.path;
  if (path === keyboard26PunctuationColumnPath()) return punctuationColumnEditFields(path);
  const value = getPath(state.project, path) || key || '';
  if (path.startsWith('toolbar.layout.')) return toolbarButtonEditFields(path, value);
  if (path.startsWith('keyboards.numeric.layout.')) return numericKeyEditFields(path, value);
  if (path.startsWith('keyboards.symbolic.layout.')) return symbolicKeyEditFields(path, value);
  if (path.startsWith('keyboards.emoji.layout.')) return keyEditPanel('按键编辑', [
    input({ path, label: '文本', value }),
  ], path);
  if (value === 'spaceRight') return spaceRightKeyEditFields(path, value);
  const keyboard = state.project.keyboards?.keyboard26 || {};
  const displayPath = ['123', 'symbol', 'space', 'enter'].includes(value)
    ? {
      '123': 'keyboards.keyboard26.text.numericSwitch',
      symbol: 'keyboards.keyboard26.text.symbol',
      space: 'keyboards.keyboard26.text.space',
      enter: 'keyboards.keyboard26.text.enter.default',
    }[value]
    : `keyboards.keyboard26.keyDisplays.${value}`;
  const displayValue = getPath(state.project, displayPath) || keyDisplayValue(keyboard, value);
  const typePath = `keyboards.keyboard26.keyTypes.${value}`;
  const typeValue = getPath(state.project, typePath) || 'character';
  const editorModePath = `keyboards.keyboard26.keyEditorModes.${value}`;
  const editorModeValue = keyboard26EditorModeForKey(value);
  const displayTypePath = `keyboards.keyboard26.keyDisplayTypes.${value}`;
  const displayTypeValue = getPath(state.project, displayTypePath) || 'text';
  const action = keyboard26FunctionActionFields(value);
  const showSchemaNameOnSpace = state.project?.keyboardCombo?.spaceRow?.showSchemaNameOnSpace === true;
  const schemaNameField = ['space', 'enter'].includes(value)
    ? `
      ${selectField({
      path: 'keyboardCombo.spaceRow.showSchemaNameOnSpace',
      label: '空格显示方案名',
      value: showSchemaNameOnSpace ? 'true' : 'false',
      selectClassName: 'compact-enum-select',
      options: [
        { value: 'false', label: '不显示' },
        { value: 'true', label: '显示' },
      ],
    })}
      ${showSchemaNameOnSpace ? input({
      path: 'keyboards.keyboard26.pinyinSchemaName.text',
      label: '方案名内容',
      value: state.project?.keyboards?.keyboard26?.pinyinSchemaName?.text || DEFAULT_SCHEMA_NAME_TEXT,
    }) : ''}
    `
    : '';
  const modeField = selectField({
    path: editorModePath,
    label: '按键类型',
    value: editorModeValue,
    options: KEY_EDITOR_MODES,
  });
  const keyTypeField = selectField({
    path: typePath,
    label: '按键类型',
    value: typeValue,
    options: [
      { value: 'character', selectedLabel: 'character', dropdownLabel: 'character' },
      { value: 'symbol', selectedLabel: 'symbol', dropdownLabel: 'symbol' },
    ],
  });
  const functionActionFields = actionEditorFields({
    basePath: `keyboards.keyboard26.keyActions.${value}`,
    action,
    types: FUNCTION_KEY_ACTION_TYPES,
  });
  const showEnterDisplayFields = editorModeValue === 'function' && action.type === 'action' && action.value === 'enter';
  const baseSection = `
    <section class="key-edit-section">
      <h4>基础</h4>
      <div class="key-edit-fields key-edit-fields-four">
        ${modeField}
        ${editorModeValue === 'function' ? functionActionFields : keyTypeField}
        ${editorModeValue === 'function' ? '' : input({ path, label: '按键触发', value })}
      </div>
    </section>
  `;
  const displaySection = `
    <section class="key-edit-section">
      <h4>显示</h4>
      <div class="key-edit-fields key-edit-fields-four">
        ${selectField({
    path: displayTypePath,
    label: '显示类型',
    value: displayTypeValue,
    selectClassName: 'compact-enum-select',
    options: DISPLAY_TYPE_OPTIONS,
  })}
        ${displayTypeValue === 'systemImageName'
    ? ''
    : displayValueField({ path: displayPath, type: displayTypeValue, value: displayValue })}
        ${iconValueField({ path: displayPath, type: displayTypeValue, value: displayValue })}
        ${schemaNameField}
        ${showEnterDisplayFields ? renderEnterDisplayFields(keyboard.text?.enter || {}) : ''}
      </div>
    </section>
  `;
  return `
    <section class="group-card key-edit-panel" data-key-edit-panel-path="${escapeHtml(path)}">
      <div class="field-card-title">
        <h3>按键编辑</h3>
        ${closeIconButton('data-keyboard-action="close-key-editor"', '关闭编辑')}
      </div>
      ${baseSection}
      ${displaySection}
      <p class="key-edit-tip">具体指令效果请参考右上角元书输入法指南后的指令参考。</p>
      <span class="key-edit-focus-sentinel" tabindex="0" aria-hidden="true"></span>
    </section>
  `;
}

function swipeActionFields(profile, direction, key, title, options = {}) {
  const entryPath = `data.swipes.${profile}.${direction}.${key}`;
  const entry = getPath(state.project, entryPath) || {};
  const action = actionToFields(entry.action);
  const showLabelText = options.showLabelText !== false;
  return `
    <section class="field-card nested-field-card">
      <label>${escapeHtml(title)}</label>
      <div class="nested-field-grid">
        ${showLabelText ? input({ path: `${entryPath}.label.text`, label: '显示文字', value: entry.label?.text || '', className: 'swipe-label-field' }) : ''}
        ${actionEditorFields({ basePath: entryPath, action })}
      </div>
    </section>
  `;
}

function spaceRightKeyEditFields(path, value) {
  const profile = keyboard26PreviewProfile();
  const profileLabel = profile === 'alphabetic' ? '英文键盘' : '中文键盘';
  const action = keyboard26FunctionActionFields(value);
  const displayTypePath = `keyboards.keyboard26.keyDisplayTypes.${value}`;
  const displayTypeValue = getPath(state.project, displayTypePath) || 'text';
  const primaryPath = `keyboards.keyboard26.spaceRight.${profile}.primary.text`;
  const secondaryPath = `keyboards.keyboard26.spaceRight.${profile}.secondary.text`;
  return `
    <section class="group-card key-edit-panel space-right-edit-panel" data-key-edit-panel-path="${escapeHtml(path)}">
      <div class="field-card-title">
        <h3>按键编辑</h3>
        ${closeIconButton('data-keyboard-action="close-key-editor"', '关闭编辑')}
      </div>
      <section class="key-edit-section">
        <h4>基础</h4>
        <div class="key-edit-fields key-edit-fields-four">
          ${selectField({
    path: `keyboards.keyboard26.keyEditorModes.${value}`,
    label: '按键类型',
    value: keyboard26EditorModeForKey(value),
    options: KEY_EDITOR_MODES,
  })}
          ${actionEditorFields({ basePath: `keyboards.keyboard26.keyActions.${value}`, action, types: FUNCTION_KEY_ACTION_TYPES })}
        </div>
      </section>
      <section class="key-edit-section">
        <h4>${profileLabel}显示</h4>
        <div class="key-edit-fields key-edit-fields-four">
          ${selectField({
    path: displayTypePath,
    label: '显示类型',
    value: displayTypeValue,
    selectClassName: 'compact-enum-select',
    options: DISPLAY_TYPE_OPTIONS,
  })}
          ${displayTypeValue === 'systemImageName'
    ? ''
    : input({
      path: primaryPath,
      label: '点击显示',
      value: getPath(state.project, primaryPath) || '',
    })}
          ${iconValueField({ path: primaryPath, type: displayTypeValue, value: getPath(state.project, primaryPath) || '' })}
          ${input({
    path: secondaryPath,
    label: '上划显示',
    value: getPath(state.project, secondaryPath) || '',
  })}
        </div>
      </section>
      <section class="key-edit-section">
        <h4>${profileLabel}上划</h4>
        <div class="key-edit-fields key-edit-fields-four">
          ${swipeActionFields(profile, 'swipe_up', 'spaceRight', '上划指令', { showLabelText: false })}
        </div>
      </section>
      <span class="key-edit-focus-sentinel" tabindex="0" aria-hidden="true"></span>
    </section>
  `;
}

function keyEditPanel(title, fields, path = state.editingKey?.path || '') {
  return `
    <section class="group-card key-edit-panel" data-key-edit-panel-path="${escapeHtml(path)}">
      <div class="field-card-title">
        <h3>${escapeHtml(title)}</h3>
        ${closeIconButton('data-keyboard-action="close-key-editor"', '关闭编辑')}
      </div>
      <section class="key-edit-section">
        <h4>基础</h4>
        <div class="key-edit-fields">
          ${fields.join('')}
        </div>
      </section>
      <span class="key-edit-focus-sentinel" tabindex="0" aria-hidden="true"></span>
    </section>
  `;
}

function numericKeyEditFields(path, value) {
  const numeric = state.project.keyboards?.numeric || {};
  const textPath = ['symbol', 'return', 'period', 'equal', 'space', 'enter'].includes(value)
    ? `keyboards.numeric.text.${value}`
    : `keyboards.numeric.keyDisplays.${value}`;
  const displayValue = getPath(state.project, textPath) || numericDisplayValue(numeric, value);
  return keyEditPanel('按键编辑', [
    input({ path, label: '文本', value }),
    input({ path: textPath, label: '显示内容', value: displayValue }),
  ], path);
}

function symbolicKeyEditFields(path, value) {
  const symbolic = state.project.keyboards?.symbolic || {};
  const textPath = value === 'return'
    ? 'keyboards.symbolic.text.return'
    : `keyboards.symbolic.keyDisplays.${value}`;
  const displayValue = getPath(state.project, textPath) || symbolicDisplayValue(symbolic, value);
  return keyEditPanel('按键编辑', [
    input({ path, label: '文本', value }),
    input({ path: textPath, label: '显示内容', value: displayValue }),
  ], path);
}

function toolbarButtonEditFields(path, value) {
  const displayType = toolbarDisplayMode(value);
  const action = toolbarActionFields(value);
  const displayPath = displayType === 'systemImageName'
    ? `toolbar.display.${value}.systemImageName`
    : `toolbar.text.${value}`;
  const displayValue = displayType === 'systemImageName'
    ? toolbarSystemImageValue(value)
    : toolbarTextValue(value);
  const toolbarActionEditor = actionEditorFields({
    basePath: `toolbar.actions.${value}`,
    action,
    types: TOOLBAR_ACTION_TYPES,
    toolbar: true,
  });
  const toolbarDisplayTip = state.project?.keyboardCombo?.toolbar?.displayStyle === 'text'
    ? '<p class="key-edit-tip">当前工具栏显示风格为纯文字，右侧预览不会显示 systemImageName 图标。</p>'
    : '';
  return `
    <section class="group-card key-edit-panel" data-key-edit-panel-path="${escapeHtml(path)}">
      <div class="field-card-title">
        <h3>菜单编辑</h3>
        ${closeIconButton('data-keyboard-action="close-key-editor"', '关闭编辑')}
      </div>
      <div class="key-edit-fields key-edit-fields-four">
        ${selectField({
    path: `toolbar.display.${value}.type`,
    label: '按键类型',
    value: displayType,
        options: DISPLAY_TYPE_OPTIONS,
  })}
        ${displayValueField({ path: displayPath, type: displayType, value: displayValue })}
        ${iconValueField({ path: displayPath, type: displayType, value: displayValue })}
        ${toolbarActionEditor}
      </div>
      ${toolbarDisplayTip}
      <span class="key-edit-focus-sentinel" tabindex="0" aria-hidden="true"></span>
    </section>
  `;
}

function renderKeyEditPanel() {
  if (!state.editingKey) return '';
  return keyEditFieldsForKey(getPath(state.project, state.editingKey.path));
}

function renderInlineKeyEditPanel(parentPath) {
  if (!state.editingKey?.path) return '';
  if (state.editingKey.path !== parentPath && !state.editingKey.path.startsWith(`${parentPath}.`)) return '';
  return renderKeyEditPanel();
}

function punctuationColumnEditFields(path) {
  const field = input({
    path: `${path}.itemsText`,
    label: '符号列表',
    value: punctuationColumnInputValue(),
    placeholder: '例如：， 。 ？ ！',
  }).replace('class="field-card"', 'class="field-card key-edit-span-two punctuation-column-field"');
  return `
    <section class="group-card key-edit-panel punctuation-column-edit-panel" data-key-edit-panel-path="${escapeHtml(path)}">
      <div class="field-card-title">
        <h3>标点列编辑</h3>
        ${closeIconButton('data-keyboard-action="close-key-editor"', '关闭编辑')}
      </div>
      <div class="key-edit-fields">
        ${field}
      </div>
      <span class="key-edit-focus-sentinel" tabindex="0" aria-hidden="true"></span>
    </section>
  `;
}

function renderRowListEditor({ title, path, rows = [], rowLabel = '行', actionPrefix }) {
  return `
    <section class="group-card">
      <div class="layout-toolbar">
        <div>
          <h3>${escapeHtml(title)}</h3>
        </div>
        <div class="layout-actions">
          <button class="tool-button primary" type="button" data-layout-action="add-row" data-action-prefix="${escapeHtml(actionPrefix)}" data-path="${escapeHtml(path)}"><span aria-hidden="true">＋</span>添加${escapeHtml(rowLabel)}</button>
        </div>
      </div>
      <div class="key-row-list">
        ${(rows || []).map((keys, rowIndex) => `
          <div class="field-card key-row-card" draggable="true" data-drag-row-path="${escapeHtml(path)}" data-drag-row-index="${rowIndex}">
            <div class="field-card-title row-heading">
              <span>${escapeHtml(rowLabel)} ${rowIndex + 1}</span>
              <button class="mini-button row-add-button" type="button" data-layout-action="add-key" data-action-prefix="${escapeHtml(actionPrefix)}" data-path="${escapeHtml(path)}" data-row-index="${rowIndex}"><span aria-hidden="true">＋</span>添加按键</button>
              ${removeRowButton(`data-layout-action="remove-row" data-action-prefix="${escapeHtml(actionPrefix)}" data-path="${escapeHtml(path)}" data-index="${rowIndex}"`, `移除${rowLabel}`)}
            </div>
            <div class="key-token-list">
              ${(keys || []).map((key, keyIndex) => renderVisualKeyToken(
    `${path}.${rowIndex}.${keyIndex}`,
    key,
    `data-layout-action="remove-key" data-action-prefix="${escapeHtml(actionPrefix)}" data-path="${escapeHtml(path)}" data-row-index="${rowIndex}" data-index="${keyIndex}"`,
    `draggable="true" data-drag-path="${escapeHtml(`${path}.${rowIndex}`)}" data-drag-index="${keyIndex}"`,
  )).join('') || '<p class="empty-note">这一行暂无按键。</p>'}
            </div>
            ${renderInlineKeyEditPanel(`${path}.${rowIndex}`)}
          </div>
        `).join('') || '<p class="empty-note">暂无布局行。</p>'}
      </div>
    </section>
  `;
}

function collectLayoutKeys(rows = []) {
  return [...new Set((rows || []).flat().filter(Boolean))];
}

function collectMetricKeysForKeyboard(keyboardId, keyboard = {}) {
  if (keyboardId === 'keyboard26') {
    return [...new Set([
      ...keyboard26PortraitRows(keyboard).flatMap((row) => row.keys || []),
      ...Object.values(keyboard.layout?.landscape || {}).flatMap((rows) => (rows || []).flat()),
    ].filter(Boolean))];
  }

  if (keyboardId === 'numeric') {
    const columns = keyboard.layout?.portrait?.columns || DEFAULT_NUMERIC_COLUMNS;
    return collectLayoutKeys(columns);
  }

  if (keyboardId === 'symbolic') {
    const rows = keyboard.layout?.portrait?.functionRows || DEFAULT_SYMBOLIC_FUNCTION_ROWS;
    return collectLayoutKeys(rows);
  }

  if (keyboardId === 'panel') {
    const keys = PANEL_BUTTONS.map(([key]) => key).filter(Boolean);
    return keys.length ? [...new Set(keys)] : Object.keys(keyboard.text || {});
  }

  if (keyboardId === 'emoji') {
    return ['emojiCollection'];
  }

  const layouts = keyboard.layout && typeof keyboard.layout === 'object' ? Object.values(keyboard.layout) : [];
  const keys = layouts.flatMap((layout) => {
    if (Array.isArray(layout)) return layout.flat(Infinity);
    if (!layout || typeof layout !== 'object') return [];
    return Object.values(layout).flat(Infinity);
  }).filter((key) => typeof key === 'string');
  return [...new Set(keys.length ? keys : Object.keys(keyboard.text || keyboard.keyDisplays || {}))];
}

function metricKeyboardOptions(keyboards = {}) {
  return Object.entries(keyboards)
    .filter(([, keyboard]) => keyboard && typeof keyboard === 'object')
    .map(([id, keyboard]) => ({
      id,
      label: KEYBOARD_METRIC_LABELS[id] || id,
      keys: collectMetricKeysForKeyboard(id, keyboard),
    }))
    .filter((item) => item.keys.length || item.id === 'panel' || item.id === 'emoji');
}

function renderKeyMapping(title, keys, labels, valueForKey) {
  return `
    <section class="group-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="key-display-grid compact-field-grid">
        ${keys.map((key) => input({
    path: valueForKey(key).path,
    label: labels[key] || key,
    value: valueForKey(key).value,
  })).join('')}
      </div>
    </section>
  `;
}

function numericDisplayPath(key) {
  if (['symbol', 'return', 'period', 'equal', 'space', 'enter'].includes(key)) return `keyboards.numeric.text.${key}`;
  return `keyboards.numeric.keyDisplays.${key}`;
}

function numericDisplayValue(value, key) {
  const text = value.text || {};
  if (/^\d$/.test(key)) return value.keyDisplays?.[key] || key;
  return value.keyDisplays?.[key] || text[key] || NUMERIC_KEY_LABELS[key] || key;
}

function symbolicDisplayValue(value, key) {
  const text = value.text || {};
  if (key === 'return') return value.keyDisplays?.return || text.return || '返回';
  return value.keyDisplays?.[key] || SYMBOLIC_KEY_LABELS[key] || key;
}

function symbolicDisplayPath(key) {
  if (key === 'return') return 'keyboards.symbolic.text.return';
  return `keyboards.symbolic.keyDisplays.${key}`;
}

function metricKeyLabel(keyboardId, keyboard = {}, key) {
  if (key === 'normal') return '普通键';
  if (keyboardId === 'keyboard26') return keyDisplayValue(keyboard, key);
  if (keyboardId === 'numeric') return numericDisplayValue(keyboard, key);
  if (keyboardId === 'symbolic') return symbolicDisplayValue(keyboard, key);
  if (keyboardId === 'emoji') return 'Emoji 集合';
  if (keyboardId === 'panel') {
    const panelButton = PANEL_BUTTONS.find(([buttonKey]) => buttonKey === key);
    const textKey = panelButton?.[2];
    return keyboard.text?.[textKey] || keyboard.text?.[key] || key;
  }
  return keyboard.keyDisplays?.[key] || keyboard.text?.[key] || keyCodeLabel(key);
}

function renderNumericKeyboard(value) {
  const columns = value.layout?.portrait?.columns || [];
  const keys = collectLayoutKeys(columns);
  const mappedKeys = [...new Set(keys.filter((key) => key !== 'collection'))];
  return `
    ${renderRowListEditor({
    title: '竖屏数字键盘布局',
    path: 'keyboards.numeric.layout.portrait.columns',
    rows: columns,
    rowLabel: '列',
    actionPrefix: 'numeric-portrait',
  })}
    ${renderKeyMapping('数字和符号显示', mappedKeys, NUMERIC_KEY_LABELS, (key) => ({
    path: numericDisplayPath(key),
    value: numericDisplayValue(value, key),
  }))}
    <section class="group-card">
      <h3>符号集合</h3>
      <div class="compact-field-grid">
        ${input({ path: 'keyboards.numeric.collectionSymbols', label: '集合内容，逗号分隔', value: (value.collectionSymbols || []).join(', ') })}
      </div>
    </section>
  `;
}

function renderAnimation(value) {
  return Object.entries(value || {}).map(([key, config]) => `
    <section class="group-card">
      <h3>${escapeHtml(key)}</h3>
      <div class="section-grid">
        ${input({ path: `theme.shared.animation.${key}.animationType`, label: '动画类型', value: config.animationType })}
        ${input({ path: `theme.shared.animation.${key}.scale`, label: '缩放比例', value: config.scale, type: 'number', step: '0.01' })}
        ${input({ path: `theme.shared.animation.${key}.pressDuration`, label: '按下时长', value: config.pressDuration, type: 'number', step: '1' })}
        ${input({ path: `theme.shared.animation.${key}.releaseDuration`, label: '松开时长', value: config.releaseDuration, type: 'number', step: '1' })}
      </div>
    </section>
  `).join('');
}

function renderKeyboard26Text(value) {
  return `
    ${renderKeyboard26LayoutWorkspace(value)}
  `;
}

function renderSymbolic(value) {
  const functionRows = value.layout?.portrait?.functionRows || [];
  const functionKeys = [...new Set([...SYMBOLIC_FUNCTION_KEY_ORDER, ...collectLayoutKeys(functionRows)])];
  const categoryRows = value.layout?.portrait?.categoryRows || SYMBOLIC_SPECIAL_LAYOUT_GROUPS[0].defaultRows;
  return `
    ${renderRowListEditor({
    title: '左侧分类列表布局',
    path: 'keyboards.symbolic.layout.portrait.categoryRows',
    rows: categoryRows,
    rowLabel: '组',
    actionPrefix: 'symbolic-category',
  })}
    ${renderRowListEditor({
    title: '底部功能键布局',
    path: 'keyboards.symbolic.layout.portrait.functionRows',
    rows: functionRows,
    rowLabel: '行',
    actionPrefix: 'symbolic-function',
  })}
    ${renderKeyMapping('按键映射', functionKeys, SYMBOLIC_KEY_LABELS, (key) => ({
    path: symbolicDisplayPath(key),
    value: symbolicDisplayValue(value, key),
  }))}
    <section class="group-card">
      <h3>功能键文本</h3>
      <div class="section-grid compact-field-grid">
        ${input({ path: 'keyboards.symbolic.text.return', label: SYMBOLIC_KEY_LABELS.return, value: value.text?.return || '' })}
        ${functionKeys.filter((key) => key !== 'return').map((key) => input({
    path: `keyboards.symbolic.keyDisplays.${key}`,
    label: SYMBOLIC_KEY_LABELS[key] || key,
    value: value.keyDisplays?.[key] || '',
  })).join('')}
      </div>
    </section>
    <section class="group-card">
      <h3>滚动列表尺寸</h3>
      <div class="section-grid compact-field-grid">
        ${input({ path: 'keyboards.symbolic.layout.portrait.categoryCellHeight', label: '左侧分类项高度', value: value.layout?.portrait?.categoryCellHeight ?? 31, type: 'number', step: '1' })}
        ${input({ path: 'keyboards.symbolic.layout.portrait.descriptionCellHeight', label: '右侧符号项高度', value: value.layout?.portrait?.descriptionCellHeight ?? 28, type: 'number', step: '1' })}
      </div>
    </section>
    <section class="group-card">
      <h3>集合区源码</h3>
      ${renderJsonTextarea('keyboards.symbolic.collections', value.collections || {})}
    </section>
    <section class="group-card">
      <h3>布局源码</h3>
      ${renderJsonTextarea('keyboards.symbolic.layout', value.layout || {})}
    </section>
  `;
}

function renderToolbar(value) {
  const layout = effectiveToolbarLayout(Array.isArray(value.layout) ? value.layout : []);
  return `
    <section class="group-card">
      <div class="field-card-title row-heading">
        <span class="row-title">工具栏</span>
        <button class="mini-button row-add-button" type="button" data-toolbar-action="add-layout-button"><span aria-hidden="true">＋</span>添加按钮</button>
      </div>
      <div class="key-token-list toolbar-layout-list">
        ${layout.map((button, index) => renderVisualKeyToken(
    `toolbar.layout.${index}`,
    button,
    `data-toolbar-action="remove-layout-button" data-index="${index}"`,
    `draggable="true" data-drag-path="toolbar.layout" data-drag-index="${index}"`,
  )).join('') || '<p class="empty-note">暂无工具栏按钮。</p>'}
      </div>
      ${renderInlineKeyEditPanel('toolbar.layout')}
    </section>
  `;
}

function spaceKeyEditFields(path, value) {
  const keyboard = state.project.keyboards?.keyboard26 || {};
  const showSchemaNameOnSpace = state.project?.keyboardCombo?.spaceRow?.showSchemaNameOnSpace === true;
  return keyEditPanel('空格键', [
    input({ path, label: '按键触发', value }),
    input({
      path: 'keyboards.keyboard26.text.space',
      label: '空格显示',
      value: keyboard.text?.space || '空格',
    }),
    selectField({
      path: 'keyboardCombo.spaceRow.showSchemaNameOnSpace',
      label: '显示方案名',
      value: showSchemaNameOnSpace ? 'true' : 'false',
      options: [
        { value: 'false', label: '不显示' },
        { value: 'true', label: '显示' },
      ],
    }),
    showSchemaNameOnSpace ? input({
      path: 'keyboards.keyboard26.pinyinSchemaName.text',
      label: '方案名内容',
      value: state.project?.keyboards?.keyboard26?.pinyinSchemaName?.text || DEFAULT_SCHEMA_NAME_TEXT,
    }) : '',
  ], path);
}

function normalizedKeyboardCombo(value = {}) {
  const slots = value.slots || {};
  const swipeRootMode = value.swipeBehavior?.mode || 'disabled';
  const swipeFlag = (scope, key) => {
    const mode = scope?.mode || swipeRootMode;
    if (mode === 'disabled') return false;
    return scope?.[key] !== false;
  };
  return {
    inputStrategy: value.inputStrategy || 'separateAlphabetic',
    slots: {
      pinyin: { enabled: slots.pinyin?.enabled !== false, source: slots.pinyin?.source || 'custom', variant: slots.pinyin?.variant || '26' },
      alphabetic: { enabled: slots.alphabetic?.enabled !== false, source: slots.alphabetic?.source || 'custom', variant: slots.alphabetic?.variant || '26' },
      numeric: { enabled: slots.numeric?.enabled !== false, source: slots.numeric?.source || 'custom', variant: slots.numeric?.variant || '9' },
      symbolic: { enabled: slots.symbolic?.enabled !== false, source: slots.symbolic?.source || 'system', variant: slots.symbolic?.variant || 'system' },
      emoji: { enabled: slots.emoji?.enabled !== false, source: slots.emoji?.source || 'system', variant: slots.emoji?.variant || 'system' },
      panel: { enabled: slots.panel?.enabled !== false, source: slots.panel?.source || 'custom', variant: slots.panel?.variant || 'panel' },
    },
    toolbar: {
      enabled: value.toolbar?.enabled !== false,
      displayStyle: value.toolbar?.displayStyle || 'icon',
      allowCustomCount: value.toolbar?.allowCustomCount !== false,
    },
    swipeBehavior: {
      mode: swipeRootMode,
      showSwipeUp: swipeFlag(value.swipeBehavior, 'showSwipeUp'),
      showSwipeDown: swipeFlag(value.swipeBehavior, 'showSwipeDown'),
      ui: isPlainObject(value.swipeBehavior?.ui) ? structuredClone(value.swipeBehavior.ui) : {},
      layouts: {
        pinyin: {
          mode: value.swipeBehavior?.layouts?.pinyin?.mode || swipeRootMode,
          showSwipeUp: swipeFlag(value.swipeBehavior?.layouts?.pinyin, 'showSwipeUp'),
          showSwipeDown: swipeFlag(value.swipeBehavior?.layouts?.pinyin, 'showSwipeDown'),
        },
        alphabetic: {
          mode: value.swipeBehavior?.layouts?.alphabetic?.mode || swipeRootMode,
          showSwipeUp: swipeFlag(value.swipeBehavior?.layouts?.alphabetic, 'showSwipeUp'),
          showSwipeDown: swipeFlag(value.swipeBehavior?.layouts?.alphabetic, 'showSwipeDown'),
        },
        numeric: {
          mode: value.swipeBehavior?.layouts?.numeric?.mode || swipeRootMode,
          showSwipeUp: swipeFlag(value.swipeBehavior?.layouts?.numeric, 'showSwipeUp'),
          showSwipeDown: swipeFlag(value.swipeBehavior?.layouts?.numeric, 'showSwipeDown'),
        },
      },
    },
    spaceRow: {
      showSchemaNameOnSpace: value.spaceRow?.showSchemaNameOnSpace === true,
      commaKey: {
        enabled: value.spaceRow?.commaKey?.enabled !== false,
        swipeUp: value.spaceRow?.commaKey?.swipeUp || '。',
      },
      semicolonKey: {
        enabled: value.spaceRow?.semicolonKey?.enabled === true,
        swipeUpAction: value.spaceRow?.semicolonKey?.swipeUpAction || '#次选上屏',
      },
    },
  };
}

function guideFieldOptions() {
  return {
    keyboardPreset: GUIDE_KEYBOARD_PRESET_OPTIONS,
    pinyin26LetterCase: GUIDE_PINYIN26_LETTER_CASE_OPTIONS,
    alphabetic26LetterCase: GUIDE_ALPHABETIC26_LETTER_CASE_OPTIONS,
    englishLayout: GUIDE_ENGLISH_LAYOUT_OPTIONS,
    symbolLayout: GUIDE_SYMBOL_LAYOUT_OPTIONS,
    emojiLayout: GUIDE_EMOJI_LAYOUT_OPTIONS,
    swipeUpEnabled: GUIDE_BOOLEAN_OPTIONS,
    swipeDownEnabled: GUIDE_BOOLEAN_OPTIONS,
    swipeUpVisible: GUIDE_VISIBILITY_OPTIONS,
    swipeDownVisible: GUIDE_VISIBILITY_OPTIONS,
    defaultToolbarEnabled: GUIDE_BOOLEAN_OPTIONS,
  };
}

function renderGuideSwipeProfileFields(profile, fields) {
  const prefs = guideState().preferences;
  const upEnabledPath = `guide.preferences.${profile.prefix}UpEnabled`;
  const downEnabledPath = `guide.preferences.${profile.prefix}DownEnabled`;
  const upVisiblePath = `guide.preferences.${profile.prefix}UpVisible`;
  const downVisiblePath = `guide.preferences.${profile.prefix}DownVisible`;
  const upEnabled = prefs[`${profile.prefix}UpEnabled`] !== false;
  const downEnabled = prefs[`${profile.prefix}DownEnabled`] === true;
  return `
    <section class="field-card keyboard-combo-card">
      <h4>${profile.title}</h4>
      <div class="section-grid compact-field-grid">
        ${selectField({
    path: upEnabledPath,
    label: '上划功能',
    value: upEnabled ? 'true' : 'false',
    options: fields.swipeUpEnabled,
  })}
        ${upEnabled ? selectField({
    path: upVisiblePath,
    label: '上划显示',
    value: prefs[`${profile.prefix}UpVisible`] !== false ? 'true' : 'false',
    options: fields.swipeUpVisible,
  }) : ''}
        ${selectField({
    path: downEnabledPath,
    label: '下划功能',
    value: downEnabled ? 'true' : 'false',
    options: fields.swipeDownEnabled,
  })}
        ${downEnabled ? selectField({
    path: downVisiblePath,
    label: '下划显示',
    value: prefs[`${profile.prefix}DownVisible`] !== false ? 'true' : 'false',
    options: fields.swipeDownVisible,
  }) : ''}
      </div>
    </section>
  `;
}

function guideSpacebarKeyLabel(key) {
  return GUIDE_SPACEBAR_KEY_OPTIONS.find((item) => item.value === key)?.label || key;
}

function renderGuideSpacebarBuilder(guide = guideState()) {
  const selected = normalizeGuideSpacebarRow(guide.preferences.spacebarRow);
  const selectedSet = new Set(selected);
  const availableOptions = GUIDE_SPACEBAR_KEY_OPTIONS.filter((item) => !selectedSet.has(item.value));
  return `
    <section class="group-card guide-spacebar-card">
      <div class="field-card-title row-heading">
        <span class="row-title">空格行按键顺序</span>
        <span class="swipe-default-center">拖动上方按键调整顺序，点 × 移除；下方按键点一下就加入。空格和回车会固定保留。</span>
      </div>
      <div class="guide-spacebar-selected key-token-list" data-guide-space-drop-list="true">
        ${selected.map((key, index) => `
          <div class="key-token-editor is-visual-token guide-spacebar-token ${key === 'space' || key === 'enter' ? 'is-fixed' : ''}" draggable="true" data-drag-path="guide.preferences.spacebarRow" data-drag-index="${index}">
            <span class="drag-handle" aria-hidden="true">⋮⋮</span>
            <button class="key-token-main guide-spacebar-token-main" type="button" title="拖动调整 ${escapeHtml(guideSpacebarKeyLabel(key))} 的顺序">${escapeHtml(guideSpacebarKeyLabel(key))}</button>
            ${key === 'space' || key === 'enter' ? '<span class="guide-spacebar-required">必选</span>' : closeIconButton(`data-guide-space-action="remove" data-index="${index}"`, '移除按键')}
          </div>
        `).join('')}
      </div>
      <div class="guide-spacebar-pool">
        ${availableOptions.length ? availableOptions.map((item) => `
          <button
            type="button"
            class="guide-spacebar-option"
            draggable="true"
            data-guide-space-action="add"
            data-guide-space-drag-key="${escapeHtml(item.value)}"
            data-key="${escapeHtml(item.value)}"
          >${escapeHtml(item.label)}</button>
        `).join('') : '<span class="guide-spacebar-empty">可添加按键已全部加入</span>'}
      </div>
    </section>
  `;
}

function renderKeyboardCombo() {
  const guide = guideState();
  const fields = guideFieldOptions();
  const ready = guide.status === 'ready';
  return `
    <section class="group-card">
      <h3>键盘布局</h3>
      <div class="keyboard-combo-grid">
        <section class="field-card keyboard-combo-card">
          <h4>中文键盘</h4>
          <div class="section-grid compact-field-grid">
            ${selectField({
    path: 'guide.preferences.keyboardPreset',
    label: '中文布局',
    value: guide.preferences.keyboardPreset,
    options: fields.keyboardPreset,
  })}
            ${selectField({
    path: 'guide.preferences.pinyin26LetterCase',
    label: '26键字母',
    value: guide.preferences.pinyin26LetterCase,
    options: fields.pinyin26LetterCase,
  })}
          </div>
        </section>
        <section class="field-card keyboard-combo-card">
          <h4>英文键盘</h4>
          <div class="section-grid compact-field-grid">
            ${selectField({
    path: 'guide.preferences.englishLayout',
    label: '英文布局',
    value: guide.preferences.englishLayout,
    options: fields.englishLayout,
  })}
            ${selectField({
    path: 'guide.preferences.alphabetic26LetterCase',
    label: '26键字母',
    value: guide.preferences.alphabetic26LetterCase,
    options: fields.alphabetic26LetterCase,
  })}
          </div>
        </section>
        <section class="field-card keyboard-combo-card">
          <h4>Symbols 键盘</h4>
          <div class="section-grid compact-field-grid">
            ${selectField({
    path: 'guide.preferences.symbolLayout',
    label: '符号布局',
    value: guide.preferences.symbolLayout,
    options: fields.symbolLayout,
  })}
            ${selectField({
    path: 'guide.preferences.emojiLayout',
    label: 'Emoji 布局',
    value: guide.preferences.emojiLayout,
    options: fields.emojiLayout,
  })}
          </div>
        </section>
      </div>
    </section>
    <section class="group-card">
      <h3>输入行为</h3>
      <div class="keyboard-combo-grid">
        ${GUIDE_SWIPE_PROFILE_CONFIGS.map((profile) => renderGuideSwipeProfileFields(profile, fields)).join('')}
        <section class="field-card keyboard-combo-card">
          <h4>工具栏</h4>
          <div class="section-grid compact-field-grid">
            ${selectField({
    path: 'guide.preferences.defaultToolbarEnabled',
    label: '默认工具栏',
    value: guide.preferences.defaultToolbarEnabled ? 'true' : 'false',
    options: fields.defaultToolbarEnabled,
  })}
          </div>
        </section>
      </div>
    </section>
    ${renderGuideSpacebarBuilder(guide)}
    <section class="group-card guide-generate-card">
      <div class="guide-generate-summary">
        <p>${escapeHtml(guideSummaryText())}</p>
      </div>
      <button class="tool-button primary guide-generate-button" type="button" data-guide-action="generate">${ready ? '重新生成方案' : '生成我的键盘方案'}</button>
    </section>
  `;
}

function normalizeGuideSpacebarRow(value = GUIDE_DEFAULT_SPACEBAR_ROW) {
  const source = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((item) => item.trim());
  const next = [];
  const seen = new Set();
  for (const key of source) {
    if (!GUIDE_SPACEBAR_ALLOWED_KEYS.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(key);
  }
  if (!next.includes('space')) next.splice(Math.min(2, next.length), 0, 'space');
  if (!next.includes('enter')) next.push('enter');
  return next;
}

function mergeProjectPatch(target, patch) {
  if (!patch || typeof patch !== 'object') return target;
  for (const [key, value] of Object.entries(patch)) {
    if (Array.isArray(value)) {
      target[key] = deepClone(value);
      continue;
    }
    if (value && typeof value === 'object') {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
      mergeProjectPatch(target[key], value);
      continue;
    }
    target[key] = value;
  }
  return target;
}

function applyKeyboardSkinPreset(project, presetValue) {
  const preset = keyboardSkinPresetByValue(presetValue || DEFAULT_KEYBOARD_SKIN_PRESET);
  mergeProjectPatch(project, preset.patch);
  project.nativeKeyboardPayloads = deepClone(preset.nativePayloads || {});
  return preset;
}

function applyKeyboardPresetPreferences(project, preset) {
  if (!project || typeof project !== 'object' || !preset) return;
  project.guide = project.guide && typeof project.guide === 'object' ? project.guide : {};
  project.guide.preferences = project.guide.preferences && typeof project.guide.preferences === 'object'
    ? project.guide.preferences
    : {};
  project.guide.preferences.keyboardPreset = preset.value;
  project.guide.preferences.chineseLayout = preset.layout;
  project.guide.preferences.symbolLayout = preset.patch?.guide?.preferences?.symbolLayout || 'system';
  project.guide.preferences.emojiLayout = preset.patch?.guide?.preferences?.emojiLayout || 'system';
  project.guide.preferences.spacebarRow = normalizeGuideSpacebarRow(
    project.guide.preferences.spacebarRow || preset.patch?.guide?.preferences?.spacebarRow,
  );
}

function syncDefaultGeneratedPresetData(project, presetValue = DEFAULT_KEYBOARD_SKIN_PRESET) {
  if (!project || typeof project !== 'object' || !isDefaultGeneratedSkin(project)) return;
  const preset = keyboardSkinPresetByValue(presetValue || DEFAULT_KEYBOARD_SKIN_PRESET);
  if (preset.value !== DEFAULT_KEYBOARD_SKIN_PRESET) return;
  project.data = project.data || {};
  if (preset.patch?.data?.swipes) {
    project.data.swipes = deepClone(preset.patch.data.swipes);
  }
  if (preset.patch?.data?.swipesEnabled !== undefined) {
    project.data.swipesEnabled = preset.patch.data.swipesEnabled !== false;
  }
  if (preset.nativePayloads) {
    project.nativeKeyboardPayloads = deepClone(preset.nativePayloads);
  }
  applyKeyboardPresetPreferences(project, preset);
}

function keyboardNameWithOrientation(name = '', orientation = 'portrait') {
  if (!name) return '';
  if (/_(portrait|landscape)$/.test(name)) {
    return name.replace(/_(portrait|landscape)$/, `_${orientation === 'landscape' ? 'landscape' : 'portrait'}`);
  }
  return name;
}

function nativePreviewDescriptor(project = state.project, orientation = previewRenderOrientation(state.previewMode)) {
  const source = previewSourceName(state.previewMode);
  if (!source) return null;
  const keyboardName = keyboardNameWithOrientation(source, orientation);
  if (!keyboardName) return null;
  const payload = buildSkinEffectModel(project, { theme: state.theme, keyboardName })?.nativePayload || null;
  return {
    keyboardName,
    orientation,
    renderMode: previewRenderMode(state.previewMode),
    payload,
  };
}

function currentNativePreviewFrameValue(orientation = currentPreviewScope().orientation, project = state.project) {
  const descriptor = nativePreviewDescriptor(project, orientation);
  if (!descriptor?.payload || typeof descriptor.payload !== 'object') return null;
  return {
    preeditHeight: descriptor.payload.preeditHeight,
    toolbarHeight: descriptor.payload.toolbarHeight,
    keyboardHeight: descriptor.payload.keyboardHeight,
    keyboardInsets: descriptor.payload.keyboardStyle?.insets || {},
  };
}

function buildGuidePlan(preferences = {}) {
  const preset = keyboardSkinPresetByValue(preferences.keyboardPreset || DEFAULT_KEYBOARD_SKIN_PRESET);
  const chineseLayout = preset.layout || (['9', '14', '17', '18', '26'].includes(preferences.chineseLayout) ? preferences.chineseLayout : '26');
  const symbolLayout = preferences.symbolLayout === 'custom' ? 'custom' : 'system';
  const emojiLayout = preferences.emojiLayout === 'custom' ? 'custom' : 'system';
  const toolbarEnabled = preferences.defaultToolbarEnabled !== false;
  const pinyinSwipeUpEnabled = preferences.pinyinSwipeUpEnabled !== undefined ? preferences.pinyinSwipeUpEnabled !== false : preferences.swipeUpEnabled === true;
  const pinyinSwipeDownEnabled = preferences.pinyinSwipeDownEnabled !== undefined ? preferences.pinyinSwipeDownEnabled === true : preferences.swipeDownEnabled === true;
  const alphabeticSwipeUpEnabled = preferences.alphabeticSwipeUpEnabled !== undefined ? preferences.alphabeticSwipeUpEnabled !== false : preferences.swipeUpEnabled === true;
  const alphabeticSwipeDownEnabled = preferences.alphabeticSwipeDownEnabled !== undefined ? preferences.alphabeticSwipeDownEnabled === true : preferences.swipeDownEnabled === true;
  const previewModes = [
    `pinyin_${chineseLayout}_portrait`,
    `pinyin_${chineseLayout}_landscape`,
    'alphabetic_26_portrait',
    'alphabetic_26_landscape',
    'numeric_9_portrait',
    'numeric_9_landscape',
    ...(symbolLayout === 'system' ? [] : ['symbolic_portrait', 'symbolic_landscape']),
    ...(emojiLayout === 'system' ? [] : ['emoji_portrait', 'emoji_landscape']),
    ...(toolbarEnabled ? ['panel_portrait', 'panel_landscape'] : []),
  ];
  return {
    enabledKeyboards: [
      'keyboard26',
      'alphabetic',
      'numeric',
      'symbolic',
      'emoji',
      ...(toolbarEnabled ? ['panel'] : []),
    ],
    previewModes,
    toolbarEnabled,
    pinyin26LetterCase: preferences.pinyin26LetterCase === 'upper' ? 'upper' : 'lower',
    alphabetic26LetterCase: preferences.alphabetic26LetterCase === 'upper' ? 'upper' : 'lower',
    swipeDirections: ['swipe_up', 'swipe_down'].filter((direction) => (
      direction === 'swipe_up'
        ? pinyinSwipeUpEnabled || alphabeticSwipeUpEnabled
        : pinyinSwipeDownEnabled || alphabeticSwipeDownEnabled
    )),
    swipeProfiles: {
      pinyin: {
        swipeUpEnabled: pinyinSwipeUpEnabled,
        swipeDownEnabled: pinyinSwipeDownEnabled,
        swipeUpVisible: preferences.pinyinSwipeUpVisible !== false,
        swipeDownVisible: preferences.pinyinSwipeDownVisible !== false,
      },
      alphabetic: {
        swipeUpEnabled: alphabeticSwipeUpEnabled,
        swipeDownEnabled: alphabeticSwipeDownEnabled,
        swipeUpVisible: preferences.alphabeticSwipeUpVisible !== false,
        swipeDownVisible: preferences.alphabeticSwipeDownVisible !== false,
      },
    },
    spacebarRow: normalizeGuideSpacebarRow(preferences.spacebarRow),
  };
}

function normalizedGuide(value = {}, fallbackStatus = 'pending') {
  const preferences = value.preferences || {};
  const preset = keyboardSkinPresetByValue(preferences.keyboardPreset || DEFAULT_KEYBOARD_SKIN_PRESET);
  const legacySwipeUpEnabled = preferences.swipeUpEnabled === true;
  const legacySwipeDownEnabled = preferences.swipeDownEnabled === true;
  const legacySwipeUpVisible = preferences.swipeUpVisible === true;
  const legacySwipeDownVisible = preferences.swipeDownVisible === true;
  const normalizedPreferences = {
    keyboardPreset: preset.value,
    chineseLayout: preset.layout || (['9', '14', '17', '18', '26'].includes(preferences.chineseLayout) ? preferences.chineseLayout : '26'),
    pinyin26LetterCase: preferences.pinyin26LetterCase === 'upper' ? 'upper' : 'lower',
    alphabetic26LetterCase: preferences.alphabetic26LetterCase === 'upper' ? 'upper' : 'lower',
    englishLayout: 'standard',
    symbolLayout: preferences.symbolLayout === 'custom' ? 'custom' : 'system',
    emojiLayout: preferences.emojiLayout === 'custom' ? 'custom' : 'system',
    swipeUpEnabled: legacySwipeUpEnabled,
    swipeDownEnabled: legacySwipeDownEnabled,
    swipeUpVisible: legacySwipeUpVisible,
    swipeDownVisible: legacySwipeDownVisible,
    pinyinSwipeUpEnabled: preferences.pinyinSwipeUpEnabled !== undefined ? preferences.pinyinSwipeUpEnabled !== false : legacySwipeUpEnabled,
    pinyinSwipeDownEnabled: preferences.pinyinSwipeDownEnabled !== undefined ? preferences.pinyinSwipeDownEnabled === true : legacySwipeDownEnabled,
    pinyinSwipeUpVisible: preferences.pinyinSwipeUpVisible !== undefined ? preferences.pinyinSwipeUpVisible !== false : legacySwipeUpVisible,
    pinyinSwipeDownVisible: preferences.pinyinSwipeDownVisible !== undefined ? preferences.pinyinSwipeDownVisible !== false : legacySwipeDownVisible,
    alphabeticSwipeUpEnabled: preferences.alphabeticSwipeUpEnabled !== undefined ? preferences.alphabeticSwipeUpEnabled !== false : legacySwipeUpEnabled,
    alphabeticSwipeDownEnabled: preferences.alphabeticSwipeDownEnabled !== undefined ? preferences.alphabeticSwipeDownEnabled === true : legacySwipeDownEnabled,
    alphabeticSwipeUpVisible: preferences.alphabeticSwipeUpVisible !== undefined ? preferences.alphabeticSwipeUpVisible !== false : legacySwipeUpVisible,
    alphabeticSwipeDownVisible: preferences.alphabeticSwipeDownVisible !== undefined ? preferences.alphabeticSwipeDownVisible !== false : legacySwipeDownVisible,
    defaultToolbarEnabled: preferences.defaultToolbarEnabled !== false,
    spacebarRow: normalizeGuideSpacebarRow(preferences.spacebarRow),
  };
  const status = value.status === 'ready' || fallbackStatus === 'ready' ? 'ready' : 'pending';
  const derivedPlan = buildGuidePlan(normalizedPreferences);
  const plan = value.generatedPlan && status === 'ready'
    ? {
      enabledKeyboards: Array.isArray(value.generatedPlan.enabledKeyboards) && value.generatedPlan.enabledKeyboards.length
        ? [...new Set(value.generatedPlan.enabledKeyboards.filter(Boolean))]
        : derivedPlan.enabledKeyboards,
      previewModes: Array.isArray(value.generatedPlan.previewModes) && value.generatedPlan.previewModes.length
        ? [...new Set(value.generatedPlan.previewModes.filter(Boolean))]
        : derivedPlan.previewModes,
      toolbarEnabled: value.generatedPlan.toolbarEnabled !== false,
      pinyin26LetterCase: value.generatedPlan.pinyin26LetterCase === 'upper' ? 'upper' : derivedPlan.pinyin26LetterCase,
      alphabetic26LetterCase: value.generatedPlan.alphabetic26LetterCase === 'upper' ? 'upper' : derivedPlan.alphabetic26LetterCase,
      swipeDirections: Array.isArray(value.generatedPlan.swipeDirections)
        ? value.generatedPlan.swipeDirections.filter((item) => ['swipe_up', 'swipe_down'].includes(item))
        : derivedPlan.swipeDirections,
      swipeProfiles: isPlainObject(value.generatedPlan.swipeProfiles)
        ? structuredClone(value.generatedPlan.swipeProfiles)
        : derivedPlan.swipeProfiles,
      spacebarRow: normalizeGuideSpacebarRow(value.generatedPlan.spacebarRow || derivedPlan.spacebarRow),
    }
    : derivedPlan;
  return {
    status,
    preferences: normalizedPreferences,
    generatedPlan: status === 'ready' ? plan : null,
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function inferGuideSpacebarRow(project) {
  const footerRow = project?.keyboards?.keyboard26?.layout?.portrait?.rows?.find((row) => row?.id === 'row-4' || row?.label === '底排');
  if (Array.isArray(footerRow?.keys) && footerRow.keys.length) return normalizeGuideSpacebarRow(footerRow.keys);
  const footer = project?.keyboards?.keyboard26?.layout?.portrait?.footer;
  if (Array.isArray(footer) && footer.length) return normalizeGuideSpacebarRow(footer);
  return normalizeGuideSpacebarRow(project?.guide?.preferences?.spacebarRow || GUIDE_DEFAULT_SPACEBAR_ROW);
}

function collectConfigMappedKeyboardNames(group = {}) {
  const names = [];
  for (const deviceMappings of Object.values(group || {})) {
    if (!deviceMappings || typeof deviceMappings !== 'object') continue;
    for (const name of Object.values(deviceMappings)) {
      if (typeof name === 'string' && name.trim()) names.push(name.trim());
    }
  }
  return names;
}

function inferKeyboardComboFromConfig(project = {}) {
  const combo = normalizedKeyboardCombo(project.keyboardCombo || {});
  const config = project.config || {};
  const pinyinNames = collectConfigMappedKeyboardNames(config.pinyin);
  const numericNames = collectConfigMappedKeyboardNames(config.numeric);
  const symbolicNames = collectConfigMappedKeyboardNames(config.symbolic);
  const emojiNames = collectConfigMappedKeyboardNames(config.emoji);
  const panelNames = collectConfigMappedKeyboardNames(config.panel);

  const pinyinVariant = pinyinNames
    .map((name) => name.match(/^pinyin_(9|14|17|18|26)_/))
    .find(Boolean)?.[1];
  if (pinyinVariant) {
    combo.slots.pinyin.enabled = true;
    combo.slots.pinyin.source = 'custom';
    combo.slots.pinyin.variant = pinyinVariant;
  }

  if (numericNames.some((name) => name.startsWith('numeric_ios'))) {
    combo.slots.numeric.enabled = true;
    combo.slots.numeric.source = 'custom';
    combo.slots.numeric.variant = 'ios';
  } else if (numericNames.some((name) => name.startsWith('numeric_9'))) {
    combo.slots.numeric.enabled = true;
    combo.slots.numeric.source = 'custom';
    combo.slots.numeric.variant = '9';
  }

  if (symbolicNames.includes('symbolic_system')) {
    combo.slots.symbolic.enabled = true;
    combo.slots.symbolic.source = 'system';
    combo.slots.symbolic.variant = 'system';
  } else if (symbolicNames.some((name) => name.startsWith('symbolic_'))) {
    combo.slots.symbolic.enabled = true;
    combo.slots.symbolic.source = 'custom';
    combo.slots.symbolic.variant = 'custom';
  }

  if (emojiNames.includes('emoji_system')) {
    combo.slots.emoji.enabled = true;
    combo.slots.emoji.source = 'system';
    combo.slots.emoji.variant = 'system';
  } else if (emojiNames.some((name) => name.startsWith('emoji_'))) {
    combo.slots.emoji.enabled = true;
    combo.slots.emoji.source = 'custom';
    combo.slots.emoji.variant = 'custom';
  }

  if (panelNames.length) {
    combo.slots.panel.enabled = true;
    combo.slots.panel.source = 'custom';
    combo.slots.panel.variant = 'panel';
  }

  if (Array.isArray(project?.toolbar?.layout)) {
    combo.toolbar.enabled = project.toolbar.layout.length > 0;
  }

  return combo;
}

function syncGuideAndComboFromConfig(project, { preserveGuideStatus = true } = {}) {
  if (!project || typeof project !== 'object') return;
  project.keyboardCombo = inferKeyboardComboFromConfig(project);
  const status = preserveGuideStatus ? (project.guide?.status || 'pending') : 'pending';
  const preferences = inferGuidePreferencesFromProject(project);
  project.guide = normalizedGuide({
    ...(project.guide && typeof project.guide === 'object' ? project.guide : {}),
    status,
    preferences,
    generatedPlan: status === 'ready' ? buildGuidePlan(preferences) : null,
  }, status);
}

function inferGuidePreferencesFromProject(project = {}) {
  const combo = normalizedKeyboardCombo(project.keyboardCombo || {});
  const chineseLayout = ['9', '14', '17', '18', '26'].includes(combo.slots.pinyin.variant) ? combo.slots.pinyin.variant : '26';
  const previousPreset = keyboardSkinPresetByValue(project.guide?.preferences?.keyboardPreset || `ios-${chineseLayout}`);
  const preset = previousPreset.layout === chineseLayout
    ? previousPreset
    : keyboardSkinPresetByValue(`ios-${chineseLayout}`);
  return {
    keyboardPreset: preset.value,
    chineseLayout,
    pinyin26LetterCase: project?.guide?.preferences?.pinyin26LetterCase === 'upper' ? 'upper' : 'lower',
    alphabetic26LetterCase: project?.guide?.preferences?.alphabetic26LetterCase === 'upper' ? 'upper' : 'lower',
    englishLayout: 'standard',
    symbolLayout: combo.slots.symbolic.source === 'system' ? 'system' : 'custom',
    emojiLayout: combo.slots.emoji.source === 'custom' ? 'custom' : 'system',
    swipeUpEnabled: combo.swipeBehavior?.mode !== 'disabled' && project?.data?.swipesEnabled !== false,
    swipeDownEnabled: combo.swipeBehavior?.mode !== 'disabled' && project?.data?.swipesEnabled !== false && Boolean(
      project?.data?.swipes?.pinyin?.swipe_down
      || project?.data?.swipes?.alphabetic?.swipe_down
      || project?.data?.swipes?.numeric?.swipe_down
    ),
    swipeUpVisible: combo.swipeBehavior?.mode !== 'hidden' && combo.swipeBehavior?.showSwipeUp !== false,
    swipeDownVisible: combo.swipeBehavior?.mode !== 'hidden' && combo.swipeBehavior?.showSwipeDown !== false,
    pinyinSwipeUpEnabled: combo.swipeBehavior?.layouts?.pinyin?.mode !== 'disabled' && project?.data?.swipesEnabled !== false,
    pinyinSwipeDownEnabled: combo.swipeBehavior?.layouts?.pinyin?.mode !== 'disabled' && project?.data?.swipesEnabled !== false && Boolean(project?.data?.swipes?.pinyin?.swipe_down),
    pinyinSwipeUpVisible: combo.swipeBehavior?.layouts?.pinyin?.mode !== 'hidden' && combo.swipeBehavior?.layouts?.pinyin?.showSwipeUp !== false,
    pinyinSwipeDownVisible: combo.swipeBehavior?.layouts?.pinyin?.mode !== 'hidden' && combo.swipeBehavior?.layouts?.pinyin?.showSwipeDown !== false,
    alphabeticSwipeUpEnabled: combo.swipeBehavior?.layouts?.alphabetic?.mode !== 'disabled' && project?.data?.swipesEnabled !== false,
    alphabeticSwipeDownEnabled: combo.swipeBehavior?.layouts?.alphabetic?.mode !== 'disabled' && project?.data?.swipesEnabled !== false && Boolean(project?.data?.swipes?.alphabetic?.swipe_down),
    alphabeticSwipeUpVisible: combo.swipeBehavior?.layouts?.alphabetic?.mode !== 'hidden' && combo.swipeBehavior?.layouts?.alphabetic?.showSwipeUp !== false,
    alphabeticSwipeDownVisible: combo.swipeBehavior?.layouts?.alphabetic?.mode !== 'hidden' && combo.swipeBehavior?.layouts?.alphabetic?.showSwipeDown !== false,
    defaultToolbarEnabled: combo.toolbar?.enabled !== false && Array.isArray(project?.toolbar?.layout) ? project.toolbar.layout.length > 0 : combo.toolbar?.enabled !== false,
    spacebarRow: inferGuideSpacebarRow(project),
  };
}

function ensureProjectGuide(project, fallbackStatus = 'pending') {
  if (!project || typeof project !== 'object') return normalizedGuide({}, fallbackStatus);
  const seed = project.guide && typeof project.guide === 'object'
    ? project.guide
    : { preferences: inferGuidePreferencesFromProject(project) };
  project.guide = normalizedGuide(seed, fallbackStatus);
  return project.guide;
}

function guideState(project = state.project) {
  return normalizedGuide(project?.guide || {}, project?.guide?.status || 'pending');
}

function isGuideReady(project = state.project) {
  return guideState(project).status === 'ready';
}

function guideSwipeDirections(project = state.project) {
  return guideState(project).generatedPlan?.swipeDirections || [];
}

function guideSwipeDirectionEnabled(direction, project = state.project) {
  const directions = guideSwipeDirections(project);
  if (!directions.length) return false;
  return directions.includes(direction);
}

function guidePreferredPreviewNames(project = state.project) {
  return guideState(project).generatedPlan?.previewModes || [];
}

function guideSummaryText(project = state.project) {
  const guide = guideState(project);
  const preferences = guide.status === 'ready'
    ? inferGuidePreferencesFromProject(project)
    : guide.preferences;
  const preset = keyboardSkinPresetByValue(preferences.keyboardPreset || DEFAULT_KEYBOARD_SKIN_PRESET);
  const swipeText = [
    `中文${preferences.pinyinSwipeUpEnabled ? '上划' : '不含上划'}${preferences.pinyinSwipeDownEnabled ? '/下划' : ''}`,
    `英文${preferences.alphabeticSwipeUpEnabled ? '上划' : '不含上划'}${preferences.alphabeticSwipeDownEnabled ? '/下划' : ''}`,
  ].join(' / ');
  const toolbarText = preferences.defaultToolbarEnabled ? '默认工具栏' : '不生成默认工具栏';
  return [
    `当前选择：${preset.label}`,
    `中文26键${preferences.pinyin26LetterCase === 'upper' ? '大写字母' : '小写字母'}`,
    `英文${preferences.englishLayout === 'standard' ? '美式26键' : preferences.englishLayout}${preferences.alphabetic26LetterCase === 'upper' ? '大写字母' : '小写字母'}`,
    `Symbols：符号${preferences.symbolLayout === 'system' ? 'App内' : '自定义'} / Emoji${preferences.emojiLayout === 'system' ? 'App内' : '自定义'}`,
    swipeText,
    toolbarText,
  ].filter(Boolean).join(' / ');
}

function visibleModuleCount(project = state.project) {
  if (!project) return 0;
  return MODULES.filter((module) => !isModuleDisabled(module, project).disabled).length;
}

function isModuleDisabled(module, project = state.project) {
  if (module.disabled) {
    return { disabled: true, reason: '暂未开放', statusLabel: '未开放' };
  }
  if (!isGuideReady(project) && module.id !== 'keyboardCombo') {
    return { disabled: true, reason: '请先完成“生成你的键盘方案”并生成方案', statusLabel: '' };
  }
  return { disabled: false, reason: '', statusLabel: '' };
}

function defaultAlphabeticPreviewName(project = state.project) {
  return 'alphabetic_26_portrait';
}

function currentGuideSpacebarRow(project = state.project) {
  const guide = guideState(project);
  return normalizeGuideSpacebarRow(guide.generatedPlan?.spacebarRow || guide.preferences.spacebarRow);
}

function applyGuideSpacebarRowToProject(project) {
  const row = currentGuideSpacebarRow(project);
  project.keyboards = project.keyboards || {};
  project.keyboards.keyboard26 = project.keyboards.keyboard26 || {};
  project.keyboards.keyboard26.layout = project.keyboards.keyboard26.layout || {};
  project.keyboards.keyboard26.layout.portrait = project.keyboards.keyboard26.layout.portrait || {};
  const rows = Array.isArray(project.keyboards.keyboard26.layout.portrait.rows)
    ? project.keyboards.keyboard26.layout.portrait.rows
    : deepClone(KEYBOARD26_DEFAULT_ROWS);
  const footerIndex = rows.findIndex((item) => item?.id === 'row-4' || item?.label === '底排');
  if (footerIndex !== -1) {
    rows[footerIndex] = {
      ...(rows[footerIndex] || {}),
      id: rows[footerIndex]?.id || 'row-4',
      label: rows[footerIndex]?.label || '底排',
      keys: [...row],
    };
  }
  project.keyboards.keyboard26.layout.portrait.rows = rows;
  project.keyboards.keyboard26.layout.portrait.footer = [...row];
}

function applyPinyin26LetterCaseToProject(project, letterCase = 'lower') {
  const displays = project.keyboards.keyboard26.keyDisplays = project.keyboards.keyboard26.keyDisplays || {};
  for (const char of 'abcdefghijklmnopqrstuvwxyz') {
    if (letterCase === 'upper') {
      displays[char] = char.toUpperCase();
    } else {
      delete displays[char];
    }
  }
}

function applyAlphabetic26LetterCaseToProject(project, letterCase = 'lower') {
  const displays = project.keyboards.keyboard26.keyDisplays = project.keyboards.keyboard26.keyDisplays || {};
  for (const char of 'abcdefghijklmnopqrstuvwxyz') {
    const alphaKey = `alphabetic.${char}`;
    const englishKey = `english.${char}`;
    if (letterCase === 'upper') {
      displays[alphaKey] = char.toUpperCase();
      displays[englishKey] = char.toUpperCase();
    } else {
      delete displays[alphaKey];
      delete displays[englishKey];
    }
  }
}

function applyGuidePlanToProject(project) {
  const guide = guideState(project);
  const preset = applyKeyboardSkinPreset(project, guide.preferences.keyboardPreset);
  const preferences = {
    ...guide.preferences,
    keyboardPreset: preset.value,
    chineseLayout: preset.layout,
    spacebarRow: normalizeGuideSpacebarRow(guide.preferences.spacebarRow || preset.patch?.guide?.preferences?.spacebarRow),
  };
  const generatedPlan = buildGuidePlan(preferences);
  project.guide = {
    status: 'ready',
    preferences: deepClone(preferences),
    generatedPlan: deepClone(generatedPlan),
  };
  const combo = normalizedKeyboardCombo(project.keyboardCombo || {});
  combo.inputStrategy = 'separateAlphabetic';
  combo.slots.pinyin = { enabled: true, source: 'custom', variant: preferences.chineseLayout };
  combo.slots.alphabetic = { enabled: true, source: 'custom', variant: '26' };
  combo.slots.numeric = { enabled: true, source: 'custom', variant: '9' };
  combo.slots.symbolic = { enabled: true, source: preferences.symbolLayout, variant: preferences.symbolLayout };
  combo.slots.emoji = { enabled: true, source: preferences.emojiLayout, variant: preferences.emojiLayout };
  combo.slots.panel = { enabled: true, source: 'custom', variant: 'panel' };
  combo.toolbar = {
    ...combo.toolbar,
    enabled: preferences.defaultToolbarEnabled !== false,
  };
  combo.swipeBehavior = {
    ...combo.swipeBehavior,
    mode: generatedPlan.swipeDirections.length ? 'visible' : 'disabled',
    showSwipeUp: generatedPlan.swipeDirections.includes('swipe_up'),
    showSwipeDown: generatedPlan.swipeDirections.includes('swipe_down'),
    layouts: Object.fromEntries(Object.entries(generatedPlan.swipeProfiles).map(([profile, config]) => [profile, {
      mode: config.swipeUpEnabled || config.swipeDownEnabled
        ? (config.swipeUpVisible || config.swipeDownVisible ? 'visible' : 'hidden')
        : 'disabled',
      showSwipeUp: config.swipeUpEnabled && config.swipeUpVisible,
      showSwipeDown: config.swipeDownEnabled && config.swipeDownVisible,
    }])),
  };
  combo.spaceRow = {
    ...combo.spaceRow,
    showSchemaNameOnSpace: state.sampleProject?.keyboardCombo?.spaceRow?.showSchemaNameOnSpace === true,
    semicolonKey: {
      ...(combo.spaceRow?.semicolonKey || {}),
      enabled: generatedPlan.spacebarRow.includes('semicolon'),
    },
  };
  project.keyboardCombo = combo;
  project.data = project.data || {};
  project.data.swipesEnabled = generatedPlan.swipeDirections.length > 0;
  project.config = effectiveConfig(project.config || {}, combo);
  const alphabeticPortrait = 'alphabetic_26_portrait';
  const alphabeticLandscape = 'alphabetic_26_landscape';
  for (const device of ['iPhone', 'iPad']) {
    project.config.alphabetic = project.config.alphabetic || {};
    project.config.alphabetic[device] = project.config.alphabetic[device] || {};
    project.config.alphabetic[device].portrait = alphabeticPortrait;
    project.config.alphabetic[device].landscape = alphabeticLandscape;
    if (device === 'iPad') project.config.alphabetic[device].floating = alphabeticPortrait;
  }
  project.toolbar = project.toolbar || {};
  project.toolbar.actions = {
    ...(project.toolbar.actions || {}),
    symbol: {
      keyboardType: 'symbolic',
      actionType: 'keyboardType',
      actionValue: 'symbolic',
    },
    emoji: {
      keyboardType: 'emojis',
      actionType: 'keyboardType',
      actionValue: 'emojis',
    },
  };
  if (preferences.defaultToolbarEnabled === false) {
    project.toolbar.layout = [];
  } else if (!Array.isArray(project.toolbar.layout) || !project.toolbar.layout.length) {
    project.toolbar.layout = [...DEFAULT_TOOLBAR_BUTTONS];
  }
  applyPinyin26LetterCaseToProject(project, generatedPlan.pinyin26LetterCase);
  applyAlphabetic26LetterCaseToProject(project, generatedPlan.alphabetic26LetterCase);
  applyGuideSpacebarRowToProject(project);
}

function setGuideSpacebarRow(row) {
  const nextRow = normalizeGuideSpacebarRow(row);
  const currentGuide = guideState();
  state.project.guide = {
    status: 'pending',
    preferences: {
      ...currentGuide.preferences,
      spacebarRow: nextRow,
    },
    generatedPlan: null,
  };
  markDirty();
  renderAll();
}

function handleGuideSpacebarAction(button) {
  const action = button.dataset.guideSpaceAction;
  if (!action) return;
  const currentRow = currentGuideSpacebarRow();
  let nextRow = currentRow;
  if (action === 'add') {
    const key = button.dataset.key;
    if (!GUIDE_SPACEBAR_ALLOWED_KEYS.has(key)) return;
    if (currentRow.includes(key)) return;
    nextRow = [...currentRow, key];
  }
  if (action === 'remove') {
    const index = Number(button.dataset.index);
    const key = currentRow[index];
    if (!Number.isInteger(index) || !key || key === 'space' || key === 'enter') return;
    nextRow = currentRow.filter((_, itemIndex) => itemIndex !== index);
  }
  if (JSON.stringify(nextRow) === JSON.stringify(currentRow)) return;
  pushUndoSnapshot();
  setGuideSpacebarRow(nextRow);
}

function finalizeGuideGeneration() {
  pushUndoSnapshot();
  applyGuidePlanToProject(state.project);
  if (!previewModeExists(state.previewMode)) {
    state.previewMode = defaultPreviewMode();
  }
  state.editingKey = null;
  markDirty();
  renderAll();
  renderCurrentPreview();
}

function handleGuideAction(button) {
  const action = button.dataset.guideAction;
  if (action !== 'generate') return;
  if (isGuideReady(state.project)) {
    openConfirmDialog({
      title: '重新生成方案',
      message: '重新生成会覆盖当前方案对应的键盘结构、工具栏和空格行设置，是否继续？',
      confirmLabel: '重新生成',
      confirmClass: '',
      onConfirm: finalizeGuideGeneration,
    });
    return;
  }
  finalizeGuideGeneration();
}

const CUSTOM_KEYBOARD_PANELS = [
  { id: 'preview', label: '预览' },
];

function activePreviewKeyboardPanel() {
  const scope = currentPreviewScope();
  if (scope.mode === 'numeric') return 'numeric';
  if (scope.mode === 'symbolic' && effectiveKeyboardCombo().slots.symbolic.source === 'custom') return 'symbolic';
  if (scope.mode === 'emoji') return 'emoji';
  if (scope.mode === 'panel') return 'panel';
  return 'keyboard26';
}

function activeCustomKeyboardPanel() {
  return 'preview';
}

function customKeyboardPanelPath(panelId = activeCustomKeyboardPanel()) {
  if (panelId === 'preview') return customKeyboardPanelPath(activePreviewKeyboardPanel());
  const paths = {
    keyboard26: 'keyboards.keyboard26',
    numeric: 'keyboards.numeric',
    symbolic: 'keyboards.symbolic',
    emoji: 'data.collections.emojiDataSource',
    panel: 'keyboards.panel.text',
  };
  return paths[panelId] || 'keyboards.keyboard26';
}

function customKeyboardPanelValue(panelId = activeCustomKeyboardPanel()) {
  return getPath(state.project, customKeyboardPanelPath(panelId));
}

function renderCustomKeyboards(value = {}) {
  const previewPanel = activePreviewKeyboardPanel();
  const scope = currentPreviewScope();
  const previewContent = ({
    keyboard26: () => renderKeyboard26Text(value.keyboard26 || {}),
    numeric: () => renderNumericKeyboard(value.numeric || {}),
    symbolic: () => renderSymbolic(value.symbolic || {}),
    emoji: () => `
        ${renderRowListEditor({
    title: '左侧 Emoji 列表布局',
    path: 'keyboards.emoji.layout.portrait.collectionRows',
    rows: getPath(state.project, 'keyboards.emoji.layout.portrait.collectionRows') || EMOJI_SPECIAL_LAYOUT_GROUPS[0].defaultRows,
    rowLabel: '组',
    actionPrefix: 'emoji-collection',
  })}
        ${renderJsonTextarea('data.collections.emojiDataSource', state.project.data?.collections?.emojiDataSource || {})}
      `,
    panel: () => renderStringMap(value.panel?.text || {}, 'keyboards.panel.text'),
  }[previewPanel]?.() || renderKeyboard26Text(value.keyboard26 || {}));
  const fallbackContent = (
    (scope.mode === 'symbolic' && effectiveKeyboardCombo().slots.symbolic.source !== 'custom')
    || (scope.mode === 'emoji' && effectiveKeyboardCombo().slots.emoji.source !== 'custom')
  )
    ? `<section class="group-card"><p class="empty-note">${scope.mode === 'emoji' ? '当前为 App内emoji键盘，请通过“生成你的键盘方案”切换到自定义 Emoji 后再编辑数据源。' : '当前为 App内符号键盘，请通过“生成你的键盘方案”切换到自定义符号键盘后再编辑布局。'}</p></section>`
    : previewContent;
  const toolbarContent = previewPanel === 'keyboard26' ? '' : renderToolbar(state.project.toolbar || {});
  return `
    ${fallbackContent}
    ${toolbarContent}
  `;
}

function metricWidthValue(metric) {
  const width = metric?.width;
  if (typeof width === 'number' || typeof width === 'string') return width;
  return width?.percentage ?? '';
}

function keyboard26MetricPath(orientation, key = '') {
  const variant = activePinyinVariant();
  const basePath = variant === '26'
    ? `keyboards.keyboard26.metrics.${orientation}`
    : `keyboards.keyboard26.variants.${variant}.metrics.${orientation}`;
  return key ? `${basePath}.${key}` : basePath;
}

function metricWidthPath(keyboardId, orientation, key) {
  if (keyboardId === 'keyboard26') {
    return orientation === 'portrait'
      ? `${keyboard26MetricPath('portrait', key)}.width.percentage`
      : `${keyboard26MetricPath('landscape', key)}.width`;
  }
  return orientation === 'portrait'
    ? `keyboards.${keyboardId}.metrics.portrait.${key}.width.percentage`
    : `keyboards.${keyboardId}.metrics.landscape.${key}.width`;
}

function metricMetricsPath(keyboardId, orientation) {
  if (keyboardId === 'keyboard26') {
    return keyboard26MetricPath(orientation);
  }
  return `keyboards.${keyboardId}.metrics.${orientation}`;
}

function metricContextKey(keyboardId = state.metricsKeyboardId, orientation = state.metricsOrientation) {
  const variant = keyboardId === 'keyboard26' ? activePinyinVariant() : 'base';
  return `${keyboardId}:${orientation}:${variant}`;
}

function selectedMetricKeys(keyboardId = state.metricsKeyboardId, orientation = state.metricsOrientation) {
  const keys = state.metricsSelectedKeys?.[metricContextKey(keyboardId, orientation)];
  return Array.isArray(keys) ? keys : [];
}

function setSelectedMetricKeys(keys, keyboardId = state.metricsKeyboardId, orientation = state.metricsOrientation) {
  state.metricsSelectedKeys = state.metricsSelectedKeys || {};
  state.metricsSelectedKeys[metricContextKey(keyboardId, orientation)] = [...new Set(keys.filter(Boolean))];
}

function manualMetricOverrideKeys(keyboardId = state.metricsKeyboardId, orientation = state.metricsOrientation) {
  const keys = state.metricsManualOverrides?.[metricContextKey(keyboardId, orientation)];
  return Array.isArray(keys) ? keys : [];
}

function setManualMetricOverrideKeys(keys, keyboardId = state.metricsKeyboardId, orientation = state.metricsOrientation) {
  state.metricsManualOverrides = state.metricsManualOverrides || {};
  state.metricsManualOverrides[metricContextKey(keyboardId, orientation)] = [...new Set(keys.filter(Boolean))];
}

function activeMetricKey(keyboardId = state.metricsKeyboardId, orientation = state.metricsOrientation) {
  const keys = selectedMetricKeys(keyboardId, orientation);
  return keys.length ? keys[keys.length - 1] : '';
}

function metricHasCustomValue(metric = {}) {
  return metric.width !== undefined
    || metric.bounds?.width !== undefined
    || metric.bounds?.height !== undefined
    || metric.bounds?.alignment !== undefined;
}

function setMetricWidth(metric, orientation, value) {
  if (value === '') return;
  if (orientation === 'portrait') {
    const next = Number.parseFloat(String(value).replace(',', '.'));
    metric.width = { percentage: Number.isFinite(next) ? next : value };
    return;
  }
  metric.width = value;
}

function setMetricBoundsWidth(metric, value) {
  if (value === '') return;
  metric.bounds = metric.bounds && typeof metric.bounds === 'object' ? metric.bounds : {};
  metric.bounds.width = value;
}

function metricInputType(orientation) {
  return orientation === 'portrait' ? 'number' : 'text';
}

function metricInputStep(orientation) {
  return orientation === 'portrait' ? '0.01' : undefined;
}

function metricBoundsWidthPath(keyboardId, orientation, key) {
  if (keyboardId === 'keyboard26') {
    return `${keyboard26MetricPath(orientation, key)}.bounds.width`;
  }
  return `keyboards.${keyboardId}.metrics.${orientation}.${key}.bounds.width`;
}

function resolvedMetricForKey(metrics = {}, key, normalMetric = {}) {
  const metric = metrics[key];
  if (metricHasCustomValue(metric || {})) return deepClone(metric);
  return deepClone(normalMetric || {});
}

function renderMetricKeyPicker(keys, selectedKeys, keyboardId, keyboard) {
  return `
    <div class="metric-key-picker swipe-token-list">
      ${keys.map((key) => {
      const active = selectedKeys.includes(key) ? ' is-active' : '';
      return `
        <button
          class="swipe-token metric-key-chip${active}"
          type="button"
          data-keyboard-action="toggle-metric-key"
          data-key="${escapeHtml(key)}"
          aria-pressed="${active ? 'true' : 'false'}"
        ><span class="swipe-key">${escapeHtml(metricKeyLabel(keyboardId, keyboard, key))}</span></button>
      `;
    }).join('')}
    </div>
  `;
}

function renderMetricOverrideRows({ keyboardId, keyboard, orientation, metrics, overrideKeys, normalMetric }) {
  if (!overrideKeys.length) {
    return '<p class="metrics-empty">当前还没有添加任何自定义按键。</p>';
  }
  return `
    <div class="metrics-override-table">
      <div class="metrics-override-header" aria-hidden="true">
        ${[0, 1].map(() => `
          <div class="metrics-override-header-group">
            <span>按键</span>
            <span>宽度</span>
            <span>bounds.width</span>
            <span></span>
          </div>
        `).join('')}
      </div>
      <div class="metrics-override-list">
      ${overrideKeys.map((key) => {
    const metric = resolvedMetricForKey(metrics, key, normalMetric);
    return `
        <div class="metrics-override-row">
          <label>
            <span title="按键">${escapeHtml(metricKeyLabel(keyboardId, keyboard, key))}</span>
            <input
              class="table-input metric-key-display-input"
              type="text"
              value="${escapeHtml(metricKeyLabel(keyboardId, keyboard, key))}"
              aria-label="${escapeHtml(metricKeyLabel(keyboardId, keyboard, key))}"
              title="${escapeHtml(metricKeyLabel(keyboardId, keyboard, key))}"
              readonly
            >
          </label>
          <label>
            <span title="宽度">宽</span>
            ${tableInput({
              path: metricWidthPath(keyboardId, orientation, key),
              label: `${key} ${orientation === 'portrait' ? '竖屏宽度' : '横屏宽度'}`,
              value: metricWidthValue(metric),
              type: metricInputType(orientation),
              step: metricInputStep(orientation),
            })}
          </label>
          <label>
            <span title="bounds.width">bounds.width</span>
            ${tableInput({
              path: metricBoundsWidthPath(keyboardId, orientation, key),
              label: `${key} bounds.width`,
              value: metric.bounds?.width || '',
            })}
          </label>
          <button class="mini-button" type="button" aria-label="移除 ${escapeHtml(metricKeyLabel(keyboardId, keyboard, key))}" title="移除" data-keyboard-action="remove-metric-override" data-key="${escapeHtml(key)}">×</button>
        </div>
      `;
  }).join('')}
      </div>
    </div>
  `;
}

function renderMetricActiveEditor({ keyboardId, keyboard, orientation, metrics, selectableKeys }) {
  const key = activeMetricKey(keyboardId, orientation);
  if (!key || !selectableKeys.includes(key)) {
    return `
      <div class="metrics-unified-card">
        <h4>当前按键</h4>
        <p class="metrics-empty">点击右侧预览里的按键，或在下方点选按键后，这里会读取当前预览对应的尺寸数据。</p>
      </div>
    `;
  }
  const metric = metrics[key] || metrics.normal || {};
  const hasOverride = metricHasCustomValue(metrics[key] || {});
  return `
    <div class="metrics-unified-card swipe-edit-panel key-edit-panel">
      <h4>当前按键：${escapeHtml(metricKeyLabel(keyboardId, keyboard, key))}</h4>
      <div class="metrics-unified-fields">
        <label>
          <span>宽度</span>
          ${tableReadonlyValue(`${key} ${orientation === 'portrait' ? '竖屏宽度' : '横屏宽度'}`, metricWidthValue(metric))}
        </label>
        <label>
          <span>bounds.width</span>
          ${tableReadonlyValue(`${key} bounds.width`, metric.bounds?.width || '')}
        </label>
      </div>
      <p class="metrics-note">${hasOverride ? '当前显示的是这个按键自己的尺寸设置。' : '当前显示的是预览里实际生效的尺寸数据；修改后会为这个按键创建单独设置。'}</p>
    </div>
  `;
}

function keyboardIdForPreviewMode(mode = previewRenderMode(state.previewMode)) {
  if (mode === 'numeric') return 'numeric';
  if (mode === 'symbolic') return 'symbolic';
  if (mode === 'emoji') return 'emoji';
  if (mode === 'panel') return 'panel';
  return 'keyboard26';
}

function metricPickerRows(keys = [], keyboardId = keyboardIdForPreviewMode()) {
  if (!keys.length) return [];
  const keyboard = state.project?.keyboards?.[keyboardId] || {};
  if (keyboardId === 'keyboard26') {
    const orientation = previewRenderOrientation(state.previewMode);
    const variantRows = keyboard26VariantRows(keyboard, orientation);
    if (variantRows.length) {
      return variantRows.map((row) => row.filter((key) => keys.includes(key) && key !== 'normal')).filter((row) => row.length);
    }
    if (orientation === 'landscape') {
      const rows = Object.values(keyboard.layout?.landscape || {})
        .flatMap((sectionRows) => sectionRows || [])
        .map((row) => (Array.isArray(row) ? row.filter((key) => keys.includes(key) && key !== 'normal') : []))
        .filter((row) => row.length);
      if (rows.length) return rows;
    }
    return keyboard26PortraitRows(keyboard)
      .map((row) => (row.keys || []).filter((key) => keys.includes(key) && key !== 'normal'))
      .filter((row) => row.length);
  }
  if (keyboardId === 'numeric') {
    return (keyboard.layout?.portrait?.columns || DEFAULT_NUMERIC_COLUMNS)
      .map((row) => row.filter((key) => keys.includes(key) && key !== 'normal'))
      .filter((row) => row.length);
  }
  if (keyboardId === 'symbolic') {
    return (keyboard.layout?.portrait?.functionRows || DEFAULT_SYMBOLIC_FUNCTION_ROWS)
      .map((row) => row.filter((key) => keys.includes(key) && key !== 'normal'))
      .filter((row) => row.length);
  }
  if (keyboardId === 'panel') {
    return [PANEL_BUTTONS.map(([key]) => key).filter((key) => keys.includes(key) && key !== 'normal')];
  }
  return [keys.filter((key) => key !== 'normal')];
}

function renderMetrics(keyboards = {}) {
  const scope = currentPreviewScope();
  if (scope.mode === 'emoji' || (scope.mode === 'symbolic' && effectiveKeyboardCombo().slots.symbolic.source !== 'custom')) {
    const emojiMessage = effectiveKeyboardCombo().slots.emoji.source === 'custom'
      ? '自定义 Emoji 当前复用符号集合视图预览，暂不单独提供按键尺寸设置。'
      : 'App内emoji键盘使用集合视图预览，请到“符号数据源”模块维护内容，不在这里单独设置按键尺寸。';
    return `
      <section class="group-card">
        ${renderPreviewScopeHeader('按键尺寸', `当前为${scope.mode === 'emoji' ? ' Emoji 数据源' : 'App内符号键盘'}预览。`, '', { showScopeBadge: false })}
        <p class="empty-note">${scope.mode === 'emoji' ? emojiMessage : 'App内符号键盘不在这里单独设置按键尺寸，请切换到自定义符号键盘后再调整。'}</p>
      </section>
    `;
  }
  const options = metricKeyboardOptions(keyboards);
  const previewKeyboardId = keyboardIdForPreviewMode();
  const keyboardId = options.some((item) => item.id === previewKeyboardId)
    ? previewKeyboardId
    : options[0]?.id || 'keyboard26';
  const keyboard = keyboards[keyboardId] || {};
  const orientation = previewRenderOrientation(state.previewMode);
  state.metricsKeyboardId = keyboardId;
  state.metricsOrientation = orientation;
  const portrait = keyboardId === 'keyboard26'
    ? (getPath(state.project, keyboard26MetricPath('portrait')) || {})
    : (keyboard.metrics?.portrait || {});
  const landscape = keyboardId === 'keyboard26'
    ? (getPath(state.project, keyboard26MetricPath('landscape')) || {})
    : (keyboard.metrics?.landscape || {});
  const metrics = orientation === 'portrait' ? portrait : landscape;
  const keys = currentPreviewKeyboardKeys();
  const selectableKeys = keys.filter((key) => key !== 'normal');
  const selectedKeys = selectedMetricKeys(keyboardId, orientation).filter((key) => selectableKeys.includes(key));
  if (selectedKeys.length !== selectedMetricKeys(keyboardId, orientation).length) {
    setSelectedMetricKeys(selectedKeys, keyboardId, orientation);
  }
  const normalMetric = metrics.normal || {};
  const normalWidth = metricWidthValue(normalMetric);
  const normalBoundsWidth = normalMetric.bounds?.width || '';
  const overrideKeys = selectedKeys
    .filter((key) => key !== 'normal' && selectableKeys.includes(key))
    .sort((left, right) => {
      const leftIndex = selectableKeys.indexOf(left);
      const rightIndex = selectableKeys.indexOf(right);
      if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right, 'zh-CN');
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    });
  return `
    <section class="group-card keyboard-tool-card metrics-settings-card">
      ${renderPreviewScopeHeader('按键尺寸', '只显示当前预览键盘里的可操作按键；需要调其他键盘请切换右侧预览。', '', { showScopeBadge: false })}
      <div class="metrics-unified-card">
        <h4>统一尺寸</h4>
        <div class="metrics-unified-fields">
          <label>
            <span>统一宽度</span>
            ${tableInput({ path: metricWidthPath(keyboardId, orientation, 'normal'), label: '统一宽度', value: normalWidth, type: metricInputType(orientation), step: metricInputStep(orientation) })}
          </label>
          <label>
            <span>bounds.width</span>
            ${tableInput({ path: keyboardId === 'keyboard26' ? `${keyboard26MetricPath(orientation, 'normal')}.bounds.width` : `keyboards.${keyboardId}.metrics.${orientation}.normal.bounds.width`, label: 'bounds.width', value: normalBoundsWidth })}
          </label>
        </div>
        <p class="metrics-note">宽度控制按键在一行里的占位；bounds.width 控制按键内部可见层宽度，例如 2/3 表示内容层占按键格子的三分之二。</p>
      </div>
    </section>
    <section class="group-card keyboard-key-card metrics-profile-card">
      <div class="metrics-batch-card">
        <div class="metrics-batch-header">
          <h4>按键选择</h4>
          <div class="metrics-batch-actions">
            <button class="mini-button" type="button" data-keyboard-action="select-all-metric-keys">全选</button>
            <button class="mini-button" type="button" data-keyboard-action="clear-metric-keys">清空</button>
          </div>
        </div>
        ${renderMetricKeyPicker(selectableKeys, selectedKeys, keyboardId, keyboard)}
      </div>
      <div class="metrics-overrides-card">
        <h4>自定义按键列表</h4>
        ${renderMetricOverrideRows({ keyboardId, keyboard, orientation, metrics, overrideKeys, normalMetric })}
      </div>
    </section>
  `;
}

function swipeActionSummary(action = {}) {
  const fields = actionToFields(action);
  if (!fields.value) return displayActionTypeWithCode(fields.type);
  return `${displayActionTypeWithCode(fields.type)}：${fields.value}`;
}

function swipeDefaultCenter(profile, direction) {
  const centerKey = SWIPE_DEFAULT_CENTER_KEYS[profile]?.[direction];
  return centerKey ? state.project.theme?.shared?.center?.[centerKey] : null;
}

function availableSwipeProfiles() {
  return ['pinyin', 'alphabetic', 'numeric'].map((profile) => ({
    value: profile,
    label: SWIPE_PROFILE_LABELS[profile] || profile,
  }));
}

function availableSwipeKeys() {
  const scope = currentPreviewScope();
  if (scope.mode === 'keyboard26') return currentPreviewKeyboardKeys();
  if (scope.mode === 'numeric') return currentPreviewKeyboardKeys();
  return KEYBOARD26_FUNCTION_KEY_ORDER;
}

function emptySwipeData() {
  return {
    pinyin: { swipe_up: {}, swipe_down: {} },
    alphabetic: { swipe_up: {}, swipe_down: {} },
    numeric: { swipe_up: {}, swipe_down: {} },
  };
}

function swipesEnabled() {
  const comboMode = state.project?.keyboardCombo?.swipeBehavior?.mode;
  if (comboMode === 'disabled') return false;
  const profile = currentKeyboardPreviewProfile();
  const layoutKey = profile === 'pinyin9' ? 'pinyin' : profile;
  const layoutMode = state.project?.keyboardCombo?.swipeBehavior?.layouts?.[layoutKey]?.mode;
  if (layoutMode === 'disabled') return false;
  const uiMode = state.project?.keyboardCombo?.swipeBehavior?.ui?.[currentSwipeUiKey()]?.mode;
  if (uiMode === 'disabled') return false;
  return state.project?.data?.swipesEnabled !== false;
}

function currentSwipeUiKey() {
  const source = previewSourceName(state.previewMode);
  if (source.startsWith('pinyin_9')) return 'pinyin9';
  if (source.startsWith('numeric_9')) return 'numeric';
  return currentKeyboardPreviewProfile();
}

function setCurrentSwipeProfileEnabled(enabled) {
  state.project.data = state.project.data || {};
  state.project.keyboardCombo = state.project.keyboardCombo || {};
  state.project.keyboardCombo.swipeBehavior = state.project.keyboardCombo.swipeBehavior || {};
  const uiKey = currentSwipeUiKey();
  if (['pinyin', 'pinyin9', 'alphabetic', 'numeric'].includes(uiKey)) {
    const layoutKey = uiKey === 'pinyin9' ? null : uiKey;
    state.project.keyboardCombo.swipeBehavior.ui = state.project.keyboardCombo.swipeBehavior.ui || {};
    state.project.keyboardCombo.swipeBehavior.ui[uiKey] = {
      ...(state.project.keyboardCombo.swipeBehavior.ui[uiKey] || {}),
      mode: enabled ? 'visible' : 'disabled',
    };
    if (layoutKey) {
      state.project.keyboardCombo.swipeBehavior.layouts = state.project.keyboardCombo.swipeBehavior.layouts || {};
      state.project.keyboardCombo.swipeBehavior.layouts[layoutKey] = {
        ...(state.project.keyboardCombo.swipeBehavior.layouts[layoutKey] || {}),
        mode: enabled ? 'visible' : 'disabled',
      };
    }
    if (enabled) state.project.data.swipesEnabled = true;
    return;
  }
  state.project.data.swipesEnabled = enabled;
}

function swipeKeyLabel(key) {
  const profile = currentKeyboardPreviewProfile();
  if (profile === 'numeric') {
    return numericDisplayValue(state.project.keyboards?.numeric || {}, key);
  }
  if (profile === 'symbolic') {
    return symbolicDisplayValue(state.project.keyboards?.symbolic || {}, key);
  }
  if (profile === 'panel') {
    return metricKeyLabel('panel', state.project.keyboards?.panel || {}, key);
  }
  if (profile === 'pinyin' || profile === 'pinyin9' || profile === 'alphabetic' || profile === 'keyboard26') {
    return keyDisplayValue(state.project.keyboards?.keyboard26 || {}, key);
  }
  return SWIPE_KEY_SHORT_LABELS[key] || NUMERIC_KEY_LABELS[key] || key;
}

function currentKeyboardPreviewProfile() {
  const mode = previewRenderMode(state.previewMode);
  if (mode === 'keyboard26') return keyboard26PreviewProfile();
  if (mode === 'numeric') return 'numeric';
  if (mode === 'emoji') return 'emoji';
  return mode;
}

function currentPreviewKeyboardKeys() {
  const keyboardId = keyboardIdForPreviewMode(previewRenderMode(state.previewMode));
  const keyboard = state.project.keyboards?.[keyboardId] || {};
  if (keyboardId === 'keyboard26') {
    const orientation = previewRenderOrientation(state.previewMode);
    const variantRows = keyboard26VariantRows(keyboard, orientation);
    if (variantRows.length) {
      return collectLayoutKeys(variantRows);
    }
    if (orientation === 'landscape') {
      const rows = Object.values(keyboard.layout?.landscape || {}).flatMap((sectionRows) => sectionRows || []);
      if (rows.length) return collectLayoutKeys(rows);
    }
    return [...new Set(keyboard26PortraitRows(keyboard).flatMap((row) => row.keys || []).filter(Boolean))];
  }
  if (keyboardId === 'numeric') {
    return collectLayoutKeys(keyboard.layout?.portrait?.columns || DEFAULT_NUMERIC_COLUMNS);
  }
  if (keyboardId === 'symbolic') {
    return collectLayoutKeys(keyboard.layout?.portrait?.functionRows || DEFAULT_SYMBOLIC_FUNCTION_ROWS);
  }
  if (keyboardId === 'emoji') {
    return ['emojiCollection'];
  }
  if (keyboardId === 'panel') {
    return PANEL_BUTTONS.map(([key]) => key).filter(Boolean);
  }
  return collectMetricKeysForKeyboard(keyboardId, keyboard).filter((key) => key !== 'normal');
}

function swipeProfilesForPreview(value = {}, direction = state.swipeMode) {
  const profile = currentKeyboardPreviewProfile();
  if (!['pinyin', 'alphabetic', 'numeric'].includes(profile)) return [];
  const entries = value?.[profile]?.[direction] || {};
  const previewKeys = currentPreviewKeyboardKeys();
  const keys = [...new Set([
    ...previewKeys,
    ...Object.keys(entries).filter((key) => previewKeys.includes(key)),
  ].filter(Boolean))];
  return [{ profile, config: value?.[profile] || {}, entries, keys }];
}

function renderSwipeToken(profile, direction, key, entry = {}) {
  const path = `data.swipes.${profile}.${direction}.${key}`;
  const active = state.editingKey?.path === path ? ' is-active' : '';
  const label = swipeKeyLabel(key);
  return `
    <button class="swipe-token${active}" type="button" data-key-edit-path="${escapeHtml(path)}" title="编辑 ${escapeHtml(key)}">
      <span class="swipe-key">${escapeHtml(label)}</span>
    </button>
  `;
}

function renderSwipeEntry(profile, direction, key, entry = {}) {
  const action = actionToFields(entry.action);
  const path = `data.swipes.${profile}.${direction}.${key}`;
  const display = swipeDisplayLabel(entry);
  return `
    <section class="group-card key-edit-panel swipe-edit-panel" data-key-edit-panel-path="${escapeHtml(path)}">
      <section class="key-edit-section">
        <h4>显示与指令</h4>
        <div class="key-edit-fields swipe-edit-fields">
          ${input({ path: `data.swipes.${profile}.${direction}.${key}.label.text`, label: '显示文字', value: display.value, className: 'swipe-label-field' })}
          ${actionEditorFields({ basePath: path, action })}
        </div>
      </section>
      <span class="key-edit-focus-sentinel" tabindex="0" aria-hidden="true"></span>
    </section>
  `;
}

function renderSwipes(value) {
  const scope = currentPreviewScope();
  if (
    scope.mode === 'panel'
    || scope.mode === 'emoji'
    || (scope.mode === 'symbolic' && effectiveKeyboardCombo().slots.symbolic.source !== 'custom')
  ) {
    const message = scope.mode === 'panel'
      ? '自定义面板不支持上下划动配置，请切换到中文、英文、数字或自定义符号键盘后再编辑。'
      : scope.mode === 'emoji'
        ? (effectiveKeyboardCombo().slots.emoji.source === 'custom'
          ? '自定义 Emoji 当前只支持数据源维护，不支持上下划动配置。'
          : 'App内emoji键盘不支持上下划动配置，请切换到中文、英文、数字或自定义符号键盘后再编辑。')
        : 'App内符号键盘不在这里配置上下划动，请切换到自定义符号键盘后再编辑。';
    return `
      <section class="group-card">
        ${renderPreviewScopeHeader('划动编辑', `当前为${scope.mode === 'panel' ? '自定义面板' : scope.mode === 'emoji' ? ' Emoji 数据源' : 'App内符号键盘'}预览。`)}
        <p class="empty-note">${message}</p>
      </section>
    `;
  }
  const direction = state.swipeMode === 'swipe_down' ? 'swipe_down' : 'swipe_up';
  const enabled = swipesEnabled();
  const profiles = swipeProfilesForPreview(value, direction);
  const manualProfile = state.swipeDraftProfile || profiles[0]?.profile || 'pinyin';
  const manualKeyOptions = availableSwipeKeys();
  const manualKey = state.swipeDraftKey || manualKeyOptions[0] || '';
  const swipeActions = `
    <button class="swipe-switch${enabled ? ' active' : ''}" type="button" data-swipe-action="toggle-enabled" aria-pressed="${enabled ? 'true' : 'false'}">
      <span>划动功能</span>
      <strong>${enabled ? '开启' : '关闭'}</strong>
    </button>
    <button class="tool-button danger-button" type="button" data-swipe-action="clear-all">一键清除</button>
  `;
  return `
    <section class="group-card keyboard-tool-card swipe-settings-card">
      <div class="keyboard-tool-head">
        <div class="keyboard-tool-title">
          ${renderPreviewScopeHeader('划动编辑', '只显示当前预览键盘支持划动配置的按键。', swipeActions)}
        </div>
      </div>
      <div class="keyboard-tool-segment">
        <span>划动方向</span>
        <div class="mode-menu" role="tablist" aria-label="划动方向">
          <button class="${direction === 'swipe_up' ? 'active' : ''}" type="button" data-swipe-action="set-direction" data-direction="swipe_up">上划</button>
          <button class="${direction === 'swipe_down' ? 'active' : ''}" type="button" data-swipe-action="set-direction" data-direction="swipe_down">下划</button>
        </div>
      </div>
      <div class="key-edit-fields key-edit-fields-four swipe-manual-add-grid">
        ${selectField({
    path: 'swipeDraft.profile',
    label: '手动新增 Profile',
    value: manualProfile,
    options: availableSwipeProfiles(),
  }).replace('data-path="swipeDraft.profile"', 'data-swipe-draft="profile"')}
        ${selectField({
    path: 'swipeDraft.key',
    label: '按键',
    value: manualKey,
    options: manualKeyOptions.map((item) => ({ value: item, label: swipeKeyLabel(item) })),
  }).replace('data-path="swipeDraft.key"', 'data-swipe-draft="key"')}
        <div class="field-card field-card-inline-action">
          <label>新增入口</label>
          <button class="tool-button primary" type="button" data-swipe-action="add-entry">添加划动项</button>
        </div>
      </div>
      ${enabled ? '' : '<p class="empty-note swipe-disabled-note">划动功能已关闭，预览和导出不显示划动标记；已有配置会保留，重新开启后恢复。</p>'}
    </section>
    ${profiles.length ? profiles.map(({ profile, config, entries, keys }) => {
    return `
    <section class="group-card keyboard-key-card swipe-profile-card${enabled ? '' : ' is-disabled'}">
      <div class="field-card-title row-heading">
        <span class="row-title">${escapeHtml(SWIPE_PROFILE_LABELS[profile] || profile)}</span>
        <span class="swipe-default-center">点击按键编辑长按设置</span>
      </div>
      <div class="swipe-token-list">
        ${keys.map((key) => renderSwipeToken(profile, direction, key, entries[key] || {})).join('') || '<p class="empty-note">当前预览没有可操作按键。</p>'}
      </div>
      ${keys.map((key) => {
    const path = `data.swipes.${profile}.${direction}.${key}`;
    return state.editingKey?.path === path ? renderSwipeEntry(profile, direction, key, entries[key] || {}) : '';
  }).join('')}
    </section>
  `;
  }).join('') : renderScopedEmptyNote()}
  `;
}

function renderHintItem(group, key, index, item = {}) {
  const action = actionToFields(item.action);
  const label = labelToFields(item.label);
  return `
    <div class="hint-item-row">
      <span class="hint-index">候选 ${index + 1}</span>
      <section class="hint-item-section">
        <h4>标签</h4>
        <div class="hint-item-fields">
          ${selectField({
    path: `data.hints.${group}.${key}.list.${index}.labelType`,
    label: '标签类型',
    value: label.type,
    options: [
      { value: 'text', label: 'text' },
      { value: 'systemImageName', label: 'systemImageName' },
    ],
  })}
          ${input({ path: `data.hints.${group}.${key}.list.${index}.labelValue`, label: '标签值', value: label.value })}
        </div>
      </section>
      <section class="hint-item-section">
        <h4>指令</h4>
        <div class="hint-item-fields">
          ${actionEditorFields({ basePath: `data.hints.${group}.${key}.list.${index}`, action })}
        </div>
      </section>
    </div>
  `;
}

function hintKeyLabel(group, key) {
  if (group === 'number' && /^number\d$/.test(key)) return key.replace('number', '');
  return swipeKeyLabel(key);
}

function hintGroupsForPreview(value = {}) {
  const profile = currentKeyboardPreviewProfile();
  if (profile === 'numeric') {
    const entries = value?.number || {};
    const keys = currentPreviewKeyboardKeys()
      .filter((key) => /^\d$/.test(key))
      .map((key) => `number${key}`);
    return [{ group: 'number', entries, keys }];
  }
  if (profile === 'pinyin') {
    const entries = value?.pinyin || {};
    const previewKeys = currentPreviewKeyboardKeys();
    const keys = previewKeys;
    return [{ group: 'pinyin', entries, keys }];
  }
  return [];
}

function renderHintToken(group, key) {
  const path = `data.hints.${group}.${key}`;
  const active = state.editingKey?.path === path ? ' is-active' : '';
  return `
    <button class="swipe-token hint-token${active}" type="button" data-key-edit-path="${escapeHtml(path)}" title="编辑 ${escapeHtml(key)}">
      <span class="swipe-key">${escapeHtml(hintKeyLabel(group, key))}</span>
    </button>
  `;
}

function renderHintEntryPanel(group, key, entry = {}) {
  const path = `data.hints.${group}.${key}`;
  return `
    <section class="group-card key-edit-panel hint-edit-panel" data-key-edit-panel-path="${escapeHtml(path)}">
      <section class="key-edit-section">
        <h4>布局</h4>
        <div class="hint-entry-fields">
          ${input({ path: `data.hints.${group}.${key}.selectedIndex`, label: '默认选中序号', value: entry.selectedIndex ?? 0, type: 'number', step: '1' })}
          ${input({ path: `data.hints.${group}.${key}.size.width`, label: '宽度', value: entry.size?.width ?? '', type: 'number', step: '1' })}
          ${input({ path: `data.hints.${group}.${key}.size.height`, label: '高度', value: entry.size?.height ?? '', type: 'number', step: '1' })}
        </div>
      </section>
      <section class="key-edit-section">
        <h4>候选项</h4>
        <div class="hint-item-list">
          ${(entry.list || []).map((item, index) => renderHintItem(group, key, index, item)).join('') || '<p class="empty-note">这个按键还没有长按候选项。</p>'}
        </div>
      </section>
      <span class="key-edit-focus-sentinel" tabindex="0" aria-hidden="true"></span>
    </section>
  `;
}

function renderHints(value) {
  const scope = currentPreviewScope();
  if (
    scope.mode === 'panel'
    || scope.mode === 'emoji'
    || (scope.mode === 'symbolic' && effectiveKeyboardCombo().slots.symbolic.source !== 'custom')
  ) {
    const message = scope.mode === 'panel'
      ? '自定义面板不支持长按候选编辑，请切换到中文、数字或自定义符号键盘后再操作。'
      : scope.mode === 'emoji'
        ? (effectiveKeyboardCombo().slots.emoji.source === 'custom'
          ? '自定义 Emoji 当前只支持数据源维护，不支持长按候选编辑。'
          : 'App内emoji键盘不支持长按候选编辑，请切换到支持的键盘类型后再操作。')
        : 'App内符号键盘不在这里编辑长按候选，请切换到自定义符号键盘后再操作。';
    return `
      <section class="group-card">
        ${renderPreviewScopeHeader('长按候选', `当前为${scope.mode === 'panel' ? '自定义面板' : scope.mode === 'emoji' ? ' Emoji 数据源' : 'App内符号键盘'}预览。`)}
        <p class="empty-note">${message}</p>
      </section>
    `;
  }
  const groups = hintGroupsForPreview(value);
  if (!groups.length) {
    return `
      <section class="group-card">
        ${renderPreviewScopeHeader('长按候选', '只显示当前预览键盘里可配置长按候选的按键。')}
        ${renderScopedEmptyNote()}
      </section>
    `;
  }
  return `
    <section class="group-card keyboard-tool-card hint-scope-card">
      ${renderPreviewScopeHeader('长按候选', '只显示当前预览键盘里可配置长按候选的按键。')}
    </section>
    ${groups.map(({ group, entries, keys }) => `
    <section class="group-card keyboard-key-card swipe-profile-card hint-profile-card">
      <div class="field-card-title row-heading">
        <span class="row-title">${escapeHtml(HINT_GROUP_LABELS[group] || group)}</span>
        <span class="swipe-default-center">点击按键编辑长按候选</span>
      </div>
      <div class="swipe-token-list hint-token-list">
        ${keys.map((key) => renderHintToken(group, key)).join('') || '<p class="empty-note">当前预览没有可操作按键。</p>'}
      </div>
      ${keys.map((key) => {
    const path = `data.hints.${group}.${key}`;
    return state.editingKey?.path === path ? renderHintEntryPanel(group, key, entries[key] || {}) : '';
  }).join('')}
    </section>
  `).join('')}
  `;
}

function collectionSourceLabel(sourceKey) {
  return {
    emojiDataSource: 'Emoji 数据源',
    symbolicDataSource: '符号键盘数据源',
    numericSymbols: '数字键盘符号',
    pinyin9Symbols: '九宫格符号',
  }[sourceKey] || sourceKey;
}

function collectionItemsText(items) {
  return Array.isArray(items) ? items.map((item) => normalizeCollectionItemText(item)).join('\n') : '';
}

function normalizeCollectionItemText(item) {
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (item?.label !== undefined) return normalizeCollectionItemText(item.label);
  if (item?.text !== undefined) return String(item.text);
  if (item?.value !== undefined) return String(item.value);
  return JSON.stringify(item);
}

function collectionObjectField(sourceKey, entryKey, fieldKey, value) {
  return `
    <label class="collection-inline-field">
      <span>${escapeHtml(fieldKey)}</span>
      <input
        type="text"
        value="${escapeHtml(value ?? '')}"
        data-collection-entry-field="true"
        data-source-key="${escapeHtml(sourceKey)}"
        data-entry-key="${escapeHtml(entryKey)}"
        data-field-key="${escapeHtml(fieldKey)}"
      />
    </label>
  `;
}

function renderCollectionEntryEditor(sourceKey, entryKey, value) {
  if (typeof value === 'string') {
    return `
      <input
        type="text"
        value="${escapeHtml(value)}"
        data-collection-entry-value="true"
        data-source-key="${escapeHtml(sourceKey)}"
        data-entry-key="${escapeHtml(entryKey)}"
      />
    `;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const action = actionToFields(value.action);
    const displayFields = [];
    const actionFields = [];
    const extraFields = [];
    if ('label' in value) displayFields.push(collectionObjectField(sourceKey, entryKey, 'label', value.label));
    if ('value' in value) displayFields.push(collectionObjectField(sourceKey, entryKey, 'value', value.value));
    if ('action' in value) {
      actionFields.push(actionEditorFields({
        basePath: `data.collections.${sourceKey}.${entryKey}`,
        action,
      }));
    }
    const unknownKeys = Object.keys(value).filter((key) => !['label', 'value', 'action'].includes(key));
    if ((!displayFields.length && !actionFields.length) || unknownKeys.length) {
      extraFields.push(`
        <label class="collection-json-field">
          <span>JSON</span>
          <textarea data-json-path="${escapeHtml(`data.collections.${sourceKey}.${entryKey}`)}">${escapeHtml(JSON.stringify(value, null, 2))}</textarea>
        </label>
      `);
    }
    return `<div class="collection-entry-object">
      ${displayFields.length ? `<section class="collection-entry-section"><h4>显示</h4>${displayFields.join('')}</section>` : ''}
      ${actionFields.length ? `<section class="collection-entry-section"><h4>指令</h4>${actionFields.join('')}</section>` : ''}
      ${extraFields.length ? `<section class="collection-entry-section"><h4>JSON</h4>${extraFields.join('')}</section>` : ''}
    </div>`;
  }
  return `
    <textarea data-json-path="${escapeHtml(`data.collections.${sourceKey}.${entryKey}`)}">${escapeHtml(JSON.stringify(value, null, 2))}</textarea>
  `;
}

function collectionItemObjectField(sourceKey, category, index, fieldKey, value) {
  return `
    <label class="collection-inline-field">
      <span>${escapeHtml(fieldKey)}</span>
      <input
        type="text"
        value="${escapeHtml(value ?? '')}"
        data-collection-item-field="true"
        data-source-key="${escapeHtml(sourceKey)}"
        data-category-name="${escapeHtml(category)}"
        data-item-index="${index}"
        data-field-key="${escapeHtml(fieldKey)}"
      />
    </label>
  `;
}

function renderCollectionItemEditor(sourceKey, category, item, index) {
  const itemPath = `data.collections.${sourceKey}.${category}.${index}`;
  if (typeof item === 'string' || typeof item === 'number') {
    return `
      <div class="collection-item-row">
        <span class="collection-item-index">${index + 1}</span>
        <input
          type="text"
          value="${escapeHtml(String(item))}"
          data-collection-item-value="true"
          data-source-key="${escapeHtml(sourceKey)}"
          data-category-name="${escapeHtml(category)}"
          data-item-index="${index}"
        />
      </div>
    `;
  }
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const action = actionToFields(item.action);
    const displayFields = [];
    if ('label' in item) displayFields.push(collectionItemObjectField(sourceKey, category, index, 'label', item.label));
    if ('value' in item) displayFields.push(collectionItemObjectField(sourceKey, category, index, 'value', item.value));
    return `
      <div class="collection-item-row is-object">
        <span class="collection-item-index">${index + 1}</span>
        <div class="collection-item-object">
          <div class="collection-item-display">
            ${displayFields.join('') || collectionItemObjectField(sourceKey, category, index, 'label', normalizeCollectionItemText(item))}
          </div>
          ${item.action ? `<div class="collection-item-action">${actionEditorFields({ basePath: itemPath, action })}</div>` : ''}
          <label class="collection-json-field">
            <span>JSON</span>
            <textarea data-json-path="${escapeHtml(itemPath)}">${escapeHtml(JSON.stringify(item, null, 2))}</textarea>
          </label>
        </div>
      </div>
    `;
  }
  return `
    <div class="collection-item-row">
      <span class="collection-item-index">${index + 1}</span>
      <textarea data-json-path="${escapeHtml(itemPath)}">${escapeHtml(JSON.stringify(item, null, 2))}</textarea>
    </div>
  `;
}

function renderCollectionItemsEditor(sourceKey, category, items = []) {
  const list = Array.isArray(items) ? items : [];
  return `
    <div class="collection-item-editor">
      ${list.map((item, index) => renderCollectionItemEditor(sourceKey, category, item, index)).join('') || '<p class="empty-note">这个分类还没有内容。</p>'}
    </div>
  `;
}

function renderCategorizedCollection(sourceKey, source = {}) {
  const categories = Array.isArray(source.category) ? source.category : [];
  return `
    <section class="group-card collection-source-card">
      <div class="collection-source-head">
        <div>
          <h3>${escapeHtml(collectionSourceLabel(sourceKey))}</h3>
          <p>${categories.length} 个分类</p>
        </div>
        <button class="tool-button primary" type="button" data-collection-action="add-category" data-source-key="${escapeHtml(sourceKey)}"><span aria-hidden="true">＋</span>添加分类</button>
      </div>
      <div class="collection-category-list">
        ${categories.map((category, index) => `
          <section class="field-card collection-category-card">
            <div class="collection-category-head">
              <label>
                <span>分类名</span>
                <input
                  type="text"
                  value="${escapeHtml(category)}"
                  data-collection-category-name="true"
                  data-source-key="${escapeHtml(sourceKey)}"
                  data-category-index="${index}"
                />
              </label>
              <div class="collection-category-actions">
                <button class="mini-button" type="button" data-collection-action="move-category" data-source-key="${escapeHtml(sourceKey)}" data-category-index="${index}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>上移</button>
                <button class="mini-button" type="button" data-collection-action="move-category" data-source-key="${escapeHtml(sourceKey)}" data-category-index="${index}" data-direction="1" ${index === categories.length - 1 ? 'disabled' : ''}>下移</button>
                <button class="mini-button danger-button" type="button" data-collection-action="remove-category" data-source-key="${escapeHtml(sourceKey)}" data-category-index="${index}">删除</button>
              </div>
            </div>
            <label class="collection-items-field">
              <span>批量内容，一行一个</span>
              <textarea
                data-collection-items="true"
                data-source-key="${escapeHtml(sourceKey)}"
                data-category-name="${escapeHtml(category)}"
              >${escapeHtml(collectionItemsText(source[category]))}</textarea>
            </label>
            ${renderCollectionItemsEditor(sourceKey, category, source[category])}
          </section>
        `).join('') || '<p class="empty-note">暂无分类。</p>'}
      </div>
    </section>
  `;
}

function renderFlatCollection(sourceKey, source = {}) {
  const entries = Object.entries(source);
  return `
    <section class="group-card collection-source-card">
      <div class="collection-source-head">
        <div>
          <h3>${escapeHtml(collectionSourceLabel(sourceKey))}</h3>
          <p>${entries.length} 个分组</p>
        </div>
      </div>
      <div class="collection-entry-list">
        ${entries.map(([entryKey, value]) => `
          <section class="field-card collection-entry-card">
            <strong>${escapeHtml(entryKey)}</strong>
            ${renderCollectionEntryEditor(sourceKey, entryKey, value)}
          </section>
        `).join('') || '<p class="empty-note">暂无数据。</p>'}
      </div>
    </section>
  `;
}

function renderCollections(value = {}) {
  const scope = currentPreviewScope();
  const scopedSourceKeys = {
    symbolic: ['symbolicDataSource'],
    emoji: ['emojiDataSource'],
    numeric: ['numericSymbols'],
    keyboard26: scope.pinyinVariant === '9' ? ['pinyin9Symbols'] : [],
  }[scope.mode] || [];
  const entries = scopedSourceKeys.length
    ? scopedSourceKeys
      .filter((sourceKey) => Object.prototype.hasOwnProperty.call(value || {}, sourceKey))
      .map((sourceKey) => [sourceKey, value[sourceKey]])
    : Object.entries(value);
  const description = scopedSourceKeys.length
    ? '只显示右侧当前预览键盘实际使用的数据源；切换右侧预览后，这里的编辑内容会一起切换。'
    : '当前预览没有对应的数据源，先切到数字键盘、中文九键、符号键盘或 Emoji 键盘后再编辑。';
  return `
    <section class="group-card collection-help-card">
      ${renderPreviewScopeHeader('符号数据源', description)}
      <p>分类数据按“一行一个”编辑；分类顺序会同步到 category。源码编辑保留在底部，用于处理暂未拆成表单的复杂结构。</p>
    </section>
    ${entries.length ? entries.map(([sourceKey, source]) => (
    Array.isArray(source?.category)
      ? renderCategorizedCollection(sourceKey, source)
      : renderFlatCollection(sourceKey, source)
  )).join('') : '<section class="group-card"><p class="empty-note">当前预览没有匹配的数据源。</p></section>'}
  `;
}

function currentPreviewNativeSource() {
  const source = previewSourceName(state.previewMode);
  if (!source) return null;
  const orientation = state.previewOrientation || previewOrientationForKeyboardName(source);
  const keyboardName = keyboardNameWithOrientation(source, orientation);
  const payload = buildSkinEffectModel(state.project, { theme: state.theme, keyboardName })?.nativePayload || null;
  if (!payload) return null;
  return {
    path: `${state.theme}/${keyboardName}.yaml`,
    title: `${keyboardTemplateLabel(source)} · ${orientation === 'landscape' ? '横屏' : '竖屏'}完整预览源码`,
    description: '这里显示右侧当前预览键盘最终送入导出的完整 native payload，包含 keyboardLayout、toolbarLayout、候选栏、工具栏按钮、按键样式和动作。',
    value: payload,
    editable: false,
  };
}

function jsonSourceForMode(value, path = activeModule().path) {
  if (activeModule().kind === 'customKeyboards') {
    return currentPreviewNativeSource() || {
      path,
      title: '当前预览源码',
      description: '当前预览没有可用 native payload。',
      value,
      editable: false,
    };
  }
  return {
    path,
    title: '当前数据源码',
    description: '这里显示当前左侧模块的数据源码，可直接编辑 JSON。',
    value,
    editable: true,
  };
}

function jsonSourceText(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

function jsonSearchMatches(text, query) {
  const search = String(query || '').trim().toLowerCase();
  if (!search) return [];
  const lines = String(text || '').split('\n');
  const matches = [];
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(search)) matches.push(index);
  });
  return matches;
}

function renderJsonSearchBar(sourceText) {
  const matches = jsonSearchMatches(sourceText, state.jsonSearch);
  const activeIndex = matches.length ? Math.min(state.jsonSearchIndex, matches.length - 1) : 0;
  const summary = state.jsonSearch.trim()
    ? (matches.length ? `${activeIndex + 1} / ${matches.length}` : '0 / 0')
    : '输入关键词';
  return `
    <div class="json-source-toolbar">
      <label class="json-search-field">
        <span>搜索</span>
        <input type="search" value="${escapeHtml(state.jsonSearch)}" data-json-search="query" placeholder="键名、动作、颜色、toolbar..." />
      </label>
      <span class="json-search-count">${escapeHtml(summary)}</span>
      <button class="mini-button" type="button" data-json-search-action="prev" ${matches.length ? '' : 'disabled'}>上一个</button>
      <button class="mini-button" type="button" data-json-search-action="next" ${matches.length ? '' : 'disabled'}>下一个</button>
    </div>
  `;
}

function renderJsonSearchPreview(sourceText) {
  const matches = jsonSearchMatches(sourceText, state.jsonSearch);
  if (!state.jsonSearch.trim()) return '';
  const activeIndex = matches.length ? Math.min(state.jsonSearchIndex, matches.length - 1) : 0;
  const activeLine = matches[activeIndex];
  const lines = sourceText.split('\n');
  if (!matches.length) {
    return '<p class="empty-note json-search-empty">没有匹配项。</p>';
  }
  const start = Math.max(0, activeLine - 3);
  const end = Math.min(lines.length, activeLine + 4);
  const query = state.jsonSearch.trim();
  const lowerQuery = query.toLowerCase();
  const rows = [];
  for (let index = start; index < end; index += 1) {
    const line = lines[index];
    const lowerLine = line.toLowerCase();
    const hitIndex = lowerLine.indexOf(lowerQuery);
    const highlighted = hitIndex >= 0
      ? `${escapeHtml(line.slice(0, hitIndex))}<mark>${escapeHtml(line.slice(hitIndex, hitIndex + query.length))}</mark>${escapeHtml(line.slice(hitIndex + query.length))}`
      : escapeHtml(line);
    rows.push(`
      <div class="json-search-line${index === activeLine ? ' is-active' : ''}">
        <span>${index + 1}</span>
        <code>${highlighted || ' '}</code>
      </div>
    `);
  }
  return `<div class="json-search-preview">${rows.join('')}</div>`;
}

function renderJsonTextarea(path, value, options = {}) {
  const sourceText = jsonSourceText(value);
  const readOnly = options.editable === false;
  return `
    <section class="json-source-panel">
      <div class="json-source-head">
        <div>
          <h3>${escapeHtml(options.title || '当前数据源码')}</h3>
          <p>${escapeHtml(options.description || '')}</p>
        </div>
      </div>
      ${renderJsonSearchBar(sourceText)}
      ${renderJsonSearchPreview(sourceText)}
      <label class="json-label">${readOnly ? '完整源码预览' : '当前数据源码'}</label>
      <textarea
        class="json-source-textarea"
        data-json-path="${escapeHtml(path)}"
        data-json-source-textarea="true"
        ${readOnly ? 'readonly' : ''}
        spellcheck="false"
      >${escapeHtml(sourceText)}</textarea>
    </section>
  `;
}

function renderJsonEditor(value, path = activeModule().path) {
  const source = jsonSourceForMode(value, path);
  return renderJsonTextarea(source.path, source.value, source);
}

function renderCustomKeyboardSystemNotice(scope = currentPreviewScope()) {
  const message = scope.mode === 'emoji'
    ? 'Emoji 使用数据源预览，请到“符号数据源”模块维护内容。'
    : '当前为App内符号键盘，请通过“生成你的键盘方案”切换到自定义符号键盘后再编辑布局。';
  return `<section class="group-card"><p class="empty-note">${escapeHtml(message)}</p></section>`;
}

function renderEditor() {
  const module = activeModule();
  const value = currentValue();
  el.moduleKicker.textContent = '';
  el.moduleKicker.hidden = true;
  el.moduleTitle.textContent = module.id === 'keyboardCombo' ? '生成你的键盘方案' : module.title;
  el.moduleDescription.textContent = module.id === 'keyboardCombo'
    ? '根据你的习惯确认偏好后解锁自定义内容'
    : '';
  el.moduleDescription.hidden = !el.moduleDescription.textContent;
  el.jsonModeButton.textContent = state.jsonMode ? '表单模式' : '源码模式';

  if (state.jsonMode) {
    if (module.kind === 'customKeyboards') {
      const scope = currentPreviewScope();
      const blocked = scope.mode === 'emoji' || (scope.mode === 'symbolic' && effectiveKeyboardCombo().slots.symbolic.source !== 'custom');
      el.editorRoot.innerHTML = blocked
        ? renderCustomKeyboardSystemNotice(scope)
        : renderJsonEditor(customKeyboardPanelValue(), customKeyboardPanelPath());
      return;
    }
    el.editorRoot.innerHTML = renderJsonEditor(value);
    return;
  }

  const renderers = {
    object: renderObjectEditor,
    assets: renderAssets,
    colors: renderColors,
    numberMap: renderNumberMap,
    pointMap: renderPointMap,
    animation: renderAnimation,
    keyboardFrame: renderKeyboardFrame,
    insetsTree: renderInsetsTree,
    surfaceStyles: renderSurfaceStyles,
    customKeyboards: renderCustomKeyboards,
    keyboard26Text: renderKeyboard26Text,
    numericKeyboard: renderNumericKeyboard,
    stringMap: renderStringMap,
    symbolic: renderSymbolic,
    toolbar: renderToolbar,
    metrics: renderMetrics,
    swipes: renderSwipes,
    hints: renderHints,
    collections: renderCollections,
    candidateStyles: renderCandidateStyles,
    keyboardCombo: renderKeyboardCombo,
    json: renderJsonEditor,
    meta: renderMetaEditor,
  };

  el.editorRoot.innerHTML = (renderers[module.kind] || renderJsonEditor)(value);
  autosizeJsonSourceEditors();
  el.editorRoot.querySelectorAll('.default-hint-input[data-uses-default="true"]').forEach((item) => {
    item.classList.add('is-default-value');
  });
  el.editorRoot.querySelectorAll('select.action-type-select').forEach((item) => {
    syncSelectOptionLabels(item, false);
  });
}

function autosizeJsonSourceEditors() {
  el.editorRoot.querySelectorAll('[data-json-source-textarea]').forEach((textarea) => {
    textarea.style.height = 'auto';
    const viewportSpace = Math.max(360, Math.floor(window.innerHeight - textarea.getBoundingClientRect().top - 36));
    const contentHeight = textarea.scrollHeight + 6;
    textarea.style.height = `${Math.min(Math.max(contentHeight, viewportSpace), 1400)}px`;
  });
}

function renderModules() {
  el.moduleList.innerHTML = MODULES.map((module) => {
    const disabledState = isModuleDisabled(module);
    return `
      <button
        class="module-button ${module.id === state.moduleId ? 'active' : ''}"
        type="button"
        data-module="${module.id}"
        ${disabledState.disabled ? `disabled aria-disabled="true" title="${escapeHtml(disabledState.reason)}"` : ''}
      >
        <span>${escapeHtml(module.title)}</span>
        ${disabledState.disabled ? `<span class="module-status">${escapeHtml(disabledState.statusLabel)}</span>` : ''}
      </button>
    `;
  }).join('');
}

function renderProjectSummary() {
  const validation = validateProject(state.project);
  const guide = guideState();
  const lines = [
    `项目：${state.project.meta.name}`,
    `模板：${state.project.templateId}`,
    `结构版本：${state.project.schemaVersion}`,
    `方案：${guide.status === 'ready' ? '已生成' : '待生成'}`,
    `校验：${validation.ok ? '通过' : `${validation.errors.length} 个错误`}`,
    `颜色设置：${Object.keys(state.project.theme.light.colors).length} / ${Object.keys(state.project.theme.dark.colors).length}`,
    `可编辑模块：${visibleModuleCount(state.project)}`,
  ];
  el.projectSummary.textContent = lines.join('\n');
}

function renderSaveState() {
  el.saveState.textContent = state.savedAt
    ? `已保存 ${new Date(state.savedAt).toLocaleTimeString()}`
    : '未保存';
}

function visitorStatsEndpoint() {
  const globalEndpoint = window.HAMSTER_VISITOR_STATS_ENDPOINT;
  const metaEndpoint = document.querySelector('meta[name="hamster-visitor-stats-endpoint"]')?.content;
  return String(globalEndpoint || metaEndpoint || '').trim();
}

function setVisitorStatsStatus(text, status = 'idle') {
  if (!el.visitorStats) return;
  el.visitorStats.textContent = text;
  el.visitorStats.className = `visitor-stats is-${status}`;
  el.visitorStats.title = {
    idle: '未配置访问统计接口',
    loading: '正在读取访问人数',
    ready: '匿名访客 ID 去重统计',
    error: '访问统计接口不可用',
  }[status] || '';
}

function createVisitorId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto?.getRandomValues?.(bytes);
  if (bytes.some(Boolean)) {
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return [...bytes].map((item, index) => {
      const hex = item.toString(16).padStart(2, '0');
      return [4, 6, 8, 10].includes(index) ? `-${hex}` : hex;
    }).join('');
  }
  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function visitorId() {
  try {
    const current = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (current) return current;
    const next = createVisitorId();
    localStorage.setItem(VISITOR_ID_STORAGE_KEY, next);
    return next;
  } catch {
    return createVisitorId();
  }
}

function visitorCountFromPayload(payload) {
  const value = payload?.uniqueVisitors ?? payload?.visitors ?? payload?.count;
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : null;
}

async function refreshVisitorStats() {
  const endpoint = visitorStatsEndpoint();
  if (!endpoint) {
    setVisitorStatsStatus('访问 --', 'idle');
    return;
  }
  setVisitorStatsStatus('访问 ...', 'loading');
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId: visitorId(),
        app: 'hamster-skin-designer-workbench',
        path: window.location.pathname,
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const count = visitorCountFromPayload(payload);
    if (count == null) throw new Error('invalid visitor count');
    setVisitorStatsStatus(`访问 ${count.toLocaleString()}`, 'ready');
  } catch {
    setVisitorStatsStatus('访问 --', 'error');
  }
}

function formatTemplateTime(value) {
  if (!value) return '未知时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知时间';
  return date.toLocaleString();
}

function renderTemplateLibraryDialog() {
  document.querySelector('.template-library-overlay')?.remove();
  if (!state.templateLibraryOpen) return;

  const overlay = document.createElement('div');
  overlay.className = 'template-library-overlay';
  const rows = state.templateLibrary.length
    ? state.templateLibrary.map((item) => `
      <article class="template-library-item">
        <div>
          <h3>${escapeHtml(item.name || '未命名皮肤')}</h3>
          <p>${escapeHtml(item.author || '未知作者')} · ${escapeHtml(formatTemplateTime(item.updatedAt))}</p>
          <p class="template-library-meta">${escapeHtml(item.templateId || '未知模板')} · ${escapeHtml(item.schemaVersion || '未知版本')}</p>
        </div>
        <div class="template-library-actions">
          <button class="tool-button secondary" type="button" data-template-action="load" data-template-id="${escapeHtml(item.id)}">载入</button>
          <button class="tool-button secondary danger-action" type="button" data-template-action="delete" data-template-id="${escapeHtml(item.id)}">删除</button>
        </div>
      </article>
    `).join('')
    : '<p class="template-library-empty">还没有本地模板。点击“保存模板”后会在这里出现。</p>';

  overlay.innerHTML = `
    <section class="template-library-dialog" role="dialog" aria-modal="true" aria-labelledby="templateLibraryTitle">
      <header class="template-library-header">
        <div>
          <p class="eyebrow">Browser Cache</p>
          <h2 id="templateLibraryTitle">本地模板库</h2>
        </div>
        <button class="icon-button icon-only" type="button" data-template-action="close" aria-label="关闭模板库">
          <span>×</span>
        </button>
      </header>
      <p class="template-library-note">模板保存在当前浏览器本地缓存中，刷新页面可继续载入，不依赖服务器。</p>
      ${state.templateLibraryStatus ? `<p class="template-library-status">${escapeHtml(state.templateLibraryStatus)}</p>` : ''}
      <div class="template-library-list">${rows}</div>
    </section>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('[data-template-action="close"]')?.focus();
}

async function refreshTemplateLibrary(status = '') {
  try {
    state.templateLibrary = await listTemplateSnapshots();
    state.templateLibraryStatus = status;
  } catch (error) {
    state.templateLibraryStatus = `读取模板库失败：${error.message}`;
  }
  renderTemplateLibraryDialog();
}

async function openTemplateLibrary() {
  state.templateLibraryOpen = true;
  await refreshTemplateLibrary();
}

function closeTemplateLibrary() {
  state.templateLibraryOpen = false;
  state.templateLibraryStatus = '';
  renderTemplateLibraryDialog();
}

async function saveCurrentTemplateSnapshot() {
  try {
    const record = await saveTemplateSnapshot(state.project);
    state.savedAt = record.updatedAt;
    if (state.templateLibraryOpen) {
      await refreshTemplateLibrary(`已保存“${record.name}”。`);
    }
    renderSaveState();
  } catch (error) {
    alert(`保存失败：${error.message}`);
  }
}

async function loadTemplateFromLibrary(id) {
  try {
    const snapshot = await loadTemplateSnapshot(id);
    if (!snapshot?.project) {
      await refreshTemplateLibrary('未找到这个模板快照。');
      return;
    }
    if (!validateProject(snapshot.project).ok || snapshot.project.templateId !== state.sampleProject.templateId) {
      await refreshTemplateLibrary('这个模板与当前工作台版本不兼容，未载入。');
      return;
    }
    pushUndoSnapshot();
    state.project = normalizedWorkbenchProject(
      snapshot.project,
      state.sampleProject,
      snapshot.project?.guide ? snapshot.project.guide.status || 'ready' : 'ready',
    );
    state.original = deepClone(state.project);
    state.savedAt = new Date().toISOString();
    saveProject(state.project);
    closeTemplateLibrary();
    renderAll();
  } catch (error) {
    await refreshTemplateLibrary(`载入失败：${error.message}`);
  }
}

async function deleteTemplateFromLibrary(id) {
  try {
    await deleteTemplateSnapshot(id);
    await refreshTemplateLibrary('模板已删除。');
  } catch (error) {
    await refreshTemplateLibrary(`删除失败：${error.message}`);
  }
}

function previewKeyboards() {
  const items = state.project?.previewKeyboards;
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      if (typeof item === 'string') {
        return { id: `legacy-${index}-${item}`, name: item, mode: 'keyboard26' };
      }
      return {
        id: item?.id || `keyboard-${index}`,
        name: item?.name || `键盘${index + 1}`,
        mode: item?.mode || 'keyboard26',
        orientation: item?.orientation || previewOrientationForKeyboardName(item?.source || item?.name || ''),
        source: item?.source || '',
      };
    })
    .filter((item) => item.name)
    .filter((item) => {
      const source = String(item.source || item.name || '');
      const guide = guideState();
      if (guide.preferences.symbolLayout === 'system' && source.startsWith('symbolic_')) {
        return false;
      }
      if (guide.preferences.emojiLayout === 'system' && source.startsWith('emoji_')) {
        return false;
      }
      return true;
    });
}

function hiddenPreviewKeyboardNames() {
  const items = state.project?.hiddenPreviewKeyboards;
  if (!Array.isArray(items)) return [];
  return items.filter((item) => typeof item === 'string' && item.trim());
}

function setHiddenPreviewKeyboardNames(names) {
  state.project.hiddenPreviewKeyboards = [...new Set(names.filter((item) => typeof item === 'string' && item.trim()))];
}

function customPreviewValue(id) {
  return `custom:${id}`;
}

function configPreviewValue(name) {
  return `config:${name}`;
}

function configPreviewKeyboards() {
  const hiddenNames = new Set(hiddenPreviewKeyboardNames());
  let names = collectConfigKeyboardNames(effectiveConfig(state.project?.config || {}), { includePreviewKeyboards: false });
  const preferredNames = guidePreferredPreviewNames(state.project);
  if (isGuideReady(state.project) && preferredNames.length) {
    const preferredSet = new Set(preferredNames);
    const filtered = names.filter((name) => preferredSet.has(name));
    if (filtered.length) names = filtered;
  }
  const visibleNames = names.filter((name) => !hiddenNames.has(name));
  return visibleNames.length ? visibleNames : names.slice(0, 1);
}

function defaultPreviewMode() {
  if (!isGuideReady(state.project)) return '';
  const keyboards = configPreviewKeyboards();
  if (keyboards.includes('pinyin_26_portrait')) return configPreviewValue('pinyin_26_portrait');
  return keyboards.length ? configPreviewValue(keyboards[0]) : 'keyboard26';
}

function previewModeExists(mode) {
  if (['keyboard26', 'alphabetic', 'numeric', 'symbolic', 'emoji', 'panel'].includes(mode)) return true;
  return configPreviewKeyboards().some((name) => configPreviewValue(name) === mode)
    || previewKeyboards().some((item) => customPreviewValue(item.id) === mode);
}

function previewOptionValues() {
  return [
    ...configPreviewKeyboards().map((name) => configPreviewValue(name)),
    ...previewKeyboards().map((item) => customPreviewValue(item.id)),
  ];
}

function previewModeOptionGroups() {
  if (!isGuideReady(state.project)) return [];
  return [
    {
      label: '键盘配置',
      options: configPreviewKeyboards().map((name) => ({
        value: configPreviewValue(name),
        label: keyboardTemplateLabel(name),
      })),
    },
    {
      label: '自定义键盘',
      options: previewKeyboards().map((item) => ({
        value: customPreviewValue(item.id),
        label: item.name,
      })),
    },
  ].filter((group) => group.options.length);
}

function closePreviewModeMenu() {
  el.previewModeMenu.hidden = true;
  el.previewModeButton.setAttribute('aria-expanded', 'false');
}

function togglePreviewModeMenu() {
  const isOpen = !el.previewModeMenu.hidden;
  el.previewModeMenu.hidden = isOpen;
  el.previewModeButton.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
}

function setPreviewMode(mode) {
  state.previewMode = mode;
  state.previewModeStack = [];
  state.editingKey = null;
  closePreviewModeMenu();
  if (isPreviewScopedModule()) renderEditor();
  renderCurrentPreview();
}

function setPreviewModeFromControl(mode) {
  state.previewMode = mode;
  state.previewModeStack = [];
}

function renderPreviewModeOptions() {
  if (!previewModeExists(state.previewMode)) {
    state.previewMode = defaultPreviewMode();
  }
  const groups = previewModeOptionGroups();
  const configOptions = groups.find((group) => group.label === '键盘配置')?.options.map((item) => (
    `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`
  )).join('') || '';
  const customOptions = groups.find((group) => group.label === '自定义键盘')?.options.map((item) => (
    `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`
  )).join('') || '';
  el.previewMode.innerHTML = `
    ${configOptions ? `<optgroup label="键盘配置">${configOptions}</optgroup>` : ''}
    ${customOptions ? `<optgroup label="自定义键盘">${customOptions}</optgroup>` : ''}
  `;
  el.previewMode.value = state.previewMode || '';
  const transientPreviewLabels = {
    keyboard26: '中文键盘',
    alphabetic: '英文键盘',
    numeric: '数字键盘',
    symbolic: 'App内符号键盘',
    emoji: 'App内emoji键盘',
    panel: '自定义面板',
  };
  const selectedOption = groups.flatMap((group) => group.options).find((item) => item.value === state.previewMode);
  el.previewModeButton.textContent = selectedOption?.label || transientPreviewLabels[state.previewMode] || '选择键盘';
  el.previewModeMenu.innerHTML = groups.map((group) => `
    <section class="preview-mode-group">
      <div class="preview-mode-group-label">${escapeHtml(group.label)}</div>
      ${group.options.map((item) => `
        <button
          class="preview-mode-option ${item.value === state.previewMode ? 'active' : ''}"
          type="button"
          role="option"
          aria-selected="${item.value === state.previewMode ? 'true' : 'false'}"
          data-preview-mode-value="${escapeHtml(item.value)}"
        >${escapeHtml(item.label)}</button>
      `).join('')}
    </section>
  `).join('');
}

function previewSourceName(mode = state.previewMode) {
  if (mode?.startsWith?.('config:')) return mode.slice('config:'.length);
  if (mode?.startsWith?.('custom:')) {
    const keyboard = previewKeyboards().find((item) => customPreviewValue(item.id) === mode);
    return keyboard?.source || keyboard?.name || '';
  }
  if (mode === 'alphabetic') {
    const orientation = state.previewOrientation === 'landscape' ? 'landscape' : 'portrait';
    return `alphabetic_26_${orientation}`;
  }
  return mode || '';
}

function previewTemplateDisplayName(mode = state.previewMode) {
  const source = previewSourceName(mode);
  return keyboardTemplateLabel(source || '键盘');
}

function defaultPreviewKeyboardName() {
  const baseName = previewTemplateDisplayName();
  const existingNames = new Set(previewKeyboards().map((item) => item.name));
  if (!existingNames.has(baseName)) return baseName;
  let index = 2;
  while (existingNames.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}

function previewModeForKeyboardName(name) {
  if (name.startsWith('pinyin_')) return 'keyboard26';
  if (name.startsWith('numeric')) return 'numeric';
  if (name.startsWith('symbolic')) return 'symbolic';
  if (name.startsWith('emoji')) return 'emoji';
  if (name.startsWith('panel')) return 'panel';
  return 'keyboard26';
}

function previewOrientationForKeyboardName(name) {
  return name.includes('landscape') ? 'landscape' : 'portrait';
}

function previewValueForMode(mode, orientation = 'portrait') {
  const keyboards = configPreviewKeyboards();
  const landscape = orientation === 'landscape';
  const combo = effectiveKeyboardCombo();
  const pinyinVariant = combo.slots.pinyin.variant;
  const numericVariant = combo.slots.numeric.variant === 'ios' ? 'numeric_ios' : 'numeric_9';
  const preferredPinyin = ['9', '14', '17', '18', '26'].includes(pinyinVariant)
    ? `pinyin_${pinyinVariant}_${landscape ? 'landscape' : 'portrait'}`
    : null;
  const candidates = {
    keyboard26: landscape
      ? [preferredPinyin, 'pinyin_9_landscape', 'pinyin_14_landscape', 'pinyin_17_landscape', 'pinyin_18_landscape', 'pinyin_26_landscape', 'alphabetic_26_landscape', 'alphabetic_26_plain_landscape']
      : [preferredPinyin, 'pinyin_9_portrait', 'pinyin_14_portrait', 'pinyin_17_portrait', 'pinyin_18_portrait', 'pinyin_26_portrait', 'alphabetic_26_portrait', 'alphabetic_26_plain_portrait'],
    alphabetic: [
      landscape ? 'alphabetic_26_landscape' : 'alphabetic_26_portrait',
      landscape ? 'alphabetic_26_plain_landscape' : 'alphabetic_26_plain_portrait',
    ],
    numeric: [
      `${numericVariant}_${landscape ? 'landscape' : 'portrait'}`,
      landscape ? 'numeric_9_landscape' : 'numeric_9_portrait',
      landscape ? 'numeric_ios_landscape' : 'numeric_ios_portrait',
    ],
    symbolic: combo.slots.symbolic.source === 'system'
      ? []
      : [landscape ? 'symbolic_landscape' : 'symbolic_portrait', landscape ? 'symbolic_portrait' : 'symbolic_landscape'],
    emoji: combo.slots.emoji.source === 'system'
      ? []
      : [landscape ? 'emoji_landscape' : 'emoji_portrait'],
    panel: [landscape ? 'panel_landscape' : 'panel_portrait'],
  }[mode] || [];
  const found = candidates.find((name) => keyboards.includes(name));
  return found ? configPreviewValue(found) : defaultPreviewMode();
}

function previewValueForModePreferred(mode, orientation = 'portrait') {
  const value = previewValueForMode(mode, orientation);
  if (mode === 'alphabetic' && previewSourceName(value).startsWith('alphabetic_')) return value;
  if (previewRenderMode(value) === mode) return value;
  return mode;
}

function previewModeForKeySwitch(renderMode, releasedKey, orientation) {
  if (!releasedKey) return null;
  const key = String(releasedKey);
  if (key === '123') return previewValueForModePreferred('numeric', orientation);
  if (key === 'symbol') return previewValueForModePreferred('symbolic', orientation);
  if (key === 'emoji') return previewValueForModePreferred('emoji', orientation);
  if (key === 'menu') return previewValueForModePreferred('panel', orientation);
  if (key === 'return' && ['numeric', 'symbolic', 'emoji', 'panel'].includes(renderMode)) {
    return previewValueForModePreferred('keyboard26', orientation);
  }
  if (key === 'cnen' && renderMode === 'keyboard26') {
    const profile = currentKeyboardPreviewProfile();
    if (profile === 'alphabetic') return previewValueForModePreferred('keyboard26', orientation);
    const alphabeticMode = previewValueForModePreferred('alphabetic', orientation);
    return previewRenderMode(alphabeticMode) === 'alphabetic' ? alphabeticMode : 'alphabetic';
  }
  return null;
}

function switchPreviewModeByKey(releasedKey, renderMode, orientation) {
  const key = String(releasedKey || '');
  if (key === 'return' && ['numeric', 'symbolic', 'emoji', 'panel'].includes(renderMode)) {
    const previous = Array.isArray(state.previewModeStack) ? state.previewModeStack.pop() : null;
    return previous && previewModeExists(previous)
      ? previous
      : previewValueForModePreferred('keyboard26', orientation);
  }
  const nextMode = previewModeForKeySwitch(renderMode, releasedKey, orientation);
  if (!nextMode || nextMode === state.previewMode) return null;
  const shouldPushReturnTarget = ['123', 'symbol', 'emoji', 'menu'].includes(key);
  if (shouldPushReturnTarget) {
    state.previewModeStack = Array.isArray(state.previewModeStack) ? state.previewModeStack : [];
    if (state.previewModeStack[state.previewModeStack.length - 1] !== state.previewMode) {
      state.previewModeStack.push(state.previewMode);
    }
  }
  return nextMode;
}

function previewRenderMode(mode) {
  if (mode === 'alphabetic') return 'keyboard26';
  if (mode?.startsWith?.('config:')) {
    return previewModeForKeyboardName(mode.slice('config:'.length));
  }
  if (!mode?.startsWith?.('custom:')) return mode;
  const keyboard = previewKeyboards().find((item) => customPreviewValue(item.id) === mode);
  return keyboard?.mode || 'keyboard26';
}

function previewRenderOrientation(mode) {
  if (mode?.startsWith?.('config:')) {
    return previewOrientationForKeyboardName(mode.slice('config:'.length));
  }
  if (mode?.startsWith?.('custom:')) {
    const keyboard = previewKeyboards().find((item) => customPreviewValue(item.id) === mode);
    return keyboard?.orientation || previewOrientationForKeyboardName(keyboard?.source || keyboard?.name || '');
  }
  return state.previewOrientation === 'landscape' ? 'landscape' : 'portrait';
}

function addPreviewKeyboard() {
  pushUndoSnapshot();
  const name = (el.previewKeyboardNameInput.value || '').trim() || defaultPreviewKeyboardName();
  state.project.previewKeyboards = Array.isArray(state.project.previewKeyboards)
    ? state.project.previewKeyboards
    : [];
  const id = `keyboard-${Date.now()}`;
  const source = previewSourceName();
  state.project.previewKeyboards.push({
    id,
    name,
    mode: previewRenderMode(state.previewMode),
    orientation: previewRenderOrientation(state.previewMode),
    source,
  });
  el.previewKeyboardNameInput.value = '';
  if (!previewModeExists(state.previewMode)) {
    state.previewMode = defaultPreviewMode();
  }
  markDirty();
  renderAll();
}

function selectedCustomPreviewKeyboard() {
  if (!state.previewMode?.startsWith?.('custom:')) return null;
  const id = state.previewMode.slice('custom:'.length);
  return previewKeyboards().find((item) => item.id === id) || null;
}

function deleteSelectedPreviewKeyboard() {
  const optionsBeforeDelete = previewOptionValues();
  if (optionsBeforeDelete.length <= 1) return;
  const selectedIndex = Math.max(0, optionsBeforeDelete.indexOf(state.previewMode));
  const selectedCustom = selectedCustomPreviewKeyboard();
  if (!selectedCustom && !state.previewMode?.startsWith?.('config:')) return;
  pushUndoSnapshot();
  if (selectedCustom) {
    state.project.previewKeyboards = (state.project.previewKeyboards || []).filter((item, index) => {
      const itemId = typeof item === 'string' ? `legacy-${index}-${item}` : item?.id;
      return itemId !== selectedCustom.id;
    });
  } else if (state.previewMode?.startsWith?.('config:')) {
    const name = state.previewMode.slice('config:'.length);
    setHiddenPreviewKeyboardNames([...hiddenPreviewKeyboardNames(), name]);
  }
  const optionsAfterDelete = previewOptionValues();
  state.previewMode = optionsAfterDelete[Math.min(selectedIndex, optionsAfterDelete.length - 1)] || defaultPreviewMode();
  markDirty();
  renderAll();
}

function resetPreviewKeyboardList() {
  if (!hiddenPreviewKeyboardNames().length) return;
  pushUndoSnapshot();
  state.project.hiddenPreviewKeyboards = [];
  if (!previewModeExists(state.previewMode)) {
    state.previewMode = defaultPreviewMode();
  }
  markDirty();
  renderAll();
}

function previewKeyboardCellFromEvent(event) {
  const cell = event.target?.closest?.('.calayer-keyboard .calayer-cell');
  return cell && el.previewRoot.contains(cell) ? cell : null;
}

function clearPressedPreviewCell() {
  if (previewLongPressTimer) {
    clearTimeout(previewLongPressTimer);
    previewLongPressTimer = null;
  }
  if (previewReleaseTimer) {
    clearTimeout(previewReleaseTimer);
    previewReleaseTimer = null;
  }
  pressedPreviewCell?.classList.remove('is-pressed');
  pressedPreviewCell = null;
  if (state.previewHintKey || state.previewPressedKey) {
    state.previewHintKey = null;
    state.previewPressedKey = null;
    renderCurrentPreview();
  }
}

function currentPreviewRenderOptions(overrides = {}) {
  const orientation = previewRenderOrientation(state.previewMode);
  return {
    candidateState: state.candidateState,
    symbolicCategory: state.symbolicCategory,
    orientation,
    pinyinVariant: currentPreviewScope().pinyinVariant,
    previewSourceName: previewSourceName(state.previewMode),
    keyboardProfile: currentKeyboardPreviewProfile(),
    activeHintKey: state.previewHintKey,
    activePressedKey: state.previewPressedKey || (state.centerEditMode === 'custom' ? state.selectedCenterTarget?.key : null),
    shiftActive: state.previewCapsLocked || state.previewShiftActive,
    ...overrides,
  };
}

function closePreviewExpand() {
  if (!state.previewExpanded) return;
  state.previewExpanded = false;
  renderPreviewExpandDialog();
}

function openPreviewExpand() {
  state.previewExpanded = true;
  renderPreviewExpandDialog();
}

function renderPreviewExpandDialog() {
  document.querySelector('.preview-expand-overlay')?.remove();
  if (!state.previewExpanded || !state.project) return;
  const previewOptions = currentPreviewRenderOptions({
    maxDisplayWidth: Math.max(0, window.innerWidth - 560),
    maxDisplayHeight: Math.max(0, window.innerHeight - 300),
  });
  const overlay = document.createElement('div');
  overlay.className = 'preview-expand-overlay';
  overlay.innerHTML = `
    <section class="preview-expand-dialog" role="dialog" aria-modal="true" aria-label="放大键盘预览">
      <div class="preview-expand-copy">
        <span>点击任意位置关闭</span>
      </div>
      <div class="preview-expand-stage">
        ${renderPreview(state.project, state.theme, previewRenderMode(state.previewMode), previewOptions)}
      </div>
    </section>
  `;
  document.body.appendChild(overlay);
}

function blurActiveControlForPreview() {
  const activeElement = document.activeElement;
  if (activeElement && activeElement !== document.body && typeof activeElement.blur === 'function') {
    activeElement.blur();
  }
}

function pressPreviewKeyboardCell(event) {
  if (event.button !== undefined && event.button !== 0) return;
  const cell = previewKeyboardCellFromEvent(event);
  if (!cell) return;
  blurActiveControlForPreview();
  if (!cell.matches('[data-symbolic-category]')) {
    event.preventDefault();
  }
  clearPressedPreviewCell();
  pressedPreviewCell = cell;
  pressedPreviewCell.classList.add('is-pressed');
  const key = cell.dataset.previewKey;
  const renderMode = previewRenderMode(state.previewMode);
  if (activeModule().id === 'metrics' && key && currentPreviewKeyboardKeys().includes(key)) {
    setSelectedMetricKeys([key], keyboardIdForPreviewMode(renderMode), previewRenderOrientation(state.previewMode));
    renderEditor();
  }
  state.previewPressedKey = key || null;
  if (state.previewPressedKey) {
    renderCurrentPreview();
    previewLongPressTimer = setTimeout(() => {
      previewLongPressTimer = null;
      if (state.previewPressedKey !== key) return;
      if (renderMode === 'keyboard26' && key === 'shift') {
        state.previewCapsLocked = true;
        state.previewShiftActive = true;
      }
      state.previewHintKey = key;
      renderCurrentPreview();
    }, PREVIEW_LONG_PRESS_DELAY_MS);
  }
}

function releasePreviewKeyboardCell() {
  if (!state.previewPressedKey && !state.previewHintKey && !pressedPreviewCell) return;
  if (previewLongPressTimer) {
    clearTimeout(previewLongPressTimer);
    previewLongPressTimer = null;
  }
  if (previewReleaseTimer) {
    clearTimeout(previewReleaseTimer);
    previewReleaseTimer = null;
  }
  if (state.previewHintKey) {
    clearPressedPreviewCell();
    return;
  }
  const releasedKey = state.previewPressedKey;
  const renderMode = previewRenderMode(state.previewMode);
  const orientation = previewRenderOrientation(state.previewMode);
  const switchTargetMode = switchPreviewModeByKey(releasedKey, renderMode, orientation);
  if (switchTargetMode) {
    state.previewMode = switchTargetMode;
    state.previewShiftActive = false;
    state.previewCapsLocked = false;
    clearPressedPreviewCell();
    renderEditor();
    return;
  }
  if (renderMode === 'keyboard26' && releasedKey === 'shift') {
    if (state.previewCapsLocked) {
      state.previewCapsLocked = false;
      state.previewShiftActive = false;
    } else {
      state.previewShiftActive = !state.previewShiftActive;
    }
    clearPressedPreviewCell();
    return;
  }
  previewReleaseTimer = setTimeout(() => {
    previewReleaseTimer = null;
    clearPressedPreviewCell();
  }, PREVIEW_PRESS_FEEDBACK_MS);
}

function setActiveTheme(theme) {
  state.theme = theme === 'dark' ? 'dark' : 'light';
  if (activeModule().kind === 'colors') {
    renderEditor();
  }
  renderCurrentPreview();
}

function openConfirmDialog({ title = '确认操作', message, confirmLabel = '确认删除', confirmClass = 'danger-action', onConfirm }) {
  state.confirmDialog = { title, message, confirmLabel, confirmClass, onConfirm };
  renderConfirmDialog();
}

function closeConfirmDialog() {
  state.confirmDialog = null;
  renderConfirmDialog();
}

function renderConfirmDialog() {
  document.querySelector('.confirm-overlay')?.remove();
  if (!state.confirmDialog) return;
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmDialogTitle">
      <h2 id="confirmDialogTitle">${escapeHtml(state.confirmDialog.title)}</h2>
      <p>${escapeHtml(state.confirmDialog.message)}</p>
      <div class="confirm-actions">
        <button class="tool-button secondary" type="button" data-confirm-action="cancel">取消</button>
        <button class="tool-button primary ${escapeHtml(state.confirmDialog.confirmClass || '')}" type="button" data-confirm-action="confirm">${escapeHtml(state.confirmDialog.confirmLabel || '确认')}</button>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('[data-confirm-action="cancel"]')?.focus();
}

function shouldShowWelcomeNotice() {
  try {
    return localStorage.getItem(WELCOME_NOTICE_STORAGE_KEY) !== 'dismissed';
  } catch {
    return true;
  }
}

function markWelcomeNoticeDismissed() {
  try {
    localStorage.setItem(WELCOME_NOTICE_STORAGE_KEY, 'dismissed');
  } catch {
    // localStorage 不可用时只在当前页面会话关闭。
  }
}

function openWelcomeNotice() {
  if (!shouldShowWelcomeNotice()) return;
  state.welcomeNotice.visible = true;
  state.welcomeNotice.remainingSeconds = WELCOME_NOTICE_SECONDS;
  if (state.welcomeNotice.timer) clearInterval(state.welcomeNotice.timer);
  state.welcomeNotice.timer = setInterval(() => {
    state.welcomeNotice.remainingSeconds = Math.max(0, state.welcomeNotice.remainingSeconds - 1);
    if (state.welcomeNotice.remainingSeconds === 0 && state.welcomeNotice.timer) {
      clearInterval(state.welcomeNotice.timer);
      state.welcomeNotice.timer = null;
    }
    renderWelcomeNotice();
  }, 1000);
  renderWelcomeNotice();
}

function closeWelcomeNotice() {
  if (state.welcomeNotice.remainingSeconds > 0) return;
  if (state.welcomeNotice.timer) {
    clearInterval(state.welcomeNotice.timer);
    state.welcomeNotice.timer = null;
  }
  state.welcomeNotice.visible = false;
  markWelcomeNoticeDismissed();
  renderWelcomeNotice();
}

function renderWelcomeNotice() {
  document.querySelector('.welcome-notice-overlay')?.remove();
  if (!state.welcomeNotice.visible) return;
  const remaining = Number(state.welcomeNotice.remainingSeconds || 0);
  const overlay = document.createElement('div');
  overlay.className = 'welcome-notice-overlay';
  overlay.innerHTML = `
    <section class="welcome-notice-dialog" role="dialog" aria-modal="true" aria-labelledby="welcomeNoticeTitle">
      <h2 id="welcomeNoticeTitle">开放性测试说明</h2>
      <div class="welcome-notice-body">
        <p>当前工具处于开放性测试阶段，暂时只支持纯色皮肤编辑。</p>
        <p>导入功能支持读取纯色皮肤包，并会尝试解析同类导出后缀中的 Jsonnet / YAML 固定属性。</p>
        <p>本工具不是元书作者创作。问题反馈请联系 Q 群浮生，或在元书频道皮肤专栏反馈，请勿反馈错人。</p>
      </div>
      <div class="welcome-notice-actions">
        <button class="tool-button primary" type="button" data-welcome-action="close" ${remaining > 0 ? 'disabled' : ''}>
          ${remaining > 0 ? `请阅读 ${remaining} 秒` : '我已了解'}
        </button>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('[data-welcome-action="close"]')?.focus();
}

function syncCandidateStateButtons() {
  document.querySelectorAll('[data-candidate-state]').forEach((item) => {
    item.classList.toggle('active', item.dataset.candidateState === state.candidateState);
  });
}

function renderCurrentPreview() {
  renderPreviewModeOptions();
  const guideReady = isGuideReady(state.project);
  syncCandidateStateButtons();
  el.previewKeyboardNameInput.placeholder = defaultPreviewKeyboardName();
  const canDeletePreviewKeyboard = previewOptionValues().length > 1;
  el.deletePreviewKeyboardButton.disabled = !guideReady || !canDeletePreviewKeyboard;
  el.deletePreviewKeyboardButton.title = !guideReady ? '请先完成“生成你的键盘方案”' : canDeletePreviewKeyboard ? '删除当前预览键盘' : '至少保留一个预览键盘';
  const canResetPreviewList = hiddenPreviewKeyboardNames().length > 0;
  el.resetPreviewKeyboardListButton.disabled = !guideReady || !canResetPreviewList;
  el.resetPreviewKeyboardListButton.title = !guideReady ? '请先完成“生成你的键盘方案”' : canResetPreviewList ? '恢复隐藏的默认键盘' : '默认键盘列表已完整';
  el.previewModeButton.disabled = !guideReady;
  el.previewMode.disabled = !guideReady;
  el.previewKeyboardNameInput.disabled = !guideReady;
  el.addPreviewKeyboardButton.disabled = !guideReady;
  el.expandPreviewButton.disabled = !guideReady;
  const nextThemeLabel = state.theme === 'dark' ? '浅色' : '深色';
  const currentThemeLabel = state.theme === 'dark' ? '深色' : '浅色';
  el.themeToggleButton.innerHTML = `
    <span class="theme-toggle-track" aria-hidden="true">
      <span class="theme-toggle-thumb"></span>
    </span>
    <span class="theme-toggle-copy">
      <strong>${currentThemeLabel}</strong>
      <span>${nextThemeLabel}</span>
    </span>
  `;
  el.themeToggleButton.setAttribute('aria-label', `当前为${currentThemeLabel}，点击切换为${nextThemeLabel}`);
  el.themeToggleButton.title = `点击切换为${nextThemeLabel}`;
  el.themeToggleButton.dataset.theme = state.theme;
  el.themeToggleButton.classList.toggle('active', state.theme === 'dark');
  el.expandPreviewButton.setAttribute('aria-label', state.previewExpanded ? '关闭放大预览' : '放大预览');
  el.expandPreviewButton.title = state.previewExpanded ? '关闭放大预览' : '放大预览';
  if (!guideReady) {
    el.previewModeButton.textContent = '等待生成方案';
    el.previewRoot.innerHTML = `
      <section class="preview-guide-placeholder">
        <span class="preview-guide-badge">生成方案</span>
        <h3>生成你的键盘方案</h3>
        <p>请在左侧“生成你的键盘方案”里确认中文、英文、符号、Emoji、划动和空格行偏好。生成方案后，这里只显示当前方案相关的键盘预览。</p>
      </section>
    `;
    renderPreviewExpandDialog();
    return;
  }
  const previewRootWidth = el.previewRoot?.clientWidth || 0;
  const previewOptions = currentPreviewRenderOptions({
    maxDisplayWidth: Math.max(0, (previewRootWidth - 24) * 0.96),
  });
  const orientation = previewOptions.orientation;
  state.previewOrientation = orientation;
  el.previewRoot.innerHTML = renderPreview(state.project, state.theme, previewRenderMode(state.previewMode), previewOptions);
  const selectedSymbolicCategory = el.previewRoot.querySelector('.symbolic-category-cell.is-selected-category');
  selectedSymbolicCategory?.scrollIntoView({ block: 'nearest' });
  renderPreviewExpandDialog();
}

function collectScreenshotStyles() {
  const chunks = [];
  for (const sheet of [...document.styleSheets]) {
    try {
      const rules = [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
      if (rules) chunks.push(rules);
    } catch {
      if (sheet.href) chunks.push(`@import url("${sheet.href}");`);
    }
  }
  return chunks.join('\n');
}

function blobToUint8Array(blob) {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

function canvasToPngBytes(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('无法生成 demo.png。'));
        return;
      }
      blobToUint8Array(blob).then(resolve, reject);
    }, 'image/png');
  });
}

function cssRgbToCanvasColor(value, fallback = '#000000') {
  if (!value || value === 'transparent') return fallback;
  const rgba = String(value).match(/^rgba?\(([^)]+)\)$/i);
  if (!rgba) return value;
  const parts = rgba[1].split(',').map((part) => part.trim());
  const [r, g, b] = parts;
  const a = parts[3] === undefined ? 1 : Number(parts[3]);
  if (!Number.isFinite(a) || a >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function roundedRectPath(ctx, x, y, width, height, radius = 0) {
  const r = Math.max(0, Math.min(Number(radius) || 0, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawRoundedRect(ctx, rect, color, radius = 0) {
  ctx.fillStyle = cssRgbToCanvasColor(color, 'transparent');
  roundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, radius);
  ctx.fill();
}

function drawCenteredText(ctx, text, rect, style = {}) {
  const content = String(text || '').trim();
  if (!content) return;
  const fontSize = Math.max(8, Number.parseFloat(style.fontSize) || 16);
  const fontWeight = style.fontWeight && style.fontWeight !== '400' ? style.fontWeight : '400';
  ctx.fillStyle = cssRgbToCanvasColor(style.color, '#111827');
  ctx.font = `${fontWeight} ${fontSize}px "Microsoft YaHei UI", "PingFang SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(content, rect.x + rect.width / 2, rect.y + rect.height / 2, Math.max(4, rect.width - 4));
}

function demoIconTextForNode(node) {
  const cell = node.closest?.('.calayer-cell');
  if (!cell) return '';
  const className = String(cell.className || '');
  for (const [key, label] of Object.entries(DEMO_SYSTEM_IMAGE_LABELS)) {
    if (className.includes(`is-${key}`)) return label;
  }
  return '';
}

function drawCanvasPreviewFallback(ctx, stage, width, height) {
  const stageRect = stage?.getBoundingClientRect?.();
  const preview = stage?.querySelector?.('.skin-preview');
  const previewStyle = preview ? getComputedStyle(preview) : null;
  drawRoundedRect(ctx, { x: 0, y: 0, width, height }, previewStyle?.backgroundColor || (state.theme === 'dark' ? '#474747' : '#d0d3da'), 0);
  if (!stage || !stageRect) {
    drawCenteredText(ctx, state.project?.meta?.name || 'Hamster Skin Preview', { x: 0, y: 0, width, height }, { color: state.theme === 'dark' ? '#f5f5f5' : '#1f2933', fontSize: '16px' });
    return;
  }
  const toLocalRect = (node) => {
    const rect = node.getBoundingClientRect();
    return {
      x: rect.left - stageRect.left,
      y: rect.top - stageRect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const backgrounds = [...stage.querySelectorAll('.calayer-background')];
  for (const node of backgrounds) {
    const rect = toLocalRect(node);
    if (rect.width <= 0 || rect.height <= 0) continue;
    const style = getComputedStyle(node);
    const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
    drawRoundedRect(ctx, rect, style.backgroundColor, radius);
  }

  const candidateContents = [...stage.querySelectorAll('.calayer-candidate-content')];
  for (const node of candidateContents) {
    const style = getComputedStyle(node);
    if (!style.backgroundColor || style.backgroundColor === 'rgba(0, 0, 0, 0)') continue;
    drawRoundedRect(ctx, toLocalRect(node), style.backgroundColor, 999);
  }

  const foregrounds = [...stage.querySelectorAll('.calayer-foreground, .calayer-candidate span, .calayer-candidate strong, .calayer-candidate em, .calayer-expanded-candidate span, .calayer-expanded-candidate strong, .calayer-expanded-candidate em')];
  for (const node of foregrounds) {
    const rect = toLocalRect(node);
    if (rect.width <= 0 || rect.height <= 0) continue;
    const style = getComputedStyle(node);
    const content = node.classList?.contains('is-systemImage')
      ? demoIconTextForNode(node)
      : node.textContent;
    drawCenteredText(ctx, content, rect, style);
  }
}

function drawImageContain(ctx, image, targetWidth, targetHeight, sourceWidth, sourceHeight) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const x = (targetWidth - drawWidth) / 2;
  const y = (targetHeight - drawHeight) / 2;
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

function fallbackDemoPngBytes(width, height, stage = null) {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = Math.max(1, Math.round(width * DEMO_SCREENSHOT_SCALE));
  sourceCanvas.height = Math.max(1, Math.round(height * DEMO_SCREENSHOT_SCALE));
  const sourceCtx = sourceCanvas.getContext('2d');
  sourceCtx.scale(DEMO_SCREENSHOT_SCALE, DEMO_SCREENSHOT_SCALE);
  drawCanvasPreviewFallback(sourceCtx, stage, width, height);

  const canvas = document.createElement('canvas');
  canvas.width = DEMO_IMAGE_WIDTH;
  canvas.height = DEMO_IMAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  drawImageContain(ctx, sourceCanvas, DEMO_IMAGE_WIDTH, DEMO_IMAGE_HEIGHT, sourceCanvas.width, sourceCanvas.height);
  return canvasToPngBytes(canvas);
}

function buildDemoPreviewProject(sourceProject = state.project) {
  const project = deepClone(sourceProject || state.sampleProject || {});
  if (!isGuideReady(project)) {
    ensureProjectGuide(project, 'pending');
    applyGuidePlanToProject(project);
  } else {
    ensureProjectGuide(project, 'ready');
  }
  return project;
}

function demoPreviewOptionsForProject(project) {
  const guide = guideState(project);
  const preferences = guide.preferences || {};
  const pinyinVariant = ['9', '14', '17', '18', '26'].includes(preferences.chineseLayout)
    ? preferences.chineseLayout
    : '26';
  return {
    candidateState: 'toolbar',
    symbolicCategory: state.symbolicCategory,
    orientation: 'portrait',
    pinyinVariant,
    previewSourceName: `pinyin_${pinyinVariant}_portrait`,
    keyboardProfile: 'pinyin',
    activeHintKey: null,
    activePressedKey: null,
    shiftActive: false,
  };
}

function createHiddenDemoPreviewStage(sourceProject = state.project) {
  const project = buildDemoPreviewProject(sourceProject);
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '480px';
  host.style.height = '360px';
  host.style.overflow = 'hidden';
  host.style.pointerEvents = 'none';
  host.style.opacity = '0';
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = renderPreview(project, state.theme, 'keyboard26', demoPreviewOptionsForProject(project));
  document.body.appendChild(host);
  return {
    stage: host.querySelector('.skin-preview-stage'),
    cleanup: () => host.remove(),
  };
}

function currentDemoPreviewStage(sourceProject = state.project) {
  const stage = el.previewRoot.querySelector('.skin-preview-stage');
  if (stage && sourceProject === state.project) return { stage, cleanup: () => {} };
  return createHiddenDemoPreviewStage(sourceProject);
}

function sanitizeDemoPreviewClone(clone) {
  clone.querySelectorAll?.('.calayer-foreground.is-systemImage svg text').forEach((node) => node.remove());
  return clone;
}

async function captureStageDemoPng(stage) {
  const rect = stage.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  const clone = sanitizeDemoPreviewClone(stage.cloneNode(true));
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  const html = `
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;background:transparent;">
      <style>${collectScreenshotStyles()}</style>
      ${clone.outerHTML}
    </div>
  `;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width * DEMO_SCREENSHOT_SCALE}" height="${height * DEMO_SCREENSHOT_SCALE}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">${html}</foreignObject>
    </svg>
  `;
  const image = new Image();
  image.decoding = 'async';
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = DEMO_IMAGE_WIDTH;
    canvas.height = DEMO_IMAGE_HEIGHT;
    const ctx = canvas.getContext('2d');
    drawImageContain(ctx, image, DEMO_IMAGE_WIDTH, DEMO_IMAGE_HEIGHT, width, height);
    return await canvasToPngBytes(canvas);
  } catch {
    return fallbackDemoPngBytes(width, height, stage);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function capturePreviewDemoPng(sourceProject = state.project) {
  renderCurrentPreview();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const { stage, cleanup } = currentDemoPreviewStage(sourceProject);
  try {
    if (!stage) return fallbackDemoPngBytes(420, 280);
    return await captureStageDemoPng(stage);
  } finally {
    cleanup();
  }
}

function restoreChinesePreviewAfterCollections(previousModuleId, moduleId) {
  if (previousModuleId !== 'collections' || moduleId === 'collections') return false;
  const orientation = currentPreviewScope().orientation === 'landscape' ? 'landscape' : 'portrait';
  setPreviewModeFromControl(previewValueForMode('keyboard26', orientation));
  if (!previewModeExists(state.previewMode)) state.previewMode = defaultPreviewMode();
  return true;
}

function syncPreviewModeForModule(moduleId, previousModuleId = '') {
  const restoredFromCollections = restoreChinesePreviewAfterCollections(previousModuleId, moduleId);
  if (moduleId === 'candidateStyles') {
    if (!previewModeExists(state.previewMode)) state.previewMode = defaultPreviewMode();
    if (!['candidates', 'expanded'].includes(state.candidateState)) {
      state.candidateState = 'candidates';
    }
    return;
  }
  if (['customKeyboards', 'metrics', 'swipes', 'hints'].includes(moduleId)) {
    if (!previewModeExists(state.previewMode)) state.previewMode = defaultPreviewMode();
    return;
  }
  if (restoredFromCollections) return;
  if (moduleId === 'collections') {
    if (!previewModeExists(state.previewMode)) {
      state.previewMode = defaultPreviewMode();
      return;
    }
    const scope = currentPreviewScope();
    const keepCurrent = scope.mode === 'symbolic'
      || scope.mode === 'emoji'
      || scope.mode === 'numeric'
      || (scope.mode === 'keyboard26' && scope.pinyinVariant === '9');
    if (!keepCurrent) setPreviewModeFromControl(previewValueForModePreferred('symbolic', scope.orientation));
    return;
  }
  const nextMode = {
  }[moduleId];
  if (nextMode) state.previewMode = nextMode;
}

function renderAll() {
  if (!state.project) return;
  if (!isGuideReady(state.project) && state.moduleId !== 'keyboardCombo') {
    state.moduleId = 'keyboardCombo';
    state.jsonMode = false;
    state.editingKey = null;
  }
  el.workspace.dataset.activeModule = state.moduleId;
  el.workspace.dataset.sidebar = state.sidebarCollapsed ? 'collapsed' : 'expanded';
  const module = activeModule();
  el.sidebarToggleButton.setAttribute('aria-label', state.sidebarCollapsed ? '展开菜单' : '收起菜单');
  el.sidebarToggleButton.title = state.sidebarCollapsed ? '' : '收起菜单';
  el.sidebarToggleButton.querySelector('span').textContent = state.sidebarCollapsed ? '›' : '‹';
  el.sidebarToggleButton.dataset.activeModuleName = module.title;
  renderModules();
  renderEditor();
  renderProjectSummary();
  renderSaveState();
  renderUndoState();
  renderCurrentPreview();
  renderConfirmDialog();
  renderWelcomeNotice();
  renderTemplateLibraryDialog();
}

function setSidebarCollapsed(collapsed) {
  const next = collapsed === true;
  if (state.sidebarCollapsed === next) return;
  state.sidebarCollapsed = next;
  renderAll();
}

function setKeyboardLayoutArray(path, items) {
  pushUndoSnapshot();
  setPath(state.project, path, items);
  if (path.startsWith(keyboard26RowsPath())) syncKeyboard26LegacyPortrait();
  if (path === 'guide.preferences.spacebarRow') {
    state.project.guide = state.project.guide || {};
    state.project.guide.status = 'pending';
    state.project.guide.generatedPlan = null;
  }
  markDirty();
  renderAll();
}

function reorderKeyboardLayoutItems(path, fromIndex, toIndex) {
  if (!path || fromIndex === toIndex) return;
  const items = [...(getPath(state.project, path) || [])];
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return;
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  setKeyboardLayoutArray(path, items);
}

function reorderKeyboardLayoutRows(path, fromIndex, toIndex) {
  if (!path || fromIndex === toIndex) return;
  const rows = [...(getPath(state.project, path) || [])];
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= rows.length || toIndex >= rows.length) return;
  const [moved] = rows.splice(fromIndex, 1);
  rows.splice(toIndex, 0, moved);
  setKeyboardLayoutArray(path, rows);
}

function moveKeyboardLayoutItem(fromPath, fromIndex, toPath, toIndex) {
  if (!fromPath || !toPath) return;
  if (fromPath === toPath) {
    reorderKeyboardLayoutItems(fromPath, fromIndex, toIndex);
    return;
  }
  const fromItems = [...(getPath(state.project, fromPath) || [])];
  const toItems = [...(getPath(state.project, toPath) || [])];
  if (fromIndex < 0 || fromIndex >= fromItems.length) return;
  const [moved] = fromItems.splice(fromIndex, 1);
  const insertAt = Math.max(0, Math.min(toIndex, toItems.length));
  pushUndoSnapshot();
  toItems.splice(insertAt, 0, moved);
  setPath(state.project, fromPath, fromItems);
  setPath(state.project, toPath, toItems);
  syncKeyboard26LegacyPortrait();
  markDirty();
  renderAll();
}

function insertGuideSpacebarKey(key, toIndex) {
  if (!GUIDE_SPACEBAR_ALLOWED_KEYS.has(key)) return;
  const currentRow = currentGuideSpacebarRow();
  if (currentRow.includes(key)) return;
  const insertAt = Math.max(0, Math.min(Number(toIndex), currentRow.length));
  const nextRow = [...currentRow];
  nextRow.splice(insertAt, 0, key);
  pushUndoSnapshot();
  setGuideSpacebarRow(nextRow);
}

function handleKeyDragStart(event) {
  const rowCard = event.target.closest('.key-row-card[draggable="true"][data-drag-row-path]');
  if (rowCard && !event.target.closest('.key-token-editor[draggable="true"]')) {
    rowCard.classList.add('is-dragging');
    const rowPayload = JSON.stringify({
      type: 'row',
      path: rowCard.dataset.dragRowPath,
      index: Number(rowCard.dataset.dragRowIndex),
    });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-hamster-row', rowPayload);
    event.dataTransfer.setData('text/plain', rowPayload);
    return;
  }
  const guideOption = event.target.closest('.guide-spacebar-option[draggable="true"][data-guide-space-drag-key]');
  if (guideOption) {
    guideOption.classList.add('is-dragging');
    const payload = JSON.stringify({
      type: 'guide-spacebar-option',
      key: guideOption.dataset.guideSpaceDragKey,
    });
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('application/x-hamster-key', payload);
    event.dataTransfer.setData('text/plain', payload);
    return;
  }
  const token = event.target.closest('.key-token-editor[draggable="true"]');
  if (!token) return;
  token.classList.add('is-dragging');
  const payload = JSON.stringify({
    type: 'key',
    path: token.dataset.dragPath,
    index: Number(token.dataset.dragIndex),
  });
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('application/x-hamster-key', payload);
  event.dataTransfer.setData('text/plain', payload);
}

function handleKeyDragOver(event) {
  const guideDropList = event.target.closest('[data-guide-space-drop-list]');
  if (guideDropList && !event.target.closest('.key-token-editor[data-drag-path]')) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    guideDropList.classList.add('is-drag-over');
    return;
  }
  const rowCard = event.target.closest('.key-row-card[data-drag-row-path]');
  if (rowCard && !event.target.closest('.key-token-editor[data-drag-path]')) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    rowCard.classList.add('is-drag-over');
    return;
  }
  const token = event.target.closest('.key-token-editor[data-drag-path]');
  if (!token) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  token.classList.add('is-drag-over');
}

function handleKeyDragLeave(event) {
  event.target.closest('[data-guide-space-drop-list]')?.classList.remove('is-drag-over');
  event.target.closest('.key-row-card')?.classList.remove('is-drag-over');
  event.target.closest('.key-token-editor')?.classList.remove('is-drag-over');
}

function handleKeyDrop(event) {
  const guideDropList = event.target.closest('[data-guide-space-drop-list]');
  if (guideDropList && !event.target.closest('.key-token-editor[data-drag-path]')) {
    event.preventDefault();
    guideDropList.classList.remove('is-drag-over');
    const rawGuideKey = event.dataTransfer.getData('application/x-hamster-key') || event.dataTransfer.getData('text/plain');
    if (!rawGuideKey) return;
    let guidePayload;
    try {
      guidePayload = JSON.parse(rawGuideKey);
    } catch {
      return;
    }
    if (guidePayload.type !== 'guide-spacebar-option') return;
    insertGuideSpacebarKey(guidePayload.key, currentGuideSpacebarRow().length);
    return;
  }
  const rowCard = event.target.closest('.key-row-card[data-drag-row-path]');
  if (rowCard && !event.target.closest('.key-token-editor[data-drag-path]')) {
    event.preventDefault();
    rowCard.classList.remove('is-drag-over');
    const rawRow = event.dataTransfer.getData('application/x-hamster-row') || event.dataTransfer.getData('text/plain');
    if (!rawRow) return;
    let rowPayload;
    try {
      rowPayload = JSON.parse(rawRow);
    } catch {
      return;
    }
    if (rowPayload.type !== 'row') return;
    reorderKeyboardLayoutRows(rowPayload.path, Number(rowPayload.index), Number(rowCard.dataset.dragRowIndex));
    return;
  }
  const token = event.target.closest('.key-token-editor[data-drag-path]');
  if (!token) return;
  event.preventDefault();
  token.classList.remove('is-drag-over');
  const raw = event.dataTransfer.getData('application/x-hamster-key') || event.dataTransfer.getData('text/plain');
  if (!raw) return;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }
  if (payload.type === 'guide-spacebar-option' && token.dataset.dragPath === 'guide.preferences.spacebarRow') {
    insertGuideSpacebarKey(payload.key, Number(token.dataset.dragIndex));
    return;
  }
  moveKeyboardLayoutItem(payload.path, Number(payload.index), token.dataset.dragPath, Number(token.dataset.dragIndex));
}

function handleKeyDragEnd() {
  el.editorRoot.querySelectorAll('.key-token-editor.is-dragging, .key-token-editor.is-drag-over, .key-row-card.is-dragging, .key-row-card.is-drag-over, .guide-spacebar-option.is-dragging').forEach((token) => {
    token.classList.remove('is-dragging', 'is-drag-over');
  });
}

function handleKeyPointerDown(event) {
  const editToken = editableKeyTokenFromEvent(event);
  if (editToken) {
    state.skipNextKeyEditorClick = true;
    window.setTimeout(() => {
      state.skipNextKeyEditorClick = false;
    }, 250);
    switchKeyEditor(editToken);
    event.preventDefault();
    return;
  }

  const handle = event.target.closest('.drag-handle');
  if (!handle) return;
  const token = handle.closest('.key-token-editor[data-drag-path]');
  if (!token) return;
  state.keyDrag = {
    path: token.dataset.dragPath,
    index: Number(token.dataset.dragIndex),
  };
  token.classList.add('is-dragging');
}

function handleKeyPointerUp(event) {
  if (!state.keyDrag) return;
  const token = event.target.closest('.key-token-editor[data-drag-path]');
  const drag = state.keyDrag;
  state.keyDrag = null;
  handleKeyDragEnd();
  if (!token) return;
  moveKeyboardLayoutItem(drag.path, drag.index, token.dataset.dragPath, Number(token.dataset.dragIndex));
}

function focusKeyEditPanel() {
  window.requestAnimationFrame(() => {
    el.editorRoot.querySelector('.key-edit-panel input, .key-edit-panel button')?.focus();
  });
}

function editableKeyTokenFromEvent(event) {
  const token = event.target.closest('[data-key-edit-path]');
  if (!token) return null;
  if (event.target.closest('.icon-button, input, select, textarea, .drag-handle')) return null;
  return token;
}

function switchKeyEditor(token) {
  const path = token.dataset.keyEditPath;
  if (!path) return;
  state.editingKey = { path };
  if (token.dataset.centerGroup && token.dataset.centerKey) {
    state.selectedCenterTarget = {
      group: token.dataset.centerGroup,
      key: token.dataset.centerKey,
    };
  }
  renderEditor();
  focusKeyEditPanel();
}

function confirmRowRemoval(onConfirm) {
  openConfirmDialog({
    title: '移除这一行',
    message: '确定要移除这一行吗？此操作会删除这一行里的所有按键。',
    onConfirm,
  });
}

function handleRowListAction(target) {
  const action = target.dataset.layoutAction;
  if (!action) return;

  const path = target.dataset.path;
  if (!path) return;

  if (action === 'add-row') {
    const rows = getPath(state.project, path) || [];
    setKeyboardLayoutArray(path, [...rows, []]);
    return;
  }

  if (action === 'remove-row') {
    const index = Number(target.dataset.index);
    confirmRowRemoval(() => {
      const rows = [...(getPath(state.project, path) || [])];
      rows.splice(index, 1);
      setKeyboardLayoutArray(path, rows);
    });
    return;
  }

  if (action === 'add-key') {
    const rowIndex = Number(target.dataset.rowIndex);
    const rowPath = `${path}.${rowIndex}`;
    const keys = getPath(state.project, rowPath) || [];
    setKeyboardLayoutArray(rowPath, [...keys, '']);
    return;
  }

  if (action === 'remove-key') {
    const rowIndex = Number(target.dataset.rowIndex);
    const index = Number(target.dataset.index);
    const rowPath = `${path}.${rowIndex}`;
    const keys = [...(getPath(state.project, rowPath) || [])];
    keys.splice(index, 1);
    setKeyboardLayoutArray(rowPath, keys);
  }
}

function handleKeyboardLayoutAction(target) {
  const action = target.dataset.keyboardAction;
  if (!action) return;

  if (action === 'close-key-editor') {
    state.editingKey = null;
    renderEditor();
    return;
  }

  if (action === 'toggle-metric-key') {
    const key = target.dataset.key;
    const selected = selectedMetricKeys();
    setSelectedMetricKeys(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);
    renderEditor();
    return;
  }

  if (action === 'select-all-metric-keys') {
    setSelectedMetricKeys(currentPreviewKeyboardKeys().filter((key) => key !== 'normal'));
    renderEditor();
    return;
  }

  if (action === 'clear-metric-keys') {
    setSelectedMetricKeys([]);
    renderEditor();
    return;
  }

  if (action === 'remove-metric-override') {
    const key = target.dataset.key;
    setSelectedMetricKeys(selectedMetricKeys().filter((item) => item !== key));
    renderEditor();
    return;
  }

  if (action === 'add-portrait-row') {
    const rows = keyboard26EditableRows();
    rows.push(emptyKeyboard26Row(rows.length));
    setKeyboardLayoutArray(keyboard26RowsPath(), rows);
    return;
  }

  if (action === 'remove-portrait-row') {
    const index = Number(target.dataset.index);
    confirmRowRemoval(() => {
      const rows = keyboard26EditableRows();
      rows.splice(index, 1);
      setKeyboardLayoutArray(keyboard26RowsPath(), rows);
    });
    return;
  }

  if (action === 'add-portrait-key') {
    const rowIndex = Number(target.dataset.rowIndex);
    const path = keyboard26RowPath(rowIndex);
    const keys = getPath(state.project, path) || [];
    setKeyboardLayoutArray(path, [...keys, '']);
    return;
  }

  if (action === 'remove-portrait-key') {
    const rowIndex = Number(target.dataset.rowIndex);
    const index = Number(target.dataset.index);
    const path = keyboard26RowPath(rowIndex);
    const keys = [...(getPath(state.project, path) || [])];
    keys.splice(index, 1);
    setKeyboardLayoutArray(path, keys);
    return;
  }

  if (action === 'add-landscape-row') {
    const section = target.dataset.section;
    const path = `keyboards.keyboard26.layout.landscape.${section}`;
    const rows = getPath(state.project, path) || [];
    setKeyboardLayoutArray(path, [...rows, []]);
    return;
  }

  if (action === 'remove-landscape-row') {
    const section = target.dataset.section;
    const index = Number(target.dataset.index);
    const path = `keyboards.keyboard26.layout.landscape.${section}`;
    confirmRowRemoval(() => {
      const rows = [...(getPath(state.project, path) || [])];
      rows.splice(index, 1);
      setKeyboardLayoutArray(path, rows);
    });
    return;
  }

  if (action === 'add-landscape-key') {
    const section = target.dataset.section;
    const rowIndex = Number(target.dataset.rowIndex);
    const path = `keyboards.keyboard26.layout.landscape.${section}.${rowIndex}`;
    const keys = getPath(state.project, path) || [];
    setKeyboardLayoutArray(path, [...keys, '']);
    return;
  }

  if (action === 'remove-landscape-key') {
    const section = target.dataset.section;
    const rowIndex = Number(target.dataset.rowIndex);
    const index = Number(target.dataset.index);
    const path = `keyboards.keyboard26.layout.landscape.${section}.${rowIndex}`;
    const keys = [...(getPath(state.project, path) || [])];
    keys.splice(index, 1);
    setKeyboardLayoutArray(path, keys);
  }
}

function handleSwipeAction(target) {
  const action = target.dataset.swipeAction;
  if (!action) return;

  if (action === 'set-direction') {
    state.swipeMode = target.dataset.direction === 'swipe_down' ? 'swipe_down' : 'swipe_up';
    state.editingKey = null;
    renderEditor();
  }

  if (action === 'toggle-enabled') {
    pushUndoSnapshot();
    setCurrentSwipeProfileEnabled(!swipesEnabled());
    state.editingKey = null;
    markDirty();
    renderAll();
    return;
  }

  if (action === 'clear-all') {
    pushUndoSnapshot();
    state.project.data = state.project.data || {};
    state.project.data.swipes = emptySwipeData();
    state.editingKey = null;
    markDirty();
    renderAll();
    return;
  }

  if (action === 'add-entry') {
    const direction = state.swipeMode === 'swipe_down' ? 'swipe_down' : 'swipe_up';
    const profile = state.swipeDraftProfile || 'pinyin';
    const key = state.swipeDraftKey || availableSwipeKeys()[0] || '';
    if (!key) return;
    pushUndoSnapshot();
    state.project.data = state.project.data || {};
    state.project.data.swipes = state.project.data.swipes || emptySwipeData();
    state.project.data.swipes[profile] = state.project.data.swipes[profile] || { swipe_up: {}, swipe_down: {} };
    const current = getPath(state.project, `data.swipes.${profile}.${direction}.${key}`) || {};
    setPath(state.project, `data.swipes.${profile}.${direction}.${key}`, {
      label: current.label || { text: '' },
      action: current.action || {},
      center: current.center,
    });
    state.editingKey = { path: `data.swipes.${profile}.${direction}.${key}` };
    markDirty();
    renderAll();
  }
}

function handleInsetAction(target) {
  const action = target.dataset.insetAction;
  if (!action) return;
  const group = target.dataset.group || 'keyboard26';
  const basePath = `keyStyles.buttonInsets.${group}`;

  if (action === 'set-mode') {
    pushUndoSnapshot();
    setPath(state.project, `${basePath}.mode`, target.dataset.mode === 'custom' ? 'custom' : 'regular');
    markDirty();
    renderAll();
    return;
  }

  if (action === 'add-custom-rule') {
    const custom = [...(getPath(state.project, `${basePath}.custom`) || [])];
    pushUndoSnapshot();
    custom.push({ keys: [], insets: deepClone(getPath(state.project, `${basePath}.normal`) || {}) });
    setPath(state.project, `${basePath}.custom`, custom);
    markDirty();
    renderAll();
    return;
  }

  if (action === 'remove-custom-rule') {
    const index = Number(target.dataset.index);
    const custom = [...(getPath(state.project, `${basePath}.custom`) || [])];
    pushUndoSnapshot();
    custom.splice(index, 1);
    setPath(state.project, `${basePath}.custom`, custom);
    markDirty();
    renderAll();
    return;
  }

  if (action === 'toggle-custom-key') {
    const index = Number(target.dataset.index);
    const key = target.dataset.key;
    const path = `${basePath}.custom.${index}.keys`;
    const keys = new Set(getPath(state.project, path) || []);
    pushUndoSnapshot();
    if (target.checked) keys.add(key);
    else keys.delete(key);
    setPath(state.project, path, [...keys]);
    markDirty();
    renderProjectSummary();
    renderSaveState();
    renderCurrentPreview();
  }
}

function collectionSource(sourceKey) {
  const path = `data.collections.${sourceKey}`;
  const source = getPath(state.project, path);
  if (source && typeof source === 'object') return { path, source };
  setPath(state.project, path, {});
  return { path, source: getPath(state.project, path) };
}

function uniqueCollectionCategoryName(source, baseName = '新分类') {
  const categories = Array.isArray(source.category) ? source.category : [];
  let index = categories.length + 1;
  let name = `${baseName}${index}`;
  while (categories.includes(name) || source[name]) {
    index += 1;
    name = `${baseName}${index}`;
  }
  return name;
}

function handleCollectionAction(target) {
  const action = target.dataset.collectionAction;
  const sourceKey = target.dataset.sourceKey;
  if (!action || !sourceKey) return;
  const { source } = collectionSource(sourceKey);
  source.category = Array.isArray(source.category) ? source.category : [];

  if (action === 'add-category') {
    pushUndoSnapshot();
    const name = uniqueCollectionCategoryName(source);
    source.category.push(name);
    source[name] = [];
    markDirty();
    renderAll();
    return;
  }

  const index = Number(target.dataset.categoryIndex);
  const category = source.category[index];
  if (!category) return;

  if (action === 'move-category') {
    const direction = Number(target.dataset.direction);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= source.category.length) return;
    pushUndoSnapshot();
    const [item] = source.category.splice(index, 1);
    source.category.splice(nextIndex, 0, item);
    markDirty();
    renderAll();
    return;
  }

  if (action === 'remove-category') {
    openConfirmDialog({
      title: '删除分类',
      message: `确定删除“${category}”分类及其中全部内容吗？`,
      onConfirm: () => {
        pushUndoSnapshot();
        source.category.splice(index, 1);
        delete source[category];
        markDirty();
        renderAll();
      },
    });
  }
}

function renameCollectionCategory(target) {
  const sourceKey = target.dataset.sourceKey;
  const index = Number(target.dataset.categoryIndex);
  if (!sourceKey || !Number.isInteger(index)) return;
  const { source } = collectionSource(sourceKey);
  const categories = Array.isArray(source.category) ? source.category : [];
  const oldName = categories[index];
  const newName = target.value.trim();
  if (!oldName || !newName || newName === oldName) {
    renderEditor();
    return;
  }
  if (categories.includes(newName) || Object.prototype.hasOwnProperty.call(source, newName)) {
    alert(`“${newName}”已存在，不能重复命名。`);
    renderEditor();
    return;
  }
  pushUndoSnapshot();
  categories[index] = newName;
  source[newName] = source[oldName] || [];
  delete source[oldName];
  markDirty();
  renderAll();
}

function setCollectionItems(target) {
  const sourceKey = target.dataset.sourceKey;
  const category = target.dataset.categoryName;
  if (!sourceKey || !category) return;
  captureInputUndo(target);
  const { source } = collectionSource(sourceKey);
  source[category] = target.value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  syncCollectionDerivedFields(state.project, 'collections');
  markDirty();
  renderProjectSummary();
  renderSaveState();
  renderCurrentPreview();
}

function setCollectionItemValue(target) {
  const sourceKey = target.dataset.sourceKey;
  const category = target.dataset.categoryName;
  const index = Number(target.dataset.itemIndex);
  if (!sourceKey || !category || !Number.isInteger(index)) return;
  captureInputUndo(target);
  const { source } = collectionSource(sourceKey);
  const list = Array.isArray(source[category]) ? source[category] : [];
  list[index] = target.value;
  source[category] = list;
  syncCollectionDerivedFields(state.project, 'collections');
  markDirty();
  renderProjectSummary();
  renderSaveState();
  renderCurrentPreview();
}

function setCollectionItemField(target) {
  const sourceKey = target.dataset.sourceKey;
  const category = target.dataset.categoryName;
  const index = Number(target.dataset.itemIndex);
  const fieldKey = target.dataset.fieldKey;
  if (!sourceKey || !category || !Number.isInteger(index) || !fieldKey) return;
  captureInputUndo(target);
  const { source } = collectionSource(sourceKey);
  const list = Array.isArray(source[category]) ? source[category] : [];
  const entry = list[index] && typeof list[index] === 'object' && !Array.isArray(list[index])
    ? list[index]
    : {};
  entry[fieldKey] = target.value;
  list[index] = entry;
  source[category] = list;
  syncCollectionDerivedFields(state.project, 'collections');
  markDirty();
  renderProjectSummary();
  renderSaveState();
  renderCurrentPreview();
}

function setCollectionEntryValue(target) {
  const sourceKey = target.dataset.sourceKey;
  const entryKey = target.dataset.entryKey;
  if (!sourceKey || entryKey == null) return;
  captureInputUndo(target);
  const { source } = collectionSource(sourceKey);
  source[entryKey] = target.value;
  syncCollectionDerivedFields(state.project, 'collections');
  markDirty();
  renderProjectSummary();
  renderSaveState();
  renderCurrentPreview();
}

function setCollectionEntryField(target) {
  const sourceKey = target.dataset.sourceKey;
  const entryKey = target.dataset.entryKey;
  const fieldKey = target.dataset.fieldKey;
  if (!sourceKey || entryKey == null || !fieldKey) return;
  captureInputUndo(target);
  const { source } = collectionSource(sourceKey);
  const entry = source[entryKey] && typeof source[entryKey] === 'object' && !Array.isArray(source[entryKey])
    ? source[entryKey]
    : {};
  entry[fieldKey] = target.value;
  source[entryKey] = entry;
  syncCollectionDerivedFields(state.project, 'collections');
  markDirty();
  renderProjectSummary();
  renderSaveState();
  renderCurrentPreview();
}

function handleToolbarAction(target) {
  const action = target.dataset.toolbarAction;
  if (!action) return;

  if (action === 'add-layout-button') {
    const layout = [...(getPath(state.project, 'toolbar.layout') || [])];
    layout.push('');
    setKeyboardLayoutArray('toolbar.layout', layout);
    return;
  }

  if (action === 'remove-layout-button') {
    const index = Number(target.dataset.index);
    const layout = [...(getPath(state.project, 'toolbar.layout') || [])];
    layout.splice(index, 1);
    setKeyboardLayoutArray('toolbar.layout', layout);
  }
}

function setFieldValue(path, value, type) {
  if (path.includes('.combine.')) {
    const match = path.match(/^(.+)\.combine\.(\d+)\.action(Type|Value|KeyboardSelection)$/);
    if (match) {
      const [, basePath, indexText, field] = match;
      const nextValue = field === 'KeyboardSelection' ? keyboardTypeSelectionToActionValue(String(value || '')) : value;
      updateCombineActionState(
        basePath,
        Number(indexText),
        field === 'Type' ? value : undefined,
        field === 'Value' || field === 'KeyboardSelection' ? nextValue : '',
        { toolbar: basePath.startsWith('toolbar.actions.') },
      );
      markDirty();
      renderProjectSummary();
      renderSaveState();
      renderCurrentPreview();
      renderEditor();
      return;
    }
  }
  if (path === `${keyboard26PunctuationColumnPath()}.itemsText`) {
    setPath(state.project, `${keyboard26PunctuationColumnPath()}.items`, parsePunctuationColumnInput(String(value || '')));
    syncCollectionDerivedFields(state.project, 'pinyin9Keyboard');
    markDirty();
    renderProjectSummary();
    renderSaveState();
    renderCurrentPreview();
    renderEditor();
    return;
  }
  if (path.startsWith('keyboards.keyboard26.keyActions.') && path.endsWith('.actionKeyboardSelection')) {
    const basePath = path.replace(/\.actionKeyboardSelection$/, '');
    const actionType = getPath(state.project, `${basePath}.actionType`) || 'keyboardType';
    const mappedValue = keyboardTypeSelectionToActionValue(String(value || ''));
    setPath(state.project, `${basePath}.actionValue`, mappedValue);
    setPath(state.project, `${basePath}.action`, buildAction(actionType, mappedValue));
    markDirty();
    renderProjectSummary();
    renderSaveState();
    renderCurrentPreview();
    renderEditor();
    return;
  }
  if (path.startsWith('toolbar.actions.') && path.endsWith('.actionKeyboardSelection')) {
    const basePath = path.replace(/\.actionKeyboardSelection$/, '');
    const actionType = getPath(state.project, `${basePath}.actionType`) || 'keyboardType';
    const mappedValue = keyboardTypeSelectionToActionValue(String(value || ''));
    setPath(state.project, basePath, {
      ...buildToolbarAction(actionType, mappedValue),
      actionType,
      actionValue: mappedValue,
    });
    markDirty();
    renderProjectSummary();
    renderSaveState();
    renderCurrentPreview();
    renderEditor();
    return;
  }
  if (path.startsWith('keyboardCombo.') && (value === 'true' || value === 'false')) {
    setPath(state.project, path, value === 'true');
    markDirty();
    renderAll();
    return;
  }
  if (path.startsWith('guide.preferences.') && (value === 'true' || value === 'false')) {
    setPath(state.project, path, value === 'true');
    if (state.project?.guide?.status === 'ready') {
      state.project.guide.status = 'pending';
      state.project.guide.generatedPlan = null;
    }
    markDirty();
    renderAll();
    return;
  }
  if (path === 'guide.preferences.keyboardPreset') {
    const preset = keyboardSkinPresetByValue(value || DEFAULT_KEYBOARD_SKIN_PRESET);
    applyKeyboardPresetPreferences(state.project, preset);
    if (state.project?.guide?.status === 'ready') {
      state.project.guide.status = 'pending';
      state.project.guide.generatedPlan = null;
    }
    markDirty();
    renderAll();
    return;
  }
  if (path === 'guide.preferences.chineseLayout') {
    const preset = keyboardSkinPresetByValue(`ios-${value}`);
    applyKeyboardPresetPreferences(state.project, preset);
    if (state.project?.guide?.status === 'ready') {
      state.project.guide.status = 'pending';
      state.project.guide.generatedPlan = null;
    }
    markDirty();
    renderAll();
    return;
  }

  if (path.startsWith('config.')) {
    setPath(state.project, path, parseInputValue(value, type));
    syncGuideAndComboFromConfig(state.project, { preserveGuideStatus: true });
    if (!previewModeExists(state.previewMode)) {
      state.previewMode = defaultPreviewMode();
    }
    return;
  }

  const slotSourceMatch = path.match(/^keyboardCombo\.slots\.(\w+)\.source$/);
  if (slotSourceMatch) {
    const [, slotKey] = slotSourceMatch;
    setPath(state.project, path, value);
    if (['symbolic', 'emoji', 'panel'].includes(slotKey)) {
      const variant = slotKey === 'panel'
        ? (value === 'disabled' ? 'disabled' : 'panel')
        : value;
      setPath(state.project, `keyboardCombo.slots.${slotKey}.variant`, variant);
    }
    const orientation = previewRenderOrientation(state.previewMode);
    const currentMode = previewRenderMode(state.previewMode);
    const slotPreviewMode = {
      pinyin: 'keyboard26',
      numeric: 'numeric',
      symbolic: 'symbolic',
      emoji: 'emoji',
      panel: 'panel',
    }[slotKey];
    if (slotPreviewMode && currentMode === slotPreviewMode) {
      const nextMode = ['symbolic', 'emoji', 'panel'].includes(slotPreviewMode)
        ? previewValueForModePreferred(slotPreviewMode, orientation)
        : previewValueForMode(slotPreviewMode, orientation);
      setPreviewModeFromControl(nextMode);
    }
    return;
  }

  if (path === 'keyboardCombo.slots.pinyin.variant') {
    setPath(state.project, path, value);
    const orientation = previewRenderOrientation(state.previewMode);
    setPreviewModeFromControl(previewValueForMode('keyboard26', orientation));
    return;
  }

  if (path === 'keyboardCombo.slots.numeric.variant') {
    setPath(state.project, path, value);
    const orientation = previewRenderOrientation(state.previewMode);
    setPreviewModeFromControl(previewValueForMode('numeric', orientation));
    return;
  }

  if (path === 'toolbar.layout') {
    setPath(state.project, path, String(value).split(',').map((item) => item.trim()).filter(Boolean));
    return;
  }

  if (path === 'keyboards.numeric.collectionSymbols') {
    setPath(state.project, path, String(value).split(',').map((item) => item.trim()).filter(Boolean));
    syncCollectionDerivedFields(state.project, 'numericKeyboard');
    return;
  }

  if (path.startsWith('data.collections.') && (path.endsWith('.actionType') || path.endsWith('.actionValue'))) {
    const basePath = path.replace(/\.(actionType|actionValue)$/, '');
    const current = getPath(state.project, basePath) || {};
    const currentAction = actionToFields(current.action);
    const nextType = path.endsWith('.actionType') ? value : currentAction.type;
    const nextValue = path.endsWith('.actionValue') ? value : '';
    updateActionState(basePath, nextType, nextValue);
    syncCollectionDerivedFields(state.project, 'collections');
    return;
  }

  if (path === 'keyboards.keyboard26.layout.portrait.rowCount') {
    const count = Math.max(1, Math.min(8, Number(value) || 1));
    const rows = keyboard26EditableRows();
    while (rows.length < count) rows.push(emptyKeyboard26Row(rows.length));
    rows.length = count;
    setKeyboardLayoutArray(keyboard26RowsPath(), rows);
    return;
  }

  const pathParts = path.split('.');
  if (path.startsWith('keyboards.keyboard26.layout.portrait.') && pathParts.length === 5) {
    setPath(state.project, path, String(value).split(',').map((item) => item.trim()).filter(Boolean));
    return;
  }

  if (path.startsWith('keyboards.keyboard26.layout.landscape.') && pathParts.length === 6) {
    setPath(state.project, path, String(value).split(',').map((item) => item.trim()).filter(Boolean));
    return;
  }

  if (path.startsWith('toolbar.actions.') && path.endsWith('.presetValue')) {
    const basePath = path.replace(/\.presetValue$/, '');
    const preset = TOOLBAR_ACTION_PRESETS.find((item) => toolbarActionPresetId(item.type, item.value) === value);
    if (!preset) return;
    updateActionState(basePath, preset.type, preset.value, { toolbar: true });
    return;
  }

  if (path.startsWith('toolbar.actions.') && (path.endsWith('.actionType') || path.endsWith('.actionValue'))) {
    const basePath = path.replace(/\.(actionType|actionValue)$/, '');
    if (path.includes('.combine.')) return;
    const currentAction = actionToFields(getPath(state.project, basePath));
    const nextType = path.endsWith('.actionType') ? value : currentAction.type;
    const nextValue = path.endsWith('.actionValue') ? value : '';
    updateActionState(basePath, nextType, nextValue, { toolbar: true });
    return;
  }

  if (path.startsWith('keyboards.keyboard26.keyActions.') && path.endsWith('.actionType')) {
    const basePath = path.replace(/\.actionType$/, '');
    const currentAction = keyboard26FunctionActionFieldsForPath(basePath);
    const nextType = value;
    const nextValue = '';
    updateActionState(basePath, nextType, nextValue);
    markDirty();
    renderProjectSummary();
    renderSaveState();
    renderCurrentPreview();
    renderEditor();
    return;
  }

  if (path.startsWith('keyboards.keyboard26.keyEditorModes.')) {
    setPath(state.project, path, value);
    markDirty();
    renderProjectSummary();
    renderSaveState();
    renderCurrentPreview();
    renderEditor();
    return;
  }

  if (path === 'keyboardCombo.spaceRow.showSchemaNameOnSpace') {
    const enabled = value === 'true';
    setPath(state.project, path, enabled);
    if (enabled) {
      const currentText = String(getPath(state.project, 'keyboards.keyboard26.pinyinSchemaName.text') || '').trim();
      if (!currentText) {
        setPath(state.project, 'keyboards.keyboard26.pinyinSchemaName.text', DEFAULT_SCHEMA_NAME_TEXT);
      }
    }
    markDirty();
    renderProjectSummary();
    renderSaveState();
    renderCurrentPreview();
    renderEditor();
    return;
  }

  if (path.startsWith('keyboards.keyboard26.keyActions.') && path.endsWith('.actionValue')) {
    const basePath = path.replace(/\.actionValue$/, '');
    const currentAction = keyboard26FunctionActionFieldsForPath(basePath);
    if (path.includes('.combine.')) return;
    const nextType = currentAction.type;
    updateActionState(basePath, nextType, value);
    markDirty();
    renderProjectSummary();
    renderSaveState();
    renderCurrentPreview();
    renderEditor();
    return;
  }

  if (path.includes('.actionType') || path.includes('.actionValue')) {
    const basePath = path.replace(/\.(actionType|actionValue)$/, '');
    const current = getPath(state.project, basePath) || {};
    const currentAction = actionToFields(current.action);
    if (path.includes('.combine.')) return;
    const nextType = path.endsWith('.actionType') ? value : currentAction.type;
    const nextValue = path.endsWith('.actionValue') ? value : '';
    updateActionState(basePath, nextType, nextValue);
    return;
  }

  if (path.includes('.labelType') || path.includes('.labelValue')) {
    const basePath = path.replace(/\.(labelType|labelValue)$/, '');
    const current = getPath(state.project, basePath) || {};
    const currentLabel = labelToFields(current.label);
    const nextType = path.endsWith('.labelType') ? value : currentLabel.type;
    const nextValue = path.endsWith('.labelValue') ? value : currentLabel.value;
    setPath(state.project, `${basePath}.label`, nextType === 'systemImageName' ? { systemImageName: nextValue } : { text: nextValue });
    return;
  }

  setPath(state.project, path, parseInputValue(value, type));
  if (path.startsWith('guide.preferences.')) {
    state.project.guide = state.project.guide || {};
    state.project.guide.status = 'pending';
    state.project.guide.generatedPlan = null;
  }
}

function captureInputUndo(target) {
  if (target.dataset.undoCaptured === 'true') return;
  pushUndoSnapshot();
  target.dataset.undoCaptured = 'true';
}

function handleInput(event) {
  const target = event.target;
  if (target.matches('[data-json-search="query"]')) {
    state.jsonSearch = target.value;
    state.jsonSearchIndex = 0;
    renderEditor();
    return;
  }
  if (target.matches('[data-collection-items]')) {
    setCollectionItems(target);
    return;
  }
  if (target.matches('[data-collection-item-value]')) {
    setCollectionItemValue(target);
    return;
  }
  if (target.matches('[data-collection-item-field]')) {
    setCollectionItemField(target);
    return;
  }
  if (target.matches('[data-collection-entry-value]')) {
    setCollectionEntryValue(target);
    return;
  }
  if (target.matches('[data-collection-entry-field]')) {
    setCollectionEntryField(target);
    return;
  }

  const path = target.dataset.path;
  const jsonPath = target.dataset.jsonPath;
  const jsonActionPath = target.dataset.jsonActionPath;

  if (path) {
    captureInputUndo(target);
    target.dataset.usesDefault = 'false';
    target.classList.remove('is-default-value');
    setFieldValue(path, target.value, target.dataset.type);
    syncColorSwatchForInput(target);
    markDirty();
    if (
      path.startsWith('toolbar.actions.')
      || path.startsWith('keyboards.keyboard26.keyActions.')
      || path.startsWith('keyboards.keyboard26.keyDisplayTypes.')
      || path === 'keyboardCombo.spaceRow.showSchemaNameOnSpace'
      || path.startsWith('guide.preferences.')
      || (path.startsWith('toolbar.display.') && path.endsWith('.type'))
      || /^toolbar\.layout\.\d+$/.test(path)
    ) renderEditor();
    renderProjectSummary();
    renderSaveState();
    renderCurrentPreview();
  }

  if (jsonPath) {
    const parsed = safeJsonParse(target.value);
    if (!parsed.ok) return;
    captureInputUndo(target);
    setPath(state.project, jsonPath, parsed.value);
    if (jsonPath.startsWith('data.collections.')) syncCollectionDerivedFields(state.project, 'collections');
    markDirty();
    renderProjectSummary();
    renderSaveState();
    renderCurrentPreview();
  }

  if (jsonActionPath) {
    const parsed = safeJsonParse(target.value);
    if (!parsed.ok) return;
    captureInputUndo(target);
    setPath(state.project, `${jsonActionPath}.action`, parsed.value);
    markDirty();
    renderEditor();
    renderProjectSummary();
    renderSaveState();
    renderCurrentPreview();
  }
}

async function chooseDownloadDirectory() {
  if (typeof window.showDirectoryPicker !== 'function') {
    alert('当前浏览器不支持选择文件夹，请使用浏览器默认下载目录或手动输入记录路径。');
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    state.downloadDirectoryHandle = handle;
    pushUndoSnapshot();
    state.project.meta = state.project.meta || {};
    state.project.meta.description = handle.name || DEFAULT_DOWNLOAD_PATH;
    markDirty();
    renderAll();
  } catch (error) {
    if (error?.name === 'AbortError') return;
    alert(`选择文件夹失败：${error.message}`);
  }
}

async function writeExportBlob(filename, blob) {
  if (!state.downloadDirectoryHandle) {
    downloadBlob(filename, blob);
    return;
  }
  const permission = await state.downloadDirectoryHandle.requestPermission?.({ mode: 'readwrite' });
  if (permission && permission !== 'granted') {
    downloadBlob(filename, blob);
    return;
  }
  const fileHandle = await state.downloadDirectoryHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

function advanceToNextGeneratedProject(exportProject) {
  const nextProject = nextGeneratedProject(exportProject);
  ensureProjectGuide(nextProject, 'pending');
  state.project = nextProject;
  state.original = deepClone(state.project);
  state.savedAt = null;
  saveProject(state.project);
  renderAll();
}

async function exportProjectPackage() {
  try {
    const exportProject = stampProjectForGeneration(state.project);
    const demoPng = await capturePreviewDemoPng(exportProject);
    const files = buildSkinPackageFiles(exportProject, { demoPng });
    await writeExportBlob(defaultPackageFileName(exportProject), createZipBlob(files));
    advanceToNextGeneratedProject(exportProject);
  } catch (error) {
    alert(`导出失败：${error.message}`);
  }
}

function confirmImportProject() {
  openConfirmDialog({
    title: '导入皮肤',
    message: '支持导入本工具导出的 .cskin/.zip，也会尝试读取普通 Hamster 皮肤包里的 Jsonnet/YAML 固定属性；Jsonnet 优先于 YAML。',
    confirmLabel: '确认',
    confirmClass: '',
    onConfirm: () => {
      el.importProjectInput.value = '';
      el.importProjectInput.click();
    },
  });
}

function closeShortcutReference() {
  const wrap = document.querySelector('.brand-guide-wrap');
  const trigger = document.querySelector('.brand-guide-trigger');
  if (!wrap || !trigger) return;
  wrap.classList.remove('is-open');
  trigger.setAttribute('aria-expanded', 'false');
}

function toggleShortcutReference() {
  const wrap = document.querySelector('.brand-guide-wrap');
  const trigger = document.querySelector('.brand-guide-trigger');
  if (!wrap || !trigger) return;
  const nextOpen = !wrap.classList.contains('is-open');
  wrap.classList.toggle('is-open', nextOpen);
  trigger.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
}

function bindEvents() {
  document.querySelector('.brand-guide-trigger')?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleShortcutReference();
  });
  document.querySelector('.shortcut-reference-card')?.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.body.addEventListener('click', (event) => {
    const welcomeAction = event.target.closest('[data-welcome-action]')?.dataset.welcomeAction;
    if (welcomeAction === 'close') {
      closeWelcomeNotice();
      return;
    }
    const action = event.target.closest('[data-confirm-action]')?.dataset.confirmAction;
    if (!action) return;
    if (action === 'cancel') {
      closeConfirmDialog();
      return;
    }
    const callback = state.confirmDialog?.onConfirm;
    closeConfirmDialog();
    callback?.();
  });
  document.body.addEventListener('click', (event) => {
    const button = event.target.closest('[data-template-action]');
    if (!button) return;
    const action = button.dataset.templateAction;
    if (action === 'close') {
      closeTemplateLibrary();
      return;
    }
    if (action === 'load') {
      loadTemplateFromLibrary(button.dataset.templateId);
      return;
    }
    if (action === 'delete') {
      const item = state.templateLibrary.find((template) => template.id === button.dataset.templateId);
      openConfirmDialog({
        title: '删除本地模板',
        message: `确定删除“${item?.name || '未命名皮肤'}”吗？此操作只影响当前浏览器缓存。`,
        onConfirm: () => deleteTemplateFromLibrary(button.dataset.templateId),
      });
    }
  });

  el.moduleList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-module]');
    if (!button) return;
    if (button.disabled) return;
    const previousModuleId = state.moduleId;
    state.moduleId = button.dataset.module;
    state.jsonMode = false;
    state.jsonSearch = '';
    state.jsonSearchIndex = 0;
    state.editingKey = null;
    syncPreviewModeForModule(state.moduleId, previousModuleId);
    renderAll();
  });
  el.sidebarToggleButton.addEventListener('click', (event) => {
    event.stopPropagation();
    event.currentTarget.blur();
    setSidebarCollapsed(!state.sidebarCollapsed);
  });
  el.sidebar.addEventListener('click', () => {
    if (!state.sidebarCollapsed) return;
    setSidebarCollapsed(false);
  });

  el.editorRoot.addEventListener('click', (event) => {
    const jsonSearchButton = event.target.closest('[data-json-search-action]');
    if (jsonSearchButton) {
      handleJsonSearchAction(jsonSearchButton);
      return;
    }
    const candidateStyleButton = event.target.closest('[data-candidate-style-action]');
    if (candidateStyleButton) {
      state.candidateState = candidateStyleButton.dataset.candidateStyleAction === 'show-expanded' ? 'expanded' : 'candidates';
      syncCandidateStateButtons();
      renderCurrentPreview();
      renderEditor();
      return;
    }
    const guideActionButton = event.target.closest('[data-guide-action]');
    if (guideActionButton) {
      handleGuideAction(guideActionButton);
      return;
    }
    const guideSpaceActionButton = event.target.closest('[data-guide-space-action]');
    if (guideSpaceActionButton) {
      handleGuideSpacebarAction(guideSpaceActionButton);
      return;
    }
    const button = event.target.closest('[data-keyboard-action]');
    if (!button) return;
    handleKeyboardLayoutAction(button);
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-custom-keyboard-panel]');
    if (!button) return;
    state.customKeyboardPanel = 'preview';
    state.editingKey = null;
    renderEditor();
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-toolbar-action]');
    if (!button) return;
    handleToolbarAction(button);
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-center-mode]');
    if (!button) return;
    state.centerEditMode = button.dataset.centerMode === 'custom' ? 'custom' : 'uniform';
    renderEditor();
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-combine-action]');
    if (!button) return;
    handleCombineAction(button);
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-layout-action]');
    if (!button) return;
    handleRowListAction(button);
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-swipe-action]');
    if (!button) return;
    handleSwipeAction(button);
  });
  el.editorRoot.addEventListener('change', (event) => {
    const select = event.target.closest('[data-swipe-draft]');
    if (!select) return;
    const field = select.dataset.swipeDraft;
    if (field === 'profile') state.swipeDraftProfile = select.value;
    if (field === 'key') state.swipeDraftKey = select.value;
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-inset-action]');
    if (!button) return;
    handleInsetAction(button);
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-collection-action]');
    if (!button) return;
    handleCollectionAction(button);
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-color-theme]');
    if (!button) return;
    setActiveTheme(button.dataset.colorTheme);
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-config-device]');
    if (!button) return;
    state.configDevice = button.dataset.configDevice;
    renderEditor();
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-download-action="choose-directory"]');
    if (!button) return;
    chooseDownloadDirectory();
  });
  el.editorRoot.addEventListener('click', (event) => {
    const token = editableKeyTokenFromEvent(event);
    if (!token) return;
    if (state.skipNextKeyEditorClick) {
      state.skipNextKeyEditorClick = false;
      event.preventDefault();
      return;
    }
    switchKeyEditor(token);
  });
  el.editorRoot.addEventListener('dragstart', handleKeyDragStart);
  el.editorRoot.addEventListener('dragover', handleKeyDragOver);
  el.editorRoot.addEventListener('dragleave', handleKeyDragLeave);
  el.editorRoot.addEventListener('drop', handleKeyDrop);
  el.editorRoot.addEventListener('dragend', handleKeyDragEnd);
  el.editorRoot.addEventListener('pointerdown', handleKeyPointerDown);
  el.editorRoot.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (!target.matches('select.action-type-select')) return;
    suppressKeyEditorAutoClose();
    syncSelectOptionLabels(target, true);
  });
  el.editorRoot.addEventListener('pointerup', handleKeyPointerUp);
  el.editorRoot.addEventListener('pointercancel', () => {
    state.keyDrag = null;
    handleKeyDragEnd();
  });
  el.editorRoot.addEventListener('input', handleInput);
  el.editorRoot.addEventListener('change', handleInput);
  el.editorRoot.addEventListener('change', (event) => {
    const target = event.target;
    if (target.matches('[data-collection-category-name]')) {
      renameCollectionCategory(target);
      return;
    }
    if (target.matches('select.action-type-select')) {
      suppressKeyEditorAutoClose();
      syncSelectOptionLabels(target, false);
    }
  });
  el.editorRoot.addEventListener('focusin', (event) => {
    const target = event.target;
    if (target.matches('select.action-type-select')) {
      suppressKeyEditorAutoClose();
      syncSelectOptionLabels(target, true);
    }
    if (!target.matches('.default-hint-input')) return;
    if (target.dataset.usesDefault !== 'true') return;
    target.value = '';
    target.classList.remove('is-default-value');
  });
  el.editorRoot.addEventListener('focusout', (event) => {
    const target = event.target;
    if (target.matches('select.action-type-select')) {
      syncSelectOptionLabels(target, false);
    }
    if (target.matches('[data-path], [data-json-path], [data-collection-items], [data-collection-entry-value], [data-collection-entry-field]')) {
      delete target.dataset.undoCaptured;
    }
    if (!target.matches('.default-hint-input')) return;
    if (target.value.trim() !== '') return;
    const defaultValue = target.dataset.defaultValue || '';
    target.value = defaultValue;
    target.dataset.usesDefault = 'true';
    target.classList.add('is-default-value');
    setFieldValue(target.dataset.path, defaultValue, target.dataset.type);
    renderProjectSummary();
    renderCurrentPreview();
  });

  el.themeToggleButton.addEventListener('click', () => {
    setActiveTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  document.querySelector('.preview-controls')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preview-orientation]');
    if (!button) return;
    state.previewOrientation = button.dataset.previewOrientation === 'landscape' ? 'landscape' : 'portrait';
    document.querySelectorAll('[data-preview-orientation]').forEach((item) => item.classList.toggle('active', item === button));
    renderCurrentPreview();
  });

  document.querySelectorAll('[data-candidate-state]').forEach((button) => {
    button.addEventListener('click', () => {
      state.candidateState = button.dataset.candidateState;
      syncCandidateStateButtons();
      if (isPreviewScopedModule()) renderEditor();
      renderCurrentPreview();
    });
  });

  el.previewRoot.addEventListener('click', (event) => {
    const keyCell = event.target.closest('[data-preview-key]');
    const target = centerTargetForPreviewKey(keyCell?.dataset.previewKey);
    if (target) {
      state.selectedCenterTarget = target;
      state.editingKey = { path: centerTargetPath(target) };
      if (state.moduleId === 'center') {
        state.centerEditMode = 'custom';
        renderEditor();
      }
    }

    const category = event.target.closest('[data-symbolic-category]');
    if (!category) return;
    state.symbolicCategory = category.dataset.symbolicCategory;
    renderCurrentPreview();
  });
  el.previewRoot.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const category = event.target.closest('[data-symbolic-category]');
    if (!category) return;
    event.preventDefault();
    state.symbolicCategory = category.dataset.symbolicCategory;
    renderCurrentPreview();
  });
  el.previewRoot.addEventListener('pointerdown', pressPreviewKeyboardCell);
  el.previewRoot.addEventListener('pointerleave', clearPressedPreviewCell);
  el.previewRoot.addEventListener('pointercancel', clearPressedPreviewCell);
  document.addEventListener('pointerup', releasePreviewKeyboardCell);

  el.previewMode.addEventListener('change', () => {
    setPreviewMode(el.previewMode.value);
  });
  el.sidebar.addEventListener('mouseenter', () => {
    setSidebarCollapsed(false);
  });
  el.sidebar.addEventListener('mouseleave', () => {
    setSidebarCollapsed(true);
  });
  el.previewModeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    togglePreviewModeMenu();
  });
  el.previewModeMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-preview-mode-value]');
    if (!option) return;
    setPreviewMode(option.dataset.previewModeValue);
  });
  el.expandPreviewButton.addEventListener('click', () => {
    if (state.previewExpanded) {
      closePreviewExpand();
      return;
    }
    openPreviewExpand();
  });
  document.addEventListener('click', (event) => {
    closeShortcutReference();
    if (event.target.closest('.preview-mode-select')) return;
    closePreviewModeMenu();
    if (event.target.closest('.preview-expand-overlay')) {
      closePreviewExpand();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeShortcutReference();
    }
    if (event.key === 'Escape' && state.previewExpanded) {
      closePreviewExpand();
    }
  });
  el.addPreviewKeyboardButton.addEventListener('click', addPreviewKeyboard);
  el.deletePreviewKeyboardButton.addEventListener('click', deleteSelectedPreviewKeyboard);
  el.resetPreviewKeyboardListButton.addEventListener('click', resetPreviewKeyboardList);

  el.saveTemplateButton.addEventListener('click', saveCurrentTemplateSnapshot);
  el.templateLibraryButton.addEventListener('click', openTemplateLibrary);
  el.undoButton.addEventListener('click', undoLastChange);

  el.exportProjectButton.addEventListener('click', exportProjectPackage);
  el.importProjectButton.addEventListener('click', confirmImportProject);

  el.importProjectInput.addEventListener('change', async () => {
    const file = el.importProjectInput.files?.[0];
    if (!file) return;
    let imported;
    try {
      imported = await importSkinProjectFromFile(file, state.sampleProject);
    } catch (error) {
      alert(`导入失败：${error.message}`);
      return;
    }
    pushUndoSnapshot();
    state.project = normalizedWorkbenchProject(
      imported.project,
      state.sampleProject,
      imported.project?.guide ? imported.project.guide.status || 'ready' : 'ready',
    );
    state.original = deepClone(state.project);
    markDirty();
    renderAll();
  });

  el.resetModuleButton.addEventListener('click', () => {
    const module = activeModule();
    const source = moduleResetSource();
    pushUndoSnapshot();
    moduleResetPaths(module).forEach((path) => {
      resetProjectPathFromSource(state.project, source, path);
    });
    if (state.sampleProject) {
      state.project = normalizedWorkbenchProject(state.project, state.sampleProject, state.project?.guide?.status || 'ready');
    }
    if (!previewModeExists(state.previewMode)) {
      state.previewMode = defaultPreviewMode();
    }
    state.editingKey = null;
    markDirty();
    renderAll();
  });

  el.jsonModeButton.addEventListener('click', () => {
    state.jsonMode = !state.jsonMode;
    state.jsonSearch = '';
    state.jsonSearchIndex = 0;
    renderEditor();
  });
}

async function loadSampleProject() {
  const response = await fetch('../../packages/project-schema/defaults/project.sample.json');
  if (!response.ok) {
    throw new Error(`无法载入 project.sample.json: ${response.status}`);
  }
  return response.json();
}

function mergeDefaultSwipes(project, sampleProject) {
  const next = deepClone(project);
  next.data = next.data || {};
  next.data.swipesEnabled = next.data.swipesEnabled !== false;
  next.data.swipes = next.data.swipes || {};
  for (const key of ['pinyin', 'alphabetic', 'numeric']) {
    const current = next.data.swipes[key];
    if (!current || Object.keys(current).length === 0) {
      next.data.swipes[key] = deepClone(sampleProject.data?.swipes?.[key] || {});
    }
  }
  return next;
}

function cleanPerItemFontSize(value) {
  if (Array.isArray(value)) {
    value.forEach((item) => cleanPerItemFontSize(item));
    return value;
  }
  if (!value || typeof value !== 'object') return value;
  delete value.fontSize;
  Object.values(value).forEach((item) => cleanPerItemFontSize(item));
  return value;
}

function normalizeDataFontSize(project) {
  const next = deepClone(project);
  if (next.data?.swipes) cleanPerItemFontSize(next.data.swipes);
  if (next.data?.hints) cleanPerItemFontSize(next.data.hints);
  return next;
}

function ensureSchemaNameColor(project) {
  const schemaName = project.keyboards?.keyboard26?.pinyinSchemaName || {};
  for (const theme of ['light', 'dark']) {
    const colors = project.theme?.[theme]?.colors;
    if (!colors || colors['方案名颜色']) continue;
    const legacyColorKey = schemaName.colorKey || '划动字符颜色';
    colors['方案名颜色'] = colors[legacyColorKey] || colors['划动字符颜色'] || (theme === 'dark' ? '#b6b7b9' : '#838383ff');
  }
}

function migrateSchemaNameFontSize(project, sampleProject) {
  const fontSizes = project.theme?.shared?.fontSize;
  if (!fontSizes) return;
  const schemaName = project.keyboards?.keyboard26?.pinyinSchemaName;
  if (fontSizes['方案名字号'] === undefined) {
    fontSizes['方案名字号'] = Number(schemaName?.fontSize || sampleProject.theme?.shared?.fontSize?.['方案名字号'] || 8);
  }
  if (schemaName && typeof schemaName === 'object') delete schemaName.fontSize;
}

function migrateCandidateFontSizeDefaults(project, sampleProject) {
  const fontSizes = project.theme?.shared?.fontSize;
  const sampleFontSizes = sampleProject.theme?.shared?.fontSize;
  if (!fontSizes || !sampleFontSizes) return;
  const legacyDefaults = {
    '未展开候选字体选中字体大小': 12,
    '未展开comment字体大小': 10,
    '展开候选字体选中字体大小': 14,
    '展开comment字体大小': 10,
  };
  const intermediateDefaults = {
    '未展开候选字体选中字体大小': 18,
    '未展开comment字体大小': 14,
    '展开候选字体选中字体大小': 16,
    '展开comment字体大小': 13,
  };
  [legacyDefaults, intermediateDefaults].forEach((defaults) => Object.entries(defaults).forEach(([key, legacyValue]) => {
    if (fontSizes[key] === legacyValue && sampleFontSizes[key] !== undefined && sampleFontSizes[key] !== legacyValue) {
      fontSizes[key] = sampleFontSizes[key];
    }
  }));
}

function migrateSwipeMarkerDefaults(project, sampleProject) {
  const fontSizes = project.theme?.shared?.fontSize;
  const sampleFontSizes = sampleProject.theme?.shared?.fontSize;
  const centers = project.theme?.shared?.center;
  const sampleCenters = sampleProject.theme?.shared?.center;
  if (fontSizes && sampleFontSizes) {
    for (const key of ['上划文字大小', '下划文字大小']) {
      if (fontSizes[key] === 9 && sampleFontSizes[key] !== undefined) {
        fontSizes[key] = sampleFontSizes[key];
      }
    }
  }
  if (centers && sampleCenters) {
    const legacyCenters = {
      上划文字偏移: { x: 0.25, y: 0.28 },
      上划文字偏移2: { x: 0.3, y: 0.32 },
      下划文字偏移: { x: 0.75, y: 0.28 },
      下划文字偏移2: { x: 0.7, y: 0.32 },
      上划sf符号偏移: { x: 0.25, y: 0.68 },
      下划sf符号偏移: { x: 0.75, y: 0.68 },
    };
    for (const [legacyKey, legacy] of Object.entries(legacyCenters)) {
      const key = legacyKey.replace(/\d+$/, '');
      const current = centers[key];
      if (
        current
        && Number(current.x) === legacy.x
        && Number(current.y) === legacy.y
        && sampleCenters[key]
      ) {
        centers[key] = deepClone(sampleCenters[key]);
      }
    }
  }
  for (const profile of ['pinyin', 'alphabetic']) {
    const swipes = project.data?.swipes?.[profile];
    const sampleSwipes = sampleProject.data?.swipes?.[profile];
    if (!swipes || !sampleSwipes) continue;
    for (const direction of ['swipe_up', 'swipe_down']) {
      for (const [key, entry] of Object.entries(swipes[direction] || {})) {
        const sampleCenter = sampleSwipes[direction]?.[key]?.center;
        if (entry?.center && sampleCenter) {
          const current = entry.center;
          const legacyTop = direction === 'swipe_up'
            && Number(current.x) === 0.5
            && (Number(current.y) === 0.25 || Number(current.y) === 0.24);
          const legacyBottom = direction === 'swipe_down'
            && Number(current.x) === 0.5
            && [0.75, 0.8, 0.85].includes(Number(current.y));
          if (legacyTop || legacyBottom) entry.center = deepClone(sampleCenter);
        }
      }
    }
  }
}

function migrateKeyboard26FontSizeDefaults(project, sampleProject) {
  if (!isDefaultGeneratedSkin(project) && !isLegacyDefaultSkinMeta(project)) return;
  const fontSizes = project.theme?.shared?.fontSize;
  const sampleFontSizes = sampleProject.theme?.shared?.fontSize;
  const scales = project.theme?.shared?.scale;
  const sampleScales = sampleProject.theme?.shared?.scale;
  if (fontSizes && sampleFontSizes) {
    const legacyKeyFontSize = 21;
    if (
      fontSizes['按键前景文字大小'] === legacyKeyFontSize
      && sampleFontSizes['按键前景文字大小'] !== undefined
      && sampleFontSizes['按键前景文字大小'] !== legacyKeyFontSize
    ) {
      fontSizes['按键前景文字大小'] = sampleFontSizes['按键前景文字大小'];
    }
  }
  if (scales && sampleScales && scales['26键中文前景缩放'] === undefined && sampleScales['26键中文前景缩放'] !== undefined) {
    scales['26键中文前景缩放'] = sampleScales['26键中文前景缩放'];
  }
  if (
    scales
    && sampleScales
    && scales['26键中文前景缩放'] === 1.42
    && sampleScales['26键中文前景缩放'] !== undefined
    && sampleScales['26键中文前景缩放'] !== 1.42
  ) {
    scales['26键中文前景缩放'] = sampleScales['26键中文前景缩放'];
  }
}

function handleJsonSearchAction(button) {
  const source = jsonSourceForMode(currentValue());
  const matches = jsonSearchMatches(jsonSourceText(source.value), state.jsonSearch);
  if (!matches.length) return;
  const direction = button.dataset.jsonSearchAction === 'prev' ? -1 : 1;
  state.jsonSearchIndex = (state.jsonSearchIndex + direction + matches.length) % matches.length;
  renderEditor();
}

function migratePinyin9MetricDefaults(project, sampleProject) {
  const metrics = project.keyboards?.keyboard26?.variants?.['9']?.metrics?.portrait;
  const sampleMetrics = sampleProject.keyboards?.keyboard26?.variants?.['9']?.metrics?.portrait;
  if (!metrics || !sampleMetrics) return;
  const legacyDefault = (
    metrics['123']?.width?.percentage === 0.18
    && metrics.normal?.width?.percentage === 0.3333
    && metrics.space?.width?.percentage === 0.62
    && metrics.enter?.width?.percentage === 0.2
  );
  const missingDetailedMetrics = !metrics.punctuationColumn || !metrics.backspace || !metrics.reinput || !metrics.symbol || !metrics.cnen;
  if (!legacyDefault && !missingDetailedMetrics) return;
  for (const key of ['punctuationColumn', 'backspace', 'reinput', 'normal', 'symbol', '123', 'space', 'cnen', 'enter']) {
    if (sampleMetrics[key]) metrics[key] = deepClone(sampleMetrics[key]);
  }
}

function migrateEnterAccentSurfaceDefaults(project, sampleProject) {
  const surface = project.keyStyles?.surfaceStyles?.keyboard26?.enterAccent;
  const sampleSurface = sampleProject.keyStyles?.surfaceStyles?.keyboard26?.enterAccent;
  if (!surface || !sampleSurface) return;
  const offset = surface.shadowOffset || {};
  const isLegacyThickSurface = (
    Number(surface.borderSize) === 0.45
    && Number(surface.shadowRadius) === 2.2
    && Number(surface.shadowOpacity) === 1
    && Number(offset.x || 0) === 0
    && Number(offset.y) === 1.1
  );
  if (isLegacyThickSurface) {
    project.keyStyles.surfaceStyles.keyboard26.enterAccent = deepClone(sampleSurface);
  }
}

function migrateDefaultPresetValues(project, sampleProject) {
  if (!project || !sampleProject) return project;
  migrateSchemaNameFontSize(project, sampleProject);
  migrateCandidateFontSizeDefaults(project, sampleProject);
  migrateSwipeMarkerDefaults(project, sampleProject);
  migrateKeyboard26FontSizeDefaults(project, sampleProject);
  migratePinyin9MetricDefaults(project, sampleProject);
  migrateEnterAccentSurfaceDefaults(project, sampleProject);
  normalizeLegacyTransparentKeyboardBackgrounds(project);
  const darkColors = project.theme?.dark?.colors;
  if (darkColors) {
    if (darkColors['字母键背景颜色-普通'] === '#2C2C2E') {
      darkColors['字母键背景颜色-普通'] = '#3A3A3C';
    }
    if (darkColors['功能键背景颜色-普通'] === '#5B6270') {
      darkColors['功能键背景颜色-普通'] = '#3A3A3C';
    }
  }
  const sharedCenter = project.theme?.shared?.center;
  const sampleCenter = sampleProject.theme?.shared?.center;
  if (sharedCenter && sampleCenter && !sharedCenter['toolbar按键偏移']) {
    sharedCenter['toolbar按键偏移'] = deepClone(
      sharedCenter['toolbar按键sf符号偏移']
      || sharedCenter['toolbar按键文字偏移']
      || sampleCenter['toolbar按键偏移'],
    );
  }

  const metrics = project.keyboards?.keyboard26?.metrics?.portrait;
  const sampleMetrics = sampleProject.keyboards?.keyboard26?.metrics?.portrait;
  if (metrics && sampleMetrics) {
    const current = {
      '123': metrics['123']?.width?.percentage,
      cnen: metrics.cnen?.width?.percentage,
      space: metrics.space?.width?.percentage,
      spaceRight: metrics.spaceRight?.width?.percentage,
      enter: metrics.enter?.width?.percentage,
    };
    const legacyDefault = (
      current['123'] === 0.15
      && current.cnen === 0.08
      && current.space === 0.46
      && current.spaceRight === 0.08
      && current.enter === 0.15
    );
    const legacyIos26Preset = (
      current['123'] === 0.12
      && current.cnen === 0.085
      && current.space === 0.495
      && current.spaceRight === 0.1
      && current.enter === 0.2
    );
    if (legacyDefault || legacyIos26Preset) {
      for (const key of ['123', 'cnen', 'space', 'spaceRight', 'enter']) {
        metrics[key] = deepClone(sampleMetrics[key]);
      }
    }
  }
  return project;
}

function normalizeLegacyTransparentColorValue(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/#?D0D3DA00/gi, (match) => (match.startsWith('#') ? '#D0D3DA01' : 'D0D3DA01'))
    .replace(/#?47474700/gi, (match) => (match.startsWith('#') ? '#47474701' : '47474701'));
}

function normalizeLegacyTransparentKeyboardBackgrounds(value) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      value[index] = normalizeLegacyTransparentKeyboardBackgrounds(value[index]);
    }
    return value;
  }
  if (!value || typeof value !== 'object') return normalizeLegacyTransparentColorValue(value);
  for (const [key, item] of Object.entries(value)) {
    value[key] = normalizeLegacyTransparentKeyboardBackgrounds(item);
  }
  return value;
}

function mergeDefaultCollections(project, sampleProject) {
  const next = deepClone(project);
  next.data = next.data || {};
  if (!next.data.collections || Object.keys(next.data.collections).length === 0) {
    next.data.collections = deepClone(sampleProject.data?.collections || {});
  }
  if (!next.data.hints || Object.keys(next.data.hints).length === 0) {
    next.data.hints = deepClone(sampleProject.data?.hints || {});
  }
  cleanPerItemFontSize(next.data.swipes);
  cleanPerItemFontSize(next.data.hints);
  if (!next.config || Object.keys(next.config).length === 0) {
    next.config = deepClone(sampleProject.config || {});
  }
  next.keyboardCombo = normalizedKeyboardCombo(next.keyboardCombo || sampleProject.keyboardCombo || {});
  next.previewKeyboards = Array.isArray(next.previewKeyboards) ? next.previewKeyboards : [];
  next.hiddenPreviewKeyboards = Array.isArray(next.hiddenPreviewKeyboards) ? next.hiddenPreviewKeyboards : [];
  next.keyboards = next.keyboards || {};
  next.keyboards.keyboard26 = next.keyboards.keyboard26 || {};
  next.keyboards.keyboard26.keyDisplays = next.keyboards.keyboard26.keyDisplays || {};
  next.keyboards.keyboard26.keyDisplayTypes = next.keyboards.keyboard26.keyDisplayTypes || {};
  next.keyboards.keyboard26.keyTypes = next.keyboards.keyboard26.keyTypes || {};
  next.keyboards.keyboard26.layout = next.keyboards.keyboard26.layout || {};
  next.keyboards.keyboard26.metrics = next.keyboards.keyboard26.metrics || deepClone(sampleProject.keyboards?.keyboard26?.metrics || {});
  next.keyboards.keyboard26.variants = next.keyboards.keyboard26.variants || deepClone(sampleProject.keyboards?.keyboard26?.variants || {});
  next.keyboards.keyboard26.layout.portrait = next.keyboards.keyboard26.layout.portrait || {};
  if (!Array.isArray(next.keyboards.keyboard26.layout.portrait.rows)) {
    next.keyboards.keyboard26.layout.portrait.rows = deepClone(
      sampleProject.keyboards?.keyboard26?.layout?.portrait?.rows
      || keyboard26RowsFromLegacyPortrait(next.keyboards.keyboard26.layout.portrait)
      || KEYBOARD26_DEFAULT_ROWS,
    );
  }
  next.keyboards.numeric = next.keyboards.numeric || {};
  next.keyboards.numeric.layout = next.keyboards.numeric.layout || {};
  next.keyboards.numeric.metrics = next.keyboards.numeric.metrics || deepClone(sampleProject.keyboards?.numeric?.metrics || {});
  next.keyboards.numeric.layout.portrait = next.keyboards.numeric.layout.portrait || {};
  if (!Array.isArray(next.keyboards.numeric.layout.portrait.columns)) {
    next.keyboards.numeric.layout.portrait.columns = deepClone(
      sampleProject.keyboards?.numeric?.layout?.portrait?.columns || DEFAULT_NUMERIC_COLUMNS,
    );
  }
  next.keyboards.numeric.layout.landscape = next.keyboards.numeric.layout.landscape || {};
  next.keyboards.numeric.keyDisplays = next.keyboards.numeric.keyDisplays || {};
  if (!Array.isArray(next.keyboards.numeric.collectionSymbols)) {
    next.keyboards.numeric.collectionSymbols = deepClone(
      sampleProject.keyboards?.numeric?.collectionSymbols || DEFAULT_NUMERIC_SYMBOLS,
    );
  }
  next.keyboards.symbolic = next.keyboards.symbolic || {};
  next.keyboards.symbolic.layout = next.keyboards.symbolic.layout || {};
  next.keyboards.symbolic.metrics = next.keyboards.symbolic.metrics || deepClone(sampleProject.keyboards?.symbolic?.metrics || {});
  next.keyboards.symbolic.layout.portrait = next.keyboards.symbolic.layout.portrait || {};
  if (!Array.isArray(next.keyboards.symbolic.layout.portrait.categoryRows)) {
    next.keyboards.symbolic.layout.portrait.categoryRows = deepClone(SYMBOLIC_SPECIAL_LAYOUT_GROUPS[0].defaultRows);
  }
  if (!Array.isArray(next.keyboards.symbolic.layout.portrait.functionRows)) {
    next.keyboards.symbolic.layout.portrait.functionRows = deepClone(
      sampleProject.keyboards?.symbolic?.layout?.portrait?.functionRows || DEFAULT_SYMBOLIC_FUNCTION_ROWS,
    );
  }
  next.keyboards.symbolic.layout.portrait.categoryCellHeight = next.keyboards.symbolic.layout.portrait.categoryCellHeight
    ?? sampleProject.keyboards?.symbolic?.layout?.portrait?.categoryCellHeight
    ?? 31;
  next.keyboards.symbolic.layout.portrait.descriptionCellHeight = next.keyboards.symbolic.layout.portrait.descriptionCellHeight
    ?? sampleProject.keyboards?.symbolic?.layout?.portrait?.descriptionCellHeight
    ?? 28;
  next.keyboards.symbolic.keyDisplays = next.keyboards.symbolic.keyDisplays || {};
  next.keyboards.emoji = next.keyboards.emoji || {};
  next.keyboards.emoji.layout = next.keyboards.emoji.layout || {};
  next.keyboards.emoji.layout.portrait = next.keyboards.emoji.layout.portrait || {};
  if (!Array.isArray(next.keyboards.emoji.layout.portrait.collectionRows)) {
    next.keyboards.emoji.layout.portrait.collectionRows = deepClone(EMOJI_SPECIAL_LAYOUT_GROUPS[0].defaultRows);
  }
  next.keyboards.panel = next.keyboards.panel || {};
  next.keyboards.panel.text = next.keyboards.panel.text || deepClone(sampleProject.keyboards?.panel?.text || {});
  next.keyboards.panel.metrics = next.keyboards.panel.metrics || deepClone(sampleProject.keyboards?.panel?.metrics || {});
  if (next.meta?.name === '仿ios-显') next.meta.name = sampleProject.config?.name || sampleProject.meta?.name || next.meta.name;
  if (next.meta?.author === '叙白') next.meta.author = sampleProject.config?.author || sampleProject.meta?.author || next.meta.author;
  if (
    next.meta?.description === '浏览器默认下载位置'
    || next.meta?.description?.startsWith('从本地示例皮肤')
  ) {
    next.meta.description = DEFAULT_DOWNLOAD_PATH;
  }
  ensureSchemaNameColor(next);
  migrateDefaultPresetValues(next, sampleProject);
  syncCollectionDerivedFields(next);
  return next;
}

async function boot() {
  const sampleProject = normalizeDataFontSize(await loadSampleProject());
  state.sampleProject = sampleProject;
  const templateRecords = await listTemplateSnapshots().catch(() => []);
  const defaultProject = applyDefaultSkinMeta(sampleProject, nextDefaultSkinIndex(templateRecords));
  ensureProjectGuide(defaultProject, 'pending');
  state.project = deepClone(defaultProject);
  state.original = deepClone(defaultProject);
  const stored = loadProject();
  if (
    stored?.project
    && validateProject(stored.project).ok
    && stored.project.templateId === sampleProject.templateId
  ) {
    const storedGuideStatus = stored.project?.guide
      ? (stored.project.guide.status || 'ready')
      : 'pending';
    const merged = normalizedWorkbenchProject(
      stored.project,
      sampleProject,
      storedGuideStatus,
    );
    resetGuideGenerationForFreshBoot(merged, stored.project);
    state.project = isLegacyDefaultSkinMeta(merged)
      ? applyDefaultSkinMeta(merged, nextDefaultSkinIndex(templateRecords))
      : merged;
    ensureProjectGuide(state.project, 'pending');
    state.original = deepClone(state.project);
    state.savedAt = stored.savedAt;
  }
  bindEvents();
  renderAll();
  refreshVisitorStats();
  openWelcomeNotice();
}

boot().catch((error) => {
  el.editorRoot.innerHTML = `<section class="group-card"><h3>启动失败</h3><p>${escapeHtml(error.message)}</p></section>`;
  console.error(error);
});
