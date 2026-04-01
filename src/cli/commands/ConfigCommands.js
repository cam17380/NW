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
    const rawName = parts.slice(1).join('');
    const ifName = normalizeInterface(rawName);
    // SVI: "interface vlan <id>" on switches — auto-create if needed
    if (ifName.startsWith('Vlan') && dev.type === 'switch') {
      const vid = parseInt(ifName.slice(4));
      if (isNaN(vid) || vid < 1 || vid > 4094) { termWrite('% Invalid VLAN ID (1-4094)', 'error-line'); return; }
      if (!dev.vlans[vid]) {
        dev.vlans[vid] = { name: 'VLAN' + String(vid).padStart(4, '0') };
        termWrite(`% VLAN ${vid} created`, 'success-line');
      }
      if (!dev.interfaces[ifName]) {
        dev.interfaces[ifName] = { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: null };
        termWrite(`% SVI ${ifName} created`, 'success-line');
      }
      store.setCurrentInterface(ifName);
      store.setCLIMode('config-if');
      return;
    }
    if (!dev.interfaces[ifName]) {
      termWrite(`% Invalid interface "${ifName}"`, 'error-line');
      termWrite('  Available: ' + Object.keys(dev.interfaces).join(', '));
      return;
    }
    store.setCurrentInterface(ifName);
    store.setCLIMode('config-if');
    return;
  }

  // ip route <network> <mask> <next-hop> — router/firewall/server/switch(L3)
  if (lower.startsWith('ip route ')) {
    if (dev.type !== 'router' && dev.type !== 'firewall' && dev.type !== 'server' && dev.type !== 'switch') { termWrite('% ip route is only available on routers/firewalls/servers/L3 switches', 'error-line'); return; }
    if (dev.type === 'switch' && !dev.routes) dev.routes = [];
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
    if (dev.type !== 'router' && dev.type !== 'firewall' && dev.type !== 'server' && dev.type !== 'switch') { termWrite('% ip route is only available on routers/firewalls/servers/L3 switches', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 6) { termWrite('% Incomplete command — usage: no ip route <network> <mask> <next-hop>', 'error-line'); return; }
    const network = args[3], mask = args[4], nextHop = args[5];
    const idx = dev.routes.findIndex(r => r.network === network && r.mask === mask && r.nextHop === nextHop);
    if (idx === -1) { termWrite('% Route not found', 'error-line'); return; }
    dev.routes.splice(idx, 1);
    termWrite(`% Static route removed`, 'success-line');
    return;
  }

  // ip default-gateway <ip> — PC/Server
  if (lower.startsWith('ip default-gateway')) {
    if (dev.type !== 'pc' && dev.type !== 'server') { termWrite('% ip default-gateway is for PCs/servers. On routers, use: ip route 0.0.0.0 0.0.0.0 <next-hop>', 'error-line'); return; }
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

  // ── NAT commands (router only) ──

  // ip nat inside source static <inside-local> <inside-global>
  if (lower.startsWith('ip nat inside source static')) {
    if (dev.type !== 'router' && dev.type !== 'firewall') { termWrite('% ip nat is only available on routers/firewalls', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 7) { termWrite('% Incomplete command — usage: ip nat inside source static <local-ip> <global-ip>', 'error-line'); return; }
    const insideLocal = args[5], insideGlobal = args[6];
    if (!isValidIP(insideLocal) || !isValidIP(insideGlobal)) { termWrite('% Invalid IP address', 'error-line'); return; }
    const dup = dev.nat.staticEntries.find(e => e.insideLocal === insideLocal && e.insideGlobal === insideGlobal);
    if (dup) { termWrite('% Translation already exists', 'error-line'); return; }
    dev.nat.staticEntries.push({ insideLocal, insideGlobal });
    termWrite(`% Static NAT: ${insideLocal} -> ${insideGlobal}`, 'success-line');
    return;
  }

  // no ip nat inside source static <inside-local> <inside-global>
  if (lower.startsWith('no ip nat inside source static')) {
    if (dev.type !== 'router' && dev.type !== 'firewall') { termWrite('% ip nat is only available on routers/firewalls', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 8) { termWrite('% Incomplete command — usage: no ip nat inside source static <local-ip> <global-ip>', 'error-line'); return; }
    const insideLocal = args[6], insideGlobal = args[7];
    const idx = dev.nat.staticEntries.findIndex(e => e.insideLocal === insideLocal && e.insideGlobal === insideGlobal);
    if (idx === -1) { termWrite('% Translation not found', 'error-line'); return; }
    dev.nat.staticEntries.splice(idx, 1);
    dev.nat.translations = dev.nat.translations.filter(t => !(t.insideLocal === insideLocal && t.insideGlobal === insideGlobal && t.type === 'static'));
    termWrite(`% Static NAT removed`, 'success-line');
    return;
  }

  // ip nat inside source list <acl-num> pool <pool-name>
  if (lower.startsWith('ip nat inside source list')) {
    if (dev.type !== 'router' && dev.type !== 'firewall') { termWrite('% ip nat is only available on routers/firewalls', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 8 || args[6].toLowerCase() !== 'pool') {
      termWrite('% Incomplete command — usage: ip nat inside source list <acl-num> pool <pool-name>', 'error-line'); return;
    }
    const aclNum = parseInt(args[5]);
    const poolName = args[7];
    if (isNaN(aclNum) || aclNum < 1 || aclNum > 99) { termWrite('% Invalid ACL number (1-99)', 'error-line'); return; }
    if (!dev.nat.pools[poolName]) { termWrite(`% Pool "${poolName}" not found`, 'error-line'); return; }
    const dup = dev.nat.dynamicRules.find(r => r.aclNum === aclNum && r.poolName === poolName);
    if (dup) { termWrite('% Dynamic NAT rule already exists', 'error-line'); return; }
    dev.nat.dynamicRules.push({ aclNum, poolName });
    termWrite(`% Dynamic NAT: ACL ${aclNum} -> pool ${poolName}`, 'success-line');
    return;
  }

  // no ip nat inside source list <acl-num> pool <pool-name>
  if (lower.startsWith('no ip nat inside source list')) {
    if (dev.type !== 'router' && dev.type !== 'firewall') { termWrite('% ip nat is only available on routers/firewalls', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 9) { termWrite('% Incomplete command', 'error-line'); return; }
    const aclNum = parseInt(args[6]);
    const poolName = args[8];
    const idx = dev.nat.dynamicRules.findIndex(r => r.aclNum === aclNum && r.poolName === poolName);
    if (idx === -1) { termWrite('% Dynamic NAT rule not found', 'error-line'); return; }
    dev.nat.dynamicRules.splice(idx, 1);
    termWrite(`% Dynamic NAT rule removed`, 'success-line');
    return;
  }

  // ip nat pool <name> <start-ip> <end-ip> netmask <mask>
  if (lower.startsWith('ip nat pool')) {
    if (dev.type !== 'router' && dev.type !== 'firewall') { termWrite('% ip nat is only available on routers/firewalls', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 7) { termWrite('% Incomplete command — usage: ip nat pool <name> <start-ip> <end-ip> netmask <mask>', 'error-line'); return; }
    const poolName = args[3], startIP = args[4], endIP = args[5];
    if (!isValidIP(startIP) || !isValidIP(endIP)) { termWrite('% Invalid IP address', 'error-line'); return; }
    let netmask = '255.255.255.0';
    if (args.length >= 8 && args[6].toLowerCase() === 'netmask') {
      if (!isValidIP(args[7])) { termWrite('% Invalid netmask', 'error-line'); return; }
      netmask = args[7];
    }
    dev.nat.pools[poolName] = { startIP, endIP, netmask };
    termWrite(`% NAT pool "${poolName}" defined: ${startIP} - ${endIP}`, 'success-line');
    return;
  }

  // no ip nat pool <name>
  if (lower.startsWith('no ip nat pool')) {
    if (dev.type !== 'router' && dev.type !== 'firewall') { termWrite('% ip nat is only available on routers/firewalls', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 5) { termWrite('% Incomplete command — usage: no ip nat pool <name>', 'error-line'); return; }
    const poolName = args[4];
    if (!dev.nat.pools[poolName]) { termWrite(`% Pool "${poolName}" not found`, 'error-line'); return; }
    const inUse = dev.nat.dynamicRules.some(r => r.poolName === poolName);
    if (inUse) { termWrite(`% Pool "${poolName}" is in use by a dynamic NAT rule`, 'error-line'); return; }
    delete dev.nat.pools[poolName];
    termWrite(`% NAT pool "${poolName}" removed`, 'success-line');
    return;
  }

  // access-list <num> permit|deny ...
  // Standard ACL (1-99):   access-list <num> permit|deny <network> [wildcard]
  // Extended ACL (100-199): access-list <num> permit|deny <proto> <src> <srcWC> <dst> <dstWC> [eq <port>]
  //                         supports "any" and "host <ip>" keywords for src/dst
  if (cmd === 'access-list') {
    if (dev.type !== 'router' && dev.type !== 'firewall' && dev.type !== 'switch') { termWrite('% access-list is only available on routers/firewalls/L3 switches', 'error-line'); return; }
    if (!dev.accessLists) dev.accessLists = {};
    const args = input.split(/\s+/);
    if (args.length < 4) { termWrite('% Incomplete command — usage: access-list <num> permit|deny ...', 'error-line'); return; }
    const aclNum = parseInt(args[1]);
    if (isNaN(aclNum) || aclNum < 1 || aclNum > 199) { termWrite('% Invalid ACL number (1-99 standard, 100-199 extended)', 'error-line'); return; }
    const action = args[2].toLowerCase();
    if (action !== 'permit' && action !== 'deny') { termWrite('% Invalid action — use "permit" or "deny"', 'error-line'); return; }

    if (aclNum <= 99) {
      // Standard ACL: access-list <num> permit|deny <network> [wildcard]
      const network = args[3];
      const wildcard = args.length >= 5 ? args[4] : '0.0.0.0';
      if (!isValidIP(network) || !isValidIP(wildcard)) { termWrite('% Invalid IP address or wildcard', 'error-line'); return; }
      if (!dev.accessLists[aclNum]) dev.accessLists[aclNum] = [];
      dev.accessLists[aclNum].push({ action, network, wildcard });
      termWrite(`% ACL ${aclNum}: ${action} ${network} ${wildcard}`, 'success-line');
    } else {
      // Extended ACL: access-list <num> permit|deny <proto> <src> <srcWC> <dst> <dstWC> [eq <port>]
      if (args.length < 5) {
        termWrite('% Usage: access-list <100-199> permit|deny <protocol> <src> <srcWC> <dst> <dstWC> [eq <port>]', 'error-line');
        termWrite('  protocol: ip, tcp, udp, icmp  |  src/dst: IP wildcard, "any", or "host <ip>"', 'error-line');
        return;
      }
      const protocol = args[3].toLowerCase();
      if (!['ip', 'tcp', 'udp', 'icmp'].includes(protocol)) { termWrite('% Invalid protocol — use ip, tcp, udp, or icmp', 'error-line'); return; }

      let idx = 4;
      // Parse source
      let parsedSrc, parsedSrcWC;
      if ((args[idx] || '').toLowerCase() === 'any') {
        parsedSrc = 'any'; parsedSrcWC = '255.255.255.255'; idx++;
      } else if ((args[idx] || '').toLowerCase() === 'host') {
        idx++;
        if (!args[idx] || !isValidIP(args[idx])) { termWrite('% Invalid host IP address', 'error-line'); return; }
        parsedSrc = args[idx]; parsedSrcWC = '0.0.0.0'; idx++;
      } else {
        parsedSrc = args[idx]; idx++;
        parsedSrcWC = args[idx] || '0.0.0.0'; idx++;
        if (!isValidIP(parsedSrc) || !isValidIP(parsedSrcWC)) { termWrite('% Invalid source address or wildcard', 'error-line'); return; }
      }

      // Parse destination
      let parsedDst, parsedDstWC;
      if (!args[idx]) {
        termWrite('% Incomplete command — destination required', 'error-line'); return;
      }
      if (args[idx].toLowerCase() === 'any') {
        parsedDst = 'any'; parsedDstWC = '255.255.255.255'; idx++;
      } else if (args[idx].toLowerCase() === 'host') {
        idx++;
        if (!args[idx] || !isValidIP(args[idx])) { termWrite('% Invalid host IP address', 'error-line'); return; }
        parsedDst = args[idx]; parsedDstWC = '0.0.0.0'; idx++;
      } else {
        parsedDst = args[idx]; idx++;
        parsedDstWC = args[idx] || '0.0.0.0'; idx++;
        if (!isValidIP(parsedDst) || !isValidIP(parsedDstWC)) { termWrite('% Invalid destination address or wildcard', 'error-line'); return; }
      }

      // Parse optional "eq <port>"
      let port = null;
      if (args[idx] && args[idx].toLowerCase() === 'eq') {
        idx++;
        if ((protocol === 'tcp' || protocol === 'udp') && args[idx]) {
          port = parseInt(args[idx]);
          if (isNaN(port) || port < 1 || port > 65535) { termWrite('% Invalid port number (1-65535)', 'error-line'); return; }
        } else {
          termWrite('% "eq <port>" is only valid with tcp or udp', 'error-line'); return;
        }
      }

      if (!dev.accessLists[aclNum]) dev.accessLists[aclNum] = [];
      dev.accessLists[aclNum].push({ action, protocol, src: parsedSrc, srcWildcard: parsedSrcWC, dst: parsedDst, dstWildcard: parsedDstWC, port });
      const srcStr = parsedSrc === 'any' ? 'any' : `${parsedSrc} ${parsedSrcWC}`;
      const dstStr = parsedDst === 'any' ? 'any' : `${parsedDst} ${parsedDstWC}`;
      termWrite(`% ACL ${aclNum}: ${action} ${protocol} ${srcStr} -> ${dstStr}${port ? ' eq ' + port : ''}`, 'success-line');
    }
    return;
  }

  // no access-list <num>
  if (lower.startsWith('no access-list')) {
    if (dev.type !== 'router' && dev.type !== 'firewall' && dev.type !== 'switch') { termWrite('% access-list is only available on routers/firewalls/L3 switches', 'error-line'); return; }
    const args = input.split(/\s+/);
    const aclNum = parseInt(args[2]);
    if (isNaN(aclNum)) { termWrite('% Incomplete command — usage: no access-list <num>', 'error-line'); return; }
    if (!dev.accessLists[aclNum]) { termWrite(`% ACL ${aclNum} not found`, 'error-line'); return; }
    // Also remove any interface references to this ACL
    for (const iface of Object.values(dev.interfaces)) {
      if (iface.accessGroup) {
        if (iface.accessGroup.in === aclNum) iface.accessGroup.in = null;
        if (iface.accessGroup.out === aclNum) iface.accessGroup.out = null;
      }
    }
    delete dev.accessLists[aclNum];
    termWrite(`% ACL ${aclNum} removed`, 'success-line');
    return;
  }

  // ── Firewall policy commands (firewall only) ──

  // firewall policy <seq> permit|deny <src> <srcWC> <dst> <dstWC> <proto> [port]
  if (lower.startsWith('firewall policy')) {
    if (dev.type !== 'firewall') { termWrite('% firewall policy is only available on firewall devices', 'error-line'); return; }
    const args = input.split(/\s+/);
    if (args.length < 9) {
      termWrite('% Usage: firewall policy <seq> permit|deny <src> <srcWC> <dst> <dstWC> <protocol> [port]', 'error-line');
      termWrite('  protocol: ip, tcp, udp, icmp  |  src/dst: IP or "any"  |  port: number (tcp/udp only)', 'error-line');
      return;
    }
    const seq = parseInt(args[2]);
    if (isNaN(seq) || seq < 1) { termWrite('% Invalid sequence number', 'error-line'); return; }
    const action = args[3].toLowerCase();
    if (action !== 'permit' && action !== 'deny') { termWrite('% Action must be "permit" or "deny"', 'error-line'); return; }
    // Parse with awareness of "any" keyword
    let idx = 2; // start after "firewall policy"
    idx++; // seq
    idx++; // action
    const srcToken = args[idx]; idx++;
    let parsedSrc, parsedSrcWC;
    if (srcToken.toLowerCase() === 'any') {
      parsedSrc = 'any'; parsedSrcWC = '255.255.255.255';
    } else {
      parsedSrc = srcToken; parsedSrcWC = args[idx]; idx++;
      if (!isValidIP(parsedSrc) || !isValidIP(parsedSrcWC)) { termWrite('% Invalid source address or wildcard', 'error-line'); return; }
    }
    const dstToken = args[idx]; idx++;
    let parsedDst, parsedDstWC;
    if (dstToken.toLowerCase() === 'any') {
      parsedDst = 'any'; parsedDstWC = '255.255.255.255';
    } else {
      parsedDst = dstToken; parsedDstWC = args[idx]; idx++;
      if (!isValidIP(parsedDst) || !isValidIP(parsedDstWC)) { termWrite('% Invalid destination address or wildcard', 'error-line'); return; }
    }
    const protocol = (args[idx] || '').toLowerCase(); idx++;
    if (!['ip', 'tcp', 'udp', 'icmp'].includes(protocol)) { termWrite('% Invalid protocol — use ip, tcp, udp, or icmp', 'error-line'); return; }
    let port = null;
    if ((protocol === 'tcp' || protocol === 'udp') && args[idx]) {
      port = parseInt(args[idx]);
      if (isNaN(port) || port < 1 || port > 65535) { termWrite('% Invalid port number (1-65535)', 'error-line'); return; }
    }

    // Remove existing policy with same seq if present
    if (!dev.policies) dev.policies = [];
    dev.policies = dev.policies.filter(p => p.seq !== seq);
    dev.policies.push({ seq, action, src: parsedSrc, srcWildcard: parsedSrcWC, dst: parsedDst, dstWildcard: parsedDstWC, protocol, port });
    dev.policies.sort((a, b) => a.seq - b.seq);
    const srcStr = parsedSrc === 'any' ? 'any' : `${parsedSrc} ${parsedSrcWC}`;
    const dstStr = parsedDst === 'any' ? 'any' : `${parsedDst} ${parsedDstWC}`;
    termWrite(`% Policy ${seq}: ${action} ${srcStr} -> ${dstStr} ${protocol}${port ? ' ' + port : ''}`, 'success-line');
    return;
  }

  // no firewall policy <seq> | no firewall policy all
  if (lower.startsWith('no firewall policy')) {
    if (dev.type !== 'firewall') { termWrite('% firewall policy is only available on firewall devices', 'error-line'); return; }
    if (!dev.policies) dev.policies = [];
    const arg = parts[3];
    if (!arg) { termWrite('% Usage: no firewall policy <seq> | no firewall policy all', 'error-line'); return; }
    if (arg.toLowerCase() === 'all') {
      dev.policies = [];
      termWrite('% All firewall policies removed', 'success-line');
      return;
    }
    const seq = parseInt(arg);
    if (isNaN(seq)) { termWrite('% Invalid sequence number', 'error-line'); return; }
    const before = dev.policies.length;
    dev.policies = dev.policies.filter(p => p.seq !== seq);
    if (dev.policies.length === before) { termWrite(`% Policy ${seq} not found`, 'error-line'); return; }
    termWrite(`% Policy ${seq} removed`, 'success-line');
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
