// ─── Lesson: Routing Basics ───
// Router role, default gateway, routing table, packet journey (MAC rewrite).

// ─── Shared drawing helpers ───
import { t } from '../../i18n/I18n.js';

function drawRoundedRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function drawDevice(ctx, x, y, r, label, color, sub) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#1a2332';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold 10px sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 3);
  if (sub) {
    ctx.font = '8px Consolas, monospace';
    ctx.fillStyle = '#8899aa';
    ctx.fillText(sub, x, y + r + 12);
  }
}

function drawRouter(ctx, x, y, r, label, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#1a2332';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 4);
}

function drawLink(ctx, x1, y1, x2, y2, color) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ─── Step 1: Role of a Router ───
const step1_RouterRole = {
  get title() { return t('learn.routing.s0t'); },
  get content() { return t('learn.routing.s0c'); },
  animation(ctx, w, h, elapsed) {
    const cx = w / 2;
    const routerY = h * 0.36;
    const phase = Math.min(elapsed / 2500, 1);

    // Two networks
    const net1X = cx - w * 0.28;
    const net2X = cx + w * 0.28;
    const netY = routerY;
    const netR = Math.min(w * 0.2, h * 0.28);

    // Network 1 (blue)
    const n1Phase = easeInOut(Math.min(phase * 2, 1));
    ctx.globalAlpha = n1Phase;

    ctx.beginPath();
    ctx.arc(net1X, netY, netR, 0, Math.PI * 2);
    ctx.fillStyle = '#4fc3f70a';
    ctx.fill();
    ctx.strokeStyle = '#4fc3f744';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = 'bold 11px Consolas, monospace';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'center';
    ctx.fillText('192.168.1.0/24', net1X, netY - netR - 6);

    // PCs in network 1
    for (let i = 0; i < 3; i++) {
      const angle = Math.PI * 0.6 + (Math.PI * 0.8 / 2) * i;
      const px = net1X + Math.cos(angle) * netR * 0.6;
      const py = netY + Math.sin(angle) * netR * 0.6;
      drawDevice(ctx, px, py, 12, 'PC', '#4fc3f7');
    }

    // Network 2 (green)
    const n2Phase = easeInOut(Math.min(Math.max(phase * 2 - 0.3, 0), 1));
    ctx.globalAlpha = n2Phase;

    ctx.beginPath();
    ctx.arc(net2X, netY, netR, 0, Math.PI * 2);
    ctx.fillStyle = '#69f0ae0a';
    ctx.fill();
    ctx.strokeStyle = '#69f0ae44';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = 'bold 11px Consolas, monospace';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'center';
    ctx.fillText('10.0.0.0/24', net2X, netY - netR - 6);

    for (let i = 0; i < 3; i++) {
      const angle = Math.PI * 1.6 + (Math.PI * 0.8 / 2) * i;
      const px = net2X + Math.cos(angle) * netR * 0.6;
      const py = netY + Math.sin(angle) * netR * 0.6;
      drawDevice(ctx, px, py, 12, 'SV', '#69f0ae');
    }
    ctx.globalAlpha = 1;

    // Router in center
    const rPhase = easeInOut(Math.min(Math.max(phase * 2 - 0.6, 0), 1));
    ctx.globalAlpha = rPhase;

    drawRouter(ctx, cx, routerY, 20, 'R1', '#69f0ae');

    // Links
    drawLink(ctx, net1X + netR * 0.5, netY - netR * 0.2, cx - 22, routerY, '#4fc3f744');
    drawLink(ctx, cx + 22, routerY, net2X - netR * 0.5, netY - netR * 0.2, '#69f0ae44');

    // Interface labels
    ctx.font = '9px Consolas, monospace';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'right';
    ctx.fillText('.1', cx - 24, routerY - 8);
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'left';
    ctx.fillText('.1', cx + 24, routerY - 8);

    ctx.globalAlpha = 1;

    // Packet animation
    if (phase >= 1) {
      const pktCycle = 3000;
      const pktT = ((elapsed - 2500) % pktCycle) / pktCycle;
      const pktP = easeInOut(Math.min(pktT * 1.5, 1));

      const startPX = net1X + netR * 0.4;
      const endPX = net2X - netR * 0.4;
      const px = startPX + (endPX - startPX) * pktP;
      const py = routerY + Math.sin(pktP * Math.PI) * -20;

      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffa726';
      ctx.fill();
    }
  }
};

