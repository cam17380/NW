// ─── Topology: Device/Link data definitions and management ───

export function createDefaultDevices() {
  return {
    R1: {
      type: 'router', hostname: 'Router1', x: 200, y: 160,
      routes: [],
      interfaces: {
        'GigabitEthernet0/0': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/1' } },
      }
    },
    R2: {
      type: 'router', hostname: 'Router2', x: 600, y: 160,
      routes: [],
      interfaces: {
        'GigabitEthernet0/0': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } },
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
      }
    },
    SW1: {
      type: 'switch', hostname: 'Switch1', x: 400, y: 300,
      vlans: { 1: { name: 'default' } },
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
