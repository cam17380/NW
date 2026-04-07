// ─── Beginner Challenge Scenarios ───
import { canReach } from '../../simulation/Routing.js';

function natBase() {
  return { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } };
}

export const beginnerScenarios = [
  // ─── 1. はじめてのping ───
  {
    id: 'beginner-first-ping',
    title: 'Your First Ping',
    difficulty: 'beginner',
    category: 'Routing',
    description: 'PC1 needs an IP address to communicate. Configure PC1 and ping the router.',
    topology() {
      const devices = {
        R1: {
          type: 'router', hostname: 'Router1', x: 300, y: 100,
          routes: [], nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'Switch1', x: 300, y: 250,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: {
          type: 'pc', hostname: 'PC1', x: 300, y: 400, defaultGateway: '',
          interfaces: { 'Ethernet0': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
        },
      };
      return { devices };
    },
    objectives: [
      { text: 'PC1 can ping Router1 (192.168.1.1)', check: (devices) => canReach(devices, 'PC1', '192.168.1.1') },
    ],
    hints: [
      { text: 'Select the PC1 tab and enter: enable' },
      { text: 'Enter: configure terminal' },
      { text: 'Enter: interface Ethernet0' },
      { text: 'Enter: ip address 192.168.1.10 255.255.255.0' },
      { text: 'Enter: end, then: ping 192.168.1.1' },
    ],
  },

  // ─── 2. 2台のPCを繋ごう ───
  {
    id: 'beginner-two-pcs',
    title: 'Connect Two PCs',
    difficulty: 'beginner',
    category: 'Routing',
    description: 'Two PCs are connected to a router via a switch. Configure both PCs so they can communicate with each other.',
    topology() {
      const devices = {
        R1: {
          type: 'router', hostname: 'Router1', x: 300, y: 100,
          routes: [], nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'Switch1', x: 300, y: 250,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: {
          type: 'pc', hostname: 'PC1', x: 150, y: 400, defaultGateway: '',
          interfaces: { 'Ethernet0': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
        },
        PC2: {
          type: 'pc', hostname: 'PC2', x: 450, y: 400, defaultGateway: '',
          interfaces: { 'Ethernet0': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } }
        },
      };
      return { devices };
    },
    objectives: [
      { text: 'PC1 can ping PC2', check: (devices) => canReach(devices, 'PC1', devices.PC2.interfaces.Ethernet0.ip) && devices.PC2.interfaces.Ethernet0.ip !== '' },
      { text: 'PC2 can ping PC1', check: (devices) => canReach(devices, 'PC2', devices.PC1.interfaces.Ethernet0.ip) && devices.PC1.interfaces.Ethernet0.ip !== '' },
    ],
    hints: [
      { text: 'Both PCs need IP addresses in the same subnet as Router1 (192.168.1.0/24).' },
      { text: 'On PC1: enable > configure terminal > interface Ethernet0 > ip address 192.168.1.10 255.255.255.0' },
      { text: 'On PC2: same steps, but use a different IP like 192.168.1.11' },
    ],
  },

  // ─── 3. デフォルトゲートウェイ ───
  {
    id: 'beginner-default-gw',
    title: 'The Default Gateway',
    difficulty: 'beginner',
    category: 'Routing',
    description: 'PC1 and Server1 are on different subnets. Configure PC1\'s default gateway so it can reach the server through the router.',
    topology() {
      const devices = {
        R1: {
          type: 'router', hostname: 'Router1', x: 300, y: 100,
          routes: [], nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '10.0.0.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'Server', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'Switch1', x: 150, y: 250,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        SW2: {
          type: 'switch', hostname: 'Switch2', x: 450, y: 250,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/1' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: {
          type: 'pc', hostname: 'PC1', x: 150, y: 400, defaultGateway: '',
          interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
        },
        SV1: {
          type: 'server', hostname: 'Server1', x: 450, y: 400, routes: [], defaultGateway: '10.0.0.1',
          interfaces: { 'Ethernet0': { ip: '10.0.0.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } } }
        },
      };
      return { devices };
    },
    objectives: [
      { text: 'PC1 can ping Server1 (10.0.0.10)', check: (devices) => canReach(devices, 'PC1', '10.0.0.10') },
    ],
    hints: [
      { text: 'PC1 is on a different subnet (192.168.1.x) than Server1 (10.0.0.x). A default gateway is needed to route between subnets.' },
      { text: 'On PC1: enable > configure terminal > ip default-gateway 192.168.1.1' },
      { text: 'The gateway IP is the router\'s interface on PC1\'s subnet.' },
    ],
  },

  // ─── 4. スタティックルート ───
  {
    id: 'beginner-static-route',
    title: 'Static Routes',
    difficulty: 'beginner',
    category: 'Routing',
    description: 'Two routers connect two subnets, but neither router knows how to reach the other subnet. Add static routes on both routers.',
    topology() {
      const devices = {
        R1: {
          type: 'router', hostname: 'Router1', x: 200, y: 100,
          routes: [],  // Missing route to 10.0.0.0/24 — user must add
          nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '172.16.0.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'WAN', connected: { device: 'R2', iface: 'GigabitEthernet0/1' } },
          }
        },
        R2: {
          type: 'router', hostname: 'Router2', x: 500, y: 100,
          routes: [], // Missing route to 192.168.1.0/24!
          nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '10.0.0.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '172.16.0.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'WAN', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'Switch1', x: 200, y: 250,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        SW2: {
          type: 'switch', hostname: 'Switch2', x: 500, y: 250,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: {
          type: 'pc', hostname: 'PC1', x: 200, y: 400, defaultGateway: '192.168.1.1',
          interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } }
        },
        SV1: {
          type: 'server', hostname: 'Server1', x: 500, y: 400, routes: [], defaultGateway: '10.0.0.1',
          interfaces: { 'Ethernet0': { ip: '10.0.0.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } } }
        },
      };
      return { devices };
    },
    objectives: [
      { text: 'PC1 can ping Server1 (10.0.0.10)', check: (devices) => canReach(devices, 'PC1', '10.0.0.10') },
      { text: 'Server1 can ping PC1 (192.168.1.10)', check: (devices) => canReach(devices, 'SV1', '192.168.1.10') },
    ],
    hints: [
      { text: 'Use "show packet-flow 10.0.0.10" on PC1 to see where the packet gets stuck.' },
      { text: 'Each router needs a static route to reach the remote subnet via the other router.' },
      { text: 'On Router1: ip route 10.0.0.0 255.255.255.0 172.16.0.2' },
      { text: 'On Router2: ip route 192.168.1.0 255.255.255.0 172.16.0.1' },
    ],
    congratsMessage: 'You mastered static routing between two subnets!',
  },
];
