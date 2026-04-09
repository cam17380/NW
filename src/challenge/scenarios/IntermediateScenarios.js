import { t } from '../../i18n/I18n.js';
// ─── Intermediate Challenge Scenarios ───
import { canReach } from '../../simulation/Routing.js';

function natBase() {
  return { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } };
}

export const intermediateScenarios = [
  // ─── 5. VLAN分離 ───
  {
    id: 'inter-vlan-isolation',
    get title() { return t('challenge.inter-vlan-isolation.title'); },
    difficulty: 'intermediate',
    category: 'VLAN',
    get description() { return t('challenge.inter-vlan-isolation.desc'); },
    topology() {
      const devices = {
        SW1: {
          type: 'switch', hostname: 'Switch1', x: 300, y: 200,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/3': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC3', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/4': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC4', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: { type: 'pc', hostname: 'Sales-PC1', x: 100, y: 350, defaultGateway: '', interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } } } },
        PC2: { type: 'pc', hostname: 'Sales-PC2', x: 250, y: 350, defaultGateway: '', interfaces: { 'Ethernet0': { ip: '192.168.1.11', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } } },
        PC3: { type: 'pc', hostname: 'Eng-PC1', x: 350, y: 350, defaultGateway: '', interfaces: { 'Ethernet0': { ip: '192.168.1.20', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } } },
        PC4: { type: 'pc', hostname: 'Eng-PC2', x: 500, y: 350, defaultGateway: '', interfaces: { 'Ethernet0': { ip: '192.168.1.21', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/4' } } } },
      };
      return { devices };
    },
    objectives: [
      { get text() { return t('challenge.inter-vlan-isolation.obj0'); }, check: (devices) => canReach(devices, 'PC1', '192.168.1.11') },
      { get text() { return t('challenge.inter-vlan-isolation.obj1'); }, check: (devices) => canReach(devices, 'PC3', '192.168.1.21') },
      { get text() { return t('challenge.inter-vlan-isolation.obj2'); }, check: (devices) => !canReach(devices, 'PC1', '192.168.1.20') },
    ],
    hints: [
      { get text() { return t('challenge.inter-vlan-isolation.hint0'); } },
      { get text() { return t('challenge.inter-vlan-isolation.hint1'); } },
      { get text() { return t('challenge.inter-vlan-isolation.hint2'); } },
      { get text() { return t('challenge.inter-vlan-isolation.hint3'); } },
    ],
  },

  // ─── 6. VLAN間ルーティング ───
  {
    id: 'inter-vlan-routing',
    get title() { return t('challenge.inter-vlan-routing.title'); },
    difficulty: 'intermediate',
    category: 'VLAN',
    get description() { return t('challenge.inter-vlan-routing.desc'); },
    topology() {
      const devices = {
        SW1: {
          type: 'switch', hostname: 'L3-Switch', x: 300, y: 200,
          vlans: { 1: { name: 'default' }, 10: { name: 'Sales' }, 20: { name: 'Engineering' } },
          routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 10, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC2', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 20, trunkAllowed: 'all' } },
          }
        },
        PC1: { type: 'pc', hostname: 'Sales-PC', x: 150, y: 400, defaultGateway: '192.168.10.1', interfaces: { 'Ethernet0': { ip: '192.168.10.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } } } },
        PC2: { type: 'pc', hostname: 'Eng-PC', x: 450, y: 400, defaultGateway: '192.168.20.1', interfaces: { 'Ethernet0': { ip: '192.168.20.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } } },
      };
      return { devices };
    },
    objectives: [
      { get text() { return t('challenge.inter-vlan-routing.obj0'); }, check: (devices) => canReach(devices, 'PC1', '192.168.20.10') },
      { get text() { return t('challenge.inter-vlan-routing.obj1'); }, check: (devices) => canReach(devices, 'PC2', '192.168.10.10') },
    ],
    hints: [
      { get text() { return t('challenge.inter-vlan-routing.hint0'); } },
      { get text() { return t('challenge.inter-vlan-routing.hint1'); } },
      { get text() { return t('challenge.inter-vlan-routing.hint2'); } },
    ],
    get congratsMessage() { return t('challenge.inter-vlan-routing.congrats'); },
  },

  // ─── 7. NATでインターネットへ ───
  {
    id: 'inter-nat',
    get title() { return t('challenge.inter-nat.title'); },
    difficulty: 'intermediate',
    category: 'NAT',
    get description() { return t('challenge.inter-nat.desc'); },
    topology() {
      const devices = {
        R1: {
          type: 'router', hostname: 'Router1', x: 300, y: 150,
          routes: [],  // No default route — user must add
          nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' }, natRole: 'inside' },
            'GigabitEthernet0/1': { ip: '203.0.113.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'WAN', connected: { device: 'ISP', iface: 'GigabitEthernet0/0' }, natRole: 'outside' },
          }
        },
        ISP: {
          type: 'router', hostname: 'ISP', x: 500, y: 150,
          routes: [],  // No return route to 192.168.1.0/24 — NAT is required for replies
          nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '203.0.113.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '8.8.8.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'Switch1', x: 300, y: 300,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: { type: 'pc', hostname: 'PC1', x: 300, y: 430, defaultGateway: '192.168.1.1', interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } } },
        SV1: { type: 'server', hostname: 'WebServer', x: 650, y: 150, routes: [], defaultGateway: '8.8.8.1', interfaces: { 'Ethernet0': { ip: '8.8.8.8', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'ISP', iface: 'GigabitEthernet0/1' } } } },
      };
      return { devices };
    },
    objectives: [
      { get text() { return t('challenge.inter-nat.obj0'); },
        check: (devices) => devices.R1.nat && devices.R1.nat.dynamicRules && devices.R1.nat.dynamicRules.length > 0
      },
      { get text() { return t('challenge.inter-nat.obj1'); }, check: (devices) => canReach(devices, 'PC1', '8.8.8.8') },
    ],
    hints: [
      { get text() { return t('challenge.inter-nat.hint0'); } },
      { get text() { return t('challenge.inter-nat.hint1'); } },
      { get text() { return t('challenge.inter-nat.hint2'); } },
      { get text() { return t('challenge.inter-nat.hint3'); } },
      { get text() { return t('challenge.inter-nat.hint4'); } },
    ],
  },

  // ─── 8. ACLでセキュリティ ───
  {
    id: 'inter-acl',
    get title() { return t('challenge.inter-acl.title'); },
    difficulty: 'intermediate',
    category: 'ACL',
    get description() { return t('challenge.inter-acl.desc'); },
    topology() {
      const devices = {
        R1: {
          type: 'router', hostname: 'Router1', x: 300, y: 100,
          routes: [], nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '10.0.0.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'DMZ', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'LAN-SW', x: 150, y: 250,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        SW2: {
          type: 'switch', hostname: 'DMZ-SW', x: 450, y: 250,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/1' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: { type: 'pc', hostname: 'PC1', x: 150, y: 400, defaultGateway: '192.168.1.1', interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } } },
        SV1: { type: 'server', hostname: 'Server1', x: 450, y: 400, routes: [], defaultGateway: '10.0.0.1', interfaces: { 'Ethernet0': { ip: '10.0.0.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } } } },
      };
      return { devices };
    },
    objectives: [
      { get text() { return t('challenge.inter-acl.obj0'); },
        check: (devices) => {
          // Check if ACL on Gi0/1 out allows tcp 443
          const r1 = devices.R1;
          if (!r1.accessLists || !Object.keys(r1.accessLists).length) return false;
          const gi01 = r1.interfaces['GigabitEthernet0/1'];
          if (!gi01.accessGroup) return false;
          return canReach(devices, 'PC1', '10.0.0.10', 'tcp', 443);
        }
      },
      { get text() { return t('challenge.inter-acl.obj1'); },
        check: (devices) => !canReach(devices, 'PC1', '10.0.0.10', 'tcp', 80)
      },
    ],
    hints: [
      { get text() { return t('challenge.inter-acl.hint0'); } },
      { get text() { return t('challenge.inter-acl.hint1'); } },
      { get text() { return t('challenge.inter-acl.hint2'); } },
    ],
    get congratsMessage() { return t('challenge.inter-acl.congrats'); },
  },
];
