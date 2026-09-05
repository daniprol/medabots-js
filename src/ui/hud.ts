import type { BattleSnapshot } from '../battle-core';
import { TICKS_PER_SECOND } from '../battle-core/timing';
import type { ContentCatalog } from '../content/catalog';
import { PART_SLOTS } from '../content/schemas';
import type { Assignments } from '../input/bindings';
import { element, button } from './dom';

const slotLabel = { head: 'HEAD', leftArm: 'L-ARM', rightArm: 'R-ARM', legs: 'LEGS' };

export function createHUD(
  root: HTMLElement,
  content: ContentCatalog,
  snapshot: BattleSnapshot,
  assignments: Assignments,
  portraits: Record<string, string>,
  pause: () => void,
) {
  const hud = element('div', 'hud');
  hud.dataset.testid = 'battle-hud';

  const top = element('div', 'hud-top');
  const teams = [element('div', 'team-hud team-a'), element('div', 'team-hud team-b')];
  const center = element('div', 'clock-panel');
  center.append(element('span', 'eyebrow', 'RO BATTLE / 01'));

  const timer = element('strong', 'timer', '03:00');
  timer.dataset.testid = 'timer';
  center.append(timer, element('span', 'versus', '2 VS 2'));

  const cards = new Map<
    string,
    {
      root: HTMLElement;
      bars: Record<string, HTMLElement>;
      headStatus: HTMLElement;
      meter: HTMLElement;
      caption: HTMLElement;
    }
  >();

  for (const [index, team] of teams.entries()) {
    for (const combatant of snapshot.combatants.filter(
      (combatant) => combatant.teamId === snapshot.combatants[index * 2]!.teamId,
    )) {
      const definition = content.characters[combatant.characterId]!;
      const card = element('article', 'fighter-card');
      card.dataset.testid = `fighter-${combatant.id}`;

      const portrait = element('img', 'portrait');
      portrait.src = portraits[combatant.characterId]!;
      portrait.alt = '';

      const data = element('div', 'fighter-data');
      const header = element('div', 'fighter-heading');
      header.append(
        element('strong', '', definition.displayName),
        element('span', 'slot-tag', combatant.id),
      );

      const assignment = assignments[combatant.id]!;
      const source =
        assignment.type === 'ai'
          ? 'CPU'
          : assignment.type === 'keyboard'
            ? `KEY ${assignment.profileId.split('-').at(-1)}`
            : `PAD ${assignment.gamepadIndex + 1}`;
      data.append(
        header,
        element(
          'div',
          'fighter-subtitle',
          `${combatant.role === 'leader' ? '◆ LEADER' : 'PARTNER'} · ${source}`,
        ),
      );

      const bars: Record<string, HTMLElement> = {};

      for (const slot of PART_SLOTS) {
        const row = element('div', 'armor-row');
        row.append(element('span', '', slotLabel[slot]));

        const track = element('div', 'armor-track');
        const bar = element('i');
        track.append(bar);
        row.append(track);
        data.append(row);
        bars[slot] = bar;
      }

      const special = element('div', 'special-track');
      special.setAttribute('role', 'meter');
      special.setAttribute('aria-label', `${combatant.id} Medaforce`);
      special.setAttribute('aria-valuemin', '0');
      special.setAttribute('aria-valuemax', '100');

      const meter = element('i');
      special.append(meter);

      const caption = element('div', 'meter-caption');
      const headStatus = element('div', 'head-status');
      data.append(special, caption, headStatus);
      card.append(portrait, data);
      team.append(card);
      cards.set(combatant.id, { root: card, bars, meter, caption, headStatus });
    }
  }

  top.append(teams[0]!, center, teams[1]!);
  hud.append(top);

  const bottom = element('div', 'battle-bottom');
  bottom.append(
    element(
      'span',
      'arena-caption',
      `${content.arenas[snapshot.arenaId]!.displayName.toUpperCase()} / SECTOR 07`,
    ),
  );

  const status = element('div', 'strategy-toast');
  status.setAttribute('aria-live', 'polite');
  bottom.append(status, button('Ⅱ  PAUSE', pause, 'button small ghost'));
  hud.append(bottom);
  root.append(hud);

  let priorStrategy = '';
  let toastUntil = 0;

  return {
    update(snapshot: BattleSnapshot) {
      const seconds = Math.ceil(snapshot.remainingTicks / TICKS_PER_SECOND);
      timer.textContent = `${Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
      timer.classList.toggle('urgent', seconds <= 30);

      for (const combatant of snapshot.combatants) {
        const card = cards.get(combatant.id)!;
        card.root.classList.toggle('knocked-out', combatant.knockedOut);
        card.root.setAttribute(
          'aria-label',
          `${combatant.id} ${combatant.characterId}${combatant.knockedOut ? ' knocked out' : ''}`,
        );

        const protectedHead =
          content.rules[snapshot.rulesId]!.protectHeadUntilPartsDestroyed &&
          ['leftArm', 'rightArm', 'legs'].some(
            (slot) => !combatant.parts[slot as keyof typeof combatant.parts].destroyed,
          );
        card.headStatus.textContent = combatant.knockedOut
          ? 'ROBOT DISABLED'
          : protectedHead
            ? '◆ HEAD PROTECTED'
            : '⚠ HEAD EXPOSED';
        card.headStatus.classList.toggle('exposed', !protectedHead && !combatant.knockedOut);
        card.headStatus.title = 'Both arms and legs must break before the head can take damage.';

        for (const slot of PART_SLOTS) {
          const part = combatant.parts[slot];
          const bar = card.bars[slot]!;
          bar.style.width = `${(part.currentArmor / part.maxArmor) * 100}%`;
          bar.dataset.broken = String(part.destroyed);
          bar.parentElement!.classList.toggle('broken', part.destroyed);
          bar.parentElement!.title = `${slotLabel[slot]}: ${part.currentArmor} / ${part.maxArmor}`;
        }

        card.meter.style.width = `${(combatant.specialMeter / content.rules[snapshot.rulesId]!.specialMaximum) * 100}%`;
        card.meter.parentElement!.classList.toggle(
          'full',
          combatant.specialMeter >= content.rules[snapshot.rulesId]!.specialMaximum,
        );

        const meterPercent = Math.floor(
          (combatant.specialMeter / content.rules[snapshot.rulesId]!.specialMaximum) * 100,
        );
        const headAbility =
          content.abilities[content.parts[combatant.parts.head.definitionId]!.abilityId!]!;
        card.meter.parentElement!.setAttribute('aria-valuenow', String(meterPercent));
        card.caption.textContent = combatant.knockedOut
          ? 'DISABLED'
          : `${meterPercent >= 100 ? 'MEDAFORCE READY' : `MF ${meterPercent}%`}  /  HEAD ${headAbility.maxUses === 0 ? '∞' : Math.max(0, headAbility.maxUses - combatant.parts.head.uses)}`;
      }

      const strategy = snapshot.combatants
        .filter((combatant) => combatant.role === 'partner')
        .map((combatant) => `${combatant.id}: ${combatant.strategy.replaceAll('_', ' ')}`)
        .join('  /  ');

      if (priorStrategy && strategy !== priorStrategy) {
        status.textContent = strategy;
        toastUntil = snapshot.tick + 3 * TICKS_PER_SECOND;
      }

      priorStrategy = strategy;
      status.style.opacity = snapshot.tick < toastUntil ? '1' : '0';
    },
    dispose() {
      hud.remove();
    },
  };
}
