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

    // Interfaces
    lines.push('!');
    for (const [name, iface] of Object.entries(dev.interfaces)) {
      lines.push(`interface ${name}`);
      if (iface.description) lines.push(` description ${iface.description}`);
      if (iface.ip) lines.push(` ip address ${iface.ip} ${iface.mask}`);
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
