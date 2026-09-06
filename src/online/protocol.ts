import { schema, t, type SchemaType } from '@colyseus/schema';
import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

import { emptyCommand, type CombatantCommand } from '../battle-core';
import type { ContentCatalog } from '../content/catalog';

export const BATTLE_ROOM = 'battle';
export const LOBBY_ROOM = 'lobby';
const JoinSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 24, pattern: '^[^\\u0000-\\u001f\\u007f]+$' }),
  characterId: Type.String({ minLength: 1, maxLength: 80 }),
  protocolVersion: Type.Integer(),
  contentHash: Type.String({ pattern: '^[a-f0-9]{64}$' }),
});
const CreateSchema = Type.Intersect([
  JoinSchema,
  Type.Object({
    arenaId: Type.String({ minLength: 1, maxLength: 80 }),
    teamSize: Type.Union([Type.Literal(1), Type.Literal(2), Type.Literal(3)]),
  }),
]);
export type JoinBattleOptions = Static<typeof JoinSchema>;
export type CreateBattleOptions = Static<typeof CreateSchema>;
export function parseJoinOptions(
  value: unknown,
  content: ContentCatalog,
  version: number,
  hash: string,
): JoinBattleOptions {
  if (
    !Value.Check(JoinSchema, value) ||
    !value.name.trim() ||
    !Object.hasOwn(content.characters, value.characterId)
  ) {
    throw new Error('Choose a valid player name and character.');
  }
  if (value.protocolVersion !== version || value.contentHash !== hash) {
    throw new Error('Game version or content differs from this server. Use the same game build.');
  }
  return { ...value, name: value.name.trim() };
}
export function parseCreateOptions(
  value: unknown,
  content: ContentCatalog,
  version: number,
  hash: string,
): CreateBattleOptions {
  parseJoinOptions(value, content, version, hash);
  if (!Value.Check(CreateSchema, value) || !Object.hasOwn(content.arenas, value.arenaId)) {
    throw new Error('Choose a valid battlefield and match size.');
  }
  return value;
}
export const BattleInput = schema(
  {
    moveX: t.int8<-1 | 0 | 1>(),
    jumpPressed: t.boolean(),
    jumpHeld: t.boolean(),
    attackHeld: t.boolean(),
    upHeld: t.boolean(),
    upPressed: t.boolean(),
    downPressed: t.boolean(),
    dropHeld: t.boolean(),
    rightArmPressed: t.boolean(),
    leftArmPressed: t.boolean(),
    headPressed: t.boolean(),
    guardHeld: t.boolean(),
    chargeHeld: t.boolean(),
    specialPressed: t.boolean(),
    strategyPressed: t.boolean(),
  },
  'BattleInput',
);
export type BattleInput = SchemaType<typeof BattleInput>;

/** Copy by field name: schema properties are accessors, not spreadable own fields. */
export function copyCommand(input: CombatantCommand): CombatantCommand {
  const command = emptyCommand();
  command.moveX = input.moveX === -1 || input.moveX === 1 ? input.moveX : 0;
  for (const key of Object.keys(command) as (keyof CombatantCommand)[]) {
    if (key !== 'moveX') {
      command[key] = input[key] === true;
    }
  }
  // Online teammates own their controls; partner orders are a local AI feature.
  command.strategyPressed = false;
  return command;
}
export function heldCommand(input: CombatantCommand): CombatantCommand {
  const command = copyCommand(input);
  for (const key of Object.keys(command) as (keyof CombatantCommand)[]) {
    if (key !== 'moveX' && key.endsWith('Pressed')) {
      command[key] = false;
    }
  }
  return command;
}

export type BattleListing = {
  arenaId: string;
  teamSize: number;
  hostName: string;
  phase: string;
  protocolVersion: number;
  contentHash: string;
};
