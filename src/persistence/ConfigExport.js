// ─── Config Export: Generate executable CLI command scripts for all devices ───

export function exportCommandScript(store) {
  const devices = store.getDevices();
  const lines = [];

  lines.push('!');
  lines.push('! ============================================================');
  lines.push('! Network Simulator — Device Configuration Script');
  lines.push(`! Generated: ${new Date().toLocaleString('ja-JP')}`);
  lines.push(`! Devices: ${Object.keys(devices).length}`);
  lines.push('! ============================================================');
  lines.push('!');

  for (const [id, dev] of Object.entries(devices)) {
    lines.push('');
    lines.push('! ────────────────────────────────────────');
    lines.push(`! Device: ${dev.hostname} (${dev.type.toUpperCase()}) [${id}]`);
    lines.push('! ────────────────────────────────────────');
    lines.push('');
    lines.push('enable');
    lines.push('configure terminal');

    // Hostname
    lines.push(`hostname ${dev.hostname}`);

    // VLANs (switch only)
    if (dev.vlans) {
      for (const [vid, vlan] of Object.entries(dev.vlans)) {
        if (parseInt(vid) === 1) continue;
        lines.push(`vlan ${vid}`);
        lines.push(` name ${vlan.name}`);
        lines.push(` exit`);
      }
    }

    // ACLs (before interfaces, since ip access-group references them)
    if (dev.accessLists && Object.keys(dev.accessLists).length > 0) {
      lines.push('!');
      for (const [num, entries] of Object.entries(dev.accessLists)) {
        for (const entry of entries) {
          if (entry.protocol) {
            const srcStr = entry.src === 'any' ? 'any' : (entry.srcWildcard === '0.0.0.0' ? `host ${entry.src}` : `${entry.src} ${entry.srcWildcard}`);
            const dstStr = entry.dst === 'any' ? 'any' : (entry.dstWildcard === '0.0.0.0' ? `host ${entry.dst}` : `${entry.dst} ${entry.dstWildcard}`);
            const portStr = entry.port ? ` eq ${entry.port}` : '';
            lines.push(`access-list ${num} ${entry.action} ${entry.protocol} ${srcStr} ${dstStr}${portStr}`);
          } else {
            lines.push(`access-list ${num} ${entry.action} ${entry.network} ${entry.wildcard}`);
          }
        }
      }
    }

    // NAT pools and rules (before interfaces)
    if (dev.nat) {
      const hasNat = Object.keys(dev.nat.pools).length > 0 || dev.nat.staticEntries.length > 0 || dev.nat.dynamicRules.length > 0;
      if (hasNat) {
        lines.push('!');
        for (const [name, pool] of Object.entries(dev.nat.pools)) {
          lines.push(`ip nat pool ${name} ${pool.startIP} ${pool.endIP} netmask ${pool.netmask}`);
        }
        for (const e of dev.nat.staticEntries) {
          lines.push(`ip nat inside source static ${e.insideLocal} ${e.insideGlobal}`);
        }
        for (const r of dev.nat.dynamicRules) {
          lines.push(`ip nat inside source list ${r.aclNum} pool ${r.poolName}`);
        }
      }
    }

    // Crypto / VPN configuration (before interfaces)
    if (dev.crypto) {
      const hasIsakmp = Object.keys(dev.crypto.isakmpPolicies || {}).length > 0;
      const hasTS = Object.keys(dev.crypto.transformSets || {}).length > 0;
      const hasCM = Object.keys(dev.crypto.cryptoMaps || {}).length > 0;
      if (hasIsakmp || hasTS || hasCM) {
        lines.push('!');
        for (const [num, p] of Object.entries(dev.crypto.isakmpPolicies || {})) {
          lines.push(`crypto isakmp policy ${num}`);
          lines.push(` encryption ${p.encryption}`);
          lines.push(` hash ${p.hash}`);
          lines.push(` authentication ${p.authentication}`);
          lines.push(` group ${p.group}`);
          lines.push(` lifetime ${p.lifetime}`);
          lines.push(` exit`);
        }
        for (const [name, ts] of Object.entries(dev.crypto.transformSets || {})) {
          lines.push(`crypto ipsec transform-set ${name} ${ts.transform1}${ts.transform2 ? ' ' + ts.transform2 : ''}`);
        }
        for (const [mapName, seqs] of Object.entries(dev.crypto.cryptoMaps || {})) {
          for (const [seq, entry] of Object.entries(seqs)) {
            lines.push(`crypto map ${mapName} ${seq} ipsec-isakmp`);
            if (entry.peer) lines.push(` set peer ${entry.peer}`);
            if (entry.transformSet) lines.push(` set transform-set ${entry.transformSet}`);
            if (entry.matchACL) lines.push(` match address ${entry.matchACL}`);
            lines.push(` exit`);
          }
        }
      }
    }

    // DHCP configuration
    if (dev.dhcp) {
      const hasDhcp = Object.keys(dev.dhcp.pools).length > 0 || dev.dhcp.excludedAddresses.length > 0;
      if (hasDhcp) {
        lines.push('!');
        for (const excl of dev.dhcp.excludedAddresses) {
          lines.push(`ip dhcp excluded-address ${excl.start}${excl.end !== excl.start ? ' ' + excl.end : ''}`);
        }
        for (const [name, pool] of Object.entries(dev.dhcp.pools)) {
          lines.push(`ip dhcp pool ${name}`);
          if (pool.network) lines.push(` network ${pool.network} ${pool.mask}`);
          if (pool.defaultRouter) lines.push(` default-router ${pool.defaultRouter}`);
          if (pool.dnsServer) lines.push(` dns-server ${pool.dnsServer}`);
          if (pool.lease !== undefined && pool.lease !== 1) lines.push(` lease ${pool.lease === 0 ? 'infinite' : pool.lease}`);
          lines.push(` exit`);
        }
      }
    }

    // Interfaces
    lines.push('!');
    for (const [name, iface] of Object.entries(dev.interfaces)) {
      lines.push(`interface ${name}`);
      if (iface.description) lines.push(` description ${iface.description}`);
      if (iface.dhcpClient) lines.push(` ip address dhcp`);
      else if (iface.ip) lines.push(` ip address ${iface.ip} ${iface.mask}`);
      if (iface.tunnel) {
        if (iface.tunnel.source) lines.push(` tunnel source ${iface.tunnel.source}`);
        if (iface.tunnel.destination) lines.push(` tunnel destination ${iface.tunnel.destination}`);
        if (iface.tunnel.mode) lines.push(` tunnel mode ${iface.tunnel.mode}`);
      }
      if (iface.cryptoMap) lines.push(` crypto map ${iface.cryptoMap}`);
      if (iface.switchport) {
        const sp = iface.switchport;
        if (sp.mode === 'trunk') {
          lines.push(` switchport mode trunk`);
          if (sp.trunkAllowed !== 'all') lines.push(` switchport trunk allowed vlan ${sp.trunkAllowed.join(',')}`);
        } else {
          lines.push(` switchport mode access`);
          if (sp.accessVlan !== 1) lines.push(` switchport access vlan ${sp.accessVlan}`);
        }
      }
      if (iface.bondGroup) lines.push(` bond-group ${iface.bondGroup}`);
      if (iface.natRole) lines.push(` ip nat ${iface.natRole}`);
      if (iface.accessGroup) {
        if (iface.accessGroup.in) lines.push(` ip access-group ${iface.accessGroup.in} in`);
        if (iface.accessGroup.out) lines.push(` ip access-group ${iface.accessGroup.out} out`);
      }
      if (iface.status === 'up') lines.push(` no shutdown`);
      else lines.push(` shutdown`);
      lines.push(` exit`);
    }

    // Firewall policies
    if (dev.policies && dev.policies.length > 0) {
      lines.push('!');
      for (const p of [...dev.policies].sort((a, b) => a.seq - b.seq)) {
        const srcStr = p.src === 'any' ? 'any' : `${p.src} ${p.srcWildcard}`;
        const dstStr = p.dst === 'any' ? 'any' : `${p.dst} ${p.dstWildcard}`;
        lines.push(`firewall policy ${p.seq} ${p.action} ${srcStr} ${dstStr} ${p.protocol}${p.port ? ' ' + p.port : ''}`);
      }
    }

    // Static routes
    if (dev.routes && dev.routes.length > 0) {
      lines.push('!');
      for (const r of dev.routes) {
        lines.push(`ip route ${r.network} ${r.mask} ${r.nextHop}`);
      }
    }

    // OSPF
    if (dev.ospf && Object.keys(dev.ospf.processes).length > 0) {
      lines.push('!');
      // router-id is device-level in the data model — emit under the first process only
      let routerIdEmitted = false;
      for (const [pid, proc] of Object.entries(dev.ospf.processes)) {
        lines.push(`router ospf ${pid}`);
        if (dev.ospf.routerId && !routerIdEmitted) {
          lines.push(` router-id ${dev.ospf.routerId}`);
          routerIdEmitted = true;
        }
        for (const n of proc.networks) {
          lines.push(` network ${n.ip} ${n.wildcard} area ${n.area}`);
        }
        lines.push(` exit`);
      }
    }

    // Default gateway (PC/Server)
    if ((dev.type === 'pc' || dev.type === 'server') && dev.defaultGateway) {
      lines.push(`ip default-gateway ${dev.defaultGateway}`);
    }

    lines.push('end');
    lines.push('!');
  }

  lines.push('');
  lines.push('! ============================================================');
  lines.push('! End of configuration script');
  lines.push('! ============================================================');

  return lines.join('\n');
}

