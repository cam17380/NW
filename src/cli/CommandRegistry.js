// ─── Command tree and hint data for CLI modes ───
import { hasCapability } from '../model/DeviceCapabilities.js';

export const commandTree = {
  user: ['enable', 'show ip interface brief', 'show ip route', 'show running-config', 'show interfaces', 'show vlan brief', 'show interfaces trunk', 'show interfaces switchport', 'show interfaces tunnel', 'show ip nat translations', 'show ip nat statistics', 'show ip dhcp binding', 'show ip dhcp pool', 'show firewall policy', 'show access-lists', 'show crypto isakmp sa', 'show crypto ipsec sa', 'show arp', 'show etherchannel summary', 'show packet-flow', 'ping', 'traceroute', 'test access', 'exit'],
  privileged: ['configure terminal', 'show ip interface brief', 'show ip route', 'show running-config', 'show interfaces', 'show vlan brief', 'show interfaces trunk', 'show interfaces switchport', 'show interfaces tunnel', 'show ip nat translations', 'show ip nat statistics', 'show ip dhcp binding', 'show ip dhcp pool', 'show firewall policy', 'show access-lists', 'show crypto isakmp sa', 'show crypto ipsec sa', 'show arp', 'show etherchannel summary', 'show packet-flow', 'ping', 'traceroute', 'test access', 'clear arp', 'renew dhcp', 'disable', 'exit'],
  config: ['hostname', 'interface', 'interface vlan', 'interface tunnel', 'ip route', 'ip default-gateway', 'no ip route', 'vlan', 'no vlan', 'ip nat inside source static', 'ip nat inside source list', 'ip nat pool', 'no ip nat inside source static', 'no ip nat pool', 'ip dhcp pool', 'no ip dhcp pool', 'ip dhcp excluded-address', 'no ip dhcp excluded-address', 'access-list', 'no access-list', 'firewall policy', 'no firewall policy', 'crypto isakmp policy', 'crypto ipsec transform-set', 'crypto map', 'no crypto isakmp policy', 'no crypto ipsec transform-set', 'no crypto map', 'exit', 'end'],
  'config-if': ['ip address', 'ip address dhcp', 'no ip address dhcp', 'no shutdown', 'shutdown', 'description', 'switchport mode access', 'switchport mode trunk', 'switchport access vlan', 'switchport trunk allowed vlan', 'ip nat inside', 'ip nat outside', 'no ip nat inside', 'no ip nat outside', 'ip access-group', 'no ip access-group', 'tunnel source', 'tunnel destination', 'tunnel mode', 'crypto map', 'no crypto map', 'bond-group', 'no bond-group', 'exit', 'end'],
  'config-vlan': ['name', 'exit', 'end'],
  'config-isakmp': ['encryption', 'hash', 'authentication', 'group', 'lifetime', 'exit', 'end'],
  'config-crypto-map': ['set peer', 'set transform-set', 'match address', 'exit', 'end'],
  'config-dhcp-pool': ['network', 'default-router', 'dns-server', 'lease', 'exit', 'end'],
};

