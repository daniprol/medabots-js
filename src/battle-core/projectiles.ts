import type { RuntimeAbility } from '../content/catalog';
import { moveBarrage } from './barrage';
import { overlaps } from './collisions';
import { applyDamage } from './damage';
import { selectHitPart } from './part-selection';
import type { BattleContext, CombatantSnapshot, ProjectileSnapshot } from './types';

export function updateProjectiles(context: BattleContext) {
  context.state.projectiles = context.state.projectiles.filter((projectile) => {
    if (projectile.spawnTick === context.state.tick) {
      return true;
    }
    if (projectile.hitTicks > 0) {
      return --projectile.hitTicks > 0;
    }
    const ability = context.content.abilities[projectile.abilityId]!;
    const special = ability.abilityKind === 'special';
    projectile.age++;

    // Specials test their current endpoint before moving; ordinary objects move first.
    if (!special) {
      moveProjectile(context, projectile, ability);
    }
    const width =
      ability.original.family === 'barrage'
        ? 13 / 8
        : ability.original.family === 'vertical-line'
          ? 28 / 8
          : ability.hitbox.width;
    const height =
      ability.original.family === 'barrage'
        ? 15 / 8
        : ability.original.family === 'vertical-line'
          ? 10
          : ability.hitbox.height;
    const box = { x: projectile.x, y: projectile.y, width, height };
    for (const target of context.state.combatants) {
      if (
        target.teamId === projectile.teamId ||
        target.knockedOut ||
        target.invulnerabilityTicks > 0
      ) {
        continue;
      }
      if (!overlaps(box, { x: target.x, y: target.y + 2, width: 2, height: 4 })) {
        continue;
      }
      const source = context.state.combatants.find((actor) => actor.id === projectile.ownerId)!;
      applyDamage(
        context,
        target,
        selectHitPart(
          context,
          target,
          target.guarding && target.facing !== projectile.facing,
          projectile.headBias,
          source,
        ),
        source,
        ability,
        projectile.facing,
        projectile.powerMultiplier,
      );
      if (special) {
        projectile.hitTicks = 32;
        return true;
      }
      return false;
    }
    if (special) {
      moveProjectile(context, projectile, ability);
      return (
        projectile.x >= -35 &&
        projectile.x <= 35 &&
        projectile.y >= -8.125 &&
        projectile.y <= 53.875
      );
    }
    projectile.remainingTicks--;
    return (
      projectile.remainingTicks > 0 &&
      Math.abs(projectile.x - projectile.originX) * 8 < ability.original.rangePixels &&
      Math.abs(projectile.x) < 29
    );
  });
}

function moveProjectile(
  context: BattleContext,
  projectile: ProjectileSnapshot,
  ability: RuntimeAbility,
) {
  if (ability.original.family === 'barrage') {
    moveBarrage(context, projectile);
    return;
  }
  if (projectile.age <= 2 && ability.abilityKind !== 'special') {
    return;
  }
  if (ability.original.family === 'missile') {
    const enemy = context.state.combatants.find(
      (actor) => actor.teamId !== projectile.teamId && !actor.knockedOut && actor.role === 'leader',
    );
    if (enemy) {
      projectile.vy = Math.max(-2, Math.min(2, Math.round((enemy.y + 2 - projectile.y) * 2)));
    }
  }
  projectile.x += projectile.vx / 8;
  projectile.y += projectile.vy / 8;
}

export function spawnProjectile(
  context: BattleContext,
  attacker: CombatantSnapshot,
  ability: RuntimeAbility,
  powerMultiplier = 1,
  index = 0,
) {
  if (context.state.projectiles.length >= 20) {
    return;
  }
  const id = `projectile-${context.nextEntityId++}`;
  const special = ability.abilityKind === 'special';
  const barrage = ability.original.family === 'barrage';
  const offsetX = barrage ? [8, 11, 11, 8][index]! / 8 : special ? 2 : 2.5;
  const offsetY = barrage ? [8, 3, -3, -8][index]! / 8 : 0;
  const x = attacker.x + attacker.facing * offsetX;
  const y = attacker.y + (special ? 2 : 2.15) + offsetY;
  const headBias = attacker.attack?.headBias ?? 0;
  context.state.projectiles.push({
    id,
    ownerId: attacker.id,
    teamId: attacker.teamId,
    abilityId: ability.id,
    x,
    y,
    originX: x,
    headBias: special ? Math.trunc(headBias / 2) : headBias,
    powerMultiplier,
    vx: attacker.facing * ability.original.speedPixels,
    vy: 0,
    age: 0,
    remainingTicks: special ? 0 : 160,
    facing: attacker.facing,
    spawnTick: context.state.tick,
    hitTicks: 0,
    index,
    heading: attacker.facing === 1 ? 0 : 180,
    steered: false,
  });
  context.events.push({
    type: 'projectileSpawned',
    tick: context.state.tick,
    combatantId: attacker.id,
    projectileId: id,
    abilityId: ability.id,
    x,
    y,
    facing: attacker.facing,
  });
}
