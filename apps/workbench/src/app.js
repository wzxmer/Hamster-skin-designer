import { validateProject } from '../../../packages/project-schema/validators/project-validator.js';
import { buildSkinPackageFiles, createZipBlob, defaultPackageFileName } from '../../../packages/exporter/index.js';
import { MODULES } from './data/modules.js';
import {
  deleteTemplateSnapshot,
  listTemplateSnapshots,
  loadProject,
  loadTemplateSnapshot,
  saveProject,
  saveTemplateSnapshot,
} from './storage/local-store.js';
import { renderPreview } from './ui/preview.js';
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
  moduleId: 'meta',
  sidebarCollapsed: false,
  theme: 'light',
  previewMode: 'keyboard26',
  previewOrientation: 'portrait',
  candidateState: 'toolbar',
  symbolicCategory: '常用',
  previewHintKey: null,
  previewPressedKey: null,
  previewShiftActive: false,
  keyDrag: null,
  skipNextKeyEditorClick: false,
  editingKey: null,
  customKeyboardPanel: 'preview',
  keyboard26LayoutMode: 'portrait',
  metricsKeyboardId: 'keyboard26',
  metricsOrientation: 'portrait',
  metricsSelectedKeys: {},
  swipeMode: 'swipe_up',
  confirmDialog: null,
  jsonMode: false,
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
};

let pressedPreviewCell = null;
let previewLongPressTimer = null;

const PREVIEW_LONG_PRESS_DELAY_MS = 420;

const VISITOR_ID_STORAGE_KEY = 'hamster-workbench-visitor-id';
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
const FUNCTION_KEY_LABELS = {
  '123': '数字切换键',
  cnen: '中英切换键',
  shift: 'Shift键',
  backspace: '退格键',
  space: '空格键',
  spaceRight: '空格右侧键',
  enter: '回车键',
  symbol: '符号键',
};
const KEYBOARD26_FUNCTION_KEY_ORDER = ['123', 'cnen', 'shift', 'backspace', 'symbol', 'space', 'spaceRight', 'enter'];
const SWIPE_KEY_SHORT_LABELS = {
  space: '空格',
  spaceRight: '空格右',
  backspace: '退格',
  enter: '回车',
  shift: 'Shift键',
  cnen: '中英',
  '123': '数字',
  return: '返回',
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
const DEFAULT_TOOLBAR_BUTTONS = ['menu', 'symbol', 'translate', 'emoji', 'phrase', 'pasteboard', 'script', 'close'];
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
const INSET_ITEM_LABELS = {
  normal: '普通键',
  functionKey: '功能键',
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
  menu: '菜单',
  translate: '翻译',
  emoji: '表情',
  phrase: '短语',
  pasteboard: '剪贴板',
  script: '脚本',
  close: '关闭',
};
const KEYBOARD_METRIC_LABELS = {
  keyboard26: '26 键',
  numeric: '数字键盘',
  symbolic: '符号键盘',
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
  actionType: '动作类型',
  actionValue: '动作值',
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
  iconCenter: '图标偏移',
  categoryCellHeight: '左侧分类项高度',
  descriptionCellHeight: '右侧符号项高度',
};
const ACTION_TYPE_LABELS = {
  standard: '标准动作',
  character: '输入字符',
  symbol: '切换符号',
  shortcut: '快捷指令',
  sendKeys: '发送按键',
  openURL: '打开链接',
  runScript: '执行脚本',
  runTranslateScript: '执行翻译脚本',
  keyboardType: '键盘切换',
  switchRimeSchema: '切换 RIME 方案',
  raw: '原始值',
};
const ACTION_TYPES = ['standard', 'character', 'symbol', 'sendKeys', 'openURL', 'runScript', 'keyboardType', 'shortcut', 'switchRimeSchema', 'runTranslateScript'];
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
const KEYBOARD_TYPE_VALUES = ['pinyin', 'alphabetic', 'symbolic', 'numeric', 'emojis'];
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
  '#toggleScriptView',
  '#candidatesBarStateToggle',
  '#rimePreviousPage',
  '#rimeNextPage',
  '#toggleEmbeddedInputMode',
  '#keyboardPerformance',
  '#keyboardMenu',
];
const OPEN_URL_VALUES = ['#pasteboardContent', '#selectText', '#pasteboardContent#selectText'];
const MAX_UNDO_STEPS = 30;

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
    keyboard26: ['enter键背景(蓝色)', '划动字符颜色', '方案名颜色', '按键边缘颜色'],
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
    keyboard26: ['按键前景文字大小', '按键前景sf符号大小', '上划文字大小', '下划文字大小', '长按气泡文字大小', '长按气泡sf符号大小'],
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
    toolbar: ['toolbar按键sf符号偏移', 'toolbar按键文字偏移'],
    candidates: ['toolbar按键sf符号偏移'],
    expanded: [],
  },
  scale: {
    keyboard26: ['26键中文前景缩放', '26键英文小写前景缩放'],
    numeric: ['数字键盘前景缩放'],
    symbolic: [],
    panel: [],
    toolbar: ['toolbar按键缩放'],
    candidates: ['toolbar按键缩放'],
    expanded: [],
  },
};

const CENTER_CATEGORY_LABELS = {
  keyForeground: '按键前景',
  swipe: '滑动标记',
  hint: '长按气泡',
  toolbar: '工具栏 / 候选栏',
  panel: '自定义面板',
  special: '当前键盘特殊项',
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
  'toolbar按键文字偏移': { category: 'toolbar', states: ['toolbar', 'candidates', 'expanded'] },
  'toolbar按键sf符号偏移': { category: 'toolbar', states: ['toolbar', 'candidates', 'expanded'] },
  'panel键盘按键文字前景偏移': { category: 'panel', modes: ['panel'] },
  'panel键盘按键sf符号前景偏移': { category: 'panel', modes: ['panel'] },
};

const PREVIEW_INSET_SCOPE = {
  keyboard26: ['keyboard26'],
  numeric: ['numeric'],
  symbolic: ['symbolic'],
  panel: ['panel'],
  toolbar: [],
  candidates: ['toolbar'],
  expanded: ['toolbar'],
};

const PREVIEW_INSET_ITEM_SCOPE = {
  toolbar: {
    candidates: ['horizontalCandidates'],
    expanded: ['verticalCandidatesStyle', 'verticalCandidateFunction'],
  },
};

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function currentPreviewScope() {
  const mode = previewRenderMode(state.previewMode);
  const candidateState = state.candidateState || 'toolbar';
  const orientation = previewRenderOrientation(state.previewMode);
  const source = previewSourceName(state.previewMode);
  return {
    mode,
    source,
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
    panel: '面板',
  }[scope.mode] || '当前键盘';
  const stateLabel = {
    toolbar: '工具栏',
    candidates: '候选栏',
    expanded: '展开候选',
  }[scope.candidateState] || '当前界面';
  const orientationLabel = scope.orientation === 'landscape' ? '横屏' : '竖屏';
  return `${modeLabel} / ${stateLabel} / ${orientationLabel}`;
}

