import type { RuntimeAbility } from '../content/catalog';
import type { PartSlot } from '../content/schemas';
import { applyDamage } from './damage';
import { installStatus, repairPart, supportPower } from './statuses';
import type { BattleContext, CombatantSnapshot, StatusKind } from './types';

/** Shared collision response for logical contact objects and released projectiles. */
export function resolveWeaponHit(
  context: BattleContext,
  target: CombatantSnapshot,
  slot: PartSlot,
  source: CombatantSnapshot,
  ability: RuntimeAbility,
  facing: -1 | 1,
  multiplier = 1,
) {
  const special = ability.abilityKind === 'special';
  const type = ability.original.actionType;
  const family = ability.original.family;
  const guarded = target.guarding && target.facing !== facing;
  const equippedAction = (key: PartSlot) => {
    const part = target.parts[key];
    const definition = context.content.parts[part.definitionId]!;
    return !part.destroyed && definition.abilityId
      ? context.content.abilities[definition.abilityId]!.original.actionType
      : -1;
  };
  if (
    !special &&
    ((type === 2 && equippedAction('head') === 31) ||
      ([3, 4].includes(type) && equippedAction('rightArm') === 32) ||
      (type === 5 && equippedAction('leftArm') === 33))
  ) {
    return;
  }
  const statusOnly: Partial<Record<number, StatusKind>> = {
    22: 'confusion',
    23: 'ineffective',
    24: 'indefensible',
    25: 'melee-trap',
    26: 'shot-trap',
  };
  if (!special && statusOnly[type]) {
    installStatus(
      context,
      target,
      source,
      statusOnly[type]!,
      supportPower(context, source, ability.damage),
      slot,
    );
    return;
  }
  if (special && family === 'double-trap') {
    installStatus(
      context,
      target,
      source,
      'double-trap',
      supportPower(context, source, ability.damage, true),
      slot,
      true,
    );
    return;
  }
  if (special && family === 'question') {
    installStatus(
      context,
      target,
      source,
      'confusion',
      supportPower(context, source, ability.damage, true),
      slot,
      true,
    );
    return;
  }
  if (
    target.beneficialStatus?.kind === 'full-defense' ||
    (guarded && (type === 14 || family === 'demolition'))
  ) {
    return;
  }
  const before = target.parts[slot].currentArmor;
  const frozen = ['freeze', 'stun'].includes(target.harmfulStatus?.kind ?? '');
  if (frozen) {
    target.harmfulStatus = null;
  }
  applyDamage(context, target, slot, source, ability, facing, multiplier * (frozen ? 1.5 : 1));
  const accepted = before - target.parts[slot].currentArmor;
  if (family === 'power-drain' && !guarded) {
    repairPart(context, source, accepted);
  }
  if (guarded || target.knockedOut || accepted <= 0) {
    return;
  }
  if ((!special && type === 9) || family === 'meltian') {
    installStatus(context, target, source, 'burning', Math.trunc(accepted / 4), slot, special);
  }
  if (!frozen && !special && (type === 10 || type === 11)) {
    installStatus(context, target, source, type === 10 ? 'stun' : 'freeze', 0, slot);
  }
  if (!special && (type === 12 || type === 13)) {
    installStatus(context, target, source, 'slow', 0, slot);
  }
}
