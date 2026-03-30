// ─── InterfacePicker: Floating panel for selecting an interface during link creation ───

export class InterfacePicker {
  constructor(store) {
    this.store = store;
    this.el = document.createElement('div');
    this.el.className = 'interface-picker';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);

    // Close on outside click
    this._onOutsideClick = (e) => {
      if (!this.el.contains(e.target) && this.el.style.display !== 'none') {
        this._resolve(null);
        this.hide();
      }
    };
    document.addEventListener('mousedown', this._onOutsideClick, true);
  }

  pick(deviceId, interfaces) {
    return new Promise((resolve) => {
      this._resolve = resolve;
      const dv = this.store.getDevice(deviceId);
      if (!dv) { resolve(null); return; }

      // Position near the device on the canvas
      const canvas = document.getElementById('netCanvas');
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / 800;
      const scaleY = rect.height / 560;
      const screenX = rect.left + dv.x * scaleX + 40;
      const screenY = rect.top + dv.y * scaleY - 10;

      this.el.innerHTML = '';
      const title = document.createElement('div');
      title.className = 'picker-title';
      title.textContent = `${dv.hostname} — Select Interface`;
      this.el.appendChild(title);

      for (const ifName of interfaces) {
        const btn = document.createElement('button');
        btn.className = 'picker-item';
        btn.textContent = shortenIfName(ifName);
        btn.title = ifName;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          resolve(ifName);
          this.hide();
        });
        this.el.appendChild(btn);
      }

      // Cancel button
      const cancel = document.createElement('button');
      cancel.className = 'picker-cancel';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', (e) => {
        e.stopPropagation();
        resolve(null);
        this.hide();
      });
      this.el.appendChild(cancel);

      this.el.style.left = Math.min(screenX, window.innerWidth - 200) + 'px';
      this.el.style.top = Math.min(screenY, window.innerHeight - 200) + 'px';
      this.el.style.display = 'block';
    });
  }

  hide() {
    this.el.style.display = 'none';
  }
}

function shortenIfName(name) {
  return name
    .replace('GigabitEthernet', 'Gi')
    .replace('FastEthernet', 'Fa')
    .replace('Ethernet', 'Eth');
}
