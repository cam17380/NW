// ─── Routing, L2 reachability, and NAT logic (pure functions) ───
import { getNetwork, maskToCIDR, ipToInt, intToIP } from './NetworkUtils.js';

// VLAN-aware: find which interface on device connects to prevDevId (directly or via switch)
function findIngressIf(devices, dv, prevDevId) {
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!iface.connected || iface.status !== 'up') continue;
    if (iface.connected.device === prevDevId) return ifName;
    const connDev = devices[iface.connected.device];
    if (connDev && connDev.type === 'switch') {
      // Determine VLAN from the switch entry port
      const swIf = connDev.interfaces[iface.connected.iface];
      const vlan = swIf && swIf.switchport && swIf.switchport.mode === 'access' ? swIf.switchport.accessVlan : null;
      // BFS through switch with VLAN awareness
      const visited = new Set([iface.connected.device]);
      const queue = [iface.connected.device];
      let found = false;
      while (queue.length > 0) {
        const swId = queue.shift();
        const sw = devices[swId];
        for (const swPort of Object.values(sw.interfaces)) {
          if (!swPort.connected || swPort.status !== 'up') continue;
          if (vlan != null && swPort.switchport) {
            if (swPort.switchport.mode === 'access' && swPort.switchport.accessVlan !== vlan) continue;
            if (swPort.switchport.mode === 'trunk') {
              const allowed = swPort.switchport.trunkAllowed;
              if (allowed !== 'all' && !(Array.isArray(allowed) && allowed.includes(vlan))) continue;
            }
          }
          if (swPort.connected.device === prevDevId) { found = true; break; }
          const cd = devices[swPort.connected.device];
          if (cd && cd.type === 'switch' && !visited.has(swPort.connected.device)) {
            visited.add(swPort.connected.device);
            queue.push(swPort.connected.device);
          }
        }
        if (found) break;
      }
      if (found) return ifName;
    }
  }
  return null;
}

export function canReach(devices, fromId, targetIP) {
  const visited = new Set();
  let srcIP = null;
  const srcDev = devices[fromId];
  for (const iface of Object.values(srcDev.interfaces)) {
    if (iface.status === 'up' && iface.ip) { srcIP = iface.ip; break; }
  }
  return forwardPacket(devices, fromId, targetIP, visited, srcIP, null);
}

export function forwardPacket(devices, devId, targetIP, visited, srcIP, prevDevId) {
  if (visited.has(devId)) return false;
  visited.add(devId);

  const dv = devices[devId];
  let curTargetIP = targetIP;
  let curSrcIP = srcIP;

  // 1. Check if target is directly on this device
  for (const iface of Object.values(dv.interfaces)) {
    if (iface.ip === curTargetIP && iface.status === 'up') return true;
  }

  // 1b. Apply NAT if this is a router/firewall with NAT config
  if ((dv.type === 'router' || dv.type === 'firewall') && dv.nat && prevDevId !== null) {
    const ingressIfName = findIngressIf(devices, dv, prevDevId);
    if (ingressIfName) {
      const natResult = applyNAT(dv, curSrcIP, curTargetIP, ingressIfName);
      curSrcIP = natResult.srcIP;
      curTargetIP = natResult.dstIP;
      for (const iface of Object.values(dv.interfaces)) {
        if (iface.ip === curTargetIP && iface.status === 'up') return true;
      }
    }
  }

  // 1c. Inbound ACL check on ingress interface
  if (prevDevId !== null && (dv.type === 'router' || dv.type === 'firewall')) {
    const ingressIfName = findIngressIf(devices, dv, prevDevId);
    if (ingressIfName && !checkInterfaceACL(dv, ingressIfName, 'in', curSrcIP, curTargetIP)) return false;
  }

  // 1d. Firewall policy check
  if (dv.type === 'firewall' && prevDevId !== null) {
    if (!checkFirewallPolicies(dv, curSrcIP, curTargetIP)) return false;
  }

  // 2. Check routing table for a specific route (e.g. /32 takes priority over connected /24)
  const nextHop = lookupRoute(dv, curTargetIP);

  // 3. If no explicit route, check directly connected networks via L2
  if (!nextHop) {
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      if (!iface.ip || iface.status !== 'up' || !iface.connected) continue;
      const net = getNetwork(iface.ip, iface.mask);
      const targetNet = getNetwork(curTargetIP, iface.mask);
      if (net === targetNet) {
        // Outbound ACL check
        if ((dv.type === 'router' || dv.type === 'firewall') && !checkInterfaceACL(dv, ifName, 'out', curSrcIP, curTargetIP)) return false;
        return canReachL2(devices, devId, ifName, curTargetIP);
      }
    }
    return false;
  }

  // 4. Find which interface can reach the next hop and forward
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!iface.ip || iface.status !== 'up' || !iface.connected) continue;
    const net = getNetwork(iface.ip, iface.mask);
    const hopNet = getNetwork(nextHop, iface.mask);
    if (net === hopNet) {
      // Outbound ACL check
      if ((dv.type === 'router' || dv.type === 'firewall') && !checkInterfaceACL(dv, ifName, 'out', curSrcIP, curTargetIP)) return false;
      const nextDevId = findDeviceByIP(devices, nextHop);
      if (!nextDevId) return false;
      if (!canReachL2(devices, devId, ifName, nextHop)) return false;
      return forwardPacket(devices, nextDevId, curTargetIP, visited, curSrcIP, devId);
    }
  }
  return false;
}

