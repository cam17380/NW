import { t } from '../../i18n/I18n.js';
// ─── Beginner Challenge Scenarios ───
import { canReach } from '../../simulation/Routing.js';

function natBase() {
  return { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } };
}

export const beginnerScenarios = [
  // ─── 1. はじめてのping ───
  {
    id: 'beginner-first-ping',
    get title() { return t('challenge.beginner-first-ping.title'); },
    difficulty: 'beginner',
    category: 'Routing',
    get description() { return t('challenge.beginner-first-ping.desc'); },
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
      { get text() { return t('challenge.beginner-first-ping.obj0'); }, check: (devices) => canReach(devices, 'PC1', '192.168.1.1') },
    ],
    hints: [
      { get text() { return t('challenge.beginner-first-ping.hint0'); } },
      { get text() { return t('challenge.beginner-first-ping.hint1'); } },
      { get text() { return t('challenge.beginner-first-ping.hint2'); } },
      { get text() { return t('challenge.beginner-first-ping.hint3'); } },
      { get text() { return t('challenge.beginner-first-ping.hint4'); } },
    ],
  },

  // ─── 2. DHCPでIPアドレスを自動取得 ───
  {
    id: 'beginner-dhcp',
    get title() { return t('challenge.beginner-dhcp.title'); },
    difficulty: 'beginner',
    category: 'DHCP',
    get description() { return t('challenge.beginner-dhcp.desc'); },
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
      { get text() { return t('challenge.beginner-dhcp.obj0'); },
        check: (devices) => devices.R1.dhcp && Object.keys(devices.R1.dhcp.pools).length > 0 &&
          Object.values(devices.R1.dhcp.pools).some(p => p.network && p.mask) },
      { get text() { return t('challenge.beginner-dhcp.obj1'); },
        check: (devices) => devices.R1.dhcp && devices.R1.dhcp.excludedAddresses.some(e => {
          const s = e.start.split('.').map(Number); const eN = e.end.split('.').map(Number);
          const gw = [192, 168, 1, 1];
          return gw.every((v, i) => v >= s[i] && v <= eN[i]);
        }) },
      { get text() { return t('challenge.beginner-dhcp.obj2'); }, check: (devices) => devices.PC1.interfaces.Ethernet0.dhcpClient && devices.PC1.interfaces.Ethernet0.ip !== '' },
      { get text() { return t('challenge.beginner-dhcp.obj3'); }, check: (devices) => devices.PC2.interfaces.Ethernet0.dhcpClient && devices.PC2.interfaces.Ethernet0.ip !== '' },
      { get text() { return t('challenge.beginner-dhcp.obj4'); }, check: (devices) => devices.PC2.interfaces.Ethernet0.ip !== '' && canReach(devices, 'PC1', devices.PC2.interfaces.Ethernet0.ip) },
    ],
    hints: [
      { get text() { return t('challenge.beginner-dhcp.hint0'); } },
      { get text() { return t('challenge.beginner-dhcp.hint1'); } },
      { get text() { return t('challenge.beginner-dhcp.hint2'); } },
      { get text() { return t('challenge.beginner-dhcp.hint3'); } },
      { get text() { return t('challenge.beginner-dhcp.hint4'); } },
    ],
    get congratsMessage() { return t('challenge.beginner-dhcp.congrats'); },
  },

  // ─── 3. デフォルトゲートウェイ ───
  {
    id: 'beginner-default-gw',
    get title() { return t('challenge.beginner-default-gw.title'); },
    difficulty: 'beginner',
    category: 'Routing',
    get description() { return t('challenge.beginner-default-gw.desc'); },
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
      { get text() { return t('challenge.beginner-default-gw.obj0'); }, check: (devices) => canReach(devices, 'PC1', '10.0.0.10') },
    ],
    hints: [
      { get text() { return t('challenge.beginner-default-gw.hint0'); } },
      { get text() { return t('challenge.beginner-default-gw.hint1'); } },
      { get text() { return t('challenge.beginner-default-gw.hint2'); } },
    ],
  },

  // ─── 4. スタティックルート ───
  {
    id: 'beginner-static-route',
    get title() { return t('challenge.beginner-static-route.title'); },
    difficulty: 'beginner',
    category: 'Routing',
    get description() { return t('challenge.beginner-static-route.desc'); },
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
      { get text() { return t('challenge.beginner-static-route.obj0'); }, check: (devices) => canReach(devices, 'PC1', '10.0.0.10') },
      { get text() { return t('challenge.beginner-static-route.obj1'); }, check: (devices) => canReach(devices, 'SV1', '192.168.1.10') },
    ],
    hints: [
      { get text() { return t('challenge.beginner-static-route.hint0'); } },
      { get text() { return t('challenge.beginner-static-route.hint1'); } },
      { get text() { return t('challenge.beginner-static-route.hint2'); } },
      { get text() { return t('challenge.beginner-static-route.hint3'); } },
    ],
    get congratsMessage() { return t('challenge.beginner-static-route.congrats'); },
  },
];