// ─── Step 2: Default Gateway ───
const step2_DefaultGateway = {
  get title() { return t('learn.routing.s1t'); },
  get content() { return t('learn.routing.s1c'); },
  animation(ctx, w, h, elapsed) {
    const cx = w / 2;
    const phase = Math.min(elapsed / 2000, 1);

    // PC
    const pcX = w * 0.18;
    const pcY = h * 0.5;
    drawDevice(ctx, pcX, pcY, 18, 'PC1', '#4fc3f7', '.10');

    // Router (gateway)
    const gwX = cx;
    const gwY = h * 0.35;
    drawRouter(ctx, gwX, gwY, 20, 'R1', '#69f0ae');
    ctx.font = '9px Consolas, monospace';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'center';
    ctx.fillText('.1 (Gateway)', gwX, gwY + 28);

    // Remote server
    const svX = w * 0.82;
    const svY = h * 0.35;
    drawDevice(ctx, svX, svY, 18, 'SV', '#ab47bc', '10.0.0.10');

    // Links
    drawLink(ctx, pcX + 18, pcY - 10, gwX - 22, gwY + 5, '#1e3a5c');
    drawLink(ctx, gwX + 22, gwY, svX - 20, svY, '#1e3a5c');

    // Decision flow
    const flowY = h * 0.72;
    const flowW = Math.min(w * 0.85, 500);
    const flowStartX = (w - flowW) / 2;
    const flowPhase = easeInOut(Math.min(Math.max(phase * 2 - 0.5, 0), 1));

    ctx.globalAlpha = flowPhase;

    // Step 1: Check destination
    const boxes = [
      { text: '\u5b9b\u5148IP\u78ba\u8a8d', sub: '10.0.0.10', color: '#4fc3f7', w: flowW * 0.28 },
      { text: '\u540c\u3058\u30b5\u30d6\u30cd\u30c3\u30c8\uff1f', sub: 'No (10.x \u2260 192.168.1.x)', color: '#ffa726', w: flowW * 0.34 },
      { text: 'Gateway\u3078\u9001\u4fe1', sub: '192.168.1.1', color: '#69f0ae', w: flowW * 0.28 },
    ];

    let bx = flowStartX;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const bAppear = easeInOut(Math.min(Math.max(flowPhase * 3 - i * 0.7, 0), 1));
      ctx.globalAlpha = bAppear;

      drawRoundedRect(ctx, bx, flowY, b.w, 44, 6, b.color + '11', b.color);

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = b.color;
      ctx.textAlign = 'center';
      ctx.fillText(b.text, bx + b.w / 2, flowY + 16);

      ctx.font = '10px Consolas, monospace';
      ctx.fillStyle = '#8899aa';
      ctx.fillText(b.sub, bx + b.w / 2, flowY + 34);

      // Arrow between boxes
      if (i < boxes.length - 1) {
        const arrowX = bx + b.w + 4;
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#556';
        ctx.textAlign = 'center';
        ctx.fillText('\u2192', arrowX + (flowW * 0.05) / 2, flowY + 22);
      }

      bx += b.w + flowW * 0.05;
    }
    ctx.globalAlpha = 1;

    // Packet animation
    if (phase >= 1) {
      const pktCycle = 3000;
      const pktT = ((elapsed - 2000) % pktCycle) / pktCycle;

      if (pktT < 0.4) {
        // PC → Router
        const p = easeInOut(pktT / 0.4);
        const px = pcX + (gwX - pcX) * p;
        const py = pcY + (gwY - pcY) * p;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffa726';
        ctx.fill();
      } else if (pktT < 0.8) {
        // Router → Server
        const p = easeInOut((pktT - 0.4) / 0.4);
        const px = gwX + (svX - gwX) * p;
        const py = gwY + (svY - gwY) * p;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffa726';
        ctx.fill();
      }
    }
  }
};

