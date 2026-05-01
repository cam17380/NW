// ─── Show commands ───
import { shortIfName, generateMAC, isValidIP } from '../../simulation/NetworkUtils.js';
import { maskToCIDR, getNetwork } from '../../simulation/NetworkUtils.js';
import { hasCapability } from '../../model/DeviceCapabilities.js';
import { tracePacketFlow } from '../../simulation/PingEngine.js';
import { tryDhcpAssign } from './InterfaceCommands.js';
import { getOspfNeighborInfo, getRouterId, wildcardToMask, getOspfProcessInterfaces } from '../../simulation/OspfEngine.js';

function findTunnelPeer(devices, srcDev, destIP) {
  if (!destIP) return null;
  for (const [id, dv] of Object.entries(devices)) {
    if (dv === srcDev) continue;
    for (const iface of Object.values(dv.interfaces)) {
      if (iface.ip === destIP && iface.status === 'up') return id;
    }
  }
  return null;
}

export function execShow(input, parts, store, termWrite, execPing, execTraceroute) {
  const lower = input.toLowerCase();
  const dev = store.getCurrentDevice();

  if (lower === 'show ip interface brief') {
    termWrite('Interface                  IP-Address      OK? Method Status                Protocol');
    for (const [name, iface] of Object.entries(dev.interfaces)) {
      const ip = iface.ip || 'unassigned';
      const method = iface.dhcpClient ? 'DHCP  ' : 'manual';
      const line = name.padEnd(27) + ip.padEnd(16) + 'YES '.padEnd(4) + (method + ' ').padEnd(7) +
        (iface.status === 'up' ? 'up' : 'administratively down').padEnd(22) + iface.protocol;
      termWrite(line);
    }
    return;
  }

  if (lower === 'show firewall policy') {
    if (!hasCapability(dev, 'firewallPolicy')) { termWrite('% Firewall policy is only available on firewall devices', 'error-line'); return; }
    const policies = dev.policies || [];
    termWrite('Seq    Action  Source                Destination           Protocol  Port');
    termWrite('-----  ------  --------------------  --------------------  --------  ------');
    if (policies.length === 0) {
      termWrite('  (no policies configured)');
    } else {
      for (const p of [...policies].sort((a, b) => a.seq - b.seq)) {
        const srcStr = p.src === 'any' ? 'any' : `${p.src} ${p.srcWildcard}`;
        const dstStr = p.dst === 'any' ? 'any' : `${p.dst} ${p.dstWildcard}`;
        termWrite(
          String(p.seq).padEnd(7) +
          p.action.padEnd(8) +
          srcStr.padEnd(22) +
          dstStr.padEnd(22) +
          p.protocol.padEnd(10) +
          (p.port ? String(p.port) : '---')
        );
      }
    }
    termWrite(String('').padEnd(7) + 'deny'.padEnd(8) + 'any'.padEnd(22) + 'any'.padEnd(22) + 'ip'.padEnd(10) + '---  (implicit)');
    return;
  }

  if (lower === 'show access-lists' || lower === 'show ip access-lists') {
    if (!hasCapability(dev, 'acl')) { termWrite('% ACLs are not available on this device', 'error-line'); return; }
    if (!dev.accessLists || Object.keys(dev.accessLists).length === 0) {
      termWrite('  (no access lists configured)');
      return;
    }
    for (const [num, entries] of Object.entries(dev.accessLists).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
      const aclType = parseInt(num) <= 99 ? 'Standard' : 'Extended';
      termWrite(`${aclType} IP access list ${num}`);
      for (const entry of entries) {
        if (entry.protocol) {
          // Extended ACL entry
          const srcStr = entry.src === 'any' ? 'any' : (entry.srcWildcard === '0.0.0.0' ? `host ${entry.src}` : `${entry.src} ${entry.srcWildcard}`);
          const dstStr = entry.dst === 'any' ? 'any' : (entry.dstWildcard === '0.0.0.0' ? `host ${entry.dst}` : `${entry.dst} ${entry.dstWildcard}`);
          const portStr = entry.port ? ` eq ${entry.port}` : '';
          termWrite(`    ${entry.action} ${entry.protocol} ${srcStr} ${dstStr}${portStr}`);
        } else {
          // Standard ACL entry
          const srcStr = entry.wildcard === '0.0.0.0' ? `host ${entry.network}` : `${entry.network} ${entry.wildcard}`;
          termWrite(`    ${entry.action} ${srcStr}`);
        }
      }
    }
    // Show interface applications
    let hasApp = false;
    for (const [ifName, iface] of Object.entries(dev.interfaces)) {
      if (!iface.accessGroup) continue;
      if (iface.accessGroup.in) {
        if (!hasApp) { termWrite(''); hasApp = true; }
        termWrite(`  ACL ${iface.accessGroup.in} applied inbound on ${ifName}`);
      }
      if (iface.accessGroup.out) {
        if (!hasApp) { termWrite(''); hasApp = true; }
        termWrite(`  ACL ${iface.accessGroup.out} applied outbound on ${ifName}`);
      }
    }
    return;
  }

  if (lower === 'show ip route') {
    const hasSVI = hasCapability(dev, 'vlan') && Object.keys(dev.interfaces).some(n => n.startsWith('Vlan'));
    if (hasCapability(dev, 'vlan') && !hasSVI) { termWrite('% Routing table is not available on L2 switches (configure SVIs for L3)', 'error-line'); return; }
    termWrite('Codes: C - connected, S - static, O - OSPF, * - candidate default\n');
    const defaultRoute = dev.routes ? dev.routes.find(r => r.network === '0.0.0.0') : null;
    const gwLastResort = defaultRoute ? defaultRoute.nextHop : (dev.defaultGateway || 'not set');
    termWrite('Gateway of last resort is ' + gwLastResort);
    termWrite('');

    for (const [ifName, iface] of Object.entries(dev.interfaces)) {
      if (iface.ip && iface.status === 'up') {
        const net = getNetwork(iface.ip, iface.mask);
        const cidr = maskToCIDR(iface.mask);
        termWrite(`C    ${net}/${cidr} is directly connected, ${ifName}`);
      }
    }

    if (dev.routes) {
      for (const r of dev.routes) {
        const cidr = maskToCIDR(r.mask);
        const isDefault = r.network === '0.0.0.0' && r.mask === '0.0.0.0';
        const prefix = isDefault ? 'S*   0.0.0.0/0' : `S    ${r.network}/${cidr}`;
        termWrite(`${prefix} [1/0] via ${r.nextHop}`);
      }
    }

    if (dev.ospfRoutes && dev.ospfRoutes.length > 0) {
      for (const r of dev.ospfRoutes) {
        termWrite(`O    ${r.network}/${maskToCIDR(r.mask)} [110/1] via ${r.nextHop}`);
      }
    }

    if (hasCapability(dev, 'defaultGateway') && dev.defaultGateway) {
      termWrite(`S*   0.0.0.0/0 via ${dev.defaultGateway}`);
    }
    return;
  }

  if (lower === 'show ip ospf neighbor') {
    if (!hasCapability(dev, 'l3Forwarding')) { termWrite('% OSPF is only available on routers/firewalls', 'error-line'); return; }
    const neighbors = getOspfNeighborInfo(store.getDevices(), store.getCurrentDeviceId());
    if (neighbors.length === 0) {
      termWrite('% No OSPF neighbors found');
      return;
    }
    termWrite('Neighbor ID     State       Interface');
    termWrite('--------------- ----------- -----------------------');
    for (const n of neighbors) {
      termWrite(`${n.neighborId.padEnd(16)}FULL        ${n.localIfName}`);
    }
    return;
  }

  if (lower === 'show ip ospf') {
    if (!hasCapability(dev, 'l3Forwarding')) { termWrite('% OSPF is only available on routers/firewalls', 'error-line'); return; }
    if (!dev.ospf || Object.keys(dev.ospf.processes).length === 0) {
      termWrite('% OSPF is not configured on this device'); return;
    }
    for (const [pid, proc] of Object.entries(dev.ospf.processes)) {
      const rid = getRouterId(dev);
      const ifaces = getOspfProcessInterfaces(dev, proc);
      const areas = new Set(proc.networks.map(n => String(n.area)));
      const areaCount = areas.size || 1;
      termWrite(`Routing Process "ospf ${pid}" with ID ${rid}`);
      termWrite(`  Number of areas: ${areaCount} (${areaCount} normal)`);
      termWrite(`  Number of interfaces in this process: ${ifaces.length}`);
      if (proc.networks.length > 0) {
        termWrite('  Network Statements:');
        for (const n of proc.networks) {
          termWrite(`    network ${n.ip} ${n.wildcard} area ${n.area}  (mask ${wildcardToMask(n.wildcard)})`);
        }
      }
    }
    return;
  }

  if (lower === 'show ip ospf database') {
    if (!hasCapability(dev, 'l3Forwarding')) { termWrite('% OSPF is only available on routers/firewalls', 'error-line'); return; }
    if (!dev.ospf || Object.keys(dev.ospf.processes).length === 0) {
      termWrite('% OSPF is not configured on this device'); return;
    }
    termWrite('% OSPF LSDB display is not supported in this simulator');
    termWrite('  (use "show ip ospf neighbor" or "show ip route" instead)');
    return;
  }

  if (lower === 'show vlan brief') {
    if (!hasCapability(dev, 'vlan')) { termWrite('% VLAN information is only available on switches', 'error-line'); return; }
    termWrite('VLAN Name                             Status    Ports');
    termWrite('---- -------------------------------- --------- -------------------------------');
    for (const [vid, vlan] of Object.entries(dev.vlans)) {
      const ports = [];
      for (const [ifName, iface] of Object.entries(dev.interfaces)) {
        if (iface.switchport && iface.switchport.mode === 'access' && iface.switchport.accessVlan === parseInt(vid)) {
          ports.push(shortIfName(ifName));
        }
      }
      const vidStr = String(vid).padEnd(5);
      const nameStr = vlan.name.padEnd(33);
      const status = 'active   ';
      termWrite(vidStr + nameStr + status + ports.join(', '));
    }
    return;
  }

  if (lower === 'show interfaces trunk') {
    if (!hasCapability(dev, 'vlan')) { termWrite('% Trunk information is only available on switches', 'error-line'); return; }
    let hasTrunk = false;
    termWrite('Port        Mode     Encapsulation  Status       Allowed VLANs');
    termWrite('----------- -------- -------------- ------------ ----------------------');
    for (const [ifName, iface] of Object.entries(dev.interfaces)) {
      if (iface.switchport && iface.switchport.mode === 'trunk') {
        hasTrunk = true;
        const allowed = iface.switchport.trunkAllowed === 'all' ? 'ALL' :
          (Array.isArray(iface.switchport.trunkAllowed) ? iface.switchport.trunkAllowed.join(',') : 'ALL');
        const st = iface.status === 'up' ? 'trunking' : 'not-connect';
        termWrite(shortIfName(ifName).padEnd(12) + 'on'.padEnd(9) + '802.1q'.padEnd(15) + st.padEnd(13) + allowed);
      }
    }
    if (!hasTrunk) termWrite('  (no trunk ports configured)');
    return;
  }

  if (lower === 'show interfaces switchport') {
    if (!hasCapability(dev, 'vlan')) { termWrite('% Switchport info is only available on switches', 'error-line'); return; }
    for (const [ifName, iface] of Object.entries(dev.interfaces)) {
      if (!iface.switchport) continue;
      const sp = iface.switchport;
      termWrite(`Name: ${ifName}`);
      termWrite(`Switchport: Enabled`);
      termWrite(`Administrative Mode: ${sp.mode}`);
      if (sp.mode === 'access') {
        termWrite(`Access Mode VLAN: ${sp.accessVlan} (${dev.vlans[sp.accessVlan]?.name || 'unknown'})`);
      } else {
        const allowed = sp.trunkAllowed === 'all' ? 'ALL' : sp.trunkAllowed.join(',');
        termWrite(`Trunking Allowed VLANs: ${allowed}`);
      }
      termWrite('');
    }
    return;
  }

  if (lower === 'show ip nat translations') {
    if (!hasCapability(dev, 'nat') || !dev.nat) { termWrite('% NAT is not configured on this device', 'error-line'); return; }
    // Build translation table from static entries + active translations
    const allTrans = [];
    for (const e of dev.nat.staticEntries) {
      allTrans.push({ proto: '---', insideGlobal: e.insideGlobal, insideLocal: e.insideLocal, outsideLocal: '---', outsideGlobal: '---', type: 'static' });
    }
    for (const t of dev.nat.translations) {
      if (t.type === 'dynamic') {
        allTrans.push({ proto: '---', insideGlobal: t.insideGlobal, insideLocal: t.insideLocal, outsideLocal: '---', outsideGlobal: '---', type: 'dynamic' });
      }
    }
    termWrite('Pro  Inside global      Inside local       Outside local      Outside global');
    termWrite('---  ----------------   ----------------   ----------------   ----------------');
    if (allTrans.length === 0) {
      termWrite('  (no translations)');
    } else {
      for (const t of allTrans) {
        termWrite(t.proto.padEnd(5) + t.insideGlobal.padEnd(19) + t.insideLocal.padEnd(19) + t.outsideLocal.padEnd(19) + t.outsideGlobal);
      }
    }
    return;
  }

  if (lower === 'show ip nat statistics') {
    if (!hasCapability(dev, 'nat') || !dev.nat) { termWrite('% NAT is not configured on this device', 'error-line'); return; }
    const nat = dev.nat;
    const totalTrans = nat.staticEntries.length + nat.translations.filter(t => t.type === 'dynamic').length;
    termWrite(`Total active translations: ${totalTrans} (${nat.staticEntries.length} static, ${totalTrans - nat.staticEntries.length} dynamic)`);
    termWrite(`Hits: ${nat.stats.hits}  Misses: ${nat.stats.misses}`);
    // Inside/outside interfaces
    const insideIfs = [], outsideIfs = [];
    for (const [ifName, iface] of Object.entries(dev.interfaces)) {
      if (iface.natRole === 'inside') insideIfs.push(shortIfName(ifName));
      if (iface.natRole === 'outside') outsideIfs.push(shortIfName(ifName));
    }
    termWrite(`Inside interfaces: ${insideIfs.length > 0 ? insideIfs.join(', ') : '(none)'}`);
    termWrite(`Outside interfaces: ${outsideIfs.length > 0 ? outsideIfs.join(', ') : '(none)'}`);
    // Pools
    for (const [name, pool] of Object.entries(nat.pools)) {
      termWrite(`Pool ${name}: ${pool.startIP} - ${pool.endIP} netmask ${pool.netmask}`);
    }
    // Dynamic rules
    for (const rule of nat.dynamicRules) {
      termWrite(`Dynamic rule: ACL ${rule.aclNum} -> pool ${rule.poolName}`);
    }
    return;
  }

  // ── DHCP show commands ──
  if (lower === 'show ip dhcp binding') {
    if (!hasCapability(dev, 'dhcpServer')) { termWrite('% DHCP binding is only available on routers', 'error-line'); return; }
    if (!dev.dhcp || Object.keys(dev.dhcp.pools).length === 0) { termWrite('  (no DHCP pools configured)'); return; }
    termWrite('IP Address        Client-ID             Pool');
    termWrite('----------------  --------------------  ----------------');
    let count = 0;
    for (const [poolName, pool] of Object.entries(dev.dhcp.pools)) {
      for (const [ip, clientRef] of Object.entries(pool.bindings)) {
        termWrite(`${ip.padEnd(18)}${clientRef.padEnd(22)}${poolName}`);
        count++;
      }
    }
    if (count === 0) termWrite('  (no bindings)');
    return;
  }

  if (lower === 'show ip dhcp pool') {
    if (!hasCapability(dev, 'dhcpServer')) { termWrite('% DHCP pool is only available on routers', 'error-line'); return; }
    if (!dev.dhcp || Object.keys(dev.dhcp.pools).length === 0) { termWrite('  (no DHCP pools configured)'); return; }
    for (const [poolName, pool] of Object.entries(dev.dhcp.pools)) {
      termWrite(`Pool ${poolName}:`);
      termWrite(`  Network:        ${pool.network || '(not set)'} ${pool.mask || ''}`);
      termWrite(`  Default Router: ${pool.defaultRouter || '(not set)'}`);
      termWrite(`  DNS Server:     ${pool.dnsServer || '(not set)'}`);
      termWrite(`  Lease:          ${pool.lease === 0 ? 'infinite' : pool.lease + ' day(s)'}`);
      const bindCount = Object.keys(pool.bindings).length;
      termWrite(`  Bindings:       ${bindCount}`);
      termWrite('');
    }
    if (dev.dhcp.excludedAddresses.length > 0) {
      termWrite('Excluded Addresses:');
      for (const excl of dev.dhcp.excludedAddresses) {
        termWrite(`  ${excl.start}${excl.end !== excl.start ? ' - ' + excl.end : ''}`);
      }
    }
    return;
  }

  if (lower === 'renew dhcp') {
    if (!hasCapability(dev, 'dhcpClient')) { termWrite('% renew dhcp is only available on PCs', 'error-line'); return; }
    // Find DHCP-enabled interface
    let dhcpIf = null, dhcpIfName = null;
    for (const [ifName, iface] of Object.entries(dev.interfaces)) {
      if (iface.dhcpClient) { dhcpIf = iface; dhcpIfName = ifName; break; }
    }
    if (!dhcpIf) { termWrite('% No interface configured with "ip address dhcp"', 'error-line'); return; }
    const devices = store.getDevices();
    // Release old binding first
    if (dhcpIf.ip) {
      const clientRef = store.getCurrentDeviceId() + '/' + dhcpIfName;
      for (const dv of Object.values(devices)) {
        if (!dv.dhcp) continue;
        for (const pool of Object.values(dv.dhcp.pools)) {
          if (pool.bindings[dhcpIf.ip] === clientRef) delete pool.bindings[dhcpIf.ip];
        }
      }
    }
    const result = tryDhcpAssign(devices, store.getCurrentDeviceId(), dhcpIfName);
    if (result) {
      dhcpIf.ip = result.ip; dhcpIf.mask = result.mask;
      dev.defaultGateway = result.gateway; dev.dhcpGateway = true;
      termWrite(`% DHCP: Acquired ${result.ip}/${result.mask} from ${result.serverName}`, 'success-line');
      termWrite(`  Gateway: ${result.gateway}${result.dns ? '  DNS: ' + result.dns : ''}`);
    } else {
      dhcpIf.ip = ''; dhcpIf.mask = '';
      termWrite('% DHCP: No DHCP server found', 'error-line');
    }
    return;
  }

  // ── VPN / Crypto show commands ──
  if (lower === 'show crypto isakmp sa' || lower === 'show crypto isakmp policy') {
    if (!hasCapability(dev, 'vpn')) { termWrite('% crypto commands are only available on routers/firewalls', 'error-line'); return; }
    if (!dev.crypto || Object.keys(dev.crypto.isakmpPolicies).length === 0) {
      termWrite('  (no ISAKMP policies configured)');
      return;
    }
    for (const [num, p] of Object.entries(dev.crypto.isakmpPolicies).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
      termWrite(`ISAKMP Policy ${num}`);
      termWrite(`  Encryption:      ${p.encryption}`);
      termWrite(`  Hash:            ${p.hash}`);
      termWrite(`  Authentication:  ${p.authentication}`);
      termWrite(`  DH Group:        ${p.group}`);
      termWrite(`  Lifetime:        ${p.lifetime} seconds`);
      termWrite('');
    }
    return;
  }

  if (lower === 'show crypto ipsec sa' || lower === 'show crypto ipsec transform-set') {
    if (!hasCapability(dev, 'vpn')) { termWrite('% crypto commands are only available on routers/firewalls', 'error-line'); return; }
    if (!dev.crypto) { termWrite('  (no IPsec configuration)'); return; }
    // Transform sets
    if (Object.keys(dev.crypto.transformSets).length > 0) {
      termWrite('Transform Sets:');
      for (const [name, ts] of Object.entries(dev.crypto.transformSets)) {
        termWrite(`  ${name}: ${ts.transform1}${ts.transform2 ? ' ' + ts.transform2 : ''}`);
      }
      termWrite('');
    }
    // Crypto maps
    if (Object.keys(dev.crypto.cryptoMaps).length > 0) {
      termWrite('Crypto Maps:');
      for (const [mapName, seqs] of Object.entries(dev.crypto.cryptoMaps)) {
        for (const [seq, entry] of Object.entries(seqs).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
          termWrite(`  ${mapName} ${seq} ipsec-isakmp`);
          if (entry.peer) termWrite(`    Peer: ${entry.peer}`);
          if (entry.transformSet) termWrite(`    Transform set: ${entry.transformSet}`);
          if (entry.matchACL) termWrite(`    Match ACL: ${entry.matchACL}`);
        }
      }
      termWrite('');
    }
    // Tunnel interfaces with IPsec
    let hasTunnel = false;
    for (const [ifName, iface] of Object.entries(dev.interfaces)) {
      if (!ifName.startsWith('Tunnel') || !iface.tunnel) continue;
      if (!hasTunnel) { termWrite('IPsec Tunnel Interfaces:'); hasTunnel = true; }
      const t = iface.tunnel;
      const peerDev = findTunnelPeer(store.getDevices(), dev, t.destination);
      const status = t.source && t.destination && peerDev ? 'UP' : 'DOWN';
      termWrite(`  ${ifName}: ${iface.ip || 'unassigned'} -> ${t.destination || 'unset'} (${t.mode}) [${status}]`);
    }
    if (!hasTunnel && Object.keys(dev.crypto.transformSets).length === 0 && Object.keys(dev.crypto.cryptoMaps).length === 0) {
      termWrite('  (no IPsec configuration)');
    }
    return;
  }

  if (lower === 'show interfaces tunnel') {
    if (!hasCapability(dev, 'vpn')) { termWrite('% tunnel interfaces are only available on routers/firewalls', 'error-line'); return; }
    let hasTunnel = false;
    for (const [ifName, iface] of Object.entries(dev.interfaces)) {
      if (!ifName.startsWith('Tunnel')) continue;
      hasTunnel = true;
      const state = iface.status === 'up' ? 'up' : 'administratively down';
      termWrite(`${ifName} is ${state}, line protocol is ${iface.protocol}`);
      if (iface.description) termWrite(`  Description: ${iface.description}`);
      if (iface.ip) termWrite(`  Internet address is ${iface.ip}/${maskToCIDR(iface.mask)}`);
      if (iface.tunnel) {
        termWrite(`  Tunnel source: ${iface.tunnel.source || 'unset'}`);
        termWrite(`  Tunnel destination: ${iface.tunnel.destination || 'unset'}`);
        termWrite(`  Tunnel mode: ${iface.tunnel.mode || 'ipsec'}`);
      }
      if (iface.cryptoMap) termWrite(`  Crypto map: ${iface.cryptoMap}`);
      termWrite('');
    }
    if (!hasTunnel) termWrite('  (no tunnel interfaces configured)');
    return;
  }

  if (lower === 'show etherchannel summary' || lower === 'show bond') {
    // Collect bond groups
    const bonds = {};
    for (const [ifName, iface] of Object.entries(dev.interfaces)) {
      if (!iface.bondGroup) continue;
      if (!bonds[iface.bondGroup]) bonds[iface.bondGroup] = [];
      bonds[iface.bondGroup].push({ ifName, iface });
    }
    if (Object.keys(bonds).length === 0) {
      termWrite('  (no bond groups configured)');
      return;
    }
    termWrite('Group  Members                          Status');
    termWrite('-----  -------------------------------  --------');
    for (const [name, members] of Object.entries(bonds)) {
      const memberStr = members.map(m => {
        const flag = m.iface.status === 'up' ? '(P)' : '(D)';
        return shortIfName(m.ifName) + flag;
      }).join(', ');
      const activeCount = members.filter(m => m.iface.status === 'up').length;
      const status = activeCount > 0 ? `${activeCount}/${members.length} active` : 'all down';
      termWrite(`${name.padEnd(7)}${memberStr.padEnd(33)}${status}`);
    }
    return;
  }

  if (lower === 'show running-config') {
    termWrite('Building configuration...\n');
    termWrite('!');
    termWrite(`hostname ${dev.hostname}`);
    termWrite('!');
    if (dev.vlans) {
      for (const [vid, vlan] of Object.entries(dev.vlans)) {
        if (parseInt(vid) === 1) continue;
        termWrite(`vlan ${vid}`);
        termWrite(` name ${vlan.name}`);
        termWrite('!');
      }
    }
    for (const [name, iface] of Object.entries(dev.interfaces)) {
      termWrite(`interface ${name}`);
      if (iface.description) termWrite(` description ${iface.description}`);
      if (iface.dhcpClient) {
        termWrite(` ip address dhcp`);
        if (iface.ip) termWrite(`  ! Acquired: ${iface.ip} ${iface.mask}`);
      } else if (iface.ip) termWrite(` ip address ${iface.ip} ${iface.mask}`);
      if (iface.switchport) {
        const sp = iface.switchport;
        if (sp.mode === 'trunk') {
          termWrite(` switchport mode trunk`);
          if (sp.trunkAllowed !== 'all') termWrite(` switchport trunk allowed vlan ${sp.trunkAllowed.join(',')}`);
        } else {
          termWrite(` switchport mode access`);
          if (sp.accessVlan !== 1) termWrite(` switchport access vlan ${sp.accessVlan}`);
        }
      }
      if (iface.tunnel) {
        if (iface.tunnel.source) termWrite(` tunnel source ${iface.tunnel.source}`);
        if (iface.tunnel.destination) termWrite(` tunnel destination ${iface.tunnel.destination}`);
        if (iface.tunnel.mode) termWrite(` tunnel mode ${iface.tunnel.mode}`);
      }
      if (iface.cryptoMap) termWrite(` crypto map ${iface.cryptoMap}`);
      if (iface.bondGroup) termWrite(` bond-group ${iface.bondGroup}`);
      if (iface.natRole) termWrite(` ip nat ${iface.natRole}`);
      if (iface.accessGroup) {
        if (iface.accessGroup.in) termWrite(` ip access-group ${iface.accessGroup.in} in`);
        if (iface.accessGroup.out) termWrite(` ip access-group ${iface.accessGroup.out} out`);
      }
      if (iface.status === 'down') termWrite(' shutdown');
      else termWrite(' no shutdown');
      termWrite('!');
    }
    // ACLs
    if (dev.accessLists) {
      for (const [num, entries] of Object.entries(dev.accessLists)) {
        for (const entry of entries) {
          if (entry.protocol) {
            // Extended ACL entry
            const srcStr = entry.src === 'any' ? 'any' : (entry.srcWildcard === '0.0.0.0' ? `host ${entry.src}` : `${entry.src} ${entry.srcWildcard}`);
            const dstStr = entry.dst === 'any' ? 'any' : (entry.dstWildcard === '0.0.0.0' ? `host ${entry.dst}` : `${entry.dst} ${entry.dstWildcard}`);
            const portStr = entry.port ? ` eq ${entry.port}` : '';
            termWrite(`access-list ${num} ${entry.action} ${entry.protocol} ${srcStr} ${dstStr}${portStr}`);
          } else {
            // Standard ACL entry
            termWrite(`access-list ${num} ${entry.action} ${entry.network} ${entry.wildcard}`);
          }
        }
      }
    }
    // NAT
    if (dev.nat) {
      for (const [name, pool] of Object.entries(dev.nat.pools)) {
        termWrite(`ip nat pool ${name} ${pool.startIP} ${pool.endIP} netmask ${pool.netmask}`);
      }
      for (const e of dev.nat.staticEntries) {
        termWrite(`ip nat inside source static ${e.insideLocal} ${e.insideGlobal}`);
      }
      for (const r of dev.nat.dynamicRules) {
        termWrite(`ip nat inside source list ${r.aclNum} pool ${r.poolName}`);
      }
      if (Object.keys(dev.nat.pools).length > 0 || dev.nat.staticEntries.length > 0 || dev.nat.dynamicRules.length > 0) {
        termWrite('!');
      }
    }
    // Crypto / VPN
    if (dev.crypto) {
      let hasCrypto = false;
      for (const [num, p] of Object.entries(dev.crypto.isakmpPolicies || {})) {
        if (!hasCrypto) { hasCrypto = true; }
        termWrite(`crypto isakmp policy ${num}`);
        termWrite(` encryption ${p.encryption}`);
        termWrite(` hash ${p.hash}`);
        termWrite(` authentication ${p.authentication}`);
        termWrite(` group ${p.group}`);
        termWrite(` lifetime ${p.lifetime}`);
        termWrite('!');
      }
      for (const [name, ts] of Object.entries(dev.crypto.transformSets || {})) {
        termWrite(`crypto ipsec transform-set ${name} ${ts.transform1}${ts.transform2 ? ' ' + ts.transform2 : ''}`);
      }
      for (const [mapName, seqs] of Object.entries(dev.crypto.cryptoMaps || {})) {
        for (const [seq, entry] of Object.entries(seqs)) {
          termWrite(`crypto map ${mapName} ${seq} ipsec-isakmp`);
          if (entry.peer) termWrite(` set peer ${entry.peer}`);
          if (entry.transformSet) termWrite(` set transform-set ${entry.transformSet}`);
          if (entry.matchACL) termWrite(` match address ${entry.matchACL}`);
        }
      }
      if (hasCrypto || Object.keys(dev.crypto.transformSets || {}).length > 0 || Object.keys(dev.crypto.cryptoMaps || {}).length > 0) {
        termWrite('!');
      }
    }
    // DHCP
    if (dev.dhcp) {
      const hasDhcp = Object.keys(dev.dhcp.pools).length > 0 || dev.dhcp.excludedAddresses.length > 0;
      if (hasDhcp) {
        for (const excl of dev.dhcp.excludedAddresses) {
          termWrite(`ip dhcp excluded-address ${excl.start}${excl.end !== excl.start ? ' ' + excl.end : ''}`);
        }
        for (const [poolName, pool] of Object.entries(dev.dhcp.pools)) {
          termWrite(`ip dhcp pool ${poolName}`);
          if (pool.network) termWrite(` network ${pool.network} ${pool.mask}`);
          if (pool.defaultRouter) termWrite(` default-router ${pool.defaultRouter}`);
          if (pool.dnsServer) termWrite(` dns-server ${pool.dnsServer}`);
          if (pool.lease !== undefined && pool.lease !== 1) termWrite(` lease ${pool.lease === 0 ? 'infinite' : pool.lease}`);
        }
        termWrite('!');
      }
    }
    // Firewall policies
    if (dev.policies && dev.policies.length > 0) {
      for (const p of [...dev.policies].sort((a, b) => a.seq - b.seq)) {
        const srcStr = p.src === 'any' ? 'any' : `${p.src} ${p.srcWildcard}`;
        const dstStr = p.dst === 'any' ? 'any' : `${p.dst} ${p.dstWildcard}`;
        termWrite(`firewall policy ${p.seq} ${p.action} ${srcStr} ${dstStr} ${p.protocol}${p.port ? ' ' + p.port : ''}`);
      }
      termWrite('!');
    }
    if (dev.routes && dev.routes.length > 0) {
      for (const r of dev.routes) {
        termWrite(`ip route ${r.network} ${r.mask} ${r.nextHop}`);
      }
      termWrite('!');
    }
    if (dev.ospf && Object.keys(dev.ospf.processes).length > 0) {
      // router-id is device-level in the data model — emit under the first process only
      let routerIdEmitted = false;
      for (const [pid, proc] of Object.entries(dev.ospf.processes)) {
        termWrite(`router ospf ${pid}`);
        if (dev.ospf.routerId && !routerIdEmitted) {
          termWrite(` router-id ${dev.ospf.routerId}`);
          routerIdEmitted = true;
        }
        for (const n of proc.networks) {
          termWrite(` network ${n.ip} ${n.wildcard} area ${n.area}`);
        }
        termWrite('!');
      }
    }
    if (hasCapability(dev, 'defaultGateway') && dev.defaultGateway) {
      termWrite(`ip default-gateway ${dev.defaultGateway}`);
      termWrite('!');
    }
    termWrite('end');
    return;
  }

  if (lower === 'show interfaces') {
    for (const [name, iface] of Object.entries(dev.interfaces)) {
      const state = iface.status === 'up' ? 'up' : 'administratively down';
      termWrite(`${name} is ${state}, line protocol is ${iface.protocol}`);
      if (iface.description) termWrite(`  Description: ${iface.description}`);
      if (iface.ip) termWrite(`  Internet address is ${iface.ip}/${maskToCIDR(iface.mask)}`);
      if (iface.switchport) {
        termWrite(`  Switchport mode: ${iface.switchport.mode}, VLAN: ${iface.switchport.mode === 'access' ? iface.switchport.accessVlan : 'trunk'}`);
      }
      if (iface.bondGroup) termWrite(`  Bond group: ${iface.bondGroup}`);
      termWrite('');
    }
    return;
  }

  if (lower === 'show arp') {
    const hasSVI = hasCapability(dev, 'vlan') && Object.keys(dev.interfaces).some(n => n.startsWith('Vlan'));
    if (hasCapability(dev, 'vlan') && !hasSVI) { termWrite('% ARP table is not available on L2 switches', 'error-line'); return; }
    termWrite('Protocol  Address          Age (min)  Hardware Addr   Type   Interface');
    // Self entries: device's own interfaces
    for (const [ifName, iface] of Object.entries(dev.interfaces)) {
      if (!iface.ip || iface.status !== 'up') continue;
      const mac = generateMAC(store.getCurrentDeviceId(), ifName);
      termWrite(`Internet  ${iface.ip.padEnd(16)} -          ${mac}  ARPA   ${shortIfName(ifName)}`);
    }
    // Dynamic entries from ARP table
    const arpTable = dev.arpTable || [];
    for (const entry of arpTable) {
      termWrite(`Internet  ${entry.ip.padEnd(16)} 0          ${entry.mac}  ARPA   ${shortIfName(entry.iface)}`);
    }
    if (Object.values(dev.interfaces).every(i => !i.ip || i.status !== 'up') && arpTable.length === 0) {
      termWrite('  (no ARP entries)');
    }
    return;
  }

  if (lower === 'show packet-flow') {
    termWrite('% Incomplete command — usage: show packet-flow <target-ip> [tcp|udp|icmp] [port]', 'error-line');
    return;
  }
  if (lower.startsWith('show packet-flow ')) {
    const hasSVI = hasCapability(dev, 'vlan') && Object.keys(dev.interfaces).some(n => n.startsWith('Vlan'));
    if (hasCapability(dev, 'vlan') && !hasSVI) { termWrite('% packet-flow is not available on L2 switches', 'error-line'); return; }
    const targetIP = parts[2];
    if (!targetIP || !isValidIP(targetIP)) { termWrite('% Usage: show packet-flow <target-ip> [tcp|udp|icmp] [port]', 'error-line'); return; }

    // Optional protocol and port
    let proto = undefined;
    let port = undefined;
    if (parts[3]) {
      const p = parts[3].toLowerCase();
      if (['tcp', 'udp', 'icmp'].includes(p)) {
        proto = p;
        if (parts[4] && proto !== 'icmp') {
          const pn = parseInt(parts[4], 10);
          if (pn >= 1 && pn <= 65535) port = pn;
          else { termWrite('% Port must be 1-65535', 'error-line'); return; }
        }
      }
    }

    const devices = store.getDevices();
    const currentId = store.getCurrentDeviceId();
    const { hops, reachable } = tracePacketFlow(devices, currentId, targetIP, proto, port);

    renderPacketFlowResult(dev, targetIP, proto, port, hops, reachable, termWrite);
    return;
  }

  if (lower === 'test access') {
    termWrite('% Incomplete command — usage: test access <target-ip> <tcp|udp|icmp> [port]', 'error-line');
    return;
  }
  if (lower.startsWith('test access ')) {
    const hasSVI = hasCapability(dev, 'vlan') && Object.keys(dev.interfaces).some(n => n.startsWith('Vlan'));
    if (hasCapability(dev, 'vlan') && !hasSVI) { termWrite('% test access is not available on L2 switches', 'error-line'); return; }
    // test access <ip> <proto> [port]
    const targetIP = parts[2];
    if (!targetIP || !isValidIP(targetIP)) { termWrite('% Usage: test access <target-ip> <tcp|udp|icmp> [port]', 'error-line'); return; }
    if (!parts[3]) { termWrite('% Usage: test access <target-ip> <tcp|udp|icmp> [port]', 'error-line'); return; }
    const proto = parts[3].toLowerCase();
    if (!['tcp', 'udp', 'icmp'].includes(proto)) { termWrite('% Protocol must be tcp, udp, or icmp', 'error-line'); return; }
    let port = undefined;
    if (proto !== 'icmp' && parts[4]) {
      const pn = parseInt(parts[4], 10);
      if (pn >= 1 && pn <= 65535) port = pn;
      else { termWrite('% Port must be 1-65535', 'error-line'); return; }
    }

    const devices = store.getDevices();
    const currentId = store.getCurrentDeviceId();
    const { hops, reachable } = tracePacketFlow(devices, currentId, targetIP, proto, port);

    renderPacketFlowResult(dev, targetIP, proto, port, hops, reachable, termWrite);
    return;
  }

  if (parts[0].toLowerCase() === 'ping') {
    if (parts.length < 2) { termWrite('% Incomplete command — usage: ping <ip>', 'error-line'); return; }
    execPing(parts[1]);
    return;
  }

  if (parts[0].toLowerCase() === 'traceroute') {
    if (parts.length < 2) { termWrite('% Incomplete command — usage: traceroute <ip>', 'error-line'); return; }
    execTraceroute(parts[1]);
    return;
  }
  termWrite(`% Unknown show command`, 'error-line');
}

