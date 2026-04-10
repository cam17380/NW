// ─── Lesson: IP Address Classes (Global / Private) ───
// Animated introduction to IPv4 address structure, classes, and private ranges.

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

// ─── Step 1: What is an IP address? ───
const step1_WhatIsIP = {
  get title() { return t('learn.ip-address.s0t'); },
  get content() { return t('learn.ip-address.s0c'); },
  animation(ctx, w, h, elapsed) {
    const octets = [192, 168, 1, 10];
    const boxW = Math.min(100, w * 0.2);
    const boxH = 56;
    const gap = 16;
    const totalW = boxW * 4 + gap * 3;
    const startX = (w - totalW) / 2;
    const cy = h * 0.3;

    // Title
    ctx.font = 'bold 16px Consolas, monospace';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'center';
    ctx.fillText(t('learn.ip-address.cv_ipv4Address'), w / 2, cy - 50);

    // Animate octets appearing one by one
    const phase = Math.min(elapsed / 600, 4);

    for (let i = 0; i < 4; i++) {
      const appear = Math.min(Math.max(phase - i, 0), 1);
      const alpha = easeInOut(appear);
      if (alpha <= 0) continue;

      const x = startX + i * (boxW + gap);
      const y = cy - boxH / 2;

      ctx.globalAlpha = alpha;
      drawRoundedRect(ctx, x, y, boxW, boxH, 8, '#1a2332', '#4fc3f7');

      // Decimal value
      ctx.font = 'bold 22px Consolas, monospace';
      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'center';
      ctx.fillText(octets[i].toString(), x + boxW / 2, y + 26);

      // Label
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#667';
      ctx.fillText(`Octet ${i + 1}`, x + boxW / 2, y + 46);

      // Dots between octets
      if (i < 3) {
        ctx.font = 'bold 24px Consolas, monospace';
        ctx.fillStyle = '#ffa726';
        ctx.fillText('.', x + boxW + gap / 2, cy + 4);
      }
      ctx.globalAlpha = 1;
    }

    // Binary representation (after all octets appear)
    if (phase >= 4) {
      const binPhase = Math.min((elapsed - 2400) / 1200, 1);
      if (binPhase > 0) {
        const alpha = easeInOut(binPhase);
        ctx.globalAlpha = alpha;

        const binY = cy + boxH / 2 + 40;
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#69f0ae';
        ctx.textAlign = 'center';
        ctx.fillText(t('learn.ip-address.cv_binary'), w / 2, binY);

        const binaryStr = octets.map(o => toBinary8(o)).join('.');
        ctx.font = 'bold 15px Consolas, monospace';
        ctx.fillStyle = '#69f0ae';
        ctx.fillText(binaryStr, w / 2, binY + 24);

        // 32 bits label
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#ffa726';
        ctx.fillText(t('learn.ip-address.cv_32bits'), w / 2, binY + 48);

        ctx.globalAlpha = 1;
      }
    }

    // Bit boxes at bottom
    if (phase >= 4 && elapsed > 3600) {
      const bitPhase = Math.min((elapsed - 3600) / 2000, 1);
      const alpha = easeInOut(bitPhase);
      ctx.globalAlpha = alpha;

      const bitBoxSize = Math.min(16, (w - 80) / 32);
      const bitGap = 1;
      const bitTotalW = 32 * (bitBoxSize + bitGap) - bitGap;
      const bitStartX = (w - bitTotalW) / 2;
      const bitY = h * 0.7;

      const allBits = octets.map(o => toBinary8(o)).join('');
      const colors = ['#4fc3f7', '#69f0ae', '#ffa726', '#ef5350'];

      for (let i = 0; i < 32; i++) {
        const octetIdx = Math.floor(i / 8);
        const bx = bitStartX + i * (bitBoxSize + bitGap);
        const bitAppear = Math.min(Math.max(bitPhase * 32 - i * 0.5, 0), 1);
        if (bitAppear <= 0) continue;

        ctx.globalAlpha = alpha * bitAppear;
        const fill = allBits[i] === '1' ? colors[octetIdx] : '#1a2332';
        const border = colors[octetIdx];
        drawRoundedRect(ctx, bx, bitY, bitBoxSize, bitBoxSize, 2, fill, border);

        ctx.font = `${Math.max(8, bitBoxSize - 4)}px Consolas, monospace`;
        ctx.fillStyle = allBits[i] === '1' ? '#000' : '#556';
        ctx.textAlign = 'center';
        ctx.fillText(allBits[i], bx + bitBoxSize / 2, bitY + bitBoxSize * 0.75);
      }
      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 2: Binary ↔ Decimal conversion ───
const step2_BinaryConversion = {
  get title() { return t('learn.ip-address.s1t'); },
  get content() { return t('learn.ip-address.s1c'); },
  animation(ctx, w, h, elapsed) {
    const target = 168; // 10101000
    const bits = toBinary8(target);
    const weights = [128, 64, 32, 16, 8, 4, 2, 1];

    const boxSize = Math.min(50, (w - 100) / 8);
    const gap = 6;
    const totalW = 8 * (boxSize + gap) - gap;
    const startX = (w - totalW) / 2;
    const topY = h * 0.15;

    // Weight labels
    ctx.font = '11px Consolas, monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < 8; i++) {
      const x = startX + i * (boxSize + gap) + boxSize / 2;
      ctx.fillStyle = '#667';
      const superscripts = '\u2077\u2076\u2075\u2074\u00b3\u00b2\u00b9\u2070';
      ctx.fillText('2' + superscripts[i], x, topY);
      ctx.fillStyle = '#8899aa';
      ctx.fillText(weights[i].toString(), x, topY + 16);
    }

    // Bit boxes with progressive highlight (no repeat)
    const bitInterval = 1200;  // ms per bit
    const totalTime = bitInterval * 8 + 2000; // 8 bits + result hold
    const clamped = Math.min(elapsed, totalTime);
    const highlightIdx = Math.min(Math.floor(clamped / bitInterval), 9);

    const bitY = topY + 30;
    let sum = 0;
    const activeColors = [];

    const allWeights = [];
    for (let i = 0; i < 8; i++) {
      const x = startX + i * (boxSize + gap);
      const isOne = bits[i] === '1';
      const isHighlighted = i <= highlightIdx && i < 8;
      const isActive = isHighlighted && isOne;

      let fill = '#1a2332';
      let border = '#334';
      let textColor = '#556';

      if (isHighlighted) {
        if (isOne) {
          fill = '#0d3830';
          border = '#69f0ae';
          textColor = '#69f0ae';
          sum += weights[i];
          activeColors.push({ weight: weights[i], x: x + boxSize / 2, y: bitY + boxSize });
        } else {
          border = '#6a4444';
          textColor = '#888';
        }
        allWeights.push(isOne ? weights[i] : 0);
      }

      drawRoundedRect(ctx, x, bitY, boxSize, boxSize, 6, fill, border);

      ctx.font = `bold ${boxSize * 0.5}px Consolas, monospace`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(bits[i], x + boxSize / 2, bitY + boxSize * 0.65);
    }

    // Sum display
    const sumY = bitY + boxSize + 40;
    if (allWeights.length > 0) {
      // Draw addition with all weights (including 0)
      ctx.font = '14px Consolas, monospace';
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'center';

      const parts = allWeights.map(v => v.toString());
      const expr = parts.join(' + ') + ' = ' + sum;
      ctx.fillText(expr, w / 2, sumY);

      // Arrow lines from active bits (1-bits only)
      for (const a of activeColors) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y + 4);
        ctx.lineTo(a.x, sumY - 20);
        ctx.strokeStyle = '#69f0ae44';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Final result
    const resultY = sumY + 40;
    if (highlightIdx >= 8) {
      const resultElapsed = clamped - bitInterval * 8;
      const resAlpha = easeInOut(Math.min(resultElapsed / 800, 1));
      ctx.globalAlpha = resAlpha;

      drawRoundedRect(ctx, w / 2 - 120, resultY - 18, 240, 40, 8, '#0d2240', '#4fc3f7');
      ctx.font = 'bold 18px Consolas, monospace';
      ctx.fillStyle = '#4fc3f7';
      ctx.textAlign = 'center';
      ctx.fillText(`10101000\u2082 = 168\u2081\u2080`, w / 2, resultY + 10);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 3: IP Address Classes ───
const step3_Classes = {
  get title() { return t('learn.ip-address.s2t'); },
  get content() { return t('learn.ip-address.s2c'); },
  animation(ctx, w, h, elapsed) {
    const classes = [
      { name: 'Class A', range: '1 \u2013 126',   ratio: 0.5,  color: '#4fc3f7', bits: '0xxxxxxx', net: '8', host: '24' },
      { name: 'Class B', range: '128 \u2013 191', ratio: 0.25, color: '#69f0ae', bits: '10xxxxxx', net: '16', host: '16' },
      { name: 'Class C', range: '192 \u2013 223', ratio: 0.125, color: '#ffa726', bits: '110xxxxx', net: '24', host: '8' },
      { name: 'Class D', range: '224 \u2013 239', ratio: 0.0625, color: '#ab47bc', bits: '1110xxxx', net: '\u2014', host: '\u2014' },
      { name: 'Class E', range: '240 \u2013 255', ratio: 0.0625, color: '#ef5350', bits: '1111xxxx', net: '\u2014', host: '\u2014' },
    ];

    const barX = 40;
    const barW = w - 80;
    const barH = 36;
    const startY = 20;
    const gap = 8;

    const phase = Math.min(elapsed / 2500, 1);

    for (let i = 0; i < classes.length; i++) {
      const c = classes[i];
      const appear = easeInOut(Math.min(Math.max(phase * 5 - i * 0.8, 0), 1));
      if (appear <= 0) continue;

      const y = startY + i * (barH + gap);
      const bw = barW * c.ratio * appear;

      ctx.globalAlpha = appear;

      // Bar
      drawRoundedRect(ctx, barX, y, bw, barH, 4, c.color + '33', c.color);

      // Class label
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = c.color;
      ctx.textAlign = 'left';
      ctx.fillText(c.name, barX + 8, y + 15);

      // Range
      ctx.font = '12px Consolas, monospace';
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(c.range, barX + 8, y + 30);

      // Leading bits
      ctx.font = '12px Consolas, monospace';
      ctx.fillStyle = '#8899aa';
      ctx.textAlign = 'left';
      const infoX = barX + barW * 0.55;
      ctx.fillText(t('learn.ip-address.cv_leadingBits', { bits: c.bits }), infoX, y + 15);

      // Network / host
      if (c.net !== '\u2014') {
        ctx.fillText(t('learn.ip-address.cv_netHost', { net: c.net, host: c.host }), infoX, y + 30);
      } else {
        ctx.fillStyle = '#667';
        ctx.fillText(t('learn.ip-address.cv_specialUse'), infoX, y + 30);
      }

      ctx.globalAlpha = 1;
    }

    // Address space scale
    const scaleY = startY + 5 * (barH + gap) + 10;
    if (phase >= 1) {
      const scalePhase = Math.min((elapsed - 2500) / 800, 1);
      ctx.globalAlpha = easeInOut(scalePhase);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#556';
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.ip-address.cv_addressSpace'), w / 2, scaleY);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 4: Private vs Global addresses ───
const step4_PrivateGlobal = {
  get title() { return t('learn.ip-address.s3t'); },
  get content() { return t('learn.ip-address.s3c'); },
  animation(ctx, w, h, elapsed) {
    const cx = w / 2;
    const phase = Math.min(elapsed / 2000, 1);

    // Internet cloud (global)
    const cloudY = h * 0.22;
    const cloudR = Math.min(70, w * 0.12);
    const cloudAlpha = easeInOut(Math.min(phase * 2, 1));
    ctx.globalAlpha = cloudAlpha;

    // Cloud shape
    ctx.beginPath();
    ctx.arc(cx, cloudY, cloudR, 0, Math.PI * 2);
    ctx.fillStyle = '#1a3a5c44';
    ctx.fill();
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'center';
    ctx.fillText(t('learn.ip-address.cv_internet'), cx, cloudY - 6);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#8899aa';
    ctx.fillText(t('learn.ip-address.cv_globalIP'), cx, cloudY + 12);

    // NAT Router
    const natY = h * 0.47;
    const natW = 100;
    const natH = 36;
    const natAlpha = easeInOut(Math.min(Math.max(phase * 2 - 0.5, 0), 1));
    ctx.globalAlpha = natAlpha;

    drawRoundedRect(ctx, cx - natW / 2, natY - natH / 2, natW, natH, 6, '#1a2332', '#69f0ae');
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'center';
    ctx.fillText(t('learn.ip-address.cv_natRouter'), cx, natY + 5);

    // Connection line: cloud ↔ NAT
    ctx.beginPath();
    ctx.moveTo(cx, cloudY + cloudR + 2);
    ctx.lineTo(cx, natY - natH / 2 - 2);
    ctx.strokeStyle = '#4fc3f766';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Private networks
    const privateRanges = [
      { label: '10.0.0.0/8', sub: 'Class A', color: '#4fc3f7' },
      { label: '172.16.0.0/12', sub: 'Class B', color: '#69f0ae' },
      { label: '192.168.0.0/16', sub: 'Class C', color: '#ffa726' },
    ];

    const privY = h * 0.72;
    const boxW = Math.min(140, (w - 60) / 3);
    const boxH = 52;
    const privGap = 14;
    const privTotalW = boxW * 3 + privGap * 2;
    const privStartX = (w - privTotalW) / 2;

    for (let i = 0; i < 3; i++) {
      const pr = privateRanges[i];
      const appear = easeInOut(Math.min(Math.max(phase * 3 - 1 - i * 0.3, 0), 1));
      if (appear <= 0) continue;

      ctx.globalAlpha = appear;
      const px = privStartX + i * (boxW + privGap);

      drawRoundedRect(ctx, px, privY, boxW, boxH, 6, pr.color + '1a', pr.color);

      ctx.font = 'bold 13px Consolas, monospace';
      ctx.fillStyle = pr.color;
      ctx.textAlign = 'center';
      ctx.fillText(pr.label, px + boxW / 2, privY + 22);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.fillText(pr.sub, px + boxW / 2, privY + 40);

      // Line to NAT
      ctx.beginPath();
      ctx.moveTo(px + boxW / 2, privY - 2);
      ctx.lineTo(cx, natY + natH / 2 + 2);
      ctx.strokeStyle = pr.color + '44';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.globalAlpha = 1;

    // Label
    if (phase >= 1) {
      const labelPhase = easeInOut(Math.min((elapsed - 2000) / 600, 1));
      ctx.globalAlpha = labelPhase;
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#ffa726';
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.ip-address.cv_privateNote'), cx, privY + boxH + 20);
      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 5: Special addresses ───
const step5_SpecialAddresses = {
  get title() { return t('learn.ip-address.s4t'); },
  get content() { return t('learn.ip-address.s4c'); },
  animation(ctx, w, h, elapsed) {
    const specials = [
      { addr: '0.0.0.0',         label: t('learn.ip-address.cv_defaultUnspecified'), icon: '\u25cb', color: '#667' },
      { addr: '127.0.0.1',       label: t('learn.ip-address.cv_loopback'),           icon: '\u21ba', color: '#4fc3f7' },
      { addr: '255.255.255.255', label: t('learn.ip-address.cv_broadcastAll'),       icon: '\u25c9', color: '#ffa726' },
      { addr: '169.254.x.x',    label: t('learn.ip-address.cv_linkLocal'),           icon: '\u26a0', color: '#ef5350' },
    ];

    const boxW = Math.min(260, w * 0.6);
    const boxH = 44;
    const gap = 10;
    const startX = (w - boxW) / 2;
    const startY = (h - (boxH + gap) * specials.length) / 2;

    for (let i = 0; i < specials.length; i++) {
      const s = specials[i];
      const appear = easeInOut(Math.min(Math.max(elapsed / 500 - i * 0.6, 0), 1));
      if (appear <= 0) continue;

      ctx.globalAlpha = appear;
      const y = startY + i * (boxH + gap);

      drawRoundedRect(ctx, startX, y, boxW, boxH, 6, '#1a2332', s.color + '88');

      // Icon
      ctx.font = '18px sans-serif';
      ctx.fillStyle = s.color;
      ctx.textAlign = 'center';
      ctx.fillText(s.icon, startX + 24, y + 28);

      // Address
      ctx.font = 'bold 14px Consolas, monospace';
      ctx.fillStyle = s.color;
      ctx.textAlign = 'left';
      ctx.fillText(s.addr, startX + 48, y + 20);

      // Label
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.fillText(s.label, startX + 48, y + 36);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 6: Summary ───
const step6_Summary = {
  get title() { return t('learn.ip-address.s5t'); },
  get content() { return t('learn.ip-address.s5c'); },
  animation(ctx, w, h, elapsed) {
    const items = [
      { text: t('learn.ip-address.cv_sum32bits'), sub: t('learn.ip-address.cv_sum32bitsSub'), color: '#4fc3f7' },
      { text: t('learn.ip-address.cv_sumClasses'), sub: t('learn.ip-address.cv_sumClassesSub'), color: '#69f0ae' },
      { text: t('learn.ip-address.cv_sumPrivate'), sub: t('learn.ip-address.cv_sumPrivateSub'), color: '#ffa726' },
      { text: t('learn.ip-address.cv_sumNAT'), sub: t('learn.ip-address.cv_sumNATSub'), color: '#ef5350' },
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
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'center';
    ctx.fillText('IPv4', cx, cy + 4);
  }
};

// ─── Export lesson ───
export const lessonIPAddress = {
  id: 'lesson-ip-address',
  get title() { return t('learn.ip-address.title'); },
  get description() { return t('learn.ip-address.desc'); },
  category: 'IP Addressing',
  steps: [
    step1_WhatIsIP,
    step2_BinaryConversion,
    step3_Classes,
    step4_PrivateGlobal,
    step5_SpecialAddresses,
    step6_Summary,
  ],
};
