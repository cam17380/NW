// ─── Lesson: Packet & Frame Structure ───
// Encapsulation, Ethernet frame (L2), IP packet (L3), nesting overview.

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

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ─── Step 1: Encapsulation concept ───
const step1_Encapsulation = {
  title: '\u30ab\u30d7\u30bb\u30eb\u5316\u3068\u306f\uff1f',
  content: `
    <p>\u30c7\u30fc\u30bf\u3092\u9001\u308b\u3068\u304d\u3001\u5404\u5c64\u304c <strong>\u30d8\u30c3\u30c0</strong> \u3092\u4ed8\u3051\u3066\u5305\u307f\u307e\u3059\u3002</p>
    <p>\u3061\u3087\u3046\u3069\u624b\u7d19\u3092\u5c01\u7b52\u306b\u5165\u308c\u3001\u3055\u3089\u306b\u5b9b\u540d\u30e9\u30d9\u30eb\u3092\u8cbc\u308b\u3088\u3046\u306a\u30a4\u30e1\u30fc\u30b8\u3067\u3059\u3002</p>
    <ul>
      <li><strong>L4</strong>: \u30a2\u30d7\u30ea\u30c7\u30fc\u30bf\u306b\u30dd\u30fc\u30c8\u756a\u53f7\u3092\u4ed8\u52a0\uff08\u30bb\u30b0\u30e1\u30f3\u30c8\uff09</li>
      <li><strong>L3</strong>: IP\u30d8\u30c3\u30c0\u3092\u4ed8\u52a0\uff08\u30d1\u30b1\u30c3\u30c8\uff09</li>
      <li><strong>L2</strong>: MAC\u30d8\u30c3\u30c0\u3092\u4ed8\u52a0\uff08\u30d5\u30ec\u30fc\u30e0\uff09</li>
    </ul>
    <p>\u53d7\u4fe1\u5074\u3067\u306f\u9006\u306b\u5404\u5c64\u306e\u30d8\u30c3\u30c0\u3092\u5265\u304c\u3057\u3066\u3044\u304d\u307e\u3059\u3002</p>
  `,
  animation(ctx, w, h, elapsed) {
    const cx = w / 2;
    const baseY = h * 0.42;

    // Layers from inside out: Data → L4 → L3 → L2
    // Each layer appears in order and wraps the previous
    const layers = [
      { label: 'Data',       color: '#69f0ae', border: '#69f0ae',  desc: '\u30a2\u30d7\u30ea\u30c7\u30fc\u30bf' },
      { label: 'L4 Header',  color: '#ab47bc', border: '#ab47bc', desc: 'TCP/UDP (\u30dd\u30fc\u30c8\u756a\u53f7)' },
      { label: 'L3 Header',  color: '#4fc3f7', border: '#4fc3f7', desc: 'IP (\u9001\u4fe1\u5143/\u5b9b\u5148IP)' },
      { label: 'L2 Header',  color: '#ffa726', border: '#ffa726', desc: 'Ethernet (\u9001\u4fe1\u5143/\u5b9b\u5148MAC)' },
    ];

    const innerW = Math.min(w * 0.22, 140);
    const innerH = 36;
    const padW = Math.min(w * 0.09, 56);
    const padH = 16;
    const n = layers.length;
    const stepDelay = 1200;  // ms per layer
    const holdTime = 2000;   // pause between phases
    const encapTime = stepDelay * n;               // Data→L4→L3→L2
    const decapTime = stepDelay * (n - 1);         // L2→L3→L4 stripped
    const cycleTime = encapTime + holdTime + decapTime + holdTime;
    const t = elapsed % cycleTime;

    // Phase: 0=encapsulating, 1=hold, 2=decapsulating, 3=hold(repeat)
    let phase, phaseT;
    if (t < encapTime) {
      phase = 0;
      phaseT = t;
    } else if (t < encapTime + holdTime) {
      phase = 1;
      phaseT = t - encapTime;
    } else if (t < encapTime + holdTime + decapTime) {
      phase = 2;
      phaseT = t - encapTime - holdTime;
    } else {
      phase = 3;
      phaseT = t - encapTime - holdTime - decapTime;
    }

    // Calculate opacity per layer
    function layerAlpha(idx) {
      if (phase === 0) {
        // Encapsulation: appear inside-out
        const start = idx * stepDelay;
        return easeInOut(Math.min(Math.max((phaseT - start) / 600, 0), 1));
      } else if (phase === 1) {
        return 1; // all visible
      } else if (phase === 2) {
        // Decapsulation: disappear outside-in (L2 first, then L3, L4)
        const removeOrder = n - 1 - idx; // L2=0, L3=1, L4=2, Data stays
        if (idx === 0) return 1; // Data never disappears
        const start = removeOrder * stepDelay;
        return 1 - easeInOut(Math.min(Math.max((phaseT - start) / 600, 0), 1));
      } else {
        // Only Data visible
        return idx === 0 ? 1 : 0;
      }
    }

    // Draw layers (painter's order: outer first)
    for (let draw = n - 1; draw >= 0; draw--) {
      const alpha = layerAlpha(draw);
      if (alpha <= 0) continue;

      const layer = layers[draw];
      ctx.globalAlpha = alpha;

      const lw = innerW + padW * 2 * draw;
      const lh = innerH + padH * 2 * draw;
      const lx = cx - lw / 2;
      const ly = baseY - lh / 2;

      drawRoundedRect(ctx, lx, ly, lw, lh, 8, layer.color + '11', layer.border + '88');

      const textY = ly + padH - 2;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = layer.color;
      ctx.textAlign = 'left';
      ctx.fillText(layer.label, lx + 8, textY);

      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.textAlign = 'right';
      ctx.fillText(layer.desc, lx + lw - 8, textY);
    }
    ctx.globalAlpha = 1;

    // Step indicator text
    const encapLabels = [
      'Data \u3092\u7528\u610f',
      'L4\u30d8\u30c3\u30c0\u3067\u5305\u3080 \u2192 \u30bb\u30b0\u30e1\u30f3\u30c8',
      'L3\u30d8\u30c3\u30c0\u3067\u5305\u3080 \u2192 \u30d1\u30b1\u30c3\u30c8',
      'L2\u30d8\u30c3\u30c0\u3067\u5305\u3080 \u2192 \u30d5\u30ec\u30fc\u30e0',
    ];
    const decapLabels = [
      'L2\u30d8\u30c3\u30c0\u3092\u5265\u304c\u3059',
      'L3\u30d8\u30c3\u30c0\u3092\u5265\u304c\u3059',
      'L4\u30d8\u30c3\u30c0\u3092\u5265\u304c\u3059',
    ];

    const outerH = innerH + padH * 2 * (n - 1);
    const indicatorY = baseY + outerH / 2 + 20;

    if (phase === 0) {
      const step = Math.min(Math.floor(phaseT / stepDelay), n - 1);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'center';
      ctx.fillText('\u25bc Encapsulate: ' + encapLabels[step], cx, indicatorY);
    } else if (phase === 1) {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'center';
      ctx.fillText('\u2714 \u9001\u4fe1\u5b8c\u4e86 \u2014 \u53d7\u4fe1\u5074\u3067\u5265\u304c\u3057\u307e\u3059', cx, indicatorY);
    } else if (phase === 2) {
      const step = Math.min(Math.floor(phaseT / stepDelay), n - 2);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ef5350';
      ctx.textAlign = 'center';
      ctx.fillText('\u25b2 Decapsulate: ' + decapLabels[step], cx, indicatorY);
    } else {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'center';
      ctx.fillText('\u2714 Data \u3092\u53d6\u308a\u51fa\u3057\u5b8c\u4e86', cx, indicatorY);
    }
  }
};

