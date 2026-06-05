export function saveUiState(storageKey, activeSection, isValidSectionKey) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      activeSection: isValidSectionKey(activeSection) ? activeSection : 'mapping',
    }));
  } catch {
    // ignore localStorage errors
  }
}

export function loadUiState(storageKey, isValidSectionKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (isValidSectionKey(parsed?.activeSection)) {
      return { activeSection: parsed.activeSection };
    }
    return {};
  } catch {
    localStorage.removeItem(storageKey);
    return {};
  }
}
