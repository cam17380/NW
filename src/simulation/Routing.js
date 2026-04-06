// ─── Routing, L2 reachability, and NAT logic (pure functions) ───
import { getNetwork, maskToCIDR, ipToInt, intToIP } from './NetworkUtils.js';

// ─── LACP / Bond helpers ───────────────────────────────────

// Find an active bond partner for a down interface
export function findBondPartner(dv, ifName) {
  const iface = dv.interfaces[ifName];
  if (!iface || !iface.bondGroup) return null;
  for (const [pName, partner] of Object.entries(dv.interfaces)) {
    if (pName !== ifName && partner.bondGroup === iface.bondGroup &&
        partner.status === 'up' && partner.connected) {
      return { ifName: pName, iface: partner };
    }
  }
  return null;
}

// Bond-aware: check if a device has targetIP reachable (up or via bond partner)
export function deviceHasReachableIP(dv, targetIP) {
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (iface.ip !== targetIP) continue;
    if (iface.status === 'up') return true;
    // Interface has the IP but is down — check bond partner
    if (iface.bondGroup) {
      const partner = findBondPartner(dv, ifName);
      if (partner) return true;
    }
  }
  return false;
}

// Bond-aware: get first usable source IP (for canReach/ping)
export function getUsableSrcIP(dv) {
  // First try: any up interface with IP
  for (const iface of Object.values(dv.interfaces)) {
    if (iface.status === 'up' && iface.ip) return iface.ip;
  }
  // Bond failover: down interface with IP, but bond partner is up
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (iface.ip && iface.status !== 'up' && iface.bondGroup) {
      if (findBondPartner(dv, ifName)) return iface.ip;
    }
  }
  return null;
}

// Bond-aware: iterate usable {ifName, ip, mask, connected} entries for forwarding
// For bonded interfaces where primary is down, yields the partner with the primary's IP/mask
export function* getUsableInterfaces(dv) {
  const yielded = new Set();
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (iface.status === 'up' && iface.ip && iface.connected && !yielded.has(ifName)) {
      yielded.add(ifName);
      yield { ifName, ip: iface.ip, mask: iface.mask, connected: iface.connected };
    }
  }
  // Bond failover: down interfaces with IP
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (iface.ip && iface.status !== 'up' && iface.bondGroup && !yielded.has(ifName)) {
      const partner = findBondPartner(dv, ifName);
      if (partner && !yielded.has(partner.ifName)) {
        yielded.add(partner.ifName);
        yielded.add(ifName);
        yield { ifName: partner.ifName, ip: iface.ip, mask: iface.mask, connected: partner.iface.connected };
      }
    }
  }
}

// ─── VPN Tunnel helpers ───────────────────────────────────

// Check if a router/firewall has any configured VPN tunnels
export function routerHasVPN(dv) {
  if (dv.type !== 'router' && dv.type !== 'firewall') return false;
  return Object.keys(dv.interfaces).some(n => n.startsWith('Tunnel'));
}

// Find the tunnel interface whose subnet covers the target IP
export function findTunnelForTarget(dv, targetIP) {
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!ifName.startsWith('Tunnel') || !iface.ip || iface.status !== 'up') continue;
    if (!iface.tunnel || !iface.tunnel.destination) continue;
    if (getNetwork(iface.ip, iface.mask) === getNetwork(targetIP, iface.mask)) {
      return { ifName, iface };
    }
  }
  return null;
}

// Find the peer device that has the tunnel destination IP on one of its physical interfaces
export function findTunnelPeerDevice(devices, tunnelDest) {
  for (const [devId, dv] of Object.entries(devices)) {
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      if (ifName.startsWith('Tunnel')) continue; // skip tunnel IFs
      if (iface.ip === tunnelDest && iface.status === 'up') return devId;
    }
  }
  return null;
}

// Find the peer's tunnel interface that points back to us
export function findPeerTunnelIF(peerDev, localTunnelIP, localTunnelMask) {
  for (const [ifName, iface] of Object.entries(peerDev.interfaces)) {
    if (!ifName.startsWith('Tunnel') || !iface.ip || iface.status !== 'up') continue;
    if (getNetwork(iface.ip, iface.mask) === getNetwork(localTunnelIP, localTunnelMask)) {
      return { ifName, iface };
    }
  }
  return null;
}

