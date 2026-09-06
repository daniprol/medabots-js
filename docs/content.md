# Editing game content

Vite discovers nested `game-data/**/*.jsonc` files automatically. `loadBundledContent()` only discovers documents; pure `buildContentCatalog([{ path, text }])` parses, validates, resolves references, and freezes definitions. The same catalog builder runs in Node without Vite.

TypeBox in `src/content/schemas.ts` is the source for TypeScript content types, runtime validation, and generated editor schemas. Run `pnpm schemas` after schema changes. Every document has `$schema`, a globally unique kebab-case `id`, and a `kind`. Errors report file path, property path, expected value, and received value. Unknown properties, invalid values, missing references, duplicate IDs and invalid loadouts are rejected.

| Change                                     | File / property                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Base attack power                          | Character `abilities/*.jsonc`, `damage` (before medal/leg scaling and defense)                       |
| Armor / defense                            | Character `parts/*.jsonc`, `armor` / `defense`                                                       |
| Movement                                   | Leg `speedIndex`, `locomotion`; rule `original.speedRows` and `jumpCurves`                           |
| Weapon timing / refill                     | Ability `original.actionTicks`, `contactTick`, `shotTick`, `comboStages`, `refill`, `readinessReset` |
| Medal stats                                | `game-data/medals/*.jsonc`, level-indexed shooting/grappling/support/defense                         |
| Guard / automatic meter / random table     | `rules/battle-rules.jsonc`                                                                           |
| AI reaction / aggression / preferences     | `ai/*.jsonc`                                                                                         |
| Field collision / water / moving platforms | Arena `original.tiles`, `waterY`, `movingPlatforms`                                                  |
| Rendered platform runs / spawn positions   | Arena `platforms`, `spawns`                                                                          |
| Default teams / seed / field               | `matches/local-default.jsonc`                                                                        |
| Input                                      | `controls/**/*.jsonc`                                                                                |

Original movement uses pixel tables and discrete states, not gravity/acceleration tuning. World units are eight original pixels: `worldX=(pixelX-216)/8`, `worldY=(367-bottomY)/8`. Most actor positions use world coordinates; dynamic platform records explicitly use original pixels. Movement tables use quarter-pixels. Attack timing uses integer updates directly; AI reaction and round duration use milliseconds converted to nominal 60-update counts. The local session uses the actual GBA frame cadence.

Leg `attackRanks` are ordered **shooting, grappling, support**; defense has a separate rank. Normal attack damage includes medal stats and leg ranks; specials omit leg ranks. See the [source evidence](ax-roster-evidence.md) and [implementation status](ax-remaster-status.md) before interpreting a value as fully verified gameplay.

## Add definitions

**Ability:** copy a supported ability, assign a unique ID, and configure required values. `abilityKind` remains projectile, melee, or special; `original.family` selects an implemented AX behavior. A new ID using existing behavior needs no battle-code change. A new mechanic does require code and tests. A source action-type number alone does not implement that handler. `verified` records timing provenance, not whole-handler parity. Reference normal abilities from parts and specials from characters. `comboStages` is an empty array for non-combo weapons; otherwise it contains the second and third right-arm stage timings. A new button press must buffer each follow-up.

**Part:** add its slot, armor, defense, original numeric ID, leg metadata and optional normal ability. Heads/arms require an ability. Legs do not. Reference it from a character loadout or an external `BattleSetup` override. Parts and characters are composition, not subclasses.

**Character:** add `characters/<id>/character.jsonc`, any new parts/abilities, medal reference/level, collider metadata, default loadout and visual. It appears in the roster automatically. Reuse existing mechanics without changing battle rules. Only four complete art/loadout entries are currently included; unsupported original sets are not populated with guessed values.

**Sprite art:** place an atlas under `public/assets/characters/`. A `sprite` visual supplies its URL, four pixel rectangles (`frames`: idle, run, jump, attack), a common `frameSize`, color and accent. Rectangles need not form a regular grid. Leave transparent padding and use consistent scale. The renderer subdivides each pose into armor regions; more elaborate independently animated armor will need authored art improvements. Portraits use the same atlas.

**GLB:** the optional model path remains available without changing simulation:

```jsonc
"visual": {
  "type": "gltf",
  "url": "/assets/characters/new-character/model.glb",
  "nodes": {
    "head": "Head",
    "leftArm": "LeftArm",
    "rightArm": "RightArm",
    "legs": "Legs",
    "innerFrame": "InnerFrame"
  }
}
```

Author feet at Y=0, face +Z, and size the body to its collider. Each configured armor node is hidden when destroyed. The loader reports missing nodes and retains a procedural fallback. The four older procedural renderers remain optional; initial characters use sprite artwork. Neither geometry nor alpha pixels determine collision or damage.

**Arena:** add 46×54 numeric surface tiles, four spawns in A1/B1/A2/B2 order, visible platform runs, water level or null, zero to three moving-platform records, and a field theme. Static geometry is one-way surface traversal, not solid wall boxes. The renderer follows tile slope profiles and snapshot platform positions. The current AI uses simple navigation; test reachability in an actual match.

Read [Architecture](architecture.md) for the mounting boundary and future server integration, and [art provenance](hd2d-art.md) for asset sources. No ROM or extracted original artwork is bundled.
