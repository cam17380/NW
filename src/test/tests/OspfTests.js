// ─── OSPF Tests ───
import { recomputeAllOspf, getOspfNeighborInfo, getRouterId, wildcardToMask, getOspfProcessInterfaces } from '../../simulation/OspfEngine.js';
import { canReach, lookupRoute, describeRouteLookup } from '../../simulation/Routing.js';
import { buildOspfTopology, buildOspfPartialTopology, buildOspfNoCableTopology, buildOspfSwitchedTopology } from '../TestTopologies.js';
import { Store } from '../../core/Store.js';
import { EventBus } from '../../core/EventBus.js';

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

  // ─── Longest-prefix-match: OSPF /24 must beat static /0 default ───

  runner.test('OSPF /24 wins over static default /0 (longest prefix match, AD ignored)', (assert) => {
    const { devices } = buildOspfTopology();
    recomputeAllOspf(devices);
    // Add a static default route on R1 to a different next-hop
    devices.R1.routes.push({ network: '0.0.0.0', mask: '0.0.0.0', nextHop: '10.1.0.99' });
    const hop = lookupRoute(devices.R1, '172.16.0.10');
    assert.equal(hop, '10.1.0.2', 'OSPF /24 (longer prefix) should win over static /0 default despite higher AD');
  }, buildOspfTopology);

  runner.test('describeRouteLookup picks OSPF /24 over static /0 default', (assert) => {
    const { devices } = buildOspfTopology();
    recomputeAllOspf(devices);
    devices.R1.routes.push({ network: '0.0.0.0', mask: '0.0.0.0', nextHop: '10.1.0.99' });
    const result = describeRouteLookup(devices.R1, '172.16.0.10');
    assert.ok(result.description.includes('OSPF'), 'describeRouteLookup should match OSPF, not the static default');
    assert.equal(result.nextHop, '10.1.0.2', 'next-hop must come from OSPF, not static default');
  }, buildOspfTopology);

  runner.test('Static and OSPF tie on prefix length: static (AD 1) wins as tiebreaker', (assert) => {
    const { devices } = buildOspfTopology();
    recomputeAllOspf(devices);
    // Add a static /24 to the same destination as the OSPF /24
    devices.R1.routes.push({ network: '172.16.0.0', mask: '255.255.255.0', nextHop: '10.1.0.99' });
    const hop = lookupRoute(devices.R1, '172.16.0.10');
    assert.equal(hop, '10.1.0.99', 'on equal prefix length, static (AD 1) must beat OSPF (AD 110)');
  }, buildOspfTopology);

  // ─── Interface state changes must be reflected after recompute ───

  runner.test('Shutting down OSPF interface clears learned routes after recompute', (assert) => {
    const { devices } = buildOspfTopology();
    recomputeAllOspf(devices);
    assert.ok(devices.R1.ospfRoutes.find(r => r.network === '172.16.0.0'), 'baseline: R1 should have 172.16.0.0/24 route');
    // Take down R2's interface to R1 — adjacency must collapse
    devices.R2.interfaces['GigabitEthernet0/0'].status = 'down';
    recomputeAllOspf(devices);
    assert.ok(!devices.R1.ospfRoutes.find(r => r.network === '172.16.0.0'), 'R1 must lose 172.16.0.0/24 route once R2 G0/0 is down');
  }, buildOspfTopology);

  runner.test('Bringing OSPF interface back up restores routes after recompute', (assert) => {
    const { devices } = buildOspfTopology();
    recomputeAllOspf(devices);
    devices.R2.interfaces['GigabitEthernet0/0'].status = 'down';
    recomputeAllOspf(devices);
    devices.R2.interfaces['GigabitEthernet0/0'].status = 'up';
    recomputeAllOspf(devices);
    assert.ok(devices.R1.ospfRoutes.find(r => r.network === '172.16.0.0'), 'R1 should regain 172.16.0.0/24 once R2 G0/0 returns to up');
  }, buildOspfTopology);

  // ─── L2 reachability gates OSPF adjacency ───

  runner.test('Same-subnet routers without a cable do NOT form OSPF adjacency', (assert) => {
    const { devices } = buildOspfNoCableTopology();
    recomputeAllOspf(devices);
    const neighbors = getOspfNeighborInfo(devices, 'R1');
    assert.equal(neighbors.length, 0, 'no cable = no neighbor (subnet match alone is not sufficient)');
    assert.equal(devices.R1.ospfRoutes.length, 0, 'no neighbor = no learned routes');
  }, buildOspfNoCableTopology);

  runner.test('Routers connected via a switch form OSPF adjacency and exchange routes', (assert) => {
    const { devices } = buildOspfSwitchedTopology();
    recomputeAllOspf(devices);
    const neighbors = getOspfNeighborInfo(devices, 'R1');
    assert.equal(neighbors.length, 1, 'R1 should see exactly one neighbor via the switch');
    assert.equal(neighbors[0].neighborIP, '10.0.0.2', 'neighbor IP should be R2 G0/1');
    const route = devices.R1.ospfRoutes.find(r => r.network === '172.16.0.0');
    assert.ok(route, 'R1 should learn 172.16.0.0/24 via OSPF over the switch fabric');
    assert.equal(route.nextHop, '10.0.0.2', 'next-hop must be R2 (10.0.0.2)');
  }, buildOspfSwitchedTopology);

  // ─── getOspfProcessInterfaces (used by show ip ospf) ───

  runner.test('getOspfProcessInterfaces counts up interfaces matched by network statements', (assert) => {
    const { devices } = buildOspfTopology();
    const proc = devices.R1.ospf.processes[1];
    const ifaces = getOspfProcessInterfaces(devices.R1, proc);
    assert.equal(ifaces.length, 2, 'R1 has both 192.168.1.0/24 and 10.1.0.0/30 covered, both up');
  }, buildOspfTopology);

  runner.test('getOspfProcessInterfaces excludes down interfaces', (assert) => {
    const { devices } = buildOspfTopology();
    devices.R1.interfaces['GigabitEthernet0/1'].status = 'down';
    const proc = devices.R1.ospf.processes[1];
    const ifaces = getOspfProcessInterfaces(devices.R1, proc);
    assert.equal(ifaces.length, 1, 'down interface should be excluded — only G0/0 remains');
    assert.equal(ifaces[0].ifName, 'GigabitEthernet0/0', 'remaining interface should be G0/0');
  }, buildOspfTopology);

  // ─── Store.setTopology must auto-populate OSPF routes ───
  // Regression: "Open in Simulator" / Challenge / Snapshot loaders all call
  // store.setTopology — without auto-recompute, devices arrive with empty
  // ospfRoutes and "show ip route" omits OSPF entries even though neighbors
  // are FULL.

  runner.test('Store.setTopology auto-populates OSPF routes (no explicit recompute needed)', (assert) => {
    const { devices } = buildOspfTopology();
    // Sanity: devices arrive with empty ospfRoutes from the topology builder
    assert.equal(devices.R1.ospfRoutes.length, 0, 'baseline: ospfRoutes empty before setTopology');
    const store = new Store(new EventBus());
    store.setTopology(devices, []);
    const route = devices.R1.ospfRoutes.find(r => r.network === '172.16.0.0');
    assert.ok(route, 'after setTopology, R1 should have learned 172.16.0.0/24 via OSPF');
    assert.equal(route.nextHop, '10.1.0.2', 'next-hop should be R2');
  }, buildOspfTopology);
}
