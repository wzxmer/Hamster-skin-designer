export const SYSTEM_IMAGE_MAP = {
  globe: '🌐',
  'delete.left': '⌫',
  shift: '⇧',
  'shift.fill': '⇧',
  'capslock.fill': '⇪',
  'chevron.up': '⌃',
  'chevron.down': '⌄',
  lock: '🔒',
  'lock.open': '🔓',
  gear: '⚙',
  'face.smiling': '🙂',
  'list.bullet.clipboard': '📝',
  'doc.on.clipboard': '📋',
  'doc.on.doc': '▣',
  'apple.terminal': '⌘',
  gearshape: '⚙',
  'gearshape.fill': '⚙',
  'keyboard.chevron.compact.down': '⌄',
  'keyboard.chevron.compact.down.fill': '⌄',
  'xmark.triangle.circle.square': '⌘#',
  translate: '译',
  'slider.horizontal.3': '☰',
  'circle.grid.2x1': '⌘',
  'rectangle.and.text.magnifyingglass': '▤',
  'square.grid.3x3': '▦',
  'character.textbox': '字',
  mic: '🎤',
  command: '⌘',
  'command.circle': '⌘',
  folder: '📁',
  keyboard: '⌨',
  tshirt: '👕',
  'bolt.horizontal.circle': '⚡',
  'square.and.pencil': '✎',
  'switch.2': '⇄',
  'rectangle.center.inset.filled.badge.plus': '⊞',
};

