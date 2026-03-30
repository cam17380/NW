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
  const legend = document.getElementById('legendArea');
  legend.querySelectorAll('.vlan-legend').forEach(el => el.remove());
  for (const [vid, name] of usedVlans) {
    const item = document.createElement('div');
    item.className = 'legend-item vlan-legend';
    const dot = document.createElement('div');
    dot.className = 'legend-dot';
    dot.style.background = getVlanColor(vid);
    item.appendChild(dot);
    item.appendChild(document.createTextNode(` VLAN${vid} (${name})`));
    legend.appendChild(item);
  }
}