// ─── YAMAHA format export (RTX1220 / SWX2310 / UTX200) ───

import { maskToCIDR, getNetwork } from '../simulation/NetworkUtils.js';

function wildcardToMask(wildcard) {
  return wildcard.split('.').map(o => 255 - parseInt(o)).join('.');
}

function yamahaIfName(ciscoName, dev, ifIndex) {
  if (dev.type === 'router') {
    // RTX1220: lan1, lan2, ... (physical), wan1 for WAN-side
    if (ciscoName.startsWith('Tunnel')) return 'tunnel' + ciscoName.slice(6);
    return 'lan' + (ifIndex + 1);
  }
  if (dev.type === 'switch') {
    // SWX2310: port1.1, port1.2, ... for physical ports
    const m = ciscoName.match(/(\d+)\/(\d+)$/);
    if (m) return 'port1.' + m[2];
    if (ciscoName.startsWith('Vlan')) return 'vlan' + ciscoName.slice(4);
    return ciscoName.toLowerCase();
  }
  // firewall (UTX200) / pc / server — keep as-is for reference
  return ciscoName;
}

function exportYamahaRouter(id, dev, lines) {
  const ifNames = Object.keys(dev.interfaces).filter(n => !n.startsWith('Tunnel'));

  lines.push(`# Hostname`);
  lines.push(`console prompt ${dev.hostname}`);

  // IP addresses on LAN interfaces
  lines.push(`#`);
  lines.push(`# Interface IP addresses`);
  ifNames.forEach((name, i) => {
    const iface = dev.interfaces[name];
    const yName = 'lan' + (i + 1);
    if (iface.ip) {
      const cidr = maskToCIDR(iface.mask);
      lines.push(`ip ${yName} address ${iface.ip}/${cidr}`);
    }
    if (iface.description) lines.push(`description ${yName} ${iface.description}`);
  });

  // DHCP
  if (dev.dhcp && Object.keys(dev.dhcp.pools).length > 0) {
    lines.push(`#`);
    lines.push(`# DHCP`);
    lines.push(`dhcp service server`);
    let scopeNum = 1;
    for (const [poolName, pool] of Object.entries(dev.dhcp.pools)) {
      if (!pool.network || !pool.mask) continue;
      const cidr = maskToCIDR(pool.mask);
      // Calculate range: network+1 to broadcast-1, respecting exclusions
      const excl = dev.dhcp.excludedAddresses || [];
      // Find the LAN interface index for this pool's network
      let lanNum = 1;
      ifNames.forEach((name, i) => {
        const iface = dev.interfaces[name];
        if (iface.ip && getNetwork(iface.ip, pool.mask) === pool.network) lanNum = i + 1;
      });
      lines.push(`dhcp scope ${scopeNum} ${pool.network}/${cidr}`);
      if (pool.defaultRouter) lines.push(`dhcp scope option ${scopeNum} router=${pool.defaultRouter}`);
      if (pool.dnsServer) lines.push(`dhcp scope option ${scopeNum} dns=${pool.dnsServer}`);
      if (pool.lease !== undefined) {
        lines.push(`dhcp scope lease type ${scopeNum} ${pool.lease === 0 ? 'infinity' : 'dhcp ' + (pool.lease * 24 * 60)}`);
      }
      lines.push(`dhcp scope bind ${scopeNum} lan${lanNum}`);
      for (const ex of excl) {
        lines.push(`dhcp scope except ${scopeNum} ${ex.start}${ex.end !== ex.start ? '-' + ex.end : ''}`);
      }
      lines.push(`# scope ${scopeNum} = Cisco pool "${poolName}"`);
      scopeNum++;
    }
  }

  // NAT (nat descriptor masquerade)
  if (dev.nat) {
    const hasNat = Object.keys(dev.nat.pools).length > 0 || dev.nat.staticEntries.length > 0 || dev.nat.dynamicRules.length > 0;
    if (hasNat) {
      lines.push(`#`);
      lines.push(`# NAT`);
      let descNum = 1;
      // Find outside interface
      let outsideLan = null;
      ifNames.forEach((name, i) => {
        if (dev.interfaces[name].natRole === 'outside') outsideLan = 'lan' + (i + 1);
      });
      if (dev.nat.dynamicRules.length > 0) {
        lines.push(`nat descriptor type ${descNum} masquerade`);
        if (outsideLan) lines.push(`${outsideLan} nat descriptor ${descNum}`);
        descNum++;
      }
      for (const e of dev.nat.staticEntries) {
        lines.push(`nat descriptor type ${descNum} static`);
        lines.push(`nat descriptor address outer ${descNum} ${e.insideGlobal}`);
        lines.push(`nat descriptor address inner ${descNum} ${e.insideLocal}`);
        if (outsideLan) lines.push(`${outsideLan} nat descriptor ${descNum}`);
        descNum++;
      }
    }
  }

  // ACLs → ip filter
  if (dev.accessLists && Object.keys(dev.accessLists).length > 0) {
    lines.push(`#`);
    lines.push(`# IP Filter (ACL)`);
    for (const [num, entries] of Object.entries(dev.accessLists)) {
      for (const entry of entries) {
        const action = entry.action === 'permit' ? 'pass' : 'reject';
        if (entry.protocol) {
          const src = entry.src === 'any' ? '*' : entry.src + '/' + maskToCIDR(wildcardToMask(entry.srcWildcard));
          const dst = entry.dst === 'any' ? '*' : entry.dst + '/' + maskToCIDR(wildcardToMask(entry.dstWildcard));
          const proto = entry.protocol === 'ip' ? '*' : entry.protocol;
          const port = entry.port ? ` ${entry.port}` : ' *';
          lines.push(`ip filter ${num} ${action} ${src} ${dst} ${proto}${port}`);
        } else {
          const src = entry.network + '/' + maskToCIDR(wildcardToMask(entry.wildcard));
          lines.push(`ip filter ${num} ${action} ${src} * *`);
        }
      }
    }
    // Apply filters to interfaces
    for (const [name, iface] of Object.entries(dev.interfaces)) {
      const idx = ifNames.indexOf(name);
      if (idx < 0) continue;
      const yName = 'lan' + (idx + 1);
      if (iface.accessGroup) {
        if (iface.accessGroup.in) lines.push(`ip ${yName} secure filter in ${iface.accessGroup.in}`);
        if (iface.accessGroup.out) lines.push(`ip ${yName} secure filter out ${iface.accessGroup.out}`);
      }
    }
  }

  // VPN / Tunnel
  const tunnelIfs = Object.entries(dev.interfaces).filter(([n]) => n.startsWith('Tunnel'));
  if (tunnelIfs.length > 0) {
    lines.push(`#`);
    lines.push(`# VPN / Tunnel`);
    // Resolve encryption/hash from ISAKMP policy or transform-set
    let ikeEncryption = 'aes-cbc';
    let ikeHash = 'sha-hmac';
    if (dev.crypto) {
      const tsNames = Object.values(dev.crypto.transformSets || {});
      if (tsNames.length > 0) {
        const ts = tsNames[0];
        if (ts.transform1) ikeEncryption = ts.transform1.replace('esp-', '');
        if (ts.transform2) ikeHash = ts.transform2.replace('esp-', '');
      }
    }
    // ISAKMP per-tunnel settings (output before tunnel select)
    for (let ti = 0; ti < tunnelIfs.length; ti++) {
      const tunNum = ti + 1; // RTX uses 1-based tunnel numbers
      const [, iface] = tunnelIfs[ti];
      if (!iface.ip || !iface.tunnel) continue;
      const policyEntries = Object.entries(dev.crypto?.isakmpPolicies || {});
      if (policyEntries.length > 0) {
        const [, p] = policyEntries[0];
        lines.push(`ipsec ike encryption ${tunNum} ${p.encryption}`);
        lines.push(`ipsec ike hash ${tunNum} ${p.hash}`);
        lines.push(`ipsec ike group ${tunNum} modp${p.group === 14 ? '2048' : p.group === 5 ? '1536' : '1024'}`);
        if (iface.tunnel.destination) {
          lines.push(`ipsec ike remote address ${tunNum} ${iface.tunnel.destination}`);
        }
        lines.push(`ipsec ike pre-shared-key ${tunNum} text <PRE-SHARED-KEY>`);
      }
    }
    // Tunnel interface configuration
    for (let ti = 0; ti < tunnelIfs.length; ti++) {
      const tunNum = ti + 1;
      const [, iface] = tunnelIfs[ti];
      if (!iface.ip) continue;
      const cidr = maskToCIDR(iface.mask);
      lines.push(`tunnel select ${tunNum}`);
      lines.push(` ipsec tunnel ${tunNum}`);
      lines.push(`  ipsec sa policy ${tunNum} ${tunNum} esp ${ikeEncryption} ${ikeHash}`);
      lines.push(` ip tunnel address ${iface.ip}/${cidr}`);
      if (iface.description) lines.push(` description tunnel ${tunNum} ${iface.description}`);
      lines.push(` tunnel enable ${tunNum}`);
    }
  }

  // Static routes
  if (dev.routes && dev.routes.length > 0) {
    lines.push(`#`);
    lines.push(`# Static routes`);
    for (const r of dev.routes) {
      const cidr = maskToCIDR(r.mask);
      if (r.network === '0.0.0.0' && r.mask === '0.0.0.0') {
        lines.push(`ip route default gateway ${r.nextHop}`);
      } else {
        lines.push(`ip route ${r.network}/${cidr} gateway ${r.nextHop}`);
      }
    }
  }

  lines.push(`#`);
  lines.push(`save`);
}

