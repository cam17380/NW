// ─── Configuration mode commands ───
import { normalizeInterface, isValidIP, maskToCIDR } from '../../simulation/NetworkUtils.js';

export function execConfig(input, parts, cmd, store, termWrite, updateTabs) {
  const lower = input.toLowerCase();
  const dev = store.getCurrentDevice();

  if (cmd === 'hostname') {
    if (parts.length < 2) { termWrite('% Incomplete command', 'error-line'); return; }
    dev.hostname = parts[1];
    updateTabs();
    return;
  }

  if (cmd === 'interface') {
    if (parts.length < 2) { termWrite('% Incomplete command — specify interface name', 'error-line'); return; }
    const ifName = normalizeInterface(parts.slice(1).join(''));
    if (!dev.interfaces[ifName]) {
      termWrite(`% Invalid interface "${ifName}"`, 'error-line');
      termWrite('  Available: ' + Object.keys(dev.interfaces).join(', '));
      return;
    }
    store.setCurrentInterface(ifName);
    store.setCLIMode('config-if');
    return;
  }

  // ip route <network> <mask> <next-hop> — router only
  if (lower.startsWith('ip route ')) {
    if (dev.type !== 'router') { termWrite('% ip route is only available on routers', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 5) { termWrite('% Incomplete command — usage: ip route <network> <mask> <next-hop>', 'error-line'); return; }
    const network = args[2], mask = args[3], nextHop = args[4];
    if (!isValidIP(network) || !isValidIP(mask) || !isValidIP(nextHop)) {
      termWrite('% Invalid IP address format', 'error-line'); return;
    }
    const dup = dev.routes.find(r => r.network === network && r.mask === mask && r.nextHop === nextHop);
    if (dup) { termWrite('% Route already exists', 'error-line'); return; }
    dev.routes.push({ network, mask, nextHop });
    const isDefault = network === '0.0.0.0' && mask === '0.0.0.0';
    termWrite(`% Static route added: ${isDefault ? 'default' : network + '/' + maskToCIDR(mask)} via ${nextHop}`, 'success-line');
    return;
  }

  // no ip route <network> <mask> <next-hop>
  if (lower.startsWith('no ip route')) {
    if (dev.type !== 'router') { termWrite('% ip route is only available on routers', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 6) { termWrite('% Incomplete command — usage: no ip route <network> <mask> <next-hop>', 'error-line'); return; }
    const network = args[3], mask = args[4], nextHop = args[5];
    const idx = dev.routes.findIndex(r => r.network === network && r.mask === mask && r.nextHop === nextHop);
    if (idx === -1) { termWrite('% Route not found', 'error-line'); return; }
    dev.routes.splice(idx, 1);
    termWrite(`% Static route removed`, 'success-line');
    return;
  }

  // ip default-gateway <ip> — PC only
  if (lower.startsWith('ip default-gateway')) {
    if (dev.type !== 'pc') { termWrite('% ip default-gateway is for PCs. On routers, use: ip route 0.0.0.0 0.0.0.0 <next-hop>', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 3) { termWrite('% Incomplete command — usage: ip default-gateway <ip>', 'error-line'); return; }
    if (!isValidIP(args[2])) { termWrite('% Invalid IP address', 'error-line'); return; }
    dev.defaultGateway = args[2];
    termWrite(`% Default gateway set to ${args[2]}`, 'success-line');
    return;
  }

  // vlan <id> — switch only
  if (cmd === 'vlan') {
    if (!store.isSwitch()) { termWrite('% VLAN commands are only available on switch devices', 'error-line'); return; }
    const vid = parseInt(parts[1]);
    if (isNaN(vid) || vid < 1 || vid > 4094) { termWrite('% Invalid VLAN ID (1-4094)', 'error-line'); return; }
    if (!dev.vlans[vid]) {
      dev.vlans[vid] = { name: 'VLAN' + String(vid).padStart(4, '0') };
      termWrite(`% VLAN ${vid} created`, 'success-line');
    }
    store.setCurrentVlanId(vid);
    store.setCLIMode('config-vlan');
    return;
  }

  // no vlan <id>
  if (lower.startsWith('no vlan')) {
    if (!store.isSwitch()) { termWrite('% VLAN commands are only available on switch devices', 'error-line'); return; }
    const vid = parseInt(parts[2]);
    if (isNaN(vid)) { termWrite('% Incomplete command — usage: no vlan <id>', 'error-line'); return; }
    if (vid === 1) { termWrite('% Default VLAN 1 cannot be deleted', 'error-line'); return; }
    if (!dev.vlans[vid]) { termWrite(`% VLAN ${vid} not found`, 'error-line'); return; }
    delete dev.vlans[vid];
    for (const iface of Object.values(dev.interfaces)) {
      if (iface.switchport && iface.switchport.accessVlan === vid) {
        iface.switchport.accessVlan = 1;
      }
    }
    termWrite(`% VLAN ${vid} deleted`, 'success-line');
    return;
  }

  if (cmd === 'exit') { store.setCLIMode('privileged'); return; }
  if (cmd === 'end') { store.setCLIMode('privileged'); return; }
  termWrite(`% Unknown command "${parts[0]}" in config mode`, 'error-line');
}

export function execConfigVlan(input, parts, cmd, store, termWrite) {
  const dev = store.getCurrentDevice();

  if (cmd === 'name') {
    if (parts.length < 2) { termWrite('% Incomplete command — usage: name <vlan-name>', 'error-line'); return; }
    dev.vlans[store.getCurrentVlanId()].name = parts.slice(1).join(' ');
    return;
  }
  if (cmd === 'exit') { store.setCLIMode('config'); store.setCurrentVlanId(null); return; }
  if (cmd === 'end') { store.setCLIMode('privileged'); store.setCurrentVlanId(null); return; }
  termWrite(`% Unknown command "${parts[0]}" in VLAN config mode`, 'error-line');
}
