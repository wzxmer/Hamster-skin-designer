import { EDITOR_SECTIONS } from '../../packages/shared-schema/index.js';
import { collectLabels, renderSystemImageSvg, resolveLabel } from '../../packages/preview-engine/index.js';
import {
  exportProjectPackageData,
  exportProjectShareData,
  getStaticTemplateCatalog,
  importProjectPackageData,
  importProjectShareData,
  isStaticRuntime,
  loadDefaultProjectData,
  validateProjectData,
} from './template-runtime.js';
import {
  closeCustomSelects,
  enhanceCustomSelects,
  refreshCustomSelect,
  refreshCustomSelects,
  renderCustomSelect,
} from './utils/custom-select.js';
import {
  arrayBufferToBase64,
  downloadBinaryFile,
  downloadTextFile,
} from './utils/index.js';
import {
  deepClone,
} from './utils/clone.js';
import {
  escapeHtml,
} from './utils/dom.js';
import {
  clearDraft as clearStoredDraft,
  formatDraftTime,
  getDraftStorageKey,
  loadDraft as loadStoredDraft,
  saveDraft as saveStoredDraft,
  pushHistorySnapshot as pushSnapshotToHistory,
  resetHistory as resetHistoryState,
  restoreProjectFromSnapshot,
  snapshotProject,
  loadUiState as loadStoredUiState,
  saveUiState as saveStoredUiState,
  state,
  el,
  PREVIEW_DEVICE_MODELS
} from './state/index.js';
import {
  renderSystemImagePreview,
  renderLabelGroup,
  renderDataAttributes,
  renderFormField,
  renderWideField,
  renderCollapsiblePanel
} from './ui/index.js';
import {
  getThemeSpec,
  resolveThemeColorValue,
  resolveSpecForegroundColor,
  getKeyStyle
} from './utils/theme.js';

