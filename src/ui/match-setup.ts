import type { ContentCatalog } from '../content/build-content-catalog';
import type { BattleSetup } from '../battle-core';
import { connectedGamepads } from '../input/gamepad-input';
import {
  assignmentErrors,
  keyboardConflicts,
  type Assignments,
  type LocalControllerAssignment,
} from '../input/bindings';
import { element, button } from './dom';
export const quickAssignments = (): Assignments => ({
  A1: { type: 'keyboard', profileId: 'keyboard-1' },
  A2: { type: 'ai', aiProfileId: 'ai-balanced' },
  B1: { type: 'ai', aiProfileId: 'ai-balanced' },
  B2: { type: 'ai', aiProfileId: 'ai-balanced' },
});
const encode = (a: LocalControllerAssignment) =>
  a.type === 'ai' ? 'ai' : a.type === 'keyboard' ? a.profileId : `gamepad-${a.gamepadIndex}`;
export function createMatchSetup(
  root: HTMLElement,
  content: ContentCatalog,
  setup: BattleSetup,
  portraits: Record<string, string>,
  onStart: (assignments: Assignments) => void,
  saved = quickAssignments(),
) {
  const assignments = structuredClone(saved);
  const overlay = element('section', 'setup-screen');
  overlay.dataset.testid = 'match-setup';
  const nav = element('header', 'setup-nav');
  nav.append(
    element('div', 'brand', 'MEDABOTS'),
    element('span', 'edition', 'AX / ROBATTLE ARENA'),
  );
  const local = element('span', 'local-badge', '● LOCAL MULTIPLAYER');
  nav.append(local);
  overlay.append(nav);
  const intro = element('div', 'setup-intro');
  intro.append(element('p', 'eyebrow', 'FOUR MEDABOTS. TWO TEAMS. ONE WINNER.'));
  const title = element('h1');
  title.innerHTML = 'READY TO<br><em>ROBATTLE?</em>';
  intro.append(
    title,
    element(
      'p',
      'intro-copy',
      'Pick your controls. Rally your partner. Break their armor.\nTake down the enemy leader to win.',
    ),
  );
  overlay.append(intro);
  const panel = element('div', 'setup-panel');
  const panelTitle = element('div', 'panel-heading');
  panelTitle.append(
    element('h2', '', 'LOCAL MATCH'),
    element('span', '', '01 — ASSIGN CONTROLLERS'),
  );
  panel.append(panelTitle);
  const grid = element('div', 'assignment-grid');
  const selects: HTMLSelectElement[] = [];
  for (const team of setup.teams) {
    const col = element('div', `assignment-team ${team.id === 'team-a' ? 'team-a' : 'team-b'}`);
    col.append(
      element('div', 'team-heading', team.id === 'team-a' ? 'TEAM A / CYAN' : 'TEAM B / CORAL'),
    );
    for (const c of team.combatants) {
      const def = content.characters[c.characterId]!;
      const card = element('div', 'assignment-card');
      const portrait = element('img');
      portrait.src = portraits[c.characterId]!;
      portrait.alt = '';
      const details = element('div', 'assignment-details');
      details.append(
        element('span', 'assignment-role', `${c.instanceId} · ${c.role.toUpperCase()}`),
        element('strong', '', def.displayName),
      );
      const select = element('select');
      select.setAttribute('aria-label', `${c.instanceId} controller`);
      select.dataset.slot = c.instanceId;
      selects.push(select);
      select.addEventListener('change', () => {
        const value = select.value;
        assignments[c.instanceId] =
          value === 'ai'
            ? { type: 'ai', aiProfileId: 'ai-balanced' }
            : value.startsWith('gamepad-')
              ? {
                  type: 'gamepad',
                  gamepadIndex: Number(value.slice(8)),
                  profileId: 'standard-gamepad',
                }
              : { type: 'keyboard', profileId: value };
        refresh();
      });
      details.append(select);
      card.append(portrait, details);
      col.append(card);
    }
    grid.append(col);
  }
  panel.append(grid);
  const status = element('p', 'controller-status');
  status.setAttribute('aria-live', 'polite');
  panel.append(status);
  const actions = element('div', 'setup-actions');
  const start = button(
    'START ROBATTLE  ↗',
    () => onStart(structuredClone(assignments)),
    'button primary',
  );
  const quick = button('QUICK START', () => onStart(quickAssignments()), 'button secondary');
  actions.append(start, quick);
  panel.append(actions);
  panel.append(
    element('p', 'setup-tip', '1–4 PLAYERS · SHARED KEYBOARD + GAMEPADS · UNASSIGNED SLOTS USE AI'),
  );
  overlay.append(panel);
  const arenaCard = element('div', 'arena-card');
  arenaCard.append(
    element('span', 'eyebrow', 'ARENA / 001'),
    element('h2', '', content.arenas[setup.arenaId]!.displayName),
    element('p', '', content.arenas[setup.arenaId]!.subtitle),
  );
  overlay.append(arenaCard);
  const footer = element('footer', 'setup-footer');
  footer.append(
    element('span', '', 'WASD move · W jump · J / K / L attack · double-tap to dash'),
    element('span', '', '180 SEC / LEADER ELIMINATION'),
  );
  overlay.append(footer);
  root.append(overlay);
  let lastPads = '';
  function refresh() {
    const pads = connectedGamepads();
    lastPads = pads.map((p) => `${p.index}:${p.id}`).join('|');
    for (const select of selects) {
      const current = encode(assignments[select.dataset.slot!]!);
      const options: [string, string][] = [
        ['ai', 'CPU · Balanced AI'],
        ...Object.values(content.keyboards).map((p) => [p.id, p.displayName] as [string, string]),
        ...pads.map(
          (p) =>
            [`gamepad-${p.index}`, `Gamepad ${p.index + 1} · ${p.id.slice(0, 28)}`] as [
              string,
              string,
            ],
        ),
      ];
      if (current.startsWith('gamepad-') && !options.some(([v]) => v === current))
        options.push([current, 'Disconnected controller']);
      select.replaceChildren(
        ...options.map(([value, label]) => {
          const o = element('option', '', label);
          o.value = value;
          o.disabled =
            value !== 'ai' &&
            Object.entries(assignments).some(
              ([id, a]) => id !== select.dataset.slot && encode(a) === value,
            );
          return o;
        }),
      );
      select.value = current;
    }
    const overlaps = keyboardConflicts(
      Object.values(assignments).flatMap((a) =>
        a.type === 'keyboard' ? [content.keyboards[a.profileId]!] : [],
      ),
    );
    const errors = assignmentErrors(assignments);
    const missing = Object.values(assignments).some(
      (a) => a.type === 'gamepad' && !pads.some((p) => p.index === a.gamepadIndex),
    );
    start.disabled = errors.length > 0 || missing;
    status.textContent = missing
      ? 'Reconnect the assigned controller or choose another input.'
      : errors.length
        ? errors.join(' · ')
        : overlaps.length
          ? `Overlapping keys: ${overlaps.join(', ')}`
          : `${pads.length} GAMEPADS CONNECTED · ${pads.length ? 'Controllers ready' : 'Press a button on a controller to connect'}`;
    status.classList.toggle('warning', !!(errors.length || overlaps.length || missing));
  }
  refresh();
  const interval = window.setInterval(() => {
    const pads = connectedGamepads()
      .map((p) => `${p.index}:${p.id}`)
      .join('|');
    if (pads !== lastPads) refresh();
  }, 500);
  window.addEventListener('gamepadconnected', refresh);
  window.addEventListener('gamepaddisconnected', refresh);
  return {
    dispose() {
      clearInterval(interval);
      window.removeEventListener('gamepadconnected', refresh);
      window.removeEventListener('gamepaddisconnected', refresh);
      overlay.remove();
    },
  };
}
