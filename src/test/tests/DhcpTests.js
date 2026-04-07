// ─── DHCP Tests ───
import { canReach } from '../../simulation/Routing.js';
import { tryDhcpAssign } from '../../cli/commands/InterfaceCommands.js';
import { buildDhcpTopology, buildDhcpNoPoolTopology } from '../TestTopologies.js';

export function registerDhcpTests(runner) {
  runner.category('DHCP');

  // ── Basic assignment ──

  runner.test('DHCP assigns IP to PC from pool', (assert) => {
    const { devices } = buildDhcpTopology();
    const result = tryDhcpAssign(devices, 'PC1', 'Ethernet0');
    assert.ok(result !== null, 'Should get an IP assignment');
    assert.equal(result.mask, '255.255.255.0', 'Mask should match pool');
    assert.equal(result.gateway, '192.168.1.1', 'Gateway should be default-router');
    assert.equal(result.dns, '8.8.8.8', 'DNS should be from pool');
  }, buildDhcpTopology);

  runner.test('DHCP assigns IP within pool network', (assert) => {
    const { devices } = buildDhcpTopology();
    const result = tryDhcpAssign(devices, 'PC1', 'Ethernet0');
    assert.ok(result !== null, 'Should get assignment');
    const octets = result.ip.split('.').map(Number);
    assert.equal(octets[0], 192, 'First octet');
    assert.equal(octets[1], 168, 'Second octet');
    assert.equal(octets[2], 1, 'Third octet');
    assert.ok(octets[3] >= 11 && octets[3] <= 254, 'Host part should be 11-254 (1-10 excluded)');
  }, buildDhcpTopology);

  // ── Excluded addresses ──

  runner.test('DHCP skips excluded address range', (assert) => {
    const { devices } = buildDhcpTopology();
    // Excluded: 192.168.1.1 - 192.168.1.10
    const result = tryDhcpAssign(devices, 'PC1', 'Ethernet0');
    assert.ok(result !== null, 'Should get assignment');
    const host = parseInt(result.ip.split('.')[3]);
    assert.ok(host > 10, 'Should skip excluded range (1-10), got .' + host);
  }, buildDhcpTopology);

  runner.test('DHCP skips statically assigned IPs', (assert) => {
    const { devices } = buildDhcpTopology();
    // Server1 has 192.168.1.5 (within excluded range, but also test the static check)
    // Assign to PC1, then PC2 should get a different IP
    const r1 = tryDhcpAssign(devices, 'PC1', 'Ethernet0');
    assert.ok(r1 !== null, 'PC1 should get IP');
    devices.PC1.interfaces.Ethernet0.ip = r1.ip;
    devices.PC1.interfaces.Ethernet0.mask = r1.mask;

    const r2 = tryDhcpAssign(devices, 'PC2', 'Ethernet0');
    assert.ok(r2 !== null, 'PC2 should get IP');
    assert.ok(r1.ip !== r2.ip, 'PC1 and PC2 should get different IPs');
  }, buildDhcpTopology);

  // ── Multiple clients ──

  runner.test('Multiple PCs get unique IPs from same pool', (assert) => {
    const { devices } = buildDhcpTopology();
    const r1 = tryDhcpAssign(devices, 'PC1', 'Ethernet0');
    assert.ok(r1 !== null, 'PC1 should get IP');
    devices.PC1.interfaces.Ethernet0.ip = r1.ip;
    devices.PC1.interfaces.Ethernet0.mask = r1.mask;

    const r2 = tryDhcpAssign(devices, 'PC2', 'Ethernet0');
    assert.ok(r2 !== null, 'PC2 should get IP');
    assert.ok(r1.ip !== r2.ip, 'IPs must be unique: ' + r1.ip + ' vs ' + r2.ip);
  }, buildDhcpTopology);

  runner.test('DHCP clients can ping each other after assignment', (assert) => {
    const { devices } = buildDhcpTopology();
    const r1 = tryDhcpAssign(devices, 'PC1', 'Ethernet0');
    const r2 = tryDhcpAssign(devices, 'PC2', 'Ethernet0');
    assert.ok(r1 && r2, 'Both PCs should get IPs');
    devices.PC1.interfaces.Ethernet0.ip = r1.ip;
    devices.PC1.interfaces.Ethernet0.mask = r1.mask;
    devices.PC1.defaultGateway = r1.gateway;
    devices.PC2.interfaces.Ethernet0.ip = r2.ip;
    devices.PC2.interfaces.Ethernet0.mask = r2.mask;
    devices.PC2.defaultGateway = r2.gateway;

    assert.ok(canReach(devices, 'PC1', r2.ip), 'PC1 should reach PC2');
    assert.ok(canReach(devices, 'PC2', r1.ip), 'PC2 should reach PC1');
  }, buildDhcpTopology);

  runner.test('DHCP client can ping router gateway', (assert) => {
    const { devices } = buildDhcpTopology();
    const result = tryDhcpAssign(devices, 'PC1', 'Ethernet0');
    assert.ok(result !== null, 'PC1 should get IP');
    devices.PC1.interfaces.Ethernet0.ip = result.ip;
    devices.PC1.interfaces.Ethernet0.mask = result.mask;
    devices.PC1.defaultGateway = result.gateway;

    assert.ok(canReach(devices, 'PC1', '192.168.1.1'), 'PC1 should reach router');
  }, buildDhcpTopology);

  // ── Binding tracking ──

  runner.test('DHCP binding is recorded in pool', (assert) => {
    const { devices } = buildDhcpTopology();
    const pool = devices.R1.dhcp.pools.LAN;
    assert.equal(Object.keys(pool.bindings).length, 0, 'No bindings initially');

    const result = tryDhcpAssign(devices, 'PC1', 'Ethernet0');
    assert.ok(result !== null, 'Should get assignment');
    assert.equal(Object.keys(pool.bindings).length, 1, 'One binding after assign');
    assert.equal(pool.bindings[result.ip], 'PC1/Ethernet0', 'Binding client-ID');
  }, buildDhcpTopology);

  // ── No server scenarios ──

  runner.test('DHCP returns null when no pool configured', (assert) => {
    const { devices } = buildDhcpNoPoolTopology();
    const result = tryDhcpAssign(devices, 'PC1', 'Ethernet0');
    assert.equal(result, null, 'Should return null when no DHCP pool');
  }, buildDhcpNoPoolTopology);

  runner.test('DHCP returns null when PC is disconnected', (assert) => {
    const { devices } = buildDhcpTopology();
    devices.PC1.interfaces.Ethernet0.connected = null;
    const result = tryDhcpAssign(devices, 'PC1', 'Ethernet0');
    assert.equal(result, null, 'Should return null when disconnected');
  }, buildDhcpTopology);

  runner.test('DHCP returns null when interface is down', (assert) => {
    const { devices } = buildDhcpTopology();
    devices.PC1.interfaces.Ethernet0.status = 'down';
    const result = tryDhcpAssign(devices, 'PC1', 'Ethernet0');
    assert.equal(result, null, 'Should return null when interface down');
  }, buildDhcpTopology);
}
