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
import { ChallengeEngine } from './challenge/ChallengeEngine.js';
import { ChallengeUI } from './challenge/ChallengeUI.js';
import { ChallengeSelector } from './challenge/ChallengeSelector.js';
import { beginnerScenarios } from './challenge/scenarios/BeginnerScenarios.js';
import { intermediateScenarios } from './challenge/scenarios/IntermediateScenarios.js';
import { advancedScenarios } from './challenge/scenarios/AdvancedScenarios.js';
import { LearnEngine } from './learn/LearnEngine.js';
import { LearnSelector } from './learn/LearnSelector.js';
import { LearnUI } from './learn/LearnUI.js';
import { lessonIPAddress } from './learn/lessons/Lesson_IPAddress.js';
import { lessonSubnetMask } from './learn/lessons/Lesson_SubnetMask.js';
import { lessonNetworkBroadcast } from './learn/lessons/Lesson_NetworkBroadcast.js';
import { lessonEthernetSwitch } from './learn/lessons/Lesson_EthernetSwitch.js';
import { lessonPacketStructure } from './learn/lessons/Lesson_PacketStructure.js';
import { lessonRouting } from './learn/lessons/Lesson_Routing.js';
import { registerLocale, setLocale, getLocale, loadSavedLocale, onLocaleChanged, t } from './i18n/I18n.js';
import { en } from './i18n/locales/en.js';
import { ja } from './i18n/locales/ja.js';
import { enChallenge } from './i18n/locales/en_challenge.js';
import { jaChallenge } from './i18n/locales/ja_challenge.js';
import { enLearn } from './i18n/locales/en_learn.js';
import { jaLearn } from './i18n/locales/ja_learn.js';
import { enHelp } from './i18n/locales/en_help.js';
import { jaHelp } from './i18n/locales/ja_help.js';
import { renderHelpContent } from './ui/HelpRenderer.js';

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
    terminal.write('\n--- ' + t('ui.connectedTo', { name: store.getCurrentDevice().hostname }) + ' ---\n', 'success-line');
  }
  doUpdatePrompt();
  doUpdateTabs();
  renderer.draw();
  document.getElementById('cmdInput').focus();
}

function doUpdateTabs() { updateTabs(store, switchDevice); }
function doUpdatePrompt() { updatePrompt(store); }
function doUpdateVlanLegend() { updateVlanLegend(store); }

// ─── I18n setup ───
registerLocale('en', en);
registerLocale('en', enChallenge);
registerLocale('en', enLearn);
registerLocale('ja', ja);
registerLocale('ja', jaChallenge);
registerLocale('ja', jaLearn);
registerLocale('en', enHelp);
registerLocale('ja', jaHelp);
loadSavedLocale();

function updateUIText() {
  // Update all elements with data-i18n attribute
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  }
  // Language toggle button
  document.getElementById('langToggle').textContent = t('ui.lang');
  // HTML lang attribute
  document.documentElement.lang = getLocale() === 'ja' ? 'ja' : 'en';
}

window.toggleLang = () => {
  setLocale(getLocale() === 'ja' ? 'en' : 'ja');
};

onLocaleChanged(() => {
  updateUIText();
  // Re-render modals if open
  if (challengeSelector.el && challengeSelector.el.style.display !== 'none') challengeSelector.render();
  if (learnSelector.el && learnSelector.el.style.display !== 'none') learnSelector.render();
  if (learnUI.el && learnUI.el.style.display !== 'none') learnUI.render();
  if (challengeUI.el && challengeUI.el.style.display !== 'none') challengeUI.render();
});

function refreshUI() {
  store.deviceSessions = {};
  store.cliMode = 'user';
  store.currentInterface = '';
  store.currentVlanId = null;
  terminal.clear();
  terminal.write(t('ui.welcome'), 'success-line');
  terminal.write(t('ui.welcomeSub') + '\n');
  terminal.write(t('ui.welcomeHelp') + '\n');
  const curDev = store.getCurrentDevice();
  if (curDev) terminal.write(t('ui.connectedTo', { name: curDev.hostname }) + '\n', 'success-line');
  doUpdatePrompt();
  doUpdateTabs();
  renderer.fitView();
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
function updateHelpContent() {
  const el = document.getElementById('helpContent');
  if (el) el.innerHTML = renderHelpContent();
}

function toggleHelp() {
  updateHelpContent();
  const overlay = document.getElementById('helpOverlay');
  const badge = document.querySelector('.help-badge');
  overlay.classList.toggle('show');
  if (badge) badge.classList.toggle('active', overlay.classList.contains('show'));
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
window.exportScript = () => { downloadCommandScript(store); showToast(t('ui.toastScriptExported'), 'success'); };
window.exportYamaha = () => { downloadYamahaScript(store); showToast(t('ui.toastYamahaExported'), 'success'); };
window.exportImage = () => {
  const dataURL = renderer.exportImage();
  if (!dataURL) { showToast(t('ui.toastNoDevices'), 'error'); return; }
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `netsim-topology-${new Date().toISOString().slice(0,10)}.png`;
  a.click();
  showToast(t('ui.toastImageExported'), 'success');
};

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
    showToast(t('ui.toastChallengeComplete'), 'success');
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
  terminal.write(t('ui.challengeStarted', { title: challengeEngine.current.title }) + '\n', 'success-line');
  terminal.write(`${challengeEngine.current.description}\n`);
  terminal.write(t('ui.connectedTo', { name: d.hostname }) + '\n', 'success-line');
};

window.showChallenges = () => challengeSelector.show();

// ─── Learn Mode ───
const learnEngine = new LearnEngine();
learnEngine.registerLessons([lessonIPAddress, lessonSubnetMask, lessonNetworkBroadcast, lessonEthernetSwitch, lessonPacketStructure, lessonRouting]);

const learnUI = new LearnUI(learnEngine);
learnUI.mount(document.body);
learnUI.onQuit = () => {
  showToast(t('ui.toastLessonComplete'), 'success');
};

const learnSelector = new LearnSelector(learnEngine);
learnSelector.mount(document.body);
learnSelector.onSelect = (lessonId) => {
  learnEngine.start(lessonId);
  learnUI.show();
};

window.showLessons = () => learnSelector.show();

// ─── Initial render ───
renderer.fitView();
doUpdateTabs();
doUpdatePrompt();
doUpdateVlanLegend();
updateSaveInfo();

// Auto-load saved config
const loaded = autoLoadConfig(store);
if (loaded) {
  doUpdateTabs();
  doUpdatePrompt();
  renderer.fitView();
  doUpdateVlanLegend();
  terminal.write(t('ui.welcome'), 'success-line');
  terminal.write(t('ui.savedRestored') + '\n', 'success-line');
  terminal.write(t('ui.welcomeHelp') + '\n');
  terminal.write(t('ui.connectedTo', { name: store.getCurrentDevice().hostname }) + '\n', 'success-line');
} else {
  terminal.write(t('ui.welcome'), 'success-line');
  terminal.write(t('ui.welcomeSub') + '\n');
  terminal.write(t('ui.welcomeHelp') + '\n');
  terminal.write(t('ui.connectedTo', { name: store.getCurrentDevice().hostname }) + '\n', 'success-line');
}

// Apply initial UI text
updateUIText();