// ─── Step 3: Routing Table ───
const step3_RoutingTable = {
  get title() { return t('learn.routing.s2t'); },
  get content() { return t('learn.routing.s2c'); },
  animation(ctx, w, h, elapsed) {
    const phase = Math.min(elapsed / 2000, 1);

    // Router
    const rX = w * 0.14;
    const rY = h * 0.2;
    drawRouter(ctx, rX, rY, 20, 'R1', '#69f0ae');

    // Routing table
    const tableX = w * 0.3;
    const tableY = 10;
    const tableW = w * 0.65;
    const tableH = h * 0.88;

    drawRoundedRect(ctx, tableX, tableY, tableW, tableH, 6, '#0d1b2a', '#1e3a5c');

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'left';
    ctx.fillText('Routing Table (show ip route)', tableX + 12, tableY + 22);

    // Header
    const headerY = tableY + 36;
    const colX = [tableX + 12, tableX + tableW * 0.15, tableX + tableW * 0.52, tableX + tableW * 0.78];

    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'left';
    ctx.fillText('Type', colX[0], headerY);
    ctx.fillText('Network', colX[1], headerY);
    ctx.fillText('Next Hop', colX[2], headerY);
    ctx.fillText('Interface', colX[3], headerY);

    ctx.beginPath();
    ctx.moveTo(tableX + 8, headerY + 6);
    ctx.lineTo(tableX + tableW - 8, headerY + 6);
    ctx.strokeStyle = '#1e3a5c';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Routes
    const routes = [
      { type: 'C', net: '192.168.1.0/24', hop: 'directly connected', iface: 'Gi0/0', color: '#69f0ae' },
      { type: 'C', net: '10.0.0.0/24',    hop: 'directly connected', iface: 'Gi0/1', color: '#69f0ae' },
      { type: 'S', net: '172.16.0.0/16',  hop: '10.0.0.2',          iface: 'Gi0/1', color: '#4fc3f7' },
      { type: 'S*', net: '0.0.0.0/0',     hop: '203.0.113.1',       iface: 'Gi0/2', color: '#ffa726' },
    ];

    const rowH = Math.min(36, (tableH - 60) / routes.length);

    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      const appear = easeInOut(Math.min(Math.max(phase * 4 - i * 0.6, 0), 1));
      if (appear <= 0) continue;

      ctx.globalAlpha = appear;
      const ry = headerY + 18 + i * rowH;

      // Type badge
      drawRoundedRect(ctx, colX[0], ry - 8, 18, 16, 3, r.color + '22', r.color);
      ctx.font = 'bold 10px Consolas, monospace';
      ctx.fillStyle = r.color;
      ctx.textAlign = 'center';
      ctx.fillText(r.type, colX[0] + 9, ry + 4);

      // Network
      ctx.font = '11px Consolas, monospace';
      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'left';
      ctx.fillText(r.net, colX[1], ry + 4);

      // Next hop
      ctx.font = '10px Consolas, monospace';
      ctx.fillStyle = '#8899aa';
      ctx.fillText(r.hop, colX[2], ry + 4);

      // Interface
      ctx.fillStyle = r.color;
      ctx.fillText(r.iface, colX[3], ry + 4);
    }
    ctx.globalAlpha = 1;

    // Lookup animation
    if (phase >= 1) {
      const lookupCycle = 5000;
      const lt = ((elapsed - 2000) % lookupCycle) / lookupCycle;
      const targetIdx = Math.floor(lt * routes.length) % routes.length;

      const ry = headerY + 18 + targetIdx * rowH;
      drawRoundedRect(ctx, tableX + 6, ry - 12, tableW - 12, rowH - 4, 3, '#ffffff08', '#ffa72666');

      // Arrow from router
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#ffa726';
      ctx.textAlign = 'center';
      ctx.fillText('\u2192 lookup', rX, rY + 34);
    }
  }
};

