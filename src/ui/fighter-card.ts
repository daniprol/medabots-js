import type { CombatantSnapshot } from '../battle-core';
import type { ContentCatalog } from '../content/catalog';
import { PART_SLOTS, type PartSlot } from '../content/schemas';
import type { Assignments } from '../input/bindings';
import { element } from './dom';

const PART_LABELS: Record<PartSlot, string> = {
  head: 'HEAD',
  rightArm: 'R-ARM',
  leftArm: 'L-ARM',
  legs: 'LEGS',
};

export type FighterSource = Assignments[string] | { type: 'remote'; name: string };

/** Persistent armor, charge and controller information for one combatant. */
export function createFighterCard(
  actor: CombatantSnapshot,
  content: ContentCatalog,
  assignment: FighterSource,
  portraitUrl: string,
) {
  const card = element('article', 'fighter-card');
  card.dataset.testid = `fighter-${actor.id}`;
  card.setAttribute(
    'aria-label',
    `${actor.id} ${content.characters[actor.characterId]!.displayName}`,
  );
  const header = element('header');
  const portrait = element('img');
  portrait.src = portraitUrl;
  portrait.alt = '';
  const identity = element('div');
  const source =
    assignment.type === 'remote'
      ? assignment.name
      : assignment.type === 'ai'
        ? `CPU · ${content.ai[assignment.aiProfileId]!.displayName}`
        : assignment.type === 'keyboard'
          ? `KEY ${assignment.profileId.split('-').at(-1)}`
          : `PAD ${assignment.gamepadIndex + 1}`;
  identity.append(
    element('strong', '', content.characters[actor.characterId]!.displayName),
    element('span', '', `${actor.id} · ${actor.role === 'leader' ? 'LEADER' : 'PARTNER'}`),
    element('span', 'fighter-source', source),
  );
  header.append(portrait, identity);
  card.append(header);
  const bars = PART_SLOTS.map((slot) => {
    const row = element('div', 'armor-row');
    const track = element('span', 'armor-track');
    const fill = element('i');
    const value = element('b');
    track.append(fill);
    track.setAttribute('role', 'meter');
    track.setAttribute('aria-label', `${actor.id} ${PART_LABELS[slot]} armor`);
    track.setAttribute('aria-valuemin', '0');
    row.append(element('span', '', PART_LABELS[slot]), track, value);
    card.append(row);
    return { slot, row, track, fill, value };
  });
  const meter = element('div', 'force-row');
  const meterTrack = element('span', 'force-track');
  const meterFill = element('i');
  const meterValue = element('b');
  meterTrack.append(meterFill);
  meterTrack.setAttribute('role', 'meter');
  meterTrack.setAttribute('aria-label', `${actor.id} Medaforce`);
  meterTrack.setAttribute('aria-valuemin', '0');
  meterTrack.setAttribute('aria-valuemax', '51');
  meter.append(element('span', '', 'MF'), meterTrack, meterValue);
  const weapons = element('div', 'weapon-status');
  const readiness = (['head', 'rightArm', 'leftArm'] as const).map((slot) => {
    const item = element('span');
    weapons.append(item);
    return { slot, item };
  });
  const status = element('div', 'fighter-condition');
  card.append(meter, weapons, status);
  return {
    element: card,
    update(current: CombatantSnapshot) {
      card.classList.toggle('knocked-out', current.knockedOut);
      for (const { slot, row, track, fill, value } of bars) {
        const part = current.parts[slot];
        const ratio = part.currentArmor / part.maxArmor;
        row.dataset.broken = String(part.destroyed);
        fill.style.width = `${ratio * 100}%`;
        fill.style.backgroundColor =
          ratio >= 0.75 ? '#c3ee72' : ratio >= 5 / 12 ? '#ffcc64' : '#ff8c78';
        value.textContent = part.destroyed ? '×' : String(part.currentArmor);
        track.setAttribute('aria-valuemax', String(part.maxArmor));
        track.setAttribute('aria-valuenow', String(part.currentArmor));
        track.setAttribute(
          'aria-valuetext',
          part.destroyed ? 'Broken' : `${part.currentArmor} of ${part.maxArmor}`,
        );
      }
      meterFill.style.width = `${(current.displayMeter / 51) * 100}%`;
      meterValue.textContent =
        current.displayMeter === 51 ? 'MAX' : `${Math.floor((current.displayMeter / 51) * 100)}%`;
      meterTrack.setAttribute('aria-valuenow', String(current.displayMeter));
      for (const { slot, item } of readiness) {
        const part = current.parts[slot];
        const ability = content.abilities[content.parts[part.definitionId]!.abilityId!]!;
        const empty = slot === 'head' && part.uses >= ability.maxUses;
        item.textContent = `${slot === 'head' ? 'H' : slot === 'rightArm' ? 'R' : 'L'} ${empty ? 'EMPTY' : part.destroyed ? 'FRAME' : part.readiness === 320 ? 'READY' : `${Math.floor((part.readiness / 320) * 100)}%`}`;
        item.dataset.ready = String(!empty && part.readiness === 320);
      }
      const head = content.abilities[content.parts[current.parts.head.definitionId]!.abilityId!]!;
      const condition = current.harmfulStatus?.kind ?? current.beneficialStatus?.kind;
      status.textContent = current.knockedOut
        ? 'FUNCTION CEASED'
        : condition
          ? condition.replaceAll('-', ' ').toUpperCase()
          : current.displayMeter === 51
            ? 'MEDAFORCE READY'
            : `Head uses ${Math.max(0, head.maxUses - current.parts.head.uses)}/${head.maxUses}`;
    },
  };
}
