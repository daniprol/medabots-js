import type { BattleSnapshot } from '../battle-core';
import type { ContentCatalog } from '../content/catalog';
import { element, button } from './dom';
import { createFighterCard, type FighterSource } from './fighter-card';

export function createHUD(
  root: HTMLElement,
  content: ContentCatalog,
  initial: BattleSnapshot,
  assignments: Record<string, FighterSource>,
  portraits: Record<string, string>,
  pause: () => void,
  actionLabel = 'Pause',
) {
  const hud = element('div', 'battle-hud');
  hud.dataset.testid = 'battle-hud';
  const teamIds = [...new Set(initial.combatants.map((actor) => actor.teamId))];
  const count = initial.combatants.length / 2;
  const header = element('header', 'battle-scoreboard');
  const timer = element('strong', 'battle-timer', '03:00');
  timer.dataset.testid = 'timer';
  const pauseButton = button(actionLabel, pause, 'hud-pause');
  header.append(
    element('span', '', `${count} VS ${count}`),
    timer,
    element('span', 'battle-field-name', content.arenas[initial.arenaId]!.displayName),
    pauseButton,
  );
  const teams = element('div', 'hud-teams');
  const cards = new Map<string, ReturnType<typeof createFighterCard>>();
  for (const [index, teamId] of teamIds.entries()) {
    const group = element('section', `hud-team hud-team-${index}`);
    group.setAttribute('aria-label', `Team ${index === 0 ? 'A' : 'B'} status`);
    const list = element('div', 'hud-fighters');
    for (const actor of initial.combatants.filter((actor) => actor.teamId === teamId)) {
      const card = createFighterCard(
        actor,
        content,
        assignments[actor.id]!,
        portraits[actor.characterId]!,
      );
      cards.set(actor.id, card);
      list.append(card.element);
    }
    group.append(list);
    teams.append(group);
  }
  const toast = element('div', 'battle-order-toast');
  toast.setAttribute('aria-live', 'polite');
  hud.append(header, teams, toast);
  root.append(hud);
  const panels = new Map(initial.combatants.map((actor) => [actor.id, actor.panel]));
  let toastUntil = 0;
  return {
    update(snapshot: BattleSnapshot) {
      const seconds = Math.ceil(snapshot.remainingTicks / 60);
      timer.textContent = `${Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
      timer.classList.toggle('urgent', seconds <= 30);
      for (const actor of snapshot.combatants) {
        cards.get(actor.id)!.update(actor);
        if (panels.get(actor.id) !== actor.panel) {
          toastUntil = snapshot.tick + 150;
          const order =
            actor.panel === 1
              ? 'Right arm'
              : actor.panel === 2
                ? 'Left arm'
                : actor.panel === 3
                  ? 'Head weapon'
                  : actor.panel === 6
                    ? 'Target leader'
                    : 'Target partner';
          toast.textContent = `${actor.id} · ${order}`;
          panels.set(actor.id, actor.panel);
        }
      }
      toast.hidden = snapshot.tick >= toastUntil;
    },
    dispose() {
      hud.remove();
    },
  };
}
