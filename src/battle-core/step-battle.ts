import { separateBodies } from './collisions';
import { updateAttack } from './combat';
import { moveCombatant } from './movement';
import { updateProjectiles } from './projectiles';
import { finishAtTimeout } from './results';
import type { BattleContext, CommandFrame, Strategy } from './types';
import { emptyCommand } from './types';

const COMMAND_KEYS = Object.keys(emptyCommand()) as (keyof ReturnType<typeof emptyCommand>)[];

const PARTNER_STRATEGIES: Strategy[] = ['ATTACK_LEADER', 'PROTECT_LEADER', 'AGGRESSIVE'];

export function stepBattle(context: BattleContext, frame: CommandFrame) {
  if (context.state.result) {
    return;
  }

  validateFrame(context, frame);
  cyclePartnerStrategies(context, frame);

  context.state.tick = frame.tick;
  context.state.remainingTicks = Math.max(0, context.state.remainingTicks - 1);

  for (const combatant of context.state.combatants) {
    updateAttack(context, combatant, frame.commands[combatant.id]!);

    if (context.state.result) {
      break;
    }

    moveCombatant(context, combatant, frame.commands[combatant.id]!);
  }

  if (!context.state.result) {
    separateBodies(context);
    updateProjectiles(context);
  }

  if (!context.state.result && context.state.remainingTicks === 0) {
    finishAtTimeout(context);
  }
}

function validateFrame(context: BattleContext, frame: CommandFrame) {
  if (frame.tick !== context.state.tick + 1) {
    throw new Error(`Expected tick ${context.state.tick + 1}, received ${frame.tick}`);
  }

  for (const combatant of context.state.combatants) {
    const command = frame.commands[combatant.id];

    if (
      !command ||
      ![-1, 0, 1].includes(command.moveX) ||
      Object.keys(command).length !== COMMAND_KEYS.length ||
      COMMAND_KEYS.some(
        (key) => key !== 'moveX' && typeof command[key as keyof typeof command] !== 'boolean',
      )
    ) {
      throw new Error(`Invalid or missing command for ${combatant.id} at tick ${frame.tick}`);
    }
  }
}

function cyclePartnerStrategies(context: BattleContext, frame: CommandFrame) {
  for (const combatant of context.state.combatants) {
    if (
      combatant.role === 'leader' &&
      !combatant.knockedOut &&
      frame.commands[combatant.id]!.strategyPressed
    ) {
      const partner = context.state.combatants.find(
        (partner) => partner.teamId === combatant.teamId && partner.role === 'partner',
      )!;
      partner.strategy =
        PARTNER_STRATEGIES[
          (PARTNER_STRATEGIES.indexOf(partner.strategy) + 1) % PARTNER_STRATEGIES.length
        ]!;
    }
  }
}
