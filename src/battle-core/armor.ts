import type { PartSlot } from '../content/schemas';
import { finishBattle } from './results';
import type { BattleContext, CombatantSnapshot } from './types';

/** Destruction is shared by weapon hits, sacrifice and attached traps. */
export function damageArmor(
  context: BattleContext,
  target: CombatantSnapshot,
  slot: PartSlot,
  amount: number,
  source: CombatantSnapshot,
) {
  const part = target.parts[slot];
  if (part.destroyed || target.knockedOut) {
    return;
  }
  part.currentArmor = Math.max(0, part.currentArmor - amount);
  if (part.currentArmor > 0) {
    return;
  }
  part.destroyed = true;
  context.events.push({
    type: 'partDestroyed',
    tick: context.state.tick,
    combatantId: target.id,
    part: slot,
    x: target.x,
    y: target.y + (slot === 'legs' ? 0.8 : 2.5),
  });
  if (slot !== 'head') {
    return;
  }
  target.knockedOut = true;
  target.attack = null;
  target.guarding = false;
  target.charging = false;
  context.events.push({
    type: 'combatantKnockedOut',
    tick: context.state.tick,
    combatantId: target.id,
    x: target.x,
    y: target.y,
  });
  if (target.role === 'leader') {
    const winner = context.setup.teams.find((team) => team.id !== target.teamId)!.id;
    finishBattle(
      context,
      source.teamId === target.teamId ? winner : source.teamId,
      'leader-head-destroyed',
    );
  }
}
