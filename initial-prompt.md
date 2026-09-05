THIS IS THE INITIAL PROMPT USED FOR STARTING THE PROJECT. USE AS DESIRED IN CASE SOME REFERENCE IS NEEDED OR TO VERIFY THAT EVERYTHING HAS BEEN CORRECTLY IMPLEMENTED:

Build a complete, polished, playable browser game prototype in the current workspace.

Do not stop at a plan or code snippets. Create the project, install dependencies, implement all required files, run it, test it, inspect it in the browser when tools are available, fix errors, and iterate until it is genuinely playable.

Proceed autonomously and make sensible routine decisions. Ask only when missing information would materially change the result.

Use the attached image as the primary visual reference.

# Goal

Create a modern 2.5D version of the Medabots AX battle experience:

- Real-time 2-vs-2 platform battles.
- Modern Three.js graphics preserving the original cartoon appearance.
- Independently damageable head, arms, and legs.
- Recognizable Metabee, Rokusho, Arcbeetle, and Warbandit designs.
- One to four local human players.
- Multiple players may share one keyboard using configurable key profiles.
- Multiple browser gamepads must be supported.
- Any unassigned combatants are controlled by AI.
- Important gameplay and input values live in readable, validated JSONC files.
- New characters, parts, abilities, and arenas can later be added through new files/directories and assets without changing existing battle logic when using existing mechanics.
- The battle feature can later be reused by a complete game.
- The same battle simulation can later run authoritatively inside a Colyseus multiplayer server without rewriting the battle rules.

Priorities:

1. Fun, responsive combat.
2. Reliable local multiplayer.
3. Strong resemblance to the attached cartoon visual target.
4. Clean, understandable code.
5. Data-driven characters and balance.
6. Reusable battle core for the future full game and Colyseus online mode.
7. Avoid unnecessary abstractions and speculative systems.

# Scope

Implement only:

- A minimal local-match setup screen.
- The battle itself.
- Pause.
- Results.
- Rematch.
- Return to setup.

Do not implement:

- Story or campaign.
- Overworld.
- Shops.
- Persistent inventory.
- Progression or rewards.
- Save games.
- Accounts.
- Backend.
- Matchmaking.
- Online networking.
- Colyseus server code.
- Prediction/reconciliation/rollback.
- Downloadable mods or plugins.
- Scripting.
- A general-purpose game engine.

# Technology

Use:

- TypeScript with strict type checking.
- Vite.
- Three.js with WebGLRenderer.
- Plain HTML/CSS for menus and HUD.
- JSONC for game data and input profiles.
- `jsonc-parser`.
- TypeBox for runtime validation, inferred TypeScript types, and generated JSON Schema.
- Vitest.
- Playwright for a few browser smoke tests.
- pnpm.

Do not use:

- React.
- A physics engine.
- ECS.
- Redux or another state library.
- Dependency-injection frameworks.
- Class inheritance for characters.
- A monorepo for this initial prototype.
- Heavy rendering frameworks.
- Complex custom shader architecture.

# Visual direction

The attached image is the primary visual target.

The game should look like a modern version of the original Medabots cartoon rather than realistic military robots or Transformers.

Use:

- Fixed side-view 2.5D gameplay.
- An OrthographicCamera.
- Three-dimensional characters and environments.
- Movement only on the X/Y gameplay plane.
- Z only for visual layering.
- Cel/toon shading.
- Bright saturated colors.
- Bold, clean silhouettes.
- Thin dark outlines.
- Simple colored materials rather than realistic metal.
- Cartoon/chibi proportions.
- Expressive poses.
- Exaggerated muzzle flashes and slash effects.
- Sparks.
- Smoke puffs.
- Impact flashes.
- Small armor debris.
- Subtle camera shake.
- Brief presentation-only impact freeze on strong hits.
- Clean futuristic HUD similar to the reference.

Use MeshToonMaterial or an equivalently simple toon approach with a small gradient texture.

Use the simplest reliable outline technique. Do not build a complicated shader system just for outlines.

Use simple lighting:

- Hemisphere or ambient light.
- One directional light.
- Subtle rim-like contrast.

Create a bright industrial arena containing:

- Main ground platform.
- Left upper platform.
- Right upper platform.
- Optional small center platform.
- Blue sky.
- Distant industrial structures.
- Mountains, vegetation, waterfalls, or similar depth elements.
- Mild parallax.

Gameplay characters must remain clearly readable against the background.

Do not require Blender or external character models for the initial four characters.

Build attractive procedural models from Three.js primitives. They must look intentionally designed and recognizable, not like colored cubes.

# Characters and teams

Default match:

Team A:

- A1: Metabee, leader.
- A2: Arcbeetle, partner.

Team B:

- B1: Rokusho, leader.
- B2: Warbandit, partner.

