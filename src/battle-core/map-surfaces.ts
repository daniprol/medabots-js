import { TILE_SURFACE_HEIGHTS } from '../content/tile-shapes';
import type { BattleContext } from './types';

function tileAt(context: BattleContext, column: number, row: number) {
  return context.content.arenas[context.setup.arenaId]!.original.tiles[row]?.[column] ?? 0;
}

export function surfaceAt(context: BattleContext, x: number, row: number) {
  const shape = tileAt(context, Math.floor(x / 8), row) & 7;
  return shape ? row * 8 + TILE_SURFACE_HEIGHTS[shape - 1]![((x % 8) + 8) % 8]! : null;
}

export function shapeAt(context: BattleContext, x: number, y: number) {
  const row = Math.floor(y / 8);
  return surfaceAt(context, x, row) === y ? tileAt(context, Math.floor(x / 8), row) & 7 : 0;
}

function footEndpoint(context: BattleContext, x: number, row: number, offset: number) {
  for (
    let column = Math.max(0, Math.floor((x - 8) / 8));
    column <= Math.floor((x + 8) / 8);
    column++
  ) {
    const shape = tileAt(context, column, row) & 7;
    const neighbor = (dx: number, dy: number) => tileAt(context, column + dx, row + dy) & 7;
    if (shape === 1 && offset === 0) {
      return row * 8;
    }
    if (shape === 2 && offset === 0 && neighbor(-1, -1) !== 4) {
      return row * 8;
    }
    if (shape === 7 && offset === 0 && neighbor(1, -1) !== 5) {
      return row * 8;
    }
    if (shape === 4 && ![1, 2].includes(neighbor(1, 1))) {
      return row * 8 + 7;
    }
    if (shape === 5 && ![1, 7].includes(neighbor(-1, 1))) {
      return row * 8 + 7;
    }
  }
  return null;
}

/** Center-first clipping preserves slope rejection before foot-endpoint fallback. */
export function staticFloor(context: BattleContext, x: number, start: number, end: number) {
  for (let row = Math.floor(start / 8); row <= Math.floor(end / 8); row++) {
    const offset = row === Math.floor(start / 8) ? start - row * 8 : 0;
    const shape = tileAt(context, Math.floor(x / 8), row) & 7;
    const center = surfaceAt(context, x, row);
    let surface: number | null;
    if (shape >= 2) {
      if (center === null || center < row * 8 + offset) {
        continue;
      }
      surface = center;
    } else if (shape === 1 && offset === 0) {
      surface = row * 8;
    } else {
      surface = footEndpoint(context, x, row, offset);
    }
    if (surface !== null && surface >= start && surface <= end) {
      return surface;
    }
  }
  return null;
}

export function staticSupport(context: BattleContext, x: number, y: number) {
  if (shapeAt(context, x, y)) {
    return true;
  }
  const row = Math.floor(y / 8);
  const center = tileAt(context, Math.floor(x / 8), row) & 7;
  if (center >= 2 || tileAt(context, Math.floor(x / 8), row + 1) !== 0) {
    return false;
  }
  return footEndpoint(context, x, row, y % 8) === y;
}
