// ─── Store: Centralized state management ───
import { createDefaultDevices, createDefaultLinks } from '../model/Topology.js';

export class Store {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.devices = createDefaultDevices();
    this.links = createDefaultLinks();
    this.currentDeviceId = 'R1';
    this.cliMode = 'user';       // user, privileged, config, config-if, config-vlan
    this.currentInterface = '';
    this.currentVlanId = null;
    this.commandHistory = [];
    this.historyIndex = -1;
  }

  // ─── Device access ───
  getDevice(id) { return this.devices[id]; }
  getDevices() { return this.devices; }
  getLinks() { return this.links; }
  getCurrentDevice() { return this.devices[this.currentDeviceId]; }
  getCurrentDeviceId() { return this.currentDeviceId; }
  isSwitch() { return this.getCurrentDevice().type === 'switch'; }

  // ─── Device switching ───
  setCurrentDevice(id) {
    this.currentDeviceId = id;
    this.cliMode = 'user';
    this.currentInterface = '';
    this.currentVlanId = null;
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

  // ─── Topology changes ───
  emitTopologyChanged() {
    this.eventBus.emit('topology:changed');
  }
}
