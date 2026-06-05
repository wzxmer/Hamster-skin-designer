// apps/web/ui/renderers.js
import { escapeHtml } from '../utils/index.js';
import { el, state } from '../state/index.js';

export function renderSystemImagePreview(systemImageName, wrapperClass, svgClass) {
  if (!systemImageName) return '';
  return `
    <div class="system-image-preview ${wrapperClass || ''}" title="SF Symbol: ${systemImageName}">
      <svg class="w-full h-full ${svgClass || ''}" viewBox="0 0 24 24" fill="currentColor">
        <use href="#keyboard-icon"></use>
      </svg>
      <span class="sr-only">${systemImageName}</span>
    </div>
  `;
}

export function renderLabelGroup(labels, fallback) {
  const parts = [];
  if (labels && Array.isArray(labels)) {
      labels.forEach(lbl => {
        if (!lbl) return;
        const text = lbl.text || '';
        let styleStr = '';
        if (lbl.action === 'space') styleStr = 'font-size: 0.8em; opacity: 0.6;';
        else if (lbl.action === 'backspace') styleStr = 'font-size: 1.1em; opacity: 0.8;';
        parts.push(`<span style="${styleStr}">${escapeHtml(text)}</span>`);
      });
  }
  if (parts.length > 0) return parts.join('');
  return escapeHtml(fallback || '');
}

export function renderDataAttributes(attrs = {}) {
  return Object.entries(attrs).map(([k, v]) => `data-${k}="${escapeHtml(String(v))}"`).join(' ');
}

export function renderFormField(label, inputHtml, hint = '') {
  return `
    <div class="form-field">
      <label class="form-label">${escapeHtml(label)}</label>
      <div class="form-input-group">
        ${inputHtml}
        ${hint ? `<div class="form-hint">${hint}</div>` : ''}
      </div>
    </div>
  `;
}

export function renderWideField(label, inputHtml, hint = '') {
    return `
      <div class="form-field wide">
        <label class="form-label">${escapeHtml(label)}</label>
        <div class="form-input-group w-full">
          ${inputHtml}
          ${hint ? `<div class="form-hint">${hint}</div>` : ''}
        </div>
      </div>
    `;
}

export function renderCollapsiblePanel(title, contentHtml, options = {}) {
  const isOpen = options.defaultOpen !== false;
  return `
    <details class="collapsible-panel" ${isOpen ? 'open' : ''}>
      <summary class="collapsible-header">
        <span class="collapsible-title">${escapeHtml(title)}</span>
        <svg class="collapsible-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
      </summary>
      <div class="collapsible-content">
        ${contentHtml}
      </div>
    </details>
  `;
}
