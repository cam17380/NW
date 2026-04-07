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

  // ─── 2. DHCPでIPアドレスを自動取得 ───
  {
    id: 'beginner-dhcp',
    title: 'DHCP Auto-Configuration',
    difficulty: 'beginner',
    category: 'DHCP',
    description: 'A router is connected to two PCs via a switch. Configure a DHCP server on the router so both PCs can automatically obtain IP addresses and ping each other.',
    topology() {
      const devices = {
        R1: {
          type: 'router', hostname: 'Router1', x: 300, y: 100,
          routes: [], nat: natBase(), accessLists: {},
          crypto: { isakmpPolicies: {}, transformSets: {}, cryptoMaps: {} },
          dhcp: { pools: {}, excludedAddresses: [] },
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
      { text: 'DHCP pool is configured on Router1',
        check: (devices) => devices.R1.dhcp && Object.keys(devices.R1.dhcp.pools).length > 0 &&
          Object.values(devices.R1.dhcp.pools).some(p => p.network && p.mask) },
      { text: 'Router1\'s IP (192.168.1.1) is excluded from DHCP',
        check: (devices) => devices.R1.dhcp && devices.R1.dhcp.excludedAddresses.some(e => {
          const s = e.start.split('.').map(Number); const eN = e.end.split('.').map(Number);
          const gw = [192, 168, 1, 1];
          return gw.every((v, i) => v >= s[i] && v <= eN[i]);
        }) },
      { text: 'PC1 obtained IP via DHCP', check: (devices) => devices.PC1.interfaces.Ethernet0.dhcpClient && devices.PC1.interfaces.Ethernet0.ip !== '' },
      { text: 'PC2 obtained IP via DHCP', check: (devices) => devices.PC2.interfaces.Ethernet0.dhcpClient && devices.PC2.interfaces.Ethernet0.ip !== '' },
      { text: 'PC1 can ping PC2', check: (devices) => devices.PC2.interfaces.Ethernet0.ip !== '' && canReach(devices, 'PC1', devices.PC2.interfaces.Ethernet0.ip) },
    ],
    hints: [
      { text: 'First, configure a DHCP pool on Router1: ip dhcp pool LAN' },
      { text: 'In the pool, set: network 192.168.1.0 255.255.255.0 and default-router 192.168.1.1' },
      { text: 'Exclude the router\'s own IP: ip dhcp excluded-address 192.168.1.1' },
      { text: 'On each PC: interface Ethernet0 > ip address dhcp' },
      { text: 'Use "show ip dhcp binding" on Router1 to verify assignments' },
    ],
    congratsMessage: 'You configured a DHCP server and both PCs auto-acquired IPs!',
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