export const SYSTEM_IMAGE_SVG_MAP = {
  globe: {
    body: `
      <circle cx="12" cy="12" r="8.25"></circle>
      <path d="M3.75 12h16.5"></path>
      <path d="M12 3.75c2.4 2.1 3.85 5.06 3.85 8.25S14.4 18.15 12 20.25c-2.4-2.1-3.85-5.06-3.85-8.25S9.6 5.85 12 3.75Z"></path>
      <path d="M6.1 7.35c1.6.9 3.7 1.4 5.9 1.4s4.3-.5 5.9-1.4"></path>
      <path d="M6.1 16.65c1.6-.9 3.7-1.4 5.9-1.4s4.3.5 5.9 1.4"></path>
    `,
  },
  'delete.left': {
    body: `
      <path d="M9.25 5.5h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9l-5.5-6 5.5-6Z"></path>
      <path d="m11.3 9.3 5.4 5.4"></path>
      <path d="m16.7 9.3-5.4 5.4"></path>
    `,
  },
  shift: {
    body: `
      <path d="M12 4.35 6.25 10.8h3.2v8.85h5.1V10.8h3.2L12 4.35Z"></path>
    `,
  },
  'shift.fill': {
    body: `
      <path d="M12 4.35 6.25 10.8h3.2v8.85h5.1V10.8h3.2L12 4.35Z"></path>
    `,
  },
  'capslock.fill': {
    body: `
      <path d="M12 3.85 6 10.5h3.2v6.9h5.6v-6.9H18L12 3.85Z"></path>
      <path d="M7.8 20.05h8.4"></path>
    `,
  },
  'chevron.up': {
    body: `<path d="m6.6 14.9 5.4-5.8 5.4 5.8"></path>`,
  },
  'chevron.down': {
    body: `<path d="m6.6 9.1 5.4 5.8 5.4-5.8"></path>`,
  },
  lock: {
    body: `
      <rect x="5.7" y="10.2" width="12.6" height="9.3" rx="2"></rect>
      <path d="M8.45 10.2V8.05a3.55 3.55 0 0 1 7.1 0v2.15"></path>
      <path d="M12 14.05v2.15"></path>
    `,
  },
  'lock.open': {
    body: `
      <rect x="5.7" y="10.2" width="12.6" height="9.3" rx="2"></rect>
      <path d="M8.45 10.2V8.05a3.55 3.55 0 0 1 6.55-1.9"></path>
      <path d="M12 14.05v2.15"></path>
    `,
  },
  gear: {
    strokeWidth: 1.6,
    body: `
      <circle cx="12" cy="12" r="3.05"></circle>
      <path d="M12 3.15v2.05"></path>
      <path d="M12 18.8v2.05"></path>
      <path d="M20.85 12H18.8"></path>
      <path d="M5.2 12H3.15"></path>
      <path d="m18.3 5.7-1.45 1.45"></path>
      <path d="m7.15 16.85-1.45 1.45"></path>
      <path d="m18.3 18.3-1.45-1.45"></path>
      <path d="M7.15 7.15 5.7 5.7"></path>
      <circle cx="12" cy="12" r="6.15"></circle>
    `,
  },
  'face.smiling': {
    body: `
      <circle cx="12" cy="12" r="8.4"></circle>
      <circle cx="9" cy="10.1" r="0.8" fill="currentColor" stroke="none"></circle>
      <circle cx="15" cy="10.1" r="0.8" fill="currentColor" stroke="none"></circle>
      <path d="M8.25 14.1c1 1.45 2.36 2.15 3.75 2.15s2.75-.7 3.75-2.15"></path>
    `,
  },
  'list.bullet.clipboard': {
    body: `
      <path d="M8.4 5.2h7.2"></path>
      <path d="M9.2 3.75h5.6a1.2 1.2 0 0 1 1.2 1.2v.9H8v-.9a1.2 1.2 0 0 1 1.2-1.2Z"></path>
      <rect x="6.2" y="5.85" width="11.6" height="14.4" rx="2.1"></rect>
      <circle cx="9.1" cy="10.2" r="0.75" fill="currentColor" stroke="none"></circle>
      <circle cx="9.1" cy="13.15" r="0.75" fill="currentColor" stroke="none"></circle>
      <circle cx="9.1" cy="16.1" r="0.75" fill="currentColor" stroke="none"></circle>
      <path d="M11.25 10.2h4.7"></path>
      <path d="M11.25 13.15h4.7"></path>
      <path d="M11.25 16.1h4.7"></path>
    `,
  },
  'doc.on.clipboard': {
    body: `
      <path d="M8.4 5.2h7.2"></path>
      <path d="M9.2 3.75h5.6a1.2 1.2 0 0 1 1.2 1.2v.9H8v-.9a1.2 1.2 0 0 1 1.2-1.2Z"></path>
      <rect x="6.15" y="5.85" width="11.7" height="14.4" rx="2.1"></rect>
      <path d="M10.2 9.4h4.6l1.9 1.95v5.2a1 1 0 0 1-1 1h-5.5a1 1 0 0 1-1-1v-6.15a1 1 0 0 1 1-1Z"></path>
      <path d="M14.8 9.4v1.85h1.9"></path>
    `,
  },
  'doc.on.doc': {
    body: `
      <path d="M8.2 7.4V6.2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2h-1.1"></path>
      <path d="M5.8 7.6h6a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V9.6a2 2 0 0 1 2-2Z"></path>
      <path d="M7.5 11.2h4.4"></path>
      <path d="M7.5 14.2h4.4"></path>
    `,
  },
  'apple.terminal': {
    strokeWidth: 1.6,
    body: `
      <rect x="4.35" y="5.1" width="15.3" height="13.8" rx="2.55"></rect>
      <path d="m8.1 9.55 2.35 2.2-2.35 2.2"></path>
      <path d="M12.7 14.35h3.6"></path>
      <path d="M7.55 7.85h8.9"></path>
    `,
  },
  gearshape: {
    strokeWidth: 1.55,
    body: `
      <circle cx="12" cy="12" r="3.2"></circle>
      <path d="M12 3.4v2"></path>
      <path d="M12 18.6v2"></path>
      <path d="m18.1 5.9-1.4 1.4"></path>
      <path d="m7.3 16.7-1.4 1.4"></path>
      <path d="M20.6 12h-2"></path>
      <path d="M5.4 12h-2"></path>
      <path d="m18.1 18.1-1.4-1.4"></path>
      <path d="m7.3 7.3-1.4-1.4"></path>
      <path d="M14.8 4.2 16 5.1l1.5-.35 1.75 3.05-1.05 1.15.15 1.55 1.35 0.75v3.5l-1.35.75-.15 1.55 1.05 1.15-1.75 3.05-1.5-.35-1.2.9-0.45 1.45h-3.5l-0.45-1.45-1.2-.9-1.5.35-1.75-3.05 1.05-1.15-.15-1.55-1.35-.75v-3.5l1.35-.75.15-1.55-1.05-1.15 1.75-3.05 1.5.35 1.2-.9.45-1.45h3.5Z"></path>
    `,
  },
  'gearshape.fill': {
    strokeWidth: 1.55,
    body: `
      <circle cx="12" cy="12" r="3.2"></circle>
      <path d="M14.8 4.2 16 5.1l1.5-.35 1.75 3.05-1.05 1.15.15 1.55 1.35.75v3.5l-1.35.75-.15 1.55 1.05 1.15-1.75 3.05-1.5-.35-1.2.9-.45 1.45h-3.5l-.45-1.45-1.2-.9-1.5.35-1.75-3.05 1.05-1.15-.15-1.55-1.35-.75v-3.5l1.35-.75.15-1.55-1.05-1.15 1.75-3.05 1.5.35 1.2-.9.45-1.45h3.5Z"></path>
    `,
  },
  'keyboard.chevron.compact.down': {
    strokeWidth: 1.6,
    body: `
      <rect x="4.3" y="5.2" width="15.4" height="8.7" rx="2.4"></rect>
      <path d="M6.7 8.05h1.35"></path>
      <path d="M9.35 8.05h1.35"></path>
      <path d="M12 8.05h1.35"></path>
      <path d="M14.65 8.05H16"></path>
      <path d="M6.7 10.9h10.6"></path>
      <path d="m7.95 17.55 4.05 3.25 4.05-3.25"></path>
    `,
  },
  'keyboard.chevron.compact.down.fill': {
    strokeWidth: 1.6,
    body: `
      <rect x="4.3" y="5.2" width="15.4" height="8.7" rx="2.4"></rect>
      <path d="M6.7 8.05h1.35"></path>
      <path d="M9.35 8.05h1.35"></path>
      <path d="M12 8.05h1.35"></path>
      <path d="M14.65 8.05H16"></path>
      <path d="M6.7 10.9h10.6"></path>
      <path d="m7.95 17.55 4.05 3.25 4.05-3.25"></path>
    `,
  },
  'xmark.triangle.circle.square': {
    strokeWidth: 1.6,
    body: `
      <path d="m5.15 6 2.15 2.15"></path>
      <path d="M7.3 6 5.15 8.15"></path>
      <path d="m12.45 9.35 2.2-3.8 2.2 3.8Z"></path>
      <circle cx="7.25" cy="16.45" r="1.95"></circle>
      <rect x="12.55" y="14.5" width="4.2" height="4.2" rx="1.1"></rect>
    `,
  },
  translate: {
    strokeWidth: 1.5,
    body: `
      <path d="M6.15 5.8h5.2a2 2 0 0 1 2 2v3.05a2 2 0 0 1-2 2H8.6l-2.95 2.55.55-2.55h-.05a2 2 0 0 1-2-2V7.8a2 2 0 0 1 2-2Z"></path>
      <path d="M13.15 9.3h4.7a2 2 0 0 1 2 2v4.6a2 2 0 0 1-2 2h-.7l.55 2.1-2.4-2.1h-2.15a2 2 0 0 1-2-2v-4.6a2 2 0 0 1 2-2Z"></path>
      <text x="7.15" y="10.35" fill="currentColor" stroke="none" font-size="4.1" font-weight="700">A</text>
      <path d="M14.15 12.9h4.1"></path>
      <path d="M14.15 15.45h2.85"></path>
    `,
  },
  'slider.horizontal.3': {
    body: `
      <path d="M4.2 7.25h6.1"></path>
      <path d="M13.7 7.25h6.1"></path>
      <circle cx="12" cy="7.25" r="1.7"></circle>
      <path d="M4.2 12h2.85"></path>
      <path d="M10.45 12h9.35"></path>
      <circle cx="8.75" cy="12" r="1.7"></circle>
      <path d="M4.2 16.75h9.3"></path>
      <path d="M16.9 16.75h2.9"></path>
      <circle cx="15.2" cy="16.75" r="1.7"></circle>
    `,
  },
  'circle.grid.2x1': {
    strokeWidth: 1.55,
    body: `
      <circle cx="8" cy="9.2" r="2.25"></circle>
      <circle cx="16" cy="9.2" r="2.25"></circle>
      <circle cx="8" cy="15.2" r="2.25"></circle>
      <circle cx="16" cy="15.2" r="2.25"></circle>
    `,
  },
  'rectangle.and.text.magnifyingglass': {
    strokeWidth: 1.55,
    body: `
      <rect x="4.2" y="5.4" width="13.5" height="13.2" rx="2.2"></rect>
      <path d="M7.1 9.2h7.2"></path>
      <path d="M7.1 12.2h5.4"></path>
      <path d="M7.1 15.2h4.2"></path>
      <circle cx="16.1" cy="16.1" r="2.45"></circle>
      <path d="m18 18 2.1 2.1"></path>
    `,
  },
  'square.grid.3x3': {
    strokeWidth: 1.45,
    body: `
      <rect x="5.1" y="5.1" width="3.2" height="3.2" rx="0.8"></rect>
      <rect x="10.4" y="5.1" width="3.2" height="3.2" rx="0.8"></rect>
      <rect x="15.7" y="5.1" width="3.2" height="3.2" rx="0.8"></rect>
      <rect x="5.1" y="10.4" width="3.2" height="3.2" rx="0.8"></rect>
      <rect x="10.4" y="10.4" width="3.2" height="3.2" rx="0.8"></rect>
      <rect x="15.7" y="10.4" width="3.2" height="3.2" rx="0.8"></rect>
      <rect x="5.1" y="15.7" width="3.2" height="3.2" rx="0.8"></rect>
      <rect x="10.4" y="15.7" width="3.2" height="3.2" rx="0.8"></rect>
      <rect x="15.7" y="15.7" width="3.2" height="3.2" rx="0.8"></rect>
    `,
  },
  'character.textbox': {
    body: `
      <rect x="4.4" y="5.1" width="15.2" height="13.8" rx="2.4"></rect>
      <path d="M8 9.3h5.2"></path>
      <path d="M8 13h7.9"></path>
      <path d="M8 16.7h4.2"></path>
    `,
  },
  mic: {
    body: `
      <rect x="9" y="4.35" width="6" height="10.35" rx="3"></rect>
      <path d="M6.75 11.55c0 3.05 2.34 5.45 5.25 5.45s5.25-2.4 5.25-5.45"></path>
      <path d="M12 17v3.15"></path>
      <path d="M8.55 20.15h6.9"></path>
    `,
  },
};

