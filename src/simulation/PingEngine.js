// ─── Ping path building and execution ───
import { getNetwork } from './NetworkUtils.js';
import { canReach, lookupRoute, findDeviceByIP, applyNAT } from './Routing.js';

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

  // Apply NAT translations along the path
  if (reachable) {
    applyNATAlongPath(devices, currentDeviceId, srcIP, targetIP);
  }

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
  let curTargetIP = targetIP;
  let curSrcIP = null;

  // Get source IP
  const srcDev = devices[fromId];
  for (const iface of Object.values(srcDev.interfaces)) {
    if (iface.status === 'up' && iface.ip) { curSrcIP = iface.ip; break; }
  }

  for (let step = 0; step < 20; step++) {
    const dv = devices[curId];

    for (const iface of Object.values(dv.interfaces)) {
      if (iface.ip === curTargetIP && iface.status === 'up') return path;
    }

    // Apply NAT at routers — update curTargetIP for subsequent path decisions
    if (dv.type === 'router' && dv.nat && step > 0) {
      // Find ingress interface by tracing which interface connects to the previous device
      const prevDevId = path[path.length - 2] || null;
      let ingressIfName = null;
      if (prevDevId) {
        for (const [ifName, iface] of Object.entries(dv.interfaces)) {
          if (!iface.connected || iface.status !== 'up') continue;
          if (iface.connected.device === prevDevId) { ingressIfName = ifName; break; }
          // Check if previous device is behind a switch
          const connDev = devices[iface.connected.device];
          if (connDev && connDev.type === 'switch') {
            const swVisited = new Set([iface.connected.device]);
            const queue = [iface.connected.device];
            while (queue.length > 0) {
              const swId = queue.shift();
              const sw = devices[swId];
              for (const swIf of Object.values(sw.interfaces)) {
                if (!swIf.connected || swIf.status !== 'up') continue;
                if (swIf.connected.device === prevDevId) { ingressIfName = ifName; break; }
                const cd = devices[swIf.connected.device];
                if (cd && cd.type === 'switch' && !swVisited.has(swIf.connected.device)) {
                  swVisited.add(swIf.connected.device);
                  queue.push(swIf.connected.device);
                }
              }
              if (ingressIfName) break;
            }
          }
          if (ingressIfName) break;
        }
      }
      if (ingressIfName) {
        const natResult = applyNAT(dv, curSrcIP, curTargetIP, ingressIfName);
        curSrcIP = natResult.srcIP;
        curTargetIP = natResult.dstIP;
        // Re-check: did NAT resolve to a local address on this device?
        for (const iface of Object.values(dv.interfaces)) {
          if (iface.ip === curTargetIP && iface.status === 'up') return path;
        }
      }
    }

    // Check routing table first (specific route like /32 takes priority over connected /24)
    let nextHopIP = lookupRoute(dv, curTargetIP);

    // If no explicit route, check directly connected networks
    if (!nextHopIP) {
      for (const [ifName, iface] of Object.entries(dv.interfaces)) {
        if (!iface.ip || iface.status !== 'up') continue;
        if (getNetwork(iface.ip, iface.mask) === getNetwork(curTargetIP, iface.mask)) {
          nextHopIP = curTargetIP;
          break;
        }
      }
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
      // Always add switch to path (switches are L2 transit points, can appear multiple times)
      path.push(neighbor.device);
      visited.add(neighbor.device);

      const targetDevId = findDeviceByIP(devices, nextHopIP);
      if (!targetDevId || visited.has(targetDevId)) break;

      const swPath = bfsSwitchPath(devices, neighbor.device, targetDevId);
      for (const sid of swPath) {
        path.push(sid);
        visited.add(sid);
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

// Walk the forwarding path and apply NAT at each router hop
function applyNATAlongPath(devices, fromId, srcIP, dstIP) {
  const visited = new Set();
  let curId = fromId;
  let curSrcIP = srcIP;
  let curDstIP = dstIP;

  for (let step = 0; step < 20; step++) {
    if (visited.has(curId)) break;
    visited.add(curId);
    const dv = devices[curId];

    // Check if target reached
    for (const iface of Object.values(dv.interfaces)) {
      if (iface.ip === curDstIP && iface.status === 'up') return;
    }

    // Determine ingress interface (for NAT direction detection)
    if (dv.type === 'router' && dv.nat) {
      // Find which interface the packet arrives on (from previous hop)
      let ingressIfName = null;
      if (step === 0) {
        // First hop: find interface toward the destination's subnet or next hop
        for (const [ifName, iface] of Object.entries(dv.interfaces)) {
          if (!iface.ip || iface.status !== 'up') continue;
          if (getNetwork(iface.ip, iface.mask) === getNetwork(curDstIP, iface.mask)) {
            ingressIfName = ifName; break;
          }
        }
      }
      // For intermediate hops, find the interface connected to previous device
      // We approximate by checking all inside interfaces
      if (!ingressIfName) {
        for (const [ifName, iface] of Object.entries(dv.interfaces)) {
          if (iface.natRole === 'inside' && iface.status === 'up') {
            ingressIfName = ifName; break;
          }
        }
      }
      if (ingressIfName) {
        const result = applyNAT(dv, curSrcIP, curDstIP, ingressIfName);
        curSrcIP = result.srcIP;
        curDstIP = result.dstIP;
      }
    }

    // Find next hop — routing table first (specific route takes priority)
    let nextHopIP = lookupRoute(dv, curDstIP);
    if (!nextHopIP) {
      for (const [ifName, iface] of Object.entries(dv.interfaces)) {
        if (!iface.ip || iface.status !== 'up') continue;
        if (getNetwork(iface.ip, iface.mask) === getNetwork(curDstIP, iface.mask)) {
          nextHopIP = curDstIP; break;
        }
      }
    }
    if (!nextHopIP) break;

    const nextDevId = findDeviceByIP(devices, nextHopIP);
    if (!nextDevId) break;

    // Skip through switches to find the actual L3 device
    const nextDev = devices[nextDevId];
    if (nextDev.type === 'switch') {
      // Find the endpoint device behind this switch
      const endDevId = findDeviceByIP(devices, curDstIP);
      if (endDevId) curId = endDevId;
      else break;
    } else {
      curId = nextDevId;
    }
  }
}
