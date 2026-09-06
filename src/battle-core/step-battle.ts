import { updateAttack, advanceAttack } from './combat';
import { moveCombatant } from './movement';
import { updatePlatforms } from './platforms';
import { updateProjectiles } from './projectiles';
import { battleRandom } from './random';
import { finishAtTimeout } from './results';
import { resolveSpecialSupport } from './specials';
import { statusCommand } from './statuses';
import { resolveSupport } from './support-effects';
import type { BattleContext, CommandFrame, Strategy } from './types';
import { emptyCommand } from './types';

const COMMAND_KEYS = Object.keys(emptyCommand()) as (keyof ReturnType<typeof emptyCommand>)[];

const PARTNER_STRATEGIES: Strategy[] = ['ATTACK_LEADER', 'PROTECT_LEADER', 'AGGRESSIVE'];

export function stepBattle(context: BattleContext, frame: CommandFrame) {
  if (context.state.result) {
    return;
  }

  validateFrame(context, frame);
  const draws = frame.aiRandomDraws ?? 0;
  if (!Number.isInteger(draws) || draws < 0 || draws > 1024) {
    throw new Error('Invalid AI random draw count');
  }
  for (let index = 0; index < draws; index++) {
    battleRandom(context);
  }
  cyclePartnerStrategies(context, frame);

  context.state.tick = frame.tick;
  if (context.state.specialFreezeTicks > 0) {
    const caster = context.state.combatants.find((actor) => actor.attack?.slot === 'special');
    if (caster) {
      advanceAttack(context, caster, frame.commands[caster.id]!);
    } else {
      context.state.specialFreezeTicks = 0;
    }
    return;
  }
  context.state.remainingTicks = Math.max(0, context.state.remainingTicks - 1);

  updatePlatforms(context);

  for (const combatant of context.state.combatants) {
    if (combatant.panelPendingTicks > 0 && --combatant.panelPendingTicks === 0) {
      combatant.panel = [1, 2, 3, 6, 30][combatant.panelIndex]!;
    }
    const command = statusCommand(combatant, frame.commands[combatant.id]!);
    updateAttack(context, combatant, command);

    if (context.state.specialFreezeTicks > 0) {
      return;
    }
    if (context.state.result) {
      break;
    }

    moveCombatant(context, combatant, command);
  }

  if (!context.state.result) {
    context.state.supportEffects = context.state.supportEffects.filter((effect) => {
      if (--effect.remainingTicks > 0) {
        return true;
      }
      const owner = context.state.combatants.find((actor) => actor.id === effect.ownerId)!;
      const ability = context.content.abilities[effect.abilityId]!;
      if (!owner.knockedOut) {
        if (ability.abilityKind === 'special') {
          resolveSpecialSupport(context, owner, ability);
        } else {
          resolveSupport(context, owner, ability, effect.slot);
        }
      }
      return false;
    });
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
    if (!combatant.knockedOut && frame.commands[combatant.id]!.strategyPressed) {
      const partners =
        combatant.role === 'partner'
          ? [combatant]
          : context.state.combatants.filter(
              (partner) => partner.teamId === combatant.teamId && partner.role === 'partner',
            );
      for (const partner of partners) {
        partner.panelIndex = (partner.panelIndex + 1) % 5;
        partner.panelPendingTicks = 11;
        partner.strategy =
          PARTNER_STRATEGIES[
            (PARTNER_STRATEGIES.indexOf(partner.strategy) + 1) % PARTNER_STRATEGIES.length
          ]!;
      }
    }
  }
}
