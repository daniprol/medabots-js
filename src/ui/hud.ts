import type { BattleSnapshot } from '../battle-core';
import type { ContentCatalog } from '../content/catalog';
import { PART_SLOTS } from '../content/schemas';
import type { Assignments } from '../input/bindings';
import { element, button } from './dom';

const LABELS = { head: 'H', leftArm: 'L', rightArm: 'R', legs: 'LEG' };

export function createHUD(
  root: HTMLElement,
  content: ContentCatalog,
  initial: BattleSnapshot,
  assignments: Assignments,
  portraits: Record<string, string>,
  pause: () => void,
) {
  const hud = element('div', 'ax-hud');
  hud.dataset.testid = 'battle-hud';
  const clock = element('div', 'ax-clock');
  const timer = element('strong', '', '03:00');
  timer.dataset.testid = 'timer';
  clock.append(
    element('span', '', 'ROBATTLE'),
    timer,
    element('small', '', content.arenas[initial.arenaId]!.displayName),
  );
  hud.append(clock, button('Ⅱ', pause, 'ax-pause'));
  const cards = new Map<
    string,
    { root: HTMLElement; bars: Record<string, HTMLElement>; meter: HTMLElement; ammo: HTMLElement }
  >();
  for (const actor of initial.combatants) {
    const card = element('article', `ax-fighter ax-position-${actor.actorIndex}`);
    card.dataset.testid = `fighter-${actor.id}`;
    const portrait = element('img', 'ax-portrait');
    portrait.src = portraits[actor.characterId]!;
    portrait.alt = '';
    const information = element('div', 'ax-fighter-info');
    const assignment = assignments[actor.id]!;
    const source =
      assignment.type === 'ai'
        ? 'CPU'
        : assignment.type === 'keyboard'
          ? `KEY ${assignment.profileId.split('-').at(-1)}`
          : `PAD ${assignment.gamepadIndex + 1}`;
    information.append(
      element('strong', '', content.characters[actor.characterId]!.displayName),
      element(
        'small',
        '',
        `${actor.id} ${actor.role === 'leader' ? '◆ LEADER' : 'PARTNER'} · ${source}`,
      ),
    );
    const bars: Record<string, HTMLElement> = {};
    const armor = element('div', 'ax-armor');
    for (const slot of PART_SLOTS) {
      const label = element('label', '', LABELS[slot]);
      const track = element('span');
      const bar = element('i');
      track.append(bar);
      label.append(track);
      armor.append(label);
      bars[slot] = bar;
    }
    const meter = element('i');
    const meterTrack = element('div', 'ax-meter');
    meterTrack.append(meter);
    meterTrack.setAttribute('role', 'meter');
    meterTrack.setAttribute('aria-label', `${actor.id} Medaforce`);
    meterTrack.setAttribute('aria-valuemin', '0');
    meterTrack.setAttribute('aria-valuemax', '51');
    const ammo = element('small', 'ax-ammo');
    information.append(armor, meterTrack, ammo);
    card.append(portrait, information);
    hud.append(card);
    cards.set(actor.id, { root: card, bars, meter, ammo });
  }
  const focusedId =
    Object.entries(assignments).find(([, assignment]) => assignment.type !== 'ai')?.[0] ?? 'A1';
  const readiness = element('div', 'ax-readiness');
  readiness.append(element('span', '', 'WEAPON CHARGE'));
  const chargeBars: Record<string, HTMLElement> = {};
  for (const slot of ['head', 'rightArm', 'leftArm'] as const) {
    const label = element('label', '', LABELS[slot]);
    const track = element('span');
    const fill = element('i');
    track.append(fill);
    label.append(track);
    readiness.append(label);
    chargeBars[slot] = fill;
  }
  hud.append(readiness);
  const toast = element('div', 'ax-panel-toast');
  toast.setAttribute('aria-live', 'polite');
  hud.append(toast);
  root.append(hud);
  let panel = -1;
  let toastUntil = 0;
  return {
    update(snapshot: BattleSnapshot) {
      const seconds = Math.ceil(snapshot.remainingTicks / 60);
      timer.textContent = `${Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
      clock.classList.toggle('urgent', seconds <= 30);
      for (const actor of snapshot.combatants) {
        const card = cards.get(actor.id)!;
        card.root.classList.toggle('knocked-out', actor.knockedOut);
        for (const slot of PART_SLOTS) {
          const part = actor.parts[slot];
          const ratio = part.maxArmor ? part.currentArmor / part.maxArmor : 0;
          const bar = card.bars[slot]!;
          bar.style.width = `${ratio * 100}%`;
          bar.style.background =
            ratio >= 0.75 ? '#b7ef6a' : ratio >= 5 / 12 ? '#ffce64' : '#f27d69';
          bar.parentElement!.title = `${slot}: ${part.currentArmor}/${part.maxArmor}${part.destroyed ? ' · BROKEN' : ''}`;
          bar.dataset.broken = String(part.destroyed);
        }
        card.meter.style.width = `${(actor.displayMeter / 51) * 100}%`;
        card.meter.parentElement!.setAttribute('aria-valuenow', String(actor.displayMeter));
        const head = content.abilities[content.parts[actor.parts.head.definitionId]!.abilityId!]!;
        card.ammo.textContent = actor.knockedOut
          ? 'FUNCTION CEASED'
          : `${actor.displayMeter === 51 ? 'MEDAFORCE READY' : 'MF'} · HEAD ${Math.max(0, head.maxUses - actor.parts.head.uses)}/${head.maxUses}`;
      }
      const focused = snapshot.combatants.find((actor) => actor.id === focusedId)!;
      for (const slot of ['head', 'rightArm', 'leftArm'] as const) {
        chargeBars[slot]!.style.width = `${(focused.parts[slot].readiness / 320) * 100}%`;
        chargeBars[slot]!.classList.toggle('ready', focused.parts[slot].readiness === 320);
      }
      const partner = snapshot.combatants.find(
        (actor) => actor.teamId === focused.teamId && actor.role === 'partner',
      )!;
      if (panel !== -1 && panel !== partner.panel) {
        toastUntil = snapshot.tick + 150;
        toast.textContent = `${partner.id} · PANEL ${partner.panelIndex + 1} / ${partner.panel === 1 ? 'RIGHT ARM' : partner.panel === 2 ? 'LEFT ARM' : partner.panel === 3 ? 'HEAD' : partner.panel === 6 ? 'TARGET LEADER' : 'TARGET PARTNER'}`;
      }
      panel = partner.panel;
      toast.style.opacity = snapshot.tick < toastUntil ? '1' : '0';
    },
    dispose() {
      hud.remove();
    },
  };
}
