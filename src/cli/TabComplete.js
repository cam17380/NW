// ─── Tab completion ───
import { commandTree } from './CommandRegistry.js';

export function tabComplete(input, cliMode, termWrite, getPrompt) {
  const cmds = commandTree[cliMode] || [];
  const lower = input.toLowerCase();
  const matches = cmds.filter(c => c.startsWith(lower));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    termWrite(getPrompt() + input, 'cmd-line');
    termWrite(matches.join('  '));
  }
  return input;
}
