// ─── Main: Application entry point ───
import { EventBus } from './core/EventBus.js';
import { Store } from './core/Store.js';
import { CLIEngine } from './cli/CLIEngine.js';
import { tabComplete } from './cli/TabComplete.js';
import { Terminal } from './ui/Terminal.js';
import { CanvasRenderer } from './rendering/CanvasRenderer.js';
import { updateTabs } from './ui/DeviceTabs.js';
import { updatePrompt } from './ui/CommandHints.js';
import { updateVlanLegend } from './ui/VlanLegend.js';
import { execPing, execTraceroute } from './simulation/PingEngine.js';
import {
  saveConfig, loadConfig, exportConfig, importConfig,
  setupImport, updateSaveInfo, autoLoadConfig,
  confirmReset, closeConfirm, doReset,
} from './persistence/LocalStorage.js';
import { DesignController } from './design/DesignController.js';
import { DevicePalette } from './design/DevicePalette.js';
import { InterfacePicker } from './design/InterfacePicker.js';
import { ContextMenu } from './design/ContextMenu.js';
import { initSplitter } from './ui/Splitter.js';
import { initTemplateSelector, showTemplateSelector } from './ui/TemplateSelector.js';
import { downloadCommandScript, downloadYamahaScript } from './persistence/ConfigExport.js';
import { showToast } from './ui/Toast.js';
import { TestRunner } from './test/TestRunner.js';
import { TestUI } from './test/TestUI.js';
import { registerVlanTests } from './test/tests/VlanTests.js';
import { registerArpTests } from './test/tests/ArpTests.js';
import { registerRoutingTests } from './test/tests/RoutingTests.js';
import { registerFirewallTests } from './test/tests/FirewallTests.js';
import { registerNatTests } from './test/tests/NatTests.js';
import { registerAclTests } from './test/tests/AclTests.js';
import { registerPacketFlowTests } from './test/tests/PacketFlowTests.js';
import { registerL3SwitchTests } from './test/tests/L3SwitchTests.js';
import { registerBondTests } from './test/tests/BondTests.js';
import { registerVpnTunnelTests } from './test/tests/VpnTunnelTests.js';
import { registerDhcpTests } from './test/tests/DhcpTests.js';
import { ChallengeEngine } from './challenge/ChallengeEngine.js';
import { ChallengeUI } from './challenge/ChallengeUI.js';
import { ChallengeSelector } from './challenge/ChallengeSelector.js';
import { beginnerScenarios } from './challenge/scenarios/BeginnerScenarios.js';
import { intermediateScenarios } from './challenge/scenarios/IntermediateScenarios.js';
import { advancedScenarios } from './challenge/scenarios/AdvancedScenarios.js';

// ─── Initialize core ───
const eventBus = new EventBus();
const store = new Store(eventBus);
const terminal = new Terminal(document.getElementById('termOutput'));
const canvas = document.getElementById('netCanvas');
const renderer = new CanvasRenderer(canvas, store, eventBus);
const cli = new CLIEngine(store, terminal, eventBus);

// ─── Initialize design mode ───
const designController = new DesignController(canvas, store, eventBus, renderer);
const interfacePicker = new InterfacePicker(store);
const contextMenu = new ContextMenu(store, eventBus);
const palette = new DevicePalette(store, eventBus, designController);
designController.interfacePicker = interfacePicker;
designController.contextMenu = contextMenu;

// ─── Wire up dependencies ───
function switchDevice(id) {
  // Save current device's session (terminal buffer + CLI state)
  store.saveSession(terminal.getBuffer());
  store.setCurrentDevice(id);
  // Restore target device's session
  const savedBuffer = store.restoreSession(id);
  if (savedBuffer) {
    terminal.setBuffer(savedBuffer);
  } else {
    terminal.clear();
    terminal.write(`\n--- Connected to ${store.getCurrentDevice().hostname} ---\n`, 'success-line');
  }
  doUpdatePrompt();
  doUpdateTabs();
  renderer.draw();
  document.getElementById('cmdInput').focus();
}

function doUpdateTabs() { updateTabs(store, switchDevice); }
function doUpdatePrompt() { updatePrompt(store); }
function doUpdateVlanLegend() { updateVlanLegend(store); }

