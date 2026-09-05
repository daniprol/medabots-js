import { TICKS_PER_SECOND } from './timing';
import type { BattleContext, CombatantCommand, CombatantSnapshot } from './types';

const toward = (value: number, target: number, amount: number) =>
  value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);

export function moveCombatant(
  context: BattleContext,
  combatant: CombatantSnapshot,
  command: CombatantCommand,
) {
  const rules = context.content.rules[context.setup.rulesId]!;
  const arena = context.content.arenas[context.setup.arenaId]!;
  const movement = context.content.parts[combatant.parts.legs.definitionId]!.movement!;
  const legsDestroyed = combatant.parts.legs.destroyed;
  const tick = context.state.tick;
  const disabled = combatant.knockedOut || combatant.staggerTicks > 0;
  const move = disabled ? 0 : command.moveX;

  if (combatant.dashCooldownTicks > 0) {
    combatant.dashCooldownTicks--;
  }

  if (combatant.dropTicks > 0) {
    combatant.dropTicks--;
  }

  if (move && move !== combatant.lastMoveX) {
    const tap = move === -1 ? 'lastTapLeft' : 'lastTapRight';

    if (
      tick - combatant[tap] <= rules.doubleTapTicks &&
      combatant.dashCooldownTicks === 0 &&
      !combatant.guarding &&
      !combatant.charging
    ) {
      combatant.dashTicks = rules.dashDurationTicks;
      combatant.dashCooldownTicks = rules.dashCooldownTicks;
      context.events.push({
        type: 'dashed',
        tick,
        combatantId: combatant.id,
        x: combatant.x,
        y: combatant.y,
      });
    }

    combatant[tap] = tick;
  }

  combatant.lastMoveX = move;

  if (move && !combatant.attack && !disabled) {
    combatant.facing = move;
  }

  const previousY = combatant.y;

  if (command.dropHeld && combatant.grounded && combatant.y > 0 && !disabled) {
    combatant.dropTicks = rules.dropThroughTicks;
    combatant.grounded = false;
    combatant.groundPlatformId = null;
    combatant.y -= 0.08;
  }

  if (command.jumpPressed && combatant.grounded && !disabled && !combatant.guarding) {
    combatant.vy = movement.jumpSpeed * (legsDestroyed ? rules.brokenLegJumpMultiplier : 1);
    combatant.grounded = false;
    combatant.groundPlatformId = null;
  }

  if (combatant.dashTicks > 0 && !disabled) {
    combatant.vx =
      combatant.facing * movement.dashSpeed * (legsDestroyed ? rules.brokenLegDashMultiplier : 1);
    combatant.dashTicks--;
  } else if (!disabled) {
    combatant.vx = toward(
      combatant.vx,
      move *
        movement.speed *
        (legsDestroyed ? rules.brokenLegSpeedMultiplier : 1) *
        (combatant.guarding ? 0.2 : combatant.charging ? 0 : combatant.attack ? 0.65 : 1),
      (move ? rules.acceleration : rules.friction) / TICKS_PER_SECOND,
    );
  } else {
    combatant.vx = toward(combatant.vx, 0, rules.friction / (TICKS_PER_SECOND * 3));
  }

  combatant.x += combatant.vx / TICKS_PER_SECOND;
  combatant.vy -= rules.gravity / TICKS_PER_SECOND;
  combatant.y += combatant.vy / TICKS_PER_SECOND;

  const halfWidth = context.content.characters[combatant.characterId]!.collider.width / 2;
  combatant.x = Math.max(
    -arena.width / 2 + halfWidth,
    Math.min(arena.width / 2 - halfWidth, combatant.x),
  );
  combatant.grounded = false;
  combatant.groundPlatformId = null;

  if (combatant.vy <= 0) {
    for (const platform of [...arena.platforms].sort((a, b) => b.y - a.y)) {
      if (platform.y > 0 && combatant.dropTicks > 0) {
        continue;
      }

      if (
        Math.abs(combatant.x - platform.x) <= platform.width / 2 + 0.35 &&
        previousY >= platform.y - 0.02 &&
        combatant.y <= platform.y
      ) {
        if (combatant.vy < -3) {
          context.events.push({
            type: 'landed',
            tick,
            combatantId: combatant.id,
            x: combatant.x,
            y: platform.y,
          });
        }

        combatant.y = platform.y;
        combatant.vy = 0;
        combatant.grounded = true;
        combatant.groundPlatformId = platform.id;
        break;
      }
    }
  }

  if (combatant.y < 0) {
    combatant.y = 0;
    combatant.vy = 0;
    combatant.grounded = true;
  }

  if (combatant.y > arena.height - 2.5) {
    combatant.y = arena.height - 2.5;
    combatant.vy = Math.min(0, combatant.vy);
  }
}
