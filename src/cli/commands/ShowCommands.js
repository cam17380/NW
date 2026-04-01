// ─── Show commands ───
import { shortIfName, generateMAC, isValidIP } from '../../simulation/NetworkUtils.js';
import { maskToCIDR, getNetwork } from '../../simulation/NetworkUtils.js';
import { tracePacketFlow } from '../../simulation/PingEngine.js';

export function execShow(input, parts, store, termWrite, execPing, execTraceroute) {
  const lower = input.toLowerCase();
  const dev = store.getCurrentDevice();

  if (lower === 'show ip interface brief') {
    termWrite('Interface                  IP-Address      OK? Method Status                Protocol');
    for (const [name, iface] of Object.entries(dev.interfaces)) {
      const ip = iface.ip || 'unassigned';
      const line = name.padEnd(27) + ip.padEnd(16) + 'YES '.padEnd(4) + 'manual '.padEnd(7) +
        (iface.status === 'up' ? 'up' : 'administratively down').padEnd(22) + iface.protocol;
      termWrite(line);
    }
    return;
  }

  if (lower === 'show firewall policy') {
    if (dev.type !== 'firewall') { termWrite('% Firewall policy is only available on firewall devices', 'error-line'); return; }
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
    if (dev.type !== 'router' && dev.type !== 'firewall' && dev.type !== 'switch') { termWrite('% ACLs are not available on this device', 'error-line'); return; }
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
    const hasSVI = dev.type === 'switch' && Object.keys(dev.interfaces).some(n => n.startsWith('Vlan'));
    if (dev.type === 'switch' && !hasSVI) { termWrite('% Routing table is not available on L2 switches (configure SVIs for L3)', 'error-line'); return; }
    termWrite('Codes: C - connected, S - static, * - candidate default\n');
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

    if ((dev.type === 'pc' || dev.type === 'server') && dev.defaultGateway) {
      termWrite(`S*   0.0.0.0/0 via ${dev.defaultGateway}`);
    }
    return;
  }

  if (lower === 'show vlan brief') {
    if (dev.type !== 'switch') { termWrite('% VLAN information is only available on switches', 'error-line'); return; }
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
    if (dev.type !== 'switch') { termWrite('% Trunk information is only available on switches', 'error-line'); return; }
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
    if (dev.type !== 'switch') { termWrite('% Switchport info is only available on switches', 'error-line'); return; }
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
    if ((dev.type !== 'router' && dev.type !== 'firewall') || !dev.nat) { termWrite('% NAT is not configured on this device', 'error-line'); return; }
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
    if ((dev.type !== 'router' && dev.type !== 'firewall') || !dev.nat) { termWrite('% NAT is not configured on this device', 'error-line'); return; }
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
      if (iface.ip) termWrite(` ip address ${iface.ip} ${iface.mask}`);
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
    if ((dev.type === 'pc' || dev.type === 'server') && dev.defaultGateway) {
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
    const hasSVI = dev.type === 'switch' && Object.keys(dev.interfaces).some(n => n.startsWith('Vlan'));
    if (dev.type === 'switch' && !hasSVI) { termWrite('% ARP table is not available on L2 switches', 'error-line'); return; }
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

  if (lower.startsWith('show packet-flow ')) {
    const hasSVI = dev.type === 'switch' && Object.keys(dev.interfaces).some(n => n.startsWith('Vlan'));
    if (dev.type === 'switch' && !hasSVI) { termWrite('% packet-flow is not available on L2 switches', 'error-line'); return; }
    const targetIP = parts[2];
    if (!targetIP || !isValidIP(targetIP)) { termWrite('% Usage: show packet-flow <target-ip>', 'error-line'); return; }

    const devices = store.getDevices();
    const currentId = store.getCurrentDeviceId();
    const { hops, reachable } = tracePacketFlow(devices, currentId, targetIP);

    // Find source IP
    let srcIP = '?';
    for (const iface of Object.values(dev.interfaces)) {
      if (iface.status === 'up' && iface.ip) { srcIP = iface.ip; break; }
    }

    termWrite(`\nPacket flow: ${dev.hostname} (${srcIP}) -> ${targetIP}\n`);
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
      termWrite(`Result: Packet delivered successfully (${hops.length} hop${hops.length > 1 ? 's' : ''})`, 'success-line');
    } else {
      const lastHop = hops[hops.length - 1];
      const reason = lastHop?.result === 'dropped' ? 'DROPPED by firewall policy' :
                     lastHop?.result === 'no-route' ? 'No route to host' :
                     lastHop?.result === 'loop' ? 'Routing loop detected' :
                     lastHop?.result === 'no-source' ? 'No source interface' : 'Unreachable';
      termWrite(`Result: ${reason} at ${lastHop?.hostname || 'unknown'}`, 'error-line');
    }
    termWrite('');
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
