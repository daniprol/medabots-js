import { shapeAt, staticFloor, staticSupport } from './map-surfaces';
export { surfaceAt } from './map-surfaces';
import { terrainMovement } from './terrain';
import type { BattleContext, CombatantSnapshot } from './types';

/** Original pixels are integral. World units are eight pixels, with Y pointing upward. */
export const PIXELS_PER_UNIT = 8;
export const pixelX = (actor: CombatantSnapshot) => Math.round(actor.x * 8 + 216);
export const pixelY = (actor: CombatantSnapshot) => Math.round(367 - actor.y * 8);

export function supported(context: BattleContext, actor: CombatantSnapshot) {
  const y = pixelY(actor);
  if (y >= 367) {
    return true;
  }
  const x = pixelX(actor);
  if (staticSupport(context, x, y + 1)) {
    return true;
  }
  if (
    context.state.platforms.some(
      (platform) =>
        y + 1 === platform.y && x + 7 >= platform.x && x - 8 < platform.x + platform.width,
    )
  ) {
    return true;
  }
  return context.state.combatants.some(
    (other) =>
      other.id !== actor.id &&
      !other.knockedOut &&
      Math.abs(pixelX(other) - x) < 16 &&
      y === pixelY(other) - 32,
  );
}

/** Resolve each original pixel request in order; a jump passes upward through scenery. */
export function movePixels(
  context: BattleContext,
  actor: CombatantSnapshot,
  dx: number,
  dy: number,
  ignoreFloor = false,
) {
  let x = pixelX(actor);
  let y = pixelY(actor);
  const direction = Math.sign(dx);
  for (let step = 0; step < Math.abs(dx); step++) {
    const nextX = Math.max(8, Math.min(424, x + direction));
    const obstacle = context.state.combatants.find(
      (other) =>
        other.id !== actor.id &&
        !other.knockedOut &&
        Math.abs(pixelY(other) - y) < 30 &&
        Math.abs(pixelX(other) - nextX) < 16,
    );
    if (obstacle && Math.abs(pixelX(obstacle) - x) >= 16) {
      const pushedX = pixelX(obstacle) + direction;
      if (pushedX <= 8 || pushedX >= 424) {
        break;
      }
      if (
        context.state.combatants.some(
          (other) =>
            other.id !== actor.id &&
            other.id !== obstacle.id &&
            !other.knockedOut &&
            Math.abs(pixelY(other) - pixelY(obstacle)) < 30 &&
            Math.abs(pixelX(other) - pushedX) < 16,
        )
      ) {
        break;
      }
      obstacle.x += direction / 8;
    }
    const uphill = shapeAt(context, nextX, y);
    if ((direction < 0 && uphill >= 2 && uphill <= 4) || (direction > 0 && uphill >= 5)) {
      y = Math.max(0, y - 1);
    }
    const downhill = shapeAt(context, x, y + 1);
    if (
      !(legType(context, actor) === 5 && actor.movementState === 'dive') &&
      ((direction > 0 && downhill >= 2 && downhill <= 4) || (direction < 0 && downhill >= 5))
    ) {
      y = (staticFloor(context, nextX, y + 1, y + 2) ?? y + 2) - 1;
    }
    x = nextX;
  }
  const vertical = Math.sign(dy);
  actor.grounded = false;
  for (let step = 0; step < Math.abs(dy); step++) {
    const nextY = Math.max(0, Math.min(367, y + vertical));
    let floor = false;
    if (vertical > 0 && !ignoreFloor) {
      const surface = staticFloor(context, x, y + 1, nextY + 1);
      if (surface !== null) {
        y = surface - 1;
        floor = true;
      }
      // AX clips against the first horizontally overlapping slot, not the nearest platform.
      const platform = context.state.platforms.find(
        (candidate) => x + 7 >= candidate.x && x - 8 < candidate.x + candidate.width,
      );
      if (!floor && platform && platform.y - 1 >= y && platform.y - 1 <= nextY) {
        y = platform.y - 1;
        floor = true;
      }
      for (const other of context.state.combatants) {
        const top = pixelY(other) - 32;
        if (
          other.id !== actor.id &&
          !other.knockedOut &&
          Math.abs(pixelX(other) - x) < 16 &&
          top >= y &&
          top <= nextY
        ) {
          y = top;
          floor = true;
          break;
        }
      }
    }
    if (floor || nextY === 367) {
      actor.grounded = true;
      if (!floor) {
        y = nextY;
      }
      break;
    }
    y = nextY;
  }
  actor.x = (x - 216) / 8;
  actor.y = (367 - y) / 8;
  // Passing upward through a surface must never turn an ascending jump into a landing.
  if (dy >= 0) {
    actor.grounded ||= supported(context, actor);
  }
  actor.groundPlatformId = actor.grounded ? `surface-${Math.floor((y + 1) / 8)}` : null;
}

export function quarterPixels(amount: number, residual: number, positive: boolean) {
  let pixels = Math.trunc(amount / 4);
  residual = (residual + (positive ? 1 : -1) * (amount & 3)) & 255;
  const signed = residual < 128 ? residual : residual - 256;
  if (positive ? signed > 7 : signed <= 0) {
    residual = (residual + (positive ? -4 : 4)) & 255;
    pixels++;
  }
  return { pixels, residual };
}

export function legType(context: BattleContext, actor: CombatantSnapshot) {
  return actor.parts.legs.destroyed
    ? 0
    : context.content.parts[actor.parts.legs.definitionId]!.locomotion;
}

export function inWater(context: BattleContext, actor: CombatantSnapshot) {
  const surface = context.content.arenas[context.setup.arenaId]!.original.waterY;
  return surface !== null && pixelY(actor) > surface;
}

export function horizontal(
  context: BattleContext,
  actor: CombatantSnapshot,
  direction: number,
  mode: number,
) {
  const groundedMovement = ['idle', 'walk', 'dash', 'land'].includes(actor.movementState);
  if (!direction && !groundedMovement) {
    return;
  }
  const legs = context.content.parts[actor.parts.legs.definitionId]!;
  let index = actor.parts.legs.destroyed ? 2 : legs.speedIndex;
  if (actor.supportStatus === 'speed') {
    index = Math.min(7, index + 3);
  }
  const water = inWater(context, actor);
  if (water && legType(context, actor) === 7) {
    index = Math.min(7, index + 2);
  }
  let quarters = context.content.rules[context.setup.rulesId]!.original.speedRows[index]![mode]!;
  if (water && legType(context, actor) !== 7) {
    quarters = Math.trunc((quarters * 2) / 3);
  }
  const result = quarterPixels(direction ? quarters : 0, actor.residualX, direction > 0);
  actor.residualX = result.residual;
  const displacement = groundedMovement
    ? terrainMovement(context, actor, result.pixels * direction)
    : result.pixels * direction;
  movePixels(context, actor, displacement, 0);
}

export function vertical(context: BattleContext, actor: CombatantSnapshot, pixels: number) {
  if (inWater(context, actor) && legType(context, actor) !== 7) {
    const result = quarterPixels(Math.abs(pixels) * 2, actor.residualY, pixels > 0);
    actor.residualY = result.residual;
    pixels = result.pixels * Math.sign(pixels);
  }
  movePixels(context, actor, 0, pixels);
}
