import type { ContentCatalog } from '../content/catalog';
import type { MatchDefinition, PartSlot, CharacterDefinition } from '../content/schemas';

export type BattleSetup = Pick<MatchDefinition, 'seed' | 'arenaId' | 'rulesId' | 'teams'>;

export type CombatantCommand = {
  moveX: -1 | 0 | 1;
  jumpPressed: boolean;
  jumpHeld: boolean;
  attackHeld: boolean;
  upHeld: boolean;
  upPressed: boolean;
  downPressed: boolean;
  dropHeld: boolean;
  rightArmPressed: boolean;
  leftArmPressed: boolean;
  headPressed: boolean;
  guardHeld: boolean;
  chargeHeld: boolean;
  specialPressed: boolean;
  strategyPressed: boolean;
};

export const emptyCommand = (): CombatantCommand => ({
  moveX: 0,
  jumpPressed: false,
  jumpHeld: false,
  attackHeld: false,
  upHeld: false,
  upPressed: false,
  downPressed: false,
  dropHeld: false,
  rightArmPressed: false,
  leftArmPressed: false,
  headPressed: false,
  guardHeld: false,
  chargeHeld: false,
  specialPressed: false,
  strategyPressed: false,
});

export type CommandFrame = {
  tick: number;
  commands: Record<string, CombatantCommand>;
  aiRandomDraws?: number;
};

export type Strategy = 'ATTACK_LEADER' | 'PROTECT_LEADER' | 'AGGRESSIVE';

export type PartState = {
  definitionId: string;
  originalDefinitionId: string;
  transformationTicks: number;
  currentArmor: number;
  readiness: number;
  maxArmor: number;
  cooldownTicks: number;
  destroyed: boolean;
  uses: number;
};

export type AttackState = {
  abilityId: string;
  slot: PartSlot | 'special';
  age: number;
  fired: boolean;
  initialized: boolean;
  contactFired: boolean;
  chargeTicks: number;
  releasing: boolean;
  headBias: number;
  comboStage: number;
  comboBuffered: boolean;
  hitIds: string[];
};

export type CombatantSnapshot = {
  id: string;
  characterId: string;
  teamId: string;
  role: 'leader' | 'partner';
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: -1 | 1;
  grounded: boolean;
  groundPlatformId: string | null;
  knockedOut: boolean;
  guarding: boolean;
  charging: boolean;
  specialMeter: number;
  lastActivatedSpecialId: string;
  parts: Record<PartSlot, PartState>;
  attack: AttackState | null;
  staggerTicks: number;
  dashTicks: number;
  dashCooldownTicks: number;
  dropTicks: number;
  lastMoveX: number;
  lastTapLeft: number;
  lastTapRight: number;
  strategy: Strategy;
  actorIndex: number;
  medalId: string;
  medalLevel: number;
  movementState:
    | 'idle'
    | 'walk'
    | 'dash'
    | 'jump'
    | 'fall'
    | 'land'
    | 'crouch'
    | 'backhop'
    | 'hover'
    | 'dive'
    | 'retreat';
  movementTicks: number;
  residualX: number;
  residualY: number;
  jumpHoldTicks: number;
  jumpFinalized: boolean;
  jumpCurve: string;
  carryDirection: -1 | 0 | 1;
  carryMode: number;
  extraJumpUsed: boolean;
  lastTapUp: number;
  lastTapDown: number;
  idleTicks: number;
  passiveChargeTicks: number;
  displayMeter: number;
  panelIndex: number;
  panelPendingTicks: number;
  panel: number;
  invulnerabilityTicks: number;
  waterToggle: boolean;
  transported: boolean;
  iceMomentum: number;
  beneficialStatus: StatusState | null;
  harmfulStatus: StatusState | null;
};

export type StatusKind =
  | 'defense'
  | 'full-defense'
  | 'regeneration'
  | 'scouting'
  | 'speed'
  | 'amplify'
  | 'burning'
  | 'stun'
  | 'slow'
  | 'meter-control'
  | 'confusion'
  | 'ineffective'
  | 'indefensible'
  | 'melee-trap'
  | 'shot-trap'
  | 'double-trap'
  | 'freeze';
export type StatusState = {
  kind: StatusKind;
  magnitude: number;
  remainingTicks: number;
  sourceId: string;
  part: PartSlot;
  locked: boolean;
};

export type ProjectileSnapshot = {
  hitIds: string[];
  spawnTick: number;
  hitTicks: number;
  index: number;
  heading: number;
  steered: boolean;
  id: string;
  ownerId: string;
  teamId: string;
  abilityId: string;
  x: number;
  y: number;
  vx: number;
  remainingTicks: number;
  age: number;
  originX: number;
  headBias: number;
  powerMultiplier: number;
  vy: number;
  facing: -1 | 1;
};

export type BattleResult = {
  winnerTeamId: string | null;
  reason: 'leader-head-destroyed' | 'timeout' | 'draw';
  elapsedTicks: number;
  finalCombatants: CombatantSnapshot[];
};

/** Platform coordinates use original screen pixels: x is the left edge, y points down. */
export type PlatformSnapshot = {
  id: string;
  x: number;
  y: number;
  direction: number;
  minimum: number;
  maximum: number;
  width: number;
  endpointWaitTicks: number;
  waitTicks: number;
};

export type BattleSnapshot = {
  platforms: PlatformSnapshot[];
  tick: number;
  randomCursor: number;
  specialFreezeTicks: number;
  supportEffects: {
    id: string;
    ownerId: string;
    teamId: string;
    abilityId: string;
    slot: PartSlot | 'special';
    magnitude: number;
    remainingTicks: number;
  }[];
  arenaId: string;
  rulesId: string;
  remainingTicks: number;
  phase: 'fighting' | 'complete';
  combatants: CombatantSnapshot[];
  projectiles: ProjectileSnapshot[];
  result: BattleResult | null;
};

export type BattleEvent = {
  tick: number;
  type:
    | 'repaired'
    | 'statusApplied'
    | 'attackStarted'
    | 'projectileSpawned'
    | 'hit'
    | 'partDestroyed'
    | 'combatantKnockedOut'
    | 'specialActivated'
    | 'roundEnded'
    | 'landed'
    | 'dashed';
  combatantId: string;
  x: number;
  y: number;
  targetId?: string;
  part?: PartSlot;
  abilityId?: string;
  projectileId?: string;
  damage?: number;
  strong?: boolean;
  facing?: -1 | 1;
};

export type Battle = {
  step: (frame: CommandFrame) => void;
  getSnapshot: () => BattleSnapshot;
  drainEvents: () => BattleEvent[];
  getResult: () => BattleResult | null;
};

export type BattleContext = {
  content: ContentCatalog;
  setup: BattleSetup;
  state: BattleSnapshot;
  events: BattleEvent[];
  nextEntityId: number;
  rngState: number;
};

export type Loadout = CharacterDefinition['defaultLoadout'];
