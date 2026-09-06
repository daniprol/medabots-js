# Online multiplayer research and design

Research date: 2026-09-06. This document records the framework investigation and the reasoning for this game's first online mode. Recommendations below are project decisions, not claims that Colyseus requires a particular folder layout or game rule. See [architecture](../architecture.md) for the existing engine boundaries and the implementation documentation for the final supported behavior.

## Decision

Use a dedicated, authoritative Colyseus server. Keep the browser game and server in this repository, with separate entry points and commands. Reuse `src/battle-core` unchanged as the owner of combat rules. Add a small server session around it and a browser online session that supplies snapshots and events to the existing presentation.

Start with room creation, a live battle browser, waiting for all human seats, and synchronized battles. Preserve local play as a separate entry-menu choice. An online participant controls one combatant; 1v1, 2v2 and 3v3 therefore require two, four and six connected players respectively. The creator chooses the arena, their character and team size. Other players choose their own character before joining. Server-assigned alternating seats keep teams balanced. A ready/loading barrier prevents a battle starting before the last browser can render it.

This is a good fit because the existing core already accepts complete `CommandFrame`s, runs without browser globals, and exposes detached snapshots and transient events. `LocalBattleSession` already separates input, simulation and presentation. Server authority is also the central model of [Colyseus](https://docs.colyseus.io/).

## Current Colyseus APIs

The official documentation currently describes **0.18**, not the older versions found in many tutorials. The npm registry reported `@colyseus/core` **0.18.10**, `@colyseus/sdk` **0.18.2**, and `@colyseus/schema` **5.0.27** when queried during this investigation. Keep compatible versions locked in `pnpm-lock.yaml`; verify installed declarations when an example and a package disagree. The [0.18 migration guide](https://docs.colyseus.io/migrating/0.18) requires schema 5 and documents the SDK and netcode changes.

| Concern           | Current API and implication                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Browser SDK       | Import `Client` from `@colyseus/sdk`.                                                                                                                                    |
| Server            | `Room` from `@colyseus/core`, or the `colyseus` convenience package. Server and transport are separate responsibilities.                                                 |
| Room typing       | Server generics describe room properties, such as `Room<{ state: BattleState; input: BattleInput }>`; do not copy older server `Room<State>` examples.                   |
| Schema definition | `schema({ field: t.string() }, 'Name')`, with `SchemaType<typeof Name>` for the instance type, avoids decorator compiler requirements.                                   |
| Fixed simulation  | `setFixedTimestep(step, tickRate)` supplies fixed seconds/milliseconds and a tick index.                                                                                 |
| Continuous input  | Server `defineInput()` and browser `room.input()` provide the framework input stream.                                                                                    |
| Metadata          | Assignment is supported during `onCreate`; later use `setMetadata()` or `setMatchmaking()`. Metadata updates replace the object, so explicitly preserve existing fields. |
| Client identity   | Use `client.sessionId`; `client.id` was removed.                                                                                                                         |

The [TypeScript setup](https://docs.colyseus.io/getting-started/typescript), [server reference](https://docs.colyseus.io/server), [schema reference](https://docs.colyseus.io/state/schema), and [migration guide](https://docs.colyseus.io/migrating/0.18) are the primary references. `setSimulationInterval()` remains a deprecated alias for the variable-step `setTimestep()`.

## Framework capability map

| Area                  | Available capability                                                                                                                                 | Use in this project                                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rooms and matchmaking | On-demand instances, seat reservations, capacity, filters, sorting, visibility, custom IDs, lifecycle hooks and authentication.                      | One authoritative battle per room; validate every join. [Matchmaking](https://docs.colyseus.io/matchmaker)                                                                                    |
| Battle browser        | `LobbyRoom` streams room additions, changes and removals, with name/metadata filters.                                                                | Use the built-in live listing. [Lobby](https://docs.colyseus.io/matchmaker/lobby)                                                                                                             |
| Ranked queue          | `QueueRoom` groups waiting players and creates matches.                                                                                              | Defer; manual room choice satisfies this request. [Queue](https://docs.colyseus.io/matchmaker/queue)                                                                                          |
| State synchronization | Typed nested state, binary property deltas, maps/arrays, client callbacks, per-client views and collection streaming.                                | Schema adapter around renderable core snapshots. [State](https://docs.colyseus.io/state), [views](https://docs.colyseus.io/state/view), [streaming](https://docs.colyseus.io/state/streaming) |
| Messaging             | Typed message handlers, broadcasts, byte payloads, validation, request/reply.                                                                        | Setup commands and transient combat events. [Room messages](https://docs.colyseus.io/room)                                                                                                    |
| Netcode               | Input buffering, sanitization, fixed steps, synchronized clock, interpolation, prediction/reconciliation, rollback integration and rewind hit tests. | Fixed authority first; evaluate prediction against the actual core. [Netcode](https://docs.colyseus.io/netcode)                                                                               |
| Connections           | Heartbeats, drop/reconnect hooks, timed seat retention, automatic SDK reconnect and manual tokens.                                                   | Recover brief interruptions without assigning another fighter. [Connection lifecycle](https://docs.colyseus.io/sdk/connection)                                                                |
| Transports            | Node WebSockets, uWebSockets.js, Bun WebSockets, experimental WebTransport.                                                                          | Standard WebSockets first. [Transports](https://docs.colyseus.io/server/transport)                                                                                                            |
| Authentication        | Room auth hooks; optional anonymous, email/password and OAuth module.                                                                                | Connection-owned guest seats initially; accounts are unnecessary for casual battles. [Authentication](https://docs.colyseus.io/auth/module)                                                   |
| Persistence           | Optional SQLite/PostgreSQL integration, saves, leaderboards, live configs and moderation services; external databases also supported.                | File configuration and ephemeral rooms suffice initially. [Database](https://docs.colyseus.io/database), [services](https://docs.colyseus.io/database/services)                               |
| Operations            | Playground, monitor, production admin/RBAC, headless tests and load-test clients.                                                                    | Headless integration tests now; operational panels only when needed. [Tools](https://docs.colyseus.io/tools), [admin](https://docs.colyseus.io/admin)                                         |
| Extension             | Room plugins include idle handling, geographic lookup, unique sessions and WebRTC signaling; command and message composition support larger rooms.   | Ordinary focused modules are sufficient for one battle type. [Room plugins](https://docs.colyseus.io/room/plugins), [message composition](https://docs.colyseus.io/room/messages)             |
| Deployment            | Ordinary Node hosting, containers, reverse proxies, graceful shutdown, Redis-backed multiprocess matchmaking and managed Colyseus Cloud.             | One process first; scale after measurement. [Deployment](https://docs.colyseus.io/deployment), [scalability](https://docs.colyseus.io/scalability)                                            |

Colyseus is not a physics engine, renderer or game-rule implementation. Its optional services do not need to be installed merely because they exist. Authentication's packaged module is currently marked beta, and email delivery still needs application integration. [Auth module](https://docs.colyseus.io/auth/module)

## Repository and commands

There is no universal requirement to split a TypeScript game into independently published packages. The official generator offers a realtime-action preset containing Vite client, server and shared code, including a headless room test. That is useful precedent for a single repository with explicit runtime boundaries. [Official scaffolding](https://docs.colyseus.io/getting-started), [generator source](https://github.com/colyseus/create-colyseus-app)

For this repository, keep existing source locations and add clear `server/`, `src/online/` and shared online protocol/config modules. Browser code must not import the server entry point or Node filesystem loaders. Shared combat code must not import either networking runtime. A server disk loader and the existing Vite content loader should both call `buildContentCatalog`.

Use independently runnable commands for the browser, server, and both together. `pnpm dev` can remain the familiar browser command; an explicit `dev:server` and `dev:online` make local hosting discoverable. Production needs separate browser and server build outputs and a Node start command. Stopping the combined development command must clean up both child processes.

A pnpm workspace becomes worthwhile if independent dependency manifests and deployment artifacts simplify maintenance. A future layout could be `apps/game`, `apps/server`, `packages/battle-core`, and `packages/protocol`, with `workspace:*` dependencies and one lockfile. Moving every existing file solely to introduce online play creates avoidable review churn. [pnpm workspaces](https://pnpm.io/workspaces)

## Server selection and room lifecycle

Store a small built-in endpoint list in a tracked config/constant, initially including localhost. Add the future free server only when an actual address exists. Persist custom labels and normalized URLs in browser storage. Allow editing/removing user entries, reject invalid schemes, and keep errors recoverable. A player choosing localhost is connecting to a separately running server; selecting it cannot launch a process from the web page.

The browser SDK accepts an HTTP(S) endpoint and handles the room transport connection. Production HTTPS should use secure WebSockets; localhost/LAN development can use HTTP. Browser and server deployments can have independent addresses. [SDK](https://docs.colyseus.io/sdk), [deployment](https://docs.colyseus.io/deployment)

Register `LobbyRoom` and enable realtime listing on the battle definition. Join the lobby with a room-name filter; handle `rooms`, `+` with `[roomId, listing]`, and `-` with a room ID. Explicit creation should use `client.create`, and selecting a battle should use `client.joinById`; `joinOrCreate` is appropriate for the shared lobby. In 0.18, locked rooms remain listed, while private/unlisted rooms do not. Disable join actions for full or started rooms and still validate on the server because listings can be stale. [Lobby](https://docs.colyseus.io/matchmaker/lobby), [visibility](https://docs.colyseus.io/matchmaker/visibility), [SDK](https://docs.colyseus.io/sdk)

Recommended battle phases are waiting, loading/countdown, playing and finished. The server owns transitions and seat assignment. Lock membership once the battle starts. Persistent room state includes selected arena, team size, player characters, connected/ready flags, phase and result. Choosing a display name does not prove identity; ownership comes from the session mapping. Empty rooms should dispose automatically.

In `onDrop`, clear input immediately and allow a configurable reconnection grace. `onReconnect` restores the same participant; `onLeave` handles an intentional departure or exhausted grace. These distinctions are framework-supported rather than a custom reconnect protocol. [Room lifecycle](https://docs.colyseus.io/room/lifecycle)

Recommended game policy: cancel countdown if someone leaves; remove departed waiting seats; during play, keep the combatant idle while reconnecting, then apply an explicit abandonment outcome. Do not silently turn an online human match into an AI match. The UI should identify reconnecting, abandoned and server-shutdown states, and keep return navigation available.

## Authority, inputs and events

The server receives intent, assembles exactly one command per combatant, and advances the shared battle once. It owns tick numbers, seed/random consumption, positioning, collisions, cooldowns, armor, projectiles and the result. Clients never submit complete `CommandFrame`s, another fighter's ID, `aiRandomDraws`, damage or winners. This follows the authoritative architecture also explained in [Valve's networking reference](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking).

| Direction and lifetime       | Recommended data                                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client → server, create/join | Arena ID, character ID, team size where applicable, bounded display name, protocol/content compatibility identifier.                                 |
| Client → server, continuous  | The existing flat `CombatantCommand`: movement axis; held jump/attack/up/drop/guard/charge; one-shot jump/up/down/arm/head/special/strategy presses. |
| Client → server, occasional  | Ready/loading acknowledgment; supported waiting-room selection changes; explicit leave through the SDK.                                              |
| Server → clients, durable    | Room phase, seats and ownership, setup, authoritative tick, combatants and parts, moving platforms, projectiles/support objects, timer and result.   |
| Server → clients, transient  | Attack/hit/break/debris/sound events, carrying their authoritative tick so presentation can align them with its buffered state.                      |

The existing `CombatantCommand` is already flat and suitable for a schema input. `defineInput` accepts flat primitive schemas, bounded buffers and a sanitizer. A shared-world simulation should consume at most one queued input per participant per step. Domain constraints such as legal axis values, owned actions and allowed phase still need application checks; numeric wire types alone do not validate intent. [Server input](https://docs.colyseus.io/netcode/server-input)

Capture taps between sends and clear them only after transmission. On the server, a missing packet may temporarily retain **held** controls but must not repeat presses. Drop, blur and stale-input timeout should neutralize controls. Bound both the input queue and accepted message rate so a sender cannot build an unlimited backlog or advance the simulation faster. Do not add a custom sequence/ack protocol over the framework's reliable input channel without a demonstrated need.

Validate authored content at startup, and validate network options separately at their entry points. Resolve content IDs against the server catalog. TypeScript types disappear at runtime; a character ID's string type does not make it valid. Reuse existing validation conventions where practical rather than introducing another schema library merely to copy an example.

## Synchronization and smooth presentation

Use actual Schema fields and stable entity instances. Mutate changed properties and add/remove map entries by stable IDs. Avoid serializing a whole snapshot into one string field every tick: that discards property-level delta compression. Nest parts, status and movement as meaningful groups; schema 5 limits each class to 63 declared fields. Definitions and artwork need not be resent in every patch. [Schema](https://docs.colyseus.io/state/schema), [optimization](https://docs.colyseus.io/state/optimization)

Keep core snapshots as plain domain objects and maintain a thin, explicit snapshot/schema adapter. A browser adapter can produce the existing renderer's plain snapshots. Match events belong in messages, while durable consequences such as destroyed armor and the winner belong in state. Consequently a reconnecting client can rebuild a correct scene without replaying every historical explosion.

Interpolation buffers authoritative snapshots and draws a slightly delayed world between known states. This trades some latency for smoothness under uneven arrivals; render timing should follow snapshot ticks, not assume network packets are evenly spaced. The existing renderer already accepts snapshot pairs and an interpolation fraction. This principle is explained and demonstrated by [Glenn Fiedler's snapshot interpolation article](https://gafferongames.com/post/snapshot_interpolation/) and the [Colyseus Phaser interpolation tutorial](https://docs.colyseus.io/learn/tutorial/phaser/linear-interpolation). Fiedler's UDP packet-loss examples are conceptual references, not a recommendation to invent browser UDP transport.

For the first implementation, authoritative state plus interpolation is a defensible correctness baseline, but local controls then include network latency. It must not be described as prediction. Measure its feel over realistic latency before claiming a competitive-quality online experience.

Colyseus 0.18 now offers `Predict`, a reconciler for local entities, shared simulation rollback, remote smoothing, predicted events and projectiles. `room.input()` stages fields and sends them; prediction observes those sends and later replays unacknowledged inputs against authoritative corrections. Prefer these facilities over writing parallel acknowledgment machinery if prediction is added. [Client prediction](https://docs.colyseus.io/netcode/client-prediction)

This game's core contains combat-wide interactions, random consumption, moving platforms and status effects, so isolated position prediction is not automatically correct. Full replay needs a complete restorable state and the same shared step. Prediction must not replay audio or particles. Colyseus explicitly requires matching input/fixed-step rates, shared step logic and replay-safe one-shots. [Determinism contract](https://docs.colyseus.io/netcode/determinism)

Lag compensation is a separate decision. Colyseus can record selected fields and rewind a hit test to the acting client's rendered time through `allowRewindState()` and `rewind.lastSeenBy()`. It does not choose fair rules for this game's melee, traps and traveling projectiles. Defer it until weapon-specific latency tests justify a documented policy. [Lag compensation](https://docs.colyseus.io/netcode/lag-compensation)

## Configuration and timing

Put server/network policy in readable tracked files, validate values and units on startup, and document supported ranges. Separate public negotiated settings from deployment secrets. Keep environment overrides limited to operational concerns such as port, bind address and production origin configuration; do not hide gameplay balance in environment variables.

| Configuration                           | Purpose                                                              |
| --------------------------------------- | -------------------------------------------------------------------- |
| Simulation Hz                           | Fixed authoritative cadence; defaults to the existing GBA cadence.   |
| Input Hz                                | Client send cadence, negotiated from the server.                     |
| Patch Hz or interval ms                 | State delivery cadence, independent of rendering.                    |
| Interpolation delay ms and buffer limit | Smoothness versus visible latency; bounded retained snapshots.       |
| Input buffer limit and stale timeout ms | Bounded backlog and stuck-control recovery.                          |
| Reconnection grace seconds              | Duration of seat retention after a drop.                             |
| Ready/countdown/loading timeout         | Prevent premature starts or indefinitely blocked rooms.              |
| Message/payload/room limits             | Protect a small public server from accidental or malicious overload. |
| Bind host, port and allowed origins     | Local hosting and production connection policy.                      |
| Built-in server entries                 | Localhost now, the future free-server endpoint later.                |
| Protocol/content version                | Detect incompatible clients and server content early.                |

The existing core uses integer ticks and approximately **59.7275 Hz** (`16777216 / 280896`). It also uses nominal 60 Hz for authored duration conversion. Changing its scheduler to 30 Hz without changing the core would change movement and cooldown speed; this is a game-speed setting, not merely a bandwidth setting. Preserve the current default and describe this constraint explicitly.

For built-in prediction, input rate and fixed-step rate must agree; Colyseus substeps can raise physics frequency while preserving that contract. With interpolation-only authority, a lower input rate can use deliberate held-input/edge buffering, but it has different semantics. Patch rate remains independently configurable; the documented default is 50 ms. [Determinism](https://docs.colyseus.io/netcode/determinism), [room configuration](https://docs.colyseus.io/room)

## Hosting, testing and acceptance

Start with one long-running Node process and the default in-memory matchmaking/presence. Multiple processes require shared presence and driver plus routable process addresses; Redis is the documented route. A room still lives on one process. Do not introduce Redis, distributed simulation or orchestration before room-load measurements require it. [Scalability](https://docs.colyseus.io/scalability)

Build the browser as static assets and compile/bundle a separate server entry point for plain Node. The official deployment guide advises against production `tsx`/`ts-node`, recommends HTTPS with a WebSocket-capable proxy, a health endpoint and graceful shutdown. A static website host by itself cannot run the authoritative process. [Deployment](https://docs.colyseus.io/deployment)

WebSocket is broadly supported but has no built-in application backpressure. Keep input queues and client snapshot/event buffers bounded. Experimental WebTransport and its unreliable mode are future options, not prerequisites for this six-player game. [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API), [Colyseus transports](https://docs.colyseus.io/server/transport)

Keep existing deterministic battle tests. Add focused behavior tests for input retention/press consumption, seat/team assignment, legal phase transitions, config validation and snapshot conversion. Integration tests should start a real Colyseus server with real SDK clients and assert both sides after messages/patches. `@colyseus/testing` supplies room boot, cleanup and synchronization helpers and can run with Vitest. [Colyseus testing](https://docs.colyseus.io/tools/unit-testing)

Browser acceptance should cover local play from the new menu, saved custom endpoints, unavailable-server recovery, create/join/wait for all three sizes, combat seen by two browser contexts, returning to the browser, and leaving/reconnecting. Check startup input before the first patch and server shutdown during a match. Use artificial latency in development to evaluate movement and event alignment; localhost-only testing cannot reveal those problems.

Before opening a shared free server, measure active six-player rooms with real battle simulation and representative input. Record tick execution time, event-loop delay, memory, outbound bytes, RTT and reconnect behavior. `@colyseus/loadtest` runs scripted SDK clients; there is no universal player-capacity number independent of this simulation. [Load testing](https://docs.colyseus.io/tools/loadtest)

The initial implementation is complete only when users can launch the browser alone, the server alone or both; choose local versus online; select/add a server; create and discover battles; fill the required seats; play authoritative combat; and recover or leave cleanly. Prediction, ranked queues, accounts, persistence, global matchmaking and hosting the future free service are separate product increments.