// Resolve tunnel source: can be an interface name or an IP address
export function resolveTunnelSource(dv, tunnelSource) {
  if (!tunnelSource) return null;
  // If it's an IP, return as-is
  const parts = tunnelSource.split('.');
  if (parts.length === 4 && parts.every(p => !isNaN(parseInt(p)))) return tunnelSource;
  // Otherwise treat as interface name — find its IP
  const iface = dv.interfaces[tunnelSource];
  if (iface && iface.ip) return iface.ip;
  return null;
}

// ─── L3 Switch (SVI) helpers ───────────────────────────────

// Check if a switch has any SVI interfaces (L3 capability)
export function switchHasSVI(dv) {
  if (dv.type !== 'switch') return false;
  return Object.keys(dv.interfaces).some(n => n.startsWith('Vlan'));
}

// Get VLAN ID from SVI interface name (e.g., 'Vlan10' → 10)
export function getSVIVlan(ifName) {
  if (!ifName.startsWith('Vlan')) return null;
  const vid = parseInt(ifName.slice(4));
  return isNaN(vid) ? null : vid;
}

// Find which SVI on a switch faces a given VLAN
function findSVIForVlan(dv, vlan) {
  const sviName = 'Vlan' + vlan;
  const svi = dv.interfaces[sviName];
  if (svi && svi.ip && svi.status === 'up') return sviName;
  return null;
}

// Determine which VLAN a packet entered the switch through
// prevDevId: the device the packet came from
function findIngressVlan(devices, dv, prevDevId) {
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!iface.switchport || !iface.connected || iface.status !== 'up') continue;
    if (iface.connected.device === prevDevId) {
      return iface.switchport.mode === 'access' ? iface.switchport.accessVlan : null;
    }
  }
  // prevDevId might be connected through another switch
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!iface.switchport || !iface.connected || iface.status !== 'up') continue;
    const connDev = devices[iface.connected.device];
    if (connDev && connDev.type === 'switch') {
      const vlan = iface.switchport.mode === 'access' ? iface.switchport.accessVlan : null;
      if (vlan != null && switchReachesDevice(devices, iface.connected.device, prevDevId, vlan)) {
        return vlan;
      }
    }
  }
  return null;
}

// BFS check if a device is reachable from a switch within a VLAN
function switchReachesDevice(devices, startSwId, targetDevId, vlan) {
  const visited = new Set([startSwId]);
  const queue = [startSwId];
  while (queue.length > 0) {
    const curId = queue.shift();
    const sw = devices[curId];
    for (const iface of Object.values(sw.interfaces)) {
      if (!iface.connected || iface.status !== 'up' || !iface.switchport) continue;
      if (!portCarriesVlanRouting(iface, vlan)) continue;
      if (iface.connected.device === targetDevId) return true;
      const cd = devices[iface.connected.device];
      if (cd && cd.type === 'switch' && !visited.has(iface.connected.device)) {
        visited.add(iface.connected.device);
        queue.push(iface.connected.device);
      }
    }
  }
  return false;
}

function portCarriesVlanRouting(iface, vlan) {
  if (!iface.switchport) return false;
  if (iface.switchport.mode === 'access') return iface.switchport.accessVlan === vlan;
  if (iface.switchport.mode === 'trunk') {
    const allowed = iface.switchport.trunkAllowed;
    return allowed === 'all' || (Array.isArray(allowed) && allowed.includes(vlan));
  }
  return false;
}

