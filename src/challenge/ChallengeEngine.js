// ─── Challenge Engine: scenario management, verification, hints, progress ───

const STORAGE_KEY = 'netsim-challenge-progress';

export class ChallengeEngine {
  constructor() {
    this.scenarios = [];       // All registered scenarios
    this.current = null;       // Currently active scenario
    this.hintsRevealed = 0;    // How many hints have been revealed
    this.objectiveStates = []; // Per-objective pass/fail state
    this.progress = this._loadProgress();
    this.onUpdate = null;      // Callback when state changes
  }

  // ─── Scenario Registration ───
  registerScenarios(scenarioList) {
    for (const s of scenarioList) {
      if (!this.scenarios.find(e => e.id === s.id)) {
        this.scenarios.push(s);
      }
    }
  }

  getScenarios() { return this.scenarios; }

  getCategories() {
    const cats = new Set(this.scenarios.map(s => s.category));
    return [...cats];
  }

  getScenariosByDifficulty(difficulty) {
    return this.scenarios.filter(s => s.difficulty === difficulty);
  }

  getScenariosByCategory(category) {
    return this.scenarios.filter(s => s.category === category);
  }

  isCompleted(scenarioId) {
    return this.progress[scenarioId] === true;
  }

  getCompletedCount() {
    return Object.values(this.progress).filter(v => v === true).length;
  }

  // ─── Scenario Lifecycle ───
  start(scenarioId, store) {
    const scenario = this.scenarios.find(s => s.id === scenarioId);
    if (!scenario) return false;

    this.current = scenario;
    this.hintsRevealed = 0;
    this.objectiveStates = scenario.objectives.map(() => false);

    // Build and load topology
    const { devices, links } = scenario.topology();
    // Ensure all devices have arpTable
    for (const dv of Object.values(devices)) {
      if (!dv.arpTable) dv.arpTable = [];
      if (dv.nat && !dv.nat.translations) dv.nat.translations = [];
      if (dv.nat && !dv.nat.stats) dv.nat.stats = { hits: 0, misses: 0 };
    }
    store.setTopology(devices, links || this._extractLinks(devices));
    store.resetView();

    this._notify();
    return true;
  }

  stop() {
    this.current = null;
    this.hintsRevealed = 0;
    this.objectiveStates = [];
    this._notify();
  }

  isActive() {
    return this.current !== null;
  }

  // ─── Objective Verification ───
  check(devices) {
    if (!this.current) return { allPassed: false, results: [] };

    const results = this.current.objectives.map((obj, i) => {
      try {
        const passed = obj.check(devices);
        this.objectiveStates[i] = passed;
        return { text: obj.text, passed };
      } catch {
        this.objectiveStates[i] = false;
        return { text: obj.text, passed: false };
      }
    });

    const allPassed = results.every(r => r.passed);
    if (allPassed) {
      this.progress[this.current.id] = true;
      this._saveProgress();
    }

    this._notify();
    return { allPassed, results };
  }

  getObjectiveStates() {
    if (!this.current) return [];
    return this.current.objectives.map((obj, i) => ({
      text: obj.text,
      passed: this.objectiveStates[i] || false,
    }));
  }

  // ─── Hints ───
  revealNextHint() {
    if (!this.current) return null;
    if (this.hintsRevealed >= this.current.hints.length) return null;
    this.hintsRevealed++;
    this._notify();
    return this.current.hints[this.hintsRevealed - 1];
  }

  getRevealedHints() {
    if (!this.current) return [];
    return this.current.hints.slice(0, this.hintsRevealed);
  }

  getTotalHints() {
    return this.current ? this.current.hints.length : 0;
  }

  // ─── Progress Persistence ───
  _loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch { return {}; }
  }

  _saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch { /* ignore */ }
  }

  resetProgress() {
    this.progress = {};
    this._saveProgress();
    this._notify();
  }

  // ─── Helpers ───
  _extractLinks(devices) {
    const links = [];
    const seen = new Set();
    for (const [id, dv] of Object.entries(devices)) {
      for (const [ifName, iface] of Object.entries(dv.interfaces || {})) {
        if (!iface.connected) continue;
        const peerId = iface.connected.device;
        const peerIf = iface.connected.iface;
        if (!devices[peerId]) continue;
        const key = [id, peerId].sort().join(':') + ':' + [ifName, peerIf].sort().join(':');
        if (seen.has(key)) continue;
        seen.add(key);
        links.push({ from: id, fromIf: ifName, to: peerId, toIf: peerIf });
      }
    }
    return links;
  }

  _notify() {
    if (this.onUpdate) this.onUpdate();
  }
}