function exportYamahaSwitch(id, dev, lines) {
  // SWX2310: Cisco-like syntax with minor differences
  lines.push(`hostname "${dev.hostname}"`);

  // VLANs
  if (dev.vlans) {
    for (const [vid, vlan] of Object.entries(dev.vlans)) {
      if (parseInt(vid) === 1) continue;
      lines.push(`vlan database`);
      lines.push(` vlan ${vid} name ${vlan.name} state enable`);
      lines.push(` exit`);
    }
  }

  // Interfaces
  lines.push(`!`);
  for (const [name, iface] of Object.entries(dev.interfaces)) {
    if (name.startsWith('Vlan')) {
      // SVI
      lines.push(`interface vlan${name.slice(4)}`);
      if (iface.ip) lines.push(` ip address ${iface.ip}/${maskToCIDR(iface.mask)}`);
      if (iface.description) lines.push(` description ${iface.description}`);
      lines.push(` exit`);
      continue;
    }
    const m = name.match(/(\d+)\/(\d+)$/);
    const yName = m ? `port1.${m[2]}` : name;
    lines.push(`interface ${yName}`);
    if (iface.description) lines.push(` description ${iface.description}`);
    if (iface.switchport) {
      const sp = iface.switchport;
      if (sp.mode === 'trunk') {
        lines.push(` switchport mode trunk`);
        if (sp.trunkAllowed !== 'all') lines.push(` switchport trunk allowed vlan add ${sp.trunkAllowed.join(',')}`);
      } else {
        lines.push(` switchport mode access`);
        if (sp.accessVlan !== 1) lines.push(` switchport access vlan ${sp.accessVlan}`);
      }
    }
    if (iface.status === 'down') lines.push(` shutdown`);
    lines.push(` exit`);
  }

  // Static routes (L3 switch with SVIs)
  if (dev.routes && dev.routes.length > 0) {
    lines.push(`!`);
    for (const r of dev.routes) {
      const cidr = maskToCIDR(r.mask);
      lines.push(`ip route ${r.network}/${cidr} ${r.nextHop}`);
    }
  }

  lines.push(`!`);
  lines.push(`write memory`);
}

