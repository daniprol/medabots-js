import { ArraySchema, type MapSchema, type Schema } from '@colyseus/schema';

import type { BattleSnapshot, CombatantSnapshot } from '../battle-core';
import { PART_SLOTS } from '../content/schemas';
import type { NetworkBattle } from './state';
import {
  NetworkAttack,
  NetworkCombatant,
  NetworkPart,
  NetworkStatus,
  NetworkProjectile,
  NetworkPlatform,
  NetworkSupport,
} from './state';

/** Keep stable schema identities so Colyseus patches only changed fields. */
function syncEntities<T extends { id: string }, S extends Schema>(
  target: MapSchema<S>,
  values: T[],
  create: () => S,
  update: (schema: S, value: T) => void,
) {
  const ids = new Set(values.map((value) => value.id));
  for (const id of target.keys()) {
    if (!ids.has(id)) {
      target.delete(id);
    }
  }
  for (const value of values) {
    let item = target.get(value.id);
    if (!item) {
      item = create();
      target.set(value.id, item);
    }
    update(item, value);
  }
}

function syncCombatant(target: NetworkCombatant, value: CombatantSnapshot) {
  const {
    parts,
    attack,
    beneficialStatus,
    harmfulStatus,
    x,
    y,
    vx,
    vy,
    facing,
    grounded,
    groundPlatformId,
    dashTicks,
    dashCooldownTicks,
    dropTicks,
    lastMoveX,
    lastTapLeft,
    lastTapRight,
    movementState,
    movementTicks,
    residualX,
    residualY,
    jumpHoldTicks,
    jumpFinalized,
    jumpCurve,
    carryDirection,
    carryMode,
    extraJumpUsed,
    lastTapUp,
    lastTapDown,
    idleTicks,
    waterToggle,
    transported,
    iceMomentum,
    ...scalar
  } = value;
  Object.assign(target, scalar);
  Object.assign(target.movement, {
    x,
    y,
    vx,
    vy,
    facing,
    grounded,
    groundPlatformId: groundPlatformId ?? undefined,
    dashTicks,
    dashCooldownTicks,
    dropTicks,
    lastMoveX,
    lastTapLeft,
    lastTapRight,
    movementState,
    movementTicks,
    residualX,
    residualY,
    jumpHoldTicks,
    jumpFinalized,
    jumpCurve,
    carryDirection,
    carryMode,
    extraJumpUsed,
    lastTapUp,
    lastTapDown,
    idleTicks,
    waterToggle,
    transported,
    iceMomentum,
  });
  for (const slot of PART_SLOTS) {
    target.parts[slot] ??= new NetworkPart();
    Object.assign(target.parts[slot], parts[slot]);
  }
  for (const key of ['beneficialStatus', 'harmfulStatus'] as const) {
    const status = key === 'beneficialStatus' ? beneficialStatus : harmfulStatus;
    if (status) {
      target[key] ??= new NetworkStatus();
      Object.assign(target[key], status);
    } else {
      target[key] = undefined;
    }
  }
  if (attack) {
    target.attack ??= new NetworkAttack();
    const { hitIds, ...attackFields } = attack;
    Object.assign(target.attack, attackFields);
    if (target.attack.hitIds.join() !== hitIds.join()) {
      target.attack.hitIds = new ArraySchema(...hitIds);
    }
  } else {
    target.attack = undefined;
  }
}

export function syncBattle(target: NetworkBattle, snapshot: BattleSnapshot) {
  const { combatants, projectiles, platforms, supportEffects, result, ...scalars } = snapshot;
  Object.assign(target, scalars);
  target.winnerTeamId = result?.winnerTeamId ?? '';
  target.resultReason = result?.reason ?? '';
  syncEntities(target.combatants, combatants, () => new NetworkCombatant(), syncCombatant);
  syncEntities(
    target.projectiles,
    projectiles,
    () => new NetworkProjectile(),
    (target, value) => {
      const { hitIds, ...fields } = value;
      Object.assign(target, fields);
      if (target.hitIds.join() !== hitIds.join()) {
        target.hitIds = new ArraySchema(...hitIds);
      }
    },
  );
  syncEntities(target.platforms, platforms, () => new NetworkPlatform(), Object.assign);
  syncEntities(target.supportEffects, supportEffects, () => new NetworkSupport(), Object.assign);
}

/** Detached plain snapshots are the renderer's existing boundary. */
export function readBattle(state: NetworkBattle): BattleSnapshot {
  const json = state.toJSON();
  const combatants: CombatantSnapshot[] = Object.values(json.combatants)
    .map((value) => {
      const { movement, ...fields } = value;
      return {
        ...fields,
        ...movement,
        groundPlatformId: movement.groundPlatformId ?? null,
        attack: value.attack ?? null,
        beneficialStatus: value.beneficialStatus ?? null,
        harmfulStatus: value.harmfulStatus ?? null,
      };
    })
    .sort((a, b) => a.actorIndex - b.actorIndex);
  return {
    tick: json.tick,
    randomCursor: json.randomCursor,
    specialFreezeTicks: json.specialFreezeTicks,
    arenaId: json.arenaId,
    rulesId: json.rulesId,
    remainingTicks: json.remainingTicks,
    phase: json.phase,
    combatants,
    projectiles: Object.values(json.projectiles),
    platforms: Object.values(json.platforms),
    supportEffects: Object.values(json.supportEffects),
    result: json.resultReason
      ? {
          winnerTeamId: json.winnerTeamId || null,
          reason: json.resultReason,
          elapsedTicks: json.tick,
          finalCombatants: structuredClone(combatants),
        }
      : null,
  };
}
