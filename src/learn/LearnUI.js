// ─── Learn UI: full-screen lesson viewer with animation canvas ───
import { t } from '../i18n/I18n.js';

export class LearnUI {
  constructor(engine) {
    this.engine = engine;
    this.el = null;
    this.canvas = null;
    this.ctx = null;
    this.onQuit = null;
    this._animId = null;
    this._animStart = 0;
    this._animRunning = false;
    this._interactionState = {};
  }

  mount(container) {
    this.el = document.createElement('div');
    this.el.id = 'learnViewer';
    this.el.className = 'learn-viewer-overlay';
    this.el.style.display = 'none';
    container.appendChild(this.el);
    this.engine.onUpdate = () => this.render();
  }

  show() {
    if (this.el) {
      this.el.style.display = 'flex';
      this._interactionState = {};
      this.render();
    }
  }

  hide() {
    this._stopAnimation();
    if (this.el) this.el.style.display = 'none';
  }

  render() {
    if (!this.el) return;
    if (!this.engine.isActive()) { this.hide(); return; }

    const lesson = this.engine.current;
    const step = this.engine.getCurrentStep();
    const stepIdx = this.engine.getStepIndex();
    const totalSteps = this.engine.getTotalSteps();
    const isFirst = this.engine.isFirstStep();
    const isLast = this.engine.isLastStep();

    this.el.innerHTML = `
      <div class="learn-viewer">
        <div class="learn-viewer-header">
          <div class="learn-viewer-title">${lesson.title}</div>
          <div class="learn-viewer-step-info">${t('ui.stepOf', { current: stepIdx + 1, total: totalSteps })}</div>
          <button class="learn-viewer-close" title="${t('ui.exitLesson')}">\u2715</button>
        </div>

        <div class="learn-viewer-progress">
          ${Array.from({ length: totalSteps }, (_, i) => `
            <div class="learn-progress-dot ${i < stepIdx ? 'done' : ''} ${i === stepIdx ? 'active' : ''}"
                 data-step="${i}"></div>
          `).join('')}
        </div>

        <div class="learn-viewer-body">
          <div class="learn-anim-area">
            <canvas class="learn-canvas" id="learnCanvas"></canvas>
          </div>
          <div class="learn-content-area">
            <h3 class="learn-step-title">${step.title}</h3>
            <div class="learn-step-content">${step.content}</div>
          </div>
        </div>

        <div class="learn-viewer-nav">
          <button class="learn-nav-btn learn-prev-btn" ${isFirst ? 'disabled' : ''}>
            ${t('ui.prev')}
          </button>
          <div class="learn-nav-dots">
            ${Array.from({ length: totalSteps }, (_, i) =>
              `<span class="learn-nav-dot ${i === stepIdx ? 'active' : ''}" data-step="${i}"></span>`
            ).join('')}
          </div>
          <button class="learn-nav-btn learn-next-btn ${isLast ? 'finish' : ''}">
            ${isLast ? t('ui.finish') : t('ui.next')}
          </button>
        </div>
      </div>
    `;

    // Setup canvas
    this.canvas = this.el.querySelector('#learnCanvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this._resizeCanvas();
      this._startAnimation(step);
    }

    // Event bindings
    this.el.querySelector('.learn-viewer-close').onclick = () => {
      this.engine.stop();
      this.hide();
      if (this.onQuit) this.onQuit();
    };

    this.el.querySelector('.learn-prev-btn').onclick = () => {
      this._interactionState = {};
      this.engine.prevStep();
    };

    this.el.querySelector('.learn-next-btn').onclick = () => {
      this._interactionState = {};
      if (this.engine.isLastStep()) {
        this.engine.nextStep(); // marks complete
        this.engine.stop();
        this.hide();
        if (this.onQuit) this.onQuit();
      } else {
        this.engine.nextStep();
      }
    };

    // Clickable progress dots
    for (const dot of this.el.querySelectorAll('.learn-progress-dot, .learn-nav-dot')) {
      dot.onclick = () => {
        const idx = parseInt(dot.dataset.step, 10);
        this._interactionState = {};
        this.engine.goToStep(idx);
      };
    }

    // Canvas click handler for interactive steps
    if (this.canvas) {
      this.canvas.onclick = (e) => {
        if (step.onCanvasClick) {
          const rect = this.canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          step.onCanvasClick(x, y, this._interactionState, () => this._renderFrame(step));
        }
      };
    }
  }

  _resizeCanvas() {
    if (!this.canvas) return;
    const container = this.canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _startAnimation(step) {
    this._stopAnimation();
    if (!step.animation) return;

    this._animStart = performance.now();
    this._animRunning = true;

    const loop = (now) => {
      if (!this._animRunning) return;
      const elapsed = now - this._animStart;
      this._renderFrame(step, elapsed);
      this._animId = requestAnimationFrame(loop);
    };
    this._animId = requestAnimationFrame(loop);
  }

  _renderFrame(step, elapsed) {
    if (!this.ctx || !this.canvas || !step.animation) return;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    this.ctx.clearRect(0, 0, w, h);
    step.animation(this.ctx, w, h, elapsed || 0, this._interactionState);
  }

  _stopAnimation() {
    this._animRunning = false;
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }
}
