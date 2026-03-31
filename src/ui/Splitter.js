// ─── Splitter: Draggable panel divider between canvas and terminal ───

const STORAGE_KEY = 'nw-sim-splitter-width';
const MIN_TERMINAL = 300;
const MIN_DIAGRAM = 200;
const DEFAULT_TERMINAL = 540;

export function initSplitter(splitterEl, terminalPanel, diagramPanel, onResize) {
  // Restore saved width
  const saved = localStorage.getItem(STORAGE_KEY);
  const initial = saved ? parseInt(saved, 10) : DEFAULT_TERMINAL;
  terminalPanel.style.width = initial + 'px';

  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  splitterEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX;
    startWidth = terminalPanel.getBoundingClientRect().width;
    splitterEl.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    // Terminal is on the right: dragging left increases terminal width
    const delta = startX - e.clientX;
    let newWidth = startWidth + delta;

    // Enforce minimums
    const containerWidth = splitterEl.parentElement.getBoundingClientRect().width;
    const splitterWidth = splitterEl.getBoundingClientRect().width;
    const maxTerminal = containerWidth - splitterWidth - MIN_DIAGRAM;

    newWidth = Math.max(MIN_TERMINAL, Math.min(newWidth, maxTerminal));
    terminalPanel.style.width = newWidth + 'px';

    onResize();
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    splitterEl.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Persist
    const finalWidth = terminalPanel.getBoundingClientRect().width;
    localStorage.setItem(STORAGE_KEY, Math.round(finalWidth));

    // Final crisp resize
    onResize();
  });
}
