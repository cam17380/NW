// ─── Snapshot: serialize/deserialize device state ───
import { createDevice } from '../model/Topology.js';
import { recomputeAllOspf } from '../simulation/OspfEngine.js';

export function getSnapshot(devices, links) {
  const snap = {};
  for (const [id, dv] of Object.entries(devices)) {
    snap[id] = {
      type: dv.type,
      hostname: dv.hostname,
      icon: dv.icon || undefined,
      x: dv.x,
      y: dv.y,
      routes: dv.routes ? JSON.parse(JSON.stringify(dv.routes)) : undefined,
      ospf: dv.ospf && Object.keys(dv.ospf.processes).length > 0 ? JSON.parse(JSON.stringify(dv.ospf)) : undefined,
      defaultGateway: dv.defaultGateway || undefined,
      vlans: dv.vlans ? JSON.parse(JSON.stringify(dv.vlans)) : undefined,
      nat: dv.nat ? JSON.parse(JSON.stringify({ staticEntries: dv.nat.staticEntries, pools: dv.nat.pools, dynamicRules: dv.nat.dynamicRules })) : undefined,
      accessLists: dv.accessLists && Object.keys(dv.accessLists).length > 0 ? JSON.parse(JSON.stringify(dv.accessLists)) : undefined,
      crypto: dv.crypto && (Object.keys(dv.crypto.isakmpPolicies || {}).length > 0 || Object.keys(dv.crypto.transformSets || {}).length > 0 || Object.keys(dv.crypto.cryptoMaps || {}).length > 0) ? JSON.parse(JSON.stringify(dv.crypto)) : undefined,
      dhcp: dv.dhcp && (Object.keys(dv.dhcp.pools).length > 0 || dv.dhcp.excludedAddresses.length > 0) ? JSON.parse(JSON.stringify(dv.dhcp)) : undefined,
      dhcpGateway: dv.dhcpGateway || undefined,
      policies: dv.policies && dv.policies.length > 0 ? JSON.parse(JSON.stringify(dv.policies)) : undefined,
      interfaces: {},
    };
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      snap[id].interfaces[ifName] = {
        ip: iface.ip,
        mask: iface.mask,
        status: iface.status,
        protocol: iface.protocol,
        description: iface.description,
        connected: iface.connected ? JSON.parse(JSON.stringify(iface.connected)) : null,
        switchport: iface.switchport ? JSON.parse(JSON.stringify(iface.switchport)) : undefined,
        natRole: iface.natRole || undefined,
        accessGroup: iface.accessGroup ? JSON.parse(JSON.stringify(iface.accessGroup)) : undefined,
        bondGroup: iface.bondGroup || undefined,
        tunnel: iface.tunnel ? JSON.parse(JSON.stringify(iface.tunnel)) : undefined,
        cryptoMap: iface.cryptoMap || undefined,
        dhcpClient: iface.dhcpClient || undefined,
      };
    }
  }
  return {
    version: 2,
    devices: snap,
    links: JSON.parse(JSON.stringify(links)),
  };
}

