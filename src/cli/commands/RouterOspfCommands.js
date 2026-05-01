// ─── config-router (OSPF) mode commands ───
import { isValidIP } from '../../simulation/NetworkUtils.js';
import { recomputeAllOspf } from '../../simulation/OspfEngine.js';

export function execConfigRouter(input, parts, cmd, store, termWrite) {
  const dev = store.getCurrentDevice();
  const pid = store.currentOspfPid;
  if (!dev.ospf || !dev.ospf.processes[pid]) {
    termWrite('% OSPF process not found', 'error-line');
    return;
  }
  const proc = dev.ospf.processes[pid];
  const lower = input.toLowerCase();

  if (cmd === 'exit') { store.setCLIMode('config'); return; }
  if (cmd === 'end') { store.setCLIMode('privileged'); return; }

  // router-id <ip>
  if (lower.startsWith('router-id ')) {
    const ip = parts[1];
    if (!isValidIP(ip)) { termWrite('% Invalid IP address', 'error-line'); return; }
    dev.ospf.routerId = ip;
    termWrite(`% OSPF router-id set to ${ip}`, 'success-line');
    recomputeAllOspf(store.getDevices());
    return;
  }

  // no router-id
  if (lower === 'no router-id') {
    dev.ospf.routerId = null;
    termWrite('% OSPF router-id cleared', 'success-line');
    recomputeAllOspf(store.getDevices());
    return;
  }

  // network <ip> <wildcard> area <area-id>
  if (lower.startsWith('network ')) {
    const args = input.split(/\s+/);
    if (args.length < 5 || args[3].toLowerCase() !== 'area') {
      termWrite('% Usage: network <ip> <wildcard> area <area-id>', 'error-line'); return;
    }
    const [, ip, wildcard, , area] = args;
    if (!isValidIP(ip) || !isValidIP(wildcard)) {
      termWrite('% Invalid IP or wildcard address', 'error-line'); return;
    }
    const dup = proc.networks.find(n => n.ip === ip && n.wildcard === wildcard);
    if (dup) { termWrite('% Network statement already exists', 'error-line'); return; }
    proc.networks.push({ ip, wildcard, area: String(area) });
    termWrite(`% OSPF network ${ip} ${wildcard} area ${area} added`, 'success-line');
    recomputeAllOspf(store.getDevices());
    return;
  }

  // no network <ip> <wildcard> area <area-id>
  if (lower.startsWith('no network ')) {
    const args = input.split(/\s+/);
    if (args.length < 6) { termWrite('% Usage: no network <ip> <wildcard> area <area-id>', 'error-line'); return; }
    const [, , ip, wildcard] = args;
    const idx = proc.networks.findIndex(n => n.ip === ip && n.wildcard === wildcard);
    if (idx < 0) { termWrite('% Network statement not found', 'error-line'); return; }
    proc.networks.splice(idx, 1);
    termWrite(`% OSPF network ${ip} ${wildcard} removed`, 'success-line');
    recomputeAllOspf(store.getDevices());
    return;
  }

  termWrite(`% Unknown command "${parts[0]}" in router-config mode`, 'error-line');
}
