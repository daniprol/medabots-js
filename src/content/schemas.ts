import { Type, type Static, type TSchema, type TArray } from '@sinclair/typebox';

const boundedNumber = (min = 0, max = 10000) => Type.Number({ minimum: min, maximum: max });

const integer = (min = 0, max = 10000) => Type.Integer({ minimum: min, maximum: max });

const id = Type.String({ pattern: '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' });

const descriptions: Record<string, string> = {
  id: 'Globally unique, stable kebab-case content identifier.',
  armor: 'Starting armor points. Zero remaining head armor knocks the combatant out.',
  damage: 'Armor points removed before guard reduction; damage applies to one overlapping part.',
  startupMs: 'Delay before the attack becomes active, in milliseconds; rounded up to 60Hz ticks.',
  activeMs: 'Duration during which a melee attack can hit. A projectile spawns once at the start.',
  recoveryMs: 'Delay after the active period before another attack can start.',
  maxUses: 'Uses per battle. Zero means unlimited.',
  speed: 'Maximum running speed in world units per second.',
  jumpSpeed: 'Initial upward jump velocity in world units per second.',
  dashSpeed: 'Horizontal dash speed in world units per second.',
  projectileSpeed: 'Horizontal projectile velocity in world units per second.',
  knockbackX: 'Horizontal impact velocity, multiplied by attacker facing.',
  knockbackY: 'Upward impact velocity in world units per second.',
  hitbox: 'Local center, width and height in world units; X mirrors with facing.',
  hitRegions: 'Independent local armor rectangles. Feet are at Y=0.',
  specialCost: 'Meter spent on activation. Normal abilities normally use zero.',
  bindings: 'Every action is required. Multiple physical inputs may trigger one action.',
  axisIndex: 'Zero-based browser Gamepad.axes index for horizontal movement.',
  deadzone: 'Ignore stick drift below this absolute value.',
  activationThreshold: 'Absolute axis value which becomes digital movement. Must exceed deadzone.',
  reactionMs: 'Time between deterministic AI decisions, rounded up to simulation ticks.',
  guardDamageMultiplier: 'Fraction of incoming damage retained while guarding (0–1).',
  guardKnockbackMultiplier: 'Fraction of knockback retained while guarding (0–1).',
};

const strictObject = <T extends Record<string, TSchema>>(properties: T) => {
  for (const [name, schema] of Object.entries(properties)) {
    const description =
      descriptions[name] ??
      (name.endsWith('Ms')
        ? 'Duration in milliseconds, rounded up to integer 60Hz simulation ticks.'
        : undefined);

    if (description) {
      schema.description ??= description;
    }
  }

  return Type.Object(properties, { additionalProperties: false });
};

const base = { $schema: Type.Optional(Type.String()), id };

export const PART_SLOTS = ['head', 'leftArm', 'rightArm', 'legs'] as const;

export const INPUT_ACTIONS = [
  'moveLeft',
  'moveRight',
  'jump',
  'dropThroughPlatform',
  'rightArm',
  'leftArm',
  'head',
  'guard',
  'chargeSpecial',
  'activateSpecial',
  'partnerStrategy',
  'pause',
] as const;

export const RegionSchema = strictObject({
  x: boundedNumber(-10, 10),
  y: boundedNumber(-10, 10),
  width: boundedNumber(0.01, 10),
  height: boundedNumber(0.01, 10),
});

const loadout = strictObject({ head: id, leftArm: id, rightArm: id, legs: id });

const actionBindings = <T extends TSchema>(item: T) =>
  strictObject(
    Object.fromEntries(
      INPUT_ACTIONS.map((a) => [a, Type.Array(item, { minItems: 1, uniqueItems: true })]),
    ) as unknown as Record<(typeof INPUT_ACTIONS)[number], TArray<T>>,
  );

