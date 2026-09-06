# Online multiplayer

The entry menu separates **Single player / Local** from **Online multiplayer**. Local play needs only the browser app. Online play uses a separate Colyseus 0.18 process that runs the same battle core. One connection controls one Medabot; 1v1, 2v2 and 3v3 need two, four and six human players.

## Run it

Use **Node 24 LTS** (Node 22.12+ supported) and pnpm 10. The current Colyseus server requires Node 22 or newer.

```sh
pnpm install
pnpm dev           # Browser app only, http://localhost:5173
pnpm dev:server    # Online server only, http://localhost:2567
pnpm dev:all       # Both, with named logs and coordinated shutdown
```

`pnpm dev:client` is an explicit alias for the browser command. Two browser windows or separate computers can connect to the same server. The browser game can be hosted independently of the battle server.

1. Open **Online multiplayer** and choose **Localhost** or add a server URL.
2. Pick your name, character and keyboard/gamepad profile.
3. Create a battle with a battlefield and match size, or join an open battle.
4. Select **Ready to battle**. Once all seats are ready, every browser prepares and renders the arena. The server waits for each browser's loading acknowledgement before starting the countdown.
5. Fight using the existing controls. **Menu** releases your controls while the shared battle continues. **Leave battle** returns to the server browser.

The server assigns A1, B1, A2, B2, A3, B3 in join order. A1/B1 are team leaders. Available slots cannot be taken twice. Once preparation starts, the roster is locked. Waiting seats are released when a player leaves; departure after preparation ends the match with an explicit notice. Teammates are human-controlled, so the local AI partner-order button has no online effect.

## Server addresses

Built-in addresses live in [`config/online.json`](../config/online.json), exposed through `ONLINE_CONFIG`. Add the future public server to its `servers` array once it exists; there is no placeholder production endpoint. Custom addresses are saved in browser local storage and can be removed. Player choices persist when returning to the server browser during the current online visit.

Use `http://localhost:2567` for a server on **your** computer. From another computer, add its LAN address, for example `http://192.168.1.41:2567`. Add the browser app's actual origin (scheme, host and port) to `config/server.json`'s `allowedOrigins`. The server binds to all interfaces by default; the host firewall must allow the chosen port.

HTTP/HTTPS and WS/WSS URL forms are accepted and normalized. Credentials, query parameters and fragments are rejected. HTTPS-hosted games require HTTPS/WSS servers; use the HTTP development app for an ordinary HTTP localhost server. A production reverse proxy can expose a path prefix if it forwards both matchmaking HTTP and WebSocket traffic under that prefix.

## Configuration

Gameplay, arenas, characters, controls and rules remain in `game-data/**/*.jsonc`. The server loads those files from disk through the same catalog builder as Vite. A SHA-256 fingerprint of canonical gameplay content, plus a protocol version, rejects incompatible clients before they occupy a battle seat. Local keyboard preferences do not change the fingerprint.

[`config/online.json`](../config/online.json) contains the shared online defaults. Client-specific presentation settings are bundled into the browser; room state advertises the server's actual simulation, input and patch rates.

| Setting                | Default        | Meaning                                              |
| ---------------------- | -------------- | ---------------------------------------------------- |
| `simulationHz`         | ~59.7275       | Fixed authoritative core steps per second            |
| `inputHz`              | 30             | Client controller samples and input sends per second |
| `patchHz`              | 20             | Colyseus state patches per second                    |
| `inputBufferSize`      | 8              | Maximum queued input frames per player               |
| `inputTimeoutMs`       | 250            | Release held input after inactivity                  |
| `maxMessagesPerSecond` | 120            | Colyseus per-client message limit                    |
| `interpolationDelayMs` | 100            | Render history delay to absorb patch jitter          |
| `maxSnapshotBuffer`    | 30             | Maximum retained render snapshots                    |
| `maxPendingEvents`     | 256            | Cap on pending presentation events                   |
| `connectionTimeoutMs`  | 10000          | Bound both joining and initial-state loading         |
| `reconnectionSeconds`  | 20             | Seat retention for an unexpected disconnect          |
| `countdownSeconds`     | 3              | Countdown after all renderers load                   |
| `preparationTimeoutMs` | 30000          | Allowance for loading/reconnecting before play       |
| `waitingRoomSeconds`   | 900            | Maximum waiting-room lifetime                        |
| `finishedRoomSeconds`  | 60             | Cleanup delay after completion/abandonment           |
| `defaultRulesId`       | `battle-rules` | Server-selected authored rules                       |
| `protocolVersion`      | 1              | Increment when changing the network contract         |
| `servers`              | Localhost      | Built-in server address list                         |

