// ─── VLAN Isolation Tests ───
import { canReach } from '../../simulation/Routing.js';
import { buildPingPath, computeArpResolutions } from '../../simulation/PingEngine.js';
import { buildVlanTopology } from '../TestTopologies.js';

export function registerVlanTests(runner) {
  runner.category('VLAN Isolation');

  runner.test('Same VLAN (10): PC1 can ping PC2', (assert) => {
    const { devices } = buildVlanTopology();
    const result = canReach(devices, 'PC1', '192.168.10.11');
    assert.ok(result, 'PC1 (VLAN10) should reach PC2 (VLAN10)');
  }, buildVlanTopology);

  runner.test('Same VLAN (20): PC3 can ping PC4', (assert) => {
    const { devices } = buildVlanTopology();
    const result = canReach(devices, 'PC3', '192.168.20.11');
    assert.ok(result, 'PC3 (VLAN20) should reach PC4 (VLAN20)');
  }, buildVlanTopology);

  runner.test('Cross VLAN: PC1 (VLAN10) cannot directly reach PC3 (VLAN20)', (assert) => {
    // Without inter-VLAN routing (no route on R1), L2 should be isolated
    const { devices } = buildVlanTopology();
    // Remove inter-VLAN routing capability by removing the VLAN20 gateway
    delete devices.R1.interfaces['GigabitEthernet0/1'];
    devices.SW1.interfaces['GigabitEthernet0/2'].connected = null;
    const result = canReach(devices, 'PC1', '192.168.20.10');
    assert.ok(!result, 'PC1 (VLAN10) should NOT reach PC3 (VLAN20) without inter-VLAN routing');
  }, buildVlanTopology);

  runner.test('Inter-VLAN routing: PC1 (VLAN10) can reach PC3 (VLAN20) via router', (assert) => {
    const { devices } = buildVlanTopology();
    const result = canReach(devices, 'PC1', '192.168.20.10');
    assert.ok(result, 'PC1 should reach PC3 via R1 inter-VLAN routing');
  }, buildVlanTopology);

  runner.test('Same VLAN: PC1 can reach VLAN10 gateway (R1)', (assert) => {
    const { devices } = buildVlanTopology();
    const result = canReach(devices, 'PC1', '192.168.10.1');
    assert.ok(result, 'PC1 should reach its gateway on VLAN10');
  }, buildVlanTopology);

  runner.test('ARP broadcast does not cross VLAN boundary', (assert) => {
    const { devices } = buildVlanTopology();
    const { path, linkHints } = buildPingPath(devices, 'PC1', '192.168.10.11', true);
    const arps = computeArpResolutions(devices, path, linkHints);
    // ARP broadcasts from PC1 should only reach VLAN10 devices
    for (const arp of arps) {
      for (const target of arp.broadcastTargets) {
        const dev = devices[target.deviceId];
        if (dev.type === 'pc') {
          // PC targets should be on VLAN10 (PC1 or PC2), not VLAN20
          assert.ok(
            target.deviceId === 'PC1' || target.deviceId === 'PC2' || target.deviceId === 'R1',
            `ARP broadcast should not reach ${target.deviceId} on different VLAN`
          );
        }
      }
    }
  }, buildVlanTopology);

  runner.test('Ping path within same VLAN includes switch', (assert) => {
    const { devices } = buildVlanTopology();
    const { path } = buildPingPath(devices, 'PC1', '192.168.10.11', true);
    assert.ok(path.includes('SW1'), 'Path should include the switch');
    assert.ok(path.includes('PC2'), 'Path should include destination PC2');
  }, buildVlanTopology);

  runner.test('Inter-VLAN ping path goes through router', (assert) => {
    const { devices } = buildVlanTopology();
    const { path } = buildPingPath(devices, 'PC1', '192.168.20.10', true);
    assert.ok(path.includes('R1'), 'Inter-VLAN path should include router');
  }, buildVlanTopology);
}
