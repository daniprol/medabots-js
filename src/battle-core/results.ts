import { battleRandom } from './random';
import type { BattleContext, BattleResult } from './types';

export function finishBattle(
  context: BattleContext,
  winnerTeamId: string | null,
  reason: BattleResult['reason'],
) {
  if (context.state.result) {
    return;
  }

  context.state.phase = 'complete';
  context.state.result = {
    winnerTeamId,
    reason,
    elapsedTicks: context.state.tick,
    finalCombatants: structuredClone(context.state.combatants),
  };
  context.events.push({
    type: 'roundEnded',
    tick: context.state.tick,
    combatantId: '',
    x: 0,
    y: 0,
  });
}

export function finishAtTimeout(context: BattleContext) {
  const scores = context.setup.teams.map((team) => {
    const actors = context.state.combatants.filter((actor) => actor.teamId === team.id);
    const leader = actors.find((actor) => actor.role === 'leader')!;
    const partner = actors.find((actor) => actor.role === 'partner')!;
    const liveParts = (actor: typeof leader) =>
      Object.values(actor.parts).filter((part) => part.currentArmor > 0).length;
    const parts = Object.values(leader.parts);
    return [
      actors.filter((actor) => !actor.knockedOut).length,
      liveParts(leader),
      liveParts(partner),
      Math.floor(
        (100 * parts.reduce((sum, part) => sum + part.currentArmor, 0)) /
          parts.reduce((sum, part) => sum + part.maxArmor, 0),
      ),
      Math.floor((100 * leader.parts.head.currentArmor) / leader.parts.head.maxArmor),
      -leader.medalLevel,
    ];
  });
  for (let index = 0; index < scores[0]!.length; index++) {
    const difference = scores[0]![index]! - scores[1]![index]!;
    if (difference !== 0) {
      finishBattle(context, context.setup.teams[difference > 0 ? 0 : 1]!.id, 'timeout');
      return;
    }
  }
  finishBattle(context, context.setup.teams[battleRandom(context) & 1 ? 0 : 1]!.id, 'timeout');
}