Metabee:

- Compact yellow/gold and white body.
- Green eyes.
- Twin black head cannons.
- Gun-oriented arms.
- Short cartoon proportions.

Rokusho:

- White armor with strong blue accents.
- Red visor.
- Sleek beetle/samurai silhouette.
- Blade-oriented arms.
- More agile proportions.

Arcbeetle:

- Gold, orange, and yellow.
- Bulkier than Metabee.
- Radial cannon-like details around the head/back.
- Heavy arm cannons.

Warbandit:

- Red and orange.
- Green visor.
- Very long horn/lance silhouette.
- Cylindrical weapon details.
- Melee-oriented appearance.

Do not copy or extract ROM sprites, audio, textures, models, or proprietary game files. Create the prototype visuals yourself.

Each visual character should be a THREE.Group organized approximately as:

Robot

- Core
- Head
- LeftArm
- RightArm
- Legs
- InnerFrame

Part destruction should map cleanly to those visual groups.

# Local multiplayer

Support one to four local human players in any mixture of:

- Shared keyboard.
- Separate gamepads.
- AI.

Every combatant slot can independently be assigned to:

- AI.
- A keyboard profile.
- A connected gamepad.

Create a small plain-HTML match setup screen showing A1, A2, B1, and B2.

It should:

- Show assigned character.
- Show leader/partner role.
- Let the user assign AI, a keyboard profile, or a connected gamepad.
- Detect connected and disconnected gamepads.
- Prevent the same gamepad from being assigned twice.
- Prevent one keyboard profile from being assigned twice.
- Warn about overlapping keys between simultaneously active keyboard profiles.
- Offer a quick-start default with Metabee on keyboard profile 1 and the other three characters controlled by AI.
- Start the match with one button.
- Support returning to setup after a match.

Provide at least three non-overlapping keyboard profiles so two or three people can share one keyboard.

Store every keyboard binding in JSONC, not TypeScript.

Use `KeyboardEvent.code`, such as:

- `KeyA`
- `KeyD`
- `ArrowLeft`

rather than localized character values.

Each keyboard profile maps:

- moveLeft
- moveRight
- jump
- dropThroughPlatform
- rightArm
- leftArm
- head
- guard
- chargeSpecial
- activateSpecial
- partnerStrategy
- pause

Allow multiple physical keys for one action.

Use the browser Gamepad API.

Support standard browser gamepads with:

- Left stick.
- D-pad.
- Configurable button indices.
- Configurable axis deadzone.
- Configurable axis activation threshold.
- Start/Menu for pause.

Store gamepad mappings in validated JSONC too.

Input handling must:

- Support simultaneous key presses from several keyboard profiles.
- Normalize keyboard and gamepad input into the same gameplay command format.
- Distinguish held actions from actions pressed this tick.
- Latch short button presses until the next simulation tick so inputs are not lost.
- Clear held keyboard state when the window loses focus.
- Pause local matches when the window loses focus.
- Prevent browser scrolling/default behavior for active gameplay keys.
- Pause and show a useful reconnect message when an assigned gamepad disconnects.

Do not create an in-game key-remapping interface. Editing JSONC files is sufficient.

# Normalized gameplay commands

The battle simulation must never read raw keyboard or gamepad state.

Use a flat serializable command shape approximately like:

```ts
type CombatantCommand = {
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
```

Keep this command intentionally flat and primitive so it can later map cleanly to Colyseus input schemas.

The local session creates one complete command frame per simulation tick:

```ts
type CommandFrame = {
  tick: number;
  commands: Record<string, CombatantCommand>;
};
```

Human input and AI must produce the exact same `CombatantCommand`.

Pause, setup, rematch, and other UI/session actions are not battle commands.

# Battle rules

Implement a real-time 2-vs-2 match.

Each team has:

- One leader.
- One partner.

Every combatant has independently damageable:

- Head.
- Left arm.
- Right arm.
- Legs.

Each part has separate armor.

When an arm reaches zero:

- That arm ability becomes unavailable.
- Its external armor disappears or becomes visibly broken.
- The inner frame becomes visible.
- Sparks and debris appear.

When legs reach zero:

- Running speed is significantly reduced.
- Jump ability is significantly reduced.
- Dash ability is significantly reduced.
- The broken visual state is shown.

When any head reaches zero:

- That combatant is knocked out.
- It stops acting.

When a leader's head reaches zero:

- That team immediately loses.

A partner may be knocked out without immediately ending the match.

Default round time: 180 seconds.

At timeout:

- Compare each team's total remaining armor percentage.
- Higher score wins.
- Equal scores produce a draw.

Show a result overlay with:

- Winner.
- Reason.
- Rematch.
- Return to setup.

# Movement and platforms

Do not use a physics engine.

