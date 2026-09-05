import type { BattleContext, CombatantCommand, CombatantSnapshot } from './types';
const toward = (value: number, target: number, amount: number) =>
  value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);
export function moveCombatant(ctx: BattleContext, c: CombatantSnapshot, cmd: CombatantCommand) {
  const rules = ctx.content.rules[ctx.setup.rulesId]!;
  const arena = ctx.content.arenas[ctx.setup.arenaId]!;
  const movement = ctx.content.parts[c.parts.legs.definitionId]!.movement!;
  const broken = c.parts.legs.destroyed;
  const tick = ctx.state.tick;
  const disabled = c.knockedOut || c.staggerTicks > 0;
  const move = disabled ? 0 : cmd.moveX;
  if (c.dashCooldownTicks > 0) c.dashCooldownTicks--;
  if (c.dropTicks > 0) c.dropTicks--;
  if (move && move !== c.lastMoveX) {
    const tap = move === -1 ? 'lastTapLeft' : 'lastTapRight';
    if (
      tick - c[tap] <= rules.doubleTapTicks &&
      c.dashCooldownTicks === 0 &&
      !c.guarding &&
      !c.charging
    ) {
      c.dashTicks = rules.dashDurationTicks;
      c.dashCooldownTicks = rules.dashCooldownTicks;
      ctx.events.push({ type: 'dashed', tick, combatantId: c.id, x: c.x, y: c.y });
    }
    c[tap] = tick;
  }
  c.lastMoveX = move;
  if (move && !c.attack && !disabled) c.facing = move;
  const oldY = c.y;
  if (cmd.dropHeld && c.grounded && c.y > 0 && !disabled) {
    c.dropTicks = rules.dropThroughTicks;
    c.grounded = false;
    c.groundPlatformId = null;
    c.y -= 0.08;
  }
  if (cmd.jumpPressed && c.grounded && !disabled && !c.guarding) {
    c.vy = movement.jumpSpeed * (broken ? rules.brokenLegJumpMultiplier : 1);
    c.grounded = false;
    c.groundPlatformId = null;
  }
  if (c.dashTicks > 0 && !disabled) {
    c.vx = c.facing * movement.dashSpeed * (broken ? rules.brokenLegDashMultiplier : 1);
    c.dashTicks--;
  } else if (!disabled)
    c.vx = toward(
      c.vx,
      move *
        movement.speed *
        (broken ? rules.brokenLegSpeedMultiplier : 1) *
        (c.guarding ? 0.2 : c.charging ? 0 : c.attack ? 0.65 : 1),
      (move ? rules.acceleration : rules.friction) / 60,
    );
  else c.vx = toward(c.vx, 0, rules.friction / 180);
  c.x += c.vx / 60;
  c.vy -= rules.gravity / 60;
  c.y += c.vy / 60;
  const halfWidth = ctx.content.characters[c.characterId]!.collider.width / 2;
  c.x = Math.max(-arena.width / 2 + halfWidth, Math.min(arena.width / 2 - halfWidth, c.x));
  c.grounded = false;
  c.groundPlatformId = null;
  if (c.vy <= 0) {
    for (const platform of [...arena.platforms].sort((a, b) => b.y - a.y)) {
      if (platform.y > 0 && c.dropTicks > 0) continue;
      if (
        Math.abs(c.x - platform.x) <= platform.width / 2 + 0.35 &&
        oldY >= platform.y - 0.02 &&
        c.y <= platform.y
      ) {
        if (c.vy < -3)
          ctx.events.push({ type: 'landed', tick, combatantId: c.id, x: c.x, y: platform.y });
        c.y = platform.y;
        c.vy = 0;
        c.grounded = true;
        c.groundPlatformId = platform.id;
        break;
      }
    }
  }
  if (c.y < 0) {
    c.y = 0;
    c.vy = 0;
    c.grounded = true;
  }
  if (c.y > arena.height - 2.5) {
    c.y = arena.height - 2.5;
    c.vy = Math.min(0, c.vy);
  }
}
