// ─── DevicePalette: Sidebar with draggable device items ───

export class DevicePalette {
  constructor(store, eventBus, designController) {
    this.store = store;
    this.eventBus = eventBus;
    this.designController = designController;
    this.linkMode = false;

    this.el = document.createElement('div');
    this.el.className = 'design-palette';
    this.el.style.display = 'none';

    this._buildUI();

    const panel = document.querySelector('.diagram-panel');
    panel.appendChild(this.el);

    eventBus.on('design:modeChanged', (enabled) => {
      this.el.style.display = enabled ? 'flex' : 'none';
      if (!enabled) this.setLinkMode(false);
    });
  }

  _buildUI() {
    const title = document.createElement('div');
    title.className = 'palette-title';
    title.textContent = 'Devices';
    this.el.appendChild(title);

    const deviceTypes = [
      { type: 'router', label: 'Router', icon: 'R' },
      { type: 'switch', label: 'Switch', icon: 'S' },
      { type: 'pc', label: 'PC', icon: 'PC' },
    ];

    for (const dt of deviceTypes) {
      const item = document.createElement('div');
      item.className = 'palette-item';
      item.draggable = true;
      item.title = `Drag to add ${dt.label}`;

      const icon = document.createElement('div');
      icon.className = `palette-icon palette-icon-${dt.type}`;
      icon.textContent = dt.icon;
      item.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'palette-label';
      label.textContent = dt.label;
      item.appendChild(label);

      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', dt.type);
        e.dataTransfer.effectAllowed = 'copy';
      });

      this.el.appendChild(item);
    }

    // Separator
    const sep = document.createElement('div');
    sep.className = 'palette-separator';
    this.el.appendChild(sep);

    // Tools title
    const toolsTitle = document.createElement('div');
    toolsTitle.className = 'palette-title';
    toolsTitle.textContent = 'Tools';
    this.el.appendChild(toolsTitle);

    // Link tool
    this.linkBtn = document.createElement('div');
    this.linkBtn.className = 'palette-item palette-tool';
    this.linkBtn.title = 'Click two devices to create a link';

    const linkIcon = document.createElement('div');
    linkIcon.className = 'palette-icon palette-icon-link';
    linkIcon.textContent = '⟷';
    this.linkBtn.appendChild(linkIcon);

    const linkLabel = document.createElement('span');
    linkLabel.className = 'palette-label';
    linkLabel.textContent = 'Link';
    this.linkBtn.appendChild(linkLabel);

    this.linkBtn.addEventListener('click', () => {
      this.setLinkMode(!this.linkMode);
    });
    this.el.appendChild(this.linkBtn);
  }

  setLinkMode(enabled) {
    this.linkMode = enabled;
    this.linkBtn.classList.toggle('active', enabled);
    const canvas = document.getElementById('netCanvas');
    canvas.style.cursor = enabled ? 'crosshair' : '';

    if (!enabled) {
      this.store.designState.linking = null;
    }
  }

  isLinkMode() {
    return this.linkMode;
  }
}
