import { legType, movePixels, pixelX, pixelY } from './ax-movement';
import type { BattleContext, CombatantSnapshot } from './types';

function footMaterial(context: BattleContext, actor: CombatantSnapshot) {
  const tiles = context.content.arenas[context.setup.arenaId]!.original.tiles;
  const x = pixelX(actor);
  const row = tiles[Math.floor((pixelY(actor) + 1) / 8)];
  const center = row?.[Math.floor(x / 8)] ?? 0;
  if (center) {
    return center;
  }
  for (let foot = -8; foot < 8; foot++) {
    const tile = row?.[Math.floor((x + foot) / 8)] ?? 0;
    if (tile) {
      return tile;
    }
  }
  return 0;
}

/** Signed quarter-pixel adjustments share the ordinary movement residual. */
function adjust(actor: CombatantSnapshot, amount: number, quarters: number, direction: number) {
  amount += Math.trunc(quarters / 4);
  actor.residualX += (quarters % 4) * direction;
  if (actor.residualX <= 0) {
    actor.residualX += 4;
    amount -= direction;
  } else if (actor.residualX >= 8) {
    actor.residualX -= 4;
    amount += direction;
  }
  return amount;
}

export function terrainMovement(
  context: BattleContext,
  actor: CombatantSnapshot,
  displacement: number,
) {
  const material = footMaterial(context, actor);
  const shape = material & 7;
  const type = legType(context, actor);
  let direction = Math.sign(displacement);
  let amount = Math.abs(displacement);
  if (![2, 4, 6].includes(type)) {
    const slope = shape >= 2 && shape <= 4 ? 1 : shape >= 5 ? -1 : 0;
    if (direction && slope) {
      amount = adjust(actor, amount, slope * direction * 3, direction);
    }
    if (material > 0x20 && material < 0x30) {
      amount--;
    }
  }

  const x = pixelX(actor);
  const platform = context.state.platforms.some(
    (candidate) =>
      pixelY(actor) + 1 === candidate.y &&
      x + 7 >= candidate.x &&
      x - 8 < candidate.x + candidate.width,
  );
  const field = context.content.arenas[context.setup.arenaId]!.original.fieldId;
  const slippery =
    (material >= 0x10 && material <= 0x1f) || (platform && (field === 12 || field === 13));
  if (slippery && ![4, 6, 7].includes(type)) {
    const requested = amount * direction;
    let momentum = actor.iceMomentum;
    let output = requested;
    if (momentum > 0 && requested <= 0) {
      momentum += requested ? requested - 1 : -1;
      output = Math.trunc(momentum / 32);
    } else if (momentum < 0 && requested >= 0) {
      momentum += requested ? requested + 1 : 1;
      output = Math.trunc(momentum / 32);
    } else if (momentum > 0) {
      momentum = Math.max(momentum, requested * 32);
    } else if (momentum < 0) {
      momentum = Math.min(momentum, requested * 32);
    } else {
      momentum = requested * 32;
    }
    actor.iceMomentum = Math.max(-128, Math.min(128, momentum));
    if (output) {
      direction = Math.sign(output);
    }
    amount = Math.abs(output);
  } else if (!material && !platform) {
    actor.iceMomentum = 0;
  }

  amount = Math.max(0, amount);
  if (direction && amount < 2) {
    amount = adjust(actor, amount, 2, direction);
  }
  return amount * direction;
}

/** Conveyors and ice-slope drift are additional moves after the state handler. */
export function moveWithTerrain(context: BattleContext, actor: CombatantSnapshot) {
  if (actor.knockedOut || actor.movementState === 'jump') {
    return;
  }
  const material = footMaterial(context, actor);
  const type = legType(context, actor);
  if (type !== 6 && material > 0x30 && material < 0x50 && material !== 0x40) {
    movePixels(context, actor, material < 0x40 ? 1 : -1, 0);
  }
  if ([4, 6, 7].includes(type)) {
    return;
  }
  const right = (material >= 0x12 && material <= 0x14) || (material >= 0x1a && material <= 0x1c);
  const left = (material >= 0x15 && material <= 0x17) || (material >= 0x1d && material <= 0x1f);
  if (right || left) {
    const direction = right ? 1 : -1;
    const pixels = adjust(actor, 0, 2, direction);
    if (actor.iceMomentum * direction < 0) {
      actor.iceMomentum += 2 * direction;
    }
    movePixels(context, actor, pixels * direction, 0);
  }
}