export function lookupRoute(dv, targetIP) {
  if (dv.type === 'pc') {
    // If target is on a directly connected subnet, no gateway needed (L2 reachable)
    for (const iface of Object.values(dv.interfaces)) {
      if (!iface.ip || iface.status !== 'up') continue;
      if (getNetwork(iface.ip, iface.mask) === getNetwork(targetIP, iface.mask)) return null;
    }
    return dv.defaultGateway || null;
  }
  // Server: check routes first, then fall back to default gateway
  if (dv.type === 'server') {
    for (const iface of Object.values(dv.interfaces)) {
      if (!iface.ip || iface.status !== 'up') continue;
      if (getNetwork(iface.ip, iface.mask) === getNetwork(targetIP, iface.mask)) return null;
    }
    if (dv.routes && dv.routes.length > 0) {
      let bestRoute = null, bestCIDR = -1;
      for (const r of dv.routes) {
        const routeNet = getNetwork(r.network, r.mask);
        const targetNet = getNetwork(targetIP, r.mask);
        if (routeNet === targetNet) {
          const cidr = maskToCIDR(r.mask);
          if (cidr > bestCIDR) { bestCIDR = cidr; bestRoute = r; }
        }
      }
      if (bestRoute) return bestRoute.nextHop;
    }
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
        // Only check the specific interface connected to this VLAN port, not all device interfaces
        if (rIf.ip === targetIP) return true;
      }
    }
  }
  return false;
}

// ─── Firewall policy check ──────────────────────────────

export function checkFirewallPolicies(dv, srcIP, dstIP) {
  if (dv.type !== 'firewall' || !dv.policies || dv.policies.length === 0) return true;
  const sorted = [...dv.policies].sort((a, b) => a.seq - b.seq);
  for (const p of sorted) {
    if (matchesWildcard(srcIP, p.src, p.srcWildcard) &&
        matchesWildcard(dstIP, p.dst, p.dstWildcard) &&
        matchesProtocolField(p.protocol)) {
      return p.action === 'permit';
    }
  }
  return false; // implicit deny
}

function matchesWildcard(ip, network, wildcard) {
  if (network === 'any') return true;
  const ipN = ipToInt(ip);
  const netN = ipToInt(network);
  const wcN = ipToInt(wildcard);
  return (ipN & ~wcN) === (netN & ~wcN);
}

function matchesProtocolField(protocol) {
  // Current simulation is ICMP (ping) only; 'ip' matches all
  return protocol === 'ip' || protocol === 'icmp';
}

// ─── NAT logic ──────────────────────────────────────────

// Standard ACL match (used by NAT): only checks permit entries against source IP
export function matchesACL(aclEntries, ip) {
  if (!aclEntries) return false;
  const ipN = ipToInt(ip);
  for (const entry of aclEntries) {
    if (entry.action !== 'permit') continue;
    const netN = ipToInt(entry.network);
    const wcN = ipToInt(entry.wildcard);
    if ((ipN & ~wcN) === (netN & ~wcN)) return true;
  }
  return false;
}

// Extended ACL evaluation: returns { matched, action, entry } for the first matching entry
export function evaluateExtendedACL(aclEntries, srcIP, dstIP) {
  if (!aclEntries || aclEntries.length === 0) return { matched: false, action: 'permit', entry: null };
  for (const entry of aclEntries) {
    // Extended entries have a 'protocol' field; standard entries do not
    if (!entry.protocol) {
      // Standard ACL entry — match by source only
      if (matchesWildcard(srcIP, entry.network, entry.wildcard)) {
        return { matched: true, action: entry.action, entry };
      }
    } else {
      // Extended ACL entry — match source, destination, protocol
      const srcMatch = matchesWildcard(srcIP, entry.src, entry.srcWildcard);
      const dstMatch = matchesWildcard(dstIP, entry.dst, entry.dstWildcard);
      const protoMatch = entry.protocol === 'ip' || entry.protocol === 'icmp'; // simulation uses ICMP
      if (srcMatch && dstMatch && protoMatch) {
        return { matched: true, action: entry.action, entry };
      }
    }
  }
  // Implicit deny at end of ACL
  return { matched: true, action: 'deny', entry: null };
}

