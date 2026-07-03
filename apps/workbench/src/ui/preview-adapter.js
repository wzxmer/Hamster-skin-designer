import { buildSkinEffectModel } from '../../../../packages/skin-effect/index.js';

function deepClone(value) {
  return value === undefined ? value : structuredClone(value);
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function resolveProjectScale(project, key, fallback = 1) {
  const value = Number(project.theme?.shared?.scale?.[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function keyboard26PreviewTextCenter(center = null, fallback = { x: 0.5, y: 0.54 }) {
  const x = finiteNumber(center?.x ?? fallback.x, fallback.x);
  const y = finiteNumber(center?.y ?? fallback.y, fallback.y);
  if (x === 0.5 && y === 0.5) return { x: 0.5, y: 0.54 };
  return { x, y };
}

function keyboard26PreviewStyleName(styleName = '') {
  if (/^[a-z]ButtonUpForegroundStyle$/i.test(styleName)) {
    return styleName.replace(/ButtonUpForegroundStyle$/i, 'ButtonSwipeUpForegroundStyle');
  }
  if (/^[a-z]ButtonDownForegroundStyle$/i.test(styleName)) {
    return styleName.replace(/ButtonDownForegroundStyle$/i, 'ButtonSwipeDownForegroundStyle');
  }
  return styleName;
}

function adaptKeyboard26TextStyle(project, styleName, style) {
  if (!/^[a-z]Button(?:Uppercased(?:State)?)?ForegroundStyle$/i.test(styleName)) {
    return style;
  }
  return {
    ...style,
    center: keyboard26PreviewTextCenter(style.center),
    previewFontScale: resolveProjectScale(project, '26键中文前景缩放', 1),
  };
}

function adaptKeyboard26SwipeStyle(project, styleName, style) {
  if (/^[a-z]Button(?:Swipe)?UpForegroundStyle$/i.test(styleName)) {
    return {
      ...style,
      className: [style.className, 'is-swipe is-swipe-up'].filter(Boolean).join(' '),
    };
  }
  if (/^[a-z]Button(?:Swipe)?DownForegroundStyle$/i.test(styleName)) {
    return {
      ...style,
      className: [style.className, 'is-swipe is-swipe-down'].filter(Boolean).join(' '),
    };
  }
  return style;
}

function adaptKeyboard26PayloadForPreview(project, payload) {
  const next = deepClone(payload);
  if (next?.HStackStyle?.size?.height === '1/5') {
    next.HStackStyle = {
      ...next.HStackStyle,
      size: {
        ...(next.HStackStyle.size || {}),
        height: '1/4',
      },
    };
  }
  for (const [key, value] of Object.entries(next || {})) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const previewName = keyboard26PreviewStyleName(key);
    if (previewName !== key && !next[previewName]) {
      next[previewName] = deepClone(value);
    }
  }
  for (const [key, value] of Object.entries(next || {})) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    next[key] = adaptKeyboard26SwipeStyle(project, key, adaptKeyboard26TextStyle(project, key, value));
  }
  for (const [buttonName, button] of Object.entries(next || {})) {
    if (!/^[a-z]Button$/i.test(buttonName) || !button || typeof button !== 'object') continue;
    for (const refKey of ['foregroundStyle', 'uppercasedStateForegroundStyle', 'capsLockedStateForegroundStyle']) {
      if (!Array.isArray(button[refKey])) continue;
      button[refKey] = button[refKey].map((item) => (
        typeof item === 'string' ? keyboard26PreviewStyleName(item) : item
      ));
    }
  }
  return next;
}

export function buildPreviewNativeKeyboardPayload(project, themeName, keyboardName) {
  const effectPayload = buildSkinEffectModel(project, { theme: themeName, keyboardName })?.nativePayload;
  if (!effectPayload || typeof effectPayload !== 'object' || Array.isArray(effectPayload)) return null;
  if (/^(pinyin|alphabetic)_26_/.test(keyboardName || '')) {
    return adaptKeyboard26PayloadForPreview(project, effectPayload);
  }
  return deepClone(effectPayload);
}
