// ─── Test topologies: small, focused network configs for each test category ───

// Helper: create a NAT-ready device base
function natBase() {
  return { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } };
}

// ─── VLAN Isolation topology ───
// SW1 with VLAN 10 and VLAN 20, R1 as gateway for both
export function buildVlanTopology() {
  const devices = {
    R1: {
      type: 'router', hostname: 'Router1', x: 300, y: 50,
      routes: [], nat: natBase(), accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.10.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
        'GigabitEthernet0/1': { ip: '192.168.20.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } },
      }
    },
    SW1: {
      type: 'switch', hostname: 'Switch1', x: 300, y: 200,
      vlans: { 1: { name: 'default' }, 10: { name: 'Sales' }, 20: { name: 'Eng' } },
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 10, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/1' }, switchport: { mode: 'access', accessVlan: 20, trunkAllowed: 'all' } },
        'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 10, trunkAllowed: 'all' } },
        'GigabitEthernet0/4': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 10, trunkAllowed: 'all' } },
        'GigabitEthernet0/5': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC3', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 20, trunkAllowed: 'all' } },
        'GigabitEthernet0/6': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC4', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 20, trunkAllowed: 'all' } },
      }
    },
    PC1: {
      type: 'pc', hostname: 'PC1-V10', x: 100, y: 350, defaultGateway: '192.168.10.1',
      interfaces: { 'Ethernet0': { ip: '192.168.10.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } }
    },
    PC2: {
      type: 'pc', hostname: 'PC2-V10', x: 250, y: 350, defaultGateway: '192.168.10.1',
      interfaces: { 'Ethernet0': { ip: '192.168.10.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/4' } } }
    },
    PC3: {
      type: 'pc', hostname: 'PC3-V20', x: 350, y: 350, defaultGateway: '192.168.20.1',
      interfaces: { 'Ethernet0': { ip: '192.168.20.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/5' } } }
    },
    PC4: {
      type: 'pc', hostname: 'PC4-V20', x: 500, y: 350, defaultGateway: '192.168.20.1',
      interfaces: { 'Ethernet0': { ip: '192.168.20.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/6' } } }
    },
  };
  return { devices };
}

