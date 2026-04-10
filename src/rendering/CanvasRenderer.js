// ─── Canvas Renderer: Main drawing orchestrator ───
import { drawRouter, drawSwitch, drawPC, drawPrinter, drawFirewall, drawServer } from './DeviceRenderer.js';
import { drawLink, getDeviceEdgePoint } from './LinkRenderer.js';

export class CanvasRenderer {
  constructor(canvas, store, eventBus) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = store;
    this.eventBus = eventBus;
    this.dpr = window.devicePixelRatio || 1;
    this.pingAnimId = 0;
    this.pingAnimRunning = false;
    this._panning = false;
    this._panStart = null;

    // Bind events
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    canvas.addEventListener('mousedown', (e) => this._onPanStart(e));
    canvas.addEventListener('mousemove', (e) => this._onPanMove(e));
    canvas.addEventListener('mouseup', (e) => this._onPanEnd(e));
    canvas.addEventListener('mouseleave', (e) => this._onPanEnd(e));
    canvas.addEventListener('dblclick', (e) => this._onDblClick(e));
    eventBus.on('topology:changed', () => { if (!this.pingAnimRunning) this.draw(); });
    eventBus.on('device:switched', () => this.draw());
    eventBus.on('command:executed', () => { if (!this.pingAnimRunning) this.draw(); });
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.draw();
  }

  fitView() {
    this.resize();
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    this.store.fitView(w, h);
  }

  // Convert screen (CSS pixel) coordinates to logical coordinates
  screenToLogical(screenX, screenY) {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    const { zoom, panX, panY } = this.store.viewState;
    return {
      x: (screenX - panX) / (zoom * w / 800),
      y: (screenY - panY) / (zoom * h / 560),
    };
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    // Clear in screen space (before zoom/pan transform)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Apply zoom/pan
    const { zoom, panX, panY } = this.store.viewState;
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
    ctx.textAlign = 'left';

    const scaleX = w / 800;
    const scaleY = h / 560;
    const sx = (x) => x * scaleX;
    const sy = (y) => y * scaleY;

    const devices = this.store.getDevices();
    const links = this.store.getLinks();
    const currentDeviceId = this.store.getCurrentDeviceId();

    // Draw grid background in design mode
    if (this.store.designMode) {
      ctx.save();
      ctx.strokeStyle = '#1a2332';
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let gx = 0; gx <= 800; gx += gridSize) {
        ctx.beginPath(); ctx.moveTo(sx(gx), 0); ctx.lineTo(sx(gx), h); ctx.stroke();
      }
      for (let gy = 0; gy <= 560; gy += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, sy(gy)); ctx.lineTo(w, sy(gy)); ctx.stroke();
      }
      ctx.restore();
    }

    // Draw links — compute parallel offset for links between the same device pair
    const pairCount = {};
    const pairIndex = {};
    for (const link of links) {
      const key = [link.from, link.to].sort().join('::');
      pairCount[key] = (pairCount[key] || 0) + 1;
    }
    for (const link of links) {
      const key = [link.from, link.to].sort().join('::');
      const total = pairCount[key];
      if (!pairIndex[key]) pairIndex[key] = 0;
      const idx = pairIndex[key]++;
      const offset = total > 1 ? (idx - (total - 1) / 2) * 20 : 0;
      drawLink(ctx, link, devices, sx, sy, offset, idx);
    }

    // Draw devices
    for (const [id, dv] of Object.entries(devices)) {
      const x = sx(dv.x);
      const y = sy(dv.y);
      const isSelected = id === currentDeviceId;

      if (isSelected) { ctx.shadowColor = '#4fc3f7'; ctx.shadowBlur = 15; }

      if (dv.type === 'router') drawRouter(ctx, x, y, dv, isSelected);
      else if (dv.type === 'switch') drawSwitch(ctx, x, y, dv, isSelected);
      else if (dv.type === 'firewall') drawFirewall(ctx, x, y, dv, isSelected);
      else if (dv.type === 'server') drawServer(ctx, x, y, dv, isSelected);
      else if (dv.icon === 'printer') drawPrinter(ctx, x, y, dv, isSelected);
      else drawPC(ctx, x, y, dv, isSelected);

      ctx.shadowBlur = 0;

      // Hostname
      ctx.font = 'bold 13px Segoe UI, sans-serif';
      ctx.fillStyle = isSelected ? '#4fc3f7' : '#aab';
      ctx.textAlign = 'center';
      ctx.fillText(dv.hostname, x, y + (dv.type === 'pc' ? 40 : dv.type === 'server' ? 28 : 35));

      // Device-type info display
      ctx.font = '10px Consolas, monospace';
      if (dv.type === 'switch' && dv.vlans) {
        const count = Object.keys(dv.vlans).length;
        ctx.fillStyle = '#ffa72680';
        ctx.fillText(count + ' VLANs', x, y + 47);
      }
      if (dv.type === 'router' && dv.routes && dv.routes.length > 0) {
        ctx.fillStyle = '#69f0ae80';
        ctx.fillText(dv.routes.length + ' route' + (dv.routes.length > 1 ? 's' : ''), x, y + 47);
      }
      if (dv.type === 'firewall') {
        const pCount = dv.policies ? dv.policies.length : 0;
        ctx.fillStyle = '#ef535080';
        ctx.fillText(pCount + ' polic' + (pCount === 1 ? 'y' : 'ies'), x, y + 47);
        if (dv.routes && dv.routes.length > 0) {
          ctx.fillStyle = '#ef535060';
          ctx.fillText(dv.routes.length + ' route' + (dv.routes.length > 1 ? 's' : ''), x, y + 59);
        }
      }
      if (dv.type === 'server') {
        let serverInfoY = 40;
        if (dv.routes && dv.routes.length > 0) {
          ctx.fillStyle = '#7e57c280';
          ctx.fillText(dv.routes.length + ' route' + (dv.routes.length > 1 ? 's' : ''), x, y + serverInfoY);
          serverInfoY += 12;
        }
        if (dv.defaultGateway) {
          ctx.fillStyle = '#7e57c280';
          ctx.fillText('GW: ' + dv.defaultGateway, x, y + serverInfoY);
        }
      }
      if (dv.type === 'pc' && dv.defaultGateway) {
        ctx.fillStyle = '#4fc3f780';
        ctx.fillText('GW: ' + dv.defaultGateway, x, y + 52);
      }
      ctx.textAlign = 'left';
    }

    // ─── Design mode overlay ───
    if (this.store.designMode) {
      this._drawDesignOverlay(ctx, w, h, sx, sy);
    }

    // ─── Zoom indicator (drawn in screen space) ───
    if (zoom !== 1 || panX !== 0 || panY !== 0) {
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.font = '11px Segoe UI, sans-serif';
      ctx.fillStyle = '#ffffff55';
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.round(zoom * 100)}%`, 10, h - 10);
      ctx.restore();
    }
  }

  _drawDesignOverlay(ctx, w, h, sx, sy) {
    const state = this.store.designState;
    const devices = this.store.getDevices();

    // Hover highlight
    if (state.hoverDeviceId && devices[state.hoverDeviceId]) {
      const dv = devices[state.hoverDeviceId];
      ctx.save();
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.arc(sx(dv.x), sy(dv.y), 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Rubber band line during link creation
    if (state.linking && state.cursorPos) {
      const fromDev = devices[state.linking.fromDeviceId];
      if (fromDev) {
        ctx.save();
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(sx(fromDev.x), sy(fromDev.y));
        ctx.lineTo(sx(state.cursorPos.x), sy(state.cursorPos.y));
        ctx.stroke();
        ctx.restore();
      }
    }

    // "DESIGN MODE" indicator (in screen space)
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const sw = this.canvas.width / this.dpr;
    const sh = this.canvas.height / this.dpr;
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillStyle = '#4fc3f755';
    ctx.textAlign = 'right';
    ctx.fillText('DESIGN MODE', sw - 12, sh - 12);
    ctx.restore();
  }

  // ─── Compute edge endpoints for animation segments ───
  _computeSegmentEndpoints(segments) {
    const devices = this.store.getDevices();
    const links = this.store.getLinks();
    const w = this.canvas.width / this.dpr, h = this.canvas.height / this.dpr;
    const sx = v => v * (w / 800);
    const sy = v => v * (h / 560);

    // Build per-link offset map (same logic as draw())
    const pairCount = {};
    for (const link of links) {
      const key = [link.from, link.to].sort().join('::');
      pairCount[key] = (pairCount[key] || 0) + 1;
    }
    const linkOffsets = new Map(); // link object → offset value
    const pairIdx = {};
    for (const link of links) {
      const key = [link.from, link.to].sort().join('::');
      if (!pairIdx[key]) pairIdx[key] = 0;
      const idx = pairIdx[key]++;
      const total = pairCount[key];
      const offset = total > 1 ? (idx - (total - 1) / 2) * 20 : 0;
      linkOffsets.set(link, offset);
    }

    for (const seg of segments) {
      const d1 = devices[seg.fromId], d2 = devices[seg.toId];
      if (!d1 || !d2) {
        seg.fromPt = { x: 0, y: 0 };
        seg.toPt = { x: 0, y: 0 };
        continue;
      }
      const baseX1 = sx(d1.x), baseY1 = sy(d1.y);
      const baseX2 = sx(d2.x), baseY2 = sy(d2.y);

      // Find the matching link using hint (interface pair) if available
      let matchedLink = null;
      if (seg.hint && seg.hint.fromIf) {
        matchedLink = links.find(l =>
          (l.from === seg.fromId && l.fromIf === seg.hint.fromIf && l.to === seg.toId && l.toIf === seg.hint.toIf) ||
          (l.to === seg.fromId && l.toIf === seg.hint.fromIf && l.from === seg.toId && l.fromIf === seg.hint.toIf)
        );
      }
      // Fallback: first link between the pair
      if (!matchedLink) {
        matchedLink = links.find(l =>
          (l.from === seg.fromId && l.to === seg.toId) ||
          (l.to === seg.fromId && l.from === seg.toId)
        );
      }

      const offset = matchedLink ? (linkOffsets.get(matchedLink) || 0) : 0;
      // Consistent perpendicular normal based on sorted device order
      const sortedIds = [seg.fromId, seg.toId].sort();
      const dSA = devices[sortedIds[0]], dSB = devices[sortedIds[1]];
      const ldx = sx(dSB.x) - sx(dSA.x);
      const ldy = sy(dSB.y) - sy(dSA.y);
      const llen = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
      const nx = -ldy / llen;
      const ny = ldx / llen;
      seg.fromPt = getDeviceEdgePoint(d1.type, baseX1, baseY1, baseX2, baseY2, nx, ny, offset);
      seg.toPt = getDeviceEdgePoint(d2.type, baseX2, baseY2, baseX1, baseY1, nx, ny, offset);
    }
  }

  // ─── Ping animation ───
  animatePing(path, linkHints, success, onComplete) {
    this.pingAnimId++;
    this.pingAnimRunning = false;

    const devices = this.store.getDevices();
    const validPath = path.filter(id => devices[id]);
    if (validPath.length < 2) { onComplete(); return; }

    const segments = [];
    const hints = linkHints || [];
    if (success) {
      for (let i = 0; i < validPath.length - 1; i++)
        segments.push({ fromId: validPath[i], toId: validPath[i + 1], type: 'request', hint: hints[i] || null });
      for (let i = validPath.length - 1; i > 0; i--) {
        const fwdHint = hints[i - 1];
        segments.push({ fromId: validPath[i], toId: validPath[i - 1], type: 'reply', hint: fwdHint ? { fromIf: fwdHint.toIf, toIf: fwdHint.fromIf } : null });
      }
    } else {
      for (let i = 0; i < validPath.length - 1; i++)
        segments.push({ fromId: validPath[i], toId: validPath[i + 1], type: 'fail', hint: hints[i] || null });
    }

    if (segments.length === 0) { onComplete(); return; }

    this._computeSegmentEndpoints(segments);

    const myId = this.pingAnimId;
    const segDur = 300;
    const fadeDur = 400;
    let startTime = -1;
    const maxTime = segments.length * segDur + fadeDur + 1000;
    this.pingAnimRunning = true;

    const ctx = this.ctx;
    const self = this;

    function frame(now) {
      if (myId !== self.pingAnimId || !self.pingAnimRunning) return;

      if (startTime < 0) startTime = now;
      const elapsed = now - startTime;
      const totalSegTime = segments.length * segDur;

      if (elapsed > maxTime) {
        self.pingAnimRunning = false;
        try { self.draw(); } catch(e) {}
        onComplete();
        return;
      }

      try {
        self.draw();

        if (elapsed < totalSegTime) {
          const segIdx = Math.max(0, Math.min(Math.floor(elapsed / segDur), segments.length - 1));
          const seg = segments[segIdx];
          const t = Math.min((elapsed - segIdx * segDur) / segDur, 1);

          const from = seg.fromPt;
          const to = seg.toPt;
          const px = from.x + (to.x - from.x) * t;
          const py = from.y + (to.y - from.y) * t;

          const color = seg.type === 'reply' ? '#4fc3f7' : seg.type === 'request' ? '#69f0ae' : '#ff6b6b';
          drawPingParticle(ctx, px, py, color, 1.0);
          drawPingTrail(ctx, segments, segIdx, t);

        } else if (!success && elapsed < totalSegTime + fadeDur) {
          const fade = (elapsed - totalSegTime) / fadeDur;
          const last = segments[segments.length - 1];
          const to = last.toPt;
          drawPingParticle(ctx, to.x, to.y, '#ff6b6b', 1 - fade);
          ctx.save();
          ctx.globalAlpha = 1 - fade;
          ctx.strokeStyle = '#ff6b6b';
          ctx.lineWidth = 3;
          const sz = 10 + fade * 8;
          ctx.beginPath();
          ctx.moveTo(to.x - sz, to.y - sz); ctx.lineTo(to.x + sz, to.y + sz);
          ctx.moveTo(to.x + sz, to.y - sz); ctx.lineTo(to.x - sz, to.y + sz);
          ctx.stroke();
          ctx.restore();
        } else {
          self.pingAnimRunning = false;
          self.draw();
          onComplete();
          return;
        }
      } catch (e) {
        console.error('Ping animation error:', e);
        self.pingAnimRunning = false;
        try { self.draw(); } catch(e2) {}
        onComplete();
        return;
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // ─── Traceroute animation ───
  animateTraceroute(path, linkHints, success, onComplete) {
    this.pingAnimId++;
    this.pingAnimRunning = false;

    const devices = this.store.getDevices();
    const validPath = path.filter(id => devices[id]);
    if (validPath.length < 2) { onComplete(); return; }

    // Build forward-only segments
    const hints = linkHints || [];
    const segments = [];
    for (let i = 0; i < validPath.length - 1; i++) {
      segments.push({ fromId: validPath[i], toId: validPath[i + 1], type: success ? 'request' : 'fail', hint: hints[i] || null });
    }
    if (segments.length === 0) { onComplete(); return; }

    this._computeSegmentEndpoints(segments);

    // Compute L3 hop indices (non-switch devices, excluding source)
    const hopNumbers = new Map();
    let hopNum = 0;
    for (let i = 1; i < validPath.length; i++) {
      const dv = devices[validPath[i]];
      if (dv && dv.type !== 'switch') {
        hopNum++;
        hopNumbers.set(validPath[i], hopNum);
      }
    }

    const myId = this.pingAnimId;
    const segDur = 400;
    const holdDur = 300;
    let startTime = -1;
    const totalTime = segments.length * segDur + holdDur + 1000;
    this.pingAnimRunning = true;

    const canvas = this.canvas;
    const ctx = this.ctx;
    const dpr = this.dpr;
    const self = this;

    // Center coords only for hop labels
    function getCenterCoords(devId) {
      const dv = devices[devId];
      if (!dv) return { x: 0, y: 0 };
      const w = canvas.width / dpr, h = canvas.height / dpr;
      return { x: dv.x * (w / 800), y: dv.y * (h / 560) };
    }

    function frame(now) {
      if (myId !== self.pingAnimId || !self.pingAnimRunning) return;
      if (startTime < 0) startTime = now;
      const elapsed = now - startTime;

      if (elapsed > totalTime) {
        self.pingAnimRunning = false;
        try { self.draw(); } catch(e) {}
        onComplete();
        return;
      }

      try {
        self.draw();
        const segIdx = Math.min(Math.floor(elapsed / segDur), segments.length - 1);
        const seg = segments[segIdx];
        const t = Math.min((elapsed - segIdx * segDur) / segDur, 1);

        if (elapsed < segments.length * segDur) {
          const from = seg.fromPt;
          const to = seg.toPt;
          const px = from.x + (to.x - from.x) * t;
          const py = from.y + (to.y - from.y) * t;

          const color = success ? '#ffa726' : '#ff6b6b';
          drawPingParticle(ctx, px, py, color, 1.0);

          // Draw trail
          ctx.save();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
          for (let i = segIdx; i >= Math.max(0, segIdx - 3); i--) {
            const s = segments[i];
            const f = s.fromPt;
            const tCoord = s.toPt;
            const age = segIdx - i;
            const alpha = Math.max(0, 0.4 - age * 0.12);
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (i === segIdx) {
              const cx = f.x + (tCoord.x - f.x) * t;
              const cy = f.y + (tCoord.y - f.y) * t;
              ctx.moveTo(f.x, f.y); ctx.lineTo(cx, cy);
            } else {
              ctx.moveTo(f.x, f.y); ctx.lineTo(tCoord.x, tCoord.y);
            }
            ctx.stroke();
          }
          ctx.restore();

          // Draw hop number labels at visited L3 devices
          ctx.save();
          ctx.font = 'bold 12px Consolas, monospace';
          ctx.textAlign = 'center';
          for (let i = 0; i <= segIdx; i++) {
            const devId = segments[i].toId;
            const hn = hopNumbers.get(devId);
            if (hn === undefined) continue;
            if (i < segIdx || (i === segIdx && t > 0.9)) {
              const c = getCenterCoords(devId);
              ctx.fillStyle = '#0d1117cc';
              ctx.beginPath();
              ctx.arc(c.x + 28, c.y - 28, 11, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = success ? '#ffa726' : '#ff6b6b';
              ctx.fillText(String(hn), c.x + 28, c.y - 24);
            }
          }
          ctx.restore();
        } else {
          // Hold phase — show final state with all hop labels
          self.draw();
          ctx.save();
          ctx.font = 'bold 12px Consolas, monospace';
          ctx.textAlign = 'center';
          for (const [devId, hn] of hopNumbers) {
            const c = getCenterCoords(devId);
            ctx.fillStyle = '#0d1117cc';
            ctx.beginPath();
            ctx.arc(c.x + 28, c.y - 28, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = success ? '#ffa726' : '#ff6b6b';
            ctx.fillText(String(hn), c.x + 28, c.y - 24);
          }
          ctx.restore();

          if (!success) {
            const lastSeg = segments[segments.length - 1];
            const to = lastSeg.toPt;
            const fade = Math.min((elapsed - segments.length * segDur) / holdDur, 1);
            ctx.save();
            ctx.globalAlpha = 1 - fade;
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 3;
            const sz = 10 + fade * 8;
            ctx.beginPath();
            ctx.moveTo(to.x - sz, to.y - sz); ctx.lineTo(to.x + sz, to.y + sz);
            ctx.moveTo(to.x + sz, to.y - sz); ctx.lineTo(to.x - sz, to.y + sz);
            ctx.stroke();
            ctx.restore();
          }

          if (elapsed > segments.length * segDur + holdDur + 500) {
            self.pingAnimRunning = false;
            self.draw();
            onComplete();
            return;
          }
        }
      } catch (e) {
        console.error('Traceroute animation error:', e);
        self.pingAnimRunning = false;
        try { self.draw(); } catch(e2) {}
        onComplete();
        return;
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // ─── ARP animation ───
  animateArpSequence(arpResolutions, onComplete) {
    if (!arpResolutions || arpResolutions.length === 0) { onComplete(); return; }

    this.pingAnimId++;
    this.pingAnimRunning = true;
    const myId = this.pingAnimId;
    const self = this;
    const devices = this.store.getDevices();
    const links = this.store.getLinks();
    const w = this.canvas.width / this.dpr, h = this.canvas.height / this.dpr;
    const sx = v => v * (w / 800), sy = v => v * (h / 560);
    const ctx = this.ctx;

    function getCenter(devId) {
      const dv = devices[devId];
      return dv ? { x: sx(dv.x), y: sy(dv.y) } : { x: 0, y: 0 };
    }

    // Precompute edge points for a pair (reuse link offset logic)
    function edgePt(fromId, toId) {
      const d1 = devices[fromId], d2 = devices[toId];
      if (!d1 || !d2) return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };
      const bx1 = sx(d1.x), by1 = sy(d1.y), bx2 = sx(d2.x), by2 = sy(d2.y);
      // Find link between them for parallel offset
      const pairCount = {};
      for (const l of links) { const k = [l.from, l.to].sort().join('::'); pairCount[k] = (pairCount[k] || 0) + 1; }
      const pairIdx = {};
      let matchOffset = 0;
      const sk = [fromId, toId].sort().join('::');
      for (const l of links) {
        const k = [l.from, l.to].sort().join('::');
        if (!pairIdx[k]) pairIdx[k] = 0;
        const idx = pairIdx[k]++;
        if (k === sk && ((l.from === fromId && l.to === toId) || (l.to === fromId && l.from === toId))) {
          const total = pairCount[k];
          matchOffset = total > 1 ? (idx - (total - 1) / 2) * 20 : 0;
          break;
        }
      }
      const sIds = [fromId, toId].sort();
      const dA = devices[sIds[0]], dB = devices[sIds[1]];
      const ldx = sx(dB.x) - sx(dA.x), ldy = sy(dB.y) - sy(dA.y);
      const llen = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
      const nx = -ldy / llen, ny = ldx / llen;
      return {
        from: getDeviceEdgePoint(d1.type, bx1, by1, bx2, by2, nx, ny, matchOffset),
        to: getDeviceEdgePoint(d2.type, bx2, by2, bx1, by1, nx, ny, matchOffset)
      };
    }

    let resIdx = 0;

    function animateOneResolution() {
      if (myId !== self.pingAnimId || resIdx >= arpResolutions.length) {
        self.pingAnimRunning = false;
        self.draw();
        onComplete();
        return;
      }
      const res = arpResolutions[resIdx];
      resIdx++;

      // Phase 1: Request from requester → switch (or directly to target if no switch)
      // Phase 2: Broadcast flood from switch to all L2 devices simultaneously
      // Phase 3: Reply from target back to requester

      const hasSwitch = res.switchPath.length > 0;
      const reqToSwPts = hasSwitch
        ? edgePt(res.requesterId, res.switchPath[0])
        : edgePt(res.requesterId, res.targetId);

      // Build broadcast fan-out endpoints (from switch to each device)
      const floodPts = hasSwitch ? res.broadcastTargets.map(bt => ({
        ...bt,
        pts: edgePt(bt.viaSwitch || res.switchPath[0], bt.deviceId),
        isTarget: bt.deviceId === res.targetId
      })) : [];

      // Reply path: target → switch → requester
      const replyPts = hasSwitch
        ? [edgePt(res.targetId, res.switchPath[0]), edgePt(res.switchPath[0], res.requesterId)]
        : [edgePt(res.targetId, res.requesterId)];

      const P1_DUR = 200, P2_DUR = 300, P2_HOLD = 200, P3_DUR = 200, GAP = 100;
      const totalDur = P1_DUR + (hasSwitch ? P2_DUR + P2_HOLD : 0) + P3_DUR + GAP;
      let startTime = -1;

      function frame(now) {
        if (myId !== self.pingAnimId || !self.pingAnimRunning) return;
        if (startTime < 0) startTime = now;
        const el = now - startTime;

        if (el > totalDur) { animateOneResolution(); return; }

        try {
          self.draw();

          // Draw ARP label
          const labelText = `ARP: Who has ${res.targetIP}?`;

          if (el < P1_DUR) {
            // Phase 1: requester → switch/target
            const t = el / P1_DUR;
            const from = reqToSwPts.from, to = reqToSwPts.to;
            const px = from.x + (to.x - from.x) * t;
            const py = from.y + (to.y - from.y) * t;
            drawArpParticle(ctx, px, py, '#ffd740', 1.0);
            drawArpLabel(ctx, px, py - 20, labelText, 1.0);
          } else if (hasSwitch && el < P1_DUR + P2_DUR) {
            // Phase 2: broadcast flood from switch to all L2 devices
            const t = (el - P1_DUR) / P2_DUR;
            for (const fp of floodPts) {
              const from = fp.pts.from, to = fp.pts.to;
              const px = from.x + (to.x - from.x) * t;
              const py = from.y + (to.y - from.y) * t;
              drawArpParticle(ctx, px, py, '#ffd740', 0.8);
            }
            // Small label near the switch
            const swC = getCenter(res.switchPath[0]);
            drawArpLabel(ctx, swC.x, swC.y - 30, labelText, Math.max(0, 1 - t));
          } else if (hasSwitch && el < P1_DUR + P2_DUR + P2_HOLD) {
            // Phase 2 hold: show hit/miss indicators at each target
            const holdT = (el - P1_DUR - P2_DUR) / P2_HOLD;
            for (const fp of floodPts) {
              const to = fp.pts.to;
              if (fp.isTarget) {
                // Hit: green check
                drawArpHitMiss(ctx, to.x, to.y, true, 1 - holdT * 0.5);
              } else {
                // Miss: fade out
                drawArpHitMiss(ctx, to.x, to.y, false, Math.max(0, 1 - holdT * 2));
              }
            }
          } else {
            // Phase 3: reply from target → requester
            const p3Start = P1_DUR + (hasSwitch ? P2_DUR + P2_HOLD : 0);
            const t = Math.min((el - p3Start) / P3_DUR, 1);
            const replyLabel = `ARP Reply: ${res.targetIP} is at ${res.targetMAC}`;

            if (replyPts.length === 1) {
              const from = replyPts[0].from, to = replyPts[0].to;
              const px = from.x + (to.x - from.x) * t;
              const py = from.y + (to.y - from.y) * t;
              drawArpParticle(ctx, px, py, '#ffab40', 1.0);
              drawArpLabel(ctx, px, py - 20, replyLabel, 1.0);
            } else {
              // Two segments: target→switch, switch→requester
              const segT = t * 2; // spread t across two segments
              if (segT < 1) {
                const from = replyPts[0].from, to = replyPts[0].to;
                const px = from.x + (to.x - from.x) * segT;
                const py = from.y + (to.y - from.y) * segT;
                drawArpParticle(ctx, px, py, '#ffab40', 1.0);
                drawArpLabel(ctx, px, py - 20, replyLabel, 1.0);
              } else {
                const from = replyPts[1].from, to = replyPts[1].to;
                const st = segT - 1;
                const px = from.x + (to.x - from.x) * st;
                const py = from.y + (to.y - from.y) * st;
                drawArpParticle(ctx, px, py, '#ffab40', 1.0);
                drawArpLabel(ctx, px, py - 20, replyLabel, 1.0);
              }
            }
          }
        } catch (e) {
          console.error('ARP animation error:', e);
          self.pingAnimRunning = false;
          self.draw();
          onComplete();
          return;
        }

        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    animateOneResolution();
  }

  // ─── Zoom/Pan event handlers ───
  _onWheel(e) {
    e.preventDefault();
    const vs = this.store.viewState;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newZoom = Math.max(0.2, Math.min(4.0, vs.zoom * factor));

    // Zoom centered on cursor
    vs.panX = mx - (mx - vs.panX) * newZoom / vs.zoom;
    vs.panY = my - (my - vs.panY) * newZoom / vs.zoom;
    vs.zoom = newZoom;
    this.draw();
  }

  _onPanStart(e) {
    // Middle mouse button always pans
    if (e.button === 1) {
      e.preventDefault();
      this._panning = true;
      this._panStart = { x: e.clientX, y: e.clientY, panX: this.store.viewState.panX, panY: this.store.viewState.panY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }
    // Left button on empty area: pan in simulation mode (not design mode)
    if (e.button === 0 && !this.store.designMode) {
      const rect = this.canvas.getBoundingClientRect();
      const pos = this.screenToLogical(e.clientX - rect.left, e.clientY - rect.top);
      const devices = this.store.getDevices();
      let hitDevice = false;
      for (const dv of Object.values(devices)) {
        if (Math.sqrt((pos.x - dv.x) ** 2 + (pos.y - dv.y) ** 2) < 35) { hitDevice = true; break; }
      }
      if (!hitDevice) {
        this._panning = true;
        this._panStart = { x: e.clientX, y: e.clientY, panX: this.store.viewState.panX, panY: this.store.viewState.panY };
        this.canvas.style.cursor = 'grabbing';
      }
    }
  }

  _onPanMove(e) {
    if (!this._panning || !this._panStart) return;
    const vs = this.store.viewState;
    vs.panX = this._panStart.panX + (e.clientX - this._panStart.x);
    vs.panY = this._panStart.panY + (e.clientY - this._panStart.y);
    this.draw();
  }

  _onPanEnd(e) {
    if (this._panning) {
      this._panning = false;
      this._panStart = null;
      this.canvas.style.cursor = '';
    }
  }

  _onDblClick(e) {
    // Double-click on empty area: fit view to content
    const rect = this.canvas.getBoundingClientRect();
    const pos = this.screenToLogical(e.clientX - rect.left, e.clientY - rect.top);
    const devices = this.store.getDevices();
    for (const dv of Object.values(devices)) {
      if (Math.sqrt((pos.x - dv.x) ** 2 + (pos.y - dv.y) ** 2) < 35) return;
    }
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    this.store.fitView(w, h);
  }

  // ─── Canvas click handling ───
  setupClickHandler(switchDevice, designController, palette) {
    this.canvas.addEventListener('click', async (e) => {
      // In design mode with link tool active, delegate to design controller
      if (this.store.designMode && palette && palette.isLinkMode()) {
        const handled = await designController.handleDesignClick(e);
        if (handled) return;
      }
      // In design mode without link tool, clicks do nothing (drag handles movement)
      if (this.store.designMode) return;

      // Normal simulation mode: switch device on click
      const rect = this.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const pos = this.screenToLogical(screenX, screenY);
      const devices = this.store.getDevices();
      for (const [id, dv] of Object.entries(devices)) {
        const dx = pos.x - dv.x, dy = pos.y - dv.y;
        if (Math.sqrt(dx * dx + dy * dy) < 35) { switchDevice(id); return; }
      }
    });
  }

  exportImage() {
    const devices = this.store.getDevices();
    const devList = Object.values(devices);
    if (devList.length === 0) return null;

    // Calculate bounding box of all devices
    const margin = 80;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const dv of devList) {
      minX = Math.min(minX, dv.x);
      minY = Math.min(minY, dv.y);
      maxX = Math.max(maxX, dv.x);
      maxY = Math.max(maxY, dv.y);
    }
    minX -= margin; minY -= margin;
    maxX += margin; maxY += margin;

    const imgW = Math.max(maxX - minX, 200);
    const imgH = Math.max(maxY - minY, 200);
    const scale = 2; // High-res output

    // Create offscreen canvas
    const offCanvas = document.createElement('canvas');
    offCanvas.width = imgW * scale;
    offCanvas.height = imgH * scale;
    const ctx = offCanvas.getContext('2d');

    // Transparent background (PNG alpha channel)

    // Set up coordinate transform: scale and offset so devices fit
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.translate(-minX, -minY);

    const links = this.store.getLinks();
    const identity = (x) => x;

    // Draw links (with parallel offset for same-pair links)
    const pairCount = {};
    const pairIndex = {};
    for (const link of links) {
      const key = [link.from, link.to].sort().join('::');
      pairCount[key] = (pairCount[key] || 0) + 1;
    }
    for (const link of links) {
      if (!devices[link.from] || !devices[link.to]) continue;
      const key = [link.from, link.to].sort().join('::');
      const total = pairCount[key];
      if (!pairIndex[key]) pairIndex[key] = 0;
      const idx = pairIndex[key]++;
      const offset = total > 1 ? (idx - (total - 1) / 2) * 20 : 0;
      drawLink(ctx, link, devices, identity, identity, offset, idx);
    }

    // Draw devices
    for (const [id, dv] of Object.entries(devices)) {
      if (dv.type === 'router') drawRouter(ctx, dv.x, dv.y, dv, false);
      else if (dv.type === 'switch') drawSwitch(ctx, dv.x, dv.y, dv, false);
      else if (dv.type === 'firewall') drawFirewall(ctx, dv.x, dv.y, dv, false);
      else if (dv.type === 'server') drawServer(ctx, dv.x, dv.y, dv, false);
      else if (dv.icon === 'printer') drawPrinter(ctx, dv.x, dv.y, dv, false);
      else drawPC(ctx, dv.x, dv.y, dv, false);

      // Hostname label
      ctx.font = 'bold 13px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#c8d6e5';
      ctx.fillText(dv.hostname, dv.x, dv.y + 40);

      // IP labels
      ctx.font = '10px Segoe UI, sans-serif';
      ctx.fillStyle = '#8899aa';
      let ipOffset = 52;
      for (const [ifName, iface] of Object.entries(dv.interfaces)) {
        if (iface.ip && iface.ip !== '') {
          ctx.fillText(iface.ip, dv.x, dv.y + ipOffset);
          ipOffset += 12;
          if (ipOffset > 76) break; // Max 3 IPs
        }
      }
    }

    return offCanvas.toDataURL('image/png');
  }
}

function drawPingParticle(ctx, x, y, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 18);
  grad.addColorStop(0, color);
  grad.addColorStop(0.4, color + '66');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPingTrail(ctx, segments, curIdx, curT) {
  ctx.save();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  for (let i = curIdx; i >= Math.max(0, curIdx - 3); i--) {
    const seg = segments[i];
    const from = seg.fromPt;
    const to = seg.toPt;
    const age = curIdx - i;
    const alpha = Math.max(0, 0.4 - age * 0.12);
    const color = seg.type === 'reply' ? '#4fc3f7' : seg.type === 'fail' ? '#ff6b6b' : '#69f0ae';
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (i === curIdx) {
      const px = from.x + (to.x - from.x) * curT;
      const py = from.y + (to.y - from.y) * curT;
      ctx.moveTo(from.x, from.y); ctx.lineTo(px, py);
    } else {
      ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ─── ARP drawing helpers ───

function drawArpParticle(ctx, x, y, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  // Glow
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 16);
  grad.addColorStop(0, color);
  grad.addColorStop(0.5, color + '44');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();
  // Diamond shape
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x - 5, y);
  ctx.closePath();
  ctx.fill();
  // White center
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(x, y - 2.5);
  ctx.lineTo(x + 2, y);
  ctx.lineTo(x, y + 2.5);
  ctx.lineTo(x - 2, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawArpLabel(ctx, x, y, text, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 9px Consolas, monospace';
  const tw = ctx.measureText(text).width;
  // Background pill
  ctx.fillStyle = '#0d1117dd';
  ctx.beginPath();
  ctx.roundRect(x - tw / 2 - 5, y - 8, tw + 10, 16, 4);
  ctx.fill();
  // Text
  ctx.fillStyle = '#ffd740';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 3);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawArpHitMiss(ctx, x, y, isHit, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 2.5;
  if (isHit) {
    // Green checkmark
    ctx.strokeStyle = '#69f0ae';
    ctx.beginPath();
    ctx.moveTo(x - 7, y); ctx.lineTo(x - 2, y + 5); ctx.lineTo(x + 7, y - 5);
    ctx.stroke();
  } else {
    // Red X
    ctx.strokeStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5);
    ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5);
    ctx.stroke();
  }
  ctx.restore();
}
