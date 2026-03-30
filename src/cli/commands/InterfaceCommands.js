// ─── Interface configuration commands ───
import { isValidIP } from '../../simulation/NetworkUtils.js';

function parseTrunkAllowed(input) {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === 'all') return 'all';
  const ids = trimmed.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 4094);
  if (ids.length === 0) return null;
  return ids;
}

export function execConfigIf(input, parts, cmd, store, termWrite) {
  const dev = store.getCurrentDevice();
  const currentInterface = store.getCurrentInterface();
  const iface = dev.interfaces[currentInterface];
  const lower = input.toLowerCase();
  const devices = store.getDevices();

  if (lower === 'no shutdown') {
    iface.status = 'up'; iface.protocol = 'up';
    const remote = iface.connected;
    if (remote) {
      const ri = devices[remote.device].interfaces[remote.iface];
      if (ri) { ri.status = 'up'; ri.protocol = 'up'; }
    }
    termWrite(`%LINK-3-UPDOWN: Interface ${currentInterface}, changed state to up`, 'success-line');
    termWrite(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${currentInterface}, changed state to up`, 'success-line');
    return;
  }
  if (cmd === 'shutdown') {
    iface.status = 'down'; iface.protocol = 'down';
    const remote = iface.connected;
    if (remote) {
      const ri = devices[remote.device].interfaces[remote.iface];
      if (ri) { ri.status = 'down'; ri.protocol = 'down'; }
    }
    termWrite(`%LINK-5-CHANGED: Interface ${currentInterface}, changed state to administratively down`, 'error-line');
    return;
  }
  if (lower.startsWith('ip address')) {
    const args = input.split(/\s+/);
    if (args.length < 4) { termWrite('% Incomplete command — usage: ip address <ip> <mask>', 'error-line'); return; }
    if (!isValidIP(args[2]) || !isValidIP(args[3])) { termWrite('% Invalid IP address or mask', 'error-line'); return; }
    iface.ip = args[2]; iface.mask = args[3];
    return;
  }
  if (cmd === 'description') {
    iface.description = parts.slice(1).join(' ');
    return;
  }

  // ── Switchport commands (switch only) ──
  if (lower === 'switchport mode access') {
    if (!store.isSwitch()) { termWrite('% switchport commands are only available on switches', 'error-line'); return; }
    if (!iface.switchport) iface.switchport = { mode: 'access', accessVlan: 1, trunkAllowed: 'all' };
    iface.switchport.mode = 'access';
    termWrite(`% Interface ${currentInterface} set to access mode`, 'success-line');
    return;
  }
  if (lower === 'switchport mode trunk') {
    if (!store.isSwitch()) { termWrite('% switchport commands are only available on switches', 'error-line'); return; }
    if (!iface.switchport) iface.switchport = { mode: 'trunk', accessVlan: 1, trunkAllowed: 'all' };
    iface.switchport.mode = 'trunk';
    termWrite(`% Interface ${currentInterface} set to trunk mode`, 'success-line');
    return;
  }
  if (lower.startsWith('switchport access vlan')) {
    if (!store.isSwitch()) { termWrite('% switchport commands are only available on switches', 'error-line'); return; }
    const vid = parseInt(parts[parts.length - 1]);
    if (isNaN(vid) || vid < 1 || vid > 4094) { termWrite('% Invalid VLAN ID', 'error-line'); return; }
    if (!dev.vlans[vid]) {
      dev.vlans[vid] = { name: 'VLAN' + String(vid).padStart(4, '0') };
      termWrite(`% Access VLAN does not exist. Creating vlan ${vid}`, 'success-line');
    }
    if (!iface.switchport) iface.switchport = { mode: 'access', accessVlan: 1, trunkAllowed: 'all' };
    iface.switchport.accessVlan = vid;
    termWrite(`% Interface ${currentInterface} assigned to VLAN ${vid}`, 'success-line');
    return;
  }
  if (lower.startsWith('switchport trunk allowed vlan')) {
    if (!store.isSwitch()) { termWrite('% switchport commands are only available on switches', 'error-line'); return; }
    const vlanArg = parts.slice(4).join(' ');
    const allowed = parseTrunkAllowed(vlanArg);
    if (allowed === null) { termWrite('% Invalid VLAN list — use "all" or comma-separated IDs (e.g. 10,20,30)', 'error-line'); return; }
    if (!iface.switchport) iface.switchport = { mode: 'trunk', accessVlan: 1, trunkAllowed: 'all' };
    iface.switchport.trunkAllowed = allowed;
    termWrite(`% Trunk allowed VLANs set to: ${Array.isArray(allowed) ? allowed.join(',') : allowed}`, 'success-line');
    return;
  }

  if (cmd === 'exit') { store.setCLIMode('config'); store.setCurrentInterface(''); return; }
  if (cmd === 'end') { store.setCLIMode('privileged'); store.setCurrentInterface(''); return; }
  termWrite(`% Unknown command "${parts[0]}" in interface config mode`, 'error-line');
}