function refreshUI() {
  store.deviceSessions = {};
  store.cliMode = 'user';
  store.currentInterface = '';
  store.currentVlanId = null;
  terminal.clear();
  terminal.write('Welcome to Network Simulator!', 'success-line');
  terminal.write('Practice Cisco IOS commands and watch the network respond.\n');
  terminal.write('Type commands below or click "? Help" for reference.\n');
  terminal.write(`Connected to ${store.getCurrentDevice().hostname}\n`, 'success-line');
  doUpdatePrompt();
  doUpdateTabs();
  renderer.draw();
  doUpdateVlanLegend();
  updateSaveInfo();
  document.getElementById('cmdInput').focus();
}

// Set CLIEngine callbacks
cli.setExecPing((targetIP) => {
  execPing(targetIP, store, terminal, (path, linkHints, success, arpResolutions, onComplete) => {
    if (arpResolutions && arpResolutions.length > 0) {
      renderer.animateArpSequence(arpResolutions, () => {
        renderer.animatePing(path, linkHints, success, onComplete);
      });
    } else {
      renderer.animatePing(path, linkHints, success, onComplete);
    }
  });
});
cli.setExecTraceroute((targetIP) => {
  execTraceroute(targetIP, store, terminal, (path, linkHints, success, onComplete) => renderer.animateTraceroute(path, linkHints, success, onComplete));
});
cli.setUpdateTabs(doUpdateTabs);

// ─── Event subscriptions ───
eventBus.on('command:executed', () => {
  doUpdatePrompt();
  doUpdateVlanLegend();
});

eventBus.on('cli:modeChanged', () => {
  doUpdatePrompt();
});

eventBus.on('device:switched', () => {
  doUpdateTabs();
});

eventBus.on('device:listChanged', () => {
  doUpdateTabs();
  doUpdateVlanLegend();
});

// ─── Design mode toggle ───
const designToggle = document.getElementById('designToggle');
eventBus.on('design:modeChanged', (enabled) => {
  designToggle.classList.toggle('active', enabled);
  canvas.style.cursor = enabled ? 'default' : '';
});

designToggle.addEventListener('click', () => {
  store.setDesignMode(!store.designMode);
});

// ─── Input handling ───
const cmdInput = document.getElementById('cmdInput');

cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const val = cmdInput.value;
    cmdInput.value = '';
    cli.executeCommand(val);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = store.getHistoryPrev();
    if (prev !== null) cmdInput.value = prev;
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    cmdInput.value = store.getHistoryNext();
  } else if (e.key === 'Tab') {
    e.preventDefault();
    cmdInput.value = tabComplete(
      cmdInput.value,
      store.getCLIMode(),
      (t, c) => terminal.write(t, c),
      () => cli.getPrompt()
    );
  }
});

// ─── Help overlay ───
function toggleHelp() {
  document.getElementById('helpOverlay').classList.toggle('show');
}

// ─── Expose to HTML onclick handlers ───
window.saveConfig = () => saveConfig(store);
window.loadConfig = () => loadConfig(store, refreshUI);
window.exportConfig = () => exportConfig(store);
window.importConfig = importConfig;
window.confirmReset = confirmReset;
window.closeConfirm = closeConfirm;
window.doReset = () => doReset(store, refreshUI);
window.toggleHelp = toggleHelp;
window.showTemplates = showTemplateSelector;
window.exportScript = () => { downloadCommandScript(store); showToast('Command script exported', 'success'); };
window.exportYamaha = () => { downloadYamahaScript(store); showToast('YAMAHA script exported', 'success'); };
window.exportImage = () => {
  const dataURL = renderer.exportImage();
  if (!dataURL) { showToast('No devices to export', 'error'); return; }
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `netsim-topology-${new Date().toISOString().slice(0,10)}.png`;
  a.click();
  showToast('Topology image exported', 'success');
};

// ─── Test Mode ───
const testRunner = new TestRunner();
registerVlanTests(testRunner);
registerArpTests(testRunner);
registerRoutingTests(testRunner);
registerFirewallTests(testRunner);
registerNatTests(testRunner);
registerAclTests(testRunner);
registerPacketFlowTests(testRunner);
registerL3SwitchTests(testRunner);
registerBondTests(testRunner);
registerVpnTunnelTests(testRunner);
registerDhcpTests(testRunner);

