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
import { execPing } from './simulation/PingEngine.js';
import {
  saveConfig, loadConfig, exportConfig, importConfig,
  setupImport, updateSaveInfo, autoLoadConfig,
  confirmReset, closeConfirm, doReset,
} from './persistence/LocalStorage.js';

// ─── Initialize core ───
const eventBus = new EventBus();
const store = new Store(eventBus);
const terminal = new Terminal(document.getElementById('termOutput'));
const canvas = document.getElementById('netCanvas');
const renderer = new CanvasRenderer(canvas, store, eventBus);
const cli = new CLIEngine(store, terminal, eventBus);

// ─── Wire up dependencies ───
function switchDevice(id) {
  store.setCurrentDevice(id);
  terminal.clear();
  terminal.write(`\n--- Connected to ${store.getCurrentDevice().hostname} ---\n`, 'success-line');
  doUpdatePrompt();
  doUpdateTabs();
  renderer.draw();
  document.getElementById('cmdInput').focus();
}

function doUpdateTabs() { updateTabs(store, switchDevice); }
function doUpdatePrompt() { updatePrompt(store); }
function doUpdateVlanLegend() { updateVlanLegend(store); }

function refreshUI() {
  store.cliMode = 'user';
  store.currentInterface = '';
  store.currentVlanId = null;
  terminal.clear();
  terminal.write(`\n--- Connected to ${store.getCurrentDevice().hostname} ---\n`, 'success-line');
  doUpdatePrompt();
  doUpdateTabs();
  renderer.draw();
  doUpdateVlanLegend();
  updateSaveInfo();
  document.getElementById('cmdInput').focus();
}

// Set CLIEngine callbacks
cli.setExecPing((targetIP) => {
  execPing(targetIP, store, terminal, (path, success, onComplete) => renderer.animatePing(path, success, onComplete));
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

// ─── Setup ───
setupImport(store, refreshUI);
renderer.setupClickHandler(switchDevice);

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
