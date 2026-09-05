# Editing game content

All nested `game-data/**/*.jsonc` files are discovered by Vite without a manifest. `src/content/load-bundled-content.ts` only discovers raw documents. `buildContentCatalog([{ path, text }])` parses, validates, checks references, converts milliseconds to ticks, and freezes the catalog. That function also runs in Node without Vite.

TypeBox in `src/content/schemas.ts` is the source for content types, runtime validation, and generated editor schemas. `pnpm schemas` writes `game-data/schemas/*.schema.json`. Every document has `$schema`, a globally unique kebab-case `id`, and explicit `kind`. Unknown properties, duplicate IDs, bad loadouts, missing references, invalid numeric ranges, keys, and controller indices are rejected. Errors include the file, property path, expected value, and received value. The app shows validation errors instead of starting a broken match.

| Change                                                                                                     | Where                                                |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Damage, knockback, stagger, attack area                                                                    | `game-data/characters/<character>/abilities/*.jsonc` |
| Armor                                                                                                      | `game-data/characters/<character>/parts/*.jsonc`     |
| Run, jump and dash speed                                                                                   | The character’s `parts/legs.jsonc`                   |
| Startup, active, recovery, projectile lifetime                                                             | Ability files, in milliseconds                       |
| Gravity, acceleration, friction, dash window, broken-leg penalties, guard, meter, head protection, timeout | `game-data/rules/battle-rules.jsonc`                 |
| AI reaction, aggression, guard probability, target weights                                                 | `game-data/ai/*.jsonc`                               |
| Platforms, dimensions, spawns                                                                              | `game-data/arenas/*.jsonc`                           |
| Default roster, loadouts, roles, seed, arena                                                               | `game-data/matches/local-default.jsonc`              |

**Add an ability:** copy an ability JSONC, give it a unique ID, and configure its required values. The three kinds are `projectile`, `melee`, and `special`; a special chooses either existing delivery mechanism. `maxUses: 0` means unlimited. Reference the ID from a part, or from a character’s `specialAbilityId`.

**Add a part:** add a `kind: "part"` JSONC with its slot and armor. Heads/arms need an ability; legs need movement values. Reference it in a character’s default loadout or a `BattleSetup` loadout override. Destroying a part changes runtime armor/availability, never its loaded definition.

**Add a character:** create a directory under `game-data/characters/` with a character JSONC, any new part/ability files, collider dimensions, hit regions, and a loadout. You can reuse existing parts and abilities. It appears automatically in the roster picker. You can also reference the character ID in a match or an externally supplied `BattleSetup`. Existing mechanics require no battle-code changes. A new procedural appearance requires a renderer entry; the four built-ins are ordinary Three.js code, not a procedural-model language.

**Use a GLB:** place an original model in `public/assets/characters/<name>/model.glb` and use this visual definition:

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

Author feet at Y=0, face +Z, and size the body to the JSONC collider (the initial robots’ bodies are about 2.4 world units tall, excluding horns). Give each destructible armor section the configured node name; keep the exposed frame separate. `GLTFLoader` resolves those nodes and controls visibility from snapshots. Missing nodes produce a useful console error and retain the procedural fallback. The loader does not change collision or battle rules. No extracted sprites, ROM data, game audio, or official models are bundled. See [NOTICE](../NOTICE.md) for franchise rights and attribution.

**Character art:** the four procedural models use individually drawn, beveled armor profiles and tapered shells, recessed eyes, hollow barrels, and segmented hands/feet. `src/render/models/armor.ts` contains the geometry helpers; `robot-frame.ts` contains the articulated inner frame; each character file owns its external silhouette. Hip/knee and shoulder poses animate from snapshots, including the exposed inner frame after destruction. Rigid geometry is batched by material while the damage groups and joint pivots remain separate. Toon materials use a nearest-filtered four-band gradient and simple back-face outlines. The orthographic camera gently tightens around active fighters while retaining room for jumps and the HUD.

See [character art research](character-art-research.md) for official visual references and the deliberate differences in the supplied target (including its Arcbeetle/Warbandit naming). Reference photographs are not bundled assets. To inspect the current roster and battle, run `pnpm exec tsx scripts/inspect-characters.ts` with the dev server running; captures go into ignored `.artifacts/`.

**Add an arena:** add an arena JSONC with four spawns and uniquely named horizontal platforms. The industrial renderer builds those platforms from data. Keep jumps reachable: approximate apex is `jumpSpeed² / (2 × gravity)`. The main floor belongs at Y=0. AI navigation intentionally uses straightforward chasing, jumping, and dropping.
