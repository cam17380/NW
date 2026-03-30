// ─── Show commands ───
import { shortIfName } from '../../simulation/NetworkUtils.js';
import { maskToCIDR, getNetwork } from '../../simulation/NetworkUtils.js';

export function execShow(input, parts, store, termWrite, execPing) {
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

  if (lower === 'show ip route') {
    if (dev.type === 'switch') { termWrite('% Routing table is not available on switches', 'error-line'); return; }
    termWrite('Codes: C - connected, S - static, * - candidate default\n');
    termWrite('Gateway of last resort is ' +
      (dev.type === 'pc' ? (dev.defaultGateway || 'not set') :
       (dev.routes.find(r => r.network === '0.0.0.0') ? dev.routes.find(r => r.network === '0.0.0.0').nextHop : 'not set'))
    );
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

    if (dev.type === 'pc' && dev.defaultGateway) {
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
      if (iface.status === 'down') termWrite(' shutdown');
      else termWrite(' no shutdown');
      termWrite('!');
    }
    if (dev.routes && dev.routes.length > 0) {
      for (const r of dev.routes) {
        termWrite(`ip route ${r.network} ${r.mask} ${r.nextHop}`);
      }
      termWrite('!');
    }
    if (dev.type === 'pc' && dev.defaultGateway) {
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
      termWrite('');
    }
    return;
  }

  if (parts[0].toLowerCase() === 'ping') {
    if (parts.length < 2) { termWrite('% Incomplete command — usage: ping <ip>', 'error-line'); return; }
    execPing(parts[1]);
    return;
  }
  termWrite(`% Unknown show command`, 'error-line');
}
