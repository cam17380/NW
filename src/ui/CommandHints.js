// ─── Command hint chip panel ───
import { getCmdHintData } from '../cli/CommandRegistry.js';
import { shortIfName } from '../simulation/NetworkUtils.js';

export function updateCmdHints(store) {
  const container = document.getElementById('cmdHints');
  container.innerHTML = '';

  const cliMode = store.getCLIMode();
  const modeLabels = {
    user: 'User EXEC', privileged: 'Privileged EXEC',
    config: 'Global Config', 'config-if': 'Interface Config',
    'config-vlan': 'VLAN Config',
    'config-isakmp': 'ISAKMP Policy Config',
    'config-crypto-map': 'Crypto Map Config',
    'config-dhcp-pool': 'DHCP Pool Config',
  };
  const title = document.createElement('div');
  title.className = 'cmd-hint-title';
  title.textContent = (modeLabels[cliMode] || cliMode) + ' commands';
  container.appendChild(title);

  const cmdHintData = getCmdHintData(store);
  const hints = cmdHintData[cliMode] || [];
  for (const hint of hints) {
    if (hint.cond && !hint.cond()) continue;
    const chip = document.createElement('span');
    chip.className = 'cmd-chip category-' + hint.cat;
    chip.textContent = hint.label;
    chip.onclick = () => {
      const input = document.getElementById('cmdInput');
      input.value = hint.fill;
      input.focus();
    };
    container.appendChild(chip);
  }
}

export function updatePrompt(store) {
  const dev = store.getCurrentDevice();
  const cliMode = store.getCLIMode();

  const h = dev.hostname;
  let prompt;
  switch (cliMode) {
    case 'user': prompt = h + '>'; break;
    case 'privileged': prompt = h + '#'; break;
    case 'config': prompt = h + '(config)#'; break;
    case 'config-if': prompt = h + '(config-if)#'; break;
    case 'config-vlan': prompt = h + '(config-vlan)#'; break;
    case 'config-isakmp': prompt = h + '(config-isakmp)#'; break;
    case 'config-crypto-map': prompt = h + '(config-crypto-map)#'; break;
    case 'config-dhcp-pool': prompt = h + '(dhcp-config)#'; break;
  }

  document.getElementById('promptLabel').textContent = prompt || h + '#';

  const modeLabels = {
    user: 'User EXEC', privileged: 'Privileged EXEC',
    config: 'Global Config',
    'config-if': 'Interface Config — ' + shortIfName(store.getCurrentInterface()),
    'config-vlan': 'VLAN Config — VLAN ' + store.getCurrentVlanId(),
    'config-isakmp': 'ISAKMP Policy Config',
    'config-crypto-map': 'Crypto Map Config',
    'config-dhcp-pool': 'DHCP Pool Config — ' + (store.getCurrentDhcpPoolName() || ''),
  };
  document.getElementById('modeIndicator').textContent = modeLabels[cliMode] || cliMode;
  document.getElementById('terminalTitle').textContent = 'Terminal — ' + dev.hostname;

  updateCmdHints(store);
}
