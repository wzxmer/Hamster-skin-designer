export const LEGACY_RUNTIME_STYLE_NAMES = [
  'horizontalCandidateStyle',
  'toolbarBgStyle',
  'keyboardBg',
  'CandBg',
  'textBg',
  'CandFg',
  'toolbarButtonBgStyle',
];

export const LEGACY_RUNTIME_COLORS = ['#00c381', '#f6f6f6', '#fafafa'];
const SANITIZED_VARIANT_KEYBOARD_PATTERN = /^(pinyin_(9|14|18)|numeric_9)_/;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function collectNativeStyleReferences(payload) {
  const referencedStyles = new Set();
  const addStyleRef = (value) => {
    if (typeof value === 'string') {
      if (!value.startsWith('#') && !['shift', 'dismissKeyboard', 'returnLastKeyboard'].includes(value)) {
        referencedStyles.add(value);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) addStyleRef(item);
    }
  };
  for (const item of Object.values(payload || {})) {
    if (!isPlainObject(item)) continue;
    for (const refKey of [
      'backgroundStyle',
      'foregroundStyle',
      'hintStyle',
      'hintSymbolsStyle',
      'selectedBackgroundStyle',
      'swipeUpForegroundStyle',
      'swipeDownForegroundStyle',
      'uppercasedStateForegroundStyle',
      'capsLockedStateForegroundStyle',
      'preeditStateForegroundStyle',
      'candidateStyle',
    ]) {
      addStyleRef(item[refKey]);
    }
    addStyleRef(item.symbolStyles);
  }
  return referencedStyles;
}

function hasLegacyRuntimeColor(value) {
  if (typeof value === 'string') return LEGACY_RUNTIME_COLORS.includes(value.toLowerCase());
  if (Array.isArray(value)) return value.some((item) => hasLegacyRuntimeColor(item));
  if (!isPlainObject(value)) return false;
  return Object.values(value).some((item) => hasLegacyRuntimeColor(item));
}

function normalizeLegacyRuntimeColorValue(value) {
  if (typeof value !== 'string') return value;
  const normalized = value.toLowerCase();
  if (normalized === '#00c381') return '#000000';
  if (normalized === '#f6f6f6' || normalized === '#fafafa') return '#FFFFFF';
  return value;
}

function normalizeLegacyRuntimeColors(value) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      value[index] = normalizeLegacyRuntimeColors(item);
    });
    return value;
  }
  if (!isPlainObject(value)) return normalizeLegacyRuntimeColorValue(value);
  for (const [key, item] of Object.entries(value)) {
    value[key] = normalizeLegacyRuntimeColors(item);
  }
  return value;
}

