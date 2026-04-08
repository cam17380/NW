// ─── Ping path building and execution ───
import { getNetwork, generateMAC } from './NetworkUtils.js';
import { canReach, lookupRoute, findDeviceByIP, applyNAT, applyDNAT, applySNAT, checkFirewallPolicies, checkInterfaceACL, describeRouteLookup, describeFirewallCheck, describeNAT, describeDNAT, describeSNAT, describeInterfaceACL, switchHasSVI, getSVIVlan, switchL2Deliver, getUsableSrcIP, getUsableInterfaces, deviceHasReachableIP, findTunnelForTarget, findTunnelPeerDevice, findL2IPConflict } from './Routing.js';

export function execPing(targetIP, store, terminal, animatePing) {
  const devices = store.getDevices();
  const currentDeviceId = store.getCurrentDeviceId();
  const d = store.getCurrentDevice();

  const srcIP = getUsableSrcIP(d);
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

  const { path, linkHints } = buildPingPath(devices, currentDeviceId, targetIP, reachable);

  // Compute ARP resolutions needed BEFORE populating tables
  const arpResolutions = reachable ? computeArpResolutions(devices, path, linkHints) : [];

  // Show ARP resolution messages in terminal
  for (const arp of arpResolutions) {
    const reqDev = devices[arp.requesterId];
    terminal.write(`ARP: ${reqDev.hostname} — Who has ${arp.targetIP}? Tell ${arp.requesterIP}`, 'info-line');
    terminal.write(`ARP: ${arp.targetIP} is at ${arp.targetMAC}`, 'info-line');
  }

  // Duplicate IP detection: check if source IP has a conflict in the same L2 domain
  if (srcIP !== targetIP && !deviceHasReachableIP(d, targetIP)) {
    // Find the source interface
    for (const [ifName, iff] of Object.entries(d.interfaces)) {
      if (iff.ip === srcIP && iff.status === 'up' && iff.connected) {
        const conflict = findL2IPConflict(devices, currentDeviceId, ifName, srcIP);
        if (conflict) {
          terminal.write(`%IP-4-DUPADDR: Duplicate address ${srcIP} on ${ifName}, sourced by ${conflict.hostname} ${conflict.ifName}`, 'error-line');
        }
        break;
      }
    }
  }

  // Learn ARP entries along the path
  buildArpAlongPath(devices, path);

  if (path.length >= 2) {
    animatePing(path, linkHints, reachable, arpResolutions, () => {
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

export function buildPingPath(devices, fromId, targetIP, reachable, proto, port) {
  const path = [fromId];
  const linkHints = [];  // linkHints[i] = {fromIf, toIf} for segment path[i]→path[i+1]
  const visited = new Set([fromId]);
  let curId = fromId;
  let curTargetIP = targetIP;
  let curSrcIP = null;
  let arrivedViaTunnel = false; // Skip physical ACL/NAT after tunnel decapsulation

  // Get source IP (bond-aware)
  const srcDev = devices[fromId];
  curSrcIP = getUsableSrcIP(srcDev);

  for (let step = 0; step < 20; step++) {
    const dv = devices[curId];

    // Local delivery check (bond-aware)
    // For firewalls: policy check first, so defer local check
    if (dv.type !== 'firewall' && deviceHasReachableIP(dv, curTargetIP)) return { path, linkHints };

    // L3 switch forwarding via SVIs
    if (dv.type === 'switch' && switchHasSVI(dv)) {
      // Inbound ACL on ingress SVI
      if (step > 0) {
        const prevDevId = path.length >= 2 ? path[path.length - 2] : null;
        if (prevDevId) {
          const ingressVlan = findIngressVlanForPath(devices, dv, prevDevId);
          if (ingressVlan != null) {
            const ingressSVI = 'Vlan' + ingressVlan;
            const svi = dv.interfaces[ingressSVI];
            if (svi && svi.ip && svi.status === 'up') {
              if (!checkInterfaceACL(dv, ingressSVI, 'in', curSrcIP, curTargetIP, proto, port)) break;
            }
          }
        }
      }

      // Route lookup via SVIs
      let swNextHop = lookupRoute(dv, curTargetIP);
      const resolvedIP = swNextHop || curTargetIP;

      // Find egress SVI whose subnet covers the resolved IP
      let egressSVI = null;
      for (const [ifName, iface] of Object.entries(dv.interfaces)) {
        if (!ifName.startsWith('Vlan') || !iface.ip || iface.status !== 'up') continue;
        if (getNetwork(iface.ip, iface.mask) === getNetwork(resolvedIP, iface.mask)) {
          egressSVI = ifName; break;
        }
      }
      if (!egressSVI) break;

      // Outbound ACL on egress SVI
      if (!checkInterfaceACL(dv, egressSVI, 'out', curSrcIP, curTargetIP, proto, port)) break;

      // Find target device in the egress VLAN
      const egressVlan = getSVIVlan(egressSVI);
      const targetDevId = findDeviceByIP(devices, resolvedIP);
      if (!targetDevId || targetDevId === curId) break;

      // BFS to find physical path from this switch to target in the egress VLAN
      const swPath = bfsSwitchPath(devices, curId, targetDevId, egressVlan);
      for (const sid of swPath) {
        const prevSwId = path[path.length - 1];
        const prevSw = devices[prevSwId];
        let swFromIf = null, swToIf = null;
        for (const [ifn, iff] of Object.entries(prevSw.interfaces)) {
          if (iff.connected && iff.connected.device === sid) { swFromIf = ifn; swToIf = iff.connected.iface; break; }
        }
        linkHints.push({ fromIf: swFromIf, toIf: swToIf });
        path.push(sid);
        visited.add(sid);
      }

      // Switch-to-target: find the physical port connecting to target
      const lastSwId = path[path.length - 1];
      const targetDev = devices[targetDevId];
      let swToTargetFromIf = null, swToTargetToIf = null;
      for (const [ifName, iface] of Object.entries(targetDev.interfaces)) {
        if (iface.connected && iface.connected.device === lastSwId && iface.ip === resolvedIP) {
          swToTargetToIf = ifName; swToTargetFromIf = iface.connected.iface; break;
        }
      }
      if (!swToTargetToIf) {
        for (const [ifName, iface] of Object.entries(targetDev.interfaces)) {
          if (iface.connected && iface.connected.device === lastSwId) {
            swToTargetToIf = ifName; swToTargetFromIf = iface.connected.iface; break;
          }
        }
      }
      if (swToTargetFromIf) {
        linkHints.push({ fromIf: swToTargetFromIf, toIf: swToTargetToIf });
        path.push(targetDevId);
        visited.add(targetDevId);
        curId = targetDevId;
      } else {
        break;
      }
      continue;
    }

    // Firewall: DNAT → policy → SNAT (CheckPoint/UTX200 order)
    if (dv.type === 'firewall' && step > 0) {
      const prevDevId = path[path.length - 2] || null;
      const aclIngressIf = prevDevId ? findIngressIfViaSwitch(devices, dv, prevDevId) : null;
      // DNAT (pre-policy)
      if (dv.nat && aclIngressIf) {
        const dnatResult = applyDNAT(dv, curSrcIP, curTargetIP, aclIngressIf);
        curSrcIP = dnatResult.srcIP;
        curTargetIP = dnatResult.dstIP;
      }
      // Policy check (post-DNAT, pre-SNAT)
      if (!checkFirewallPolicies(dv, curSrcIP, curTargetIP, proto, port)) break;
      if (deviceHasReachableIP(dv, curTargetIP)) return { path, linkHints };
      // ACL check
      if (aclIngressIf && !checkInterfaceACL(dv, aclIngressIf, 'in', curSrcIP, curTargetIP, proto, port)) break;
      // SNAT (post-policy)
      if (dv.nat && aclIngressIf) {
        const snatResult = applySNAT(dv, curSrcIP, curTargetIP, aclIngressIf);
        curSrcIP = snatResult.srcIP;
        curTargetIP = snatResult.dstIP;
      }
    }

    // Non-firewall router: NAT first, then ACL (Cisco IOS order)
    // Skip if packet arrived via tunnel (decapsulated packets bypass physical interface ACL/NAT)
    if (dv.type === 'router' && step > 0 && !arrivedViaTunnel) {
      const prevDevId = path[path.length - 2] || null;
      let ingressIfName = prevDevId ? findIngressIfViaSwitch(devices, dv, prevDevId) : null;
      if (ingressIfName && dv.nat) {
        const natResult = applyNAT(dv, curSrcIP, curTargetIP, ingressIfName);
        curSrcIP = natResult.srcIP;
        curTargetIP = natResult.dstIP;
        for (const iface of Object.values(dv.interfaces)) {
          if (iface.ip === curTargetIP && iface.status === 'up') return { path, linkHints };
        }
      }
      if (ingressIfName && !checkInterfaceACL(dv, ingressIfName, 'in', curSrcIP, curTargetIP, proto, port)) break;
    }
    arrivedViaTunnel = false;

    // Check routing table first (specific route like /32 takes priority over connected /24)
    let nextHopIP = lookupRoute(dv, curTargetIP);

    // If no explicit route, check directly connected networks (bond-aware)
    if (!nextHopIP) {
      for (const ui of getUsableInterfaces(dv)) {
        if (getNetwork(ui.ip, ui.mask) === getNetwork(curTargetIP, ui.mask)) {
          nextHopIP = curTargetIP;
          break;
        }
      }
    }

    // Tunnel forwarding: if the resolved next-hop or target is on a tunnel subnet,
    // build the underlay path to the tunnel peer device
    if ((dv.type === 'router' || dv.type === 'firewall') && nextHopIP) {
      const tunnelMatch = findTunnelForTarget(dv, nextHopIP);
      if (tunnelMatch) {
        const tunnelDest = tunnelMatch.iface.tunnel?.destination;
        if (tunnelDest) {
          const peerDevId = findTunnelPeerDevice(devices, tunnelDest);
          if (peerDevId && !visited.has(peerDevId)) {
            // Build underlay path from current device to tunnel peer
            const underlayPath = buildPingPath(devices, curId, tunnelDest, true);
            // Append underlay hops (skip the first which is curId already in path)
            for (let u = 1; u < underlayPath.path.length; u++) {
              linkHints.push(underlayPath.linkHints[u - 1]);
              path.push(underlayPath.path[u]);
              visited.add(underlayPath.path[u]);
            }
            curId = peerDevId;
            arrivedViaTunnel = true;
            continue;
          }
        }
        break;
      }
    }
    if (!nextHopIP && (dv.type === 'router' || dv.type === 'firewall')) {
      const tunnelDirect = findTunnelForTarget(dv, curTargetIP);
      if (tunnelDirect) {
        const tunnelDest = tunnelDirect.iface.tunnel?.destination;
        if (tunnelDest) {
          const peerDevId = findTunnelPeerDevice(devices, tunnelDest);
          if (peerDevId && !visited.has(peerDevId)) {
            const underlayPath = buildPingPath(devices, curId, tunnelDest, true);
            for (let u = 1; u < underlayPath.path.length; u++) {
              linkHints.push(underlayPath.linkHints[u - 1]);
              path.push(underlayPath.path[u]);
              visited.add(underlayPath.path[u]);
            }
            curId = peerDevId;
            arrivedViaTunnel = true;
            continue;
          }
        }
        break;
      }
    }

    if (!nextHopIP) break;

    // Find exit interface (bond-aware)
    let exitIf = null;
    let exitIfName = null;
    for (const ui of getUsableInterfaces(dv)) {
      if (getNetwork(ui.ip, ui.mask) === getNetwork(nextHopIP, ui.mask)) {
        exitIf = dv.interfaces[ui.ifName];
        exitIfName = ui.ifName;
        break;
      }
    }
    if (!exitIf || !exitIf.connected) break;

    // Outbound ACL check
    if ((dv.type === 'router' || dv.type === 'firewall') && exitIfName) {
      if (!checkInterfaceACL(dv, exitIfName, 'out', curSrcIP, curTargetIP, proto, port)) break;
    }

    const neighbor = exitIf.connected;
    const neighborDev = devices[neighbor.device];
    if (!neighborDev) break;

    if (neighborDev.type === 'switch') {
      // Determine the VLAN from the switch entry port
      const entrySwIf = neighborDev.interfaces[neighbor.iface];
      let entryVlan = 1;
      if (entrySwIf && entrySwIf.switchport) {
        if (entrySwIf.switchport.mode === 'access') {
          entryVlan = entrySwIf.switchport.accessVlan;
        } else if (entrySwIf.switchport.mode === 'trunk') {
          // Trunk port: resolve VLAN from target IP matching the switch's SVI subnets
          for (const [ifn, iff] of Object.entries(neighborDev.interfaces)) {
            if (!ifn.startsWith('Vlan') || !iff.ip || iff.status !== 'up') continue;
            if (getNetwork(iff.ip, iff.mask) === getNetwork(nextHopIP, iff.mask)) {
              entryVlan = getSVIVlan(ifn);
              break;
            }
          }
        }
      }

      // Always add switch to path (switches are L2 transit points, can appear multiple times)
      linkHints.push({ fromIf: exitIfName, toIf: neighbor.iface });
      path.push(neighbor.device);
      visited.add(neighbor.device);

      const targetDevId = findDeviceByIP(devices, nextHopIP);

      // L3 switch: if the next hop is the switch's own SVI (gateway), continue as L3 routing
      if (targetDevId === neighbor.device && switchHasSVI(neighborDev)) {
        curId = neighbor.device;
        continue;
      }

      if (!targetDevId || visited.has(targetDevId)) break;

      const swPath = bfsSwitchPath(devices, neighbor.device, targetDevId, entryVlan);
      for (const sid of swPath) {
        // Switch-to-switch links: find the connecting interfaces
        const prevSwId = path[path.length - 1];
        const prevSw = devices[prevSwId];
        let swFromIf = null, swToIf = null;
        for (const [ifn, iff] of Object.entries(prevSw.interfaces)) {
          if (iff.connected && iff.connected.device === sid) { swFromIf = ifn; swToIf = iff.connected.iface; break; }
        }
        linkHints.push({ fromIf: swFromIf, toIf: swToIf });
        path.push(sid);
        visited.add(sid);
      }

      // Switch-to-target: find the link where target interface has the target IP
      const lastSwId = path[path.length - 1];
      const targetDev = devices[targetDevId];
      let swToTargetFromIf = null, swToTargetToIf = null;
      for (const [ifName, iface] of Object.entries(targetDev.interfaces)) {
        if (iface.connected && iface.connected.device === lastSwId && iface.ip === nextHopIP) {
          swToTargetToIf = ifName;
          swToTargetFromIf = iface.connected.iface;
          break;
        }
      }
      // Fallback: first connected interface to the switch
      if (!swToTargetToIf) {
        for (const [ifName, iface] of Object.entries(targetDev.interfaces)) {
          if (iface.connected && iface.connected.device === lastSwId) {
            swToTargetToIf = ifName;
            swToTargetFromIf = iface.connected.iface;
            break;
          }
        }
      }
      linkHints.push({ fromIf: swToTargetFromIf, toIf: swToTargetToIf });
      path.push(targetDevId);
      visited.add(targetDevId);
      curId = targetDevId;
    } else {
      // Direct connection — verify next hop is reachable on connected device
      if (!deviceHasReachableIP(neighborDev, nextHopIP)) break;
      if (visited.has(neighbor.device)) break;
      linkHints.push({ fromIf: exitIfName, toIf: neighbor.iface });
      path.push(neighbor.device);
      visited.add(neighbor.device);
      curId = neighbor.device;
    }
  }
  return { path, linkHints };
}

// Determine ingress VLAN on a switch based on which device sent the packet
function findIngressVlanForPath(devices, sw, prevDevId) {
  for (const [ifName, iface] of Object.entries(sw.interfaces)) {
    if (!iface.switchport || !iface.connected || iface.status !== 'up') continue;
    if (iface.connected.device === prevDevId) {
      return iface.switchport.mode === 'access' ? iface.switchport.accessVlan : null;
    }
    // Check through other switches
    const connDev = devices[iface.connected.device];
    if (connDev && connDev.type === 'switch') {
      const vlan = iface.switchport.mode === 'access' ? iface.switchport.accessVlan : null;
      if (vlan != null && isReachableViaSwitch(devices, iface.connected.device, prevDevId, vlan)) return vlan;
    }
  }
  return null;
}

// Find the IP of the ingress interface on devId facing prevDevId
// prevDevId may be directly connected or reachable through switches
// ingressIfHint: if provided, the exact interface name to use (from linkHints)
function findIngressIP(devices, devId, prevDevId, ingressIfHint) {
  const dv = devices[devId];
  // Use hint if available
  if (ingressIfHint && dv.interfaces[ingressIfHint] && dv.interfaces[ingressIfHint].ip) {
    return dv.interfaces[ingressIfHint].ip;
  }
  // Collect all candidates and prefer by target IP match (same logic as tracePacketFlow)
  const candidates = [];
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!iface.connected || iface.status !== 'up' || !iface.ip) continue;
    if (iface.connected.device === prevDevId) {
      candidates.push(ifName);
    } else {
      const connDev = devices[iface.connected.device];
      if (connDev && connDev.type === 'switch') {
        const swIf = connDev.interfaces[iface.connected.iface];
        const vlan = swIf && swIf.switchport && swIf.switchport.mode === 'access' ? swIf.switchport.accessVlan : null;
        if (isReachableViaSwitch(devices, iface.connected.device, prevDevId, vlan)) candidates.push(ifName);
      }
    }
  }
  if (candidates.length > 0) return dv.interfaces[candidates[0]].ip;
  // Fallback: return first available IP
  for (const iface of Object.values(dv.interfaces)) {
    if (iface.ip && iface.status === 'up') return iface.ip;
  }
  return null;
}

// BFS: check if targetDevId is reachable from a switch without crossing L3 devices
// Check if a switch port carries the given VLAN
function portCarriesVlan(iface, vlan) {
  if (!iface.switchport) return true; // non-switchport (e.g. L3 interface) — allow
  if (iface.switchport.mode === 'access') return iface.switchport.accessVlan === vlan;
  if (iface.switchport.mode === 'trunk') {
    const allowed = iface.switchport.trunkAllowed;
    return allowed === 'all' || (Array.isArray(allowed) && allowed.includes(vlan));
  }
  return false;
}

// Find which interface on 'dv' connects to prevDevId (directly or via switch, VLAN-aware)
function findIngressIfViaSwitch(devices, dv, prevDevId) {
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!iface.connected || iface.status !== 'up') continue;
    if (iface.connected.device === prevDevId) return ifName;
    const connDev = devices[iface.connected.device];
    if (connDev && connDev.type === 'switch') {
      const swIf = connDev.interfaces[iface.connected.iface];
      const vlan = swIf && swIf.switchport && swIf.switchport.mode === 'access' ? swIf.switchport.accessVlan : null;
      if (isReachableViaSwitch(devices, iface.connected.device, prevDevId, vlan)) return ifName;
    }
  }
  return null;
}

