import type { Region, PartSlot } from '../content/schemas';
import type { BattleContext, CombatantSnapshot } from './types';

export const overlaps = (a: Region, b: Region) =>
  Math.abs(a.x - b.x) * 2 < a.width + b.width && Math.abs(a.y - b.y) * 2 < a.height + b.height;

export function worldRegion(combatant: CombatantSnapshot, region: Region): Region {
  return { ...region, x: combatant.x + region.x * combatant.facing, y: combatant.y + region.y };
}

/** Grounded bodies separate horizontally. Jumping and dashing can cross opponents. */
export function separateBodies(context: BattleContext) {
  const fighters = context.state.combatants;
  const arenaHalfWidth = context.content.arenas[context.setup.arenaId]!.width / 2;
  const halfWidth = (combatant: CombatantSnapshot) =>
    context.content.characters[combatant.characterId]!.collider.width / 2;
  const clamp = (combatant: CombatantSnapshot) => {
    combatant.x = Math.max(
      -arenaHalfWidth + halfWidth(combatant),
      Math.min(arenaHalfWidth - halfWidth(combatant), combatant.x),
    );
  };

  // Two stable passes settle a four-character crowd without a physics solver.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < fighters.length; i++) {
      for (let j = i + 1; j < fighters.length; j++) {
        const a = fighters[i]!;
        const b = fighters[j]!;

        if (
          a.knockedOut ||
          b.knockedOut ||
          !a.grounded ||
          !b.grounded ||
          a.dashTicks > 0 ||
          b.dashTicks > 0 ||
          Math.abs(a.y - b.y) > 0.15
        ) {
          continue;
        }

        const distance = Math.abs(b.x - a.x);
        const overlap = halfWidth(a) + halfWidth(b) - distance;

        if (overlap <= 0) {
          continue;
        }

        const direction = b.x >= a.x ? 1 : -1;
        a.x -= (direction * overlap) / 2;
        b.x += (direction * overlap) / 2;
        clamp(a);
        clamp(b);
      }
    }
  }
}

export function hitPart(
  combatant: CombatantSnapshot,
  regions: Record<PartSlot, Region>,
  hitbox: Region,
): PartSlot | null {
  const candidates = (Object.keys(regions) as PartSlot[]).filter(
    (slot) =>
      !combatant.parts[slot].destroyed && overlaps(worldRegion(combatant, regions[slot]), hitbox),
  );
  candidates.sort(
    (a, b) =>
      Math.abs(worldRegion(combatant, regions[a]).y - hitbox.y) -
      Math.abs(worldRegion(combatant, regions[b]).y - hitbox.y),
  );

  return candidates[0] ?? null;
}
