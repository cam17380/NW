// ─── Device tab management ───

export function updateTabs(store, switchDevice) {
  const container = document.getElementById('deviceTabs');
  container.innerHTML = '';
  const devices = store.getDevices();
  const currentDeviceId = store.getCurrentDeviceId();

  for (const [id, dv] of Object.entries(devices)) {
    const tab = document.createElement('div');
    tab.className = 'device-tab' + (id === currentDeviceId ? ' active' : '');
    const icon = dv.type === 'router' ? 'R' : dv.type === 'switch' ? 'S' : dv.type === 'firewall' ? 'FW' : 'PC';
    tab.textContent = icon + ' ' + dv.hostname;
    tab.onclick = () => switchDevice(id);
    container.appendChild(tab);
  }
}
