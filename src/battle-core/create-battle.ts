import type { ContentCatalog } from '../content/build-content-catalog';
import { Slots } from '../content/schemas';
import type { Battle, BattleContext, BattleSetup, CombatantSnapshot } from './types';
import { stepBattle } from './step-battle';
export function createBattle({
  setup,
  content,
}: {
  setup: BattleSetup;
  content: ContentCatalog;
}): Battle {
  if (!content.rules[setup.rulesId] || !content.arenas[setup.arenaId])
    throw new Error('BattleSetup: unknown rules or arena');
  if (
    setup.teams.length !== 2 ||
    new Set(setup.teams.map((t) => t.id)).size !== 2 ||
    setup.teams.some(
      (t) =>
        t.combatants.length !== 2 || t.combatants.filter((c) => c.role === 'leader').length !== 1,
    )
  )
    throw new Error('BattleSetup requires two distinct teams, each with a leader and partner');
  const arena = content.arenas[setup.arenaId]!;
  const ids = new Set<string>();
  let index = 0;
  const combatants: CombatantSnapshot[] = setup.teams.flatMap((team) =>
    team.combatants.map((c) => {
      if (ids.has(c.instanceId)) throw new Error(`Duplicate combatant ${c.instanceId}`);
      ids.add(c.instanceId);
      const def = content.characters[c.characterId];
      if (!def) throw new Error(`Unknown character ${c.characterId}`);
      const loadout = c.loadout ?? def.defaultLoadout;
      const parts = {} as CombatantSnapshot['parts'];
      for (const slot of Slots) {
        const p = content.parts[loadout[slot]];
        if (!p || p.slot !== slot) throw new Error(`Invalid ${slot} part: ${loadout[slot]}`);
        parts[slot] = {
          definitionId: p.id,
          currentArmor: p.armor,
          maxArmor: p.armor,
          cooldownTicks: 0,
          destroyed: false,
          uses: 0,
        };
      }
      const spawn = arena.spawns[index++]!;
      return {
        id: c.instanceId,
        characterId: c.characterId,
        teamId: team.id,
        role: c.role,
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        facing: spawn.x < 0 ? 1 : -1,
        grounded: true,
        groundPlatformId:
          arena.platforms.find((p) => p.y === spawn.y && Math.abs(p.x - spawn.x) <= p.width / 2)
            ?.id ?? null,
        knockedOut: false,
        guarding: false,
        charging: false,
        specialMeter: 0,
        parts,
        attack: null,
        staggerTicks: 0,
        dashTicks: 0,
        dashCooldownTicks: 0,
        dropTicks: 0,
        lastMoveX: 0,
        lastTapLeft: -9999,
        lastTapRight: -9999,
        strategy: 'ATTACK_LEADER',
      };
    }),
  );
  const ctx: BattleContext = {
    setup: structuredClone(setup),
    content,
    state: {
      tick: 0,
      arenaId: setup.arenaId,
      rulesId: setup.rulesId,
      remainingTicks: content.rules[setup.rulesId]!.roundTicks,
      phase: 'fighting',
      combatants,
      projectiles: [],
      result: null,
    },
    events: [],
    nextEntityId: 1,
    rngState: setup.seed >>> 0,
  };
  return {
    step: (frame) => stepBattle(ctx, frame),
    getSnapshot: () => structuredClone(ctx.state),
    drainEvents: () => {
      const events = ctx.events;
      ctx.events = [];
      return events;
    },
    getResult: () => (ctx.state.result ? structuredClone(ctx.state.result) : null),
  };
}