// VLAN-aware BFS: check if targetDevId is reachable from a switch within a given VLAN
// If vlan is null, falls back to non-VLAN-aware behavior (for backward compatibility)
function isReachableViaSwitch(devices, startSwId, targetDevId, vlan) {
  const visited = new Set([startSwId]);
  const queue = [startSwId];
  while (queue.length > 0) {
    const curId = queue.shift();
    const sw = devices[curId];
    for (const [ifName, iface] of Object.entries(sw.interfaces)) {
      if (!iface.connected || iface.status !== 'up') continue;
      // VLAN check: if vlan is specified, only traverse ports that carry it
      if (vlan != null && !portCarriesVlan(iface, vlan)) continue;
      const connId = iface.connected.device;
      if (connId === targetDevId) return true;
      if (visited.has(connId)) continue;
      const connDev = devices[connId];
      if (connDev && connDev.type === 'switch') {
        visited.add(connId);
        queue.push(connId);
      }
    }
  }
  return false;
}

// VLAN-aware BFS: find path of intermediate switches to targetDevId within a VLAN
function bfsSwitchPath(devices, startSwId, targetDevId, vlan) {
  const queue = [{ id: startSwId, path: [] }];
  const visited = new Set([startSwId]);
  while (queue.length > 0) {
    const { id: curId, path: curPath } = queue.shift();
    const sw = devices[curId];
    for (const [ifName, iface] of Object.entries(sw.interfaces)) {
      if (iface.status !== 'up' || !iface.connected) continue;
      if (vlan != null && !portCarriesVlan(iface, vlan)) continue;
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

// ─── Traceroute ───

export function execTraceroute(targetIP, store, terminal, animateTraceroute) {
  const devices = store.getDevices();
  const currentDeviceId = store.getCurrentDeviceId();
  const d = store.getCurrentDevice();

  const srcIP = getUsableSrcIP(d);
  if (!srcIP) {
    terminal.write('% No source interface available — configure an interface with an IP and bring it up', 'error-line');
    return;
  }

  const reachable = canReach(devices, currentDeviceId, targetIP);
  if (reachable) {
    applyNATAlongPath(devices, currentDeviceId, srcIP, targetIP);
  }

  const { path, linkHints } = buildPingPath(devices, currentDeviceId, targetIP, reachable);

  // Learn ARP entries along the path
  buildArpAlongPath(devices, path);

  // Extract L3 hops (skip switches, skip the source device itself)
  // Each intermediate hop shows the ingress interface IP (ICMP Time Exceeded source)
  // If the final device's ingress IP differs from the target IP, add an extra hop for the target
  const hops = [];
  for (let i = 1; i < path.length; i++) {
    const dv = devices[path[i]];
    if (dv.type === 'switch') continue;
    const prevId = path[i - 1];
    // Find the linkHint whose toIf tells us the ingress interface on this device
    const hint = linkHints[i - 1];
    const ingressIfHint = hint ? hint.toIf : null;
    let hopIP = findIngressIP(devices, path[i], prevId, ingressIfHint);
    hops.push({ deviceId: path[i], hostname: dv.hostname, ip: hopIP || '*' });
  }
  // If reachable and the last hop's ingress IP is not the target IP,
  // add final hop only if the target IP actually exists on that device
  // (i.e. it's a different local interface, not a NAT-translated address)
  if (reachable && hops.length > 0) {
    const lastHop = hops[hops.length - 1];
    if (lastHop.ip !== targetIP) {
      const lastDev = devices[lastHop.deviceId];
      const targetIsLocal = lastDev && Object.values(lastDev.interfaces).some(
        iface => iface.ip === targetIP && iface.status === 'up'
      );
      if (targetIsLocal) {
        hops.push({ deviceId: lastHop.deviceId, hostname: lastHop.hostname, ip: targetIP });
      }
    }
  }

  terminal.write(`Tracing route to ${targetIP} over a maximum of 30 hops:\n`);

  if (path.length >= 2) {
    animateTraceroute(path, linkHints, reachable, () => {
      for (let i = 0; i < hops.length; i++) {
        const hop = hops[i];
        terminal.write(`  ${String(i + 1).padStart(2)}   <1ms  <1ms  <1ms  ${hop.ip}  (${hop.hostname})`);
      }
      if (!reachable) {
        const nextHopNum = hops.length > 0 ? hops.length + 1 : 1;
        terminal.write(`  ${String(nextHopNum).padStart(2)}   *   *   *   Request timed out.`, 'error-line');
      }
      terminal.write('\nTrace complete.');
    });
  } else {
    // Target is self or directly connected without path
    if (reachable) {
      terminal.write(`  1   <1ms  <1ms  <1ms  ${targetIP}`);
    } else {
      terminal.write('  1   *   *   *   Request timed out.', 'error-line');
    }
    terminal.write('\nTrace complete.');
  }
}

// ─── Packet flow trace (read-only diagnostics) ───

export function tracePacketFlow(devices, fromId, targetIP, proto, port) {
  const hops = [];
  const visited = new Set();
  let curId = fromId;
  let curSrcIP = null;
  let curTargetIP = targetIP;

  // Get source IP (bond-aware)
  const srcDev = devices[fromId];
  curSrcIP = getUsableSrcIP(srcDev);
  if (!curSrcIP) {
    return { hops: [{ deviceId: fromId, hostname: srcDev.hostname, deviceType: srcDev.type, ingressIf: null, decisions: [{ type: 'error', text: 'No source interface available' }], result: 'no-source' }], reachable: false };
  }

  let prevDevId = null;

  for (let step = 0; step < 20; step++) {
    if (visited.has(curId)) {
      hops.push({ deviceId: curId, hostname: devices[curId].hostname, deviceType: devices[curId].type, ingressIf: null, decisions: [{ type: 'error', text: 'Routing loop detected' }], result: 'loop' });
      return { hops, reachable: false };
    }
    visited.add(curId);
    const dv = devices[curId];
    const hop = { deviceId: curId, hostname: dv.hostname, deviceType: dv.type, ingressIf: null, decisions: [], result: 'forward' };

    // Find ingress interface (for step > 0)
    // When multiple interfaces connect to the same previous device (or via the same switch),
    // prefer the interface whose IP matches the target — this models L2/ARP-based delivery.
    if (step > 0 && prevDevId) {
      const candidates = [];
      for (const [ifName, iface] of Object.entries(dv.interfaces)) {
        if (!iface.connected || iface.status !== 'up') continue;
        if (iface.connected.device === prevDevId) {
          candidates.push(ifName);
        } else {
          const connDev = devices[iface.connected.device];
          if (connDev && connDev.type === 'switch') {
            const swIf = connDev.interfaces[iface.connected.iface];
            const vlan = swIf && swIf.switchport && swIf.switchport.mode === 'access' ? swIf.switchport.accessVlan : null;
            if (isReachableViaSwitch(devices, iface.connected.device, prevDevId, vlan)) {
              candidates.push(ifName);
            }
          }
        }
      }
      if (candidates.length > 0) {
        // Prefer the interface whose IP matches the packet's target
        hop.ingressIf = candidates.find(ifName => dv.interfaces[ifName].ip === curTargetIP) || candidates[0];
      }
      if (hop.ingressIf) {
        const inIface = dv.interfaces[hop.ingressIf];
        hop.decisions.push({ type: 'ingress', text: `Received on ${hop.ingressIf}${inIface.ip ? ' (' + inIface.ip + ')' : ''}` });
      }
    }

    // Switch handling: L2 transit or L3 routing via SVIs
    if (dv.type === 'switch') {
      if (switchHasSVI(dv)) {
        // L3 switch — check if target is on this device's SVI
        let localMatch = null;
        for (const [ifName, iface] of Object.entries(dv.interfaces)) {
          if (iface.ip === curTargetIP && iface.status === 'up') { localMatch = ifName; break; }
        }
        if (localMatch) {
          hop.decisions.push({ type: 'local-check', text: `Destination ${curTargetIP} matches SVI ${localMatch} -> REACHED` });
          hop.result = 'reached';
          hops.push(hop);
          return { hops, reachable: true };
        }

        // Find ingress SVI for ACL
        if (step > 0 && prevDevId) {
          const ingressVlan = findIngressVlanForPath(devices, dv, prevDevId);
          if (ingressVlan != null) {
            const ingressSVI = 'Vlan' + ingressVlan;
            const svi = dv.interfaces[ingressSVI];
            if (svi && svi.ip && svi.status === 'up') {
              hop.ingressIf = ingressSVI;
              hop.decisions.push({ type: 'ingress', text: `L3 received on ${ingressSVI} (${svi.ip})` });
              const aclInInfo = describeInterfaceACL(dv, ingressSVI, 'in', curSrcIP, curTargetIP, proto, port);
              if (aclInInfo.description) {
                hop.decisions.push({ type: 'acl', text: aclInInfo.description + (aclInInfo.allowed ? ' -> PERMIT' : ' -> DENY') });
              }
              if (!aclInInfo.allowed) {
                hop.result = 'dropped';
                hops.push(hop);
                return { hops, reachable: false };
              }
            }
          }
        }

        // Route lookup
        const routeInfo = describeRouteLookup(dv, curTargetIP);
        hop.decisions.push({ type: 'route-lookup', text: routeInfo.description });
        const nextHop = routeInfo.nextHop || lookupRoute(dv, curTargetIP);

        // Find egress SVI
        const resolvedIP = nextHop || curTargetIP;
        let egressSVI = null;
        for (const [ifName, iface] of Object.entries(dv.interfaces)) {
          if (!ifName.startsWith('Vlan') || !iface.ip || iface.status !== 'up') continue;
          if (getNetwork(iface.ip, iface.mask) === getNetwork(resolvedIP, iface.mask)) {
            egressSVI = ifName; break;
          }
        }
        if (!egressSVI) {
          hop.result = 'no-route';
          hops.push(hop);
          return { hops, reachable: false };
        }

        // Outbound ACL on egress SVI
        const aclOutInfo = describeInterfaceACL(dv, egressSVI, 'out', curSrcIP, curTargetIP, proto, port);
        if (aclOutInfo.description) {
          hop.decisions.push({ type: 'acl', text: aclOutInfo.description + (aclOutInfo.allowed ? ' -> PERMIT' : ' -> DENY') });
        }
        if (!aclOutInfo.allowed) {
          hop.result = 'dropped';
          hops.push(hop);
          return { hops, reachable: false };
        }

        hop.decisions.push({ type: 'forward', text: `Exit ${egressSVI} -> L2 delivery to ${resolvedIP}` });
        hops.push(hop);

        // Find target device and continue
        const l3TargetId = findDeviceByIP(devices, resolvedIP);
        if (l3TargetId && !visited.has(l3TargetId)) {
          prevDevId = curId;
          curId = l3TargetId;
        } else {
          return { hops, reachable: false };
        }
        continue;
      }

      // Pure L2 switch transit
      hop.decisions.push({ type: 'l2-switch', text: 'L2 transit (forwarding by MAC address)' });
      hop.result = 'transit';
      hops.push(hop);
      const l2TargetId = findDeviceByIP(devices, curTargetIP);
      if (l2TargetId && !visited.has(l2TargetId)) {
        prevDevId = curId;
        curId = l2TargetId;
      } else {
        return { hops, reachable: false };
      }
      continue;
    }

    // Check if target is on this device (bond-aware)
    // For firewalls: policy check must happen first, even for locally-destined traffic
    if (dv.type !== 'firewall' && deviceHasReachableIP(dv, curTargetIP)) {
      let localMatch = null;
      for (const [ifName, iface] of Object.entries(dv.interfaces)) {
        if (iface.ip === curTargetIP) { localMatch = ifName; break; }
      }
      hop.decisions.push({ type: 'local-check', text: `Destination ${curTargetIP} matches local interface ${localMatch || '(bond)'} -> REACHED` });
      hop.result = 'reached';
      hops.push(hop);
      return { hops, reachable: true };
    }
    if (dv.type !== 'firewall') {
      hop.decisions.push({ type: 'local-check', text: `Destination ${curTargetIP} is not on this device` });
    }

    // Firewall: DNAT → policy → SNAT (CheckPoint/UTX200 order)
    if (dv.type === 'firewall' && step > 0) {
      // DNAT (pre-policy): translate destination IP
      if (dv.nat && hop.ingressIf) {
        const dnatInfo = describeDNAT(dv, curSrcIP, curTargetIP, hop.ingressIf);
        if (dnatInfo.description) {
          hop.decisions.push({ type: 'nat', text: dnatInfo.description });
        }
        if (dnatInfo.translated) {
          curSrcIP = dnatInfo.srcIP;
          curTargetIP = dnatInfo.dstIP;
        }
      }

      // Firewall policy check (post-DNAT, pre-SNAT)
      const fwInfo = describeFirewallCheck(dv, curSrcIP, curTargetIP, proto, port);
      if (fwInfo.description) {
        hop.decisions.push({ type: 'firewall', text: fwInfo.description });
      }
      if (!fwInfo.allowed) {
        hop.result = 'dropped';
        hops.push(hop);
        return { hops, reachable: false };
      }

      // Firewall local delivery: checked AFTER policy
      if (deviceHasReachableIP(dv, curTargetIP)) {
        let localMatch = null;
        for (const [ifName, iface] of Object.entries(dv.interfaces)) {
          if (iface.ip === curTargetIP) { localMatch = ifName; break; }
        }
        hop.decisions.push({ type: 'local-check', text: `Destination ${curTargetIP} matches local interface ${localMatch} -> REACHED` });
        hop.result = 'reached';
        hops.push(hop);
        return { hops, reachable: true };
      }
      hop.decisions.push({ type: 'local-check', text: `Destination ${curTargetIP} is not on this device` });

      // Inbound ACL check
      if (hop.ingressIf) {
        const aclInInfo = describeInterfaceACL(dv, hop.ingressIf, 'in', curSrcIP, curTargetIP, proto, port);
        if (aclInInfo.description) {
          hop.decisions.push({ type: 'acl', text: aclInInfo.description + (aclInInfo.allowed ? ' -> PERMIT' : ' -> DENY') });
        }
        if (!aclInInfo.allowed) {
          hop.result = 'dropped';
          hops.push(hop);
          return { hops, reachable: false };
        }
      }

      // SNAT (post-policy): translate source IP
      if (dv.nat && hop.ingressIf) {
        const snatInfo = describeSNAT(dv, curSrcIP, curTargetIP, hop.ingressIf);
        if (snatInfo.description) {
          hop.decisions.push({ type: 'nat', text: snatInfo.description });
        }
        if (snatInfo.translated) {
          curSrcIP = snatInfo.srcIP;
          curTargetIP = snatInfo.dstIP;
        }
      }
    }

    // Non-firewall router: NAT first, then ACL (Cisco IOS order)
    if (dv.type !== 'firewall' && (dv.type === 'router') && dv.nat && step > 0 && hop.ingressIf) {
      const natInfo = describeNAT(dv, curSrcIP, curTargetIP, hop.ingressIf);
      if (natInfo.description) {
        hop.decisions.push({ type: 'nat', text: natInfo.description });
      }
      if (natInfo.translated) {
        curSrcIP = natInfo.srcIP;
        curTargetIP = natInfo.dstIP;
        for (const [ifName, iface] of Object.entries(dv.interfaces)) {
          if (iface.ip === curTargetIP && iface.status === 'up') {
            hop.decisions.push({ type: 'local-check', text: `After NAT: ${curTargetIP} matches local interface ${ifName} -> REACHED` });
            hop.result = 'reached';
            hops.push(hop);
            return { hops, reachable: true };
          }
        }
      }
    }
    if (dv.type !== 'firewall' && (dv.type === 'router') && step > 0 && hop.ingressIf) {
      const aclInInfo = describeInterfaceACL(dv, hop.ingressIf, 'in', curSrcIP, curTargetIP, proto, port);
      if (aclInInfo.description) {
        hop.decisions.push({ type: 'acl', text: aclInInfo.description + (aclInInfo.allowed ? ' -> PERMIT' : ' -> DENY') });
      }
      if (!aclInInfo.allowed) {
        hop.result = 'dropped';
        hops.push(hop);
        return { hops, reachable: false };
      }
    }

    // Route lookup
    const routeInfo = describeRouteLookup(dv, curTargetIP);
    hop.decisions.push({ type: 'route-lookup', text: routeInfo.description });

    const nextHop = routeInfo.nextHop || lookupRoute(dv, curTargetIP);

    // Tunnel forwarding check
    if ((dv.type === 'router' || dv.type === 'firewall')) {
      const resolvedForTunnel = nextHop || curTargetIP;
      const tunnelMatch = findTunnelForTarget(dv, resolvedForTunnel);
      if (tunnelMatch) {
        const tunnelDest = tunnelMatch.iface.tunnel?.destination;
        if (tunnelDest) {
          const peerDevId = findTunnelPeerDevice(devices, tunnelDest);
          if (peerDevId && !visited.has(peerDevId)) {
            hop.decisions.push({ type: 'forward', text: `Encapsulate via ${tunnelMatch.ifName} (tunnel dest ${tunnelDest})` });
            hops.push(hop);
            prevDevId = curId;
            curId = peerDevId;
            continue;
          }
        }
        hop.decisions.push({ type: 'error', text: `Tunnel ${tunnelMatch.ifName} destination unreachable` });
        hop.result = 'no-route';
        hops.push(hop);
        return { hops, reachable: false };
      }
    }

    // Find egress interface (bond-aware)
    if (!nextHop) {
      // Directly connected — find the egress interface
      let egressIf = null;
      for (const ui of getUsableInterfaces(dv)) {
        if (getNetwork(ui.ip, ui.mask) === getNetwork(curTargetIP, ui.mask)) {
          egressIf = ui.ifName; break;
        }
      }
      if (!egressIf) {
        hop.result = 'no-route';
        hops.push(hop);
        return { hops, reachable: false };
      }
      // Outbound ACL check
      if (dv.type === 'router' || dv.type === 'firewall') {
        const aclOutInfo = describeInterfaceACL(dv, egressIf, 'out', curSrcIP, curTargetIP, proto, port);
        if (aclOutInfo.description) {
          hop.decisions.push({ type: 'acl', text: aclOutInfo.description + (aclOutInfo.allowed ? ' -> PERMIT' : ' -> DENY') });
        }
        if (!aclOutInfo.allowed) {
          hop.result = 'dropped';
          hops.push(hop);
          return { hops, reachable: false };
        }
      }
      hop.decisions.push({ type: 'forward', text: `Exit ${egressIf} -> L2 delivery to ${curTargetIP}` });
      hops.push(hop);
      const exitIface = dv.interfaces[egressIf];
      if (!exitIface.connected) return { hops, reachable: false };
      // If connected to a switch, add switch transit hop and find target via BFS
      const nextDev = devices[exitIface.connected.device];
      if (nextDev && nextDev.type === 'switch') {
        const swId = exitIface.connected.device;
        visited.add(swId);
        hops.push({ deviceId: swId, hostname: nextDev.hostname, deviceType: 'switch', ingressIf: exitIface.connected.iface, decisions: [{ type: 'l2-switch', text: 'L2 transit (forwarding by MAC address)' }], result: 'transit' });
        const l2Target = findDeviceByIP(devices, curTargetIP);
        if (l2Target && !visited.has(l2Target)) {
          prevDevId = swId;
          curId = l2Target;
        } else {
          return { hops, reachable: false };
        }
      } else {
        prevDevId = curId;
        curId = exitIface.connected.device;
      }
      continue;
    }

    // Has a next hop — find egress interface toward it (bond-aware)
    let egressIf = null;
    for (const ui of getUsableInterfaces(dv)) {
      if (getNetwork(ui.ip, ui.mask) === getNetwork(nextHop, ui.mask)) {
        egressIf = ui.ifName; break;
      }
    }
    if (!egressIf) {
      hop.decisions.push({ type: 'error', text: `No egress interface for next hop ${nextHop}` });
      hop.result = 'no-route';
      hops.push(hop);
      return { hops, reachable: false };
    }
    // Outbound ACL check
    if (dv.type === 'router' || dv.type === 'firewall') {
      const aclOutInfo = describeInterfaceACL(dv, egressIf, 'out', curSrcIP, curTargetIP, proto, port);
      if (aclOutInfo.description) {
        hop.decisions.push({ type: 'acl', text: aclOutInfo.description + (aclOutInfo.allowed ? ' -> PERMIT' : ' -> DENY') });
      }
      if (!aclOutInfo.allowed) {
        hop.result = 'dropped';
        hops.push(hop);
        return { hops, reachable: false };
      }
    }
    hop.decisions.push({ type: 'forward', text: `Exit ${egressIf} -> next hop ${nextHop}` });
    hops.push(hop);

    const exitIface = dv.interfaces[egressIf];
    if (!exitIface.connected) return { hops, reachable: false };
    // If connected to a switch, add switch transit hop and find next-hop device via BFS
    const nextDev2 = devices[exitIface.connected.device];
    if (nextDev2 && nextDev2.type === 'switch') {
      const swId = exitIface.connected.device;
      const nhDevId = findDeviceByIP(devices, nextHop);
      // L3 switch: if next hop is the switch's own SVI, continue as L3 routing on the switch
      if (nhDevId === swId && switchHasSVI(nextDev2)) {
        prevDevId = curId;
        curId = swId;
      } else {
        visited.add(swId);
        hops.push({ deviceId: swId, hostname: nextDev2.hostname, deviceType: 'switch', ingressIf: exitIface.connected.iface, decisions: [{ type: 'l2-switch', text: 'L2 transit (forwarding by MAC address)' }], result: 'transit' });
        if (nhDevId && !visited.has(nhDevId)) {
          prevDevId = swId;
          curId = nhDevId;
        } else {
          hops[hops.length - 1].decisions.push({ type: 'error', text: `Next hop ${nextHop} not found on L2 segment` });
          return { hops, reachable: false };
        }
      }
    } else {
      // Direct connection — verify next hop is reachable on connected device
      const connDevId = exitIface.connected.device;
      if (!deviceHasReachableIP(devices[connDevId], nextHop)) {
        hop.decisions.push({ type: 'error', text: `Next hop ${nextHop} is not reachable (no ARP response)` });
        hop.result = 'no-route';
        return { hops, reachable: false };
      }
      prevDevId = curId;
      curId = connDevId;
    }
  }

  return { hops, reachable: false };
}

// ─── ARP resolution computation (for visualization) ───

// Get all devices on the same L2 broadcast domain reachable from a switch
function getL2BroadcastDomain(devices, switchId, excludeDeviceId, vlan) {
  const result = [];
  const visitedSwitches = new Set([switchId]);
  const queue = [switchId];
  while (queue.length > 0) {
    const curSwId = queue.shift();
    const sw = devices[curSwId];
    for (const [ifName, iface] of Object.entries(sw.interfaces)) {
      if (!iface.connected || iface.status !== 'up') continue;
      // VLAN check: only traverse ports that carry the broadcast VLAN
      if (vlan != null && !portCarriesVlan(iface, vlan)) continue;
      const connId = iface.connected.device;
      if (connId === excludeDeviceId) continue;
      const connDev = devices[connId];
      if (!connDev) continue;
      if (connDev.type === 'switch') {
        if (!visitedSwitches.has(connId)) {
          visitedSwitches.add(connId);
          queue.push(connId);
        }
      } else {
        // Non-switch device on this L2 segment (within the same VLAN)
        if (!result.find(r => r.deviceId === connId)) {
          result.push({ deviceId: connId, viaSwitch: curSwId, switchIf: ifName, deviceIf: iface.connected.iface });
        }
      }
    }
  }
  return result;
}

// Compute ARP resolutions needed along a ping path (before ARP table is populated)
export function computeArpResolutions(devices, path, linkHints) {
  const resolutions = [];

  for (let i = 0; i < path.length; i++) {
    const dv = devices[path[i]];
    if (dv.type === 'switch') continue;

    // Look at the next L3 device in the forward direction
    let j = i + 1;
    while (j < path.length && devices[path[j]].type === 'switch') j++;
    if (j >= path.length) continue;
    const peer = devices[path[j]];
    if (peer.type === 'switch') continue;

    // Find the egress interface on dv toward peer (using linkHints if available)
    let egressIfName = null;
    let egressIface = null;
    const hint = linkHints[i];
    if (hint && hint.fromIf && dv.interfaces[hint.fromIf]) {
      egressIfName = hint.fromIf;
      egressIface = dv.interfaces[hint.fromIf];
    } else {
      for (const [ifName, iface] of Object.entries(dv.interfaces)) {
        if (!iface.connected || iface.status !== 'up' || !iface.ip) continue;
        const connDev = devices[iface.connected.device];
        let reaches = iface.connected.device === path[j];
        if (!reaches && connDev && connDev.type === 'switch') {
          const swIf = connDev.interfaces[iface.connected.iface];
          const vl = swIf && swIf.switchport && swIf.switchport.mode === 'access' ? swIf.switchport.accessVlan : null;
          reaches = isReachableViaSwitch(devices, iface.connected.device, path[j], vl);
        }
        if (reaches) { egressIfName = ifName; egressIface = iface; break; }
      }
    }
    if (!egressIfName || !egressIface) continue;

    // Find peer's ingress interface IP (the IP we need to ARP for)
    // Use linkHint for the segment arriving at peer
    let peerIfName = null;
    let peerIface = null;
    const peerHint = linkHints[j - 1];
    if (peerHint && peerHint.toIf && peer.interfaces[peerHint.toIf]) {
      peerIfName = peerHint.toIf;
      peerIface = peer.interfaces[peerIfName];
    } else {
      for (const [pifName, pif] of Object.entries(peer.interfaces)) {
        if (!pif.ip || pif.status !== 'up' || !pif.connected) continue;
        let connects = pif.connected.device === path[i];
        if (!connects) {
          const pc = devices[pif.connected.device];
          if (pc && pc.type === 'switch') {
            const swIf2 = pc.interfaces[pif.connected.iface];
            const vl2 = swIf2 && swIf2.switchport && swIf2.switchport.mode === 'access' ? swIf2.switchport.accessVlan : null;
            connects = isReachableViaSwitch(devices, pif.connected.device, path[i], vl2);
          }
        }
        if (connects && getNetwork(egressIface.ip, egressIface.mask) === getNetwork(pif.ip, pif.mask)) {
          peerIfName = pifName; peerIface = pif; break;
        }
      }
    }
    if (!peerIfName || !peerIface || !peerIface.ip) continue;

    const targetIP = peerIface.ip;

    // Check if ARP entry already exists
    if (dv.arpTable && dv.arpTable.find(e => e.ip === targetIP && e.iface === egressIfName)) continue;

    // Build the ARP resolution data
    const resolution = {
      requesterId: path[i],
      requesterIf: egressIfName,
      requesterIP: egressIface.ip,
      targetIP: targetIP,
      targetId: path[j],
      targetIf: peerIfName,
      targetMAC: generateMAC(path[j], peerIfName),
      // Broadcast domain info
      broadcastTargets: [],  // all L2 devices that receive the broadcast
      switchPath: [],        // switches between requester and the L2 segment
    };

    // Determine if there's a switch between requester and peer
    const connDev = devices[egressIface.connected.device];
    if (connDev && connDev.type === 'switch') {
      const switchId = egressIface.connected.device;
      const swEntryIf = connDev.interfaces[egressIface.connected.iface];
      const arpVlan = swEntryIf && swEntryIf.switchport && swEntryIf.switchport.mode === 'access' ? swEntryIf.switchport.accessVlan : null;
      resolution.switchPath = [switchId];
      resolution.broadcastTargets = getL2BroadcastDomain(devices, switchId, path[i], arpVlan);
    } else {
      // Direct connection (point-to-point) — only the peer receives
      resolution.broadcastTargets = [{ deviceId: path[j], viaSwitch: null, switchIf: null, deviceIf: peerIfName }];
    }

    resolutions.push(resolution);
  }
  return resolutions;
}

// ─── ARP table building ───

// Learn ARP entries for adjacent L3 devices along a path
function buildArpAlongPath(devices, path) {
  for (let i = 0; i < path.length; i++) {
    const dv = devices[path[i]];
    if (dv.type === 'switch') continue;
    if (!dv.arpTable) dv.arpTable = [];

    // Look forward and backward for adjacent L3 devices (skipping switches)
    for (const dir of [-1, 1]) {
      let j = i + dir;
      // Skip switches to find the next L3 device
      while (j >= 0 && j < path.length && devices[path[j]].type === 'switch') j += dir;
      if (j < 0 || j >= path.length) continue;
      const peer = devices[path[j]];
      if (peer.type === 'switch') continue;

      // Find the directly connected interface pair between dv and the adjacent device (possibly through switches)
      for (const [ifName, iface] of Object.entries(dv.interfaces)) {
        if (!iface.connected || iface.status !== 'up' || !iface.ip) continue;
        // Check if this interface leads to the peer (directly or via switch)
        const connDev = devices[iface.connected.device];
        let reachesPeer = false;
        if (iface.connected.device === path[j]) {
          reachesPeer = true;
        } else if (connDev && connDev.type === 'switch') {
          const swIf = connDev.interfaces[iface.connected.iface];
          const vl = swIf && swIf.switchport && swIf.switchport.mode === 'access' ? swIf.switchport.accessVlan : null;
          reachesPeer = isReachableViaSwitch(devices, iface.connected.device, path[j], vl);
        }
        if (!reachesPeer) continue;

        // Find peer's interface facing us
        for (const [peerIfName, peerIface] of Object.entries(peer.interfaces)) {
          if (!peerIface.ip || peerIface.status !== 'up') continue;
          if (!peerIface.connected) continue;
          let connectsBack = false;
          if (peerIface.connected.device === path[i]) {
            connectsBack = true;
          } else {
            const peerConn = devices[peerIface.connected.device];
            if (peerConn && peerConn.type === 'switch') {
              const pSwIf = peerConn.interfaces[peerIface.connected.iface];
              const pVl = pSwIf && pSwIf.switchport && pSwIf.switchport.mode === 'access' ? pSwIf.switchport.accessVlan : null;
              connectsBack = isReachableViaSwitch(devices, peerIface.connected.device, path[i], pVl);
            }
          }
          if (!connectsBack) continue;

          // Check if peer IP is in our subnet (use sender's mask — ARP is based on sender's view)
          if (getNetwork(iface.ip, iface.mask) !== getNetwork(peerIface.ip, iface.mask)) continue;

          // Add ARP entry: we learned peer's IP → peer's MAC via our interface
          const peerMAC = generateMAC(path[j], peerIfName);
          const existing = dv.arpTable.find(e => e.ip === peerIface.ip && e.iface === ifName);
          if (!existing) {
            dv.arpTable.push({ ip: peerIface.ip, mac: peerMAC, iface: ifName });
          }
          // Continue to learn all reachable peer interfaces in the same subnet
        }
        break; // Only need one local egress interface
      }
    }
  }
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
    if ((dv.type === 'router' || dv.type === 'firewall') && dv.nat) {
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
