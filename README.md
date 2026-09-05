# Medabots AX — Robattle Arena

A playable, original 3D fan prototype: four procedural cartoon robots, real-time 2-vs-2 combat, separate part armor, shared keyboards, browser gamepads, and AI partners. Break **both arms and legs**, then destroy the enemy **leader’s head** to win. Helmet hits are absorbed by a surviving limb until all three are broken; excess damage never spills into the head. A partner can be knocked out independently. Part armor is four times the initial prototype values, and head ammunition is increased to 48 uses for longer rounds. A round lasts 180 seconds; timeout compares each team’s remaining armor divided by its starting armor.

## Run it

Requires Node.js 20.19+ (or 22.12+) and pnpm 10.

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Choose a team slot and pick its Medabot. The live preview shows armor, movement, attack power, jump speed, and its special. **Start Robattle** uses your chosen roster and controllers; the default is Metabee on arrows + F/G with three AI combatants. Pause, rematch, and return to setup are implemented. Sound effects are synthesized locally; the sound button toggles them. All fonts are bundled, and no external assets are fetched during normal play.

```sh
pnpm typecheck  # Strict TypeScript, including tests
pnpm test       # Pure configuration, input, gameplay, session and headless match tests
pnpm build      # Generate JSON Schema and build dist/
pnpm check      # Type checking + tests + production build
pnpm exec playwright install chromium
pnpm test:e2e   # Separate Chromium smoke suite, with traces on failure
```

Serve `dist/` with any static web server. Vite’s development debug interface is absent from production. No backend, networking, account, inventory, or persistence is included.

## Playing together

Open **Controls** to assign a keyboard profile, connected gamepad, or CPU independently to A1, A2, B1, and B2. **2 on one keyboard** assigns opposing leaders to the two shared presets. The controls dialog also offers a three-player preset (requires a numpad) and automatic gamepad assignment. Choose any team slot for co-op instead. Leaders are marked ◆. Slots without an assignment in the mounting API become AI. Duplicate keyboard profiles and gamepads are blocked; overlapping keys between active profiles are reported and must be resolved before starting. Up to four humans can play, including three keyboards plus a gamepad, or four gamepads. New keyboard profiles appear automatically after adding a JSONC file.

Connect USB/Bluetooth controllers, focus the browser, and **press a controller button** so the browser exposes them. The setup screen updates automatically. An assigned controller disconnect pauses the match and names the missing device. Reconnect it and resume, or return to setup to choose another controller. Browser-assigned indices can change after reconnection. Use localhost or HTTPS for reliable Gamepad API access.

Shared keyboard hardware may suppress certain simultaneous combinations (“ghosting”). This is a physical keyboard limit, not an input-profile conflict; use different combinations, an anti-ghosting keyboard, or gamepads if necessary. The keyboard adapter uses physical `KeyboardEvent.code`, independent of keyboard language, and supports multiple keys per action.

| Action                         | Solo (default)  | Shared: left | Shared: right | Shared: numpad |
| ------------------------------ | --------------- | ------------ | ------------- | -------------- |
| Move left / right              | ← / →           | A / D        | ← / →         | Num 4 / 6      |
| Jump                           | ↑ or Space      | W            | ↑             | Num 8          |
| Drop through platform          | ↓               | S            | ↓             | Num 5          |
| Right arm                      | F               | F            | J             | Num 1          |
| Left arm                       | G               | G            | K             | Num 2          |
| Head weapon                    | H               | H            | L             | Num 3          |
| Guard (hold)                   | Left Shift      | Left Shift   | Right Shift   | Num 0          |
| Charge (hold on ground)        | R               | Q            | U             | Num 7          |
| Special (release charge first) | T               | E            | O             | Num 9          |
| Cycle AI partner strategy      | Q               | R            | P             | Num +          |
| Pause / resume                 | Escape or Enter | Escape       | Enter         | Num Enter      |

