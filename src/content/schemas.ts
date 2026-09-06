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
  'aimUp',
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
      INPUT_ACTIONS.map((a) => [a, Type.Array(item, { minItems: 0, uniqueItems: true })]),
    ) as unknown as Record<(typeof INPUT_ACTIONS)[number], TArray<T>>,
  );

const key = Type.String({
  pattern:
    '^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Enter|Escape|Tab|Backspace|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Numpad([0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter)|Semicolon|Quote|Comma|Period|Slash|Backslash|Bracket(Left|Right)|Minus|Equal|Backquote)$',
});

export const RulesSchema = strictObject({
  ...base,
  kind: Type.Literal('rules'),
  original: strictObject({
    breakWave: Type.Array(integer(-8, 8), { minItems: 22, maxItems: 22 }),
    transformCandidates: strictObject({
      change: Type.Array(integer(0, 29), { minItems: 1 }),
      attackHead: Type.Array(integer(0, 29), { minItems: 1 }),
      attackArm: Type.Array(integer(0, 29), { minItems: 1 }),
    }),
    speedRows: Type.Array(Type.Array(integer(0, 40), { minItems: 9, maxItems: 9 }), {
      minItems: 8,
      maxItems: 8,
    }),
    jumpCurves: Type.Record(
      Type.String(),
      Type.Array(integer(-16, 16), { minItems: 1, maxItems: 128 }),
    ),
    sine: Type.Array(integer(-128, 127), { minItems: 360, maxItems: 360 }),
    battleRandom: Type.Array(integer(0, 255), { minItems: 256, maxItems: 256 }),
    partWeights: Type.Array(Type.Array(integer(0, 100), { minItems: 4, maxItems: 4 }), {
      minItems: 8,
      maxItems: 8,
    }),
    guardPowerDivisor: integer(1, 16),
    readinessMaximum: integer(1, 1000),
    idleChargeTicks: integer(1, 1000),
    passiveChargeTicks: integer(1, 1000),
    chargePulseTicks: integer(1, 1000),
  }),
  tickRate: Type.Literal(60),
  roundTimeMs: integer(100, 600000),
  specialMaximum: Type.Literal(51),
});

export const AbilitySchema = strictObject({
  ...base,
  kind: Type.Literal('ability'),
  original: strictObject({
    actionType: integer(0, 34),
    category: Type.Union([Type.Literal(0), Type.Literal(1), Type.Literal(2), Type.Literal(255)]),
    statusGroup: integer(0, 255),
    family: Type.Union(
      (
        [
          'rifle',
          'gatling',
          'missile',
          'sword',
          'hammer',
          'frame',
          'scouting',
          'charge',
          'beam',
          'support',
          'barrage',
          'vertical-line',
          'laser',
          'break',
          'sacrifice',
          'fire',
          'thunder',
          'freeze',
          'hold',
          'wave',
          'destroy',
          'defense',
          'full-defense',
          'recovery',
          'regeneration',
          'revive',
          'cleanse',
          'meter-control',
          'confusion',
          'ineffective',
          'indefensible',
          'melee-trap',
          'shot-trap',
          'change',
          'attack-change',
          'void-explode',
          'void-optic',
          'void-gravity',
          'all-recovery',
          'question',
          'double-trap',
          'giga-break',
          'plus-counter',
          'demolition',
          'power-drain',
          'meltian',
          'random-change',
        ] as const
      ).map((value) => Type.Literal(value)),
    ),
    refill: integer(0, 320),
    readinessReset: integer(0, 320),
    actionTicks: integer(1, 1000),
    contactTick: integer(0, 1000),
    shotTick: integer(0, 1000),
    comboStages: Type.Array(
      strictObject({
        actionTicks: integer(1, 1000),
        contactTick: integer(0, 1000),
        shotTick: integer(0, 1000),
      }),
      {
        maxItems: 2,
        description: 'Additional right-arm stages, entered only after another B press.',
      },
    ),
    rangePixels: integer(1, 1000),
    speedPixels: integer(0, 32),
    movementAllowed: Type.Boolean(),
    verified: Type.Boolean(),
  }),
  displayName: Type.String(),
  abilityKind: Type.Union([
    Type.Literal('projectile'),
    Type.Literal('melee'),
    Type.Literal('special'),
  ]),
  delivery: Type.Union([Type.Literal('projectile'), Type.Literal('melee')]),
  damage: boundedNumber(0, 1000),
  hitbox: RegionSchema,
  specialCost: boundedNumber(),
  maxUses: integer(),
  color: Type.String({ pattern: '^#[0-9a-fA-F]{6}$' }),
});

