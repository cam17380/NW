// ─── LocalStorage persistence ───
import { getSnapshot, applySnapshot } from './Snapshot.js';
import { showToast } from '../ui/Toast.js';

const SAVE_KEY = 'netsim_save';

export function saveConfig(store) {
  const snap = getSnapshot(store.getDevices());
  const data = { timestamp: new Date().toISOString(), devices: snap };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  showToast('Config saved to browser storage', 'success');
  updateSaveInfo();
}

export function loadConfig(store, refreshUI) {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) { showToast('No saved config found', 'error'); return; }
  try {
    const data = JSON.parse(raw);
    applySnapshot(store.getDevices(), data.devices);
    refreshUI();
    showToast('Config loaded successfully', 'success');
  } catch (e) {
    showToast('Failed to load config: ' + e.message, 'error');
  }
}

export function exportConfig(store) {
  const snap = getSnapshot(store.getDevices());
  const data = { timestamp: new Date().toISOString(), version: 1, devices: snap };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.download = `netsim-config-${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Config exported to file', 'success');
}

export function setupImport(store, refreshUI) {
  document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.devices) throw new Error('Invalid config file format');
        applySnapshot(store.getDevices(), data.devices);
        refreshUI();
        showToast('Config imported from file', 'success');
      } catch (err) {
        showToast('Failed to import: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

export function importConfig() {
  document.getElementById('importFile').click();
}

export function updateSaveInfo() {
  const raw = localStorage.getItem(SAVE_KEY);
  const el = document.getElementById('saveInfo');
  if (!raw) { el.textContent = ''; return; }
  try {
    const data = JSON.parse(raw);
    const d = new Date(data.timestamp);
    el.textContent = 'Last save: ' + d.toLocaleString('ja-JP');
  } catch { el.textContent = ''; }
}

export function autoLoadConfig(store) {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    applySnapshot(store.getDevices(), data.devices);
    return true;
  } catch {
    return false;
  }
}

export function confirmReset() {
  document.getElementById('confirmMsg').textContent =
    'All device configurations will be reset to factory defaults. Are you sure?';
  document.getElementById('confirmOverlay').classList.add('show');
}

export function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('show');
}

export function doReset(store, refreshUI) {
  closeConfirm();
  const devices = store.getDevices();
  for (const [id, dv] of Object.entries(devices)) {
    if (dv.type === 'router') {
      dv.hostname = id === 'R1' ? 'Router1' : 'Router2';
      dv.routes = [];
    }
    if (dv.type === 'switch') {
      dv.hostname = 'Switch1';
      dv.vlans = { 1: { name: 'default' } };
    }
    if (dv.type === 'pc') {
      dv.hostname = id;
      dv.defaultGateway = '';
    }
    for (const [ifName, iface] of Object.entries(dv.interfaces)) {
      iface.ip = '';
      iface.mask = '';
      iface.status = 'down';
      iface.protocol = 'down';
      iface.description = '';
      if (iface.switchport) {
        iface.switchport = { mode: 'access', accessVlan: 1, trunkAllowed: 'all' };
      }
    }
  }
  refreshUI();
  showToast('All devices reset to factory defaults', 'success');
}
