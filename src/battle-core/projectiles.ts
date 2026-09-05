import type { BattleContext } from './types';
import { hitPart } from './collisions';
import { applyDamage } from './damage';
export function updateProjectiles(ctx: BattleContext) {
  ctx.state.projectiles = ctx.state.projectiles.filter((p) => {
    const a = ctx.content.abilities[p.abilityId]!;
    const oldX = p.x;
    p.x += p.vx / 60;
    p.remainingTicks--;
    // Swept horizontal AABB prevents fast shots tunnelling through small part regions.
    const box = {
      x: (oldX + p.x) / 2,
      y: p.y,
      width: a.hitbox.width + Math.abs(p.x - oldX),
      height: a.hitbox.height,
    };
    const enemies = ctx.state.combatants
      .filter((t) => t.teamId !== p.teamId && !t.knockedOut)
      .sort((a, b) => (a.x - b.x) * p.facing || a.id.localeCompare(b.id));
    for (const target of enemies) {
      const part = hitPart(target, ctx.content.characters[target.characterId]!.hitRegions, box);
      if (part) {
        applyDamage(
          ctx,
          target,
          part,
          ctx.state.combatants.find((c) => c.id === p.ownerId)!,
          a,
          p.facing,
        );
        return false;
      }
    }
    return (
      p.remainingTicks > 0 && Math.abs(p.x) < ctx.content.arenas[ctx.setup.arenaId]!.width / 2 + 2
    );
  });
}
