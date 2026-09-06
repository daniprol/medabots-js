import type { RuntimeAbility } from '../content/catalog';
import { spawnProjectile } from './projectiles';
import { battleRandom } from './random';
import { installStatus, supportPower } from './statuses';
import type { BattleContext, CombatantSnapshot } from './types';

export function activateMedaforce(
  context: BattleContext,
  actor: CombatantSnapshot,
  requested: RuntimeAbility,
) {
  const ability =
    requested.original.family === 'random-change'
      ? context.content.abilities[`medaforce-${battleRandom(context) % 11}`]!
      : requested;
  actor.lastActivatedSpecialId = ability.id;
  const family = ability.original.family;
  if (family === 'all-recovery' || family === 'plus-counter') {
    context.state.supportEffects.push({
      id: `support-${context.nextEntityId++}`,
      ownerId: actor.id,
      teamId: actor.teamId,
      abilityId: ability.id,
      slot: 'special',
      magnitude: 0,
      remainingTicks: family === 'all-recovery' ? 90 : 25,
    });
  } else if (family === 'giga-break') {
    const stats = context.content.medals[actor.medalId]!.levels[actor.medalLevel - 1]!;
    installStatus(
      context,
      actor,
      actor,
      'amplify',
      Math.trunc((ability.damage * (50 + stats.grappling)) / 50),
      'head',
      true,
    );
  } else if (family === 'confusion') {
    for (const target of context.state.combatants.filter(
      (target) => target.teamId !== actor.teamId,
    )) {
      installStatus(
        context,
        target,
        actor,
        'confusion',
        supportPower(context, actor, ability.damage, true),
        'head',
        true,
      );
    }
  } else {
    const count = ['barrage', 'question', 'power-drain', 'meltian'].includes(family) ? 4 : 1;
    for (let index = 0; index < count; index++) {
      spawnProjectile(context, actor, ability, 1, index);
    }
  }
  context.state.specialFreezeTicks = 0;
  actor.specialMeter = 0;
  actor.displayMeter = 0;
  for (const part of Object.values(actor.parts)) {
    part.readiness = 0;
  }
}

/** Recovery and ammunition are friendly effects, not damaging counterattacks. */
export function resolveSpecialSupport(
  context: BattleContext,
  source: CombatantSnapshot,
  ability: RuntimeAbility,
) {
  const friends = context.state.combatants.filter(
    (friend) => friend.teamId === source.teamId && !friend.knockedOut,
  );
  if (ability.original.family === 'plus-counter') {
    for (let index = 0; index < 4; index++) {
      const target = [...friends].sort((a, b) => b.parts.head.uses - a.parts.head.uses)[0];
      if (!target) {
        return;
      }
      target.parts.head.uses = Math.max(0, target.parts.head.uses - 1);
      context.events.push({
        type: 'repaired',
        tick: context.state.tick,
        combatantId: target.id,
        x: target.x,
        y: target.y + 3,
      });
    }
  } else {
    for (const target of friends) {
      const special = context.content.abilities[target.lastActivatedSpecialId]!;
      const stats = context.content.medals[target.medalId]!.levels[target.medalLevel - 1]!;
      const category =
        special.original.category === 0
          ? 'grappling'
          : special.original.category === 1
            ? 'shooting'
            : 'support';
      const magnitude = Math.trunc((special.damage * (50 + stats[category])) / 50);
      for (const part of Object.values(target.parts)) {
        if (!part.destroyed) {
          part.currentArmor = Math.min(part.maxArmor, part.currentArmor + magnitude);
        }
      }
      context.events.push({
        type: 'repaired',
        tick: context.state.tick,
        combatantId: target.id,
        x: target.x,
        y: target.y + 2,
      });
    }
  }
}