function exportYamahaFirewall(id, dev, lines) {
  // UTX200: Web GUI managed — output as configuration reference
  lines.push(`# UTX200 is managed via Web GUI.`);
  lines.push(`# Below is a configuration reference for manual setup.`);
  lines.push(`#`);
  lines.push(`# Hostname: ${dev.hostname}`);

  // Interfaces
  lines.push(`#`);
  lines.push(`# --- Interfaces ---`);
  const ifNames = Object.keys(dev.interfaces).filter(n => !n.startsWith('Tunnel'));
  ifNames.forEach((name, i) => {
    const iface = dev.interfaces[name];
    if (iface.ip) {
      lines.push(`# Interface ${i + 1}: ${iface.ip}/${maskToCIDR(iface.mask)}${iface.description ? '  (' + iface.description + ')' : ''}`);
    }
  });

  // Firewall policies
  if (dev.policies && dev.policies.length > 0) {
    lines.push(`#`);
    lines.push(`# --- Firewall Policies ---`);
    lines.push(`# Seq    Action  Source               Destination          Protocol  Port`);
    for (const p of [...dev.policies].sort((a, b) => a.seq - b.seq)) {
      const srcStr = p.src === 'any' ? 'Any' : `${p.src}/${maskToCIDR(wildcardToMask(p.srcWildcard))}`;
      const dstStr = p.dst === 'any' ? 'Any' : `${p.dst}/${maskToCIDR(wildcardToMask(p.dstWildcard))}`;
      const act = p.action === 'permit' ? 'Accept' : 'Drop';
      lines.push(`# ${String(p.seq).padEnd(7)}${act.padEnd(8)}${srcStr.padEnd(21)}${dstStr.padEnd(21)}${p.protocol.padEnd(10)}${p.port || 'Any'}`);
    }
    lines.push(`# (implicit Drop All at end)`);
  }

  // NAT
  if (dev.nat) {
    const hasNat = dev.nat.staticEntries.length > 0 || dev.nat.dynamicRules.length > 0;
    if (hasNat) {
      lines.push(`#`);
      lines.push(`# --- NAT Rules ---`);
      for (const e of dev.nat.staticEntries) {
        lines.push(`# Static NAT: ${e.insideLocal} -> ${e.insideGlobal}`);
      }
      if (dev.nat.dynamicRules.length > 0) lines.push(`# Hide NAT (masquerade) enabled`);
    }
  }

  // Static routes
  if (dev.routes && dev.routes.length > 0) {
    lines.push(`#`);
    lines.push(`# --- Static Routes ---`);
    for (const r of dev.routes) {
      const cidr = maskToCIDR(r.mask);
      lines.push(`# ${r.network}/${cidr} -> ${r.nextHop}`);
    }
  }
}

