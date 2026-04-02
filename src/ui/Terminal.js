// ─── Terminal output management ───

export class Terminal {
  constructor(outputEl) {
    this.outputEl = outputEl;
  }

  write(text, cls = 'output-line') {
    const span = document.createElement('span');
    span.className = cls;
    span.textContent = text + '\n';
    this.outputEl.appendChild(span);
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  writeCmd(prompt, cmd) {
    this.write(prompt + cmd, 'cmd-line');
  }

  clear() {
    this.outputEl.innerHTML = '';
  }

  // ─── Per-device buffer save/restore ───
  getBuffer() {
    return this.outputEl.innerHTML;
  }

  setBuffer(html) {
    this.outputEl.innerHTML = html;
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }
}
