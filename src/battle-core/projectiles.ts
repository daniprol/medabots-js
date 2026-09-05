import type { RuntimeAbility } from '../content/catalog';
import { hitPart, worldRegion } from './collisions';
import { applyDamage } from './damage';
import { TICKS_PER_SECOND } from './timing';
import type { BattleContext, CombatantSnapshot } from './types';

export function updateProjectiles(context: BattleContext) {
  context.state.projectiles = context.state.projectiles.filter((projectile) => {
    const ability = context.content.abilities[projectile.abilityId]!;
    const oldX = projectile.x;
    projectile.x += projectile.vx / TICKS_PER_SECOND;
    projectile.remainingTicks--;

    // Swept horizontal AABB prevents fast shots tunnelling through small part regions.
    const box = {
      x: (oldX + projectile.x) / 2,
      y: projectile.y,
      width: ability.hitbox.width + Math.abs(projectile.x - oldX),
      height: ability.hitbox.height,
    };
    const enemies = context.state.combatants
      .filter((target) => target.teamId !== projectile.teamId && !target.knockedOut)
      .sort((a, b) => (a.x - b.x) * projectile.facing || a.id.localeCompare(b.id));

    for (const target of enemies) {
      const part = hitPart(target, context.content.characters[target.characterId]!.hitRegions, box);

      if (part) {
        applyDamage(
          context,
          target,
          part,
          context.state.combatants.find((combatant) => combatant.id === projectile.ownerId)!,
          ability,
          projectile.facing,
        );

        return false;
      }
    }

    return (
      projectile.remainingTicks > 0 &&
      Math.abs(projectile.x) < context.content.arenas[context.setup.arenaId]!.width / 2 + 2
    );
  });
}

/** Allocate a stable entity ID and emit only transient presentation information. */
export function spawnProjectile(
  context: BattleContext,
  attacker: CombatantSnapshot,
  ability: RuntimeAbility,
) {
  const id = `projectile-${context.nextEntityId++}`;
  const origin = worldRegion(attacker, ability.hitbox);

  context.state.projectiles.push({
    id,
    ownerId: attacker.id,
    teamId: attacker.teamId,
    abilityId: ability.id,
    x: origin.x,
    y: origin.y,
    vx: attacker.facing * ability.projectileSpeed,
    remainingTicks: ability.projectileLifetimeTicks,
    facing: attacker.facing,
  });

  context.events.push({
    type: 'projectileSpawned',
    tick: context.state.tick,
    combatantId: attacker.id,
    projectileId: id,
    abilityId: ability.id,
    x: origin.x,
    y: origin.y,
    facing: attacker.facing,
  });
}
