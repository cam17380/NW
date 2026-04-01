// ─── Test Mode UI: DOM generation, result display, button events ───

export class TestUI {
  constructor(container, runner) {
    this.container = container;
    this.runner = runner;
    this.onBack = null;
    this._build();
    this._bind();
  }

  _build() {
    this.container.innerHTML = `
      <div class="test-mode">
        <div class="test-header">
          <button class="test-btn back" id="testBack">Back to Simulator</button>
          <span class="test-title">Test Mode</span>
          <div class="test-header-actions">
            <button class="test-btn run-all" id="testRunAll">Run All</button>
            <button class="test-btn run-failed" id="testRunFailed" disabled>Run Failed</button>
          </div>
        </div>
        <div class="test-summary" id="testSummary">
          <span class="test-summary-text" id="testSummaryText">Click "Run All" to start tests</span>
          <div class="test-progress-bar"><div class="test-progress-fill" id="testProgressFill"></div></div>
          <span class="test-progress-pct" id="testProgressPct"></span>
        </div>
        <div class="test-body">
          <div class="test-sidebar" id="testSidebar"></div>
          <div class="test-results" id="testResults"></div>
        </div>
      </div>
    `;
  }

  _bind() {
    this.container.querySelector('#testBack').addEventListener('click', () => {
      if (this.onBack) this.onBack();
    });

    this.container.querySelector('#testRunAll').addEventListener('click', () => {
      this._setRunning(true);
      this.runner.runAll().then(() => this._setRunning(false));
    });

    this.container.querySelector('#testRunFailed').addEventListener('click', () => {
      this._setRunning(true);
      this.runner.runFailed().then(() => this._setRunning(false));
    });

    this.runner.onProgress = (cat, test) => this._renderResults();
    this.runner.onComplete = (summary) => this._renderSummary(summary);
  }

  _setRunning(running) {
    const runAll = this.container.querySelector('#testRunAll');
    const runFailed = this.container.querySelector('#testRunFailed');
    runAll.disabled = running;
    runFailed.disabled = running;
    if (running) {
      runAll.textContent = 'Running...';
    } else {
      runAll.textContent = 'Run All';
    }
  }

  _renderSummary(summary) {
    const text = this.container.querySelector('#testSummaryText');
    const fill = this.container.querySelector('#testProgressFill');
    const pct = summary.totalTests > 0 ? Math.round((summary.totalPassed / summary.totalTests) * 100) : 0;

    text.textContent = `${summary.totalPassed} passed / ${summary.totalFailed} failed / ${summary.totalTests} total`;
    text.className = 'test-summary-text' + (summary.totalFailed > 0 ? ' has-failures' : ' all-passed');

    fill.style.width = `${pct}%`;
    fill.className = 'test-progress-fill' + (summary.totalFailed > 0 ? ' has-failures' : ' all-passed');

    this.container.querySelector('#testProgressPct').textContent = `${pct}%`;
    this.container.querySelector('#testProgressPct').className = 'test-progress-pct' + (summary.totalFailed > 0 ? ' has-failures' : ' all-passed');

    // Enable "Run Failed" only if there are failures
    this.container.querySelector('#testRunFailed').disabled = summary.totalFailed === 0;
  }

  _renderResults() {
    const sidebar = this.container.querySelector('#testSidebar');
    const results = this.container.querySelector('#testResults');

    // Sidebar: category list
    sidebar.innerHTML = this.runner.categories.map(cat => {
      const total = cat.tests.length;
      const icon = cat.failed > 0 ? '<span class="test-icon fail">&#x2716;</span>' : '<span class="test-icon pass">&#x2714;</span>';
      const cls = cat.failed > 0 ? 'test-cat-item has-failures' : 'test-cat-item';
      return `<div class="${cls}" data-cat="${cat.name}">${icon} ${cat.name} <span class="test-cat-count">(${cat.passed}/${total})</span></div>`;
    }).join('');

    // Click on sidebar category to scroll to it
    sidebar.querySelectorAll('.test-cat-item').forEach(el => {
      el.addEventListener('click', () => {
        const target = results.querySelector(`[data-category="${el.dataset.cat}"]`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Results: expandable categories with test details
    results.innerHTML = this.runner.categories.map(cat => {
      const tests = cat.tests.map(t => {
        if (t.status === 'passed') {
          return `<div class="test-item passed"><span class="test-icon pass">&#x2714;</span> ${this._esc(t.name)}</div>`;
        } else if (t.status === 'failed') {
          return `<div class="test-item failed"><span class="test-icon fail">&#x2716;</span> ${this._esc(t.name)}<div class="test-error">${this._esc(t.error)}</div></div>`;
        } else {
          return `<div class="test-item pending"><span class="test-icon pending">&#x25CB;</span> ${this._esc(t.name)}</div>`;
        }
      }).join('');

      const catIcon = cat.failed > 0 ? '<span class="test-icon fail">&#x2716;</span>' : '<span class="test-icon pass">&#x2714;</span>';
      return `
        <div class="test-category" data-category="${this._esc(cat.name)}">
          <div class="test-category-header">${catIcon} ${this._esc(cat.name)} <span class="test-cat-count">(${cat.passed}/${cat.tests.length})</span></div>
          <div class="test-category-body">${tests}</div>
        </div>`;
    }).join('');

    // Also update summary live
    const summary = this.runner.getSummary();
    this._renderSummary(summary);
  }

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  show() {
    this.container.style.display = 'flex';
    this._renderResults();
  }

  hide() {
    this.container.style.display = 'none';
  }
}
