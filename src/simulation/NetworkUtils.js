// ─── Network utility functions (pure, no side effects) ───

export function isValidIP(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => { const n = parseInt(p); return n >= 0 && n <= 255 && String(n) === p; });
}

export function maskToCIDR(mask) {
  if (!mask) return '0';
  return mask.split('.').reduce((acc, o) => acc + (parseInt(o) >>> 0).toString(2).split('1').length - 1, 0);
}

export function getNetwork(ip, mask) {
  if (!ip || !mask) return '';
  const ipP = ip.split('.').map(Number);
  const mP = mask.split('.').map(Number);
  return ipP.map((p, i) => p & mP[i]).join('.');
}

export function normalizeInterface(name) {
  const map = {
    'gi': 'GigabitEthernet', 'gig': 'GigabitEthernet', 'gigabitethernet': 'GigabitEthernet',
    'fa': 'FastEthernet', 'fastethernet': 'FastEthernet',
    'eth': 'Ethernet', 'ethernet': 'Ethernet', 'e': 'Ethernet',
  };
  const m = name.match(/^([a-zA-Z]+)\s*(\d+.*)$/);
  if (!m) return name;
  const prefix = m[1].toLowerCase();
  return (map[prefix] || m[1]) + m[2];
}

export function shortIfName(name) {
  return name.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa').replace('Ethernet', 'Eth');
}
