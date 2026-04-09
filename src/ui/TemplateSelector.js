// ─── Template Selector: Modal overlay for choosing network templates ───
import { templates } from '../persistence/Templates.js';
import { applySnapshot } from '../persistence/Snapshot.js';
import { showToast } from './Toast.js';
import { t } from '../i18n/I18n.js';

let overlay, modal, header, titleEl, closeBtn, grid;
let boundStore, boundRefreshUI;

function tplKey(id) { return 'ui.tpl_' + id.replace(/-/g, '_'); }

function renderGrid() {
  grid.innerHTML = '';
  for (const tpl of templates) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.innerHTML = `
      <div class="template-card-icon">${tpl.icon}</div>
      <div class="template-card-body">
        <div class="template-card-name">${t(tplKey(tpl.id))}</div>
        <div class="template-card-desc">${t(tplKey(tpl.id) + '_desc')}</div>
      </div>
    `;
    card.onclick = () => {
      const snap = tpl.build();
      applySnapshot(boundStore, snap);
      boundRefreshUI();
      overlay.classList.remove('show');
      showToast(t('ui.templateLoaded', { name: t(tplKey(tpl.id)) }), 'success');
    };
    grid.appendChild(card);
  }
}

export function initTemplateSelector(store, refreshUI) {
  boundStore = store;
  boundRefreshUI = refreshUI;

  overlay = document.createElement('div');
  overlay.className = 'template-overlay';
  overlay.id = 'templateOverlay';

  modal = document.createElement('div');
  modal.className = 'template-modal';

  header = document.createElement('div');
  header.className = 'template-header';
  titleEl = document.createElement('h2');
  titleEl.textContent = t('ui.templateTitle');
  header.appendChild(titleEl);
  closeBtn = document.createElement('button');
  closeBtn.className = 'template-close';
  closeBtn.textContent = t('ui.templateClose');
  closeBtn.onclick = () => overlay.classList.remove('show');
  header.appendChild(closeBtn);
  modal.appendChild(header);

  grid = document.createElement('div');
  grid.className = 'template-grid';
  renderGrid();

  modal.appendChild(grid);
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('show');
  });
  document.body.appendChild(overlay);
}

export function showTemplateSelector() {
  // Re-render on show to pick up locale changes
  titleEl.textContent = t('ui.templateTitle');
  closeBtn.textContent = t('ui.templateClose');
  renderGrid();
  document.getElementById('templateOverlay').classList.add('show');
}