Double-tap a direction to **dash**. Grounded bodies separate; jump or dash to cross another robot. Tap attacks; each weapon has startup and recovery. Right-arm attacks strike arm height, left-arm attacks strike low, and head weapons aim at helmets. Jumping changes which part a shot can hit. Head weapons have limited uses; arms are unlimited until destroyed. The HUD marks the head as **protected** while any limb remains, then **exposed**. Helmet hits damage the right arm, then left arm, then legs; direct limb hits still damage their own region. Broken legs reduce speed, jumping and dashing. Guard reduces damage and knockback. Charge on the ground to fill Medaforce, then release charge and activate your special. Hitting and taking damage also add meter.

A human leader’s strategy button cycles **Attack leader → Protect leader → Aggressive** for its AI partner. It has no effect on a human partner.

Standard controller mapping uses left stick / D-pad to move, south face button (A / Cross) to jump, west (X / Square) for right arm, north (Y / Triangle) for left arm, east (B / Circle) for head, LB to guard, LT to charge, RB for special, Back/View for strategy, Start/Menu to pause, and D-pad down to drop. Mapping indices are zero-based in JSONC; the HUD labels physical pads starting at 1.

Edit `game-data/controls/keyboards/*.jsonc` to change keyboard bindings. Each action takes an array, such as `"jump": ["KeyW", "Space"]`. Edit `game-data/controls/gamepads/standard-gamepad.jsonc` for button arrays, horizontal stick axis, deadzone, and activation threshold. **Controls → Keyboard** lets you click any binding and press a replacement key, or use **+** for an alternative. Escape cancels capture. **Gamepad** exposes button indices, axis, deadzone, and activation threshold, with a live input tester. **Reset** restores the selected preset; **Apply controls** accepts validated edits and **Cancel** discards them. Menu edits last for this page session, including rematches and return to setup; reload restores JSONC defaults. Edit the JSONC files for permanent changes. The setup/HUD read the same definitions.

## Edit content

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

Author feet at Y=0, face +Z, and size the body to the JSONC collider (the initial robots’ bodies are about 2.4 world units tall, excluding horns). Give each destructible armor section the configured node name; keep the exposed frame separate. `GLTFLoader` resolves those nodes and controls visibility from snapshots. Missing nodes produce a useful console error and retain the procedural fallback. The loader does not change collision or battle rules. No proprietary sprites, ROM data, audio, or models are included; `graphics_reference.png` is only the supplied design reference.

**Character art:** the four procedural models use individually drawn, beveled armor profiles and tapered shells, recessed eyes, hollow barrels, and segmented hands/feet. `src/render/models/armor.ts` contains the small geometry helpers and bare joint frame; each character file owns its external silhouette. Hip/knee and shoulder poses animate from snapshots, including the exposed inner frame after destruction. Rigid geometry is batched by material while the damage groups and joint pivots remain separate. Toon materials use a nearest-filtered four-band gradient and simple back-face outlines. The orthographic camera gently tightens around active fighters while retaining room for jumps and the HUD.

See [character art research](docs/character-art-research.md) for licensed visual references and the deliberate differences in the supplied target (including its Arcbeetle/Warbandit naming). Reference photographs are not bundled assets. To inspect the current roster and battle, run `pnpm exec tsx scripts/inspect-characters.ts` with the dev server running; captures go into ignored `.artifacts/`.

**Add an arena:** add an arena JSONC with four spawns and uniquely named horizontal platforms. The industrial renderer builds those platforms from data. Keep jumps reachable: approximate apex is `jumpSpeed² / (2 × gravity)`. The main floor belongs at Y=0. AI navigation intentionally uses straightforward chasing, jumping, and dropping.

## How the game is organized

```text
Keyboard / gamepad ─┐
                   ├─ flat CombatantCommand ─ CommandFrame ─ battle-core
Seeded AI ─────────┘                                            │
                                                  detached snapshot + events
                                                               │
                                                        Three.js + HTML HUD
```

`src/battle-core/` is ordinary deterministic TypeScript: no DOM, physical inputs, Three.js, Vite, timers, file access, or networking. `createBattle({ setup, content })` returns `step(frame)`, `getSnapshot()`, `drainEvents()`, and `getResult()`. Frames must contain one complete command per combatant and the next consecutive tick. Simulation runs at **60 fixed ticks per second** with stable entity ordering. Cooldowns, dash taps, attacks and statuses use ticks. The session clamps long real frame deltas to 100ms and uses an accumulator; rendering uses `requestAnimationFrame` separately.

