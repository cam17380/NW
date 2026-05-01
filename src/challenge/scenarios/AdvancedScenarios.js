import { t } from '../../i18n/I18n.js';
// ─── Advanced Challenge Scenarios ───
import { canReach } from '../../simulation/Routing.js';
import { tracePacketFlow } from '../../simulation/PingEngine.js';

function natBase() {
  return { staticEntries: [], pools: {}, dynamicRules: [], translations: [], stats: { hits: 0, misses: 0 } };
}

export const advancedScenarios = [
  // ─── OSPF マルチルーター ───
  {
    id: 'adv-ospf',
    get title() { return t('challenge.adv-ospf.title'); },
    difficulty: 'advanced',
    category: 'OSPF',
    get description() { return t('challenge.adv-ospf.desc'); },
    topology() {
      const devices = {
        R1: {
          type: 'router', hostname: 'Router1', x: 100, y: 150,
          routes: [],
          nat: natBase(), accessLists: {},
          // ospf initialized empty — user must configure
          interfaces: {
            'GigabitEthernet0/0': { ip: '192.168.1.1', mask: '255.255.255.0',   status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '10.1.0.1',    mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'To-R2', connected: { device: 'R2', iface: 'GigabitEthernet0/0' } },
          }
        },
        R2: {
          type: 'router', hostname: 'Router2', x: 350, y: 150,
          routes: [],
          nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '10.1.0.2',    mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'To-R1', connected: { device: 'R1', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '10.1.0.5',    mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'To-R3', connected: { device: 'R3', iface: 'GigabitEthernet0/0' } },
          }
        },
        R3: {
          type: 'router', hostname: 'Router3', x: 600, y: 150,
          routes: [],
          nat: natBase(), accessLists: {},
          interfaces: {
            'GigabitEthernet0/0': { ip: '10.1.0.6',    mask: '255.255.255.252', status: 'up', protocol: 'up', description: 'To-R2', connected: { device: 'R2', iface: 'GigabitEthernet0/1' } },
            'GigabitEthernet0/1': { ip: '172.16.0.1',  mask: '255.255.255.0',   status: 'up', protocol: 'up', description: 'LAN', connected: { device: 'SW2', iface: 'GigabitEthernet0/1' } },
          }
        },
        SW1: {
          type: 'switch', hostname: 'SW-LAN1', x: 100, y: 300,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R1', iface: 'GigabitEthernet0/0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'PC1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        SW2: {
          type: 'switch', hostname: 'SW-LAN2', x: 600, y: 300,
          vlans: { 1: { name: 'default' } }, routes: [], accessLists: {},
          interfaces: {
            'GigabitEthernet0/1': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'R3', iface: 'GigabitEthernet0/1' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
            'GigabitEthernet0/2': { ip: '', mask: '', status: 'up', protocol: 'up', description: '', connected: { device: 'SV1', iface: 'Ethernet0' }, switchport: { mode: 'access', accessVlan: 1, trunkAllowed: 'all' } },
          }
        },
        PC1: { type: 'pc', hostname: 'PC1', x: 100, y: 430, defaultGateway: '192.168.1.1', interfaces: { 'Ethernet0': { ip: '192.168.1.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW1', iface: 'GigabitEthernet0/2' } } } },
        SV1: { type: 'server', hostname: 'Server1', x: 600, y: 430, routes: [], defaultGateway: '172.16.0.1', interfaces: { 'Ethernet0': { ip: '172.16.0.10', mask: '255.255.255.0', status: 'up', protocol: 'up', description: '', connected: { device: 'SW2', iface: 'GigabitEthernet0/2' } } } },
      };
      return { devices };
    },
    objectives: [
      {
        get text() { return t('challenge.adv-ospf.obj0'); },
        check: (devices) => canReach(devices, 'PC1', '172.16.0.10'),
      },
      {
        get text() { return t('challenge.adv-ospf.obj1'); },
        check: (devices) => canReach(devices, 'SV1', '192.168.1.10'),
      },
      {
        get text() { return t('challenge.adv-ospf.obj2'); },
        check: (devices) => {
          return ['R1', 'R2', 'R3'].every(id => {
            const dv = devices[id];
            return dv && dv.ospf && Object.values(dv.ospf.processes || {}).some(p => p.networks && p.networks.length > 0);
          });
        },
      },
    ],
    hints: [
      { get text() { return t('challenge.adv-ospf.hint0'); } },
      { get text() { return t('challenge.adv-ospf.hint1'); } },
      { get text() { return t('challenge.adv-ospf.hint2'); } },
      { get text() { return t('challenge.adv-ospf.hint3'); } },
      { get text() { return t('challenge.adv-ospf.hint4'); } },
    ],
    get congratsMessage() { return t('challenge.adv-ospf.congrats'); },
  },

  // ─── 9. ファイアウォールポリシー ───
  {
    id: 'adv-firewall',
    get title() { return t('challenge.adv-firewall.title'); },
    difficulty: 'advanced',
    category: 'Firewall',
    get description() { return t('challenge.adv-firewall.desc'); },
    topology() {
      const devices = {
        FW1: {
          type: 'firewall', hostname: 'Firewall1', x: 300, y: 100,
          routes: [{ network: '192.168.1.0', mask: '255.255.255.0', nextHop: '10.0.1.2' }],
          nat: natBase(), accessLists: {},
          policies: [
            { seq: 100, action: 'permit', src: 'any', srcWildcard: '0.0.0.0', dst: 'any', dstWildcard: '0.0.0.0', protocol: 'ip', port: null },
          ],  // Permit all — user must restrict
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
      { get text() { return t('challenge.adv-firewall.obj0'); },
        check: (devices) => {
          // Must not have a permit-all policy (user should have replaced it with specific rules)
          const hasPermitAll = devices.FW1.policies.some(p => p.src === 'any' && p.dst === 'any' && p.protocol === 'ip' && p.action === 'permit');
          if (hasPermitAll) return false;
          const trace = tracePacketFlow(devices, 'PC1', '172.16.0.10', 'tcp', 443);
          return trace.reachable;
        }
      },
      { get text() { return t('challenge.adv-firewall.obj1'); },
        check: (devices) => {
          const trace = tracePacketFlow(devices, 'PC1', '172.16.0.10', 'tcp', 80);
          return !trace.reachable;
        }
      },
      { get text() { return t('challenge.adv-firewall.obj2'); },
        check: (devices) => !canReach(devices, 'PC1', '172.16.0.10')
      },
    ],
    hints: [
      { get text() { return t('challenge.adv-firewall.hint0'); } },
      { get text() { return t('challenge.adv-firewall.hint1'); } },
      { get text() { return t('challenge.adv-firewall.hint2'); } },
      { get text() { return t('challenge.adv-firewall.hint3'); } },
    ],
  },

  // ─── 10. VPNトンネル接続 ───
  {
    id: 'adv-vpn',
    get title() { return t('challenge.adv-vpn.title'); },
    difficulty: 'advanced',
    category: 'VPN',
    get description() { return t('challenge.adv-vpn.desc'); },
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
      { get text() { return t('challenge.adv-vpn.obj0'); }, check: (devices) => canReach(devices, 'PC1', '192.168.2.10') },
      { get text() { return t('challenge.adv-vpn.obj1'); }, check: (devices) => canReach(devices, 'PC2', '192.168.1.10') },
    ],
    hints: [
      { get text() { return t('challenge.adv-vpn.hint0'); } },
      { get text() { return t('challenge.adv-vpn.hint1'); } },
      { get text() { return t('challenge.adv-vpn.hint2'); } },
      { get text() { return t('challenge.adv-vpn.hint3'); } },
    ],
    get congratsMessage() { return t('challenge.adv-vpn.congrats'); },
  },

  // ─── 11. トラブルシューティング ───
  {
    id: 'adv-troubleshoot',
    get title() { return t('challenge.adv-troubleshoot.title'); },
    difficulty: 'advanced',
    category: 'Troubleshooting',
    get description() { return t('challenge.adv-troubleshoot.desc'); },
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
      { get text() { return t('challenge.adv-troubleshoot.obj0'); }, check: (devices) => canReach(devices, 'PC1', '10.0.0.10') },
      { get text() { return t('challenge.adv-troubleshoot.obj1'); }, check: (devices) => canReach(devices, 'SV1', '192.168.1.10') },
    ],
    hints: [
      { get text() { return t('challenge.adv-troubleshoot.hint0'); } },
      { get text() { return t('challenge.adv-troubleshoot.hint1'); } },
      { get text() { return t('challenge.adv-troubleshoot.hint2'); } },
      { get text() { return t('challenge.adv-troubleshoot.hint3'); } },
    ],
  },

  // ─── 12. 総合演習 ───
  {
    id: 'adv-comprehensive',
    get title() { return t('challenge.adv-comprehensive.title'); },
    difficulty: 'advanced',
    category: 'Comprehensive',
    get description() { return t('challenge.adv-comprehensive.desc'); },
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
      { get text() { return t('challenge.adv-comprehensive.obj0'); },
        check: (devices) => {
          const trace = tracePacketFlow(devices, 'PC1', devices.SV1?.interfaces?.Ethernet0?.ip, 'tcp', 443);
          return trace.reachable;
        }
      },
      { get text() { return t('challenge.adv-comprehensive.obj1'); },
        check: (devices) => {
          if (!devices.SV1?.interfaces?.Ethernet0?.ip) return false;
          const trace = tracePacketFlow(devices, 'PC1', devices.SV1.interfaces.Ethernet0.ip, 'tcp', 80);
          return !trace.reachable;
        }
      },
      { get text() { return t('challenge.adv-comprehensive.obj2'); },
        check: (devices) => devices.FW1.policies && devices.FW1.policies.length > 0
      },
    ],
    hints: [
      { get text() { return t('challenge.adv-comprehensive.hint0'); } },
      { get text() { return t('challenge.adv-comprehensive.hint1'); } },
      { get text() { return t('challenge.adv-comprehensive.hint2'); } },
      { get text() { return t('challenge.adv-comprehensive.hint3'); } },
      { get text() { return t('challenge.adv-comprehensive.hint4'); } },
    ],
    get congratsMessage() { return t('challenge.adv-comprehensive.congrats'); },
  },
];