Implement a small deterministic 2D kinematic system with:

- Position.
- Velocity.
- Facing direction.
- Grounded state.
- Gravity.
- Horizontal acceleration.
- Friction.
- Maximum movement speed.
- Jump velocity.
- Dash.
- Arena boundaries.
- Ground collision.
- One-way platforms.

Characters may move upward through an upper platform and land on it while falling.

Dropping through a platform requires the configured drop action.

Dash is triggered by a configurable double-tap window on horizontal movement.

Detect double-taps using simulation ticks so keyboard, gamepad, AI, replayed commands, and future network commands behave consistently.

Keep movement responsive and predictable rather than physically realistic.

# Fixed-step simulation

Run battle simulation at exactly 60 fixed ticks per second.

Rendering uses `requestAnimationFrame` independently.

Use an accumulator and clamp unusually large real-time frame deltas.

The battle core must use:

- Integer simulation tick numbers.
- Tick-based cooldowns.
- Tick-based startup/active/recovery times.
- Tick-based status durations.
- Tick-based AI reaction timing.
- Stable entity update ordering.

The battle core must not use:

- `Date.now`.
- `performance.now`.
- DOM APIs.
- Three.js objects.
- `requestAnimationFrame`.
- `Math.random`.

Configuration may remain human-readable in milliseconds.

Convert validated millisecond durations into integer ticks when building runtime definitions.

Use a small seeded pseudo-random generator for gameplay randomness.

The same:

- Battle setup.
- Content.
- Seed.
- Command frames.

must produce the same battle outcome.

# Abilities and combat

Do not implement abilities as character-specific classes.

Support three initial ability kinds:

- projectile
- melee
- special

Every ability is data-driven and may configure:

- startupMs
- activeMs
- recoveryMs
- damage
- staggerMs
- knockbackX
- knockbackY
- projectileSpeed
- projectileLifetimeMs
- hitbox width
- hitbox height
- hitbox offset
- specialCost
- maximum uses when relevant

Attack sequence:

input
→ startup
→ active
→ hit/projectile
→ recovery
→ ready

Projectile abilities:

- Spawn a logical projectile.
- Move at configured speed.
- Hit enemies only.
- Damage the first overlapping enemy part.
- Disappear on impact or lifetime expiry.

Melee abilities:

- Create a temporary logical hitbox.
- Hit each valid target at most once per activation.
- Use a clear slash/impact presentation.

Use simple 2D rectangles/AABBs for:

- Character bounds.
- Head hit region.
- Left-arm hit region.
- Right-arm hit region.
- Leg hit region.
- Melee hitboxes.
- Projectiles.

Hit regions follow combatant position, facing, and simple pose offsets.

Three.js geometry must never determine gameplay collision.

# Guard

Guarding:

- Prevents attacking.
- Reduces incoming damage.
- Reduces knockback.

Store all guard multipliers in `battle-rules.jsonc`.

# Special meter

Implement a simple Medaforce-inspired meter.

Holding the charge action while grounded and not attacking charges it.

Dealing or receiving damage may add a small configurable amount.

At full charge, the special action activates the character's configured special.

Create one visually satisfying but mechanically simple special per initial character using the existing projectile or melee systems.

Do not implement the full medal/RPG system yet.

# AI

Every unassigned combatant uses AI.

Do not use behavior-tree libraries.

AI consumes battle state and produces the same `CombatantCommand` as humans.

Use simple deterministic utility/state logic:

- Choose target.
- Move toward/away.
- Jump when target is sufficiently above.
- Choose available attacks based on range and cooldown.
- Guard occasionally when threatened.
- Avoid remaining inactive.
- Respect the current strategy.

Strategies:

- `ATTACK_LEADER`: prioritize enemy leader.
- `PROTECT_LEADER`: remain near own leader and attack nearby threats.
- `AGGRESSIVE`: attack the easiest reachable enemy.

If a human controls a leader while its partner is AI, the strategy action cycles that AI partner's strategy.

If the partner is human-controlled, strategy input has no effect.

Store AI configuration in validated data:

- reaction timing
- preferred distance
- aggression
- guard probability
- jump threshold
- strategy weights

Keep platform navigation intentionally simple.

Design the arena so straightforward movement/jump heuristics work reliably.

# Game feel

Add focused polish without building a large VFX engine.

On impact:

- Impact flash.
- Sparks.
- Small knockback.
- Stagger.
- Subtle camera shake.
- Brief presentation-only impact freeze for strong attacks.

Add:

- Dust on landing.
- Dust on dashing.
- Muzzle flashes.
- Visible projectiles/tracers.
- Small recoil animations.
- Blue/cyan slash trails for Rokusho.
- Armor fragments on part destruction.
- Short slow-motion presentation on final leader-head destruction.

