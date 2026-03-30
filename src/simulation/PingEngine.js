// ─── Ping path building and execution ───
import { getNetwork, generateMAC } from './NetworkUtils.js';
import { canReach, lookupRoute, findDeviceByIP, applyNAT, checkFirewallPolicies } from './Routing.js';

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

  // Learn ARP entries along the path
  buildArpAlongPath(devices, path);

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

    // Apply NAT at routers/firewalls — update curTargetIP for subsequent path decisions
    if ((dv.type === 'router' || dv.type === 'firewall') && dv.nat && step > 0) {
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

    // Firewall policy check — if denied, stop path here
    if (dv.type === 'firewall' && step > 0) {
      if (!checkFirewallPolicies(dv, curSrcIP, curTargetIP)) break;
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

// Find the IP of the ingress interface on devId facing prevDevId
// prevDevId may be directly connected or reachable through switches
function findIngressIP(devices, devId, prevDevId) {
  const dv = devices[devId];
  for (const [ifName, iface] of Object.entries(dv.interfaces)) {
    if (!iface.connected || iface.status !== 'up' || !iface.ip) continue;
    // Direct connection
    if (iface.connected.device === prevDevId) return iface.ip;
    // Connection through switch(es): check if prevDevId is reachable via this interface's connected switch
    const connDev = devices[iface.connected.device];
    if (connDev && connDev.type === 'switch') {
      if (isReachableViaSwitch(devices, iface.connected.device, prevDevId)) return iface.ip;
    }
  }
  // Fallback: return first available IP
  for (const iface of Object.values(dv.interfaces)) {
    if (iface.ip && iface.status === 'up') return iface.ip;
  }
  return null;
}

// BFS: check if targetDevId is reachable from a switch without crossing L3 devices
function isReachableViaSwitch(devices, startSwId, targetDevId) {
  const visited = new Set([startSwId]);
  const queue = [startSwId];
  while (queue.length > 0) {
    const curId = queue.shift();
    const sw = devices[curId];
    for (const iface of Object.values(sw.interfaces)) {
      if (!iface.connected || iface.status !== 'up') continue;
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

// ─── Traceroute ───

export function execTraceroute(targetIP, store, terminal, animateTraceroute) {
  const devices = store.getDevices();
  const currentDeviceId = store.getCurrentDeviceId();
  const d = store.getCurrentDevice();

  let srcIP = null;
  for (const iface of Object.values(d.interfaces)) {
    if (iface.status === 'up' && iface.ip) { srcIP = iface.ip; break; }
  }
  if (!srcIP) {
    terminal.write('% No source interface available — configure an interface with an IP and bring it up', 'error-line');
    return;
  }

  const reachable = canReach(devices, currentDeviceId, targetIP);
  if (reachable) {
    applyNATAlongPath(devices, currentDeviceId, srcIP, targetIP);
  }

  const path = buildPingPath(devices, currentDeviceId, targetIP, reachable);

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
    let hopIP = findIngressIP(devices, path[i], prevId);
    hops.push({ deviceId: path[i], hostname: dv.hostname, ip: hopIP || '*' });
  }
  // If reachable and the last hop's ingress IP is not the target IP,
  // the target is on a different interface of the same device — add final hop
  if (reachable && hops.length > 0) {
    const lastHop = hops[hops.length - 1];
    if (lastHop.ip !== targetIP) {
      hops.push({ deviceId: lastHop.deviceId, hostname: lastHop.hostname, ip: targetIP });
    }
  }

  terminal.write(`Tracing route to ${targetIP} over a maximum of 30 hops:\n`);

  if (path.length >= 2) {
    animateTraceroute(path, reachable, () => {
      for (let i = 0; i < hops.length; i++) {
        const hop = hops[i];
        terminal.write(`  ${String(i + 1).padStart(2)}   <1ms  <1ms  <1ms  ${hop.ip}  (${hop.hostname})`);
      }
      if (!reachable) {
        const nextHop = hops.length + 1;
        terminal.write(`  ${String(nextHop).padStart(2)}   *   *   *   Request timed out.`, 'error-line');
      }
      if (hops.length === 0 && !reachable) {
        terminal.write('  1   *   *   *   Request timed out.', 'error-line');
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
          reachesPeer = isReachableViaSwitch(devices, iface.connected.device, path[j]);
        }
        if (!reachesPeer) continue;

        // Find peer's interface facing us
        for (const [peerIfName, peerIface] of Object.entries(peer.interfaces)) {
          if (!peerIface.ip || peerIface.status !== 'up') continue;
          // Check this peer interface connects back to us (directly or via switch)
          if (!peerIface.connected) continue;
          let connectsBack = false;
          if (peerIface.connected.device === path[i]) {
            connectsBack = true;
          } else {
            const peerConn = devices[peerIface.connected.device];
            if (peerConn && peerConn.type === 'switch') {
              connectsBack = isReachableViaSwitch(devices, peerIface.connected.device, path[i]);
            }
          }
          if (!connectsBack) continue;

          // Check same subnet
          if (getNetwork(iface.ip, iface.mask) !== getNetwork(peerIface.ip, peerIface.mask)) continue;

          // Add ARP entry: we learned peer's IP → peer's MAC via our interface
          const peerMAC = generateMAC(path[j], peerIfName);
          const existing = dv.arpTable.find(e => e.ip === peerIface.ip && e.iface === ifName);
          if (!existing) {
            dv.arpTable.push({ ip: peerIface.ip, mac: peerMAC, iface: ifName });
          }
          break;
        }
        break;
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
