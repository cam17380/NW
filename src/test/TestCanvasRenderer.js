// ─── Mini topology renderer for test mode previews ───
// Lightweight standalone canvas renderer that draws test topology diagrams.
// Reuses DeviceRenderer and LinkRenderer drawing functions.

import { drawRouter, drawSwitch, drawPC, drawFirewall, drawServer } from '../rendering/DeviceRenderer.js';
import { drawLink } from '../rendering/LinkRenderer.js';

const DRAW_FN = { router: drawRouter, switch: drawSwitch, pc: drawPC, firewall: drawFirewall, server: drawServer };

/**
 * Render a test topology onto a canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} devices — { id: { type, x, y, interfaces, ... } }
 */
export function renderTestTopology(canvas, devices) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  // Set buffer size for sharp rendering, but keep CSS at 100% so canvas
  // continues to fill its container after resize
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const w = rect.width;
  const h = rect.height;

  // Compute bounding box of all devices
  const ids = Object.keys(devices);
  if (ids.length === 0) return;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const id of ids) {
    const d = devices[id];
    if (d.x < minX) minX = d.x;
    if (d.x > maxX) maxX = d.x;
    if (d.y < minY) minY = d.y;
    if (d.y > maxY) maxY = d.y;
  }

  // Add padding
  const pad = 60;
  const bw = (maxX - minX) || 1;
  const bh = (maxY - minY) || 1;
  const scale = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 2.0);
  const offX = (w - bw * scale) / 2 - minX * scale;
  const offY = (h - bh * scale) / 2 - minY * scale;

  const sx = (x) => x * scale + offX;
  const sy = (y) => y * scale + offY;

  // Background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, w, h);

  // Collect links from device interfaces
  const links = [];
  const seen = new Set();
  for (const [id, dv] of Object.entries(devices)) {
    for (const [ifName, iface] of Object.entries(dv.interfaces || {})) {
      if (!iface.connected) continue;
      const peerId = iface.connected.device;
      const peerIf = iface.connected.iface;
      if (!devices[peerId]) continue;
      const key = [id, peerId].sort().join(':') + ':' + [ifName, peerIf].sort().join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ from: id, fromIf: ifName, to: peerId, toIf: peerIf });
    }
  }

  // Draw links
  for (const link of links) {
    drawLink(ctx, link, devices, sx, sy, 0, 0);
  }

  // Draw devices
  for (const [id, dv] of Object.entries(devices)) {
    const fn = DRAW_FN[dv.type] || drawPC;
    fn(ctx, sx(dv.x), sy(dv.y), dv, false);

    // Device label
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8899aa';
    const labelY = dv.type === 'firewall' ? sy(dv.y) + 28 : sy(dv.y) + 24;
    ctx.fillText(dv.hostname || id, sx(dv.x), labelY);

    // IP label (first interface with IP)
    const firstIf = Object.values(dv.interfaces || {}).find(i => i.ip);
    if (firstIf) {
      ctx.font = '9px monospace';
      ctx.fillStyle = '#556677';
      ctx.fillText(firstIf.ip, sx(dv.x), labelY + 12);
    }
  }
}
