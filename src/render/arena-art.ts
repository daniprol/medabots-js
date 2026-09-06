import type { ArenaDefinition } from '../content/schemas';

/** Normalized atlas bounds shared by the live arena and its menu preview. */
export function arenaBackdrop(arena: ArenaDefinition) {
  const group = Math.floor(arena.original.fieldId / 3);
  if (group === 0) {
    return { url: '/assets/arenas/hd2d/ruins-distance.png', x: 0, y: 0, width: 1, height: 1 };
  }
  const index = group - 1;
  const row = Math.floor(index / 2);
  const top = [1, 355, 676][row]!;
  const bottom = [352, 673, 1023][row]!;
  return {
    url: '/assets/arenas/hd2d/environment-atlas.png',
    x: (index % 2) / 2 + 0.0005,
    y: top / 1024,
    width: 0.499,
    height: (bottom - top) / 1024,
  };
}
