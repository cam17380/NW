// ─── Learn Selector: lesson selection modal ───

export class LearnSelector {
  constructor(engine) {
    this.engine = engine;
    this.el = null;
    this.onSelect = null;  // Callback: (lessonId) => void
    this.filterCategory = 'all';
  }

  mount(container) {
    this.el = document.createElement('div');
    this.el.id = 'learnSelector';
    this.el.className = 'learn-selector-overlay';
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

    const lessons = this._getFiltered();
    const categories = this.engine.getCategories();
    const completedCount = this.engine.getCompletedCount();
    const totalCount = this.engine.getLessons().length;

    this.el.innerHTML = `
      <div class="learn-selector-modal">
        <div class="learn-selector-header">
          <h2>Learn — Networking Basics</h2>
          <span class="learn-progress-badge">${completedCount} / ${totalCount} completed</span>
          <button class="learn-selector-close">\u2715</button>
        </div>
        <p class="learn-selector-desc">
          Animated lessons to help you understand core networking concepts step by step.
        </p>
        ${categories.length > 1 ? `
          <div class="learn-selector-filters">
            <div class="learn-filter-group">
              <label>Category:</label>
              <select class="learn-filter-select" data-filter="category">
                <option value="all" ${this.filterCategory === 'all' ? 'selected' : ''}>All</option>
                ${categories.map(c => `<option value="${c}" ${this.filterCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>
        ` : ''}
        <div class="learn-selector-grid">
          ${lessons.map((l, i) => this._renderCard(l, i)).join('')}
        </div>
      </div>
    `;

    // Events
    this.el.querySelector('.learn-selector-close').onclick = () => this.hide();
    this.el.onclick = (e) => { if (e.target === this.el) this.hide(); };

    for (const select of this.el.querySelectorAll('.learn-filter-select')) {
      select.onchange = (e) => {
        this.filterCategory = e.target.value;
        this.render();
      };
    }

    for (const card of this.el.querySelectorAll('.learn-card')) {
      card.onclick = () => {
        const id = card.dataset.id;
        this.hide();
        if (this.onSelect) this.onSelect(id);
      };
    }
  }

  _getFiltered() {
    return this.engine.getLessons().filter(l => {
      if (this.filterCategory !== 'all' && l.category !== this.filterCategory) return false;
      return true;
    });
  }

  _renderCard(l, index) {
    const completed = this.engine.isCompleted(l.id);
    const stepsCount = l.steps.length;
    const iconMap = {
      'IP Addressing': '\ud83c\udf10',
      'L2 Switching': '\ud83d\udd0c',
      'L3 Routing': '\ud83d\udee3\ufe0f',
    };
    const icon = iconMap[l.category] || '\ud83d\udcd6';

    return `
      <div class="learn-card ${completed ? 'completed' : ''}" data-id="${l.id}">
        <div class="learn-card-icon">${icon}</div>
        <div class="learn-card-body">
          <div class="learn-card-header">
            <span class="learn-card-number">Lesson ${index + 1}</span>
            ${completed ? '<span class="learn-card-check">\u2714</span>' : ''}
          </div>
          <div class="learn-card-title">${l.title}</div>
          <div class="learn-card-desc">${l.description}</div>
          <div class="learn-card-meta">${stepsCount} steps</div>
        </div>
      </div>
    `;
  }
}
