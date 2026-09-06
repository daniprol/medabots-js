# Architecture

For original-game behavior and the evidence behind future fidelity changes, see the [Medabots AX battle reference](original-battle-reference.md). This page describes the current prototype. See [fidelity status](ax-remaster-status.md) for implemented mechanics and known gaps.

```text
Keyboard / gamepad ─┐
                   ├─ flat CombatantCommand ─ CommandFrame ─ battle-core
Seeded AI ─────────┘                                            │
                                                  detached snapshot + events
                                                               │
                                                        Three.js + HTML HUD
```

`src/battle-core/` is ordinary deterministic TypeScript: no DOM, physical inputs, Three.js, Vite, timers, file access, or networking. `createBattle({ setup, content })` returns `step(frame)`, `getSnapshot()`, `drainEvents()`, and `getResult()`. Frames must contain one complete command per combatant and the next consecutive tick. The session advances at the original GBA cadence, **16777216 / 280896 updates per second** (about 59.7275 Hz), with stable actor order A1, B1, A2, B2. UI seconds and millisecond content conversion retain the original nominal 60-update convention. Cooldowns, dash taps, attacks and statuses use ticks. The session clamps long real frame deltas to 100ms and uses an accumulator; rendering uses `requestAnimationFrame` separately.

Definitions are frozen shared content. Runtime state owns positions, velocities, armor, uses, cooldowns, attacks, projectiles, strategies, and meters. It also retains beneficial/harmful status slots, transformed equipment and expiry, pending support effects, and the last activated special needed by All Recovery. Snapshots are detached plain objects, including stable combatant/projectile IDs and the current result; JSON stringify/parse preserves render state. Events describe transient hits, attacks, debris and results. Missing an old event cannot permanently hide an intact part or resurrect a destroyed one.

Core combat consumes the original 256-byte random table through a snapshot-owned cursor initialized from the setup seed. The local session gives AI the same byte stream and records its consumption as `CommandFrame.aiRandomDraws`. The core advances that many draws before executing the commands. This keeps recorded frames reproducible; it does not yet reproduce the original per-actor interleaving of AI and combat random reads. The metadata belongs to the authoritative session, never to a future player-supplied command. Identical validated content, setup, seed, and command frames reproduce the same outcome. Tests run whole matches without browser globals and report seed, tick, recent frames and snapshot on scenario execution failures.

`LocalBattleSession` combines human and AI commands, enforces local strategy eligibility, advances the core, and handles pause/focus/controller lifecycle. Presentation receives snapshots/events, interpolates supplied snapshot pairs using a caller-provided interpolation fraction (not a hardcoded tick gap), and never calculates damage or winners. Camera shake, impact freeze, particles and final-hit slow presentation do not modify the simulation. Static arena meshes are batched by material. The initial characters use cel-art texture regions on flat planes; their outlines are in the artwork. Inexpensive contact shadows keep software-rendered browsers usable. Moving platforms and live support/special objects have persistent snapshot state. Original Medaforce startup has its own authoritative simulation pause, separate from presentation-only impact freeze. Temporary effects are capped at 160 objects.

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

await mounted.ready; // Assets and presentation are ready; getSnapshot() is null while loading.
mounted.dispose(); // Removes listeners, animation loop, UI and WebGL resources.
```

`main.ts` is a small example owner of setup, rematch and return. Completion is reported once per mount. The battle feature knows nothing about missions, save games, rewards, accounts, or inventory.

A future Colyseus `BattleRoom` can load the same JSONC from disk, call `buildContentCatalog`, and own this exact core. The room will map authenticated connections to combatants, buffer each player’s flat command, add AI commands, build the authoritative frame, and step the simulation using Colyseus’s supported fixed-timestep/input facilities. Clients will send only their own normalized input, never authoritative ticks, identity, positions, damage or results. No networking is implemented here.

Keep a thin adapter from plain snapshots to future `@colyseus/schema` state for persistent information, and room messages for transient events. A later online session can surface those snapshots/events to the existing renderer and HUD. TypeBox validates authored content; Colyseus schemas synchronize network state. These are separate boundaries and must remain separate. Prediction, reconciliation, rollback and custom acknowledgement systems are deliberately outside this prototype.

In development/tests only, `window.__BATTLE_DEBUG__` exposes `getSnapshot`, `restart`, `returnToSetup`, `pause`, and `resume`. `restart` optionally accepts assignments, a setup, or a short `roundTimeMs` for deterministic lifecycle smoke tests. It creates a fresh session and does not expose mutable core internals.
