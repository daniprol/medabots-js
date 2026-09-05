import type { RuntimeAbility } from '../content/build-content-catalog';
import type { PartSlot } from '../content/schemas';
import type { BattleContext, CombatantSnapshot } from './types';
export function finishBattle(
  ctx: BattleContext,
  winnerTeamId: string | null,
  reason: 'leader-head-destroyed' | 'timeout' | 'draw',
) {
  if (ctx.state.result) return;
  ctx.state.phase = 'complete';
  ctx.state.result = {
    winnerTeamId,
    reason,
    elapsedTicks: ctx.state.tick,
    finalCombatants: structuredClone(ctx.state.combatants),
  };
  ctx.events.push({ type: 'roundEnded', tick: ctx.state.tick, combatantId: '', x: 0, y: 0 });
}
export function applyDamage(
  ctx: BattleContext,
  target: CombatantSnapshot,
  slot: PartSlot,
  source: CombatantSnapshot,
  ability: RuntimeAbility,
  facing: -1 | 1,
) {
  if (target.knockedOut || target.parts[slot].destroyed || ctx.state.result) return;
  const rules = ctx.content.rules[ctx.setup.rulesId]!;
  if (slot === 'head' && rules.protectHeadUntilPartsDestroyed) {
    slot =
      (['rightArm', 'leftArm', 'legs'] as const).find((s) => !target.parts[s].destroyed) ?? 'head';
  }
  const part = target.parts[slot];
  const damage = Math.min(
    part.currentArmor,
    Math.max(1, Math.round(ability.damage * (target.guarding ? rules.guardDamageMultiplier : 1))),
  );
  part.currentArmor -= damage;
  const kb = target.guarding ? rules.guardKnockbackMultiplier : 1;
  target.vx = facing * ability.knockbackX * kb;
  target.vy = ability.knockbackY * kb;
  target.staggerTicks = target.guarding ? 0 : ability.staggerTicks;
  target.specialMeter = Math.min(
    rules.specialMaximum,
    target.specialMeter + damage * rules.meterPerDamageReceived,
  );
  source.specialMeter = Math.min(
    rules.specialMaximum,
    source.specialMeter + damage * rules.meterPerDamageDealt,
  );
  const region = ctx.content.characters[target.characterId]!.hitRegions[slot];
  ctx.events.push({
    type: 'hit',
    tick: ctx.state.tick,
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
    ctx.events.push({
      type: 'partDestroyed',
      tick: ctx.state.tick,
      combatantId: target.id,
      part: slot,
      x: target.x,
      y: target.y + region.y,
    });
    if (target.attack?.slot === slot) target.attack = null;
    if (slot === 'head') {
      target.knockedOut = true;
      target.attack = null;
      target.guarding = false;
      target.charging = false;
      ctx.events.push({
        type: 'combatantKnockedOut',
        tick: ctx.state.tick,
        combatantId: target.id,
        x: target.x,
        y: target.y,
      });
      if (target.role === 'leader') finishBattle(ctx, source.teamId, 'leader-head-destroyed');
    }
  }
}
