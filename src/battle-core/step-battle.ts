import type { BattleContext, CommandFrame, Strategy } from './types';
import { emptyCommand } from './types';
import { moveCombatant } from './movement';
import { updateAttack } from './combat';
import { updateProjectiles } from './projectiles';
import { finishBattle } from './damage';
import { separateBodies } from './collisions';
export function stepBattle(ctx: BattleContext, frame: CommandFrame) {
  if (ctx.state.result) return;
  if (frame.tick !== ctx.state.tick + 1)
    throw new Error(`Expected tick ${ctx.state.tick + 1}, received ${frame.tick}`);
  for (const c of ctx.state.combatants) {
    const cmd = frame.commands[c.id];
    if (
      !cmd ||
      ![-1, 0, 1].includes(cmd.moveX) ||
      Object.keys(cmd).length !== Object.keys(emptyCommand()).length ||
      Object.keys(emptyCommand()).some(
        (key) => key !== 'moveX' && typeof cmd[key as keyof typeof cmd] !== 'boolean',
      )
    )
      throw new Error(`Invalid or missing command for ${c.id} at tick ${frame.tick}`);
  }
  for (const c of ctx.state.combatants) {
    if (c.role === 'leader' && !c.knockedOut && frame.commands[c.id]!.strategyPressed) {
      const partner = ctx.state.combatants.find(
        (p) => p.teamId === c.teamId && p.role === 'partner',
      )!;
      const strategies: Strategy[] = ['ATTACK_LEADER', 'PROTECT_LEADER', 'AGGRESSIVE'];
      partner.strategy = strategies[(strategies.indexOf(partner.strategy) + 1) % 3]!;
    }
  }
  ctx.state.tick = frame.tick;
  ctx.state.remainingTicks = Math.max(0, ctx.state.remainingTicks - 1);
  for (const c of ctx.state.combatants) {
    updateAttack(ctx, c, frame.commands[c.id]!);
    if (ctx.state.result) break;
    moveCombatant(ctx, c, frame.commands[c.id]!);
  }
  if (!ctx.state.result) {
    separateBodies(ctx);
    updateProjectiles(ctx);
  }
  if (!ctx.state.result && ctx.state.remainingTicks === 0) {
    const totals = ctx.setup.teams.map((t) => {
      const parts = ctx.state.combatants
        .filter((c) => c.teamId === t.id)
        .flatMap((c) => Object.values(c.parts));
      return {
        id: t.id,
        remaining: parts.reduce((n, p) => n + p.currentArmor, 0),
        max: parts.reduce((n, p) => n + p.maxArmor, 0),
      };
    });
    const a = totals[0]!,
      b = totals[1]!;
    const delta = a.remaining * b.max - b.remaining * a.max;
    finishBattle(
      ctx,
      delta === 0 ? null : delta > 0 ? a.id : b.id,
      delta === 0 ? 'draw' : 'timeout',
    );
  }
}
