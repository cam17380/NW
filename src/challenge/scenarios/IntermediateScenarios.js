// ─── Intermediate Challenge Scenarios ───
import { canReach } from '../../simulation/Routing.js';

function natBase() {
  return { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } };
}

export const intermediateScenarios = [
  // ─── 5. VLAN分離 ───
  {
    id: 'inter-vlan-isolation',
    title: 'VLAN Isolation',
    difficulty: 'intermediate',
    category: 'VLAN',
    description: 'Sales and Engineering teams share the same switch. Create VLANs, assign ports, and configure IP addresses so each team can communicate within its own VLAN but not across teams.',
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
        PC1: { type: 'pc', hostname: 'Sales-PC1', x: 100, y: 350, defaultGateway: '', interfaces: { 'Ethernet0': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } } } },
        PC2: { type: 'pc', hostname: 'Sales-PC2', x: 250, y: 350, defaultGateway: '', interfaces: { 'Ethernet0': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } } },
        PC3: { type: 'pc', hostname: 'Eng-PC1', x: 350, y: 350, defaultGateway: '', interfaces: { 'Ethernet0': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/3' } } } },
        PC4: { type: 'pc', hostname: 'Eng-PC2', x: 500, y: 350, defaultGateway: '', interfaces: { 'Ethernet0': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/4' } } } },
      };
      return { devices };
    },
    objectives: [
      { text: 'Sales-PC1 can ping Sales-PC2', check: (devices) => {
        const ip = devices.PC2?.interfaces?.Ethernet0?.ip;
        return ip && ip !== '' && canReach(devices, 'PC1', ip);
      }},
      { text: 'Eng-PC1 can ping Eng-PC2', check: (devices) => {
        const ip = devices.PC4?.interfaces?.Ethernet0?.ip;
        return ip && ip !== '' && canReach(devices, 'PC3', ip);
      }},
      { text: 'Sales-PC1 cannot ping Eng-PC1 (VLAN isolation)', check: (devices) => {
        const ip = devices.PC3?.interfaces?.Ethernet0?.ip;
        if (!ip || ip === '') return false;  // Not configured yet
        return !canReach(devices, 'PC1', ip);
      }},
    ],
    hints: [
      { text: 'First create VLANs, then assign ports, then configure IPs on each PC.' },
      { text: 'Switch1: vlan 10 > name Sales > exit > vlan 20 > name Engineering > exit' },
      { text: 'Assign ports: interface Gi0/1 > switchport access vlan 10 (same for Gi0/2). Gi0/3 and Gi0/4 go to vlan 20.' },
      { text: 'Set IPs: Sales PCs use 192.168.10.x/24, Eng PCs use 192.168.20.x/24 (different subnets per VLAN).' },
    ],
  },

  // ─── 6. VLAN間ルーティング ───
  {
    id: 'inter-vlan-routing',
    title: 'Inter-VLAN Routing with L3 Switch',
    difficulty: 'intermediate',
    category: 'VLAN',
    description: 'Sales and Engineering are on separate VLANs. Configure SVIs on the L3 switch so they can communicate across VLANs.',
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
      { text: 'Sales-PC can ping Eng-PC (192.168.20.10)', check: (devices) => canReach(devices, 'PC1', '192.168.20.10') },
      { text: 'Eng-PC can ping Sales-PC (192.168.10.10)', check: (devices) => canReach(devices, 'PC2', '192.168.10.10') },
    ],
    hints: [
      { text: 'An L3 switch needs SVI (Switch Virtual Interface) for each VLAN to route between them.' },
      { text: 'On L3-Switch: enable > configure terminal > interface vlan 10 > ip address 192.168.10.1 255.255.255.0 > no shutdown > exit' },
      { text: 'Same for VLAN 20: interface vlan 20 > ip address 192.168.20.1 255.255.255.0 > no shutdown' },
    ],
    congratsMessage: 'You can now route between VLANs using an L3 switch!',
  },

  // ─── 7. NATでインターネットへ ───
  {
    id: 'inter-nat',
    title: 'NAT to the Internet',
    difficulty: 'intermediate',
    category: 'NAT',
    description: 'Your internal network (192.168.1.0/24) needs to access an external server. Configure a default route and dynamic NAT on Router1.',
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
      { text: 'NAT dynamic rule is configured on Router1',
        check: (devices) => devices.R1.nat && devices.R1.nat.dynamicRules && devices.R1.nat.dynamicRules.length > 0
      },
      { text: 'PC1 can ping WebServer (8.8.8.8)', check: (devices) => canReach(devices, 'PC1', '8.8.8.8') },
    ],
    hints: [
      { text: 'You need: (1) default route to ISP, (2) ACL to match internal IPs, (3) NAT pool, (4) dynamic NAT rule.' },
      { text: 'Router1: ip route 0.0.0.0 0.0.0.0 203.0.113.1' },
      { text: 'access-list 1 permit 192.168.1.0 0.0.0.255' },
      { text: 'ip nat pool MYPOOL 203.0.113.2 203.0.113.2 netmask 255.255.255.252' },
      { text: 'ip nat inside source list 1 pool MYPOOL' },
    ],
  },

  // ─── 8. ACLでセキュリティ ───
  {
    id: 'inter-acl',
    title: 'Access Control Lists',
    difficulty: 'intermediate',
    category: 'ACL',
    description: 'Server1 should only accept TCP port 443 (HTTPS) from the internal network. Block all other inbound traffic using an extended ACL on the router.',
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
      { text: 'PC1 can reach Server1 on TCP 443 (test access 10.0.0.10 tcp 443)',
        check: (devices) => {
          // Check if ACL on Gi0/1 out allows tcp 443
          const r1 = devices.R1;
          if (!r1.accessLists || !Object.keys(r1.accessLists).length) return false;
          const gi01 = r1.interfaces['GigabitEthernet0/1'];
          if (!gi01.accessGroup) return false;
          return canReach(devices, 'PC1', '10.0.0.10', 'tcp', 443);
        }
      },
      { text: 'PC1 cannot reach Server1 on TCP 80 (blocked by ACL)',
        check: (devices) => !canReach(devices, 'PC1', '10.0.0.10', 'tcp', 80)
      },
    ],
    hints: [
      { text: 'Create an extended ACL (100-199) that permits TCP 443 and denies everything else.' },
      { text: 'Router1: access-list 100 permit tcp 192.168.1.0 0.0.0.255 10.0.0.0 0.0.0.255 eq 443' },
      { text: 'Apply outbound on Gi0/1: interface Gi0/1 > ip access-group 100 out' },
    ],
    congratsMessage: 'You secured the server with an ACL allowing only HTTPS!',
  },
];
