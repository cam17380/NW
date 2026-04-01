// ─── Packet Flow Diagnostic Tests ───
import { tracePacketFlow } from '../../simulation/PingEngine.js';
import { buildMultiHopTopology, buildFirewallTopology, buildAclTopology } from '../TestTopologies.js';

export function registerPacketFlowTests(runner) {
  runner.category('Packet Flow');

  runner.test('tracePacketFlow: reachable destination returns reachable=true', (assert) => {
    const { devices } = buildMultiHopTopology();
    const result = tracePacketFlow(devices, 'PC1', '10.0.2.10');
    assert.ok(result.reachable, 'Should be reachable');
  });

  runner.test('tracePacketFlow: unreachable destination returns reachable=false', (assert) => {
    const { devices } = buildMultiHopTopology();
    const result = tracePacketFlow(devices, 'PC1', '172.16.0.1');
    assert.ok(!result.reachable, 'Should be unreachable');
  });

  runner.test('tracePacketFlow: hops include all L3 devices', (assert) => {
    const { devices } = buildMultiHopTopology();
    const result = tracePacketFlow(devices, 'PC1', '10.0.2.10');
    const hopDeviceIds = result.hops.map(h => h.deviceId);
    assert.ok(hopDeviceIds.includes('PC1'), 'Should include source PC1');
    assert.ok(hopDeviceIds.includes('R1'), 'Should include R1');
    assert.ok(hopDeviceIds.includes('R2'), 'Should include R2');
    assert.ok(hopDeviceIds.includes('SV1'), 'Should include Server1');
  });

  runner.test('tracePacketFlow: last hop result is "reached"', (assert) => {
    const { devices } = buildMultiHopTopology();
    const result = tracePacketFlow(devices, 'PC1', '10.0.2.10');
    const lastHop = result.hops[result.hops.length - 1];
    assert.equal(lastHop.result, 'reached', 'Last hop should be "reached"');
  });

  runner.test('tracePacketFlow: firewall drop shows result "dropped"', (assert) => {
    const { devices } = buildFirewallTopology();
    // Remove all permit policies to ensure deny
    devices.FW1.policies = [];
    const result = tracePacketFlow(devices, 'PC1', '172.16.0.10');
    assert.ok(!result.reachable, 'Should be unreachable (firewall denies)');
    const fwHop = result.hops.find(h => h.deviceId === 'FW1');
    assert.ok(fwHop, 'Should have firewall hop');
    assert.equal(fwHop.result, 'dropped', 'Firewall hop should show "dropped"');
  });

  runner.test('tracePacketFlow: decisions include route-lookup', (assert) => {
    const { devices } = buildMultiHopTopology();
    const result = tracePacketFlow(devices, 'PC1', '10.0.2.10');
    const r1Hop = result.hops.find(h => h.deviceId === 'R1');
    assert.ok(r1Hop, 'Should have R1 hop');
    const routeDecision = r1Hop.decisions.find(d => d.type === 'route-lookup');
    assert.ok(routeDecision, 'R1 should have a route-lookup decision');
  });

  runner.test('tracePacketFlow: ACL drop shows in decisions', (assert) => {
    const { devices } = buildAclTopology();
    // Block all inbound traffic
    devices.R1.accessLists[100] = [
      { action: 'deny', protocol: 'ip', src: 'any', srcWildcard: '255.255.255.255', dst: 'any', dstWildcard: '255.255.255.255' },
    ];
    const result = tracePacketFlow(devices, 'PC1', '10.0.0.10');
    assert.ok(!result.reachable, 'Should be unreachable (ACL denies)');
    const r1Hop = result.hops.find(h => h.deviceId === 'R1');
    if (r1Hop) {
      const aclDecision = r1Hop.decisions.find(d => d.type === 'acl');
      assert.ok(aclDecision, 'Should have ACL decision');
    }
  });

  runner.test('tracePacketFlow: no source interface returns error', (assert) => {
    const { devices } = buildMultiHopTopology();
    // Remove all IPs from PC1
    devices.PC1.interfaces['Ethernet0'].ip = '';
    devices.PC1.interfaces['Ethernet0'].status = 'down';
    const result = tracePacketFlow(devices, 'PC1', '10.0.2.10');
    assert.ok(!result.reachable, 'Should be unreachable');
    assert.ok(result.hops.length > 0, 'Should have at least one hop');
    assert.equal(result.hops[0].result, 'no-source', 'First hop should be no-source error');
  });
}