// L2 reachability from a switch itself (not from an external device through a switch)
// Used when an L3 switch routes a packet and needs to deliver it via a specific VLAN
export function switchL2Deliver(devices, switchId, vlan, targetIP) {
  const sw = devices[switchId];
  const visited = new Set([switchId]);
  const queue = [switchId];
  while (queue.length > 0) {
    const curId = queue.shift();
    const curDev = devices[curId];
    for (const [ifName, iface] of Object.entries(curDev.interfaces)) {
      if (iface.status !== 'up' || !iface.connected || !iface.switchport) continue;
      if (!portCarriesVlanRouting(iface, vlan)) continue;
      const rDev = devices[iface.connected.device];
      const rIf = rDev.interfaces[iface.connected.iface];
      if (!rIf || rIf.status !== 'up') continue;
      if (rDev.type === 'switch') {
        if (!visited.has(iface.connected.device)) {
          visited.add(iface.connected.device);
          queue.push(iface.connected.device);
        }
      } else {
        if (rIf.ip === targetIP) return true;
        // Bond failover: check if a bond partner has the target IP
        if (rIf.bondGroup) {
          for (const pIface of Object.values(rDev.interfaces)) {
            if (pIface !== rIf && pIface.bondGroup === rIf.bondGroup && pIface.ip === targetIP) return true;
          }
        }
      }
    }
  }
  return false;
}

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

export function canReach(devices, fromId, targetIP, proto, port) {
  const visited = new Set();
  const srcDev = devices[fromId];
  const srcIP = getUsableSrcIP(srcDev);
  return forwardPacket(devices, fromId, targetIP, visited, srcIP, null, proto, port);
}

