# Controls and local multiplayer

Choose a character and field, then press **Start Robattle**. Open **Controls** to assign a keyboard profile, connected gamepad, or CPU independently to A1, A2, B1, and B2. Leaders are marked ◆. Any unassigned slot uses AI.

In **Controls → Players**, **2 on one keyboard** assigns the opposing leaders to separate shared presets. The dialog also has a three-player preset and automatic gamepad assignment. Choose team slots individually for co-op. Duplicate keyboard profiles and gamepads are blocked, and overlapping active keys are reported. Up to four humans can play on the same computer.

## Original-style input

| Action            | Solo default   | Shared left | Shared right | Shared numpad |
| ----------------- | -------------- | ----------- | ------------ | ------------- |
| Left / right      | ← / →          | A / D       | ← / →        | Num 4 / 6     |
| Up / down         | ↑ / ↓          | W / S       | ↑ / ↓        | Num 8 / 5     |
| A: jump           | G              | G           | L            | Num 3         |
| B: attack         | F              | F           | K            | Num 1         |
| L: guard          | D              | R           | I            | Num 7         |
| R: partner panel  | S              | T           | O            | Num 9         |
| Select: Medaforce | A              | E           | P            | Num 0         |
| Start: pause      | Enter / Escape | Tab         | Enter        | Num Enter     |

B uses the right arm. **Up+B** uses the head; **Down+B** uses the left arm. Up takes priority if both vertical directions are held. **Down+A** drops through a droppable platform. Hold A for a higher jump. Double-tap a horizontal direction within 16 updates to dash. Some leg types have additional double-tap maneuvers; not all original leg families are fully implemented yet.

Each weapon refills independently. Readiness must reach full before starting another normal action, with a separate buffer for right-arm combos. Head weapons have limited uses. Broken arms retain a weak frame strike. Heads can receive unguarded damage before other parts break; the earlier prototype's global head shield was incorrect. Facing an incoming attack while guarding reduces its power and redirects selection toward the strongest surviving limb.

Medaforce fills passively and while standing idle. At full displayed meter, press Select to activate it. There is no charge button in this original-style layout. R cycles five AI-partner panels: right arm, left arm, head, enemy leader, enemy partner. Panel changes take effect after a short delay. A human partner ignores the leader's panel input. AI behavior is still an approximation of AX.

## Gamepads

Connect USB/Bluetooth controllers, focus the browser, and **press a controller button** so the browser exposes them. The setup screen refreshes automatically. Use localhost or HTTPS for reliable Gamepad API access.

Default standard mapping: left stick/D-pad for directions; south face button (A/Cross) for jump; east (B/Circle) for attack; LB guard; RB partner panel; Back/View Medaforce; Start/Menu pause. Direction-plus-button chords work exactly as on the keyboard adapter. JSONC indices are zero-based; HUD pad numbers start at 1.

A disconnected assigned pad pauses the match and identifies the device. Reconnect and resume, or return to setup to select another pad. Browser-assigned indices may change on reconnection. Losing window focus also pauses and clears held keyboard input.

## Customize

Edit `game-data/controls/keyboards/*.jsonc` or `gamepads/standard-gamepad.jsonc` for permanent bindings. Actions use arrays, such as `"jump": ["KeyG", "Space"]`; an empty array leaves an optional shortcut unbound. Keyboard input uses physical `KeyboardEvent.code`, independent of keyboard language. Gamepads expose horizontal/vertical axis indices, button arrays, deadzone, and activation threshold.

The **How to play** tab shows a directional pad, large action keys, and the head/left-arm/drop combinations. Select a key to capture a replacement; Escape cancels capture. **Extra keys & shortcuts** holds alternate bindings and advanced gamepad mapping. **Done** validates and applies edits; the close button discards them; **Reset these keys** restores the selected preset. Reloading restores JSONC values.

A shared keyboard can suppress simultaneous combinations due to hardware ghosting. Non-overlapping profiles prevent software conflicts, but cannot remove that hardware limitation. Use different combinations, an anti-ghosting keyboard, or gamepads when needed. Touch and online play are not implemented.
