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

// Compute a point on the device boundary facing the target, with perpendicular offset.
// nx, ny: perpendicular normal direction (must be consistent for both endpoints of a link)
export function getDeviceEdgePoint(type, cx, cy, targetX, targetY, nx, ny, perpOffset) {
  // Shift the "virtual center" by the perpendicular offset so each parallel link
  // originates from a distinct point on the device edge
  const ocx = cx + nx * perpOffset;
  const ocy = cy + ny * perpOffset;
  const dx = targetX - ocx;
  const dy = targetY - ocy;
  const angle = Math.atan2(dy, dx);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  if (type === 'router') {
    const r = 26;
    return { x: ocx + r * cos, y: ocy + r * sin };
  }

  // Half-widths / half-heights for rectangular devices
  let hw, hh;
  if (type === 'switch')        { hw = 27; hh = 15; }
  else if (type === 'server')   { hw = 14; hh = 19; }
  else if (type === 'pc')       { hw = 18; hh = 14; }
  else if (type === 'firewall') { hw = 24; hh = 20; }
  else                          { hw = 18; hh = 18; }

  const absCos = Math.abs(cos) || 0.001;
  const absSin = Math.abs(sin) || 0.001;
  const t = Math.min(hw / absCos, hh / absSin);

  // Clamp so the edge point doesn't exceed the device boundary from the real center
  const ex = ocx + t * cos;
  const ey = ocy + t * sin;
  const clampedX = Math.max(cx - hw, Math.min(cx + hw, ex));
  const clampedY = Math.max(cy - hh, Math.min(cy + hh, ey));

  return { x: clampedX, y: clampedY };
}

export function drawLink(ctx, link, devices, sx, sy, parallelOffset = 0, parallelIndex = 0) {
  const d1 = devices[link.from];
  const d2 = devices[link.to];
  const if1 = d1.interfaces[link.fromIf];
  const if2 = d2.interfaces[link.toIf];

  const bothUp = if1.status === 'up' && if2.status === 'up';
  const anyUp = if1.status === 'up' || if2.status === 'up';

  const linkInfo = getLinkVlanInfo(d1, if1, d2, if2);

  const baseX1 = sx(d1.x), baseY1 = sy(d1.y);
  const baseX2 = sx(d2.x), baseY2 = sy(d2.y);

  // Compute a consistent perpendicular normal based on sorted device order
  // so links with reversed from/to still get the same normal direction
  const sortedIds = [link.from, link.to].sort();
  const dA = devices[sortedIds[0]], dB = devices[sortedIds[1]];
  const ldx = sx(dB.x) - sx(dA.x);
  const ldy = sy(dB.y) - sy(dA.y);
  const llen = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
  const nx = -ldy / llen;
  const ny = ldx / llen;

  // Compute endpoints on device edges with perpendicular offset for parallel links
  const p1 = getDeviceEdgePoint(d1.type, baseX1, baseY1, baseX2, baseY2, nx, ny, parallelOffset);
  const p2 = getDeviceEdgePoint(d2.type, baseX2, baseY2, baseX1, baseY1, nx, ny, parallelOffset);
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;

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
  // For parallel links, shift labels along the link direction (tangent) so they don't overlap
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const tx = dx / len; // tangent (unit vector along link)
  const ty = dy / len;

  const labelDist = 30 + parallelIndex * 30; // each parallel link's labels shift further from edge
  const off1x = x1 + tx * labelDist;
  const off1y = y1 + ty * labelDist;
  const off2x = x2 - tx * labelDist;
  const off2y = y2 - ty * labelDist;

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

  // VLAN label on link (shift along tangent for parallel links)
  if (bothUp && linkInfo.vlans.length > 0) {
    const vlanShift = parallelIndex * 30;
    const mx = (x1 + x2) / 2 + tx * vlanShift;
    const my = (y1 + y2) / 2 + ty * vlanShift;
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
