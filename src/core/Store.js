// ─── Store: Centralized state management ───
import { createDefaultDevices, createDefaultLinks, createDevice, generateDeviceId, createInterfaceForDevice } from '../model/Topology.js';
import { recomputeAllOspf } from '../simulation/OspfEngine.js';

export class Store {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.devices = createDefaultDevices();
    this.links = createDefaultLinks();
    this.currentDeviceId = Object.keys(this.devices)[0] || 'SW1';
    this.cliMode = 'user';       // user, privileged, config, config-if, config-vlan, config-isakmp, config-crypto-map
    this.currentInterface = '';
    this.currentVlanId = null;
    this.currentCryptoPolicyNum = null;
    this.currentCryptoMapName = null;
    this.currentCryptoMapSeq = null;
    this.currentDhcpPoolName = null;
    this.currentOspfPid = null;
    this.commandHistory = [];
    this.historyIndex = -1;
    this.deviceSessions = {};  // deviceId -> { termBuffer, cliMode, currentInterface, currentVlanId, cryptoPolicyNum, cryptoMapName, cryptoMapSeq }
    this.designMode = false;
    this.designState = { dragging: null, linking: null, hoverDeviceId: null, cursorPos: null };
    this.viewState = { zoom: 1, panX: 0, panY: 0 };
  }

  // ─── Device access ───
  getDevice(id) { return this.devices[id]; }
  getDevices() { return this.devices; }
  getLinks() { return this.links; }
  getCurrentDevice() { return this.devices[this.currentDeviceId]; }
  getCurrentDeviceId() { return this.currentDeviceId; }
  isSwitch() { return this.getCurrentDevice().type === 'switch'; }
  isFirewall() { return this.getCurrentDevice().type === 'firewall'; }

  // ─── Per-device session save/restore ───
  saveSession(termBuffer) {
    this.deviceSessions[this.currentDeviceId] = {
      termBuffer,
      cliMode: this.cliMode,
      currentInterface: this.currentInterface,
      currentVlanId: this.currentVlanId,
      cryptoPolicyNum: this.currentCryptoPolicyNum,
      cryptoMapName: this.currentCryptoMapName,
      cryptoMapSeq: this.currentCryptoMapSeq,
      dhcpPoolName: this.currentDhcpPoolName,
      ospfPid: this.currentOspfPid,
    };
  }

  restoreSession(id) {
    const session = this.deviceSessions[id];
    if (session) {
      this.cliMode = session.cliMode;
      this.currentInterface = session.currentInterface;
      this.currentVlanId = session.currentVlanId;
      this.currentCryptoPolicyNum = session.cryptoPolicyNum;
      this.currentCryptoMapName = session.cryptoMapName;
      this.currentCryptoMapSeq = session.cryptoMapSeq;
      this.currentDhcpPoolName = session.dhcpPoolName;
      this.currentOspfPid = session.ospfPid ?? null;
      return session.termBuffer;
    }
    // No saved session — reset to defaults
    this.cliMode = 'user';
    this.currentInterface = '';
    this.currentVlanId = null;
    this.currentCryptoPolicyNum = null;
    this.currentCryptoMapName = null;
    this.currentCryptoMapSeq = null;
    this.currentDhcpPoolName = null;
    this.currentOspfPid = null;
    return null;
  }

  // ─── Device switching ───
  setCurrentDevice(id) {
    this.currentDeviceId = id;
    this.eventBus.emit('device:switched', id);
  }

  // ─── CLI mode ───
  getCLIMode() { return this.cliMode; }
  setCLIMode(mode) {
    this.cliMode = mode;
    this.eventBus.emit('cli:modeChanged', mode);
  }

  getCurrentInterface() { return this.currentInterface; }
  setCurrentInterface(ifName) { this.currentInterface = ifName; }

  getCurrentVlanId() { return this.currentVlanId; }
  setCurrentVlanId(vid) { this.currentVlanId = vid; }

  getCurrentCryptoPolicyNum() { return this.currentCryptoPolicyNum; }
  setCurrentCryptoPolicyNum(num) { this.currentCryptoPolicyNum = num; }

  getCurrentCryptoMapName() { return this.currentCryptoMapName; }
  setCurrentCryptoMapName(name) { this.currentCryptoMapName = name; }

  getCurrentCryptoMapSeq() { return this.currentCryptoMapSeq; }
  setCurrentCryptoMapSeq(seq) { this.currentCryptoMapSeq = seq; }

  getCurrentDhcpPoolName() { return this.currentDhcpPoolName; }
  setCurrentDhcpPoolName(name) { this.currentDhcpPoolName = name; }

  // ─── Command history ───
  pushHistory(cmd) {
    this.commandHistory.push(cmd);
    this.historyIndex = this.commandHistory.length;
  }

  getHistoryPrev() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.commandHistory[this.historyIndex];
    }
    return null;
  }

  getHistoryNext() {
    if (this.historyIndex < this.commandHistory.length - 1) {
      this.historyIndex++;
      return this.commandHistory[this.historyIndex];
    }
    this.historyIndex = this.commandHistory.length;
    return '';
  }

  // ─── Design mode ───
  setDesignMode(enabled) {
    this.designMode = enabled;
    this.designState = { dragging: null, linking: null, hoverDeviceId: null, cursorPos: null };
    this.eventBus.emit('design:modeChanged', enabled);
    this.eventBus.emit('topology:changed');
  }

  addDevice(type, x, y) {
    const id = generateDeviceId(type, this.devices);
    this.devices[id] = createDevice(type, id, x, y);
    this.eventBus.emit('device:listChanged');
    this.eventBus.emit('topology:changed');
    return id;
  }

  removeDevice(id) {
    if (!this.devices[id]) return;
    // Remove all links involving this device and clear connected fields
    this.links = this.links.filter(link => {
      if (link.from === id || link.to === id) {
        const peerId = link.from === id ? link.to : link.from;
        const peerIf = link.from === id ? link.toIf : link.fromIf;
        const peer = this.devices[peerId];
        if (peer && peer.interfaces[peerIf]) peer.interfaces[peerIf].connected = null;
        return false;
      }
      return true;
    });
    delete this.devices[id];
    if (this.currentDeviceId === id) {
      const ids = Object.keys(this.devices);
      if (ids.length > 0) this.setCurrentDevice(ids[0]);
    }
    this.eventBus.emit('device:listChanged');
    this.eventBus.emit('topology:changed');
  }

  moveDevice(id, x, y) {
    if (!this.devices[id]) return;
    this.devices[id].x = x;
    this.devices[id].y = y;
    this.eventBus.emit('topology:changed');
  }

  addLink(fromId, fromIf, toId, toIf) {
    const fromDev = this.devices[fromId];
    const toDev = this.devices[toId];
    if (!fromDev || !toDev) return false;
    const fromIface = fromDev.interfaces[fromIf];
    const toIface = toDev.interfaces[toIf];
    if (!fromIface || !toIface) return false;
    if (fromIface.connected || toIface.connected) return false;
    if (fromId === toId) return false;
    this.links.push({ from: fromId, fromIf, to: toId, toIf });
    fromIface.connected = { device: toId, iface: toIf };
    toIface.connected = { device: fromId, iface: fromIf };
    this.eventBus.emit('topology:changed');
    return true;
  }

  removeLink(index) {
    const link = this.links[index];
    if (!link) return;
    const fromDev = this.devices[link.from];
    const toDev = this.devices[link.to];
    if (fromDev && fromDev.interfaces[link.fromIf]) fromDev.interfaces[link.fromIf].connected = null;
    if (toDev && toDev.interfaces[link.toIf]) toDev.interfaces[link.toIf].connected = null;
    this.links.splice(index, 1);
    this.eventBus.emit('topology:changed');
  }

  addInterface(deviceId) {
    const dv = this.devices[deviceId];
    if (!dv) return null;
    const { name, iface } = createInterfaceForDevice(dv);
    dv.interfaces[name] = iface;
    this.eventBus.emit('topology:changed');
    return name;
  }

  removeInterface(deviceId, ifName) {
    const dv = this.devices[deviceId];
    if (!dv || !dv.interfaces[ifName]) return false;
    const iface = dv.interfaces[ifName];
    // Remove link if connected
    if (iface.connected) {
      const linkIdx = this.links.findIndex(l =>
        (l.from === deviceId && l.fromIf === ifName) ||
        (l.to === deviceId && l.toIf === ifName)
      );
      if (linkIdx >= 0) this.removeLink(linkIdx);
      else {
        // Clear peer connected field even without link entry
        const peer = this.devices[iface.connected.device];
        if (peer && peer.interfaces[iface.connected.iface]) {
          peer.interfaces[iface.connected.iface].connected = null;
        }
      }
    }
    delete dv.interfaces[ifName];
    this.eventBus.emit('topology:changed');
    return true;
  }

  setTopology(devices, links) {
    this.devices = devices;
    this.links = links;
    const ids = Object.keys(this.devices);
    if (!this.devices[this.currentDeviceId] && ids.length > 0) {
      this.currentDeviceId = ids[0];
    }
    // Populate OSPF route tables for any devices that arrive with OSPF
    // configured but no learned routes yet (e.g. test topologies, challenge
    // scenarios, "Open in Simulator").
    recomputeAllOspf(this.devices);
    this.eventBus.emit('device:listChanged');
    this.eventBus.emit('topology:changed');
  }

  // ─── View (zoom/pan) ───
  resetView() {
    this.viewState = { zoom: 1, panX: 0, panY: 0 };
    this.eventBus.emit('topology:changed');
  }

  fitView(canvasWidth, canvasHeight) {
    const devices = Object.values(this.devices);
    if (devices.length === 0) { this.resetView(); return; }
    const margin = 60;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const dv of devices) {
      minX = Math.min(minX, dv.x); minY = Math.min(minY, dv.y);
      maxX = Math.max(maxX, dv.x); maxY = Math.max(maxY, dv.y);
    }
    const contentW = (maxX - minX) + margin * 2;
    const contentH = (maxY - minY) + margin * 2;
    const scaleX = canvasWidth / 800;
    const scaleY = canvasHeight / 560;
    const zoomX = canvasWidth / (contentW * scaleX);
    const zoomY = canvasHeight / (contentH * scaleY);
    const zoom = Math.min(zoomX, zoomY, 2.0);
    const centerLX = (minX + maxX) / 2;
    const centerLY = (minY + maxY) / 2;
    const panX = canvasWidth / 2 - centerLX * scaleX * zoom;
    const panY = canvasHeight / 2 - centerLY * scaleY * zoom;
    this.viewState = { zoom, panX, panY };
    this.eventBus.emit('topology:changed');
  }

  // ─── Topology changes ───
  emitTopologyChanged() {
    this.eventBus.emit('topology:changed');
  }
}
