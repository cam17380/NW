// ─── Test Mode UI: Interactive test selection, topology preview, execution ───

import { renderTestTopology } from './TestCanvasRenderer.js';

const SPLITTER_KEY = 'nw-sim-test-splitter';
const MIN_SIDEBAR = 240;
const MIN_DETAIL  = 300;
const DEFAULT_SIDEBAR = 360;

const TOPO_HEIGHT_KEY = 'nw-sim-test-topo-height';
const MIN_TOPO_H = 120;
const MAX_TOPO_H = 600;
const DEFAULT_TOPO_H = 300;

export class TestUI {
  constructor(container, runner) {
    this.container = container;
    this.runner = runner;
    this.onBack = null;
    this.onOpenInSimulator = null;   // callback(devices) — load topology in main sim
    this._selectedCat = null;        // selected category name
    this._selectedTest = null;       // selected test index within category
    this._filter = 'all';            // 'all' | 'passed' | 'failed' | 'pending'
    this._topoHeight = parseInt(localStorage.getItem(TOPO_HEIGHT_KEY), 10) || DEFAULT_TOPO_H;
    this._build();
    this._bind();
  }

  _build() {
    this.container.innerHTML = `
      <div class="test-mode">
        <div class="test-header">
          <button class="test-btn back" id="testBack">Back to Simulator</button>
          <span class="test-title">Test Mode</span>
        </div>
        <div class="test-summary" id="testSummary">
          <button class="test-btn run-all" id="testRunAll">Run All</button>
          <button class="test-btn run-failed" id="testRunFailed" disabled>Run Failed</button>
          <span class="test-summary-text" id="testSummaryText">Click "Run All" to start tests</span>
          <div class="test-progress-bar"><div class="test-progress-fill" id="testProgressFill"></div></div>
          <span class="test-progress-pct" id="testProgressPct"></span>
        </div>
        <div class="test-body">
          <div class="test-sidebar-wrapper">
            <div class="test-filter-bar" id="testFilterBar">
              <button class="test-filter-btn active" data-filter="all">All</button>
              <button class="test-filter-btn" data-filter="passed">Passed</button>
              <button class="test-filter-btn" data-filter="failed">Failed</button>
              <button class="test-filter-btn" data-filter="pending">Pending</button>
            </div>
            <div class="test-sidebar" id="testSidebar"></div>
          </div>
          <div class="test-splitter" id="testSplitter"></div>
          <div class="test-detail" id="testDetail">
            <div class="test-detail-empty">Select a test to view details</div>
          </div>
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

    // Filter buttons
    this.container.querySelectorAll('.test-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.test-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._filter = btn.dataset.filter;
        this._renderSidebar();
      });
    });

    // Splitter drag
    this._initSplitter();

    this.runner.onProgress = (cat, test) => {
      this._renderSidebar();
      // If the running test is selected, update the detail panel
      if (this._selectedCat === cat.name) {
        const tIdx = cat.tests.indexOf(test);
        if (tIdx === this._selectedTest) this._renderDetail();
      }
      const summary = this.runner.getSummary();
      this._renderSummary(summary);
    };

    this.runner.onComplete = (summary) => {
      this._renderSummary(summary);
    };
  }

  // ─── Sidebar ↔ Detail splitter ───
  _initSplitter() {
    const splitter = this.container.querySelector('#testSplitter');
    const sidebarWrap = this.container.querySelector('.test-sidebar-wrapper');

    const saved = localStorage.getItem(SPLITTER_KEY);
    const initial = saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR;
    sidebarWrap.style.width = initial + 'px';

    let dragging = false, startX = 0, startW = 0;

    splitter.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragging = true;
      startX = e.clientX;
      startW = sidebarWrap.getBoundingClientRect().width;
      splitter.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const delta = e.clientX - startX;
      const containerW = this.container.querySelector('.test-body').getBoundingClientRect().width;
      const splitterW = splitter.getBoundingClientRect().width;
      const maxSidebar = containerW - splitterW - MIN_DETAIL;
      const newW = Math.max(MIN_SIDEBAR, Math.min(maxSidebar, startW + delta));
      sidebarWrap.style.width = newW + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      splitter.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const finalW = sidebarWrap.getBoundingClientRect().width;
      localStorage.setItem(SPLITTER_KEY, Math.round(finalW));
    });
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

    this.container.querySelector('#testRunFailed').disabled = summary.totalFailed === 0;
  }

  // ─── Sidebar: categories + individual test items ───
  _renderSidebar() {
    const sidebar = this.container.querySelector('#testSidebar');

    sidebar.innerHTML = this.runner.categories.map(cat => {
      const total = cat.tests.length;
      const hasFail = cat.failed > 0;
      const hasRun = cat.passed + cat.failed > 0;
      const catIcon = !hasRun ? '&#x25CB;' : (hasFail ? '&#x2716;' : '&#x2714;');
      const catIconCls = !hasRun ? 'pending' : (hasFail ? 'fail' : 'pass');
      const catCls = hasFail ? 'test-cat-header has-failures' : 'test-cat-header';

      // Filter tests
      const filteredTests = cat.tests.map((t, i) => ({ t, i })).filter(({ t }) => {
        if (this._filter === 'all') return true;
        return t.status === this._filter;
      });

      const testsHtml = filteredTests.map(({ t, i }) => {
        let icon, iconCls;
        if (t.status === 'passed') { icon = '&#x2714;'; iconCls = 'pass'; }
        else if (t.status === 'failed') { icon = '&#x2716;'; iconCls = 'fail'; }
        else { icon = '&#x25CB;'; iconCls = 'pending'; }

        const selected = (this._selectedCat === cat.name && this._selectedTest === i) ? ' selected' : '';
        const duration = t.duration !== null ? `<span class="test-duration">${t.duration}ms</span>` : '';
        return `<div class="test-item-row${selected}" data-cat="${this._esc(cat.name)}" data-idx="${i}">
          <span class="test-icon ${iconCls}">${icon}</span>
          <span class="test-item-name">${this._esc(t.name)}</span>
          ${duration}
        </div>`;
      }).join('');

      return `
        <div class="test-cat-group">
          <div class="${catCls}" data-cat="${this._esc(cat.name)}">
            <span class="test-icon ${catIconCls}">${catIcon}</span>
            <span class="test-cat-name">${this._esc(cat.name)}</span>
            <span class="test-cat-count">(${cat.passed}/${total})</span>
            <button class="test-cat-run" data-cat="${this._esc(cat.name)}" title="Run this category">&#x25B6;</button>
          </div>
          <div class="test-cat-tests">${testsHtml}</div>
        </div>`;
    }).join('');

    // Event: click category run button
    sidebar.querySelectorAll('.test-cat-run').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const catName = btn.dataset.cat;
        this._setRunning(true);
        this.runner.runCategory(catName).then(() => this._setRunning(false));
      });
    });

    // Event: click test item → select it
    sidebar.querySelectorAll('.test-item-row').forEach(el => {
      el.addEventListener('click', () => {
        this._selectedCat = el.dataset.cat;
        this._selectedTest = parseInt(el.dataset.idx, 10);
        this._renderSidebar();
        this._renderDetail();
      });
    });
  }

  // ─── Detail panel: topology preview + run + result ───
  _renderDetail() {
    const detail = this.container.querySelector('#testDetail');
    const cat = this.runner.categories.find(c => c.name === this._selectedCat);
    if (!cat || this._selectedTest == null || !cat.tests[this._selectedTest]) {
      detail.innerHTML = '<div class="test-detail-empty">Select a test to view details</div>';
      return;
    }

    const t = cat.tests[this._selectedTest];

    // Result section
    let resultHtml = '';
    if (t.status === 'passed') {
      resultHtml = `<div class="test-result-box passed">
        <span class="test-icon pass">&#x2714;</span> PASSED
        ${t.duration !== null ? `<span class="test-duration">${t.duration}ms</span>` : ''}
      </div>`;
    } else if (t.status === 'failed') {
      resultHtml = `<div class="test-result-box failed">
        <span class="test-icon fail">&#x2716;</span> FAILED
        ${t.duration !== null ? `<span class="test-duration">${t.duration}ms</span>` : ''}
        <div class="test-error">${this._esc(t.error)}</div>
      </div>`;
    } else {
      resultHtml = '<div class="test-result-box pending"><span class="test-icon pending">&#x25CB;</span> Not yet executed</div>';
    }

    const hasTopology = !!t.topologyFn;
    const topoH = this._topoHeight;

    // Build execution log HTML
    let logsHtml = '';
    if (t.logs && t.logs.length > 0) {
      const rows = t.logs.map((log) => {
        const icon = log.ok ? '<span class="test-icon pass">&#x2714;</span>' : '<span class="test-icon fail">&#x2716;</span>';
        const cls = log.ok ? 'test-log-pass' : 'test-log-fail';
        return `<div class="test-log-row ${cls}">${icon}<span class="test-log-type">${log.type}</span><span class="test-log-detail">${this._esc(log.detail)}</span></div>`;
      }).join('');
      logsHtml = `<div class="test-log-section">
        <div class="test-log-header">Execution Log (${t.logs.length} assertions)</div>
        <div class="test-log-body">${rows}</div>
      </div>`;
    }

    detail.innerHTML = `
      <div class="test-detail-content">
        <div class="test-detail-header">
          <span class="test-detail-cat">${this._esc(cat.name)}</span>
          <h3 class="test-detail-title">${this._esc(t.name)}</h3>
        </div>
        <div class="test-detail-actions">
          <button class="test-btn run-single" id="testRunSingle">&#x25B6; Run</button>
          ${hasTopology ? '<button class="test-btn open-sim" id="testOpenSim">Open in Simulator</button>' : ''}
        </div>
        <div class="test-detail-result">${resultHtml}</div>
        ${hasTopology ? `
          <div class="test-topo-container" id="testTopoContainer" style="height:${topoH}px">
            <canvas class="test-topo-canvas" id="testTopoCanvas"></canvas>
            <div class="test-topo-resize" id="testTopoResize"></div>
          </div>` : ''}
        ${logsHtml}
      </div>
    `;

    // Bind run single
    detail.querySelector('#testRunSingle').addEventListener('click', () => {
      const btn = detail.querySelector('#testRunSingle');
      btn.disabled = true;
      btn.innerHTML = '&#x23F3; Running...';
      this.runner.runSingle(this._selectedCat, this._selectedTest).then(() => {
        btn.disabled = false;
        btn.innerHTML = '&#x25B6; Run';
        this._renderSidebar();
        this._renderDetail();
      });
    });

    // Bind open in simulator
    const openBtn = detail.querySelector('#testOpenSim');
    if (openBtn && hasTopology) {
      openBtn.addEventListener('click', () => {
        const { devices } = t.topologyFn();
        if (this.onOpenInSimulator) this.onOpenInSimulator(devices);
      });
    }

    // Topology canvas resize handle
    if (hasTopology) {
      this._initTopoResize();
    }

    // Render topology preview
    if (hasTopology) {
      requestAnimationFrame(() => {
        const canvas = detail.querySelector('#testTopoCanvas');
        if (canvas) {
          const { devices } = t.topologyFn();
          renderTestTopology(canvas, devices);
        }
      });
    }
  }

  // ─── Topology canvas vertical resize ───
  _initTopoResize() {
    // Clean up previous listeners if any
    if (this._topoResizeCleanup) this._topoResizeCleanup();

    const handle = this.container.querySelector('#testTopoResize');
    const topoContainer = this.container.querySelector('#testTopoContainer');
    if (!handle || !topoContainer) return;

    let dragging = false, startY = 0, startH = 0;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragging = true;
      startY = e.clientY;
      startH = topoContainer.getBoundingClientRect().height;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      handle.classList.add('active');
    });

    // Cache topology devices so we don't rebuild every frame
    let cachedDevices = null;
    const getDevices = () => {
      if (cachedDevices) return cachedDevices;
      const cat = this.runner.categories.find(c => c.name === this._selectedCat);
      if (cat && cat.tests[this._selectedTest] && cat.tests[this._selectedTest].topologyFn) {
        cachedDevices = cat.tests[this._selectedTest].topologyFn().devices;
      }
      return cachedDevices;
    };

    const rerenderCanvas = () => {
      const canvas = this.container.querySelector('#testTopoCanvas');
      const devices = getDevices();
      if (canvas && devices) {
        renderTestTopology(canvas, devices);
      }
    };

    const onMove = (e) => {
      if (!dragging) return;
      const delta = e.clientY - startY;
      const newH = Math.max(MIN_TOPO_H, Math.min(MAX_TOPO_H, startH + delta));
      topoContainer.style.height = newH + 'px';
      // Live re-render during drag
      requestAnimationFrame(rerenderCanvas);
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      cachedDevices = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      handle.classList.remove('active');
      const finalH = topoContainer.getBoundingClientRect().height;
      this._topoHeight = Math.round(finalH);
      localStorage.setItem(TOPO_HEIGHT_KEY, this._topoHeight);
      // Final re-render after layout settles
      requestAnimationFrame(rerenderCanvas);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    this._topoResizeCleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  show() {
    this.container.style.display = 'flex';
    this._renderSidebar();
    // Re-render detail if something was selected
    if (this._selectedCat) this._renderDetail();
  }

  hide() {
    this.container.style.display = 'none';
  }
}
