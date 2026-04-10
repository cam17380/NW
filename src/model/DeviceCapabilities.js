// ─── Device Capabilities Registry ───
// Centralizes "which device types can do what" so that adding a new device
// type only requires updating the CAPABILITIES map, not 200+ if/else checks.
//
// Usage:
//   import { hasCapability } from '../model/DeviceCapabilities.js';
//   if (hasCapability(dev, 'nat')) { ... }
//
// Replaces scattered patterns like:
//   if (dev.type === 'router' || dev.type === 'firewall') { ... }

const CAPABILITIES = {
  router:   ['l3Forwarding', 'nat', 'vpn', 'acl', 'staticRoute', 'dhcpServer'],
  firewall: ['l3Forwarding', 'nat', 'vpn', 'acl', 'staticRoute', 'firewallPolicy'],
  switch:   ['vlan', 'l2Switching', 'acl', 'staticRoute'],
  server:   ['host', 'defaultGateway', 'lag', 'staticRoute'],
  pc:       ['host', 'defaultGateway', 'lag', 'dhcpClient'],
};

/**
 * Check whether a device has a given capability.
 * @param {object} dev  Device object (must have .type)
 * @param {string} cap  Capability name (e.g. 'nat', 'vlan', 'host')
 * @returns {boolean}
 */
export function hasCapability(dev, cap) {
  const caps = CAPABILITIES[dev.type];
  return caps ? caps.includes(cap) : false;
}

