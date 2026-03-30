// ─── Device drawing functions ───

export function drawRouter(ctx, x, y, dv, selected) {
  const r = 24;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = selected ? '#1a3a5c' : '#1a2332';
  ctx.fill();
  ctx.strokeStyle = getDeviceBorderColor(dv);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = getDeviceBorderColor(dv);
  ctx.lineWidth = 1.5;
  const s = 12;
  ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.stroke();
  drawArrowHead(ctx, x + s, y, 0); drawArrowHead(ctx, x - s, y, Math.PI);
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
  drawArrowHead(ctx, x, y - s, -Math.PI / 2); drawArrowHead(ctx, x, y + s, Math.PI / 2);
}

export function drawSwitch(ctx, x, y, dv, selected) {
  const w = 50, h = 26;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 4);
  ctx.fillStyle = selected ? '#1a3a5c' : '#1a2332';
  ctx.fill();
  ctx.strokeStyle = getDeviceBorderColor(dv);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = getDeviceBorderColor(dv);
  ctx.lineWidth = 1.5;
  const s = 14;
  ctx.beginPath(); ctx.moveTo(x - s, y - 4); ctx.lineTo(x + s, y - 4); ctx.stroke();
  drawArrowHead(ctx, x + s, y - 4, 0);
  ctx.beginPath(); ctx.moveTo(x + s, y + 4); ctx.lineTo(x - s, y + 4); ctx.stroke();
  drawArrowHead(ctx, x - s, y + 4, Math.PI);
}

export function drawPC(ctx, x, y, dv, selected) {
  const w = 32, h = 24;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 3);
  ctx.fillStyle = selected ? '#1a3a5c' : '#1a2332';
  ctx.fill();
  ctx.strokeStyle = getDeviceBorderColor(dv);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 6, y + h / 2); ctx.lineTo(x + 6, y + h / 2);
  ctx.moveTo(x, y + h / 2); ctx.lineTo(x, y + h / 2 + 6);
  ctx.moveTo(x - 8, y + h / 2 + 6); ctx.lineTo(x + 8, y + h / 2 + 6);
  ctx.strokeStyle = getDeviceBorderColor(dv);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function drawArrowHead(ctx, x, y, angle) {
  const size = 5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - 0.5), y - size * Math.sin(angle - 0.5));
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle + 0.5), y - size * Math.sin(angle + 0.5));
  ctx.stroke();
}

export function getDeviceBorderColor(dv) {
  const anyUp = Object.values(dv.interfaces).some(i => i.status === 'up');
  const allUp = Object.values(dv.interfaces).every(i => i.status === 'up');
  if (allUp) return '#69f0ae';
  if (anyUp) return '#ffa726';
  return '#555';
}
