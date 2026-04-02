// ─── NAT Tests ───
import { applyNAT, canReach, matchesACL } from '../../simulation/Routing.js';
import { buildNatTopology } from '../TestTopologies.js';

export function registerNatTests(runner) {
  runner.category('NAT');

  runner.test('Static NAT: inside local to inside global translation', (assert) => {
    const { devices } = buildNatTopology();
    const result = applyNAT(devices.R1, '192.168.1.100', '8.8.8.8', 'GigabitEthernet0/0');
    assert.ok(result.translated, 'Static NAT should translate');
    assert.equal(result.srcIP, '203.0.113.100', 'Source should be translated to global IP');
    assert.equal(result.dstIP, '8.8.8.8', 'Destination should not change');
  }, buildNatTopology);

  runner.test('Static NAT: outside to inside (reverse) translation', (assert) => {
    const { devices } = buildNatTopology();
    // First create the translation entry
    devices.R1.nat.translations.push({ insideLocal: '192.168.1.100', insideGlobal: '203.0.113.100', type: 'static' });
    const result = applyNAT(devices.R1, '8.8.8.8', '203.0.113.100', 'GigabitEthernet0/1');
    assert.ok(result.translated, 'Reverse NAT should translate');
    assert.equal(result.dstIP, '192.168.1.100', 'Destination should be translated to local IP');
  }, buildNatTopology);

  runner.test('Dynamic NAT: ACL match allocates from pool', (assert) => {
    const { devices } = buildNatTopology();
    // PC1 (192.168.1.10) matches ACL 1 (192.168.1.0/24 permit)
    const result = applyNAT(devices.R1, '192.168.1.10', '8.8.8.8', 'GigabitEthernet0/0');
    assert.ok(result.translated, 'Dynamic NAT should translate');
    assert.equal(result.srcIP, '203.0.113.10', 'Should get first IP from pool');
  }, buildNatTopology);

  runner.test('Dynamic NAT: same source reuses existing translation', (assert) => {
    const { devices } = buildNatTopology();
    // First allocation
    applyNAT(devices.R1, '192.168.1.10', '8.8.8.8', 'GigabitEthernet0/0');
    // Second allocation for same source
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
    // Remove natRole from interfaces
    delete devices.R1.interfaces['GigabitEthernet0/0'].natRole;
    const result = applyNAT(devices.R1, '192.168.1.10', '8.8.8.8', 'GigabitEthernet0/0');
    assert.ok(!result.translated, 'Should not translate without NAT role');
  }, buildNatTopology);
}
