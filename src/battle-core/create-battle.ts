import type { ContentCatalog } from '../content/catalog';
import { PART_SLOTS } from '../content/schemas';
import { stepBattle } from './step-battle';
import type { Battle, BattleContext, BattleSetup, CombatantSnapshot } from './types';

export function createBattle({
  setup,
  content,
}: {
  setup: BattleSetup;
  content: ContentCatalog;
}): Battle {
  validateSetup(setup, content);

  const combatants = createCombatants(setup, content);

  const context: BattleContext = {
    setup: structuredClone(setup),
    content,
    state: {
      tick: 0,
      randomCursor: setup.seed & 255,
      specialFreezeTicks: 0,
      supportEffects: [],
      platforms: content.arenas[setup.arenaId]!.original.movingPlatforms.map((platform) => ({
        ...platform,
        waitTicks: 0,
      })),
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
    step: (frame) => stepBattle(context, frame),
    getSnapshot: () => structuredClone(context.state),
    drainEvents: () => {
      const events = context.events;
      context.events = [];

      return events;
    },
    getResult: () => (context.state.result ? structuredClone(context.state.result) : null),
  };
}

function validateSetup(setup: BattleSetup, content: ContentCatalog) {
  if (!content.rules[setup.rulesId] || !content.arenas[setup.arenaId]) {
    throw new Error('BattleSetup: unknown rules or arena');
  }

  if (
    setup.teams.length !== 2 ||
    new Set(setup.teams.map((team) => team.id)).size !== 2 ||
    setup.teams.some(
      (team) =>
        team.combatants.length !== 2 ||
        team.combatants.filter((combatantSetup) => combatantSetup.role === 'leader').length !== 1,
    )
  ) {
    throw new Error('BattleSetup requires two distinct teams, each with a leader and partner');
  }
}

function createCombatants(setup: BattleSetup, content: ContentCatalog): CombatantSnapshot[] {
  const arena = content.arenas[setup.arenaId]!;
  const ids = new Set<string>();
  const combatants: CombatantSnapshot[] = setup.teams.flatMap((team) =>
    team.combatants.map((combatantSetup) => {
      if (ids.has(combatantSetup.instanceId)) {
        throw new Error(`Duplicate combatant ${combatantSetup.instanceId}`);
      }

      ids.add(combatantSetup.instanceId);

      const definition = content.characters[combatantSetup.characterId];

      if (!definition) {
        throw new Error(`Unknown character ${combatantSetup.characterId}`);
      }

      const loadout = combatantSetup.loadout ?? definition.defaultLoadout;
      const parts = {} as CombatantSnapshot['parts'];

      for (const slot of PART_SLOTS) {
        const part = content.parts[loadout[slot]];

        if (!part || part.slot !== slot) {
          throw new Error(`Invalid ${slot} part: ${loadout[slot]}`);
        }

        parts[slot] = {
          definitionId: part.id,
          currentArmor: part.armor,
          readiness: 0,
          maxArmor: part.armor,
          cooldownTicks: 0,
          destroyed: false,
          uses: 0,
        };
      }

      const actorIndex = setup.teams.indexOf(team) + (combatantSetup.role === 'partner' ? 2 : 0);
      const spawn = arena.spawns[actorIndex]!;

      return {
        id: combatantSetup.instanceId,
        characterId: combatantSetup.characterId,
        teamId: team.id,
        role: combatantSetup.role,
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        facing: spawn.x < 0 ? 1 : -1,
        grounded: true,
        groundPlatformId:
          arena.platforms.find(
            (platform) =>
              platform.y === spawn.y && Math.abs(platform.x - spawn.x) <= platform.width / 2,
          )?.id ?? null,
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
        actorIndex,
        medalId: definition.medalId,
        medalLevel: definition.medalLevel,
        movementState: 'idle',
        movementTicks: 0,
        residualX: 4,
        residualY: 4,
        jumpHoldTicks: 0,
        jumpFinalized: false,
        jumpCurve: 'ordinary_full',
        carryDirection: 0,
        carryMode: 0,
        extraJumpUsed: false,
        lastTapUp: -9999,
        lastTapDown: -9999,
        idleTicks: 0,
        passiveChargeTicks: 0,
        displayMeter: 0,
        panelIndex: 0,
        panelPendingTicks: 0,
        panel: 1,
        invulnerabilityTicks: 0,
        waterToggle: false,
        transported: false,
        iceMomentum: 0,
        supportStatus: 'none',
        supportMagnitude: 0,
        supportTicks: 0,
      };
    }),
  );

  return combatants.sort((first, second) => first.actorIndex - second.actorIndex);
}