function scopeKeys(scopeName) {
  const scope = currentPreviewScope();
  const map = PREVIEW_FIELD_SCOPE[scopeName] || {};
  const keys = [...(map.base || [])];
  if (scope.keyboardVisible) {
    keys.push(...(map.keyboardCommon || []), ...(map[scope.mode] || []));
  }
  keys.push(...(map[scope.candidateState] || []));
  return uniqueValues(keys);
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

function renderPreviewScopeHeader(title = '当前可编辑内容', description = '由右侧键盘预览自动匹配，需要编辑其他键盘时请切换右侧预览。', actions = '') {
  return `
    <div class="preview-scoped-header">
      <div class="preview-scoped-copy">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(description)}</p>
        </div>
        ${actions ? `<div class="preview-scoped-actions">${actions}</div>` : ''}
      </div>
      <span>${escapeHtml(previewScopeLabel())}</span>
    </div>
  `;
}

function renderScopedEmptyNote() {
  return '<p class="empty-note">当前预览界面没有匹配的可调项目。</p>';
}

function isPreviewScopedModule() {
  return ['colors', 'fontSize', 'center', 'scale', 'keyboardFrame', 'buttonInsets', 'customKeyboards', 'metrics', 'swipes', 'hints'].includes(activeModule().id);
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

function isLegacyDefaultSkinMeta(project) {
  return project?.meta?.name === '示例模板1' && project?.meta?.author === '浮生';
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
    ? mergeDefaultCollections(mergeDefaultSwipes(previousProject, state.sampleProject), state.sampleProject)
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

function displayActionType(type) {
  return ACTION_TYPE_LABELS[type] || type;
}

function displayActionTypeWithCode(type) {
  return `${displayActionType(type)}（${type}）`;
}

function keyCodeLabel(key) {
  return FUNCTION_KEY_LABELS[key] || NUMERIC_KEY_LABELS[key] || SYMBOLIC_KEY_LABELS[key] || key;
}

function keyboard26PreviewProfile() {
  const source = previewSourceName(state.previewMode);
  if (source.startsWith('alphabetic')) return 'alphabetic';
  return 'pinyin';
}

function colorSwatchValue(value) {
  const text = String(value || '').trim();
  return /^#[0-9a-fA-F]{3,4}$|^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{8}$/.test(text) ? text : 'transparent';
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
  } = attrs;
  const id = `field-${Math.random().toString(36).slice(2)}`;
  const listId = suggestions.length ? `${id}-list` : '';
  const displayValue = value ?? '';
  const extra = [
    `data-path="${escapeHtml(path)}"`,
    `data-type="${escapeHtml(type)}"`,
    listId ? `list="${listId}"` : '',
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
      <div class="field-card">
        <label for="${id}">${escapeHtml(label)}</label>
        <div class="color-field">
          <span class="color-swatch" style="--swatch-color:${escapeHtml(swatchColor)}" aria-hidden="true"></span>
          <input id="${id}" type="text" value="${escapeHtml(displayValue)}" ${extra}>
        </div>
      </div>
    `;
  }

  return `
    <div class="field-card">
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
  pinyin_26_portrait: '中文26键竖屏',
  pinyin_26_landscape: '中文26键横屏',
  alphabetic_26_portrait: '英文26键竖屏',
  alphabetic_26_landscape: '英文26键横屏',
  numeric_9_portrait: '数字9键竖屏',
  numeric_9_landscape: '数字9键横屏',
  symbolic_portrait: '符号键盘竖屏',
  panel_portrait: '自定义面板竖屏',
  panel_landscape: '自定义面板横屏',
};

const PREVIEW_KEYBOARD_GROUP_ORDER = ['pinyin', 'alphabetic', 'numeric', 'symbolic', 'panel'];
const PREVIEW_KEYBOARD_ORIENTATION_ORDER = ['portrait', 'landscape'];

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

function collectConfigKeyboardNames(config = state.project.config || {}, { includePreviewKeyboards = true } = {}) {
  const names = new Set([
    'pinyin_26_portrait',
    'pinyin_26_landscape',
    'alphabetic_26_portrait',
    'alphabetic_26_landscape',
    'numeric_9_portrait',
    'numeric_9_landscape',
    'symbolic_portrait',
    'panel_portrait',
    'panel_landscape',
  ]);
  for (const group of ['pinyin', 'alphabetic', 'numeric', 'symbolic', 'panel']) {
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
  ['pinyin', 'alphabetic', 'numeric', 'symbolic', 'panel'].forEach((group) => {
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

function renderConfigKeyboardMapping(config = {}) {
  const keyboardOptions = collectConfigKeyboardNames(config);
  return `
    <section class="group-card">
      <div class="layout-toolbar config-keyboard-toolbar">
        <div>
          <h3>键盘配置</h3>
          ${renderConfigDeviceSwitch(config)}
        </div>
      </div>
      <div class="config-keyboard-list">
        ${['pinyin', 'alphabetic', 'numeric', 'symbolic', 'panel'].map((group) => {
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
                    ${configKeyboardSelect(`config.${group}.${device}.${orientation}`, keyboardName, keyboardOptions)}
                  </div>
                `).join('')}
              </div>
            </div>
          </section>
        `;
  }).join('')}
      </div>
    </section>
  `;
}

function renderMetaEditor() {
  const defaults = state.project.config || {};
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
      <div class="section-grid">
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
  return `<div class="section-grid compact-field-grid two-column-field-grid">${
    entries.map(([key, fieldValue]) => input({
      path: `${basePath}.${key}`,
      label: displayFieldLabel(key),
      value: fieldValue,
      type: 'number',
      step: '0.01',
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
          label: `空格右侧键 ${mode === 'pinyin' ? '中文' : '英文'} ${slot === 'primary' ? '点击显示' : '上划显示'}`,
          point: getPath(state.project, path),
          category: 'special',
        });
      }
    }
    entries.push({
      path: 'keyboards.keyboard26.pinyinSchemaName.center',
      label: '中文方案名位置',
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
    for (const direction of ['swipe_up', 'swipe_down']) {
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

function renderCenterModule(value = {}, basePath = 'theme.shared.center') {
  const entries = [...centerEntriesForScope(value), ...centerSpecialEntriesForScope()];
  const categoryOrder = ['keyForeground', 'swipe', 'hint', 'toolbar', 'panel', 'special'];
  return `
    ${renderPreviewScopeHeader('偏移设置', '只显示右侧当前预览界面里可设置的偏移项；其他模块不再单独显示偏移输入。')}
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
          ${customEnabled ? renderInsetModeMenu(group, mode, title) : ''}
        </div>
        <div class="layout-actions">
          ${customEnabled && mode === 'custom' ? `<button class="tool-button primary" type="button" data-inset-action="add-custom-rule" data-group="${escapeHtml(group)}"><span aria-hidden="true">＋</span>添加</button>` : ''}
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
  ]);
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
  const orientationValue = value[scope.orientation] || {};
  const showPanel = scope.mode === 'panel';
  const frameKeys = scope.candidateState === 'expanded'
    ? ['toolbarHeight', 'keyboardHeight']
    : ['toolbarHeight', 'keyboardHeight'];
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
      ${renderPreviewScopeNote()}
    </section>
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
  return `<option value="${escapeHtml(value)}" data-selected-label="${escapeHtml(selectedLabel)}" data-dropdown-label="${escapeHtml(dropdownLabel)}" ${value === selectedValue ? 'selected' : ''}>${escapeHtml(selectedLabel)}</option>`;
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
  if (typeof action === 'string') return { type: 'shortcut', value: action };
  if (!action || typeof action !== 'object') return { type: 'character', value: '' };
  const [type, value] = Object.entries(action)[0] || ['character', ''];
  return { type, value };
}

function actionValueSuggestions(type) {
  return {
    standard: STANDARD_ACTION_VALUES,
    keyboardType: KEYBOARD_TYPE_VALUES,
    shortcut: SHORTCUT_VALUES,
    openURL: OPEN_URL_VALUES,
  }[type] || [];
}

function buildAction(type, value) {
  if (!value) return {};
  if (type === 'raw') return value;
  return { [type]: value };
}

function labelToFields(label = {}) {
  if (label.systemImageName) return { type: 'systemImageName', value: label.systemImageName };
  return { type: 'text', value: label.text || '' };
}

function allKeyboard26Keys(value) {
  return [...new Set(keyboard26PortraitRows(value).flatMap((row) => row.keys || []))];
}

function keyboard26RowsFromLegacyPortrait(portrait = {}) {
  return KEYBOARD26_ROW_ORDER.map((row, index) => ({
    id: `row-${index + 1}`,
    label: KEYBOARD26_ROW_LABELS[row] || `第 ${index + 1} 行`,
    keys: portrait[row] || [],
  }));
}

function keyboard26PortraitRows(value = {}) {
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
  return 'keyboards.keyboard26.layout.portrait.rows';
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
  const portraitPath = 'keyboards.keyboard26.layout.portrait';
  KEYBOARD26_ROW_ORDER.forEach((rowName, index) => {
    setPath(state.project, `${portraitPath}.${rowName}`, rows[index]?.keys || []);
  });
}

function keyboard26RowPath(index) {
  return `${keyboard26RowsPath()}.${index}.keys`;
}

function keyDisplayValue(value, key) {
  const text = value.text || {};
  const profile = keyboard26PreviewProfile();
  if (/^[a-z]$/.test(key)) return value.keyDisplays?.[key] || key.toUpperCase();
  if (key === '123') return text.numericSwitch || '123';
  if (key === 'symbol') return text.symbol || '#+=';
  if (key === 'space') return text.space || '空格';
  if (key === 'spaceRight') return value.spaceRight?.[profile]?.primary?.text || value.spaceRight?.pinyin?.primary?.text || '，';
  if (key === 'enter') return text.enter?.default || '回车';
  return value.keyDisplays?.[key] || FUNCTION_KEY_LABELS[key] || key;
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

function renderVisualKeyToken(path, key, removeAttrs = '', dragAttrs = '') {
  const label = key ? keyCodeLabel(key) : '空';
  const active = state.editingKey?.path === path ? ' is-active' : '';
  return `
    <div class="key-token-editor is-visual-token${active}" ${dragAttrs} data-key-edit-path="${escapeHtml(path)}" data-key-value="${escapeHtml(key)}">
      <span class="drag-handle" aria-hidden="true">⋮⋮</span>
      <button class="key-token-main" type="button" title="编辑 ${escapeHtml(label)}">${escapeHtml(label)}</button>
      ${removeAttrs ? closeIconButton(removeAttrs, '移除按键') : ''}
    </div>
  `;
}

function renderKeyboard26RowEditor(row, rowIndex) {
  const keys = row.keys || [];
  const rowPath = keyboard26RowPath(rowIndex);
  return `
    <section class="field-card key-row-card">
      <div class="field-card-title row-heading">
        <span class="row-title">第 ${rowIndex + 1} 行</span>
        <button class="mini-button row-add-button" type="button" data-keyboard-action="add-portrait-key" data-row-index="${rowIndex}"><span aria-hidden="true">＋</span>添加按键</button>
        ${removeRowButton(`data-keyboard-action="remove-portrait-row" data-index="${rowIndex}"`, '移除这一行')}
      </div>
      <div class="key-token-list">
        ${keys.map((key, index) => renderVisualKeyToken(
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
  return `
    <div class="key-row-list visual-layout-editor">
      ${rows.map((row, index) => renderKeyboard26RowEditor(row, index)).join('')}
    </div>
  `;
}

function renderKeyboard26LayoutMenu() {
  return `
    <div class="mode-menu" role="tablist" aria-label="布局方向">
      <button class="${state.keyboard26LayoutMode === 'portrait' ? 'active' : ''}" type="button" data-keyboard-action="set-layout-mode" data-mode="portrait">竖屏</button>
      <button class="${state.keyboard26LayoutMode === 'landscape' ? 'active' : ''}" type="button" data-keyboard-action="set-layout-mode" data-mode="landscape">横屏</button>
    </div>
  `;
}

function renderKeyboard26LayoutWorkspace(value) {
  const landscape = value.layout?.landscape || value.landscape || {};
  const rows = keyboard26PortraitRows(value.layout ? value : { layout: value });
  return `
    <section class="group-card">
      <div class="layout-toolbar">
        <div>
          <h3>布局编辑</h3>
          ${renderKeyboard26LayoutMenu()}
        </div>
        <div class="layout-actions">
          ${state.keyboard26LayoutMode === 'portrait'
    ? `<label class="row-count-control">行数
        <input data-path="keyboards.keyboard26.layout.portrait.rowCount" data-type="number" type="number" min="1" max="8" step="1" value="${rows.length}">
      </label>
      <button class="tool-button primary" type="button" data-keyboard-action="add-portrait-row"><span aria-hidden="true">＋</span>添加一行</button>`
    : ''}
        </div>
      </div>
      ${state.keyboard26LayoutMode === 'portrait'
    ? renderKeyboard26VisualLayout(value.layout ? value : { layout: value })
    : `<section class="field-card landscape-editor-card">
        <label>横屏布局</label>
        ${renderKeyboard26LandscapeEditor(landscape)}
      </section>`}
    </section>
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
  const value = getPath(state.project, path) || key || '';
  if (path.startsWith('toolbar.layout.')) return toolbarButtonEditFields(path, value);
  if (path.startsWith('keyboards.numeric.layout.')) return numericKeyEditFields(path, value);
  if (path.startsWith('keyboards.symbolic.layout.')) return symbolicKeyEditFields(path, value);
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
  const displayTypePath = `keyboards.keyboard26.keyDisplayTypes.${value}`;
  const displayTypeValue = getPath(state.project, displayTypePath) || 'text';
  return `
    <section class="group-card key-edit-panel" data-key-edit-panel-path="${escapeHtml(path)}">
      <div class="field-card-title">
        <h3>按键编辑</h3>
        ${closeIconButton('data-keyboard-action="close-key-editor"', '关闭编辑')}
      </div>
      <div class="key-edit-fields key-edit-fields-four">
        ${selectField({
    path: typePath,
    label: '按键类型',
    value: typeValue,
    options: [
      { value: 'symbols', label: 'symbols' },
      { value: 'character', label: 'character' },
    ],
  })}
        ${input({ path, label: '键值', value })}
        ${selectField({
    path: displayTypePath,
    label: '显示类型',
    value: displayTypeValue,
    options: [
      { value: 'text', label: 'text' },
      { value: 'systemImageName', label: 'systemImageName' },
    ],
  })}
        ${input({ path: displayPath, label: '显示文本', value: displayValue })}
      </div>
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
        ${showLabelText ? input({ path: `${entryPath}.label.text`, label: '显示文字', value: entry.label?.text || '' }) : ''}
        ${selectField({
    path: `${entryPath}.actionType`,
    label: '指令类型',
    value: action.type,
    className: 'action-type-field',
    selectClassName: 'action-type-select',
    options: ACTION_TYPES.map((item) => ({
      value: item,
      selectedLabel: displayActionType(item),
      dropdownLabel: displayActionTypeWithCode(item),
    })),
  })}
        ${input({ path: `${entryPath}.actionValue`, label: '输入指令', value: action.value || '', suggestions: actionValueSuggestions(action.type) })}
      </div>
    </section>
  `;
}

function spaceRightKeyEditFields(path, value) {
  const profile = keyboard26PreviewProfile();
  const profileLabel = profile === 'alphabetic' ? '英文键盘' : '中文键盘';
  return `
    <section class="group-card key-edit-panel space-right-edit-panel" data-key-edit-panel-path="${escapeHtml(path)}">
      <div class="field-card-title">
        <h3>空格右侧键</h3>
        ${closeIconButton('data-keyboard-action="close-key-editor"', '关闭编辑')}
      </div>
      <div class="key-edit-fields space-right-edit-fields">
        ${input({ path, label: '键值', value })}
        ${input({
    path: `keyboards.keyboard26.spaceRight.${profile}.primary.text`,
    label: `${profileLabel}点击显示`,
    value: getPath(state.project, `keyboards.keyboard26.spaceRight.${profile}.primary.text`) || '',
  })}
        ${input({
    path: `keyboards.keyboard26.spaceRight.${profile}.secondary.text`,
    label: `${profileLabel}上划显示`,
    value: getPath(state.project, `keyboards.keyboard26.spaceRight.${profile}.secondary.text`) || '',
  })}
        ${swipeActionFields(profile, 'swipe_up', 'spaceRight', `${profileLabel}上划指令`, { showLabelText: false })}
      </div>
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
      <div class="key-edit-fields">
        ${fields.join('')}
      </div>
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
    input({ path, label: '键值', value }),
    input({ path: textPath, label: '显示文本', value: displayValue }),
  ], path);
}

function symbolicKeyEditFields(path, value) {
  const symbolic = state.project.keyboards?.symbolic || {};
  const textPath = value === 'return'
    ? 'keyboards.symbolic.text.return'
    : `keyboards.symbolic.keyDisplays.${value}`;
  const displayValue = getPath(state.project, textPath) || symbolicDisplayValue(symbolic, value);
  return keyEditPanel('按键编辑', [
    input({ path, label: '键值', value }),
    input({ path: textPath, label: '显示文本', value: displayValue }),
  ], path);
}

function toolbarButtonEditFields(path, value) {
  const textPath = `toolbar.text.${value}`;
  const textValue = value ? getPath(state.project, textPath) || '' : '';
  return `
    <section class="group-card key-edit-panel" data-key-edit-panel-path="${escapeHtml(path)}">
      <div class="field-card-title">
        <h3>按钮编辑</h3>
        ${closeIconButton('data-keyboard-action="close-key-editor"', '关闭编辑')}
      </div>
      <div class="key-edit-fields">
        ${input({ path, label: '按钮标识', value })}
        ${input({ path: textPath, label: '显示文案', value: textValue })}
      </div>
      <span class="key-edit-focus-sentinel" tabindex="0" aria-hidden="true"></span>
    </section>
  `;
}

function renderKeyEditPanel() {
  if (!state.editingKey) return '';
  return keyEditFieldsForKey(getPath(state.project, state.editingKey.path));
}

function renderInlineKeyEditPanel(parentPath) {
  if (!state.editingKey?.path?.startsWith(`${parentPath}.`)) return '';
  return renderKeyEditPanel();
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
          <div class="field-card key-row-card">
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
    .filter((item) => item.keys.length || item.id === 'panel');
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
  const text = value.text || {};
  return `
    ${renderKeyboard26LayoutWorkspace(value)}
    <section class="group-card">
      <h3>回车显示</h3>
      <div class="section-grid compact-field-grid">
        ${Object.entries(text.enter || {}).map(([key, fieldValue]) => input({
          path: `keyboards.keyboard26.text.enter.${key}`,
          label: key,
          value: fieldValue,
        })).join('')}
      </div>
    </section>
    <section class="group-card">
      <h3>显示方案名</h3>
      <div class="section-grid compact-field-grid schema-name-grid">
        ${input({ path: 'keyboards.keyboard26.pinyinSchemaName.text', label: '显示文本', value: value.pinyinSchemaName?.text || '' })}
        ${input({ path: 'keyboards.keyboard26.pinyinSchemaName.fontSize', label: '字号', value: value.pinyinSchemaName?.fontSize ?? '', type: 'number', step: '0.1' })}
      </div>
    </section>
  `;
}

function renderSymbolic(value) {
  const functionRows = value.layout?.portrait?.functionRows || [];
  const functionKeys = [...new Set([...SYMBOLIC_FUNCTION_KEY_ORDER, ...collectLayoutKeys(functionRows)])];
  return `
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
  const layout = Array.isArray(value.layout) ? value.layout : [];
  return `
    <section class="group-card">
      <div class="field-card-title row-heading">
        <span class="row-title">按钮顺序</span>
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
    <section class="group-card">
      <h3>文案与图标</h3>
      <div class="section-grid compact-field-grid">
        ${input({ path: 'toolbar.text.simplified', label: '简体文案', value: value.text?.simplified || '' })}
        ${input({ path: 'toolbar.text.traditional', label: '繁体文案', value: value.text?.traditional || '' })}
        ${input({ path: 'toolbar.text.verticalCandidateReturn', label: '纵向候选返回', value: value.text?.verticalCandidateReturn || '' })}
        ${input({ path: 'toolbar.iconFontSize', label: '工具栏图标字号', value: value.iconFontSize, type: 'number', step: '0.1' })}
      </div>
    </section>
    <section class="group-card">
      <h3>候选栏边距</h3>
      <div class="section-grid">
        ${renderInsetObject('toolbar.horizontalCandidates.insets', '横向候选', value.horizontalCandidates?.insets)}
        ${renderInsetObject('toolbar.verticalCandidates.styleInsets', '纵向候选整体', value.verticalCandidates?.styleInsets)}
        ${renderInsetObject('toolbar.verticalCandidates.functionInsets', '纵向候选功能键', value.verticalCandidates?.functionInsets)}
      </div>
    </section>
  `;
}

const CUSTOM_KEYBOARD_PANELS = [
  { id: 'preview', label: '预览' },
  { id: 'toolbar', label: '工具栏' },
];

function activePreviewKeyboardPanel() {
  const scope = currentPreviewScope();
  if (scope.mode === 'numeric') return 'numeric';
  if (scope.mode === 'symbolic') return 'symbolic';
  if (scope.mode === 'panel') return 'panel';
  return 'keyboard26';
}

function activeCustomKeyboardPanel() {
  return state.customKeyboardPanel === 'toolbar' ? 'toolbar' : 'preview';
}

function renderCustomKeyboardScopeHeader() {
  const activePanel = activeCustomKeyboardPanel();
  return `
    ${renderPreviewScopeHeader(
    activePanel === 'toolbar' ? '工具栏编辑' : '预览编辑',
    activePanel === 'toolbar' ? '单独编辑工具栏按钮顺序、文案与候选栏边距。' : '跟随右侧键盘预览，需要编辑其他键盘时请切换右侧预览。',
  )}
    <div class="custom-keyboard-menu" role="tablist" aria-label="自定义键盘编辑范围">
      ${CUSTOM_KEYBOARD_PANELS.map((item) => `
        <button class="${item.id === activePanel ? 'active' : ''}" type="button" role="tab" aria-selected="${item.id === activePanel ? 'true' : 'false'}" data-custom-keyboard-panel="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>
      `).join('')}
    </div>
  `;
}

function customKeyboardPanelPath(panelId = activeCustomKeyboardPanel()) {
  if (panelId === 'preview') return customKeyboardPanelPath(activePreviewKeyboardPanel());
  const paths = {
    keyboard26: 'keyboards.keyboard26',
    numeric: 'keyboards.numeric',
    symbolic: 'keyboards.symbolic',
    toolbar: 'toolbar',
    panel: 'keyboards.panel.text',
  };
  return paths[panelId] || 'keyboards.keyboard26';
}

function customKeyboardPanelValue(panelId = activeCustomKeyboardPanel()) {
  return getPath(state.project, customKeyboardPanelPath(panelId));
}

function renderCustomKeyboards(value = {}) {
  const activePanel = activeCustomKeyboardPanel();
  const previewPanel = activePreviewKeyboardPanel();
  const content = {
    preview: () => ({
      keyboard26: () => renderKeyboard26Text(value.keyboard26 || {}),
      numeric: () => renderNumericKeyboard(value.numeric || {}),
      symbolic: () => renderSymbolic(value.symbolic || {}),
      panel: () => renderStringMap(value.panel?.text || {}, 'keyboards.panel.text'),
    }[previewPanel]?.() || renderKeyboard26Text(value.keyboard26 || {})),
    toolbar: () => renderToolbar(state.project.toolbar || {}),
  }[activePanel]?.() || renderKeyboard26Text(value.keyboard26 || {});
  return `
    <section class="group-card custom-keyboard-shell">
      ${renderCustomKeyboardScopeHeader()}
    </section>
    ${content}
  `;
}

function metricWidthValue(metric) {
  const width = metric?.width;
  if (typeof width === 'number' || typeof width === 'string') return width;
  return width?.percentage ?? '';
}

function metricWidthPath(keyboardId, orientation, key) {
  return orientation === 'portrait'
    ? `keyboards.${keyboardId}.metrics.portrait.${key}.width.percentage`
    : `keyboards.${keyboardId}.metrics.landscape.${key}.width`;
}

function metricContextKey(keyboardId = state.metricsKeyboardId, orientation = state.metricsOrientation) {
  return `${keyboardId}:${orientation}`;
}

function selectedMetricKeys(keyboardId = state.metricsKeyboardId, orientation = state.metricsOrientation) {
  const keys = state.metricsSelectedKeys?.[metricContextKey(keyboardId, orientation)];
  return Array.isArray(keys) ? keys : [];
}

function setSelectedMetricKeys(keys, keyboardId = state.metricsKeyboardId, orientation = state.metricsOrientation) {
  state.metricsSelectedKeys = state.metricsSelectedKeys || {};
  state.metricsSelectedKeys[metricContextKey(keyboardId, orientation)] = [...new Set(keys.filter(Boolean))];
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
    const next = Number(value);
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

function renderMetricKeyPicker(keys, selectedKeys, keyboardId, keyboard) {
  return `
    <div class="metric-key-picker">
      ${keys.map((key) => {
    const active = selectedKeys.includes(key) ? ' active' : '';
    return `
        <button
          class="metric-key-chip${active}"
          type="button"
          data-keyboard-action="toggle-metric-key"
          data-key="${escapeHtml(key)}"
          aria-pressed="${active ? 'true' : 'false'}"
        >${escapeHtml(metricKeyLabel(keyboardId, keyboard, key))}</button>
      `;
  }).join('')}
    </div>
  `;
}

function renderMetricOverrideRows({ keyboardId, keyboard, orientation, metrics, overrideKeys }) {
  if (!overrideKeys.length) {
    return '<p class="metrics-empty">还没有单独设置的按键。选择上方按键后点击“选中”即可添加。</p>';
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
    const metric = metrics[key] || {};
    return `
        <div class="metrics-override-row">
          <strong title="${escapeHtml(key)}">${escapeHtml(metricKeyLabel(keyboardId, keyboard, key))}</strong>
          <label>
            <span title="宽度">宽</span>
            ${tableInput({ path: metricWidthPath(keyboardId, orientation, key), label: `${key} ${orientation === 'portrait' ? '竖屏宽度' : '横屏宽度'}`, value: metricWidthValue(metric), type: metricInputType(orientation), step: metricInputStep(orientation) })}
          </label>
          <label>
            <span title="bounds.width">bounds.width</span>
            ${tableInput({ path: `keyboards.${keyboardId}.metrics.${orientation}.${key}.bounds.width`, label: `${key} bounds.width`, value: metric.bounds?.width || '' })}
          </label>
          <button class="mini-button" type="button" aria-label="移除 ${escapeHtml(metricKeyLabel(keyboardId, keyboard, key))}" title="移除" data-keyboard-action="remove-metric-override" data-key="${escapeHtml(key)}">×</button>
        </div>
      `;
  }).join('')}
      </div>
    </div>
  `;
}

function keyboardIdForPreviewMode(mode = previewRenderMode(state.previewMode)) {
  if (mode === 'numeric') return 'numeric';
  if (mode === 'symbolic') return 'symbolic';
  if (mode === 'panel') return 'panel';
  return 'keyboard26';
}

function renderMetrics(keyboards = {}) {
  const options = metricKeyboardOptions(keyboards);
  const previewKeyboardId = keyboardIdForPreviewMode();
  const keyboardId = options.some((item) => item.id === previewKeyboardId)
    ? previewKeyboardId
    : options[0]?.id || 'keyboard26';
  const keyboard = keyboards[keyboardId] || {};
  const orientation = previewRenderOrientation(state.previewMode);
  state.metricsKeyboardId = keyboardId;
  state.metricsOrientation = orientation;
  const portrait = keyboard.metrics?.portrait || {};
  const landscape = keyboard.metrics?.landscape || {};
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
  const overrideKeys = Object.keys(metrics)
    .filter((key) => key !== 'normal' && selectableKeys.includes(key) && metricHasCustomValue(metrics[key]))
    .sort((left, right) => {
      const leftIndex = selectableKeys.indexOf(left);
      const rightIndex = selectableKeys.indexOf(right);
      if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right, 'zh-CN');
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    });
  return `
    <section class="group-card">
      <div class="layout-toolbar metrics-toolbar">
        <div>
          ${renderPreviewScopeHeader('按键尺寸', '只显示当前预览键盘里的可操作按键；需要调其他键盘请切换右侧预览。')}
        </div>
      </div>
      <div class="metrics-unified-card">
        <div class="metrics-unified-fields">
          <label>
            <span>统一宽度</span>
            ${tableInput({ path: metricWidthPath(keyboardId, orientation, 'normal'), label: '统一宽度', value: normalWidth, type: metricInputType(orientation), step: metricInputStep(orientation) })}
          </label>
          <label>
            <span>bounds.width</span>
            ${tableInput({ path: `keyboards.${keyboardId}.metrics.${orientation}.normal.bounds.width`, label: 'bounds.width', value: normalBoundsWidth })}
          </label>
        </div>
        <p class="metrics-note">宽度控制按键在一行里的占位；bounds.width 控制按键内部可见层宽度，例如 2/3 表示内容层占按键格子的三分之二。</p>
      </div>
      <div class="metrics-batch-card">
        <div class="metrics-batch-header">
          <h4>选择要单独设置的按键</h4>
          <div class="metrics-batch-actions">
            <button class="mini-button" type="button" data-keyboard-action="select-all-metric-keys">全选</button>
            <button class="mini-button" type="button" data-keyboard-action="clear-metric-keys">清空</button>
          </div>
        </div>
        ${renderMetricKeyPicker(selectableKeys, selectedKeys, keyboardId, keyboard)}
        <div class="metrics-apply-row">
          <label>
            <span>宽度</span>
            <input id="metricBatchWidthInput" class="table-input" type="${metricInputType(orientation)}" step="${escapeHtml(metricInputStep(orientation) || '')}" value="${escapeHtml(normalWidth)}">
          </label>
          <label>
            <span>bounds.width</span>
            <input id="metricBatchBoundsInput" class="table-input" type="text" value="${escapeHtml(normalBoundsWidth)}">
          </label>
          <button class="tool-button primary" type="button" data-keyboard-action="apply-metric-batch">选中</button>
        </div>
      </div>
      <div class="metrics-overrides-card">
        <h4>单独设置的按键</h4>
        ${renderMetricOverrideRows({ keyboardId, keyboard, orientation, metrics, overrideKeys })}
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

function emptySwipeData() {
  return {
    pinyin: { swipe_up: {}, swipe_down: {} },
    alphabetic: { swipe_up: {}, swipe_down: {} },
    numeric: { swipe_up: {}, swipe_down: {} },
  };
}

function swipesEnabled() {
  return state.project?.data?.swipesEnabled !== false;
}

function swipeKeyLabel(key) {
  return SWIPE_KEY_SHORT_LABELS[key] || NUMERIC_KEY_LABELS[key] || key;
}

function currentKeyboardPreviewProfile() {
  const mode = previewRenderMode(state.previewMode);
  if (mode === 'keyboard26') return keyboard26PreviewProfile();
  if (mode === 'numeric') return 'numeric';
  return mode;
}

function currentPreviewKeyboardKeys() {
  const keyboardId = keyboardIdForPreviewMode(previewRenderMode(state.previewMode));
  const keyboard = state.project.keyboards?.[keyboardId] || {};
  if (keyboardId === 'keyboard26') {
    const orientation = previewRenderOrientation(state.previewMode);
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
  return `
    <section class="group-card key-edit-panel swipe-edit-panel" data-key-edit-panel-path="${escapeHtml(path)}">
      <div class="key-edit-fields swipe-edit-fields">
        ${input({ path: `data.swipes.${profile}.${direction}.${key}.label.text`, label: '显示文字', value: entry.label?.text || '' })}
        ${selectField({
    path: `data.swipes.${profile}.${direction}.${key}.actionType`,
    label: '指令类型',
    value: action.type,
    className: 'action-type-field',
    selectClassName: 'action-type-select',
    options: ACTION_TYPES.map((item) => ({
      value: item,
      selectedLabel: displayActionType(item),
      dropdownLabel: displayActionTypeWithCode(item),
    })),
  })}
        ${input({ path: `data.swipes.${profile}.${direction}.${key}.actionValue`, label: '输入指令', value: action.value || '', suggestions: actionValueSuggestions(action.type) })}
      </div>
      <span class="key-edit-focus-sentinel" tabindex="0" aria-hidden="true"></span>
    </section>
  `;
}

function renderSwipes(value) {
  const direction = state.swipeMode === 'swipe_down' ? 'swipe_down' : 'swipe_up';
  const enabled = swipesEnabled();
  const profiles = swipeProfilesForPreview(value, direction);
  const swipeActions = `
    <button class="swipe-switch${enabled ? ' active' : ''}" type="button" data-swipe-action="toggle-enabled" aria-pressed="${enabled ? 'true' : 'false'}">
      <span>滑动功能</span>
      <strong>${enabled ? '开启' : '关闭'}</strong>
    </button>
    <button class="tool-button danger-button" type="button" data-swipe-action="clear-all">一键清除</button>
  `;
  return `
    <section class="group-card keyboard-tool-card swipe-settings-card">
      <div class="keyboard-tool-head">
        <div class="keyboard-tool-title">
          ${renderPreviewScopeHeader('滑动编辑', '只显示当前预览键盘支持滑动配置的按键。', swipeActions)}
        </div>
      </div>
      <div class="keyboard-tool-segment">
        <span>滑动方向</span>
        <div class="mode-menu" role="tablist" aria-label="滑动方向">
          <button class="${direction === 'swipe_up' ? 'active' : ''}" type="button" data-swipe-action="set-direction" data-direction="swipe_up">上划</button>
          <button class="${direction === 'swipe_down' ? 'active' : ''}" type="button" data-swipe-action="set-direction" data-direction="swipe_down">下划</button>
        </div>
      </div>
      ${enabled ? '' : '<p class="empty-note swipe-disabled-note">滑动功能已关闭，预览和导出不显示滑动标记；已有配置会保留，重新开启后恢复。</p>'}
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
        ${selectField({
    path: `data.hints.${group}.${key}.list.${index}.actionType`,
    label: '指令类型',
    value: action.type,
    className: 'action-type-field',
    selectClassName: 'action-type-select',
    options: ACTION_TYPES.map((itemType) => ({
      value: itemType,
      selectedLabel: displayActionType(itemType),
      dropdownLabel: displayActionTypeWithCode(itemType),
    })),
  })}
        ${input({ path: `data.hints.${group}.${key}.list.${index}.actionValue`, label: '输入指令', value: action.value || '', suggestions: actionValueSuggestions(action.type) })}
      </div>
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
      <div class="hint-entry-fields">
        ${input({ path: `data.hints.${group}.${key}.selectedIndex`, label: '默认选中序号', value: entry.selectedIndex ?? 0, type: 'number', step: '1' })}
        ${input({ path: `data.hints.${group}.${key}.size.width`, label: '宽度', value: entry.size?.width ?? '', type: 'number', step: '1' })}
        ${input({ path: `data.hints.${group}.${key}.size.height`, label: '高度', value: entry.size?.height ?? '', type: 'number', step: '1' })}
      </div>
      <div class="hint-item-list">
        ${(entry.list || []).map((item, index) => renderHintItem(group, key, index, item)).join('') || '<p class="empty-note">这个按键还没有长按候选项。</p>'}
      </div>
      <span class="key-edit-focus-sentinel" tabindex="0" aria-hidden="true"></span>
    </section>
  `;
}

function renderHints(value) {
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
  return Array.isArray(items) ? items.join('\n') : '';
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
    const knownFields = [];
    if ('label' in value) knownFields.push(collectionObjectField(sourceKey, entryKey, 'label', value.label));
    if ('value' in value) knownFields.push(collectionObjectField(sourceKey, entryKey, 'value', value.value));
    if ('action' in value) {
      knownFields.push(selectField({
        path: `data.collections.${sourceKey}.${entryKey}.actionType`,
        label: '指令类型',
        value: action.type,
        className: 'collection-action-field',
        selectClassName: 'action-type-select',
        options: ACTION_TYPES.map((item) => ({
          value: item,
          selectedLabel: displayActionType(item),
          dropdownLabel: displayActionTypeWithCode(item),
        })),
      }));
      knownFields.push(input({
        path: `data.collections.${sourceKey}.${entryKey}.actionValue`,
        label: '输入指令',
        value: action.value || '',
        suggestions: actionValueSuggestions(action.type),
      }));
    }
    const unknownKeys = Object.keys(value).filter((key) => !['label', 'value', 'action'].includes(key));
    if (!knownFields.length || unknownKeys.length) {
      knownFields.push(`
        <label class="collection-json-field">
          <span>JSON</span>
          <textarea data-json-path="${escapeHtml(`data.collections.${sourceKey}.${entryKey}`)}">${escapeHtml(JSON.stringify(value, null, 2))}</textarea>
        </label>
      `);
    }
    return `<div class="collection-entry-object">${knownFields.join('')}</div>`;
  }
  return `
    <textarea data-json-path="${escapeHtml(`data.collections.${sourceKey}.${entryKey}`)}">${escapeHtml(JSON.stringify(value, null, 2))}</textarea>
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
              <span>内容，一行一个</span>
              <textarea
                data-collection-items="true"
                data-source-key="${escapeHtml(sourceKey)}"
                data-category-name="${escapeHtml(category)}"
              >${escapeHtml(collectionItemsText(source[category]))}</textarea>
            </label>
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
  const entries = Object.entries(value);
  return `
    <section class="group-card collection-help-card">
      <h3>符号数据源</h3>
      <p>分类数据按“一行一个”编辑；分类顺序会同步到 category。源码编辑保留在底部，用于处理暂未拆成表单的复杂结构。</p>
    </section>
    ${entries.map(([sourceKey, source]) => (
    Array.isArray(source?.category)
      ? renderCategorizedCollection(sourceKey, source)
      : renderFlatCollection(sourceKey, source)
  )).join('') || '<p class="empty-note">暂无符号数据源。</p>'}
  `;
}

function renderJsonTextarea(path, value) {
  return `
    <label class="json-label">当前数据源码</label>
    <textarea data-json-path="${escapeHtml(path)}">${escapeHtml(JSON.stringify(value, null, 2))}</textarea>
  `;
}

function renderJsonEditor(value, path = activeModule().path) {
  return renderJsonTextarea(path, value);
}

function renderEditor() {
  const module = activeModule();
  const value = currentValue();
  el.moduleKicker.textContent = '';
  el.moduleKicker.hidden = true;
  el.moduleTitle.textContent = module.title;
  el.moduleDescription.textContent = '';
  el.moduleDescription.hidden = true;
  el.jsonModeButton.textContent = state.jsonMode ? '表单模式' : '源码模式';

  if (state.jsonMode) {
    if (module.kind === 'customKeyboards') {
      el.editorRoot.innerHTML = renderJsonEditor(customKeyboardPanelValue(), customKeyboardPanelPath());
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
    json: renderJsonEditor,
    meta: renderMetaEditor,
  };

  el.editorRoot.innerHTML = (renderers[module.kind] || renderJsonEditor)(value);
  el.editorRoot.querySelectorAll('.default-hint-input[data-uses-default="true"]').forEach((item) => {
    item.classList.add('is-default-value');
  });
  el.editorRoot.querySelectorAll('select.action-type-select').forEach((item) => {
    syncSelectOptionLabels(item, false);
  });
}

function renderModules() {
  el.moduleList.innerHTML = MODULES.map((module) => `
      <button
        class="module-button ${module.id === state.moduleId ? 'active' : ''}"
        type="button"
        data-module="${module.id}"
        ${module.disabled ? 'disabled aria-disabled="true" title="暂未开放"' : ''}
      >
        <span>${escapeHtml(module.title)}</span>
        ${module.disabled ? '<span class="module-status">未开放</span>' : ''}
      </button>
    `).join('');
}

function renderProjectSummary() {
  const validation = validateProject(state.project);
  const lines = [
    `项目：${state.project.meta.name}`,
    `模板：${state.project.templateId}`,
    `结构版本：${state.project.schemaVersion}`,
    `校验：${validation.ok ? '通过' : `${validation.errors.length} 个错误`}`,
    `颜色设置：${Object.keys(state.project.theme.light.colors).length} / ${Object.keys(state.project.theme.dark.colors).length}`,
    `可编辑模块：${MODULES.length}`,
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
    state.project = mergeDefaultCollections(mergeDefaultSwipes(snapshot.project, state.sampleProject), state.sampleProject);
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
    .filter((item) => item.name);
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
  const names = collectConfigKeyboardNames(state.project?.config || {}, { includePreviewKeyboards: false });
  const visibleNames = names.filter((name) => !hiddenNames.has(name));
  return visibleNames.length ? visibleNames : names.slice(0, 1);
}

function defaultPreviewMode() {
  const keyboards = configPreviewKeyboards();
  if (keyboards.includes('pinyin_26_portrait')) return configPreviewValue('pinyin_26_portrait');
  return keyboards.length ? configPreviewValue(keyboards[0]) : 'keyboard26';
}

function previewModeExists(mode) {
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
  state.editingKey = null;
  closePreviewModeMenu();
  if (isPreviewScopedModule()) renderEditor();
  renderCurrentPreview();
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
  el.previewMode.value = state.previewMode;
  const selectedOption = groups.flatMap((group) => group.options).find((item) => item.value === state.previewMode);
  el.previewModeButton.textContent = selectedOption?.label || '选择键盘';
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
  if (name.startsWith('numeric')) return 'numeric';
  if (name.startsWith('symbolic')) return 'symbolic';
  if (name.startsWith('panel')) return 'panel';
  return 'keyboard26';
}

function previewOrientationForKeyboardName(name) {
  return name.includes('landscape') ? 'landscape' : 'portrait';
}

function previewValueForMode(mode, orientation = 'portrait') {
  const keyboards = configPreviewKeyboards();
  const landscape = orientation === 'landscape';
  const candidates = {
    keyboard26: landscape
      ? ['pinyin_26_landscape', 'alphabetic_26_landscape']
      : ['pinyin_26_portrait', 'alphabetic_26_portrait'],
    numeric: [landscape ? 'numeric_9_landscape' : 'numeric_9_portrait'],
    symbolic: [landscape ? 'numeric_9_landscape' : 'symbolic_portrait'],
    panel: [landscape ? 'panel_landscape' : 'panel_portrait'],
  }[mode] || [];
  const found = candidates.find((name) => keyboards.includes(name));
  return found ? configPreviewValue(found) : defaultPreviewMode();
}

function previewRenderMode(mode) {
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
  return 'portrait';
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
  pressedPreviewCell?.classList.remove('is-pressed');
  pressedPreviewCell = null;
  if (state.previewHintKey || state.previewPressedKey) {
    state.previewHintKey = null;
    state.previewPressedKey = null;
    renderCurrentPreview();
  }
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
  if (renderMode === 'keyboard26' && key === 'shift') {
    state.previewShiftActive = !state.previewShiftActive;
  }
  state.previewPressedKey = key || null;
  if (state.previewPressedKey) {
    renderCurrentPreview();
    previewLongPressTimer = setTimeout(() => {
      previewLongPressTimer = null;
      if (state.previewPressedKey !== key) return;
      state.previewHintKey = key;
      renderCurrentPreview();
    }, PREVIEW_LONG_PRESS_DELAY_MS);
  }
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

function renderCurrentPreview() {
  renderPreviewModeOptions();
  el.previewKeyboardNameInput.placeholder = defaultPreviewKeyboardName();
  const canDeletePreviewKeyboard = previewOptionValues().length > 1;
  el.deletePreviewKeyboardButton.disabled = !canDeletePreviewKeyboard;
  el.deletePreviewKeyboardButton.title = canDeletePreviewKeyboard ? '删除当前预览键盘' : '至少保留一个预览键盘';
  const canResetPreviewList = hiddenPreviewKeyboardNames().length > 0;
  el.resetPreviewKeyboardListButton.disabled = !canResetPreviewList;
  el.resetPreviewKeyboardListButton.title = canResetPreviewList ? '恢复隐藏的默认键盘' : '默认键盘列表已完整';
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
  const orientation = previewRenderOrientation(state.previewMode);
  state.previewOrientation = orientation;
  el.previewRoot.innerHTML = renderPreview(state.project, state.theme, previewRenderMode(state.previewMode), {
    candidateState: state.candidateState,
    symbolicCategory: state.symbolicCategory,
    orientation,
    keyboardProfile: currentKeyboardPreviewProfile(),
    activeHintKey: state.previewHintKey,
    activePressedKey: state.previewPressedKey,
    shiftActive: state.previewShiftActive,
  });
  const selectedSymbolicCategory = el.previewRoot.querySelector('.symbolic-category-cell.is-selected-category');
  selectedSymbolicCategory?.scrollIntoView({ block: 'nearest' });
}

function syncPreviewModeForModule(moduleId) {
  if (['customKeyboards', 'metrics', 'swipes', 'hints'].includes(moduleId)) {
    if (!previewModeExists(state.previewMode)) state.previewMode = defaultPreviewMode();
    return;
  }
  const nextMode = {
    collections: previewValueForMode('symbolic'),
  }[moduleId];
  if (nextMode) state.previewMode = nextMode;
}

function renderAll() {
  if (!state.project) return;
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
  renderTemplateLibraryDialog();
}

function setKeyboardLayoutArray(path, items) {
  pushUndoSnapshot();
  setPath(state.project, path, items);
  if (path.startsWith(keyboard26RowsPath())) syncKeyboard26LegacyPortrait();
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

function handleKeyDragStart(event) {
  const token = event.target.closest('.key-token-editor[draggable="true"]');
  if (!token) return;
  token.classList.add('is-dragging');
  const payload = JSON.stringify({
    path: token.dataset.dragPath,
    index: Number(token.dataset.dragIndex),
  });
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('application/x-hamster-key', payload);
  event.dataTransfer.setData('text/plain', payload);
}

function handleKeyDragOver(event) {
  const token = event.target.closest('.key-token-editor[data-drag-path]');
  if (!token) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  token.classList.add('is-drag-over');
}

function handleKeyDragLeave(event) {
  event.target.closest('.key-token-editor')?.classList.remove('is-drag-over');
}

function handleKeyDrop(event) {
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
  moveKeyboardLayoutItem(payload.path, Number(payload.index), token.dataset.dragPath, Number(token.dataset.dragIndex));
}

function handleKeyDragEnd() {
  el.editorRoot.querySelectorAll('.key-token-editor.is-dragging, .key-token-editor.is-drag-over').forEach((token) => {
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

  if (action === 'set-layout-mode') {
    state.keyboard26LayoutMode = target.dataset.mode === 'landscape' ? 'landscape' : 'portrait';
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

  if (action === 'apply-metric-batch') {
    const selected = selectedMetricKeys();
    if (!selected.length) return;
    pushUndoSnapshot();
    const keyboardId = state.metricsKeyboardId;
    const orientation = state.metricsOrientation === 'landscape' ? 'landscape' : 'portrait';
    const widthValue = el.editorRoot.querySelector('#metricBatchWidthInput')?.value.trim() || '';
    const boundsValue = el.editorRoot.querySelector('#metricBatchBoundsInput')?.value.trim() || '';
    const metricsPath = `keyboards.${keyboardId}.metrics.${orientation}`;
    const metrics = getPath(state.project, metricsPath) || {};
    selected.forEach((key) => {
      const metric = { ...(metrics[key] || {}) };
      setMetricWidth(metric, orientation, widthValue);
      setMetricBoundsWidth(metric, boundsValue);
      metrics[key] = metric;
    });
    setPath(state.project, metricsPath, metrics);
    markDirty();
    renderAll();
    return;
  }

  if (action === 'remove-metric-override') {
    const key = target.dataset.key;
    const metricsPath = `keyboards.${state.metricsKeyboardId}.metrics.${state.metricsOrientation === 'landscape' ? 'landscape' : 'portrait'}`;
    const metrics = { ...(getPath(state.project, metricsPath) || {}) };
    pushUndoSnapshot();
    delete metrics[key];
    setPath(state.project, metricsPath, metrics);
    markDirty();
    renderAll();
    return;
  }

  if (action === 'add-portrait-row') {
    const rows = [...ensureKeyboard26PortraitRows()];
    rows.push({ id: `row-${Date.now()}`, label: `第 ${rows.length + 1} 行`, keys: [] });
    setKeyboardLayoutArray(keyboard26RowsPath(), rows);
    return;
  }

  if (action === 'remove-portrait-row') {
    const index = Number(target.dataset.index);
    confirmRowRemoval(() => {
      const rows = [...ensureKeyboard26PortraitRows()];
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
    state.project.data = state.project.data || {};
    state.project.data.swipesEnabled = !swipesEnabled();
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
  if (path === 'toolbar.layout') {
    setPath(state.project, path, String(value).split(',').map((item) => item.trim()).filter(Boolean));
    return;
  }

  if (path === 'keyboards.numeric.collectionSymbols') {
    setPath(state.project, path, String(value).split(',').map((item) => item.trim()).filter(Boolean));
    return;
  }

  if (path.startsWith('data.collections.') && (path.endsWith('.actionType') || path.endsWith('.actionValue'))) {
    const basePath = path.replace(/\.(actionType|actionValue)$/, '');
    const current = getPath(state.project, basePath) || {};
    const currentAction = actionToFields(current.action);
    const nextType = path.endsWith('.actionType') ? value : currentAction.type;
    const nextValue = path.endsWith('.actionValue') ? value : currentAction.value;
    setPath(state.project, `${basePath}.action`, buildAction(nextType, nextValue));
    return;
  }

  if (path === 'keyboards.keyboard26.layout.portrait.rowCount') {
    const count = Math.max(1, Math.min(8, Number(value) || 1));
    const rows = [...ensureKeyboard26PortraitRows()];
    while (rows.length < count) rows.push({ id: `row-${Date.now()}-${rows.length}`, label: `第 ${rows.length + 1} 行`, keys: [] });
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

  if (path.includes('.actionType') || path.includes('.actionValue')) {
    const basePath = path.replace(/\.(actionType|actionValue)$/, '');
    const current = getPath(state.project, basePath) || {};
    const currentAction = actionToFields(current.action);
    const nextType = path.endsWith('.actionType') ? value : currentAction.type;
    const nextValue = path.endsWith('.actionValue') ? value : currentAction.value;
    setPath(state.project, `${basePath}.action`, buildAction(nextType, nextValue));
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
}

function captureInputUndo(target) {
  if (target.dataset.undoCaptured === 'true') return;
  pushUndoSnapshot();
  target.dataset.undoCaptured = 'true';
}

function handleInput(event) {
  const target = event.target;
  if (target.matches('[data-collection-items]')) {
    setCollectionItems(target);
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

  if (path) {
    captureInputUndo(target);
    target.dataset.usesDefault = 'false';
    target.classList.remove('is-default-value');
    setFieldValue(path, target.value, target.dataset.type);
    markDirty();
    renderProjectSummary();
    renderSaveState();
    renderCurrentPreview();
  }

  if (jsonPath) {
    const parsed = safeJsonParse(target.value);
    if (!parsed.ok) return;
    captureInputUndo(target);
    setPath(state.project, jsonPath, parsed.value);
    markDirty();
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

async function exportProjectPackage() {
  try {
    const exportProject = stampProjectForGeneration(state.project);
    const files = buildSkinPackageFiles(exportProject);
    const blob = createZipBlob(files);
    const filename = defaultPackageFileName(exportProject);
    const advanceToNextProject = () => {
      state.project = nextGeneratedProject(exportProject);
      state.original = deepClone(state.project);
      state.savedAt = null;
      saveProject(state.project);
      renderAll();
    };
    if (state.downloadDirectoryHandle) {
      const permission = await state.downloadDirectoryHandle.requestPermission?.({ mode: 'readwrite' });
      if (permission && permission !== 'granted') {
        downloadBlob(filename, blob);
        advanceToNextProject();
        return;
      }
      const fileHandle = await state.downloadDirectoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      advanceToNextProject();
      return;
    }
    downloadBlob(filename, blob);
    advanceToNextProject();
  } catch (error) {
    alert(`导出失败：${error.message}`);
  }
}

function confirmImportProject() {
  openConfirmDialog({
    title: '导入皮肤',
    message: '注意，导入的皮肤需要由本工具所制作！',
    confirmLabel: '确认',
    confirmClass: '',
    onConfirm: () => {
      el.importProjectInput.value = '';
      el.importProjectInput.click();
    },
  });
}

function bindEvents() {
  document.body.addEventListener('click', (event) => {
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
    state.moduleId = button.dataset.module;
    state.jsonMode = false;
    state.editingKey = null;
    syncPreviewModeForModule(state.moduleId);
    renderAll();
  });
  el.sidebarToggleButton.addEventListener('click', (event) => {
    event.stopPropagation();
    event.currentTarget.blur();
    state.sidebarCollapsed = !state.sidebarCollapsed;
    renderAll();
  });
  el.sidebar.addEventListener('click', () => {
    if (!state.sidebarCollapsed) return;
    state.sidebarCollapsed = false;
    renderAll();
  });

  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-keyboard-action]');
    if (!button) return;
    handleKeyboardLayoutAction(button);
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-custom-keyboard-panel]');
    if (!button) return;
    state.customKeyboardPanel = button.dataset.customKeyboardPanel === 'toolbar' ? 'toolbar' : 'preview';
    state.editingKey = null;
    renderEditor();
  });
  el.editorRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-toolbar-action]');
    if (!button) return;
    handleToolbarAction(button);
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
      syncSelectOptionLabels(target, false);
    }
  });
  el.editorRoot.addEventListener('focusin', (event) => {
    const target = event.target;
    if (target.matches('select.action-type-select')) {
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
    const panel = target.closest('.key-edit-panel');
    if (panel) {
      const panelPath = panel.dataset.keyEditPanelPath || state.editingKey?.path || '';
      const nextFocus = event.relatedTarget;
      if (nextFocus?.closest?.('[data-key-edit-path]')) return;
      window.setTimeout(() => {
        if (!state.editingKey) return;
        if (state.editingKey.path !== panelPath) return;
        if (document.activeElement && panel.contains(document.activeElement)) return;
        state.editingKey = null;
        renderEditor();
      }, 0);
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
      document.querySelectorAll('[data-candidate-state]').forEach((item) => item.classList.toggle('active', item === button));
      if (isPreviewScopedModule()) renderEditor();
      renderCurrentPreview();
    });
  });

  el.previewRoot.addEventListener('click', (event) => {
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
  document.addEventListener('pointerup', clearPressedPreviewCell);

  el.previewMode.addEventListener('change', () => {
    setPreviewMode(el.previewMode.value);
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
  document.addEventListener('click', (event) => {
    if (event.target.closest('.preview-mode-select')) return;
    closePreviewModeMenu();
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
    const parsed = safeJsonParse(await file.text());
    if (!parsed.ok) {
      alert(`导入失败：${parsed.error.message}`);
      return;
    }
    pushUndoSnapshot();
    state.project = mergeDefaultCollections(mergeDefaultSwipes(parsed.value, state.sampleProject), state.sampleProject);
    state.original = deepClone(state.project);
    markDirty();
    renderAll();
  });

  el.resetModuleButton.addEventListener('click', () => {
    const module = activeModule();
    pushUndoSnapshot();
    setPath(state.project, module.path, deepClone(getPath(state.original, module.path)));
    markDirty();
    renderAll();
  });

  el.jsonModeButton.addEventListener('click', () => {
    state.jsonMode = !state.jsonMode;
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
  next.previewKeyboards = Array.isArray(next.previewKeyboards) ? next.previewKeyboards : [];
  next.hiddenPreviewKeyboards = Array.isArray(next.hiddenPreviewKeyboards) ? next.hiddenPreviewKeyboards : [];
  next.keyboards = next.keyboards || {};
  next.keyboards.keyboard26 = next.keyboards.keyboard26 || {};
  next.keyboards.keyboard26.keyDisplays = next.keyboards.keyboard26.keyDisplays || {};
  next.keyboards.keyboard26.keyDisplayTypes = next.keyboards.keyboard26.keyDisplayTypes || {};
  next.keyboards.keyboard26.keyTypes = next.keyboards.keyboard26.keyTypes || {};
  next.keyboards.keyboard26.layout = next.keyboards.keyboard26.layout || {};
  next.keyboards.keyboard26.metrics = next.keyboards.keyboard26.metrics || deepClone(sampleProject.keyboards?.keyboard26?.metrics || {});
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
  return next;
}

async function boot() {
  const sampleProject = normalizeDataFontSize(await loadSampleProject());
  state.sampleProject = sampleProject;
  const templateRecords = await listTemplateSnapshots().catch(() => []);
  const defaultProject = applyDefaultSkinMeta(sampleProject, nextDefaultSkinIndex(templateRecords));
  state.project = deepClone(defaultProject);
  state.original = deepClone(defaultProject);
  const stored = loadProject();
  if (
    stored?.project
    && validateProject(stored.project).ok
    && stored.project.templateId === sampleProject.templateId
  ) {
    const merged = mergeDefaultCollections(mergeDefaultSwipes(stored.project, sampleProject), sampleProject);
    state.project = isLegacyDefaultSkinMeta(merged)
      ? applyDefaultSkinMeta(merged, nextDefaultSkinIndex(templateRecords))
      : merged;
    state.original = deepClone(state.project);
    state.savedAt = stored.savedAt;
  }
  bindEvents();
  renderAll();
  refreshVisitorStats();
}

boot().catch((error) => {
  el.editorRoot.innerHTML = `<section class="group-card"><h3>启动失败</h3><p>${escapeHtml(error.message)}</p></section>`;
  console.error(error);
});
