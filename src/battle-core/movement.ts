import {
  horizontal,
  inWater,
  legType,
  movePixels,
  pixelX,
  pixelY,
  supported,
  vertical,
} from './ax-movement';
import { moveWithTerrain } from './terrain';
import {
  emptyCommand,
  type BattleContext,
  type CombatantCommand,
  type CombatantSnapshot,
} from './types';

function enter(actor: CombatantSnapshot, state: CombatantSnapshot['movementState']) {
  actor.movementState = state;
  actor.movementTicks = 0;
}

function startJump(context: BattleContext, actor: CombatantSnapshot) {
  const type = legType(context, actor);
  const family = type === 5 ? 'type5' : type === 6 ? 'type6' : 'ordinary';
  actor.carryMode = actor.movementState === 'dash' ? 4 : actor.movementState === 'walk' ? 3 : 0;
  actor.carryDirection = actor.carryMode ? actor.facing : 0;
  actor.jumpCurve = `${family}_full`;
  actor.jumpHoldTicks = 0;
  actor.jumpFinalized = false;
  actor.grounded = false;
  enter(actor, 'jump');
}

export function moveCombatant(
  context: BattleContext,
  actor: CombatantSnapshot,
  input: CombatantCommand,
) {
  const oldX = actor.x;
  const oldY = actor.y;
  const wasGrounded = actor.grounded;
  if (actor.knockedOut) {
    return;
  }
  const attack = actor.attack ? context.content.abilities[actor.attack.abilityId] : undefined;
  const command = attack && !attack.original.movementAllowed ? emptyCommand() : input;
  const type = legType(context, actor);
  const tick = context.state.tick;
  const move = actor.guarding ? 0 : command.moveX;

  if (actor.staggerTicks > 0) {
    movePixels(context, actor, Math.trunc((actor.vx * 8) / 60), 2);
    actor.staggerTicks--;
    return;
  }

  const sameTap = move === -1 ? actor.lastTapLeft : actor.lastTapRight;
  const doubleTap = move !== 0 && move !== actor.lastMoveX && tick - sameTap < 16;
  if (move && move !== actor.lastMoveX) {
    if (move === -1) {
      actor.lastTapLeft = tick;
    } else {
      actor.lastTapRight = tick;
    }
  }
  actor.lastMoveX = move;
  const upDouble = command.upPressed && tick - actor.lastTapUp < 16;
  const downDouble = command.downPressed && tick - actor.lastTapDown < 16;
  if (command.upPressed) {
    actor.lastTapUp = tick;
  }
  if (command.downPressed) {
    actor.lastTapDown = tick;
  }

  if (actor.grounded && command.jumpPressed && !actor.guarding) {
    if (command.dropHeld) {
      const tiles = context.content.arenas[context.setup.arenaId]!.original.tiles;
      const tile = tiles[Math.floor((pixelY(actor) + 1) / 8)]?.[Math.floor(pixelX(actor) / 8)] ?? 0;
      if (!(tile & 8) && pixelY(actor) < 359) {
        movePixels(context, actor, 0, actor.movementState === 'walk' ? 4 : 9, true);
        enter(actor, 'fall');
      }
    } else {
      startJump(context, actor);
    }
    actor.vx = (actor.x - oldX) * 60;
    actor.vy = (actor.y - oldY) * 60;
    return;
  }

  if (!actor.parts.legs.destroyed && !actor.guarding && !actor.attack) {
    if (actor.grounded && (upDouble || downDouble)) {
      if (type <= 1) {
        enter(actor, upDouble ? 'backhop' : 'crouch');
      } else if (type === 2) {
        startJump(context, actor);
        actor.jumpCurve = 'special';
        actor.jumpFinalized = true;
      } else if (type === 3 || type === 4) {
        enter(actor, 'retreat');
      }
    } else if (!actor.grounded && type === 6 && upDouble) {
      enter(actor, 'hover');
    } else if (!actor.grounded && (type === 5 || type === 6) && downDouble) {
      enter(actor, 'dive');
    } else if (!actor.grounded && type === 5 && command.jumpPressed && !actor.extraJumpUsed) {
      startJump(context, actor);
      actor.extraJumpUsed = true;
    }
  }

  const state = actor.movementState;
  if (state === 'idle' || state === 'walk' || state === 'dash' || state === 'land') {
    if (move && !actor.attack) {
      actor.facing = move;
    }
    if (!actor.guarding && move) {
      if (doubleTap) {
        enter(actor, 'dash');
        context.events.push({
          type: 'dashed',
          tick,
          combatantId: actor.id,
          x: actor.x,
          y: actor.y,
        });
      } else if (state === 'idle' || state === 'land') {
        enter(actor, 'walk');
      }
      if (state !== 'idle' && state !== 'land') {
        horizontal(context, actor, move, actor.movementState === 'dash' ? 2 : 1);
      }
    } else {
      if (state !== 'idle') {
        enter(actor, 'idle');
      }
      horizontal(context, actor, 0, 0);
    }
    if (!supported(context, actor)) {
      actor.grounded = false;
      enter(actor, 'fall');
    }
  } else if (state === 'jump') {
    if (!actor.jumpFinalized) {
      if (!command.jumpHeld) {
        actor.jumpCurve = actor.jumpCurve.replace(
          'full',
          actor.jumpHoldTicks < 5 ? 'short' : actor.jumpHoldTicks < 10 ? 'medium' : 'full',
        );
        actor.jumpFinalized = true;
      } else if (++actor.jumpHoldTicks >= 11) {
        actor.jumpFinalized = true;
      }
    }
    const curve =
      context.content.rules[context.setup.rulesId]!.original.jumpCurves[actor.jumpCurve]!;
    if (type === 5 || type === 6) {
      movePixels(context, actor, move * (actor.carryMode === 4 ? 4 : 2), 0);
    } else {
      horizontal(context, actor, actor.carryDirection, actor.carryMode);
      horizontal(context, actor, move, 5);
    }
    vertical(context, actor, -(curve[actor.movementTicks] ?? 0));
    const slow = inWater(context, actor) && type !== 7;
    if (slow) {
      actor.waterToggle = !actor.waterToggle;
    }
    if (!slow || actor.waterToggle) {
      actor.movementTicks++;
    }
    if (actor.grounded && actor.movementTicks > 1) {
      enter(actor, 'land');
    } else if (actor.movementTicks >= curve.length) {
      enter(actor, 'fall');
    }
  } else if (state === 'fall') {
    if (type === 5 || type === 6) {
      movePixels(context, actor, move * 2, 0);
    } else {
      horizontal(context, actor, actor.carryDirection, actor.carryMode);
      horizontal(context, actor, move, actor.carryMode === 4 ? 7 : 6);
    }
    vertical(context, actor, 5);
    if (actor.grounded) {
      enter(actor, 'land');
    }
  } else if (state === 'crouch') {
    if (!command.dropHeld) {
      enter(actor, 'idle');
    }
  } else if (state === 'backhop') {
    horizontal(context, actor, -actor.facing, 8);
    vertical(context, actor, actor.movementTicks < 10 ? -2 : 2);
    if (actor.movementTicks++ >= 29 || (actor.grounded && actor.movementTicks > 15)) {
      enter(actor, actor.grounded ? 'idle' : 'fall');
    }
  } else if (state === 'retreat') {
    movePixels(context, actor, -actor.facing * 4, 0);
    if (actor.movementTicks++ > 15 || (!command.upHeld && !command.dropHeld)) {
      enter(actor, 'idle');
    }
  } else if (state === 'hover') {
    if (!command.upHeld || actor.movementTicks++ > 120) {
      enter(actor, 'fall');
    }
  } else if (state === 'dive') {
    if (type === 5) {
      movePixels(context, actor, actor.facing * 6, 2);
    } else {
      vertical(context, actor, 10);
    }
    if (actor.grounded) {
      enter(actor, 'land');
    }
  }

  moveWithTerrain(context, actor);
  actor.dashTicks = actor.movementState === 'dash' ? 1 : 0;
  if (actor.grounded) {
    actor.extraJumpUsed = false;
  }
  if (!wasGrounded && actor.grounded) {
    context.events.push({ type: 'landed', tick, combatantId: actor.id, x: actor.x, y: actor.y });
  }
  actor.vx = (actor.x - oldX) * 60;
  actor.vy = (actor.y - oldY) * 60;
}