// ─── Simple LAN (single VLAN) for ARP tests ───
export function buildSimpleLanTopology() {
  const devices = {
    R1: {
      type: 'router', hostname: 'Router1', x: 300, y: 50,
      routes: [], nat: natBase(), accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
      }
    },
    SW1: {
      type: 'switch', hostname: 'Switch1', x: 300, y: 200,
      vlans: { 1: { name: 'default' } },
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    PC1: {
      type: 'pc', hostname: 'PC1', x: 150, y: 350, defaultGateway: '192.168.1.1',
      interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
    },
    PC2: {
      type: 'pc', hostname: 'PC2', x: 450, y: 350, defaultGateway: '192.168.1.1',
      interfaces: { 'Ethernet0': { ip: '192.168.1.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } }
    },
  };
  return { devices };
}

// ─── Multi-hop routing topology ───
export function buildMultiHopTopology() {
  const devices = {
    R1: {
      type: 'router', hostname: 'R1', x: 100, y: 100,
      routes: [{ network: '10.0.2.0', mask: '255.255.255.0', nextHop: '10.0.0.2' }],
      nat: natBase(), accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
        'GigabitEthernet0/1': { ip: '10.0.0.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/1' } },
      }
    },
    R2: {
      type: 'router', hostname: 'R2', x: 400, y: 100,
      routes: [{ network: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.0.1' }],
      nat: natBase(), accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '10.0.2.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
        'GigabitEthernet0/1': { ip: '10.0.0.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
      }
    },
    SW1: {
      type: 'switch', hostname: 'SW1', x: 100, y: 250,
      vlans: { 1: { name: 'default' } },
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    SW2: {
      type: 'switch', hostname: 'SW2', x: 400, y: 250,
      vlans: { 1: { name: 'default' } },
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    PC1: {
      type: 'pc', hostname: 'PC1', x: 100, y: 400, defaultGateway: '192.168.1.1',
      interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
    },
    SV1: {
      type: 'server', hostname: 'Server1', x: 400, y: 400, routes: [], defaultGateway: '10.0.2.1',
      interfaces: {
        'Ethernet0': { ip: '10.0.2.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } },
        'Ethernet1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
      }
    },
  };
  return { devices };
}

// ─── Firewall topology ───
export function buildFirewallTopology() {
  const devices = {
    FW1: {
      type: 'firewall', hostname: 'FW1', x: 300, y: 100,
      routes: [{ network: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.1.2' }],
      nat: natBase(), accessLists: {},
      policies: [
        { seq: 10, action: 'permit', src: '192.168.1.0', srcWildcard: '0.0.0.255', dst: '172.16.0.0', dstWildcard: '0.0.0.255', protocol: 'icmp', port: null },
        { seq: 20, action: 'deny', src: '10.0.0.0', srcWildcard: '0.255.255.255', dst: '172.16.0.0', dstWildcard: '0.0.0.255', protocol: 'ip', port: null },
      ],
      interfaces: {
        'GigabitEthernet0/0': { ip: '10.0.1.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'Internal', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
        'GigabitEthernet0/1': { ip: '172.16.0.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'DMZ', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
      }
    },
    R1: {
      type: 'router', hostname: 'R1', x: 100, y: 100,
      routes: [{ network: '172.16.0.0', mask: '255.255.255.0', nextHop: '10.0.1.1' }],
      nat: natBase(), accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
        'GigabitEthernet0/1': { ip: '10.0.1.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'To-FW', connected: { device: 'FW1', iface: 'GigabitEthernet0/0' } },
      }
    },
    SW1: {
      type: 'switch', hostname: 'SW1', x: 100, y: 250,
      vlans: { 1: { name: 'default' } },
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    SW2: {
      type: 'switch', hostname: 'SW2', x: 500, y: 100,
      vlans: { 1: { name: 'default' } },
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'FW1', iface: 'GigabitEthernet0/1' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    PC1: {
      type: 'pc', hostname: 'PC1', x: 100, y: 400, defaultGateway: '192.168.1.1',
      interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
    },
    SV1: {
      type: 'server', hostname: 'WebSV', x: 500, y: 250, routes: [], defaultGateway: '172.16.0.1',
      interfaces: {
        'Ethernet0': { ip: '172.16.0.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } },
        'Ethernet1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
      }
    },
  };
  return { devices };
}

// ─── NAT topology ───
export function buildNatTopology() {
  const devices = {
    R1: {
      type: 'router', hostname: 'GW', x: 300, y: 100,
      routes: [{ network: '0.0.0.0', mask: '0.0.0.0', nextHop: '203.0.113.1' }],
      nat: {
        staticEntries: [{ insideLocal: '192.168.1.100', insideGlobal: '203.0.113.100' }],
        pools: { POOL1: { startIP: '203.0.113.10', endIP: '203.0.113.20', netmask: '255.255.255.0' } },
        dynamicRules: [{ aclNum: 1, poolName: 'POOL1' }],
        translations: [], stats: { hits: 0, misses: 0 },
      },
      accessLists: { 1: [{ action: 'permit', network: '192.168.1.0', wildcard: '0.0.0.255' }] },
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', natRole: 'inside', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
        'GigabitEthernet0/1': { ip: '203.0.113.2', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'WAN', natRole: 'outside', connected: { device: 'R2', iface: 'GigabitEthernet0/0' } },
      }
    },
    R2: {
      type: 'router', hostname: 'ISP', x: 500, y: 100,
      routes: [{ network: '203.0.113.0', mask: '255.255.255.0', nextHop: '203.0.113.2' }],
      nat: natBase(), accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '203.0.113.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
        'GigabitEthernet0/1': { ip: '8.8.8.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' } },
      }
    },
    SW1: {
      type: 'switch', hostname: 'SW1', x: 150, y: 250,
      vlans: { 1: { name: 'default' } },
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    SV1: {
      type: 'server', hostname: 'ExtSV', x: 500, y: 250, routes: [], defaultGateway: '8.8.8.1',
      interfaces: {
        'Ethernet0': { ip: '8.8.8.8', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/1' } },
        'Ethernet1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
      }
    },
    PC1: {
      type: 'pc', hostname: 'PC1', x: 50, y: 400, defaultGateway: '192.168.1.1',
      interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
    },
    PC2: {
      type: 'pc', hostname: 'PC-Static', x: 250, y: 400, defaultGateway: '192.168.1.1',
      interfaces: { 'Ethernet0': { ip: '192.168.1.100', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } }
    },
  };
  return { devices };
}

// ─── ACL topology ───
export function buildAclTopology() {
  const devices = {
    R1: {
      type: 'router', hostname: 'R1', x: 300, y: 100,
      routes: [], nat: natBase(),
      accessLists: {
        100: [
          { action: 'permit', protocol: 'icmp', src: '192.168.1.0', srcWildcard: '0.0.0.255', dst: '10.0.0.0', dstWildcard: '0.0.0.255' },
          { action: 'deny', protocol: 'ip', src: 'any', srcWildcard: '255.255.255.255', dst: 'any', dstWildcard: '255.255.255.255' },
        ],
      },
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN',
          connected: { device: 'SW1', iface: 'GigabitEthernet0/1' },
          accessGroup: { in: 100 } },
        'GigabitEthernet0/1': { ip: '10.0.0.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'Server',
          connected: { device: 'SV1', iface: 'Ethernet0' } },
      }
    },
    SW1: {
      type: 'switch', hostname: 'SW1', x: 150, y: 250,
      vlans: { 1: { name: 'default' } },
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    SV1: {
      type: 'server', hostname: 'Server1', x: 450, y: 250, routes: [], defaultGateway: '10.0.0.1',
      interfaces: {
        'Ethernet0': { ip: '10.0.0.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
        'Ethernet1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
      }
    },
    PC1: {
      type: 'pc', hostname: 'PC1', x: 50, y: 400, defaultGateway: '192.168.1.1',
      interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
    },
    PC2: {
      type: 'pc', hostname: 'PC2', x: 250, y: 400, defaultGateway: '192.168.1.1',
      interfaces: { 'Ethernet0': { ip: '192.168.1.20', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } }
    },
  };
  return { devices };
}

// ─── Wide subnet topology (/16 mask) for ARP across octets ───
export function buildWideSubnetTopology() {
  const devices = {
    R1: {
      type: 'router', hostname: 'R1', x: 300, y: 100,
      routes: [], nat: natBase(), accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '172.16.0.1', mask: '255.255.0.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
      }
    },
    SW1: {
      type: 'switch', hostname: 'SW1', x: 300, y: 200,
      vlans: { 1: { name: 'default' } },
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    SV1: {
      type: 'server', hostname: 'SV1', x: 300, y: 350, routes: [], defaultGateway: '172.16.0.1',
      interfaces: {
        'Ethernet0': { ip: '172.16.1.10', mask: '255.255.0.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } },
        'Ethernet1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
      }
    },
  };
  return { devices };
}

// ─── Longest prefix match topology ───
export function buildLongestPrefixTopology() {
  const devices = {
    R1: {
      type: 'router', hostname: 'R1', x: 300, y: 100,
      routes: [
        { network: '10.0.0.0', mask: '255.0.0.0', nextHop: '192.168.1.2' },        // /8
        { network: '10.1.0.0', mask: '255.255.0.0', nextHop: '192.168.1.3' },       // /16
        { network: '10.1.1.0', mask: '255.255.255.0', nextHop: '192.168.1.4' },     // /24
      ],
      nat: natBase(), accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
      }
    },
    SW1: {
      type: 'switch', hostname: 'SW1', x: 300, y: 200,
      vlans: { 1: { name: 'default' } },
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R3', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/4': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R4', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    R2: {
      type: 'router', hostname: 'R2-slash8', x: 100, y: 350,
      routes: [], nat: natBase(), accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.1.2', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } },
      }
    },
    R3: {
      type: 'router', hostname: 'R3-slash16', x: 300, y: 350,
      routes: [], nat: natBase(), accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.1.3', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } },
      }
    },
    R4: {
      type: 'router', hostname: 'R4-slash24', x: 500, y: 350,
      routes: [], nat: natBase(), accessLists: {},
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.1.4', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/4' } },
      }
    },
  };
  return { devices };
}

// ─── L3 Switch (SVI / Inter-VLAN Routing) topology ───
export function buildL3SwitchTopology() {
  const devices = {
    SW1: {
      type: 'switch', hostname: 'L3Switch', x: 300, y: 150,
      vlans: { 1: { name: 'default' }, 10: { name: 'Sales' }, 20: { name: 'Engineering' } },
      routes: [{ network: '10.0.0.0', mask: '255.255.255.0', nextHop: '192.168.10.254' }],
      accessLists: {},
      interfaces: {
        'Vlan10': { ip: '192.168.10.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'SVI-Sales', connected: null },
        'Vlan20': { ip: '192.168.20.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'SVI-Eng', connected: null },
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 10, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 10, trunkAllowed: 'all' } },
        'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC3', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 20, trunkAllowed: 'all' } },
        'GigabitEthernet0/4': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 10, trunkAllowed: 'all' } },
      }
    },
    R1: {
      type: 'router', hostname: 'ExtRouter', x: 600, y: 150,
      routes: [
        { network: '192.168.10.0', mask: '255.255.255.0', nextHop: '192.168.10.1' },
        { network: '192.168.20.0', mask: '255.255.255.0', nextHop: '192.168.10.1' },
      ],
      nat: natBase(), accessLists: {},
      crypto: { isakmpPolicies: {}, transformSets: {}, cryptoMaps: {} },
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.10.254', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/4' } },
        'GigabitEthernet0/1': { ip: '10.0.0.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' } },
      }
    },
    PC1: {
      type: 'pc', hostname: 'Sales-PC1', x: 100, y: 300, defaultGateway: '192.168.10.1',
      interfaces: { 'Ethernet0': { ip: '192.168.10.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } } }
    },
    PC2: {
      type: 'pc', hostname: 'Sales-PC2', x: 250, y: 300, defaultGateway: '192.168.10.1',
      interfaces: { 'Ethernet0': { ip: '192.168.10.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
    },
    PC3: {
      type: 'pc', hostname: 'Eng-PC1', x: 400, y: 300, defaultGateway: '192.168.20.1',
      interfaces: { 'Ethernet0': { ip: '192.168.20.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } }
    },
    SV1: {
      type: 'server', hostname: 'ExtServer', x: 600, y: 300, routes: [], defaultGateway: '10.0.0.1',
      interfaces: {
        'Ethernet0': { ip: '10.0.0.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
        'Ethernet1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
      }
    },
  };
  return { devices };
}

// ─── LACP Bond (active-backup failover) topology ───
export function buildBondTopology() {
  const devices = {
    R1: {
      type: 'router', hostname: 'Router1', x: 300, y: 50,
      routes: [], nat: natBase(), accessLists: {},
      crypto: { isakmpPolicies: {}, transformSets: {}, cryptoMaps: {} },
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
      }
    },
    SW1: {
      type: 'switch', hostname: 'Switch1', x: 300, y: 200,
      vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet1' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/4': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    SV1: {
      type: 'server', hostname: 'BondServer', x: 300, y: 350, routes: [], defaultGateway: '192.168.1.1',
      interfaces: {
        'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' }, bondGroup: 'Bond0' },
        'Ethernet1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' }, bondGroup: 'Bond0' },
      }
    },
    PC1: {
      type: 'pc', hostname: 'PC1', x: 100, y: 350, defaultGateway: '192.168.1.1',
      interfaces: { 'Ethernet0': { ip: '192.168.1.20', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/4' } } }
    },
  };
  return { devices };
}

// ─── VPN / IPsec Tunnel topology ───
export function buildVpnTopology() {
  const devices = {
    R1: {
      type: 'router', hostname: 'HQ-Router', x: 100, y: 100,
      routes: [
        { network: '0.0.0.0', mask: '0.0.0.0', nextHop: '203.0.113.1' },
        { network: '192.168.2.0', mask: '255.255.255.0', nextHop: '10.0.0.2' },
      ],
      nat: natBase(), accessLists: {},
      crypto: {
        isakmpPolicies: { 10: { encryption: 'aes', hash: 'sha', authentication: 'pre-share', group: 14, lifetime: 86400 } },
        transformSets: { 'VPN-SET': { transform1: 'esp-aes', transform2: 'esp-sha-hmac' } },
        cryptoMaps: {},
      },
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
        'GigabitEthernet0/1': { ip: '203.0.113.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'WAN', connected: { device: 'RISP', iface: 'GigabitEthernet0/0' } },
        'Tunnel0': { ip: '10.0.0.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'VPN', connected: null, tunnel: { source: 'GigabitEthernet0/1', destination: '198.51.100.2', mode: 'ipsec' } },
      }
    },
    RISP: {
      type: 'router', hostname: 'ISP', x: 350, y: 100,
      routes: [
        { network: '203.0.113.0', mask: '255.255.255.252', nextHop: '203.0.113.2' },
        { network: '198.51.100.0', mask: '255.255.255.252', nextHop: '198.51.100.2' },
      ],
      nat: natBase(), accessLists: {},
      crypto: { isakmpPolicies: {}, transformSets: {}, cryptoMaps: {} },
      interfaces: {
        'GigabitEthernet0/0': { ip: '203.0.113.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
        'GigabitEthernet0/1': { ip: '198.51.100.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/1' } },
      }
    },
    R2: {
      type: 'router', hostname: 'Branch-Router', x: 600, y: 100,
      routes: [
        { network: '0.0.0.0', mask: '0.0.0.0', nextHop: '198.51.100.1' },
        { network: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.0.1' },
      ],
      nat: natBase(), accessLists: {},
      crypto: {
        isakmpPolicies: { 10: { encryption: 'aes', hash: 'sha', authentication: 'pre-share', group: 14, lifetime: 86400 } },
        transformSets: { 'VPN-SET': { transform1: 'esp-aes', transform2: 'esp-sha-hmac' } },
        cryptoMaps: {},
      },
      interfaces: {
        'GigabitEthernet0/0': { ip: '192.168.2.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
        'GigabitEthernet0/1': { ip: '198.51.100.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'WAN', connected: { device: 'RISP', iface: 'GigabitEthernet0/1' } },
        'Tunnel0': { ip: '10.0.0.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'VPN', connected: null, tunnel: { source: 'GigabitEthernet0/1', destination: '203.0.113.2', mode: 'ipsec' } },
      }
    },
    SW1: {
      type: 'switch', hostname: 'HQ-SW', x: 100, y: 300,
      vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    SW2: {
      type: 'switch', hostname: 'Branch-SW', x: 600, y: 300,
      vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
      interfaces: {
        'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
        'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
      }
    },
    PC1: {
      type: 'pc', hostname: 'HQ-PC', x: 100, y: 400, defaultGateway: '192.168.1.1',
      interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
    },
    PC2: {
      type: 'pc', hostname: 'Branch-PC', x: 600, y: 400, defaultGateway: '192.168.2.1',
      interfaces: { 'Ethernet0': { ip: '192.168.2.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } } }
    },
  };
  return { devices };
}