The core uses ticks for physics, cooldowns and round duration. Changing `simulationHz` changes game speed; preserving the original cadence preserves local/online pacing. Input and patch rates must not exceed the simulation rate. `inputTimeoutMs` must allow at least two input intervals. Configuration validation catches unsupported ranges at startup/build time. Increasing `inputHz` toward the simulation rate reduces sampling delay; it does not remove network latency.

[`config/server.json`](../config/server.json) controls bind host/port, allowed browser origins, maximum WebSocket payload, heartbeat interval and missed-heartbeat retries. `HOST` and `PORT` override only the bind address for hosting environments. No process option is accepted from a client's create/join payload. Restart development processes after configuration changes; rebuild the corresponding production bundle after editing imported configuration.

## Code map

```text
src/battle-core/                Shared deterministic rules; no networking imports
src/content/                   Shared content validation and catalog construction
src/battle-session/            Existing local human/AI session and presentation mount
src/online/protocol.ts          Validated joins, normalized input schema and room names
src/online/state.ts             Nested Colyseus state schemas
src/online/state-adapter.ts     Stable schema objects ↔ detached core snapshots
src/online/battle-connection.ts Join timeout, connection lifecycle and event queue
src/online/snapshot-buffer.ts   Pure interpolation timeline
src/online/mount-online-mode.ts Owns browser → waiting room → battle navigation
src/online/server-browser.ts    Server selection, live room listing, match creation
src/online/waiting-room.ts      Team slots and readiness
src/online/mount-online-battle.ts Input sampling and existing renderer/HUD integration
server/load-content.ts         Node filesystem adapter
server/battle-room.ts           Authoritative room lifecycle and fixed simulation
server/create-server.ts         Dependency wiring, transport and LobbyRoom registration
server/main.ts                  Process entry point and graceful shutdown
```

The current project needs two executables, not independently published packages. A single package keeps shared changes and tests straightforward. Browser code imports the server room **type only** for SDK typing; server implementation and dependencies never enter the browser bundle. Online code is loaded lazily when selected. A pnpm workspace becomes useful if independently released apps or packages emerge; it would add little here today.

## Network contract

The implementation follows Colyseus's [server input and fixed timestep](https://docs.colyseus.io/netcode/server-input), [schema synchronization](https://docs.colyseus.io/state) and [reconnection](https://docs.colyseus.io/room/reconnection) APIs. The broader capability survey, alternatives and primary-source examples are in [the research report](research/online-multiplayer.md).

| Direction                 | Payload                                                                                                    | Handling                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Client → matchmaking      | Name, character, content fingerprint/version; creator also sends arena and team size                       | Validate IDs/options against server content; server owns rules, seed, seats and teams             |
| Client → room             | `ready: true`                                                                                              | Marks only the sender's waiting seat ready                                                        |
| Client → room             | `loaded: true`                                                                                             | Acknowledges the first rendered arena frame; countdown waits for everyone                         |
| Client → input stream     | Flat `CombatantCommand` via `room.input()`                                                                 | Framework encoding/buffering; clamp movement; consume at most one frame per player per fixed step |
| Server → room state       | Phase, roster, ready/loaded/connected flags, countdown and rates                                           | Persistent state, including for reconnection                                                      |
| Server → battle state     | Combatants, nested movement/parts/status/attack, projectiles, platforms, support effects, timer and result | Mutate stable schema identities; Colyseus sends changed fields, not JSON snapshot strings         |
| Server → `events` message | Existing tick-stamped combat events                                                                        | Transient audio and effects, queued after the associated state patch                              |

