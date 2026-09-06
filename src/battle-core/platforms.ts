import { movePixels, pixelX, pixelY, surfaceAt } from './ax-movement';
import type { BattleContext } from './types';

/** Source slot order matters: each moving platform transports riders before actors update. */
export function updatePlatforms(context: BattleContext) {
  for (const platform of context.state.platforms) {
    if (platform.waitTicks > 0) {
      platform.waitTicks--;
      continue;
    }

    const oldY = platform.y;
    const dx = platform.direction === 1 ? 1 : platform.direction === 2 ? -1 : 0;
    const dy = platform.direction === 4 ? 1 : platform.direction === 3 ? -1 : 0;
    platform.x += dx;
    platform.y += dy;

    for (const actor of context.state.combatants) {
      const x = pixelX(actor);
      const y = pixelY(actor);
      const row = Math.floor((y + 1) / 8);
      const edge = x + (actor.transported ? -dx : dx) * 8;
      const eligible =
        !actor.knockedOut &&
        y + 1 === oldY &&
        x + 7 >= platform.x &&
        x - 8 <= platform.x + platform.width - 1 &&
        surfaceAt(context, x, row) !== y + 1 &&
        (!dx || surfaceAt(context, edge, row) !== y + 1);

      if (eligible) {
        movePixels(context, actor, dx, dy);
      }
      actor.transported = eligible;
    }

    const coordinate = dx ? platform.x : platform.y;
    if (
      (dx + dy > 0 && coordinate >= platform.maximum) ||
      (dx + dy < 0 && coordinate <= platform.minimum)
    ) {
      platform.direction = dx ? (dx > 0 ? 2 : 1) : dy > 0 ? 3 : 4;
      platform.waitTicks = platform.endpointWaitTicks;
    }
  }
}
