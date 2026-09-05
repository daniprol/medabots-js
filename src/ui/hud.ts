import type { BattleSnapshot } from '../battle-core';
import type { ContentCatalog } from '../content/build-content-catalog';
import { Slots } from '../content/schemas';
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
    for (const c of snapshot.combatants.filter(
      (c) => c.teamId === snapshot.combatants[index * 2]!.teamId,
    )) {
      const def = content.characters[c.characterId]!;
      const card = element('article', 'fighter-card');
      card.dataset.testid = `fighter-${c.id}`;
      const portrait = element('img', 'portrait');
      portrait.src = portraits[c.characterId]!;
      portrait.alt = '';
      const data = element('div', 'fighter-data');
      const header = element('div', 'fighter-heading');
      header.append(element('strong', '', def.displayName), element('span', 'slot-tag', c.id));
      const assignment = assignments[c.id]!;
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
          `${c.role === 'leader' ? '◆ LEADER' : 'PARTNER'} · ${source}`,
        ),
      );
      const bars: Record<string, HTMLElement> = {};
      for (const slot of Slots) {
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
      special.setAttribute('aria-label', `${c.id} Medaforce`);
      special.setAttribute('aria-valuemin', '0');
      special.setAttribute('aria-valuemax', '100');
      const meter = element('i');
      special.append(meter);
      const caption = element('div', 'meter-caption');
      const headStatus = element('div', 'head-status');
      data.append(special, caption, headStatus);
      card.append(portrait, data);
      team.append(card);
      cards.set(c.id, { root: card, bars, meter, caption, headStatus });
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
    update(s: BattleSnapshot) {
      const seconds = Math.ceil(s.remainingTicks / 60);
      timer.textContent = `${Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
      timer.classList.toggle('urgent', seconds <= 30);
      for (const c of s.combatants) {
        const card = cards.get(c.id)!;
        card.root.classList.toggle('knocked-out', c.knockedOut);
        card.root.setAttribute(
          'aria-label',
          `${c.id} ${c.characterId}${c.knockedOut ? ' knocked out' : ''}`,
        );
        const protectedHead =
          content.rules[s.rulesId]!.protectHeadUntilPartsDestroyed &&
          ['leftArm', 'rightArm', 'legs'].some(
            (slot) => !c.parts[slot as keyof typeof c.parts].destroyed,
          );
        card.headStatus.textContent = c.knockedOut
          ? 'ROBOT DISABLED'
          : protectedHead
            ? '◆ HEAD PROTECTED'
            : '⚠ HEAD EXPOSED';
        card.headStatus.classList.toggle('exposed', !protectedHead && !c.knockedOut);
        card.headStatus.title = 'Both arms and legs must break before the head can take damage.';
        for (const slot of Slots) {
          const p = c.parts[slot];
          const bar = card.bars[slot]!;
          bar.style.width = `${(p.currentArmor / p.maxArmor) * 100}%`;
          bar.dataset.broken = String(p.destroyed);
          bar.parentElement!.classList.toggle('broken', p.destroyed);
          bar.parentElement!.title = `${slotLabel[slot]}: ${p.currentArmor} / ${p.maxArmor}`;
        }
        card.meter.style.width = `${(c.specialMeter / content.rules[s.rulesId]!.specialMaximum) * 100}%`;
        card.meter.parentElement!.classList.toggle(
          'full',
          c.specialMeter >= content.rules[s.rulesId]!.specialMaximum,
        );
        const meterPercent = Math.floor(
          (c.specialMeter / content.rules[s.rulesId]!.specialMaximum) * 100,
        );
        const headAbility =
          content.abilities[content.parts[c.parts.head.definitionId]!.abilityId!]!;
        card.meter.parentElement!.setAttribute('aria-valuenow', String(meterPercent));
        card.caption.textContent = c.knockedOut
          ? 'DISABLED'
          : `${meterPercent >= 100 ? 'MEDAFORCE READY' : `MF ${meterPercent}%`}  /  HEAD ${headAbility.maxUses === 0 ? '∞' : Math.max(0, headAbility.maxUses - c.parts.head.uses)}`;
      }
      const strategy = s.combatants
        .filter((c) => c.role === 'partner')
        .map((c) => `${c.id}: ${c.strategy.replaceAll('_', ' ')}`)
        .join('  /  ');
      if (priorStrategy && strategy !== priorStrategy) {
        status.textContent = strategy;
        toastUntil = s.tick + 180;
      }
      priorStrategy = strategy;
      status.style.opacity = s.tick < toastUntil ? '1' : '0';
    },
    dispose() {
      hud.remove();
    },
  };
}
