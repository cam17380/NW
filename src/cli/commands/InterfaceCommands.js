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
    // Gratuitous ARP: detect duplicate IP on same L2 broadcast domain (warn, don't block)
    const conflict = findL2IPConflict(store.getDevices(), store.getCurrentDeviceId(), currentInterface, args[2]);
    if (conflict) {
      termWrite(`%IP-4-DUPADDR: Duplicate address ${args[2]} on ${currentInterface}, sourced by ${conflict.hostname} ${conflict.ifName}`, 'error-line');
    }
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

  // ── ACL on interface (router/firewall/switch SVI) ──
  if (lower.startsWith('ip access-group')) {
    const isSVI = dev.type === 'switch' && currentInterface.startsWith('Vlan');
    if (dev.type !== 'router' && dev.type !== 'firewall' && !isSVI) { termWrite('% ip access-group is only available on routers/firewalls/switch SVIs', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 4) { termWrite('% Usage: ip access-group <acl-num> in|out', 'error-line'); return; }
    const aclNum = parseInt(args[2]);
    if (isNaN(aclNum) || aclNum < 1 || aclNum > 199) { termWrite('% Invalid ACL number (1-199)', 'error-line'); return; }
    const dir = args[3].toLowerCase();
    if (dir !== 'in' && dir !== 'out') { termWrite('% Direction must be "in" or "out"', 'error-line'); return; }
    if (!dev.accessLists[aclNum]) { termWrite(`% ACL ${aclNum} does not exist — define it first with: access-list ${aclNum} ...`, 'error-line'); return; }
    if (!iface.accessGroup) iface.accessGroup = { in: null, out: null };
    iface.accessGroup[dir] = aclNum;
    termWrite(`% ACL ${aclNum} applied ${dir}bound on ${currentInterface}`, 'success-line');
    return;
  }
  if (lower.startsWith('no ip access-group')) {
    const args = input.split(/\s+/);
    if (args.length < 5) { termWrite('% Usage: no ip access-group <acl-num> in|out', 'error-line'); return; }
    const aclNum = parseInt(args[3]);
    const dir = (args[4] || '').toLowerCase();
    if (dir !== 'in' && dir !== 'out') { termWrite('% Direction must be "in" or "out"', 'error-line'); return; }
    if (iface.accessGroup) iface.accessGroup[dir] = null;
    termWrite(`% ACL removed from ${currentInterface} ${dir}bound`, 'success-line');
    return;
  }

  // ── NAT interface role (router only) ──
  if (lower === 'ip nat inside') {
    if (dev.type !== 'router' && dev.type !== 'firewall') { termWrite('% ip nat is only available on routers/firewalls', 'error-line'); return; }
    iface.natRole = 'inside';
    termWrite(`% Interface ${currentInterface} marked as NAT inside`, 'success-line');
    return;
  }
  if (lower === 'ip nat outside') {
    if (dev.type !== 'router' && dev.type !== 'firewall') { termWrite('% ip nat is only available on routers/firewalls', 'error-line'); return; }
    iface.natRole = 'outside';
    termWrite(`% Interface ${currentInterface} marked as NAT outside`, 'success-line');
    return;
  }
  if (lower === 'no ip nat inside' || lower === 'no ip nat outside') {
    iface.natRole = null;
    termWrite(`% NAT role removed from ${currentInterface}`, 'success-line');
    return;
  }

  // ── Tunnel interface commands (router/firewall) ──
  if (lower.startsWith('tunnel source')) {
    if (!currentInterface.startsWith('Tunnel')) { termWrite('% tunnel source is only available on tunnel interfaces', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 3) { termWrite('% Usage: tunnel source <interface-name|ip-address>', 'error-line'); return; }
    if (!iface.tunnel) iface.tunnel = { source: '', destination: '', mode: 'ipsec' };
    const srcArg = args.slice(2).join('');
    iface.tunnel.source = srcArg;
    termWrite(`% Tunnel source set to ${srcArg}`, 'success-line');
    return;
  }
  if (lower.startsWith('tunnel destination')) {
    if (!currentInterface.startsWith('Tunnel')) { termWrite('% tunnel destination is only available on tunnel interfaces', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 3) { termWrite('% Usage: tunnel destination <ip-address>', 'error-line'); return; }
    if (!isValidIP(args[2])) { termWrite('% Invalid IP address', 'error-line'); return; }
    if (!iface.tunnel) iface.tunnel = { source: '', destination: '', mode: 'ipsec' };
    iface.tunnel.destination = args[2];
    termWrite(`% Tunnel destination set to ${args[2]}`, 'success-line');
    return;
  }
  if (lower.startsWith('tunnel mode')) {
    if (!currentInterface.startsWith('Tunnel')) { termWrite('% tunnel mode is only available on tunnel interfaces', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 3) { termWrite('% Usage: tunnel mode ipsec|gre', 'error-line'); return; }
    const mode = args[2].toLowerCase();
    if (mode !== 'ipsec' && mode !== 'gre') { termWrite('% Invalid tunnel mode: use ipsec or gre', 'error-line'); return; }
    if (!iface.tunnel) iface.tunnel = { source: '', destination: '', mode: 'ipsec' };
    iface.tunnel.mode = mode;
    termWrite(`% Tunnel mode set to ${mode}`, 'success-line');
    return;
  }

  // ── Crypto map on interface (router/firewall) ──
  if (lower.startsWith('crypto map')) {
    if (dev.type !== 'router' && dev.type !== 'firewall') { termWrite('% crypto map is only available on routers/firewalls', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 3) { termWrite('% Usage: crypto map <name>', 'error-line'); return; }
    iface.cryptoMap = args[2];
    termWrite(`% Crypto map "${args[2]}" applied to ${currentInterface}`, 'success-line');
    return;
  }
  if (lower === 'no crypto map') {
    delete iface.cryptoMap;
    termWrite(`% Crypto map removed from ${currentInterface}`, 'success-line');
    return;
  }

  // ── Bond group (LACP) ──
  if (lower.startsWith('bond-group')) {
    if (dev.type !== 'server' && dev.type !== 'pc') { termWrite('% bond-group is only available on servers/PCs', 'error-line'); return; }
    if (parts.length < 2) { termWrite('% Usage: bond-group <name>', 'error-line'); return; }
    iface.bondGroup = parts[1];
    termWrite(`% Interface ${currentInterface} added to bond group ${parts[1]}`, 'success-line');
    return;
  }
  if (lower === 'no bond-group') {
    delete iface.bondGroup;
    termWrite(`% Bond group removed from ${currentInterface}`, 'success-line');
    return;
  }

  if (cmd === 'exit') { store.setCLIMode('config'); store.setCurrentInterface(''); return; }
  if (cmd === 'end') { store.setCLIMode('privileged'); store.setCurrentInterface(''); return; }
  termWrite(`% Unknown command "${parts[0]}" in interface config mode`, 'error-line');
}

// ─── L2 broadcast domain IP conflict detection ───
// Walks the L2 topology from the given interface to find any device with the same IP.
// Only checks devices reachable via L2 (switches) — not across routers/firewalls.
function findL2IPConflict(devices, selfDevId, selfIfName, targetIP) {
  const selfDev = devices[selfDevId];
  const selfIf = selfDev.interfaces[selfIfName];
  if (!selfIf) return null;

  // Collect all IPs on the same device (other interfaces)
  for (const [ifName, iff] of Object.entries(selfDev.interfaces)) {
    if (ifName !== selfIfName && iff.ip === targetIP) {
      return { hostname: selfDev.hostname, ifName };
    }
  }

  // If not connected, no L2 neighbors to check
  if (!selfIf.connected) return null;

  const peer = selfIf.connected;
  const peerDev = devices[peer.device];
  if (!peerDev) return null;

  // If directly connected to a non-switch device, check that device only
  if (peerDev.type !== 'switch') {
    for (const [ifName, iff] of Object.entries(peerDev.interfaces)) {
      if (iff.ip === targetIP) return { hostname: peerDev.hostname, ifName };
    }
    return null;
  }

  // Connected to a switch — BFS through switch fabric to find L2 neighbors
  const peerIf = peerDev.interfaces[peer.iface];
  let vlan = 1;
  if (peerIf && peerIf.switchport) {
    if (peerIf.switchport.mode === 'access') vlan = peerIf.switchport.accessVlan;
    // trunk: could carry multiple VLANs, use default VLAN 1 for conflict check scope
  }

  const visitedSwitches = new Set([peer.device]);
  const queue = [peer.device];

  while (queue.length > 0) {
    const swId = queue.shift();
    const sw = devices[swId];

    for (const [ifName, iff] of Object.entries(sw.interfaces)) {
      if (iff.status !== 'up' || !iff.connected) continue;
      if (!iff.switchport) continue;

      // Check VLAN membership
      let carries = false;
      if (iff.switchport.mode === 'access' && iff.switchport.accessVlan === vlan) carries = true;
      if (iff.switchport.mode === 'trunk') {
        const allowed = iff.switchport.trunkAllowed;
        if (allowed === 'all' || (Array.isArray(allowed) && allowed.includes(vlan))) carries = true;
      }
      if (!carries) continue;

      const connDev = devices[iff.connected.device];
      if (!connDev) continue;

      if (connDev.type === 'switch') {
        if (!visitedSwitches.has(iff.connected.device)) {
          visitedSwitches.add(iff.connected.device);
          queue.push(iff.connected.device);
        }
      } else {
        // Non-switch device on the same L2 domain — check its IPs
        if (iff.connected.device === selfDevId) continue; // skip self
        for (const [rIfName, rIf] of Object.entries(connDev.interfaces)) {
          if (rIf.ip === targetIP) {
            return { hostname: connDev.hostname, ifName: rIfName };
          }
        }
      }
    }
  }

  return null;
}
