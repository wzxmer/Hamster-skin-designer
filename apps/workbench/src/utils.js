export function deepClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function getPath(target, path) {
  return path.split('.').reduce((current, key) => current?.[key], target);
}

export function setPath(target, path, value) {
  const parts = path.split('.');
  let current = target;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== 'object') current[part] = {};
    current = current[part];
  }
  current[parts.at(-1)] = value;
}

export function parseInputValue(value, type) {
  if (type === 'number') {
    if (value === '') return undefined;
    const normalized = typeof value === 'string' ? value.replace(',', '.') : value;
    const next = Number(normalized);
    return Number.isFinite(next) ? next : 0;
  }
  if (type === 'boolean') return value === 'true';
  return value;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error };
  }
}