// Check interface ACL (ip access-group): returns true if packet is permitted
export function checkInterfaceACL(dv, ifName, direction, srcIP, dstIP) {
  const iface = dv.interfaces[ifName];
  if (!iface || !iface.accessGroup) return true;
  const aclNum = iface.accessGroup[direction];
  if (!aclNum) return true;
  const aclEntries = dv.accessLists[aclNum];
  if (!aclEntries || aclEntries.length === 0) return true;
  const result = evaluateExtendedACL(aclEntries, srcIP, dstIP);
  return result.action === 'permit';
}

// Describe interface ACL check for diagnostics
export function describeInterfaceACL(dv, ifName, direction, srcIP, dstIP) {
  const iface = dv.interfaces[ifName];
  if (!iface || !iface.accessGroup) return { allowed: true, description: null };
  const aclNum = iface.accessGroup[direction];
  if (!aclNum) return { allowed: true, description: null };
  const aclEntries = dv.accessLists[aclNum];
  if (!aclEntries || aclEntries.length === 0) return { allowed: true, description: null };
  const result = evaluateExtendedACL(aclEntries, srcIP, dstIP);
  const dirLabel = direction === 'in' ? 'inbound' : 'outbound';
  if (result.entry) {
    const e = result.entry;
    let desc;
    if (e.protocol) {
      const srcStr = e.src === 'any' ? 'any' : `${e.src} ${e.srcWildcard}`;
      const dstStr = e.dst === 'any' ? 'any' : `${e.dst} ${e.dstWildcard}`;
      desc = `ACL ${aclNum} ${dirLabel} on ${ifName}: ${e.action} ${e.protocol} ${srcStr} -> ${dstStr}`;
    } else {
      desc = `ACL ${aclNum} ${dirLabel} on ${ifName}: ${e.action} ${e.network} ${e.wildcard}`;
    }
    return { allowed: result.action === 'permit', description: desc };
  }
  return { allowed: false, description: `ACL ${aclNum} ${dirLabel} on ${ifName}: implicit deny` };
}

export function allocateFromPool(pool, translations) {
  if (!pool) return null;
  const startN = ipToInt(pool.startIP);
  const endN = ipToInt(pool.endIP);
  const usedIPs = new Set(translations.filter(t => t.type === 'dynamic').map(t => t.insideGlobal));
  for (let n = startN; n <= endN; n++) {
    const ip = intToIP(n);
    if (!usedIPs.has(ip)) return ip;
  }
  return null;
}

function findEgressInterface(dv, targetIP) {
  // Check routing table first (specific route takes priority over connected network)
  const nextHop = lookupRoute(dv, targetIP);
  if (nextHop) {
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      if (!iface.ip || iface.status !== 'up') continue;
      if (getNetwork(iface.ip, iface.mask) === getNetwork(nextHop, iface.mask)) return ifName;
    }
  }
  // Fallback: directly connected network
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!iface.ip || iface.status !== 'up') continue;
    if (getNetwork(iface.ip, iface.mask) === getNetwork(targetIP, iface.mask)) return ifName;
  }
  return null;
}

