// ─── Advanced Challenge Scenarios ───
import { canReach, checkFirewallPolicies } from '../../simulation/Routing.js';
import { tracePacketFlow } from '../../simulation/PingEngine.js';

function natBase() {
  return { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } };
}

export const advancedScenarios = [
  // ─── 9. ファイアウォールポリシー ───
  {
    id: 'adv-firewall',
    title: 'Firewall Policy',
    difficulty: 'advanced',
    category: 'Firewall',
    description: 'A DMZ web server needs to be accessible on HTTPS (TCP 443) from the internal LAN, but all other traffic must be blocked. Configure the firewall policies.',
    topology() {
      const devices = {
        FW1: {
          type: 'firewall', hostname: 'Firewall1', x: 300, y: 100,
          routes: [{ network: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.1.2' }],
          nat: natBase(), accessLists: {},
          policies: [],  // Empty — user must configure
          interfaces: {
            'GigabitEthernet0/0': { ip: '10.0.1.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'Inside', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '172.16.0.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'DMZ', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
          }
        },
        R1: {
          type: 'router', hostname: 'Router1', x: 100, y: 100,
          routes: [{ network: '172.16.0.0', mask: '255.255.255.0', nextHop: '10.0.1.1' }],
          nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '10.0.1.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'To-FW', connected: { device: 'FW1', iface: 'GigabitEthernet0/0' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'LAN-SW', x: 100, y: 300,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        SW2: {
          type: 'switch', hostname: 'DMZ-SW', x: 500, y: 100,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'FW1', iface: 'GigabitEthernet0/1' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: { type: 'pc', hostname: 'PC1', x: 100, y: 430, defaultGateway: '192.168.1.1', interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } } },
        SV1: { type: 'server', hostname: 'WebServer', x: 500, y: 300, routes: [], defaultGateway: '172.16.0.1', interfaces: { 'Ethernet0': { ip: '172.16.0.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } } } },
      };
      return { devices };
    },
    objectives: [
      { text: 'PC1 can reach WebServer on TCP 443 (HTTPS)',
        check: (devices) => {
          const trace = tracePacketFlow(devices, 'PC1', '172.16.0.10', 'tcp', 443);
          return trace.reachable;
        }
      },
      { text: 'PC1 cannot reach WebServer on TCP 80 (HTTP blocked)',
        check: (devices) => {
          const trace = tracePacketFlow(devices, 'PC1', '172.16.0.10', 'tcp', 80);
          return !trace.reachable;
        }
      },
      { text: 'PC1 cannot ping WebServer (ICMP blocked)',
        check: (devices) => !canReach(devices, 'PC1', '172.16.0.10')
      },
    ],
    hints: [
      { text: 'Use "firewall policy" commands on Firewall1 to permit only HTTPS.' },
      { text: 'Firewall1: enable > configure terminal > firewall policy 10 permit 192.168.1.0 0.0.0.255 172.16.0.0 0.0.0.255 tcp 443' },
      { text: 'The implicit deny at the end blocks everything else. No need to add an explicit deny.' },
    ],
  },

  // ─── 10. VPNトンネル接続 ───
  {
    id: 'adv-vpn',
    title: 'Site-to-Site VPN',
    difficulty: 'advanced',
    category: 'VPN',
    description: 'Two branch offices need to communicate securely over the internet. Configure IPsec VPN tunnels on both routers. The ISP router and physical connectivity are already set up.',
    topology() {
      const devices = {
        R1: {
          type: 'router', hostname: 'HQ-Router', x: 100, y: 100,
          routes: [{ network: '0.0.0.0', mask: '0.0.0.0', nextHop: '203.0.113.1' }],
          nat: natBase(), accessLists: {},
          crypto: { isakmpPolicies: {}, transformSets: {}, cryptoMaps: {} },
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '203.0.113.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'WAN', connected: { device: 'ISP', iface: 'GigabitEthernet0/0' } },
            // User must create Tunnel0
          }
        },
        ISP: {
          type: 'router', hostname: 'ISP', x: 350, y: 100,
          routes: [
            { network: '203.0.113.0', mask: '255.255.255.252', nextHop: '203.0.113.2' },
            { network: '198.51.100.0', mask: '255.255.255.252', nextHop: '198.51.100.2' },
          ],
          nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '203.0.113.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '198.51.100.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/1' } },
          }
        },
        R2: {
          type: 'router', hostname: 'Branch-Router', x: 600, y: 100,
          routes: [{ network: '0.0.0.0', mask: '0.0.0.0', nextHop: '198.51.100.1' }],
          nat: natBase(), accessLists: {},
          crypto: { isakmpPolicies: {}, transformSets: {}, cryptoMaps: {} },
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.2.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '198.51.100.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'WAN', connected: { device: 'ISP', iface: 'GigabitEthernet0/1' } },
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
        PC1: { type: 'pc', hostname: 'HQ-PC', x: 100, y: 430, defaultGateway: '192.168.1.1', interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } } },
        PC2: { type: 'pc', hostname: 'Branch-PC', x: 600, y: 430, defaultGateway: '192.168.2.1', interfaces: { 'Ethernet0': { ip: '192.168.2.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } } } },
      };
      return { devices };
    },
    objectives: [
      { text: 'HQ-PC can ping Branch-PC (192.168.2.10)', check: (devices) => canReach(devices, 'PC1', '192.168.2.10') },
      { text: 'Branch-PC can ping HQ-PC (192.168.1.10)', check: (devices) => canReach(devices, 'PC2', '192.168.1.10') },
    ],
    hints: [
      { text: 'Each router needs: (1) Tunnel interface with IP, (2) tunnel source/destination/mode, (3) static route to remote LAN via tunnel.' },
      { text: 'HQ-Router: interface tunnel 0 > ip address 10.0.0.1 255.255.255.252 > tunnel source Gi0/1 > tunnel destination 198.51.100.2 > tunnel mode ipsec > no shutdown' },
      { text: 'HQ-Router: ip route 192.168.2.0 255.255.255.0 10.0.0.2' },
      { text: 'Branch-Router: same pattern but mirror (tunnel dest 203.0.113.2, ip address 10.0.0.2, route 192.168.1.0 via 10.0.0.1)' },
    ],
    congratsMessage: 'You built a site-to-site VPN tunnel connecting two branch offices!',
  },

  // ─── 11. トラブルシューティング ───
  {
    id: 'adv-troubleshoot',
    title: 'Troubleshooting',
    difficulty: 'advanced',
    category: 'Troubleshooting',
    description: 'PC1 cannot ping Server1. The network was working before but someone made changes. Use diagnostic commands to find and fix the problems.',
    topology() {
      const devices = {
        R1: {
          type: 'router', hostname: 'Router1', x: 200, y: 100,
          routes: [{ network: '10.0.0.0', mask: '255.255.255.0', nextHop: '172.16.0.2' }],
          nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '172.16.0.1', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'WAN', connected: { device: 'R2', iface: 'GigabitEthernet0/1' } },
          }
        },
        R2: {
          type: 'router', hostname: 'Router2', x: 500, y: 100,
          // BUG: wrong next-hop (should be 172.16.0.1, is 172.16.0.3)
          routes: [{ network: '192.168.1.0', mask: '255.255.255.0', nextHop: '172.16.0.3' }],
          nat: natBase(),
          // BUG: ACL blocking all inbound
          accessLists: { 100: [{ action: 'deny', protocol: 'ip', src: 'any', srcWildcard: '0.0.0.0', dst: 'any', dstWildcard: '0.0.0.0', port: null }] },
          interfaces: {
            'GigabitEthernet0/0': { ip: '10.0.0.1', mask: '255.255.255.0', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '172.16.0.2', mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'WAN', connected: { device: 'R1', iface: 'GigabitEthernet0/1' },
              accessGroup: { in: 100 } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'Switch1', x: 200, y: 300,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        SW2: {
          type: 'switch', hostname: 'Switch2', x: 500, y: 300,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R2', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: { type: 'pc', hostname: 'PC1', x: 200, y: 430, defaultGateway: '192.168.1.1', interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } } },
        SV1: { type: 'server', hostname: 'Server1', x: 500, y: 430, routes: [], defaultGateway: '10.0.0.1', interfaces: { 'Ethernet0': { ip: '10.0.0.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } } } },
      };
      return { devices };
    },
    objectives: [
      { text: 'PC1 can ping Server1 (10.0.0.10)', check: (devices) => canReach(devices, 'PC1', '10.0.0.10') },
      { text: 'Server1 can ping PC1 (192.168.1.10)', check: (devices) => canReach(devices, 'SV1', '192.168.1.10') },
    ],
    hints: [
      { text: 'Use "show packet-flow 10.0.0.10" on PC1 to trace where the packet stops.' },
      { text: 'Check Router2: "show ip route" — is the return route correct? "show access-lists" — is anything blocked?' },
      { text: 'Fix 1: Router2 has wrong next-hop. Use: no ip route 192.168.1.0 255.255.255.0 172.16.0.3, then: ip route 192.168.1.0 255.255.255.0 172.16.0.1' },
      { text: 'Fix 2: Router2 has ACL 100 blocking all traffic on Gi0/1. Use: no access-list 100 (or interface Gi0/1 > no ip access-group 100 in)' },
    ],
  },

  // ─── 12. 総合演習 ───
  {
    id: 'adv-comprehensive',
    title: 'Comprehensive Exercise',
    difficulty: 'advanced',
    category: 'Comprehensive',
    description: 'Build a complete network: internal LAN with a firewall protecting a DMZ server. Internal PCs should be able to access the DMZ server via HTTPS only. Configure routing, firewall policies, and verify connectivity.',
    topology() {
      const devices = {
        FW1: {
          type: 'firewall', hostname: 'Firewall', x: 300, y: 50,
          routes: [], nat: natBase(), accessLists: {},
          policies: [],  // User must configure
          interfaces: {
            'GigabitEthernet0/0': { ip: '', mask: '', status: 'up', protocol: 'up', description: 'Inside', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: 'DMZ', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
          }
        },
        R1: {
          type: 'router', hostname: 'Router1', x: 150, y: 150,
          routes: [], nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '', mask: '', status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: 'To-FW', connected: { device: 'FW1', iface: 'GigabitEthernet0/0' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'LAN-Switch', x: 150, y: 300,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        SW2: {
          type: 'switch', hostname: 'DMZ-Switch', x: 500, y: 150,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'FW1', iface: 'GigabitEthernet0/1' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: { type: 'pc', hostname: 'PC1', x: 150, y: 430, defaultGateway: '', interfaces: { 'Ethernet0': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } } },
        SV1: { type: 'server', hostname: 'WebServer', x: 500, y: 300, routes: [], defaultGateway: '', interfaces: { 'Ethernet0': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } } } },
      };
      return { devices };
    },
    objectives: [
      { text: 'PC1 can reach WebServer on TCP 443',
        check: (devices) => {
          const trace = tracePacketFlow(devices, 'PC1', devices.SV1?.interfaces?.Ethernet0?.ip, 'tcp', 443);
          return trace.reachable;
        }
      },
      { text: 'PC1 cannot reach WebServer on TCP 80 (blocked)',
        check: (devices) => {
          if (!devices.SV1?.interfaces?.Ethernet0?.ip) return false;
          const trace = tracePacketFlow(devices, 'PC1', devices.SV1.interfaces.Ethernet0.ip, 'tcp', 80);
          return !trace.reachable;
        }
      },
      { text: 'Firewall has at least one policy configured',
        check: (devices) => devices.FW1.policies && devices.FW1.policies.length > 0
      },
    ],
    hints: [
      { text: 'Plan your IP addressing: e.g., LAN=192.168.1.0/24, Transit=10.0.0.0/30, DMZ=172.16.0.0/24' },
      { text: 'Configure IP addresses on all interfaces: Router1 Gi0/0, Gi0/1, Firewall Gi0/0, Gi0/1, PC1, WebServer' },
      { text: 'Add routes: Router1 needs a route to DMZ via firewall. Firewall needs a route to LAN via router.' },
      { text: 'Set default gateways on PC1 and WebServer.' },
      { text: 'Add firewall policy: firewall policy 10 permit 192.168.1.0 0.0.0.255 172.16.0.0 0.0.0.255 tcp 443' },
    ],
    congratsMessage: 'Excellent! You designed a complete network with routing, firewall, and access control from scratch!',
  },
];
