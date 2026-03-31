// ─── DesignController: Canvas interaction handler for design mode ───
import { showToast } from '../ui/Toast.js';

export class DesignController {
  constructor(canvas, store, eventBus, renderer) {
    this.canvas = canvas;
    this.store = store;
    this.eventBus = eventBus;
    this.renderer = renderer;
    this.interfacePicker = null; // set externally
    this.contextMenu = null;    // set externally

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onDragOver = this._onDragOver.bind(this);
    this._onDrop = this._onDrop.bind(this);

    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('contextmenu', this._onContextMenu);
    canvas.addEventListener('dragover', this._onDragOver);
    canvas.addEventListener('drop', this._onDrop);
    document.addEventListener('keydown', this._onKeyDown);
  }

  // ─── Coordinate helpers ───
  canvasToLogical(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    return { x: mx / (rect.width / 800), y: my / (rect.height / 560) };
  }

  hitTestDevice(logicalX, logicalY) {
    const devices = this.store.getDevices();
    for (const [id, dv] of Object.entries(devices)) {
      const dx = logicalX - dv.x;
      const dy = logicalY - dv.y;
      if (Math.sqrt(dx * dx + dy * dy) < 35) return id;
    }
    return null;
  }

  hitTestLink(logicalX, logicalY) {
    const links = this.store.getLinks();
    const devices = this.store.getDevices();
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const from = devices[link.from];
      const to = devices[link.to];
      if (!from || !to) continue;
      const dist = pointToSegmentDist(logicalX, logicalY, from.x, from.y, to.x, to.y);
      if (dist < 12) return i;
    }
    return -1;
  }

  // ─── Mouse events ───
  _onMouseDown(e) {
    if (!this.store.designMode) return;
    if (e.button !== 0) return; // left button only

    const pos = this.canvasToLogical(e.clientX, e.clientY);
    const state = this.store.designState;

    // If in linking mode, handle link clicks
    if (state.linking) return; // linking is handled async via InterfacePicker

    const deviceId = this.hitTestDevice(pos.x, pos.y);
    if (deviceId) {
      // Start drag
      const dv = this.store.getDevice(deviceId);
      state.dragging = {
        deviceId,
        offsetX: pos.x - dv.x,
        offsetY: pos.y - dv.y,
      };
      e.preventDefault();
    }
  }

  _onMouseMove(e) {
    if (!this.store.designMode) return;

    const pos = this.canvasToLogical(e.clientX, e.clientY);
    const state = this.store.designState;

    // Update cursor position for rubber band line
    state.cursorPos = pos;

    if (state.dragging) {
      const newX = Math.max(30, Math.min(770, pos.x - state.dragging.offsetX));
      const newY = Math.max(30, Math.min(530, pos.y - state.dragging.offsetY));
      this.store.moveDevice(state.dragging.deviceId, newX, newY);
      return;
    }

    // Hover detection
    const deviceId = this.hitTestDevice(pos.x, pos.y);
    if (state.hoverDeviceId !== deviceId) {
      state.hoverDeviceId = deviceId;
      this.renderer.draw();
    }

    // Redraw for rubber band line during linking
    if (state.linking) {
      this.renderer.draw();
    }
  }

  _onMouseUp(e) {
    if (!this.store.designMode) return;
    const state = this.store.designState;
    if (state.dragging) {
      state.dragging = null;
    }
  }

  _onContextMenu(e) {
    if (!this.store.designMode) return;
    e.preventDefault();
    e.stopPropagation(); // Prevent document-level listener from immediately hiding the menu

    const pos = this.canvasToLogical(e.clientX, e.clientY);
    const deviceId = this.hitTestDevice(pos.x, pos.y);
    const linkIdx = deviceId === null ? this.hitTestLink(pos.x, pos.y) : -1;

    if (this.contextMenu) {
      this.contextMenu.show(e.clientX, e.clientY, { deviceId, linkIdx, logicalPos: pos });
    }
  }

  _onKeyDown(e) {
    if (!this.store.designMode) return;
    const state = this.store.designState;

    if (e.key === 'Escape') {
      if (state.linking) {
        state.linking = null;
        this.renderer.draw();
        showToast('Link creation cancelled', '');
      }
    }

    if (e.key === 'Delete') {
      if (state.hoverDeviceId) {
        this.store.removeDevice(state.hoverDeviceId);
        state.hoverDeviceId = null;
        showToast('Device deleted', 'success');
      }
    }
  }

  // ─── Drag & Drop from palette ───
  _onDragOver(e) {
    if (!this.store.designMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  _onDrop(e) {
    if (!this.store.designMode) return;
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (!['router', 'switch', 'firewall', 'server', 'pc'].includes(type)) return;
    const pos = this.canvasToLogical(e.clientX, e.clientY);
    const id = this.store.addDevice(type, pos.x, pos.y);
    showToast(`Added ${type}: ${id}`, 'success');
  }

  // ─── Link creation (called from palette link tool or device click) ───
  async startLinkFromDevice(deviceId) {
    const state = this.store.designState;
    const dv = this.store.getDevice(deviceId);
    if (!dv) return;

    // Get unconnected interfaces
    const freeIfs = Object.entries(dv.interfaces)
      .filter(([, iface]) => !iface.connected)
      .map(([name]) => name);

    if (freeIfs.length === 0) {
      showToast(`${dv.hostname}: No free interfaces`, 'error');
      return;
    }

    const fromIf = await this.interfacePicker.pick(deviceId, freeIfs);
    if (!fromIf) return;

    state.linking = { fromDeviceId: deviceId, fromIf };
    showToast('Click target device to create link...', '');
    this.renderer.draw();
  }

  async completeLinkToDevice(deviceId) {
    const state = this.store.designState;
    if (!state.linking) return;
    if (state.linking.fromDeviceId === deviceId) {
      showToast('Cannot connect device to itself', 'error');
      return;
    }

    const dv = this.store.getDevice(deviceId);
    if (!dv) return;

    const freeIfs = Object.entries(dv.interfaces)
      .filter(([, iface]) => !iface.connected)
      .map(([name]) => name);

    if (freeIfs.length === 0) {
      showToast(`${dv.hostname}: No free interfaces`, 'error');
      return;
    }

    const toIf = await this.interfacePicker.pick(deviceId, freeIfs);
    if (!toIf) {
      state.linking = null;
      this.renderer.draw();
      return;
    }

    const ok = this.store.addLink(state.linking.fromDeviceId, state.linking.fromIf, deviceId, toIf);
    state.linking = null;
    if (ok) {
      showToast('Link created', 'success');
    } else {
      showToast('Failed to create link', 'error');
    }
    this.renderer.draw();
  }

  // Called when canvas is clicked in link-creation mode
  async handleDesignClick(e) {
    if (!this.store.designMode) return false;
    const state = this.store.designState;
    if (state.dragging) return false;

    const pos = this.canvasToLogical(e.clientX, e.clientY);
    const deviceId = this.hitTestDevice(pos.x, pos.y);

    if (!deviceId) return false;

    if (state.linking) {
      await this.completeLinkToDevice(deviceId);
      return true;
    }

    // Start link from this device
    await this.startLinkFromDevice(deviceId);
    return true;
  }
}

// ─── Geometry utility ───
function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nx = ax + t * dx, ny = ay + t * dy;
  return Math.sqrt((px - nx) ** 2 + (py - ny) ** 2);
}