export function getCmdHintData(store) {
  const dev = () => store.getCurrentDevice();
  const isSwitch = () => store.isSwitch();
  const d = () => dev();
  const isFirewall = () => hasCapability(d(), 'firewallPolicy');
  const isServer = () => d().type === 'server';
  const isRouterOrFW = () => hasCapability(d(), 'nat');
  const isRouterOrFWOrSV = () => hasCapability(d(), 'nat') || d().type === 'server';
  const isL3Capable = () => hasCapability(d(), 'l3Forwarding') || hasCapability(d(), 'vlan');
  const isRouterOrFWOrSVOrSW = () => hasCapability(d(), 'staticRoute');
  const hasSVI = () => isSwitch() && Object.keys(dev().interfaces).some(n => n.startsWith('Vlan'));

  const isTunnel = () => {
    const ci = store.getCurrentInterface();
    return ci && ci.startsWith('Tunnel');
  };

  return {
    user: [
      { label: 'enable', fill: 'enable', cat: 'nav' },
      { label: 'show ip int brief', fill: 'show ip interface brief', cat: 'show' },
      { label: 'show ip route', fill: 'show ip route', cat: 'show', cond: () => dev().type !== 'switch' || hasSVI() },
      { label: 'show run', fill: 'show running-config', cat: 'show' },
      { label: 'show interfaces', fill: 'show interfaces', cat: 'show' },
      { label: 'show vlan brief', fill: 'show vlan brief', cat: 'vlan', cond: isSwitch },
      { label: 'show int trunk', fill: 'show interfaces trunk', cat: 'vlan', cond: isSwitch },
      { label: 'show int switchport', fill: 'show interfaces switchport', cat: 'vlan', cond: isSwitch },
      { label: 'show ip nat translations', fill: 'show ip nat translations', cat: 'nat', cond: isRouterOrFW },
      { label: 'show ip nat statistics', fill: 'show ip nat statistics', cat: 'nat', cond: isRouterOrFW },
      { label: 'show firewall policy', fill: 'show firewall policy', cat: 'firewall', cond: isFirewall },
      { label: 'show access-lists', fill: 'show access-lists', cat: 'acl', cond: isL3Capable },
      { label: 'show arp', fill: 'show arp', cat: 'show', cond: () => dev().type !== 'switch' || hasSVI() },
      { label: 'show crypto isakmp sa', fill: 'show crypto isakmp sa', cat: 'vpn', cond: isRouterOrFW },
      { label: 'show crypto ipsec sa', fill: 'show crypto ipsec sa', cat: 'vpn', cond: isRouterOrFW },
      { label: 'show interfaces tunnel', fill: 'show interfaces tunnel', cat: 'vpn', cond: isRouterOrFW },
      { label: 'show ip dhcp binding', fill: 'show ip dhcp binding', cat: 'dhcp', cond: () => dev().type === 'router' },
      { label: 'show ip dhcp pool', fill: 'show ip dhcp pool', cat: 'dhcp', cond: () => dev().type === 'router' },
      { label: 'show etherchannel summary', fill: 'show etherchannel summary', cat: 'show', cond: () => dev().type === 'server' || dev().type === 'pc' },
      { label: 'show packet-flow <ip>', fill: 'show packet-flow ', cat: 'show', cond: () => dev().type !== 'switch' || hasSVI() },
      { label: 'ping <ip>', fill: 'ping ', cat: 'show' },
      { label: 'traceroute <ip>', fill: 'traceroute ', cat: 'show' },
      { label: 'test access <ip> <proto> [port]', fill: 'test access ', cat: 'show', cond: () => dev().type !== 'switch' || hasSVI() },
    ],
    privileged: [
      { label: 'configure terminal', fill: 'configure terminal', cat: 'nav' },
      { label: 'show ip int brief', fill: 'show ip interface brief', cat: 'show' },
      { label: 'show ip route', fill: 'show ip route', cat: 'show', cond: () => dev().type !== 'switch' || hasSVI() },
      { label: 'show run', fill: 'show running-config', cat: 'show' },
      { label: 'show interfaces', fill: 'show interfaces', cat: 'show' },
      { label: 'show vlan brief', fill: 'show vlan brief', cat: 'vlan', cond: isSwitch },
      { label: 'show int trunk', fill: 'show interfaces trunk', cat: 'vlan', cond: isSwitch },
      { label: 'show int switchport', fill: 'show interfaces switchport', cat: 'vlan', cond: isSwitch },
      { label: 'show ip nat translations', fill: 'show ip nat translations', cat: 'nat', cond: isRouterOrFW },
      { label: 'show ip nat statistics', fill: 'show ip nat statistics', cat: 'nat', cond: isRouterOrFW },
      { label: 'show firewall policy', fill: 'show firewall policy', cat: 'firewall', cond: isFirewall },
      { label: 'show access-lists', fill: 'show access-lists', cat: 'acl', cond: isL3Capable },
      { label: 'show arp', fill: 'show arp', cat: 'show', cond: () => dev().type !== 'switch' || hasSVI() },
      { label: 'show crypto isakmp sa', fill: 'show crypto isakmp sa', cat: 'vpn', cond: isRouterOrFW },
      { label: 'show crypto ipsec sa', fill: 'show crypto ipsec sa', cat: 'vpn', cond: isRouterOrFW },
      { label: 'show interfaces tunnel', fill: 'show interfaces tunnel', cat: 'vpn', cond: isRouterOrFW },
      { label: 'show ip dhcp binding', fill: 'show ip dhcp binding', cat: 'dhcp', cond: () => dev().type === 'router' },
      { label: 'show ip dhcp pool', fill: 'show ip dhcp pool', cat: 'dhcp', cond: () => dev().type === 'router' },
      { label: 'show etherchannel summary', fill: 'show etherchannel summary', cat: 'show', cond: () => dev().type === 'server' || dev().type === 'pc' },
      { label: 'show packet-flow <ip>', fill: 'show packet-flow ', cat: 'show', cond: () => dev().type !== 'switch' || hasSVI() },
      { label: 'ping <ip>', fill: 'ping ', cat: 'show' },
      { label: 'traceroute <ip>', fill: 'traceroute ', cat: 'show' },
      { label: 'test access <ip> <proto> [port]', fill: 'test access ', cat: 'show', cond: () => dev().type !== 'switch' || hasSVI() },
      { label: 'clear arp', fill: 'clear arp', cat: 'config', cond: () => dev().type !== 'switch' },
      { label: 'renew dhcp', fill: 'renew dhcp', cat: 'dhcp', cond: () => dev().type === 'pc' },
      { label: 'disable', fill: 'disable', cat: 'nav' },
      { label: 'exit', fill: 'exit', cat: 'nav' },
    ],
    config: [
      { label: 'hostname <name>', fill: 'hostname ', cat: 'config' },
      { label: 'interface <name>', fill: 'interface ', cat: 'nav' },
      { label: 'interface vlan <id>', fill: 'interface vlan ', cat: 'nav', cond: isSwitch },
      { label: 'ip route <net> <mask> <hop>', fill: 'ip route ', cat: 'route', cond: isRouterOrFWOrSVOrSW },
      { label: 'no ip route <net> <mask> <hop>', fill: 'no ip route ', cat: 'route', cond: isRouterOrFWOrSVOrSW },
      { label: 'ip default-gateway <ip>', fill: 'ip default-gateway ', cat: 'route', cond: () => dev().type === 'pc' || dev().type === 'server' },
      { label: 'ip nat inside source static <local> <global>', fill: 'ip nat inside source static ', cat: 'nat', cond: isRouterOrFW },
      { label: 'ip nat pool <name> <start> <end> netmask <mask>', fill: 'ip nat pool ', cat: 'nat', cond: isRouterOrFW },
      { label: 'ip nat inside source list <acl> pool <name>', fill: 'ip nat inside source list ', cat: 'nat', cond: isRouterOrFW },
      { label: 'ip dhcp pool <name>', fill: 'ip dhcp pool ', cat: 'dhcp', cond: () => dev().type === 'router' },
      { label: 'no ip dhcp pool <name>', fill: 'no ip dhcp pool ', cat: 'dhcp', cond: () => dev().type === 'router' },
      { label: 'ip dhcp excluded-address <start> [end]', fill: 'ip dhcp excluded-address ', cat: 'dhcp', cond: () => dev().type === 'router' },
      { label: 'access-list <1-99> permit|deny <net> <wc>', fill: 'access-list ', cat: 'acl', cond: isL3Capable },
      { label: 'access-list <100-199> permit|deny <proto> <src> <dst> [eq port]', fill: 'access-list ', cat: 'acl', cond: isL3Capable },
      { label: 'firewall policy <seq> permit|deny ...', fill: 'firewall policy ', cat: 'firewall', cond: isFirewall },
      { label: 'no firewall policy <seq>|all', fill: 'no firewall policy ', cat: 'firewall', cond: isFirewall },
      { label: 'interface tunnel <N>', fill: 'interface tunnel ', cat: 'vpn', cond: isRouterOrFW },
      { label: 'crypto isakmp policy <num>', fill: 'crypto isakmp policy ', cat: 'vpn', cond: isRouterOrFW },
      { label: 'crypto ipsec transform-set <name> <t1> [t2]', fill: 'crypto ipsec transform-set ', cat: 'vpn', cond: isRouterOrFW },
      { label: 'crypto map <name> <seq> ipsec-isakmp', fill: 'crypto map ', cat: 'vpn', cond: isRouterOrFW },
      { label: 'vlan <id>', fill: 'vlan ', cat: 'vlan', cond: isSwitch },
      { label: 'no vlan <id>', fill: 'no vlan ', cat: 'vlan', cond: isSwitch },
      { label: 'exit', fill: 'exit', cat: 'nav' },
      { label: 'end', fill: 'end', cat: 'nav' },
    ],
    'config-if': [
      { label: 'ip address <ip> <mask>', fill: 'ip address ', cat: 'config' },
      { label: 'ip address dhcp', fill: 'ip address dhcp', cat: 'dhcp', cond: () => dev().type === 'pc' },
      { label: 'no shutdown', fill: 'no shutdown', cat: 'config' },
      { label: 'shutdown', fill: 'shutdown', cat: 'config' },
      { label: 'description <text>', fill: 'description ', cat: 'config' },
      { label: 'switchport mode access', fill: 'switchport mode access', cat: 'vlan', cond: isSwitch },
      { label: 'switchport mode trunk', fill: 'switchport mode trunk', cat: 'vlan', cond: isSwitch },
      { label: 'switchport access vlan <id>', fill: 'switchport access vlan ', cat: 'vlan', cond: isSwitch },
      { label: 'switchport trunk allowed vlan <list>', fill: 'switchport trunk allowed vlan ', cat: 'vlan', cond: isSwitch },
      { label: 'ip nat inside', fill: 'ip nat inside', cat: 'nat', cond: isRouterOrFW },
      { label: 'ip nat outside', fill: 'ip nat outside', cat: 'nat', cond: isRouterOrFW },
      { label: 'ip access-group <acl> in|out', fill: 'ip access-group ', cat: 'acl', cond: isL3Capable },
      { label: 'no ip access-group <acl> in|out', fill: 'no ip access-group ', cat: 'acl', cond: isL3Capable },
      { label: 'tunnel source <if|ip>', fill: 'tunnel source ', cat: 'vpn', cond: isTunnel },
      { label: 'tunnel destination <ip>', fill: 'tunnel destination ', cat: 'vpn', cond: isTunnel },
      { label: 'tunnel mode ipsec|gre', fill: 'tunnel mode ', cat: 'vpn', cond: isTunnel },
      { label: 'crypto map <name>', fill: 'crypto map ', cat: 'vpn', cond: isRouterOrFW },
      { label: 'bond-group <name>', fill: 'bond-group ', cat: 'config', cond: () => dev().type === 'server' || dev().type === 'pc' },
      { label: 'no bond-group', fill: 'no bond-group', cat: 'config', cond: () => dev().type === 'server' || dev().type === 'pc' },
      { label: 'exit', fill: 'exit', cat: 'nav' },
      { label: 'end', fill: 'end', cat: 'nav' },
    ],
    'config-vlan': [
      { label: 'name <vlan-name>', fill: 'name ', cat: 'vlan' },
      { label: 'exit', fill: 'exit', cat: 'nav' },
      { label: 'end', fill: 'end', cat: 'nav' },
    ],
    'config-isakmp': [
      { label: 'encryption aes|3des|des', fill: 'encryption ', cat: 'vpn' },
      { label: 'hash sha|md5', fill: 'hash ', cat: 'vpn' },
      { label: 'authentication pre-share|rsa-sig', fill: 'authentication ', cat: 'vpn' },
      { label: 'group 1|2|5|14', fill: 'group ', cat: 'vpn' },
      { label: 'lifetime <seconds>', fill: 'lifetime ', cat: 'vpn' },
      { label: 'exit', fill: 'exit', cat: 'nav' },
      { label: 'end', fill: 'end', cat: 'nav' },
    ],
    'config-crypto-map': [
      { label: 'set peer <ip>', fill: 'set peer ', cat: 'vpn' },
      { label: 'set transform-set <name>', fill: 'set transform-set ', cat: 'vpn' },
      { label: 'match address <acl-num>', fill: 'match address ', cat: 'vpn' },
      { label: 'exit', fill: 'exit', cat: 'nav' },
      { label: 'end', fill: 'end', cat: 'nav' },
    ],
    'config-dhcp-pool': [
      { label: 'network <ip> <mask>', fill: 'network ', cat: 'dhcp' },
      { label: 'default-router <ip>', fill: 'default-router ', cat: 'dhcp' },
      { label: 'dns-server <ip>', fill: 'dns-server ', cat: 'dhcp' },
      { label: 'lease <days> | infinite', fill: 'lease ', cat: 'dhcp' },
      { label: 'exit', fill: 'exit', cat: 'nav' },
      { label: 'end', fill: 'end', cat: 'nav' },
    ],
  };
}
