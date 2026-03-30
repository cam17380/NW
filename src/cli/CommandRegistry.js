// ─── Command tree and hint data for CLI modes ───

export const commandTree = {
  user: ['enable', 'show ip interface brief', 'show ip route', 'show running-config', 'show interfaces', 'show vlan brief', 'show interfaces trunk', 'show interfaces switchport', 'show ip nat translations', 'show ip nat statistics', 'ping', 'exit'],
  privileged: ['configure terminal', 'show ip interface brief', 'show ip route', 'show running-config', 'show interfaces', 'show vlan brief', 'show interfaces trunk', 'show interfaces switchport', 'show ip nat translations', 'show ip nat statistics', 'ping', 'disable', 'exit'],
  config: ['hostname', 'interface', 'ip route', 'ip default-gateway', 'no ip route', 'vlan', 'no vlan', 'ip nat inside source static', 'ip nat inside source list', 'ip nat pool', 'no ip nat inside source static', 'no ip nat pool', 'access-list', 'no access-list', 'exit', 'end'],
  'config-if': ['ip address', 'no shutdown', 'shutdown', 'description', 'switchport mode access', 'switchport mode trunk', 'switchport access vlan', 'switchport trunk allowed vlan', 'ip nat inside', 'ip nat outside', 'no ip nat inside', 'no ip nat outside', 'exit', 'end'],
  'config-vlan': ['name', 'exit', 'end'],
};

export function getCmdHintData(store) {
  const dev = () => store.getCurrentDevice();
  const isSwitch = () => store.isSwitch();
  const isRouter = () => dev().type === 'router';

  return {
    user: [
      { label: 'enable', fill: 'enable', cat: 'nav' },
      { label: 'show ip int brief', fill: 'show ip interface brief', cat: 'show' },
      { label: 'show ip route', fill: 'show ip route', cat: 'show', cond: () => dev().type !== 'switch' },
      { label: 'show run', fill: 'show running-config', cat: 'show' },
      { label: 'show interfaces', fill: 'show interfaces', cat: 'show' },
      { label: 'show vlan brief', fill: 'show vlan brief', cat: 'vlan', cond: isSwitch },
      { label: 'show int trunk', fill: 'show interfaces trunk', cat: 'vlan', cond: isSwitch },
      { label: 'show int switchport', fill: 'show interfaces switchport', cat: 'vlan', cond: isSwitch },
      { label: 'show ip nat translations', fill: 'show ip nat translations', cat: 'nat', cond: isRouter },
      { label: 'show ip nat statistics', fill: 'show ip nat statistics', cat: 'nat', cond: isRouter },
      { label: 'ping <ip>', fill: 'ping ', cat: 'show' },
    ],
    privileged: [
      { label: 'configure terminal', fill: 'configure terminal', cat: 'nav' },
      { label: 'show ip int brief', fill: 'show ip interface brief', cat: 'show' },
      { label: 'show ip route', fill: 'show ip route', cat: 'show', cond: () => dev().type !== 'switch' },
      { label: 'show run', fill: 'show running-config', cat: 'show' },
      { label: 'show interfaces', fill: 'show interfaces', cat: 'show' },
      { label: 'show vlan brief', fill: 'show vlan brief', cat: 'vlan', cond: isSwitch },
      { label: 'show int trunk', fill: 'show interfaces trunk', cat: 'vlan', cond: isSwitch },
      { label: 'show int switchport', fill: 'show interfaces switchport', cat: 'vlan', cond: isSwitch },
      { label: 'show ip nat translations', fill: 'show ip nat translations', cat: 'nat', cond: isRouter },
      { label: 'show ip nat statistics', fill: 'show ip nat statistics', cat: 'nat', cond: isRouter },
      { label: 'ping <ip>', fill: 'ping ', cat: 'show' },
      { label: 'disable', fill: 'disable', cat: 'nav' },
      { label: 'exit', fill: 'exit', cat: 'nav' },
    ],
    config: [
      { label: 'hostname <name>', fill: 'hostname ', cat: 'config' },
      { label: 'interface <name>', fill: 'interface ', cat: 'nav' },
      { label: 'ip route <net> <mask> <hop>', fill: 'ip route ', cat: 'route', cond: isRouter },
      { label: 'no ip route <net> <mask> <hop>', fill: 'no ip route ', cat: 'route', cond: isRouter },
      { label: 'ip default-gateway <ip>', fill: 'ip default-gateway ', cat: 'route', cond: () => dev().type === 'pc' },
      { label: 'ip nat inside source static <local> <global>', fill: 'ip nat inside source static ', cat: 'nat', cond: isRouter },
      { label: 'ip nat pool <name> <start> <end> netmask <mask>', fill: 'ip nat pool ', cat: 'nat', cond: isRouter },
      { label: 'ip nat inside source list <acl> pool <name>', fill: 'ip nat inside source list ', cat: 'nat', cond: isRouter },
      { label: 'access-list <num> permit <net> <wildcard>', fill: 'access-list ', cat: 'nat', cond: isRouter },
      { label: 'vlan <id>', fill: 'vlan ', cat: 'vlan', cond: isSwitch },
      { label: 'no vlan <id>', fill: 'no vlan ', cat: 'vlan', cond: isSwitch },
      { label: 'exit', fill: 'exit', cat: 'nav' },
      { label: 'end', fill: 'end', cat: 'nav' },
    ],
    'config-if': [
      { label: 'ip address <ip> <mask>', fill: 'ip address ', cat: 'config' },
      { label: 'no shutdown', fill: 'no shutdown', cat: 'config' },
      { label: 'shutdown', fill: 'shutdown', cat: 'config' },
      { label: 'description <text>', fill: 'description ', cat: 'config' },
      { label: 'switchport mode access', fill: 'switchport mode access', cat: 'vlan', cond: isSwitch },
      { label: 'switchport mode trunk', fill: 'switchport mode trunk', cat: 'vlan', cond: isSwitch },
      { label: 'switchport access vlan <id>', fill: 'switchport access vlan ', cat: 'vlan', cond: isSwitch },
      { label: 'switchport trunk allowed vlan <list>', fill: 'switchport trunk allowed vlan ', cat: 'vlan', cond: isSwitch },
      { label: 'ip nat inside', fill: 'ip nat inside', cat: 'nat', cond: isRouter },
      { label: 'ip nat outside', fill: 'ip nat outside', cat: 'nat', cond: isRouter },
      { label: 'exit', fill: 'exit', cat: 'nav' },
      { label: 'end', fill: 'end', cat: 'nav' },
    ],
    'config-vlan': [
      { label: 'name <vlan-name>', fill: 'name ', cat: 'vlan' },
      { label: 'exit', fill: 'exit', cat: 'nav' },
      { label: 'end', fill: 'end', cat: 'nav' },
    ],
  };
}
