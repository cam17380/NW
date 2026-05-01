// ─── OSPF Tests ───
import { recomputeAllOspf, getOspfNeighborInfo, getRouterId, wildcardToMask } from '../../simulation/OspfEngine.js';
import { canReach, lookupRoute, describeRouteLookup } from '../../simulation/Routing.js';
import { buildOspfTopology, buildOspfPartialTopology } from '../TestTopologies.js';

export function registerOspfTests(runner) {
  runner.category('OSPF');

  // ─── Utility functions ───

  runner.test('wildcardToMask: 0.0.0.255 -> 255.255.255.0', (assert) => {
    assert.equal(wildcardToMask('0.0.0.255'), '255.255.255.0', '/24 wildcard conversion');
  }, buildOspfTopology);

  runner.test('wildcardToMask: 0.0.0.3 -> 255.255.255.252', (assert) => {
    assert.equal(wildcardToMask('0.0.0.3'), '255.255.255.252', '/30 wildcard conversion');
  }, buildOspfTopology);

  runner.test('getRouterId: returns highest interface IP when no router-id configured', (assert) => {
    const { devices } = buildOspfTopology();
    // R1 has 192.168.1.1 and 10.1.0.1 — highest is 192.168.1.1
    assert.equal(getRouterId(devices.R1), '192.168.1.1', 'R1 router-id should be 192.168.1.1');
  }, buildOspfTopology);

  runner.test('getRouterId: returns configured router-id when set', (assert) => {
    const { devices } = buildOspfTopology();
    devices.R1.ospf.routerId = '1.1.1.1';
    assert.equal(getRouterId(devices.R1), '1.1.1.1', 'explicit router-id should take precedence');
  }, buildOspfTopology);

  // ─── Neighbor formation ───

  runner.test('R1 and R2 form OSPF neighbor (same subnet 10.1.0.0/30)', (assert) => {
    const { devices } = buildOspfTopology();
    const neighbors = getOspfNeighborInfo(devices, 'R1');
    const r2Neighbor = neighbors.find(n => n.neighborIP === '10.1.0.2');
    assert.ok(r2Neighbor, 'R1 should see R2 as OSPF neighbor');
  }, buildOspfTopology);

  runner.test('R1 has no direct neighbor to R3 (not on same subnet)', (assert) => {
    const { devices } = buildOspfTopology();
    const neighbors = getOspfNeighborInfo(devices, 'R1');
    const r3Direct = neighbors.find(n => n.neighborIP === '10.1.0.6');
    assert.ok(!r3Direct, 'R1 and R3 are not directly connected — no direct neighbor');
  }, buildOspfTopology);

  // ─── Route propagation ───

  runner.test('recomputeAllOspf: R1 learns route to 172.16.0.0/24 via R2', (assert) => {
    const { devices } = buildOspfTopology();
    recomputeAllOspf(devices);
    const route = devices.R1.ospfRoutes.find(r => r.network === '172.16.0.0');
    assert.ok(route, 'R1 should have OSPF route to 172.16.0.0/24');
    assert.equal(route.nextHop, '10.1.0.2', 'next-hop for 172.16.0.0 should be R2 (10.1.0.2)');
  }, buildOspfTopology);

  runner.test('recomputeAllOspf: R3 learns route to 192.168.1.0/24 via R2', (assert) => {
    const { devices } = buildOspfTopology();
    recomputeAllOspf(devices);
    const route = devices.R3.ospfRoutes.find(r => r.network === '192.168.1.0');
    assert.ok(route, 'R3 should have OSPF route to 192.168.1.0/24');
    assert.equal(route.nextHop, '10.1.0.5', 'next-hop for 192.168.1.0 should be R2 (10.1.0.5)');
  }, buildOspfTopology);

  runner.test('recomputeAllOspf: R2 learns routes to both edge LANs', (assert) => {
    const { devices } = buildOspfTopology();
    recomputeAllOspf(devices);
    const toPC = devices.R2.ospfRoutes.find(r => r.network === '192.168.1.0');
    const toSV = devices.R2.ospfRoutes.find(r => r.network === '172.16.0.0');
    assert.ok(toPC, 'R2 should learn 192.168.1.0/24 from R1');
    assert.ok(toSV, 'R2 should learn 172.16.0.0/24 from R3');
  }, buildOspfTopology);

  // ─── End-to-end reachability ───

  runner.test('PC1 reaches Server1 via OSPF (3-router chain)', (assert) => {
    const { devices } = buildOspfTopology();
    recomputeAllOspf(devices);
    assert.ok(canReach(devices, 'PC1', '172.16.0.10'), 'PC1 should reach Server1 via OSPF');
  }, buildOspfTopology);

  runner.test('Server1 reaches PC1 via OSPF (reverse path)', (assert) => {
    const { devices } = buildOspfTopology();
    recomputeAllOspf(devices);
    assert.ok(canReach(devices, 'SV1', '192.168.1.10'), 'Server1 should reach PC1 via OSPF');
  }, buildOspfTopology);

  runner.test('Without OSPF: R1 cannot reach 172.16.0.10 (no route)', (assert) => {
    const { devices } = buildOspfTopology();
    // ospfRoutes not computed — all empty
    assert.ok(!canReach(devices, 'PC1', '172.16.0.10'), 'PC1 should NOT reach Server1 without OSPF computed');
  }, buildOspfTopology);

  runner.test('Partial OSPF (R3 not configured): PC1 cannot reach Server1', (assert) => {
    const { devices } = buildOspfPartialTopology();
    recomputeAllOspf(devices);
    assert.ok(!canReach(devices, 'PC1', '172.16.0.10'), 'PC1 should NOT reach Server1 when R3 has no OSPF');
  }, buildOspfPartialTopology);

  // ─── Static route priority over OSPF (AD 1 beats AD 110) ───

  runner.test('Static route takes priority over OSPF route (AD 1 < AD 110)', (assert) => {
    const { devices } = buildOspfTopology();
    recomputeAllOspf(devices);
    // Add a static route pointing somewhere different
    devices.R1.routes.push({ network: '172.16.0.0', mask: '255.255.255.0', nextHop: '10.1.0.99' });
    const hop = lookupRoute(devices.R1, '172.16.0.10');
    assert.equal(hop, '10.1.0.99', 'static route (AD 1) should override OSPF route (AD 110)');
  }, buildOspfTopology);

  // ─── show packet-flow diagnostic ───

  runner.test('describeRouting shows OSPF route description for intermediate router', (assert) => {
    const { devices } = buildOspfTopology();
    recomputeAllOspf(devices);
    const result = describeRouteLookup(devices.R1, '172.16.0.10');
    assert.ok(result.description.includes('OSPF'), 'describeRouting should mention OSPF for route learned via OSPF');
    assert.equal(result.nextHop, '10.1.0.2', 'next-hop should be R2');
  }, buildOspfTopology);
}
