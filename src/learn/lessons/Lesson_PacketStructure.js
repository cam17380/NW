// ─── Lesson: Packet & Frame Structure ───
// Encapsulation, Ethernet frame (L2), IP packet (L3), nesting overview.

import { t } from '../../i18n/I18n.js';
import { drawRoundedRect, easeInOut } from '../CanvasUtils.js';

// ─── Step 1: Encapsulation concept ───
const step1_Encapsulation = {
  get title() { return t('learn.packet-structure.s0t'); },
  get content() { return t('learn.packet-structure.s0c'); },
  animation(ctx, w, h, elapsed) {
    const cx = w / 2;
    const baseY = h * 0.42;

    // Layers from inside out: Data → L4 → L3 → L2
    // Each layer appears in order and wraps the previous
    const layers = [
      { label: 'Data',       color: '#69f0ae', border: '#69f0ae',  desc: t('learn.packet-structure.cv_dataDesc') },
      { label: 'L4 Header',  color: '#ab47bc', border: '#ab47bc', desc: t('learn.packet-structure.cv_l4Desc') },
      { label: 'L3 Header',  color: '#4fc3f7', border: '#4fc3f7', desc: t('learn.packet-structure.cv_l3Desc') },
      { label: 'L2 Header',  color: '#ffa726', border: '#ffa726', desc: t('learn.packet-structure.cv_l2Desc') },
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
    const ct = elapsed % cycleTime;

    // Phase: 0=encapsulating, 1=hold, 2=decapsulating, 3=hold(repeat)
    let phase, phaseT;
    if (ct < encapTime) {
      phase = 0;
      phaseT = ct;
    } else if (ct < encapTime + holdTime) {
      phase = 1;
      phaseT = ct - encapTime;
    } else if (ct < encapTime + holdTime + decapTime) {
      phase = 2;
      phaseT = ct - encapTime - holdTime;
    } else {
      phase = 3;
      phaseT = ct - encapTime - holdTime - decapTime;
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
      t('learn.packet-structure.cv_encapData'),
      t('learn.packet-structure.cv_encapL4'),
      t('learn.packet-structure.cv_encapL3'),
      t('learn.packet-structure.cv_encapL2'),
    ];
    const decapLabels = [
      t('learn.packet-structure.cv_decapL2'),
      t('learn.packet-structure.cv_decapL3'),
      t('learn.packet-structure.cv_decapL4'),
    ];

    const outerH = innerH + padH * 2 * (n - 1);
    const indicatorY = baseY + outerH / 2 + 20;

    if (phase === 0) {
      const step = Math.min(Math.floor(phaseT / stepDelay), n - 1);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.packet-structure.cv_encapsulate', { layer: encapLabels[step] }), cx, indicatorY);
    } else if (phase === 1) {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.packet-structure.cv_txComplete'), cx, indicatorY);
    } else if (phase === 2) {
      const step = Math.min(Math.floor(phaseT / stepDelay), n - 2);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ef5350';
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.packet-structure.cv_decapsulate', { layer: decapLabels[step] }), cx, indicatorY);
    } else {
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.packet-structure.cv_dataExtracted'), cx, indicatorY);
    }
  }
};

// ─── Step 2: Ethernet Frame (L2) ───
const step2_EthernetFrame = {
  get title() { return t('learn.packet-structure.s1t'); },
  get content() { return t('learn.packet-structure.s1c'); },
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
    ctx.fillText(t('learn.packet-structure.cv_ethernetFrame'), cx, barY - 14);

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
      ctx.fillText(t('learn.packet-structure.cv_frameExample'), cx, exY);

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
      ctx.fillText(t('learn.packet-structure.cv_macRewriteNote'), cx, noteY);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 3: IP Packet (L3) ───
const step3_IPPacket = {
  get title() { return t('learn.packet-structure.s2t'); },
  get content() { return t('learn.packet-structure.s2c'); },
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
    ctx.fillText(t('learn.packet-structure.cv_ipPacket'), cx, barY - 14);

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
      ctx.fillText(t('learn.packet-structure.cv_packetExample'), cx, exY);

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
      ctx.fillText(t('learn.packet-structure.cv_ipUnchangedNote'), cx, noteY);

      ctx.fillStyle = '#ef5350';
      ctx.fillText(t('learn.packet-structure.cv_ttlNote'), cx, noteY + 22);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 4: Nesting overview ───
const step4_Nesting = {
  get title() { return t('learn.packet-structure.s3t'); },
  get content() { return t('learn.packet-structure.s3c'); },
  animation(ctx, w, h, elapsed) {
    const cx = w / 2;
    const centerY = h * 0.28;
    const phase = Math.min(elapsed / 3000, 1);

    // Same layers & sizing as Step 1
    const layers = [
      { label: 'Data',             color: '#69f0ae', border: '#69f0ae', desc: t('learn.packet-structure.cv_dataDesc') },
      { label: 'L4 Header',        color: '#ab47bc', border: '#ab47bc', desc: t('learn.packet-structure.cv_l4DescSimple') },
      { label: 'L3 Header',        color: '#4fc3f7', border: '#4fc3f7', desc: t('learn.packet-structure.cv_l3DescSimple') },
      { label: 'L2 Header',        color: '#ffa726', border: '#ffa726', desc: t('learn.packet-structure.cv_l2DescSimple') },
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
      const totalW = innerW + padW * 2 * (n - 1);
      const colW = totalW / 3;
      const annStartX = cx - totalW / 2;

      const devices = [
        { label: t('learn.packet-structure.cv_switchL2'), desc: t('learn.packet-structure.cv_switchL2Desc'), color: '#ffa726', looks: t('learn.packet-structure.cv_switchL2Looks') },
        { label: t('learn.packet-structure.cv_routerL3'), desc: t('learn.packet-structure.cv_routerL3Desc'), color: '#4fc3f7', looks: t('learn.packet-structure.cv_routerL3Looks') },
        { label: t('learn.packet-structure.cv_appLayer'), desc: t('learn.packet-structure.cv_appDesc'), color: '#69f0ae', looks: t('learn.packet-structure.cv_appLooks') },
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

// ─── Step 5: Summary ───
const step6_Summary = {
  get title() { return t('learn.packet-structure.s4t'); },
  get content() { return t('learn.packet-structure.s4c'); },
  animation(ctx, w, h, elapsed) {
    const items = [
      { text: t('learn.packet-structure.cv_sumEncap'), sub: t('learn.packet-structure.cv_sumEncapSub'), color: '#69f0ae' },
      { text: t('learn.packet-structure.cv_sumL2Frame'), sub: t('learn.packet-structure.cv_sumL2Sub'), color: '#ffa726' },
      { text: t('learn.packet-structure.cv_sumL3Packet'), sub: t('learn.packet-structure.cv_sumL3Sub'), color: '#4fc3f7' },
      { text: t('learn.packet-structure.cv_sumL4Segment'), sub: t('learn.packet-structure.cv_sumL4Sub'), color: '#ab47bc' },
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
    ctx.fillText(t('learn.packet-structure.cv_packetLabel'), cx, cy + 4);
  }
};

// ─── Export lesson ───
export const lessonPacketStructure = {
  id: 'lesson-packet-structure',
  get title() { return t('learn.packet-structure.title'); },
  get description() { return t('learn.packet-structure.desc'); },
  category: 'L3 Routing',
  steps: [
    step1_Encapsulation,
    step2_EthernetFrame,
    step3_IPPacket,
    step4_Nesting,
    step6_Summary,
  ],
};
