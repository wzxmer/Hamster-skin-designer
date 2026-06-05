export function getDraftStorageKey(prefix, templateId = 'default') {
  return `${prefix}:${templateId}`;
}

export function saveDraft(storageKey, project) {
  if (!project) return null;
  const savedAt = new Date().toISOString();
  localStorage.setItem(storageKey, JSON.stringify({
    savedAt,
    project,
  }));
  return savedAt;
}

export function loadDraft(storageKey) {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return { savedAt: null, project: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      savedAt: parsed?.savedAt || null,
      project: parsed?.project || null,
    };
  } catch {
    localStorage.removeItem(storageKey);
    return { savedAt: null, project: null };
  }
}

export function clearDraft(storageKey) {
  localStorage.removeItem(storageKey);
}

export function formatDraftTime(value) {
  if (!value) return '鏈繚瀛?';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '鏈繚瀛?';
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}