export function forwardPacket(devices, devId, targetIP, visited, srcIP, prevDevId, proto, port) {
  if (visited.has(devId)) return false;
  visited.add(devId);

  const dv = devices[devId];
  let curTargetIP = targetIP;
  let curSrcIP = srcIP;

  // 1. Check if target is directly on this device (bond-aware)
  // For firewalls: policy check must happen first, even for locally-destined traffic
  if (dv.type !== 'firewall' && deviceHasReachableIP(dv, curTargetIP)) return true;

  // 1a-L3SW. L3 switch forwarding via SVIs
  if (dv.type === 'switch' && switchHasSVI(dv)) {
    // Determine ingress VLAN and SVI
    if (prevDevId !== null) {
      const ingressVlan = findIngressVlan(devices, dv, prevDevId);
      if (ingressVlan != null) {
        const ingressSVI = findSVIForVlan(dv, ingressVlan);
        if (ingressSVI && !checkInterfaceACL(dv, ingressSVI, 'in', curSrcIP, curTargetIP, proto, port)) return false;
      }
    }

    // Route lookup (reuse existing lookupRoute — switch now has routes[])
    const swNextHop = lookupRoute(dv, curTargetIP);

    if (!swNextHop) {
      // Directly connected via SVI subnet
      for (const [ifName, iface] of Object.entries(dv.interfaces)) {
        if (!ifName.startsWith('Vlan') || !iface.ip || iface.status !== 'up') continue;
        if (getNetwork(iface.ip, iface.mask) === getNetwork(curTargetIP, iface.mask)) {
          if (!checkInterfaceACL(dv, ifName, 'out', curSrcIP, curTargetIP, proto, port)) return false;
          const vlan = getSVIVlan(ifName);
          return switchL2Deliver(devices, devId, vlan, curTargetIP);
        }
      }
      return false;
    }

    // Has next hop — find SVI for next hop's subnet
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      if (!ifName.startsWith('Vlan') || !iface.ip || iface.status !== 'up') continue;
      if (getNetwork(iface.ip, iface.mask) === getNetwork(swNextHop, iface.mask)) {
        if (!checkInterfaceACL(dv, ifName, 'out', curSrcIP, curTargetIP, proto, port)) return false;
        const nextDevId = findDeviceByIP(devices, swNextHop);
        if (!nextDevId) return false;
        const vlan = getSVIVlan(ifName);
        if (!switchL2Deliver(devices, devId, vlan, swNextHop)) return false;
        return forwardPacket(devices, nextDevId, curTargetIP, visited, curSrcIP, devId, proto, port);
      }
    }
    return false;
  }

  // 1b. Firewall: DNAT → policy → SNAT (CheckPoint/UTX200 order)
  //     DNAT (destination NAT) is applied before policy evaluation.
  //     SNAT (source NAT/Hide NAT) is applied after policy evaluation.
  if (dv.type === 'firewall' && prevDevId !== null) {
    const ingressIfName = findIngressIf(devices, dv, prevDevId);

    // DNAT (pre-policy): translate destination IP
    if (dv.nat && ingressIfName) {
      const dnatResult = applyDNAT(dv, curSrcIP, curTargetIP, ingressIfName);
      curSrcIP = dnatResult.srcIP;
      curTargetIP = dnatResult.dstIP;
    }

    // Firewall policy check (post-DNAT, pre-SNAT)
    if (!checkFirewallPolicies(dv, curSrcIP, curTargetIP, proto, port)) return false;

    // Firewall local delivery: checked AFTER policy
    if (deviceHasReachableIP(dv, curTargetIP)) return true;

    // Inbound ACL check
    if (ingressIfName && !checkInterfaceACL(dv, ingressIfName, 'in', curSrcIP, curTargetIP, proto, port)) return false;

    // SNAT (post-policy): translate source IP
    if (dv.nat && ingressIfName) {
      const snatResult = applySNAT(dv, curSrcIP, curTargetIP, ingressIfName);
      curSrcIP = snatResult.srcIP;
      curTargetIP = snatResult.dstIP;
    }
  }

  // 1c. Non-firewall: apply NAT first, then ACL (router behavior)
  if (dv.type !== 'firewall' && (dv.type === 'router') && dv.nat && prevDevId !== null) {
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

  // 1d. Non-firewall: inbound ACL check (post-NAT for routers)
  if (dv.type !== 'firewall' && prevDevId !== null && (dv.type === 'router')) {
    const ingressIfName = findIngressIf(devices, dv, prevDevId);
    if (ingressIfName && !checkInterfaceACL(dv, ingressIfName, 'in', curSrcIP, curTargetIP, proto, port)) return false;
  }

  // 2. Check routing table for a specific route (e.g. /32 takes priority over connected /24)
  const nextHop = lookupRoute(dv, curTargetIP);

  // 2a. Tunnel forwarding: if the route resolves to a tunnel interface, forward via underlay
  if (nextHop && (dv.type === 'router' || dv.type === 'firewall')) {
    const tunnelMatch = findTunnelForTarget(dv, nextHop);
    if (tunnelMatch) {
      const tunnelDest = tunnelMatch.iface.tunnel?.destination;
      if (tunnelDest) {
        const peerDevId = findTunnelPeerDevice(devices, tunnelDest);
        if (peerDevId && !visited.has(peerDevId)) {
          // Forward through underlay to the peer, then let the peer continue forwarding
          return forwardPacket(devices, peerDevId, curTargetIP, visited, curSrcIP, devId, proto, port);
        }
      }
      return false;
    }
  }
  // Also check directly connected tunnel subnets (no explicit route, target is on tunnel subnet)
  if (!nextHop && (dv.type === 'router' || dv.type === 'firewall')) {
    const tunnelDirect = findTunnelForTarget(dv, curTargetIP);
    if (tunnelDirect) {
      const tunnelDest = tunnelDirect.iface.tunnel?.destination;
      if (tunnelDest) {
        const peerDevId = findTunnelPeerDevice(devices, tunnelDest);
        if (peerDevId && !visited.has(peerDevId)) {
          return forwardPacket(devices, peerDevId, curTargetIP, visited, curSrcIP, devId, proto, port);
        }
      }
      return false;
    }
  }

  // 3. If no explicit route, check directly connected networks via L2 (bond-aware)
  if (!nextHop) {
    for (const ui of getUsableInterfaces(dv)) {
      const net = getNetwork(ui.ip, ui.mask);
      const targetNet = getNetwork(curTargetIP, ui.mask);
      if (net === targetNet) {
        if ((dv.type === 'router' || dv.type === 'firewall') && !checkInterfaceACL(dv, ui.ifName, 'out', curSrcIP, curTargetIP, proto, port)) return false;
        return canReachL2(devices, devId, ui.ifName, curTargetIP);
      }
    }
    return false;
  }

  // 4. Find which interface can reach the next hop and forward (bond-aware)
  for (const ui of getUsableInterfaces(dv)) {
    const net = getNetwork(ui.ip, ui.mask);
    const hopNet = getNetwork(nextHop, ui.mask);
    if (net === hopNet) {
      if ((dv.type === 'router' || dv.type === 'firewall') && !checkInterfaceACL(dv, ui.ifName, 'out', curSrcIP, curTargetIP, proto, port)) return false;
      const nextDevId = findDeviceByIP(devices, nextHop);
      if (!nextDevId) return false;
      if (!canReachL2(devices, devId, ui.ifName, nextHop)) return false;
      return forwardPacket(devices, nextDevId, curTargetIP, visited, curSrcIP, devId, proto, port);
    }
  }
  return false;
}

