// ─── Command abbreviation expansion ───

const abbreviations = {
  'en': 'enable',
  'conf t': 'configure terminal',
  'conf term': 'configure terminal',
  'configure t': 'configure terminal',
  'int': 'interface',
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
};

export function expandAbbrev(input) {
  const lower = input.toLowerCase().trim();
  for (const [abbr, full] of Object.entries(abbreviations)) {
    if (lower === abbr) return full + input.slice(abbr.length);
    if (lower.startsWith(abbr + ' ')) return full + input.slice(abbr.length);
  }
  return input;
}
