// ─── Template Selector: Modal overlay for choosing network templates ───
import { templates } from '../persistence/Templates.js';
import { applySnapshot } from '../persistence/Snapshot.js';
import { showToast } from './Toast.js';

export function initTemplateSelector(store, refreshUI) {
  const overlay = document.createElement('div');
  overlay.className = 'template-overlay';
  overlay.id = 'templateOverlay';

  const modal = document.createElement('div');
  modal.className = 'template-modal';

  const header = document.createElement('div');
  header.className = 'template-header';
  header.innerHTML = '<h2>Choose a Network Template</h2>';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'template-close';
  closeBtn.textContent = 'Close';
  closeBtn.onclick = () => overlay.classList.remove('show');
  header.appendChild(closeBtn);
  modal.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'template-grid';

  for (const tpl of templates) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.innerHTML = `
      <div class="template-card-icon">${tpl.icon}</div>
      <div class="template-card-body">
        <div class="template-card-name">${tpl.name}</div>
        <div class="template-card-desc">${tpl.description}</div>
      </div>
    `;
    card.onclick = () => {
      const snap = tpl.build();
      applySnapshot(store, snap);
      refreshUI();
      overlay.classList.remove('show');
      showToast(`Template loaded: ${tpl.name}`, 'success');
    };
    grid.appendChild(card);
  }

  modal.appendChild(grid);
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('show');
  });
  document.body.appendChild(overlay);
}

export function showTemplateSelector() {
  document.getElementById('templateOverlay').classList.add('show');
}
