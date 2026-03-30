// ─── ContextMenu: Right-click context menu for design mode ───
import { showToast } from '../ui/Toast.js';

export class ContextMenu {
  constructor(store, eventBus) {
    this.store = store;
    this.eventBus = eventBus;

    this.el = document.createElement('div');
    this.el.className = 'design-context-menu';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);

    this._onOutsideClick = (e) => {
      if (!this.el.contains(e.target)) this.hide();
    };
    document.addEventListener('click', this._onOutsideClick);
    document.addEventListener('contextmenu', this._onOutsideClick);
  }

  show(clientX, clientY, context) {
    this.el.innerHTML = '';
    const items = [];

    if (context.deviceId) {
      const dv = this.store.getDevice(context.deviceId);
      const hostname = dv ? dv.hostname : context.deviceId;

      // Add Port
      items.push({
        label: `Add Port to ${hostname}`,
        action: () => {
          const name = this.store.addInterface(context.deviceId);
          if (name) {
            const short = name.replace('GigabitEthernet', 'Gi').replace('Ethernet', 'Eth');
            showToast(`Added ${short} to ${hostname}`, 'success');
          }
        }
      });

      // Remove Port (submenu-like: show unconnected ports)
      if (dv) {
        const removable = Object.entries(dv.interfaces)
          .filter(([, iface]) => !iface.connected);
        if (removable.length > 0) {
          items.push({ label: '---', action: null }); // separator
          for (const [ifName] of removable) {
            const short = ifName.replace('GigabitEthernet', 'Gi').replace('Ethernet', 'Eth');
            items.push({
              label: `  Remove ${short}`,
              cls: 'danger',
              action: () => {
                this.store.removeInterface(context.deviceId, ifName);
                showToast(`Removed ${short} from ${hostname}`, 'success');
              }
            });
          }
        }
      }

      items.push({ label: '---', action: null }); // separator

      // Delete device
      items.push({
        label: `Delete ${hostname}`,
        cls: 'danger',
        action: () => {
          this.store.removeDevice(context.deviceId);
          showToast('Device deleted', 'success');
        }
      });
    } else if (context.linkIdx >= 0) {
      const link = this.store.getLinks()[context.linkIdx];
      if (link) {
        items.push({
          label: `Delete link ${link.from}—${link.to}`,
          cls: 'danger',
          action: () => {
            this.store.removeLink(context.linkIdx);
            showToast('Link deleted', 'success');
          }
        });
      }
    } else {
      // Empty area — quick add
      for (const type of ['router', 'switch', 'pc']) {
        items.push({
          label: `Add ${type.charAt(0).toUpperCase() + type.slice(1)} here`,
          action: () => {
            const id = this.store.addDevice(type, context.logicalPos.x, context.logicalPos.y);
            showToast(`Added ${type}: ${id}`, 'success');
          }
        });
      }
    }

    for (const item of items) {
      if (item.label === '---') {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        this.el.appendChild(sep);
        continue;
      }
      const row = document.createElement('div');
      row.className = 'context-menu-item' + (item.cls ? ` ${item.cls}` : '');
      row.textContent = item.label;
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        item.action();
        this.hide();
      });
      this.el.appendChild(row);
    }

    this.el.style.left = clientX + 'px';
    this.el.style.top = clientY + 'px';
    this.el.style.display = 'block';

    // Ensure menu stays within viewport
    requestAnimationFrame(() => {
      const rect = this.el.getBoundingClientRect();
      if (rect.right > window.innerWidth) this.el.style.left = (clientX - rect.width) + 'px';
      if (rect.bottom > window.innerHeight) this.el.style.top = (clientY - rect.height) + 'px';
    });
  }

  hide() {
    this.el.style.display = 'none';
  }
}
