import {
  type RulesDefinition,
  type AbilityDefinition,
  type PartDefinition,
  type CharacterDefinition,
  type KeyboardDefinition,
  type GamepadDefinition,
  type AIDefinition,
  type ArenaDefinition,
  type MatchDefinition,
} from './schemas';

export type RuntimeAbility = AbilityDefinition & {
  startupTicks: number;
  activeTicks: number;
  recoveryTicks: number;
  staggerTicks: number;
  projectileLifetimeTicks: number;
};

export type RuntimeRules = RulesDefinition & {
  roundTicks: number;
  doubleTapTicks: number;
  dashDurationTicks: number;
  dashCooldownTicks: number;
  dropThroughTicks: number;
};

export type RuntimeAI = AIDefinition & { reactionTicks: number };

export type ContentCatalog = {
  rules: Record<string, RuntimeRules>;
  abilities: Record<string, RuntimeAbility>;
  parts: Record<string, PartDefinition>;
  characters: Record<string, CharacterDefinition>;
  keyboards: Record<string, KeyboardDefinition>;
  gamepads: Record<string, GamepadDefinition>;
  ai: Record<string, RuntimeAI>;
  arenas: Record<string, ArenaDefinition>;
  matches: Record<string, MatchDefinition>;
};

export type RawDocument = { path: string; text: string };
