import type { RuntimeAbility } from '../content/catalog';
import { PART_SLOTS, type PartSlot } from '../content/schemas';
import { damageArmor } from './armor';
import { battleRandom } from './random';
import type { BattleContext, CombatantCommand, CombatantSnapshot, StatusKind } from './types';

const BENEFICIAL: StatusKind[] = [
  'defense',
  'full-defense',
  'regeneration',
  'scouting',
  'speed',
  'amplify',
];
export const meterBlocked = (actor: CombatantSnapshot) =>
  actor.harmfulStatus?.kind === 'meter-control';
export function supportPower(
  context: BattleContext,
  actor: CombatantSnapshot,
  power: number,
  special = false,
) {
  const medal = context.content.medals[actor.medalId]!.levels[actor.medalLevel - 1]!;
  const legs = context.content.parts[actor.parts.legs.definitionId]!;
  return Math.trunc(
    (power *
      (50 +
        medal.support +
        (special || actor.parts.legs.destroyed ? 0 : legs.attackRanks[2]! * 2))) /
      50,
  );
}
export function installStatus(
  context: BattleContext,
  actor: CombatantSnapshot,
  source: CombatantSnapshot,
  kind: StatusKind,
  magnitude: number,
  part: PartSlot = 'head',
  locked = false,
) {
  const channel = BENEFICIAL.includes(kind) ? 'beneficialStatus' : 'harmfulStatus';
  if (actor.knockedOut || (actor[channel]?.locked && !locked)) {
    return;
  }
  const fixed: Partial<Record<StatusKind, number>> = {
    defense: 600,
    regeneration: 900,
    scouting: 600,
    burning: 720,
    stun: 60,
    freeze: 60,
    slow: 900,
    'melee-trap': 600,
    'shot-trap': 600,
    'double-trap': 720,
  };
  actor[channel] = {
    kind,
    magnitude,
    part,
    sourceId: source.id,
    locked,
    remainingTicks: fixed[kind] ?? Math.max(1, ((magnitude * 60) << 16) >> 16),
  };
  if (kind === 'indefensible') {
    actor.guarding = false;
  }
  context.events.push({
    type: 'statusApplied',
    tick: context.state.tick,
    combatantId: source.id,
    targetId: actor.id,
    x: actor.x,
    y: actor.y + 2,
  });
}
export function recoverySeverity(actor: CombatantSnapshot) {
  return Math.max(
    ...Object.values(actor.parts).map((part) => {
      if (part.destroyed || part.currentArmor >= part.maxArmor) {
        return 0;
      }
      const segments = Math.floor((part.currentArmor * 12) / part.maxArmor);
      return segments >= 9 ? 1 : segments >= 5 ? 2 : 3;
    }),
  );
}
function recoveryPart(context: BattleContext, actor: CombatantSnapshot): PartSlot | undefined {
  const limbs: PartSlot[][] = [
    ['rightArm', 'leftArm', 'legs'],
    ['rightArm', 'legs', 'leftArm'],
    ['leftArm', 'rightArm', 'legs'],
    ['leftArm', 'legs', 'rightArm'],
    ['legs', 'rightArm', 'leftArm'],
    ['legs', 'leftArm', 'rightArm'],
  ];
  const order: PartSlot[] = ['head', ...limbs[battleRandom(context) % 6]!];
  const severity = recoverySeverity(actor);
  if (!severity) {
    return undefined;
  }
  return order.find((slot) => {
    const part = actor.parts[slot];
    if (part.destroyed || part.currentArmor >= part.maxArmor) {
      return false;
    }
    const segments = Math.floor((part.currentArmor * 12) / part.maxArmor);
    return (segments >= 9 ? 1 : segments >= 5 ? 2 : 3) === severity;
  });
}
export function repairPart(
  context: BattleContext,
  actor: CombatantSnapshot,
  amount: number,
  revive = false,
) {
  if (actor.knockedOut) {
    return;
  }
  let slot: PartSlot | undefined;
  if (revive) {
    const limbs: PartSlot[] = ['rightArm', 'leftArm', 'legs'];
    const start = battleRandom(context) % 3;
    slot = [0, 1, 2]
      .map((offset) => limbs[(start + offset) % 3]!)
      .find((key) => actor.parts[key].destroyed);
  } else {
    slot = recoveryPart(context, actor);
  }
  if (!slot) {
    return;
  }
  const part = actor.parts[slot];
  part.currentArmor = Math.min(part.maxArmor, part.currentArmor + Math.max(1, Math.trunc(amount)));
  part.destroyed = false;
  context.events.push({
    type: 'repaired',
    tick: context.state.tick,
    combatantId: actor.id,
    part: slot,
    x: actor.x,
    y: actor.y + 2,
  });
}
export function updateStatuses(context: BattleContext, actor: CombatantSnapshot) {
  if (actor.knockedOut) {
    return;
  }
  for (const channel of ['beneficialStatus', 'harmfulStatus'] as const) {
    const status = actor[channel];
    if (!status) {
      continue;
    }
    if (--status.remainingTicks <= 0) {
      actor[channel] = null;
      continue;
    }
    if (status.remainingTicks <= 120) {
      continue;
    }
    if (status.kind === 'burning' && (context.state.tick + 90) % 180 === 0) {
      if (actor.parts[status.part].currentArmor < 2) {
        status.part = PART_SLOTS.find((slot) => actor.parts[slot].currentArmor >= 2) ?? status.part;
      }
      const part = actor.parts[status.part];
      if (!part.destroyed) {
        part.currentArmor = Math.max(1, part.currentArmor - status.magnitude);
      }
    }
    if (status.kind === 'regeneration' && context.state.tick % 180 === 0) {
      repairPart(context, actor, status.magnitude);
    }
  }
  for (const slot of PART_SLOTS) {
    const part = actor.parts[slot];
    if (
      part.transformationTicks <= 0 ||
      (part.transformationTicks === 121 && actor.attack?.slot === slot)
    ) {
      continue;
    }
    if (--part.transformationTicks === 0) {
      part.definitionId = part.originalDefinitionId;
    }
  }
}
export function triggerTrap(
  context: BattleContext,
  actor: CombatantSnapshot,
  slot: PartSlot,
  ability: RuntimeAbility,
) {
  const trap = actor.harmfulStatus;
  if (!trap || !['melee-trap', 'shot-trap', 'double-trap'].includes(trap.kind)) {
    return false;
  }
  const category = ability.original.category;
  if (
    category > 1 ||
    (trap.kind === 'melee-trap' && category !== 0) ||
    (trap.kind === 'shot-trap' && category !== 1)
  ) {
    return false;
  }
  const source = context.state.combatants.find((source) => source.id === trap.sourceId)!;
  damageArmor(context, actor, slot, trap.magnitude & 255, source);
  actor.harmfulStatus = null;
  actor.attack = null;
  actor.staggerTicks = 8;
  context.events.push({
    type: 'hit',
    tick: context.state.tick,
    combatantId: source.id,
    targetId: actor.id,
    part: slot,
    damage: trap.magnitude & 255,
    x: actor.x,
    y: actor.y + 2,
  });
  return true;
}
/** Directional confusion also changes Up+B and Down+B, while preserving action buttons. */
export function statusCommand(actor: CombatantSnapshot, input: CombatantCommand): CombatantCommand {
  if (actor.harmfulStatus?.kind !== 'confusion') {
    return input;
  }
  let x: number = input.moveX;
  let y = Number(input.upHeld) - Number(input.dropHeld);
  const phase = (actor.harmfulStatus.remainingTicks >> 6) & 3;
  if (phase === 0) {
    [x, y] = [y, -x];
  }
  if (phase === 1) {
    [x, y] = [-x, -y];
  }
  if (phase === 2) {
    [x, y] = [-y, x];
  }
  const attackPressed = input.rightArmPressed || input.leftArmPressed || input.headPressed;
  return {
    ...input,
    moveX: Math.sign(x) as -1 | 0 | 1,
    upHeld: y > 0,
    dropHeld: y < 0,
    upPressed: y > 0 && (input.upPressed || input.downPressed || input.moveX !== actor.lastMoveX),
    downPressed: y < 0 && (input.upPressed || input.downPressed || input.moveX !== actor.lastMoveX),
    headPressed: attackPressed && y > 0,
    leftArmPressed: attackPressed && y < 0,
    rightArmPressed: attackPressed && y === 0,
  };
}
