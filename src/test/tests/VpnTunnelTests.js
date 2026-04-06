// ─── VPN / IPsec Tunnel tests ───
import { canReach, routerHasVPN, findTunnelForTarget, findTunnelPeerDevice, lookupRoute } from '../../simulation/Routing.js';
import { buildPingPath, tracePacketFlow } from '../../simulation/PingEngine.js';
import { buildVpnTopology } from '../TestTopologies.js';

export function registerVpnTunnelTests(runner) {
  runner.category('VPN Tunnel');

  runner.test('Router with tunnel interfaces is detected as VPN-capable', (assert) => {
    const { devices } = buildVpnTopology();
    assert.ok(routerHasVPN(devices.R1), 'HQ-Router should have VPN');
    assert.ok(routerHasVPN(devices.R2), 'Branch-Router should have VPN');
  }, buildVpnTopology);

  runner.test('Router without tunnel is NOT VPN-capable', (assert) => {
    const { devices } = buildVpnTopology();
    assert.ok(!routerHasVPN(devices.RISP), 'ISP router should not have VPN');
  }, buildVpnTopology);

  runner.test('findTunnelForTarget matches tunnel subnet', (assert) => {
    const { devices } = buildVpnTopology();
    const match = findTunnelForTarget(devices.R1, '10.0.0.2');
    assert.ok(match, 'Should find tunnel for 10.0.0.2');
    assert.equal(match.ifName, 'Tunnel0', 'Should match Tunnel0');
  }, buildVpnTopology);

  runner.test('findTunnelForTarget returns null for non-tunnel subnet', (assert) => {
    const { devices } = buildVpnTopology();
    const match = findTunnelForTarget(devices.R1, '203.0.113.1');
    assert.equal(match, null, 'WAN subnet should not match tunnel');
  }, buildVpnTopology);

  runner.test('findTunnelPeerDevice locates peer by tunnel destination IP', (assert) => {
    const { devices } = buildVpnTopology();
    const peerId = findTunnelPeerDevice(devices, '198.51.100.2');
    assert.equal(peerId, 'R2', 'Tunnel destination should resolve to Branch-Router');
  }, buildVpnTopology);

  runner.test('HQ-PC reaches Branch-PC via VPN tunnel', (assert) => {
    const { devices } = buildVpnTopology();
    assert.ok(canReach(devices, 'PC1', '192.168.2.10'), 'HQ-PC should reach Branch-PC through tunnel');
  }, buildVpnTopology);

  runner.test('Branch-PC reaches HQ-PC via VPN tunnel', (assert) => {
    const { devices } = buildVpnTopology();
    assert.ok(canReach(devices, 'PC2', '192.168.1.10'), 'Branch-PC should reach HQ-PC through tunnel');
  }, buildVpnTopology);

  runner.test('HQ-PC reaches Branch-Router LAN gateway', (assert) => {
    const { devices } = buildVpnTopology();
    assert.ok(canReach(devices, 'PC1', '192.168.2.1'), 'HQ-PC should reach Branch-Router LAN interface');
  }, buildVpnTopology);

  runner.test('Packet flow shows tunnel encapsulation', (assert) => {
    const { devices } = buildVpnTopology();
    const { hops, reachable } = tracePacketFlow(devices, 'PC1', '192.168.2.10');
    assert.ok(reachable, 'Should be reachable');
    const tunnelHop = hops.find(h => h.decisions.some(d => d.text && d.text.includes('Tunnel')));
    assert.ok(tunnelHop, 'Packet flow should show tunnel encapsulation decision');
  }, buildVpnTopology);

  runner.test('Direct underlay connectivity: HQ reaches ISP', (assert) => {
    const { devices } = buildVpnTopology();
    assert.ok(canReach(devices, 'R1', '203.0.113.1'), 'HQ-Router should reach ISP directly');
  }, buildVpnTopology);

  runner.test('Connected subnet takes priority over default route after tunnel', (assert) => {
    const { devices } = buildVpnTopology();
    // After tunnel decap at Branch-Router, 192.168.2.10 should match connected Gi0/0 subnet
    // NOT the default route via ISP
    const nextHop = lookupRoute(devices.R2, '192.168.2.10');
    assert.equal(nextHop, null, 'Connected subnet should return null (directly connected)');
  }, buildVpnTopology);

  runner.test('Ping animation path includes ISP router (physical underlay)', (assert) => {
    const { devices } = buildVpnTopology();
    const { path } = buildPingPath(devices, 'PC1', '192.168.2.10', true);
    assert.includes(path, 'RISP', 'Animation path should include ISP router for underlay');
    assert.includes(path, 'R2', 'Animation path should include Branch-Router');
  }, buildVpnTopology);

  runner.test('Tunnel decapsulation bypasses physical WAN ACL', (assert) => {
    const { devices } = buildVpnTopology();
    // Add an ACL on R2 WAN interface that would block the traffic
    devices.R2.accessLists = {
      100: [{ action: 'deny', protocol: 'ip', src: 'any', srcWildcard: '0.0.0.0', dst: 'any', dstWildcard: '0.0.0.0', port: null }]
    };
    devices.R2.interfaces['GigabitEthernet0/1'].accessGroup = { in: 100 };
    // Traffic via tunnel should bypass the WAN ACL (decapsulated packets enter via Tunnel0)
    const result = canReach(devices, 'PC1', '192.168.2.10');
    assert.ok(result, 'Tunnel traffic should bypass physical WAN ACL');
  }, buildVpnTopology);

  runner.test('Ping animation path includes ISP on both directions', (assert) => {
    const { devices } = buildVpnTopology();
    const fwd = buildPingPath(devices, 'PC1', '192.168.2.10', true);
    const rev = buildPingPath(devices, 'PC2', '192.168.1.10', true);
    assert.includes(fwd.path, 'RISP', 'Forward path should include ISP');
    assert.includes(rev.path, 'RISP', 'Reverse path should include ISP');
  }, buildVpnTopology);
}
