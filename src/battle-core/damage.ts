import type { RuntimeAbility } from '../content/catalog';
import type { PartSlot } from '../content/schemas';
import { finishBattle } from './results';
import type { BattleContext, CombatantSnapshot } from './types';

export function applyDamage(
  context: BattleContext,
  target: CombatantSnapshot,
  slot: PartSlot,
  source: CombatantSnapshot,
  ability: RuntimeAbility,
  facing: -1 | 1,
) {
  if (target.knockedOut || target.parts[slot].destroyed || context.state.result) {
    return;
  }

  const rules = context.content.rules[context.setup.rulesId]!;

  if (slot === 'head' && rules.protectHeadUntilPartsDestroyed) {
    slot =
      (['rightArm', 'leftArm', 'legs'] as const).find((slot) => !target.parts[slot].destroyed) ??
      'head';
  }

  const part = target.parts[slot];
  const damage = Math.min(
    part.currentArmor,
    Math.max(1, Math.round(ability.damage * (target.guarding ? rules.guardDamageMultiplier : 1))),
  );
  part.currentArmor -= damage;

  const knockbackMultiplier = target.guarding ? rules.guardKnockbackMultiplier : 1;
  target.vx = facing * ability.knockbackX * knockbackMultiplier;
  target.vy = ability.knockbackY * knockbackMultiplier;
  target.staggerTicks = target.guarding ? 0 : ability.staggerTicks;
  target.specialMeter = Math.min(
    rules.specialMaximum,
    target.specialMeter + damage * rules.meterPerDamageReceived,
  );
  source.specialMeter = Math.min(
    rules.specialMaximum,
    source.specialMeter + damage * rules.meterPerDamageDealt,
  );

  const region = context.content.characters[target.characterId]!.hitRegions[slot];
  context.events.push({
    type: 'hit',
    tick: context.state.tick,
    combatantId: source.id,
    targetId: target.id,
    part: slot,
    abilityId: ability.id,
    x: target.x + region.x * target.facing,
    y: target.y + region.y,
    damage,
    strong: ability.abilityKind === 'special',
    facing,
  });

  if (part.currentArmor <= 0) {
    part.destroyed = true;
    context.events.push({
      type: 'partDestroyed',
      tick: context.state.tick,
      combatantId: target.id,
      part: slot,
      x: target.x,
      y: target.y + region.y,
    });

    if (target.attack?.slot === slot) {
      target.attack = null;
    }

    if (slot === 'head') {
      target.knockedOut = true;
      target.attack = null;
      target.guarding = false;
      target.charging = false;
      context.events.push({
        type: 'combatantKnockedOut',
        tick: context.state.tick,
        combatantId: target.id,
        x: target.x,
        y: target.y,
      });

      if (target.role === 'leader') {
        finishBattle(context, source.teamId, 'leader-head-destroyed');
      }
    }
  }
}
