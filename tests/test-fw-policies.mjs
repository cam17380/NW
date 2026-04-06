/**
 * Firewall Policy Regression Test Suite
 *
 * Tests all UTX200 firewall policies against the netsim-SMILE9-ALL.json topology.
 * Validates three simulation functions per test case:
 *   - tracePacketFlow (show packet-flow / test access)
 *   - canReach (ping reachability / forwardPacket)
 *   - buildPingPath (ping animation path)
 *
 * Usage:
 *   node tests/test-fw-policies.mjs
 *   node tests/test-fw-policies.mjs --verbose    (show details for each test)
 *   node tests/test-fw-policies.mjs --failures   (show trace details for failures only)
 *
 * Requires: netsim-SMILE9-ALL.json in the project root directory.
 */

import { buildPingPath, tracePacketFlow } from '../src/simulation/PingEngine.js';
import { canReach } from '../src/simulation/Routing.js';
import fs from 'fs';
import path from 'path';

const verbose = process.argv.includes('--verbose');
const showFailures = process.argv.includes('--failures');

// Load topology
const jsonPath = path.resolve(import.meta.dirname, '..', 'netsim-SMILE9-ALL.json');
if (!fs.existsSync(jsonPath)) {
  console.error('ERROR: netsim-SMILE9-ALL.json not found. Place it in the project root.');
  process.exit(1);
}
const all = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const devices = all.devices;

// Initialize NAT runtime fields (not present in JSON export)
for (const dv of Object.values(devices)) {
  if (dv.nat && !dv.nat.translations) dv.nat.translations = [];
  if (dv.nat && !dv.nat.stats) dv.nat.stats = { hits: 0, misses: 0 };
}

// ─── Test Definitions ───────────────────────────────────────────
// [description, srcDevice, dstIP, proto, port, expectedReachable]

const tests = [
  // === WAN→LAN: L2L via Destination NAT (seq 10/20) ===
  ['seq10: Jutaku->AP01 via DNAT',      'PC_JUTAKU', '10.1.2.11',     'tcp', 443,   true],
  ['seq20: Jutaku->AP02 via DNAT',      'PC_JUTAKU', '10.1.2.12',     'tcp', 443,   true],

  // === LAN→WAN: AV01 outbound (seq 30/40) ===
  ['seq30: AV01->TMCM tcp/80',          'AV01',      '10.161.32.122', 'tcp', 80,    true],
  ['seq40: AV01->NTP udp/123',          'AV01',      '10.119.25.101', 'udp', 123,   true],

  // === DMZ→LAN: VPN Sapporo -> AP (seq 50/60) ===
  ['seq50: SPR1->AP01 tcp/443',         'PCSPR1',    '192.168.1.11',  'tcp', 443,   true],
  ['seq60: SPR2->AP02 tcp/443',         'PCSPR2',    '192.168.1.12',  'tcp', 443,   true],

  // === DMZ→LAN: VPN Maintenance -> AP (seq 130/140) ===
  ['seq130: MNT1->AP01 tcp/443',        'PCMNT1',    '192.168.1.11',  'tcp', 443,   true],
  ['seq140: MNT2->AP02 tcp/443',        'PCMNT2',    '192.168.1.12',  'tcp', 443,   true],

  // === DMZ→LAN: Maintenance -> iRMC VLAN20 (seq 150) ===
  ['seq150: MNT2->AP01-iRMC tcp/443',   'PCMNT2',    '192.168.2.11',  'tcp', 443,   true],
  ['seq150: MNT1->DB01-iRMC tcp/443',   'PCMNT1',    '192.168.2.21',  'tcp', 443,   true],
  ['seq150: MNT1->AV01-iRMC tcp/443',   'PCMNT1',    '192.168.2.32',  'tcp', 443,   true],

  // === DMZ→LAN: Maintenance -> RDP (seq 160) ===
  ['seq160: MNT2->AP01 tcp/3389',       'PCMNT2',    '192.168.1.11',  'tcp', 3389,  true],
  ['seq160: MNT1->DB01 tcp/3389',       'PCMNT1',    '192.168.1.21',  'tcp', 3389,  true],

  // === DMZ→LAN: VPN -> AV01 Apex One (seq 170-280) ===
  ['seq170: SPR1->AV01 tcp/443',        'PCSPR1',    '192.168.1.32',  'tcp', 443,   true],
  ['seq190: MNT1->AV01 tcp/443',        'PCMNT1',    '192.168.1.32',  'tcp', 443,   true],
  ['seq200: SPR2->AV01 tcp/10319',      'PCSPR2',    '192.168.1.32',  'tcp', 10319, true],
  ['seq220: MNT2->AV01 tcp/10319',      'PCMNT2',    '192.168.1.32',  'tcp', 10319, true],
  ['seq230: SPR1->AV01 udp/10319',      'PCSPR1',    '192.168.1.32',  'udp', 10319, true],
  ['seq250: MNT1->AV01 udp/10319',      'PCMNT1',    '192.168.1.32',  'udp', 10319, true],
  ['seq260: SPR2->AV01 udp/10323',      'PCSPR2',    '192.168.1.32',  'udp', 10323, true],
  ['seq280: MNT2->AV01 udp/10323',      'PCMNT2',    '192.168.1.32',  'udp', 10323, true],

  // === LAN→DMZ: AV01 -> VPN Apex One distribution (seq 300-410) ===
  ['seq300: AV01->SPR1 tcp/443',        'AV01',      '192.168.91.10', 'tcp', 443,   true],
  ['seq320: AV01->MNT1 tcp/443',        'AV01',      '192.168.201.10','tcp', 443,   true],
  ['seq330: AV01->SPR2 tcp/10319',      'AV01',      '192.168.91.11', 'tcp', 10319, true],
  ['seq350: AV01->MNT2 tcp/10319',      'AV01',      '192.168.201.11','tcp', 10319, true],
  ['seq360: AV01->SPR1 udp/10319',      'AV01',      '192.168.91.10', 'udp', 10319, true],
  ['seq380: AV01->MNT1 udp/10319',      'AV01',      '192.168.201.10','udp', 10319, true],
  ['seq390: AV01->SPR2 udp/10323',      'AV01',      '192.168.91.11', 'udp', 10323, true],
  ['seq410: AV01->MNT2 udp/10323',      'AV01',      '192.168.201.11','udp', 10323, true],

  // === ICMP (seq 900/910) ===
  ['seq900: SPR1->AP01 icmp',           'PCSPR1',    '192.168.1.11',  'icmp', null,  true],
  ['seq900: MNT1->AP01 icmp',           'PCMNT1',    '192.168.1.11',  'icmp', null,  true],
  ['seq910: AP01->SPR1 icmp',           'AP01',      '192.168.91.10', 'icmp', null,  true],
  ['seq910: AP01->MNT1 icmp',           'AP01',      '192.168.201.10','icmp', null,  true],

  // === DENY (seq 1000) ===
  ['DENY: SPR1->AP01 tcp/80',           'PCSPR1',    '192.168.1.11',  'tcp', 80,     false],
  ['DENY: SPR1->DB01 tcp/443',          'PCSPR1',    '192.168.1.21',  'tcp', 443,    false],
  ['DENY: MNT1->AP01 tcp/22',           'PCMNT1',    '192.168.1.11',  'tcp', 22,     false],
  ['DENY: SPR1->iRMC tcp/443',          'PCSPR1',    '192.168.2.11',  'tcp', 443,    false],
  ['DENY: Jutaku->AP01 direct (no NAT)','PC_JUTAKU', '192.168.1.11',  'tcp', 443,    false],
];

