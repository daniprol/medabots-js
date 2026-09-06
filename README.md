# Robattle Arena

Pick a robot. Bring a friend. Break their armor.

An unofficial browser-game fan prototype inspired by **Medabots AX for Game Boy Advance**. Fight real-time 1-vs-1, 2-vs-2, or 3-vs-3 platform battles with crisp cel-style robots and layered HD-2D scenery, destructible parts, and keyboard or gamepad controls. Play alone with AI partners or share one computer with up to six combatants.

![HD-2D team battle with segmented armor and readable player panels](docs/images/gameplay.png)

## Try it

You need [Node.js](https://nodejs.org/en/download) and pnpm 10. Use a current Node.js LTS release; the project supports Node 20.19+ or 22.12+. No ROM, emulator, account, or gamepad is required.

1. Download or clone this repository and open a terminal in its folder.
2. Install pnpm if you do not already have it: `npm install --global pnpm@10`.
3. Run:

   ```sh
   pnpm install
   pnpm dev
   ```

Open **http://localhost:5173** (or the address printed in your terminal). Choose a match size, pick your robots and battlefield, and press **Start Robattle**. Stop the development server with Ctrl+C.

## Play

Destroy the enemy leader’s head to win; knocking out a partner does not end the round. Guard to protect your parts, vary your jump height, and watch each weapon’s readiness. Head weapons have limited uses. Medaforce builds automatically, faster when you stand still.

| Default keyboard | Action                       |
| ---------------- | ---------------------------- |
| ← / →            | Move; double-tap to dash     |
| G                | Jump; hold for a higher jump |
| F                | Right-arm attack             |
| ↑ + F / ↓ + F    | Head / left-arm attack       |
| ↓ + G            | Drop through a platform      |
| D                | Hold to guard                |
| S / A            | Partner panel / Medaforce    |
| Escape or Enter  | Pause                        |

Each robot card lets you choose a player controller or AI with **Easy**, **Normal**, or **Hard** difficulty. The battlefield thumbnail previews its scenery and platforms. Open **Controls → Players** and choose **2 on one keyboard** for two players. The same panel offers three-player and gamepad presets. **How to play** shows large key icons and attack combinations; select a key to change it. Connect a controller and press one of its buttons to make it appear. Unassigned slots use AI. All players share the same computer; online play is not implemented.

**Choose from all 30 AX Medabots and 19 battlefields**, with 120 source-derived parts, 12 medals, support weapons, traps, status effects and Medaforce attacks. This remaster remains in progress: AI navigation and some weapon/special details still approximate the original. See the [fidelity status](docs/ax-remaster-status.md) for verified behavior and remaining work.

See the [controls guide](docs/controls.md) for all presets, controller mappings, and keyboard ghosting tips. This is a desktop prototype; touch controls are not included.

## Build or contribute

```sh
pnpm check       # Formatting, linting, types, tests, and production build
pnpm preview     # Play the built version locally
```

The build is in `dist/` and can be served by a static web host. There is no backend.

Want to tune damage, add a robot, or improve game feel? Start with [Contributing](CONTRIBUTING.md), [Editing content](docs/content.md), or [Architecture](docs/architecture.md). Gameplay and input presets live in readable JSONC files.

## License and attribution

Original code is available under the [MIT license](LICENSE). This fan project is not affiliated with or endorsed by the Medabots rights holders. Franchise names and character designs belong to their respective owners and are not licensed by this project. No ROMs, extracted sprites, game audio, or official models are bundled. See [NOTICE](NOTICE.md) for rights limitations and third-party credits.
