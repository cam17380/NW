// ─── Routing and L2 reachability logic (pure functions) ───
import { getNetwork, maskToCIDR } from './NetworkUtils.js';

export function canReach(devices, fromId, targetIP) {
  const visited = new Set();
  return forwardPacket(devices, fromId, targetIP, visited);
}

export function forwardPacket(devices, devId, targetIP, visited) {
  if (visited.has(devId)) return false;
  visited.add(devId);

  const dv = devices[devId];

  // 1. Check if target is directly on this device
  for (const iface of Object.values(dv.interfaces)) {
    if (iface.ip === targetIP && iface.status === 'up') return true;
  }

  // 2. Check if target is on a directly connected network
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!iface.ip || iface.status !== 'up' || !iface.connected) continue;
    const net = getNetwork(iface.ip, iface.mask);
    const targetNet = getNetwork(targetIP, iface.mask);
    if (net === targetNet) {
      return canReachL2(devices, devId, ifName, targetIP);
    }
  }

  // 3. Look up routing table for next hop
  const nextHop = lookupRoute(dv, targetIP);
  if (!nextHop) return false;

  // 4. Find which interface can reach the next hop
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!iface.ip || iface.status !== 'up' || !iface.connected) continue;
    const net = getNetwork(iface.ip, iface.mask);
    const hopNet = getNetwork(nextHop, iface.mask);
    if (net === hopNet) {
      const nextDevId = findDeviceByIP(devices, nextHop);
      if (!nextDevId) return false;
      if (!canReachL2(devices, devId, ifName, nextHop)) return false;
      return forwardPacket(devices, nextDevId, targetIP, visited);
    }
  }
  return false;
}

export function lookupRoute(dv, targetIP) {
  if (dv.type === 'pc') {
    return dv.defaultGateway || null;
  }
  if (!dv.routes || dv.routes.length === 0) return null;

  let bestRoute = null;
  let bestCIDR = -1;
  for (const r of dv.routes) {
    const routeNet = getNetwork(r.network, r.mask);
    const targetNet = getNetwork(targetIP, r.mask);
    if (routeNet === targetNet) {
      const cidr = maskToCIDR(r.mask);
      if (cidr > bestCIDR) {
        bestCIDR = cidr;
        bestRoute = r;
      }
    }
  }
  return bestRoute ? bestRoute.nextHop : null;
}

export function findDeviceByIP(devices, ip) {
  for (const [did, dv] of Object.entries(devices)) {
    for (const iface of Object.values(dv.interfaces)) {
      if (iface.ip === ip && iface.status === 'up') return did;
    }
  }
  return null;
}

export function canReachL2(devices, srcDevId, srcIfName, targetIP) {
  const srcDev = devices[srcDevId];
  const srcIf = srcDev.interfaces[srcIfName];
  if (!srcIf || !srcIf.connected) return false;

  const remote = srcIf.connected;
  const remoteDev = devices[remote.device];
  const remoteIf = remoteDev.interfaces[remote.iface];
  if (!remoteIf || remoteIf.status !== 'up') return false;

  if (remoteDev.type !== 'switch') {
    for (const iface of Object.values(remoteDev.interfaces)) {
      if (iface.ip === targetIP && iface.status === 'up') return true;
    }
    return false;
  }

  // Entering a switch — determine VLAN
  let vlan = 1;
  if (remoteIf.switchport) {
    if (remoteIf.switchport.mode === 'access') vlan = remoteIf.switchport.accessVlan;
  }

  // BFS through switches
  const visited = new Set();
  const queue = [remote.device];
  visited.add(remote.device);

  while (queue.length > 0) {
    const curId = queue.shift();
    const curDev = devices[curId];

    for (const [ifName, iface] of Object.entries(curDev.interfaces)) {
      if (iface.status !== 'up' || !iface.connected) continue;
      if (!iface.switchport) continue;

      let carriesVlan = false;
      if (iface.switchport.mode === 'access' && iface.switchport.accessVlan === vlan) carriesVlan = true;
      if (iface.switchport.mode === 'trunk') {
        const allowed = iface.switchport.trunkAllowed;
        if (allowed === 'all') carriesVlan = true;
        else if (Array.isArray(allowed) && allowed.includes(vlan)) carriesVlan = true;
      }
      if (!carriesVlan) continue;

      const rDev = devices[iface.connected.device];
      const rIf = rDev.interfaces[iface.connected.iface];
      if (!rIf || rIf.status !== 'up') continue;

      if (rDev.type === 'switch') {
        if (!visited.has(iface.connected.device)) {
          visited.add(iface.connected.device);
          queue.push(iface.connected.device);
        }
      } else {
        for (const endIf of Object.values(rDev.interfaces)) {
          if (endIf.ip === targetIP && endIf.status === 'up') return true;
        }
      }
    }
  }
  return false;
}
