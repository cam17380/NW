// ─── Ping path building and execution ───
import { getNetwork } from './NetworkUtils.js';
import { canReach, lookupRoute, findDeviceByIP } from './Routing.js';

export function execPing(targetIP, store, terminal, animatePing) {
  const devices = store.getDevices();
  const currentDeviceId = store.getCurrentDeviceId();
  const d = store.getCurrentDevice();

  let srcIP = null;
  for (const iface of Object.values(d.interfaces)) {
    if (iface.status === 'up' && iface.ip) { srcIP = iface.ip; break; }
  }
  if (!srcIP) {
    terminal.write(`% No source interface available — configure an interface with an IP and bring it up`, 'error-line');
    return;
  }

  const reachable = canReach(devices, currentDeviceId, targetIP);

  terminal.write(`Sending 5, 100-byte ICMP Echos to ${targetIP}, timeout is 2 seconds:`);

  const path = buildPingPath(devices, currentDeviceId, targetIP, reachable);

  if (path.length >= 2) {
    animatePing(path, reachable, () => {
      if (reachable) {
        terminal.write('!!!!!', 'success-line');
        terminal.write(`Success rate is 100 percent (5/5)`, 'success-line');
      } else {
        terminal.write('.....', 'error-line');
        terminal.write(`Success rate is 0 percent (0/5)`, 'error-line');
      }
    });
  } else {
    if (reachable) {
      terminal.write('!!!!!', 'success-line');
      terminal.write(`Success rate is 100 percent (5/5)`, 'success-line');
    } else {
      terminal.write('.....', 'error-line');
      terminal.write(`Success rate is 0 percent (0/5)`, 'error-line');
    }
  }
}

export function buildPingPath(devices, fromId, targetIP, reachable) {
  const path = [fromId];
  const visited = new Set([fromId]);
  let curId = fromId;

  for (let step = 0; step < 20; step++) {
    const dv = devices[curId];

    for (const iface of Object.values(dv.interfaces)) {
      if (iface.ip === targetIP && iface.status === 'up') return path;
    }

    let nextHopIP = null;
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      if (!iface.ip || iface.status !== 'up') continue;
      if (getNetwork(iface.ip, iface.mask) === getNetwork(targetIP, iface.mask)) {
        nextHopIP = targetIP;
        break;
      }
    }

    if (!nextHopIP) {
      nextHopIP = lookupRoute(dv, targetIP);
    }
    if (!nextHopIP) break;

    let exitIf = null;
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      if (!iface.ip || iface.status !== 'up' || !iface.connected) continue;
      if (getNetwork(iface.ip, iface.mask) === getNetwork(nextHopIP, iface.mask)) {
        exitIf = iface;
        break;
      }
    }
    if (!exitIf) break;

    const neighbor = exitIf.connected;
    const neighborDev = devices[neighbor.device];
    if (!neighborDev) break;

    if (neighborDev.type === 'switch') {
      if (!visited.has(neighbor.device)) {
        path.push(neighbor.device);
        visited.add(neighbor.device);
      }

      const targetDevId = findDeviceByIP(devices, nextHopIP);
      if (!targetDevId || visited.has(targetDevId)) break;

      const swPath = bfsSwitchPath(devices, neighbor.device, targetDevId);
      for (const sid of swPath) {
        if (!visited.has(sid)) { path.push(sid); visited.add(sid); }
      }

      path.push(targetDevId);
      visited.add(targetDevId);
      curId = targetDevId;
    } else {
      if (visited.has(neighbor.device)) break;
      path.push(neighbor.device);
      visited.add(neighbor.device);
      curId = neighbor.device;
    }
  }
  return path;
}

function bfsSwitchPath(devices, startSwId, targetDevId) {
  const queue = [{ id: startSwId, path: [] }];
  const visited = new Set([startSwId]);
  while (queue.length > 0) {
    const { id: curId, path: curPath } = queue.shift();
    const sw = devices[curId];
    for (const iface of Object.values(sw.interfaces)) {
      if (iface.status !== 'up' || !iface.connected) continue;
      const connId = iface.connected.device;
      if (connId === targetDevId) return curPath;
      if (visited.has(connId)) continue;
      const connDev = devices[connId];
      if (connDev.type === 'switch') {
        visited.add(connId);
        queue.push({ id: connId, path: [...curPath, connId] });
      }
    }
  }
  return [];
}
