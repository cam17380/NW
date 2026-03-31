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
import { downloadCommandScript } from './persistence/ConfigExport.js';
import { showToast } from './ui/Toast.js';

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
cli.setExecTraceroute((targetIP) => {
  execTraceroute(targetIP, store, terminal, (path, success, onComplete) => renderer.animateTraceroute(path, success, onComplete));
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