// ─── Step 4: Packet Journey (MAC rewrite) ───
const step4_PacketJourney = {
  get title() { return t('learn.routing.s3t'); },
  get content() { return t('learn.routing.s3c'); },
  animation(ctx, w, h, elapsed) {
    // Network: PC1 → SW1 → R1 → SW2 → SV1
    const nodes = [
      { label: 'PC1', x: w * 0.08, y: h * 0.35, color: '#4fc3f7', mac: 'AA:11' },
      { label: 'SW1', x: w * 0.24, y: h * 0.35, color: '#ffa726', mac: '' },
      { label: 'R1',  x: w * 0.44, y: h * 0.35, color: '#69f0ae', mac: '' },
      { label: 'SW2', x: w * 0.64, y: h * 0.35, color: '#ffa726', mac: '' },
      { label: 'SV1', x: w * 0.84, y: h * 0.35, color: '#ab47bc', mac: 'DD:44' },
    ];

    // Interfaces
    const r1Left = 'BB:22';
    const r1Right = 'CC:33';

    // Draw links
    for (let i = 0; i < nodes.length - 1; i++) {
      drawLink(ctx, nodes[i].x + 16, nodes[i].y, nodes[i + 1].x - 16, nodes[i + 1].y, '#1e3a5c');
    }

    // Draw devices
    for (const n of nodes) {
      if (n.label.startsWith('SW')) {
        drawRoundedRect(ctx, n.x - 16, n.y - 10, 32, 20, 4, '#1a2332', n.color);
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = n.color;
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + 3);
      } else if (n.label === 'R1') {
        drawRouter(ctx, n.x, n.y, 16, n.label, n.color);
      } else {
        drawDevice(ctx, n.x, n.y, 16, n.label, n.color);
      }
    }

    // Hop segments and header states
    const hops = [
      { fromIdx: 0, toIdx: 2, srcMAC: 'AA:11', dstMAC: 'BB:22', label: 'Hop 1: PC1 \u2192 R1' },
      { fromIdx: 2, toIdx: 4, srcMAC: 'CC:33', dstMAC: 'DD:44', label: 'Hop 2: R1 \u2192 SV1' },
    ];

    // Packet header display area
    const headerY = h * 0.58;

    // L3 header (constant)
    const l3BoxW = Math.min(280, w * 0.45);
    const l3X = (w - l3BoxW) / 2;
    drawRoundedRect(ctx, l3X, headerY, l3BoxW, 36, 6, '#4fc3f711', '#4fc3f7');

    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'center';
    ctx.fillText('L3 (IP) \u2014 \u5909\u308f\u3089\u306a\u3044', l3X + l3BoxW / 2, headerY + 14);

    ctx.font = '10px Consolas, monospace';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText('Src: 192.168.1.10  Dst: 10.0.0.10', l3X + l3BoxW / 2, headerY + 30);

    // Animation: cycle through hops
    const hopCycle = 4000;
    const totalT = elapsed % (hopCycle * 2);
    const hopIdx = totalT < hopCycle ? 0 : 1;
    const hopT = (totalT % hopCycle) / hopCycle;
    const hop = hops[hopIdx];
    const pktProgress = easeInOut(Math.min(hopT * 1.5, 1));

    // L2 header (changes per hop)
    const l2Y = headerY + 46;
    drawRoundedRect(ctx, l3X, l2Y, l3BoxW, 36, 6, '#ffa72611', '#ffa726');

    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'center';
    ctx.fillText('L2 (MAC) \u2014 \u6bce\u30db\u30c3\u30d7\u3067\u66f8\u304d\u63db\u3048', l3X + l3BoxW / 2, l2Y + 14);

    ctx.font = '10px Consolas, monospace';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(`Src: ${hop.srcMAC}  Dst: ${hop.dstMAC}`, l3X + l3BoxW / 2, l2Y + 30);

    // Hop label
    drawRoundedRect(ctx, l3X, l2Y + 44, l3BoxW, 22, 4, '#1a2332', '#556');
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'center';
    ctx.fillText(hop.label, l3X + l3BoxW / 2, l2Y + 58);

    // Packet dot moving along hop
    const fromN = nodes[hop.fromIdx];
    const toN = nodes[hop.toIdx];
    const px = fromN.x + (toN.x - fromN.x) * pktProgress;
    const py = fromN.y + Math.sin(pktProgress * Math.PI) * -16;

    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffa726';
    ctx.fill();

    // MAC labels above devices
    const macLabelY = h * 0.18;
    ctx.font = '9px Consolas, monospace';
    ctx.textAlign = 'center';

    // PC1
    ctx.fillStyle = nodes[0].color;
    ctx.fillText('Eth0', nodes[0].x, macLabelY);
    ctx.fillStyle = '#8899aa';
    ctx.fillText(nodes[0].mac, nodes[0].x, macLabelY + 12);

    // R1 Gi0/0
    ctx.fillStyle = '#69f0ae';
    ctx.fillText('Gi0/0', nodes[2].x - 24, macLabelY);
    ctx.fillStyle = '#8899aa';
    ctx.fillText(r1Left, nodes[2].x - 24, macLabelY + 12);

    // R1 Gi0/1
    ctx.fillStyle = '#69f0ae';
    ctx.fillText('Gi0/1', nodes[2].x + 24, macLabelY);
    ctx.fillStyle = '#8899aa';
    ctx.fillText(r1Right, nodes[2].x + 24, macLabelY + 12);

    // SV1
    ctx.fillStyle = nodes[4].color;
    ctx.fillText('Eth0', nodes[4].x, macLabelY);
    ctx.fillStyle = '#8899aa';
    ctx.fillText(nodes[4].mac, nodes[4].x, macLabelY + 12);
  }
};