const sections = EDITOR_SECTIONS;
const SWIPE_SECTION_KEYS = ['lib.swipeData', 'lib.swipeDataEn'];
const SWIPE_SECTION_LABEL = '鍒掑姩璁剧疆';
const SECTION_META = {
  mapping: { tag: 'Project', hint: '鍚嶇О銆佷綔鑰呬笌瀵煎嚭鏄犲皠' },
  'lib.color': { tag: 'Theme', hint: 'light / dark 閰嶈壊浣撶郴' },
  'lib.fontSize': { tag: 'Type', hint: '瀛楀彿涓庡眰绾у瘑搴? },
  'lib.theme': { tag: 'Motion', hint: '鍋忕Щ銆佺缉鏀句笌鎸夐敭鍔ㄧ敾' },
  'lib.others': { tag: 'Frame', hint: '妯珫灞忓昂瀵镐笌楂樺害' },
  'lib.layout': { tag: 'Layout', hint: '閿綅鎺掑竷涓庢嫋鎷介『搴? },
  'lib.keyboard26': { tag: 'Keys', hint: '涓枃 / 鑻辨枃 26 閿紪杈? },
  'lib.numeric': { tag: 'Keys', hint: '鏁板瓧閿洏鎸夐挳閰嶇疆' },
  'lib.symbolic': { tag: 'Keys', hint: '绗﹀彿閿洏鎸夐挳閰嶇疆' },
  'lib.toolbar': { tag: 'Toolbar', hint: '甯冨眬椤哄簭涓庢寜閽姩浣? },
  'lib.panel': { tag: 'Panel', hint: '闈㈡澘甯冨眬涓庢寜閽唴瀹? },
  'lib.hintSymbolsData': { tag: 'Hint', hint: '闀挎寜鍊欓€変笌鎻愮ず鏁版嵁' },
  'lib.swipeData': { tag: 'Swipe', hint: '涓嫳鏂囦笂鍒?/ 涓嬪垝鍔ㄤ綔' },
  'lib.swipeDataEn': { tag: 'Swipe', hint: '鑻辨枃涓婂垝 / 涓嬪垝鍔ㄤ綔' },
  'lib.collectionData': { tag: 'Data', hint: '鍒嗙被涓庣鍙锋暟鎹簮' },
};
const BUTTON_SECTION_BY_DOMAIN = {
  keyboard26: 'lib.keyboard26',
  numeric: 'lib.numeric',
  symbolic: 'lib.symbolic',
  panel: 'lib.panel',
  toolbar: 'lib.toolbar',
};
const COLOR_EDITOR_DOMAIN_META = {
  keyboard26: { label: '26 閿?, fallbackColorKey: '鎸夐敭鍓嶆櫙棰滆壊' },
  numeric: { label: '鏁板瓧閿洏', fallbackColorKey: '鎸夐敭鍓嶆櫙棰滆壊' },
  symbolic: { label: '绗﹀彿閿洏', fallbackColorKey: '鎸夐敭鍓嶆櫙棰滆壊' },
  panel: { label: '闈㈡澘', fallbackColorKey: '鎸夐敭鍓嶆櫙棰滆壊' },
  toolbar: { label: '宸ュ叿鏍?, fallbackColorKey: 'toolbar鎸夐敭棰滆壊' },
};

function isToolbarColorField(key) {
  return /toolbar|panel|闈㈡澘|鍊欓€墊缂栫爜/.test(key);
}

function isFunctionColorField(key) {
  return /鍔熻兘閿畖enter|鍥炶溅|绌烘牸|collection|鍒楄〃/.test(key);
}

const COLOR_FIELD_GROUP_META = [
  {
    id: 'toolbar',
    label: '宸ュ叿鏍?,
    matcher: (key) => isToolbarColorField(key),
  },
  {
    id: 'keyboard26',
    label: '26 閿?,
    matcher: (key) => !isToolbarColorField(key) && !isFunctionColorField(key),
  },
  {
    id: 'function',
    label: '鍔熻兘閿?,
    matcher: (key) => isFunctionColorField(key),
  },
];
const STANDARD_ACTIONS = [
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
const KEYBOARD_TYPE_SUGGESTIONS = ['pinyin', 'alphabetic', 'symbolic', 'numeric', 'emojis'];
const SHORTCUT_SUGGESTIONS = [
  '#绠€绻佸垏鎹?,
  '#涓嫳鍒囨崲',
  '#RimeSwitcher',
  '#娆￠€変笂灞?,
  '#涓夐€変笂灞?,
  '#鏂规鍒囨崲',
  '#宸︽墜妯″紡',
  '#鍙虫墜妯″紡',
  '#琛岄',
  '#琛屽熬',
  '#鎹㈣',
  '#Enter',
  '#閲嶈緭',
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
const ACTION_TYPE_OPTIONS = [
  { value: 'standard', label: 'standard 鏍囧噯鍔ㄤ綔' },
  { value: 'rawString', label: 'rawString 鍘熷瀛楃涓? },
  { value: 'character', label: 'character 瀛楃杈撳叆' },
  { value: 'symbol', label: 'symbol 绗﹀彿杈撳叆' },
  { value: 'keyboardType', label: 'keyboardType 閿洏鍒囨崲' },
  { value: 'shortcut', label: 'shortcut 蹇嵎鎸囦护' },
  { value: 'sendKeys', label: 'sendKeys 缁勫悎鍙戦€? },
  { value: 'openURL', label: 'openURL 鎵撳紑閾炬帴' },
  { value: 'runScript', label: 'runScript 杩愯鑴氭湰' },
  { value: 'switchRimeSchema', label: 'switchRimeSchema 鍒囨崲鏂规' },
  { value: 'openScript', label: 'openScript 鎵撳紑鑴氭湰' },
  { value: 'floatKeyboardType', label: 'floatKeyboardType 娴姩閿洏' },
  { value: 'json', label: 'json 瀵硅薄缂栬緫' },
];
const ACTION_TYPES = ACTION_TYPE_OPTIONS.map((item) => item.value);
const DRAFT_STORAGE_KEY_PREFIX = 'hamster-skin-designer:draft:v2';
const UI_STATE_STORAGE_KEY = 'hamster-skin-designer:ui:v1';
const PREVIEW_DISPLAY_BOOST = 1.48;
const CUSTOM_SELECT_IDS = [
  'templateSelect',
  'previewSelect',
  'themeSelect',
  'orientationSelect',
  'shiftStateSelect',
  'enterTypeSelect',
];
const PREVIEW_DEVICE_MODELS = [
  { id: 'iphone-58', label: '5.8 鑻卞: 鑻规灉 X/XS/11 Pro', diagonal: 5.8, family: 'iphone', width: 375, height: 812, safeTop: 44, safeBottom: 18, bezel: 19, radius: 50, camera: 'notch', uiScale: 0.98 },
  { id: 'iphone-61', label: '6.1 鑻卞: 鑻规灉 12/13/14/15/16 鏍囧噯鐗堛€?2 Pro-15 Pro', diagonal: 6.1, family: 'iphone', width: 393, height: 852, safeTop: 47, safeBottom: 21, bezel: 18, radius: 54, camera: 'dynamic-island', uiScale: 1.02 },
  { id: 'iphone-63', label: '6.3 鑻卞: 鑻规灉 16 Pro', diagonal: 6.3, family: 'iphone', width: 402, height: 874, safeTop: 59, safeBottom: 22, bezel: 19, radius: 55, camera: 'dynamic-island', uiScale: 1.05 },
  { id: 'iphone-65', label: '6.5 鑻卞: 鑻规灉 XS Max/11 Pro Max', diagonal: 6.5, family: 'iphone', width: 414, height: 896, safeTop: 47, safeBottom: 21, bezel: 19, radius: 54, camera: 'notch', uiScale: 1.08 },
  { id: 'iphone-67', label: '6.7 鑻卞: 鑻规灉 12/13 Pro Max銆?4/15/16 Plus銆?4/15 Pro Max', diagonal: 6.7, family: 'iphone', width: 430, height: 932, safeTop: 59, safeBottom: 24, bezel: 19, radius: 58, camera: 'dynamic-island', uiScale: 1.1 },
  { id: 'iphone-69', label: '6.9 鑻卞: 鑻规灉 16 Pro Max', diagonal: 6.9, family: 'iphone', width: 440, height: 956, safeTop: 62, safeBottom: 25, bezel: 20, radius: 60, camera: 'dynamic-island', uiScale: 1.14 },
];

function createPreviewInteractionState() {
  return {
    pressedDomain: null,
    pressedKey: null,
    mode: 'idle',
    longPressTimer: null,
    releaseTimer: null,
    suppressClick: false,
  };
}

const state = {
  project: null,
  originalProject: null,
  activeSection: 'mapping',
  previewType: 'pinyin',
  theme: 'light',
  orientation: 'portrait',
  previewDevice: PREVIEW_DEVICE_MODELS[1].id,
  editorMode: 'visual',
  previewState: {
    shift: 'normal',
    enterType: 'default',
  },
  selectedKeys: {
    keyboard26: null,
    numeric: null,
    symbolic: null,
    panel: null,
    toolbar: null,
  },
  selectedData: {
    hintGroup: null,
    hintKey: null,
    swipeLib: 'swipeData',
    swipeGroup: null,
    swipeKey: null,
    collectionSource: null,
    collectionKey: null,
  },
  history: {
    undo: [],
    redo: [],
  },
  colorEditorMode: 'global',
  colorEditorDomain: 'keyboard26',
  colorFieldGroup: 'keyboard26',
  draftSavedAt: null,
  layoutDrag: null,
  templates: [],
  activeTemplateId: null,
  currentTemplateMeta: null,
  projectValidation: null,
  previewInteraction: createPreviewInteractionState(),
};

// removed DOM selectors

function normalizeFontFaceList(fontFace) {
  if (!Array.isArray(fontFace)) return [];
  return fontFace.map((entry) => ({
    url: typeof entry?.url === 'string' ? entry.url : '',
    name: typeof entry?.name === 'string' ? entry.name : '',
    ranges: Array.isArray(entry?.ranges)
      ? entry.ranges.map((range) => ({
        location: Number.isFinite(Number(range?.location)) ? Number(range.location) : '',
        length: Number.isFinite(Number(range?.length)) ? Number(range.length) : '',
      }))
      : [],
  }));
}

function ensureProjectConfig(project) {
  if (!project.config || typeof project.config !== 'object') {
    project.config = {};
  }
  if (!Array.isArray(project.config.fontFace)) {
    project.config.fontFace = [];
  }
  return project.config;
}

function sanitizeFontFaceList(fontFace) {
  return normalizeFontFaceList(fontFace)
    .map((entry) => {
      const url = String(entry.url || '').trim();
      const name = String(entry.name || '').trim();
      const ranges = (entry.ranges || [])
        .map((range) => {
          if (range?.location === '' || range?.length === '') return null;
          return {
            location: Number(range.location),
            length: Number(range.length),
          };
        })
        .filter(Boolean)
        .filter((range) => Number.isFinite(range.location) && Number.isFinite(range.length));
      if (!url && !name) return null;
      return {
        ...(url ? { url } : {}),
        ...(name ? { name } : {}),
        ...(ranges.length ? { ranges } : {}),
      };
    })
    .filter(Boolean);
}

function getDefaultMetaFallback(key) {
  if (key === 'author') return '娴敓';
  if (key === 'projectName') return '鏂扮殑閿洏';
  return '';
}

function getProjectMetaDisplayValue(project, key) {
  const rawValue = project?.meta?.[key];
  if (typeof rawValue !== 'string') return '';
  return rawValue.trim();
}

function getProjectMetaResolvedValue(project, key) {
  return getProjectMetaDisplayValue(project, key) || getDefaultMetaFallback(key);
}

function getMetaInputPresentation(project, key) {
  const rawValue = getProjectMetaDisplayValue(project, key);
  const defaultValue = getDefaultMetaFallback(key);
  const isDefault = !rawValue;
  return {
    value: isDefault ? defaultValue : rawValue,
    defaultValue,
    isDefault,
  };
}

function isDefaultMetaInput(target) {
  return target instanceof HTMLInputElement
    && target.dataset.editor === 'meta'
    && ['projectName', 'author'].includes(target.dataset.key || '');
}

function updateMetaInputDefaultState(target, isDefault) {
  target.dataset.defaultActive = isDefault ? 'true' : 'false';
  target.classList.toggle('meta-default-value', isDefault);
}

function setStatus(message, isError = false) {
  el.statusLog.textContent = message;
  el.statusLog.classList.toggle('error', isError);
}

function updateBackToTopButton() {
  if (!el.backToTopButton) return;
  const visible = window.scrollY > 280;
  el.backToTopButton.classList.toggle('visible', visible);
  el.backToTopButton.disabled = !visible;
}

function formatApiError(result) {
  const lines = [];
  if (result.stage) lines.push(`闃舵: ${result.stage}`);
  if (result.message) lines.push(`淇℃伅: ${result.message}`);
  if (result.stderr) lines.push(`stderr:\n${result.stderr}`);
  if (result.stdout && !result.stderr) lines.push(`stdout:\n${result.stdout}`);
  return lines.join('\n');
}

async function validateProjectRequest(project, templateId = project?.templateId || state.activeTemplateId) {
  return validateProjectData(project, templateId);
}

function getDraftStorageKey(templateId = state.activeTemplateId || 'default') {
  return `${DRAFT_STORAGE_KEY_PREFIX}:${templateId}`;
}

function isValidSectionKey(sectionKey) {
  return sections.some((item) => item.key === sectionKey);
}

function isSwipeSectionKey(sectionKey) {
  return SWIPE_SECTION_KEYS.includes(sectionKey);
}

function getDisplaySections() {
  return sections
    .filter((section) => section.key !== 'lib.swipeDataEn')
    .map((section) => (
      section.key === 'lib.swipeData'
        ? { ...section, label: SWIPE_SECTION_LABEL }
        : section
    ));
}

function getDisplaySection(sectionKey) {
  if (isSwipeSectionKey(sectionKey)) {
    return getDisplaySections().find((section) => section.key === 'lib.swipeData');
  }
  return getDisplaySections().find((section) => section.key === sectionKey);
}

function getSectionDisplayLabel(sectionKey) {
  return getDisplaySection(sectionKey)?.label || sectionKey;
}

function saveUiState() {
  saveStoredUiState(UI_STATE_STORAGE_KEY, state.activeSection, isValidSectionKey);
}

function loadUiState() {
  const nextState = loadStoredUiState(UI_STATE_STORAGE_KEY, isValidSectionKey);
  if (nextState.activeSection) {
    state.activeSection = nextState.activeSection;
  }
}

function setTemplateCatalog(templates = []) {
  state.templates = Array.isArray(templates) ? templates : [];
  renderTemplateOptions();
}

function setCurrentTemplateMeta(project) {
  const templateId = project?.templateId || state.activeTemplateId;
  const catalogMeta = state.templates.find((item) => item.id === templateId) || null;
  state.activeTemplateId = templateId || state.activeTemplateId;
  state.currentTemplateMeta = project?.template || catalogMeta;
  renderTemplateInfo();
}

function renderTemplateOptions() {
  if (!el.templateSelect) return;
  const options = state.templates.length
    ? state.templates
    : [{ id: state.activeTemplateId || 'hamster-ios', displayName: '榛樿妯℃澘', version: '' }];
  el.templateSelect.innerHTML = options
    .map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.displayName)}</option>`)
    .join('');
  if (state.activeTemplateId) {
    el.templateSelect.value = state.activeTemplateId;
  }
  refreshCustomSelect(el.templateSelect);
}

function renderPreviewDeviceOptions() {
  if (!el.deviceSelect) return;
  el.deviceSelect.innerHTML = PREVIEW_DEVICE_MODELS
    .map((device) => `<option value="${escapeHtml(device.id)}">${escapeHtml(device.label)}</option>`)
    .join('');
  el.deviceSelect.value = state.previewDevice;
}

function renderTemplateInfo() {
  if (!el.templateInfo) return;
  const meta = state.currentTemplateMeta;
  if (!meta) {
    el.templateInfo.textContent = '妯℃澘锛氭湭杞藉叆';
    return;
  }
  el.templateInfo.textContent = `妯℃澘锛?{meta.displayName || meta.name || meta.id}`;
}

function setProjectValidation(validation) {
  state.projectValidation = validation || null;
  renderVersionInfo();
}

function renderVersionInfo() {
  if (!el.versionInfo) return;
  const validation = state.projectValidation;
  const projectVersion = validation?.projectVersion || state.project?.version || '-';
  const templateVersion = validation?.templateVersion || state.currentTemplateMeta?.version || '-';
  const warningCount = Array.isArray(validation?.warnings) ? validation.warnings.length : 0;
  el.versionInfo.textContent = `鐗堟湰锛?{projectVersion} / 妯℃澘 ${templateVersion}`;
  el.versionInfo.hidden = false;
  el.versionInfo.classList.toggle('warning', warningCount > 0);
}

function formatValidationText(validation) {
  if (!validation) return '褰撳墠娌℃湁鐗堟湰鏍￠獙缁撴灉銆?;
  const lines = [
    `椤圭洰鐗堟湰锛?{validation.projectVersion || state.project?.version || '-'}`,
    `妯℃澘鐗堟湰锛?{validation.templateVersion || state.currentTemplateMeta?.version || '-'}`,
  ];
  if (validation.warnings?.length) {
    lines.push('璀﹀憡:');
    lines.push(...validation.warnings.map((item) => `- ${item}`));
  } else {
    lines.push('鐗堟湰鍏煎锛氭甯?);
  }
  if (validation.errors?.length) {
    lines.push('閿欒:');
    lines.push(...validation.errors.map((item) => `- ${item}`));
  }
  return lines.join('\n');
}

function saveDraft() {
  if (!state.project) return;
  const savedAt = saveStoredDraft(
    getDraftStorageKey(DRAFT_STORAGE_KEY_PREFIX, state.project.templateId),
    state.project
  );
  state.draftSavedAt = savedAt;
  updateDraftInfo();
}

function loadDraft(templateId = state.activeTemplateId) {
  const loaded = loadStoredDraft(getDraftStorageKey(DRAFT_STORAGE_KEY_PREFIX, templateId));
  state.draftSavedAt = loaded.savedAt;
  return loaded.project;
}

function clearDraft(templateId = state.activeTemplateId) {
  clearStoredDraft(getDraftStorageKey(DRAFT_STORAGE_KEY_PREFIX, templateId));
  state.draftSavedAt = null;
  updateDraftInfo();
}

function updateDraftInfo() {
  if (!el.draftInfo) return;
  el.draftInfo.textContent = `鑽夌锛?{formatDraftTime(state.draftSavedAt)}`;
}

function pushHistorySnapshot(snapshot = snapshotProject()) {
  if (!state.project) return;
  pushSnapshotToHistory(state.history, snapshot);
  updateHistoryButtons();
}

function resetHistory() {
  resetHistoryState(state.history);
  updateHistoryButtons();
}

function commitProjectMutation(message, mutate, options = {}) {
  if (!state.project) return false;
  const beforeSnapshot = snapshotProject();
  mutate();
  const afterSnapshot = snapshotProject();
  if (beforeSnapshot === afterSnapshot) return false;
  pushHistorySnapshot(beforeSnapshot);
  saveDraft();
  if (options.renderEditor) {
    renderEditor();
  } else if (options.syncJson !== false) {
    syncJsonEditor();
  }
  if (options.renderPreview !== false) {
    renderPreview();
  }
  if (message && options.status !== false) {
    setStatus(message);
  }
  return true;
}

function replaceProjectFromHistory(snapshot) {
  state.project = restoreProjectFromSnapshot(snapshot);
  renderSections();
  renderEditor();
  renderPreview();
  saveDraft();
  updateHistoryButtons();
}

function undoHistory() {
  if (!state.history.undo.length || !state.project) return;
  state.history.redo.push(snapshotProject());
  const snapshot = state.history.undo.pop();
  replaceProjectFromHistory(snapshot);
  setStatus('宸叉挙閿€涓婁竴姝ヤ慨鏀广€?);
  updateHistoryButtons();
}

function redoHistory() {
  if (!state.history.redo.length || !state.project) return;
  state.history.undo.push(snapshotProject());
  const snapshot = state.history.redo.pop();
  replaceProjectFromHistory(snapshot);
  setStatus('宸叉仮澶嶅垰鎵嶆挙閿€鐨勪慨鏀广€?);
  updateHistoryButtons();
}

function updateHistoryButtons() {
  if (el.undoButton) {
    el.undoButton.disabled = state.history.undo.length === 0;
  }
  if (el.redoButton) {
    el.redoButton.disabled = state.history.redo.length === 0;
  }
}

function syncPreviewControls() {
  if (el.themeSelect) el.themeSelect.value = state.theme;
  if (el.orientationSelect) el.orientationSelect.value = state.orientation;
  if (el.deviceSelect) el.deviceSelect.value = state.previewDevice;
  if (el.previewSelect) el.previewSelect.value = state.previewType;
  if (el.shiftStateSelect) el.shiftStateSelect.value = state.previewState.shift;
  if (el.enterTypeSelect) el.enterTypeSelect.value = state.previewState.enterType;
  refreshCustomSelects();
}

function getPreviewDeviceSpec() {
  return PREVIEW_DEVICE_MODELS.find((item) => item.id === state.previewDevice) || PREVIEW_DEVICE_MODELS[0];
}

function getPreviewViewportSize() {
  const root = el.previewRoot;
  if (!root) {
    return { width: 420, height: 760 };
  }
  const computedStyle = window.getComputedStyle(root);
  const paddingX = (Number.parseFloat(computedStyle.paddingLeft) || 0) + (Number.parseFloat(computedStyle.paddingRight) || 0);
  const paddingY = (Number.parseFloat(computedStyle.paddingTop) || 0) + (Number.parseFloat(computedStyle.paddingBottom) || 0);
  return {
    width: Math.max(280, Math.round(root.clientWidth - paddingX)),
    height: Math.max(320, Math.round(root.clientHeight - paddingY)),
  };
}

function getPreviewDeviceBounds(device, orientation) {
  const isLandscape = orientation === 'landscape';
  const viewport = getPreviewViewportSize();
  const sideMargin = isLandscape ? 8 : 2;
  const verticalMargin = isLandscape ? 6 : 0;
  const normalizedScale = clampPreviewValue(device.uiScale || 1, 0.9, 1.18);
  const fitBias = clampPreviewValue(1.02 - ((normalizedScale - 1) * (isLandscape ? 0.05 : 0.08)), 0.98, 1.04);
  return {
    maxFrameWidth: Math.max(240, Math.round((viewport.width - sideMargin * 2) * fitBias)),
    maxFrameHeight: Math.max(260, Math.round((viewport.height - verticalMargin * 2) * fitBias)),
    minScale: isLandscape ? 0.28 : 0.22,
  };
}

function getPreviewDeviceMetrics(device, orientation) {
  const isLandscape = orientation === 'landscape';
  const screenWidth = isLandscape ? device.height : device.width;
  const screenHeight = isLandscape ? device.width : device.height;
  const bounds = getPreviewDeviceBounds(device, orientation);
  const viewport = getPreviewViewportSize();
  const fitScale = Math.min(
    Math.max(220, bounds.maxFrameWidth - device.bezel * 2) / screenWidth,
    Math.max(260, bounds.maxFrameHeight - device.bezel * 2) / screenHeight
  );
  const safeScale = Math.min(
    Math.max(220, viewport.width - 2) / (screenWidth + device.bezel * 2),
    Math.max(260, viewport.height - 2) / (screenHeight + device.bezel * 2)
  );
  const scale = clampPreviewValue(Math.min(fitScale * PREVIEW_DISPLAY_BOOST, safeScale), bounds.minScale, 4);
  const renderScreenWidth = Math.round(screenWidth * scale);
  const renderScreenHeight = Math.round(screenHeight * scale);
  const frameInset = Math.round(device.bezel * scale);
  const frameWidth = Math.round(renderScreenWidth + frameInset * 2);
  const frameHeight = Math.round(renderScreenHeight + frameInset * 2);
  return {
    screenWidth,
    screenHeight,
    renderScreenWidth,
    renderScreenHeight,
    frameInset,
    frameWidth,
    frameHeight,
    safeTop: Math.round(device.safeTop * scale),
    safeBottom: Math.round(device.safeBottom * scale),
    radius: Math.round(device.radius * scale),
    cameraWidth: Math.round((device.camera === 'dynamic-island' ? 126 : 168) * scale),
    cameraHeight: Math.round((device.camera === 'dynamic-island' ? 34 : 30) * scale),
    statusFontSize: clampPreviewValue(Math.round(14 * scale), 10, 16),
  };
}

function getPreviewDeviceStyle() {
  const device = getPreviewDeviceSpec();
  const metrics = getPreviewDeviceMetrics(device, state.orientation);
  const viewport = getPreviewViewportSize();
  return {
    device,
    metrics,
    style: [
      `--device-frame-width:${metrics.frameWidth}px`,
      `--device-frame-height:${metrics.frameHeight}px`,
      `--device-screen-width:${metrics.renderScreenWidth}px`,
      `--device-screen-height:${metrics.renderScreenHeight}px`,
      `--device-frame-inset:${metrics.frameInset}px`,
      `--device-corner-radius:${metrics.radius}px`,
      `--device-safe-top:${metrics.safeTop}px`,
      `--device-safe-bottom:${metrics.safeBottom}px`,
      `--device-camera-width:${metrics.cameraWidth}px`,
      `--device-camera-height:${metrics.cameraHeight}px`,
      `--device-status-font-size:${metrics.statusFontSize}px`,
      `--preview-viewport-width:${viewport.width}px`,
      `--preview-viewport-height:${viewport.height}px`,
    ].join(';'),
  };
}

function renderPreviewCamera(device) {
  if (device.camera === 'dynamic-island') {
    return '<div class="device-camera dynamic-island" aria-hidden="true"></div>';
  }
  if (device.camera === 'notch') {
    return '<div class="device-camera notch" aria-hidden="true"></div>';
  }
  return '';
}

function renderDeviceShell(content) {
  const { device, style } = getPreviewDeviceStyle();
  const shellClass = [
    'device-shell',
    state.theme === 'dark' ? 'dark' : '',
    `device-family-${device.family}`,
    `camera-${device.camera}`,
    `preview-${state.previewType}`,
    `preview-${state.orientation}`,
  ].filter(Boolean).join(' ');
  const screenBodyClass = [
    'device-screen-body',
    isIntegratedKeyboardPreview() ? 'keyboard-screen-body' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${shellClass}" style="${style}">
      <div class="device-frame">
        <div class="device-screen">
          <div class="device-statusbar">
            <span class="device-status-time">9:41</span>
            ${renderPreviewCamera(device)}
            <span class="device-status-indicators">5G&nbsp;&nbsp;100%</span>
          </div>
          <div class="${screenBodyClass}">
            ${content}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function applyValidatedImportedProject(project, label, validation) {
  if (project.templateId) {
    state.activeTemplateId = project.templateId;
    renderTemplateOptions();
  }
  applyProject(project, { resetOriginal: true, resetHistory: true, validation });
  setStatus(`${label}\n${formatValidationText(validation)}`);
}

function getSectionValue() {
  if (state.activeSection === 'mapping') {
    return {
      meta: state.project.meta,
      mapping: state.project.mapping,
    };
  }

  const [, key] = state.activeSection.split('.');
  return state.project.lib[key];
}

function setSectionValue(value) {
  if (state.activeSection === 'mapping') {
    state.project.meta = value.meta || state.project.meta;
    state.project.mapping = value.mapping || state.project.mapping;
    return;
  }

  const [, key] = state.activeSection.split('.');
  state.project.lib[key] = value;
}

function getOriginalSectionValue() {
  if (state.activeSection === 'mapping') {
    return {
      meta: state.originalProject.meta,
      mapping: state.originalProject.mapping,
    };
  }

  const [, key] = state.activeSection.split('.');
  return state.originalProject.lib[key];
}

function syncJsonEditor() {
  el.jsonEditor.value = JSON.stringify(getSectionValue(), null, 2);
}

function getThemeSpec(project, themeName) {
  return project.lib.color?.[themeName] || {};
}

function resolveThemeColorValue(theme, colorKey, fallback = '') {
  if (!colorKey) return fallback;
  const value = theme?.[colorKey];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function resolveSpecForegroundColor(theme, spec, fallbackColorKey, pressed = false) {
  const fallback = resolveThemeColorValue(theme, fallbackColorKey, '#111111');
  if (!spec || typeof spec !== 'object') return fallback;
  const preferredKey = pressed
    ? (spec.highlightColorKey || spec.colorKey)
    : (spec.colorKey || spec.highlightColorKey);
  return resolveThemeColorValue(theme, preferredKey, fallback);
}

function getKeyStyle(theme, isSystem = false, options = {}) {
  const pressed = options.pressed === true;
  const backgroundColorKey = options.backgroundColorKey || (
    isSystem
      ? (pressed ? '鍔熻兘閿儗鏅鑹?楂樹寒' : '鍔熻兘閿儗鏅鑹?鏅€?)
      : (pressed ? '瀛楁瘝閿儗鏅鑹?楂樹寒' : '瀛楁瘝閿儗鏅鑹?鏅€?)
  );
  const backgroundFallback = isSystem
    ? (pressed ? '#eceff5' : '#d6d8df')
    : (pressed ? '#d8dbe4' : '#ffffff');
  const background = resolveThemeColorValue(theme, backgroundColorKey, backgroundFallback);
  const foreground = resolveSpecForegroundColor(
    theme,
    options.spec,
    options.fallbackForegroundKey || '鎸夐敭鍓嶆櫙棰滆壊',
    pressed
  );
  return `background:${background};color:${foreground};`;
}

function getLetterPreviewLabel(key, variantName) {
  if (!/^[a-z]$/.test(key)) return key;
  return key.toUpperCase();
}

function getKeyboardSpaceSubLabel(variantName, variant) {
  if (variantName !== 'pinyin') return '';
  const rawLabel = resolveLabel(variant?.schemaLabel).trim();
  if (!rawLabel || rawLabel.startsWith('$') || /rime|schema/i.test(rawLabel)) {
    return '澶╄閿?;
  }
  return rawLabel;
}

function getShiftPreviewLabel() {
  if (state.previewState.shift === 'locked') return '鈬?;
  if (state.previewState.shift === 'upper') return '猬?;
  return '鈬?;
}

function getEnterPreviewLabel(keyboard26) {
  return keyboard26.enterLabels?.[state.previewState.enterType] || keyboard26.enterLabels?.default || '鍥炶溅';
}

function clampPreviewValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parsePreviewNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getPreviewHeightMetrics(project, orientation) {
  const groupKey = orientation === 'landscape' ? '妯睆' : '绔栧睆';
  const others = project?.lib?.others?.[groupKey] || {};
  const baseKeyboardHeight = orientation === 'landscape' ? 160 : 205;
  const baseToolbarHeight = orientation === 'landscape' ? 30 : 41;
  const basePreeditHeight = orientation === 'landscape' ? 14 : 22;
  const keyboardHeight = parsePreviewNumber(others['keyboard楂樺害']) || baseKeyboardHeight;
  const toolbarHeight = parsePreviewNumber(others['toolbar楂樺害']) || baseToolbarHeight;
  const preeditHeight = parsePreviewNumber(others['preedit楂樺害']) || basePreeditHeight;
  const keyboardScale = clampPreviewValue(keyboardHeight / baseKeyboardHeight, 0.72, 1.7);
  const toolbarScale = clampPreviewValue(toolbarHeight / baseToolbarHeight, 0.75, 1.6);
  const overallScale = clampPreviewValue(
    (keyboardHeight + toolbarHeight + preeditHeight) / (baseKeyboardHeight + baseToolbarHeight + basePreeditHeight),
    0.78,
    1.55
  );
  return {
    keyboardScale,
    toolbarScale,
    overallScale,
    keyboardHeight,
    toolbarHeight,
    preeditHeight,
  };
}

function getPreviewKeyboardWidthScale(orientation) {
  const device = getPreviewDeviceSpec();
  const metrics = getPreviewDeviceMetrics(device, orientation);
  const screenWidth = Math.max(metrics.renderScreenWidth, 1);
  const targetWidth = orientation === 'landscape' ? 720 : 360;
  const rawScale = screenWidth / targetWidth;
  return clampPreviewValue(rawScale, orientation === 'landscape' ? 0.82 : 0.94, 1.16);
}

function getPreviewScaleStyle(project, orientation) {
  const metrics = getPreviewHeightMetrics(project, orientation);
  const widthScale = getPreviewKeyboardWidthScale(orientation);
  const keyboardScale = clampPreviewValue(metrics.keyboardScale * (0.86 + widthScale * 0.14), 0.82, 1.16);
  const toolbarScale = clampPreviewValue(metrics.toolbarScale * (0.88 + widthScale * 0.12), 0.82, 1.24);
  const overallScale = clampPreviewValue(metrics.overallScale * (0.9 + widthScale * 0.1), 0.82, 1.2);
  const spacingScale = clampPreviewValue(
    keyboardScale * 0.58 + widthScale * 0.24 + overallScale * 0.18,
    0.88,
    1.18
  );
  return [
    `--preview-width-scale:${widthScale.toFixed(3)}`,
    `--preview-keyboard-scale:${keyboardScale.toFixed(3)}`,
    `--preview-toolbar-scale:${toolbarScale.toFixed(3)}`,
    `--preview-height-scale:${overallScale.toFixed(3)}`,
    `--preview-key-spacing-scale:${spacingScale.toFixed(3)}`,
    `--preview-keyboard-height:${Math.round(metrics.keyboardHeight * 2.55 * (0.92 + widthScale * 0.08))}px`,
    `--preview-toolbar-height:${Math.round(metrics.toolbarHeight * 1.75 * (0.9 + widthScale * 0.1))}px`,
    `--preview-stage-height:${Math.round((metrics.keyboardHeight + metrics.toolbarHeight + metrics.preeditHeight) * 2.35 * (0.92 + widthScale * 0.08))}px`,
  ].join(';');
}

function serializeStyleVars(styleVars = {}) {
  return Object.entries(styleVars)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}:${typeof value === 'number' ? `${value}px` : value};`)
    .join('');
}

function mergeInlineStyles(...styles) {
  return styles.filter(Boolean).join('');
}

function getProjectFontSize(project, key, fallback = null) {
  const value = parsePreviewNumber(project?.lib?.fontSize?.[key]);
  return value ?? fallback;
}

function scalePreviewFontSize(value, multiplier, min = 0, max = 999) {
  return clampPreviewValue((value || 0) * multiplier, min, max);
}

function getPrimaryLabelSpec(spec) {
  if (spec?.label && typeof spec.label === 'object') return spec.label;
  if (Array.isArray(spec?.labels) && spec.labels[0] && typeof spec.labels[0] === 'object') return spec.labels[0];
  return null;
}

function getSecondaryLabelSpec(spec) {
  if (Array.isArray(spec?.labels) && spec.labels[1] && typeof spec.labels[1] === 'object') return spec.labels[1];
  return null;
}

function resolveSpecFontSize(project, spec, fallback) {
  if (!spec || typeof spec !== 'object') return fallback;
  const direct = parsePreviewNumber(spec.fontSize);
  if (direct !== null) return direct;
  const base = spec.fontSizeKey ? getProjectFontSize(project, spec.fontSizeKey, fallback) : fallback;
  const offset = parsePreviewNumber(spec.fontSizeOffset) || 0;
  return (base ?? fallback) + offset;
}

function getKeyboard26Typography(project, variantName, keyboard26, variant, key, spec = null) {
  const baseText = getProjectFontSize(project, '鎸夐敭鍓嶆櫙鏂囧瓧澶у皬', 18);
  const englishLower = getProjectFontSize(project, '鑻辨枃閿洏灏忓啓瀛楁瘝澶у皬', 22);
  const topHint = scalePreviewFontSize(getProjectFontSize(project, '涓婂垝鏂囧瓧澶у皬', 9), 1.35, 10, 24);
  const bottomHint = scalePreviewFontSize(getProjectFontSize(project, '涓嬪垝鏂囧瓧澶у皬', 9), 1.35, 10, 24);
  const fallbackSecondary = scalePreviewFontSize(getProjectFontSize(project, '涓嬪垝鏂囧瓧澶у皬', 9), 1.3, 10, 24);
  const primaryLabel = getPrimaryLabelSpec(spec);
  const secondaryLabel = getSecondaryLabelSpec(spec);
  const vars = {
    '--key-top-hint-font-size': topHint,
    '--key-bottom-hint-font-size': bottomHint,
  };

  if (/^[a-z]$/.test(key)) {
    vars['--key-main-font-size'] = scalePreviewFontSize(
      variantName === 'alphabetic' ? englishLower : baseText,
      1.72,
      24,
      52
    );
    return vars;
  }

  if (spec) {
    const mainSize = resolveSpecFontSize(project, primaryLabel || spec, baseText);
    const secondarySize = resolveSpecFontSize(project, secondaryLabel, baseText - 3);
    vars['--key-main-font-size'] = scalePreviewFontSize(mainSize, 1.34, 18, 38);
    vars['--key-secondary-font-size'] = scalePreviewFontSize(secondarySize, 1.15, 12, 28);
    return vars;
  }

  if (key === 'shift') {
    const shiftSpec = state.previewState.shift === 'locked'
      ? keyboard26.systemKeys?.shift?.capsLocked
      : state.previewState.shift === 'upper'
        ? keyboard26.systemKeys?.shift?.uppercased
        : keyboard26.systemKeys?.shift?.normal;
    const fontSize = resolveSpecFontSize(project, shiftSpec, baseText);
    vars['--key-icon-font-size'] = scalePreviewFontSize(fontSize, 1.9, 24, 56);
    vars['--key-secondary-font-size'] = fallbackSecondary;
    return vars;
  }

  if (key === 'backspace') {
    const systemSpec = keyboard26.systemKeys?.backspace;
    vars['--key-icon-font-size'] = scalePreviewFontSize(resolveSpecFontSize(project, systemSpec, baseText), 1.85, 24, 56);
    return vars;
  }

  if (key === 'cnen') {
    const systemSpec = keyboard26.systemKeys?.cnen;
    vars['--key-icon-font-size'] = scalePreviewFontSize(resolveSpecFontSize(project, systemSpec, baseText), 1.8, 24, 56);
    return vars;
  }

  if (key === '123') {
    const systemSpec = keyboard26.systemKeys?.numericSwitch;
    vars['--key-main-font-size'] = scalePreviewFontSize(resolveSpecFontSize(project, systemSpec, baseText), 1.32, 18, 34);
    return vars;
  }

  if (key === 'space') {
    vars['--key-main-font-size'] = scalePreviewFontSize(
      resolveSpecFontSize(project, keyboard26.bottomForegrounds?.space, baseText - 3),
      1.3,
      18,
      32
    );
    vars['--key-sub-label-font-size'] = scalePreviewFontSize(
      resolveSpecFontSize(project, variant?.schemaLabel, 8),
      1.22,
      10,
      20
    );
    return vars;
  }

  if (key === 'enter') {
    vars['--key-main-font-size'] = scalePreviewFontSize(
      resolveSpecFontSize(project, keyboard26.bottomForegrounds?.enterDefault, baseText - 3),
      1.3,
      18,
      34
    );
    return vars;
  }

  vars['--key-main-font-size'] = scalePreviewFontSize(baseText, 1.34, 18, 38);
  return vars;
}

function getKeyboard26PreviewForegroundSpec(keyboard26, variantName, key, buttons) {
  const variant = keyboard26?.[variantName] || {};
  if (buttons?.[key]) return buttons[key];
  if (key === 'shift') {
    if (state.previewState.shift === 'locked') return keyboard26?.systemKeys?.shift?.capsLocked || null;
    if (state.previewState.shift === 'upper') return keyboard26?.systemKeys?.shift?.uppercased || null;
    return keyboard26?.systemKeys?.shift?.normal || null;
  }
  if (key === 'backspace') return keyboard26?.systemKeys?.backspace || null;
  if (key === 'cnen') return keyboard26?.systemKeys?.cnen || null;
  if (key === '123') return keyboard26?.systemKeys?.numericSwitch || null;
  if (key === 'space') return keyboard26?.bottomForegrounds?.space || null;
  if (key === 'enter') {
    return state.previewState.enterType === 'default'
      ? (keyboard26?.bottomForegrounds?.enterDefault || null)
      : (keyboard26?.bottomForegrounds?.enterAccent || keyboard26?.bottomForegrounds?.enterDefault || null);
  }
  if (key === 'spaceRight') return variant?.spaceRight || null;
  return null;
}

function getToolbarPreviewStyleVars(project, button) {
  const iconBase = button?.fontSize ?? getProjectFontSize(project, 'toolbar鎸夐敭鍓嶆櫙sf绗﹀彿澶у皬', 16);
  const textBase = button?.fontSize ?? getProjectFontSize(project, 'toolbar鎸夐敭鍓嶆櫙鏂囧瓧澶у皬', 13);
  return {
    '--toolbar-icon-font-size': scalePreviewFontSize(iconBase, 1.42, 17, 34),
    '--toolbar-text-font-size': scalePreviewFontSize(textBase, 1.18, 12, 24),
  };
}

function getPreviewButtonStyleVars(project, spec, options = {}) {
  const fallbackKey = options.fallbackKey || '鎸夐敭鍓嶆櫙鏂囧瓧澶у皬';
  const fallbackText = getProjectFontSize(project, fallbackKey, 18);
  const primary = getPrimaryLabelSpec(spec);
  const secondary = getSecondaryLabelSpec(spec);
  const primaryBase = resolveSpecFontSize(project, primary || spec, fallbackText);
  const secondaryBase = resolveSpecFontSize(project, secondary, fallbackText - 3);
  const usesIcon = Boolean(primary?.systemImageName || spec?.label?.systemImageName);
  return {
    '--key-main-font-size': scalePreviewFontSize(primaryBase, usesIcon ? 1.45 : 1.32, 16, 38),
    '--key-secondary-font-size': scalePreviewFontSize(secondaryBase, 1.12, 11, 24),
    '--key-icon-font-size': usesIcon ? scalePreviewFontSize(primaryBase, 1.55, 18, 38) : null,
  };
}

function getNumericPreviewStyleVars(project, key, spec = null) {
  if (/^\d$/.test(key)) {
    return {
      '--key-main-font-size': scalePreviewFontSize(getProjectFontSize(project, '鏁板瓧閿洏鏁板瓧鍓嶆櫙瀛椾綋澶у皬', 20), 1.26, 18, 34),
    };
  }
  if (spec) return getPreviewButtonStyleVars(project, spec, { fallbackKey: '鎸夐敭鍓嶆櫙鏂囧瓧澶у皬' });
  return {
    '--key-main-font-size': scalePreviewFontSize(getProjectFontSize(project, '鎸夐敭鍓嶆櫙鏂囧瓧澶у皬', 18), 1.22, 16, 32),
  };
}

function getSymbolicPreviewStyleVars(project, spec = null) {
  if (spec) return getPreviewButtonStyleVars(project, spec, { fallbackKey: '鎸夐敭鍓嶆櫙鏂囧瓧澶у皬' });
  return {
    '--key-main-font-size': scalePreviewFontSize(getProjectFontSize(project, '鎸夐敭鍓嶆櫙鏂囧瓧澶у皬', 18), 1.22, 16, 32),
  };
}

function getPanelPreviewStyleVars(project, item) {
  const textSize = getProjectFontSize(project, 'panel鎸夐敭鍓嶆櫙鏂囧瓧澶у皬', 12);
  const iconSize = getProjectFontSize(project, 'panel鎸夐敭鍓嶆櫙sf绗﹀彿澶у皬', 16);
  return {
    '--panel-text-font-size': scalePreviewFontSize(textSize, 1.12, 12, 24),
    '--panel-icon-font-size': scalePreviewFontSize(iconSize, 1.18, 14, 28),
  };
}

const SWIPE_SHORTCUT_LABELS = {
  '#cut': 'cut',
  '#copy': 'copy',
  '#paste': 'paste',
  '#琛岄': 'home',
  '#琛屽熬': 'end',
  '#selectText': 'select',
  '#undo': 'undo',
  '#redo': 'redo',
  '#鏂规鍒囨崲': 'schema',
  '#RimeSwitcher': 'switch',
  '#娆￠€変笂灞?: '2nd',
  '#涓夐€変笂灞?: '3rd',
  '#keyboardPerformance': 'caps',
  '#Enter': 'enter',
};

const SWIPE_RAW_ACTION_LABELS = {
  tab: 'tab',
};

function getKeyboard26SwipeLibrary(project, variantName) {
  return variantName === 'alphabetic'
    ? (project.lib.swipeDataEn || {})
    : (project.lib.swipeData || {});
}

function resolveSwipeActionLabel(action) {
  if (action == null) return '';
  if (typeof action === 'string' || typeof action === 'number') {
    const rawValue = String(action);
    return SWIPE_RAW_ACTION_LABELS[rawValue] || rawValue;
  }
  if (typeof action !== 'object') return '';

  const [actionType, actionValue] = Object.entries(action)[0] || [];
  if (!actionType) return '';

  if (actionType === 'character' || actionType === 'symbol' || actionType === 'rawString') {
    return actionValue == null ? '' : String(actionValue);
  }

  if (actionType === 'shortcut') {
    const rawValue = String(actionValue || '');
    return SWIPE_SHORTCUT_LABELS[rawValue] || rawValue.replace(/^#/, '');
  }

  if (actionType === 'sendKeys' || actionType === 'keyboardType') {
    return actionValue == null ? '' : String(actionValue);
  }

  if (actionType === 'openURL') return 'URL';
  if (actionType === 'json') return 'JSON';

  return actionValue == null ? '' : String(actionValue);
}

function resolveSwipeEntryLabel(entry) {
  if (!entry || typeof entry !== 'object') return '';
  if (Object.prototype.hasOwnProperty.call(entry, 'label')) {
    return resolveLabel(entry.label) || '';
  }
  return resolveSwipeActionLabel(entry.action);
}

function getKeySwipeHints(project, variantName, key) {
  const swipeLibrary = getKeyboard26SwipeLibrary(project, variantName);
  const swipeUp = swipeLibrary.swipe_up || {};
  const swipeDown = swipeLibrary.swipe_down || {};
  const topHint = swipeUp.showLabel === false ? '' : resolveSwipeEntryLabel(swipeUp[key]);
  const bottomHint = swipeDown.showLabel === false ? '' : resolveSwipeEntryLabel(swipeDown[key]);
  return { topHint, bottomHint };
}

function parseKeyList(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getActiveClass(domain, key) {
  return state.selectedKeys[domain] === key ? ' active' : '';
}

function renderLabelGroup(labels, fallback) {
  const unique = labels.filter(Boolean);
  if (unique.length > 1) {
    return `<div class="multi-labels">${unique.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
  }
  return `<span class="main-label">${escapeHtml(unique[0] || fallback)}</span>`;
}

function renderSystemImagePreview(systemImageName, wrapperClass, svgClass) {
  if (!systemImageName) return '';
  const svg = renderSystemImageSvg(systemImageName, svgClass);
  if (svg) {
    return `<span class="${wrapperClass}" aria-hidden="true">${svg}</span>`;
  }
  const fallback = resolveLabel({ systemImageName });
  return fallback ? `<span class="${wrapperClass}" aria-hidden="true">${escapeHtml(fallback)}</span>` : '';
}

function normalizePreviewClassName(value) {
  return String(value || '')
    .replaceAll(/[^a-zA-Z0-9_-]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .toLowerCase();
}

function renderMarkupKey(content, style, options = {}) {
  const key = options.key || '';
  return renderKeyFrame(key, style, content, options);
}

function renderKeyboardKeyIcon(systemImageName, key, style, options = {}) {
  const icon = renderSystemImagePreview(systemImageName, 'key-icon', 'key-icon-svg');
  return renderMarkupKey(icon || `<span class="main-label">${escapeHtml(key)}</span>`, style, { ...options, key });
}

function getPreviewPressAnimationConfig() {
  const animation = state.project?.lib?.theme?.animation?.['26閿寜閿姩鐢?] || {};
  return {
    scale: parsePreviewNumber(animation.scale) ?? 0.87,
    pressDuration: parsePreviewNumber(animation.pressDuration) ?? 60,
    releaseDuration: parsePreviewNumber(animation.releaseDuration) ?? 80,
  };
}

function clearPreviewInteractionTimer(name) {
  const timer = state.previewInteraction[name];
  if (timer) {
    clearTimeout(timer);
    state.previewInteraction[name] = null;
  }
}

function resetPreviewInteraction(options = {}) {
  const nextSuppressClick = options.keepSuppressClick ? state.previewInteraction.suppressClick : false;
  clearPreviewInteractionTimer('longPressTimer');
  clearPreviewInteractionTimer('releaseTimer');
  state.previewInteraction = {
    ...createPreviewInteractionState(),
    suppressClick: nextSuppressClick,
  };
}

function schedulePreviewInteractionReset(delay = 0) {
  clearPreviewInteractionTimer('releaseTimer');
  state.previewInteraction.releaseTimer = window.setTimeout(() => {
    resetPreviewInteraction();
    renderPreview();
  }, delay);
}

function getPreviewHintGroup(domain) {
  if (domain === 'keyboard26') return 'pinyin';
  if (domain === 'numeric') return 'number';
  return '';
}

function normalizePreviewHintKey(domain, key) {
  if (domain === 'keyboard26' && key === 'cnen') return 'symbol';
  return key;
}

function getPreviewLongPressEntry(domain, key) {
  const group = getPreviewHintGroup(domain);
  if (!group) return null;
  const hintData = state.project?.lib?.hintSymbolsData || {};
  const groupData = hintData[group] || {};
  return groupData[normalizePreviewHintKey(domain, key)] || null;
}

function isPreviewKeyPressed(domain, key) {
  return state.previewInteraction.pressedDomain === domain && state.previewInteraction.pressedKey === key;
}

function shouldRenderPreviewPressBubble(domain, key) {
  if (!['keyboard26', 'numeric', 'symbolic'].includes(domain)) return false;
  return /^[a-z0-9]$/i.test(key) || [',', '.', 'spaceRight'].includes(key);
}

function renderPreviewPopupLabel(spec, fallback = '') {
  const systemImageName = spec?.label?.systemImageName;
  if (systemImageName) {
    return renderSystemImagePreview(systemImageName, 'preview-popup-icon', 'preview-popup-icon-svg')
      || `<span class="preview-popup-text">${escapeHtml(resolveLabel({ systemImageName }) || fallback)}</span>`;
  }
  const labels = collectLabels(spec, fallback).filter(Boolean);
  return `<span class="preview-popup-text">${escapeHtml(labels[0] || fallback)}</span>`;
}

function renderPreviewInteractionOverlay(domain, key, content) {
  if (!isPreviewKeyPressed(domain, key)) return '';

  if (state.previewInteraction.mode === 'longpress') {
    const entry = getPreviewLongPressEntry(domain, key);
    if (!entry?.list?.length) return '';
    const selectedIndex = clampPreviewValue(Number(entry.selectedIndex) || 0, 0, Math.max(entry.list.length - 1, 0));
    const width = parsePreviewNumber(entry.size?.width) || 44;
    const height = parsePreviewNumber(entry.size?.height) || 54;
    return `
      <div class="preview-longpress-tray" style="--preview-hint-item-width:${width}px;--preview-hint-item-height:${height}px;" aria-hidden="true">
        ${entry.list.map((item, index) => `
          <div class="preview-longpress-item ${index === selectedIndex ? 'active' : ''}">
            ${renderPreviewPopupLabel(item, String(index + 1))}
          </div>
        `).join('')}
      </div>
    `;
  }

  if (state.previewInteraction.mode === 'press' || state.previewInteraction.mode === 'release') {
    if (!shouldRenderPreviewPressBubble(domain, key)) return '';
    return `
      <div class="preview-press-bubble" aria-hidden="true">
        <div class="preview-press-bubble-cap">${content}</div>
      </div>
    `;
  }

  return '';
}

function renderKeyFrame(key, style, content, options = {}) {
  const className = options.className || 'key key-system';
  const domain = options.domain || 'keyboard26';
  const topHint = options.topHint ? `<span class="swipe-hint swipe-hint-top">${escapeHtml(options.topHint)}</span>` : '';
  const bottomHint = options.bottomHint ? `<span class="swipe-hint swipe-hint-bottom">${escapeHtml(options.bottomHint)}</span>` : '';
  const subLabel = options.subLabel ? `<span class="sub-label">${escapeHtml(options.subLabel)}</span>` : '';
  const pressAnimation = getPreviewPressAnimationConfig();
  const styleText = mergeInlineStyles(
    style,
    serializeStyleVars(options.styleVars),
    `--preview-press-scale:${pressAnimation.scale};--preview-press-duration:${pressAnimation.pressDuration}ms;--preview-release-duration:${pressAnimation.releaseDuration}ms;`
  );
  const extraClasses = [
    className,
    getActiveClass(domain, key).trim(),
    isPreviewKeyPressed(domain, key) ? `is-${state.previewInteraction.mode}` : '',
    key ? `key-id-${normalizePreviewClassName(key)}` : '',
    options.subLabel ? 'has-sub-label' : '',
    options.topHint ? 'has-top-hint' : '',
    options.bottomHint ? 'has-bottom-hint' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<div class="${extraClasses}" data-key="${escapeHtml(key)}" data-domain="${domain}" style="${styleText}">${renderPreviewInteractionOverlay(domain, key, content)}${subLabel}${topHint}${bottomHint}<div class="key-content">${content}</div></div>`;
}

function renderConfiguredKey(key, spec, style, options = {}) {
  const fallbackLabel = options.fallbackLabel || key;
  const labels = collectLabels(spec, fallbackLabel);
  return renderKeyFrame(key, style, renderLabelGroup(labels, fallbackLabel), options);
}

function renderPlainKey(content, style, options = {}) {
  const key = options.key || content;
  return renderKeyFrame(key, style, `<span class="main-label">${escapeHtml(content)}</span>`, options);
}

function mergeKeyboard26Buttons(project, variantName) {
  const root = project.lib.keyboard26 || {};
  const variant = root[variantName] || {};
  return {
    ...(root.buttons || {}),
    ...(root.customKeys || {}),
    ...(variant.buttons || {}),
    ...(variant.customKeys || {}),
  };
}

function buildKeyboard26Preview(project, variantName, themeName, orientation) {
  const layout = project.lib.layout.keyboard26?.[orientation];
  const keyboard26 = project.lib.keyboard26 || {};
  const variant = keyboard26[variantName] || {};
  const buttons = mergeKeyboard26Buttons(project, variantName);
  const theme = getThemeSpec(project, themeName);
  const domain = 'keyboard26';

  const renderKey = (key) => {
    const isLetter = /^[a-z]$/.test(key);
    const pressed = isPreviewKeyPressed(domain, key);
    const foregroundSpec = getKeyboard26PreviewForegroundSpec(keyboard26, variantName, key, buttons);
    const keyStyle = getKeyStyle(theme, !isLetter, { spec: foregroundSpec, pressed });
    const keyClass = isLetter ? 'key key-letter' : 'key key-system';
    const swipeHints = getKeySwipeHints(project, variantName, key);
    const keyStyleVars = getKeyboard26Typography(project, variantName, keyboard26, variant, key, buttons[key] || null);

    if (buttons[key]) {
      return renderConfiguredKey(key, buttons[key], keyStyle, {
        className: keyClass,
        domain,
        styleVars: keyStyleVars,
        fallbackLabel: isLetter ? getLetterPreviewLabel(key, variantName) : key,
        ...swipeHints,
      });
    }

    if (isLetter) {
      return renderPlainKey(getLetterPreviewLabel(key, variantName), getKeyStyle(theme, false, { spec: foregroundSpec, pressed }), {
        className: 'key key-letter',
        domain,
        key,
        styleVars: keyStyleVars,
        ...swipeHints,
      });
    }

    if (key === 'shift') {
      const subLabel = state.previewState.shift === 'normal'
        ? ''
        : state.previewState.shift === 'upper'
          ? '澶у啓'
          : '閿佸畾';
      const systemImageName = state.previewState.shift === 'locked' ? 'capslock.fill' : 'shift.fill';
      return renderKeyboardKeyIcon(systemImageName, key, keyStyle, { className: keyClass, domain, subLabel, styleVars: keyStyleVars, ...swipeHints });
    }
    if (key === 'backspace') {
      return renderKeyboardKeyIcon('delete.left', key, keyStyle, { className: keyClass, domain, styleVars: keyStyleVars, ...swipeHints });
    }
    if (key === 'cnen') {
      return renderKeyboardKeyIcon('globe', key, keyStyle, { className: keyClass, domain, styleVars: keyStyleVars, ...swipeHints });
    }
    if (key === '123') return renderPlainKey('123', keyStyle, { className: keyClass, domain, key, styleVars: keyStyleVars, ...swipeHints });
    if (key === 'enter') return renderPlainKey(getEnterPreviewLabel(keyboard26), keyStyle, { className: keyClass, domain, key, styleVars: keyStyleVars, ...swipeHints });
    if (key === 'spaceRight') {
      return renderConfiguredKey(key, variant.spaceRight, getKeyStyle(theme, false, { spec: foregroundSpec, pressed }), {
        className: keyClass,
        domain,
        styleVars: getKeyboard26Typography(project, variantName, keyboard26, variant, key, variant.spaceRight),
        ...swipeHints,
      });
    }
    if (key === 'space') {
      const subLabel = getKeyboardSpaceSubLabel(variantName, variant);
      return renderPlainKey(variant.spaceLabel || '绌烘牸', getKeyStyle(theme, false, { spec: foregroundSpec, pressed }), {
        className: keyClass,
        domain,
        key,
        subLabel,
        styleVars: keyStyleVars,
        ...swipeHints,
      });
    }

    return renderPlainKey(key, keyStyle, { className: keyClass, domain, key, styleVars: keyStyleVars, ...swipeHints });
  };

  const renderNamedRow = (row, rowName = '') => {
    const extraClass = rowName ? ` row-${rowName}` : '';
    return `<div class="row${extraClass}">${row.map(renderKey).join('')}</div>`;
  };

  if (!layout?.layout) {
    return '<div class="preview-empty">褰撳墠甯冨眬鏁版嵁涓嶅彲鐢?/div>';
  }

  if (orientation === 'portrait') {
    return `
      ${renderNamedRow(layout.layout.top, 'top')}
      ${renderNamedRow(layout.layout.middle, 'middle')}
      ${renderNamedRow(layout.layout.bottom, 'bottom')}
      ${renderNamedRow(layout.layout.footer, 'footer')}
    `;
  }

  return `
    <div class="landscape-grid">
      <div>
        ${renderNamedRow(layout.layout.left.top, 'top')}
        ${renderNamedRow(layout.layout.left.middle, 'middle')}
        ${renderNamedRow(layout.layout.left.bottom, 'bottom')}
        ${renderNamedRow(layout.layout.left.footer, 'footer')}
      </div>
      <div>
        ${renderNamedRow(layout.layout.right.top, 'top')}
        ${renderNamedRow(layout.layout.right.middle, 'middle')}
        ${renderNamedRow(layout.layout.right.bottom, 'bottom')}
        ${renderNamedRow(layout.layout.right.footer, 'footer')}
      </div>
    </div>
  `;
}

function buildNumericPreview(project, themeName, orientation) {
  const theme = getThemeSpec(project, themeName);
  const keyboardBackground = getKeyboardWorkbenchBackground(themeName, theme);
  const numeric = project.lib.numeric?.buttons || {};
  const layout = project.lib.layout.numeric?.[orientation];
  const domain = 'numeric';

  const renderNumericKey = (key) => {
    const pressed = isPreviewKeyPressed(domain, key);
    const spec = numeric[key] || null;
    if (spec && /^\d$/.test(key)) {
      return renderConfiguredKey(key, spec, getKeyStyle(theme, false, { spec, pressed }), {
        className: 'key key-letter',
        domain,
        key,
        fallbackLabel: key,
        styleVars: getNumericPreviewStyleVars(project, key, spec),
      });
    }
    if (/^\d$/.test(key)) {
      return renderPlainKey(key, getKeyStyle(theme, false, { pressed }), {
        className: 'key key-letter',
        domain,
        key,
        styleVars: getNumericPreviewStyleVars(project, key),
      });
    }

    if (key === 'collection' || key === 'category' || key === 'description') {
      const text = collectLabels(spec, key)[0] || key;
      return `<div class="collection-box${getActiveClass(domain, key)}" data-key="${escapeHtml(key)}" data-domain="${domain}" style="${getKeyStyle(theme, true, { spec, pressed })}">${escapeHtml(text)}</div>`;
    }

    if (spec) {
      return renderConfiguredKey(key, spec, getKeyStyle(theme, true, { spec, pressed }), {
        domain,
        fallbackLabel: key,
        styleVars: getNumericPreviewStyleVars(project, key, spec),
      });
    }

    return renderPlainKey(key, getKeyStyle(theme, true, { pressed }), {
      domain,
      key,
      styleVars: getNumericPreviewStyleVars(project, key),
    });
  };

  if (!layout?.layout) {
    return '<div class="preview-empty">褰撳墠鏁板瓧閿洏甯冨眬涓嶅彲鐢?/div>';
  }

  if (orientation === 'portrait') {
    const columns = ['left', 'main1', 'main2', 'main3', 'right'];
    return `
      <div class="preview-keyboard" style="background:${keyboardBackground}">
        <div class="numeric-portrait-grid">
          ${columns
            .map((column) => `<div class="numeric-portrait-column">${layout.layout[column].map(renderNumericKey).join('')}</div>`)
            .join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="preview-keyboard" style="background:${keyboardBackground}">
      <div class="numeric-landscape-grid">
        <div class="numeric-landscape-panel">
          <div class="row">${layout.layout.symbolArea.top.map(renderNumericKey).join('')}</div>
          <div class="row">${layout.layout.symbolArea.bottom.map(renderNumericKey).join('')}</div>
        </div>
        <div class="numeric-landscape-panel">
          ${['left', 'main1', 'main2', 'main3', 'right']
            .map((column) => `<div class="row">${layout.layout.numberArea[column].map(renderNumericKey).join('')}</div>`)
            .join('')}
        </div>
      </div>
    </div>
  `;
}

function buildSymbolicPreview(project, themeName, orientation) {
  const theme = getThemeSpec(project, themeName);
  const keyboardBackground = getKeyboardWorkbenchBackground(themeName, theme);
  const symbolic = project.lib.symbolic?.buttons || {};
  const layout = project.lib.layout.symbolic?.[orientation] || project.lib.layout.symbolic?.portrait;
  const domain = 'symbolic';

  const renderSymbolicKey = (key) => {
    const pressed = isPreviewKeyPressed(domain, key);
    const spec = symbolic[key] || null;
    if (key === 'category' || key === 'description') {
      const text = collectLabels(spec, key)[0] || key;
      return `<div class="collection-box${getActiveClass(domain, key)}" data-key="${escapeHtml(key)}" data-domain="${domain}" style="${getKeyStyle(theme, true, { spec, pressed })}">${escapeHtml(text)}</div>`;
    }

    if (spec) {
      return renderConfiguredKey(key, spec, getKeyStyle(theme, true, { spec, pressed }), {
        domain,
        fallbackLabel: key,
        styleVars: getSymbolicPreviewStyleVars(project, spec),
      });
    }

    return renderPlainKey(key, getKeyStyle(theme, true, { pressed }), {
      domain,
      key,
      styleVars: getSymbolicPreviewStyleVars(project),
    });
  };

  if (!layout?.layout) {
    return '<div class="preview-empty">褰撳墠绗﹀彿閿洏甯冨眬涓嶅彲鐢?/div>';
  }

  return `
    <div class="preview-keyboard" style="background:${keyboardBackground}">
      <div class="row">${layout.layout.top.map(renderSymbolicKey).join('')}</div>
      <div class="row">${layout.layout.bottom.map(renderSymbolicKey).join('')}</div>
    </div>
  `;
}

function renderPanelButton(key, item, theme) {
  const icon = item?.label?.systemImageName
    ? renderSystemImagePreview(item.label.systemImageName, 'panel-icon', 'panel-icon-svg')
    : '';
  const text = item?.label?.text || collectLabels(item, key)[0] || key;
  const styleText = mergeInlineStyles(
    getKeyStyle(theme, true, { spec: item, pressed: isPreviewKeyPressed('panel', key) }),
    serializeStyleVars(getPanelPreviewStyleVars(state.project, item))
  );
  return `
    <div class="panel-card${getActiveClass('panel', key)}" data-key="${escapeHtml(key)}" data-domain="panel" style="${styleText}">
      ${icon}
      <span class="panel-text">${escapeHtml(text)}</span>
    </div>
  `;
}

function getToolbarPreviewLayout(project) {
  const toolbar = project.lib.toolbar || {};
  if (state.previewType === 'alphabetic') {
    return toolbar.english?.layout?.length ? toolbar.english.layout : toolbar.default?.layout || [];
  }
  return toolbar.default?.layout || [];
}

function getToolbarPreviewButton(project, key) {
  const toolbar = project.lib.toolbar || {};
  const defaultButton = toolbar.default?.buttons?.[key] || {};
  const englishOverride = toolbar.english?.overrides?.[key] || {};
  return state.previewType === 'alphabetic'
    ? { ...defaultButton, ...englishOverride }
    : defaultButton;
}

function renderToolbarPreviewButton(project, theme, key) {
  const button = getToolbarPreviewButton(project, key);
  const systemImageName = button.label?.systemImageName || '';
  const icon = systemImageName
    ? renderSystemImagePreview(systemImageName, 'toolbar-preview-icon', 'toolbar-preview-icon-svg')
    : '';
  const labelText = button.label?.text || (!icon ? (button.key || key) : '');
  const text = labelText
    ? `<span class="toolbar-preview-text">${escapeHtml(labelText)}</span>`
    : '';
  const extraClass = icon && !labelText ? ' icon-only' : '';
  const interactionClass = isPreviewKeyPressed('toolbar', key) ? ` is-${state.previewInteraction.mode}` : '';
  const pressAnimation = getPreviewPressAnimationConfig();
  const styleText = mergeInlineStyles(
    getKeyStyle(theme, true, {
      spec: button,
      pressed: isPreviewKeyPressed('toolbar', key),
      fallbackForegroundKey: 'toolbar鎸夐敭棰滆壊',
    }),
    serializeStyleVars(getToolbarPreviewStyleVars(project, button)),
    `--preview-press-scale:${pressAnimation.scale};--preview-press-duration:${pressAnimation.pressDuration}ms;--preview-release-duration:${pressAnimation.releaseDuration}ms;`
  );
  const iconAttr = systemImageName ? ` data-icon-name="${escapeHtml(systemImageName)}"` : '';
  return `
    <button class="toolbar-preview-button${extraClass}${getActiveClass('toolbar', key)}${interactionClass}" type="button" title="${escapeHtml(button.key || key)}" data-key="${escapeHtml(key)}" data-domain="toolbar"${iconAttr} style="${styleText}">
      ${icon}
      ${text}
    </button>
  `;
}

function buildToolbarPreview(project, themeName) {
  const theme = getThemeSpec(project, themeName);
  const layout = getToolbarPreviewLayout(project);
  if (!layout.length) return '';
  return `
    <div class="toolbar-preview-row">
      ${layout.map((key) => renderToolbarPreviewButton(project, theme, key)).join('')}
    </div>
  `;
}

function isIntegratedKeyboardPreview(type = state.previewType) {
  return type === 'pinyin' || type === 'alphabetic';
}

function renderIntegratedPreviewContext(themeName) {
  const isDark = themeName === 'dark';
  const bubbleStyle = isDark
    ? 'background:rgba(84, 98, 132, 0.64);color:#f5f7fb;'
    : 'background:#c98a88;color:#fff8f7;';
  const inputStyle = isDark
    ? 'background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.12);'
    : 'background:rgba(255,255,255,0.96);border-color:rgba(190,198,214,0.6);';

  return `
    <div class="preview-app-shell ${isDark ? 'dark' : ''}">
      <div class="preview-app-header">
        <button class="preview-app-back" type="button" tabindex="-1" aria-hidden="true">鈥?/button>
        <div class="preview-app-title">閿洏棰勮</div>
        <div class="preview-app-header-gap"></div>
      </div>
      <div class="preview-app-thread">
        <div class="preview-chat-bubble" style="${bubbleStyle}">浣犲ソ</div>
      </div>
      <div class="preview-input-wrap">
        <div class="preview-input-bar" style="${inputStyle}">
          <span class="preview-input-caret"></span>
        </div>
      </div>
    </div>
  `;
}

function renderKeyboardAccessoryBar() {
  const leftIcon = renderSystemImagePreview('globe', 'keyboard-accessory-icon', 'keyboard-accessory-icon-svg');
  const rightIcon = renderSystemImagePreview('mic', 'keyboard-accessory-icon', 'keyboard-accessory-icon-svg');
  return `
    <div class="keyboard-accessory-bar" aria-hidden="true">
      <span class="keyboard-accessory-icon-wrap keyboard-accessory-icon-left">${leftIcon}</span>
      <span class="keyboard-accessory-spacer"></span>
      <span class="keyboard-accessory-icon-wrap keyboard-accessory-icon-right">${rightIcon}</span>
    </div>
  `;
}

function isPlaceholderKeyboardBackgroundColor(value) {
  if (typeof value !== 'string') return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return [
    '#d0d3da',
    '#d0d3da01',
    '#e5e5ea',
    '#e5e5ea00',
    '#474747',
    '#47474701',
    'transparent',
    'rgba(0,0,0,0)',
    'rgba(0, 0, 0, 0)',
  ].includes(normalized);
}

function getKeyboardWorkbenchBackground(themeName, theme) {
  const configured = theme['閿洏鑳屾櫙棰滆壊'];
  if (configured && !isPlaceholderKeyboardBackgroundColor(configured)) {
    return configured;
  }
  return themeName === 'dark' ? '#353842' : '#d7dbe7';
}

function getPreviewSurfaceStyle(project, themeName) {
  const theme = getThemeSpec(project, themeName);
  const isDark = themeName === 'dark';
  const toolbarColor = resolveThemeColorValue(theme, 'toolbar鎸夐敭棰滆壊', isDark ? '#f2f2f7' : '#4a4d57');
  const keyboardBackground = getKeyboardWorkbenchBackground(themeName, theme);
  return serializeStyleVars({
    '--preview-surface-bg': isDark
      ? 'radial-gradient(circle at 50% -14%, rgba(120, 132, 176, 0.22), transparent 34%), linear-gradient(180deg, #1b1f29 0%, #0f1218 100%)'
      : 'radial-gradient(circle at 50% -14%, rgba(255, 255, 255, 0.82), transparent 32%), linear-gradient(180deg, #f8f7fb 0%, #edf0f7 100%)',
    '--preview-surface-border': isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(220, 224, 234, 0.96)',
    '--preview-surface-shadow': isDark
      ? 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 24px 46px rgba(0, 0, 0, 0.34)'
      : 'inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 20px 40px rgba(126, 132, 145, 0.14)',
    '--preview-surface-glow': isDark
      ? 'radial-gradient(circle at 50% 0%, rgba(166, 178, 220, 0.12), transparent 38%)'
      : 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.6), transparent 40%)',
    '--preview-stage-overlay': isDark
      ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.05) 100%)',
    '--preview-toolbar-color': toolbarColor,
    '--preview-toolbar-edge-color': isDark ? '#f4f5f8' : '#59606c',
    '--preview-toolbar-divider': isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(129, 134, 145, 0.22)',
    '--preview-toolbar-press-bg': isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(92, 98, 110, 0.12)',
    '--preview-keyboard-stage': keyboardBackground,
    '--preview-keyboard-border': isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(195, 199, 209, 0.88)',
    '--preview-keyboard-shadow': isDark
      ? '0 18px 42px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
      : '0 18px 40px rgba(137, 143, 155, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.28)',
    '--preview-key-border': isDark ? 'rgba(15, 16, 20, 0.42)' : 'rgba(182, 187, 197, 0.92)',
    '--preview-key-shadow': isDark
      ? 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 1px 0 rgba(0, 0, 0, 0.28), 0 4px 10px rgba(0, 0, 0, 0.14)'
      : 'inset 0 1px 0 rgba(255, 255, 255, 0.98), 0 1px 0 rgba(151, 156, 168, 0.78), 0 2px 6px rgba(120, 128, 141, 0.05)',
    '--preview-key-press-shadow': isDark
      ? 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 1px 2px rgba(0, 0, 0, 0.12)'
      : 'inset 0 1px 0 rgba(255, 255, 255, 0.88), 0 1px 2px rgba(120, 128, 141, 0.08)',
    '--preview-accessory-color': toolbarColor,
  });
}

function renderPreviewSurface(project, themeName, content) {
  const className = [
    'preview-surface',
    state.theme === 'dark' ? 'dark' : '',
    `preview-${state.previewType}`,
    `preview-${state.orientation}`,
  ].filter(Boolean).join(' ');
  return `<div class="${className}" style="${getPreviewSurfaceStyle(project, themeName)}">${content}</div>`;
}

function wrapPreviewContent(project, themeName, content) {
  const toolbarContent = buildToolbarPreview(project, themeName);
  if (isIntegratedKeyboardPreview()) {
    const theme = getThemeSpec(project, themeName);
    const scaleStyle = getPreviewScaleStyle(project, state.orientation);
    const keyboardBackground = getKeyboardWorkbenchBackground(themeName, theme);
    return `
      <div class="preview-keyboard integrated-preview-keyboard" style="background:${keyboardBackground};--keyboard-stage-background:${keyboardBackground};--preview-keyboard-stage:${keyboardBackground};${scaleStyle}">
        <div class="keyboard-preview-topbar">
          ${toolbarContent}
        </div>
        <div class="keyboard-preview-deck">
          ${content}
        </div>
        ${renderKeyboardAccessoryBar()}
      </div>
    `;
  }
  return content;
}

function buildPanelPreview(project, themeName) {
  const theme = getThemeSpec(project, themeName);
  const keyboardBackground = getKeyboardWorkbenchBackground(themeName, theme);
  const panel = project.lib.panel || {};
  const rows = Array.isArray(panel.layout) ? panel.layout : [];
  const buttons = panel.buttons || {};

  if (!rows.length) {
    return '<div class="preview-empty">褰撳墠闈㈡澘甯冨眬涓嶅彲鐢?/div>';
  }

  return `
    <div class="preview-keyboard panel-preview" style="background:${keyboardBackground}">
      ${rows
        .map((row) => `<div class="panel-row">${row.map((key) => renderPanelButton(key, buttons[key], theme)).join('')}</div>`)
        .join('')}
    </div>
  `;
}

function renderPreview() {
  if (!state.project) return;
  let content = '';

  if (state.previewType === 'pinyin' || state.previewType === 'alphabetic') {
    content = buildKeyboard26Preview(state.project, state.previewType, state.theme, state.orientation);
  } else if (state.previewType === 'numeric') {
    content = buildNumericPreview(state.project, state.theme, state.orientation);
  } else if (state.previewType === 'symbolic') {
    content = buildSymbolicPreview(state.project, state.theme, state.orientation);
  } else {
    content = buildPanelPreview(state.project, state.theme);
  }

  el.previewTitle.textContent = '閿洏棰勮';
  const previewTypeLabels = {
    pinyin: '涓枃 26 閿?,
    alphabetic: '鑻辨枃 26 閿?,
    numeric: '鏁板瓧閿洏',
    symbolic: '绗﹀彿閿洏',
    panel: '闈㈡澘',
  };
  const orientationLabels = {
    portrait: '绔栧睆',
    landscape: '妯睆',
  };
  const themeLabels = {
    light: '娴呰壊涓婚',
    dark: '娣辫壊涓婚',
  };
  const previewLabel = previewTypeLabels[state.previewType] || state.previewType;
  const orientationLabel = orientationLabels[state.orientation] || state.orientation;
  const themeLabel = themeLabels[state.theme] || state.theme;
  if (el.previewDesc) {
    el.previewDesc.textContent = '';
    el.previewDesc.hidden = true;
  }
  if (el.previewMetaType) el.previewMetaType.textContent = `閿洏锛?{previewLabel}`;
  if (el.previewMetaOrientation) el.previewMetaOrientation.textContent = `鏂瑰悜锛?{orientationLabel}`;
  if (el.previewMetaTheme) el.previewMetaTheme.textContent = `涓婚锛?{themeLabel}`;
  el.projectName.textContent = getProjectMetaResolvedValue(state.project, 'projectName');
  renderTemplateInfo();
  el.previewRoot.dataset.theme = state.theme;
  el.previewRoot.innerHTML = renderPreviewSurface(state.project, state.theme, wrapPreviewContent(state.project, state.theme, content));
}

function renderSections() {
  el.sectionList.innerHTML = getDisplaySections()
    .map((section) => {
      const isActive = section.key === 'lib.swipeData'
        ? isSwipeSectionKey(state.activeSection)
        : section.key === state.activeSection;
      return `
      <button class="section-item ${isActive ? 'active' : ''}" data-section="${section.key}">
        <span class="section-item-title">${section.label}</span>
      </button>
    `;
    })
    .join('');
}

function getVisualEditorType() {
  if (state.activeSection === 'mapping') return 'mapping';
  if (state.activeSection === 'lib.color') return 'color';
  if (state.activeSection === 'lib.fontSize') return 'fontSize';
  if (state.activeSection === 'lib.theme') return 'theme';
  if (state.activeSection === 'lib.others') return 'others';
  if (state.activeSection === 'lib.layout') return 'layout';
  if (state.activeSection === 'lib.toolbar') return 'toolbar';
  if (state.activeSection === 'lib.hintSymbolsData') return 'hintSymbolsData';
  if (state.activeSection === 'lib.swipeData' || state.activeSection === 'lib.swipeDataEn') return 'swipeData';
  if (state.activeSection === 'lib.collectionData') return 'collectionData';
  if (['lib.keyboard26', 'lib.numeric', 'lib.symbolic', 'lib.panel'].includes(state.activeSection)) return 'button';
  return 'unsupported';
}

function flattenRows(rows) {
  return [...new Set(rows.flatMap((row) => row))];
}

function ensureSelectedDataKey(key, options, fallback = null) {
  if (!options.length) {
    state.selectedData[key] = fallback;
    return fallback;
  }

  if (!options.includes(state.selectedData[key])) {
    state.selectedData[key] = fallback && options.includes(fallback) ? fallback : options[0];
  }

  return state.selectedData[key];
}

function parseSymbolLine(line) {
  const text = String(line || '').trim();
  if (!text) return null;
  const parts = text.split('|').map((item) => item.trim());
  if (parts.length >= 3) {
    return {
      action: { [parts[1] || 'character']: parts.slice(2).join('|') },
      label: parts[0],
    };
  }
  return text;
}

function serializeSymbolEntry(entry) {
  if (typeof entry === 'string') return entry;
  const label = typeof entry?.label === 'string' ? entry.label : entry?.label?.text || '';
  const action = entry?.action || {};
  const actionKey = Object.keys(action)[0] || 'character';
  const actionValue = action[actionKey] ?? '';
  return `${label}|${actionKey}|${actionValue}`;
}

function parsePinyin9Line(line) {
  const text = String(line || '').trim();
  if (!text) return null;
  const parts = text.split('|').map((item) => item.trim());
  if (parts.length >= 2) {
    return { label: parts[0], value: parts.slice(1).join('|') };
  }
  return { label: text, value: text };
}

function serializePinyin9Entry(entry) {
  if (!entry || typeof entry !== 'object') return '';
  return `${entry.label || ''}|${entry.value || ''}`;
}

function getKeyboard26Rows(orientation) {
  const layout = state.project.lib.layout.keyboard26?.[orientation]?.layout || {};
  if (orientation === 'portrait') {
    return [
      { key: 'top', label: '椤惰', values: layout.top || [] },
      { key: 'middle', label: '涓', values: layout.middle || [] },
      { key: 'bottom', label: '搴曡', values: layout.bottom || [] },
      { key: 'footer', label: '鍔熻兘琛?, values: layout.footer || [] },
    ];
  }

  return [
    { key: 'left.top', label: '宸︿笂', values: layout.left?.top || [] },
    { key: 'left.middle', label: '宸︿腑', values: layout.left?.middle || [] },
    { key: 'left.bottom', label: '宸︿笅', values: layout.left?.bottom || [] },
    { key: 'left.footer', label: '宸﹀姛鑳?, values: layout.left?.footer || [] },
    { key: 'right.top', label: '鍙充笂', values: layout.right?.top || [] },
    { key: 'right.middle', label: '鍙充腑', values: layout.right?.middle || [] },
    { key: 'right.bottom', label: '鍙充笅', values: layout.right?.bottom || [] },
    { key: 'right.footer', label: '鍙冲姛鑳?, values: layout.right?.footer || [] },
  ];
}

function getNumericRows(orientation) {
  const layout = state.project.lib.layout.numeric?.[orientation]?.layout || {};
  if (orientation === 'portrait') {
    return [
      { key: 'left', label: '宸﹀垪', values: layout.left || [] },
      { key: 'main1', label: '涓诲垪 1', values: layout.main1 || [] },
      { key: 'main2', label: '涓诲垪 2', values: layout.main2 || [] },
      { key: 'main3', label: '涓诲垪 3', values: layout.main3 || [] },
      { key: 'right', label: '鍙冲垪', values: layout.right || [] },
    ];
  }

  return [
    { key: 'symbolArea.top', label: '绗﹀彿鍖轰笂', values: layout.symbolArea?.top || [] },
    { key: 'symbolArea.bottom', label: '绗﹀彿鍖轰笅', values: layout.symbolArea?.bottom || [] },
    { key: 'numberArea.left', label: '鏁板瓧鍖哄乏', values: layout.numberArea?.left || [] },
    { key: 'numberArea.main1', label: '鏁板瓧鍖?1', values: layout.numberArea?.main1 || [] },
    { key: 'numberArea.main2', label: '鏁板瓧鍖?2', values: layout.numberArea?.main2 || [] },
    { key: 'numberArea.main3', label: '鏁板瓧鍖?3', values: layout.numberArea?.main3 || [] },
    { key: 'numberArea.right', label: '鏁板瓧鍖哄彸', values: layout.numberArea?.right || [] },
  ];
}

function getSymbolicRows() {
  const layout = state.project.lib.layout.symbolic?.portrait?.layout || {};
  return [
    { key: 'top', label: '涓婃帓', values: layout.top || [] },
    { key: 'bottom', label: '涓嬫帓', values: layout.bottom || [] },
  ];
}

function getPanelRows() {
  return (state.project.lib.panel?.layout || []).map((row, index) => ({
    key: String(index),
    label: `绗?${index + 1} 琛宍,
    values: row,
  }));
}

function getCurrentLayoutDefinition() {
  if (state.previewType === 'pinyin' || state.previewType === 'alphabetic') {
    return {
      title: `${state.previewType} / ${state.orientation} / 26 閿竷灞€`,
      hint: '鐩存帴淇敼鐭敭鍚嶉『搴忥紱澧炲姞鏂伴敭鍚庯紝鍐嶅埌 26 閿寜閽腑涓鸿閿ˉ閰嶇疆鍗冲彲銆?,
      rows: getKeyboard26Rows(state.orientation),
      kind: 'keyboard26',
    };
  }

  if (state.previewType === 'numeric') {
    return {
      title: `${state.orientation} / 鏁板瓧閿洏甯冨眬`,
      hint: '鍒楀唴鎸夐『搴忓～鍐欑煭閿悕锛屾柊澧炵煭閿悗鍒版暟瀛楅敭鐩樻寜閽腑琛ユ寜閽厤缃€?,
      rows: getNumericRows(state.orientation),
      kind: 'numeric',
    };
  }

  if (state.previewType === 'symbolic') {
    return {
      title: '绗﹀彿閿洏甯冨眬',
      hint: '褰撳墠鍏堟寜 portrait 缁撴瀯缂栬緫绗﹀彿閿洏銆?,
      rows: getSymbolicRows(),
      kind: 'symbolic',
    };
  }

  return {
    title: '闈㈡澘甯冨眬',
    hint: '姣忎竴琛岀敤閫楀彿鍒嗛殧鐭敭鍚嶏紱鏂板琛屽悗鍒伴潰鏉挎寜閽腑琛ュ唴瀹归厤缃€?,
    rows: getPanelRows(),
    kind: 'panel',
  };
}

function getCurrentLayoutInsetsTarget(ensure = false) {
  if (ensure) {
    state.project.lib.layout = state.project.lib.layout && typeof state.project.lib.layout === 'object'
      ? state.project.lib.layout
      : {};
  }
  const layoutLib = state.project.lib.layout || {};

  const ensureFrameInsets = (target, fallbackInsets) => {
    if (!target || typeof target !== 'object') return null;
    if (ensure) {
      target.frame = target.frame && typeof target.frame === 'object' ? target.frame : {};
      target.frame.insets = target.frame.insets && typeof target.frame.insets === 'object'
        ? target.frame.insets
        : { ...fallbackInsets };
    }
    if (!target.frame?.insets || typeof target.frame.insets !== 'object') return null;
    return { insets: target.frame.insets };
  };

  if (state.previewType === 'pinyin' || state.previewType === 'alphabetic') {
    if (ensure) {
      layoutLib.keyboard26 = layoutLib.keyboard26 && typeof layoutLib.keyboard26 === 'object' ? layoutLib.keyboard26 : {};
      layoutLib.keyboard26[state.orientation] = layoutLib.keyboard26[state.orientation] && typeof layoutLib.keyboard26[state.orientation] === 'object'
        ? layoutLib.keyboard26[state.orientation]
        : { layout: {} };
    }
    return ensureFrameInsets(
      layoutLib.keyboard26?.[state.orientation],
      state.orientation === 'landscape' ? { top: 3, left: 4, bottom: 3, right: 4 } : { top: 0, left: 0, bottom: 0, right: 0 }
    );
  }

  if (state.previewType === 'numeric') {
    if (ensure) {
      layoutLib.numeric = layoutLib.numeric && typeof layoutLib.numeric === 'object' ? layoutLib.numeric : {};
      layoutLib.numeric[state.orientation] = layoutLib.numeric[state.orientation] && typeof layoutLib.numeric[state.orientation] === 'object'
        ? layoutLib.numeric[state.orientation]
        : { layout: {} };
    }
    return ensureFrameInsets(layoutLib.numeric?.[state.orientation], { top: 3, left: 4, bottom: 3, right: 4 });
  }

  if (state.previewType === 'symbolic') {
    if (ensure) {
      layoutLib.symbolic = layoutLib.symbolic && typeof layoutLib.symbolic === 'object' ? layoutLib.symbolic : {};
      layoutLib.symbolic.portrait = layoutLib.symbolic.portrait && typeof layoutLib.symbolic.portrait === 'object'
        ? layoutLib.symbolic.portrait
        : { layout: {} };
    }
    return ensureFrameInsets(layoutLib.symbolic?.portrait, { top: 3, left: 4, bottom: 3, right: 4 });
  }

  return null;
}

function ensureSelectedKey(domain, keys) {
  if (!keys.length) {
    state.selectedKeys[domain] = null;
    return null;
  }

  if (!keys.includes(state.selectedKeys[domain])) {
    state.selectedKeys[domain] = keys[0];
  }

  return state.selectedKeys[domain];
}

function getButtonKeys(domain) {
  if (domain === 'keyboard26') {
    return flattenRows(getKeyboard26Rows(state.orientation).map((item) => item.values));
  }
  if (domain === 'numeric') {
    return flattenRows(getNumericRows(state.orientation).map((item) => item.values));
  }
  if (domain === 'symbolic') {
    return flattenRows(getSymbolicRows().map((item) => item.values));
  }
  return flattenRows(getPanelRows().map((item) => item.values));
}

function isCopyableButtonKey(domain, key) {
  if (domain === 'keyboard26') {
    return !(/^[a-z]$/.test(key) || ['shift', 'backspace', 'cnen', '123', 'space', 'spaceRight', 'enter'].includes(key));
  }
  if (domain === 'numeric') {
    return !(/^\d$/.test(key) || ['collection', 'category', 'description'].includes(key));
  }
  if (domain === 'symbolic') {
    return !['category', 'description'].includes(key);
  }
  return true;
}

function getActionSuggestionValues(type) {
  if (type === 'standard') return STANDARD_ACTIONS;
  if (type === 'keyboardType') return KEYBOARD_TYPE_SUGGESTIONS;
  if (type === 'shortcut') return SHORTCUT_SUGGESTIONS;
  return [];
}

function getActionValueHint(type) {
  if (type === 'standard') return '浣跨敤鏂囨。涓殑鏍囧噯鍔ㄤ綔瀛楃涓层€?;
  if (type === 'keyboardType') return '鍙€夌郴缁熼敭鐩橈細pinyin / alphabetic / symbolic / numeric / emojis锛屼篃鍙嚜瀹氫箟绫诲瀷鍚嶃€?;
  if (type === 'shortcut') return '鏀寔鏂囨。涓殑棰勫畾涔夊揩鎹锋寚浠わ紝涔熷彲鐩存帴杈撳叆鑷畾涔夊€笺€?;
  if (type === 'switchRimeSchema') return '寤鸿濉啓 RIME 鏂规 ID銆?;
  if (type === 'openURL') return '鏀寔鏅€氶摼鎺ワ紝涔熸敮鎸?#pasteboardContent / #selectText銆?;
  if (type === 'json') return '鐩存帴濉啓瀹屾暣鍔ㄤ綔瀵硅薄 JSON銆?;
  return '';
}

function getActionData(action) {
  if (typeof action === 'string') {
    return {
      type: STANDARD_ACTIONS.includes(action) ? 'standard' : 'rawString',
      value: action,
    };
  }

  if (!action || typeof action !== 'object') {
    return { type: 'character', value: '' };
  }

  const key = ACTION_TYPES.find((item) => !['standard', 'rawString', 'json'].includes(item) && item in action);
  if (key) {
    return { type: key, value: action[key] };
  }

  return { type: 'json', value: JSON.stringify(action, null, 2) };
}

function setActionData(spec, type, value, targetField = 'action') {
  const normalizedValue = typeof value === 'string' ? value.trim() : value;
  if (!normalizedValue) {
    delete spec[targetField];
    return;
  }

  if (type === 'standard' || type === 'rawString') {
    spec[targetField] = String(normalizedValue);
    return;
  }

  if (type === 'json') {
    try {
      spec[targetField] = JSON.parse(String(value));
    } catch {
      spec[targetField] = {};
    }
    return;
  }

  spec[targetField] = { [type]: normalizedValue };
}

function buildActionOptionList(selectedType) {
  return ACTION_TYPE_OPTIONS
    .map((item) => `<option value="${item.value}" ${selectedType === item.value ? 'selected' : ''}>${item.label}</option>`)
    .join('');
}

function buildActionInputId(editor, attrs = {}) {
  const raw = [
    editor,
    attrs.scope,
    attrs.index,
    attrs.domain,
    attrs.key,
    attrs.row,
    attrs.value,
  ].filter(Boolean).join('-');
  return `action-list-${raw.replaceAll(/[^a-zA-Z0-9_-]+/g, '-') || 'default'}`;
}

function renderActionValueInput(editor, attrs, actionData) {
  const field = attrs.field || 'actionValue';
  const inputAttrs = renderDataAttributes({
    editor,
    ...attrs,
    field,
  });
  if (actionData.type === 'json') {
    return `<textarea ${inputAttrs}>${escapeHtml(String(actionData.value ?? ''))}</textarea>`;
  }

  const suggestions = getActionSuggestionValues(actionData.type);
  const listId = suggestions.length ? buildActionInputId(editor, attrs) : '';
  return `
    ${suggestions.length ? `<datalist id="${listId}">${suggestions.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('')}</datalist>` : ''}
    <input ${inputAttrs} ${listId ? `list="${listId}"` : ''} value="${escapeHtml(String(actionData.value ?? ''))}" autocomplete="off" />
  `;
}

function renderActionFields(editor, attrs, actionData, fallbackHint = '') {
  return [
    renderFormField(
      'action 绫诲瀷',
      `<select ${renderDataAttributes({ editor, ...attrs, field: 'actionType' })}>${buildActionOptionList(actionData.type)}</select>`
    ),
    renderWideField(
      'action 鍊?,
      renderActionValueInput(editor, attrs, actionData),
      getActionValueHint(actionData.type) || fallbackHint
    ),
  ].join('');
}

function renderNamedActionFields(editor, attrs, targetField, actionData, labelPrefix, fallbackHint = '') {
  return [
    renderFormField(
      `${labelPrefix} 绫诲瀷`,
      `<select ${renderDataAttributes({ editor, ...attrs, field: `${targetField}Type` })}>${buildActionOptionList(actionData.type)}</select>`
    ),
    renderWideField(
      `${labelPrefix} 鍊糮,
      renderActionValueInput(editor, { ...attrs, field: `${targetField}Value` }, actionData),
      getActionValueHint(actionData.type) || fallbackHint
    ),
  ].join('');
}

function getLabelTextAt(spec, index) {
  if (!spec) return '';
  if (index === 0) {
    return spec.label?.text || spec.labels?.[0]?.text || '';
  }
  return spec.labels?.[index]?.text || '';
}

function setPrimaryLabel(spec, payload) {
  const next = spec.label && typeof spec.label === 'object' ? { ...spec.label } : {};

  if (payload.text) next.text = payload.text;
  else delete next.text;

  if (payload.systemImageName) next.systemImageName = payload.systemImageName;
  else delete next.systemImageName;

  if (payload.defaultFontSizeKey && !next.fontSizeKey) next.fontSizeKey = payload.defaultFontSizeKey;

  if (Object.keys(next).length) spec.label = next;
  else delete spec.label;

  if (Array.isArray(spec.labels) && spec.labels.length) {
    spec.labels[0] = null;
    spec.labels = spec.labels.filter(Boolean);
    if (!spec.labels.length) delete spec.labels;
  }
}

function setSecondaryLabel(spec, text, index = 1) {
  if (!text) {
    if (Array.isArray(spec.labels)) {
      spec.labels[index] = null;
      spec.labels = spec.labels.filter(Boolean);
      if (!spec.labels.length) delete spec.labels;
    }
    return;
  }

  if (!Array.isArray(spec.labels)) spec.labels = [];
  const base = spec.labels[index] && typeof spec.labels[index] === 'object' ? { ...spec.labels[index] } : {};
  if (!base.fontSizeKey) base.fontSizeKey = '鎸夐敭鍓嶆櫙鏂囧瓧澶у皬';
  base.text = text;
  spec.labels[index] = base;
}

function getKeyboard26Variant() {
  return state.previewType === 'alphabetic' ? 'alphabetic' : 'pinyin';
}

function getKeyboard26ButtonInfo(selectedKey, options = {}) {
  const root = state.project.lib.keyboard26 || {};
  const variantName = getKeyboard26Variant();
  const variant = root[variantName] || {};
  const allowFixedOverride = options.allowFixedOverride === true;

  if (selectedKey === 'space') {
    return { kind: 'space', variantName, variant };
  }

  if (selectedKey === 'spaceRight') {
    return { kind: 'spaceRight', variantName, variant, spec: variant.spaceRight || (variant.spaceRight = {}) };
  }

  if (selectedKey === 'enter') {
    return { kind: 'enter', variantName, variant };
  }

  if (variant.buttons?.[selectedKey]) return { kind: 'generic', variantName, variant, spec: variant.buttons[selectedKey] };
  if (root.buttons?.[selectedKey]) return { kind: 'generic', variantName, variant, spec: root.buttons[selectedKey] };
  if (variant.customKeys?.[selectedKey]) return { kind: 'generic', variantName, variant, spec: variant.customKeys[selectedKey] };
  if (root.customKeys?.[selectedKey]) return { kind: 'generic', variantName, variant, spec: root.customKeys[selectedKey] };

  if (/^[a-z]$/.test(selectedKey) || ['shift', 'backspace', 'cnen', '123'].includes(selectedKey)) {
    if (allowFixedOverride) {
      variant.buttons = variant.buttons || {};
      variant.buttons[selectedKey] = variant.buttons[selectedKey] || {};
      return { kind: 'generic', variantName, variant, spec: variant.buttons[selectedKey] };
    }
    return { kind: 'fixed', variantName, variant };
  }

  if (!variant.customKeys) variant.customKeys = {};
  variant.customKeys[selectedKey] = variant.customKeys[selectedKey] || {};
  return { kind: 'generic', variantName, variant, spec: variant.customKeys[selectedKey] };
}

function getGenericButtonInfo(section, selectedKey, options = {}) {
  const allowFixedOverride = options.allowFixedOverride === true;
  if (section === 'lib.keyboard26') {
    return getKeyboard26ButtonInfo(selectedKey, { allowFixedOverride });
  }

  if (section === 'lib.numeric') {
    if (/^\d$/.test(selectedKey) || ['collection', 'category', 'description'].includes(selectedKey)) {
      const root = state.project.lib.numeric;
      if (allowFixedOverride) {
        root.buttons = root.buttons || {};
        root.buttons[selectedKey] = root.buttons[selectedKey] || {};
        return { kind: 'generic', spec: root.buttons[selectedKey] };
      }
      return { kind: 'fixed' };
    }
    const root = state.project.lib.numeric;
    root.buttons = root.buttons || {};
    root.buttons[selectedKey] = root.buttons[selectedKey] || {};
    return { kind: 'generic', spec: root.buttons[selectedKey] };
  }

  if (section === 'lib.symbolic') {
    if (['category', 'description'].includes(selectedKey)) {
      const root = state.project.lib.symbolic;
      if (allowFixedOverride) {
        root.buttons = root.buttons || {};
        root.buttons[selectedKey] = root.buttons[selectedKey] || {};
        return { kind: 'generic', spec: root.buttons[selectedKey] };
      }
      return { kind: 'fixed' };
    }
    const root = state.project.lib.symbolic;
    root.buttons = root.buttons || {};
    root.buttons[selectedKey] = root.buttons[selectedKey] || {};
    return { kind: 'generic', spec: root.buttons[selectedKey] };
  }

  const root = state.project.lib.panel;
  root.buttons = root.buttons || {};
  root.buttons[selectedKey] = root.buttons[selectedKey] || {};
  return { kind: 'generic', spec: root.buttons[selectedKey] };
}

function overwriteSpec(target, source) {
  Object.keys(target).forEach((key) => delete target[key]);
  Object.assign(target, deepClone(source));
}

function copyButtonConfig(domain, sourceKey, targetKey) {
  if (!isCopyableButtonKey(domain, sourceKey) || !isCopyableButtonKey(domain, targetKey)) {
    return false;
  }
  const section = `lib.${domain}`;
  const sourceInfo = getGenericButtonInfo(section, sourceKey);
  const targetInfo = getGenericButtonInfo(section, targetKey);
  if (sourceInfo.kind !== 'generic' || targetInfo.kind !== 'generic') {
    return false;
  }
  overwriteSpec(targetInfo.spec, sourceInfo.spec);
  return true;
}

function copyThemeColors(fromTheme, toTheme) {
  state.project.lib.color[toTheme] = deepClone(state.project.lib.color[fromTheme] || {});
}

function copyKeyboard26Variant(sourceVariant, targetVariant) {
  state.project.lib.keyboard26[targetVariant] = deepClone(state.project.lib.keyboard26[sourceVariant] || {});
}

function getInputValue(target) {
  if (target.type === 'checkbox') return target.checked;
  if (target.dataset.number === 'true') {
    const parsed = Number(target.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return target.value;
}

function renderDataAttributes(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `data-${key}="${escapeHtml(String(value))}"`)
    .join(' ');
}

function normalizeHexColorValue(value) {
  const normalized = String(value || '').trim();
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!match) return null;
  const raw = match[1];
  if (raw.length === 3) {
    return `#${raw.split('').map((item) => item + item).join('')}`.toLowerCase();
  }
  if (raw.length === 8) {
    return `#${raw.slice(0, 6)}`.toLowerCase();
  }
  return `#${raw}`.toLowerCase();
}

function getColorPickerValue(value, fallback = '#7c8a90') {
  return normalizeHexColorValue(value) || fallback;
}

function renderColorControl(attrs, value, options = {}) {
  const normalizedValue = String(value || '').trim();
  const attrText = renderDataAttributes(attrs);
  return `
    <div class="color-control">
      <input class="color-text-input" ${attrText} data-color-source="text" value="${escapeHtml(normalizedValue)}" placeholder="${escapeHtml(options.placeholder || '#RRGGBB / #RRGGBBAA / rgba(...)')}" />
      <input class="color-picker-input" ${attrText} data-color-source="picker" type="color" value="${escapeHtml(getColorPickerValue(normalizedValue, options.pickerFallback || '#7c8a90'))}" aria-label="${escapeHtml(options.ariaLabel || '鎵嬪姩閫夋嫨棰滆壊')}" />
    </div>
  `;
}

function syncColorControlInputs(target, value) {
  const control = target.closest('.color-control');
  if (!(control instanceof HTMLElement)) return;
  const normalizedValue = String(value || '').trim();
  const textInput = control.querySelector('.color-text-input');
  if (textInput instanceof HTMLInputElement && textInput !== target) {
    textInput.value = normalizedValue;
  }
  const pickerInput = control.querySelector('.color-picker-input');
  const pickerValue = getColorPickerValue(normalizedValue, pickerInput instanceof HTMLInputElement ? pickerInput.value : '#7c8a90');
  if (pickerInput instanceof HTMLInputElement && pickerInput !== target && normalizeHexColorValue(normalizedValue)) {
    pickerInput.value = pickerValue;
  }
}

function renderFormField(label, inputHtml, hint = '') {
  return `
    <div class="form-field">
      <label>${escapeHtml(label)}</label>
      ${inputHtml}
      ${hint ? `<div class="form-hint">${escapeHtml(hint)}</div>` : ''}
    </div>
  `;
}

function renderWideField(label, inputHtml, hint = '') {
  return `
    <div class="form-field span-2">
      <label>${escapeHtml(label)}</label>
      ${inputHtml}
      ${hint ? `<div class="form-hint">${escapeHtml(hint)}</div>` : ''}
    </div>
  `;
}

function renderCollapsiblePanel(title, contentHtml, options = {}) {
  const meta = options.meta ? `<span class="compact-panel-meta">${escapeHtml(options.meta)}</span>` : '';
  const openAttr = options.open ? ' open' : '';
  const className = options.className ? ` ${options.className}` : '';
  return `
    <details class="form-panel compact-details${className}"${openAttr}>
      <summary>
        <span>${escapeHtml(title)}</span>
        ${meta}
      </summary>
      <div class="compact-details-body">
        ${contentHtml}
      </div>
    </details>
  `;
}

function getPreferredColorEditorDomain() {
  if (state.previewType === 'numeric') return 'numeric';
  if (state.previewType === 'symbolic') return 'symbolic';
  if (state.previewType === 'panel') return 'panel';
  return 'keyboard26';
}

function getPreviewTypeForColorDomain(domain) {
  if (domain === 'numeric') return 'numeric';
  if (domain === 'symbolic') return 'symbolic';
  if (domain === 'panel') return 'panel';
  if (domain === 'keyboard26' || domain === 'toolbar') {
    return state.previewType === 'alphabetic' ? 'alphabetic' : 'pinyin';
  }
  return state.previewType;
}

function syncPreviewTypeWithColorDomain(domain) {
  const nextPreviewType = getPreviewTypeForColorDomain(domain);
  if (state.previewType === nextPreviewType) return false;
  state.previewType = nextPreviewType;
  syncPreviewControls();
  return true;
}

function getResolvedColorEditorDomain() {
  if (COLOR_EDITOR_DOMAIN_META[state.colorEditorDomain]) {
    return state.colorEditorDomain;
  }
  return getPreferredColorEditorDomain();
}

function getColorDomainLabel(domain) {
  return COLOR_EDITOR_DOMAIN_META[domain]?.label || domain;
}

function getColorFieldGroupMeta(groupId) {
  return COLOR_FIELD_GROUP_META.find((item) => item.id === groupId) || COLOR_FIELD_GROUP_META[0];
}

function getColorFieldGroupId(key) {
  for (const group of COLOR_FIELD_GROUP_META) {
    if (typeof group.matcher === 'function' && group.matcher(key)) {
      return group.id;
    }
  }
  return 'keyboard26';
}

function getColorFieldGroups(colors) {
  const grouped = new Map(COLOR_FIELD_GROUP_META.map((item) => [item.id, []]));

  Object.keys(colors).forEach((key) => {
    const groupId = getColorFieldGroupId(key);
    if (!grouped.has(groupId)) grouped.set(groupId, []);
    grouped.get(groupId).push(key);
  });

  const groups = COLOR_FIELD_GROUP_META.map((item) => ({
    ...item,
    keys: grouped.get(item.id) || [],
  }));

  return groups.map((group) => ({
    ...group,
    count: group.keys.length,
  }));
}

function getResolvedColorFieldGroup(colors) {
  const groups = getColorFieldGroups(colors);
  const active = groups.find((item) => item.id === state.colorFieldGroup && item.count > 0);
  if (active) return active.id;
  const preferred = groups.find((item) => item.id === state.colorFieldGroup);
  if (preferred) return preferred.id;
  return groups.find((item) => item.count > 0)?.id || COLOR_FIELD_GROUP_META[0].id;
}

function getResolvedColorEditorMode() {
  return state.colorEditorMode === 'single' ? 'single' : 'global';
}

function renderColorGroupSelect(groups, activeGroupId) {
  return `
    <div class="color-filter-bar">
      ${renderFormField(
        '閫夋嫨閿洏鍒嗙被',
        `<select data-editor="color-group-select">${groups
          .filter((group) => group.count > 0)
          .map((group) => `<option value="${escapeHtml(group.id)}" ${group.id === activeGroupId ? 'selected' : ''}>${escapeHtml(group.label)}</option>`)
          .join('')}</select>`,
        ''
      )}
    </div>
  `;
}

function renderThemeColorFieldCard(themeName, key, value) {
  return `
    <div class="color-field-card">
      <div class="color-field-card-header">
        <div>
          <h4>${escapeHtml(key)}</h4>
        </div>
      </div>
      ${renderColorControl(
        { editor: 'color', theme: themeName, key },
        value || '',
        { ariaLabel: `${themeName} 閰嶈壊 ${key}` }
      )}
    </div>
  `;
}

function getColorOverrideStorageKey(domain, key, field) {
  const safeKey = encodeURIComponent(String(key || '')).replace(/%/g, '_');
  const suffix = field === 'highlightColorKey' ? 'highlight' : 'normal';
  return `鍗曢敭棰滆壊/${domain}/${safeKey}/${suffix}`;
}

function getKeyboard26ColorTarget(ensure = false) {
  const key = state.selectedKeys.keyboard26;
  if (!key) {
    return { domain: 'keyboard26', key: '', supported: false, message: '鍏堝湪鍙充晶棰勮閲岀偣閫変竴涓?26 閿寜閿紝鍐嶅洖鏉ヨ皟鍗曢敭棰滆壊銆? };
  }

  const root = state.project.lib.keyboard26 || {};
  const variantName = getKeyboard26Variant();
  const variant = ensure
    ? (root[variantName] = root[variantName] || {})
    : (root[variantName] || {});

  const wrap = (spec, note = '') => ({
    domain: 'keyboard26',
    key,
    supported: true,
    spec,
    label: `26 閿?/ ${key}`,
    note,
    fallbackColorKey: '鎸夐敭鍓嶆櫙棰滆壊',
  });

  if (key === 'shift') {
    root.systemKeys = ensure ? (root.systemKeys || {}) : root.systemKeys;
    const shift = ensure ? (root.systemKeys.shift = root.systemKeys.shift || {}) : root.systemKeys?.shift;
    let spec = null;
    let stateLabel = '鏅€?;
    if (state.previewState.shift === 'locked') {
      stateLabel = '閿佸畾';
      spec = ensure ? (shift.capsLocked = shift.capsLocked || {}) : shift?.capsLocked || null;
    } else if (state.previewState.shift === 'upper') {
      stateLabel = '澶у啓';
      spec = ensure ? (shift.uppercased = shift.uppercased || {}) : shift?.uppercased || null;
    } else {
      spec = ensure ? (shift.normal = shift.normal || {}) : shift?.normal || null;
    }
    return wrap(spec, `褰撳墠浼氫慨鏀?Shift 鐨?{stateLabel}鐘舵€侀鑹层€俙);
  }

  if (key === 'backspace') {
    root.systemKeys = ensure ? (root.systemKeys || {}) : root.systemKeys;
    const spec = ensure
      ? (root.systemKeys.backspace = root.systemKeys.backspace || {})
      : root.systemKeys?.backspace || null;
    return wrap(spec, '褰撳墠浼氫慨鏀瑰垹闄ら敭鍓嶆櫙棰滆壊銆?);
  }

  if (key === 'cnen') {
    root.systemKeys = ensure ? (root.systemKeys || {}) : root.systemKeys;
    const spec = ensure
      ? (root.systemKeys.cnen = root.systemKeys.cnen || {})
      : root.systemKeys?.cnen || null;
    return wrap(spec, '褰撳墠浼氫慨鏀逛腑鑻卞垏鎹㈤敭鍓嶆櫙棰滆壊銆?);
  }

  if (key === '123') {
    root.systemKeys = ensure ? (root.systemKeys || {}) : root.systemKeys;
    const spec = ensure
      ? (root.systemKeys.numericSwitch = root.systemKeys.numericSwitch || {})
      : root.systemKeys?.numericSwitch || null;
    return wrap(spec, '褰撳墠浼氫慨鏀规暟瀛楀垏鎹㈤敭鍓嶆櫙棰滆壊銆?);
  }

  if (key === 'space') {
    root.bottomForegrounds = ensure ? (root.bottomForegrounds || {}) : root.bottomForegrounds;
    const spec = ensure
      ? (root.bottomForegrounds.space = root.bottomForegrounds.space || {})
      : root.bottomForegrounds?.space || null;
    return wrap(spec, '褰撳墠浼氫慨鏀圭┖鏍奸敭鏂囨棰滆壊銆?);
  }

  if (key === 'enter') {
    root.bottomForegrounds = ensure ? (root.bottomForegrounds || {}) : root.bottomForegrounds;
    const targetField = state.previewState.enterType === 'default' ? 'enterDefault' : 'enterAccent';
    const spec = ensure
      ? (root.bottomForegrounds[targetField] = root.bottomForegrounds[targetField] || {})
      : root.bottomForegrounds?.[targetField] || null;
    return wrap(spec, `褰撳墠浼氫慨鏀瑰洖杞﹂敭鐨?{targetField === 'enterDefault' ? '榛樿' : '寮鸿皟'}鐘舵€侀鑹层€俙);
  }

  if (key === 'spaceRight') {
    const spec = ensure
      ? (variant.spaceRight = variant.spaceRight || {})
      : variant.spaceRight || null;
    return wrap(spec, '褰撳墠浼氫慨鏀圭┖鏍煎彸渚ч敭鐨勫墠鏅鑹层€?);
  }

  let spec = variant.buttons?.[key] || root.buttons?.[key] || variant.customKeys?.[key] || root.customKeys?.[key] || null;
  if (!spec && ensure) {
    if (/^[a-z]$/.test(key)) {
      variant.buttons = variant.buttons || {};
      variant.buttons[key] = variant.buttons[key] || {};
      spec = variant.buttons[key];
    } else {
      variant.customKeys = variant.customKeys || {};
      variant.customKeys[key] = variant.customKeys[key] || {};
      spec = variant.customKeys[key];
    }
  }
  return wrap(spec, /^[a-z]$/.test(key)
    ? '褰撳墠浼氫慨鏀硅繖涓?26 閿瓧姣嶉敭鐨勫墠鏅鑹层€?
    : '褰撳墠浼氫慨鏀硅繖涓?26 閿嚜瀹氫箟鎸夐敭鐨勫墠鏅鑹层€?);
}

function getNumericColorTarget(ensure = false) {
  const key = state.selectedKeys.numeric;
  if (!key) {
    return { domain: 'numeric', key: '', supported: false, message: '鍏堝湪鍙充晶棰勮閲岀偣閫変竴涓暟瀛楅敭鐩樻寜閿紝鍐嶅洖鏉ヨ皟鍗曢敭棰滆壊銆? };
  }
  const root = state.project.lib.numeric || {};
  if (ensure) {
    root.buttons = root.buttons || {};
    root.buttons[key] = root.buttons[key] || {};
  }
  return {
    domain: 'numeric',
    key,
    supported: true,
    spec: root.buttons?.[key] || null,
    label: `鏁板瓧閿洏 / ${key}`,
    note: /^\d$/.test(key)
      ? '杩欓噷鏀圭殑鏄綋鍓嶆暟瀛楅敭鐨勫墠鏅鑹层€?
      : ['collection', 'category', 'description'].includes(key)
        ? '杩欓噷鏀圭殑鏄綋鍓嶉泦鍚堣鏄庡尯鍧楃殑鍓嶆櫙棰滆壊銆?
        : '杩欓噷鏀圭殑鏄綋鍓嶅姩浣滈敭鐨勫墠鏅鑹层€?,
    fallbackColorKey: '鎸夐敭鍓嶆櫙棰滆壊',
  };
}

function getSymbolicColorTarget(ensure = false) {
  const key = state.selectedKeys.symbolic;
  if (!key) {
    return { domain: 'symbolic', key: '', supported: false, message: '鍏堝湪鍙充晶棰勮閲岀偣閫変竴涓鍙烽敭鐩樻寜閿紝鍐嶅洖鏉ヨ皟鍗曢敭棰滆壊銆? };
  }
  const root = state.project.lib.symbolic || {};
  if (ensure) {
    root.buttons = root.buttons || {};
    root.buttons[key] = root.buttons[key] || {};
  }
  return {
    domain: 'symbolic',
    key,
    supported: true,
    spec: root.buttons?.[key] || null,
    label: `绗﹀彿閿洏 / ${key}`,
    note: ['category', 'description'].includes(key)
      ? '杩欓噷鏀圭殑鏄綋鍓嶅垎绫绘垨璇存槑鍖哄潡鐨勫墠鏅鑹层€?
      : '杩欓噷鏀圭殑鏄綋鍓嶇鍙烽敭鐨勫墠鏅鑹层€?,
    fallbackColorKey: '鎸夐敭鍓嶆櫙棰滆壊',
  };
}

function getPanelColorTarget(ensure = false) {
  const key = state.selectedKeys.panel;
  if (!key) {
    return { domain: 'panel', key: '', supported: false, message: '鍏堝湪鍙充晶棰勮閲岀偣閫変竴涓潰鏉挎寜閿紝鍐嶅洖鏉ヨ皟鍗曢敭棰滆壊銆? };
  }
  const root = state.project.lib.panel || {};
  if (ensure) {
    root.buttons = root.buttons || {};
    root.buttons[key] = root.buttons[key] || {};
  }
  return {
    domain: 'panel',
    key,
    supported: true,
    spec: root.buttons?.[key] || null,
    label: `闈㈡澘 / ${key}`,
    note: '杩欓噷鏀圭殑鏄綋鍓嶉潰鏉挎寜閽殑鍓嶆櫙棰滆壊銆?,
    fallbackColorKey: '鎸夐敭鍓嶆櫙棰滆壊',
  };
}

function getToolbarColorTarget(ensure = false) {
  const key = state.selectedKeys.toolbar;
  if (!key) {
    return { domain: 'toolbar', key: '', supported: false, message: '鍏堝湪鍙充晶棰勮閲岀偣閫変竴涓伐鍏锋爮鎸夐挳锛屽啀鍥炴潵璋冨崟閿鑹层€? };
  }
  const scope = state.previewType === 'alphabetic' ? 'english' : 'default';
  const toolbar = state.project.lib.toolbar || {};
  let spec = null;
  if (scope === 'english') {
    if (ensure) {
      toolbar.english = toolbar.english || { layout: [], overrides: {} };
      toolbar.english.overrides = toolbar.english.overrides || {};
      toolbar.english.overrides[key] = toolbar.english.overrides[key] || {};
      spec = toolbar.english.overrides[key];
    } else {
      spec = toolbar.english?.overrides?.[key] || null;
    }
  } else if (ensure) {
    toolbar.default = toolbar.default || { layout: [], buttons: {} };
    toolbar.default.buttons = toolbar.default.buttons || {};
    toolbar.default.buttons[key] = toolbar.default.buttons[key] || {};
    spec = toolbar.default.buttons[key];
  } else {
    spec = toolbar.default?.buttons?.[key] || null;
  }
  return {
    domain: 'toolbar',
    key,
    supported: true,
    spec,
    label: `宸ュ叿鏍?/ ${key}`,
    note: scope === 'english' ? '褰撳墠浼氬啓鍏?english 瑕嗙洊灞傘€? : '褰撳墠浼氬啓鍏?default 鎸夐挳灞傘€?,
    fallbackColorKey: 'toolbar鎸夐敭棰滆壊',
  };
}

function getSingleKeyColorTarget(domain = getResolvedColorEditorDomain(), ensure = false) {
  if (domain === 'keyboard26') return getKeyboard26ColorTarget(ensure);
  if (domain === 'numeric') return getNumericColorTarget(ensure);
  if (domain === 'symbolic') return getSymbolicColorTarget(ensure);
  if (domain === 'panel') return getPanelColorTarget(ensure);
  return getToolbarColorTarget(ensure);
}

function getSingleKeyColorFieldState(target, field) {
  const theme = getThemeSpec(state.project, state.theme);
  const fallbackColorKey = target.fallbackColorKey || COLOR_EDITOR_DOMAIN_META[target.domain]?.fallbackColorKey || '鎸夐敭鍓嶆櫙棰滆壊';
  const explicitKey = target.spec?.[field] || '';
  let effectiveKey = explicitKey;
  if (!effectiveKey && field === 'highlightColorKey') {
    effectiveKey = target.spec?.colorKey || fallbackColorKey;
  }
  if (!effectiveKey) {
    effectiveKey = fallbackColorKey;
  }
  const effectiveValue = resolveThemeColorValue(
    theme,
    effectiveKey,
    resolveThemeColorValue(theme, fallbackColorKey, '')
  );
  return {
    explicitKey,
    effectiveKey,
    effectiveValue,
    hasOverride: Boolean(explicitKey),
  };
}

function setSingleKeyColorValue(domain, field, value) {
  const target = getSingleKeyColorTarget(domain, true);
  if (!target.supported || !target.spec) return false;
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) {
    delete target.spec[field];
    return true;
  }
  const currentKey = target.spec[field];
  const storageKey = currentKey && currentKey.startsWith('鍗曢敭棰滆壊/')
    ? currentKey
    : getColorOverrideStorageKey(domain, target.key, field);
  state.project.lib.color[state.theme] = state.project.lib.color[state.theme] || {};
  state.project.lib.color[state.theme][storageKey] = normalizedValue;
  target.spec[field] = storageKey;
  return true;
}

function clearSingleKeyColorOverride(domain, field) {
  const target = getSingleKeyColorTarget(domain, false);
  if (!target.supported || !target.spec) return false;
  delete target.spec[field];
  return true;
}

function getColorEditorSelectableKeys(domain) {
  return domain === 'toolbar' ? getToolbarKeys() : getButtonKeys(domain);
}

function renderSingleKeyColorEditor() {
  const domain = getResolvedColorEditorDomain();
  const target = getSingleKeyColorTarget(domain, false);
  const keys = getColorEditorSelectableKeys(domain);
  const chips = Object.keys(COLOR_EDITOR_DOMAIN_META).map((item) => {
    const selectedKey = state.selectedKeys[item];
    return `
      <button class="color-domain-chip ${item === domain ? 'active' : ''}" type="button" data-action="select-color-domain" data-domain="${escapeHtml(item)}">
        <span>${escapeHtml(getColorDomainLabel(item))}</span>
        <strong>${escapeHtml(selectedKey || '鏈€変腑')}</strong>
      </button>
    `;
  }).join('');
  const keyPicker = keys.length
    ? `
      <div class="color-key-picker">
        <div class="color-group-toolbar-text">
          <strong>鎸夐敭鐩撮€?/strong>
          <span>鍙洿鎺ュ湪杩欓噷鍒囨崲鐩爣閿紝涔熷彲浠ョ户缁偣鍑诲彸渚у疄鏃堕瑙堛€?/span>
        </div>
        <div class="key-chip-list">
          ${keys.map((key) => `<button class="key-chip ${state.selectedKeys[domain] === key ? 'active' : ''}" type="button" data-action="select-key" data-domain="${domain}" data-key="${escapeHtml(key)}">${escapeHtml(key)}</button>`).join('')}
        </div>
      </div>
    `
    : '<div class="empty-state">褰撳墠浣滅敤鍩熻繕娌℃湁鍙€夋寜閿€?/div>';

  if (!target.supported) {
    return `
      <section class="color-section-block color-section-block-strong">
        <div class="color-section-head">
          <div>
            <h4>鍗曢敭閰嶇疆</h4>
            <p>鍏堝垏鎹綔鐢ㄥ煙锛屽啀閫変腑鐩爣閿紱杩欓噷鍙繚鐣欑湡姝ｄ細褰卞搷褰撳墠閿殑璁剧疆銆?/p>
          </div>
        </div>
        <div class="color-domain-grid">${chips}</div>
        ${keyPicker}
        <div class="empty-state">${escapeHtml(target.message || '褰撳墠娌℃湁鍙紪杈戠殑鍗曢敭棰滆壊瀵硅薄銆?)}</div>
      </section>
    `;
  }

  const normalState = getSingleKeyColorFieldState(target, 'colorKey');
  const highlightState = getSingleKeyColorFieldState(target, 'highlightColorKey');
  const renderOverrideCard = (title, field, fieldState, hint) => `
    <div class="color-override-card ${fieldState.hasOverride ? 'is-custom' : ''}">
      <div class="color-override-head">
        <div>
          <h4>${escapeHtml(title)}</h4>
          <p>${escapeHtml(hint)}</p>
        </div>
        <span class="color-override-state ${fieldState.hasOverride ? 'custom' : 'inherited'}">${fieldState.hasOverride ? '鍗曢敭閰嶇疆' : '娌跨敤鍏ㄥ眬'}</span>
      </div>
      <div class="color-override-meta">
        <span class="color-link-badge">${escapeHtml(fieldState.effectiveKey)}</span>
      </div>
      <div class="color-control-stack">
        ${renderColorControl(
          { editor: 'key-color', domain, field },
          fieldState.effectiveValue,
          { ariaLabel: `${target.label} ${title}` }
        )}
        <div class="color-field-actions">
          <button type="button" data-action="clear-key-color-override" data-domain="${escapeHtml(domain)}" data-field="${escapeHtml(field)}" ${fieldState.hasOverride ? '' : 'disabled'}>鎭㈠榛樿</button>
        </div>
      </div>
    </div>
  `;

  const renderSingleKeyFullConfigEditor = () => {
    if (domain === 'toolbar') {
      const selectedKey = ensureToolbarSelection();
      if (!selectedKey) return '';
      const defaultSpec = getToolbarButtonInfo(selectedKey, 'default');
      const englishSpec = getToolbarButtonInfo(selectedKey, 'english');
      return `
        <div class="color-single-config-stack">
          <div class="form-panel">
            <h3>瀹屾暣閰嶇疆锛?{escapeHtml(selectedKey)}</h3>
            <p>杩欓噷鍙互鐩存帴淇敼褰撳墠宸ュ叿鏍忔寜閽殑鏂囧瓧銆佸浘鏍囥€佸姩浣滃拰棰滆壊閿€?/p>
          </div>
          <div class="form-panel">
            <h3>榛樿鎸夐挳锛?{escapeHtml(selectedKey)}</h3>
            <p>榛樿妯″紡涓嬬敓鏁堢殑瀹屾暣閰嶇疆銆?/p>
            ${renderToolbarButtonFields(defaultSpec, 'default')}
          </div>
          <div class="form-panel">
            <h3>鑻辨枃瑕嗙洊锛?{escapeHtml(selectedKey)}</h3>
            <p>浠呭湪鑻辨枃妯″紡涓嬬敓鏁堬紱鐣欑┖鍒欑户鎵块粯璁ゆ寜閽€?/p>
            ${renderToolbarButtonFields(englishSpec, 'english')}
          </div>
        </div>
      `;
    }

    const section = BUTTON_SECTION_BY_DOMAIN[domain];
    const selectedKey = state.selectedKeys[domain];
    if (!section || !selectedKey) return '';
    const info = getGenericButtonInfo(section, selectedKey, { allowFixedOverride: true });
    const content = section === 'lib.keyboard26'
      ? renderKeyboard26SpecialEditor(selectedKey, info)
      : info.kind === 'fixed'
        ? `
          <div class="form-panel">
            <h3>鍥哄畾閿鏄?/h3>
            <p>褰撳墠閿粛灞炰簬鍥哄畾娓叉煋閿綅锛涘闇€娣辨敼璇峰垏鎹?JSON 妯″紡銆?/p>
          </div>
        `
        : renderGenericButtonFields(info.spec, '杩欓噷鍙互鐩存帴淇敼褰撳墠鍗曢敭鐨勬枃瀛椼€佸浘鏍囥€佸姩浣溿€侀噸澶嶈Е鍙戝拰棰滆壊閿€?);
    return `
      <div class="color-single-config-stack">
        <div class="form-panel">
          <h3>瀹屾暣閰嶇疆锛?{escapeHtml(selectedKey)}</h3>
          <p>杩欓噷鍙互鐩存帴淇敼褰撳墠鍗曢敭鐨勫畬鏁撮厤缃紝涓嶅啀灞€闄愪簬棰滆壊銆?/p>
        </div>
        ${content}
        ${renderButtonCopyEditor(domain, selectedKey)}
      </div>
    `;
  };

  return `
    <section class="color-section-block color-section-block-strong">
      <div class="color-section-head">
        <div>
          <h4>鍗曢敭閰嶇疆</h4>
          <p>鍏堥€夐敭鐩樹綔鐢ㄥ煙锛屽啀鎸戝叿浣撴寜閿紝鍙皟杩欎釜閿嚜宸辩殑棰滆壊閰嶇疆銆?/p>
        </div>
      </div>
      <div class="color-domain-grid">${chips}</div>
      ${keyPicker}
      ${target.note ? `<p class="color-target-note">${escapeHtml(target.note)}</p>` : ''}
      <div class="color-override-grid">
        ${renderOverrideCard('鏅€氬墠鏅?, 'colorKey', normalState, '榛樿灞曠ず鐘舵€佷笅浣跨敤鐨勪富鍓嶆櫙棰滆壊銆?)}
        ${renderOverrideCard('楂樹寒鍓嶆櫙', 'highlightColorKey', highlightState, '鎸変笅鎴栭珮浜姸鎬佷笅浣跨敤鐨勫墠鏅鑹层€?)}
      </div>
      ${renderSingleKeyFullConfigEditor()}
    </section>
  `;
}

function renderMappingEditor() {
  const mapping = state.project.mapping || {};
  const meta = state.project.meta || {};
  const config = ensureProjectConfig(state.project);
  const fontFace = normalizeFontFaceList(config.fontFace);
  const projectNameInput = getMetaInputPresentation(state.project, 'projectName');
  const authorInput = getMetaInputPresentation(state.project, 'author');
  const blocks = [];

  blocks.push(`
    <div class="form-panel">
      <h3>鐨偆淇℃伅</h3>
      <div class="form-grid">
        ${renderFormField('鐨偆鍚嶇О', `<input data-editor="meta" data-key="projectName" data-default-value="${escapeHtml(projectNameInput.defaultValue)}" data-default-active="${projectNameInput.isDefault ? 'true' : 'false'}" class="${projectNameInput.isDefault ? 'meta-default-value' : ''}" value="${escapeHtml(projectNameInput.value)}" autocomplete="off" />`, '鐣欑┖鍒欎娇鐢ㄩ粯璁ら」鐩悕')}
        ${renderFormField('浣滆€?, `<input data-editor="meta" data-key="author" data-default-value="${escapeHtml(authorInput.defaultValue)}" data-default-active="${authorInput.isDefault ? 'true' : 'false'}" class="${authorInput.isDefault ? 'meta-default-value' : ''}" value="${escapeHtml(authorInput.value)}" autocomplete="off" />`, '鐣欑┖鍒欎娇鐢ㄩ粯璁や綔鑰?)}
        ${renderWideField('鎻忚堪', `<textarea data-editor="meta" data-key="description">${escapeHtml(meta.description || '')}</textarea>`)}
      </div>
    </div>
  `);

  blocks.push(`
    <div class="form-panel">
      <h3>fontFace</h3>
      <p>瀵瑰簲瀹樻柟鏂囨。閲岀殑 <code>config.yaml</code> 瀛椾綋閰嶇疆銆傛暟缁勯『搴忓氨鏄簲鐢ㄤ紭鍏堢骇锛?code>name</code> 涓?<code>url</code> 鍚屾椂濉啓鏃朵紭鍏堜娇鐢?<code>name</code>銆?/p>
      <div class="inline-actions">
        <button type="button" data-action="add-font-face">鏂板瀛椾綋</button>
      </div>
      ${fontFace.length ? `
        <div class="font-face-stack">
          ${fontFace.map((entry, index) => `
            <div class="font-face-card">
              <div class="font-face-card-head">
                <h4>瀛椾綋 ${index + 1}</h4>
                <button type="button" data-action="remove-font-face" data-index="${index}">鍒犻櫎瀛椾綋</button>
              </div>
              <div class="form-grid">
                ${renderFormField('url', `<input data-editor="font-face" data-index="${index}" data-field="url" value="${escapeHtml(entry.url || '')}" autocomplete="off" />`, '濉啓 fonts 鐩綍涓殑鏂囦欢鍚嶏紝闇€甯﹀悗缂€')}
                ${renderFormField('name', `<input data-editor="font-face" data-index="${index}" data-field="name" value="${escapeHtml(entry.name || '')}" autocomplete="off" />`, '濉啓绯荤粺瀛椾綋鍚嶏紱鑻ュ～鍐欎細浼樺厛浜?url')}
              </div>
              <div class="font-face-ranges">
                <div class="font-face-ranges-head">
                  <strong>ranges</strong>
                  <button type="button" data-action="add-font-face-range" data-index="${index}">鏂板鑼冨洿</button>
                </div>
                ${entry.ranges.length ? `
                  <div class="font-face-range-list">
                    ${entry.ranges.map((range, rangeIndex) => `
                      <div class="font-face-range-item">
                        <div class="form-grid">
                          ${renderFormField('location', `<input data-editor="font-face-range" data-index="${index}" data-range-index="${rangeIndex}" data-field="location" data-number="true" type="number" step="1" value="${escapeHtml(range.location)}" />`, 'Unicode 璧峰鍊?)}
                          ${renderFormField('length', `<input data-editor="font-face-range" data-index="${index}" data-range-index="${rangeIndex}" data-field="length" data-number="true" type="number" step="1" value="${escapeHtml(range.length)}" />`, '鑼冨洿闀垮害')}
                        </div>
                        <button type="button" data-action="remove-font-face-range" data-index="${index}" data-range-index="${rangeIndex}">鍒犻櫎鑼冨洿</button>
                      </div>
                    `).join('')}
                  </div>
                ` : '<div class="empty-inline-note">褰撳墠鏈缃?ranges锛岀暀绌鸿〃绀烘暣濂楀瓧浣撳叏灞€鐢熸晥銆?/div>'}
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<div class="empty-inline-note">褰撳墠鏈缃瓧浣撹鐩栵紝灏嗙户缁娇鐢ㄥ簲鐢ㄥ唴瀛椾綋鎴栫郴缁熼粯璁ゅ瓧浣撱€?/div>'}
    </div>
  `);

  for (const schemaKey of Object.keys(mapping)) {
    const schema = mapping[schemaKey] || {};
    const fields = [];

    for (const deviceKey of Object.keys(schema)) {
      const device = schema[deviceKey] || {};
      for (const orientationKey of Object.keys(device)) {
        fields.push(
          renderFormField(
            `${deviceKey} / ${orientationKey}`,
            `<input data-editor="mapping" data-schema="${escapeHtml(schemaKey)}" data-device="${escapeHtml(deviceKey)}" data-orientation="${escapeHtml(orientationKey)}" value="${escapeHtml(device[orientationKey] || '')}" />`
          )
        );
      }
    }

    blocks.push(`
      <div class="form-panel">
        <h3>${escapeHtml(schemaKey)}</h3>
        <p>杩欓噷鎺у埗鏈€缁堝鍑虹殑 yaml 鏂囦欢鍚嶆槧灏勩€?/p>
        <div class="form-grid">${fields.join('')}</div>
      </div>
    `);
  }

  return blocks.join('');
}

function renderColorEditor() {
  const colors = state.project.lib.color?.[state.theme] || {};
  const groups = getColorFieldGroups(colors);
  const activeGroupId = getResolvedColorFieldGroup(colors);
  const visibleGroups = groups.filter((item) => item.id === activeGroupId && item.count > 0);
  const mode = getResolvedColorEditorMode();

  return `
    <div class="form-panel color-workbench-panel color-workbench-shell">
      ${mode === 'global' ? `
        ${visibleGroups.map((group) => `
          <section class="color-section-block">
            <div class="color-section-grid">
              ${group.keys.map((key) => renderThemeColorFieldCard(state.theme, key, colors[key])).join('')}
            </div>
          </section>
        `).join('')}
      ` : renderSingleKeyColorEditor()}
    </div>
  `;
}

function renderEditorContextActions() {
  if (!el.editorContextActions) return;
  if (state.activeSection !== 'lib.color' || state.editorMode !== 'visual') {
    el.editorContextActions.innerHTML = '';
    el.editorContextActions.hidden = true;
    return;
  }

  const mode = getResolvedColorEditorMode();
  const otherTheme = state.theme === 'light' ? 'dark' : 'light';
  const groups = getColorFieldGroups(state.project.lib.color?.[state.theme] || {});
  const activeGroupId = getResolvedColorFieldGroup(state.project.lib.color?.[state.theme] || {});
  el.editorContextActions.innerHTML = `
    <div class="color-mode-switch editor-context-switch" aria-label="棰滆壊閰嶇疆鎿嶄綔">
      <button class="color-mode-switch-button ${mode === 'global' ? 'active' : ''}" type="button" data-action="select-color-mode" data-mode="global">鍏ㄥ眬閰嶇疆</button>
      <button class="color-mode-switch-button ${mode === 'single' ? 'active' : ''}" type="button" data-action="select-color-mode" data-mode="single">鍗曢敭閰嶇疆</button>
      <button class="color-mode-switch-button color-mode-action-button" type="button" data-action="copy-theme" data-source-theme="${escapeHtml(state.theme)}" data-target-theme="${escapeHtml(otherTheme)}">褰撳墠澶嶅埗鍒?{escapeHtml(otherTheme)}</button>
      <button class="color-mode-switch-button color-mode-action-button" type="button" data-action="copy-theme" data-source-theme="${escapeHtml(otherTheme)}" data-target-theme="${escapeHtml(state.theme)}">${escapeHtml(otherTheme)}瑕嗙洊鍒板綋鍓?/button>
    </div>
    ${mode === 'global' ? `
      <div class="editor-context-group-picker">
        ${renderColorGroupSelect(groups, activeGroupId)}
      </div>
    ` : ''}
  `;
  el.editorContextActions.hidden = false;
}

function renderFontSizeEditor() {
  const fontSize = state.project.lib.fontSize || {};
  const fields = Object.keys(fontSize).map((key) =>
    renderFormField(
      key,
      `<input data-editor="fontSize" data-key="${escapeHtml(key)}" data-number="true" type="number" step="0.1" value="${escapeHtml(fontSize[key])}" />`
    )
  );

  return `
    <div class="form-panel">
      <h3>瀛楀彿閰嶇疆</h3>
      <p>杩欓噷闆嗕腑鎺у埗妯℃澘涓墍鏈夊瓧鍙烽敭鍊硷紝鏀瑰畬浼氬奖鍝嶅搴斿墠鏅€佸€欓€夈€佸伐鍏锋爮鍜岄潰鏉挎枃瀛楀ぇ灏忋€?/p>
      <div class="badge-row">
        <span class="badge">瀛楁鏁帮細${fields.length}</span>
      </div>
      <div class="form-grid">${fields.join('')}</div>
    </div>
  `;
}

function renderOthersEditor() {
  const others = state.project.lib.others || {};
  return `
    ${Object.keys(others)
      .map((groupKey) => {
        const group = others[groupKey] || {};
        return `
          <div class="form-panel">
            <h3>${escapeHtml(groupKey)}</h3>
            <p>杩欓噷鎺у埗 ${escapeHtml(groupKey)} 涓嬮敭鐩樻暣浣撳昂瀵搞€佸伐鍏锋爮楂樺害鍜?preedit 楂樺害銆?/p>
            <div class="form-grid">
              ${Object.keys(group)
                .map((key) =>
                  renderFormField(
                    key,
                    `<input data-editor="others" data-group="${escapeHtml(groupKey)}" data-key="${escapeHtml(key)}" data-number="true" type="number" step="0.1" value="${escapeHtml(group[key])}" />`
                  )
                )
                .join('')}
            </div>
          </div>
        `;
      })
      .join('')}
  `;
}

function renderAnimationFieldInput(key, value, field, options = {}) {
  const editorAttrs = `data-editor="theme-animation" data-key="${escapeHtml(key)}" data-field="${field}"`;
  if (options.kind === 'boolean') {
    return renderFormField(field, `<select ${editorAttrs}><option value="true" ${value[field] ? 'selected' : ''}>true</option><option value="false" ${!value[field] ? 'selected' : ''}>false</option></select>`);
  }
  if (options.kind === 'list') {
    return renderWideField(field, `<textarea ${editorAttrs}>${escapeHtml(Array.isArray(value[field]) ? value[field].join('\n') : '')}</textarea>`, '涓€琛屼竴涓浘鐗囨枃浠跺悕銆?);
  }
  if (options.kind === 'point') {
    const point = value[field] || {};
    return renderWideField(field, `
      <div class="form-grid compact-nested-grid">
        ${renderFormField('x', `<input ${editorAttrs} data-axis="x" data-number="true" type="number" step="${options.step || '0.01'}" value="${escapeHtml(point.x ?? '')}" />`)}
        ${renderFormField('y', `<input ${editorAttrs} data-axis="y" data-number="true" type="number" step="${options.step || '0.01'}" value="${escapeHtml(point.y ?? '')}" />`)}
      </div>
    `);
  }
  return renderFormField(field, `<input ${editorAttrs} ${options.number ? 'data-number="true" type="number"' : ''} step="${options.step || '0.01'}" value="${escapeHtml(value[field] ?? '')}" />`);
}

function renderAnimationConfigFields(key, value) {
  const type = value.animationType || 'scale';
  const common = renderFormField('animationType', `<select data-editor="theme-animation" data-key="${escapeHtml(key)}" data-field="animationType"><option value="scale" ${type === 'scale' ? 'selected' : ''}>scale 缂╂斁</option><option value="cartoon" ${type === 'cartoon' ? 'selected' : ''}>cartoon 鍥剧墖甯?/option><option value="physics" ${type === 'physics' ? 'selected' : ''}>physics 鐗╃悊</option></select>`);
  if (type === 'cartoon') {
    return `
      ${common}
      ${renderAnimationFieldInput(key, value, 'fps', { number: true, step: '1' })}
      ${renderAnimationFieldInput(key, value, 'targetScale', { number: true })}
      ${renderFormField('zPosition', `<select data-editor="theme-animation" data-key="${escapeHtml(key)}" data-field="zPosition"><option value="above" ${value.zPosition !== 'below' ? 'selected' : ''}>above 涓婃柟</option><option value="below" ${value.zPosition === 'below' ? 'selected' : ''}>below 涓嬫柟</option></select>`)}
      ${renderAnimationFieldInput(key, value, 'images', { kind: 'list' })}
    `;
  }
  if (type === 'physics') {
    return `
      ${common}
      ${renderAnimationFieldInput(key, value, 'duration', { number: true, step: '1' })}
      ${renderAnimationFieldInput(key, value, 'randomImage', { kind: 'boolean' })}
      ${renderAnimationFieldInput(key, value, 'targetScale', { number: true })}
      ${renderAnimationFieldInput(key, value, 'images', { kind: 'list' })}
      ${renderAnimationFieldInput(key, value, 'startPosition', { kind: 'point' })}
      ${renderAnimationFieldInput(key, value, 'endPosition', { kind: 'point' })}
      ${renderAnimationFieldInput(key, value, 'randomPosition', { kind: 'point' })}
      ${renderAnimationFieldInput(key, value, 'useOpacity', { kind: 'boolean' })}
      ${renderAnimationFieldInput(key, value, 'startOpacity', { number: true })}
      ${renderAnimationFieldInput(key, value, 'endOpacity', { number: true })}
      ${renderAnimationFieldInput(key, value, 'useRotation', { kind: 'boolean' })}
      ${renderAnimationFieldInput(key, value, 'startAngle', { number: true, step: '1' })}
      ${renderAnimationFieldInput(key, value, 'endAngle', { number: true, step: '1' })}
      ${renderAnimationFieldInput(key, value, 'randomAngle', { number: true, step: '1' })}
    `;
  }
  return `
    ${common}
    ${renderAnimationFieldInput(key, value, 'scale', { number: true })}
    ${renderAnimationFieldInput(key, value, 'pressDuration', { number: true, step: '1' })}
    ${renderAnimationFieldInput(key, value, 'releaseDuration', { number: true, step: '1' })}
    ${renderAnimationFieldInput(key, value, 'isAutoReverse', { kind: 'boolean' })}
  `;
}

function renderThemeEditor() {
  const theme = state.project.lib.theme || {};
  const center = theme.center || {};
  const animation = theme.animation || {};

  const centerFields = Object.keys(center).map((key) => {
    const value = center[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return `
        ${'x' in value ? renderFormField(`${key}.x`, `<input data-editor="theme-center" data-key="${escapeHtml(key)}" data-axis="x" data-number="true" type="number" step="0.01" value="${escapeHtml(value.x)}" />`) : ''}
        ${'y' in value ? renderFormField(`${key}.y`, `<input data-editor="theme-center" data-key="${escapeHtml(key)}" data-axis="y" data-number="true" type="number" step="0.01" value="${escapeHtml(value.y)}" />`) : ''}
      `;
    }

    return renderFormField(key, `<input data-editor="theme-center-scalar" data-key="${escapeHtml(key)}" data-number="true" type="number" step="0.01" value="${escapeHtml(value)}" />`);
  }).join('');

  const animationFields = Object.keys(animation).map((key) => {
    const value = animation[key] || {};
    return renderWideField(key, `
        <div class="form-grid compact-nested-grid">
          ${renderAnimationConfigFields(key, value)}
        </div>
    `);
  }).join('');

  return `
    <div class="form-panel">
      <h3>涓婚鍋忕Щ涓庡姩鐢?/h3>
      <div class="badge-row">
        <span class="badge">鍋忕Щ/缂╂斁锛?{Object.keys(center).length}</span>
        <span class="badge">鍔ㄧ敾锛?{Object.keys(animation).length}</span>
      </div>
    </div>
    ${renderCollapsiblePanel('鍋忕Щ / 缂╂斁', `
      <div class="form-grid">${centerFields}</div>
    `, { meta: `${Object.keys(center).length} 椤筦 })}
    ${renderCollapsiblePanel('鎸夐敭鍔ㄧ敾', `
      <div class="form-grid">${animationFields}</div>
    `, { meta: `${Object.keys(animation).length} 椤筦 })}
  `;
}

function getToolbarKeys() {
  const toolbar = state.project.lib.toolbar || {};
  const defaultButtons = toolbar.default?.buttons || {};
  const englishOverrides = toolbar.english?.overrides || {};
  const orderedKeys = [];
  const pushKey = (key) => {
    if (!key || orderedKeys.includes(key)) return;
    orderedKeys.push(key);
  };

  (toolbar.default?.layout || []).forEach(pushKey);
  (toolbar.english?.layout || []).forEach(pushKey);
  Object.keys(defaultButtons).forEach(pushKey);
  Object.keys(englishOverrides).forEach(pushKey);

  return orderedKeys;
}

function ensureToolbarSelection() {
  const keys = getToolbarKeys();
  return ensureSelectedKey('toolbar', keys);
}

function getToolbarButtonInfo(key, scope = 'default') {
  const toolbar = state.project.lib.toolbar || {};
  if (scope === 'default') {
    const root = toolbar.default || {};
    root.buttons = root.buttons || {};
    root.buttons[key] = root.buttons[key] || {};
    return root.buttons[key];
  }

  toolbar.english = toolbar.english || { layout: [], overrides: {} };
  toolbar.english.overrides = toolbar.english.overrides || {};
  toolbar.english.overrides[key] = toolbar.english.overrides[key] || {};
  return toolbar.english.overrides[key];
}

function getToolbarScopedSpec(scope = 'default') {
  const toolbar = ensureToolbarDocConfig();
  if (scope === 'default' || scope === 'english') {
    const key = state.selectedKeys.toolbar;
    return key ? getToolbarButtonInfo(key, scope) : null;
  }
  if (scope === 'horizontal-candidate') return toolbar.horizontalCandidates.expandButton;
  if (scope === 'vertical-return') return toolbar.verticalCandidates.returnButton;
  if (scope === 'vertical-backspace') return toolbar.verticalCandidates.backspaceButton;
  if (scope === 'vertical-pageUp') return toolbar.verticalCandidates.pageUpButton;
  if (scope === 'vertical-pageDown') return toolbar.verticalCandidates.pageDownButton;
  return null;
}

function getToolbarLayoutValues(scope = 'default') {
  const toolbar = state.project.lib.toolbar || {};
  if (scope === 'default') {
    toolbar.default = toolbar.default || { layout: [], buttons: {} };
    toolbar.default.layout = Array.isArray(toolbar.default.layout) ? toolbar.default.layout : [];
    return toolbar.default.layout;
  }
  toolbar.english = toolbar.english || { layout: [], overrides: {} };
  toolbar.english.layout = Array.isArray(toolbar.english.layout) ? toolbar.english.layout : [];
  return toolbar.english.layout;
}

function setToolbarLayoutValues(scope = 'default', values = []) {
  const nextValues = Array.isArray(values) ? values : [];
  if (scope === 'default') {
    state.project.lib.toolbar.default = state.project.lib.toolbar.default || { layout: [], buttons: {} };
    state.project.lib.toolbar.default.layout = nextValues;
    return;
  }
  state.project.lib.toolbar.english = state.project.lib.toolbar.english || { layout: [], overrides: {} };
  state.project.lib.toolbar.english.layout = nextValues;
}

function ensureToolbarDocConfig() {
  const toolbar = state.project.lib.toolbar || (state.project.lib.toolbar = {});
  toolbar.style = toolbar.style && typeof toolbar.style === 'object' ? toolbar.style : {};
  toolbar.style.insets = toolbar.style.insets && typeof toolbar.style.insets === 'object' ? toolbar.style.insets : {};

  toolbar.preedit = toolbar.preedit && typeof toolbar.preedit === 'object' ? toolbar.preedit : {};
  toolbar.preedit.style = toolbar.preedit.style && typeof toolbar.preedit.style === 'object' ? toolbar.preedit.style : {};
  toolbar.preedit.style.insets = toolbar.preedit.style.insets && typeof toolbar.preedit.style.insets === 'object'
    ? toolbar.preedit.style.insets
    : { top: 2, left: 8, bottom: 0, right: 0 };
  if (!toolbar.preedit.style.backgroundColorKey) toolbar.preedit.style.backgroundColorKey = '閿洏鑳屾櫙棰滆壊';
  if (!toolbar.preedit.style.textColorKey) toolbar.preedit.style.textColorKey = '鍊欓€夊瓧浣撴湭閫変腑瀛椾綋棰滆壊';
  if (!toolbar.preedit.style.fontSizeKey) toolbar.preedit.style.fontSizeKey = 'preedit鍖哄瓧浣撳ぇ灏?;
  if (toolbar.preedit.style.fontWeight == null) toolbar.preedit.style.fontWeight = 0;

  toolbar.horizontalCandidates = toolbar.horizontalCandidates && typeof toolbar.horizontalCandidates === 'object'
    ? toolbar.horizontalCandidates
    : {};
  toolbar.horizontalCandidates.style = toolbar.horizontalCandidates.style && typeof toolbar.horizontalCandidates.style === 'object'
    ? toolbar.horizontalCandidates.style
    : {};
  toolbar.horizontalCandidates.style.insets = toolbar.horizontalCandidates.style.insets && typeof toolbar.horizontalCandidates.style.insets === 'object'
    ? toolbar.horizontalCandidates.style.insets
    : { top: 8, left: 5, bottom: 3, right: 0 };
  if (!toolbar.horizontalCandidates.style.backgroundColorKey) toolbar.horizontalCandidates.style.backgroundColorKey = '閿洏鑳屾櫙棰滆壊';
  toolbar.horizontalCandidates.layout = Array.isArray(toolbar.horizontalCandidates.layout)
    ? toolbar.horizontalCandidates.layout
    : ['horizontalCandidates', 'expandButton'];
  toolbar.horizontalCandidates.candidate = toolbar.horizontalCandidates.candidate && typeof toolbar.horizontalCandidates.candidate === 'object'
    ? toolbar.horizontalCandidates.candidate
    : {};
  if (!toolbar.horizontalCandidates.candidate.width) toolbar.horizontalCandidates.candidate.width = '7/8';
  toolbar.horizontalCandidates.candidate.insets = toolbar.horizontalCandidates.candidate.insets && typeof toolbar.horizontalCandidates.candidate.insets === 'object'
    ? toolbar.horizontalCandidates.candidate.insets
    : { top: 0, left: 3, bottom: 0, right: 0 };
  toolbar.horizontalCandidates.expandButton = toolbar.horizontalCandidates.expandButton && typeof toolbar.horizontalCandidates.expandButton === 'object'
    ? toolbar.horizontalCandidates.expandButton
    : { kind: 'systemImage', systemImageName: 'chevron.down', fontSizeKey: 'toolbar鎸夐敭鍓嶆櫙sf绗﹀彿澶у皬' };
  if (!('action' in toolbar.horizontalCandidates.expandButton)) toolbar.horizontalCandidates.expandButton.action = { shortcut: '#candidatesBarStateToggle' };

  toolbar.verticalCandidates = toolbar.verticalCandidates && typeof toolbar.verticalCandidates === 'object'
    ? toolbar.verticalCandidates
    : {};
  toolbar.verticalCandidates.style = toolbar.verticalCandidates.style && typeof toolbar.verticalCandidates.style === 'object'
    ? toolbar.verticalCandidates.style
    : {};
  toolbar.verticalCandidates.style.insets = toolbar.verticalCandidates.style.insets && typeof toolbar.verticalCandidates.style.insets === 'object'
    ? toolbar.verticalCandidates.style.insets
    : { top: 3, left: 3, bottom: 1, right: 0 };
  toolbar.verticalCandidates.style.backgroundImage = toolbar.verticalCandidates.style.backgroundImage && typeof toolbar.verticalCandidates.style.backgroundImage === 'object'
    ? toolbar.verticalCandidates.style.backgroundImage
    : { file: 'bg', image: 'IMG1' };
  toolbar.verticalCandidates.layout = toolbar.verticalCandidates.layout && typeof toolbar.verticalCandidates.layout === 'object'
    ? toolbar.verticalCandidates.layout
    : {};
  if (!toolbar.verticalCandidates.layout.direction) toolbar.verticalCandidates.layout.direction = 'column';
  toolbar.verticalCandidates.layout.content = Array.isArray(toolbar.verticalCandidates.layout.content)
    ? toolbar.verticalCandidates.layout.content
    : ['verticalCandidates'];
  toolbar.verticalCandidates.layout.actions = Array.isArray(toolbar.verticalCandidates.layout.actions)
    ? toolbar.verticalCandidates.layout.actions
    : ['returnButton', 'backspaceButton', 'pageUpButton', 'pageDownButton'];
  toolbar.verticalCandidates.candidate = toolbar.verticalCandidates.candidate && typeof toolbar.verticalCandidates.candidate === 'object'
    ? toolbar.verticalCandidates.candidate
    : {};
  toolbar.verticalCandidates.candidate.insets = toolbar.verticalCandidates.candidate.insets && typeof toolbar.verticalCandidates.candidate.insets === 'object'
    ? toolbar.verticalCandidates.candidate.insets
    : { top: 3, left: 4, bottom: 3, right: 4 };
  toolbar.verticalCandidates.returnButton = toolbar.verticalCandidates.returnButton && typeof toolbar.verticalCandidates.returnButton === 'object'
    ? toolbar.verticalCandidates.returnButton
    : { kind: 'text', text: '杩斿洖', fontSizeKey: '鎸夐敭鍓嶆櫙鏂囧瓧澶у皬', fontSizeOffset: -3 };
  if (!('action' in toolbar.verticalCandidates.returnButton)) toolbar.verticalCandidates.returnButton.action = { shortcut: '#candidatesBarStateToggle' };
  toolbar.verticalCandidates.backspaceButton = toolbar.verticalCandidates.backspaceButton && typeof toolbar.verticalCandidates.backspaceButton === 'object'
    ? toolbar.verticalCandidates.backspaceButton
    : { kind: 'systemImage', systemImageName: 'delete.left', fontSizeKey: '鏁板瓧閿洏鏁板瓧鍓嶆櫙瀛椾綋澶у皬', fontSizeOffset: -3, center: { y: 0.53 } };
  if (!('action' in toolbar.verticalCandidates.backspaceButton)) toolbar.verticalCandidates.backspaceButton.action = 'backspace';
  toolbar.verticalCandidates.pageUpButton = toolbar.verticalCandidates.pageUpButton && typeof toolbar.verticalCandidates.pageUpButton === 'object'
    ? toolbar.verticalCandidates.pageUpButton
    : { kind: 'systemImage', systemImageName: 'chevron.up', fontSizeKey: '鏁板瓧閿洏鏁板瓧鍓嶆櫙瀛椾綋澶у皬', fontSizeOffset: -3, center: { y: 0.53 } };
  if (!('action' in toolbar.verticalCandidates.pageUpButton)) toolbar.verticalCandidates.pageUpButton.action = { shortcut: '#verticalCandidatesPageUp' };
  toolbar.verticalCandidates.pageDownButton = toolbar.verticalCandidates.pageDownButton && typeof toolbar.verticalCandidates.pageDownButton === 'object'
    ? toolbar.verticalCandidates.pageDownButton
    : { kind: 'systemImage', systemImageName: 'chevron.down', fontSizeKey: '鏁板瓧閿洏鏁板瓧鍓嶆櫙瀛椾綋澶у皬', fontSizeOffset: -3, center: { y: 0.53 } };
  if (!('action' in toolbar.verticalCandidates.pageDownButton)) toolbar.verticalCandidates.pageDownButton.action = { shortcut: '#verticalCandidatesPageDown' };

  toolbar.simpToggle = toolbar.simpToggle && typeof toolbar.simpToggle === 'object' ? toolbar.simpToggle : {};
  toolbar.simpToggle.off = toolbar.simpToggle.off && typeof toolbar.simpToggle.off === 'object'
    ? toolbar.simpToggle.off
    : { kind: 'text', text: '绠€', fontSize: 20, centerKey: 'toolbar鎸夐敭鍋忕Щ' };
  toolbar.simpToggle.on = toolbar.simpToggle.on && typeof toolbar.simpToggle.on === 'object'
    ? toolbar.simpToggle.on
    : { kind: 'text', text: '绻?, fontSize: 20, centerKey: 'toolbar鎸夐敭鍋忕Щ' };
  toolbar.simpToggle.notification = toolbar.simpToggle.notification && typeof toolbar.simpToggle.notification === 'object'
    ? toolbar.simpToggle.notification
    : {};
  if (!toolbar.simpToggle.notification.notificationType) toolbar.simpToggle.notification.notificationType = 'rime';
  if (!toolbar.simpToggle.notification.rimeNotificationType) toolbar.simpToggle.notification.rimeNotificationType = 'optionChanged';
  if (!toolbar.simpToggle.notification.rimeOptionName) toolbar.simpToggle.notification.rimeOptionName = 'jffh';
  if (toolbar.simpToggle.notification.rimeOptionValue == null) toolbar.simpToggle.notification.rimeOptionValue = true;
  if (toolbar.simpToggle.notification.lockedNotificationMatchState == null) toolbar.simpToggle.notification.lockedNotificationMatchState = false;

  return toolbar;
}

function ensureEnterNotificationConfig() {
  const keyboard26 = state.project.lib.keyboard26 || (state.project.lib.keyboard26 = {});
  keyboard26.enterNotifications = keyboard26.enterNotifications && typeof keyboard26.enterNotifications === 'object'
    ? keyboard26.enterNotifications
    : {};
  const defaults = {
    default: { labelKey: 'default', tone: 'default', returnKeyType: [0, 2, 3, 5, 8, 10, 11], lockedNotificationMatchState: false },
    go: { labelKey: 'go', tone: 'accent', returnKeyType: [1, 4], lockedNotificationMatchState: false },
    search: { labelKey: 'search', tone: 'accent', returnKeyType: [6], lockedNotificationMatchState: false },
    send: { labelKey: 'send', tone: 'accent', returnKeyType: [7], lockedNotificationMatchState: false },
    done: { labelKey: 'done', tone: 'accent', returnKeyType: [9], lockedNotificationMatchState: false },
  };
  Object.entries(defaults).forEach(([key, value]) => {
    const current = keyboard26.enterNotifications[key] && typeof keyboard26.enterNotifications[key] === 'object'
      ? keyboard26.enterNotifications[key]
      : {};
    keyboard26.enterNotifications[key] = {
      ...value,
      ...current,
      returnKeyType: Array.isArray(current.returnKeyType) ? current.returnKeyType : value.returnKeyType,
    };
  });
  return keyboard26.enterNotifications;
}

function reorderToolbarLayoutValue(scope, fromIndex, toIndex) {
  const current = [...getToolbarLayoutValues(scope)];
  if (!current.length) return false;
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return false;
  if (fromIndex < 0 || fromIndex >= current.length) return false;
  const normalizedIndex = Math.max(0, Math.min(toIndex, current.length));
  const [item] = current.splice(fromIndex, 1);
  const insertAt = normalizedIndex > fromIndex ? normalizedIndex - 1 : normalizedIndex;
  current.splice(insertAt, 0, item);
  setToolbarLayoutValues(scope, current);
  return true;
}

function renderInsetFields(editor, attrs, insets = {}, labels = { top: 'top', left: 'left', bottom: 'bottom', right: 'right' }) {
  const renderInlineField = (label, inputHtml) => `
    <div class="inset-field-inline">
      <label>${escapeHtml(label)}</label>
      ${inputHtml}
    </div>
  `;
  return `
    <div class="inset-field-grid inset-field-inline-grid">
      ${renderInlineField(labels.top, `<input ${renderDataAttributes({ editor, ...attrs, field: 'top' })} data-number="true" type="number" step="1" value="${escapeHtml(insets.top ?? '')}" />`)}
      ${renderInlineField(labels.left, `<input ${renderDataAttributes({ editor, ...attrs, field: 'left' })} data-number="true" type="number" step="1" value="${escapeHtml(insets.left ?? '')}" />`)}
      ${renderInlineField(labels.bottom, `<input ${renderDataAttributes({ editor, ...attrs, field: 'bottom' })} data-number="true" type="number" step="1" value="${escapeHtml(insets.bottom ?? '')}" />`)}
      ${renderInlineField(labels.right, `<input ${renderDataAttributes({ editor, ...attrs, field: 'right' })} data-number="true" type="number" step="1" value="${escapeHtml(insets.right ?? '')}" />`)}
    </div>
  `;
}

function renderToolbarLayoutChips(scope, values = []) {
  return `
    <div class="layout-row-editor">
      <div class="layout-chip-row toolbar-layout-row" data-layout-dropzone="true" data-layout-kind="toolbar" data-layout-row="${escapeHtml(scope)}">
        ${values.length
          ? values.map((key, index) => `
            <button
              class="layout-drag-chip toolbar-layout-chip"
              type="button"
              draggable="true"
              data-action="toolbar-layout-chip"
              data-layout-kind="toolbar"
              data-layout-row="${escapeHtml(scope)}"
              data-layout-index="${index}"
              data-layout-key="${escapeHtml(key)}"
            >${escapeHtml(key)}</button>
          `).join('')
          : '<span class="layout-chip-empty">褰撳墠甯冨眬涓虹┖锛屽彲鍦ㄤ笅鏂圭洿鎺ヨ緭鍏ョ煭閿悕銆?/span>'}
      </div>
      <textarea data-editor="toolbar-layout" data-scope="${escapeHtml(scope)}">${escapeHtml(values.join(', '))}</textarea>
    </div>
  `;
}

function renderToolbarButtonFields(spec, scope) {
  const actionData = getActionData(spec.action);
  const preeditActionData = getActionData(spec.preeditStateAction);
  const usesFlatLabel = !['default', 'english'].includes(scope);
  return `
    <div class="form-grid">
      ${scope === 'default' ? renderFormField('鎸夐挳 key', `<input data-editor="toolbar-button" data-scope="${scope}" data-field="key" value="${escapeHtml(spec.key || '')}" />`) : ''}
      ${scope !== 'english' ? renderFormField('fontSize', `<input data-editor="toolbar-button" data-scope="${scope}" data-field="fontSize" data-number="true" type="number" step="0.1" value="${escapeHtml(spec.fontSize ?? '')}" />`) : ''}
      ${renderFormField('鏍囩鏂囧瓧', `<input data-editor="toolbar-button" data-scope="${scope}" data-field="labelText" value="${escapeHtml(usesFlatLabel ? (spec.text || '') : (spec.label?.text || ''))}" />`)}
      ${renderFormField('绯荤粺鍥炬爣', `<input data-editor="toolbar-button" data-scope="${scope}" data-field="systemImageName" value="${escapeHtml(usesFlatLabel ? (spec.systemImageName || '') : (spec.label?.systemImageName || ''))}" />`)}
      ${renderFormField('鍓嶆櫙棰滆壊閿?, `<input data-editor="toolbar-button" data-scope="${scope}" data-field="colorKey" value="${escapeHtml(spec.colorKey || '')}" />`, '鐣欑┖鍒欐部鐢?toolbar鎸夐敭棰滆壊')}
      ${renderFormField('楂樹寒棰滆壊閿?, `<input data-editor="toolbar-button" data-scope="${scope}" data-field="highlightColorKey" value="${escapeHtml(spec.highlightColorKey || '')}" />`, '鐣欑┖鍒欒窡闅忓墠鏅鑹查敭')}
      ${renderActionFields('toolbar-button', { scope }, actionData)}
      ${renderNamedActionFields('toolbar-button', { scope }, 'preeditStateAction', preeditActionData, 'preeditStateAction', '棰勭紪杈戠姸鎬佷笅鐨勭偣鍑昏涓猴紝鐣欑┖鍒欑户鎵?action銆?)}
    </div>
  `;
}

function renderToolbarEditor() {
  const toolbar = ensureToolbarDocConfig();
  const keys = getToolbarKeys();
  const selectedKey = ensureToolbarSelection();
  const defaultLayout = toolbar.default?.layout || [];
  const englishLayout = toolbar.english?.layout || [];
  const defaultSpec = selectedKey ? getToolbarButtonInfo(selectedKey, 'default') : null;
  const englishSpec = selectedKey ? getToolbarButtonInfo(selectedKey, 'english') : null;
  const preeditStyle = toolbar.preedit?.style || {};
  const toolbarStyle = toolbar.style || {};
  const horizontalCandidates = toolbar.horizontalCandidates || {};
  const horizontalStyle = horizontalCandidates.style || {};
  const horizontalCandidate = horizontalCandidates.candidate || {};
  const verticalCandidates = toolbar.verticalCandidates || {};
  const verticalStyle = verticalCandidates.style || {};
  const verticalLayout = verticalCandidates.layout || {};
  const verticalCandidate = verticalCandidates.candidate || {};
  const simpToggle = toolbar.simpToggle || {};
  const simpNotification = simpToggle.notification || {};

  return `
    ${renderCollapsiblePanel('棰勭紪杈戝尯', `
      <div class="form-grid">
        ${renderInsetFields('toolbar-preedit', {}, preeditStyle.insets || {})}
        ${renderFormField('鑳屾櫙棰滆壊閿?, `<input data-editor="toolbar-preedit" data-field="backgroundColorKey" value="${escapeHtml(preeditStyle.backgroundColorKey || '')}" />`, '榛樿浣跨敤 閿洏鑳屾櫙棰滆壊')}
        ${renderFormField('鏂囧瓧棰滆壊閿?, `<input data-editor="toolbar-preedit" data-field="textColorKey" value="${escapeHtml(preeditStyle.textColorKey || '')}" />`, '榛樿浣跨敤 鍊欓€夊瓧浣撴湭閫変腑瀛椾綋棰滆壊')}
        ${renderFormField('瀛楀彿閿?, `<input data-editor="toolbar-preedit" data-field="fontSizeKey" value="${escapeHtml(preeditStyle.fontSizeKey || '')}" />`, '榛樿浣跨敤 preedit鍖哄瓧浣撳ぇ灏?)}
        ${renderFormField('fontWeight', `<input data-editor="toolbar-preedit" data-field="fontWeight" data-number="true" type="number" step="100" value="${escapeHtml(preeditStyle.fontWeight ?? '')}" />`)}
      </div>
    `, { meta: '鏍峰紡' })}
    ${renderCollapsiblePanel('宸ュ叿鏍忎笌妯悜鍊欓€?, `
      <div class="form-grid">
        ${renderWideField('toolbarStyle.insets', `<div class="form-grid">${renderInsetFields('toolbar-style', {}, toolbarStyle.insets || {})}</div>`)}
        ${renderWideField('horizontalCandidatesStyle.insets', `<div class="form-grid">${renderInsetFields('toolbar-horizontal-style', {}, horizontalStyle.insets || {})}</div>`)}
        ${renderFormField('妯悜鍊欓€夎儗鏅鑹查敭', `<input data-editor="toolbar-horizontal-style" data-field="backgroundColorKey" value="${escapeHtml(horizontalStyle.backgroundColorKey || '')}" />`, '榛樿浣跨敤 閿洏鑳屾櫙棰滆壊')}
        ${renderFormField('鍊欓€夊搴?, `<input data-editor="toolbar-horizontal-candidate" data-field="width" value="${escapeHtml(horizontalCandidate.width || '')}" />`, '鏀寔濡?7/8 杩欑被姣斾緥琛ㄨ揪寮?)}
        ${renderWideField('鍊欓€夊唴瀹瑰唴杈硅窛', `<div class="form-grid">${renderInsetFields('toolbar-horizontal-candidate', {}, horizontalCandidate.insets || {})}</div>`)}
        ${renderWideField('妯悜鍊欓€夊竷灞€', `<textarea data-editor="toolbar-horizontal-layout">${escapeHtml((horizontalCandidates.layout || []).join(', '))}</textarea>`, '鎸夐『搴忓～鍐?horizontalCandidates銆乪xpandButton 鎴栧叾浠栧崟鍏冨悕')}
      </div>
    `, { meta: '鍊欓€? })}
    ${renderCollapsiblePanel('妯悜鍊欓€夊睍寮€鎸夐挳', `
      ${renderToolbarButtonFields(horizontalCandidates.expandButton || {}, 'horizontal-candidate')}
    `, { meta: '鎸夐挳' })}
    ${renderCollapsiblePanel('绾靛悜鍊欓€?, `
      <div class="form-grid">
        ${renderWideField('verticalCandidatesStyle.insets', `<div class="form-grid">${renderInsetFields('toolbar-vertical-style', {}, verticalStyle.insets || {})}</div>`)}
        ${renderFormField('鑳屾櫙鍥剧墖鏂囦欢', `<input data-editor="toolbar-vertical-style" data-field="backgroundFile" value="${escapeHtml(verticalStyle.backgroundImage?.file || '')}" />`, '瀵瑰簲 resources 涓殑鍥剧墖鏂囦欢鍚?)}
        ${renderFormField('鑳屾櫙鍥剧墖瀛愬浘', `<input data-editor="toolbar-vertical-style" data-field="backgroundImage" value="${escapeHtml(verticalStyle.backgroundImage?.image || '')}" />`, '濡?IMG1')}
        ${renderFormField('甯冨眬鏂瑰悜', `<select data-editor="toolbar-vertical-layout" data-field="direction"><option value="column" ${verticalLayout.direction === 'column' ? 'selected' : ''}>column 鍒楀竷灞€</option><option value="row" ${verticalLayout.direction === 'row' ? 'selected' : ''}>row 琛屽竷灞€</option></select>`)}
        ${renderWideField('鍊欓€夊唴瀹瑰唴杈硅窛', `<div class="form-grid">${renderInsetFields('toolbar-vertical-candidate', {}, verticalCandidate.insets || {})}</div>`)}
        ${renderWideField('涓讳綋鍗曞厓椤哄簭', `<textarea data-editor="toolbar-vertical-layout" data-field="content">${escapeHtml((verticalLayout.content || []).join(', '))}</textarea>`, '閫氬父淇濈暀 verticalCandidates')}
        ${renderWideField('鍔ㄤ綔鍗曞厓椤哄簭', `<textarea data-editor="toolbar-vertical-layout" data-field="actions">${escapeHtml((verticalLayout.actions || []).join(', '))}</textarea>`, '鍙～鍐?returnButton銆乥ackspaceButton銆乸ageUpButton銆乸ageDownButton')}
      </div>
    `, { meta: '鍊欓€? })}
    ${renderCollapsiblePanel('绠€绻佸垏鎹㈤€氱煡', `
      <div class="form-grid">
        ${renderFormField('鏈尮閰嶆枃妗?, `<input data-editor="toolbar-simp-toggle" data-tone="off" data-field="text" value="${escapeHtml(simpToggle.off?.text || '')}" />`)}
        ${renderFormField('鍖归厤鍚庢枃妗?, `<input data-editor="toolbar-simp-toggle" data-tone="on" data-field="text" value="${escapeHtml(simpToggle.on?.text || '')}" />`)}
        ${renderFormField('notificationType', `<select data-editor="toolbar-simp-notification" data-field="notificationType"><option value="rime" ${simpNotification.notificationType === 'rime' ? 'selected' : ''}>rime</option></select>`)}
        ${renderFormField('rimeNotificationType', `<select data-editor="toolbar-simp-notification" data-field="rimeNotificationType"><option value="optionChanged" ${simpNotification.rimeNotificationType === 'optionChanged' ? 'selected' : ''}>optionChanged</option><option value="schemaChanged" ${simpNotification.rimeNotificationType === 'schemaChanged' ? 'selected' : ''}>schemaChanged</option></select>`)}
        ${renderFormField('rimeOptionName', `<input data-editor="toolbar-simp-notification" data-field="rimeOptionName" value="${escapeHtml(simpNotification.rimeOptionName || '')}" />`, '鍦?optionChanged 鏃剁敓鏁?)}
        ${renderFormField('rimeOptionValue', `<select data-editor="toolbar-simp-notification" data-field="rimeOptionValue"><option value="true" ${simpNotification.rimeOptionValue === true ? 'selected' : ''}>true</option><option value="false" ${simpNotification.rimeOptionValue === false ? 'selected' : ''}>false</option></select>`, '鍦?optionChanged 鏃剁敓鏁?)}
        ${renderFormField('rimeSchemaID', `<input data-editor="toolbar-simp-notification" data-field="rimeSchemaID" value="${escapeHtml(simpNotification.rimeSchemaID || '')}" />`, '鍦?schemaChanged 鏃跺缓璁紭鍏堝～鍐?)}
        ${renderFormField('rimeSchemaName', `<input data-editor="toolbar-simp-notification" data-field="rimeSchemaName" value="${escapeHtml(simpNotification.rimeSchemaName || '')}" />`, '浣滀负 schemaChanged 鐨勮ˉ鍏?)}
        ${renderFormField('lockedNotificationMatchState', `<select data-editor="toolbar-simp-notification" data-field="lockedNotificationMatchState"><option value="false" ${simpNotification.lockedNotificationMatchState ? '' : 'selected'}>false</option><option value="true" ${simpNotification.lockedNotificationMatchState ? 'selected' : ''}>true</option></select>`)}
      </div>
    `, { meta: '閫氱煡' })}
    ${renderCollapsiblePanel('绾靛悜鍊欓€夊姩浣滄寜閽?, `
      <div class="form-grid">
        ${renderWideField('杩斿洖鎸夐挳', renderToolbarButtonFields(verticalCandidates.returnButton || {}, 'vertical-return'))}
        ${renderWideField('閫€鏍兼寜閽?, renderToolbarButtonFields(verticalCandidates.backspaceButton || {}, 'vertical-backspace'))}
        ${renderWideField('涓婁竴椤垫寜閽?, renderToolbarButtonFields(verticalCandidates.pageUpButton || {}, 'vertical-pageUp'))}
        ${renderWideField('涓嬩竴椤垫寜閽?, renderToolbarButtonFields(verticalCandidates.pageDownButton || {}, 'vertical-pageDown'))}
      </div>
    `, { meta: '4 涓寜閽? })}
    ${renderCollapsiblePanel('宸ュ叿鏍忓竷灞€', `
      <div class="form-grid">
        ${renderWideField('default.layout', renderToolbarLayoutChips('default', defaultLayout))}
        ${renderWideField('english.layout', renderToolbarLayoutChips('english', englishLayout))}
      </div>
    `, { open: true, meta: '鎷栨嫿鎺掑簭' })}
    ${renderCollapsiblePanel('宸ュ叿鏍忔寜閽?, `
      <div class="key-chip-list">
        ${keys.map((key) => `<button class="key-chip ${key === selectedKey ? 'active' : ''}" type="button" data-action="select-key" data-domain="toolbar" data-key="${escapeHtml(key)}">${escapeHtml(key)}</button>`).join('')}
      </div>
    `, { open: true, meta: `${keys.length} 涓猔 })}
    ${selectedKey ? `
      ${renderCollapsiblePanel(`榛樿鎸夐挳锛?{selectedKey}`, `
        ${renderToolbarButtonFields(defaultSpec, 'default')}
      `, { open: true })}
      ${renderCollapsiblePanel(`鑻辨枃瑕嗙洊锛?{selectedKey}`, `
        ${renderToolbarButtonFields(englishSpec, 'english')}
      `)}
    ` : `
      <div class="form-panel">
        <h3>褰撳墠娌℃湁宸ュ叿鏍忔寜閽?/h3>
        <p>璇峰厛鍦?JSON 涓ˉ榻?default.buttons锛岄殢鍚庤繖閲屼細鑷姩鏄剧ず銆?/p>
      </div>
    `}
  `;
}

function renderHintSymbolsEditor() {
  const hintData = state.project.lib.hintSymbolsData || {};
  const groups = Object.keys(hintData);
  const group = ensureSelectedDataKey('hintGroup', groups);
  const keys = group ? Object.keys(hintData[group] || {}) : [];
  const hintKey = ensureSelectedDataKey('hintKey', keys);
  const entry = group && hintKey ? hintData[group][hintKey] : null;

  if (!group || !hintKey || !entry) {
    return `
      <div class="form-panel">
        <h3>褰撳墠娌℃湁鍙紪杈戦暱鎸夋暟鎹?/h3>
        <p>璇峰厛鍦?JSON 涓ˉ榻愬垎缁勬垨閿綅鏁版嵁銆?/p>
      </div>
    `;
  }

  return `
    <div class="form-panel">
      <h3>闀挎寜鍒嗙粍</h3>
      <p>鍏堥€夊垎缁勶紝鍐嶉€夊叿浣撻敭浣嶏紝涓嬮潰鍙紪杈戞瘡涓€欓€夋潯鐩殑鏍囩銆佸姩浣滃拰瀛楀彿銆?/p>
      <div class="key-chip-list">
        ${groups.map((item) => `<button class="key-chip ${item === group ? 'active' : ''}" type="button" data-action="select-data" data-data-key="hintGroup" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}
      </div>
      <div class="key-chip-list">
        ${keys.map((item) => `<button class="key-chip ${item === hintKey ? 'active' : ''}" type="button" data-action="select-data" data-data-key="hintKey" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}
      </div>
    </div>
    <div class="form-panel">
      <h3>${escapeHtml(group)} / ${escapeHtml(hintKey)}</h3>
      <p>鍒楄〃椤规寜椤哄簭鏄剧ず锛宻electedIndex 琛ㄧず榛樿楂樹寒椤广€?/p>
      <div class="form-grid">
        ${renderFormField('selectedIndex', `<input data-editor="hint-meta" data-field="selectedIndex" data-number="true" type="number" step="1" value="${escapeHtml(entry.selectedIndex ?? 0)}" />`)}
        ${renderFormField('size.width', `<input data-editor="hint-meta" data-field="width" data-number="true" type="number" step="1" value="${escapeHtml(entry.size?.width ?? '')}" />`)}
        ${renderFormField('size.height', `<input data-editor="hint-meta" data-field="height" data-number="true" type="number" step="1" value="${escapeHtml(entry.size?.height ?? '')}" />`)}
      </div>
    </div>
    ${entry.list.map((item, index) => `
      <div class="form-panel">
        <h3>鏉＄洰 ${index + 1}</h3>
        <div class="form-grid">
          ${renderFormField('鏍囩鏂囧瓧', `<input data-editor="hint-item" data-index="${index}" data-field="labelText" value="${escapeHtml(item.label?.text || '')}" />`)}
          ${renderFormField('绯荤粺鍥炬爣', `<input data-editor="hint-item" data-index="${index}" data-field="systemImageName" value="${escapeHtml(item.label?.systemImageName || '')}" />`)}
          ${renderFormField('瀛楀彿', `<input data-editor="hint-item" data-index="${index}" data-field="fontSize" data-number="true" type="number" step="0.1" value="${escapeHtml(item.fontSize ?? '')}" />`)}
          ${renderActionFields('hint-item', { index }, getActionData(item.action))}
        </div>
      </div>
    `).join('')}
  `;
}

function renderSwipeEditor() {
  const libKey = state.activeSection === 'lib.swipeDataEn' ? 'swipeDataEn' : 'swipeData';
  state.selectedData.swipeLib = libKey;
  const swipeData = state.project.lib[libKey] || {};
  const groups = Object.keys(swipeData);
  const group = ensureSelectedDataKey('swipeGroup', groups);
  const keys = group ? Object.keys(swipeData[group] || {}) : [];
  const swipeKey = ensureSelectedDataKey('swipeKey', keys);
  const entry = group && swipeKey ? swipeData[group][swipeKey] : null;
  const swipeLibOptions = [
    { key: 'swipeData', label: '涓枃鍒掑姩' },
    { key: 'swipeDataEn', label: '鑻辨枃鍒掑姩' },
  ];
  const swipeLibSelector = `
    <div class="key-chip-list">
      ${swipeLibOptions.map((item) => `<button class="key-chip ${item.key === libKey ? 'active' : ''}" type="button" data-action="select-swipe-library" data-value="${item.key}">${item.label}</button>`).join('')}
    </div>
  `;

  if (!group || !swipeKey || !entry) {
    return `
      <div class="form-panel">
        <h3>鍒掑姩璁剧疆</h3>
        <p>鍏堥€夋嫨涓枃鎴栬嫳鏂囧垝鍔ㄥ簱锛屽啀缂栬緫瀵瑰簲鍒嗙粍鍜岄敭浣嶃€?/p>
        ${swipeLibSelector}
      </div>
      <div class="form-panel">
        <h3>褰撳墠娌℃湁鍙紪杈戝垝鍔ㄦ暟鎹?/h3>
        <p>璇峰厛鍦?JSON 涓ˉ榻愬搴斿垎缁勬垨閿綅鏁版嵁銆?/p>
      </div>
    `;
  }

  return `
    <div class="form-panel">
      <h3>鍒掑姩璁剧疆</h3>
      <p>鍏堥€夋嫨涓枃鎴栬嫳鏂囧垝鍔ㄥ簱锛屽啀閫変笂鍒?涓嬪垝鍒嗙粍鍜屽叿浣撻敭浣嶃€?/p>
      ${swipeLibSelector}
      <div class="badge-row">
        <span class="badge">褰撳墠锛?{libKey === 'swipeDataEn' ? '鑻辨枃鍒掑姩' : '涓枃鍒掑姩'}</span>
      </div>
      <div class="key-chip-list">
        ${groups.map((item) => `<button class="key-chip ${item === group ? 'active' : ''}" type="button" data-action="select-data" data-data-key="swipeGroup" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}
      </div>
      <div class="key-chip-list">
        ${keys.map((item) => `<button class="key-chip ${item === swipeKey ? 'active' : ''}" type="button" data-action="select-data" data-data-key="swipeKey" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}
      </div>
    </div>
    <div class="form-panel">
      <h3>${escapeHtml(group)} / ${escapeHtml(swipeKey)}</h3>
      <p>杩欓噷鎺у埗涓婂垝/涓嬪垝鐨勮Е鍙戝姩浣滃拰鎻愮ず瀛楃浣嶇疆銆?/p>
      <div class="form-grid">
        ${renderActionFields('swipe-item', {}, getActionData(entry.action))}
        ${renderFormField('center.x', `<input data-editor="swipe-item" data-field="centerX" data-number="true" type="number" step="0.01" value="${escapeHtml(entry.center?.x ?? '')}" />`)}
        ${renderFormField('center.y', `<input data-editor="swipe-item" data-field="centerY" data-number="true" type="number" step="0.01" value="${escapeHtml(entry.center?.y ?? '')}" />`)}
      </div>
    </div>
  `;
}

function renderCollectionEditor() {
  const collection = state.project.lib.collectionData || {};
  const sources = Object.keys(collection);
  const source = ensureSelectedDataKey('collectionSource', sources, 'symbolicDataSource');
  const sourceValue = source ? collection[source] : null;
  const sourceSelector = `
    <div class="form-panel">
      <h3>DataSource 鏁版嵁婧?/h3>
      <p>鍏堥€?DataSource锛屽啀缂栬緫瀵瑰簲鍐呭銆備笉鍚?DataSource 浼氫娇鐢ㄥ悇鑷洿閫傚悎闃呰鐨勭紪杈戞柟寮忋€?/p>
      <div class="key-chip-list">
        ${sources.map((item) => `<button class="key-chip ${item === source ? 'active' : ''}" type="button" data-action="select-data" data-data-key="collectionSource" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}
      </div>
    </div>
  `;

  if (!source || !sourceValue) {
    return `
      ${sourceSelector}
      <div class="form-panel">
        <h3>褰撳墠娌℃湁鍙紪杈?DataSource</h3>
        <p>璇峰厛鍦?JSON 涓ˉ榻?collectionData銆?/p>
      </div>
    `;
  }

  if (source === 'numericSymbols') {
    return `
      ${sourceSelector}
      <div class="form-panel">
        <h3>numericSymbols DataSource</h3>
        <p>姣忚涓€椤广€傜函鏂囨湰鍙洿鎺ュ啓锛屽鏉傞」鐢?鏍囩|action绫诲瀷|action鍊笺€?/p>
        <div class="form-grid">
          ${renderWideField('鏉＄洰鍒楄〃', `<textarea data-editor="collection-list" data-source="numericSymbols">${escapeHtml(sourceValue.map(serializeSymbolEntry).join('\n'))}</textarea>`)}
        </div>
      </div>
    `;
  }

  if (source === 'pinyin9Symbols') {
    return `
      ${sourceSelector}
      <div class="form-panel">
        <h3>pinyin9Symbols DataSource</h3>
        <p>姣忚鏍煎紡锛氭爣绛緗瀹為檯涓婂睆鍐呭銆?/p>
        <div class="form-grid">
          ${renderWideField('鏉＄洰鍒楄〃', `<textarea data-editor="collection-list" data-source="pinyin9Symbols">${escapeHtml(sourceValue.map(serializePinyin9Entry).join('\n'))}</textarea>`)}
        </div>
      </div>
    `;
  }

  const keys = Object.keys(sourceValue);
  const preferred = keys.includes('category') ? 'category' : keys[0];
  const collectionKey = ensureSelectedDataKey('collectionKey', keys, preferred);
  const entry = sourceValue[collectionKey];
  const textValue = Array.isArray(entry) ? entry.join('\n') : '';

  return `
    ${sourceSelector}
    <div class="form-panel">
      <h3>DataSource 鍒嗙粍</h3>
      <p>鍏堥€?DataSource锛屽啀閫夊垎绫婚敭銆傛暟缁勫唴瀹规敮鎸佹寜琛岀紪杈戯紝闃呰鎬т細姣?JSON 鏇村ソ銆?/p>
      <div class="key-chip-list">
        ${keys.map((item) => `<button class="key-chip ${item === collectionKey ? 'active' : ''}" type="button" data-action="select-data" data-data-key="collectionKey" data-value="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}
      </div>
    </div>
    <div class="form-panel">
      <h3>${escapeHtml(source)} / ${escapeHtml(collectionKey)}</h3>
      <p>${collectionKey === 'category' ? '鍒嗙被椤哄簭涓€琛屼竴涓紝淇敼鍚庝細鐩存帴褰卞搷鍒嗙被灞曠ず椤哄簭銆? : '姣忚涓€椤癸紝閫傚悎鎵归噺绮樿创鍜屾暣鐞嗐€?}</p>
      <div class="form-grid">
        ${renderWideField('鍐呭鍒楄〃', `<textarea data-editor="collection-array" data-source="${escapeHtml(source)}" data-key="${escapeHtml(collectionKey)}">${escapeHtml(textValue)}</textarea>`)}
      </div>
    </div>
  `;
}

function renderLayoutEditor() {
  const definition = getCurrentLayoutDefinition();
  const insetTarget = getCurrentLayoutInsetsTarget();
  return `
    <div class="form-panel">
      <h3>${escapeHtml(definition.title)}</h3>
      <p>${escapeHtml(definition.hint)}</p>
      <div class="form-grid">
        ${insetTarget
          ? renderWideField(
            '鎸夐敭杈硅窛',
            `<div class="form-grid">${renderInsetFields('layout-insets', { kind: definition.kind }, insetTarget.insets || {}, {
              top: '涓?,
              left: '宸?,
              bottom: '涓?,
              right: '鍙?,
            })}</div>`,
            '鎺у埗褰撳墠甯冨眬鍐呭鍖虹殑涓婁笅宸﹀彸杈硅窛'
          )
          : ''}
        ${definition.rows
          .map((row) =>
            renderWideField(
              row.label,
              `
                <div class="layout-row-editor">
                  <div class="layout-chip-row" data-layout-dropzone="true" data-layout-kind="${escapeHtml(definition.kind)}" data-layout-row="${escapeHtml(row.key)}">
                    ${row.values.length
                      ? row.values
                        .map((key, index) => `<button class="layout-drag-chip" type="button" draggable="true" data-action="layout-chip" data-layout-kind="${escapeHtml(definition.kind)}" data-layout-row="${escapeHtml(row.key)}" data-layout-index="${index}" data-layout-key="${escapeHtml(key)}">${escapeHtml(key)}</button>`)
                        .join('')
                      : '<span class="layout-chip-empty">褰撳墠琛屼负绌猴紝鍙湪涓嬫柟鐩存帴杈撳叆鐭敭鍚嶃€?/span>'}
                  </div>
                  <textarea data-editor="layout" data-kind="${escapeHtml(definition.kind)}" data-row="${escapeHtml(row.key)}">${escapeHtml(row.values.join(', '))}</textarea>
                </div>
              `,
              '鐢ㄩ€楀彿鍒嗛殧鐭敭鍚?
            )
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderGenericButtonFields(spec, hint) {
  const actionData = getActionData(spec.action);
  const preeditActionData = getActionData(spec.preeditStateAction);
  return `
    <div class="form-panel">
      <h3>鎸夐敭閰嶇疆</h3>
      <p>${escapeHtml(hint)}</p>
      <div class="form-grid">
        ${renderFormField('涓绘爣绛炬枃瀛?, `<input data-editor="button" data-field="primaryText" value="${escapeHtml(getLabelTextAt(spec, 0))}" />`)}
        ${renderFormField('绯荤粺鍥炬爣', `<input data-editor="button" data-field="systemImageName" value="${escapeHtml(spec.label?.systemImageName || '')}" />`, '濡?delete.left / globe')}
        ${renderFormField('鍓爣绛炬枃瀛?, `<input data-editor="button" data-field="secondaryText" value="${escapeHtml(getLabelTextAt(spec, 1))}" />`)}
        ${renderFormField('repeat', `<input data-editor="button" data-field="repeat" value="${escapeHtml(spec.repeat || '')}" />`, '濡?backspace')}
        ${renderFormField('鍓嶆櫙棰滆壊閿?, `<input data-editor="button" data-field="colorKey" value="${escapeHtml(spec.colorKey || '')}" />`, '鐣欑┖鍒欐部鐢ㄥ叏灞€鎸夐敭鍓嶆櫙棰滆壊')}
        ${renderFormField('楂樹寒棰滆壊閿?, `<input data-editor="button" data-field="highlightColorKey" value="${escapeHtml(spec.highlightColorKey || '')}" />`, '鐣欑┖鍒欒窡闅忓墠鏅鑹查敭')}
        ${renderActionFields('button', {}, actionData, 'rawString 鐩存帴鍐欏瓧绗︿覆锛宩son 妯″紡鍙洿鎺ュ啓瀵硅薄 JSON')}
        ${renderNamedActionFields('button', {}, 'preeditStateAction', preeditActionData, 'preeditStateAction', '棰勭紪杈戠姸鎬佷笅鐨勭偣鍑昏涓猴紝鐣欑┖鍒欑户鎵?action銆?)}
      </div>
    </div>
  `;
}

function renderKeyboard26SpecialEditor(selectedKey, info) {
  if (info.kind === 'fixed') {
    return `
      <div class="form-panel">
        <h3>鍥哄畾閿鏄?/h3>
        <p>褰撳墠閿敱鍥哄畾寮曟搸灞傛覆鏌擄紝甯歌 DIY 涓嶉渶瑕佸崟鐙厤缃€傝嫢瑕佺户缁繁鏀癸紝鍙垏鎹㈠埌 JSON 妯″紡銆?/p>
      </div>
    `;
  }

  if (info.kind === 'space') {
    return `
      <div class="form-panel">
        <h3>绌烘牸閿厤缃?/h3>
        <p>杩欓噷鎺у埗绌烘牸涓绘枃妗堝拰宸︿笂瑙掓柟妗堟彁绀恒€?/p>
        <div class="form-grid">
          ${renderFormField('绌烘牸涓绘爣绛?, `<input data-editor="button" data-field="spaceLabel" value="${escapeHtml(info.variant.spaceLabel || '')}" />`)}
          ${renderFormField('鏂规鍓爣绛?, `<input data-editor="button" data-field="schemaLabelText" value="${escapeHtml(info.variant.schemaLabel?.text || '')}" />`)}
        </div>
      </div>
    `;
  }

  if (info.kind === 'spaceRight') {
    return `
      <div class="form-panel">
        <h3>绌烘牸鍙充晶閿?/h3>
        <p>甯哥敤浜庝腑鑻辨爣鐐瑰垏鎹㈡垨鍙屽眰绗﹀彿鏄剧ず銆?/p>
        <div class="form-grid">
          ${renderFormField('涓婂眰鏍囩', `<input data-editor="button" data-field="spaceRightTop" value="${escapeHtml(info.spec.labels?.[0]?.text || '')}" />`)}
          ${renderFormField('涓嬪眰鏍囩', `<input data-editor="button" data-field="spaceRightBottom" value="${escapeHtml(info.spec.labels?.[1]?.text || '')}" />`)}
          ${renderActionFields('button', {}, getActionData(info.spec.action))}
        </div>
      </div>
    `;
  }

  if (info.kind === 'enter') {
    const enterLabels = state.project.lib.keyboard26.enterLabels || {};
    const enterNotifications = ensureEnterNotificationConfig();
    return `
      <div class="form-panel">
        <h3>鍥炶溅閿枃妗?/h3>
        <p>杩欓噷缁熶竴绠＄悊涓嶅悓 ReturnKeyType 涓嬬殑鏂囨銆?/p>
        <div class="form-grid">
          ${Object.keys(enterLabels)
            .map((key) => renderFormField(key, `<input data-editor="button" data-field="enterLabel" data-enter-key="${escapeHtml(key)}" value="${escapeHtml(enterLabels[key] || '')}" />`))
            .join('')}
        </div>
      </div>
      <div class="form-panel">
        <h3>鍥炶溅閿€氱煡</h3>
        <p>杩欓噷瀵瑰簲鏂囨。涓殑 <code>returnKeyType</code> 閫氱煡銆傛瘡缁勭被鍨嬪懡涓悗锛屼細鍒囨崲鍒伴粯璁ゆ垨寮鸿皟鏍峰紡锛屽苟浣跨敤涓婇潰瀵瑰簲鐨勬枃妗堛€?/p>
        ${Object.entries(enterNotifications).map(([notificationKey, notification]) => `
          <div class="form-panel">
            <h3>${escapeHtml(notification.labelKey || notificationKey)}</h3>
            <div class="form-grid">
              ${renderFormField('鏍峰紡璇皵', `<select data-editor="enter-notification" data-key="${escapeHtml(notificationKey)}" data-field="tone"><option value="default" ${notification.tone === 'default' ? 'selected' : ''}>default 榛樿</option><option value="accent" ${notification.tone === 'accent' ? 'selected' : ''}>accent 寮鸿皟</option></select>`)}
              ${renderFormField('lockedNotificationMatchState', `<select data-editor="enter-notification" data-key="${escapeHtml(notificationKey)}" data-field="lockedNotificationMatchState"><option value="false" ${notification.lockedNotificationMatchState ? '' : 'selected'}>false</option><option value="true" ${notification.lockedNotificationMatchState ? 'selected' : ''}>true</option></select>`)}
              ${renderWideField('returnKeyType', `<textarea data-editor="enter-notification" data-key="${escapeHtml(notificationKey)}" data-field="returnKeyType">${escapeHtml((notification.returnKeyType || []).join(', '))}</textarea>`, '鐢ㄩ€楀彿鍒嗛殧锛屽 1, 4')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  return renderGenericButtonFields(info.spec, '鍙洿鎺ョ粰鏂板鐭敭琛ラ綈鏍囩鍜?action銆?);
}

function renderButtonCopyEditor(domain, selectedKey) {
  const targetKeys = getButtonKeys(domain).filter((key) => key !== selectedKey && isCopyableButtonKey(domain, key));
  const sourceCopyable = isCopyableButtonKey(domain, selectedKey);

  return `
    <div class="form-panel">
      <h3>澶嶅埗褰撳墠閿厤缃?/h3>
      <p>${sourceCopyable ? '鎶婂綋鍓嶉敭鐨勯厤缃繁鎷疯礉鍒板彟涓€涓煭閿悕锛岄€傚悎蹇€熸柊澧炲悓绫婚敭銆? : '褰撳墠閿睘浜庡浐瀹氭垨鐗规畩閿紝涓嶈兘鐩存帴浣滀负澶嶅埗婧愩€?}</p>
      <div class="inline-actions">
        <select data-copy-target-domain="${escapeHtml(domain)}" ${!sourceCopyable || !targetKeys.length ? 'disabled' : ''}>
          ${targetKeys.length
            ? targetKeys.map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(key)}</option>`).join('')
            : '<option value="">娌℃湁鍙鍒剁洰鏍?/option>'}
        </select>
        <button type="button" data-action="copy-key-config" data-domain="${escapeHtml(domain)}" ${!sourceCopyable || !targetKeys.length ? 'disabled' : ''}>澶嶅埗鍒扮洰鏍囬敭</button>
      </div>
    </div>
  `;
}

function renderButtonEditor() {
  const domain = state.activeSection.replace('lib.', '');
  const keys = getButtonKeys(domain);
  const selectedKey = ensureSelectedKey(domain, keys);

  if (!selectedKey) {
    return `
      <div class="form-panel">
        <h3>褰撳墠娌℃湁鍙紪杈戞寜閿?/h3>
        <p>璇峰厛鍦ㄥ竷灞€涓姞鍏ョ煭閿悕锛屽啀鍥炴潵琛ユ寜閽厤缃€?/p>
      </div>
    `;
  }

  const info = getGenericButtonInfo(state.activeSection, selectedKey);
  const isKeyboard26 = state.activeSection === 'lib.keyboard26';
  const variantName = getKeyboard26Variant();
  const otherVariant = variantName === 'pinyin' ? 'alphabetic' : 'pinyin';

  return `
    ${isKeyboard26 ? `
      <div class="form-panel">
        <h3>26 閿彉浣撳悓姝?/h3>
        <p>鎶婂綋鍓?${escapeHtml(variantName)} 鍙樹綋鐨勬寜閽笌鐗规畩閿厤缃竴閿鍒跺埌 ${escapeHtml(otherVariant)}锛岄€傚悎蹇€熷缓绔嬭嫳鏂囩増鍩虹閰嶇疆銆?/p>
        <div class="inline-actions">
          <button type="button" data-action="copy-keyboard26-variant" data-source-variant="${escapeHtml(variantName)}" data-target-variant="${escapeHtml(otherVariant)}">澶嶅埗鍒?${escapeHtml(otherVariant)}</button>
          <button type="button" data-action="copy-keyboard26-variant" data-source-variant="${escapeHtml(otherVariant)}" data-target-variant="${escapeHtml(variantName)}">鐢?${escapeHtml(otherVariant)} 瑕嗙洊褰撳墠鍙樹綋</button>
        </div>
      </div>
    ` : ''}
    <div class="form-panel">
      <h3>閫変腑鎸夐敭锛?{escapeHtml(selectedKey)}</h3>
      <p>鍙互鐩存帴鐐瑰嚮涓棿棰勮閲岀殑閿紝鎴栧湪涓嬮潰鍒囨崲褰撳墠瑕佺紪杈戠殑鐭敭鍚嶃€?/p>
      <div class="key-chip-list">
        ${keys.map((key) => `<button class="key-chip ${key === selectedKey ? 'active' : ''}" type="button" data-action="select-key" data-domain="${domain}" data-key="${escapeHtml(key)}">${escapeHtml(key)}</button>`).join('')}
      </div>
    </div>
    ${state.activeSection === 'lib.keyboard26' ? renderKeyboard26SpecialEditor(selectedKey, info) : info.kind === 'fixed'
      ? `
        <div class="form-panel">
          <h3>鍥哄畾閿鏄?/h3>
          <p>褰撳墠閿睘浜庡浐瀹氭覆鏌撻敭浣嶏紝閫氬父涓嶉渶瑕佸崟鐙厤缃紱濡傞渶娣辨敼璇峰垏鎹?JSON 妯″紡銆?/p>
        </div>
      `
      : renderGenericButtonFields(info.spec, '鏂板鐭敭鍚庯紝鍦ㄨ繖閲岃ˉ涓绘爣绛俱€佸浘鏍囧拰 action 鍗冲彲鐢熸晥銆?)}
    ${renderButtonCopyEditor(domain, selectedKey)}
  `;
}

function renderUnsupportedEditor() {
  return `
    <div class="form-panel">
      <h3>褰撳墠妯″潡鏆傛湭缁撴瀯鍖?/h3>
      <p>杩欎竴绫婚厤缃粨鏋勬洿澶嶆潅锛岃繖涓€杞厛淇濈暀 JSON 鐩存敼銆備綘浠嶇劧鍙互鍒囧埌 JSON 妯″紡瀹屾垚鎵€鏈変慨鏀广€?/p>
    </div>
  `;
}

function renderVisualEditor() {
  const type = getVisualEditorType();

  if (type === 'mapping') return renderMappingEditor();
  if (type === 'color') return renderColorEditor();
  if (type === 'fontSize') return renderFontSizeEditor();
  if (type === 'theme') return renderThemeEditor();
  if (type === 'others') return renderOthersEditor();
  if (type === 'layout') return renderLayoutEditor();
  if (type === 'toolbar') return renderToolbarEditor();
  if (type === 'hintSymbolsData') return renderHintSymbolsEditor();
  if (type === 'swipeData') return renderSwipeEditor();
  if (type === 'collectionData') return renderCollectionEditor();
  if (type === 'button') return renderButtonEditor();
  return renderUnsupportedEditor();
}

function renderEditor() {
  const section = getDisplaySection(state.activeSection);
  const visualType = getVisualEditorType();
  el.editorTitle.textContent = section?.label || '閰嶇疆缂栬緫';
  el.editorDesc.textContent = visualType === 'unsupported' ? '褰撳墠妯″潡寤鸿浣跨敤 JSON 缂栬緫銆? : '';
  el.editorDesc.hidden = !el.editorDesc.textContent;
  if (el.editorMetaSummary) {
    if (state.activeSection === 'lib.color') {
      const colors = state.project?.lib?.color?.[state.theme] || {};
      el.editorMetaSummary.innerHTML = `
        <span class="badge">褰撳墠涓婚锛?{escapeHtml(state.theme)}</span>
        <span class="badge">鎬婚厤缃暟锛?{Object.keys(colors).length}</span>
      `;
      el.editorMetaSummary.hidden = false;
    } else {
      el.editorMetaSummary.innerHTML = '';
      el.editorMetaSummary.hidden = true;
    }
  }

  syncJsonEditor();
  renderEditorContextActions();
  if (state.editorMode === 'visual') {
    el.visualEditor.innerHTML = renderVisualEditor();
    el.visualEditor.hidden = false;
  } else {
    el.visualEditor.innerHTML = '';
    el.visualEditor.hidden = true;
  }
  el.jsonEditor.hidden = state.editorMode !== 'json';
  el.applyButton.hidden = state.editorMode !== 'json';
  if (el.editorStageBody) {
    el.editorStageBody.dataset.mode = state.editorMode;
  }
  el.visualModeButton.classList.toggle('active', state.editorMode === 'visual');
  el.jsonModeButton.classList.toggle('active', state.editorMode === 'json');
}

function handleEditorActionButtonClick(actionButton, root = el.visualEditor) {
  if (actionButton?.dataset.action === 'copy-theme') {
    const sourceTheme = actionButton.dataset.sourceTheme;
    const targetTheme = actionButton.dataset.targetTheme;
    const copied = commitProjectMutation('', () => {
      copyThemeColors(sourceTheme, targetTheme);
    }, { renderEditor: true, status: false });
    if (copied) {
      setStatus(`宸插畬鎴愶細宸插皢 ${sourceTheme} 閰嶈壊澶嶅埗鍒?${targetTheme}銆俙);
    } else {
      setStatus(`宸插畬鎴愶細${sourceTheme} 涓?${targetTheme} 閰嶈壊宸茬粡涓€鑷淬€俙);
    }
    return true;
  }

  if (actionButton?.dataset.action === 'copy-keyboard26-variant') {
    const sourceVariant = actionButton.dataset.sourceVariant;
    const targetVariant = actionButton.dataset.targetVariant;
    commitProjectMutation(`宸插皢 ${sourceVariant} 鍙樹綋閰嶇疆澶嶅埗鍒?${targetVariant}`, () => {
      copyKeyboard26Variant(sourceVariant, targetVariant);
    }, { renderEditor: true });
    return true;
  }

  if (actionButton?.dataset.action === 'copy-key-config') {
    const domain = actionButton.dataset.domain;
    const sourceKey = state.selectedKeys[domain];
    const targetSelect = root?.querySelector(`[data-copy-target-domain="${domain}"]`);
    const targetKey = targetSelect?.value;
    const copied = commitProjectMutation(`宸插皢 ${sourceKey} 鐨勯厤缃鍒跺埌 ${targetKey}`, () => {
      copyButtonConfig(domain, sourceKey, targetKey);
    }, { renderEditor: true });
    if (!copied) {
      setStatus('褰撳墠澶嶅埗鎿嶄綔鏈敓鏁堬紝璇锋鏌ユ簮閿垨鐩爣閿槸鍚﹀睘浜庡彲澶嶅埗鐨勮嚜瀹氫箟閿€?);
    }
    return true;
  }

  if (actionButton?.dataset.action === 'select-color-domain') {
    state.colorEditorDomain = actionButton.dataset.domain || getPreferredColorEditorDomain();
    syncPreviewTypeWithColorDomain(state.colorEditorDomain);
    renderPreview();
    renderEditor();
    return true;
  }

  if (actionButton?.dataset.action === 'select-color-mode') {
    state.colorEditorMode = actionButton.dataset.mode === 'single' ? 'single' : 'global';
    renderEditor();
    return true;
  }

  if (actionButton?.dataset.action === 'clear-key-color-override') {
    const domain = actionButton.dataset.domain;
    const field = actionButton.dataset.field;
    const cleared = commitProjectMutation(
      `宸叉仮澶?${getColorDomainLabel(domain)} 鍗曢敭棰滆壊`,
      () => {
        clearSingleKeyColorOverride(domain, field);
      },
      { renderEditor: true }
    );
    if (!cleared) {
      setStatus('褰撳墠鍗曢敭棰滆壊宸叉槸鍏ㄥ眬榛樿鍊笺€?);
    }
    return true;
  }

  return false;
}

function getLayoutRowValues(kind, rowKey) {
  if (kind === 'keyboard26') {
    const layout = state.project.lib.layout.keyboard26[state.orientation].layout;
    if (rowKey.includes('.')) {
      const [side, row] = rowKey.split('.');
      layout[side][row] = layout[side][row] || [];
      return layout[side][row];
    }
    layout[rowKey] = layout[rowKey] || [];
    return layout[rowKey];
  }

  if (kind === 'numeric') {
    const layout = state.project.lib.layout.numeric[state.orientation].layout;
    if (rowKey.includes('.')) {
      const [area, row] = rowKey.split('.');
      layout[area][row] = layout[area][row] || [];
      return layout[area][row];
    }
    layout[rowKey] = layout[rowKey] || [];
    return layout[rowKey];
  }

  if (kind === 'symbolic') {
    state.project.lib.layout.symbolic.portrait.layout[rowKey] = state.project.lib.layout.symbolic.portrait.layout[rowKey] || [];
    return state.project.lib.layout.symbolic.portrait.layout[rowKey];
  }

  const index = Number(rowKey);
  state.project.lib.panel.layout[index] = state.project.lib.panel.layout[index] || [];
  return state.project.lib.panel.layout[index];
}

function setLayoutRowValues(kind, rowKey, values) {
  if (kind === 'keyboard26') {
    const layout = state.project.lib.layout.keyboard26[state.orientation].layout;
    if (rowKey.includes('.')) {
      const [side, row] = rowKey.split('.');
      layout[side][row] = values;
    } else {
      layout[rowKey] = values;
    }
    return;
  }

  if (kind === 'numeric') {
    const layout = state.project.lib.layout.numeric[state.orientation].layout;
    if (rowKey.includes('.')) {
      const [area, row] = rowKey.split('.');
      layout[area][row] = values;
    } else {
      layout[rowKey] = values;
    }
    return;
  }

  if (kind === 'symbolic') {
    state.project.lib.layout.symbolic.portrait.layout[rowKey] = values;
    return;
  }

  const index = Number(rowKey);
  state.project.lib.panel.layout[index] = values;
}

function updateLayoutValue(kind, rowKey, value) {
  setLayoutRowValues(kind, rowKey, parseKeyList(value));
}

function reorderLayoutValue(kind, rowKey, fromIndex, toIndex) {
  const current = [...getLayoutRowValues(kind, rowKey)];
  if (!current.length) return false;
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return false;
  if (fromIndex < 0 || fromIndex >= current.length) return false;
  const boundedToIndex = Math.max(0, Math.min(toIndex, current.length));
  if (fromIndex === boundedToIndex || fromIndex + 1 === boundedToIndex) return false;
  const [moved] = current.splice(fromIndex, 1);
  const nextIndex = fromIndex < boundedToIndex ? boundedToIndex - 1 : boundedToIndex;
  current.splice(nextIndex, 0, moved);
  setLayoutRowValues(kind, rowKey, current);
  return true;
}

function clearLayoutDragState() {
  state.layoutDrag = null;
  el.visualEditor.querySelectorAll('.layout-drag-chip.dragging').forEach((chip) => chip.classList.remove('dragging'));
  el.visualEditor.querySelectorAll('.layout-chip-row.drag-over').forEach((row) => row.classList.remove('drag-over'));
}

function handleButtonFieldChange(field, value, extra = {}) {
  const domain = extra.domain || (state.activeSection === 'lib.color'
    ? getResolvedColorEditorDomain()
    : state.activeSection.replace('lib.', ''));
  const section = BUTTON_SECTION_BY_DOMAIN[domain] || state.activeSection;
  const selectedKey = state.selectedKeys[domain];
  const info = getGenericButtonInfo(section, selectedKey, { allowFixedOverride: state.activeSection === 'lib.color' });

  if (section === 'lib.keyboard26') {
    if (info.kind === 'space') {
      if (field === 'spaceLabel') info.variant.spaceLabel = value;
      if (field === 'schemaLabelText') {
        info.variant.schemaLabel = info.variant.schemaLabel || { fontSize: 8, colorKey: '鍒掑姩瀛楃棰滆壊' };
        info.variant.schemaLabel.text = value;
      }
      return;
    }

    if (info.kind === 'spaceRight') {
      if (field === 'spaceRightTop') setSecondaryLabel(info.spec, value, 0);
      if (field === 'spaceRightBottom') setSecondaryLabel(info.spec, value, 1);
      if (field === 'actionType' || field === 'actionValue') {
        const actionType = field === 'actionType' ? value : getActionData(info.spec.action).type;
        const actionValue = field === 'actionValue' ? value : getActionData(info.spec.action).value;
        setActionData(info.spec, actionType, actionValue);
      }
      return;
    }

    if (info.kind === 'enter') {
      if (field === 'enterLabel') {
        state.project.lib.keyboard26.enterLabels[extra.enterKey] = value;
      }
      return;
    }

    if (info.kind === 'fixed') return;
  }

  if (info.kind !== 'generic') return;

  if (field === 'primaryText' || field === 'systemImageName') {
    setPrimaryLabel(info.spec, {
      text: field === 'primaryText' ? value : getLabelTextAt(info.spec, 0),
      systemImageName: field === 'systemImageName' ? value : info.spec.label?.systemImageName,
      defaultFontSizeKey: '鎸夐敭鍓嶆櫙鏂囧瓧澶у皬',
    });
    return;
  }

  if (field === 'secondaryText') {
    setSecondaryLabel(info.spec, value);
    return;
  }

  if (field === 'repeat') {
    if (value) info.spec.repeat = value;
    else delete info.spec.repeat;
    return;
  }

  if (field === 'colorKey' || field === 'highlightColorKey') {
    if (value) info.spec[field] = value;
    else delete info.spec[field];
    return;
  }

  if (field === 'actionType' || field === 'actionValue') {
    const actionData = getActionData(info.spec.action);
    const actionType = field === 'actionType' ? value : actionData.type;
    const actionValue = field === 'actionValue' ? value : actionData.value;
    setActionData(info.spec, actionType, actionValue);
    return;
  }

  if (field === 'preeditStateActionType' || field === 'preeditStateActionValue') {
    const actionData = getActionData(info.spec.preeditStateAction);
    const actionType = field === 'preeditStateActionType' ? value : actionData.type;
    const actionValue = field === 'preeditStateActionValue' ? value : actionData.value;
    setActionData(info.spec, actionType, actionValue, 'preeditStateAction');
  }
}

function handleToolbarButtonFieldChange(scope, field, value, target = null) {
  const spec = getToolbarScopedSpec(scope);
  if (!spec) return;
  const usesFlatLabel = !['default', 'english'].includes(scope);

  if (field === 'key') {
    spec.key = value;
    return;
  }

  if (field === 'fontSize') {
    if (target?.value === '') delete spec.fontSize;
    else spec.fontSize = value;
    return;
  }

  if (field === 'labelText' || field === 'systemImageName') {
    if (usesFlatLabel) {
      if (field === 'labelText') {
        if (value) spec.text = value;
        else delete spec.text;
      } else if (value) {
        spec.systemImageName = value;
      } else {
        delete spec.systemImageName;
      }
      return;
    }
    setPrimaryLabel(spec, {
      text: field === 'labelText' ? value : spec.label?.text,
      systemImageName: field === 'systemImageName' ? value : spec.label?.systemImageName,
    });
    return;
  }

  if (field === 'colorKey' || field === 'highlightColorKey') {
    if (value) spec[field] = value;
    else delete spec[field];
    return;
  }

  if (field === 'actionType' || field === 'actionValue') {
    const actionData = getActionData(spec.action);
    const actionType = field === 'actionType' ? value : actionData.type;
    const actionValue = field === 'actionValue' ? value : actionData.value;
    setActionData(spec, actionType, actionValue);
    return;
  }

  if (field === 'preeditStateActionType' || field === 'preeditStateActionValue') {
    const actionData = getActionData(spec.preeditStateAction);
    const actionType = field === 'preeditStateActionType' ? value : actionData.type;
    const actionValue = field === 'preeditStateActionValue' ? value : actionData.value;
    setActionData(spec, actionType, actionValue, 'preeditStateAction');
  }
}

function setInsetValue(insets, field, target, value) {
  if (target.value === '') delete insets[field];
  else insets[field] = value;
}

function handleVisualEditorInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
    return;
  }

  const editor = target.dataset.editor;
  const value = getInputValue(target);

  if (editor === 'meta') {
    const metaKey = target.dataset.key;
    const normalizedValue = metaKey === 'projectName' || metaKey === 'author'
      ? String(value).trim()
      : value;
    commitProjectMutation(
      `宸叉洿鏂伴」鐩?{metaKey === 'projectName' ? '鍚嶇О' : metaKey === 'author' ? '浣滆€? : '鎻忚堪'}`,
      () => {
        state.project.meta[metaKey] = normalizedValue;
      }
    );
    return;
  }

  if (editor === 'mapping') {
    commitProjectMutation(`宸叉洿鏂?${target.dataset.schema} / ${target.dataset.device} / ${target.dataset.orientation}`, () => {
      state.project.mapping[target.dataset.schema][target.dataset.device][target.dataset.orientation] = value;
    });
    return;
  }

  if (editor === 'font-face') {
    commitProjectMutation(`宸叉洿鏂?fontFace 瀛椾綋 ${Number(target.dataset.index) + 1}锛?{target.dataset.field}`, () => {
      const config = ensureProjectConfig(state.project);
      config.fontFace[Number(target.dataset.index)][target.dataset.field] = String(value || '');
    });
    return;
  }

  if (editor === 'font-face-range') {
    commitProjectMutation(`宸叉洿鏂?fontFace 鑼冨洿 ${Number(target.dataset.rangeIndex) + 1}锛?{target.dataset.field}`, () => {
      const config = ensureProjectConfig(state.project);
      config.fontFace[Number(target.dataset.index)].ranges[Number(target.dataset.rangeIndex)][target.dataset.field] = target.value === '' ? '' : value;
    });
    return;
  }

  if (editor === 'color') {
    const normalizedValue = String(value || '').trim();
    syncColorControlInputs(target, normalizedValue);
    commitProjectMutation(`宸叉洿鏂?${target.dataset.theme} 閰嶈壊锛?{target.dataset.key}`, () => {
      state.project.lib.color[target.dataset.theme][target.dataset.key] = normalizedValue;
    });
    return;
  }

  if (editor === 'key-color') {
    const normalizedValue = String(value || '').trim();
    syncColorControlInputs(target, normalizedValue);
    const label = target.dataset.field === 'highlightColorKey' ? '楂樹寒鍓嶆櫙' : '鏅€氬墠鏅?;
    const applied = commitProjectMutation(
      `宸叉洿鏂?${getColorDomainLabel(target.dataset.domain)} 鍗曢敭棰滆壊锛?{label}`,
      () => {
        setSingleKeyColorValue(target.dataset.domain, target.dataset.field, normalizedValue);
      }
    );
    if (!applied) {
      setStatus('褰撳墠鍗曢敭棰滆壊娌℃湁鍙戠敓鍙樺寲銆?);
    }
    return;
  }

  if (editor === 'color-group-select') {
    state.colorFieldGroup = String(value || 'keyboard26');
    renderEditor();
    return;
  }

  if (editor === 'fontSize') {
    commitProjectMutation(`宸叉洿鏂板瓧鍙凤細${target.dataset.key}`, () => {
      state.project.lib.fontSize[target.dataset.key] = value;
    });
    return;
  }

  if (editor === 'others') {
    commitProjectMutation(`宸叉洿鏂?${target.dataset.group}锛?{target.dataset.key}`, () => {
      state.project.lib.others[target.dataset.group][target.dataset.key] = value;
    });
    return;
  }

  if (editor === 'theme-center') {
    commitProjectMutation(`宸叉洿鏂板亸绉伙細${target.dataset.key}.${target.dataset.axis}`, () => {
      state.project.lib.theme.center[target.dataset.key][target.dataset.axis] = value;
    });
    return;
  }

  if (editor === 'theme-center-scalar') {
    commitProjectMutation(`宸叉洿鏂扮缉鏀撅細${target.dataset.key}`, () => {
      state.project.lib.theme.center[target.dataset.key] = value;
    });
    return;
  }

  if (editor === 'theme-animation') {
    commitProjectMutation(`宸叉洿鏂板姩鐢伙細${target.dataset.key}.${target.dataset.field}`, () => {
      const animation = state.project.lib.theme.animation[target.dataset.key];
      const field = target.dataset.field;
      if (['isAutoReverse', 'randomImage', 'useOpacity', 'useRotation'].includes(field)) {
        animation[field] = value === 'true';
        return;
      }
      if (field === 'images') {
        animation.images = String(target.value || '')
          .split(/\r?\n|,/)
          .map((item) => item.trim())
          .filter(Boolean);
        return;
      }
      if (['startPosition', 'endPosition', 'randomPosition'].includes(field)) {
        if (target.value === '') {
          if (animation[field]) {
            delete animation[field][target.dataset.axis];
            if (!('x' in animation[field]) && !('y' in animation[field])) delete animation[field];
          }
          return;
        }
        animation[field] = animation[field] || {};
        animation[field][target.dataset.axis] = value;
        return;
      }
      if (target.value === '') delete animation[field];
      else animation[field] = value;
    });
    return;
  }

  if (editor === 'layout') {
    commitProjectMutation(`宸叉洿鏂?${target.dataset.kind} 甯冨眬`, () => {
      updateLayoutValue(target.dataset.kind, target.dataset.row, value);
    });
    return;
  }

  if (editor === 'layout-insets') {
    commitProjectMutation(`宸叉洿鏂?${state.previewType} / ${state.orientation} 甯冨眬鍐呰竟璺漙, () => {
      const insetTarget = getCurrentLayoutInsetsTarget(true);
      if (!insetTarget) return;
      setInsetValue(insetTarget.insets, target.dataset.field, target, value);
    });
    return;
  }

  if (editor === 'toolbar-layout') {
    commitProjectMutation(`宸叉洿鏂板伐鍏锋爮 ${target.dataset.scope} 甯冨眬`, () => {
      state.project.lib.toolbar[target.dataset.scope].layout = parseKeyList(value);
    });
    return;
  }

  if (editor === 'toolbar-preedit') {
    commitProjectMutation('宸叉洿鏂伴缂栬緫鍖烘牱寮?, () => {
      const toolbar = ensureToolbarDocConfig();
      const style = toolbar.preedit.style;
      if (['top', 'left', 'bottom', 'right'].includes(target.dataset.field)) {
        setInsetValue(style.insets, target.dataset.field, target, value);
        return;
      }
      if (target.dataset.field === 'fontWeight') {
        if (target.value === '') delete style.fontWeight;
        else style.fontWeight = value;
        return;
      }
      style[target.dataset.field] = String(value || '');
    });
    return;
  }

  if (editor === 'toolbar-style') {
    commitProjectMutation('宸叉洿鏂板伐鍏锋爮鏍峰紡', () => {
      const toolbar = ensureToolbarDocConfig();
      setInsetValue(toolbar.style.insets, target.dataset.field, target, value);
    });
    return;
  }

  if (editor === 'toolbar-horizontal-style') {
    commitProjectMutation('宸叉洿鏂版í鍚戝€欓€夋爮鏍峰紡', () => {
      const toolbar = ensureToolbarDocConfig();
      const style = toolbar.horizontalCandidates.style;
      if (['top', 'left', 'bottom', 'right'].includes(target.dataset.field)) {
        setInsetValue(style.insets, target.dataset.field, target, value);
        return;
      }
      style[target.dataset.field] = String(value || '');
    });
    return;
  }

  if (editor === 'toolbar-horizontal-candidate') {
    commitProjectMutation('宸叉洿鏂版í鍚戝€欓€夊唴瀹瑰尯', () => {
      const toolbar = ensureToolbarDocConfig();
      const candidate = toolbar.horizontalCandidates.candidate;
      if (['top', 'left', 'bottom', 'right'].includes(target.dataset.field)) {
        setInsetValue(candidate.insets, target.dataset.field, target, value);
        return;
      }
      candidate[target.dataset.field] = String(value || '');
    });
    return;
  }

  if (editor === 'toolbar-horizontal-layout') {
    commitProjectMutation('宸叉洿鏂版í鍚戝€欓€夊竷灞€', () => {
      const toolbar = ensureToolbarDocConfig();
      toolbar.horizontalCandidates.layout = parseKeyList(value);
    });
    return;
  }

  if (editor === 'toolbar-vertical-style') {
    commitProjectMutation('宸叉洿鏂扮旱鍚戝€欓€夋牱寮?, () => {
      const toolbar = ensureToolbarDocConfig();
      const style = toolbar.verticalCandidates.style;
      if (['top', 'left', 'bottom', 'right'].includes(target.dataset.field)) {
        setInsetValue(style.insets, target.dataset.field, target, value);
        return;
      }
      if (target.dataset.field === 'backgroundFile') {
        style.backgroundImage.file = String(value || '');
        return;
      }
      if (target.dataset.field === 'backgroundImage') {
        style.backgroundImage.image = String(value || '');
      }
    });
    return;
  }

  if (editor === 'toolbar-vertical-layout') {
    commitProjectMutation('宸叉洿鏂扮旱鍚戝€欓€夊竷灞€', () => {
      const toolbar = ensureToolbarDocConfig();
      if (target.dataset.field === 'direction') {
        toolbar.verticalCandidates.layout.direction = String(value || 'column');
        return;
      }
      toolbar.verticalCandidates.layout[target.dataset.field] = parseKeyList(value);
    });
    return;
  }

  if (editor === 'toolbar-vertical-candidate') {
    commitProjectMutation('宸叉洿鏂扮旱鍚戝€欓€夊唴瀹瑰尯', () => {
      const toolbar = ensureToolbarDocConfig();
      setInsetValue(toolbar.verticalCandidates.candidate.insets, target.dataset.field, target, value);
    });
    return;
  }

  if (editor === 'toolbar-button') {
    commitProjectMutation(`宸叉洿鏂板伐鍏锋爮鎸夐挳 ${state.selectedKeys.toolbar}`, () => {
      handleToolbarButtonFieldChange(target.dataset.scope, target.dataset.field, value, target);
    });
    return;
  }

  if (editor === 'toolbar-simp-toggle') {
    commitProjectMutation('宸叉洿鏂扮畝绻佸垏鎹㈡枃妗?, () => {
      const toolbar = ensureToolbarDocConfig();
      toolbar.simpToggle[target.dataset.tone].text = String(value || '');
    });
    return;
  }

  if (editor === 'toolbar-simp-notification') {
    commitProjectMutation('宸叉洿鏂扮畝绻佸垏鎹㈤€氱煡', () => {
      const toolbar = ensureToolbarDocConfig();
      const notification = toolbar.simpToggle.notification;
      if (target.dataset.field === 'rimeOptionValue' || target.dataset.field === 'lockedNotificationMatchState') {
        notification[target.dataset.field] = value === 'true';
        return;
      }
      if (!value) delete notification[target.dataset.field];
      else notification[target.dataset.field] = String(value);
    });
    return;
  }

  if (editor === 'enter-notification') {
    commitProjectMutation(`宸叉洿鏂板洖杞﹂敭閫氱煡 ${target.dataset.key}`, () => {
      const notifications = ensureEnterNotificationConfig();
      const item = notifications[target.dataset.key];
      if (target.dataset.field === 'returnKeyType') {
        item.returnKeyType = parseKeyList(value)
          .map((part) => Number(part))
          .filter((part) => Number.isFinite(part));
        return;
      }
      if (target.dataset.field === 'lockedNotificationMatchState') {
        item.lockedNotificationMatchState = value === 'true';
        return;
      }
      item[target.dataset.field] = String(value || '');
    });
    return;
  }

  if (editor === 'hint-meta') {
    commitProjectMutation(`宸叉洿鏂伴暱鎸夐厤缃?${state.selectedData.hintGroup} / ${state.selectedData.hintKey}`, () => {
      const group = state.selectedData.hintGroup;
      const key = state.selectedData.hintKey;
      const entry = state.project.lib.hintSymbolsData[group][key];
      if (target.dataset.field === 'selectedIndex') entry.selectedIndex = value;
      if (target.dataset.field === 'width') {
        entry.size = entry.size || {};
        if (target.value === '') delete entry.size.width;
        else entry.size.width = value;
      }
      if (target.dataset.field === 'height') {
        entry.size = entry.size || {};
        if (target.value === '') delete entry.size.height;
        else entry.size.height = value;
      }
    });
    return;
  }

  if (editor === 'hint-item') {
    commitProjectMutation(`宸叉洿鏂伴暱鎸夋潯鐩?${Number(target.dataset.index) + 1}`, () => {
      const group = state.selectedData.hintGroup;
      const key = state.selectedData.hintKey;
      const entry = state.project.lib.hintSymbolsData[group][key];
      const item = entry.list[Number(target.dataset.index)];

      if (target.dataset.field === 'labelText' || target.dataset.field === 'systemImageName') {
        setPrimaryLabel(item, {
          text: target.dataset.field === 'labelText' ? value : item.label?.text,
          systemImageName: target.dataset.field === 'systemImageName' ? value : item.label?.systemImageName,
        });
        return;
      }

      if (target.dataset.field === 'fontSize') {
        if (target.value === '') delete item.fontSize;
        else item.fontSize = value;
        return;
      }

      if (target.dataset.field === 'actionType' || target.dataset.field === 'actionValue') {
        const actionData = getActionData(item.action);
        const actionType = target.dataset.field === 'actionType' ? value : actionData.type;
        const actionValue = target.dataset.field === 'actionValue' ? value : actionData.value;
        setActionData(item, actionType, actionValue);
      }
    });
    return;
  }

  if (editor === 'swipe-item') {
    commitProjectMutation(`宸叉洿鏂板垝鍔?${state.selectedData.swipeGroup} / ${state.selectedData.swipeKey}`, () => {
      const libKey = state.selectedData.swipeLib;
      const group = state.selectedData.swipeGroup;
      const key = state.selectedData.swipeKey;
      const entry = state.project.lib[libKey][group][key];

      if (target.dataset.field === 'actionType' || target.dataset.field === 'actionValue') {
        const actionData = getActionData(entry.action);
        const actionType = target.dataset.field === 'actionType' ? value : actionData.type;
        const actionValue = target.dataset.field === 'actionValue' ? value : actionData.value;
        setActionData(entry, actionType, actionValue);
        return;
      }

      if (target.dataset.field === 'centerX' || target.dataset.field === 'centerY') {
        if (target.value === '') {
          if (entry.center) {
            delete entry.center[target.dataset.field === 'centerX' ? 'x' : 'y'];
            if (!('x' in entry.center) && !('y' in entry.center)) delete entry.center;
          }
        } else {
          entry.center = entry.center || {};
          entry.center[target.dataset.field === 'centerX' ? 'x' : 'y'] = value;
        }
      }
    });
    return;
  }

  if (editor === 'collection-array') {
    commitProjectMutation(`宸叉洿鏂版暟鎹簮 ${target.dataset.source} / ${target.dataset.key}`, () => {
      const lines = String(target.value || '').split('\n').map((item) => item.trim()).filter(Boolean);
      state.project.lib.collectionData[target.dataset.source][target.dataset.key] = lines;
    });
    return;
  }

  if (editor === 'collection-list') {
    commitProjectMutation(`宸叉洿鏂版暟鎹簮 ${target.dataset.source}`, () => {
      const lines = String(target.value || '').split('\n').map((item) => item.trim()).filter(Boolean);
      if (target.dataset.source === 'numericSymbols') {
        state.project.lib.collectionData.numericSymbols = lines.map(parseSymbolLine).filter(Boolean);
      } else {
        state.project.lib.collectionData.pinyin9Symbols = lines.map(parsePinyin9Line).filter(Boolean);
      }
    });
    return;
  }

  if (editor === 'button') {
    const domain = target.dataset.domain || (state.activeSection === 'lib.color'
      ? getResolvedColorEditorDomain()
      : state.activeSection.replace('lib.', ''));
    commitProjectMutation(`宸叉洿鏂版寜閿?${state.selectedKeys[domain]}`, () => {
      handleButtonFieldChange(target.dataset.field, value, { enterKey: target.dataset.enterKey, domain });
    });
  }
}

function setSelectedPreviewKey(domain, key) {
  state.selectedKeys[domain] = key;
  if (state.activeSection === 'lib.color') {
    state.colorEditorDomain = domain;
    syncPreviewTypeWithColorDomain(domain);
  }
  renderPreview();
  if (BUTTON_SECTION_BY_DOMAIN[domain] === state.activeSection || state.activeSection === 'lib.color') {
    renderEditor();
  }
}

function selectPreviewKeyWithoutImmediateRender(domain, key) {
  state.selectedKeys[domain] = key;
  if (state.activeSection === 'lib.color') {
    state.colorEditorDomain = domain;
    syncPreviewTypeWithColorDomain(domain);
  }
  if (BUTTON_SECTION_BY_DOMAIN[domain] === state.activeSection || state.activeSection === 'lib.color') {
    renderEditor();
  }
}

function startPreviewKeyInteraction(domain, key) {
  resetPreviewInteraction();
  state.previewInteraction.pressedDomain = domain;
  state.previewInteraction.pressedKey = key;
  state.previewInteraction.mode = 'press';
  const entry = getPreviewLongPressEntry(domain, key);
  if (entry?.list?.length) {
    state.previewInteraction.longPressTimer = window.setTimeout(() => {
      if (!isPreviewKeyPressed(domain, key)) return;
      state.previewInteraction.mode = 'longpress';
      state.previewInteraction.suppressClick = true;
      renderPreview();
    }, 320);
  }
  renderPreview();
}

function finishPreviewKeyInteraction() {
  const { pressedDomain, pressedKey, mode } = state.previewInteraction;
  if (!pressedDomain || !pressedKey) return;

  clearPreviewInteractionTimer('longPressTimer');
  selectPreviewKeyWithoutImmediateRender(pressedDomain, pressedKey);
  state.previewInteraction.mode = 'release';
  renderPreview();
  state.previewInteraction.suppressClick = mode === 'longpress';
  schedulePreviewInteractionReset(getPreviewPressAnimationConfig().releaseDuration);
}

function cancelPreviewKeyInteraction() {
  if (!state.previewInteraction.pressedDomain) return;
  resetPreviewInteraction();
  renderPreview();
}

function normalizeProjectDefaults(project) {
  if (!project || typeof project !== 'object') return project;
  const nextProject = deepClone(project);
  const templateId = nextProject.templateId || nextProject.template?.id || nextProject.template?.name;
  if (!nextProject.meta || typeof nextProject.meta !== 'object') {
    nextProject.meta = {};
  }
  nextProject.config = {
    ...(nextProject.config && typeof nextProject.config === 'object' ? nextProject.config : {}),
    fontFace: normalizeFontFaceList(nextProject.config?.fontFace),
  };
  if (templateId === 'hamster-ios' && nextProject.meta?.projectName === '浠縤os-鏂?) {
    nextProject.meta.projectName = '鏂扮殑閿洏';
  }
  return nextProject;
}

function applyProject(project, options = {}) {
  const normalizedProject = normalizeProjectDefaults(project);
  state.project = normalizedProject;
  setCurrentTemplateMeta(normalizedProject);
  if (options.validation) {
    setProjectValidation(options.validation);
  }
  if (options.resetOriginal) {
    state.originalProject = deepClone(normalizedProject);
  }
  if (options.resetHistory) {
    resetHistory();
  }
  syncPreviewControls();
  updateDraftInfo();
  updateHistoryButtons();
  if (!isValidSectionKey(state.activeSection)) {
    state.activeSection = 'mapping';
  }
  renderSections();
  renderEditor();
  renderPreview();
  saveDraft();
  saveUiState();
}

function bindEvents() {
  setTemplateCatalog(getStaticTemplateCatalog());
  renderPreviewDeviceOptions();
  enhanceCustomSelects();
  updateBackToTopButton();
  if (isStaticRuntime()) {
    if (el.buildButton) {
      el.buildButton.disabled = true;
      el.buildButton.title = '绾墠绔潤鎬佺増鏆備笉鏀寔缂栬瘧銆?;
    }
  }

  el.sectionList.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-section]') : null;
    if (!button) return;
    state.activeSection = button.dataset.section;
    saveUiState();
    renderSections();
    renderEditor();
    renderPreview();
  });

  el.visualModeButton.addEventListener('click', () => {
    state.editorMode = 'visual';
    renderEditor();
  });

  el.jsonModeButton.addEventListener('click', () => {
    state.editorMode = 'json';
    renderEditor();
  });

  el.visualEditor.addEventListener('input', handleVisualEditorInput);
  el.visualEditor.addEventListener('change', handleVisualEditorInput);
  el.visualEditor.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!isDefaultMetaInput(target)) return;
    if (target.dataset.defaultActive === 'true') {
      target.value = '';
      updateMetaInputDefaultState(target, false);
    }
  });
  el.visualEditor.addEventListener('focusout', (event) => {
    const target = event.target;
    if (!isDefaultMetaInput(target)) return;
    if (!target.value.trim()) {
      target.value = target.dataset.defaultValue || '';
      updateMetaInputDefaultState(target, true);
      return;
    }
    updateMetaInputDefaultState(target, false);
  });

  el.visualEditor.addEventListener('click', (event) => {
    const actionButton = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (handleEditorActionButtonClick(actionButton, el.visualEditor)) {
      return;
    }

    if (actionButton?.dataset.action === 'add-font-face') {
      commitProjectMutation('宸叉柊澧?fontFace 瀛椾綋閰嶇疆', () => {
        const config = ensureProjectConfig(state.project);
        config.fontFace.push({ url: '', name: '', ranges: [] });
      }, { renderEditor: true });
      return;
    }

    if (actionButton?.dataset.action === 'remove-font-face') {
      commitProjectMutation(`宸插垹闄ゅ瓧浣?${Number(actionButton.dataset.index) + 1}`, () => {
        const config = ensureProjectConfig(state.project);
        config.fontFace.splice(Number(actionButton.dataset.index), 1);
      }, { renderEditor: true });
      return;
    }

    if (actionButton?.dataset.action === 'add-font-face-range') {
      commitProjectMutation(`宸叉柊澧炲瓧浣?${Number(actionButton.dataset.index) + 1} 鐨?ranges`, () => {
        const config = ensureProjectConfig(state.project);
        config.fontFace[Number(actionButton.dataset.index)].ranges.push({ location: '', length: '' });
      }, { renderEditor: true });
      return;
    }

    if (actionButton?.dataset.action === 'remove-font-face-range') {
      commitProjectMutation(`宸插垹闄ゅ瓧浣?${Number(actionButton.dataset.index) + 1} 鐨勮寖鍥?${Number(actionButton.dataset.rangeIndex) + 1}`, () => {
        const config = ensureProjectConfig(state.project);
        config.fontFace[Number(actionButton.dataset.index)].ranges.splice(Number(actionButton.dataset.rangeIndex), 1);
      }, { renderEditor: true });
      return;
    }

    const button = actionButton?.dataset.action === 'select-key' ? actionButton : null;
    if (button) {
      setSelectedPreviewKey(button.dataset.domain, button.dataset.key);
      return;
    }

    if (actionButton?.dataset.action === 'select-swipe-library') {
      const nextLibKey = actionButton.dataset.value === 'swipeDataEn' ? 'swipeDataEn' : 'swipeData';
      state.activeSection = nextLibKey === 'swipeDataEn' ? 'lib.swipeDataEn' : 'lib.swipeData';
      state.selectedData.swipeLib = nextLibKey;
      state.selectedData.swipeGroup = null;
      state.selectedData.swipeKey = null;
      saveUiState();
      renderSections();
      renderEditor();
      return;
    }

    const dataButton = actionButton?.dataset.action === 'select-data' ? actionButton : null;
    if (!dataButton) return;
    state.selectedData[dataButton.dataset.dataKey] = dataButton.dataset.value;
    if (dataButton.dataset.dataKey === 'hintGroup') state.selectedData.hintKey = null;
    if (dataButton.dataset.dataKey === 'swipeGroup') state.selectedData.swipeKey = null;
    if (dataButton.dataset.dataKey === 'collectionSource') state.selectedData.collectionKey = null;
    renderEditor();
  });

  el.editorContextActions?.addEventListener('click', (event) => {
    const actionButton = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    handleEditorActionButtonClick(actionButton, el.editorContextActions);
  });

  el.visualEditor.addEventListener('dragstart', (event) => {
    const chip = event.target instanceof Element
      ? event.target.closest('[data-action="layout-chip"], [data-action="toolbar-layout-chip"]')
      : null;
    if (!(chip instanceof HTMLElement)) return;
    state.layoutDrag = {
      kind: chip.dataset.layoutKind,
      rowKey: chip.dataset.layoutRow,
      index: Number(chip.dataset.layoutIndex),
      key: chip.dataset.layoutKey,
    };
    chip.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', chip.dataset.layoutKey || '');
    }
  });

  el.visualEditor.addEventListener('dragover', (event) => {
    if (!state.layoutDrag) return;
    const dropzone = event.target instanceof Element ? event.target.closest('[data-layout-dropzone="true"]') : null;
    if (!(dropzone instanceof HTMLElement)) return;
    if (dropzone.dataset.layoutKind !== state.layoutDrag.kind || dropzone.dataset.layoutRow !== state.layoutDrag.rowKey) return;
    event.preventDefault();
    dropzone.classList.add('drag-over');
  });

  el.visualEditor.addEventListener('dragleave', (event) => {
    const dropzone = event.target instanceof Element ? event.target.closest('[data-layout-dropzone="true"]') : null;
    if (!(dropzone instanceof HTMLElement)) return;
    if (dropzone.contains(event.relatedTarget)) return;
    dropzone.classList.remove('drag-over');
  });

  el.visualEditor.addEventListener('drop', (event) => {
    if (!state.layoutDrag) return;
    const dropzone = event.target instanceof Element ? event.target.closest('[data-layout-dropzone="true"]') : null;
    if (!(dropzone instanceof HTMLElement)) {
      clearLayoutDragState();
      return;
    }
    event.preventDefault();
    if (dropzone.dataset.layoutKind !== state.layoutDrag.kind || dropzone.dataset.layoutRow !== state.layoutDrag.rowKey) {
      clearLayoutDragState();
      setStatus('褰撳墠浠呮敮鎸佸悓涓€琛屽唴鎷栨嫿鎺掑簭銆?);
      return;
    }
    const targetChip = event.target instanceof Element ? event.target.closest('[data-action="layout-chip"]') : null;
    const toolbarTargetChip = event.target instanceof Element ? event.target.closest('[data-action="toolbar-layout-chip"]') : null;
    const targetElement = targetChip || toolbarTargetChip;
    const toIndex = targetElement
      ? Number(targetElement.dataset.layoutIndex)
      : state.layoutDrag.kind === 'toolbar'
        ? getToolbarLayoutValues(state.layoutDrag.rowKey).length
        : getLayoutRowValues(state.layoutDrag.kind, state.layoutDrag.rowKey).length;
    const moved = commitProjectMutation(
      `宸茶皟鏁?${state.layoutDrag.kind} / ${state.layoutDrag.rowKey} 鐨勯敭浣嶉『搴廯,
      () => {
        if (state.layoutDrag.kind === 'toolbar') {
          reorderToolbarLayoutValue(state.layoutDrag.rowKey, state.layoutDrag.index, toIndex);
          return;
        }
        reorderLayoutValue(state.layoutDrag.kind, state.layoutDrag.rowKey, state.layoutDrag.index, toIndex);
      },
      { renderEditor: true }
    );
    clearLayoutDragState();
    if (!moved) {
      setStatus('褰撳墠鎷栨嫿浣嶇疆娌℃湁鍙戠敓鍙樺寲銆?);
    }
  });

  el.visualEditor.addEventListener('dragend', () => {
    clearLayoutDragState();
  });

  el.previewRoot.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target instanceof Element ? event.target.closest('[data-key][data-domain]') : null;
    if (!target) return;
    event.preventDefault();
    startPreviewKeyInteraction(target.dataset.domain, target.dataset.key);
  });

  window.addEventListener('pointerup', () => {
    finishPreviewKeyInteraction();
  });

  window.addEventListener('pointercancel', () => {
    cancelPreviewKeyInteraction();
  });

  el.previewRoot.addEventListener('contextmenu', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-key][data-domain]') : null;
    if (!target) return;
    event.preventDefault();
  });

  el.previewRoot.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-key][data-domain]') : null;
    if (!target) return;
    if (state.previewInteraction.suppressClick) {
      state.previewInteraction.suppressClick = false;
      return;
    }
    setSelectedPreviewKey(target.dataset.domain, target.dataset.key);
  });

  el.applyButton.addEventListener('click', () => {
    try {
      const nextValue = JSON.parse(el.jsonEditor.value);
      const applied = commitProjectMutation(
        `宸插簲鐢?${getSectionDisplayLabel(state.activeSection)}`,
        () => {
          setSectionValue(nextValue);
        },
        { renderEditor: true }
      );
      if (!applied) {
        setStatus('JSON 鍐呭鏈骇鐢熷疄闄呭彉鏇淬€?);
      }
    } catch (error) {
      setStatus(`JSON 瑙ｆ瀽澶辫触: ${error.message}`, true);
    }
  });

  el.resetButton?.addEventListener('click', () => {
    const reset = commitProjectMutation(
      '褰撳墠妯″潡宸查噸缃埌鍒濆閰嶇疆銆?,
      () => {
        setSectionValue(deepClone(getOriginalSectionValue()));
      },
      { renderEditor: true }
    );
    if (!reset) {
      setStatus('褰撳墠妯″潡宸茬粡鏄垵濮嬮厤缃€?);
    }
  });

  el.resetAllButton?.addEventListener('click', () => {
    if (!state.project || !state.originalProject) return;
    const currentSnapshot = snapshotProject();
    const originalSnapshot = JSON.stringify(state.originalProject);
    if (currentSnapshot === originalSnapshot) {
      setStatus('褰撳墠椤圭洰宸茬粡鏄垵濮嬮厤缃€?);
      return;
    }
    applyProject(deepClone(state.originalProject), {
      resetOriginal: false,
      resetHistory: true,
      validation: state.projectValidation,
    });
    setStatus('褰撳墠椤圭洰宸插叏閮ㄩ噸缃埌鍒濆閰嶇疆銆?);
  });

  el.undoButton?.addEventListener('click', () => {
    undoHistory();
  });

  el.redoButton?.addEventListener('click', () => {
    redoHistory();
  });

  el.validateProjectButton?.addEventListener('click', async () => {
    if (!state.project) return;
    try {
      const result = await validateProjectRequest(state.project);
      setProjectValidation(result.validation);
      setStatus(formatValidationText(result.validation));
    } catch (error) {
      setStatus(`鐗堟湰鏍￠獙澶辫触:\n${error.message}`, true);
    }
  });

  el.shareProjectButton?.addEventListener('click', async () => {
    if (!state.project) return;
    try {
      const result = await exportProjectShareData(state.project, state.project?.templateId || state.activeTemplateId);
      setProjectValidation(result.validation);
      const shareText = JSON.stringify(result.sharePacket, null, 2) + '\n';
      downloadTextFile(result.fileName, shareText);
      let copied = false;
      try {
        await navigator.clipboard.writeText(result.shareCode);
        copied = true;
      } catch {
        copied = false;
      }
      const shouldShowCode = window.confirm(`鍒嗕韩鍖呭凡涓嬭浇${copied ? '锛屽垎浜爜涔熷凡澶嶅埗鍒板壀璐存澘銆? : '銆?}\n鏄惁鍚屾椂鏌ョ湅鍒嗕韩鐮侀瑙堬紵`);
      if (shouldShowCode) {
        window.prompt('鍙洿鎺ュ鍒惰繖娈靛垎浜爜锛?, result.shareCode);
      }
      setStatus(`宸茬敓鎴愬垎浜寘锛?{result.fileName}${copied ? '\n鍒嗕韩鐮佸凡澶嶅埗鍒板壀璐存澘銆? : '\n鍓创鏉垮啓鍏ュけ璐ワ紝璇蜂粠寮圭獥涓墜鍔ㄥ鍒跺垎浜爜銆?}`);
    } catch (error) {
      setStatus(`鍒嗕韩瀵煎嚭澶辫触:\n${error.message}`, true);
    }
  });

  el.importShareButton?.addEventListener('click', async () => {
    const shareCode = window.prompt('绮樿创鍒嗕韩鐮佸悗鍗冲彲瀵煎叆锛?);
    if (!shareCode) return;
    try {
      const result = await importProjectShareData(shareCode, state.activeTemplateId);
      applyProject(result.project, { resetOriginal: true, resetHistory: true, validation: result.validation });
      setStatus(`宸插鍏ュ垎浜厤缃€俓n${formatValidationText(result.validation)}`);
    } catch (error) {
      setStatus(`鍒嗕韩瀵煎叆澶辫触:\n${error.message}`, true);
    }
  });

  el.presetButton?.addEventListener('click', async () => {
    const templateId = state.project?.templateId || state.activeTemplateId;
    try {
      const listResult = await listPresetData(templateId);
      if (!listResult.presets?.length) {
        setStatus('褰撳墠妯℃澘娌℃湁鍙敤棰勮銆?);
        return;
      }
      const message = listResult.presets
        .map((preset, index) => `${index + 1}. ${preset.name}${preset.badge ? ` [${preset.badge}]` : ''} - ${preset.description}`)
        .join('\n');
      const answer = window.prompt(`杈撳叆棰勮缂栧彿鎴?id 鍗冲彲濂楃敤锛屽鐢ㄥ悗鍙洿鎺ユ挙閿€锛歕n${message}`);
      if (!answer) return;
      const matched = listResult.presets.find((preset, index) => String(index + 1) === answer.trim() || preset.id === answer.trim());
      if (!matched) {
        setStatus('娌℃湁鍖归厤鍒板搴旈璁俱€?, true);
        return;
      }
      const presetResult = await loadPresetData(templateId, matched.id);
      const applied = commitProjectMutation(`宸插鐢ㄥ湪绾块璁撅細${presetResult.preset.name}`, () => {
        state.project = presetResult.project;
        setCurrentTemplateMeta(presetResult.project);
        setProjectValidation(presetResult.validation);
      }, { renderEditor: true });
      if (!applied) {
        setStatus('棰勮鍐呭涓庡綋鍓嶉」鐩竴鑷达紝娌℃湁鍙戠敓鍙樻洿銆?);
      }
    } catch (error) {
      setStatus(`棰勮杞藉叆澶辫触:\n${error.message}`, true);
    }
  });

  el.loadTemplateButton.addEventListener('click', async () => {
    const templateId = el.templateSelect.value;
    await loadProject(templateId, { preferDraft: true });
  });

  el.templateSelect.addEventListener('change', (event) => {
    state.activeTemplateId = event.target.value;
    renderTemplateOptions();
    const template = state.templates.find((item) => item.id === state.activeTemplateId);
    setStatus(`宸查€夋嫨妯℃澘锛?{template?.displayName || state.activeTemplateId}锛岀偣鍑烩€滆浇鍏ユā鏉库€濆嵆鍙垏鎹€俙);
  });

  el.importProjectButton?.addEventListener('click', () => {
    el.projectFileInput.value = '';
    el.projectFileInput.click();
  });

  el.projectFileInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.cskin') || lowerName.endsWith('.zip')) {
        const result = await importProjectPackageData(await file.arrayBuffer(), file.name, state.activeTemplateId);
        await applyValidatedImportedProject(result.project, `宸插鍏ョ毊鑲ゅ寘锛?{file.name}`, result.validation);
        return;
      }

      const text = await file.text();
      const project = JSON.parse(text);
      const result = await validateProjectRequest(project, project.templateId || state.activeTemplateId);
      await applyValidatedImportedProject(result.project, `宸插鍏ラ」鐩細${file.name}`, result.validation);
    } catch (error) {
      setStatus(`瀵煎叆澶辫触: ${error.message}`, true);
    }
  });

  el.projectFolderInput.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      const projectFile = files.find((file) => {
        const relativePath = String(file.webkitRelativePath || file.name).replaceAll('\\', '/');
        return relativePath.endsWith('/project.json') || relativePath === 'project.json' || file.name === 'project.json';
      });
      if (!projectFile) {
        throw new Error('鎵€閫夋枃浠跺す涓湭鎵惧埌 project.json銆?);
      }
      const project = JSON.parse(await projectFile.text());
      const result = await validateProjectRequest(project, project.templateId || state.activeTemplateId);
      const folderName = String(projectFile.webkitRelativePath || '').split('/')[0] || '鎵€閫夋枃浠跺す';
      await applyValidatedImportedProject(result.project, `宸插鍏ユ枃浠跺す锛?{folderName}`, result.validation);
    } catch (error) {
      setStatus(`鏂囦欢澶瑰鍏ュけ璐? ${error.message}`, true);
    }
  });

  el.exportProjectButton?.addEventListener('click', () => {
    const fileName = `${getProjectMetaResolvedValue(state.project, 'projectName')}.hamster-skin-project.json`;
    downloadTextFile(fileName, JSON.stringify(state.project, null, 2) + '\n');
    setStatus(`宸插鍑洪」鐩細${fileName}`);
  });

  el.clearDraftButton?.addEventListener('click', () => {
    clearDraft(state.project?.templateId || state.activeTemplateId);
    setStatus('鏈湴鑽夌宸叉竻绌恒€?);
  });

  el.themeSelect.addEventListener('change', (event) => {
    state.theme = event.target.value;
    renderEditor();
    renderPreview();
  });

  el.orientationSelect.addEventListener('change', (event) => {
    state.orientation = event.target.value;
    renderEditor();
    renderPreview();
  });

  el.deviceSelect?.addEventListener('change', (event) => {
    state.previewDevice = event.target.value;
    renderPreview();
    setStatus(`宸插垏鎹㈤瑙堟満鍨嬶細${getPreviewDeviceSpec().label}`);
  });

  el.previewSelect.addEventListener('change', (event) => {
    state.previewType = event.target.value;
    renderEditor();
    renderPreview();
  });

  el.shiftStateSelect.addEventListener('change', (event) => {
    state.previewState.shift = event.target.value;
    renderPreview();
    setStatus(`宸插垏鎹?Shift 鐘舵€侊細${state.previewState.shift}`);
  });

  el.enterTypeSelect.addEventListener('change', (event) => {
    state.previewState.enterType = event.target.value;
    renderPreview();
    setStatus(`宸插垏鎹㈠洖杞︾被鍨嬶細${state.previewState.enterType}`);
  });

  document.addEventListener('keydown', (event) => {
    const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z';
    const isRedo = (event.ctrlKey || event.metaKey)
      && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'));
    if (!isUndo && !isRedo) return;
    event.preventDefault();
    if (isUndo) {
      undoHistory();
      return;
    }
    redoHistory();
  });

  window.addEventListener('resize', () => {
    if (!state.project) return;
    renderPreview();
  });
  window.addEventListener('scroll', updateBackToTopButton, { passive: true });

  el.backToTopButton?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  el.packageButton?.addEventListener('click', async () => {
    try {
      setStatus('姝ｅ湪鐢熸垚骞舵墦鍖呯毊鑲?..');
      const result = await exportProjectPackageData(state.project, state.activeTemplateId, {
        format: 'cskin',
      });
      downloadBinaryFile(result.fileName, result.blob);
      setProjectValidation(result.validation);
      setStatus(`宸插鍑?${result.fileName}銆俓n鍏卞啓鍏?${result.files.length} 涓枃浠躲€俓n${formatValidationText(result.validation)}`);
    } catch (error) {
      setStatus(`鎵撳寘澶辫触:\n${error.message}`, true);
    }
  });
}

async function loadProject(templateId = state.activeTemplateId, options = {}) {
  setStatus('姝ｅ湪鍔犺浇妯℃澘椤圭洰...');
  state.activeTemplateId = templateId || state.activeTemplateId;
  setTemplateCatalog(getStaticTemplateCatalog());
  renderTemplateOptions();
  updateDraftInfo();
  updateHistoryButtons();
  const payload = await loadDefaultProjectData(state.activeTemplateId);
  setTemplateCatalog(payload.templates || []);
  setCurrentTemplateMeta(payload.project);
  state.originalProject = deepClone(payload.project);
  const draftProject = options.preferDraft === false ? null : loadDraft(payload.project.templateId);
  if (draftProject) {
    const validationResult = await validateProjectRequest(draftProject, draftProject.templateId || payload.project.templateId);
    applyProject(validationResult.project, { resetOriginal: false, resetHistory: true, validation: validationResult.validation });
    setStatus(`妯℃澘鍔犺浇瀹屾垚锛屽凡鑷姩鎭㈠鏈湴鑽夌銆俓n${formatValidationText(validationResult.validation)}`);
    return;
  }
  applyProject(payload.project, { resetOriginal: false, resetHistory: true, validation: payload.validation });
  setStatus(`妯℃澘鍔犺浇瀹屾垚锛屽彲浠ョ洿鎺ョ紪杈戝苟棰勮銆俓n${formatValidationText(payload.validation)}`);
}

loadUiState();
bindEvents();
loadProject().catch((error) => {
  setStatus(`鍒濆鍖栧け璐?\n${error.message}`, true);
});
