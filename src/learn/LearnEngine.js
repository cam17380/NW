// ─── Learn Engine: lesson state management, step navigation, progress persistence ───

const STORAGE_KEY = 'netsim-learn-progress';

export class LearnEngine {
  constructor() {
    this.lessons = [];
    this.current = null;       // Currently active lesson
    this.currentStep = 0;      // Current step index
    this.progress = this._loadProgress();
    this.onUpdate = null;
  }

  // ─── Lesson Registration ───
  registerLessons(lessonList) {
    for (const l of lessonList) {
      if (!this.lessons.find(e => e.id === l.id)) {
        this.lessons.push(l);
      }
    }
  }

  getLessons() { return this.lessons; }

  getCategories() {
    const cats = new Set(this.lessons.map(l => l.category));
    return [...cats];
  }

  isCompleted(lessonId) {
    return this.progress[lessonId] === true;
  }

  getCompletedCount() {
    return Object.values(this.progress).filter(v => v === true).length;
  }

  getFurthestStep(lessonId) {
    return this.progress[lessonId + ':step'] || 0;
  }

  // ─── Lesson Lifecycle ───
  start(lessonId) {
    const lesson = this.lessons.find(l => l.id === lessonId);
    if (!lesson) return false;

    this.current = lesson;
    this.currentStep = 0;
    this._notify();
    return true;
  }

  stop() {
    this.current = null;
    this.currentStep = 0;
    this._notify();
  }

  isActive() {
    return this.current !== null;
  }

  // ─── Step Navigation ───
  getCurrentStep() {
    if (!this.current) return null;
    return this.current.steps[this.currentStep] || null;
  }

  getTotalSteps() {
    return this.current ? this.current.steps.length : 0;
  }

  getStepIndex() {
    return this.currentStep;
  }

  nextStep() {
    if (!this.current) return false;
    if (this.currentStep < this.current.steps.length - 1) {
      this.currentStep++;
      this._saveFurthestStep();
      this._notify();
      return true;
    }
    // Reached the end — mark lesson complete
    this._markCompleted();
    this._notify();
    return false;
  }

  prevStep() {
    if (!this.current || this.currentStep <= 0) return false;
    this.currentStep--;
    this._notify();
    return true;
  }

  goToStep(index) {
    if (!this.current) return false;
    if (index < 0 || index >= this.current.steps.length) return false;
    this.currentStep = index;
    this._notify();
    return true;
  }

  isLastStep() {
    if (!this.current) return false;
    return this.currentStep >= this.current.steps.length - 1;
  }

  isFirstStep() {
    return this.currentStep === 0;
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

  _markCompleted() {
    if (!this.current) return;
    this.progress[this.current.id] = true;
    this._saveProgress();
  }

  _saveFurthestStep() {
    if (!this.current) return;
    const key = this.current.id + ':step';
    const prev = this.progress[key] || 0;
    if (this.currentStep > prev) {
      this.progress[key] = this.currentStep;
      this._saveProgress();
    }
  }

  resetProgress() {
    this.progress = {};
    this._saveProgress();
    this._notify();
  }

  _notify() {
    if (this.onUpdate) this.onUpdate();
  }
}
