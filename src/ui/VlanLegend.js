// ─── VLAN Legend management ───
import { getVlanColor } from '../rendering/LinkRenderer.js';

export function updateVlanLegend(store) {
  const devices = store.getDevices();
  const usedVlans = new Map();
  for (const dv of Object.values(devices)) {
    if (dv.vlans) {
      for (const [vid, vlan] of Object.entries(dv.vlans)) {
        usedVlans.set(parseInt(vid), vlan.name);
      }
    }
  }
  const row = document.getElementById('legendRowLinks');
  if (!row) return;
  row.querySelectorAll('.vlan-legend').forEach(el => el.remove());
  for (const [vid, name] of usedVlans) {
    const item = document.createElement('div');
    item.className = 'legend-item vlan-legend';
    const line = document.createElement('div');
    line.className = 'legend-line';
    line.style.background = getVlanColor(vid);
    item.appendChild(line);
    item.appendChild(document.createTextNode(` VLAN${vid} (${name})`));
    row.appendChild(item);
  }
}