function geometryHintBackgroundStyle() {
  return {
    buttonStyleType: 'geometry',
    cornerRadius: 12,
    highlightColor: '#ffffff',
    normalColor: '#ffffff',
    shadowOffset: { x: 0, y: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  };
}

function geometryHintSelectedStyle() {
  return {
    buttonStyleType: 'geometry',
    cornerRadius: 8,
    highlightColor: '#0279FE',
    normalColor: '#0279FE',
  };
}

function normalizeVariantHintImageStyles(payload) {
  payload.alphabeticHintSymbolsBackgroundStyle = geometryHintBackgroundStyle();
  payload.alphabeticHintSymbolsSelectedStyle = geometryHintSelectedStyle();
  if (isPlainObject(payload['长按背景样式'])) payload['长按背景样式'] = geometryHintBackgroundStyle();
  if (isPlainObject(payload['长按选中背景样式'])) payload['长按选中背景样式'] = geometryHintSelectedStyle();
}

function geometryKeyboardBackgroundStyle() {
  return {
    buttonStyleType: 'geometry',
    normalColor: '#00000001',
  };
}

function normalizeVariantBackgroundImageStyles(payload) {
  for (const styleName of ['keyboardBackgroundStyle', 'toolbarBackgroundStyle', 'preeditBackgroundStyle']) {
    const style = payload[styleName];
    if (!isPlainObject(style)) continue;
    const fileName = style.normalImage?.file || style.highlightImage?.file || style.file;
    if (fileName && /hold_back|hint|T14|yy|T9/i.test(fileName)) {
      payload[styleName] = geometryKeyboardBackgroundStyle();
    }
  }
}

function textFallbackForStyle(styleName) {
  const key = styleName
    .replace(/(?:Button)?(?:Swipe)?(?:Up|Down)?ForegroundStyle$/i, '')
    .replace(/(?:Up|Down)SwipeFg$/i, '')
    .replace(/Fg$/i, '');
  const known = {
    '123': '123',
    comma: '，',
    cnen: '中',
    clear: '重输',
    enter: '发送',
    numperiod: '.',
    period: '。',
    return: '返回',
    space: '空格',
    symbolic: '符',
  };
  if (known[key]) return known[key];
  const numberMatch = key.match(/^number([0-9])$/);
  if (numberMatch) return numberMatch[1];
  return key;
}

function replaceLegacyImageForegroundStyles(payload) {
  for (const [styleName, style] of Object.entries(payload)) {
    if (!isPlainObject(style)) continue;
    const fileName = style.normalImage?.file || style.highlightImage?.file || style.file;
    if (!fileName || !/T14|yy|T9|hold_back|hint/i.test(fileName)) continue;
    if (/(?:Fg|ForegroundStyle|SFg(?:Of\d+)?)$/i.test(styleName) || style.text !== undefined) {
      payload[styleName] = {
        buttonStyleType: 'text',
        center: style.center || { x: 0.5, y: 0.5 },
        fontSize: style.fontSize || 14,
        highlightColor: style.highlightColor || '#000000',
        normalColor: style.normalColor || '#000000',
        text: style.text || textFallbackForStyle(styleName),
      };
    }
  }
}

function rewriteLegacyStyleReferences(payload) {
  const replacements = {
    horizontalCandidateStyle: 'candidateStyle',
    toolbarBgStyle: 'toolbarBackgroundStyle',
    keyboardBg: 'keyboardBackgroundStyle',
    CandBg: 'candidateStyle',
    CandFg: 'candidateStyle',
    textBg: 'keyboardBackgroundStyle',
    toolbarButtonBgStyle: 'toolbarButtonBackgroundStyle',
  };
  const rewrite = (value) => {
    if (typeof value === 'string') return replacements[value] || value;
    if (Array.isArray(value)) return value.map((item) => rewrite(item));
    return value;
  };
  const visit = (value) => {
    if (!isPlainObject(value) && !Array.isArray(value)) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'string' || Array.isArray(item)) value[key] = rewrite(item);
      else visit(item);
    }
  };
  visit(payload);
}

export function sanitizeLegacyNativeSeed(payload, context = {}) {
  if (!isPlainObject(payload)) return payload;
  const keyboardName = context.keyboardName || '';
  rewriteLegacyStyleReferences(payload);
  if (isPlainObject(payload.toolbar)) delete payload.toolbar.horizontalCandidateStyle;

  const isSanitizedVariant = SANITIZED_VARIANT_KEYBOARD_PATTERN.test(keyboardName);
  if (!isSanitizedVariant) {
    for (const styleName of LEGACY_RUNTIME_STYLE_NAMES) delete payload[styleName];
    return payload;
  }
  normalizeVariantBackgroundImageStyles(payload);
  normalizeVariantHintImageStyles(payload);
  replaceLegacyImageForegroundStyles(payload);
  normalizeLegacyRuntimeColors(payload);
  const referencedStyles = collectNativeStyleReferences(payload);
  for (const [styleName, style] of Object.entries(payload)) {
    if (LEGACY_RUNTIME_STYLE_NAMES.includes(styleName)) {
      delete payload[styleName];
      continue;
    }
    if (!isPlainObject(style) || referencedStyles.has(styleName)) continue;
    if (style.buttonStyleType === 'fileImage'
      || style.normalImage
      || style.highlightImage
      || style.file
      || hasLegacyRuntimeColor(style)) {
      delete payload[styleName];
    }
  }
  return payload;
}

export function sanitizeLegacyNativePayloads(nativePayloads) {
  if (!isPlainObject(nativePayloads)) return nativePayloads;
  const next = structuredClone(nativePayloads);
  if (!isPlainObject(next.light) && !isPlainObject(next.dark)) {
    for (const [presetName, presetPayloads] of Object.entries(next)) {
      if (isPlainObject(presetPayloads)) next[presetName] = sanitizeLegacyNativePayloads(presetPayloads);
    }
    return next;
  }
  for (const themePayloads of Object.values(next)) {
    if (!isPlainObject(themePayloads)) continue;
    for (const [keyboardName, payload] of Object.entries(themePayloads)) {
      sanitizeLegacyNativeSeed(payload, { keyboardName });
    }
  }
  return next;
}