export const PartSchema = strictObject({
  ...base,
  kind: Type.Literal('part'),
  originalId: integer(0, 31),
  selectionRank: integer(0, 255),
  displayName: Type.String(),
  defense: integer(0, 255),
  locomotion: integer(0, 7),
  speedIndex: integer(0, 7),
  attackRanks: Type.Array(integer(0, 5), { minItems: 3, maxItems: 3 }),
  defenseRank: integer(0, 5),
  slot: Type.Union(PART_SLOTS.map((s) => Type.Literal(s))),
  armor: boundedNumber(0, 10000),
  abilityId: Type.Optional(id),
});

const visual = Type.Union([
  strictObject({
    type: Type.Literal('sprite'),
    url: Type.String({ pattern: '^/assets/.+\\.png$' }),
    frames: Type.Array(
      strictObject({
        x: integer(0, 8192),
        y: integer(0, 8192),
        width: integer(1, 8192),
        height: integer(1, 8192),
      }),
      { minItems: 4, maxItems: 4 },
    ),
    frameSize: integer(1, 8192),
    color: Type.String(),
    accent: Type.String(),
  }),
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

export const MedalSchema = strictObject({
  ...base,
  kind: Type.Literal('medal'),
  originalId: integer(0, 11),
  displayName: Type.String(),
  preference: integer(0, 7),
  preferredParts: Type.Array(Type.Union(PART_SLOTS.map((slot) => Type.Literal(slot))), {
    uniqueItems: true,
  }),
  levels: Type.Array(
    strictObject({
      shooting: integer(0, 255),
      grappling: integer(0, 255),
      support: integer(0, 255),
      defense: integer(0, 255),
    }),
    { minItems: 99, maxItems: 99 },
  ),
});

export const CharacterSchema = strictObject({
  ...base,
  kind: Type.Literal('character'),
  medalId: id,
  medalLevel: integer(1, 99),
  originalSetId: integer(0, 29),
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
  verticalAxisIndex: integer(0, 15),
  deadzone: boundedNumber(0, 0.9),
  activationThreshold: boundedNumber(0.1, 1),
  bindings: actionBindings(integer(0, 31)),
});

export const AISchema = strictObject({
  ...base,
  kind: Type.Literal('ai'),
  variant: integer(0, 5),
  original: strictObject({
    profiles: Type.Array(
      Type.Array(Type.Array(integer(0, 255), { minItems: 7, maxItems: 7 }), {
        minItems: 6,
        maxItems: 6,
      }),
      { minItems: 15, maxItems: 15 },
    ),
    cooldowns: Type.Array(
      Type.Array(Type.Array(integer(0, 1000), { minItems: 4, maxItems: 4 }), {
        minItems: 6,
        maxItems: 6,
      }),
      { minItems: 15, maxItems: 15 },
    ),
  }),
});

export const ArenaSchema = strictObject({
  ...base,
  kind: Type.Literal('arena'),
  original: strictObject({
    fieldId: integer(0, 18),
    tiles: Type.Array(Type.Array(integer(0, 255), { minItems: 54, maxItems: 54 }), {
      minItems: 46,
      maxItems: 46,
    }),
    movingPlatforms: Type.Array(
      strictObject({
        id,
        x: integer(-128, 512),
        y: integer(0, 368),
        direction: integer(1, 4),
        minimum: integer(-128, 512),
        maximum: integer(-128, 512),
        width: integer(1, 128),
        endpointWaitTicks: integer(0, 255),
      }),
      { maxItems: 3 },
    ),
    waterY: Type.Union([integer(0, 368), Type.Null()]),
    theme: Type.Union(
      (['ruins', 'forest', 'industrial', 'ice', 'aquatic', 'volcanic'] as const).map((value) =>
        Type.Literal(value),
      ),
    ),
  }),
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
  medal: MedalSchema,
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
  | MedalDefinition
  | AbilityDefinition
  | PartDefinition
  | CharacterDefinition
  | KeyboardDefinition
  | GamepadDefinition
  | AIDefinition
  | ArenaDefinition
  | MatchDefinition;

export type Region = Static<typeof RegionSchema>;

export type MedalDefinition = Static<typeof MedalSchema>;