Use strict limits for temporary particles and remove expired objects.

Presentation effects must never alter authoritative gameplay state.

# Configurable game content

This is not a plugin or downloadable mod system.

I only need:

1. Important gameplay values in human-readable configuration files.
2. Configurable keyboard/gamepad profiles.
3. New characters, parts, abilities, arenas, and AI profiles addable through files/directories.
4. Strong runtime validation.
5. Good editor autocomplete.
6. Existing mechanics reusable without modifying battle code.

Do not implement:

- Content packs.
- Package versions.
- Dependency resolution.
- Plugin APIs.
- Runtime JavaScript loading.
- User scripting.
- Custom scripting languages.
- Remote content.
- Runtime mod browsers.
- Special hot-reload architecture.

Use an approximate data structure such as:

```text
game-data/
  schemas/

  rules/
    battle-rules.jsonc

  controls/
    keyboards/
      keyboard-1.jsonc
      keyboard-2.jsonc
      keyboard-3.jsonc

    gamepads/
      standard-gamepad.jsonc

  matches/
    local-default.jsonc

  ai/
    balanced.jsonc
    aggressive.jsonc

  arenas/
    industrial-arena.jsonc

  characters/
    metabee/
      character.jsonc
      parts/
      abilities/

    rokusho/
      character.jsonc
      parts/
      abilities/

    arcbeetle/
      character.jsonc
      parts/
      abilities/

    warbandit/
      character.jsonc
      parts/
      abilities/

public/
  assets/
    characters/
    arenas/
    effects/
```

Discover nested JSONC files automatically at build time with Vite.

Do not require a manually maintained central manifest.

Each definition must contain:

- Stable globally unique kebab-case ID.
- Explicit definition kind.

Validate:

- Duplicate IDs.
- Unknown references.
- Incorrect part slots.
- Missing abilities.
- Invalid loadouts.
- Invalid numeric ranges.
- Invalid key codes.
- Invalid gamepad indices.
- Misspelled properties.

Use TypeBox as the single source for:

- TypeScript types.
- Runtime validation.
- Generated JSON Schema.

Set `additionalProperties: false` where appropriate.

Important gameplay properties should be required rather than silently defaulted:

- Armor.
- Damage.
- Startup timing.
- Active timing.
- Recovery timing.
- Movement speed.
- Jump speed.
- Dash speed.
- Projectile speed.
- Knockback.
- Input bindings.
- AI values.

Defaults are acceptable only for harmless presentation properties.

Validation errors should clearly show:

- File path.
- JSON property path.
- Expected value.
- Received value.

Generate JSON Schema files into `game-data/schemas` so JSONC files receive editor autocomplete, descriptions, and validation.

# Content pipeline

Separate Vite-specific file discovery from content validation.

Use approximately:

```ts
loadBundledContent()
  -> discovers raw JSONC files using Vite
  -> buildContentCatalog(rawDocuments)
```

`buildContentCatalog()` must be pure and browser-independent.

It should:

- Parse JSONC.
- Validate schemas.
- Detect duplicates.
- Resolve references.
- Perform semantic validation.
- Build normalized runtime definitions.
- Freeze immutable definitions in development if useful.

This matters because a future Colyseus Node.js server must be able to load the same game data from the filesystem and reuse the exact same content validation/catalog logic without depending on Vite.

# Definition versus runtime state

Clearly distinguish immutable content definitions from runtime battle state.

For example:

```ts
type PartDefinition = {
  id: string;
  slot: PartSlot;
  armor: number;
  abilityId?: string;
};
```

versus:

```ts
type PartState = {
  currentArmor: number;
  cooldownTicks: number;
  destroyed: boolean;
};
```

Never mutate loaded definitions.

# Character content model

Characters are primarily composition.

A character definition contains approximately:

- ID.
- Display name.
- Visual definition.
- Collider.
- Part hit-region definitions.
- Default loadout.

A loadout references:

- Head part ID.
- Left-arm part ID.
- Right-arm part ID.
- Leg part ID.

Parts reference abilities.

Do not create:

- `Metabee extends Character`
- `Rokusho extends Character`
- similar inheritance.

Characters are data, not subclasses.

# Adding future characters

A new character using existing mechanics should require:

- New character directory.
- Character JSONC.
- Any new part JSONC files.
- Any new ability JSONC files.
- Visual assets or a procedural renderer entry.

The initial four characters may use procedural Three.js models.

Also support a small generic GLB visual definition for future characters:

```jsonc
{
  "type": "gltf",
  "url": "/assets/characters/new-character/model.glb",

  "nodes": {
    "head": "Head",
    "leftArm": "LeftArm",
    "rightArm": "RightArm",
    "legs": "Legs",
    "innerFrame": "InnerFrame",
  },
}
```

