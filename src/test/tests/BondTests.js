// ─── LACP Bond (active-backup failover) tests ───
import { canReach, findBondPartner, deviceHasReachableIP, getUsableSrcIP } from '../../simulation/Routing.js';
import { buildPingPath } from '../../simulation/PingEngine.js';
import { buildBondTopology } from '../TestTopologies.js';

export function registerBondTests(runner) {
  runner.category('LACP Bond');

  runner.test('Bond partner is found for bonded interface', (assert) => {
    const { devices } = buildBondTopology();
    const partner = findBondPartner(devices.SV1, 'Ethernet0');
    assert.ok(partner, 'Should find bond partner for Ethernet0');
    assert.equal(partner.ifName, 'Ethernet1', 'Bond partner should be Ethernet1');
  });

  runner.test('No bond partner for non-bonded interface', (assert) => {
    const { devices } = buildBondTopology();
    const partner = findBondPartner(devices.PC1, 'Ethernet0');
    assert.equal(partner, null, 'PC1 Ethernet0 has no bond group');
  });

  runner.test('Normal: PC reaches bonded server (primary up)', (assert) => {
    const { devices } = buildBondTopology();
    assert.ok(canReach(devices, 'PC1', '192.168.1.10'), 'PC1 should reach bonded server');
  });

  runner.test('Failover: PC reaches server after primary goes down', (assert) => {
    const { devices } = buildBondTopology();
    // Take down the primary interface (Ethernet0 holds the IP)
    devices.SV1.interfaces['Ethernet0'].status = 'down';
    devices.SV1.interfaces['Ethernet0'].protocol = 'down';
    // Also update the switch side
    devices.SW1.interfaces['GigabitEthernet0/2'].status = 'down';
    devices.SW1.interfaces['GigabitEthernet0/2'].protocol = 'down';
    assert.ok(canReach(devices, 'PC1', '192.168.1.10'), 'PC1 should still reach server via bond partner');
  });

  runner.test('deviceHasReachableIP detects bond failover', (assert) => {
    const { devices } = buildBondTopology();
    assert.ok(deviceHasReachableIP(devices.SV1, '192.168.1.10'), 'IP reachable when primary up');
    // Take down primary
    devices.SV1.interfaces['Ethernet0'].status = 'down';
    assert.ok(deviceHasReachableIP(devices.SV1, '192.168.1.10'), 'IP still reachable via bond partner');
  });

  runner.test('getUsableSrcIP returns IP even when primary is down', (assert) => {
    const { devices } = buildBondTopology();
    devices.SV1.interfaces['Ethernet0'].status = 'down';
    const srcIP = getUsableSrcIP(devices.SV1);
    assert.equal(srcIP, '192.168.1.10', 'Should return bonded IP via partner');
  });

  runner.test('Both interfaces down: server is unreachable', (assert) => {
    const { devices } = buildBondTopology();
    devices.SV1.interfaces['Ethernet0'].status = 'down';
    devices.SV1.interfaces['Ethernet0'].protocol = 'down';
    devices.SV1.interfaces['Ethernet1'].status = 'down';
    devices.SV1.interfaces['Ethernet1'].protocol = 'down';
    devices.SW1.interfaces['GigabitEthernet0/2'].status = 'down';
    devices.SW1.interfaces['GigabitEthernet0/2'].protocol = 'down';
    devices.SW1.interfaces['GigabitEthernet0/3'].status = 'down';
    devices.SW1.interfaces['GigabitEthernet0/3'].protocol = 'down';
    assert.ok(!canReach(devices, 'PC1', '192.168.1.10'), 'Server should be unreachable with both bond members down');
  });

  runner.test('Router reaches bonded server', (assert) => {
    const { devices } = buildBondTopology();
    assert.ok(canReach(devices, 'R1', '192.168.1.10'), 'Router should reach bonded server');
  });
}
