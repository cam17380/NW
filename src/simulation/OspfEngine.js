// ─── OSPF Engine: simplified neighbor discovery and route computation ───
import { ipToInt, intToIP, getNetwork } from './NetworkUtils.js';

// Check if interface IP matches an OSPF network statement (wildcard mask logic)
function matchesOspfNetwork(ifIP, netIP, wildcard) {
  const i = ipToInt(ifIP);
  const n = ipToInt(netIP);
  const w = ipToInt(wildcard);
  return (i & ~w) === (n & ~w);
}

// Convert wildcard mask to subnet mask
export function wildcardToMask(wildcard) {
  return intToIP((~ipToInt(wildcard)) >>> 0);
}

// Get router ID: configured or auto (highest interface IP)
export function getRouterId(dv) {
  if (dv.ospf && dv.ospf.routerId) return dv.ospf.routerId;
  let highest = null;
  for (const iface of Object.values(dv.interfaces)) {
    if (!iface.ip) continue;
    if (!highest || ipToInt(iface.ip) > ipToInt(highest)) highest = iface.ip;
  }
  return highest || '0.0.0.0';
}

// Get all interfaces on dv covered by any OSPF network statement and currently up
function getOspfInterfaces(dv) {
  if (!dv.ospf || !dv.ospf.processes) return [];
  const result = [];
  const seen = new Set();
  for (const proc of Object.values(dv.ospf.processes)) {
    for (const stmt of proc.networks) {
      for (const [ifName, iface] of Object.entries(dv.interfaces)) {
        if (!iface.ip || iface.status !== 'up') continue;
        if (seen.has(ifName)) continue;
        if (matchesOspfNetwork(iface.ip, stmt.ip, stmt.wildcard)) {
          seen.add(ifName);
          result.push({ ifName, iface });
        }
      }
    }
  }
  return result;
}

// Same as above but restricted to a single process's network statements (for per-process show)
export function getOspfProcessInterfaces(dv, proc) {
  const result = [];
  const seen = new Set();
  for (const stmt of proc.networks) {
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      if (!iface.ip || iface.status !== 'up') continue;
      if (seen.has(ifName)) continue;
      if (matchesOspfNetwork(iface.ip, stmt.ip, stmt.wildcard)) {
        seen.add(ifName);
        result.push({ ifName, iface });
      }
    }
  }
  return result;
}

function hasOspfEnabled(dv) {
  if (!dv.ospf || !dv.ospf.processes) return false;
  for (const proc of Object.values(dv.ospf.processes)) {
    if (proc.networks.length > 0) return true;
  }
  return false;
}

// Check if two interfaces share the same L2 broadcast domain
// (directly cabled, or reachable through one or more switches honoring VLAN membership)
function portCarriesVlan(iface, vlan) {
  if (!iface.switchport) return false;
  if (iface.switchport.mode === 'access') return iface.switchport.accessVlan === vlan;
  if (iface.switchport.mode === 'trunk') {
    const allowed = iface.switchport.trunkAllowed;
    return allowed === 'all' || (Array.isArray(allowed) && allowed.includes(vlan));
  }
  return false;
}

function interfacesL2Reachable(devices, devId1, ifName1, devId2, ifName2) {
  const dv1 = devices[devId1];
  const if1 = dv1 && dv1.interfaces[ifName1];
  if (!if1 || if1.status !== 'up' || !if1.connected) return false;

  // Direct cable
  if (if1.connected.device === devId2 && if1.connected.iface === ifName2) {
    const if2 = devices[devId2] && devices[devId2].interfaces[ifName2];
    return !!(if2 && if2.status === 'up');
  }

  // Otherwise must traverse a switch fabric
  const entrySwId = if1.connected.device;
  const entrySw = devices[entrySwId];
  const entryPort = entrySw && entrySw.interfaces[if1.connected.iface];
  if (!entrySw || entrySw.type !== 'switch' || !entryPort || entryPort.status !== 'up') return false;

  // Determine VLAN from the entry switch port (router IFs are untagged)
  let vlan = 1;
  if (entryPort.switchport && entryPort.switchport.mode === 'access') {
    vlan = entryPort.switchport.accessVlan;
  }

  const visited = new Set([entrySwId]);
  const queue = [entrySwId];
  while (queue.length > 0) {
    const curId = queue.shift();
    const sw = devices[curId];
    for (const swIf of Object.values(sw.interfaces)) {
      if (swIf.status !== 'up' || !swIf.connected || !swIf.switchport) continue;
      if (!portCarriesVlan(swIf, vlan)) continue;
      if (swIf.connected.device === devId2 && swIf.connected.iface === ifName2) {
        const if2 = devices[devId2] && devices[devId2].interfaces[ifName2];
        if (if2 && if2.status === 'up') return true;
      }
      const peerDev = devices[swIf.connected.device];
      if (peerDev && peerDev.type === 'switch' && !visited.has(swIf.connected.device)) {
        visited.add(swIf.connected.device);
        queue.push(swIf.connected.device);
      }
    }
  }
  return false;
}