Use GLTFLoader and configuration-provided node names.

Do not build a data-driven procedural-model language.

Built-in procedural models may remain normal rendering code.

Changing a character from procedural geometry to GLB must not affect battle logic.

# Architecture

Organize the project around this flow:

```text
Physical Input ─┐
                ├─> normalized CombatantCommand
AI ─────────────┘
                         ↓
                    CommandFrame
                         ↓
                    battle-core
                         ↓
        BattleSnapshot + BattleEvent + BattleResult
                         ↓
                 presentation layer
                   /             \
             Three.js            HUD
```

Use an approximate project structure:

```text
src/
  main.ts

  battle-core/
    index.ts
    types.ts
    create-battle.ts
    step-battle.ts
    movement.ts
    combat.ts
    projectiles.ts
    collisions.ts
    damage.ts
    random.ts

  battle-session/
    local-battle-session.ts
    ai-controller.ts
    command-frame.ts

  content/
    schemas.ts
    build-content-catalog.ts
    load-bundled-content.ts

  input/
    keyboard-input.ts
    gamepad-input.ts
    input-manager.ts
    bindings.ts

  render/
    renderer.ts
    camera.ts
    arena-view.ts
    character-view.ts
    effects.ts
    model-loader.ts

    models/
      metabee.ts
      rokusho.ts
      arcbeetle.ts
      warbandit.ts

  ui/
    match-setup.ts
    hud.ts
    pause-overlay.ts
    result-overlay.ts
    styles.css

scripts/
  export-schemas.ts
```

Adjust this only when a slightly different small structure is clearly simpler.

Prefer small focused files.

Do not create layers/interfaces merely because architectural patterns suggest them.

Do not introduce:

- Repositories.
- CQRS.
- Service containers.
- Dependency injection.
- Large event buses.
- Abstract base classes.
- Factories for everything.
- Generic plugin frameworks.

# battle-core requirements

`battle-core` is the most important boundary.

It must:

- Contain no Three.js imports.
- Contain no HTML/DOM APIs.
- Contain no keyboard/gamepad APIs.
- Contain no Vite APIs.
- Contain no file loading.
- Contain no Colyseus imports.
- Contain no `@colyseus/schema` imports.
- Contain no Node-specific assumptions.
- Use plain serializable TypeScript data.
- Run identically in browser and Node.js.
- Accept validated content and command frames.
- Produce snapshots, events, and results.

Expose a small API approximately like:

```ts
const battle = createBattle({
  setup,
  content,
});

battle.step(commandFrame);
battle.getSnapshot();
battle.drainEvents();
battle.getResult();
```

# BattleSetup

Use a serializable setup approximately like:

```ts
type BattleSetup = {
  seed: number;
  arenaId: string;
  rulesId: string;

  teams: Array<{
    id: string;

    combatants: Array<{
      instanceId: string;
      characterId: string;
      role: "leader" | "partner";

      loadout?: {
        head: string;
        leftArm: string;
        rightArm: string;
        legs: string;
      };
    }>;
  }>;
};
```

Controller assignments do not belong in `BattleSetup`.

They belong to the local session.

Use approximately:

```ts
type LocalControllerAssignment =
  | {
      type: "ai";
      aiProfileId: string;
    }
  | {
      type: "keyboard";
      profileId: string;
    }
  | {
      type: "gamepad";
      gamepadIndex: number;
      profileId: string;
    };
```

# BattleSnapshot

`BattleSnapshot` must:

- Contain only plain serializable data.
- Contain no Three.js objects.
- Contain no methods.
- Contain no Maps or Sets.
- Contain no cyclic references.
- Be detached from mutable battle-core internals.
- Include the authoritative simulation tick.
- Include all persistent state needed to render a player joining mid-battle.
- Give every network-visible dynamic entity a stable ID, including combatants and projectiles.

A JSON stringify/parse round trip must preserve all render-relevant information.

A snapshot should contain enough information to reconstruct current visual state without requiring previously emitted transient events.

# Battle events

Use a small typed event array, not a large event architecture.

Events may include:

- attackStarted
- projectileSpawned
- hit
- partDestroyed
- combatantKnockedOut
- specialActivated
- roundEnded

Every event contains:

- Simulation tick.
- Relevant stable entity IDs.
- Minimal presentation data required.

Three.js may use events for:

- Sparks.
- Sounds.
- Camera shake.
- Temporary slash effects.
- Armor debris.

Persistent information must live in snapshots, not only events.

Missing an old event must never leave the rendered game in an incorrect permanent state.

# Rendering

Three.js and the HUD consume snapshots/events.

They must not contain battle rules.

Three.js must never decide:

- Damage.
- Collision results.
- Cooldowns.
- Part destruction.
- Winner.
- AI decisions.

