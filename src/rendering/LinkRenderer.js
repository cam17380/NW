// ─── Link drawing functions ───
import { shortIfName } from '../simulation/NetworkUtils.js';

const vlanColors = {
  1:  '#69f0ae',
  10: '#42a5f5',
  20: '#ffa726',
  30: '#ef5350',
  40: '#ab47bc',
  50: '#26c6da',
  60: '#d4e157',
  70: '#ec407a',
  80: '#8d6e63',
  90: '#78909c',
  100:'#ffee58',
};

export function getVlanColor(vid) {
  if (vlanColors[vid]) return vlanColors[vid];
  const hue = (vid * 137) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export function getLinkVlanInfo(d1, if1, d2, if2) {
  const sp1 = if1.switchport;
  const sp2 = if2.switchport;

  if (!sp1 && !sp2) return { vlans: [], isTrunk: false };

  const sp = sp1 || sp2;

  if (sp.mode === 'trunk') {
    return { vlans: [], isTrunk: true };
  }

  return { vlans: [sp.accessVlan], isTrunk: false };
}

export function drawLink(ctx, link, devices, sx, sy) {
  const d1 = devices[link.from];
  const d2 = devices[link.to];
  const if1 = d1.interfaces[link.fromIf];
  const if2 = d2.interfaces[link.toIf];

  const bothUp = if1.status === 'up' && if2.status === 'up';
  const anyUp = if1.status === 'up' || if2.status === 'up';

  const linkInfo = getLinkVlanInfo(d1, if1, d2, if2);

  const x1 = sx(d1.x), y1 = sy(d1.y);
  const x2 = sx(d2.x), y2 = sy(d2.y);

  if (bothUp && linkInfo.isTrunk) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#ab47bc';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#ce93d8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke();
  } else if (bothUp && linkInfo.vlans.length > 0) {
    const vlanColor = getVlanColor(linkInfo.vlans[0]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = vlanColor;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = bothUp ? '#69f0ae' : anyUp ? '#ffa726' : '#333';
    ctx.lineWidth = bothUp ? 2.5 : 1.5;
    if (!bothUp) ctx.setLineDash([5, 5]);
    else ctx.setLineDash([]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Interface labels near each device
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  const off1x = x1 + (dx / len) * 45;
  const off1y = y1 + (dy / len) * 45;
  const off2x = x2 - (dx / len) * 45;
  const off2y = y2 - (dy / len) * 45;

  ctx.font = '10px Consolas, monospace';
  ctx.fillStyle = '#556';
  ctx.fillText(shortIfName(link.fromIf), off1x - 10, off1y - 6);
  ctx.fillText(shortIfName(link.toIf), off2x - 10, off2y - 6);

  // IP addresses
  if (if1.ip) {
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(if1.ip, off1x - 10, off1y + 10);
  }
  if (if2.ip) {
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(if2.ip, off2x - 10, off2y + 10);
  }

  // VLAN label on link
  if (bothUp && linkInfo.vlans.length > 0) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const label = linkInfo.isTrunk
      ? 'Trunk'
      : 'VLAN ' + linkInfo.vlans[0];
    ctx.font = 'bold 10px Consolas, monospace';
    ctx.fillStyle = linkInfo.isTrunk ? '#ce93d8' : getVlanColor(linkInfo.vlans[0]);
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(mx - tw / 2 - 3, my - 16, tw + 6, 14);
    ctx.fillStyle = linkInfo.isTrunk ? '#ce93d8' : getVlanColor(linkInfo.vlans[0]);
    ctx.textAlign = 'center';
    ctx.fillText(label, mx, my - 5);
    ctx.textAlign = 'left';
  }
}