export function lookupRoute(dv, targetIP) {
  if (dv.type === 'pc') {
    // If target is on a directly connected subnet, no gateway needed (bond-aware)
    for (const ui of getUsableInterfaces(dv)) {
      if (getNetwork(ui.ip, ui.mask) === getNetwork(targetIP, ui.mask)) return null;
    }
    return dv.defaultGateway || null;
  }
  // Server: check routes first, then fall back to default gateway (bond-aware)
  if (dv.type === 'server') {
    for (const ui of getUsableInterfaces(dv)) {
      if (getNetwork(ui.ip, ui.mask) === getNetwork(targetIP, ui.mask)) return null;
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
  // Router/Firewall: check directly connected subnets first (connected routes have AD 0, higher priority than static)
  // Skip tunnel interfaces — tunnel subnets are virtual and handled by tunnel forwarding logic
  if (dv.type === 'router' || dv.type === 'firewall') {
    for (const ui of getUsableInterfaces(dv)) {
      if (ui.ifName.startsWith('Tunnel')) continue;
      if (getNetwork(ui.ip, ui.mask) === getNetwork(targetIP, ui.mask)) return null;
    }
  }
  // L3 switch: check SVI connected subnets first, then routes
  if (dv.type === 'switch') {
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      if (!ifName.startsWith('Vlan') || !iface.ip || iface.status !== 'up') continue;
      if (getNetwork(iface.ip, iface.mask) === getNetwork(targetIP, iface.mask)) return null;
    }
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
    if (deviceHasReachableIP(dv, ip)) return did;
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
    return deviceHasReachableIP(remoteDev, targetIP);
  }

  // Entering a switch — determine VLAN
  let vlan = 1;
  if (remoteIf.switchport) {
    if (remoteIf.switchport.mode === 'access') {
      vlan = remoteIf.switchport.accessVlan;
    } else if (remoteIf.switchport.mode === 'trunk') {
      // Trunk port: determine VLAN from the target IP's matching SVI on the switch
      for (const [ifn, iff] of Object.entries(remoteDev.interfaces)) {
        if (!ifn.startsWith('Vlan') || !iff.ip || iff.status !== 'up') continue;
        if (getNetwork(iff.ip, iff.mask) === getNetwork(targetIP, iff.mask)) {
          vlan = getSVIVlan(ifn);
          break;
        }
      }
    }
  }

  // BFS through switches
  const visited = new Set();
  const queue = [remote.device];
  visited.add(remote.device);

  while (queue.length > 0) {
    const curId = queue.shift();
    const curDev = devices[curId];

    // Check if this switch's SVI for this VLAN has the target IP (L3 switch gateway)
    const sviName = 'Vlan' + vlan;
    const svi = curDev.interfaces[sviName];
    if (svi && svi.ip === targetIP && svi.status === 'up') return true;

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
        // Check the specific interface, or its bond partner if bonded
        if (rIf.ip === targetIP) return true;
        // Bond failover: rIf is up and bonded — check if a partner has the target IP
        if (rIf.bondGroup) {
          for (const pIface of Object.values(rDev.interfaces)) {
            if (pIface !== rIf && pIface.bondGroup === rIf.bondGroup && pIface.ip === targetIP) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

// ─── Firewall policy check ──────────────────────────────

export function checkFirewallPolicies(dv, srcIP, dstIP, proto, port) {
  if (dv.type !== 'firewall' || !dv.policies || dv.policies.length === 0) return true;
  const sorted = [...dv.policies].sort((a, b) => a.seq - b.seq);
  for (const p of sorted) {
    if (matchesWildcard(srcIP, p.src, p.srcWildcard) &&
        matchesWildcard(dstIP, p.dst, p.dstWildcard) &&
        matchesProtocolField(p.protocol, proto) &&
        matchesPortField(p.port, port)) {
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

function matchesProtocolField(ruleProto, packetProto) {
  // 'ip' in rule matches any protocol
  if (ruleProto === 'ip') return true;
  // If no packet protocol specified (legacy ping), match only ip/icmp rules
  if (!packetProto) return ruleProto === 'icmp';
  return ruleProto === packetProto;
}

function matchesPortField(rulePort, packetPort) {
  // No port in rule means "any port" for that protocol
  if (rulePort == null) return true;
  // If packet has no port (e.g. icmp), rule with port doesn't match
  if (packetPort == null) return false;
  return Number(rulePort) === Number(packetPort);
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
export function evaluateExtendedACL(aclEntries, srcIP, dstIP, proto, port) {
  if (!aclEntries || aclEntries.length === 0) return { matched: false, action: 'permit', entry: null };
  for (const entry of aclEntries) {
    // Extended entries have a 'protocol' field; standard entries do not
    if (!entry.protocol) {
      // Standard ACL entry — match by source only
      if (matchesWildcard(srcIP, entry.network, entry.wildcard)) {
        return { matched: true, action: entry.action, entry };
      }
    } else {
      // Extended ACL entry — match source, destination, protocol, port
      const srcMatch = matchesWildcard(srcIP, entry.src, entry.srcWildcard);
      const dstMatch = matchesWildcard(dstIP, entry.dst, entry.dstWildcard);
      const protoMatch = matchesProtocolField(entry.protocol, proto);
      const portMatch = matchesPortField(entry.port, port);
      if (srcMatch && dstMatch && protoMatch && portMatch) {
        return { matched: true, action: entry.action, entry };
      }
    }
  }
  // Implicit deny at end of ACL
  return { matched: true, action: 'deny', entry: null };
}

// Check interface ACL (ip access-group): returns true if packet is permitted
export function checkInterfaceACL(dv, ifName, direction, srcIP, dstIP, proto, port) {
  const iface = dv.interfaces[ifName];
  if (!iface || !iface.accessGroup) return true;
  const aclNum = iface.accessGroup[direction];
  if (!aclNum) return true;
  const aclEntries = dv.accessLists[aclNum];
  if (!aclEntries || aclEntries.length === 0) return true;
  const result = evaluateExtendedACL(aclEntries, srcIP, dstIP, proto, port);
  return result.action === 'permit';
}

// Describe interface ACL check for diagnostics
export function describeInterfaceACL(dv, ifName, direction, srcIP, dstIP, proto, port) {
  const iface = dv.interfaces[ifName];
  if (!iface || !iface.accessGroup) return { allowed: true, description: null };
  const aclNum = iface.accessGroup[direction];
  if (!aclNum) return { allowed: true, description: null };
  const aclEntries = dv.accessLists[aclNum];
  if (!aclEntries || aclEntries.length === 0) return { allowed: true, description: null };
  const result = evaluateExtendedACL(aclEntries, srcIP, dstIP, proto, port);
  const dirLabel = direction === 'in' ? 'inbound' : 'outbound';
  if (result.entry) {
    const e = result.entry;
    let desc;
    if (e.protocol) {
      const srcStr = e.src === 'any' ? 'any' : `${e.src} ${e.srcWildcard}`;
      const dstStr = e.dst === 'any' ? 'any' : `${e.dst} ${e.dstWildcard}`;
      const portStr = e.port != null ? ` eq ${e.port}` : '';
      desc = `ACL ${aclNum} ${dirLabel} on ${ifName}: ${e.action} ${e.protocol} ${srcStr} -> ${dstStr}${portStr}`;
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

// Destination NAT only (outside→inside: translate dstIP)
// In real firewalls (CheckPoint/UTX200), DNAT is applied BEFORE policy evaluation.
export function applyDNAT(dv, srcIP, dstIP, ingressIfName) {
  if ((dv.type !== 'router' && dv.type !== 'firewall') || !dv.nat) return { srcIP, dstIP, translated: false };
  const ingressRole = dv.interfaces[ingressIfName]?.natRole;
  if (ingressRole !== 'outside') return { srcIP, dstIP, translated: false };
  const match = dv.nat.translations?.find(t => t.insideGlobal === dstIP) ||
                dv.nat.staticEntries.find(e => e.insideGlobal === dstIP);
  if (match) {
    if (dv.nat.stats) dv.nat.stats.hits++;
    return { srcIP, dstIP: match.insideLocal, translated: true };
  }
  return { srcIP, dstIP, translated: false };
}

// Source NAT only (inside→outside: translate srcIP via static entries or dynamic/Hide NAT)
// In real firewalls, SNAT is applied AFTER policy evaluation.
export function applySNAT(dv, srcIP, dstIP, ingressIfName) {
  if ((dv.type !== 'router' && dv.type !== 'firewall') || !dv.nat) return { srcIP, dstIP, translated: false };
  const ingressRole = dv.interfaces[ingressIfName]?.natRole;
  if (!ingressRole) return { srcIP, dstIP, translated: false };
  const egressIfName = findEgressInterface(dv, dstIP);
  if (!egressIfName) return { srcIP, dstIP, translated: false };
  const egressRole = dv.interfaces[egressIfName]?.natRole;
  if (!egressRole) return { srcIP, dstIP, translated: false };
  if (ingressRole === 'inside' && egressRole === 'outside') {
    const staticMatch = dv.nat.staticEntries.find(e => e.insideLocal === srcIP);
    if (staticMatch) {
      if (dv.nat.stats) dv.nat.stats.hits++;
      if (dv.nat.translations && !dv.nat.translations.find(t => t.insideLocal === srcIP && t.type === 'static')) {
        dv.nat.translations.push({ insideLocal: srcIP, insideGlobal: staticMatch.insideGlobal, type: 'static' });
      }
      return { srcIP: staticMatch.insideGlobal, dstIP, translated: true };
    }
    for (const rule of dv.nat.dynamicRules) {
      if (matchesACL(dv.accessLists[rule.aclNum], srcIP)) {
        const existing = dv.nat.translations?.find(t => t.insideLocal === srcIP && t.type === 'dynamic');
        if (existing) {
          if (dv.nat.stats) dv.nat.stats.hits++;
          return { srcIP: existing.insideGlobal, dstIP, translated: true };
        }
        const globalIP = allocateFromPool(dv.nat.pools[rule.poolName], dv.nat.translations || []);
        if (globalIP) {
          if (dv.nat.translations) dv.nat.translations.push({ insideLocal: srcIP, insideGlobal: globalIP, type: 'dynamic' });
          if (dv.nat.stats) dv.nat.stats.hits++;
          return { srcIP: globalIP, dstIP, translated: true };
        }
      }
    }
    if (dv.nat.stats) dv.nat.stats.misses++;
    return { srcIP, dstIP, translated: false };
  }
  return { srcIP, dstIP, translated: false };
}

// Combined NAT (for routers — applies both DNAT and SNAT in one pass)
export function applyNAT(dv, srcIP, dstIP, ingressIfName) {
  const dnatResult = applyDNAT(dv, srcIP, dstIP, ingressIfName);
  if (dnatResult.translated) return dnatResult;
  return applySNAT(dv, dnatResult.srcIP, dnatResult.dstIP, ingressIfName);
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
  // Router/Firewall/Switch: check directly connected first (connected routes have AD 0)
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!iface.ip || iface.status !== 'up') continue;
    if (ifName.startsWith('Tunnel')) continue; // tunnel subnets are virtual, not directly connected via L2
    if (getNetwork(iface.ip, iface.mask) === getNetwork(targetIP, iface.mask)) {
      return { nextHop: null, description: `Directly connected on ${ifName} (${getNetwork(iface.ip, iface.mask)}/${maskToCIDR(iface.mask)})` };
    }
  }
  if (!dv.routes || dv.routes.length === 0) {
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
  return { nextHop: null, description: 'No matching route' };
}

export function describeFirewallCheck(dv, srcIP, dstIP, proto, port) {
  if (dv.type !== 'firewall' || !dv.policies || dv.policies.length === 0) {
    if (dv.type === 'firewall') return { allowed: false, description: 'No policies configured -> implicit DENY' };
    return { allowed: true, description: null };
  }
  const sorted = [...dv.policies].sort((a, b) => a.seq - b.seq);
  for (const p of sorted) {
    if (matchesWildcard(srcIP, p.src, p.srcWildcard) &&
        matchesWildcard(dstIP, p.dst, p.dstWildcard) &&
        matchesProtocolField(p.protocol, proto) &&
        matchesPortField(p.port, port)) {
      const srcStr = p.src === 'any' ? 'any' : `${p.src} ${p.srcWildcard}`;
      const dstStr = p.dst === 'any' ? 'any' : `${p.dst} ${p.dstWildcard}`;
      const portStr = p.port != null ? ` eq ${p.port}` : '';
      const result = p.action === 'permit' ? 'PERMIT' : 'DENY';
      return { allowed: p.action === 'permit', description: `Policy seq ${p.seq}: ${p.action} ${srcStr} -> ${dstStr} ${p.protocol}${portStr} -> ${result}` };
    }
  }
  return { allowed: false, description: 'No matching policy -> implicit DENY' };
}

// Describe DNAT only (for diagnostic output)
export function describeDNAT(dv, srcIP, dstIP, ingressIfName) {
  if ((dv.type !== 'router' && dv.type !== 'firewall') || !dv.nat) return { srcIP, dstIP, translated: false, description: null };
  const ingressRole = dv.interfaces[ingressIfName]?.natRole;
  if (!ingressRole) return { srcIP, dstIP, translated: false, description: 'No NAT role on ingress interface' };
  if (ingressRole === 'outside') {
    const match = dv.nat.translations?.find(t => t.insideGlobal === dstIP) ||
                  dv.nat.staticEntries.find(e => e.insideGlobal === dstIP);
    if (match) {
      return { srcIP, dstIP: match.insideLocal, translated: true, description: `NAT outside->inside: dst ${dstIP} -> ${match.insideLocal}` };
    }
  }
  return { srcIP, dstIP, translated: false, description: null };
}

// Describe SNAT only (for diagnostic output)
export function describeSNAT(dv, srcIP, dstIP, ingressIfName) {
  if ((dv.type !== 'router' && dv.type !== 'firewall') || !dv.nat) return { srcIP, dstIP, translated: false, description: null };
  const ingressRole = dv.interfaces[ingressIfName]?.natRole;
  if (!ingressRole) return { srcIP, dstIP, translated: false, description: 'No NAT role on ingress interface' };
  const egressIfName = findEgressInterface(dv, dstIP);
  if (!egressIfName) return { srcIP, dstIP, translated: false, description: null };
  const egressRole = dv.interfaces[egressIfName]?.natRole;
  if (!egressRole) return { srcIP, dstIP, translated: false, description: null };
  if (ingressRole === 'inside' && egressRole === 'outside') {
    const staticMatch = dv.nat.staticEntries.find(e => e.insideLocal === srcIP);
    if (staticMatch) {
      return { srcIP: staticMatch.insideGlobal, dstIP, translated: true, description: `NAT inside->outside: static src ${srcIP} -> ${staticMatch.insideGlobal}` };
    }
    for (const rule of dv.nat.dynamicRules) {
      if (matchesACL(dv.accessLists[rule.aclNum], srcIP)) {
        const existing = dv.nat.translations?.find(t => t.insideLocal === srcIP && t.type === 'dynamic');
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

// Combined describe (for routers — both DNAT and SNAT)
export function describeNAT(dv, srcIP, dstIP, ingressIfName) {
  if ((dv.type !== 'router' && dv.type !== 'firewall') || !dv.nat) return { srcIP, dstIP, translated: false, description: null };
  const ingressRole = dv.interfaces[ingressIfName]?.natRole;
  if (!ingressRole) return { srcIP, dstIP, translated: false, description: 'No NAT role on ingress interface' };
  const dnatResult = describeDNAT(dv, srcIP, dstIP, ingressIfName);
  if (dnatResult.translated) return dnatResult;
  return describeSNAT(dv, dnatResult.srcIP, dnatResult.dstIP, ingressIfName);
}
