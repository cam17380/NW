// ─── Network topology templates ───

export const templates = [
  {
    id: 'simple-lan',
    name: 'Simple LAN',
    description: 'Router + Switch + 3 PCs — basic network with one subnet',
    icon: '🏠',
    build() {
      const devices = {
        R1: {
          type: 'router', hostname: 'Router1', x: 400, y: 100,
          routes: [],
          nat: { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } },
          accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'down', protocol: 'down', description: 'WAN', connected: null },
          }
        },
        SW1: {
          type: 'switch', hostname: 'Switch1', x: 400, y: 260,
          vlans: { 1: { name: 'default' } },
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/4': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC3', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: {
          type: 'pc', hostname: 'PC1', x: 200, y: 420,
          defaultGateway: '192.168.1.1',
          interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
        },
        PC2: {
          type: 'pc', hostname: 'PC2', x: 400, y: 420,
          defaultGateway: '192.168.1.1',
          interfaces: { 'Ethernet0': { ip: '192.168.1.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } }
        },
        PC3: {
          type: 'pc', hostname: 'PC3', x: 600, y: 420,
          defaultGateway: '192.168.1.1',
          interfaces: { 'Ethernet0': { ip: '192.168.1.12', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/4' } } }
        },
      };
      const links = [
        { from: 'R1', fromIf: 'GigabitEthernet0/0', to: 'SW1', toIf: 'GigabitEthernet0/1' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/2', to: 'PC1', toIf: 'Ethernet0' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/3', to: 'PC2', toIf: 'Ethernet0' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/4', to: 'PC3', toIf: 'Ethernet0' },
      ];
      return { version: 2, devices, links };
    }
  },

  {
    id: 'multi-subnet',
    name: 'Multi-Subnet Routing',
    description: '2 Routers + 2 Switches + 4 PCs — two subnets connected via routing',
    icon: '🔀',
    build() {
      const devices = {
        R1: {
          type: 'router', hostname: 'Router1', x: 250, y: 100,
          routes: [{ network: '10.0.2.0', mask: '255.255.255.0', nextHop: '10.0.0.2' }],
          nat: { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } },
          accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN-A', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '10.0.0.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'WAN-Link', connected: { device: 'R2', iface: 'GigabitEthernet0/1' } },
          }
        },
        R2: {
          type: 'router', hostname: 'Router2', x: 550, y: 100,
          routes: [{ network: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.0.1' }],
          nat: { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } },
          accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '10.0.2.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN-B', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '10.0.0.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'WAN-Link', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'Switch-A', x: 250, y: 260,
          vlans: { 1: { name: 'default' } },
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        SW2: {
          type: 'switch', hostname: 'Switch-B', x: 550, y: 260,
          vlans: { 1: { name: 'default' } },
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC3', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC4', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: {
          type: 'pc', hostname: 'PC-A1', x: 150, y: 420, defaultGateway: '192.168.1.1',
          interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
        },
        PC2: {
          type: 'pc', hostname: 'PC-A2', x: 350, y: 420, defaultGateway: '192.168.1.1',
          interfaces: { 'Ethernet0': { ip: '192.168.1.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } }
        },
        PC3: {
          type: 'pc', hostname: 'PC-B1', x: 450, y: 420, defaultGateway: '10.0.2.1',
          interfaces: { 'Ethernet0': { ip: '10.0.2.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } } }
        },
        PC4: {
          type: 'pc', hostname: 'PC-B2', x: 650, y: 420, defaultGateway: '10.0.2.1',
          interfaces: { 'Ethernet0': { ip: '10.0.2.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/3' } } }
        },
      };
      const links = [
        { from: 'R1', fromIf: 'GigabitEthernet0/0', to: 'SW1', toIf: 'GigabitEthernet0/1' },
        { from: 'R1', fromIf: 'GigabitEthernet0/1', to: 'R2', toIf: 'GigabitEthernet0/1' },
        { from: 'R2', fromIf: 'GigabitEthernet0/0', to: 'SW2', toIf: 'GigabitEthernet0/1' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/2', to: 'PC1', toIf: 'Ethernet0' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/3', to: 'PC2', toIf: 'Ethernet0' },
        { from: 'SW2', fromIf: 'GigabitEthernet0/2', to: 'PC3', toIf: 'Ethernet0' },
        { from: 'SW2', fromIf: 'GigabitEthernet0/3', to: 'PC4', toIf: 'Ethernet0' },
      ];
      return { version: 2, devices, links };
    }
  },

  {
    id: 'dmz-firewall',
    name: 'DMZ with Firewall',
    description: 'Firewall separating internal LAN, DMZ servers, and external network',
    icon: '🛡️',
    build() {
      const devices = {
        FW1: {
          type: 'firewall', hostname: 'Firewall1', x: 400, y: 180,
          routes: [
            { network: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.1.2' },
          ],
          nat: { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } },
          accessLists: {},
          policies: [
            { seq: 10, action: 'permit', src: '192.168.1.0', srcWildcard: '0.0.0.255', dst: '172.16.0.0', dstWildcard: '0.0.0.255', protocol: 'icmp', port: null },
            { seq: 20, action: 'permit', src: '192.168.1.0', srcWildcard: '0.0.0.255', dst: '172.16.0.0', dstWildcard: '0.0.0.255', protocol: 'tcp', port: 80 },
            { seq: 30, action: 'permit', src: 'any', srcWildcard: '255.255.255.255', dst: '172.16.0.0', dstWildcard: '0.0.0.255', protocol: 'tcp', port: 443 },
          ],
          interfaces: {
            'GigabitEthernet0/0': { ip: '10.0.1.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'Internal', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '172.16.0.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'DMZ', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
          }
        },
        R1: {
          type: 'router', hostname: 'CoreRouter', x: 150, y: 180,
          routes: [{ network: '172.16.0.0', mask: '255.255.255.0', nextHop: '10.0.1.1' }],
          nat: { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } },
          accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '10.0.1.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'To-FW', connected: { device: 'FW1', iface: 'GigabitEthernet0/0' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'SW-Internal', x: 150, y: 350,
          vlans: { 1: { name: 'default' } },
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        SW2: {
          type: 'switch', hostname: 'SW-DMZ', x: 600, y: 180,
          vlans: { 1: { name: 'default' } },
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'FW1', iface: 'GigabitEthernet0/1' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        SV1: {
          type: 'server', hostname: 'WebServer', x: 550, y: 360, routes: [], defaultGateway: '172.16.0.1',
          interfaces: {
            'Ethernet0': { ip: '172.16.0.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'HTTP', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } },
            'Ethernet1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
          }
        },
        SV2: {
          type: 'server', hostname: 'DBServer', x: 700, y: 360, routes: [], defaultGateway: '172.16.0.1',
          interfaces: {
            'Ethernet0': { ip: '172.16.0.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'DB', connected: { device: 'SW2', iface: 'GigabitEthernet0/3' } },
            'Ethernet1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
          }
        },
        PC1: {
          type: 'pc', hostname: 'PC1', x: 80, y: 480, defaultGateway: '192.168.1.1',
          interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
        },
        PC2: {
          type: 'pc', hostname: 'PC2', x: 250, y: 480, defaultGateway: '192.168.1.1',
          interfaces: { 'Ethernet0': { ip: '192.168.1.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } }
        },
      };
      const links = [
        { from: 'R1', fromIf: 'GigabitEthernet0/0', to: 'SW1', toIf: 'GigabitEthernet0/1' },
        { from: 'R1', fromIf: 'GigabitEthernet0/1', to: 'FW1', toIf: 'GigabitEthernet0/0' },
        { from: 'FW1', fromIf: 'GigabitEthernet0/1', to: 'SW2', toIf: 'GigabitEthernet0/1' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/2', to: 'PC1', toIf: 'Ethernet0' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/3', to: 'PC2', toIf: 'Ethernet0' },
        { from: 'SW2', fromIf: 'GigabitEthernet0/2', to: 'SV1', toIf: 'Ethernet0' },
        { from: 'SW2', fromIf: 'GigabitEthernet0/3', to: 'SV2', toIf: 'Ethernet0' },
      ];
      return { version: 2, devices, links };
    }
  },

  {
    id: 'vlan-routing',
    name: 'VLAN with Inter-VLAN Routing',
    description: 'Router-on-a-stick: 2 VLANs on switch, routed via single router',
    icon: '🏷️',
    build() {
      const devices = {
        R1: {
          type: 'router', hostname: 'Router1', x: 400, y: 80,
          routes: [],
          nat: { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } },
          accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.10.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'VLAN10-GW', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '192.168.20.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'VLAN20-GW', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'Switch1', x: 400, y: 260,
          vlans: { 1: { name: 'default' }, 10: { name: 'Sales' }, 20: { name: 'Engineering' } },
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: 'Router-V10', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 10, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: 'Router-V20', connected: { device: 'R1', iface: 'GigabitEthernet0/1' }, switchport: { mode: 'access', accessVlan: 20, trunkAllowed: 'all' } },
            'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: 'Sales-PC1', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 10, trunkAllowed: 'all' } },
            'GigabitEthernet0/4': { ip: '', mask: '', status: 'up', protocol: 'up', description: 'Sales-PC2', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 10, trunkAllowed: 'all' } },
            'GigabitEthernet0/5': { ip: '', mask: '', status: 'up', protocol: 'up', description: 'Eng-PC3', connected: { device: 'PC3', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 20, trunkAllowed: 'all' } },
            'GigabitEthernet0/6': { ip: '', mask: '', status: 'up', protocol: 'up', description: 'Eng-PC4', connected: { device: 'PC4', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 20, trunkAllowed: 'all' } },
          }
        },
        PC1: {
          type: 'pc', hostname: 'Sales-PC1', x: 150, y: 440, defaultGateway: '192.168.10.1',
          interfaces: { 'Ethernet0': { ip: '192.168.10.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } }
        },
        PC2: {
          type: 'pc', hostname: 'Sales-PC2', x: 320, y: 440, defaultGateway: '192.168.10.1',
          interfaces: { 'Ethernet0': { ip: '192.168.10.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/4' } } }
        },
        PC3: {
          type: 'pc', hostname: 'Eng-PC1', x: 480, y: 440, defaultGateway: '192.168.20.1',
          interfaces: { 'Ethernet0': { ip: '192.168.20.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/5' } } }
        },
        PC4: {
          type: 'pc', hostname: 'Eng-PC2', x: 650, y: 440, defaultGateway: '192.168.20.1',
          interfaces: { 'Ethernet0': { ip: '192.168.20.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/6' } } }
        },
      };
      const links = [
        { from: 'R1', fromIf: 'GigabitEthernet0/0', to: 'SW1', toIf: 'GigabitEthernet0/1' },
        { from: 'R1', fromIf: 'GigabitEthernet0/1', to: 'SW1', toIf: 'GigabitEthernet0/2' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/3', to: 'PC1', toIf: 'Ethernet0' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/4', to: 'PC2', toIf: 'Ethernet0' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/5', to: 'PC3', toIf: 'Ethernet0' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/6', to: 'PC4', toIf: 'Ethernet0' },
      ];
      return { version: 2, devices, links };
    }
  },

  {
    id: 'nat-internet',
    name: 'NAT to Internet',
    description: 'Internal LAN with dynamic NAT to simulated external network',
    icon: '🌐',
    build() {
      const devices = {
        R1: {
          type: 'router', hostname: 'GW-Router', x: 400, y: 160,
          routes: [{ network: '0.0.0.0', mask: '0.0.0.0', nextHop: '203.0.113.1' }],
          nat: {
            staticEntries: [],
            pools: { INTERNET: { startIP: '203.0.113.10', endIP: '203.0.113.20', netmask: '255.255.255.0' } },
            dynamicRules: [{ aclNum: 1, poolName: 'INTERNET' }],
            translations: [], stats: { hits: 0, misses: 0 },
          },
          accessLists: { 1: [{ action: 'permit', network: '192.168.1.0', wildcard: '0.0.0.255' }] },
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', natRole: 'inside', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '203.0.113.2', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'WAN', natRole: 'outside', connected: { device: 'R2', iface: 'GigabitEthernet0/0' } },
          }
        },
        R2: {
          type: 'router', hostname: 'ISP-Router', x: 650, y: 160,
          routes: [{ network: '203.0.113.0', mask: '255.255.255.0', nextHop: '203.0.113.2' }],
          nat: { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } },
          accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '203.0.113.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'To-Customer', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '8.8.8.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'Internet', connected: { device: 'SV1', iface: 'Ethernet0' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'LAN-Switch', x: 200, y: 320,
          vlans: { 1: { name: 'default' } },
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        SV1: {
          type: 'server', hostname: 'ExtServer', x: 650, y: 350, routes: [], defaultGateway: '8.8.8.1',
          interfaces: {
            'Ethernet0': { ip: '8.8.8.8', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'Public', connected: { device: 'R2', iface: 'GigabitEthernet0/1' } },
            'Ethernet1': { ip: '', mask: '', status: 'down', protocol: 'down', description: '', connected: null },
          }
        },
        PC1: {
          type: 'pc', hostname: 'PC1', x: 100, y: 460, defaultGateway: '192.168.1.1',
          interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
        },
        PC2: {
          type: 'pc', hostname: 'PC2', x: 300, y: 460, defaultGateway: '192.168.1.1',
          interfaces: { 'Ethernet0': { ip: '192.168.1.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } }
        },
      };
      const links = [
        { from: 'R1', fromIf: 'GigabitEthernet0/0', to: 'SW1', toIf: 'GigabitEthernet0/1' },
        { from: 'R1', fromIf: 'GigabitEthernet0/1', to: 'R2', toIf: 'GigabitEthernet0/0' },
        { from: 'R2', fromIf: 'GigabitEthernet0/1', to: 'SV1', toIf: 'Ethernet0' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/2', to: 'PC1', toIf: 'Ethernet0' },
        { from: 'SW1', fromIf: 'GigabitEthernet0/3', to: 'PC2', toIf: 'Ethernet0' },
      ];
      return { version: 2, devices, links };
    }
  },

  {
    id: 'empty',
    name: 'Empty Canvas',
    description: 'Start from scratch — no devices, no links',
    icon: '📋',
    build() {
      return { version: 2, devices: {}, links: [] };
    }
  },
];
