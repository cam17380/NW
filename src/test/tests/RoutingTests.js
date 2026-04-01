// ─── Routing Tests ───
import { canReach, lookupRoute } from '../../simulation/Routing.js';
import { buildPingPath } from '../../simulation/PingEngine.js';
import { buildMultiHopTopology, buildLongestPrefixTopology } from '../TestTopologies.js';

export function registerRoutingTests(runner) {
  runner.category('Routing');

  runner.test('Same subnet: PC1 reaches R1 gateway', (assert) => {
    const { devices } = buildMultiHopTopology();
    assert.ok(canReach(devices, 'PC1', '192.168.1.1'), 'PC1 should reach R1');
  });

  runner.test('Multi-hop: PC1 reaches Server via R1->R2', (assert) => {
    const { devices } = buildMultiHopTopology();
    assert.ok(canReach(devices, 'PC1', '10.0.2.10'), 'PC1 should reach Server1');
  });

  runner.test('Multi-hop: Server reaches PC1 via R2->R1', (assert) => {
    const { devices } = buildMultiHopTopology();
    assert.ok(canReach(devices, 'SV1', '192.168.1.10'), 'Server1 should reach PC1');
  });

  runner.test('Default gateway forwarding for PC', (assert) => {
    const { devices } = buildMultiHopTopology();
    const hop = lookupRoute(devices.PC1, '10.0.2.10');
    assert.equal(hop, '192.168.1.1', 'PC1 should use default gateway');
  });

  runner.test('Server default gateway forwarding', (assert) => {
    const { devices } = buildMultiHopTopology();
    const hop = lookupRoute(devices.SV1, '192.168.1.10');
    assert.equal(hop, '10.0.2.1', 'Server should use default gateway');
  });

  runner.test('Router static route lookup', (assert) => {
    const { devices } = buildMultiHopTopology();
    const hop = lookupRoute(devices.R1, '10.0.2.10');
    assert.equal(hop, '10.0.0.2', 'R1 should route to 10.0.2.0/24 via R2');
  });

  runner.test('No route: unreachable destination', (assert) => {
    const { devices } = buildMultiHopTopology();
    const result = canReach(devices, 'PC1', '172.16.0.1');
    assert.ok(!result, 'PC1 should NOT reach 172.16.0.1 (no route)');
  });

  runner.test('Ping path includes intermediate routers', (assert) => {
    const { devices } = buildMultiHopTopology();
    const { path } = buildPingPath(devices, 'PC1', '10.0.2.10', true);
    assert.ok(path.includes('R1'), 'Path should include R1');
    assert.ok(path.includes('R2'), 'Path should include R2');
    assert.ok(path.includes('SV1'), 'Path should include Server1');
  });

  runner.test('Longest prefix match: /24 beats /16 beats /8', (assert) => {
    const { devices } = buildLongestPrefixTopology();
    // 10.1.1.50 should match /24 route -> nextHop 192.168.1.4
    const hop1 = lookupRoute(devices.R1, '10.1.1.50');
    assert.equal(hop1, '192.168.1.4', '/24 should win for 10.1.1.50');

    // 10.1.2.50 should match /16 route -> nextHop 192.168.1.3
    const hop2 = lookupRoute(devices.R1, '10.1.2.50');
    assert.equal(hop2, '192.168.1.3', '/16 should win for 10.1.2.50');

    // 10.2.0.50 should match /8 route -> nextHop 192.168.1.2
    const hop3 = lookupRoute(devices.R1, '10.2.0.50');
    assert.equal(hop3, '192.168.1.2', '/8 should win for 10.2.0.50');
  });

  runner.test('Directly connected subnet: no next hop needed', (assert) => {
    const { devices } = buildMultiHopTopology();
    const hop = lookupRoute(devices.R1, '192.168.1.10');
    assert.equal(hop, null, 'Directly connected should return null (no next hop)');
  });
}
