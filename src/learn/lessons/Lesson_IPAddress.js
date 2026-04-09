// ─── Lesson: IP Address Classes (Global / Private) ───
// Animated introduction to IPv4 address structure, classes, and private ranges.

// ─── Shared drawing helpers ───
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
  title: 'IP\u30a2\u30c9\u30ec\u30b9\u3068\u306f\uff1f',
  content: `
    <p>IP\u30a2\u30c9\u30ec\u30b9\u306f\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u4e0a\u306e\u300c\u4f4f\u6240\u300d\u3067\u3059\u3002</p>
    <p>IPv4\u30a2\u30c9\u30ec\u30b9\u306f <strong>32\u30d3\u30c3\u30c8</strong> \u306e\u6570\u5024\u3067\u3001<strong>8\u30d3\u30c3\u30c8\u00d74\u30aa\u30af\u30c6\u30c3\u30c8</strong> \u306b\u533a\u5207\u3063\u3066\u8868\u8a18\u3057\u307e\u3059\u3002</p>
    <p>\u4f8b: <code>192.168.1.10</code> \u2192 \u5404\u30aa\u30af\u30c6\u30c3\u30c8\u306f 0\uff5e255 \u306e\u7bc4\u56f2\u3067\u3059\u3002</p>
  `,
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
    ctx.fillText('IPv4 Address', w / 2, cy - 50);

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
        ctx.fillText('Binary:', w / 2, binY);

        const binaryStr = octets.map(o => toBinary8(o)).join('.');
        ctx.font = 'bold 15px Consolas, monospace';
        ctx.fillStyle = '#69f0ae';
        ctx.fillText(binaryStr, w / 2, binY + 24);

        // 32 bits label
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#ffa726';
        ctx.fillText('= 32 bits (4 \u00d7 8 bits)', w / 2, binY + 48);

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
  title: '2\u9032\u6570\u3068\u30aa\u30af\u30c6\u30c3\u30c8',
  content: `
    <p>\u5404\u30aa\u30af\u30c6\u30c3\u30c8\u306f <strong>8\u30d3\u30c3\u30c8</strong> \u306e2\u9032\u6570\u3067\u8868\u73fe\u3055\u308c\u307e\u3059\u3002</p>
    <p>\u5404\u30d3\u30c3\u30c8\u306f\u53f3\u304b\u3089 2<sup>0</sup>, 2<sup>1</sup>, ..., 2<sup>7</sup> \u306e\u91cd\u307f\u3092\u6301\u3061\u307e\u3059\u3002</p>
    <p>\u4f8b: <code>10101000</code> = 128 + 32 + 8 = <strong>168</strong></p>
    <p>1\u306e\u4f4d\u7f6e\u306e\u91cd\u307f\u3092\u8db3\u3057\u5408\u308f\u305b\u308b\u3068\u300110\u9032\u6570\u306b\u306a\u308a\u307e\u3059\u3002</p>
  `,
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
          border = '#3a2020';
          textColor = '#666';
        }
      }

      drawRoundedRect(ctx, x, bitY, boxSize, boxSize, 6, fill, border);

      ctx.font = `bold ${boxSize * 0.5}px Consolas, monospace`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(bits[i], x + boxSize / 2, bitY + boxSize * 0.65);
    }

    // Sum display
    const sumY = bitY + boxSize + 40;
    if (activeColors.length > 0) {
      // Draw addition
      ctx.font = '14px Consolas, monospace';
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'center';

      const parts = activeColors.map(a => a.weight.toString());
      const expr = parts.join(' + ') + ' = ' + sum;
      ctx.fillText(expr, w / 2, sumY);

      // Arrow lines from active bits
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
  title: 'IP\u30a2\u30c9\u30ec\u30b9\u306e\u30af\u30e9\u30b9',
  content: `
    <p>IPv4\u30a2\u30c9\u30ec\u30b9\u306f\u5148\u982d\u30d3\u30c3\u30c8\u3067 <strong>\u30af\u30e9\u30b9 A\uff5eE</strong> \u306b\u5206\u985e\u3055\u308c\u307e\u3059\u3002</p>
    <ul>
      <li><strong>Class A</strong> (0xxx): 1.0.0.0 \u2013 126.255.255.255 \u2014 \u5927\u898f\u6a21\u30cd\u30c3\u30c8\u30ef\u30fc\u30af</li>
      <li><strong>Class B</strong> (10xx): 128.0.0.0 \u2013 191.255.255.255 \u2014 \u4e2d\u898f\u6a21</li>
      <li><strong>Class C</strong> (110x): 192.0.0.0 \u2013 223.255.255.255 \u2014 \u5c0f\u898f\u6a21</li>
      <li><strong>Class D</strong> (1110): 224\uff5e239 \u2014 \u30de\u30eb\u30c1\u30ad\u30e3\u30b9\u30c8</li>
      <li><strong>Class E</strong> (1111): 240\uff5e255 \u2014 \u4e88\u7d04\u6e08\u307f</li>
    </ul>
  `,
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
      ctx.fillText(`Leading bits: ${c.bits}`, infoX, y + 15);

      // Network / host
      if (c.net !== '\u2014') {
        ctx.fillText(`Net: /${c.net}  Host: ${c.host} bits`, infoX, y + 30);
      } else {
        ctx.fillStyle = '#667';
        ctx.fillText('(special use)', infoX, y + 30);
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
      ctx.fillText('\u2190 Address space size (Class A = 50%, Class B = 25%, ...) \u2192', w / 2, scaleY);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 4: Private vs Global addresses ───
const step4_PrivateGlobal = {
  title: '\u30d7\u30e9\u30a4\u30d9\u30fc\u30c8\u30a2\u30c9\u30ec\u30b9\u3068\u30b0\u30ed\u30fc\u30d0\u30eb\u30a2\u30c9\u30ec\u30b9',
  content: `
    <p>IP\u30a2\u30c9\u30ec\u30b9\u306b\u306f\u30a4\u30f3\u30bf\u30fc\u30cd\u30c3\u30c8\u3067\u4f7f\u3046 <strong>\u30b0\u30ed\u30fc\u30d0\u30eb\u30a2\u30c9\u30ec\u30b9</strong> \u3068\u3001
       LAN\u5185\u5c02\u7528\u306e <strong>\u30d7\u30e9\u30a4\u30d9\u30fc\u30c8\u30a2\u30c9\u30ec\u30b9</strong> \u304c\u3042\u308a\u307e\u3059\u3002</p>
    <p>RFC 1918 \u3067\u5b9a\u7fa9\u3055\u308c\u305f\u30d7\u30e9\u30a4\u30d9\u30fc\u30c8\u7bc4\u56f2:</p>
    <ul>
      <li><strong>10.0.0.0/8</strong> \u2014 Class A (\u5927\u898f\u6a21LAN)</li>
      <li><strong>172.16.0.0/12</strong> \u2014 Class B (172.16\uff5e172.31)</li>
      <li><strong>192.168.0.0/16</strong> \u2014 Class C (\u5bb6\u5ead/\u5c0f\u898f\u6a21)</li>
    </ul>
    <p>\u30d7\u30e9\u30a4\u30d9\u30fc\u30c8\u30a2\u30c9\u30ec\u30b9\u306f NAT \u3092\u901a\u3058\u3066\u30a4\u30f3\u30bf\u30fc\u30cd\u30c3\u30c8\u306b\u30a2\u30af\u30bb\u30b9\u3057\u307e\u3059\u3002</p>
  `,
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
    ctx.fillText('Internet', cx, cloudY - 6);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#8899aa';
    ctx.fillText('Global IP', cx, cloudY + 12);

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
    ctx.fillText('NAT Router', cx, natY + 5);

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
      ctx.fillText('Private addresses (RFC 1918) \u2014 LAN\u5185\u5c02\u7528', cx, privY + boxH + 20);
      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 5: Special addresses ───
const step5_SpecialAddresses = {
  title: '\u7279\u6b8a\u306aIP\u30a2\u30c9\u30ec\u30b9',
  content: `
    <p>IPv4\u306b\u306f\u7279\u5225\u306a\u5f79\u5272\u3092\u6301\u3064\u30a2\u30c9\u30ec\u30b9\u304c\u3042\u308a\u307e\u3059:</p>
    <ul>
      <li><strong>0.0.0.0</strong> \u2014 \u30c7\u30d5\u30a9\u30eb\u30c8\u30eb\u30fc\u30c8 / \u672a\u6307\u5b9a</li>
      <li><strong>127.0.0.1</strong> \u2014 \u30eb\u30fc\u30d7\u30d0\u30c3\u30af (\u81ea\u5206\u81ea\u8eab)</li>
      <li><strong>255.255.255.255</strong> \u2014 \u30d6\u30ed\u30fc\u30c9\u30ad\u30e3\u30b9\u30c8 (\u5168\u5b9b\u5148)</li>
      <li><strong>169.254.x.x</strong> \u2014 \u30ea\u30f3\u30af\u30ed\u30fc\u30ab\u30eb (DHCP\u5931\u6557\u6642)</li>
    </ul>
    <p>\u3053\u308c\u3089\u306f\u901a\u5e38\u306e\u901a\u4fe1\u5148\u3068\u3057\u3066\u4f7f\u3048\u307e\u305b\u3093\u3002</p>
  `,
  animation(ctx, w, h, elapsed) {
    const specials = [
      { addr: '0.0.0.0',         label: 'Default / Unspecified', icon: '\u25cb', color: '#667' },
      { addr: '127.0.0.1',       label: 'Loopback (self)',       icon: '\u21ba', color: '#4fc3f7' },
      { addr: '255.255.255.255', label: 'Broadcast (all)',       icon: '\u25c9', color: '#ffa726' },
      { addr: '169.254.x.x',    label: 'Link-local (APIPA)',    icon: '\u26a0', color: '#ef5350' },
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
  title: '\u307e\u3068\u3081',
  content: `
    <p>\u3053\u306e\u30ec\u30c3\u30b9\u30f3\u3067\u5b66\u3093\u3060\u3053\u3068:</p>
    <ul>
      <li>IPv4\u30a2\u30c9\u30ec\u30b9 = <strong>32\u30d3\u30c3\u30c8</strong>\u30014\u30aa\u30af\u30c6\u30c3\u30c8</li>
      <li>\u5404\u30aa\u30af\u30c6\u30c3\u30c8\u306f <strong>0\uff5e255</strong> (8\u30d3\u30c3\u30c8)</li>
      <li><strong>Class A/B/C</strong> \u3067\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u898f\u6a21\u304c\u6c7a\u307e\u308b</li>
      <li><strong>\u30d7\u30e9\u30a4\u30d9\u30fc\u30c8\u30a2\u30c9\u30ec\u30b9</strong>: 10.x, 172.16\uff5e31.x, 192.168.x</li>
      <li>\u30d7\u30e9\u30a4\u30d9\u30fc\u30c8 \u2192 NAT \u2192 \u30a4\u30f3\u30bf\u30fc\u30cd\u30c3\u30c8</li>
    </ul>
    <p>\u6b21\u306e\u30ec\u30c3\u30b9\u30f3\u3067\u306f\u30b5\u30d6\u30cd\u30c3\u30c8\u30de\u30b9\u30af\u3068CIDR\u3092\u5b66\u3073\u307e\u3059\u3002</p>
  `,
  animation(ctx, w, h, elapsed) {
    const items = [
      { text: '32 bits = 4 octets', color: '#4fc3f7' },
      { text: 'Class A / B / C / D / E', color: '#69f0ae' },
      { text: 'Private: 10.x / 172.16.x / 192.168.x', color: '#ffa726' },
      { text: 'NAT: Private \u2192 Global', color: '#ef5350' },
    ];

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(h * 0.35, w * 0.25);

    // Rotating circle
    const rot = elapsed / 8000 * Math.PI * 2;

    for (let i = 0; i < items.length; i++) {
      const angle = rot + (Math.PI * 2 / items.length) * i - Math.PI / 2;
      const appear = easeInOut(Math.min(elapsed / 800 - i * 0.3, 1));
      if (appear <= 0) continue;

      const ix = cx + Math.cos(angle) * radius;
      const iy = cy + Math.sin(angle) * radius;

      ctx.globalAlpha = appear;

      // Node circle
      ctx.beginPath();
      ctx.arc(ix, iy, 8, 0, Math.PI * 2);
      ctx.fillStyle = items[i].color;
      ctx.fill();

      // Line to center
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ix, iy);
      ctx.strokeStyle = items[i].color + '44';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.font = '12px sans-serif';
      ctx.fillStyle = items[i].color;
      ctx.textAlign = 'center';
      const labelOffset = iy < cy ? -18 : 22;
      ctx.fillText(items[i].text, ix, iy + labelOffset);
    }

    // Center
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
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
  title: 'IP\u30a2\u30c9\u30ec\u30b9\u306e\u57fa\u672c',
  description: 'IPv4\u30a2\u30c9\u30ec\u30b9\u306e\u69cb\u9020\u3001\u30af\u30e9\u30b9\u5206\u985e\u3001\u30d7\u30e9\u30a4\u30d9\u30fc\u30c8/\u30b0\u30ed\u30fc\u30d0\u30eb\u30a2\u30c9\u30ec\u30b9\u3092\u5b66\u3073\u307e\u3059\u3002',
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