const key = Type.String({
  pattern:
    '^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Enter|Escape|Tab|Backspace|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Numpad([0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter)|Semicolon|Quote|Comma|Period|Slash|Backslash|Bracket(Left|Right)|Minus|Equal|Backquote)$',
});

export const RulesSchema = strictObject({
  ...base,
  kind: Type.Literal('rules'),
  tickRate: Type.Literal(60),
  protectHeadUntilPartsDestroyed: Type.Boolean({
    description:
      'Helmet hits are absorbed by surviving limbs until both arms and legs are destroyed. Excess damage never carries into the head.',
  }),
  roundTimeMs: integer(100, 600000),
  gravity: boundedNumber(1, 100),
  acceleration: boundedNumber(1, 200),
  friction: boundedNumber(1, 200),
  doubleTapMs: integer(1, 1000),
  dashDurationMs: integer(1, 1000),
  dashCooldownMs: integer(1, 5000),
  dropThroughMs: integer(1, 2000),
  guardDamageMultiplier: boundedNumber(0, 1),
  guardKnockbackMultiplier: boundedNumber(0, 1),
  brokenLegSpeedMultiplier: boundedNumber(0, 1),
  brokenLegJumpMultiplier: boundedNumber(0, 1),
  brokenLegDashMultiplier: boundedNumber(0, 1),
  specialMaximum: boundedNumber(1, 1000),
  chargePerSecond: boundedNumber(0.1, 1000),
  meterPerDamageDealt: boundedNumber(0, 10),
  meterPerDamageReceived: boundedNumber(0, 10),
});

export const AbilitySchema = strictObject({
  ...base,
  kind: Type.Literal('ability'),
  displayName: Type.String(),
  abilityKind: Type.Union([
    Type.Literal('projectile'),
    Type.Literal('melee'),
    Type.Literal('special'),
  ]),
  delivery: Type.Union([Type.Literal('projectile'), Type.Literal('melee')]),
  startupMs: integer(),
  activeMs: integer(1),
  recoveryMs: integer(1),
  damage: boundedNumber(1, 1000),
  staggerMs: integer(),
  knockbackX: boundedNumber(),
  knockbackY: boundedNumber(),
  projectileSpeed: boundedNumber(0.1, 100),
  projectileLifetimeMs: integer(1),
  hitbox: RegionSchema,
  specialCost: boundedNumber(),
  maxUses: integer(),
  color: Type.String({ pattern: '^#[0-9a-fA-F]{6}$' }),
});

export const PartSchema = strictObject({
  ...base,
  kind: Type.Literal('part'),
  slot: Type.Union(PART_SLOTS.map((s) => Type.Literal(s))),
  armor: boundedNumber(1, 10000),
  abilityId: Type.Optional(id),
  movement: Type.Optional(
    strictObject({
      speed: boundedNumber(0.1, 50),
      jumpSpeed: boundedNumber(0.1, 50),
      dashSpeed: boundedNumber(0.1, 80),
    }),
  ),
});

const visual = Type.Union([
  strictObject({
    type: Type.Literal('procedural'),
    model: Type.Union(
      (['metabee', 'rokusho', 'arcbeetle', 'warbandit'] as const).map((v) => Type.Literal(v)),
    ),
    color: Type.String(),
    accent: Type.String(),
  }),
  strictObject({
    type: Type.Literal('gltf'),
    url: Type.String({ pattern: '^/assets/.+.glb$' }),
    nodes: strictObject({
      head: Type.String(),
      leftArm: Type.String(),
      rightArm: Type.String(),
      legs: Type.String(),
      innerFrame: Type.String(),
    }),
  }),
]);

export const CharacterSchema = strictObject({
  ...base,
  kind: Type.Literal('character'),
  displayName: Type.String(),
  tagline: Type.String(),
  visual,
  collider: strictObject({ width: boundedNumber(0.1, 5), height: boundedNumber(0.1, 8) }),
  hitRegions: strictObject({
    head: RegionSchema,
    leftArm: RegionSchema,
    rightArm: RegionSchema,
    legs: RegionSchema,
  }),
  defaultLoadout: loadout,
  specialAbilityId: id,
});

