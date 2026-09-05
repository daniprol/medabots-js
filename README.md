# Robattle Arena

Pick a robot. Bring a friend. Break their armor.

An unofficial browser-game fan prototype inspired by **Medabots AX for Game Boy Advance**. Fight real-time 2-vs-2 platform battles with cartoon 3D robots, destructible parts, and keyboard or gamepad controls. Play alone with AI partners or share one computer with up to four players.

![Four robots fighting in the industrial arena, with individual part-armor meters above them](docs/images/gameplay.png)

## Try it

You need [Node.js](https://nodejs.org/en/download) and pnpm 10. Use a current Node.js LTS release; the project supports Node 20.19+ or 22.12+. No ROM, emulator, account, or gamepad is required.

1. Download or clone this repository and open a terminal in its folder.
2. Install pnpm if you do not already have it: `npm install --global pnpm@10`.
3. Run:

   ```sh
   pnpm install
   pnpm dev
   ```

Open **http://localhost:5173** (or the address printed in your terminal). Pick your character and press **Start Robattle**. Stop the development server with Ctrl+C.

## Play

Break both arms and the legs to expose an opponent's head. Destroy the enemy leader's head to win; disabling a partner does not end the round. Guard, jump between platforms, and charge your special to turn a fight around.

| Default keyboard   | Action                                                 |
| ------------------ | ------------------------------------------------------ |
| Left / Right       | Move; double-tap to dash                               |
| Up or Space / Down | Jump / drop through a platform                         |
| F / G / H          | Right arm / left arm / head weapon                     |
| Left Shift         | Hold to guard                                          |
| R / T              | Hold to charge / release charge, then activate special |
| Q / Escape         | Change AI partner strategy / pause                     |

For two players, choose **2 on one keyboard**. Open **Controls** to rebind keys, choose a three-player preset, or assign gamepads. Connect a controller and press one of its buttons to make it appear. Unassigned slots use AI. All players share the same computer; online play is not implemented.

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
