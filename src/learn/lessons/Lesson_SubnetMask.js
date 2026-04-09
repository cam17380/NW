// ─── Lesson: Subnet Masks, CIDR, and VLSM ───
// Animated explanation of how masks divide network/host portions.

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

// ─── Step 1: What is a subnet mask? ───
const step1_WhatIsMask = {
  get title() { return t('learn.subnet-mask.s0t'); },
  get content() { return t('learn.subnet-mask.s0c'); },
  animation(ctx, w, h, elapsed) {
    const ip   = [192, 168, 1, 10];
    const mask = [255, 255, 255, 0];

    const bitSize = Math.min(16, (w - 80) / 32);
    const gap = 1;
    const totalW = 32 * (bitSize + gap) - gap;
    const startX = (w - totalW) / 2;

    const phase = Math.min(elapsed / 2000, 1);

    // Row 1: IP address bits
    const ipY = h * 0.18;
    const ipBits = ip.map(o => toBinary8(o)).join('');
    const maskBits = mask.map(o => toBinary8(o)).join('');

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'right';
    ctx.fillText('IP:', startX - 8, ipY + bitSize * 0.7);

    for (let i = 0; i < 32; i++) {
      const appear = easeInOut(Math.min(Math.max(phase * 4 - i * 0.05, 0), 1));
      ctx.globalAlpha = appear;
      const bx = startX + i * (bitSize + gap);
      const isNet = maskBits[i] === '1';
      const fill = isNet ? '#4fc3f733' : '#1a2332';
      const border = isNet ? '#4fc3f7' : '#334';

      drawRoundedRect(ctx, bx, ipY, bitSize, bitSize, 2, fill, border);
      ctx.font = `${Math.max(8, bitSize - 4)}px Consolas, monospace`;
      ctx.fillStyle = isNet ? '#4fc3f7' : '#8899aa';
      ctx.textAlign = 'center';
      ctx.fillText(ipBits[i], bx + bitSize / 2, ipY + bitSize * 0.75);
    }
    ctx.globalAlpha = 1;

    // Row 2: Mask bits
    const maskY = ipY + bitSize + 20;
    const maskPhase = Math.min(Math.max(elapsed / 2000 - 0.4, 0) / 0.6, 1);

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'right';
    ctx.globalAlpha = maskPhase;
    ctx.fillText('Mask:', startX - 8, maskY + bitSize * 0.7);

    for (let i = 0; i < 32; i++) {
      const appear = easeInOut(Math.min(Math.max(maskPhase * 4 - i * 0.05, 0), 1));
      ctx.globalAlpha = appear;
      const bx = startX + i * (bitSize + gap);
      const isOne = maskBits[i] === '1';
      const fill = isOne ? '#69f0ae' : '#1a2332';
      const border = isOne ? '#69f0ae' : '#ef535088';

      drawRoundedRect(ctx, bx, maskY, bitSize, bitSize, 2, fill, border);
      ctx.font = `${Math.max(8, bitSize - 4)}px Consolas, monospace`;
      ctx.fillStyle = isOne ? '#000' : '#ef5350';
      ctx.textAlign = 'center';
      ctx.fillText(maskBits[i], bx + bitSize / 2, maskY + bitSize * 0.75);
    }
    ctx.globalAlpha = 1;

    // Labels
    const labelY = maskY + bitSize + 24;
    if (maskPhase >= 1) {
      const lp = easeInOut(Math.min((elapsed - 2000) / 800, 1));
      ctx.globalAlpha = lp;

      // Network part bracket
      const netEnd = startX + 24 * (bitSize + gap) - gap;
      ctx.beginPath();
      ctx.moveTo(startX, labelY);
      ctx.lineTo(startX, labelY + 8);
      ctx.lineTo(netEnd, labelY + 8);
      ctx.lineTo(netEnd, labelY);
      ctx.strokeStyle = '#69f0ae';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'center';
      ctx.fillText('Network (24 bits)', (startX + netEnd) / 2, labelY + 24);

      // Host part bracket
      const hostStart = netEnd + gap;
      const hostEnd = startX + 32 * (bitSize + gap) - gap;
      ctx.beginPath();
      ctx.moveTo(hostStart, labelY);
      ctx.lineTo(hostStart, labelY + 8);
      ctx.lineTo(hostEnd, labelY + 8);
      ctx.lineTo(hostEnd, labelY);
      ctx.strokeStyle = '#ef5350';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ef5350';
      ctx.textAlign = 'center';
      ctx.fillText('Host (8 bits)', (hostStart + hostEnd) / 2, labelY + 24);

      ctx.globalAlpha = 1;
    }

    // Decimal display
    const decY = labelY + 50;
    if (elapsed > 2800) {
      const dp = easeInOut(Math.min((elapsed - 2800) / 600, 1));
      ctx.globalAlpha = dp;

      ctx.font = '14px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText('IP:    192.168.1.10', w / 2, decY);
      ctx.fillText('Mask:  255.255.255.0', w / 2, decY + 22);
      ctx.fillStyle = '#69f0ae';
      ctx.fillText('Net:   192.168.1.0  (Network Address)', w / 2, decY + 48);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 3: CIDR notation ───
const step3_CIDR = {
  get title() { return t('learn.subnet-mask.s1t'); },
  get content() { return t('learn.subnet-mask.s1c'); },
  animation(ctx, w, h, elapsed) {
    const examples = [
      { cidr: '/8',  mask: '255.0.0.0',       netBits: 8,  hosts: '16,777,214', color: '#4fc3f7' },
      { cidr: '/16', mask: '255.255.0.0',     netBits: 16, hosts: '65,534',     color: '#69f0ae' },
      { cidr: '/24', mask: '255.255.255.0',   netBits: 24, hosts: '254',        color: '#ffa726' },
      { cidr: '/28', mask: '255.255.255.240', netBits: 28, hosts: '14',         color: '#ab47bc' },
      { cidr: '/30', mask: '255.255.255.252', netBits: 30, hosts: '2',          color: '#ef5350' },
    ];

    const bitSize = Math.min(12, (w - 80) / 32);
    const bitGap = 1;
    const totalBitW = 32 * (bitSize + bitGap) - bitGap;
    const bitStartX = (w - totalBitW) / 2;

    const rowH = h / (examples.length + 0.5);

    // Cycle through examples with time or show all
    const cycleTime = 8000;
    const t = (elapsed % cycleTime) / cycleTime;
    const activeIdx = Math.floor(t * examples.length);

    for (let ei = 0; ei < examples.length; ei++) {
      const ex = examples[ei];
      const isActive = ei === activeIdx;
      const y = 10 + ei * rowH;

      // CIDR label
      ctx.font = `bold ${isActive ? 15 : 12}px Consolas, monospace`;
      ctx.fillStyle = isActive ? ex.color : '#556';
      ctx.textAlign = 'right';
      ctx.fillText(ex.cidr, bitStartX - 8, y + bitSize / 2 + 5);

      // Bit boxes
      for (let i = 0; i < 32; i++) {
        const bx = bitStartX + i * (bitSize + bitGap);
        const isNet = i < ex.netBits;

        let fill, border;
        if (isActive) {
          fill = isNet ? ex.color : '#1a2332';
          border = isNet ? ex.color : '#333';
        } else {
          fill = isNet ? ex.color + '44' : '#111';
          border = isNet ? ex.color + '66' : '#222';
        }

        drawRoundedRect(ctx, bx, y, bitSize, bitSize, 1, fill, border);
      }

      // Info (right side)
      const infoX = bitStartX + totalBitW + 12;
      if (isActive) {
        ctx.font = '12px Consolas, monospace';
        ctx.fillStyle = '#e0e0e0';
        ctx.textAlign = 'left';
        ctx.fillText(ex.mask, infoX, y + 6);

        ctx.font = '11px sans-serif';
        ctx.fillStyle = ex.color;
        ctx.fillText(`Hosts: ${ex.hosts}`, infoX, y + bitSize + 6);
      }
    }

    // Formula at bottom
    const botY = h - 20;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#8899aa';
    ctx.textAlign = 'center';
    ctx.fillText('Hosts = 2^(32 - prefix) - 2  (\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u30a2\u30c9\u30ec\u30b9\u3068\u30d6\u30ed\u30fc\u30c9\u30ad\u30e3\u30b9\u30c8\u3092\u9664\u304f)', w / 2, botY);
  }
};

// ─── Step 2: AND operation for network address ───
const step2_ANDOperation = {
  get title() { return t('learn.subnet-mask.s2t'); },
  get content() { return t('learn.subnet-mask.s2c'); },
  animation(ctx, w, h, elapsed) {
    const ip   = [192, 168, 1, 130];
    const mask = [255, 255, 255, 128];
    const net  = ip.map((o, i) => o & mask[i]); // [192, 168, 1, 128]

    const ipBits   = ip.map(o => toBinary8(o)).join('');
    const maskBits = mask.map(o => toBinary8(o)).join('');
    const netBits  = net.map(o => toBinary8(o)).join('');

    const bitSize = Math.min(14, (w - 100) / 32);
    const bitGap = 1;
    const totalW = 32 * (bitSize + bitGap) - bitGap;
    const startX = (w - totalW) / 2;

    const rowGap = bitSize + 16;
    const baseY = h * 0.12;
    const phase = Math.min(elapsed / 3000, 1);

    const rows = [
      { label: 'IP:',   bits: ipBits,   color: '#4fc3f7', dec: ip.join('.') },
      { label: 'Mask:', bits: maskBits, color: '#69f0ae', dec: mask.join('.') },
      { label: 'Net:',  bits: netBits,  color: '#ffa726', dec: net.join('.') },
    ];

    for (let r = 0; r < 3; r++) {
      const row = rows[r];
      const rowAppear = easeInOut(Math.min(Math.max(phase * 3 - r * 0.8, 0), 1));
      if (rowAppear <= 0) continue;

      ctx.globalAlpha = rowAppear;
      const ry = baseY + r * rowGap;

      // Label
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = row.color;
      ctx.textAlign = 'right';
      ctx.fillText(row.label, startX - 8, ry + bitSize * 0.7);

      // Decimal
      ctx.font = '11px Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(row.dec, startX + totalW + 8, ry + bitSize * 0.7);

      // Bits
      for (let i = 0; i < 32; i++) {
        const bx = startX + i * (bitSize + bitGap);
        const isNet = i < 25; // /25 mask
        const bit = row.bits[i];

        let fill, border;
        if (r === 2) {
          // Result row — highlight AND result
          fill = bit === '1' ? '#ffa726' : '#1a2332';
          border = '#ffa726';
        } else {
          fill = (r === 1 && bit === '1') ? '#69f0ae' : '#1a2332';
          border = isNet ? row.color + 'aa' : '#333';
        }

        drawRoundedRect(ctx, bx, ry, bitSize, bitSize, 1, fill, border);
        ctx.font = `${Math.max(7, bitSize - 5)}px Consolas, monospace`;
        ctx.fillStyle = bit === '1' ? (r === 2 ? '#000' : row.color) : '#555';
        ctx.textAlign = 'center';
        ctx.fillText(bit, bx + bitSize / 2, ry + bitSize * 0.75);
      }

      // AND symbol between rows 1 and 2
      if (r === 1) {
        ctx.font = 'bold 14px Consolas, monospace';
        ctx.fillStyle = '#e0e0e0';
        ctx.textAlign = 'right';
        ctx.fillText('AND', startX - 8, ry - 4);
      }
      if (r === 2) {
        ctx.font = 'bold 14px Consolas, monospace';
        ctx.fillStyle = '#e0e0e0';
        ctx.textAlign = 'right';
        ctx.fillText('=', startX - 8, ry - 4);
      }
    }
    ctx.globalAlpha = 1;

    // Animated highlight scanning
    if (phase >= 1) {
      const scanTime = 4000;
      const scanPhase = ((elapsed - 3000) % scanTime) / scanTime;
      const scanBit = Math.floor(scanPhase * 32);

      if (scanBit < 32) {
        const sx = startX + scanBit * (bitSize + bitGap);
        ctx.fillStyle = '#ffffff22';
        for (let r = 0; r < 3; r++) {
          const ry = baseY + r * rowGap;
          ctx.fillRect(sx, ry, bitSize, bitSize);
        }
      }
    }

    // Result summary
    const sumY = baseY + 3 * rowGap + 20;
    if (phase >= 1) {
      const sp = easeInOut(Math.min((elapsed - 3000) / 600, 1));
      ctx.globalAlpha = sp;

      drawRoundedRect(ctx, w / 2 - 160, sumY, 320, 48, 8, '#0d2240', '#ffa726');

      ctx.font = 'bold 14px Consolas, monospace';
      ctx.fillStyle = '#ffa726';
      ctx.textAlign = 'center';
      ctx.fillText('192.168.1.130 /25', w / 2, sumY + 18);

      ctx.font = '13px Consolas, monospace';
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText('Network: 192.168.1.128  Hosts: 126', w / 2, sumY + 38);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 4: Mask and host count relationship ───
const step4_MaskHostCount = {
  get title() { return t('learn.subnet-mask.s3t'); },
  get content() { return t('learn.subnet-mask.s3c'); },
  animation(ctx, w, h, elapsed) {
    // Sliding mask visualization
    const cycleTime = 10000;
    const t = (elapsed % cycleTime) / cycleTime;

    // Animate prefix from /8 to /30
    const minPrefix = 8;
    const maxPrefix = 30;
    const pingPong = t < 0.5 ? t * 2 : 2 - t * 2;
    const prefix = Math.round(minPrefix + (maxPrefix - minPrefix) * easeInOut(pingPong));

    const bitSize = Math.min(16, (w - 80) / 32);
    const bitGap = 1;
    const totalW = 32 * (bitSize + bitGap) - bitGap;
    const startX = (w - totalW) / 2;
    const barY = h * 0.18;

    // Bit bar
    for (let i = 0; i < 32; i++) {
      const bx = startX + i * (bitSize + bitGap);
      const isNet = i < prefix;
      const fill = isNet ? '#69f0ae' : '#ef535088';
      const border = isNet ? '#69f0ae' : '#ef5350';

      drawRoundedRect(ctx, bx, barY, bitSize, bitSize, 2, fill, border);
    }

    // Divider line at prefix boundary
    const divX = startX + prefix * (bitSize + bitGap) - bitGap / 2;
    ctx.beginPath();
    ctx.moveTo(divX, barY - 8);
    ctx.lineTo(divX, barY + bitSize + 8);
    ctx.strokeStyle = '#ffa726';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Labels
    ctx.font = 'bold 16px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(`/${prefix}`, w / 2, barY - 18);

    const labelY = barY + bitSize + 30;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'center';
    const netCenter = startX + (prefix * (bitSize + bitGap)) / 2;
    if (prefix > 2) ctx.fillText(`Network: ${prefix} bits`, netCenter, labelY);

    ctx.fillStyle = '#ef5350';
    const hostBits = 32 - prefix;
    const hostCenter = startX + prefix * (bitSize + bitGap) + (hostBits * (bitSize + bitGap)) / 2;
    if (hostBits > 1) ctx.fillText(`Host: ${hostBits} bits`, hostCenter, labelY);

    // Host count bar chart
    const chartY = labelY + 30;
    const chartH = h - chartY - 30;
    const hostCount = Math.pow(2, hostBits) - 2;

    const maxCount = Math.pow(2, 24) - 2; // /8 max
    const barH = Math.min(chartH * 0.7, (hostCount / maxCount) * chartH * 0.7 + 20);

    const barCx = w / 2;
    const barWidth = 120;

    drawRoundedRect(ctx, barCx - barWidth / 2, chartY + chartH - barH, barWidth, barH, 6, '#69f0ae22', '#69f0ae');

    ctx.font = 'bold 18px Consolas, monospace';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';
    ctx.fillText(hostCount.toLocaleString(), barCx, chartY + chartH - barH - 10);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#8899aa';
    ctx.fillText('usable hosts', barCx, chartY + chartH + 16);

    // Subnet mask text
    const maskOctets = [];
    for (let o = 0; o < 4; o++) {
      let val = 0;
      for (let b = 0; b < 8; b++) {
        const bi = o * 8 + b;
        if (bi < prefix) val |= (128 >> b);
      }
      maskOctets.push(val);
    }
    ctx.font = '13px Consolas, monospace';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'center';
    ctx.fillText(`Mask: ${maskOctets.join('.')}`, w / 2, chartY - 6);
  }
};

// ─── Step 5: VLSM (Variable Length Subnet Masking) ───
const step5_VLSM = {
  get title() { return t('learn.subnet-mask.s4t'); },
  get content() { return t('learn.subnet-mask.s4c'); },
  animation(ctx, w, h, elapsed) {
    const subnets = [
      { name: 'Office A',  need: 100, prefix: 25, range: '192.168.1.0/25',   hosts: 126, color: '#4fc3f7' },
      { name: 'Office B',  need: 50,  prefix: 26, range: '192.168.1.128/26', hosts: 62,  color: '#69f0ae' },
      { name: 'Servers',   need: 10,  prefix: 28, range: '192.168.1.192/28', hosts: 14,  color: '#ffa726' },
      { name: 'P2P Link',  need: 2,   prefix: 30, range: '192.168.1.208/30', hosts: 2,   color: '#ab47bc' },
    ];

    const totalAddr = 256;
    const barX = 40;
    const barW = w - 80;
    const barH = 36;
    const barY = 16;

    // Full /24 bar
    drawRoundedRect(ctx, barX, barY, barW, barH, 4, '#1a2332', '#334');
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#667';
    ctx.textAlign = 'center';
    ctx.fillText('192.168.1.0/24 (256 addresses)', w / 2, barY + barH + 14);

    // Subnets stacked in the bar
    const phase = Math.min(elapsed / 3000, 1);
    let offset = 0;

    for (let i = 0; i < subnets.length; i++) {
      const sn = subnets[i];
      const subSize = Math.pow(2, 32 - sn.prefix);
      const appear = easeInOut(Math.min(Math.max(phase * 4 - i * 0.8, 0), 1));
      if (appear <= 0) { offset += subSize; continue; }

      ctx.globalAlpha = appear;

      const sx = barX + (offset / totalAddr) * barW;
      const sw = (subSize / totalAddr) * barW * appear;

      drawRoundedRect(ctx, sx, barY + 2, sw, barH - 4, 3, sn.color + '44', sn.color);

      // Label inside bar
      if (sw > 40) {
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = sn.color;
        ctx.textAlign = 'center';
        ctx.fillText(sn.name, sx + sw / 2, barY + barH / 2 + 4);
      }

      offset += subSize;
    }
    ctx.globalAlpha = 1;

    // Detail table
    const tableY = barY + barH + 34;
    const rowH = 48;

    for (let i = 0; i < subnets.length; i++) {
      const sn = subnets[i];
      const appear = easeInOut(Math.min(Math.max(phase * 4 - i * 0.8, 0), 1));
      if (appear <= 0) continue;

      ctx.globalAlpha = appear;
      const ry = tableY + i * rowH;

      // Color dot
      ctx.beginPath();
      ctx.arc(barX + 8, ry + 12, 6, 0, Math.PI * 2);
      ctx.fillStyle = sn.color;
      ctx.fill();

      // Name
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = sn.color;
      ctx.textAlign = 'left';
      ctx.fillText(sn.name, barX + 24, ry + 16);

      // Range
      ctx.font = '12px Consolas, monospace';
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(sn.range, barX + 24, ry + 34);

      // Need vs available
      const infoX = w * 0.55;
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.fillText(`Need: ${sn.need}`, infoX, ry + 16);
      ctx.fillStyle = sn.hosts >= sn.need ? '#69f0ae' : '#ef5350';
      ctx.fillText(`Available: ${sn.hosts}`, infoX, ry + 34);

      // Usage bar
      const usageX = w * 0.78;
      const usageW = w * 0.16;
      const usageH = 10;
      const usageRatio = Math.min(sn.need / sn.hosts, 1);
      drawRoundedRect(ctx, usageX, ry + 8, usageW, usageH, 3, '#1a2332', '#334');
      drawRoundedRect(ctx, usageX, ry + 8, usageW * usageRatio, usageH, 3, sn.color + '88', sn.color);

      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(usageRatio * 100)}%`, usageX + usageW, ry + 34);
    }

    ctx.globalAlpha = 1;

    // Wasted space
    if (phase >= 1) {
      const used = subnets.reduce((sum, sn) => sum + Math.pow(2, 32 - sn.prefix), 0);
      const free = totalAddr - used;
      const fp = easeInOut(Math.min((elapsed - 3000) / 600, 1));
      ctx.globalAlpha = fp;

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'center';
      ctx.fillText(`VLSM\u3067\u52b9\u7387\u7684\u306b\u5206\u5272: ${used}/256 \u4f7f\u7528\u3001${free} \u30a2\u30c9\u30ec\u30b9\u4f59\u308a`, w / 2, tableY + 4 * rowH + 10);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 6: Summary ───
const step6_Summary = {
  get title() { return t('learn.subnet-mask.s5t'); },
  get content() { return t('learn.subnet-mask.s5c'); },
  animation(ctx, w, h, elapsed) {
    const items = [
      { text: 'Subnet Mask', sub: '1=Net, 0=Host', color: '#69f0ae' },
      { text: 'CIDR /prefix', sub: '\u30d3\u30c3\u30c8\u6570\u8868\u8a18', color: '#4fc3f7' },
      { text: 'AND\u6f14\u7b97', sub: 'IP & Mask = Net', color: '#ffa726' },
      { text: 'VLSM', sub: '\u53ef\u5909\u9577\u30de\u30b9\u30af', color: '#ab47bc' },
    ];

    const cx = w / 2;
    const cy = h * 0.45;
    const radius = Math.min(h * 0.32, w * 0.22);
    const rot = elapsed / 8000 * Math.PI * 2;

    // Connecting lines and nodes
    for (let i = 0; i < items.length; i++) {
      const angle = rot + (Math.PI * 2 / items.length) * i - Math.PI / 2;
      const appear = easeInOut(Math.min(elapsed / 800 - i * 0.3, 1));
      if (appear <= 0) continue;

      const ix = cx + Math.cos(angle) * radius;
      const iy = cy + Math.sin(angle) * radius;

      ctx.globalAlpha = appear;

      // Line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ix, iy);
      ctx.strokeStyle = items[i].color + '44';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Node
      ctx.beginPath();
      ctx.arc(ix, iy, 10, 0, Math.PI * 2);
      ctx.fillStyle = items[i].color;
      ctx.fill();

      // Labels
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = items[i].color;
      ctx.textAlign = 'center';
      const labelOff = iy < cy ? -28 : 26;
      ctx.fillText(items[i].text, ix, iy + labelOff);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.fillText(items[i].sub, ix, iy + labelOff + 16);
    }

    // Center
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
    ctx.fillText('Subnet', cx, cy + 4);
  }
};

// ─── Export lesson ───
export const lessonSubnetMask = {
  id: 'lesson-subnet-mask',
  get title() { return t('learn.subnet-mask.title'); },
  get description() { return t('learn.subnet-mask.desc'); },
  category: 'IP Addressing',
  steps: [
    step1_WhatIsMask,
    step2_ANDOperation,
    step3_CIDR,
    step4_MaskHostCount,
    step5_VLSM,
    step6_Summary,
  ],
};
