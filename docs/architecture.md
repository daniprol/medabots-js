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

`src/battle-core/` is ordinary deterministic TypeScript: no DOM, physical inputs, Three.js, Vite, timers, file access, or networking. `createBattle({ setup, content })` returns `step(frame)`, `getSnapshot()`, `drainEvents()`, and `getResult()`. Frames must contain one complete command per combatant and the next consecutive tick. The session advances at the original GBA cadence, **16777216 / 280896 updates per second** (about 59.7275 Hz), with stable actor order A1, B1, A2, B2, A3, B3 (only active slots are present). UI seconds and millisecond content conversion retain the original nominal 60-update convention. Cooldowns, dash taps, attacks and statuses use ticks. The session clamps long real frame deltas to 100ms and uses an accumulator; rendering uses `requestAnimationFrame` separately.

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

The online entry menu mounts `src/online/mount-online-mode.ts`. Its browser, waiting room and battle mount use the existing renderer/HUD with a separate connection and input lifecycle. `server/battle-room.ts` owns the same core in a Colyseus 0.18 room, maps connection sessions to combatants, validates joins, consumes one normalized input per player per fixed step, and authoritatively decides combat and results. Online code is loaded only when selected.

`src/online/state.ts` defines nested Colyseus schemas; `state-adapter.ts` maintains their identities across updates and converts decoded state into detached renderer snapshots. Room messages carry transient events. TypeBox still validates authored content and network options; Colyseus schema handles continuous synchronization. `src/online/snapshot-buffer.ts` supplies presentation interpolation from actual tick gaps. Prediction and rollback are not implemented.

Client and server remain separate entry points in one package, sharing the core and validated file content. `pnpm dev`, `pnpm dev:server`, and `pnpm dev:all` run the app, server or both. Configuration is in `config/online.json` and `config/server.json`. See [Online multiplayer](online-multiplayer.md) for the state machine, protocol, commands and deployment, and [research](research/online-multiplayer.md) for the supporting Colyseus recommendations.

In development/tests only, `window.__BATTLE_DEBUG__` exposes `getSnapshot`, `restart`, `returnToSetup`, `pause`, and `resume`. `restart` optionally accepts assignments, a setup, or a short `roundTimeMs` for deterministic lifecycle smoke tests. It creates a fresh session and does not expose mutable core internals.

## Match preparation and HUD

`ui/setup-state.ts` owns pure team resizing, presets, assignment filtering and character selection. Controller assignments remain session data. Both the setup cards and the controls dialog use `ui/controller-assignment.ts`, so duplicate-device rules and difficulty options cannot diverge. `ui/arena-preview.ts` draws a lightweight thumbnail from the real platform layout and the same backdrop region used by the arena renderer (`render/arena-art.ts`).

Teams have equal sizes of 1–3, each with exactly one leader. The original four spawn positions remain unchanged; third partners spawn between their teammates. Timeout scoring sums surviving partner parts when multiple partners exist and uses zero when there are none. Attack initialization uses four phase slots, wrapping extra actor indices. These size extensions are browser rules, not a claim that AX offered 3-vs-3.

The session routes leader order presses into AI partners' commands and clears presses from human partners. Core commands contain no controller ownership. `ui/hud.ts` manages the clock, teams and order notices; `ui/fighter-card.ts` renders a robot's armor, weapon readiness, ammunition and statuses. `ui/battle-hud.css` reserves space outside the canvas. Narrow screens scroll team panels instead of shrinking their text. Shared shell styles live in `ui/styles.css`; setup/control styles live in `ui/roster.css`.
