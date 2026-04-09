// ─── Lesson: Ethernet & L2 Switch Basics ───
// MAC addresses, switch learning/forwarding, broadcast domain, VLAN.

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

function drawSwitch(ctx, x, y, w, hh, label, color) {
  drawRoundedRect(ctx, x - w / 2, y - hh / 2, w, hh, 6, '#1a2332', color);
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 4);
}

// ─── Step 1: MAC Address ───
const step1_MACAddress = {
  get title() { return t('learn.ethernet-switch.s0t'); },
  get content() { return t('learn.ethernet-switch.s0c'); },
  animation(ctx, w, h, elapsed) {
    const mac = ['AA', 'BB', 'CC', '11', '22', '33'];
    const phase = Math.min(elapsed / 2500, 1);

    // MAC address display
    const boxW = Math.min(52, (w - 100) / 6);
    const boxH = 44;
    const gap = 6;
    const totalW = boxW * 6 + gap * 5;
    const startX = (w - totalW) / 2;
    const cy = h * 0.2;

    ctx.font = 'bold 14px Consolas, monospace';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'center';
    ctx.fillText('MAC Address (48 bits)', w / 2, cy - 36);

    for (let i = 0; i < 6; i++) {
      const appear = easeInOut(Math.min(Math.max(phase * 6 - i * 0.6, 0), 1));
      if (appear <= 0) continue;
      ctx.globalAlpha = appear;

      const x = startX + i * (boxW + gap);
      const isOUI = i < 3;
      const color = isOUI ? '#ffa726' : '#4fc3f7';

      drawRoundedRect(ctx, x, cy, boxW, boxH, 6, color + '1a', color);

      ctx.font = 'bold 18px Consolas, monospace';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(mac[i], x + boxW / 2, cy + 28);

      // Colon separator
      if (i < 5) {
        ctx.font = 'bold 18px Consolas, monospace';
        ctx.fillStyle = '#556';
        ctx.fillText(':', x + boxW + gap / 2, cy + 28);
      }
    }
    ctx.globalAlpha = 1;

    // OUI / Device brackets
    if (phase > 0.7) {
      const bp = easeInOut(Math.min((phase - 0.7) / 0.3, 1));
      ctx.globalAlpha = bp;

      const bracketY = cy + boxH + 10;

      // OUI bracket
      const ouiEnd = startX + 3 * (boxW + gap) - gap;
      ctx.beginPath();
      ctx.moveTo(startX, bracketY);
      ctx.lineTo(startX, bracketY + 6);
      ctx.lineTo(ouiEnd, bracketY + 6);
      ctx.lineTo(ouiEnd, bracketY);
      ctx.strokeStyle = '#ffa726';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffa726';
      ctx.textAlign = 'center';
      ctx.fillText('OUI (\u30e1\u30fc\u30ab\u30fc)', (startX + ouiEnd) / 2, bracketY + 22);

      // Device bracket
      const devStart = ouiEnd + gap;
      const devEnd = startX + 6 * (boxW + gap) - gap;
      ctx.beginPath();
      ctx.moveTo(devStart, bracketY);
      ctx.lineTo(devStart, bracketY + 6);
      ctx.lineTo(devEnd, bracketY + 6);
      ctx.lineTo(devEnd, bracketY);
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#4fc3f7';
      ctx.textAlign = 'center';
      ctx.fillText('Device ID (\u56fa\u6709)', (devStart + devEnd) / 2, bracketY + 22);

      ctx.globalAlpha = 1;
    }

    // Comparison: IP vs MAC
    if (phase >= 1) {
      const cp = easeInOut(Math.min((elapsed - 2500) / 800, 1));
      ctx.globalAlpha = cp;

      const compY = h * 0.62;
      const compW = Math.min(180, (w - 40) / 2);

      // IP card
      drawRoundedRect(ctx, w / 2 - compW - 10, compY, compW, 56, 6, '#69f0ae11', '#69f0ae');
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'center';
      ctx.fillText('IP Address', w / 2 - compW / 2 - 10, compY + 18);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.fillText('\u8ad6\u7406\u30a2\u30c9\u30ec\u30b9\uff08\u5909\u66f4\u53ef\uff09', w / 2 - compW / 2 - 10, compY + 36);
      ctx.fillText('L3 - \u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u5c64', w / 2 - compW / 2 - 10, compY + 50);

      // MAC card
      drawRoundedRect(ctx, w / 2 + 10, compY, compW, 56, 6, '#ab47bc11', '#ab47bc');
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#ab47bc';
      ctx.textAlign = 'center';
      ctx.fillText('MAC Address', w / 2 + compW / 2 + 10, compY + 18);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.fillText('\u7269\u7406\u30a2\u30c9\u30ec\u30b9\uff08\u56fa\u5b9a\uff09', w / 2 + compW / 2 + 10, compY + 36);
      ctx.fillText('L2 - \u30c7\u30fc\u30bf\u30ea\u30f3\u30af\u5c64', w / 2 + compW / 2 + 10, compY + 50);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 2: L2 Switch operation ───
const step2_SwitchOperation = {
  get title() { return t('learn.ethernet-switch.s1t'); },
  get content() { return t('learn.ethernet-switch.s1c'); },
  animation(ctx, w, h, elapsed) {
    const cx = w / 2;
    const swY = h * 0.38;
    const pcY = h * 0.75;
    const pcR = 16;
    const pcs = [
      { label: 'PC1', mac: 'AA:11', x: cx - w * 0.3, color: '#4fc3f7' },
      { label: 'PC2', mac: 'BB:22', x: cx - w * 0.1, color: '#69f0ae' },
      { label: 'PC3', mac: 'CC:33', x: cx + w * 0.1, color: '#ffa726' },
      { label: 'PC4', mac: 'DD:44', x: cx + w * 0.3, color: '#ab47bc' },
    ];

    // Draw switch
    drawSwitch(ctx, cx, swY, 100, 36, 'Switch', '#ffa726');

    // Port labels on switch
    for (let i = 0; i < 4; i++) {
      const px = cx - 30 + i * 20;
      ctx.font = '8px Consolas, monospace';
      ctx.fillStyle = '#556';
      ctx.textAlign = 'center';
      ctx.fillText('P' + (i + 1), px, swY + 24);
    }

    // Draw PCs and links
    for (const pc of pcs) {
      drawDevice(ctx, pc.x, pcY, pcR, pc.label, pc.color, pc.mac);
      ctx.beginPath();
      ctx.moveTo(pc.x, pcY - pcR - 2);
      ctx.lineTo(cx + (pc.x - cx) * 0.15, swY + 18);
      ctx.strokeStyle = '#1e3a5c';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 3 phases: ARP Request → ARP Reply → Data
    const totalCycle = 12000;
    const t = elapsed % totalCycle;
    const stageTime = totalCycle / 3;

    // MAC address table (above switch)
    const tableW = 130;
    const tableH = 58;
    const tableX = cx - tableW / 2;
    const tableY = swY - 18 - tableH - 8;
    drawRoundedRect(ctx, tableX, tableY, tableW, tableH, 4, '#0d1b2a', '#1e3a5c');
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'center';
    ctx.fillText('MAC Table', cx, tableY + 14);

    let stage;
    if (t < stageTime) {
      stage = 0; // ARP Request
    } else if (t < stageTime * 2) {
      stage = 1; // ARP Reply
    } else {
      stage = 2; // Data
    }

    const stageT = (t % stageTime) / stageTime;
    const packetProgress = easeInOut(Math.min(stageT * 2, 1));

    // Stage label
    const stages = [
      { label: '1. ARP Request', desc: 'Learning + Flooding', color: '#ef5350' },
      { label: '2. ARP Reply',   desc: 'Learning + Forwarding', color: '#ffa726' },
      { label: '3. Data',        desc: 'Forwarding', color: '#69f0ae' },
    ];
    const stg = stages[stage];

    drawRoundedRect(ctx, 10, 8, 155, 32, 4, stg.color + '1a', stg.color);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = stg.color;
    ctx.textAlign = 'left';
    ctx.fillText(stg.label, 18, 22);
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#8899aa';
    ctx.fillText(stg.desc, 18, 34);

    // MAC table entries — clear and redraw per stage
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(tableX + 1, tableY + 18, tableW - 2, tableH - 20);

    ctx.font = '9px Consolas, monospace';
    ctx.textAlign = 'center';
    // AA:11 appears after packet reaches switch in stage 0
    if (stage > 0 || (stage === 0 && packetProgress >= 0.4)) {
      ctx.fillStyle = pcs[0].color;
      ctx.fillText('AA:11 \u2192 P1', cx, tableY + 30);
    }
    // CC:33 appears after packet reaches switch in stage 1
    if (stage > 1 || (stage === 1 && packetProgress >= 0.4)) {
      ctx.fillStyle = pcs[2].color;
      ctx.fillText('CC:33 \u2192 P3', cx, tableY + 44);
    }

    // Packet animation
    if (stage === 0) {
      // ARP Request: PC1 → Switch (learn AA:11) → Flood to all
      if (packetProgress < 0.4) {
        // PC1 → Switch
        const p = packetProgress / 0.4;
        const px = pcs[0].x + (cx - pcs[0].x) * p;
        const py = pcY - pcR + (swY - pcY + pcR) * p;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ef5350';
        ctx.fill();
      } else if (packetProgress < 0.9) {
        // Switch → all other PCs (flood)
        const p = (packetProgress - 0.4) / 0.5;
        for (let i = 1; i < 4; i++) {
          const px = cx + (pcs[i].x - cx) * p;
          const py = swY + (pcY - pcR - swY) * p;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ef5350';
          ctx.fill();
        }
      }
    } else if (stage === 1) {
      // ARP Reply: PC3 → Switch (learn CC:33) → Forward to PC1 only
      if (packetProgress < 0.4) {
        // PC3 → Switch
        const p = packetProgress / 0.4;
        const px = pcs[2].x + (cx - pcs[2].x) * p;
        const py = pcY - pcR + (swY - pcY + pcR) * p;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffa726';
        ctx.fill();
      } else if (packetProgress < 0.9) {
        // Switch → PC1 only (forwarding: AA:11 is on P1)
        const p = (packetProgress - 0.4) / 0.5;
        const px = cx + (pcs[0].x - cx) * p;
        const py = swY + (pcY - pcR - swY) * p;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffa726';
        ctx.fill();
      }
    } else if (stage === 2) {
      // Data: PC1 → Switch → PC3 only (forwarding: CC:33 is on P3)
      if (packetProgress < 0.4) {
        // PC1 → Switch
        const p = packetProgress / 0.4;
        const px = pcs[0].x + (cx - pcs[0].x) * p;
        const py = pcY - pcR + (swY - pcY + pcR) * p;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#69f0ae';
        ctx.fill();
      } else if (packetProgress < 0.9) {
        // Switch → PC3 only
        const p = (packetProgress - 0.4) / 0.5;
        const px = cx + (pcs[2].x - cx) * p;
        const py = swY + (pcY - pcR - swY) * p;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#69f0ae';
        ctx.fill();
      }
    }
  }
};

// ─── Step 3: Broadcast Domain ───
const step3_BroadcastDomain = {
  get title() { return t('learn.ethernet-switch.s2t'); },
  get content() { return t('learn.ethernet-switch.s2c'); },
  animation(ctx, w, h, elapsed) {
    const phase = Math.min(elapsed / 2000, 1);

    // Left: single broadcast domain
    const leftX = w * 0.28;
    const rightX = w * 0.72;
    const domainY = h * 0.35;
    const domainR = Math.min(h * 0.28, w * 0.2);

    // Left domain circle
    const leftAlpha = easeInOut(Math.min(phase * 2, 1));
    ctx.globalAlpha = leftAlpha;

    ctx.beginPath();
    ctx.arc(leftX, domainY, domainR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffa72611';
    ctx.fill();
    ctx.strokeStyle = '#ffa72666';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'center';
    ctx.fillText('Broadcast Domain', leftX, domainY - domainR - 8);
    ctx.fillText('(\u30b9\u30a4\u30c3\u30c1\u306e\u307f)', leftX, domainY - domainR + 6);

    // Switch in center
    drawSwitch(ctx, leftX, domainY - 10, 60, 26, 'SW', '#ffa726');

    // PCs around
    const pcCount = 6;
    for (let i = 0; i < pcCount; i++) {
      const angle = (Math.PI * 2 / pcCount) * i + Math.PI * 0.4;
      const px = leftX + Math.cos(angle) * domainR * 0.65;
      const py = domainY + Math.sin(angle) * domainR * 0.65;
      drawDevice(ctx, px, py, 10, '', '#8899aa');
    }

    // Broadcast wave animation
    const waveT = (elapsed % 2000) / 2000;
    const waveR = domainR * 0.7 * waveT;
    ctx.beginPath();
    ctx.arc(leftX, domainY - 10, waveR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,167,38,${0.5 * (1 - waveT)})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.globalAlpha = 1;

    // Right: router separates domains
    const rightAlpha = easeInOut(Math.min(Math.max(phase * 2 - 0.8, 0), 1));
    ctx.globalAlpha = rightAlpha;

    // Two small domains
    const smallR = domainR * 0.52;
    const domTopY = domainY - smallR * 0.55;
    const domBotY = domainY + smallR * 0.55;

    // Domain 1
    ctx.beginPath();
    ctx.arc(rightX, domTopY, smallR, 0, Math.PI * 2);
    ctx.fillStyle = '#4fc3f711';
    ctx.fill();
    ctx.strokeStyle = '#4fc3f766';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    drawSwitch(ctx, rightX, domTopY, 40, 18, 'SW1', '#ffa726');
    for (let i = 0; i < 3; i++) {
      // Place PCs in upper half of domain 1 (away from router)
      const angle = -Math.PI * 1.05 + (Math.PI * 0.55) * i;
      const px = rightX + Math.cos(angle) * smallR * 0.65;
      const py = domTopY + Math.sin(angle) * smallR * 0.6;
      drawDevice(ctx, px, py, 8, '', '#4fc3f7');
    }

    // Domain 2
    ctx.beginPath();
    ctx.arc(rightX, domBotY, smallR, 0, Math.PI * 2);
    ctx.fillStyle = '#69f0ae11';
    ctx.fill();
    ctx.strokeStyle = '#69f0ae66';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    drawSwitch(ctx, rightX, domBotY, 40, 18, 'SW2', '#ffa726');
    for (let i = 0; i < 3; i++) {
      // Place PCs in lower-right of domain 2 (away from router)
      const angle = Math.PI * 0.15 + (Math.PI * 0.35) * i;
      const px = rightX + Math.cos(angle) * smallR * 0.7;
      const py = domBotY + Math.sin(angle) * smallR * 0.7;
      drawDevice(ctx, px, py, 8, '', '#69f0ae');
    }

    // Broadcast waves inside each domain (contained by router)
    const wave2T = (elapsed % 2500) / 2500;
    const wave2R = smallR * 0.6 * wave2T;

    // Domain 1 wave
    ctx.beginPath();
    ctx.arc(rightX, domTopY, wave2R, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(79,195,247,${0.5 * (1 - wave2T)})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Domain 2 wave (offset timing)
    const wave3T = ((elapsed + 1250) % 2500) / 2500;
    const wave3R = smallR * 0.6 * wave3T;
    ctx.beginPath();
    ctx.arc(rightX, domBotY, wave3R, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(105,240,174,${0.5 * (1 - wave3T)})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Router between domains
    ctx.beginPath();
    ctx.arc(rightX, domainY, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#1a2332';
    ctx.fill();
    ctx.strokeStyle = '#69f0ae';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'center';
    ctx.fillText('R', rightX, domainY + 3);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.fillText('Router\u3067\u5206\u5272', rightX, domainY - domainR - 8);

    // Stop symbol on router
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#ef5350';
    ctx.fillText('\u2716 Broadcast\u3092\u901a\u3055\u306a\u3044', rightX, domainY + domainR + 14);

    ctx.globalAlpha = 1;
  }
};

// ─── Step 4: VLAN concept ───
const step4_VLAN = {
  get title() { return t('learn.ethernet-switch.s3t'); },
  get content() { return t('learn.ethernet-switch.s3c'); },
  animation(ctx, w, h, elapsed) {
    const cx = w / 2;
    const swY = h * 0.3;
    const phase = Math.min(elapsed / 2500, 1);

    // Switch
    drawSwitch(ctx, cx, swY, 140, 40, 'Switch', '#ffa726');

    // Ports label
    ctx.font = '8px Consolas, monospace';
    ctx.fillStyle = '#556';
    ctx.textAlign = 'center';
    for (let i = 0; i < 6; i++) {
      ctx.fillText('P' + (i + 1), cx - 50 + i * 20, swY + 28);
    }

    // VLAN 10 (left side, blue)
    const vlan10PCs = [
      { x: cx - w * 0.3, y: h * 0.65 },
      { x: cx - w * 0.15, y: h * 0.65 },
      { x: cx - w * 0.05, y: h * 0.72 },
    ];

    // VLAN 20 (right side, green)
    const vlan20PCs = [
      { x: cx + w * 0.05, y: h * 0.72 },
      { x: cx + w * 0.15, y: h * 0.65 },
      { x: cx + w * 0.3, y: h * 0.65 },
    ];

    // VLAN 10 area
    const v10Phase = easeInOut(Math.min(phase * 2, 1));
    ctx.globalAlpha = v10Phase;

    // VLAN 10 background
    const v10Left = cx - w * 0.38;
    const v10Right = cx - w * 0.0;
    const v10Top = swY + 24;
    const v10Bot = h * 0.82;
    drawRoundedRect(ctx, v10Left, v10Top, v10Right - v10Left, v10Bot - v10Top, 8, '#4fc3f70a', '#4fc3f744');

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'center';
    ctx.fillText('VLAN 10', (v10Left + v10Right) / 2, v10Top + 16);

    for (const pc of vlan10PCs) {
      drawDevice(ctx, pc.x, pc.y, 14, 'PC', '#4fc3f7');
      ctx.beginPath();
      ctx.moveTo(pc.x, pc.y - 16);
      ctx.lineTo(cx + (pc.x - cx) * 0.15, swY + 20);
      ctx.strokeStyle = '#4fc3f744';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // VLAN 20 area
    const v20Phase = easeInOut(Math.min(Math.max(phase * 2 - 0.5, 0), 1));
    ctx.globalAlpha = v20Phase;

    const v20Left = cx + w * 0.0;
    const v20Right = cx + w * 0.38;
    drawRoundedRect(ctx, v20Left, v10Top, v20Right - v20Left, v10Bot - v10Top, 8, '#69f0ae0a', '#69f0ae44');

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'center';
    ctx.fillText('VLAN 20', (v20Left + v20Right) / 2, v10Top + 16);

    for (const pc of vlan20PCs) {
      drawDevice(ctx, pc.x, pc.y, 14, 'PC', '#69f0ae');
      ctx.beginPath();
      ctx.moveTo(pc.x, pc.y - 16);
      ctx.lineTo(cx + (pc.x - cx) * 0.15, swY + 20);
      ctx.strokeStyle = '#69f0ae44';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Isolation indicator
    if (phase >= 1) {
      const ip = easeInOut(Math.min((elapsed - 2500) / 600, 1));
      ctx.globalAlpha = ip;

      ctx.beginPath();
      ctx.moveTo(cx, v10Top + 30);
      ctx.lineTo(cx, v10Bot - 10);
      ctx.strokeStyle = '#ef5350';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ef5350';
      ctx.textAlign = 'center';
      ctx.fillText('\u2716 \u901a\u4fe1\u4e0d\u53ef', cx, v10Bot + 6);

      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 5: Summary ───
const step5_Summary = {
  get title() { return t('learn.ethernet-switch.s4t'); },
  get content() { return t('learn.ethernet-switch.s4c'); },
  animation(ctx, w, h, elapsed) {
    const items = [
      { text: 'MAC Address', sub: '48bit \u7269\u7406\u30a2\u30c9\u30ec\u30b9', color: '#ffa726' },
      { text: 'L2 Switch',   sub: 'MAC\u30c6\u30fc\u30d6\u30eb\u8ee2\u9001', color: '#4fc3f7' },
      { text: 'Broadcast',   sub: '\u30c9\u30e1\u30a4\u30f3\u5168\u4f53\u306b\u5c4a\u304f', color: '#ef5350' },
      { text: 'VLAN',        sub: '\u8ad6\u7406\u5206\u5272', color: '#69f0ae' },
      { text: 'Router',      sub: '\u30c9\u30e1\u30a4\u30f3\u9593\u8ee2\u9001', color: '#ab47bc' },
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
    ctx.strokeStyle = '#ffa726';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'center';
    ctx.fillText('L2', cx, cy + 4);
  }
};

// ─── Export lesson ───
export const lessonEthernetSwitch = {
  id: 'lesson-ethernet-switch',
  get title() { return t('learn.ethernet-switch.title'); },
  get description() { return t('learn.ethernet-switch.desc'); },
  category: 'L2 Switching',
  steps: [
    step1_MACAddress,
    step2_SwitchOperation,
    step3_BroadcastDomain,
    step4_VLAN,
    step5_Summary,
  ],
};