Use interpolation between previous/current snapshots for smooth rendering.

The renderer must be capable of interpolating snapshots that arrive at arbitrary intervals rather than assuming it always receives one snapshot for every 60 Hz simulation tick.

This is important for the future online implementation.

# LocalBattleSession

`LocalBattleSession` should:

- Read keyboard/gamepad commands.
- Run AI controllers.
- Build the complete `CommandFrame`.
- Step `battle-core`.
- Provide snapshots/events/results to presentation.
- Handle pause.
- Handle focus loss.
- Handle controller disconnects.

The renderer and HUD should consume session outputs rather than reaching directly into `battle-core` internals.

# Future complete-game integration

This battle prototype will later become one feature/screen inside a complete game.

Do not implement the rest of the game now.

The future full game should be able to:

1. Build a `BattleSetup` from story, inventory, and customization state.
2. Start the battle feature.
3. Receive a `BattleResult`.
4. Apply rewards, progression, or story consequences outside the battle feature.

Use a result approximately like:

```ts
type BattleResult = {
  winnerTeamId: string | null;
  reason: "leader-head-destroyed" | "timeout" | "draw";
  elapsedTicks: number;
  finalCombatants: CombatantSnapshot[];
};
```

The battle feature must not know about:

- Persistent inventory.
- Missions.
- Rewards.
- Shops.
- Save games.
- Dialogue.
- Campaign progression.

Provide one small mounting boundary approximately like:

```ts
const mountedBattle = mountLocalBattle({
  root,
  setup,
  assignments,
  content,
  onComplete,
});

mountedBattle.dispose();
```

Do not create a generic screen manager or application framework yet.

`main.ts` may simply load content and mount the local battle/setup experience.

# Future online integration with Colyseus

Do not install or implement Colyseus in this prototype.

The future architecture will be:

```text
Browser input
    ↓
Colyseus client
    ↓
Colyseus BattleRoom
    ↓
authoritative battle-core
    ↓
Colyseus synchronized state + transient messages
    ↓
browser OnlineBattleSession
    ↓
existing renderer + HUD
```

A future `BattleRoom` will own:

- Authoritative battle-core instance.
- Authoritative simulation tick.
- Player-session-to-combatant assignments.
- Per-player input buffering.
- AI commands.
- Match lifecycle.
- Reconnection.
- Synchronized Colyseus room state.

When online mode is implemented, use Colyseus's built-in room/input/fixed-timestep/state-synchronization facilities rather than inventing custom equivalents where Colyseus already provides them.

The online client sends only its own normalized input.

It must not send:

- Authoritative server tick.
- Complete `CommandFrame`.
- Team/combatant identity as authority.
- Damage.
- Position.
- Cooldowns.
- Match results.

The future Colyseus room will:

1. Identify the connected player.
2. Map the connection to an assigned combatant.
3. Consume that player's normalized input.
4. Produce AI commands for AI slots.
5. Build the complete authoritative `CommandFrame`.
6. Step the same `battle-core`.
7. Synchronize relevant snapshot state.
8. Send transient presentation events.

Conceptually:

```ts
const commands = {
  A1: playerAInput,
  A2: playerBInput,
  B1: aiCommand,
  B2: aiCommand,
};

battle.step({
  tick: serverTick,
  commands,
});
```

Do not add custom network sequence/acknowledgement systems now.

When online mode is implemented, prefer Colyseus's own supported input buffering/acknowledgement mechanisms before designing custom ones.

# Colyseus state boundary

Do not make `BattleSnapshot` or runtime battle entities extend Colyseus Schema classes.

Keep the battle-core completely independent.

Future architecture:

```text
BattleSnapshot
      ↓
thin Colyseus adapter
      ↓
@colyseus/schema RoomState
```

Use future Colyseus synchronized state for persistent current information such as:

- Simulation tick.
- Match phase.
- Timer.
- Combatant positions.
- Velocities.
- Facing.
- Movement state.
- Part armor.
- Destroyed-part status.
- Special meters.
- Active projectiles.
- Winner/result state.

Use Colyseus room messages for transient presentation events such as:

- Hit flashes.
- Sparks.
- Sounds.
- Camera shake.
- Temporary slash effects.
- Armor debris.

A reconnecting client must be able to render the current battle correctly from synchronized state alone.

# Future OnlineBattleSession

Do not implement this yet.

Later, create an `OnlineBattleSession` that:

- Connects using the Colyseus browser client.
- Sends only the local player's normalized commands.
- Receives authoritative Colyseus state.
- Converts/surfaces that state as `BattleSnapshot`.
- Surfaces transient events as `BattleEvent`.
- Feeds the existing renderer/HUD.
- Never calculates authoritative damage, collision, or results.

Therefore presentation can consume either:

```text
LocalBattleSession
        ↓
snapshot/events
        ↓
renderer/HUD
```

or:

```text
OnlineBattleSession
        ↓
snapshot/events
        ↓
same renderer/HUD
```

without rewriting rendering code.

# TypeBox versus Colyseus schemas

TypeBox remains the schema system for:

- JSONC game content.
- Configuration validation.
- TypeScript content types.
- Generated JSON Schema.

Future `@colyseus/schema` is only for:

- Synchronized network room state.
- Network input schemas when appropriate.

Do not try to merge or unify the two schema systems.

They solve different problems.

# Do not implement future networking now

Do not implement:

- Colyseus server.
- Colyseus rooms.
- `OnlineBattleSession`.
- WebSockets manually.
- Network schema classes.
- Prediction.
- Reconciliation.
- Rollback.
- Lag compensation.
- Matchmaking.
- Authentication.
- Redis.
- Database persistence.
- Server failover.

The current preparation is sufficient:

- Fixed deterministic ticks.
- Flat commands.
- Stable IDs.
- Browser-independent battle-core.
- Serializable snapshots.
- Transient events.
- Session/presentation boundary.

# HUD

Use HTML/CSS over the Three.js canvas.

Top center:

- Battle/round label.
- Timer.
- `2 VS 2`.

Top left:

- Team A combatants.
- Input source.
- Leader/partner role.

Top right:

- Team B combatants.
- Input source.
- Leader/partner role.

For every combatant show:

- HEAD.
- L-ARM.
- R-ARM.
- LEGS.
- Special meter.
- Knocked-out state.
- Broken-part state.

Above each robot show:

- A1, A2, B1, or B2.
- Leader indicator.
- Local-player indicator when human-controlled.

Briefly display partner strategy when changed.

Keep the HUD readable at common 16:9 desktop sizes and reasonably responsive.

# Testing and debugging

Keep testing proportional to the game.

Do not pursue 100% coverage.

Do not test implementation details.

Use three test layers.

## 1. Unit tests with Vitest

Test pure gameplay/configuration behavior directly:

- Damage.
- Part destruction.
- Leader knockout.
- Partner knockout.
- Ability startup/active/recovery timing.
- Projectile collision.
- Melee collision.
- Guard.
- Special meter.
- Movement.
- One-way platforms.
- Dash detection.
- Input binding normalization.
- Keyboard-profile conflict detection.
- Gamepad assignment rules.
- AI decisions for controlled scenarios.
- JSONC parsing.
- Schema validation.
- Duplicate IDs.
- Unknown references.
- Seeded random-number generation.

Prefer real definitions and small fixtures over mocks.

Do not unit-test:

- Three.js mesh hierarchy details.
- Shader output.
- Particle appearance.
- Private functions purely because they exist.

## 2. Headless battle integration tests with Vitest

Create a small test-only helper approximately like:

```ts
runBattleScenario({
  setup,
  content,
  commandFrames,
  maxTicks,
});
```

It must run the real battle-core without:

- Browser.
- Three.js.
- Timers.
- Physical input devices.

Add a few integration scenarios proving:

- A complete match can run from `BattleSetup` to `BattleResult`.
- Scripted commands can move, attack, destroy parts, and finish a battle.
- Destroying a leader head ends the match.
- Destroying a partner head knocks it out without immediately ending the match.
- Destroying an arm disables that ability.
- Destroyed legs reduce movement.
- Projectiles damage the correct part.
- The same setup, seed, and command frames produce identical snapshots/results.
- `BattleSnapshot` is detached and serializable.
- Stable IDs survive JSON stringify/parse.
- Real bundled content can instantiate all four initial characters.
- `battle-core` imports and runs in Node/Vitest without browser globals.

When a deterministic scenario fails, make failure output useful by including:

- Seed.
- Failing tick.
- Recent command frames.
- Relevant snapshot state.

Do not implement a production replay system solely for tests.

Command-frame fixtures are sufficient.

## 3. Browser smoke tests with Playwright

Keep these few and high-value.

Run Chromium smoke tests for approximately:

1. Open setup → quick start → enter match.
2. Send keyboard input → verify the controlled combatant moves and HUD changes.
3. Complete a deterministic test match → verify results, rematch, and return-to-setup.

Use:

- Accessible roles.
- Labels.
- Explicit test IDs where necessary.

Do not depend on:

- CSS class names as selectors.
- Arbitrary sleep/timeouts.

Configure Playwright tracing for failed/retried tests to make debugging easier.

Do not automate physical gamepads in the initial test suite.

Instead:

- Unit-test gamepad mapping/assignment logic.
- Manually verify real controllers.

Do not add strict full-canvas screenshot regression tests initially.

WebGL rendering may vary across operating systems, browsers, GPUs, and drivers.

