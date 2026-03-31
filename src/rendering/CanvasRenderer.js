// ─── Canvas Renderer: Main drawing orchestrator ───
import { drawRouter, drawSwitch, drawPC, drawFirewall, drawServer } from './DeviceRenderer.js';
import { drawLink } from './LinkRenderer.js';

export class CanvasRenderer {
  constructor(canvas, store, eventBus) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = store;
    this.eventBus = eventBus;
    this.dpr = window.devicePixelRatio || 1;
    this.pingAnimId = 0;
    this.pingAnimRunning = false;

    // Bind events
    window.addEventListener('resize', () => this.resize());
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

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
    ctx.textAlign = 'left';
    ctx.clearRect(0, 0, w, h);

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

    // Draw links
    for (const link of links) {
      drawLink(ctx, link, devices, sx, sy);
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

    // "DESIGN MODE" indicator
    ctx.save();
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillStyle = '#4fc3f755';
    ctx.textAlign = 'right';
    ctx.fillText('DESIGN MODE', w - 12, h - 12);
    ctx.restore();
  }

  // ─── Ping animation ───
  animatePing(path, success, onComplete) {
    this.pingAnimId++;
    this.pingAnimRunning = false;

    const devices = this.store.getDevices();
    const validPath = path.filter(id => devices[id]);
    if (validPath.length < 2) { onComplete(); return; }

    const segments = [];
    if (success) {
      for (let i = 0; i < validPath.length - 1; i++)
        segments.push({ fromId: validPath[i], toId: validPath[i + 1], type: 'request' });
      for (let i = validPath.length - 1; i > 0; i--)
        segments.push({ fromId: validPath[i], toId: validPath[i - 1], type: 'reply' });
    } else {
      for (let i = 0; i < validPath.length - 1; i++)
        segments.push({ fromId: validPath[i], toId: validPath[i + 1], type: 'fail' });
    }

    if (segments.length === 0) { onComplete(); return; }

    const myId = this.pingAnimId;
    const segDur = 300;
    const fadeDur = 400;
    let startTime = -1;
    const maxTime = segments.length * segDur + fadeDur + 1000;
    this.pingAnimRunning = true;

    const canvas = this.canvas;
    const ctx = this.ctx;
    const dpr = this.dpr;
    const self = this;

    function getCoords(devId) {
      const dv = devices[devId];
      if (!dv) return { x: 0, y: 0 };
      const w = canvas.width / dpr, h = canvas.height / dpr;
      return { x: dv.x * (w / 800), y: dv.y * (h / 560) };
    }

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

          const from = getCoords(seg.fromId);
          const to = getCoords(seg.toId);
          const px = from.x + (to.x - from.x) * t;
          const py = from.y + (to.y - from.y) * t;

          const color = seg.type === 'reply' ? '#4fc3f7' : seg.type === 'request' ? '#69f0ae' : '#ff6b6b';
          drawPingParticle(ctx, px, py, color, 1.0);
          drawPingTrail(ctx, segments, segIdx, t, getCoords);

        } else if (!success && elapsed < totalSegTime + fadeDur) {
          const fade = (elapsed - totalSegTime) / fadeDur;
          const last = segments[segments.length - 1];
          const to = getCoords(last.toId);
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
  animateTraceroute(path, success, onComplete) {
    this.pingAnimId++;
    this.pingAnimRunning = false;

    const devices = this.store.getDevices();
    const validPath = path.filter(id => devices[id]);
    if (validPath.length < 2) { onComplete(); return; }

    // Build forward-only segments
    const segments = [];
    for (let i = 0; i < validPath.length - 1; i++) {
      segments.push({ fromId: validPath[i], toId: validPath[i + 1], type: success ? 'request' : 'fail' });
    }
    if (segments.length === 0) { onComplete(); return; }

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

    function getCoords(devId) {
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
          const from = getCoords(seg.fromId);
          const to = getCoords(seg.toId);
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
            const f = getCoords(s.fromId);
            const tCoord = getCoords(s.toId);
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
            // Only label if we've completed arriving at this hop
            if (i < segIdx || (i === segIdx && t > 0.9)) {
              const c = getCoords(devId);
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
            const c = getCoords(devId);
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
            const to = getCoords(lastSeg.toId);
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
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;
      const devices = this.store.getDevices();
      for (const [id, dv] of Object.entries(devices)) {
        const x = dv.x * (w / 800);
        const y = dv.y * (h / 560);
        if (Math.sqrt((mx - x) ** 2 + (my - y) ** 2) < 35) { switchDevice(id); return; }
      }
    });
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

function drawPingTrail(ctx, segments, curIdx, curT, getCoords) {
  ctx.save();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  for (let i = curIdx; i >= Math.max(0, curIdx - 3); i--) {
    const seg = segments[i];
    const from = getCoords(seg.fromId);
    const to = getCoords(seg.toId);
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