function exportYamahaPcServer(id, dev, lines) {
  lines.push(`# ${dev.type.toUpperCase()}: ${dev.hostname}`);
  for (const [name, iface] of Object.entries(dev.interfaces)) {
    if (iface.dhcpClient) {
      lines.push(`# ${name}: DHCP client (auto-assigned${iface.ip ? ': ' + iface.ip : ''})`);
    } else if (iface.ip) {
      lines.push(`# ${name}: ${iface.ip}/${maskToCIDR(iface.mask)}`);
    }
  }
  if (dev.defaultGateway) lines.push(`# Default Gateway: ${dev.defaultGateway}`);
}

export function exportYamahaScript(store) {
  const devices = store.getDevices();
  const lines = [];
  const modelMap = { router: 'RTX1220', switch: 'SWX2310', firewall: 'UTX200' };

  lines.push('#');
  lines.push('# ============================================================');
  lines.push('# Network Simulator — YAMAHA Device Configuration');
  lines.push(`# Generated: ${new Date().toLocaleString('ja-JP')}`);
  lines.push(`# Devices: ${Object.keys(devices).length}`);
  lines.push('# ============================================================');

  for (const [id, dev] of Object.entries(devices)) {
    lines.push('');
    lines.push('# ────────────────────────────────────────');
    lines.push(`# Device: ${dev.hostname} (${modelMap[dev.type] || dev.type.toUpperCase()}) [${id}]`);
    lines.push('# ────────────────────────────────────────');
    lines.push('');

    if (dev.type === 'router') exportYamahaRouter(id, dev, lines);
    else if (dev.type === 'switch') exportYamahaSwitch(id, dev, lines);
    else if (dev.type === 'firewall') exportYamahaFirewall(id, dev, lines);
    else exportYamahaPcServer(id, dev, lines);
  }

  lines.push('');
  lines.push('# ============================================================');
  lines.push('# End of YAMAHA configuration');
  lines.push('# ============================================================');

  return lines.join('\n');
}

export function downloadYamahaScript(store) {
  const script = exportYamahaScript(store);
  const blob = new Blob([script], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.download = `yamaha-commands-${ts}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCommandScript(store) {
  const script = exportCommandScript(store);
  const blob = new Blob([script], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.download = `netsim-commands-${ts}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
