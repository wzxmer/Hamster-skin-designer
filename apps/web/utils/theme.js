// apps/web/utils/theme.js
export function getThemeSpec(project, themeName) {
  return project?.lib?.color?.[themeName] || {};
}

export function resolveThemeColorValue(theme, colorKey, fallback = '') {
  if (!colorKey) return fallback;
  const value = theme?.[colorKey];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

export function resolveSpecForegroundColor(theme, spec, fallbackColorKey, pressed = false) {
  const fallback = resolveThemeColorValue(theme, fallbackColorKey, '#111111');
  if (!spec || typeof spec !== 'object') return fallback;
  const preferredKey = pressed
    ? (spec.highlightColorKey || spec.colorKey)
    : (spec.colorKey || spec.highlightColorKey);
  return resolveThemeColorValue(theme, preferredKey, fallback);
}

export function getKeyStyle(theme, isSystem = false, options = {}) {
  const pressed = options.pressed === true;
  const backgroundColorKey = options.backgroundColorKey || (
    isSystem
      ? (pressed ? '功能键背景颜色.高亮' : '功能键背景颜色.普通')
      : (pressed ? '字母键背景颜色.高亮' : '字母键背景颜色.普通')
  );
  const backgroundFallback = isSystem
    ? (pressed ? '#eceff5' : '#d6d8df')
    : (pressed ? '#d8dbe4' : '#ffffff');
  const background = resolveThemeColorValue(theme, backgroundColorKey, backgroundFallback);
  const foreground = resolveSpecForegroundColor(
    theme,
    options.spec,
    options.fallbackForegroundKey || '按键前景颜色',
    pressed
  );
  return `background:${background};color:${foreground};`;
}