export function renderSystemImageSvg(systemImageName, className = 'system-image-svg') {
  const icon = SYSTEM_IMAGE_SVG_MAP[systemImageName];
  if (!icon) return SYSTEM_IMAGE_MAP[systemImageName] || systemImageName || '';
  const viewBox = icon.viewBox || '0 0 24 24';
  const strokeWidth = icon.strokeWidth || 1.75;
  return `<svg class="${className}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icon.body}</svg>`;
}

export function resolveLabel(spec) {
  if (!spec) return '';
  if (typeof spec === 'string' || typeof spec === 'number') return String(spec);
  if (spec.text) return spec.text;
  if (spec.systemImageName) return SYSTEM_IMAGE_MAP[spec.systemImageName] || spec.systemImageName;
  return '';
}

function pushResolvedLabel(target, value) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => pushResolvedLabel(target, item));
    return;
  }
  const label = resolveLabel(value);
  if (label) {
    target.push(label);
  }
}

export function collectLabels(spec, fallback = '') {
  const labels = [];

  if (!spec || typeof spec !== 'object') {
    return fallback ? [fallback] : [];
  }

  pushResolvedLabel(labels, spec.labels);
  pushResolvedLabel(labels, spec.label);
  pushResolvedLabel(labels, spec.foregrounds);
  pushResolvedLabel(labels, spec.foreground);
  pushResolvedLabel(labels, spec.lockedLabel);
  pushResolvedLabel(labels, spec.unlockedLabel);

  if (!labels.length && fallback) {
    labels.push(fallback);
  }

  return [...new Set(labels)];
}
