// ─── Challenge UI: goal panel overlay during active challenge ───

export class ChallengeUI {
  constructor(engine) {
    this.engine = engine;
    this.el = null;
    this.onQuit = null;   // Callback to exit challenge
    this.onCheck = null;  // Callback to trigger check (passes devices)
  }

  mount(slotElement) {
    this.el = document.createElement('div');
    this.el.id = 'challengePanel';
    this.el.style.display = 'none';
    slotElement.appendChild(this.el);

    this.engine.onUpdate = () => this.render();
  }

  show() {
    if (this.el) this.el.style.display = '';
    this.render();
  }

  hide() {
    if (this.el) this.el.style.display = 'none';
  }

  render() {
    if (!this.el || !this.engine.isActive()) { this.hide(); return; }

    const s = this.engine.current;
    const objectives = this.engine.getObjectiveStates();
    const hints = this.engine.getRevealedHints();
    const totalHints = this.engine.getTotalHints();
    const allPassed = objectives.every(o => o.passed);

    const diffBadge = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }[s.difficulty] || s.difficulty;
    const diffColor = { beginner: '#69f0ae', intermediate: '#ffa726', advanced: '#ef5350' }[s.difficulty] || '#888';

    this.el.innerHTML = `
      <div class="challenge-header">
        <div class="challenge-title-row">
          <span class="challenge-badge" style="background:${diffColor}">${diffBadge}</span>
          <span class="challenge-title">${s.title}</span>
          <button class="challenge-btn challenge-quit-btn" title="Quit challenge">✕</button>
        </div>
        <div class="challenge-desc">${s.description}</div>
      </div>
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
    `;

    // Event bindings
    const quitBtn = this.el.querySelector('.challenge-quit-btn');
    if (quitBtn) quitBtn.onclick = () => { this.engine.stop(); this.hide(); if (this.onQuit) this.onQuit(); };

    const checkBtn = this.el.querySelector('.challenge-check-btn');
    if (checkBtn) checkBtn.onclick = () => { if (this.onCheck) this.onCheck(); };

    const hintBtn = this.el.querySelector('.challenge-hint-btn');
    if (hintBtn) hintBtn.onclick = () => { this.engine.revealNextHint(); };
  }
}
