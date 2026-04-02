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
      crypto: { isakmpPolicies: {}, transformSets: {}, cryptoMaps: {} },
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
      crypto: { isakmpPolicies: {}, transformSets: {}, cryptoMaps: {} },
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
  // Router and switch: GigabitEthernet0/N (skip Tunnel interfaces)
  let max = -1;
  for (const name of ifaces) {
    const m = name.match(/^GigabitEthernet0\/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'GigabitEthernet0/' + (max + 1);
}

export function generateTunnelName(device) {
  let max = -1;
  for (const name of Object.keys(device.interfaces)) {
    const m = name.match(/^Tunnel(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'Tunnel' + (max + 1);
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
    SW1: {
      type: 'switch', hostname: 'Switch1', x: 580, y: 400,
      vlans: { 1: { name: 'default' } },
      routes: [],
      accessLists: {},
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    PC1: {
      type: 'pc', hostname: 'PC1', x: 450, y: 400,
      defaultGateway: '',
      interfaces: {
        'Ethernet0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
      }
    },
    SV1: {
      type: 'server', hostname: 'Server1', x: 580, y: 300,
      routes: [],
      defaultGateway: '',
      interfaces: {
        'Ethernet0': { ip: '192.168.1.2', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } },
      }
    },
  };
}

export function createDefaultLinks() {
  return [
    { from: 'SW1', fromIf: 'GigabitEthernet0/1', to: 'PC1', toIf: 'Ethernet0' },
    { from: 'SW1', fromIf: 'GigabitEthernet0/2', to: 'SV1', toIf: 'Ethernet0' },
  ];
}
