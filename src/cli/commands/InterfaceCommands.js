// ─── Interface configuration commands ───
import { isValidIP, getNetwork } from '../../simulation/NetworkUtils.js';
import { findL2IPConflict } from '../../simulation/Routing.js';
import { hasCapability } from '../../model/DeviceCapabilities.js';
import { recomputeAllOspf } from '../../simulation/OspfEngine.js';

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
    recomputeAllOspf(devices);
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
    recomputeAllOspf(devices);
    return;
  }
  if (lower === 'ip address dhcp') {
    if (!hasCapability(dev, 'dhcpClient')) { termWrite('% DHCP client is only available on PCs', 'error-line'); return; }
    iface.dhcpClient = true;
    const result = tryDhcpAssign(devices, store.getCurrentDeviceId(), currentInterface);
    if (result) {
      iface.ip = result.ip; iface.mask = result.mask;
      dev.defaultGateway = result.gateway; dev.dhcpGateway = true;
      termWrite(`% DHCP: Acquired ${result.ip}/${result.mask} from ${result.serverName}`, 'success-line');
      termWrite(`  Gateway: ${result.gateway}${result.dns ? '  DNS: ' + result.dns : ''}`);
    } else {
      iface.ip = ''; iface.mask = '';
      termWrite('% DHCP: No DHCP server found — use "renew dhcp" to retry', 'error-line');
    }
    recomputeAllOspf(devices);
    return;
  }
  if (lower === 'no ip address dhcp') {
    if (iface.dhcpClient) {
      releaseDhcpBinding(devices, store.getCurrentDeviceId(), currentInterface, iface.ip);
      iface.dhcpClient = false; iface.ip = ''; iface.mask = '';
      if (dev.dhcpGateway) { dev.defaultGateway = ''; delete dev.dhcpGateway; }
      termWrite('% DHCP client disabled, IP released', 'success-line');
      recomputeAllOspf(devices);
    }
    return;
  }
  if (lower.startsWith('ip address')) {
    const args = input.split(/\s+/);
    if (args.length < 4) { termWrite('% Incomplete command — usage: ip address <ip> <mask>', 'error-line'); return; }
    if (!isValidIP(args[2]) || !isValidIP(args[3])) { termWrite('% Invalid IP address or mask', 'error-line'); return; }
    // Release DHCP binding if switching from DHCP to static
    if (iface.dhcpClient) {
      releaseDhcpBinding(devices, store.getCurrentDeviceId(), currentInterface, iface.ip);
      iface.dhcpClient = false;
      if (dev.dhcpGateway) { dev.defaultGateway = ''; delete dev.dhcpGateway; }
    }
    iface.ip = args[2]; iface.mask = args[3];
    // Gratuitous ARP: detect duplicate IP on same L2 broadcast domain (warn, don't block)
    const conflict = findL2IPConflict(store.getDevices(), store.getCurrentDeviceId(), currentInterface, args[2]);
    if (conflict) {
      termWrite(`%IP-4-DUPADDR: Duplicate address ${args[2]} on ${currentInterface}, sourced by ${conflict.hostname} ${conflict.ifName}`, 'error-line');
    }
    recomputeAllOspf(devices);
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
    const isSVI = hasCapability(dev, 'vlan') && currentInterface.startsWith('Vlan');
    if (!hasCapability(dev, 'l3Forwarding') && !isSVI) { termWrite('% ip access-group is only available on routers/firewalls/switch SVIs', 'error-line'); return; }
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
    if (!hasCapability(dev, 'nat')) { termWrite('% ip nat is only available on routers/firewalls', 'error-line'); return; }
    iface.natRole = 'inside';
    termWrite(`% Interface ${currentInterface} marked as NAT inside`, 'success-line');
    return;
  }
  if (lower === 'ip nat outside') {
    if (!hasCapability(dev, 'nat')) { termWrite('% ip nat is only available on routers/firewalls', 'error-line'); return; }
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
    if (!hasCapability(dev, 'vpn')) { termWrite('% crypto map is only available on routers/firewalls', 'error-line'); return; }
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
    if (!hasCapability(dev, 'lag')) { termWrite('% bond-group is only available on servers/PCs', 'error-line'); return; }
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

// ─── DHCP assignment helpers ───

function ipToLong(ip) {
  return ip.split('.').reduce((acc, o) => (acc << 8) + parseInt(o), 0) >>> 0;
}

function longToIP(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function isExcluded(ip, excludedAddresses) {
  const ipN = ipToLong(ip);
  for (const range of excludedAddresses) {
    if (ipN >= ipToLong(range.start) && ipN <= ipToLong(range.end)) return true;
  }
  return false;
}

function portCarriesVlan(iface, vlan) {
  if (!iface.switchport) return false;
  if (iface.switchport.mode === 'access') return iface.switchport.accessVlan === vlan;
  if (iface.switchport.mode === 'trunk') {
    const allowed = iface.switchport.trunkAllowed;
    return allowed === 'all' || (Array.isArray(allowed) && allowed.includes(vlan));
  }
  return false;
}

// Find all routers reachable on the same L2 broadcast domain via VLAN-aware BFS
function findL2Routers(devices, pcDevId, pcIfName) {
  const pcDev = devices[pcDevId];
  const pcIf = pcDev.interfaces[pcIfName];
  if (!pcIf || !pcIf.connected || pcIf.status !== 'up') return [];

  const remote = pcIf.connected;
  const remoteDev = devices[remote.device];
  const remoteIf = remoteDev.interfaces[remote.iface];
  if (!remoteIf || remoteIf.status !== 'up') return [];

  // Direct connection to router
  if (remoteDev.type === 'router') {
    return [{ routerId: remote.device, routerDev: remoteDev }];
  }

  // Not a switch — no further L2 search
  if (remoteDev.type !== 'switch') return [];

  // Determine VLAN from the switch port the PC is connected to
  let vlan = 1;
  if (remoteIf.switchport) {
    if (remoteIf.switchport.mode === 'access') vlan = remoteIf.switchport.accessVlan;
  }

  // BFS through switches
  const visited = new Set([remote.device]);
  const queue = [remote.device];
  const routers = [];

  while (queue.length > 0) {
    const curId = queue.shift();
    const curDev = devices[curId];

    for (const [ifName, iface] of Object.entries(curDev.interfaces)) {
      if (iface.status !== 'up' || !iface.connected || !iface.switchport) continue;
      if (!portCarriesVlan(iface, vlan)) continue;

      const peerId = iface.connected.device;
      const peerDev = devices[peerId];
      const peerIf = peerDev.interfaces[iface.connected.iface];
      if (!peerIf || peerIf.status !== 'up') continue;

      if (peerDev.type === 'router') {
        if (!routers.some(r => r.routerId === peerId)) {
          routers.push({ routerId: peerId, routerDev: peerDev });
        }
      } else if (peerDev.type === 'switch' && !visited.has(peerId)) {
        visited.add(peerId);
        queue.push(peerId);
      }
    }
  }
  return routers;
}

export function tryDhcpAssign(devices, pcDevId, pcIfName) {
  const routers = findL2Routers(devices, pcDevId, pcIfName);

  for (const { routerId, routerDev } of routers) {
    if (!routerDev.dhcp) continue;
    const excluded = routerDev.dhcp.excludedAddresses || [];

    for (const [poolName, pool] of Object.entries(routerDev.dhcp.pools)) {
      if (!pool.network || !pool.mask) continue;

      // Find a router interface on the same subnet as the pool
      let routerIfIP = null;
      for (const [ifName, rif] of Object.entries(routerDev.interfaces)) {
        if (rif.status !== 'up' || !rif.ip) continue;
        if (getNetwork(rif.ip, pool.mask) === pool.network) {
          routerIfIP = rif.ip;
          break;
        }
      }
      if (!routerIfIP) continue;

      // Allocate lowest available IP
      const netN = ipToLong(pool.network);
      const maskN = ipToLong(pool.mask);
      const broadcast = (netN | (~maskN >>> 0)) >>> 0;
      const usedIPs = new Set(Object.keys(pool.bindings));
      usedIPs.add(routerIfIP);

      for (let ipN = netN + 1; ipN < broadcast; ipN++) {
        const candidateIP = longToIP(ipN);
        if (usedIPs.has(candidateIP)) continue;
        if (isExcluded(candidateIP, excluded)) continue;
        // Check no other device already uses this IP
        let inUse = false;
        for (const [did, dv] of Object.entries(devices)) {
          if (did === pcDevId) continue;
          for (const iface of Object.values(dv.interfaces)) {
            if (iface.ip === candidateIP) { inUse = true; break; }
          }
          if (inUse) break;
        }
        if (inUse) continue;

        pool.bindings[candidateIP] = pcDevId + '/' + pcIfName;
        return {
          ip: candidateIP,
          mask: pool.mask,
          gateway: pool.defaultRouter || routerIfIP,
          dns: pool.dnsServer || '',
          serverName: routerDev.hostname,
        };
      }
    }
  }
  return null;
}

function releaseDhcpBinding(devices, pcDevId, pcIfName, ip) {
  if (!ip) return;
  const clientRef = pcDevId + '/' + pcIfName;
  for (const [did, dv] of Object.entries(devices)) {
    if (!dv.dhcp) continue;
    for (const pool of Object.values(dv.dhcp.pools)) {
      if (pool.bindings[ip] === clientRef) {
        delete pool.bindings[ip];
        return;
      }
    }
  }
}
