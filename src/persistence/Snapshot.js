// ─── Snapshot: serialize/deserialize device state ───
import { createDevice } from '../model/Topology.js';

export function getSnapshot(devices, links) {
  const snap = {};
  for (const [id, dv] of Object.entries(devices)) {
    snap[id] = {
      type: dv.type,
      hostname: dv.hostname,
      x: dv.x,
      y: dv.y,
      routes: dv.routes ? JSON.parse(JSON.stringify(dv.routes)) : undefined,
      defaultGateway: dv.defaultGateway || undefined,
      vlans: dv.vlans ? JSON.parse(JSON.stringify(dv.vlans)) : undefined,
      nat: dv.nat ? JSON.parse(JSON.stringify({ staticEntries: dv.nat.staticEntries, pools: dv.nat.pools, dynamicRules: dv.nat.dynamicRules })) : undefined,
      accessLists: dv.accessLists && Object.keys(dv.accessLists).length > 0 ? JSON.parse(JSON.stringify(dv.accessLists)) : undefined,
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
      }
      devices[id] = dv;
    }
    store.setTopology(devices, snap.links || []);
    return;
  }

  // Version 1 (legacy): apply config to existing devices only
  const legacyDevices = snap.devices || snap;
  for (const [id, saved] of Object.entries(legacyDevices)) {
    const dv = store.getDevice(id);
    if (!dv) continue;
    dv.hostname = saved.hostname;
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
    }
  }
  store.emitTopologyChanged();
}
