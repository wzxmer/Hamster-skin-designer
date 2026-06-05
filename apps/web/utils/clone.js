// utils/clone.js
/**
 * Deep clone an object using JSON parse/stringify.
 * Suitable for plain objects without methods or circular references.
 * @param {Object} obj
 * @returns {Object}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error('deepClone error:', e);
    return obj;
  }
}
