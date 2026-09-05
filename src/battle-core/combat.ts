import type { PartSlot } from '../content/schemas';
import type { BattleContext, CombatantCommand, CombatantSnapshot } from './types';
import { hitPart, worldRegion } from './collisions';
import { applyDamage } from './damage';
export function updateAttack(ctx: BattleContext, c: CombatantSnapshot, cmd: CombatantCommand) {
  for (const p of Object.values(c.parts)) if (p.cooldownTicks > 0) p.cooldownTicks--;
  if (c.staggerTicks > 0) c.staggerTicks--;
  if (c.knockedOut) return;
  const rules = ctx.content.rules[ctx.setup.rulesId]!;
  c.guarding = cmd.guardHeld && !c.attack && c.staggerTicks === 0;
  c.charging = cmd.chargeHeld && c.grounded && !c.attack && !c.guarding && !c.staggerTicks;
  if (c.charging)
    c.specialMeter = Math.min(rules.specialMaximum, c.specialMeter + rules.chargePerSecond / 60);
  if (!c.attack && !c.guarding && !c.charging && c.staggerTicks === 0) {
    let slot: PartSlot | 'special' | null = cmd.specialPressed
      ? 'special'
      : cmd.headPressed
        ? 'head'
        : cmd.rightArmPressed
          ? 'rightArm'
          : cmd.leftArmPressed
            ? 'leftArm'
            : null;
    if (slot) {
      const part = slot === 'special' ? null : c.parts[slot];
      const abilityId =
        slot === 'special'
          ? ctx.content.characters[c.characterId]!.specialAbilityId
          : ctx.content.parts[part!.definitionId]!.abilityId;
      const a = abilityId ? ctx.content.abilities[abilityId] : undefined;
      if (
        a &&
        (!part ||
          (!part.destroyed &&
            part.cooldownTicks === 0 &&
            (a.maxUses === 0 || part.uses < a.maxUses))) &&
        c.specialMeter >= a.specialCost
      ) {
        c.specialMeter -= a.specialCost;
        c.attack = { abilityId: a.id, slot, age: 0, fired: false, hitIds: [] };
        if (part) {
          part.uses++;
          part.cooldownTicks = a.startupTicks + a.activeTicks + a.recoveryTicks;
        }
        ctx.events.push({
          type: slot === 'special' ? 'specialActivated' : 'attackStarted',
          tick: ctx.state.tick,
          combatantId: c.id,
          abilityId: a.id,
          x: c.x,
          y: c.y + 1.4,
          facing: c.facing,
        });
      }
    }
  }
  const attack = c.attack;
  if (!attack) return;
  const a = ctx.content.abilities[attack.abilityId]!;
  if (attack.age >= a.startupTicks && attack.age < a.startupTicks + a.activeTicks) {
    if (a.delivery === 'projectile' && !attack.fired) {
      const id = `projectile-${ctx.nextEntityId++}`;
      const r = worldRegion(c, a.hitbox);
      ctx.state.projectiles.push({
        id,
        ownerId: c.id,
        teamId: c.teamId,
        abilityId: a.id,
        x: r.x,
        y: r.y,
        vx: c.facing * a.projectileSpeed,
        remainingTicks: a.projectileLifetimeTicks,
        facing: c.facing,
      });
      attack.fired = true;
      ctx.events.push({
        type: 'projectileSpawned',
        tick: ctx.state.tick,
        combatantId: c.id,
        projectileId: id,
        abilityId: a.id,
        x: r.x,
        y: r.y,
        facing: c.facing,
      });
    } else if (a.delivery === 'melee') {
      const box = worldRegion(c, a.hitbox);
      for (const target of ctx.state.combatants) {
        if (target.teamId === c.teamId || target.knockedOut || attack.hitIds.includes(target.id))
          continue;
        const part = hitPart(target, ctx.content.characters[target.characterId]!.hitRegions, box);
        if (part) {
          attack.hitIds.push(target.id);
          applyDamage(ctx, target, part, c, a, c.facing);
        }
      }
    }
  }
  attack.age++;
  if (attack.age >= a.startupTicks + a.activeTicks + a.recoveryTicks) c.attack = null;
}
