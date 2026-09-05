# Controls and local multiplayer

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