export function applyNAT(dv, srcIP, dstIP, ingressIfName) {
  if ((dv.type !== 'router' && dv.type !== 'firewall') || !dv.nat) return { srcIP, dstIP, translated: false };

  const ingressRole = dv.interfaces[ingressIfName]?.natRole;
  if (!ingressRole) return { srcIP, dstIP, translated: false };

  // Outside → Inside: check NAT table FIRST (before routing, since dstIP may be a global address)
  if (ingressRole === 'outside') {
    const match = dv.nat.translations.find(t => t.insideGlobal === dstIP) ||
                  dv.nat.staticEntries.find(e => e.insideGlobal === dstIP);
    if (match) {
      dv.nat.stats.hits++;
      return { srcIP, dstIP: match.insideLocal, translated: true };
    }
  }

  const egressIfName = findEgressInterface(dv, dstIP);
  if (!egressIfName) return { srcIP, dstIP, translated: false };
  const egressRole = dv.interfaces[egressIfName]?.natRole;
  if (!egressRole) return { srcIP, dstIP, translated: false };

  // Inside → Outside: translate source IP
  if (ingressRole === 'inside' && egressRole === 'outside') {
    const staticMatch = dv.nat.staticEntries.find(e => e.insideLocal === srcIP);
    if (staticMatch) {
      dv.nat.stats.hits++;
      if (!dv.nat.translations.find(t => t.insideLocal === srcIP && t.type === 'static')) {
        dv.nat.translations.push({ insideLocal: srcIP, insideGlobal: staticMatch.insideGlobal, type: 'static' });
      }
      return { srcIP: staticMatch.insideGlobal, dstIP, translated: true };
    }
    for (const rule of dv.nat.dynamicRules) {
      if (matchesACL(dv.accessLists[rule.aclNum], srcIP)) {
        const existing = dv.nat.translations.find(t => t.insideLocal === srcIP && t.type === 'dynamic');
        if (existing) {
          dv.nat.stats.hits++;
          return { srcIP: existing.insideGlobal, dstIP, translated: true };
        }
        const globalIP = allocateFromPool(dv.nat.pools[rule.poolName], dv.nat.translations);
        if (globalIP) {
          dv.nat.translations.push({ insideLocal: srcIP, insideGlobal: globalIP, type: 'dynamic' });
          dv.nat.stats.hits++;
          return { srcIP: globalIP, dstIP, translated: true };
        }
      }
    }
    dv.nat.stats.misses++;
    return { srcIP, dstIP, translated: false };
  }

  return { srcIP, dstIP, translated: false };
}

// ─── Diagnostic helpers (read-only, no side effects) ────

export function describeRouteLookup(dv, targetIP) {
  if (dv.type === 'pc') {
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      if (!iface.ip || iface.status !== 'up') continue;
      if (getNetwork(iface.ip, iface.mask) === getNetwork(targetIP, iface.mask)) {
        return { nextHop: null, description: `${targetIP} is on directly connected subnet ${getNetwork(iface.ip, iface.mask)}/${maskToCIDR(iface.mask)} (${ifName})` };
      }
    }
    if (dv.defaultGateway) {
      return { nextHop: dv.defaultGateway, description: `Using default gateway ${dv.defaultGateway}` };
    }
    return { nextHop: null, description: 'No default gateway configured' };
  }
  if (dv.type === 'server') {
    // Server: check directly connected, then routes, then default gateway
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      if (!iface.ip || iface.status !== 'up') continue;
      if (getNetwork(iface.ip, iface.mask) === getNetwork(targetIP, iface.mask)) {
        return { nextHop: null, description: `Directly connected on ${ifName} (${getNetwork(iface.ip, iface.mask)}/${maskToCIDR(iface.mask)})` };
      }
    }
    if (dv.routes && dv.routes.length > 0) {
      let bestRoute = null, bestCIDR = -1;
      for (const r of dv.routes) {
        if (getNetwork(r.network, r.mask) === getNetwork(targetIP, r.mask)) {
          const cidr = maskToCIDR(r.mask);
          if (cidr > bestCIDR) { bestCIDR = cidr; bestRoute = r; }
        }
      }
      if (bestRoute) {
        const isDefault = bestRoute.network === '0.0.0.0' && bestRoute.mask === '0.0.0.0';
        const prefix = isDefault ? 'default route' : `static route ${bestRoute.network}/${maskToCIDR(bestRoute.mask)}`;
        return { nextHop: bestRoute.nextHop, description: `Matched ${prefix} via ${bestRoute.nextHop}` };
      }
    }
    if (dv.defaultGateway) {
      return { nextHop: dv.defaultGateway, description: `Using default gateway ${dv.defaultGateway}` };
    }
    return { nextHop: null, description: 'No route or default gateway configured' };
  }
  if (!dv.routes || dv.routes.length === 0) {
    // Check directly connected
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      if (!iface.ip || iface.status !== 'up') continue;
      if (getNetwork(iface.ip, iface.mask) === getNetwork(targetIP, iface.mask)) {
        return { nextHop: null, description: `Directly connected on ${ifName} (${getNetwork(iface.ip, iface.mask)}/${maskToCIDR(iface.mask)})` };
      }
    }
    return { nextHop: null, description: 'No matching route' };
  }
  let bestRoute = null, bestCIDR = -1;
  for (const r of dv.routes) {
    const routeNet = getNetwork(r.network, r.mask);
    const targetNet = getNetwork(targetIP, r.mask);
    if (routeNet === targetNet) {
      const cidr = maskToCIDR(r.mask);
      if (cidr > bestCIDR) { bestCIDR = cidr; bestRoute = r; }
    }
  }
  if (bestRoute) {
    const isDefault = bestRoute.network === '0.0.0.0' && bestRoute.mask === '0.0.0.0';
    const prefix = isDefault ? 'default route' : `static route ${bestRoute.network}/${maskToCIDR(bestRoute.mask)}`;
    return { nextHop: bestRoute.nextHop, description: `Matched ${prefix} via ${bestRoute.nextHop}` };
  }
  // Check directly connected
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!iface.ip || iface.status !== 'up') continue;
    if (getNetwork(iface.ip, iface.mask) === getNetwork(targetIP, iface.mask)) {
      return { nextHop: null, description: `Directly connected on ${ifName} (${getNetwork(iface.ip, iface.mask)}/${maskToCIDR(iface.mask)})` };
    }
  }
  return { nextHop: null, description: 'No matching route' };
}

