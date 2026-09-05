import type { BattleResult } from '../battle-core';
import { element, button, teamName } from './dom';

export function pauseOverlay(root: HTMLElement, resume: () => void, setup: () => void) {
  const overlay = element('section', 'modal-backdrop');
  overlay.setAttribute('aria-label', 'Pause menu');

  const panel = element('div', 'modal-panel');
  panel.append(
    element('span', 'eyebrow', 'SYSTEM / STANDBY'),
    element('h1', '', 'ROBATTLE PAUSED'),
  );

  const reason = element('p', 'modal-copy');
  panel.append(
    reason,
    button('RESUME ROBATTLE  ↗', resume, 'button primary'),
    button('RETURN TO SETUP', setup, 'button ghost'),
  );
  overlay.append(panel);
  root.append(overlay);

  return {
    update(text: string) {
      reason.textContent = text;
    },
    dispose() {
      overlay.remove();
    },
  };
}

export function resultOverlay(
  root: HTMLElement,
  result: BattleResult,
  rematch: () => void,
  setup: () => void,
) {
  const overlay = element('section', 'modal-backdrop result-backdrop');
  overlay.dataset.testid = 'battle-results';

  const panel = element('div', 'modal-panel result-panel');
  panel.append(
    element('span', 'eyebrow', 'RO BATTLE / COMPLETE'),
    element('div', 'result-emblem', result.winnerTeamId ? '◆' : '◇'),
    element('h1', '', result.winnerTeamId ? `${teamName(result.winnerTeamId)} WINS` : 'DRAW'),
  );
  panel.append(
    element(
      'p',
      'modal-copy',
      result.reason === 'leader-head-destroyed'
        ? 'Enemy leader disabled. Robattle decided.'
        : result.reason === 'timeout'
          ? 'Time expired. Victory by remaining armor.'
          : 'Time expired. Both teams have equal armor.',
    ),
  );

  const stats = element('div', 'result-stats');

  for (const team of new Set(result.finalCombatants.map((combatant) => combatant.teamId))) {
    const parts = result.finalCombatants
      .filter((c) => c.teamId === team)
      .flatMap((c) => Object.values(c.parts));
    const armor =
      parts.reduce((n, p) => n + p.currentArmor, 0) / parts.reduce((n, p) => n + p.maxArmor, 0);
    stats.append(element('div', '', `${teamName(team)}  /  ${Math.round(armor * 100)}% ARMOR`));
  }

  panel.append(
    stats,
    button('REMATCH  ↗', rematch, 'button primary'),
    button('RETURN TO SETUP', setup, 'button ghost'),
  );
  overlay.append(panel);
  root.append(overlay);

  return {
    dispose() {
      overlay.remove();
    },
  };
}
