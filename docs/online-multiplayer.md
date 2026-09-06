# Online multiplayer

Online battles use a separate Colyseus server and the same battle rules as local play. Each person controls one Medabot: 1v1 needs two players, 2v2 needs four, and 3v3 needs six.

## Run and play

Use Node 24 (see `.nvmrc`) and pnpm 10.

```sh
pnpm install
pnpm dev:all       # App at http://localhost:5173 and server at http://localhost:2567
```

Run `pnpm dev` for the app alone or `pnpm dev:server` for the server alone. `pnpm dev:client` is an alias for `pnpm dev`.

1. Choose **Online multiplayer**, then select **Localhost** or **Add a server**.
2. Select your Medabot portrait. Open **Player name & controls** to change your name or controller.
3. Join an open battle, or create one with a battlefield and match size.
4. Press **Ready to battle**. Open slots show who is still missing; checkmarks identify ready players. When everyone is present and ready, the arena loads and the countdown starts.

Players join A1, B1, A2, B2, A3, B3 in order. A1 and B1 are the leaders. There are no AI teammates online. **Menu** releases your controls while the battle continues; **Leave battle** returns to the browser.

The portrait picker supports keyboard focus and Escape. The room keeps its ready action visible on small screens. Battle controls require a keyboard or gamepad; there are no touch battle controls.

## Connect to another computer

`localhost` means your own computer. To use a friend's LAN server, add its address, for example `http://192.168.1.41:2567`. In [`config/server.json`](../config/server.json), allow the browser app's origin (scheme, host and port). The host firewall must also allow the server port.

HTTP/HTTPS and WS/WSS addresses are accepted. An HTTPS-hosted app needs an HTTPS/WSS server. Credentials, query parameters and fragments are rejected. A reverse proxy must forward both matchmaking HTTP and WebSocket traffic.

Custom servers are saved in browser storage when available. Your name, character and controller choices last for the current online visit. Built-in servers live in [`config/online.json`](../config/online.json); add the future public server there when it exists.

## Configuration

| File                                          | What it controls                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [`config/online.json`](../config/online.json) | Built-in servers, protocol version, rules ID, simulation/input/patch rates, buffering, timeouts and countdown |
| [`config/server.json`](../config/server.json) | Bind address, allowed origins, WebSocket payload limit and heartbeat                                          |
| [`game-data/`](../game-data/)                 | Characters, arenas, controls, combat rules and abilities                                                      |

`HOST` and `PORT` can override the server's bind address. Restart development processes after configuration changes; rebuild production bundles after editing imported configuration.

The defaults are about **59.73 simulation ticks/s**, **30 input samples/s** and **20 state patches/s**, with **100 ms** of presentation delay. Changing simulation rate changes game speed. Input and patch rates cannot exceed simulation rate; the input timeout must allow at least two input intervals. Configuration is validated at startup/build time.

The server advertises its actual rates. A gameplay-content fingerprint and protocol version reject incompatible clients before they take a seat; local keyboard preferences do not affect compatibility.

## Code and messages

Keep the app and server in one package with separate entry points. This keeps shared rules and tests together without workspace tooling.

| Location                                                 | Responsibility                                                |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| `src/battle-core/`, `src/content/`                       | Shared rules and validated content                            |
| `server/battle-room.ts`                                  | Authoritative room lifecycle and simulation                   |
| `server/create-server.ts`, `server/main.ts`              | Server wiring and process startup/shutdown                    |
| `src/online/protocol.ts`, `state.ts`, `state-adapter.ts` | Validated commands and synchronized state                     |
| `src/online/lobby-connection.ts`                         | Live listings, connection status and stale-message protection |
| `src/online/battle-connection.ts`, `snapshot-buffer.ts`  | Battle connection, event queue and interpolation              |
| `src/online/mount-online-mode.ts`                        | Browser → waiting room → battle navigation                    |
| `src/online/server-browser.ts`, `character-picker.ts`    | Server and battle selection                                   |
| `src/online/waiting-room.ts`, `waiting-roster.ts`        | Room status and player cards                                  |
| `src/online/mount-online-battle.ts`                      | Input sampling and renderer/HUD integration                   |

Clients send join choices, `ready: true`, `loaded: true`, and controller commands through Colyseus's input stream. The server owns teams, seed, ticks, positions, hits, damage and results. It consumes at most one input frame per player per step. Missing frames briefly retain held controls; press edges are never repeated.

Persistent room/battle state uses nested Colyseus schemas. Tick-stamped `events` messages drive temporary audio and effects. Clients interpolate detached snapshots; they never calculate damage or predict winners. See the [architecture guide](architecture.md) and [Colyseus research](research/online-multiplayer.md) for details and primary sources.

## Disconnects and limits

- In the server browser, a lost connection disables Create/Join; **Refresh battles** reconnects and reloads listings.
- During a battle, the SDK attempts reconnection and the server reserves the seat for 20 seconds by default. Inputs stay neutral during the interruption.
- Leaving a waiting room frees its slot. Leaving after arena preparation begins, or failing to reconnect, abandons the match. Completed results remain unchanged.
- Refreshing the page starts a new online visit. Rooms do not survive a server restart.

Accounts, spectators, bot filling, ranked queues and rematch voting are not implemented. Neither are client prediction, rollback or lag compensation; distant servers add visible input delay.

## Build and host

```sh
pnpm build:all     # Browser in dist/, Node server in dist-server/
pnpm start:server # Run the compiled server
pnpm preview      # Serve the built browser app locally
```

Use `pnpm build` or `pnpm build:server` to build either part separately. Serve `dist/` from a static host. Deploy the server with `dist-server/`, `game-data/`, the package manifest/lockfile and production dependencies.

Start with one long-running Node process. Public hosting needs TLS/WebSocket forwarding, allowed origins and infrastructure connection limits. The health endpoint is `GET /__healthcheck`; SIGINT/SIGTERM trigger graceful shutdown. Multiple processes require shared matchmaking/presence and room-aware routing: see Colyseus's [deployment](https://docs.colyseus.io/deployment) and [scalability](https://docs.colyseus.io/scalability) guides.

## Verify

`pnpm check` runs formatting, lint, types, unit/integration tests and both builds. `pnpm test:e2e` starts the app and server for Chromium tests, including separate online players and phone/handheld layouts. Screenshots are saved in `.artifacts/online-*.png`. Physical controllers, real network latency and production capacity still need device/load testing.
