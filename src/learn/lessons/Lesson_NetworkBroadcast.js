// ─── Lesson: Network Address & Broadcast Address ───
// Why 2^n - 2: visualizing the two reserved addresses in every subnet.

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

function toBinary8(n) {
  return n.toString(2).padStart(8, '0');
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ─── Step 1: Network Address ───
const step1_NetworkAddress = {
  get title() { return t('learn.network-broadcast.s0t'); },
  get content() { return t('learn.network-broadcast.s0c'); },
  animation(ctx, w, h, elapsed) {
    // IP: 192.168.1.130 /25, Mask: 255.255.255.128 → Network: 192.168.1.128
    const ip   = [192, 168, 1, 130];
    const mask = [255, 255, 255, 128];
    const prefix = 25;
    const ipBits   = ip.map(o => toBinary8(o)).join('');
    const maskBits = mask.map(o => toBinary8(o)).join('');

    const bitSize = Math.min(16, (w - 80) / 32);
    const bitGap = 1;
    const totalW = 32 * (bitSize + bitGap) - bitGap;
    const startX = (w - totalW) / 2;
    const rowGap = bitSize + 16;
    const phase = Math.min(elapsed / 3000, 1);

    // ── Row 1: IP ──
    const ipY = h * 0.08;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'right';
    ctx.fillText(t('learn.network-broadcast.cv_ip'), startX - 8, ipY + bitSize * 0.7);
    ctx.font = '11px Consolas, monospace';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'left';
    ctx.fillText(ip.join('.') + '/25', startX + totalW + 8, ipY + bitSize * 0.7);

    for (let i = 0; i < 32; i++) {
      const bx = startX + i * (bitSize + bitGap);
      const isNet = i < prefix;
      drawRoundedRect(ctx, bx, ipY, bitSize, bitSize, 2,
        isNet ? '#4fc3f733' : '#1a2332', isNet ? '#4fc3f7' : '#ffa72688');
      ctx.font = `${Math.max(7, bitSize - 5)}px Consolas, monospace`;
      ctx.fillStyle = isNet ? '#4fc3f7' : '#ffa726';
      ctx.textAlign = 'center';
      ctx.fillText(ipBits[i], bx + bitSize / 2, ipY + bitSize * 0.75);
    }

    // ── Row 2: Mask (appears second) ──
    const maskY = ipY + rowGap;
    const maskPhase = Math.min(Math.max(phase * 3 - 0.4, 0) / 0.8, 1);

    ctx.globalAlpha = maskPhase;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ab47bc';
    ctx.textAlign = 'right';
    ctx.fillText(t('learn.network-broadcast.cv_mask'), startX - 8, maskY + bitSize * 0.7);
    ctx.font = '11px Consolas, monospace';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'left';
    ctx.fillText(mask.join('.'), startX + totalW + 8, maskY + bitSize * 0.7);

    for (let i = 0; i < 32; i++) {
      const bx = startX + i * (bitSize + bitGap);
      const isOne = maskBits[i] === '1';
      drawRoundedRect(ctx, bx, maskY, bitSize, bitSize, 2,
        isOne ? '#ab47bc' : '#1a2332', isOne ? '#ab47bc' : '#ef535088');
      ctx.font = `${Math.max(7, bitSize - 5)}px Consolas, monospace`;
      ctx.fillStyle = isOne ? '#000' : '#ef5350';
      ctx.textAlign = 'center';
      ctx.fillText(maskBits[i], bx + bitSize / 2, maskY + bitSize * 0.75);
    }
    ctx.globalAlpha = 1;

    // ── Row 3: Net (host bits → 0, appears third) ──
    const netY = maskY + rowGap;
    const netPhase = Math.min(Math.max(phase * 3 - 1.2, 0) / 0.8, 1);
    const animPhase = easeInOut(netPhase);

    ctx.globalAlpha = netPhase;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'right';
    ctx.fillText(t('learn.network-broadcast.cv_net'), startX - 8, netY + bitSize * 0.7);

    for (let i = 0; i < 32; i++) {
      const bx = startX + i * (bitSize + bitGap);
      const isHost = i >= prefix;
      let fill, border, textColor, bit;

      if (isHost) {
        fill = animPhase > 0 ? '#1a2332' : '#ffa72622';
        border = animPhase > 0 ? '#69f0ae' : '#ffa726';
        textColor = animPhase > 0 ? '#69f0ae' : '#ffa726';
        bit = animPhase > 0 ? '0' : ipBits[i];
      } else {
        fill = '#4fc3f733'; border = '#4fc3f7'; textColor = '#4fc3f7'; bit = ipBits[i];
      }

      drawRoundedRect(ctx, bx, netY, bitSize, bitSize, 2, fill, border);
      ctx.font = `${Math.max(7, bitSize - 5)}px Consolas, monospace`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(bit, bx + bitSize / 2, netY + bitSize * 0.75);
    }
    ctx.globalAlpha = 1;

    // Arrow annotation: "host bits → all 0"
    if (animPhase > 0) {
      const arrowY = netY + bitSize + 10;
      const hostStartX = startX + prefix * (bitSize + bitGap);
      const hostEndX = startX + 32 * (bitSize + bitGap) - bitGap;

      ctx.globalAlpha = animPhase;
      ctx.beginPath();
      ctx.moveTo(hostStartX, arrowY);
      ctx.lineTo(hostStartX, arrowY + 6);
      ctx.lineTo(hostEndX, arrowY + 6);
      ctx.lineTo(hostEndX, arrowY);
      ctx.strokeStyle = '#69f0ae';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.network-broadcast.cv_hostBitsZero'), (hostStartX + hostEndX) / 2, arrowY + 20);
      ctx.globalAlpha = 1;
    }

    // Result box
    if (phase >= 1) {
      const resPhase = easeInOut(Math.min((elapsed - 3000) / 600, 1));
      ctx.globalAlpha = resPhase;

      const resY = netY + bitSize + 48;
      drawRoundedRect(ctx, w / 2 - 180, resY, 360, 48, 8, '#0d2240', '#69f0ae');

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.network-broadcast.cv_networkAddress'), w / 2, resY + 17);

      ctx.font = 'bold 18px Consolas, monospace';
      ctx.fillStyle = '#69f0ae';
      ctx.fillText('192.168.1.128', w / 2, resY + 38);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 2: Broadcast Address ───
const step2_BroadcastAddress = {
  get title() { return t('learn.network-broadcast.s1t'); },
  get content() { return t('learn.network-broadcast.s1c'); },
  animation(ctx, w, h, elapsed) {
    // IP: 192.168.1.130 /25, Mask: 255.255.255.128 → Broadcast: 192.168.1.255
    const ip   = [192, 168, 1, 130];
    const mask = [255, 255, 255, 128];
    const prefix = 25;
    const ipBits   = ip.map(o => toBinary8(o)).join('');
    const maskBits = mask.map(o => toBinary8(o)).join('');

    const bitSize = Math.min(16, (w - 80) / 32);
    const bitGap = 1;
    const totalW = 32 * (bitSize + bitGap) - bitGap;
    const startX = (w - totalW) / 2;
    const rowGap = bitSize + 16;
    const phase = Math.min(elapsed / 3000, 1);

    // ── Row 1: IP ──
    const ipY = h * 0.08;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'right';
    ctx.fillText(t('learn.network-broadcast.cv_ip'), startX - 8, ipY + bitSize * 0.7);
    ctx.font = '11px Consolas, monospace';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'left';
    ctx.fillText(ip.join('.') + '/25', startX + totalW + 8, ipY + bitSize * 0.7);

    for (let i = 0; i < 32; i++) {
      const bx = startX + i * (bitSize + bitGap);
      const isNet = i < prefix;
      drawRoundedRect(ctx, bx, ipY, bitSize, bitSize, 2,
        isNet ? '#4fc3f733' : '#1a2332', isNet ? '#4fc3f7' : '#ffa72688');
      ctx.font = `${Math.max(7, bitSize - 5)}px Consolas, monospace`;
      ctx.fillStyle = isNet ? '#4fc3f7' : '#ffa726';
      ctx.textAlign = 'center';
      ctx.fillText(ipBits[i], bx + bitSize / 2, ipY + bitSize * 0.75);
    }

    // ── Row 2: Mask (appears second) ──
    const maskY = ipY + rowGap;
    const maskPhase = Math.min(Math.max(phase * 3 - 0.4, 0) / 0.8, 1);

    ctx.globalAlpha = maskPhase;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ab47bc';
    ctx.textAlign = 'right';
    ctx.fillText(t('learn.network-broadcast.cv_mask'), startX - 8, maskY + bitSize * 0.7);
    ctx.font = '11px Consolas, monospace';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'left';
    ctx.fillText(mask.join('.'), startX + totalW + 8, maskY + bitSize * 0.7);

    for (let i = 0; i < 32; i++) {
      const bx = startX + i * (bitSize + bitGap);
      const isOne = maskBits[i] === '1';
      drawRoundedRect(ctx, bx, maskY, bitSize, bitSize, 2,
        isOne ? '#ab47bc' : '#1a2332', isOne ? '#ab47bc' : '#ef535088');
      ctx.font = `${Math.max(7, bitSize - 5)}px Consolas, monospace`;
      ctx.fillStyle = isOne ? '#000' : '#ef5350';
      ctx.textAlign = 'center';
      ctx.fillText(maskBits[i], bx + bitSize / 2, maskY + bitSize * 0.75);
    }
    ctx.globalAlpha = 1;

    // ── Row 3: Bcast (host bits → 1, appears third) ──
    const bcastY = maskY + rowGap;
    const bcastPhase = Math.min(Math.max(phase * 3 - 1.2, 0) / 0.8, 1);
    const animPhase = easeInOut(bcastPhase);

    ctx.globalAlpha = bcastPhase;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'right';
    ctx.fillText(t('learn.network-broadcast.cv_bcast'), startX - 8, bcastY + bitSize * 0.7);

    for (let i = 0; i < 32; i++) {
      const bx = startX + i * (bitSize + bitGap);
      const isHost = i >= prefix;
      let fill, border, textColor, bit;

      if (isHost) {
        fill = animPhase > 0 ? '#ffa726' : '#1a2332';
        border = '#ffa726';
        textColor = animPhase > 0 ? '#000' : '#ffa726';
        bit = animPhase > 0 ? '1' : ipBits[i];
      } else {
        fill = '#4fc3f733'; border = '#4fc3f7'; textColor = '#4fc3f7'; bit = ipBits[i];
      }

      drawRoundedRect(ctx, bx, bcastY, bitSize, bitSize, 2, fill, border);
      ctx.font = `${Math.max(7, bitSize - 5)}px Consolas, monospace`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(bit, bx + bitSize / 2, bcastY + bitSize * 0.75);
    }
    ctx.globalAlpha = 1;

    // Arrow annotation: "host bits → all 1"
    if (animPhase > 0) {
      const arrowY = bcastY + bitSize + 10;
      const hostStartX = startX + prefix * (bitSize + bitGap);
      const hostEndX = startX + 32 * (bitSize + bitGap) - bitGap;

      ctx.globalAlpha = animPhase;
      ctx.beginPath();
      ctx.moveTo(hostStartX, arrowY);
      ctx.lineTo(hostStartX, arrowY + 6);
      ctx.lineTo(hostEndX, arrowY + 6);
      ctx.lineTo(hostEndX, arrowY);
      ctx.strokeStyle = '#ffa726';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffa726';
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.network-broadcast.cv_hostBitsOne'), (hostStartX + hostEndX) / 2, arrowY + 20);
      ctx.globalAlpha = 1;
    }

    // Result box
    if (phase >= 1) {
      const resPhase = easeInOut(Math.min((elapsed - 3000) / 600, 1));
      ctx.globalAlpha = resPhase;

      const resY = bcastY + bitSize + 48;
      drawRoundedRect(ctx, w / 2 - 180, resY, 360, 48, 8, '#2a1a08', '#ffa726');

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.network-broadcast.cv_broadcastAddress'), w / 2, resY + 17);

      ctx.font = 'bold 18px Consolas, monospace';
      ctx.fillStyle = '#ffa726';
      ctx.fillText('192.168.1.255', w / 2, resY + 38);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 3: Usable Address Range ───
const step3_UsableRange = {
  get title() { return t('learn.network-broadcast.s2t'); },
  get content() { return t('learn.network-broadcast.s2c'); },
  animation(ctx, w, h, elapsed) {
    // 192.168.1.128/25 → .128(net) .129~.254(usable) .255(bcast)
    const netAddr = 128;
    const bcastAddr = 255;
    const firstUsable = 129;
    const lastUsable = 254;
    const totalAddrs = bcastAddr - netAddr + 1; // 128

    const barX = 40;
    const barW = w - 80;
    const barH = 40;
    const barY = h * 0.15;
    const phase = Math.min(elapsed / 3000, 1);

    // Full subnet bar background
    drawRoundedRect(ctx, barX, barY, barW, barH, 6, '#1a2332', '#334');

    // Network address block (first)
    const netW = (1 / totalAddrs) * barW;
    const netPhase = easeInOut(Math.min(phase * 3, 1));
    ctx.globalAlpha = netPhase;
    drawRoundedRect(ctx, barX, barY, Math.max(netW, 6), barH, 6, '#66666644', '#888');

    // Broadcast address block (last)
    const bcastX = barX + barW - Math.max(netW, 6);
    drawRoundedRect(ctx, bcastX, barY, Math.max(netW, 6), barH, 6, '#ffa72633', '#ffa726');

    // Usable range (middle)
    const usablePhase = easeInOut(Math.min(Math.max(phase * 3 - 0.8, 0), 1));
    ctx.globalAlpha = usablePhase;
    const usableX = barX + netW;
    const usableW = barW - netW * 2;
    drawRoundedRect(ctx, usableX, barY, usableW, barH, 0, '#69f0ae22', '#69f0ae');
    ctx.globalAlpha = 1;

    // Labels below the bar
    const labelY = barY + barH + 18;

    // Network label
    ctx.globalAlpha = netPhase;
    ctx.font = 'bold 11px Consolas, monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'left';
    ctx.fillText('.128', barX, labelY);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(t('learn.network-broadcast.cv_network'), barX, labelY + 14);

    // Broadcast label
    ctx.font = 'bold 11px Consolas, monospace';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'right';
    ctx.fillText('.255', barX + barW, labelY);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#996633';
    ctx.fillText(t('learn.network-broadcast.cv_broadcast'), barX + barW, labelY + 14);

    // Usable range label
    ctx.globalAlpha = usablePhase;
    ctx.font = 'bold 12px Consolas, monospace';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'center';
    ctx.fillText('.129 \u2013 .254', barX + barW / 2, labelY);
    ctx.font = '11px sans-serif';
    ctx.fillText(t('learn.network-broadcast.cv_usableHosts', { n: 126 }), barX + barW / 2, labelY + 16);
    ctx.globalAlpha = 1;

    // Detail cards
    const cardY = labelY + 40;
    const cardW = Math.min(200, (w - 60) / 3);
    const cardH = 64;
    const cardGap = 12;
    const cardsTotal = cardW * 3 + cardGap * 2;
    const cardStartX = (w - cardsTotal) / 2;

    const cards = [
      { addr: '.128',       label: t('learn.network-broadcast.cv_network'),   sub: t('learn.network-broadcast.cv_hostPartAllZero'), color: '#888',    bg: '#66666622' },
      { addr: '.129 \u2013 .254', label: t('learn.network-broadcast.cv_usableLabel'),    sub: t('learn.network-broadcast.cv_usableSub', { n: 126 }),       color: '#69f0ae', bg: '#69f0ae11' },
      { addr: '.255',       label: t('learn.network-broadcast.cv_broadcast'), sub: t('learn.network-broadcast.cv_hostPartAllOne'), color: '#ffa726', bg: '#ffa72611' },
    ];

    for (let i = 0; i < 3; i++) {
      const c = cards[i];
      const appear = easeInOut(Math.min(Math.max(phase * 4 - 1.5 - i * 0.4, 0), 1));
      if (appear <= 0) continue;

      ctx.globalAlpha = appear;
      const cx = cardStartX + i * (cardW + cardGap);

      drawRoundedRect(ctx, cx, cardY, cardW, cardH, 6, c.bg, c.color);

      ctx.font = 'bold 15px Consolas, monospace';
      ctx.fillStyle = c.color;
      ctx.textAlign = 'center';
      ctx.fillText(c.addr, cx + cardW / 2, cardY + 22);

      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(c.label, cx + cardW / 2, cardY + 40);

      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.fillText(c.sub, cx + cardW / 2, cardY + 55);
    }
    ctx.globalAlpha = 1;

    // Formula at bottom
    if (phase >= 1) {
      const fp = easeInOut(Math.min((elapsed - 3000) / 600, 1));
      ctx.globalAlpha = fp;

      const fY = cardY + cardH + 28;
      drawRoundedRect(ctx, w / 2 - 160, fY, 320, 36, 6, '#0d2240', '#4fc3f7');
      ctx.font = 'bold 14px Consolas, monospace';
      ctx.fillStyle = '#4fc3f7';
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.network-broadcast.cv_hostsFormula'), w / 2, fY + 23);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 4: Unicast vs Broadcast ───
const step4_UnicastBroadcast = {
  get title() { return t('learn.network-broadcast.s3t'); },
  get content() { return t('learn.network-broadcast.s3c'); },
  animation(ctx, w, h, elapsed) {
    const halfW = w / 2;
    const senderY = h * 0.18;
    const receiverBaseY = h * 0.50;

    // ─── Left: Unicast ───
    const uniX = halfW * 0.5;
    const receivers = 4;
    const receiverGap = Math.min(50, (halfW - 40) / receivers);
    const receiversStartX = uniX - (receivers - 1) * receiverGap / 2;

    // Title
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'center';
    ctx.fillText(t('learn.network-broadcast.cv_unicast'), uniX, 20);

    // Sender
    ctx.beginPath();
    ctx.arc(uniX, senderY, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#1a2332';
    ctx.fill();
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'center';
    ctx.fillText(t('learn.network-broadcast.cv_src'), uniX, senderY + 4);

    // Receivers
    const targetIdx = 1; // second receiver is the target
    for (let i = 0; i < receivers; i++) {
      const rx = receiversStartX + i * receiverGap;
      const ry = receiverBaseY;
      const isTarget = i === targetIdx;

      ctx.beginPath();
      ctx.arc(rx, ry, 14, 0, Math.PI * 2);
      ctx.fillStyle = isTarget ? '#0d3830' : '#1a2332';
      ctx.fill();
      ctx.strokeStyle = isTarget ? '#69f0ae' : '#334';
      ctx.lineWidth = isTarget ? 2 : 1;
      ctx.stroke();

      ctx.font = '9px Consolas, monospace';
      ctx.fillStyle = isTarget ? '#69f0ae' : '#556';
      ctx.textAlign = 'center';
      ctx.fillText(`.${129 + i}`, rx, ry + 4);
    }

    // Unicast packet animation
    const uniCycle = 3000;
    const uniT = (elapsed % uniCycle) / uniCycle;
    const targetRx = receiversStartX + targetIdx * receiverGap;
    if (uniT < 0.6) {
      const p = easeInOut(uniT / 0.6);
      const px = uniX + (targetRx - uniX) * p;
      const py = senderY + (receiverBaseY - senderY) * p;

      // Trail line
      ctx.beginPath();
      ctx.moveTo(uniX, senderY + 16);
      ctx.lineTo(px, py);
      ctx.strokeStyle = '#4fc3f744';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Packet
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#4fc3f7';
      ctx.fill();
    }

    // Divider
    ctx.beginPath();
    ctx.moveTo(halfW, 10);
    ctx.lineTo(halfW, h - 10);
    ctx.strokeStyle = '#1e2a3a';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ─── Right: Broadcast ───
    const bcastX = halfW + halfW * 0.5;
    const bRecvStartX = bcastX - (receivers - 1) * receiverGap / 2;

    // Title
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'center';
    ctx.fillText(t('learn.network-broadcast.cv_broadcast'), bcastX, 20);

    // Sender
    ctx.beginPath();
    ctx.arc(bcastX, senderY, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#1a2332';
    ctx.fill();
    ctx.strokeStyle = '#ffa726';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'center';
    ctx.fillText(t('learn.network-broadcast.cv_src'), bcastX, senderY + 4);

    // Receivers (all highlighted)
    for (let i = 0; i < receivers; i++) {
      const rx = bRecvStartX + i * receiverGap;
      const ry = receiverBaseY;

      ctx.beginPath();
      ctx.arc(rx, ry, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#2a1a08';
      ctx.fill();
      ctx.strokeStyle = '#ffa726';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '9px Consolas, monospace';
      ctx.fillStyle = '#ffa726';
      ctx.textAlign = 'center';
      ctx.fillText(`.${129 + i}`, rx, ry + 4);
    }

    // Broadcast packet animation (to all receivers)
    const bcastCycle = 3000;
    const bcastT = (elapsed % bcastCycle) / bcastCycle;
    if (bcastT < 0.6) {
      const p = easeInOut(bcastT / 0.6);

      for (let i = 0; i < receivers; i++) {
        const rx = bRecvStartX + i * receiverGap;
        const px = bcastX + (rx - bcastX) * p;
        const py = senderY + (receiverBaseY - senderY) * p;

        ctx.beginPath();
        ctx.moveTo(bcastX, senderY + 16);
        ctx.lineTo(px, py);
        ctx.strokeStyle = '#ffa72644';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffa726';
        ctx.fill();
      }
    }

    // Labels at bottom
    const botY = h * 0.78;
    ctx.font = '12px Consolas, monospace';
    ctx.textAlign = 'center';

    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(t('learn.network-broadcast.cv_unicastDst'), uniX, botY);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#8899aa';
    ctx.fillText(t('learn.network-broadcast.cv_unicastDesc'), uniX, botY + 18);

    ctx.font = '12px Consolas, monospace';
    ctx.fillStyle = '#ffa726';
    ctx.fillText(t('learn.network-broadcast.cv_broadcastDst'), bcastX, botY);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#8899aa';
    ctx.fillText(t('learn.network-broadcast.cv_broadcastDesc'), bcastX, botY + 18);
  }
};

// ─── Step 5: Subnet reference table ───
const step5_SubnetTable = {
  get title() { return t('learn.network-broadcast.s4t'); },
  get content() { return t('learn.network-broadcast.s4c'); },
  animation(ctx, w, h, elapsed) {
    const entries = [
      { cidr: '/24', mask: '255.255.255.0',   net: '.0',   bcast: '.255', hosts: 254, blockSize: 256 },
      { cidr: '/25', mask: '255.255.255.128', net: '.0 / .128', bcast: '.127 / .255', hosts: 126, blockSize: 128 },
      { cidr: '/26', mask: '255.255.255.192', net: '.0 / .64 / .128 / .192', bcast: '.63 / .127 / .191 / .255', hosts: 62, blockSize: 64 },
      { cidr: '/27', mask: '255.255.255.224', net: '0,32,64,...', bcast: '31,63,95,...', hosts: 30, blockSize: 32 },
      { cidr: '/28', mask: '255.255.255.240', net: '0,16,32,...', bcast: '15,31,47,...', hosts: 14, blockSize: 16 },
      { cidr: '/30', mask: '255.255.255.252', net: '0,4,8,...',   bcast: '3,7,11,...',   hosts: 2,  blockSize: 4 },
    ];

    const cols = [
      { label: t('learn.network-broadcast.cv_cidr'),  x: w * 0.08, align: 'center' },
      { label: t('learn.network-broadcast.cv_mask'),  x: w * 0.27, align: 'center' },
      { label: t('learn.network-broadcast.cv_hosts'), x: w * 0.46, align: 'center' },
      { label: t('learn.network-broadcast.cv_block'), x: w * 0.56, align: 'center' },
      { label: t('learn.network-broadcast.cv_netAddr'),   x: w * 0.72, align: 'center' },
      { label: t('learn.network-broadcast.cv_bcastAddr'), x: w * 0.92, align: 'center' },
    ];

    const headerY = 14;
    const rowH = Math.min(28, (h * 0.48) / (entries.length + 1));
    const dataStartY = headerY + rowH;

    // Header
    ctx.font = 'bold 11px sans-serif';
    for (const col of cols) {
      ctx.fillStyle = '#4fc3f7';
      ctx.textAlign = col.align;
      ctx.fillText(col.label, col.x, headerY);
    }

    // Header line
    ctx.beginPath();
    ctx.moveTo(10, headerY + 8);
    ctx.lineTo(w - 10, headerY + 8);
    ctx.strokeStyle = '#1e3a5c';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rows
    const colors = ['#4fc3f7', '#69f0ae', '#ffa726', '#ab47bc', '#ef5350', '#26c6da'];

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const appear = easeInOut(Math.min(Math.max(elapsed / 400 - i * 0.5, 0), 1));
      if (appear <= 0) continue;

      ctx.globalAlpha = appear;
      const ry = dataStartY + i * rowH;
      const color = colors[i % colors.length];

      drawRoundedRect(ctx, 4, ry - rowH * 0.4, w - 8, rowH - 4, 4, color + '08', 'transparent');

      ctx.font = 'bold 12px Consolas, monospace';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(e.cidr, cols[0].x, ry);

      ctx.font = '11px Consolas, monospace';
      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'center';
      ctx.fillText(e.mask, cols[1].x, ry);

      ctx.font = 'bold 12px Consolas, monospace';
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'center';
      ctx.fillText(e.hosts.toString(), cols[2].x, ry);

      ctx.font = '11px Consolas, monospace';
      ctx.fillStyle = '#8899aa';
      ctx.textAlign = 'center';
      ctx.fillText(e.blockSize.toString(), cols[3].x, ry);

      ctx.font = '10px Consolas, monospace';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'center';
      ctx.fillText(e.net, cols[4].x, ry);

      ctx.fillStyle = '#ffa726';
      ctx.fillText(e.bcast, cols[5].x, ry);
    }
    ctx.globalAlpha = 1;

    // ── Subnet examples below the table ──
    const tableBottom = dataStartY + entries.length * rowH + 4;
    const barX = 40;
    const barW = w - 80;

    // Fixed edge width: 1 address out of 256 in the /24 bar
    const edgeW = Math.max(barW / 256 * 4, 14);
    const rowSpacing = 42;

    // Helper: draw a row of subnets
    function drawSubnetRow(ctx, subnets, titleText, titleColor, baseY, barH, parentPhase) {
      const phase2 = easeInOut(Math.min(Math.max(parentPhase, 0), 1));
      if (phase2 <= 0) return baseY;

      ctx.globalAlpha = phase2;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = titleColor;
      ctx.textAlign = 'center';
      ctx.fillText(titleText, w / 2, baseY);

      const barY = baseY + 10;
      const count = subnets.length;
      const subW = barW / count;

      for (let si = 0; si < count; si++) {
        const sn = subnets[si];
        const sx = barX + si * subW;
        const subAppear = easeInOut(Math.min(Math.max(phase2 * (count + 1) - si * 0.5, 0), 1));
        ctx.globalAlpha = subAppear;

        drawRoundedRect(ctx, sx + 1, barY, subW - 2, barH, 3, '#1a2332', sn.color + '66');

        // Net addr (fixed width)
        drawRoundedRect(ctx, sx + 1, barY, edgeW, barH, 3, '#66666688', '#888');
        // Bcast addr (fixed width)
        drawRoundedRect(ctx, sx + subW - edgeW - 1, barY, edgeW, barH, 3, '#ffa72644', '#ffa726');
        // Usable range
        drawRoundedRect(ctx, sx + edgeW + 2, barY + 2, subW - edgeW * 2 - 4, barH - 4, 2, sn.color + '22', sn.color);

        const mid = sx + subW / 2;

        ctx.font = '9px Consolas, monospace';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'left';
        ctx.fillText(sn.net, sx + 3, barY + barH + 11);

        ctx.fillStyle = '#ffa726';
        ctx.textAlign = 'right';
        ctx.fillText(sn.bcast, sx + subW - 3, barY + barH + 11);

        ctx.fillStyle = sn.color;
        ctx.textAlign = 'center';
        ctx.font = '9px Consolas, monospace';
        ctx.fillText(sn.first + '-' + sn.last, mid, barY + barH + 22);

        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(sn.hosts + ' hosts', mid, barY + barH + 33);
      }
      ctx.globalAlpha = 1;
      return barY + barH + rowSpacing;
    }

    // /24 example (1 subnet — full range)
    const ex24Phase = (elapsed / 400 - entries.length * 0.5) / 1.5;
    const subnets24 = [
      { net: '.0', bcast: '.255', first: '.1', last: '.254', hosts: 254, color: '#4fc3f7' },
    ];
    const after24 = drawSubnetRow(ctx, subnets24, '/24 \u2014 1 subnet', '#4fc3f7', tableBottom, 22, ex24Phase);

    // /25 example (2 subnets)
    const ex25Phase = ex24Phase - 1.0;
    const subnets25 = [
      { net: '.0',   bcast: '.127', first: '.1',   last: '.126', hosts: 126, color: '#4fc3f7' },
      { net: '.128', bcast: '.255', first: '.129', last: '.254', hosts: 126, color: '#69f0ae' },
    ];
    const after25 = drawSubnetRow(ctx, subnets25, '/25 \u2014 2 subnets', '#69f0ae', after24, 22, ex25Phase);

    // /26 example (4 subnets)
    const ex26Phase = ex24Phase - 2.0;
    const subnets26 = [
      { net: '.0',   bcast: '.63',  first: '.1',   last: '.62',  hosts: 62, color: '#4fc3f7' },
      { net: '.64',  bcast: '.127', first: '.65',  last: '.126', hosts: 62, color: '#69f0ae' },
      { net: '.128', bcast: '.191', first: '.129', last: '.190', hosts: 62, color: '#ffa726' },
      { net: '.192', bcast: '.255', first: '.193', last: '.254', hosts: 62, color: '#ab47bc' },
    ];
    drawSubnetRow(ctx, subnets26, '/26 \u2014 4 subnets', '#ffa726', after25, 22, ex26Phase);
  }
};

// ─── Step 6: Summary ───
const step6_Summary = {
  get title() { return t('learn.network-broadcast.s5t'); },
  get content() { return t('learn.network-broadcast.s5c'); },
  animation(ctx, w, h, elapsed) {
    const items = [
      { text: t('learn.network-broadcast.cv_networkAddr'),   sub: t('learn.network-broadcast.cv_hostPartAllZero'), color: '#888' },
      { text: t('learn.network-broadcast.cv_broadcastAddr'), sub: t('learn.network-broadcast.cv_hostPartAllOne'), color: '#ffa726' },
      { text: t('learn.network-broadcast.cv_usableRange'),   sub: t('learn.network-broadcast.cv_usableRangeSub'), color: '#69f0ae' },
      { text: t('learn.network-broadcast.cv_unicast'),        sub: t('learn.network-broadcast.cv_unicastSub'), color: '#4fc3f7' },
      { text: t('learn.network-broadcast.cv_broadcast'),      sub: t('learn.network-broadcast.cv_broadcastSub'), color: '#ef5350' },
    ];

    const cx = w / 2;
    const cy = h * 0.45;
    const radius = Math.min(h * 0.32, w * 0.22);
    const rot = elapsed / 8000 * Math.PI * 2;

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

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'center';
    ctx.fillText(t('learn.network-broadcast.cv_netAndBcast'), cx, cy - 3);
    ctx.fillText(t('learn.network-broadcast.cv_bcastLabel'), cx, cy + 9);
  }
};

// ─── Export lesson ───
export const lessonNetworkBroadcast = {
  id: 'lesson-network-broadcast',
  get title() { return t('learn.network-broadcast.title'); },
  get description() { return t('learn.network-broadcast.desc'); },
  category: 'IP Addressing',
  steps: [
    step1_NetworkAddress,
    step2_BroadcastAddress,
    step3_UsableRange,
    step4_UnicastBroadcast,
    step5_SubnetTable,
    step6_Summary,
  ],
};
