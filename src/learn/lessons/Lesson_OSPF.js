// ─── Lesson: OSPF Dynamic Routing ───
import { t } from '../../i18n/I18n.js';
import { drawRoundedRect, easeInOut } from '../CanvasUtils.js';

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

function drawRouter(ctx, x, y, r, label, color, sub) {
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
  if (sub) {
    ctx.font = '8px Consolas, monospace';
    ctx.fillStyle = '#8899aa';
    ctx.fillText(sub, x, y + r + 12);
  }
}

function drawLink(ctx, x1, y1, x2, y2, color) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ─── Step 1: Static vs Dynamic Routing ───
const step1_StaticVsDynamic = {
  get title() { return t('learn.ospf.s0t'); },
  get content() { return t('learn.ospf.s0c'); },
  animation(ctx, w, h, elapsed) {
    const phase = Math.min(elapsed / 2000, 1);
    const cx = w / 2;
    const rowY1 = h * 0.3;
    const rowY2 = h * 0.72;

    // ─ Static side (left half) ─
    const sPhase = easeInOut(Math.min(phase * 2, 1));
    ctx.globalAlpha = sPhase;

    const sLabelX = cx * 0.5;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ef5350';
    ctx.textAlign = 'center';
    ctx.fillText(t('learn.ospf.cv_static'), sLabelX, rowY1 - 28);

    // 3 routers in line (static side)
    const sR = [cx * 0.18, cx * 0.5, cx * 0.82];
    for (let i = 0; i < 3; i++) {
      drawRouter(ctx, sR[i], rowY1, 16, `R${i + 1}`, '#ef5350');
      if (i < 2) drawLink(ctx, sR[i] + 17, rowY1, sR[i + 1] - 17, rowY1, '#556');
    }

    // Manual route arrows (red, drawn individually)
    for (let i = 0; i < 3; i++) {
      const appear = easeInOut(Math.min(Math.max(sPhase * 3 - i * 0.7, 0), 1));
      ctx.globalAlpha = appear;
      drawRoundedRect(ctx, sR[i] - 28, rowY1 + 22, 56, 18, 3, '#ef535011', '#ef535066');
      ctx.font = '8px Consolas, monospace';
      ctx.fillStyle = '#ef5350';
      ctx.textAlign = 'center';
      ctx.fillText('ip route ...', sR[i], rowY1 + 34);
    }

    // ─ Dynamic side (right half) ─
    const dPhase = easeInOut(Math.min(Math.max(phase * 2 - 0.3, 0), 1));
    ctx.globalAlpha = dPhase;

    const dLabelX = cx * 0.5;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'center';
    ctx.fillText(t('learn.ospf.cv_dynamic'), cx + dLabelX, rowY2 - 28);

    const dR = [cx * 0.18 + cx, cx * 0.5 + cx, cx * 0.82 + cx];
    for (let i = 0; i < 3; i++) {
      drawRouter(ctx, dR[i], rowY2, 16, `R${i + 1}`, '#69f0ae');
      if (i < 2) drawLink(ctx, dR[i] + 17, rowY2, dR[i + 1] - 17, rowY2, '#556');
    }

    // OSPF auto labels
    const ospfCycle = 2000;
    const ospfT = ((elapsed - 1000) % ospfCycle) / ospfCycle;
    if (elapsed > 1000) {
      for (let i = 0; i < 3; i++) {
        const appear = easeInOut(Math.min(Math.max(dPhase * 3 - i * 0.5, 0), 1));
        ctx.globalAlpha = appear;
        drawRoundedRect(ctx, dR[i] - 24, rowY2 + 22, 48, 18, 3, '#69f0ae11', '#69f0ae66');
        ctx.font = 'bold 8px sans-serif';
        ctx.fillStyle = '#69f0ae';
        ctx.textAlign = 'center';
        ctx.fillText(t('learn.ospf.cv_auto'), dR[i], rowY2 + 34);
      }

      // Animated exchange packet
      const pktIdx = Math.floor(ospfT * 2);
      const pktT = easeInOut((ospfT * 2) % 1);
      const fromX = pktIdx === 0 ? dR[0] : dR[1];
      const toX = pktIdx === 0 ? dR[1] : dR[2];
      ctx.globalAlpha = dPhase;
      ctx.beginPath();
      ctx.arc(fromX + (toX - fromX) * pktT, rowY2, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffa726';
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Divider line
    const divAlpha = easeInOut(Math.min(elapsed / 1000, 1));
    ctx.globalAlpha = divAlpha * 0.4;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.52);
    ctx.lineTo(w * 0.95, h * 0.52);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#556';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
};

// ─── Step 2: OSPF Process & Network Statements ───
const step2_Config = {
  get title() { return t('learn.ospf.s1t'); },
  get content() { return t('learn.ospf.s1c'); },
  animation(ctx, w, h, elapsed) {
    const phase = Math.min(elapsed / 1500, 1);
    const cx = w / 2;

    // ── 上段: ネットワーク図 ──────────────────────────────
    const diagH = h * 0.42;
    const diagY = h * 0.02;
    const rY = diagY + diagH * 0.5;

    // Area 0 外枠: 左右バブルの内側、R1を中央に配置
    const netLEdge = (cx - w * 0.32) + Math.min(w * 0.14, 68) + w * 0.02;
    const netREdge = (cx + w * 0.32) - Math.min(w * 0.14, 68) - w * 0.02;
    const areaMarginX = netLEdge;
    const areaMarginY = diagY + diagH * 0.06;
    const areaW = netREdge - netLEdge;
    const areaH = diagH * 0.88;
    const areaPhase = easeInOut(Math.min(phase * 1.5, 1));
    ctx.globalAlpha = areaPhase;
    const r10 = 10;
    const ax = areaMarginX, ay = areaMarginY, aw = areaW, ah = areaH;
    ctx.beginPath();
    ctx.moveTo(ax + r10, ay);
    ctx.lineTo(ax + aw - r10, ay);
    ctx.quadraticCurveTo(ax + aw, ay, ax + aw, ay + r10);
    ctx.lineTo(ax + aw, ay + ah - r10);
    ctx.quadraticCurveTo(ax + aw, ay + ah, ax + aw - r10, ay + ah);
    ctx.lineTo(ax + r10, ay + ah);
    ctx.quadraticCurveTo(ax, ay + ah, ax, ay + ah - r10);
    ctx.lineTo(ax, ay + r10);
    ctx.quadraticCurveTo(ax, ay, ax + r10, ay);
    ctx.closePath();
    ctx.fillStyle = '#69f0ae18';
    ctx.fill();
    ctx.strokeStyle = '#69f0ae';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    // "Area 0" ラベル (上辺中央)
    const labelBgW = 72, labelBgH = 22;
    const labelCX = ax + aw / 2;
    drawRoundedRect(ctx, labelCX - labelBgW / 2, ay - labelBgH / 2, labelBgW, labelBgH, 5, '#0d1b2a', '#69f0ae');
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'center';
    ctx.fillText('Area 0', labelCX, ay + 4);
    ctx.globalAlpha = 1;

    // 左ネットワーク (192.168.1.0/24)
    const netLX = cx - w * 0.32;
    const netLR = Math.min(w * 0.14, 68);
    const net1Phase = easeInOut(Math.min(phase * 2, 1));
    ctx.globalAlpha = net1Phase;

    ctx.beginPath();
    ctx.arc(netLX, rY, netLR, 0, Math.PI * 2);
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
    ctx.fillText('192.168.1.0/24', netLX, rY - netLR - 8);
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#8899aa';
    ctx.fillText('LAN', netLX, rY - netLR + 4);

    // PCアイコン (左ネットワーク内)
    drawDevice(ctx, netLX - 16, rY + 10, 11, 'PC', '#4fc3f7');
    drawDevice(ctx, netLX + 16, rY + 10, 11, 'PC', '#4fc3f7');

    // 右ネットワーク (10.1.0.0/30)
    const netRX = cx + w * 0.32;
    const netRR = Math.min(w * 0.14, 68);
    const net2Phase = easeInOut(Math.min(Math.max(phase * 2 - 0.3, 0), 1));
    ctx.globalAlpha = net2Phase;

    ctx.beginPath();
    ctx.arc(netRX, rY, netRR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffa7260a';
    ctx.fill();
    ctx.strokeStyle = '#ffa72644';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = 'bold 11px Consolas, monospace';
    ctx.fillStyle = '#ffa726';
    ctx.textAlign = 'center';
    ctx.fillText('10.1.0.0/30', netRX, rY - netRR - 8);
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#8899aa';
    ctx.fillText('To R2', netRX, rY - netRR + 4);

    // R2アイコン (右ネットワーク内)
    drawRouter(ctx, netRX, rY + 6, 13, 'R2', '#ffa726');

    ctx.globalAlpha = 1;

    // R1ルーター (中央)
    const r1Phase = easeInOut(Math.min(Math.max(phase * 2 - 0.5, 0), 1));
    ctx.globalAlpha = r1Phase;
    drawLink(ctx, netLX + netLR, rY, cx - 22, rY, '#4fc3f744');
    drawLink(ctx, cx + 22, rY, netRX - netRR, rY, '#ffa72644');
    drawRouter(ctx, cx, rY, 22, 'R1', '#69f0ae');

    // インターフェースIPラベル
    ctx.font = '9px Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText('192.168.1.1', cx - 26, rY - 8);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffa726';
    ctx.fillText('10.1.0.1', cx + 26, rY - 8);

    // OSPF network ハイライト (アニメーション)
    if (phase >= 1) {
      const hlT = ((elapsed - 1500) % 3000) / 3000;
      const hlLeft = hlT < 0.5;
      const hlAlpha = Math.abs(Math.sin(elapsed / 600)) * 0.5 + 0.3;
      ctx.globalAlpha = hlAlpha;
      const hlX = hlLeft ? netLX : netRX;
      const hlR = hlLeft ? netLR : netRR;
      const hlColor = hlLeft ? '#4fc3f7' : '#ffa726';
      ctx.beginPath();
      ctx.arc(hlX, rY, hlR + 4, 0, Math.PI * 2);
      ctx.strokeStyle = hlColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // ── 下段: CLIパネル ──────────────────────────────────
    const cliY = diagY + diagH + h * 0.02;
    const cliH = h - cliY - h * 0.02;
    const cliX = w * 0.04;
    const cliW = w * 0.92;

    drawRoundedRect(ctx, cliX, cliY, cliW, cliH, 6, '#0d1b2a', '#1e3a5c');

    ctx.font = 'bold 12px Consolas, monospace';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'left';
    ctx.fillText('R1# configure terminal', cliX + 14, cliY + 22);

    const badgeW = 230;
    const badgeX = cliX + cliW - badgeW - 12;

    const lines = [
      { text: 'R1(config)# router ospf 1', color: '#4fc3f7', label: t('learn.ospf.cv_pid'), labelColor: '#4fc3f7' },
      { text: '  network 192.168.1.0 0.0.0.255 area 0', color: '#4fc3f7', label: t('learn.ospf.cv_lanIf'), labelColor: '#4fc3f7' },
      { text: '  network 10.1.0.0 0.0.0.3 area 0', color: '#ffa726', label: t('learn.ospf.cv_wanIf'), labelColor: '#ffa726' },
      { text: 'R1(config-router)# exit', color: '#8899aa', label: '', labelColor: '#8899aa' },
    ];

    const lineH = (cliH - 36) / (lines.length + 1);

    for (let i = 0; i < lines.length; i++) {
      const appear = easeInOut(Math.min(Math.max(phase * (lines.length + 1) - i * 0.8, 0), 1));
      if (appear <= 0) continue;
      ctx.globalAlpha = appear;

      const ly = cliY + 36 + i * lineH;
      ctx.font = '12px Consolas, monospace';
      ctx.fillStyle = lines[i].color;
      ctx.textAlign = 'left';
      ctx.fillText(lines[i].text, cliX + 14, ly);

      if (lines[i].label) {
        drawRoundedRect(ctx, badgeX, ly - 11, badgeW, 18, 4, lines[i].labelColor + '22', lines[i].labelColor);
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = lines[i].labelColor;
        ctx.textAlign = 'center';
        ctx.fillText(lines[i].label, badgeX + badgeW / 2, ly + 2);
      }
    }

    ctx.globalAlpha = 1;
  }
};

// ─── Step 3: Hello Packets & Neighbor Formation ───
const step3_HelloNeighbor = {
  get title() { return t('learn.ospf.s2t'); },
  get content() { return t('learn.ospf.s2c'); },
  animation(ctx, w, h, elapsed) {
    const cx = w / 2;
    const r1X = cx - w * 0.3;
    const r2X = cx + w * 0.3;
    const routerY = h * 0.38;

    // Link
    drawLink(ctx, r1X + 22, routerY, r2X - 22, routerY, '#1e3a5c');

    // Subnet label
    ctx.font = '9px Consolas, monospace';
    ctx.fillStyle = '#8899aa';
    ctx.textAlign = 'center';
    ctx.fillText('10.1.0.0/30', cx, routerY - 12);

    // Routers
    drawRouter(ctx, r1X, routerY, 22, 'R1', '#69f0ae', '10.1.0.1');
    drawRouter(ctx, r2X, routerY, 22, 'R2', '#4fc3f7', '10.1.0.2');

    // Phase logic
    const phaseDur = 3600;
    const cycle = elapsed % (phaseDur * 2);
    const isPhase2 = cycle >= phaseDur;
    const phaseT = (cycle % phaseDur) / phaseDur;
    const eT = easeInOut(Math.min(phaseT * 1.4, 1));

    const fromX = isPhase2 ? r2X : r1X;
    const toX = isPhase2 ? r1X : r2X;
    const fromColor = isPhase2 ? '#4fc3f7' : '#69f0ae';

    // Hello packet
    const pktX = fromX + (toX - fromX) * eT;
    ctx.beginPath();
    ctx.arc(pktX, routerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = fromColor;
    ctx.fill();

    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = fromColor;
    ctx.textAlign = 'center';
    ctx.fillText(t('learn.ospf.cv_hello'), pktX, routerY - 16);

    // Neighbor state display
    const stateY = h * 0.65;
    const stateW = Math.min(w * 0.8, 480);
    const stateX = (w - stateW) / 2;

    const states = [
      { label: 'DOWN', color: '#ef5350' },
      { label: 'INIT', color: '#ffa726' },
      { label: 'TWO-WAY', color: '#ffa726' },
      { label: 'FULL', color: '#69f0ae' },
    ];

    const stateIdx = Math.min(Math.floor(elapsed / 1800), 3);
    const stateW2 = stateW / states.length;

    for (let i = 0; i < states.length; i++) {
      const s = states[i];
      const isActive = i === stateIdx;
      const isPast = i < stateIdx;

      drawRoundedRect(ctx, stateX + i * stateW2 + 2, stateY, stateW2 - 4, 36, 5,
        isActive ? s.color + '22' : isPast ? '#69f0ae11' : '#1a2332',
        isActive ? s.color : isPast ? '#69f0ae66' : '#1e3a5c');

      ctx.font = isActive ? 'bold 10px sans-serif' : '9px sans-serif';
      ctx.fillStyle = isActive ? s.color : isPast ? '#69f0ae66' : '#445';
      ctx.textAlign = 'center';
      ctx.fillText(s.label, stateX + i * stateW2 + stateW2 / 2, stateY + 22);

      if (i < states.length - 1) {
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#445';
        ctx.fillText('→', stateX + (i + 1) * stateW2, stateY + 22);
      }
    }

    // Neighbor achieved label
    if (stateIdx >= 3) {
      const nAlpha = easeInOut(Math.min((elapsed - 5400) / 600, 1));
      ctx.globalAlpha = nAlpha;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#69f0ae';
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.ospf.cv_neighbor'), cx, stateY + 58);
      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 4: LSA Flooding & LSDB ───
const step4_LSA = {
  get title() { return t('learn.ospf.s3t'); },
  get content() { return t('learn.ospf.s3c'); },
  animation(ctx, w, h, elapsed) {
    const nodes = [
      { id: 'R1', x: w * 0.16, y: h * 0.38, color: '#69f0ae', net: '192.168.1.0/24' },
      { id: 'R2', x: w * 0.5,  y: h * 0.38, color: '#4fc3f7', net: '10.1.0.x/30' },
      { id: 'R3', x: w * 0.84, y: h * 0.38, color: '#ab47bc', net: '172.16.0.0/24' },
    ];

    // Draw links
    for (let i = 0; i < nodes.length - 1; i++) {
      drawLink(ctx, nodes[i].x + 22, nodes[i].y, nodes[i + 1].x - 22, nodes[i + 1].y, '#1e3a5c');
    }

    // Draw routers
    for (const n of nodes) {
      drawRouter(ctx, n.x, n.y, 22, n.id, n.color);
    }

    // LSA flooding animation
    const lsaCycle = 5000;
    const lt = elapsed % lsaCycle;
    const lsaPhase = lt / lsaCycle;

    // 3 waves: each router floods its LSA
    for (let wave = 0; wave < 3; wave++) {
      const waveStart = wave * 0.28;
      const waveT = Math.min(Math.max((lsaPhase - waveStart) * 3, 0), 1);
      if (waveT <= 0) continue;

      const src = nodes[wave];

      // Packet to right
      if (wave < 2) {
        const dst = nodes[wave + 1];
        const rt = Math.min(waveT * 2, 1);
        if (rt > 0 && rt < 1) {
          const px = src.x + (dst.x - src.x) * easeInOut(rt);
          ctx.beginPath();
          ctx.arc(px, src.y - 8, 5, 0, Math.PI * 2);
          ctx.fillStyle = src.color;
          ctx.fill();
          ctx.font = 'bold 8px sans-serif';
          ctx.fillStyle = src.color;
          ctx.textAlign = 'center';
          ctx.fillText(t('learn.ospf.cv_lsa'), px, src.y - 22);
        }

        // From R2, also floods right to R3
        if (wave === 0 && waveT > 0.5) {
          const rt2 = Math.min((waveT - 0.5) * 2, 1);
          if (rt2 > 0 && rt2 < 1) {
            const px2 = nodes[1].x + (nodes[2].x - nodes[1].x) * easeInOut(rt2);
            ctx.beginPath();
            ctx.arc(px2, nodes[1].y - 8, 5, 0, Math.PI * 2);
            ctx.fillStyle = src.color;
            ctx.fill();
          }
        }
      }

      // Packet to left
      if (wave > 0) {
        const dst = nodes[wave - 1];
        const rt = Math.min(waveT * 2, 1);
        if (rt > 0 && rt < 1) {
          const px = src.x + (dst.x - src.x) * easeInOut(rt);
          ctx.beginPath();
          ctx.arc(px, src.y + 8, 5, 0, Math.PI * 2);
          ctx.fillStyle = src.color;
          ctx.fill();
        }
      }
    }

    // LSDB panels below each router
    const lsdbY = h * 0.62;
    const panelW = Math.min(w * 0.24, 150);
    const panelH = h * 0.28;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const px = n.x - panelW / 2;
      const appear = easeInOut(Math.min(Math.max(elapsed / 4000 - i * 0.25, 0), 1));
      ctx.globalAlpha = appear;

      drawRoundedRect(ctx, px, lsdbY, panelW, panelH, 4, '#0d1b2a', n.color + '66');

      ctx.font = 'bold 8px sans-serif';
      ctx.fillStyle = n.color;
      ctx.textAlign = 'center';
      ctx.fillText(t('learn.ospf.cv_lsdb'), n.x, lsdbY + 14);

      // Entries in LSDB
      const entries = ['192.168.1.0/24', '10.1.0.x/30', '172.16.0.0/24'];
      for (let j = 0; j < entries.length; j++) {
        const entryAppear = easeInOut(Math.min(Math.max(elapsed / 4000 - i * 0.25 - j * 0.15, 0), 1));
        ctx.globalAlpha = entryAppear;
        ctx.font = '8px Consolas, monospace';
        ctx.fillStyle = nodes[j].color;
        ctx.textAlign = 'center';
        ctx.fillText(entries[j], n.x, lsdbY + 28 + j * 16);
      }
    }

    ctx.globalAlpha = 1;
  }
};

// ─── Step 5: OSPF Routes in Routing Table ───
const step5_Routes = {
  get title() { return t('learn.ospf.s4t'); },
  get content() { return t('learn.ospf.s4c'); },
  animation(ctx, w, h, elapsed) {
    const phase = Math.min(elapsed / 2000, 1);

    // Router
    const rX = w * 0.14;
    const rY = h * 0.2;
    drawRouter(ctx, rX, rY, 20, 'R1', '#69f0ae');

    // Routing table panel
    const tableX = w * 0.3;
    const tableY = 10;
    const tableW = w * 0.65;
    const tableH = h * 0.92;

    drawRoundedRect(ctx, tableX, tableY, tableW, tableH, 6, '#0d1b2a', '#1e3a5c');

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'left';
    ctx.fillText('R1# show ip route', tableX + 12, tableY + 22);

    const headerY = tableY + 36;
    const colX = [tableX + 12, tableX + tableW * 0.14, tableX + tableW * 0.52, tableX + tableW * 0.78];

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

    const routes = [
      { type: 'C', net: '192.168.1.0/24', hop: 'directly connected', iface: 'Gi0/0', color: '#69f0ae' },
      { type: 'C', net: '10.1.0.0/30',    hop: 'directly connected', iface: 'Gi0/1', color: '#69f0ae' },
      { type: 'O', net: '10.1.0.4/30',    hop: '10.1.0.2',          iface: 'Gi0/1', color: '#ffa726' },
      { type: 'O', net: '172.16.0.0/24',  hop: '10.1.0.2',          iface: 'Gi0/1', color: '#ffa726' },
    ];

    const rowH = Math.min(36, (tableH - 60) / routes.length);

    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      const appear = easeInOut(Math.min(Math.max(phase * 5 - i * 0.7, 0), 1));
      if (appear <= 0) continue;

      ctx.globalAlpha = appear;
      const ry = headerY + 18 + i * rowH;

      // Highlight O routes
      if (r.type === 'O') {
        drawRoundedRect(ctx, tableX + 4, ry - 10, tableW - 8, rowH - 4, 3, '#ffa72611', '#ffa72633');
      }

      // Type badge
      drawRoundedRect(ctx, colX[0], ry - 8, 18, 16, 3, r.color + '22', r.color);
      ctx.font = 'bold 10px Consolas, monospace';
      ctx.fillStyle = r.color;
      ctx.textAlign = 'center';
      ctx.fillText(r.type, colX[0] + 9, ry + 4);

      ctx.font = '11px Consolas, monospace';
      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'left';
      ctx.fillText(r.net, colX[1], ry + 4);

      ctx.font = '10px Consolas, monospace';
      ctx.fillStyle = '#8899aa';
      ctx.fillText(r.hop, colX[2], ry + 4);

      ctx.fillStyle = r.color;
      ctx.fillText(r.iface, colX[3], ry + 4);
    }

    ctx.globalAlpha = 1;

    // O route legend
    if (phase >= 1) {
      const lp = easeInOut(Math.min((elapsed - 2000) / 600, 1));
      ctx.globalAlpha = lp;
      const ly = tableY + tableH - 20;
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#ffa726';
      ctx.textAlign = 'left';
      ctx.fillText(t('learn.ospf.cv_ospfRoute') + '  — AD 110 (auto-learned via OSPF)', tableX + 12, ly);
      ctx.globalAlpha = 1;
    }
  }
};

// ─── Step 6: Summary ───
const step6_Summary = {
  get title() { return t('learn.ospf.s5t'); },
  get content() { return t('learn.ospf.s5c'); },
  animation(ctx, w, h, elapsed) {
    const items = [
      { text: t('learn.ospf.cv_sumOspf'),   sub: t('learn.ospf.cv_sumOspfSub'),   color: '#69f0ae' },
      { text: t('learn.ospf.cv_sumHello'),  sub: t('learn.ospf.cv_sumHelloSub'),  color: '#4fc3f7' },
      { text: t('learn.ospf.cv_sumLsa'),    sub: t('learn.ospf.cv_sumLsaSub'),    color: '#ffa726' },
      { text: t('learn.ospf.cv_sumSpf'),    sub: t('learn.ospf.cv_sumSpfSub'),    color: '#ab47bc' },
      { text: t('learn.ospf.cv_sumRoute'),  sub: t('learn.ospf.cv_sumRouteSub'),  color: '#ef5350' },
    ];

    const cx = w / 2;
    const cy = h * 0.45;
    const radius = Math.min(h * 0.32, w * 0.22);
    const rot = elapsed / 9000 * Math.PI * 2;

    for (let i = 0; i < items.length; i++) {
      const angle = rot + (Math.PI * 2 / items.length) * i - Math.PI / 2;
      const appear = easeInOut(Math.min(elapsed / 900 - i * 0.3, 1));
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

      ctx.font = 'bold 11px sans-serif';
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
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#1a2332';
    ctx.fill();
    ctx.strokeStyle = '#69f0ae';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#69f0ae';
    ctx.textAlign = 'center';
    ctx.fillText('OSPF', cx, cy + 4);
  }
};

// ─── Export lesson ───
export const lessonOspf = {
  id: 'lesson-ospf',
  get title() { return t('learn.ospf.title'); },
  get description() { return t('learn.ospf.desc'); },
  category: 'L3 Routing',
  steps: [
    step1_StaticVsDynamic,
    step2_Config,
    step3_HelloNeighbor,
    step4_LSA,
    step5_Routes,
    step6_Summary,
  ],
};
