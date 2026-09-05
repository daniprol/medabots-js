import type { ContentCatalog } from '../content/build-content-catalog';
import type { MatchDefinition, PartSlot, CharacterDefinition } from '../content/schemas';
export type BattleSetup = Pick<MatchDefinition, 'seed' | 'arenaId' | 'rulesId' | 'teams'>;
export type CombatantCommand = {
  moveX: -1 | 0 | 1;
  jumpPressed: boolean;
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
  dropHeld: false,
  rightArmPressed: false,
  leftArmPressed: false,
  headPressed: false,
  guardHeld: false,
  chargeHeld: false,
  specialPressed: false,
  strategyPressed: false,
});
export type CommandFrame = { tick: number; commands: Record<string, CombatantCommand> };
export type Strategy = 'ATTACK_LEADER' | 'PROTECT_LEADER' | 'AGGRESSIVE';
export type PartState = {
  definitionId: string;
  currentArmor: number;
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
};
export type ProjectileSnapshot = {
  id: string;
  ownerId: string;
  teamId: string;
  abilityId: string;
  x: number;
  y: number;
  vx: number;
  remainingTicks: number;
  facing: -1 | 1;
};
export type BattleResult = {
  winnerTeamId: string | null;
  reason: 'leader-head-destroyed' | 'timeout' | 'draw';
  elapsedTicks: number;
  finalCombatants: CombatantSnapshot[];
};
export type BattleSnapshot = {
  tick: number;
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
