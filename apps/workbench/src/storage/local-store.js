const STORAGE_KEY = 'hamster-skin-workbench:template:sample-skin:v1';
const TEMPLATE_LIBRARY_FALLBACK_KEY = 'hamster-skin-workbench:template-library:v1';
const DB_NAME = 'hamster-skin-workbench';
const DB_VERSION = 1;
const TEMPLATE_STORE = 'templates';

function canUseIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTemplateRecord(project, existing = {}) {
  const now = new Date().toISOString();
  const id = existing.id || globalThis.crypto?.randomUUID?.() || `template-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    name: project?.meta?.name || '未命名皮肤',
    author: project?.meta?.author || '',
    templateId: project?.templateId || '',
    schemaVersion: project?.schemaVersion || '',
    createdAt: existing.createdAt || now,
    updatedAt: now,
    project: deepClone(project),
  };
}

function openDb() {
  if (!canUseIndexedDb()) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TEMPLATE_STORE)) {
        db.createObjectStore(TEMPLATE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withTemplateStore(mode, callback) {
  return openDb().then((db) => {
    if (!db) return callback(null);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(TEMPLATE_STORE, mode);
      const store = transaction.objectStore(TEMPLATE_STORE);
      const result = callback(store);
      transaction.oncomplete = () => {
        db.close();
        resolve(result);
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  });
}

function readFallbackTemplates() {
  const raw = localStorage.getItem(TEMPLATE_LIBRARY_FALLBACK_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallbackTemplates(items) {
  localStorage.setItem(TEMPLATE_LIBRARY_FALLBACK_KEY, JSON.stringify(items));
}

function sortTemplates(items) {
  return [...items].sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')));
}

export function saveProject(project) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    project,
    savedAt: new Date().toISOString(),
  }));
}

export function loadProject() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearProject() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function saveTemplateSnapshot(project) {
  const record = normalizeTemplateRecord(project);
  saveProject(project);

  return withTemplateStore('readwrite', (store) => {
    if (!store) {
      const items = readFallbackTemplates();
      items.unshift(record);
      writeFallbackTemplates(sortTemplates(items));
      return record;
    }
    store.put(record);
    return record;
  });
}

export async function listTemplateSnapshots() {
  return withTemplateStore('readonly', (store) => {
    if (!store) return sortTemplates(readFallbackTemplates());
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(sortTemplates(request.result || []));
      request.onerror = () => reject(request.error);
    });
  });
}

export async function loadTemplateSnapshot(id) {
  return withTemplateStore('readonly', (store) => {
    if (!store) return readFallbackTemplates().find((item) => item.id === id) || null;
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function deleteTemplateSnapshot(id) {
  return withTemplateStore('readwrite', (store) => {
    if (!store) {
      writeFallbackTemplates(readFallbackTemplates().filter((item) => item.id !== id));
      return true;
    }
    store.delete(id);
    return true;
  });
}
