// ─── Challenge Selector: scenario selection modal ───
import { t } from '../i18n/I18n.js';

export class ChallengeSelector {
  constructor(engine) {
    this.engine = engine;
    this.el = null;
    this.onSelect = null;  // Callback: (scenarioId) => void
    this.filterDifficulty = 'all';
    this.filterCategory = 'all';
  }

  mount(container) {
    this.el = document.createElement('div');
    this.el.id = 'challengeSelector';
    this.el.className = 'challenge-selector-overlay';
    this.el.style.display = 'none';
    container.appendChild(this.el);
  }

  show() {
    if (this.el) {
      this.el.style.display = 'flex';
      this.render();
    }
  }

  hide() {
    if (this.el) this.el.style.display = 'none';
  }

  render() {
    if (!this.el) return;

    const scenarios = this._getFiltered();
    const categories = this.engine.getCategories();
    const completedCount = this.engine.getCompletedCount();
    const totalCount = this.engine.getScenarios().length;

    this.el.innerHTML = `
      <div class="challenge-selector-modal">
        <div class="challenge-selector-header">
          <h2>${t('ui.challengeMode')}</h2>
          <span class="challenge-progress-badge">${t('ui.completed', { n: completedCount, total: totalCount })}</span>
          <button class="challenge-selector-close">\u2715</button>
        </div>
        <div class="challenge-selector-filters">
          <div class="challenge-filter-group">
            <label>${t('ui.difficulty')}</label>
            <select class="challenge-filter-select" data-filter="difficulty">
              <option value="all" ${this.filterDifficulty === 'all' ? 'selected' : ''}>${t('ui.all')}</option>
              <option value="beginner" ${this.filterDifficulty === 'beginner' ? 'selected' : ''}>${t('ui.beginner')}</option>
              <option value="intermediate" ${this.filterDifficulty === 'intermediate' ? 'selected' : ''}>${t('ui.intermediate')}</option>
              <option value="advanced" ${this.filterDifficulty === 'advanced' ? 'selected' : ''}>${t('ui.advanced')}</option>
            </select>
          </div>
          <div class="challenge-filter-group">
            <label>${t('ui.category')}</label>
            <select class="challenge-filter-select" data-filter="category">
              <option value="all" ${this.filterCategory === 'all' ? 'selected' : ''}>${t('ui.all')}</option>
              ${categories.map(c => `<option value="${c}" ${this.filterCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="challenge-selector-grid">
          ${scenarios.map(s => this._renderCard(s)).join('')}
        </div>
      </div>
    `;

    // Events
    this.el.querySelector('.challenge-selector-close').onclick = () => this.hide();
    this.el.onclick = (e) => { if (e.target === this.el) this.hide(); };

    for (const select of this.el.querySelectorAll('.challenge-filter-select')) {
      select.onchange = (e) => {
        const filter = e.target.dataset.filter;
        if (filter === 'difficulty') this.filterDifficulty = e.target.value;
        if (filter === 'category') this.filterCategory = e.target.value;
        this.render();
      };
    }

    for (const card of this.el.querySelectorAll('.challenge-card')) {
      card.onclick = () => {
        const id = card.dataset.id;
        this.hide();
        if (this.onSelect) this.onSelect(id);
      };
    }
  }

  _getFiltered() {
    return this.engine.getScenarios().filter(s => {
      if (this.filterDifficulty !== 'all' && s.difficulty !== this.filterDifficulty) return false;
      if (this.filterCategory !== 'all' && s.category !== this.filterCategory) return false;
      return true;
    });
  }

  _renderCard(s) {
    const completed = this.engine.isCompleted(s.id);
    const diffColor = { beginner: '#69f0ae', intermediate: '#ffa726', advanced: '#ef5350' }[s.difficulty] || '#888';
    const diffLabel = { beginner: t('ui.beginner'), intermediate: t('ui.intermediate'), advanced: t('ui.advanced') }[s.difficulty] || s.difficulty;

    return `
      <div class="challenge-card ${completed ? 'completed' : ''}" data-id="${s.id}">
        <div class="challenge-card-header">
          <span class="challenge-badge" style="background:${diffColor}">${diffLabel}</span>
          <span class="challenge-card-category">${s.category}</span>
          ${completed ? '<span class="challenge-card-check">\u2714</span>' : ''}
        </div>
        <div class="challenge-card-title">${s.title}</div>
        <div class="challenge-card-desc">${s.description}</div>
        <div class="challenge-card-meta">${t('ui.objectives', { n: s.objectives.length, s: s.objectives.length > 1 ? 's' : '' })} \u00b7 ${t('ui.hints', { n: s.hints.length, s: s.hints.length > 1 ? 's' : '' })}</div>
      </div>
    `;
  }
}
