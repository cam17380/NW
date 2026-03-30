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

// Generate a deterministic MAC address from deviceId and interface name
export function generateMAC(deviceId, ifName) {
  let hash = 0;
  const str = deviceId + ':' + ifName;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const h = Math.abs(hash);
  const bytes = [
    0x00, 0x50, 0x56,  // OUI prefix
    (h >> 16) & 0xff,
    (h >> 8) & 0xff,
    h & 0xff,
  ];
  return bytes.map(b => b.toString(16).padStart(2, '0')).join(':');
}

export function ipToInt(ip) {
  return ip.split('.').reduce((acc, o) => (acc << 8) + parseInt(o), 0) >>> 0;
}

export function intToIP(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}
