// ─── L3 Switch (SVI / Inter-VLAN Routing) tests ───
import { canReach, switchHasSVI, getSVIVlan, lookupRoute, switchL2Deliver, checkInterfaceACL } from '../../simulation/Routing.js';
import { buildPingPath, tracePacketFlow } from '../../simulation/PingEngine.js';
import { buildL3SwitchTopology } from '../TestTopologies.js';

export function registerL3SwitchTests(runner) {
  runner.category('L3 Switch (SVI)');

  runner.test('Switch with SVIs is detected as L3-capable', (assert) => {
    const { devices } = buildL3SwitchTopology();
    assert.ok(switchHasSVI(devices.SW1), 'SW1 should be L3-capable');
  }, buildL3SwitchTopology);

  runner.test('Switch without SVIs is NOT L3-capable', (assert) => {
    const { devices } = buildL3SwitchTopology();
    // Remove all SVIs
    delete devices.SW1.interfaces['Vlan10'];
    delete devices.SW1.interfaces['Vlan20'];
    assert.ok(!switchHasSVI(devices.SW1), 'SW1 without SVIs should not be L3-capable');
  }, buildL3SwitchTopology);

  runner.test('SVI VLAN ID extraction', (assert) => {
    assert.equal(getSVIVlan('Vlan10'), 10, 'Should extract VLAN 10');
    assert.equal(getSVIVlan('Vlan20'), 20, 'Should extract VLAN 20');
    assert.equal(getSVIVlan('GigabitEthernet0/0'), null, 'Non-SVI should return null');
  }, null);

  runner.test('Same VLAN: PC1 (VLAN10) reaches PC2 (VLAN10) via L2', (assert) => {
    const { devices } = buildL3SwitchTopology();
    assert.ok(canReach(devices, 'PC1', '192.168.10.11'), 'PC1 should reach PC2 in same VLAN');
  }, buildL3SwitchTopology);

  runner.test('Inter-VLAN: PC1 (VLAN10) reaches PC3 (VLAN20) via SVI routing', (assert) => {
    const { devices } = buildL3SwitchTopology();
    assert.ok(canReach(devices, 'PC1', '192.168.20.10'), 'PC1 should reach PC3 via SVI inter-VLAN routing');
  }, buildL3SwitchTopology);

  runner.test('L3 switch routes to external network via static route', (assert) => {
    const { devices } = buildL3SwitchTopology();
    assert.ok(canReach(devices, 'PC1', '10.0.0.10'), 'PC1 should reach external server via L3 switch static route');
  }, buildL3SwitchTopology);

  runner.test('Packet flow shows SVI routing decisions', (assert) => {
    const { devices } = buildL3SwitchTopology();
    const { hops, reachable } = tracePacketFlow(devices, 'PC1', '192.168.20.10');
    assert.ok(reachable, 'Should be reachable');
    // L3 switch hop should show egress via Vlan SVI (e.g. "Exit Vlan20")
    const swHop = hops.find(h => h.deviceId === 'SW1' && h.decisions.some(d => d.text && d.text.includes('Vlan')));
    assert.ok(swHop, 'Packet flow should show L3 switch Vlan routing');
  }, buildL3SwitchTopology);

  runner.test('L2 delivery within VLAN works on L3 switch', (assert) => {
    const { devices } = buildL3SwitchTopology();
    assert.ok(switchL2Deliver(devices, 'SW1', 10, '192.168.10.10'), 'Should deliver to PC1 in VLAN 10');
    assert.ok(switchL2Deliver(devices, 'SW1', 20, '192.168.20.10'), 'Should deliver to PC3 in VLAN 20');
    assert.ok(!switchL2Deliver(devices, 'SW1', 20, '192.168.10.10'), 'Should NOT deliver PC1 IP via VLAN 20');
  }, buildL3SwitchTopology);
}
