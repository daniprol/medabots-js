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
    const parts = context.state.combatants
      .filter((combatant) => combatant.teamId === team.id)
      .flatMap((combatant) => Object.values(combatant.parts));

    return {
      teamId: team.id,
      remainingArmor: parts.reduce((total, part) => total + part.currentArmor, 0),
      startingArmor: parts.reduce((total, part) => total + part.maxArmor, 0),
    };
  });

  // Battle setup validation guarantees exactly two teams.
  const firstTeam = scores[0]!;
  const secondTeam = scores[1]!;

  // Cross multiplication compares armor percentages without floating-point division.
  const difference =
    firstTeam.remainingArmor * secondTeam.startingArmor -
    secondTeam.remainingArmor * firstTeam.startingArmor;
  const winner = difference === 0 ? null : difference > 0 ? firstTeam.teamId : secondTeam.teamId;
  finishBattle(context, winner, winner === null ? 'draw' : 'timeout');
}
