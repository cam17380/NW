// ─── CLI Engine: Command dispatch and mode state machine ───
import { expandAbbrev } from './Abbreviations.js';
import { execShow } from './commands/ShowCommands.js';
import { execConfig, execConfigVlan, execConfigIsakmp, execConfigCryptoMap, execConfigDhcpPool } from './commands/ConfigCommands.js';
import { execConfigIf } from './commands/InterfaceCommands.js';

export class CLIEngine {
  constructor(store, terminal, eventBus) {
    this.store = store;
    this.terminal = terminal;
    this.eventBus = eventBus;
    this._execPing = null;  // Set externally to avoid circular dependency
    this._execTraceroute = null;
    this._updateTabs = null;
  }

  setExecPing(fn) { this._execPing = fn; }
  setExecTraceroute(fn) { this._execTraceroute = fn; }
  setUpdateTabs(fn) { this._updateTabs = fn; }

  executeCommand(rawInput) {
    const prompt = this._getPrompt();
    this.terminal.writeCmd(prompt, rawInput);

    if (!rawInput.trim()) return;

    this.store.pushHistory(rawInput);

    const input = expandAbbrev(rawInput.trim());
    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    const mode = this.store.getCLIMode();
    switch (mode) {
      case 'user': this._execUser(input, parts, cmd); break;
      case 'privileged': this._execPrivileged(input, parts, cmd); break;
      case 'config': this._execConfig(input, parts, cmd); break;
      case 'config-if': this._execConfigIf(input, parts, cmd); break;
      case 'config-vlan': this._execConfigVlan(input, parts, cmd); break;
      case 'config-isakmp': this._execConfigIsakmp(input, parts, cmd); break;
      case 'config-crypto-map': this._execConfigCryptoMap(input, parts, cmd); break;
      case 'config-dhcp-pool': this._execConfigDhcpPool(input, parts, cmd); break;
    }

    this.eventBus.emit('command:executed');
  }

  _getPrompt() {
    const h = this.store.getCurrentDevice().hostname;
    switch (this.store.getCLIMode()) {
      case 'user': return h + '>';
      case 'privileged': return h + '#';
      case 'config': return h + '(config)#';
      case 'config-if': return h + '(config-if)#';
      case 'config-vlan': return h + '(config-vlan)#';
      case 'config-isakmp': return h + '(config-isakmp)#';
      case 'config-crypto-map': return h + '(config-crypto-map)#';
      case 'config-dhcp-pool': return h + '(dhcp-config)#';
    }
  }

  getPrompt() { return this._getPrompt(); }

  _execUser(input, parts, cmd) {
    if (cmd === 'enable') { this.store.setCLIMode('privileged'); return; }
    if (input.toLowerCase().startsWith('show') || cmd === 'ping' || cmd === 'traceroute' || cmd === 'test') {
      return execShow(input, parts, this.store, (t, c) => this.terminal.write(t, c), this._execPing, this._execTraceroute);
    }
    this.terminal.write(`% Unknown command "${parts[0]}" in user mode`, 'error-line');
  }

  _execPrivileged(input, parts, cmd) {
    if (input.toLowerCase() === 'configure terminal') {
      this.store.setCLIMode('config');
      this.terminal.write('Enter configuration commands, one per line. End with "end".', 'success-line');
      return;
    }
    if (cmd === 'disable' || cmd === 'exit') { this.store.setCLIMode('user'); return; }
    if (input.toLowerCase() === 'clear arp' || input.toLowerCase() === 'clear arp-cache') {
      const dev = this.store.getCurrentDevice();
      dev.arpTable = [];
      this.terminal.write('% ARP cache cleared', 'success-line');
      return;
    }
    if (input.toLowerCase() === 'renew dhcp') {
      return execShow(input, parts, this.store, (t, c) => this.terminal.write(t, c), this._execPing, this._execTraceroute);
    }
    if (input.toLowerCase().startsWith('show') || cmd === 'ping' || cmd === 'traceroute' || cmd === 'test') {
      return execShow(input, parts, this.store, (t, c) => this.terminal.write(t, c), this._execPing, this._execTraceroute);
    }
    this.terminal.write(`% Unknown command "${parts[0]}"`, 'error-line');
  }

  _execConfig(input, parts, cmd) {
    execConfig(input, parts, cmd, this.store, (t, c) => this.terminal.write(t, c), this._updateTabs);
  }

  _execConfigIf(input, parts, cmd) {
    execConfigIf(input, parts, cmd, this.store, (t, c) => this.terminal.write(t, c));
  }

  _execConfigVlan(input, parts, cmd) {
    execConfigVlan(input, parts, cmd, this.store, (t, c) => this.terminal.write(t, c));
  }

  _execConfigIsakmp(input, parts, cmd) {
    execConfigIsakmp(input, parts, cmd, this.store, (t, c) => this.terminal.write(t, c));
  }

  _execConfigCryptoMap(input, parts, cmd) {
    execConfigCryptoMap(input, parts, cmd, this.store, (t, c) => this.terminal.write(t, c));
  }

  _execConfigDhcpPool(input, parts, cmd) {
    execConfigDhcpPool(input, parts, cmd, this.store, (t, c) => this.terminal.write(t, c));
  }
}