export function applySnapshot(store, snap) {
  // Version 2: full topology restore
  if (snap.version === 2) {
    const devices = {};
    for (const [id, saved] of Object.entries(snap.devices)) {
      const dv = createDevice(saved.type, id, saved.x, saved.y);
      dv.hostname = saved.hostname;
      if (saved.icon !== undefined) dv.icon = saved.icon;
      if (saved.routes !== undefined) dv.routes = saved.routes;
      if (saved.ospf !== undefined) dv.ospf = saved.ospf;
      if (saved.defaultGateway !== undefined) dv.defaultGateway = saved.defaultGateway;
      if (saved.vlans !== undefined) dv.vlans = saved.vlans;
      if (saved.nat !== undefined && dv.nat) {
        dv.nat.staticEntries = saved.nat.staticEntries || [];
        dv.nat.pools = saved.nat.pools || {};
        dv.nat.dynamicRules = saved.nat.dynamicRules || [];
        dv.nat.translations = [];
        dv.nat.stats = { hits: 0, misses: 0 };
      }
      if (saved.accessLists !== undefined) dv.accessLists = saved.accessLists;
      if (saved.crypto !== undefined && dv.crypto) {
        dv.crypto.isakmpPolicies = saved.crypto.isakmpPolicies || {};
        dv.crypto.transformSets = saved.crypto.transformSets || {};
        dv.crypto.cryptoMaps = saved.crypto.cryptoMaps || {};
      }
      if (saved.dhcp !== undefined && dv.dhcp) {
        dv.dhcp.pools = saved.dhcp.pools || {};
        dv.dhcp.excludedAddresses = saved.dhcp.excludedAddresses || [];
      }
      if (saved.dhcpGateway !== undefined) dv.dhcpGateway = saved.dhcpGateway;
      if (saved.policies !== undefined) dv.policies = saved.policies;
      // Rebuild interfaces: use exactly what was saved
      // Remove factory defaults not in snapshot, add snapshot interfaces not in factory
      for (const ifName of Object.keys(dv.interfaces)) {
        if (!saved.interfaces[ifName]) delete dv.interfaces[ifName];
      }
      for (const [ifName, savedIf] of Object.entries(saved.interfaces)) {
        if (!dv.interfaces[ifName]) {
          dv.interfaces[ifName] = { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null };
        }
        const iface = dv.interfaces[ifName];
        iface.ip = savedIf.ip;
        iface.mask = savedIf.mask;
        iface.status = savedIf.status;
        iface.protocol = savedIf.protocol;
        iface.description = savedIf.description;
        iface.connected = savedIf.connected || null;
        if (savedIf.switchport !== undefined) iface.switchport = savedIf.switchport;
        if (savedIf.natRole !== undefined) iface.natRole = savedIf.natRole;
        if (savedIf.accessGroup !== undefined) iface.accessGroup = savedIf.accessGroup;
        if (savedIf.bondGroup !== undefined) iface.bondGroup = savedIf.bondGroup;
        if (savedIf.tunnel !== undefined) iface.tunnel = savedIf.tunnel;
        if (savedIf.cryptoMap !== undefined) iface.cryptoMap = savedIf.cryptoMap;
        if (savedIf.dhcpClient !== undefined) iface.dhcpClient = savedIf.dhcpClient;
      }
      devices[id] = dv;
    }
    store.setTopology(devices, snap.links || []);
    recomputeAllOspf(devices);
    return;
  }

  // Version 1 (legacy): apply config to existing devices only
  const legacyDevices = snap.devices || snap;
  for (const [id, saved] of Object.entries(legacyDevices)) {
    const dv = store.getDevice(id);
    if (!dv) continue;
    dv.hostname = saved.hostname;
    if (saved.icon !== undefined) dv.icon = saved.icon;
    if (saved.routes !== undefined) dv.routes = saved.routes;
    if (saved.defaultGateway !== undefined) dv.defaultGateway = saved.defaultGateway;
    if (saved.vlans !== undefined) dv.vlans = saved.vlans;
    if (saved.nat !== undefined && dv.nat) {
      dv.nat.staticEntries = saved.nat.staticEntries || [];
      dv.nat.pools = saved.nat.pools || {};
      dv.nat.dynamicRules = saved.nat.dynamicRules || [];
      dv.nat.translations = [];
      dv.nat.stats = { hits: 0, misses: 0 };
    }
    if (saved.accessLists !== undefined) dv.accessLists = saved.accessLists;
    if (saved.policies !== undefined) dv.policies = saved.policies;
    for (const [ifName, savedIf] of Object.entries(saved.interfaces)) {
      const iface = dv.interfaces[ifName];
      if (!iface) continue;
      iface.ip = savedIf.ip;
      iface.mask = savedIf.mask;
      iface.status = savedIf.status;
      iface.protocol = savedIf.protocol;
      iface.description = savedIf.description;
      if (savedIf.switchport !== undefined) iface.switchport = savedIf.switchport;
      if (savedIf.natRole !== undefined) iface.natRole = savedIf.natRole;
      if (savedIf.accessGroup !== undefined) iface.accessGroup = savedIf.accessGroup;
      if (savedIf.bondGroup !== undefined) iface.bondGroup = savedIf.bondGroup;
    }
  }
  store.emitTopologyChanged();
}