export const KeyboardSchema = strictObject({
  ...base,
  kind: Type.Literal('keyboard'),
  displayName: Type.String(),
  bindings: actionBindings(key),
});

export const GamepadSchema = strictObject({
  ...base,
  kind: Type.Literal('gamepad'),
  displayName: Type.String(),
  axisIndex: integer(0, 15),
  deadzone: boundedNumber(0, 0.9),
  activationThreshold: boundedNumber(0.1, 1),
  bindings: actionBindings(integer(0, 31)),
});

export const AISchema = strictObject({
  ...base,
  kind: Type.Literal('ai'),
  reactionMs: integer(1, 3000),
  preferredDistance: boundedNumber(0, 30),
  aggression: boundedNumber(0, 1),
  guardProbability: boundedNumber(0, 1),
  jumpThreshold: boundedNumber(0, 10),
  strategyWeights: strictObject({
    leader: boundedNumber(0, 10),
    proximity: boundedNumber(0, 10),
    weakness: boundedNumber(0, 10),
  }),
});

export const ArenaSchema = strictObject({
  ...base,
  kind: Type.Literal('arena'),
  displayName: Type.String(),
  subtitle: Type.String(),
  width: boundedNumber(10, 100),
  height: boundedNumber(8, 50),
  platforms: Type.Array(
    strictObject({
      id,
      x: boundedNumber(-100, 100),
      y: boundedNumber(0, 50),
      width: boundedNumber(1, 100),
    }),
    {
      minItems: 1,
    },
  ),
  spawns: Type.Array(strictObject({ x: boundedNumber(-100, 100), y: boundedNumber(0, 50) }), {
    minItems: 4,
    maxItems: 4,
  }),
});

export const MatchSchema = strictObject({
  ...base,
  kind: Type.Literal('match'),
  seed: integer(0, 4294967295),
  arenaId: id,
  rulesId: id,
  teams: Type.Array(
    strictObject({
      id,
      combatants: Type.Array(
        strictObject({
          instanceId: Type.String({ pattern: '^[AB][12]$' }),
          characterId: id,
          role: Type.Union([Type.Literal('leader'), Type.Literal('partner')]),
          loadout: Type.Optional(loadout),
        }),
        { minItems: 2, maxItems: 2 },
      ),
    }),
    { minItems: 2, maxItems: 2 },
  ),
});

export const schemas = {
  rules: RulesSchema,
  ability: AbilitySchema,
  part: PartSchema,
  character: CharacterSchema,
  keyboard: KeyboardSchema,
  gamepad: GamepadSchema,
  ai: AISchema,
  arena: ArenaSchema,
  match: MatchSchema,
};

export type RulesDefinition = Static<typeof RulesSchema>;

export type AbilityDefinition = Static<typeof AbilitySchema>;

export type PartDefinition = Static<typeof PartSchema>;

export type CharacterDefinition = Static<typeof CharacterSchema>;

export type KeyboardDefinition = Static<typeof KeyboardSchema>;

export type GamepadDefinition = Static<typeof GamepadSchema>;

export type AIDefinition = Static<typeof AISchema>;

export type ArenaDefinition = Static<typeof ArenaSchema>;

export type MatchDefinition = Static<typeof MatchSchema>;

export type PartSlot = (typeof PART_SLOTS)[number];

export type InputAction = (typeof INPUT_ACTIONS)[number];

export type Definition =
  | RulesDefinition
  | AbilityDefinition
  | PartDefinition
  | CharacterDefinition
  | KeyboardDefinition
  | GamepadDefinition
  | AIDefinition
  | ArenaDefinition
  | MatchDefinition;

export type Region = Static<typeof RegionSchema>;
