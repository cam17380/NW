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

export function drawPrinter(ctx, x, y, dv, selected) {
  const w = 34, h = 22;
  const color = getDeviceBorderColor(dv);
  // Printer body
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2 + 2, w, h, 3);
  ctx.fillStyle = selected ? '#1a3a5c' : '#1a2332';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Paper input tray (top)
  ctx.beginPath();
  ctx.moveTo(x - 10, y - h / 2 + 2);
  ctx.lineTo(x - 8, y - h / 2 - 6);
  ctx.lineTo(x + 8, y - h / 2 - 6);
  ctx.lineTo(x + 10, y - h / 2 + 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Paper output slot (front, bottom)
  ctx.beginPath();
  ctx.moveTo(x - 12, y + h / 2 + 2);
  ctx.lineTo(x - 10, y + h / 2 + 7);
  ctx.lineTo(x + 10, y + h / 2 + 7);
  ctx.lineTo(x + 12, y + h / 2 + 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Paper lines on output
  ctx.beginPath();
  ctx.moveTo(x - 6, y + h / 2 + 4);
  ctx.lineTo(x + 6, y + h / 2 + 4);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // LED dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + w / 2 - 6, y, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFirewall(ctx, x, y, dv, selected) {
  // Shield shape
  const w = 22, h = 30;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.quadraticCurveTo(x + w + 4, y - h + 4, x + w, y - 4);
  ctx.lineTo(x + w * 0.6, y + h * 0.4);
  ctx.lineTo(x, y + h * 0.6);
  ctx.lineTo(x - w * 0.6, y + h * 0.4);
  ctx.lineTo(x - w, y - 4);
  ctx.quadraticCurveTo(x - w - 4, y - h + 4, x, y - h);
  ctx.closePath();
  ctx.fillStyle = selected ? '#1a3a5c' : '#1a2332';
  ctx.fill();
  ctx.strokeStyle = getDeviceBorderColor(dv);
  ctx.lineWidth = 2;
  ctx.stroke();
  // Brick pattern inside
  ctx.strokeStyle = getDeviceBorderColor(dv);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 10); ctx.lineTo(x + 14, y - 10);
  ctx.moveTo(x - 12, y - 2); ctx.lineTo(x + 12, y - 2);
  ctx.moveTo(x - 8, y + 6); ctx.lineTo(x + 8, y + 6);
  ctx.moveTo(x, y - 18); ctx.lineTo(x, y - 10);
  ctx.moveTo(x - 7, y - 10); ctx.lineTo(x - 7, y - 2);
  ctx.moveTo(x + 7, y - 10); ctx.lineTo(x + 7, y - 2);
  ctx.moveTo(x, y - 2); ctx.lineTo(x, y + 6);
  ctx.stroke();
}

export function drawServer(ctx, x, y, dv, selected) {
  // Tower server shape (tall rectangle with rack lines)
  const w = 24, h = 34;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 3);
  ctx.fillStyle = selected ? '#1a3a5c' : '#1a2332';
  ctx.fill();
  ctx.strokeStyle = getDeviceBorderColor(dv);
  ctx.lineWidth = 2;
  ctx.stroke();
  // Rack slots
  ctx.strokeStyle = getDeviceBorderColor(dv);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 4, y - h / 2 + 8); ctx.lineTo(x + w / 2 - 4, y - h / 2 + 8);
  ctx.moveTo(x - w / 2 + 4, y - h / 2 + 15); ctx.lineTo(x + w / 2 - 4, y - h / 2 + 15);
  ctx.moveTo(x - w / 2 + 4, y - h / 2 + 22); ctx.lineTo(x + w / 2 - 4, y - h / 2 + 22);
  ctx.stroke();
  // Small LED indicator dots
  ctx.fillStyle = getDeviceBorderColor(dv);
  ctx.beginPath();
  ctx.arc(x + w / 2 - 7, y - h / 2 + 5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + w / 2 - 7, y - h / 2 + 12, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + w / 2 - 7, y - h / 2 + 19, 1.5, 0, Math.PI * 2);
  ctx.fill();
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

// ─── Device type base colors ───
const DEVICE_COLORS = {
  router:   { active: '#69f0ae', partial: '#3a8c64', inactive: '#2a4a38' },
  switch:   { active: '#ffa726', partial: '#9c6618', inactive: '#4e3a18' },
  firewall: { active: '#ef5350', partial: '#9c3533', inactive: '#4e2828' },
  server:   { active: '#7e57c2', partial: '#5a3e8c', inactive: '#2e2446' },
  pc:       { active: '#4fc3f7', partial: '#2e7a9c', inactive: '#1e3a4e' },
};

export function getDeviceBorderColor(dv) {
  const colors = DEVICE_COLORS[dv.type] || DEVICE_COLORS.pc;
  const anyUp = Object.values(dv.interfaces).some(i => i.status === 'up');
  const allUp = Object.values(dv.interfaces).every(i => i.status === 'up');
  if (allUp) return colors.active;
  if (anyUp) return colors.partial;
  return colors.inactive;
}
