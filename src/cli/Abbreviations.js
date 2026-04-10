// ─── Command abbreviation expansion ───

const abbreviations = {
  'en': 'enable',
  'conf t': 'configure terminal',
  'conf term': 'configure terminal',
  'configure t': 'configure terminal',
  'int': 'interface',
  'int vlan': 'interface vlan',
  'sh ip int br': 'show ip interface brief',
  'sh ip int brief': 'show ip interface brief',
  'show ip int br': 'show ip interface brief',
  'show ip int brief': 'show ip interface brief',
  'sh run': 'show running-config',
  'show run': 'show running-config',
  'sh int': 'show interfaces',
  'show int': 'show interfaces',
  'sh vlan br': 'show vlan brief',
  'sh vlan brief': 'show vlan brief',
  'show vlan br': 'show vlan brief',
  'sh int trunk': 'show interfaces trunk',
  'sh int switchport': 'show interfaces switchport',
  'show int trunk': 'show interfaces trunk',
  'show int switchport': 'show interfaces switchport',
  'no shut': 'no shutdown',
  'shut': 'shutdown',
  'desc': 'description',
  'ip addr': 'ip address',
  'sw mo ac': 'switchport mode access',
  'sw mode access': 'switchport mode access',
  'switchport mo access': 'switchport mode access',
  'sw mo tr': 'switchport mode trunk',
  'sw mode trunk': 'switchport mode trunk',
  'switchport mo trunk': 'switchport mode trunk',
  'sw ac vlan': 'switchport access vlan',
  'sw access vlan': 'switchport access vlan',
  'switchport ac vlan': 'switchport access vlan',
  'sw tr allowed vlan': 'switchport trunk allowed vlan',
  'sw trunk allowed vlan': 'switchport trunk allowed vlan',
  'switchport tr allowed vlan': 'switchport trunk allowed vlan',
  'sh ip ro': 'show ip route',
  'sh ip route': 'show ip route',
  'show ip ro': 'show ip route',
  'ip ro': 'ip route',
  'ip def': 'ip default-gateway',
  'ip default': 'ip default-gateway',
  'no ip ro': 'no ip route',
  // NAT
  'sh ip nat trans': 'show ip nat translations',
  'sh ip nat translation': 'show ip nat translations',
  'show ip nat trans': 'show ip nat translations',
  'sh ip nat stat': 'show ip nat statistics',
  'show ip nat stat': 'show ip nat statistics',
  'ip nat in': 'ip nat inside',
  'ip nat out': 'ip nat outside',
  'acc': 'access-list',
  // ACL on interface
  'ip acc': 'ip access-group',
  'ip access': 'ip access-group',
  'no ip acc': 'no ip access-group',
  'no ip access': 'no ip access-group',
  // Show ACLs
  'sh acc': 'show access-lists',
  'sh access': 'show access-lists',
  'show acc': 'show access-lists',
  'show access': 'show access-lists',
  // Packet flow
  'sh pf': 'show packet-flow',
  'show pf': 'show packet-flow',
  'sh packet-flow': 'show packet-flow',
  // Bond/EtherChannel
  'sh ether': 'show etherchannel summary',
  'sh etherchannel': 'show etherchannel summary',
  'sh bond': 'show bond',
  // ARP
  'sh arp': 'show arp',
  'cl arp': 'clear arp',
  // Traceroute
  'tr': 'traceroute',
  'trace': 'traceroute',
  // Firewall
  'sh fw pol': 'show firewall policy',
  'sh firewall pol': 'show firewall policy',
  'show fw pol': 'show firewall policy',
  'show fw policy': 'show firewall policy',
  'show firewall pol': 'show firewall policy',
  'fw pol': 'firewall policy',
  'fw policy': 'firewall policy',
  'no fw pol': 'no firewall policy',
  'no fw policy': 'no firewall policy',
  // VPN / Crypto
  'int tunnel': 'interface tunnel',
  'sh crypto isakmp': 'show crypto isakmp sa',
  'show crypto isakmp': 'show crypto isakmp sa',
  'sh crypto isakmp sa': 'show crypto isakmp sa',
  'show crypto isakmp sa': 'show crypto isakmp sa',
  'sh crypto isakmp policy': 'show crypto isakmp policy',
  'show crypto isakmp policy': 'show crypto isakmp policy',
  'sh crypto ipsec': 'show crypto ipsec sa',
  'show crypto ipsec': 'show crypto ipsec sa',
  'sh crypto ipsec sa': 'show crypto ipsec sa',
  'show crypto ipsec sa': 'show crypto ipsec sa',
  'sh crypto ipsec transform-set': 'show crypto ipsec transform-set',
  'show crypto ipsec transform-set': 'show crypto ipsec transform-set',
  'sh int tunnel': 'show interfaces tunnel',
  'show int tunnel': 'show interfaces tunnel',
  'tun src': 'tunnel source',
  'tun source': 'tunnel source',
  'tun dest': 'tunnel destination',
  'tun destination': 'tunnel destination',
  'tun mode': 'tunnel mode',
  // Test access
  'te acc': 'test access',
  'te access': 'test access',
  'test acc': 'test access',
  // DHCP
  'sh ip dhcp bind': 'show ip dhcp binding',
  'sh ip dhcp binding': 'show ip dhcp binding',
  'show ip dhcp bind': 'show ip dhcp binding',
  'sh ip dhcp pool': 'show ip dhcp pool',
  'ip dhcp excl': 'ip dhcp excluded-address',
  'ip dhcp excluded': 'ip dhcp excluded-address',
  'no ip dhcp excl': 'no ip dhcp excluded-address',
  'no ip dhcp excluded': 'no ip dhcp excluded-address',
  'ip addr dhcp': 'ip address dhcp',
  'def-router': 'default-router',
  'dns': 'dns-server',
};

export function expandAbbrev(rawInput) {
  const input = rawInput.trim().replace(/\s+/g, ' ');
  const lower = input.toLowerCase();
  let bestAbbr = null, bestFull = null, bestLen = -1;
  for (const [abbr, full] of Object.entries(abbreviations)) {
    if (abbr.length > bestLen && (lower === abbr || lower.startsWith(abbr + ' '))) {
      bestAbbr = abbr;
      bestFull = full;
      bestLen = abbr.length;
    }
  }
  if (bestAbbr) return bestFull + input.slice(bestAbbr.length);
  return input;
}
