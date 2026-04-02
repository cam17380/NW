// ─── Firewall Tests ───
import { canReach, checkFirewallPolicies } from '../../simulation/Routing.js';
import { buildFirewallTopology } from '../TestTopologies.js';

export function registerFirewallTests(runner) {
  runner.category('Firewall');

  runner.test('Permitted policy: LAN ICMP to DMZ is allowed', (assert) => {
    const { devices } = buildFirewallTopology();
    // Policy seq 10: permit 192.168.1.0/24 -> 172.16.0.0/24 icmp
    const result = checkFirewallPolicies(devices.FW1, '192.168.1.10', '172.16.0.10');
    assert.ok(result, 'ICMP from LAN to DMZ should be permitted');
  }, buildFirewallTopology);

  runner.test('Denied policy: 10.x.x.x to DMZ is blocked', (assert) => {
    const { devices } = buildFirewallTopology();
    // Policy seq 20: deny 10.0.0.0/8 -> 172.16.0.0/24
    const result = checkFirewallPolicies(devices.FW1, '10.0.0.1', '172.16.0.10');
    assert.ok(!result, 'Traffic from 10.x to DMZ should be denied');
  }, buildFirewallTopology);

  runner.test('Implicit deny: unmatched traffic is blocked', (assert) => {
    const { devices } = buildFirewallTopology();
    // Source 8.8.8.8 matches no policy -> implicit deny
    const result = checkFirewallPolicies(devices.FW1, '8.8.8.8', '172.16.0.10');
    assert.ok(!result, 'Unmatched traffic should be implicitly denied');
  }, buildFirewallTopology);

  runner.test('End-to-end: PC1 reaches WebServer through firewall', (assert) => {
    const { devices } = buildFirewallTopology();
    const result = canReach(devices, 'PC1', '172.16.0.10');
    assert.ok(result, 'PC1 should reach WebServer (policy permits ICMP)');
  }, buildFirewallTopology);

  runner.test('No policies configured: implicit deny all', (assert) => {
    const { devices } = buildFirewallTopology();
    devices.FW1.policies = [];
    const result = checkFirewallPolicies(devices.FW1, '192.168.1.10', '172.16.0.10');
    assert.ok(!result, 'No policies should mean implicit deny');
  }, buildFirewallTopology);

  runner.test('Policy sequence order: lower seq evaluated first', (assert) => {
    const { devices } = buildFirewallTopology();
    // Add a conflicting deny at seq 5 (before the permit at seq 10)
    devices.FW1.policies.push({
      seq: 5, action: 'deny', src: '192.168.1.0', srcWildcard: '0.0.0.255',
      dst: '172.16.0.0', dstWildcard: '0.0.0.255', protocol: 'icmp', port: null
    });
    const result = checkFirewallPolicies(devices.FW1, '192.168.1.10', '172.16.0.10');
    assert.ok(!result, 'Deny at seq 5 should override permit at seq 10');
  }, buildFirewallTopology);
}
