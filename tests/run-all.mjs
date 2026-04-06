/**
 * Run all Test Mode tests from the command line.
 * Usage: node tests/run-all.mjs
 */
import { TestRunner } from '../src/test/TestRunner.js';
import { registerVlanTests } from '../src/test/tests/VlanTests.js';
import { registerArpTests } from '../src/test/tests/ArpTests.js';
import { registerRoutingTests } from '../src/test/tests/RoutingTests.js';
import { registerFirewallTests } from '../src/test/tests/FirewallTests.js';
import { registerNatTests } from '../src/test/tests/NatTests.js';
import { registerAclTests } from '../src/test/tests/AclTests.js';
import { registerPacketFlowTests } from '../src/test/tests/PacketFlowTests.js';
import { registerL3SwitchTests } from '../src/test/tests/L3SwitchTests.js';
import { registerBondTests } from '../src/test/tests/BondTests.js';
import { registerVpnTunnelTests } from '../src/test/tests/VpnTunnelTests.js';

const runner = new TestRunner();
registerVlanTests(runner);
registerArpTests(runner);
registerRoutingTests(runner);
registerFirewallTests(runner);
registerNatTests(runner);
registerAclTests(runner);
registerPacketFlowTests(runner);
registerL3SwitchTests(runner);
registerBondTests(runner);
registerVpnTunnelTests(runner);

runner.onProgress = (cat, test) => {
  const mark = test.status === 'passed' ? '.' : 'F';
  process.stdout.write(mark);
};

await runner.runAll();

console.log('');
let totalPass = 0, totalFail = 0;
const failures = [];
for (const cat of runner.categories) {
  for (const t of cat.tests) {
    if (t.status === 'passed') totalPass++;
    else {
      totalFail++;
      failures.push({ cat: cat.name, name: t.name, error: t.error });
    }
  }
}
console.log(`\n=== ${totalPass} PASS / ${totalFail} FAIL (total ${totalPass + totalFail}) ===`);
if (failures.length) {
  console.log('\nFAILURES:');
  for (const f of failures) {
    console.log(`  [${f.cat}] ${f.name}: ${f.error}`);
  }
}
process.exit(totalFail > 0 ? 1 : 0);
