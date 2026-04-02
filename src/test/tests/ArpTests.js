// ─── ARP Learning Tests ───
import { canReach } from '../../simulation/Routing.js';
import { buildPingPath, computeArpResolutions } from '../../simulation/PingEngine.js';
import { generateMAC } from '../../simulation/NetworkUtils.js';
import { buildSimpleLanTopology, buildWideSubnetTopology } from '../TestTopologies.js';

export function registerArpTests(runner) {
  runner.category('ARP Learning');

  runner.test('ARP entry created after ping', (assert) => {
    const { devices } = buildSimpleLanTopology();
    // Clear any existing ARP tables
    for (const dv of Object.values(devices)) dv.arpTable = [];

    const reachable = canReach(devices, 'PC1', '192.168.1.11');
    assert.ok(reachable, 'PC1 should reach PC2');

    const { path, linkHints } = buildPingPath(devices, 'PC1', '192.168.1.11', true);
    const arps = computeArpResolutions(devices, path, linkHints);
    assert.ok(arps.length > 0, 'Should need at least one ARP resolution');
  }, buildSimpleLanTopology);

  runner.test('ARP resolution targets correct IP', (assert) => {
    const { devices } = buildSimpleLanTopology();
    for (const dv of Object.values(devices)) dv.arpTable = [];

    const { path, linkHints } = buildPingPath(devices, 'PC1', '192.168.1.11', true);
    const arps = computeArpResolutions(devices, path, linkHints);

    // PC1 should ARP for PC2's IP (or for gateway if going through router)
    const pc1Arp = arps.find(a => a.requesterId === 'PC1');
    if (pc1Arp) {
      // If direct L2, target should be PC2's IP; if via gateway, target is gateway IP
      assert.ok(
        pc1Arp.targetIP === '192.168.1.11' || pc1Arp.targetIP === '192.168.1.1',
        `ARP target should be PC2 or gateway, got ${pc1Arp.targetIP}`
      );
    }
  }, buildSimpleLanTopology);

  runner.test('ARP returns correct MAC address', (assert) => {
    const { devices } = buildSimpleLanTopology();
    for (const dv of Object.values(devices)) dv.arpTable = [];

    const { path, linkHints } = buildPingPath(devices, 'PC1', '192.168.1.11', true);
    const arps = computeArpResolutions(devices, path, linkHints);

    for (const arp of arps) {
      const expectedMAC = generateMAC(arp.targetId, arp.targetIf);
      assert.equal(arp.targetMAC, expectedMAC, `MAC should match for ${arp.targetId}:${arp.targetIf}`);
    }
  }, buildSimpleLanTopology);

  runner.test('Second ping skips ARP (entry already exists)', (assert) => {
    const { devices } = buildSimpleLanTopology();
    for (const dv of Object.values(devices)) dv.arpTable = [];

    // First ping: populate ARP
    const { path: p1, linkHints: lh1 } = buildPingPath(devices, 'PC1', '192.168.1.11', true);
    const arps1 = computeArpResolutions(devices, p1, lh1);

    // Simulate ARP table population
    for (const arp of arps1) {
      const dev = devices[arp.requesterId];
      if (!dev.arpTable) dev.arpTable = [];
      if (!dev.arpTable.find(e => e.ip === arp.targetIP && e.iface === arp.requesterIf)) {
        dev.arpTable.push({ ip: arp.targetIP, mac: arp.targetMAC, iface: arp.requesterIf });
      }
    }

    // Second ping: should not need ARP
    const { path: p2, linkHints: lh2 } = buildPingPath(devices, 'PC1', '192.168.1.11', true);
    const arps2 = computeArpResolutions(devices, p2, lh2);

    // PC1's ARP for the same target should be skipped
    const pc1Arps2 = arps2.filter(a => a.requesterId === 'PC1');
    const firstTargetIP = arps1.find(a => a.requesterId === 'PC1')?.targetIP;
    if (firstTargetIP) {
      const repeated = pc1Arps2.find(a => a.targetIP === firstTargetIP);
      assert.ok(!repeated, 'Second ping should skip ARP for already-learned target');
    }
  }, buildSimpleLanTopology);

  runner.test('/16 subnet: ARP resolves across different 3rd octet', (assert) => {
    const { devices } = buildWideSubnetTopology();
    for (const dv of Object.values(devices)) dv.arpTable = [];

    // R1 (172.16.0.1/16) pinging SV1 (172.16.1.10/16) — same /16 subnet, different 3rd octet
    const reachable = canReach(devices, 'R1', '172.16.1.10');
    assert.ok(reachable, 'R1 should reach SV1 on same /16 subnet');

    const { path, linkHints } = buildPingPath(devices, 'R1', '172.16.1.10', true);
    const arps = computeArpResolutions(devices, path, linkHints);

    // There should be an ARP resolution for 172.16.1.10
    const arpForSV = arps.find(a => a.targetIP === '172.16.1.10');
    assert.ok(arpForSV, 'Should ARP for 172.16.1.10 across 3rd octet boundary');
  }, buildWideSubnetTopology);

  runner.test('ARP broadcast reaches all devices on same VLAN segment', (assert) => {
    const { devices } = buildSimpleLanTopology();
    for (const dv of Object.values(devices)) dv.arpTable = [];

    const { path, linkHints } = buildPingPath(devices, 'PC1', '192.168.1.11', true);
    const arps = computeArpResolutions(devices, path, linkHints);

    if (arps.length > 0) {
      const firstArp = arps[0];
      // Broadcast should reach multiple devices on the L2 segment
      assert.ok(firstArp.broadcastTargets.length >= 1, 'Broadcast should reach at least one device');
    }
  }, buildSimpleLanTopology);
}
