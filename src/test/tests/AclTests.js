// ─── ACL Tests ───
import { checkInterfaceACL, evaluateExtendedACL, canReach } from '../../simulation/Routing.js';
import { buildAclTopology } from '../TestTopologies.js';

export function registerAclTests(runner) {
  runner.category('ACL');

  runner.test('Extended ACL: permit ICMP from LAN to server', (assert) => {
    const { devices } = buildAclTopology();
    // ACL 100: permit icmp 192.168.1.0/24 -> 10.0.0.0/24
    const result = checkInterfaceACL(devices.R1, 'GigabitEthernet0/0', 'in', '192.168.1.10', '10.0.0.10');
    assert.ok(result, 'ICMP from LAN to server subnet should be permitted');
  }, buildAclTopology);

  runner.test('Extended ACL: implicit deny blocks other traffic', (assert) => {
    const { devices } = buildAclTopology();
    // ACL 100 has explicit deny ip any any as last entry
    const result = checkInterfaceACL(devices.R1, 'GigabitEthernet0/0', 'in', '10.0.0.1', '10.0.0.10');
    assert.ok(!result, 'Traffic from non-LAN source should be denied');
  }, buildAclTopology);

  runner.test('No ACL applied: traffic passes freely', (assert) => {
    const { devices } = buildAclTopology();
    // GigabitEthernet0/1 has no ACL applied
    const result = checkInterfaceACL(devices.R1, 'GigabitEthernet0/1', 'in', '10.0.0.10', '192.168.1.1');
    assert.ok(result, 'No ACL means traffic should pass');
  }, buildAclTopology);

  runner.test('ACL direction: in vs out independently evaluated', (assert) => {
    const { devices } = buildAclTopology();
    // ACL 100 is applied as 'in' on Gi0/0, not as 'out'
    const resultOut = checkInterfaceACL(devices.R1, 'GigabitEthernet0/0', 'out', '10.0.0.10', '192.168.1.10');
    assert.ok(resultOut, 'Outbound should pass (no outbound ACL applied)');
  }, buildAclTopology);

  runner.test('evaluateExtendedACL returns matched entry details', (assert) => {
    const { devices } = buildAclTopology();
    const entries = devices.R1.accessLists[100];
    const result = evaluateExtendedACL(entries, '192.168.1.10', '10.0.0.10');
    assert.ok(result.matched, 'Should match');
    assert.equal(result.action, 'permit', 'Should be permit');
    assert.ok(result.entry !== null, 'Should return matched entry');
    assert.equal(result.entry.protocol, 'icmp', 'Matched entry should be ICMP rule');
  }, buildAclTopology);

  runner.test('evaluateExtendedACL: implicit deny when no match', (assert) => {
    const entries = [
      { action: 'permit', protocol: 'icmp', src: '10.0.0.0', srcWildcard: '0.0.0.255', dst: '10.0.0.0', dstWildcard: '0.0.0.255' },
    ];
    // Source 192.168.1.10 does not match 10.0.0.0/24
    const result = evaluateExtendedACL(entries, '192.168.1.10', '10.0.0.10');
    assert.ok(result.matched, 'Should still return matched (implicit deny)');
    assert.equal(result.action, 'deny', 'Should be implicit deny');
    assert.equal(result.entry, null, 'Entry should be null for implicit deny');
  }, null);

  runner.test('End-to-end: PC1 reaches server through ACL', (assert) => {
    const { devices } = buildAclTopology();
    const result = canReach(devices, 'PC1', '10.0.0.10');
    assert.ok(result, 'PC1 should reach Server1 (ACL permits ICMP from LAN)');
  }, buildAclTopology);

  runner.test('End-to-end: ACL blocks return traffic scenario', (assert) => {
    const { devices } = buildAclTopology();
    // Add outbound ACL on Gi0/1 that denies all
    devices.R1.interfaces['GigabitEthernet0/1'].accessGroup = { out: 101 };
    devices.R1.accessLists[101] = [
      { action: 'deny', protocol: 'ip', src: 'any', srcWildcard: '255.255.255.255', dst: 'any', dstWildcard: '255.255.255.255' },
    ];
    const result = canReach(devices, 'PC1', '10.0.0.10');
    assert.ok(!result, 'Outbound ACL deny should block traffic');
  }, buildAclTopology);
}
