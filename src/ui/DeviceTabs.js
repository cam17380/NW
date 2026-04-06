// ─── Device tab management ───

const TAB_COLORS = {
  router: '#69f0ae', switch: '#ffa726', firewall: '#ef5350', server: '#7e57c2', pc: '#4fc3f7',
};

export function updateTabs(store, switchDevice) {
  const container = document.getElementById('deviceTabs');
  container.innerHTML = '';
  const devices = store.getDevices();
  const currentDeviceId = store.getCurrentDeviceId();

  for (const [id, dv] of Object.entries(devices)) {
    const tab = document.createElement('div');
    const isActive = id === currentDeviceId;
    const color = TAB_COLORS[dv.type] || TAB_COLORS.pc;
    tab.className = 'device-tab' + (isActive ? ' active' : '');
    if (isActive) {
      tab.style.borderColor = color;
      tab.style.color = color;
    }
    const icon = dv.type === 'router' ? 'R' : dv.type === 'switch' ? 'S' : dv.type === 'firewall' ? 'FW' : dv.type === 'server' ? 'SV' : dv.icon === 'printer' ? 'PC' : 'PC';
    tab.textContent = icon + ' ' + dv.hostname;
    tab.onclick = () => switchDevice(id);
    container.appendChild(tab);
  }
}
