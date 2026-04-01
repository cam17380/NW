// ─── Topology: Device/Link data definitions and management ───

// ─── Device factory ───
export function createDevice(type, id, x, y) {
  const base = { type, hostname: id, x, y };
  if (type === 'router') {
    return {
      ...base,
      routes: [],
      nat: { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } },
      accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
      }
    };
  }
  if (type === 'firewall') {
    return {
      ...base,
      routes: [],
      nat: { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } },
      accessLists: {},
      policies: [],
      interfaces: {
        'GigabitEthernet0/0': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
      }
    };
  }
  if (type === 'switch') {
    return {
      ...base,
      vlans: { 1: { name: 'default' } },
      routes: [],
      accessLists: {},
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/3': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/4': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    };
  }
  if (type === 'server') {
    return {
      ...base,
      routes: [],
      defaultGateway: '',
      interfaces: {
        'Ethernet0': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
        'Ethernet1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
      }
    };
  }
  // pc
  return {
    ...base,
    defaultGateway: '',
    interfaces: {
      'Ethernet0': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
    }
  };
}

export function generateDeviceId(type, existingDevices) {
  const prefixMap = { router: 'R', switch: 'SW', pc: 'PC', firewall: 'FW', server: 'SV' };
  const prefix = prefixMap[type] || type.toUpperCase();
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  let max = 0;
  for (const id of Object.keys(existingDevices)) {
    const m = id.match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return prefix + (max + 1);
}

export function generateInterfaceName(device) {
  const ifaces = Object.keys(device.interfaces);
  if (device.type === 'pc' || device.type === 'server') {
    // Ethernet0, Ethernet1, ...
    let max = -1;
    for (const name of ifaces) {
      const m = name.match(/^Ethernet(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return 'Ethernet' + (max + 1);
  }
  // Router and switch: GigabitEthernet0/N
  let max = -1;
  for (const name of ifaces) {
    const m = name.match(/^GigabitEthernet0\/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'GigabitEthernet0/' + (max + 1);
}

export function createInterfaceForDevice(device) {
  const name = generateInterfaceName(device);
  const iface = { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null };
  if (device.type === 'switch') {
    iface.switchport = { mode: 'access', accessVlan: 1, trunkAllowed: 'all' };
  }
  return { name, iface };
}

export function createDefaultDevices() {
  return {
    R1: {
      type: 'router', hostname: 'Router1', x: 200, y: 160,
      routes: [],
      nat: { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } },
      accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/1' } },
      }
    },
    R2: {
      type: 'router', hostname: 'Router2', x: 600, y: 160,
      routes: [],
      nat: { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } },
      accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } },
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
      }
    },
    SW1: {
      type: 'switch', hostname: 'Switch1', x: 400, y: 300,
      vlans: { 1: { name: 'default' } },
      routes: [],
      accessLists: {},
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/3': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/4': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    PC1: {
      type: 'pc', hostname: 'PC1', x: 250, y: 440,
      defaultGateway: '',
      interfaces: {
        'Ethernet0': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } },
      }
    },
    PC2: {
      type: 'pc', hostname: 'PC2', x: 550, y: 440,
      defaultGateway: '',
      interfaces: {
        'Ethernet0': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/4' } },
      }
    },
  };
}

export function createDefaultLinks() {
  return [
    { from: 'R1', fromIf: 'GigabitEthernet0/0', to: 'SW1', toIf: 'GigabitEthernet0/1' },
    { from: 'R2', fromIf: 'GigabitEthernet0/0', to: 'SW1', toIf: 'GigabitEthernet0/2' },
    { from: 'R1', fromIf: 'GigabitEthernet0/1', to: 'R2', toIf: 'GigabitEthernet0/1' },
    { from: 'SW1', fromIf: 'GigabitEthernet0/3', to: 'PC1', toIf: 'Ethernet0' },
    { from: 'SW1', fromIf: 'GigabitEthernet0/4', to: 'PC2', toIf: 'Ethernet0' },
  ];
}
