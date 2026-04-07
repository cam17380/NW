// ─── Firewall Tests ───
import { canReach, checkFirewallPolicies, applyDNAT, applySNAT } from '../../simulation/Routing.js';
import { tracePacketFlow, buildPingPath } from '../../simulation/PingEngine.js';
import { buildFirewallTopology, buildDnatFirewallTopology } from '../TestTopologies.js';

export function registerFirewallTests(runner) {
  runner.category('Firewall');

  // --- Existing basic policy tests ---

  runner.test('Permitted policy: LAN ICMP to DMZ is allowed', (assert) => {
    const { devices } = buildFirewallTopology();
    const result = checkFirewallPolicies(devices.FW1, '192.168.1.10', '172.16.0.10', 'icmp', null);
    assert.ok(result, 'ICMP from LAN to DMZ should be permitted');
  }, buildFirewallTopology);

  runner.test('Denied policy: 10.x.x.x to DMZ is blocked', (assert) => {
    const { devices } = buildFirewallTopology();
    const result = checkFirewallPolicies(devices.FW1, '10.0.0.1', '172.16.0.10', 'icmp', null);
    assert.ok(!result, 'Traffic from 10.x to DMZ should be denied');
  }, buildFirewallTopology);

  runner.test('Implicit deny: unmatched traffic is blocked', (assert) => {
    const { devices } = buildFirewallTopology();
    const result = checkFirewallPolicies(devices.FW1, '8.8.8.8', '172.16.0.10', 'icmp', null);
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
    const result = checkFirewallPolicies(devices.FW1, '192.168.1.10', '172.16.0.10', 'icmp', null);
    assert.ok(!result, 'No policies should mean implicit deny');
  }, buildFirewallTopology);

  runner.test('Policy sequence order: lower seq evaluated first', (assert) => {
    const { devices } = buildFirewallTopology();
    devices.FW1.policies.push({
      seq: 5, action: 'deny', src: '192.168.1.0', srcWildcard: '0.0.0.255',
      dst: '172.16.0.0', dstWildcard: '0.0.0.255', protocol: 'icmp', port: null
    });
    const result = checkFirewallPolicies(devices.FW1, '192.168.1.10', '172.16.0.10', 'icmp', null);
    assert.ok(!result, 'Deny at seq 5 should override permit at seq 10');
  }, buildFirewallTopology);

  // --- Protocol/port matching tests ---

  runner.test('Policy proto/port: TCP/443 matches tcp rule', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = checkFirewallPolicies(devices.FW1, '10.0.0.10', '192.168.1.10', 'tcp', 443);
    assert.ok(result, 'TCP/443 to WebSV should be permitted by seq 10');
  }, buildDnatFirewallTopology);

  runner.test('Policy proto/port: TCP/80 from LAN matches outbound rule', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = checkFirewallPolicies(devices.FW1, '192.168.1.10', '10.0.0.10', 'tcp', 80);
    assert.ok(result, 'TCP/80 from LAN should be permitted by seq 20');
  }, buildDnatFirewallTopology);

  runner.test('Policy proto/port: TCP/22 is denied by default', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = checkFirewallPolicies(devices.FW1, '10.0.0.10', '192.168.1.10', 'tcp', 22);
    assert.ok(!result, 'TCP/22 should be denied (no matching permit rule)');
  }, buildDnatFirewallTopology);

  runner.test('Policy proto/port: wrong port on correct proto is denied', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = checkFirewallPolicies(devices.FW1, '10.0.0.10', '192.168.1.10', 'tcp', 80);
    assert.ok(!result, 'TCP/80 inbound should be denied (seq 10 only permits 443)');
  }, buildDnatFirewallTopology);

  // --- DNAT/SNAT order tests ---

  runner.test('DNAT: outside->inside destination translation', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = applyDNAT(devices.FW1, '10.0.0.10', '203.0.113.10', 'GigabitEthernet0/0');
    assert.ok(result.translated, 'DNAT should translate');
    assert.equal(result.dstIP, '192.168.1.10', 'Destination should be translated to inside local');
    assert.equal(result.srcIP, '10.0.0.10', 'Source should not change');
  }, buildDnatFirewallTopology);

  runner.test('DNAT: inside interface does not trigger DNAT', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = applyDNAT(devices.FW1, '192.168.1.10', '203.0.113.10', 'GigabitEthernet0/1');
    assert.ok(!result.translated, 'DNAT should not apply on inside interface');
  }, buildDnatFirewallTopology);

  runner.test('SNAT: inside->outside source translation (static)', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = applySNAT(devices.FW1, '192.168.1.10', '10.0.0.10', 'GigabitEthernet0/1');
    assert.ok(result.translated, 'SNAT should translate');
    assert.equal(result.srcIP, '203.0.113.10', 'Source should be translated to inside global');
  }, buildDnatFirewallTopology);

  runner.test('SNAT: outside interface does not trigger SNAT', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = applySNAT(devices.FW1, '10.0.0.10', '192.168.1.10', 'GigabitEthernet0/0');
    assert.ok(!result.translated, 'SNAT should not apply on outside interface');
  }, buildDnatFirewallTopology);

  runner.test('End-to-end DNAT: external PC reaches WebSV via NAT global IP', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = tracePacketFlow(devices, 'PC_EXT', '203.0.113.10', 'tcp', 443);
    assert.ok(result.reachable, 'Should reach WebSV via DNAT');
    const fwHop = result.hops.find(h => h.deviceId === 'FW1');
    assert.ok(fwHop, 'Should pass through FW1');
    const dnatDecision = fwHop.decisions.find(d => d.text && d.text.includes('outside->inside'));
    assert.ok(dnatDecision, 'Should show DNAT translation in decisions');
  }, buildDnatFirewallTopology);

  runner.test('End-to-end SNAT: WebSV reaches external via Hide NAT', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = tracePacketFlow(devices, 'SV1', '10.0.0.10', 'tcp', 80);
    assert.ok(result.reachable, 'Should reach external PC via SNAT');
    const fwHop = result.hops.find(h => h.deviceId === 'FW1');
    assert.ok(fwHop, 'Should pass through FW1');
    const policyDecision = fwHop.decisions.find(d => d.text && d.text.includes('seq 20'));
    assert.ok(policyDecision, 'Policy seq 20 should match (pre-SNAT source)');
  }, buildDnatFirewallTopology);

  runner.test('DNAT order: policy evaluates post-DNAT destination', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    // Policy seq 10 permits any -> 192.168.1.10 tcp/443
    // Without DNAT, dst would be 203.0.113.10 which does NOT match
    // With DNAT first, dst becomes 192.168.1.10 which DOES match
    const result = tracePacketFlow(devices, 'PC_EXT', '203.0.113.10', 'tcp', 443);
    assert.ok(result.reachable, 'DNAT should translate dst before policy evaluation');
  }, buildDnatFirewallTopology);

  runner.test('SNAT order: policy evaluates pre-SNAT source', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    // Policy seq 20 permits 192.168.1.0/24 -> any tcp/80
    // If SNAT happened before policy, src would be 203.0.113.10 which does NOT match
    // With correct order (policy first), src is 192.168.1.10 which DOES match
    const result = tracePacketFlow(devices, 'SV1', '10.0.0.10', 'tcp', 80);
    assert.ok(result.reachable, 'Policy should evaluate pre-SNAT source');
  }, buildDnatFirewallTopology);
}
