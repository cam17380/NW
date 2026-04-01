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

  test(name, fn) {
    if (!this._currentCategory) throw new Error('Call category() before test()');
    this._currentCategory.tests.push({ name, fn, status: 'pending', error: null });
  }

  _createAssert() {
    const assert = {
      ok(value, message) {
        if (!value) throw new AssertionError(message || `Expected truthy, got ${value}`);
      },
      equal(actual, expected, message) {
        if (actual !== expected) {
          throw new AssertionError(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      notEqual(actual, expected, message) {
        if (actual === expected) {
          throw new AssertionError(message || `Expected not ${JSON.stringify(expected)}`);
        }
      },
      deepEqual(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new AssertionError(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      includes(arr, item, message) {
        const found = Array.isArray(arr)
          ? arr.includes(item)
          : typeof arr === 'string' && arr.includes(item);
        if (!found) throw new AssertionError(message || `Expected to include ${JSON.stringify(item)}`);
      },
      throws(fn, message) {
        let threw = false;
        try { fn(); } catch (_) { threw = true; }
        if (!threw) throw new AssertionError(message || 'Expected function to throw');
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
      await this._runTest(cat, t);
    }
    this._notifyComplete();
  }

  async _runTest(cat, t) {
    const assert = this._createAssert();
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