// ─── Step 2: Ethernet Frame (L2) ───
const step2_EthernetFrame = {
  title: '\u30a4\u30fc\u30b5\u30cd\u30c3\u30c8\u30d5\u30ec\u30fc\u30e0\uff08L2\uff09',
  content: `
    <p>\u30b9\u30a4\u30c3\u30c1\u304c\u6271\u3046\u30c7\u30fc\u30bf\u5358\u4f4d\u304c <strong>\u30d5\u30ec\u30fc\u30e0</strong> \u3067\u3059\u3002</p>
    <ul>
      <li><strong>\u5b9b\u5148MAC</strong> (6\u30d0\u30a4\u30c8): \u6b21\u306e\u8ee2\u9001\u5148\u306eMAC\u30a2\u30c9\u30ec\u30b9</li>
      <li><strong>\u9001\u4fe1\u5143MAC</strong> (6\u30d0\u30a4\u30c8): \u9001\u4fe1\u5143\u306eMAC\u30a2\u30c9\u30ec\u30b9</li>
      <li><strong>Type</strong> (2\u30d0\u30a4\u30c8): \u4e2d\u8eab\u306e\u30d7\u30ed\u30c8\u30b3\u30eb (0x0800=IPv4)</li>
      <li><strong>Payload</strong>: L3\u4ee5\u4e0a\u306e\u30c7\u30fc\u30bf\uff08IP\u30d1\u30b1\u30c3\u30c8\uff09</li>
      <li><strong>FCS</strong> (4\u30d0\u30a4\u30c8): \u30a8\u30e9\u30fc\u691c\u51fa\u7528\u30c1\u30a7\u30c3\u30af\u30b5\u30e0</li>
    </ul>
  `,
  animation(ctx, w, h, elapsed) {
    const phase = Math.min(elapsed / 2500, 1);
    const cx = w / 2;

    const fields = [
      { label: 'Dst MAC',  bytes: '6B',  width: 0.18, color: '#ffa726', example: 'BB:BB:BB:22:22:22' },
      { label: 'Src MAC',  bytes: '6B',  width: 0.18, color: '#4fc3f7', example: 'AA:AA:AA:11:11:11' },
      { label: 'Type',     bytes: '2B',  width: 0.08, color: '#ab47bc', example: '0x0800 (IPv4)' },
      { label: 'Payload',  bytes: '46-1500B', width: 0.40, color: '#69f0ae', example: 'IP Packet + Data' },
      { label: 'FCS',      bytes: '4B',  width: 0.08, color: '#ef5350', example: 'CRC checksum' },
    ];

    const totalW = Math.min(w * 0.9, 600);
    const startX = (w - totalW) / 2;
    const barY = h * 0.22;
    const barH = 50;

    // Title
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'center';
    ctx.fillText('Ethernet Frame', cx, barY - 14);

    let fx = startX;
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const fw = totalW * f.width;
      const appear = easeInOut(Math.min(Math.max(phase * 5 - i * 0.7, 0), 1));
      if (appear <= 0) { fx += fw; continue; }

      ctx.globalAlpha = appear;

      drawRoundedRect(ctx, fx, barY, fw - 2, barH, 4, f.color + '1a', f.color);

      // Field name
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = f.color;
      ctx.textAlign = 'center';
      ctx.fillText(f.label, fx + fw / 2 - 1, barY + 20);

      // Byte count
      ctx.font = '9px Consolas, monospace';
      ctx.fillStyle = '#8899aa';
      ctx.fillText(f.bytes, fx + fw / 2 - 1, barY + 36);

      fx += fw;
    }
    ctx.globalAlpha = 1;

    // Example values below
    if (phase >= 1) {
      const exPhase = easeInOut(Math.min((elapsed - 2500) / 800, 1));
      ctx.globalAlpha = exPhase;

      const exY = barY + barH + 24;
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.textAlign = 'center';
      ctx.fillText('\u4f8b: PC1 \u2192 Router \u3078\u306e\u30d5\u30ec\u30fc\u30e0', cx, exY);

      let ex = startX;
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const fw = totalW * f.width;
        ctx.font = '9px Consolas, monospace';
        ctx.fillStyle = f.color;
        ctx.textAlign = 'center';
        ctx.fillText(f.example, ex + fw / 2 - 1, exY + 18);
        ex += fw;
      }

      ctx.globalAlpha = 1;
    }

    // Key point (text annotation style)
    if (phase >= 1) {
      const kp = easeInOut(Math.min((elapsed - 3300) / 600, 1));
      ctx.globalAlpha = kp;

      const noteY = barY + barH + 68;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';

      ctx.fillStyle = '#ffa726';
      ctx.fillText('\u25b6 MAC\u30a2\u30c9\u30ec\u30b9\u306f\u300c\u6b21\u306e\u8ee2\u9001\u5148\u300d\u2014 \u6bce\u30db\u30c3\u30d7\u3067\u66f8\u304d\u63db\u308f\u308b', cx, noteY);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 3: IP Packet (L3) ───
const step3_IPPacket = {
  title: 'IP\u30d1\u30b1\u30c3\u30c8\uff08L3\uff09',
  content: `
    <p>\u30eb\u30fc\u30bf\u30fc\u304c\u6271\u3046\u30c7\u30fc\u30bf\u5358\u4f4d\u304c <strong>\u30d1\u30b1\u30c3\u30c8</strong> \u3067\u3059\u3002</p>
    <p>\u30d5\u30ec\u30fc\u30e0\u306ePayload\u90e8\u5206\u306b\u5165\u3063\u3066\u3044\u307e\u3059\u3002</p>
    <ul>
      <li><strong>Src IP</strong>: \u9001\u4fe1\u5143\u306eIP\u30a2\u30c9\u30ec\u30b9\uff08\u7d42\u70b9\uff09</li>
      <li><strong>Dst IP</strong>: \u5b9b\u5148\u306eIP\u30a2\u30c9\u30ec\u30b9\uff08\u7d42\u70b9\uff09</li>
      <li><strong>TTL</strong>: \u30eb\u30fc\u30bf\u30fc\u3092\u901a\u904e\u3059\u308b\u305f\u3073\u306b\u6e1b\u308b\u30ab\u30a6\u30f3\u30bf\u30fc\uff08\u30eb\u30fc\u30d7\u9632\u6b62\uff09</li>
      <li><strong>Protocol</strong>: \u4e2d\u8eab\u306e\u30d7\u30ed\u30c8\u30b3\u30eb (1=ICMP, 6=TCP, 17=UDP)</li>
    </ul>
  `,
  animation(ctx, w, h, elapsed) {
    const phase = Math.min(elapsed / 2500, 1);
    const cx = w / 2;

    // Single row of fields, same style as Step 2 (Ethernet Frame)
    const fields = [
      { label: 'Src IP',   bytes: '4B',  width: 0.20, color: '#4fc3f7', example: '192.168.1.10' },
      { label: 'Dst IP',   bytes: '4B',  width: 0.20, color: '#ffa726', example: '10.0.0.10' },
      { label: 'TTL',      bytes: '1B',  width: 0.08, color: '#ef5350', example: '128' },
      { label: 'Protocol', bytes: '1B',  width: 0.10, color: '#ab47bc', example: '6 (TCP)' },
      { label: 'Others',   bytes: '',    width: 0.12, color: '#888888', example: 'Ver,IHL,ToS...' },
      { label: 'Payload',  bytes: '',    width: 0.30, color: '#69f0ae', example: 'TCP Header + Data' },
    ];

    const totalW = Math.min(w * 0.9, 600);
    const startX = (w - totalW) / 2;
    const barY = h * 0.18;
    const barH = 50;

    // Title
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'center';
    ctx.fillText('IP Packet', cx, barY - 14);

    let fx = startX;
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const fw = totalW * f.width;
      const appear = easeInOut(Math.min(Math.max(phase * 5 - i * 0.7, 0), 1));
      if (appear <= 0) { fx += fw; continue; }

      ctx.globalAlpha = appear;

      drawRoundedRect(ctx, fx, barY, fw - 2, barH, 4, f.color + '1a', f.color);

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = f.color;
      ctx.textAlign = 'center';
      ctx.fillText(f.label, fx + fw / 2 - 1, barY + 20);

      if (f.bytes) {
        ctx.font = '9px Consolas, monospace';
        ctx.fillStyle = '#8899aa';
        ctx.fillText(f.bytes, fx + fw / 2 - 1, barY + 36);
      }

      fx += fw;
    }
    ctx.globalAlpha = 1;

    // Example values below
    if (phase >= 1) {
      const exPhase = easeInOut(Math.min((elapsed - 2500) / 800, 1));
      ctx.globalAlpha = exPhase;

      const exY = barY + barH + 24;
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.textAlign = 'center';
      ctx.fillText('\u4f8b: PC1 \u2192 Server \u3078\u306e\u30d1\u30b1\u30c3\u30c8', cx, exY);

      let ex = startX;
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const fw = totalW * f.width;
        ctx.font = '9px Consolas, monospace';
        ctx.fillStyle = f.color;
        ctx.textAlign = 'center';
        ctx.fillText(f.example, ex + fw / 2 - 1, exY + 18);
        ex += fw;
      }
      ctx.globalAlpha = 1;
    }

    // Key points (text annotation style, not card boxes)
    if (phase >= 1) {
      const kp = easeInOut(Math.min((elapsed - 3300) / 600, 1));
      ctx.globalAlpha = kp;

      const noteY = barY + barH + 68;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';

      ctx.fillStyle = '#4fc3f7';
      ctx.fillText('\u25b6 Src/Dst IP \u306f\u7d42\u70b9\u9593\u3067\u5909\u308f\u3089\u306a\u3044\uff08\u6700\u7d42\u5b9b\u5148\u3092\u793a\u3059\uff09', cx, noteY);

      ctx.fillStyle = '#ef5350';
      ctx.fillText('\u25b6 TTL \u306f\u30eb\u30fc\u30bf\u30fc\u3092\u901a\u904e\u3059\u308b\u305f\u3073\u306b -1\uff080\u306b\u306a\u308b\u3068\u7834\u68c4\uff09', cx, noteY + 22);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 4: Nesting overview ───
const step4_Nesting = {
  title: '\u5165\u308c\u5b50\u69cb\u9020\u306e\u5168\u4f53\u50cf',
  content: `
    <p>\u5b9f\u969b\u306b\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u3092\u6d41\u308c\u308b\u30c7\u30fc\u30bf\u306f\u3001\u5404\u5c64\u306e\u30d8\u30c3\u30c0\u304c
       \u5165\u308c\u5b50\u72b6\u306b\u306a\u3063\u3066\u3044\u307e\u3059\u3002</p>
    <p>\u30b9\u30a4\u30c3\u30c1\u306fL2\u30d8\u30c3\u30c0\u3060\u3051\u3092\u898b\u3066\u8ee2\u9001\u3057\u3001
       \u30eb\u30fc\u30bf\u30fc\u306fL2\u3092\u5265\u304c\u3057\u3066L3\u3092\u898b\u3066\u8ee2\u9001\u3057\u307e\u3059\u3002</p>
  `,
  animation(ctx, w, h, elapsed) {
    const cx = w / 2;
    const centerY = h * 0.28;
    const phase = Math.min(elapsed / 3000, 1);

    // Same layers & sizing as Step 1
    const layers = [
      { label: 'Data',             color: '#69f0ae', border: '#69f0ae', desc: '\u30a2\u30d7\u30ea\u30c7\u30fc\u30bf' },
      { label: 'L4 Header',        color: '#ab47bc', border: '#ab47bc', desc: 'TCP/UDP' },
      { label: 'L3 Header',        color: '#4fc3f7', border: '#4fc3f7', desc: 'IP' },
      { label: 'L2 Header',        color: '#ffa726', border: '#ffa726', desc: 'Ethernet' },
    ];

    const innerW = Math.min(w * 0.22, 140);
    const innerH = 36;
    const padW = Math.min(w * 0.09, 56);
    const padH = 16;
    const n = layers.length;
    const stepDelay = 1000;

    // Layers appear inside-out: Data first, then L4, L3, L2
    const visibleCount = Math.min(n, Math.floor(phase * n / 0.8) + 1);

    // Draw from outermost visible down to innermost (painter's order)
    for (let i = visibleCount - 1; i >= 0; i--) {
      const layer = layers[i];
      const appearStart = i * 0.8 / n;
      const appear = easeInOut(Math.min(Math.max((phase - appearStart) / 0.15, 0), 1));
      if (appear <= 0) continue;

      ctx.globalAlpha = appear;

      const lw = innerW + padW * 2 * i;
      const lh = innerH + padH * 2 * i;
      const lx = cx - lw / 2;
      const ly = centerY - lh / 2;

      drawRoundedRect(ctx, lx, ly, lw, lh, 8, layer.color + '11', layer.border + '88');

      const textY = ly + padH - 2;
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = layer.color;
      ctx.textAlign = 'left';
      ctx.fillText(layer.label, lx + 8, textY);

      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.textAlign = 'right';
      ctx.fillText(layer.desc, lx + lw - 8, textY);
    }
    ctx.globalAlpha = 1;

    // Device annotations below
    if (phase >= 0.8) {
      const devPhase = easeInOut(Math.min((phase - 0.8) / 0.2, 1));
      ctx.globalAlpha = devPhase;

      const annY = h * 0.58;
      const colW = maxW / 3;
      const annStartX = cx - maxW / 2;

      const devices = [
        { label: 'Switch (L2)', desc: 'Ethernet\u30d8\u30c3\u30c0\u3092\u898b\u3066\u8ee2\u9001', color: '#ffa726', looks: 'L2\u306e\u307f' },
        { label: 'Router (L3)', desc: 'IP\u30d8\u30c3\u30c0\u3092\u898b\u3066\u8ee2\u9001', color: '#4fc3f7', looks: 'L2\u3092\u5265\u304c\u3057\u3066L3\u3092\u53c2\u7167' },
        { label: 'Application', desc: '\u30c7\u30fc\u30bf\u3092\u53d6\u308a\u51fa\u3059', color: '#69f0ae', looks: '\u5168\u5c64\u3092\u5265\u304c\u3059' },
      ];

      for (let i = 0; i < devices.length; i++) {
        const d = devices[i];
        const dx = annStartX + i * colW;
        const appear = easeInOut(Math.min(Math.max(devPhase * 3 - i * 0.6, 0), 1));
        ctx.globalAlpha = appear;

        drawRoundedRect(ctx, dx + 4, annY, colW - 8, 56, 6, d.color + '11', d.color);

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = d.color;
        ctx.textAlign = 'center';
        ctx.fillText(d.label, dx + colW / 2, annY + 16);

        ctx.font = '9px sans-serif';
        ctx.fillStyle = '#8899aa';
        ctx.fillText(d.desc, dx + colW / 2, annY + 32);

        ctx.font = '9px Consolas, monospace';
        ctx.fillStyle = d.color;
        ctx.fillText(d.looks, dx + colW / 2, annY + 48);
      }
      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 5: What changes per hop ───
const step5_WhatChanges = {
  title: '\u30db\u30c3\u30d7\u3054\u3068\u306b\u4f55\u304c\u5909\u308f\u308b\uff1f',
  content: `
    <p>\u30d1\u30b1\u30c3\u30c8\u304c\u30eb\u30fc\u30bf\u30fc\u3092\u901a\u904e\u3059\u308b\u3068\u304d\u306e\u5909\u5316:</p>
    <ul>
      <li><strong>L2\u30d8\u30c3\u30c0 (MAC)</strong>: \u6bce\u30db\u30c3\u30d7\u3067\u66f8\u304d\u63db\u308f\u308b \u2014 \u300c\u6b21\u306e\u8ee2\u9001\u5148\u300d</li>
      <li><strong>L3\u30d8\u30c3\u30c0 (IP)</strong>: \u5909\u308f\u3089\u306a\u3044 \u2014 \u300c\u6700\u7d42\u5b9b\u5148\u300d</li>
      <li><strong>TTL</strong>: \u30eb\u30fc\u30bf\u30fc\u901a\u904e\u6bce\u306b -1</li>
    </ul>
    <p>\u6b21\u306e\u30ec\u30c3\u30b9\u30f3\u3067\u3001\u5b9f\u969b\u306e\u30d1\u30b1\u30c3\u30c8\u306e\u65c5\u3092\u898b\u3066\u3044\u304d\u307e\u3059\u3002</p>
  `,
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
  title: '\u307e\u3068\u3081',
  content: `
    <p>\u3053\u306e\u30ec\u30c3\u30b9\u30f3\u3067\u5b66\u3093\u3060\u3053\u3068:</p>
    <ul>
      <li><strong>\u30ab\u30d7\u30bb\u30eb\u5316</strong>: Data \u2192 L4 \u2192 L3 \u2192 L2 \u3068\u30d8\u30c3\u30c0\u3067\u5305\u3080</li>
      <li><strong>\u30d5\u30ec\u30fc\u30e0 (L2)</strong>: Dst/Src MAC + Type + Payload + FCS</li>
      <li><strong>\u30d1\u30b1\u30c3\u30c8 (L3)</strong>: Src/Dst IP + TTL + Protocol + Data</li>
      <li>\u5404\u5c64\u306e\u5165\u308c\u5b50\u69cb\u9020: L2[ L3[ L4[ Data ] ] ]</li>
    </ul>
    <p>\u6b21\u306e\u30ec\u30c3\u30b9\u30f3\u3067\u30d1\u30b1\u30c3\u30c8\u304c\u5b9f\u969b\u306b\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u3092\u65c5\u3059\u308b\u69d8\u5b50\u3092\u898b\u3066\u3044\u304d\u307e\u3059\uff01</p>
  `,
  animation(ctx, w, h, elapsed) {
    const items = [
      { text: 'Encapsulation', sub: '\u5404\u5c64\u304c\u30d8\u30c3\u30c0\u3067\u5305\u3080', color: '#69f0ae' },
      { text: 'L2 Frame',      sub: 'MAC\u30a2\u30c9\u30ec\u30b9', color: '#ffa726' },
      { text: 'L3 Packet',     sub: 'IP\u30a2\u30c9\u30ec\u30b9', color: '#4fc3f7' },
      { text: 'L4 Segment',    sub: '\u30dd\u30fc\u30c8\u756a\u53f7', color: '#ab47bc' },
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
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'center';
    ctx.fillText('Packet', cx, cy + 4);
  }
};

// ─── Export lesson ───
export const lessonPacketStructure = {
  id: 'lesson-packet-structure',
  title: '\u30d1\u30b1\u30c3\u30c8\u3068\u30d5\u30ec\u30fc\u30e0\u306e\u69cb\u9020',
  description: '\u30ab\u30d7\u30bb\u30eb\u5316\u3001\u30a4\u30fc\u30b5\u30cd\u30c3\u30c8\u30d5\u30ec\u30fc\u30e0(L2)\u3001IP\u30d1\u30b1\u30c3\u30c8(L3)\u3001\u5165\u308c\u5b50\u69cb\u9020\u3092\u5b66\u3073\u307e\u3059\u3002',
  category: 'L3 Routing',
  steps: [
    step1_Encapsulation,
    step2_EthernetFrame,
    step3_IPPacket,
    step4_Nesting,
    step6_Summary,
  ],
};
