# Architecture

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
import { mountLocalBattle } from '../src/battle-session/mount-local-battle';

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