Continue visually inspecting the game during development.

# Future Colyseus tests

Do not install Colyseus testing tools now.

When online multiplayer is later implemented, add a small integration suite using Colyseus's supported testing utilities/simulated clients.

Test:

- Two clients joining one room.
- Player-to-combatant assignment.
- Inputs reaching authoritative `battle-core`.
- Both clients receiving synchronized state.
- Disconnect/reconnection.
- Match completion.
- Room disposal.

Do not build a large networking test framework.

# Development debug interface

In development and automated tests only expose:

```ts
window.__BATTLE_DEBUG__ = {
  getSnapshot,
  restart,
  returnToSetup,
  pause,
  resume,
};
```

Do not expose mutable battle internals.

Do not build a large debug panel.

# Scripts

Provide:

```text
pnpm dev
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm check
```

`pnpm check` should run:

- Type checking.
- Unit/integration tests.
- Production build.

Keep browser E2E tests separate because they are slower.

Remember that Vitest executing TypeScript is not a replacement for separate TypeScript type checking.

# README

Write a concise README for a software developer who knows little about Three.js/game development.

Explain:

- Installation.
- Running.
- Building.
- Local multiplayer setup.
- Connecting controllers.
- Default keyboard profiles.
- Editing keyboard bindings.
- Editing gamepad mappings.
- Shared-keyboard hardware ghosting limitations.
- Changing damage.
- Changing armor.
- Changing movement.
- Changing timing.
- Adding an ability.
- Adding a part.
- Adding a character directory.
- Using a GLB model.
- Definition versus runtime state.
- Fixed-step simulation.
- Seeded deterministic simulation.
- Physical input → command → battle-core → snapshot/events → presentation flow.
- How the future full game will call the battle feature.
- How a future Colyseus room will reuse the same `battle-core`.
- Why TypeBox content schemas and future Colyseus state schemas remain separate.

# Verification

Do not consider the implementation complete until:

- `pnpm install` succeeds.
- TypeScript type checking succeeds.
- Unit tests pass.
- Headless integration tests pass.
- `pnpm build` succeeds.
- Browser smoke tests pass when the browser tooling is available.
- Browser console has no recurring errors.

Verify local multiplayer:

- Setup screen detects keyboard profiles.
- Setup screen detects connected gamepads.
- Quick start works.
- One keyboard player works.
- Two keyboard profiles control different combatants simultaneously.
- Three configured keyboard profiles can be assigned without key conflicts.
- Two connected gamepads can independently control combatants.
- Mixed keyboard/gamepad matches work.
- Unassigned slots use AI.
- All four combatants can be human-controlled.
- Assigned controller disconnect pauses the match and shows a useful message.

Verify gameplay:

- Movement works.
- Jump works.
- Dash works.
- Platform landing works.
- Platform drop-through works.
- Guard works.
- All normal attack slots work.
- Special attacks work.
- Hits visibly connect.
- All four parts take independent damage.
- Destroyed arms disable attacks.
- Destroyed legs affect movement.
- Destroyed parts visibly break.
- Partners can be knocked out.
- AI actively fights.
- Partner strategy switching works when partner is AI.
- Leader-head destruction ends battle.
- Timeout works.
- Draw works.
- Rematch works.
- Return-to-setup works.

Verify data-driven behavior:

- Changing JSONC damage changes gameplay.
- Changing movement values changes gameplay.
- Changing keyboard bindings changes controls.
- Invalid JSONC produces useful errors.
- Unknown references are rejected.
- Duplicate IDs are rejected.

Verify architecture:

- `battle-core` runs without browser globals.
- `battle-core` has no Three.js dependency.
- `battle-core` has no Colyseus dependency.
- Content validation has no Vite dependency.
- `BattleSnapshot` serializes cleanly.
- Stable entity IDs remain stable.
- Rendering depends on snapshots/events rather than private battle internals.

When browser/computer tools are available, actually play several matches with different controller assignments.

Inspect the result visually.

Fix issues such as:

- Poor camera framing.
- UI overlap.
- Unreadable characters.
- Input lag.
- Missed short button presses.
- AI inactivity.
- Attacks that cannot connect.
- Characters stuck on platforms.
- Broken controller assignment.
- Excessive particles.
- Character silhouettes that do not resemble the intended cartoon designs.
- Visual output substantially worse than the attached reference.

Most importantly:

Finish with a polished, playable local multiplayer battle.

Do not spend the project building hypothetical architecture instead of the game.

Three.js is the presentation layer.

`battle-core` is ordinary deterministic TypeScript.

JSONC content provides gameplay data.

`LocalBattleSession` connects local input/AI to the battle core.

Later, Colyseus will provide the authoritative online session around the same battle core.

Keep those boundaries clear and keep everything else as simple as possible.
