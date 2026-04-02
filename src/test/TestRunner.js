// ─── Test Runner: execution engine with assert, category management, results ───

export class TestRunner {
  constructor() {
    this.categories = [];
    this._currentCategory = null;
    this.onProgress = null;  // callback(category, test, result)
    this.onComplete = null;  // callback(summary)
  }

  category(name) {
    this._currentCategory = { name, tests: [], passed: 0, failed: 0 };
    this.categories.push(this._currentCategory);
  }

  test(name, fn, topologyFn) {
    if (!this._currentCategory) throw new Error('Call category() before test()');
    this._currentCategory.tests.push({
      name, fn, topologyFn: topologyFn || null,
      status: 'pending', error: null, duration: null, logs: []
    });
  }

  _createAssert() {
    const logs = [];

    const pass = (type, detail) => logs.push({ ok: true, type, detail });
    const fail = (type, detail, msg) => { logs.push({ ok: false, type, detail }); throw new AssertionError(msg); };

    const assert = {
      _logs: logs,
      ok(value, message) {
        const msg = message || `Expected truthy, got ${value}`;
        if (value) pass('ok', msg);
        else fail('ok', msg, msg);
      },
      equal(actual, expected, message) {
        const detail = `${JSON.stringify(actual)} === ${JSON.stringify(expected)}`;
        const msg = message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
        if (actual === expected) pass('equal', detail);
        else fail('equal', detail, msg);
      },
      notEqual(actual, expected, message) {
        const detail = `${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`;
        const msg = message || `Expected not ${JSON.stringify(expected)}`;
        if (actual !== expected) pass('notEqual', detail);
        else fail('notEqual', detail, msg);
      },
      deepEqual(actual, expected, message) {
        const detail = `deepEqual(${JSON.stringify(actual)}, ${JSON.stringify(expected)})`;
        const msg = message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
        if (JSON.stringify(actual) === JSON.stringify(expected)) pass('deepEqual', detail);
        else fail('deepEqual', detail, msg);
      },
      includes(arr, item, message) {
        const found = Array.isArray(arr)
          ? arr.includes(item)
          : typeof arr === 'string' && arr.includes(item);
        const detail = `includes(${JSON.stringify(item)})`;
        const msg = message || `Expected to include ${JSON.stringify(item)}`;
        if (found) pass('includes', detail);
        else fail('includes', detail, msg);
      },
      throws(fn, message) {
        let threw = false;
        try { fn(); } catch (_) { threw = true; }
        const msg = message || 'Expected function to throw';
        if (threw) pass('throws', msg);
        else fail('throws', msg, msg);
      },
    };
    return assert;
  }

  async runAll() {
    for (const cat of this.categories) {
      cat.passed = 0;
      cat.failed = 0;
      for (const t of cat.tests) {
        await this._runTest(cat, t);
      }
    }
    this._notifyComplete();
  }

  async runFailed() {
    for (const cat of this.categories) {
      cat.passed = 0;
      cat.failed = 0;
      for (const t of cat.tests) {
        if (t.status === 'failed') {
          t.status = 'pending';
          t.error = null;
          t.duration = null;
          await this._runTest(cat, t);
        } else if (t.status === 'passed') {
          cat.passed++;
        }
      }
    }
    this._notifyComplete();
  }

  async runCategory(categoryName) {
    const cat = this.categories.find(c => c.name === categoryName);
    if (!cat) return;
    cat.passed = 0;
    cat.failed = 0;
    for (const t of cat.tests) {
      t.status = 'pending';
      t.error = null;
      t.duration = null;
      await this._runTest(cat, t);
    }
    this._notifyComplete();
  }

  async runSingle(categoryName, testIndex) {
    const cat = this.categories.find(c => c.name === categoryName);
    if (!cat || testIndex < 0 || testIndex >= cat.tests.length) return;
    const t = cat.tests[testIndex];
    // Reset this test
    t.status = 'pending';
    t.error = null;
    t.duration = null;
    // Recalculate category totals (subtract old result if any)
    cat.passed = 0;
    cat.failed = 0;
    for (const test of cat.tests) {
      if (test === t) continue;
      if (test.status === 'passed') cat.passed++;
      else if (test.status === 'failed') cat.failed++;
    }
    await this._runTest(cat, t);
    this._notifyComplete();
  }

  async _runTest(cat, t) {
    const assert = this._createAssert();
    const start = performance.now();
    try {
      await t.fn(assert);
      t.status = 'passed';
      t.error = null;
      cat.passed++;
    } catch (e) {
      t.status = 'failed';
      t.error = e.message || String(e);
      cat.failed++;
    }
    t.duration = Math.round((performance.now() - start) * 100) / 100;
    t.logs = assert._logs;
    if (this.onProgress) this.onProgress(cat, t);
  }

  _notifyComplete() {
    const summary = this.getSummary();
    if (this.onComplete) this.onComplete(summary);
  }

  getSummary() {
    let totalPassed = 0, totalFailed = 0, totalTests = 0;
    for (const cat of this.categories) {
      totalPassed += cat.passed;
      totalFailed += cat.failed;
      totalTests += cat.tests.length;
    }
    return { totalPassed, totalFailed, totalTests };
  }

  reset() {
    this.categories = [];
    this._currentCategory = null;
  }
}

class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}
