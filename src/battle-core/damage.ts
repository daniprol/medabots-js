import type { RuntimeAbility } from '../content/catalog';
import type { PartSlot } from '../content/schemas';
import { damageArmor } from './armor';
import { meterBlocked } from './statuses';
import type { BattleContext, CombatantSnapshot } from './types';

const RANK_ADJUSTMENT = [0, 2, 4, 6, 8, 10];

/** AX narrows the difference to a signed halfword before applying the minimum. */
export function calculateDamage(
  power: number,
  defense: number,
  attackAdjustment = 0,
  defenseAdjustment = 0,
) {
  const attack = Math.floor(((50 + attackAdjustment) * (power & 255)) / 50);
  const reduction = Math.floor((defense * (50 + defenseAdjustment)) / 50);
  const signed = ((attack - reduction) << 16) >> 16;
  return Math.max(2, signed);
}

export function applyDamage(
  context: BattleContext,
  target: CombatantSnapshot,
  slot: PartSlot,
  source: CombatantSnapshot,
  ability: RuntimeAbility,
  facing: -1 | 1,
  powerMultiplier = 1,
) {
  if (target.knockedOut || target.parts[slot].destroyed || context.state.result) {
    return;
  }
  const guarded = target.guarding && target.facing !== facing;
  const amplified = !guarded && target.attack !== null;
  const part = target.parts[slot];
  const definition = context.content.parts[part.definitionId]!;
  const legs = context.content.parts[target.parts.legs.definitionId]!;
  const sourceLegs = context.content.parts[source.parts.legs.definitionId]!;
  const category = ability.original.category === 0 ? 1 : 0;
  const sourceMedal = context.content.medals[source.medalId]!.levels[source.medalLevel - 1]!;
  const targetMedal = context.content.medals[target.medalId]!.levels[target.medalLevel - 1]!;
  const special = ability.abilityKind === 'special';
  let power = ability.damage * powerMultiplier;
  if (guarded) {
    power = Math.floor(
      power / context.content.rules[context.setup.rulesId]!.original.guardPowerDivisor,
    );
  } else if (amplified) {
    power = Math.floor(power * 1.5);
  }
  let damage = calculateDamage(
    power,
    definition.defense +
      (target.beneficialStatus?.kind === 'defense' ? target.beneficialStatus.magnitude & 255 : 0),
    sourceMedal[category === 1 ? 'grappling' : 'shooting'] +
      (special || source.parts.legs.destroyed
        ? 0
        : RANK_ADJUSTMENT[sourceLegs.attackRanks[category]!]!),
    targetMedal.defense +
      (special || target.parts.legs.destroyed ? 0 : RANK_ADJUSTMENT[legs.defenseRank]!),
  );
  if (ability.original.family === 'frame') {
    damage = guarded ? 1 : amplified ? 3 : 2;
  } else if (amplified) {
    damage = Math.max(3, damage);
  }
  if (!meterBlocked(target)) {
    target.specialMeter = Math.min(51, target.specialMeter + Math.floor(damage / 3));
  }
  target.attack = null;
  target.charging = false;
  target.idleTicks = 0;
  target.invulnerabilityTicks = guarded ? 4 : 8;
  target.staggerTicks = guarded ? 4 : damage > 30 || amplified ? 16 : 8;
  target.vx = facing * (guarded ? 3 : 9);
  context.events.push({
    type: 'hit',
    tick: context.state.tick,
    combatantId: source.id,
    targetId: target.id,
    part: slot,
    abilityId: ability.id,
    x: target.x,
    y: target.y + 2,
    damage,
    strong: amplified || damage > 30 || ability.abilityKind === 'special',
    facing,
  });
  damageArmor(context, target, slot, damage, source);
}
