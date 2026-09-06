import { schema, t, type SchemaType } from '@colyseus/schema';

import type {
  CombatantSnapshot,
  AttackState,
  StatusState,
  ProjectileSnapshot,
} from '../battle-core/types';

// Explicit wire contract. Network schemas stay outside the deterministic core.
export const NetworkPart = schema(
  {
    definitionId: t.string(),
    originalDefinitionId: t.string(),
    transformationTicks: t.number(),
    currentArmor: t.number(),
    readiness: t.number(),
    maxArmor: t.number(),
    cooldownTicks: t.number(),
    destroyed: t.boolean(),
    uses: t.number(),
  },
  'NetworkPart',
);
export type NetworkPart = SchemaType<typeof NetworkPart>;

export const NetworkStatus = schema(
  {
    kind: t.string<StatusState['kind']>(),
    magnitude: t.float64(),
    remainingTicks: t.number(),
    sourceId: t.string(),
    part: t.string<StatusState['part']>(),
    locked: t.boolean(),
  },
  'NetworkStatus',
);
export type NetworkStatus = SchemaType<typeof NetworkStatus>;

export const NetworkAttack = schema(
  {
    abilityId: t.string(),
    slot: t.string<AttackState['slot']>(),
    age: t.number(),
    fired: t.boolean(),
    initialized: t.boolean(),
    contactFired: t.boolean(),
    chargeTicks: t.number(),
    releasing: t.boolean(),
    headBias: t.number(),
    comboStage: t.number(),
    comboBuffered: t.boolean(),
    hitIds: t.array('string'),
  },
  'NetworkAttack',
);
export type NetworkAttack = SchemaType<typeof NetworkAttack>;

export const NetworkMovement = schema(
  {
    x: t.float64(),
    y: t.float64(),
    vx: t.float64(),
    vy: t.float64(),
    facing: t.int8<CombatantSnapshot['facing']>(),
    grounded: t.boolean(),
    groundPlatformId: t.string().optional(),
    dashTicks: t.number(),
    dashCooldownTicks: t.number(),
    dropTicks: t.number(),
    lastMoveX: t.number(),
    lastTapLeft: t.number(),
    lastTapRight: t.number(),
    movementState: t.string<CombatantSnapshot['movementState']>(),
    movementTicks: t.number(),
    residualX: t.number(),
    residualY: t.number(),
    jumpHoldTicks: t.number(),
    jumpFinalized: t.boolean(),
    jumpCurve: t.string(),
    carryDirection: t.int8<CombatantSnapshot['carryDirection']>(),
    carryMode: t.number(),
    extraJumpUsed: t.boolean(),
    lastTapUp: t.number(),
    lastTapDown: t.number(),
    idleTicks: t.number(),
    waterToggle: t.boolean(),
    transported: t.boolean(),
    iceMomentum: t.number(),
  },
  'NetworkMovement',
);
export type NetworkMovement = SchemaType<typeof NetworkMovement>;

export const NetworkParts = schema(
  { head: NetworkPart, rightArm: NetworkPart, leftArm: NetworkPart, legs: NetworkPart },
  'NetworkParts',
);
export const NetworkCombatant = schema(
  {
    id: t.string(),
    characterId: t.string(),
    teamId: t.string(),
    role: t.string<CombatantSnapshot['role']>(),
    knockedOut: t.boolean(),
    guarding: t.boolean(),
    charging: t.boolean(),
    specialMeter: t.number(),
    lastActivatedSpecialId: t.string(),
    staggerTicks: t.number(),
    strategy: t.string<CombatantSnapshot['strategy']>(),
    actorIndex: t.number(),
    medalId: t.string(),
    medalLevel: t.number(),
    passiveChargeTicks: t.number(),
    displayMeter: t.number(),
    panelIndex: t.number(),
    panelPendingTicks: t.number(),
    panel: t.number(),
    invulnerabilityTicks: t.number(),
    movement: NetworkMovement,
    parts: NetworkParts,
    attack: t.ref(NetworkAttack).optional(),
    beneficialStatus: t.ref(NetworkStatus).optional(),
    harmfulStatus: t.ref(NetworkStatus).optional(),
  },
  'NetworkCombatant',
);
export type NetworkCombatant = SchemaType<typeof NetworkCombatant>;

export const NetworkProjectile = schema(
  {
    hitIds: t.array('string'),
    spawnTick: t.number(),
    hitTicks: t.number(),
    index: t.number(),
    heading: t.number(),
    steered: t.boolean(),
    id: t.string(),
    ownerId: t.string(),
    teamId: t.string(),
    abilityId: t.string(),
    x: t.float64(),
    y: t.float64(),
    vx: t.float64(),
    remainingTicks: t.number(),
    age: t.number(),
    originX: t.float64(),
    headBias: t.number(),
    powerMultiplier: t.float64(),
    vy: t.float64(),
    facing: t.int8<ProjectileSnapshot['facing']>(),
  },
  'NetworkProjectile',
);
export type NetworkProjectile = SchemaType<typeof NetworkProjectile>;

export const NetworkPlatform = schema(
  {
    id: t.string(),
    x: t.float64(),
    y: t.float64(),
    direction: t.number(),
    minimum: t.number(),
    maximum: t.number(),
    width: t.number(),
    endpointWaitTicks: t.number(),
    waitTicks: t.number(),
  },
  'NetworkPlatform',
);
export type NetworkPlatform = SchemaType<typeof NetworkPlatform>;

export const NetworkSupport = schema(
  {
    id: t.string(),
    ownerId: t.string(),
    teamId: t.string(),
    abilityId: t.string(),
    slot: t.string<'head' | 'rightArm' | 'leftArm' | 'legs' | 'special'>(),
    magnitude: t.float64(),
    remainingTicks: t.number(),
  },
  'NetworkSupport',
);
export const NetworkBattle = schema(
  {
    tick: t.number(),
    randomCursor: t.number(),
    specialFreezeTicks: t.number(),
    arenaId: t.string(),
    rulesId: t.string(),
    remainingTicks: t.number(),
    phase: t.string<'fighting' | 'complete'>(),
    combatants: t.map(NetworkCombatant),
    projectiles: t.map(NetworkProjectile),
    platforms: t.map(NetworkPlatform),
    supportEffects: t.map(NetworkSupport),
    winnerTeamId: t.string(),
    resultReason: t.string<'' | 'leader-head-destroyed' | 'timeout' | 'draw'>().default(''),
  },
  'NetworkBattle',
);
export type NetworkBattle = SchemaType<typeof NetworkBattle>;

export const OnlinePlayer = schema(
  {
    name: t.string(),
    characterId: t.string(),
    combatantId: t.string(),
    teamId: t.string(),
    connected: t.boolean(),
    ready: t.boolean(),
    loaded: t.boolean().default(false),
  },
  'OnlinePlayer',
);
export type OnlinePlayer = SchemaType<typeof OnlinePlayer>;
export const BattleRoomState = schema(
  {
    phase: t
      .string<'waiting' | 'preparing' | 'countdown' | 'fighting' | 'complete' | 'abandoned'>()
      .default('waiting'),
    arenaId: t.string(),
    teamSize: t.number(),
    countdown: t.number().default(0),
    inputHz: t.number(),
    simulationHz: t.number(),
    patchHz: t.number(),
    players: t.map(OnlinePlayer),
    battle: t.ref(NetworkBattle).optional(),
    notice: t.string().default(''),
  },
  'BattleRoomState',
);
export type BattleRoomState = SchemaType<typeof BattleRoomState>;