// ─── Shared renderer for packet-flow / test access output ───

function renderPacketFlowResult(dev, targetIP, proto, port, hops, reachable, termWrite) {
  let srcIP = '?';
  for (const iface of Object.values(dev.interfaces)) {
    if (iface.status === 'up' && iface.ip) { srcIP = iface.ip; break; }
  }

  const protoLabel = proto ? proto.toUpperCase() : 'ICMP';
  const portLabel = port != null ? `/${port}` : '';
  termWrite(`\nPacket flow: ${dev.hostname} (${srcIP}) -> ${targetIP} (${protoLabel}${portLabel})\n`);
  termWrite('─'.repeat(60));

  for (let i = 0; i < hops.length; i++) {
    const hop = hops[i];
    const typeLabel = hop.deviceType.charAt(0).toUpperCase() + hop.deviceType.slice(1);
    const via = hop.ingressIf ? ` via ${shortIfName(hop.ingressIf)}` : '';
    termWrite(`\n[Hop ${i + 1}] ${hop.hostname} (${typeLabel})${via}`);
    for (const d of hop.decisions) {
      const prefix = d.type === 'error' ? '  ✗ ' :
                     d.type === 'forward' ? '  └ ' :
                     d.type === 'firewall' ? '  ├ ' :
                     d.type === 'acl' ? '  ├ ' :
                     d.type === 'l2-switch' ? '  ~ ' : '  ├ ';
      const cls = d.type === 'error' ? 'error-line' :
                  d.type === 'firewall' && d.text.includes('DENY') ? 'error-line' :
                  d.type === 'acl' && d.text.includes('DENY') ? 'error-line' :
                  d.type === 'forward' ? 'success-line' :
                  d.type === 'local-check' && d.text.includes('REACHED') ? 'success-line' : '';
      termWrite(`${prefix}${d.text}`, cls);
    }
  }

  termWrite('\n' + '─'.repeat(60));
  if (reachable) {
    termWrite(`Result: ACCESS PERMITTED (${protoLabel}${portLabel}) - ${hops.length} hop${hops.length > 1 ? 's' : ''}`, 'success-line');
  } else {
    const lastHop = hops[hops.length - 1];
    const reason = lastHop?.result === 'dropped' ? `DROPPED by ${lastHop.decisions.some(d => d.type === 'firewall') ? 'firewall policy' : 'ACL'}` :
                   lastHop?.result === 'no-route' ? 'No route to host' :
                   lastHop?.result === 'loop' ? 'Routing loop detected' :
                   lastHop?.result === 'no-source' ? 'No source interface' : 'Unreachable';
    termWrite(`Result: ACCESS DENIED (${protoLabel}${portLabel}) - ${reason} at ${lastHop?.hostname || 'unknown'}`, 'error-line');
  }
  termWrite('');
}