Clients never provide combatant IDs, authoritative ticks, AI random draws, positions, health, hits, damage, inventory changes or winners. Connection session IDs select ownership. The server constructs the next consecutive core frame and steps the world once regardless of the number of packets received.

Press edges are sent once and consumed once. Missing input frames retain only held controls for a bounded interval; edge-triggered attacks and jumps are never repeated during that gap. Blur, a hidden document, a missing gamepad, an open menu or a dropped connection releases controls. No commands are buffered by the application during reconnection. Frame queues and payload sizes are bounded.

Clients render detached snapshots on a short timeline, interpolating by the actual tick gap and freezing at the latest state if patches stop. Reconnection clears the old interpolation history. Damage and victory are never predicted locally. Snapshot state remains sufficient to show the right armor, projectiles and result even if an old sound/particle event was missed.

## Disconnects and limits

The SDK automatically reconnects a running page after temporary network loss. The server holds its seat and sets its controls to neutral while other players continue. If a player cannot reconnect before the grace period expires, the match ends as abandoned. Explicit leaving ends it immediately. Results from completed matches remain authoritative and immutable.

Refreshing the page starts a new online visit; reload recovery tokens are not persisted. Rooms and matches are ephemeral and do not survive a server process restart. This first version has guest names, no accounts, spectator mode, bot filling, ranked queue, persistence or rematch voting. Start another battle from the browser after a result.

This version uses authoritative interpolation, with no client prediction, rollback or lag compensation. Input sampling, network transit and interpolation add visible latency on distant servers. Test actual target regions before advertising competitive responsiveness. Colyseus 0.18 provides prediction and rewind facilities, but this game's whole-world combat and original movement rules need a carefully shared replay contract before enabling them; adding generic movement prediction alone would create incorrect collisions and combat corrections.

## Build and host

```sh
pnpm build          # Static browser app in dist/
pnpm build:server   # Compiled Node entry point in dist-server/main.js
pnpm build:all      # Both artifacts
pnpm start:server   # Run compiled server with Node
pnpm preview        # Serve the browser production build locally
```

Deploy the server with `dist-server/`, `game-data/`, the package manifest/lockfile and installed production dependencies. Imported configuration is compiled into the server bundle. Serve `dist/` from any static web host. The server exposes Colyseus's built-in `GET /__healthcheck`. Send SIGINT/SIGTERM for graceful room shutdown.

Start with one long-running Node process and its in-memory matchmaker/presence. Ordinary serverless request handlers cannot own the persistent simulation/WebSockets. For an internet-facing deployment, configure TLS/WebSocket upgrades, allowed origins and infrastructure-level connection/request limits. Guest session ownership and CORS are not accounts or global abuse prevention. Restrict operational dashboards if you add them; none is exposed here.

Multiple server processes later require shared matchmaking/presence and room-aware routing, normally Colyseus's Redis driver/presence and documented proxy setup. A battle still belongs to one process. Measure room CPU, patch bandwidth, event-loop delay, memory and regional latency before choosing capacity. See the [deployment](https://docs.colyseus.io/deployment) and [scalability](https://docs.colyseus.io/scalability) guidance.

## Verify

`pnpm check` includes formatting, typed lint, type checks, existing core tests, real WebSocket room tests and both production builds. `pnpm test:e2e` starts the app and server and runs Chromium flows for local play and separate online browser contexts. Its screenshots are saved under `.artifacts/online-*.png`.

The tests cover all team sizes, capacity, ready/loading barriers, input ownership/sanitization/staleness, live listings, waiting-seat replacement, reconnection expiry, persistent results, schema binary round trips, endpoint validation and interpolation. Physical controllers, geographically separated networks and production-scale concurrent rooms still need field testing.