// Build OSPF neighbor graph: Map<routerId, [{neighborId, localIfName, localIP, neighborIP}]>
function buildNeighborGraph(devices) {
  const ospfRouters = Object.keys(devices).filter(id => {
    const dv = devices[id];
    return (dv.type === 'router' || dv.type === 'firewall') && hasOspfEnabled(dv);
  });

  const graph = new Map();
  for (const id of ospfRouters) graph.set(id, []);

  for (let i = 0; i < ospfRouters.length; i++) {
    for (let j = i + 1; j < ospfRouters.length; j++) {
      const id1 = ospfRouters[i], id2 = ospfRouters[j];
      const dv1 = devices[id1], dv2 = devices[id2];
      const ifs1 = getOspfInterfaces(dv1);
      const ifs2 = getOspfInterfaces(dv2);

      for (const of1 of ifs1) {
        for (const of2 of ifs2) {
          if (!of1.iface.mask || !of2.iface.mask) continue;
          if (of1.iface.mask !== of2.iface.mask) continue;
          const net1 = getNetwork(of1.iface.ip, of1.iface.mask);
          const net2 = getNetwork(of2.iface.ip, of2.iface.mask);
          if (net1 !== net2) continue;
          // Same subnet — verify L2 reachability before forming adjacency
          if (!interfacesL2Reachable(devices, id1, of1.ifName, id2, of2.ifName)) continue;
          graph.get(id1).push({ neighborId: id2, localIfName: of1.ifName, localIP: of1.iface.ip, neighborIP: of2.iface.ip });
          graph.get(id2).push({ neighborId: id1, localIfName: of2.ifName, localIP: of2.iface.ip, neighborIP: of1.iface.ip });
        }
      }
    }
  }

  return graph;
}

// Recompute and store OSPF routes on all routers
export function recomputeAllOspf(devices) {
  // Clear previous OSPF routes for all devices
  for (const dv of Object.values(devices)) {
    dv.ospfRoutes = [];
  }

  const graph = buildNeighborGraph(devices);

  for (const [routerId, directNeighbors] of graph) {
    const dv = devices[routerId];

    // BFS through OSPF neighbor graph to collect routes
    const visited = new Set([routerId]);
    // Each queue item: {id, nextHop (IP to use as next-hop for routes from this node)}
    const queue = [];
    for (const n of directNeighbors) {
      if (!visited.has(n.neighborId)) {
        visited.add(n.neighborId);
        queue.push({ id: n.neighborId, nextHop: n.neighborIP });
      }
    }

    while (queue.length > 0) {
      const { id: curId, nextHop } = queue.shift();
      const curDv = devices[curId];

      // Advertise curDv's OSPF-covered subnets to routerId
      for (const { iface } of getOspfInterfaces(curDv)) {
        const net = getNetwork(iface.ip, iface.mask);
        const already = dv.ospfRoutes.find(r => r.network === net && r.mask === iface.mask);
        if (!already) {
          dv.ospfRoutes.push({ network: net, mask: iface.mask, nextHop, type: 'ospf' });
        }
      }

      // Continue BFS
      for (const n of (graph.get(curId) || [])) {
        if (!visited.has(n.neighborId)) {
          visited.add(n.neighborId);
          queue.push({ id: n.neighborId, nextHop });
        }
      }
    }
  }
}

// Get OSPF neighbor info for show commands
export function getOspfNeighborInfo(devices, routerId) {
  const dv = devices[routerId];
  if (!dv || !hasOspfEnabled(dv)) return [];

  const graph = buildNeighborGraph(devices);
  const neighbors = graph.get(routerId) || [];

  return neighbors.map(n => ({
    neighborId: getRouterId(devices[n.neighborId]),
    localIfName: n.localIfName,
    localIP: n.localIP,
    neighborIP: n.neighborIP,
  }));
}
