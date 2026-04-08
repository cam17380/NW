// ─── Challenge UI: goal panel overlay during active challenge ───

export class ChallengeUI {
  constructor(engine) {
    this.engine = engine;
    this.el = null;
    this.onQuit = null;   // Callback to exit challenge
    this.onCheck = null;  // Callback to trigger check (passes devices)
  }

  mount(container) {
    this.el = document.createElement('div');
    this.el.id = 'challengePanel';
    this.el.style.display = 'none';
    container.appendChild(this.el);

    this._setupDrag();
    this.engine.onUpdate = () => this.render();
  }

  show() {
    if (this.el) {
      this.el.style.display = '';
      // Reset position to center of screen
      this.el.style.right = '';
      this.el.style.left = '50%';
      this.el.style.top = '50%';
      this.el.style.transform = 'translate(-50%, -50%)';
    }
    this.render();
  }

  hide() {
    if (this.el) this.el.style.display = 'none';
  }

  _setupDrag() {
    let dragging = false, offsetX = 0, offsetY = 0;
    const titleBar = () => this.el.querySelector('.challenge-header');

    this.el.addEventListener('mousedown', (e) => {
      if (!titleBar() || !titleBar().contains(e.target)) return;
      if (e.target.tagName === 'BUTTON') return;
      dragging = true;
      const rect = this.el.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      this.el.style.right = '';
      this.el.style.transform = '';
      this.el.style.left = rect.left + 'px';
      this.el.style.top = rect.top + 'px';
      this.el.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      this.el.style.left = (e.clientX - offsetX) + 'px';
      this.el.style.top = (e.clientY - offsetY) + 'px';
      this.el.style.right = '';
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        this.el.style.cursor = '';
      }
    });
  }

  _toggleCollapse() {
    this._collapsed = !this._collapsed;
    this.render();
  }

  render() {
    if (!this.el || !this.engine.isActive()) { this.hide(); return; }

    const s = this.engine.current;
    const objectives = this.engine.getObjectiveStates();
    const hints = this.engine.getRevealedHints();
    const totalHints = this.engine.getTotalHints();
    const allPassed = objectives.every(o => o.passed);
    const collapsed = this._collapsed;

    const diffBadge = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }[s.difficulty] || s.difficulty;
    const diffColor = { beginner: '#69f0ae', intermediate: '#ffa726', advanced: '#ef5350' }[s.difficulty] || '#888';

    this.el.innerHTML = `
      <div class="challenge-header">
        <div class="challenge-title-row">
          <span class="challenge-badge" style="background:${diffColor}">${diffBadge}</span>
          <span class="challenge-title">${s.title}</span>
          <button class="challenge-btn challenge-collapse-btn" title="${collapsed ? 'Expand' : 'Collapse'}">${collapsed ? '▼' : '▲'}</button>
          <button class="challenge-btn challenge-quit-btn" title="Quit challenge">✕</button>
        </div>
      </div>
      ${collapsed ? '' : `
        <div class="challenge-desc">${s.description}</div>
        <div class="challenge-objectives">
          ${objectives.map(o => `
            <div class="challenge-obj ${o.passed ? 'passed' : ''}">
              <span class="challenge-obj-icon">${o.passed ? '✔' : '○'}</span>
              <span>${o.text}</span>
            </div>
          `).join('')}
        </div>
        ${allPassed ? `
          <div class="challenge-success">
            <span class="challenge-success-icon">🎉</span>
            <span>${s.congratsMessage || 'Challenge Complete!'}</span>
          </div>
        ` : `
          <div class="challenge-actions">
            <button class="challenge-btn challenge-check-btn">Check</button>
            <button class="challenge-btn challenge-hint-btn" ${hints.length >= totalHints ? 'disabled' : ''}>
              Hint (${hints.length}/${totalHints})
            </button>
          </div>
        `}
        ${hints.length > 0 ? `
          <div class="challenge-hints">
            ${hints.map((h, i) => `
              <div class="challenge-hint">
                <span class="challenge-hint-num">${i + 1}.</span>
                <span>${h.text}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `}
    `;

    // Event bindings
    const collapseBtn = this.el.querySelector('.challenge-collapse-btn');
    if (collapseBtn) collapseBtn.onclick = () => this._toggleCollapse();

    const quitBtn = this.el.querySelector('.challenge-quit-btn');
    if (quitBtn) quitBtn.onclick = () => { this.engine.stop(); this.hide(); if (this.onQuit) this.onQuit(); };

    const checkBtn = this.el.querySelector('.challenge-check-btn');
    if (checkBtn) checkBtn.onclick = () => { if (this.onCheck) this.onCheck(); };

    const hintBtn = this.el.querySelector('.challenge-hint-btn');
    if (hintBtn) hintBtn.onclick = () => { this.engine.revealNextHint(); };
  }
}