const testModeContainer = document.getElementById('testModeContainer');
const testUI = new TestUI(testModeContainer, testRunner);

function enterTestMode() {
  testModeContainer.style.display = 'flex';
  document.querySelector('header').style.display = 'none';
  document.querySelector('.main-container').style.display = 'none';
}

function exitTestMode() {
  testModeContainer.style.display = 'none';
  document.querySelector('header').style.display = '';
  document.querySelector('.main-container').style.display = '';
  document.getElementById('cmdInput').focus();
}

testUI.onBack = exitTestMode;

testUI.onOpenInSimulator = (devices) => {
  // Derive links from device interface connections
  const links = [];
  const seen = new Set();
  for (const [id, dv] of Object.entries(devices)) {
    for (const [ifName, iface] of Object.entries(dv.interfaces || {})) {
      if (!iface.connected) continue;
      const peerId = iface.connected.device;
      const peerIf = iface.connected.iface;
      if (!devices[peerId]) continue;
      const key = [id, peerId].sort().join(':') + ':' + [ifName, peerIf].sort().join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ from: id, fromIf: ifName, to: peerId, toIf: peerIf });
    }
  }
  // Ensure all devices have arpTable (required by simulator)
  for (const dv of Object.values(devices)) {
    if (!dv.arpTable) dv.arpTable = [];
  }
  store.setTopology(devices, links);
  store.resetView();
  exitTestMode();
  refreshUI();
};

document.getElementById('testModeBtn').addEventListener('click', enterTestMode);

// ─── Setup ───
initTemplateSelector(store, refreshUI);
setupImport(store, refreshUI);
renderer.setupClickHandler(switchDevice, designController, palette);

// ─── Panel splitter ───
initSplitter(
  document.getElementById('panelSplitter'),
  document.querySelector('.terminal-panel'),
  document.querySelector('.diagram-panel'),
  () => renderer.resize()
);

// ─── Challenge Mode ───
const challengeEngine = new ChallengeEngine();
challengeEngine.registerScenarios(beginnerScenarios);
challengeEngine.registerScenarios(intermediateScenarios);
challengeEngine.registerScenarios(advancedScenarios);

const challengeUI = new ChallengeUI(challengeEngine);
challengeUI.mount(document.body);
challengeUI.onCheck = () => {
  const result = challengeEngine.check(store.getDevices());
  if (result.allPassed) {
    showToast('Challenge Complete!', 'success');
  }
  challengeUI.render();
};
challengeUI.onQuit = () => {
  document.getElementById('challengeBtn').classList.remove('active');
  refreshUI();
};

const challengeSelector = new ChallengeSelector(challengeEngine);
challengeSelector.mount(document.body);
challengeSelector.onSelect = (scenarioId) => {
  challengeEngine.start(scenarioId, store);
  refreshUI();
  challengeUI.show();
  document.getElementById('challengeBtn').classList.add('active');
  const d = store.getCurrentDevice();
  terminal.write(`--- Challenge started: ${challengeEngine.current.title} ---\n`, 'success-line');
  terminal.write(`${challengeEngine.current.description}\n`);
  terminal.write(`--- Connected to ${d.hostname} ---\n`, 'success-line');
};

window.showChallenges = () => challengeSelector.show();

// ─── Initial render ───
renderer.resize();
doUpdateTabs();
doUpdatePrompt();
doUpdateVlanLegend();
updateSaveInfo();

// Auto-load saved config
const loaded = autoLoadConfig(store);
if (loaded) {
  doUpdateTabs();
  doUpdatePrompt();
  renderer.draw();
  doUpdateVlanLegend();
  terminal.write('Welcome to Network Simulator!', 'success-line');
  terminal.write('Saved configuration restored automatically.\n', 'success-line');
  terminal.write('Type commands below or click "? Help" for reference.\n');
  terminal.write(`Connected to ${store.getCurrentDevice().hostname}\n`, 'success-line');
} else {
  terminal.write('Welcome to Network Simulator!', 'success-line');
  terminal.write('Practice Cisco IOS commands and watch the network respond.\n');
  terminal.write('Type commands below or click "? Help" for reference.\n');
  terminal.write(`Connected to ${store.getCurrentDevice().hostname}\n`, 'success-line');
}
