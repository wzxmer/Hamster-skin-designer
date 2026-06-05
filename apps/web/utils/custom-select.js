import { escapeHtml } from './utils.js';

function getSelectDisplayText(select) {
  return select.selectedOptions?.[0]?.textContent?.trim() || select.options?.[0]?.textContent?.trim() || '';
}

export function closeCustomSelects(except = null) {
  document.querySelectorAll('.custom-select.open').forEach((selectRoot) => {
    if (selectRoot === except) return;
    selectRoot.classList.remove('open');
    selectRoot.querySelector('.custom-select-button')?.setAttribute('aria-expanded', 'false');
  });
}

export function renderCustomSelect(select) {
  const customRoot = select?.nextElementSibling?.classList?.contains('custom-select')
    ? select.nextElementSibling
    : null;
  if (!customRoot) return;
  const button = customRoot.querySelector('.custom-select-button');
  const value = customRoot.querySelector('.custom-select-value');
  const menu = customRoot.querySelector('.custom-select-menu');
  if (!button || !value || !menu) return;

  value.textContent = getSelectDisplayText(select);
  menu.innerHTML = Array.from(select.options)
    .map((option) => {
      const isSelected = option.value === select.value;
      return `
        <button class="custom-select-option ${isSelected ? 'selected' : ''}" type="button" role="option" aria-selected="${isSelected ? 'true' : 'false'}" data-value="${escapeHtml(option.value)}">
          ${escapeHtml(option.textContent)}
        </button>
      `;
    })
    .join('');
}

export function refreshCustomSelect(select) {
  if (!select?.classList?.contains('native-select-hidden')) return;
  renderCustomSelect(select);
}

export function refreshCustomSelects(ids = []) {
  ids.forEach((id) => refreshCustomSelect(document.getElementById(id)));
}

function enhanceCustomSelect(select) {
  if (!select || select.nextElementSibling?.classList?.contains('custom-select')) {
    refreshCustomSelect(select);
    return;
  }

  select.classList.add('native-select-hidden');
  const customRoot = document.createElement('div');
  customRoot.className = 'custom-select';
  customRoot.innerHTML = `
    <button class="custom-select-button" type="button" aria-haspopup="listbox" aria-expanded="false">
      <span class="custom-select-value"></span>
      <span class="custom-select-arrow" aria-hidden="true"></span>
    </button>
    <div class="custom-select-menu" role="listbox"></div>
  `;
  select.insertAdjacentElement('afterend', customRoot);

  customRoot.querySelector('.custom-select-button').addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const willOpen = !customRoot.classList.contains('open');
    closeCustomSelects(customRoot);
    customRoot.classList.toggle('open', willOpen);
    customRoot.querySelector('.custom-select-button').setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  });

  customRoot.querySelector('.custom-select-menu').addEventListener('click', (event) => {
    const optionButton = event.target instanceof Element ? event.target.closest('.custom-select-option') : null;
    if (!optionButton) return;
    event.preventDefault();
    event.stopPropagation();
    select.value = optionButton.dataset.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    closeCustomSelects();
    renderCustomSelect(select);
    optionButton.blur();
    customRoot.querySelector('.custom-select-button')?.blur();
  });

  select.addEventListener('change', () => renderCustomSelect(select));
  renderCustomSelect(select);
}

export function enhanceCustomSelects(ids = []) {
  ids.forEach((id) => enhanceCustomSelect(document.getElementById(id)));
  document.addEventListener('click', () => closeCustomSelects());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCustomSelects();
  });
}