Definitions are frozen shared content. Runtime state owns positions, velocities, armor, uses, cooldowns, attacks, projectiles, strategies, and meters. Snapshots are detached plain objects, including stable combatant/projectile IDs and the current result; JSON stringify/parse preserves render state. Events describe transient hits, attacks, debris and results. Missing an old event cannot permanently hide an intact part or resurrect a destroyed one.

The seeded 32-bit random generator drives deterministic AI choices; core combat itself requires no random rolls. Identical validated content, setup, seed, and command frames reproduce the same outcome. Tests run whole matches without browser globals and report seed, tick, recent frames and snapshot on scenario execution failures.

`LocalBattleSession` combines human and AI commands, enforces local strategy eligibility, advances the core, and handles pause/focus/controller lifecycle. Presentation receives snapshots/events, interpolates supplied snapshot pairs using a caller-provided interpolation fraction (not a hardcoded tick gap), and never calculates damage or winners. Camera shake, impact freeze, particles and final-hit slow presentation do not modify the simulation. Static arena meshes are batched by material; outlines use enlarged back faces, and inexpensive contact shadows keep software-rendered browsers usable. Temporary effects are capped at 160 objects.

## Integrating the battle feature later

```ts
import { mountLocalBattle } from './src/battle-session/mount-local-battle';

const mounted = mountLocalBattle({
  root,
  setup, // Serializable teams, characters, optional loadouts, arena, rules, seed
  assignments, // Local keyboard / pad / AI assignments, separate from setup
  content,
  onComplete(result) {
    // The future game handles story, rewards and progression here.
  },
  onRematch() {
    /* Owner mounts a fresh battle, disposing the old one. */
  },
  onReturnToSetup() {
    /* Owner displays its setup screen. */
  },
});

mounted.dispose(); // Removes listeners, animation loop, UI and WebGL resources.
```

`main.ts` is a small example owner of setup, rematch and return. Completion is reported once per mount. The battle feature knows nothing about missions, save games, rewards, accounts, or inventory.

A future Colyseus `BattleRoom` can load the same JSONC from disk, call `buildContentCatalog`, and own this exact core. The room will map authenticated connections to combatants, buffer each player’s flat command, add AI commands, build the authoritative frame, and step the simulation using Colyseus’s supported fixed-timestep/input facilities. Clients will send only their own normalized input, never authoritative ticks, identity, positions, damage or results. No networking is implemented here.

Keep a thin adapter from plain snapshots to future `@colyseus/schema` state for persistent information, and room messages for transient events. A later online session can surface those snapshots/events to the existing renderer and HUD. TypeBox validates authored content; Colyseus schemas synchronize network state. These are separate boundaries and must remain separate. Prediction, reconciliation, rollback and custom acknowledgement systems are deliberately outside this prototype.

In development/tests only, `window.__BATTLE_DEBUG__` exposes `getSnapshot`, `restart`, `returnToSetup`, `pause`, and `resume`. `restart` optionally accepts assignments, a setup, or a short `roundTimeMs` for deterministic lifecycle smoke tests. It creates a fresh session and does not expose mutable core internals.

## Verification notes

The suite covers real-content headless matches, independent damage, arm/leg destruction, leader/partner knockout, attack timing, guard, specials, movement/platforms/dash, deterministic AI, serialization, content failures, simultaneous keyboard input, gamepad mapping and lifecycle, focus loss, results, and rematch. Chromium smoke tests use actual keyboard events and accessible UI selectors. `scripts/inspect-browser.ts` captures development screenshots into ignored `.artifacts/` for visual inspection.

Physical gamepads were not connected in the development environment. Two-pad and mixed-controller logic is exercised with unit-level Gamepad API fixtures; USB/Bluetooth controller behavior, index reassignment, and hardware keyboard ghosting still need verification on the target hardware.