// ─── Test Runner ────────────────────────────────────────────────

let pass = 0, fail = 0;
const failures = [];

for (const [desc, srcDev, dstIP, proto, port, expectReach] of tests) {
  // 1. tracePacketFlow (test access / show packet-flow)
  const trace = tracePacketFlow(devices, srcDev, dstIP, proto, port);
  const traceOk = trace.reachable === expectReach;

  // 2. canReach (ping reachability via forwardPacket)
  const icmpReach = canReach(devices, srcDev, dstIP);

  // 3. buildPingPath (ping animation)
  const pingPath = buildPingPath(devices, srcDev, dstIP, icmpReach);

  let detail = 'trace=' + (trace.reachable ? 'REACH' : 'DENY');
  let allOk = traceOk;

  if (proto === 'icmp') {
    const pingOk = icmpReach === expectReach;
    allOk = traceOk && pingOk;
    detail += ' ping=' + (icmpReach ? 'OK' : 'FAIL');
    if (icmpReach) {
      detail += ' anim=' + pingPath.path.length + 'hops';
      if (pingPath.path.length < 3) {
        allOk = false;
        detail += '(TOO SHORT)';
      }
    }
  }

  if (verbose) {
    const mark = allOk ? 'PASS' : 'FAIL';
    console.log(`[${mark}] ${desc} | ${detail}`);
  }

  if (allOk) {
    pass++;
    if (!verbose) process.stdout.write('.');
  } else {
    fail++;
    if (!verbose) process.stdout.write('F');
    failures.push({ desc, detail, trace });
  }
}

if (!verbose) console.log('');
console.log(`\n=== ${pass} PASS / ${fail} FAIL (total ${tests.length}) ===`);

if (failures.length > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) {
    console.log(`\n  FAIL: ${f.desc} | ${f.detail}`);
    if (showFailures || verbose) {
      for (const h of f.trace.hops) {
        console.log(`    [${h.hostname}] ${h.result}`);
        for (const d of h.decisions) {
          console.log(`      ${d.text}`);
        }
      }
    }
  }
}

process.exit(fail > 0 ? 1 : 0);