// ─── Step 5: What changes per hop ───
const step5_WhatChanges = {
  get title() { return t('learn.routing.s4t'); },
  get content() { return t('learn.routing.s4c'); },
  animation(ctx, w, h, elapsed) {
    const cx = w / 2;

    // Two hops visualization
    const hopLabels = ['Hop 1', 'Hop 2'];
    const hopW = Math.min((w - 60) / 2, 260);
    const hopGap = 20;
    const startX = cx - (hopW * 2 + hopGap) / 2;
    const headerY = h * 0.08;

    // Header rows
    const rows = [
      { label: 'L2 Src MAC', values: ['AA:11', 'CC:33'], color: '#ffa726', changed: true },
      { label: 'L2 Dst MAC', values: ['BB:22', 'DD:44'], color: '#ffa726', changed: true },
      { label: 'L3 Src IP',  values: ['192.168.1.10', '192.168.1.10'], color: '#4fc3f7', changed: false },
      { label: 'L3 Dst IP',  values: ['10.0.0.10', '10.0.0.10'], color: '#4fc3f7', changed: false },
      { label: 'TTL',        values: ['128', '127'], color: '#ef5350', changed: true },
    ];

    const rowH = Math.min(34, (h * 0.75) / (rows.length + 1.5));
    const phase = Math.min(elapsed / 2500, 1);

    // Hop headers
    for (let hi = 0; hi < 2; hi++) {
      const hx = startX + hi * (hopW + hopGap);
      const appear = easeInOut(Math.min(Math.max(phase * 3 - hi * 0.5, 0), 1));
      ctx.globalAlpha = appear;

      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'center';
      ctx.fillText(hopLabels[hi], hx + hopW / 2, headerY + 14);

      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#556';
      ctx.fillText(hi === 0 ? 'PC1 \u2192 R1' : 'R1 \u2192 SV1', hx + hopW / 2, headerY + 28);
    }
    ctx.globalAlpha = 1;

    // Label column
    const labelX = startX - 8;
    const dataStartY = headerY + 38;

    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      const appear = easeInOut(Math.min(Math.max(phase * 4 - ri * 0.4, 0), 1));
      if (appear <= 0) continue;

      ctx.globalAlpha = appear;
      const ry = dataStartY + ri * rowH;

      // Row label
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = row.color;
      ctx.textAlign = 'right';
      ctx.fillText(row.label, labelX, ry + rowH / 2 + 4);

      // Values in each hop column
      for (let hi = 0; hi < 2; hi++) {
        const hx = startX + hi * (hopW + hopGap);
        const val = row.values[hi];
        const isChanged = row.changed && hi === 1;

        drawRoundedRect(ctx, hx, ry, hopW, rowH - 4, 4,
          isChanged ? row.color + '1a' : '#1a2332',
          isChanged ? row.color : '#1e3a5c');

        ctx.font = '11px Consolas, monospace';
        ctx.fillStyle = isChanged ? row.color : '#e0e0e0';
        ctx.textAlign = 'center';
        ctx.fillText(val, hx + hopW / 2, ry + rowH / 2 + 3);
      }

      // Changed indicator
      if (row.changed) {
        const arrowX = startX + hopW + hopGap / 2;
        ctx.font = '12px sans-serif';
        ctx.fillStyle = row.color;
        ctx.textAlign = 'center';
        ctx.fillText('\u2192', arrowX, ry + rowH / 2 + 4);
      } else {
        const arrowX = startX + hopW + hopGap / 2;
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#69f0ae';
        ctx.textAlign = 'center';
        ctx.fillText('=', arrowX, ry + rowH / 2 + 4);
      }
    }
    ctx.globalAlpha = 1;

    // Legend at bottom
    if (phase >= 1) {
      const lp = easeInOut(Math.min((elapsed - 2500) / 600, 1));
      ctx.globalAlpha = lp;

      const legY = dataStartY + rows.length * rowH + 12;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';

      ctx.fillStyle = '#ffa726';
      ctx.fillText('\u25a0 MAC / TTL: \u30db\u30c3\u30d7\u3054\u3068\u306b\u5909\u5316', cx - 120, legY);
      ctx.fillStyle = '#4fc3f7';
      ctx.fillText('\u25a0 IP: \u7d42\u70b9\u9593\u3067\u4e0d\u5909', cx + 120, legY);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 6: Summary ───
const step6_Summary = {
  get title() { return t('learn.routing.s5t'); },
  get content() { return t('learn.routing.s5c'); },
  animation(ctx, w, h, elapsed) {
    const items = [
      { text: 'Router',       sub: '\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u9593\u8ee2\u9001', color: '#69f0ae' },
      { text: 'Gateway',      sub: '\u30b5\u30d6\u30cd\u30c3\u30c8\u5916\u3078\u306e\u51fa\u53e3', color: '#4fc3f7' },
      { text: 'Routing Table', sub: 'Net \u2192 Next Hop', color: '#ffa726' },
      { text: 'IP Header',    sub: '\u7d42\u70b9\u9593\u3067\u4e0d\u5909', color: '#ab47bc' },
      { text: 'MAC Header',   sub: '\u6bce\u30db\u30c3\u30d7\u66f8\u304d\u63db\u3048', color: '#ef5350' },
    ];

    const cx = w / 2;
    const cy = h * 0.45;
    const radius = Math.min(h * 0.32, w * 0.22);
    const rot = elapsed / 10000 * Math.PI * 2;

    for (let i = 0; i < items.length; i++) {
      const angle = rot + (Math.PI * 2 / items.length) * i - Math.PI / 2;
      const appear = easeInOut(Math.min(elapsed / 800 - i * 0.3, 1));
      if (appear <= 0) continue;

      const ix = cx + Math.cos(angle) * radius;
      const iy = cy + Math.sin(angle) * radius;

      ctx.globalAlpha = appear;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ix, iy);
      ctx.strokeStyle = items[i].color + '44';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ix, iy, 8, 0, Math.PI * 2);
      ctx.fillStyle = items[i].color;
      ctx.fill();

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = items[i].color;
      ctx.textAlign = 'center';
      const off = iy < cy ? -22 : 22;
      ctx.fillText(items[i].text, ix, iy + off);

      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.fillText(items[i].sub, ix, iy + off + 14);
    }

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#1a2332';
    ctx.fill();
    ctx.strokeStyle = '#69f0ae';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'center';
    ctx.fillText('L3', cx, cy + 4);
  }
};

// ─── Export lesson ───
export const lessonRouting = {
  id: 'lesson-routing',
  get title() { return t('learn.routing.title'); },
  get description() { return t('learn.routing.desc'); },
  category: 'L3 Routing',
  steps: [
    step1_RouterRole,
    step2_DefaultGateway,
    step3_RoutingTable,
    step4_PacketJourney,
    step5_WhatChanges,
    step6_Summary,
  ],
};
