import type { Region, PartSlot } from '../content/schemas';
import type { BattleContext, CombatantSnapshot } from './types';
export const overlaps = (a: Region, b: Region) =>
  Math.abs(a.x - b.x) * 2 < a.width + b.width && Math.abs(a.y - b.y) * 2 < a.height + b.height;
export function worldRegion(c: CombatantSnapshot, r: Region): Region {
  return { ...r, x: c.x + r.x * c.facing, y: c.y + r.y };
}

/** Grounded bodies separate horizontally. Jumping and dashing can cross opponents. */
export function separateBodies(ctx: BattleContext) {
  const fighters = ctx.state.combatants;
  const arenaHalfWidth = ctx.content.arenas[ctx.setup.arenaId]!.width / 2;
  const halfWidth = (c: CombatantSnapshot) =>
    ctx.content.characters[c.characterId]!.collider.width / 2;
  const clamp = (c: CombatantSnapshot) => {
    c.x = Math.max(-arenaHalfWidth + halfWidth(c), Math.min(arenaHalfWidth - halfWidth(c), c.x));
  };
  // Two stable passes settle a four-character crowd without a physics solver.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < fighters.length; i++)
      for (let j = i + 1; j < fighters.length; j++) {
        const a = fighters[i]!,
          b = fighters[j]!;
        if (
          a.knockedOut ||
          b.knockedOut ||
          !a.grounded ||
          !b.grounded ||
          a.dashTicks > 0 ||
          b.dashTicks > 0 ||
          Math.abs(a.y - b.y) > 0.15
        )
          continue;
        const distance = Math.abs(b.x - a.x);
        const overlap = halfWidth(a) + halfWidth(b) - distance;
        if (overlap <= 0) continue;
        const direction = b.x >= a.x ? 1 : -1;
        a.x -= (direction * overlap) / 2;
        b.x += (direction * overlap) / 2;
        clamp(a);
        clamp(b);
      }
  }
}
export function hitPart(
  c: CombatantSnapshot,
  regions: Record<PartSlot, Region>,
  hitbox: Region,
): PartSlot | null {
  const candidates = (Object.keys(regions) as PartSlot[]).filter(
    (s) => !c.parts[s].destroyed && overlaps(worldRegion(c, regions[s]), hitbox),
  );
  candidates.sort(
    (a, b) =>
      Math.abs(worldRegion(c, regions[a]).y - hitbox.y) -
      Math.abs(worldRegion(c, regions[b]).y - hitbox.y),
  );
  return candidates[0] ?? null;
}
