// ─── Snapshot: serialize/deserialize device state ───

export function getSnapshot(devices) {
  const snap = {};
  for (const [id, dv] of Object.entries(devices)) {
    snap[id] = {
      hostname: dv.hostname,
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
        switchport: iface.switchport ? JSON.parse(JSON.stringify(iface.switchport)) : undefined,
        natRole: iface.natRole || undefined,
      };
    }
  }
  return snap;
}

export function applySnapshot(devices, snap) {
  for (const [id, saved] of Object.entries(snap)) {
    const dv = devices[id];
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
}
