// ─── NAT Tests ───
import { applyNAT, applyDNAT, applySNAT, canReach, matchesACL } from '../../simulation/Routing.js';
import { buildNatTopology, buildDnatFirewallTopology } from '../TestTopologies.js';

export function registerNatTests(runner) {
  runner.category('NAT');

  // --- Existing combined NAT tests (router behavior) ---

  runner.test('Static NAT: inside local to inside global translation', (assert) => {
    const { devices } = buildNatTopology();
    const result = applyNAT(devices.R1, '192.168.1.100', '8.8.8.8', 'GigabitEthernet0/0');
    assert.ok(result.translated, 'Static NAT should translate');
    assert.equal(result.srcIP, '203.0.113.100', 'Source should be translated to global IP');
    assert.equal(result.dstIP, '8.8.8.8', 'Destination should not change');
  }, buildNatTopology);

  runner.test('Static NAT: outside to inside (reverse) translation', (assert) => {
    const { devices } = buildNatTopology();
    devices.R1.nat.translations.push({ insideLocal: '192.168.1.100', insideGlobal: '203.0.113.100', type: 'static' });
    const result = applyNAT(devices.R1, '8.8.8.8', '203.0.113.100', 'GigabitEthernet0/1');
    assert.ok(result.translated, 'Reverse NAT should translate');
    assert.equal(result.dstIP, '192.168.1.100', 'Destination should be translated to local IP');
  }, buildNatTopology);

  runner.test('Dynamic NAT: ACL match allocates from pool', (assert) => {
    const { devices } = buildNatTopology();
    const result = applyNAT(devices.R1, '192.168.1.10', '8.8.8.8', 'GigabitEthernet0/0');
    assert.ok(result.translated, 'Dynamic NAT should translate');
    assert.equal(result.srcIP, '203.0.113.10', 'Should get first IP from pool');
  }, buildNatTopology);

  runner.test('Dynamic NAT: same source reuses existing translation', (assert) => {
    const { devices } = buildNatTopology();
    applyNAT(devices.R1, '192.168.1.10', '8.8.8.8', 'GigabitEthernet0/0');
    const result = applyNAT(devices.R1, '192.168.1.10', '8.8.4.4', 'GigabitEthernet0/0');
    assert.ok(result.translated, 'Should still translate');
    assert.equal(result.srcIP, '203.0.113.10', 'Should reuse the same global IP');
  }, buildNatTopology);

  runner.test('NAT ACL match: standard ACL matching for NAT', (assert) => {
    const { devices } = buildNatTopology();
    const entries = devices.R1.accessLists[1];
    assert.ok(matchesACL(entries, '192.168.1.10'), '192.168.1.10 should match ACL 1');
    assert.ok(matchesACL(entries, '192.168.1.200'), '192.168.1.200 should match ACL 1');
    assert.ok(!matchesACL(entries, '10.0.0.1'), '10.0.0.1 should NOT match ACL 1');
  }, buildNatTopology);

  runner.test('No NAT role: no translation occurs', (assert) => {
    const { devices } = buildNatTopology();
    delete devices.R1.interfaces['GigabitEthernet0/0'].natRole;
    const result = applyNAT(devices.R1, '192.168.1.10', '8.8.8.8', 'GigabitEthernet0/0');
    assert.ok(!result.translated, 'Should not translate without NAT role');
  }, buildNatTopology);

  // --- DNAT/SNAT split tests ---

  runner.test('applyDNAT: translates destination on outside interface', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = applyDNAT(devices.FW1, '10.0.0.10', '203.0.113.10', 'GigabitEthernet0/0');
    assert.ok(result.translated, 'Should translate');
    assert.equal(result.dstIP, '192.168.1.10', 'Dst should be inside local');
    assert.equal(result.srcIP, '10.0.0.10', 'Src should be unchanged');
  }, buildDnatFirewallTopology);

  runner.test('applyDNAT: no translation on inside interface', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = applyDNAT(devices.FW1, '192.168.1.10', '203.0.113.10', 'GigabitEthernet0/1');
    assert.ok(!result.translated, 'DNAT should not trigger on inside interface');
  }, buildDnatFirewallTopology);

  runner.test('applyDNAT: no translation for non-matching destination', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = applyDNAT(devices.FW1, '10.0.0.10', '203.0.113.99', 'GigabitEthernet0/0');
    assert.ok(!result.translated, 'Non-matching global IP should not translate');
  }, buildDnatFirewallTopology);

  runner.test('applySNAT: translates source on inside interface (static)', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = applySNAT(devices.FW1, '192.168.1.10', '10.0.0.10', 'GigabitEthernet0/1');
    assert.ok(result.translated, 'Should translate');
    assert.equal(result.srcIP, '203.0.113.10', 'Src should be inside global');
    assert.equal(result.dstIP, '10.0.0.10', 'Dst should be unchanged');
  }, buildDnatFirewallTopology);

  runner.test('applySNAT: no translation on outside interface', (assert) => {
    const { devices } = buildDnatFirewallTopology();
    const result = applySNAT(devices.FW1, '10.0.0.10', '192.168.1.10', 'GigabitEthernet0/0');
    assert.ok(!result.translated, 'SNAT should not trigger on outside interface');
  }, buildDnatFirewallTopology);

  runner.test('applyNAT combined: router still does both DNAT and SNAT', (assert) => {
    const { devices } = buildNatTopology();
    // Inside->outside (SNAT)
    const snat = applyNAT(devices.R1, '192.168.1.100', '8.8.8.8', 'GigabitEthernet0/0');
    assert.ok(snat.translated, 'Combined should handle SNAT');
    assert.equal(snat.srcIP, '203.0.113.100', 'Source should be global');
    // Outside->inside (DNAT)
    devices.R1.nat.translations.push({ insideLocal: '192.168.1.100', insideGlobal: '203.0.113.100', type: 'static' });
    const dnat = applyNAT(devices.R1, '8.8.8.8', '203.0.113.100', 'GigabitEthernet0/1');
    assert.ok(dnat.translated, 'Combined should handle DNAT');
    assert.equal(dnat.dstIP, '192.168.1.100', 'Dst should be local');
  }, buildNatTopology);
}