export function describeFirewallCheck(dv, srcIP, dstIP) {
  if (dv.type !== 'firewall' || !dv.policies || dv.policies.length === 0) {
    if (dv.type === 'firewall') return { allowed: false, description: 'No policies configured -> implicit DENY' };
    return { allowed: true, description: null };
  }
  const sorted = [...dv.policies].sort((a, b) => a.seq - b.seq);
  for (const p of sorted) {
    if (matchesWildcard(srcIP, p.src, p.srcWildcard) &&
        matchesWildcard(dstIP, p.dst, p.dstWildcard) &&
        matchesProtocolField(p.protocol)) {
      const srcStr = p.src === 'any' ? 'any' : `${p.src} ${p.srcWildcard}`;
      const dstStr = p.dst === 'any' ? 'any' : `${p.dst} ${p.dstWildcard}`;
      const result = p.action === 'permit' ? 'PERMIT' : 'DENY';
      return { allowed: p.action === 'permit', description: `Policy seq ${p.seq}: ${p.action} ${srcStr} -> ${dstStr} ${p.protocol} -> ${result}` };
    }
  }
  return { allowed: false, description: 'No matching policy -> implicit DENY' };
}

export function describeNAT(dv, srcIP, dstIP, ingressIfName) {
  if ((dv.type !== 'router' && dv.type !== 'firewall') || !dv.nat) return { srcIP, dstIP, translated: false, description: null };
  const ingressRole = dv.interfaces[ingressIfName]?.natRole;
  if (!ingressRole) return { srcIP, dstIP, translated: false, description: 'No NAT role on ingress interface' };

  if (ingressRole === 'outside') {
    const match = dv.nat.translations.find(t => t.insideGlobal === dstIP) ||
                  dv.nat.staticEntries.find(e => e.insideGlobal === dstIP);
    if (match) {
      return { srcIP, dstIP: match.insideLocal, translated: true, description: `NAT outside->inside: dst ${dstIP} -> ${match.insideLocal}` };
    }
  }

  const egressIfName = findEgressInterface(dv, dstIP);
  if (!egressIfName) return { srcIP, dstIP, translated: false, description: 'NAT: no egress interface found' };
  const egressRole = dv.interfaces[egressIfName]?.natRole;
  if (!egressRole) return { srcIP, dstIP, translated: false, description: null };

  if (ingressRole === 'inside' && egressRole === 'outside') {
    const staticMatch = dv.nat.staticEntries.find(e => e.insideLocal === srcIP);
    if (staticMatch) {
      return { srcIP: staticMatch.insideGlobal, dstIP, translated: true, description: `NAT inside->outside: static src ${srcIP} -> ${staticMatch.insideGlobal}` };
    }
    for (const rule of dv.nat.dynamicRules) {
      if (matchesACL(dv.accessLists[rule.aclNum], srcIP)) {
        const existing = dv.nat.translations.find(t => t.insideLocal === srcIP && t.type === 'dynamic');
        if (existing) {
          return { srcIP: existing.insideGlobal, dstIP, translated: true, description: `NAT inside->outside: dynamic src ${srcIP} -> ${existing.insideGlobal}` };
        }
        return { srcIP, dstIP, translated: false, description: `NAT inside->outside: ACL ${rule.aclNum} matched, pool ${rule.poolName} (would allocate)` };
      }
    }
    return { srcIP, dstIP, translated: false, description: 'NAT inside->outside: no matching rule' };
  }
  return { srcIP, dstIP, translated: false, description: null };
}
