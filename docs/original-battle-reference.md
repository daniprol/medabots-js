# Medabots AX battle reference

An evidence register for reproducing the behavior and presentation of **Medabots AX — Metabee Version (Europe, revision 0)** in this project's battle feature.

Research date: **2026-09-06**. Prototype baseline: **`e809465`**. Source workspace: **`../medabots-decompile`**. This document records the original, not the desired balance of a new game. It does not change the prototype. Recovered facts, observations, uncertain interpretations, and proposed adaptation work are deliberately distinguished.

The source is a **partial behavioral reconstruction**, not original developer source, a matching decompilation, or a complete executable simulator. An exported function is not necessarily understood. “Exactly like the original” is an acceptance target; the evidence available today does not support claiming complete accuracy.

## Contents

- [Evidence and version boundaries](#evidence-and-version-boundaries)
- [Important corrections to our current assumptions](#important-corrections-to-our-current-assumptions)
- [Execution model, coordinates, and actors](#execution-model-coordinates-and-actors)
- [Controls and input interpretation](#controls-and-input-interpretation)
- [Movement and leg maneuvers](#movement-and-leg-maneuvers)
- [Collision, terrain, and the 19 fields](#collision-terrain-and-the-19-fields)
- [Measured starting weapons and animation timing](#measured-starting-weapons-and-animation-timing)
- [Combat, equipment, and AI](#combat-equipment-and-ai)
- [Camera, HUD, characters, and visual presentation](#camera-hud-characters-and-visual-presentation)
- [Audio and battle lifecycle presentation](#audio-and-battle-lifecycle-presentation)
- [Differences to resolve in this prototype](#differences-to-resolve-in-this-prototype)
- [Verification record and reproduction](#verification-record-and-reproduction)
- [Unresolved work and acceptance criteria](#unresolved-work-and-acceptance-criteria)
- [Maintaining this reference](#maintaining-this-reference)

## Evidence and version boundaries

### Identity

| Property              | Verified value                                                     |
| --------------------- | ------------------------------------------------------------------ |
| Header title          | `MEDABOTS_MTB`                                                     |
| Game code / maker     | `AK8P` / `E9`                                                      |
| Software revision     | `0`                                                                |
| ROM length            | 8, 388, 608 bytes                                                  |
| Header checksum       | Stored and computed `0x2E`                                         |
| Languages represented | English, French, German, Spanish, Italian                          |
| SHA-256               | `20d77b6d1540908b1f1f2b27fede5d539a0f5edd198f93e7ecbe025a0891ca9a` |

The hash was recomputed during this investigation. Do not silently generalize addresses, tables, or measurements to the Rokusho edition, another region, or a revision. The supplied reference image and the TV show's designs are separate visual sources; they do not establish the GBA game's mechanics.

Sources: [ROM identity](../../medabots-decompile/analysis/evidence/rom_identity.json), [source README](../../medabots-decompile/README.md).

### Evidence labels

| Label          | What it means here                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **STATIC**     | Supported by identified ROM data and a consuming code path, or a reviewed assembly-backed reconstruction. A formula may be established without having measured every gameplay branch. |
| **OBSERVED**   | An actual emulator log or captured frame supports the stated behavior in a specified experiment. It does not prove all equipment and situations behave alike.                         |
| **INFERRED**   | A reasoned interpretation of incomplete code, visual appearance, or correlated fields. Must not become an implementation invariant without further checking.                          |
| **UNKNOWN**    | Not established. Absence of a recovered implementation is not evidence the feature is absent.                                                                                         |
| **ADAPTATION** | A proposed way to apply the evidence to our TypeScript/Three.js game. This is a project decision, not a claim about the original.                                                     |

A section's label applies to the bounded findings described there. Explicit caveats override a broad label. Source descriptive names such as `battle_tick` are reconstructed names, not names recovered from the original source code.

### Reading source correctly

- Numeric IDs and counts are decimal unless prefixed with `0x`; eight-digit addresses in tables are hexadecimal. An action type, attack-object type, equipment ID, and animation-stream ID are separate namespaces.
- A ROM address maps to file offset by subtracting `0x08000000`. A Thumb function pointer's low bit is cleared to obtain its instruction address.
- `W` means the battle workspace pointer read from `0x030010A4`. An offset called **actor+…** is relative to the actor structure, not `W`.
- A frame number in an observer CSV is a **one-based emulator frame since boot**, sampled after `runFrame`. It is not a battle tick or a CPU breakpoint.
- A reconstructed C structure may be a conceptual projection rather than the real binary layout. Read the file's exclusions and unresolved calls.
- Prefer code consumers and instruction order over guessed field names. The repository already records incorrect Ghidra arguments, copied-RAM discovery problems, and old mislabeled CSV columns.
- Source links below assume this document is opened with the sibling workspace present. Generated data, raw exports, local emulator builds, and captured frames are private/local evidence paths and may need regeneration on another checkout.

The generated coverage report lists **1, 575 function candidates**, including four RAM/other candidates. Discovery deliberately excluded the ROM tail after `0x080582D0` from speculative code analysis. Neither count nor decoded byte coverage is a meaningful completion percentage. [Coverage](../../medabots-decompile/data/generated/coverage.json), [unresolved audit](../../medabots-decompile/docs/unresolved.md).

## Important corrections to our current assumptions

| Topic               | Original evidence                                                                                                                           | Consequence for this prototype                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Head protection     | Normal hit selection gives the head a nonzero weight even with all limbs intact. A recorded battle has head HP 36 with right/left HP 11/25. | `protectHeadUntilPartsDestroyed: true` is a house rule, not established AX behavior.               |
| Which part gets hit | Qualifying actor overlap feeds weighted part selection and special branches.                                                                | Aim height and four geometric hit rectangles do not reproduce the normal selection rule.           |
| Jump physics        | Signed displacement tables; three release-dependent heights; a separate fixed-speed fall.                                                   | Tuning one gravity and jump velocity cannot match the original trajectories.                       |
| Ground movement     | Immediate table-based motion and explicit state transitions on ordinary terrain.                                                            | Generic acceleration/friction is not an accurate baseline.                                         |
| Weapon availability | Readiness fills to 320 separately from action animation; head uses are finite.                                                              | One cooldown containing startup/active/recovery is insufficient.                                   |
| Attack commitment   | The starting right arm permits movement; head/left suppress held and pressed input.                                                         | A universal movement-speed penalty during attacks is inaccurate.                                   |
| Broken parts        | Destroyed arms get a weak frame attack. Broken legs use replacement records with ordinary jump curves.                                      | Disabling all arm actions and applying a large universal jump penalty are different rules.         |
| Medaforce           | 51-unit meter; eligible passive/idle charging and a separate special-action flow.                                                           | The current dedicated hold-to-charge button and 100-point special are adaptations.                 |
| Timeout             | Ordered survival/HP/level comparisons followed by a random tie resolution in the audited routine.                                           | Total team armor percentage and draw-on-equality are different rules.                              |
| Camera and HUD      | Scrolling 240×160 view centered relative to the local leader; compact corner part widgets and H/R/L readiness bars.                         | A zoom-to-fit arena with four large status cards is a modern layout, not the original composition. |
| Character identity  | Equipment composition, medals, levels, locomotion families, and tactical panels determine behavior.                                         | Four fixed character kits do not represent the original content model.                             |

These findings are supported in the detailed sections below. Preserve them even when they conflict with memory, our earlier specification, a manual transcription, or current code comments.

## Execution model, coordinates, and actors

### Timing and ordering

**STATIC; bounded OBSERVED support.** Main entry `0x08000258` normally waits for VBlank, polls keys, handles link-related state, then calls the active scene. The battle scene is `1`, handled by `0x08000AE8`; its ordinary fighting subscene is `6`, handled by `0x0800291C`.

The display cadence is approximately **59.7275 frames/second**, derived from mGBA's `16,777,216` cycles/second and `280,896` cycles/frame. The game counts **60 eligible timer updates** as one displayed time unit. These are different statements. Pause, special freezes, optional throttled input paths, and serial-wait paths mean an emulator frame is not universally one complete battle update. Our fixed 60 Hz simulation is a deliberate approximation unless we adopt the original cadence.

Sources: [main-loop analysis](../../medabots-decompile/docs/architecture.md), [mGBA video timing constants](../../medabots-decompile/.local-tools/mgba/source/include/mgba/internal/gba/video.h), [CPU frequency](../../medabots-decompile/.local-tools/mgba/source/include/mgba/internal/gba/gba.h), [battle dispatcher](../../medabots-decompile/analysis/raw/functions/08000ae8.c), [battle tick](../../medabots-decompile/analysis/raw/functions/0800291c.c).

Within the ordinary battle path, the observed call sequence includes partner-panel processing, countdown, gauge/readiness work, terrain/platform preparation, actor updates, animation/event work, attack-object updates, camera/outcome handling, and rendering. Preserve the exact gates when translating; the C export contains additional incompletely named calls.

Actor dispatcher `0x08005630` resets a state's timer when its state changes, invokes the state handler, then increments the timer. Later common logic can replace the state again. A state selected during the handler usually executes on the next update. An attack accepted later in the same actor update can enter its attack handler immediately. This explains both the first movement transition frame and animation-start timing.

**Do not collapse “state selected,” “handler first executed,” “animation initialized,” “object spawned,” and “hit applied” into one event.** [Movement ordering](../../medabots-decompile/docs/physics-and-movement.md), [attack ordering](../../medabots-decompile/docs/attack-timing.md).

### Coordinates and index mapping

| Item                         | Original representation                                                |
| ---------------------------- | ---------------------------------------------------------------------- |
| Visible viewport             | 240×160 pixels; aspect ratio 3:2                                       |
| Collision field              | 432×368 world pixels                                                   |
| World X / bottom Y           | Signed 16-bit `actor+AE` / `actor+B2`; Y increases downward            |
| Rendered X/Y                 | Separate `actor+B4` / `actor+B6`, with additional presentation offsets |
| Horizontal fractional state  | Byte `actor+4E`; not a standard floating-point velocity                |
| Water vertical residual      | Byte `actor+4F`                                                        |
| Actor stride                 | `0x18C` bytes; actor `i` begins at `W+8+i*0x18C`                       |
| Equipment order              | `0=head`, `1=right arm`, `2=left arm`, `3=legs`                        |
| Team membership              | Actors `0,2` versus `1,3`                                              |
| Normal single-player control | Actor 0 human; actor 2 partner; actors 1/3 opponents                   |

A convenient project mapping is original `0→A1`, `2→A2`, `1→B1`, `3→B2`. This is an **ADAPTATION mapping**, not a license to reorder the original update loop. The prototype's team-major ordering differs from original index ordering and can alter same-tick outcomes if translated carelessly.

For a Y-up Three.js scene, choose one explicit render conversion such as `renderX=(originalX-originX)*scale`, `renderY=(originY-originalBottomY)*scale`. Keep pixel/tick behavior independent of camera zoom and browser dimensions. Do not mix the prototype's world units with original pixels in data files.

Sources: [combat workspace](../../medabots-decompile/docs/combat.md), [movement fields](../../medabots-decompile/reconstruction/movement.c), [initialization](../../medabots-decompile/analysis/raw/functions/080017fc.c), [camera projection](../../medabots-decompile/analysis/raw/functions/08017194.c).

## Controls and input interpretation

### GBA actions

**STATIC**, with the basic B chords and movement separately **OBSERVED** in natural-input experiments.

| Input                                  | Battle behavior                                     | Important qualification                                                                              |
| -------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Left / Right held                      | Walk / steer in supported movement states           | Facing and carry are state-dependent.                                                                |
| Same horizontal direction tapped again | Dash                                                | Ground tap counter starts at 16 and decrements in the initiating call; additional state rules apply. |
| A pressed                              | Jump                                                | A held/released chooses height; some leg types support an extra airborne jump.                       |
| Down+A                                 | Drop through eligible floor surfaces                | Immediate bounded pixel descent, not a timed collision-disable flag.                                 |
| B pressed without Up/Down              | Right-arm action                                    | Readiness, part, status, occupancy, and state gates apply.                                           |
| Up+B                                   | Head action                                         | Up takes precedence if Down is also held; finite uses apply.                                         |
| Down+B                                 | Left-arm action                                     | It is not Down+A.                                                                                    |
| L pressed / held                       | Enter / maintain guard through eligible state paths | Guard cannot be treated as an unconditional damage multiplier.                                       |
| R pressed                              | Cycle the partner's equipped tactical panel         | Five entries; delayed commitment is covered below.                                                   |
| Select pressed                         | Medaforce activation when eligible                  | No separate dedicated charging key was established.                                                  |
| Start pressed                          | Pause request                                       | Battle scene owns eligibility, audio handling, and freeze state.                                     |
| Up or Down double tap                  | Leg-family-specific move                            | Context and grounded/airborne conditions differ by type.                                             |

Sources: [input reconstruction](../../medabots-decompile/reconstruction/input.c), [attack gate `08005C10`](../../medabots-decompile/analysis/raw/functions/08005c10.c), [ground handler `08006074`](../../medabots-decompile/analysis/raw/functions/08006074.c), [leg maneuvers](../../medabots-decompile/docs/leg-moves.md), [pause-containing battle scene](../../medabots-decompile/analysis/raw/functions/08000ae8.c).

The manual lead file contains an ambiguous/incorrect attack chord transcription. The actual consumer and successful experiments take precedence. Do not copy that manual-lead table into our controller JSONC as verified behavior. [Manual lead caveats](../../medabots-decompile/docs/manual-leads.md).

### Physical keys, edges, and repeat

The original masks are A=`0x001`, B=`0x002`, Select=`0x004`, Start=`0x008`, Right=`0x010`, Left=`0x020`, Up=`0x040`, Down=`0x080`, R=`0x100`, L=`0x200`. These are useful for comparing observer schedules; they are not browser keyboard codes.

Poller `0x08000574` computes active-high held input from hardware `KEYINPUT XOR 0x03FF`; changed bits produce pressed and released masks. A new press resets a **shared** repeat counter. Without new presses it first repeats after 31 polls, then every 7; pressing a second button resets the first button's repeat delay. Release alone does not reset it. Gameplay handlers choose which mask to consume, so menu repeat is not a substitute for new attack edges. [Exact poll arithmetic](../../medabots-decompile/reconstruction/input.c).

Input suppression occurs before locomotion. Head attack, left attack, and active Medaforce can zero both held and pressed masks; the starting right action preserves them. This affects jump-height decisions and air steering as well as walking. Contradictory directions also follow handler order: idle processes Right then Left, rather than necessarily normalizing them to zero. [Suppression excerpt](../../medabots-decompile/reconstruction/attack_timing.c), [ground handler](../../medabots-decompile/analysis/raw/functions/08006074.c).

### Implications for our normalized commands

**ADAPTATION.** Keep physical input outside `battle-core`, but the present command shape loses information required for AX behavior: jump held/released, vertical taps, B chord priority, and some guard edges. A future command revision should preserve those semantics using flat primitive fields. Decide whether dedicated arm/head keys are convenience bindings that generate equivalent original actions, while retaining an optional original A/B chord profile. This document does not choose new browser key assignments.

Original two-system link play and our four-human shared-screen mode are different products. Preserve local keyboard/gamepad accessibility if desired, but mark four-human play and its shared camera as an extension. The repository has no two-instance link verification proving additional human-controller counts. [Link evidence](../../medabots-decompile/docs/link-cable.md), [current input normalization](../src/input/bindings.ts).

## Movement and leg maneuvers

### Ground movement and fractional arithmetic

**STATIC + OBSERVED for starting legs on ordinary terrain.** Starting leg part 0 uses speed index 3. Walking moves **2 pixels per movement call**, without the prototype's acceleration ramp. Rightward dash requests 11 quarter-pixels: from residual 4 it produces **2, 3, 3, 3 pixels**, repeating. Ordinary release stops through state logic; ice-like terrain is separate.

The table at `0x08058CDC` contains eight rows of nine **signed bytes**. Equipment sets speed index to leg-record byte 4 plus one. The normal leg records produce indices 1–6; other paths can use 0 or 7.

Values below are average unobstructed **pixels per movement call**, after dividing the stored quantity by four. They are not all simultaneously active speed contributions.

| Index | Walk | Dash | Walk-jump carry | Dash-jump carry | Jump steering | Fall steering | Dash-fall steering | Mode 8 |
| ----: | ---: | ---: | --------------: | --------------: | ------------: | ------------: | -----------------: | -----: |
|     0 | 1.25 |    2 |            0.25 |             0.5 |           0.5 |          0.25 |                  1 |   1.25 |
|     1 |  1.5 | 2.25 |             0.5 |            0.75 |          0.75 |           0.5 |               1.25 |    1.5 |
|     2 | 1.75 |  2.5 |             0.5 |            0.75 |             1 |          0.75 |                1.5 |   1.75 |
|     3 |    2 | 2.75 |             0.5 |            0.75 |          1.25 |             1 |               1.75 |      2 |
|     4 | 2.25 |    3 |            0.75 |               1 |           1.5 |          1.25 |               2.25 |    2.5 |
|     5 |  2.5 | 3.25 |            0.75 |               1 |          1.75 |           1.5 |                2.5 |   2.75 |
|     6 | 2.75 |  3.5 |            0.75 |               1 |             2 |          1.75 |               2.75 |      3 |
|     7 |    3 | 3.75 |               1 |            1.25 |          2.25 |             2 |                  3 |   3.25 |

Column 0 is zero. Mode 8 is consumed by the backhop path; it is not a requested distance of eight pixels. Preserve the original call mode and residual when comparing predictions.

Fractional conversion truncates division toward zero, keeps byte-width residual arithmetic, carries positive motion when the **signed residual exceeds 7**, and negative motion when it is **0 or below**. Carry adjusts by four. A conventional fraction normalized to 0…3 changes reversals and is not equivalent. Water modifies the quarter quantity before conversion. [Arithmetic](../../medabots-decompile/reconstruction/movement.c), [raw speed table](../../medabots-decompile/data/generated/physics/speeds.csv), [extractor](../../medabots-decompile/tools/extract_physics.py).

### Dash is a stateful input sequence

The idle path loads a horizontal tap counter with 16 and decrements it in the initiating call. Walking continues to decrement it. Dash release can establish a separate eight-count window, and type 1 selects a different burst state. Do not implement a universal fixed-duration dash plus cooldown and call it faithful.

A direction press can select walking without movement until the next handler update. Landing state 5 also processes normal input: the verified landing schedule accepted another jump before the landing animation completed. State-animation duration is therefore not necessarily control lockout. [Ground and dash flow](../../medabots-decompile/docs/physics-and-movement.md), [landing verification](../../medabots-decompile/data/generated/physics/runtime-verification.json).

### Jump selection, curves, and falling

The normal jump starts with full-curve selection, hold counter 0, and provisional duration 40. During jump-handler calls, releasing A selects short if hold count <5, medium if 5…9, or full otherwise. Holding through the eleventh handler call finalizes full. Switching selection **uses the current timer index**; the new curve does not restart at sample 0.

For the tested ground-entry path, 1–5 consecutive input frames of A select short, 6–10 medium, and 11+ full. The initiating ground frame is not a jump-handler call. These thresholds must be checked again in suppressed-input and special-leg paths.

| Family                        | Short maximum rise / curve calls | Medium     | Full                                          | Evidence                                                  |
| ----------------------------- | -------------------------------- | ---------- | --------------------------------------------- | --------------------------------------------------------- |
| Ordinary, excluding types 5/6 | 52 px / 22                       | 78 px / 32 | 108 px / 44, then fall if unsupported         | STATIC + OBSERVED for leg part 0                          |
| Type 5                        | 60 px / 30                       | 80 px / 40 | 100 px / 50                                   | STATIC, not independently measured here                   |
| Type 6                        | 60 px / 40                       | 80 px / 60 | 100 px / 80                                   | STATIC, not independently measured here                   |
| Type 2 special-jump path      | Separate selection/finalization  | —          | 120 px / 44 in unobstructed table integration | STATIC; activation and terrain can change the actual path |

| Curve                        | Address                              |         Stored bytes | Normal consumed duration |
| ---------------------------- | ------------------------------------ | -------------------: | -----------------------: |
| Ordinary full                | `08058C74`                           |                   50 |                       44 |
| Ordinary medium              | `08058CA6`                           |                   32 |                       32 |
| Ordinary short               | `08058CC6`                           |                   22 |                       22 |
| Type 5 full / medium / short | `08058BFC` / `08058C2E` / `08058C56` |         50 / 40 / 30 |             50 / 40 / 30 |
| Type 6 full / medium / short | `08058B48` / `08058B98` / `08058BD4` |         80 / 60 / 40 |             80 / 60 / 40 |
| Special path                 | `08058B04`                           | 68 before next table |                       44 |

Ordinary full begins with upward requests 8, 8, 8, 7, 7, 7… and ends its 44 consumed samples **45 pixels above takeoff**. The handler requests landing state 5, but the common grounding tail changes it to fall state 4 if unsupported. Ordinary falling requests **5 pixels downward per update**; type 6 requests 3. The extra six stored full-curve bytes are not consumed by this normal path.

Consequently, the clear-space full jump onto the same floor takes **53 movement updates: 44 curve + 9 falling**. Short/medium take 22/32. The longer zero-displacement apex sections of types 5/6 cannot be recreated with the same generic ballistic arc.

Sources: [movement reconstruction](../../medabots-decompile/reconstruction/movement.c), [all recovered curves](../../medabots-decompile/data/generated/physics/tables.json), [verification report](../../medabots-decompile/data/generated/physics/runtime-verification.json), [jump consumer](../../medabots-decompile/analysis/raw/functions/08006f0c.c), [fall consumer](../../medabots-decompile/analysis/raw/functions/080075c0.c).

### Air control and persistent takeoff carry

Ordinary air motion uses **two sequential collision-resolved requests**: takeoff carry, then current steering. Carry direction persists even after releasing or reversing the direction key. It is not a velocity decayed by friction.

For starting legs:

- Standing jump + Right: average 1.25 px/update.
- Rightward walk-jump + Right: 0.5 carry + 1.25 steering = 1.75 px/update in free space.
- Release Right during that walk-jump: 0.5 px/update rightward carry remains.
- Dash-jump + Right: 0.75 + 1.25 = 2 px/update; release leaves 0.75.

Do not merge the requests before collision: an intervening wall/actor/slope can make sequential resolution differ. Types 5/6 bypass ordinary carry and use direct horizontal requests of 2 pixels, or 4 with their airborne dash flag. Their horizontal air-tap window is eight counts. [Measured carry and steering](../../medabots-decompile/docs/physics-and-movement.md).

### Leg-specific maneuvers

**STATIC unless an observation is explicitly cited.** The eight numeric locomotion types are installed from leg byte 0. English labels exist in order “Dual Leg (SHT), Dual Leg (GRP), Multi Leg, Vehicle, Tank, Flight, Float, Diving,” but the source audit has not verified the complete label-to-type consumer. Keep numeric IDs authoritative until that binding is checked.

| Type | Input / context                                       | Behavior                                                                                            | Handler              |
| ---- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------- |
| 0, 1 | Down double tap through idle; leg ID <30              | Low pose while Down remains held; Down+A still drops through eligible floor.                        | State 20, `080080F4` |
| 0, 1 | Up double tap, same gates                             | Backhop opposite facing; 30 table timer values, speed mode 8; earlier grounded exit after timer 15. | State 21, `08008190` |
| 1    | Horizontal double tap, eligible attack state          | Forward 6 px at timers 0…11; timer 12 stops; 13+ exits. Maximum requested free travel 72 px.        | State 6, `08006E28`  |
| 2    | Up or Down double tap grounded                        | Set special-jump flag and enter the shared jump handler.                                            | State 3, `08006F0C`  |
| 3, 4 | Up or Down double tap through idle                    | Retreat backward 4 px/update while the relevant counter and held input permit.                      | State 22, `080082C0` |
| 5    | Up double tap airborne, unguarded, no attack/slowdown | Forward 7 px/update, no vertical request; collision-dependent exit.                                 | State 25, `0800846C` |
| 5    | Down double tap, same aerial gates                    | Down 2 px then forward 6 px; ends on grounding/block, slowdown cancels.                             | State 26, `080084DC` |
| 5    | A edge airborne, extra jump unused                    | Restart jump selection/timer; consumes one extra jump until grounding.                              | Jump/fall handlers   |
| 6    | Up double tap with aerial gates                       | Hover without movement requests; release/grounding/timer >120 exits.                                | State 23, `0800839C` |
| 6    | Down double tap with aerial gates                     | Descend 10 px/update; grounding or slowdown ends it.                                                | State 24, `080083EC` |
| 7    | Up double tap through idle while submerged            | Ascend 10 px/update; leaving water transitions to a jump path.                                      | State 27, `08008590` |

Up/down counters start at 16 with same-call decrement; resetting on jump/fall entry can lose a tap across that boundary. Guard and active attacks block relevant branches. The type 1 burst's transient flag must **not** be called invulnerability without resolving its hit consumers. Hover's timers 0…120 represent 121 retained handler updates, not automatically 121 total displayed frames including activation.

Sources: [leg-move analysis and caveats](../../medabots-decompile/docs/leg-moves.md), [leg mappings and curves](../../medabots-decompile/data/generated/physics/tables.json), [reviewed symbol addresses](../../medabots-decompile/analysis/evidence/leg-moves-symbols.tsv).

### Broken legs install replacement equipment

**STATIC; damaged-leg runtime traces remain unmeasured.** When leg HP reaches zero, the HP routine equips slot 3 with replacement ID `30 + actor[5]`, without initializing HP. The head-indexed table at `0x080980EC` supplies that actor field as 0 or 1. Both replacement leg records have the same movement fields: locomotion type 0, zero armor and defense, speed indices 2, and zero attack/defense ranks. The current leg ID changes, while the saved initial ID and maximum armor remain available; current armor stays zero.

This selects speed row 2, rather than applying a percentage penalty to the old legs:

| Movement request   | Replacement legs, px/update | Starting leg 0, px/update |
| ------------------ | --------------------------: | ------------------------: |
| Walk               |                        1.75 |                         2 |
| Dash               |                         2.5 |                      2.75 |
| Walk-jump carry    |                         0.5 |                       0.5 |
| Dash-jump carry    |                        0.75 |                      0.75 |
| Jump steering      |                           1 |                      1.25 |
| Fall steering      |                        0.75 |                         1 |
| Dash-fall steering |                         1.5 |                      1.75 |
| Mode 8             |                        1.75 |                         2 |

Type 0 retains the ordinary **52/78/108-pixel jump curves**. The starting legs therefore do not acquire a large jump-height penalty on destruction. Replacing a slower leg can even increase some horizontal table values; this is a fixed replacement, not a universal slowdown multiplier. Existing nonzero leg stat ranks are lost. The foot-width table gives replacement IDs 30/31 a width of 16, the same as starting leg 0.

The idle Up/Down maneuver handler requires leg ID below 30, preventing those special maneuvers after replacement. This does not establish every status, water, or in-progress movement transition; measure those separately.

Sources: [destruction instructions at `0800C98A…0800C998`](../../medabots-decompile/analysis/raw/functions/0800c8c8.asm), [equip consumer](../../medabots-decompile/analysis/raw/functions/080189c8.c), [initialization](../../medabots-decompile/analysis/raw/functions/080017fc.c), [part records](../../medabots-decompile/data/generated/combat/parts.json), [speed tables](../../medabots-decompile/data/generated/physics/tables.json), [special-move gate](../../medabots-decompile/analysis/raw/functions/08006074.c), [foot-width collision consumer](../../medabots-decompile/reconstruction/stage_collision.c).

## Collision, terrain, and the 19 fields

### Surface geometry and collision order

**STATIC.** Each collision map is **54×46 eight-pixel cells**, exactly 2, 484 bytes. Nineteen pointers start at `0x083289BC`; map data spans `0x0805DC4C…0x080694A7`. These are surfaces, not filled solid tiles. A hit in `0x0800F23C` means the sampled pixel is exactly on the encoded line.

| Low three bits | Surface height for local X 0…7 |
| -------------: | ------------------------------ |
|              0 | No surface                     |
|              1 | 0, 0, 0, 0, 0, 0, 0, 0         |
|              2 | 0, 0, 0, 1, 1, 1, 2, 2         |
|              3 | 2, 3, 3, 3, 4, 4, 4, 5         |
|              4 | 5, 5, 6, 6, 6, 7, 7, 7         |
|              5 | 7, 7, 7, 6, 6, 6, 5, 5         |
|              6 | 5, 4, 4, 4, 3, 3, 3, 2         |
|              7 | 2, 2, 1, 1, 1, 0, 0, 0         |

The six slope rows live at `0x080594A8`. Three successive ramp pieces traverse 24 horizontal pixels and eight vertical pixels. Foot width and neighboring slope joins matter; a point check at the actor center is insufficient.

**Bit `0x08` forbids explicit drop-through.** From idle, Down+A can bypass downward up to nine pixels; from walk/dash, up to four. The loops stop on a forbidden surface or another actor and are gated below bottom-Y 359. The bit does **not** make the floor collide with an actor rising from underneath.

Horizontal movement steps one pixel at a time, with center bounds **8…424**. Actor overlap is approximately X−8…X+7 and height from signed `actor+CB`. It can recursively push another actor on even-numbered pixel iterations; a hostile dash under additional gates returns an actor-coded impact result. Our symmetric post-movement body separation does not model this.

Upward movement tests actor undersides and an actor-top ceiling of **−32**; it does not query static floors or dynamic platforms. Downward movement clips in this order:

1. Bottom boundary **367**.
2. Static surfaces across the foot width and slope joins.
3. Up to three dynamic platforms.
4. Other actors' tops.

The movement helper returns **unconsumed pixels**, not distance moved or a boolean success. A decompiler call omitted the fourth platform-helper argument; the assembly-backed excerpt restores the already-clipped request. Grounding can be on the field boundary, a surface, a dynamic platform, or another actor. It resets the extra-jump-used flag, and actor support also records mutual support IDs.

Sources: [collision reconstruction](../../medabots-decompile/reconstruction/stage_collision.c), [detailed stage analysis](../../medabots-decompile/docs/stage-physics.md), [surface query assembly](../../medabots-decompile/analysis/raw/functions/0800f23c.asm), [downward helper assembly](../../medabots-decompile/analysis/raw/functions/08010490.asm).

### Terrain categories, water, and dynamic platforms

The high nibble is a **category**, not independent combinable flags. The material query checks center first, then the first nonzero cell across the foot width.

| Category | Supported behavior                                  | Exceptions / limits                                                                                            |
| -------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `0x00`   | Ordinary surface                                    | No generic ground inertia.                                                                                     |
| `0x10`   | Retained motion on release/reversal; downhill slide | Types 4/6/7 skip these slide/inertia effects. “Ice” artwork naming is unverified.                              |
| `0x20`   | Slows horizontal requests                           | Types 2/4/6 skip it. Integer narrowing and corrections prevent reducing it to one universal speed subtraction. |
| `0x30`   | Right conveyor, +1 pixel/update                     | Type 6 immune; common conveyor application skips jump state 3 and defeat state 10.                             |
| `0x40`   | Left conveyor, −1 pixel/update                      | Same qualifications.                                                                                           |

Slope direction can add/subtract **three quarter-pixels per movement call**, except for types 2/4/6. Category `0x10` downhill drift adds two quarter-pixels through a later update path. Retained-motion accumulator `actor+EA` is signed 16-bit, bounded −128…128 with 32 units per requested pixel; its complete reversal/residual behavior remains **UNKNOWN** as a validated standalone model. Do not replace the unresolved branches with a claimed exact friction formula.

Water threshold table `0x0806B70C` uses eight-pixel units. Zero disables water. Detection compares the level to `bottomY+s16(actor+E2)`; the purpose of that extra offset is not fully named. Submerged status is `+F2`; most types also receive slowdown `+F0`:

- Horizontal quarter quantities become `trunc(2*q/3)` before residual conversion.
- Vertical requests use a separate halving/residual path.
- Jump samples are fetched **before** alternate updates hold back the jump timer.
- Type 7 avoids that slowdown and instead gains two speed-index ranks, clamped to 0…7.

This does not establish water damage. Splash and submerged-effect consumers are present. Full water trajectories remain unmeasured in the audited experiments.

Each stage has three dynamic-platform source records of **11 signed 16-bit words**, starting at `0x0806B168`; initialization produces 24-byte runtime records at `W+D68`. Active flag is word 0's low byte; word 2/3 provide X/Y, word 4/5 motion-related bounds, word 8 width, all in eight-pixel units before their respective narrowing. Active stages 12/13 initialize Y one pixel higher. The remaining words and platform transport trajectories are not fully resolved. An initial segment in the atlas is not its full path.

Sources: [stage physics](../../medabots-decompile/docs/stage-physics.md), [stage extractor](../../medabots-decompile/tools/extract_stages.py), [terrain consumer](../../medabots-decompile/analysis/raw/functions/0800f938.c), [water consumer](../../medabots-decompile/analysis/raw/functions/0801bcb8.c).

### Complete collision-field inventory

The following inventory was regenerated from the supplied ROM and compared exactly against all 19 saved JSON records during this pass. **STATIC**, not a playthrough of every stage. Categories list only cells with a nonzero surface shape. Dynamic entries are `slot:(x,y;width)` at initialization; coordinates outside the visible field are preserved rather than corrected. Spawn order is original actor index, not team-major order.

The displayed location names, background-resource mappings, and variant order still need a full binding audit. The observed node-0 encounter is prompted as Ancient Ruins and enters collision field 0; that is evidence for this encounter, not permission to name every numeric field by guesswork.

| Field | Map address | Surface categories | Water Y | Active platform starts                              | Actor spawns `(x,bottomY)`                            |
| ----- | ----------- | ------------------ | ------: | --------------------------------------------------- | ----------------------------------------------------- |
| 00    | `0805DC4C`  | 0x00               |       — | —                                                   | 0:(69, 311); 1:(363, 311); 2:(28, 239); 3:(404, 239)  |
| 01    | `0805E600`  | 0x00, 0x20         |       — | —                                                   | 0:(100, 359); 1:(332, 359); 2:(66, 271); 3:(366, 271) |
| 02    | `0805EFB4`  | 0x00, 0x20         |       — | 0:(192, 216; 48)                                    | 0:(78, 255); 1:(354, 255); 2:(78, 159); 3:(354, 159)  |
| 03    | `0805F968`  | 0x00               |       — | —                                                   | 0:(80, 287); 1:(352, 287); 2:(48, 231); 3:(384, 231)  |
| 04    | `0806031C`  | 0x00               |       — | —                                                   | 0:(50, 319); 1:(384, 319); 2:(50, 199); 3:(382, 199)  |
| 05    | `08060CD0`  | 0x00               |       — | —                                                   | 0:(74, 231); 1:(358, 231); 2:(45, 319); 3:(387, 319)  |
| 06    | `08061684`  | 0x00               |     256 | —                                                   | 0:(76, 159); 1:(356, 159); 2:(36, 215); 3:(396, 215)  |
| 07    | `08062038`  | 0x00               |     232 | —                                                   | 0:(71, 143); 1:(361, 143); 2:(32, 201); 3:(400, 201)  |
| 08    | `080629EC`  | 0x00               |     168 | —                                                   | 0:(80, 143); 1:(352, 143); 2:(30, 143); 3:(402, 143)  |
| 09    | `080633A0`  | 0x00, 0x30, 0x40   |       — | 0:(144, 152; 48); 1:(240, 272; 48)                  | 0:(80, 151); 1:(352, 151); 2:(30, 151); 3:(402, 151)  |
| 10    | `08063D54`  | 0x00, 0x30, 0x40   |       — | 0:(128, 168; 48); 1:(256, 240; 48)                  | 0:(80, 167); 1:(352, 167); 2:(30, 167); 3:(402, 167)  |
| 11    | `08064708`  | 0x00, 0x30, 0x40   |       — | 0:(-8, 216; 48); 1:(392, 288; 48); 2:(192, 144; 48) | 0:(88, 287); 1:(344, 287); 2:(50, 343); 3:(382, 343)  |
| 12    | `080650BC`  | 0x10               |     248 | 0:(144, 231; 48)                                    | 0:(48, 271); 1:(384, 271); 2:(140, 303); 3:(292, 303) |
| 13    | `08065A70`  | 0x10               |     232 | 0:(-56, 215; 48); 1:(440, 215; 48)                  | 0:(120, 350); 1:(312, 350); 2:(99, 253); 3:(333, 253) |
| 14    | `08066424`  | 0x10               |     344 | —                                                   | 0:(73, 239); 1:(359, 239); 2:(37, 175); 3:(395, 175)  |
| 15    | `08066DD8`  | 0x00               |       — | —                                                   | 0:(60, 186); 1:(372, 186); 2:(84, 261); 3:(348, 261)  |
| 16    | `0806778C`  | 0x00               |       — | —                                                   | 0:(94, 209); 1:(338, 209); 2:(65, 279); 3:(367, 279)  |
| 17    | `08068140`  | 0x00               |       — | —                                                   | 0:(88, 223); 1:(344, 223); 2:(110, 159); 3:(322, 159) |
| 18    | `08068AF4`  | 0x00               |       — | —                                                   | 0:(82, 263); 1:(350, 263); 2:(96, 143); 3:(336, 143)  |

Local navigation: [collision atlas](../../medabots-decompile/data/generated/stages/atlas.html), [all stage metadata](../../medabots-decompile/data/generated/stages/index.json), [field 0 geometry](../../medabots-decompile/data/generated/stages/stage-00.json), [encounter prompt observation](../../medabots-decompile/docs/runtime-observations.md).

Field 0 is a useful first reproduction target: actor 0 starts at `(69,311)`, actor 2 at `(28,239)`, actor 1 at `(363,311)`, actor 3 at `(404,239)`. A left floor lies at surface Y312 through X167; the upper-left platform at Y240 ends at X63. Foot width lets center X69 land on that upper floor. The verified clear-jump experiment first walks to **X81**, avoiding that landing and exposing the full arc.

## Measured starting weapons and animation timing

### Separate readiness, action, and animation

**STATIC + OBSERVED for the initial all-part-0 leader.** Head/right/left action types are **2/0/1**, with power **40/5/12** and readiness increments **7/7/4**. Power is a formula input, not final HP loss.

Each action needs readiness **320**. Head and left reset it to 0 when accepted. Right types 0/7 reset it to **213**; other right types reset to 0. The active slot does not refill during its attack. Head also needs remaining uses: the observed starting head has **3**, and one accepted shot reduces that to 2. Other slots can refill concurrently.

The first attempted commands at emulator frame 5461 were rejected because readiness was only 28/28/16. Successful experiments pressed at 5541. A control test must not mistake a rejected not-ready shot for lost browser input.

Sources: [attack timing analysis](../../medabots-decompile/docs/attack-timing.md), [readiness/action excerpts](../../medabots-decompile/reconstruction/attack_timing.c), [verification report](../../medabots-decompile/data/generated/attack-animation/runtime-verification.json).

### Animation controls object creation

Pending animation initialization is staggered across actors by `(battleCounter & 3) == actorIndex` in `0x08002FC8`. Once initialized, animation and event checks advance every eligible update. This adds **0–3 updates of initialization latency**, not a global animation rate of one frame in four.

Four input schedules produced these input-frame → first-object-frame pairs: **5541→5542, 5542→5542, 5543→5546, 5544→5546**. Measured waiting was 1, 0, 3, 2 updates.

Part mapping table `0x08089DF8` has five stream IDs per equipment ID. Part 0 uses head 46, right stages 38/40/42, left 44; facing selects the paired stream. Pointer table is `0x08329AC4`.

| Action                          |  Stream base | Frame durations | Total after initialization |
| ------------------------------- | -----------: | --------------- | -------------------------: |
| Head 0                          |           46 | 8, 12, 4, 8     |                 32 updates |
| Right 0, first / second / third | 38 / 40 / 42 | 8, 8 each       |            16 updates each |
| Left 0                          |           44 | 8, 4, 4, 8      |                 24 updates |

Frame records contain signed duration, sprite-frame ID, and body offsets. Terminal and loop markers must be parsed separately from ordinary records. Event table `0x08085BB8` carries category plus enabled/frame/tick triples for primary and secondary construction. Right 38/39 uses primary frame 0/tick 0 and secondary frame 0/tick 2; left 44/45 has the same timings with another category; head 46/47 uses primary frame 2/tick 2 and secondary frame 3/tick 2. Event checks precede that update's animation advance.

Right uses independent animation state; head and left use body animation. Both primary and secondary object paths can participate in hit tests. A primary object must not automatically be classified as harmless muzzle-flash VFX.

Sources: [animation update consumer](../../medabots-decompile/analysis/raw/functions/08002fc8.c), [part-0 stream/event extraction](../../medabots-decompile/data/generated/attack-animation/part0.json), [animation extractor](../../medabots-decompile/tools/extract_attack_animation.py).

### Measured action milestones

Offsets below are relative to the **accepted input frame 5541** in the stated fresh-save stage-0 experiments, facing right, no water. They are post-frame object observations, not guaranteed enemy-contact times.

| Action  | Primary object | Travelling / secondary object | Attack clears | Ready again |
| ------- | -------------: | ----------------------------: | ------------: | ----------: |
| Right 0 |             +1 |                            +3 |           +17 |         +33 |
| Left 0  |             +1 |                            +3 |           +25 |        +105 |
| Head 0  |            +23 |                           +27 |           +33 |         +79 |

At completion, right requires another `ceil((320−213)/7)=16` eligible refill updates; left requires 80; head 46. The tested ordering starts refill on the update after action completion.

The starting right arm keeps walking at 2 px/update while firing. The left holds X69 until its action finishes. Head type 2 requests backward recoil **5, 4, 3, 2, 1 pixels** at body frame 3 / ticks 2…6: observed X69→64→60→57→55→54 with unchanged HP. Collision/water can alter actual recoil distance. [Observed attack checks](../../medabots-decompile/tools/verify_attack_runtime.py).

### Follow-up latch and projectile reach

During right action `0x080088D4`, additional neutral B edges can set one follow-up latch. Completion can enter a second stage with readiness **106**, then a third with readiness 0. Early repeated presses do not queue every future stage. The verified second stage changes attack-object type from 0 to **41**; it must not inherit the first bullet's movement formula by assumption.

The starting straight right/left travelling objects use speed **3/4 px per update**, range units **12/20**, and handler `0x08009A84`. Their object timer increments first; horizontal movement starts when timer >1. They test contact at step endpoints before and after the move while distance ≤`7*range` (**84/140 px**), but expire at ≥`8*range` (**96/160 px**). The last range segment changes visibility and is not the same as damaging reach.

Recorded right X positions are 92, 95, 98…185 across 32 visible samples; left 107, 111, 115…263 across 40. The next terminal position is absent from post-frame logs because the object has been removed. This is not evidence for swept AABB collision or a lifetime derived solely from screen width. Head type 2 has a separate aiming/turning path at `0x0800DC00`; full homing behavior remains unresolved.

Sources: [attack timing and follow-up experiment](../../medabots-decompile/docs/attack-timing.md), [straight-object handler](../../medabots-decompile/analysis/raw/functions/08009a84.c), [72-position verification](../../medabots-decompile/tools/verify_attack_runtime.py).

## Combat, equipment, and AI

Within this section: [equipment and identity](#actor-identity-equipment-and-battle-data), [part selection](#collision-and-part-selection), [damage and destruction](#damage-guard-reactions-and-destruction), [Medaforce](#medaforce), [AI and randomness](#ai-tactical-panels-and-randomness), [results](#timer-defeat-and-result), and [all 128 part records](#numeric-equipment-appendix).

### Actor identity, equipment and battle data

#### Four actors and two sides

**STATIC.** With `W = *(0x030010A4)`, normally `0x02010000`, actor `i` starts at `W + 8 + i * 0x18C`. Side A is actors **0 and 2**; side B is **1 and 3**. Actors 0/1 are the main combatants, and 2/3 their partners. A head KO on actor 0/1 triggers the result latch; partner KO disables that actor without triggering that latch. Do not map a team simply to two contiguous actor slots. Suggested prototype mapping: `A1→0`, `B1→1`, `A2→2`, `B2→3`. [Initialization][initialize], [HP application][hp-c], [timeout][timeout-c].

| Actor-relative offset         | Stored type                     | Established meaning                                                  |
| ----------------------------- | ------------------------------- | -------------------------------------------------------------------- |
| `+0`, `+1`                    | bytes                           | active flag; disabled/defeated input flag                            |
| `+3`, `+4`                    | bytes                           | team discriminator; actor ID                                         |
| `+6..+9`                      | four signed bytes when consumed | equipped head, right arm, left arm, legs IDs                         |
| `+0x0A..+0x10`                | four signed 16 HP values        | current armor in that order                                          |
| `+0x12..+0x18`                | four signed 16 values           | prior HP expressed in 12 display units                               |
| `+0x1A..+0x20`                | four signed 16 values           | maximum armor                                                        |
| `+0x22..+0x25`                | bytes                           | equipped action types / locomotion type                              |
| `+0x2A,+0x2C,+0x2E`           | three halfwords                 | head/right/left readiness, fully ready at 320                        |
| `+0x32,+0x33`                 | bytes                           | remaining and maximum head uses                                      |
| `+0x34..+0x37`                | bytes                           | locomotion, foot-width and speed-index fields                        |
| `+0x38,+0x39`                 | bytes                           | medal ID and medal level                                             |
| `+0x3A..+0x3D`                | bytes                           | prebattle medal-derived stats; full English label mapping unresolved |
| `+0x41`                       | byte                            | guarding flag                                                        |
| `+0x42,+0x44,+0x48`           | halfwords                       | current state, previous state, state timer                           |
| `+0x97,+0x98`                 | byte, halfword                  | attack substate and action timer                                     |
| `+0xA6`                       | byte                            | Medaforce action flag                                                |
| `+0xA7,+0xA8`                 | byte, halfword                  | displayed/activation-gated gauge and underlying gauge                |
| `+0xAA,+0xAC`                 | halfword, byte                  | passive-gain counter and full-gauge notification                     |
| `+0xF8,+0xFC,+0xFD,+0xFF`     | signed 16, bytes                | pending damage, selected part, HP-change flag, amplified-hit flag    |
| `+0x108,+0x10A,+0x10C,+0x10E` | halfwords                       | AI desired/previous keys, actor pressed/held inputs                  |
| `+0x14E,+0x14F..+0x153`       | bytes                           | active tactical panel and five equipped panels                       |

Source: [combat reconstruction][combat-reconstruction], [initializer][initialize], [AI reconstruction][ai-reconstruction], [gauge/HUD consumer][gauge-display]. Field widths matter when reproducing integer wrap, truncation and signed comparisons.

#### Parts are composition, not immutable whole-character classes

**STATIC.** Four table pointers at `0x0832D7FC` select separate slot tables. Each holds 32 records of 12 bytes; starts are `0x08095294` head, `0x08095414` right arm, `0x08095594` left arm, `0x08095714` legs. Record `n` is `start + 12*n`. The 32-record bounds combine contiguous spacing and saved-part ID validation, not a bounds check in every consumer. [Extractor][extract-combat], [numeric parts][parts], [table metadata][tables].

| Record byte                   | Meaning established by a consumer                                                |
| ----------------------------- | -------------------------------------------------------------------------------- |
| 0                             | action type, or leg locomotion type                                              |
| 1                             | initial/max HP copied by equip `0x080189C8`                                      |
| 2                             | projectile base power for action parts, copied to object `+0x3E` by `0x080160C8` |
| 3                             | defense used by damage formula                                                   |
| 4                             | preference rank; for legs, speed index is byte 4+1 narrowed to a byte            |
| 5                             | maximum head uses; not assigned a common arm/leg meaning                         |
| 6, 7, 8                       | on legs, category-dependent attack adjustment ranks                              |
| 9                             | on legs, defense rank                                                            |
| 10                            | for action parts, readiness gain per eligible update                             |
| 11 and other unassigned bytes | retained by the extractor, not given speculative labels                          |

The equip routine copies HP only when its initialization argument requests it. Head uses come from byte 5. Part ID 25 in an action slot clears readiness even when HP is not initialized. The leg-dependent field at `actor+0x35` comes from `0x0808A0F8`. The later downward-collision reconstruction identifies its consumer as foot width; the earlier combat notes only called it terrain-related. See [foot-width consumer](../../medabots-decompile/reconstruction/stage_collision.c). [Equip consumer](../../medabots-decompile/analysis/raw/functions/080189c8.c), [combat review][combat-review].

#### Proven names and limits of character identification

**OBSERVED.** The English formation screen binds the all-part 0 starting set to medal **Kabuto**, head **Missile**, right arm **Revolver**, left arm **SubmachineGun**, legs **Ochitsuka**. The menu visibly labels R/L. These bindings are much stronger than guessing names from numerical table order. [Formation reference][loadouts], [formation/runtime notes][runtime].

**INFERRED.** Describing this as the Metabee-version starting equipment is supported by ROM identity and the starting formation, but this is not a recovered universal `characterId = 0` schema. Each slot is independently equipped.

**UNKNOWN.** This inspection has not established a complete numeric-part-ID → Rokusho/Arcbeetle/Warbandit set mapping, nor a complete roster with English part names. Do not treat part 1 as Rokusho or assign bulkier robots higher IDs by appearance. The current prototype's four cartoon models are not evidence of original record identities. Before adding canonical character presets, join formation-screen part-name records, inventory IDs, sprite construction and an observed complete equipment set. Mixed enemy loadouts are normal in the extracted records; a portrait ID is not necessarily a robot ID.

#### Formation validation

**STATIC.** `0x08039630` / `0x0803CE54` require both medals to be present, every part to differ from its slot's placeholder 30/31, the two medals to differ, and at least two inventory units when both actors use the same ID in the same slot. The routine does not itself prove all ID-range, ownership or compatibility checks; upstream menus may provide them. This is outside the prototype's requested battle-only flow but affects valid original battle setups. [Formation reconstruction](../../medabots-decompile/reconstruction/loadouts.c), [formation review][loadouts].

#### Opponent configuration

**STATIC.** `0x0803EE1C` reads 20-byte records from `0x08098788`. There are 440 extracted records, IDs 0–439, ending exactly at the adjacent `0x0809A9E8` table. Fields are presentation ID at 0, unknown header bytes 1–3, first head/right/left/legs at 4–7, medal 8, level-curve 9, panel 10, conditional strategy 11, then second parts 12–15, medal 16, curve 17, panel 18, strategy 19. The often-mentioned `0x0809878C` is the parts view four bytes inside the record, not the physical record start. [Opponent review][opponents-review], [all opponent records][opponents].

Record 0 has part sets `[10,5,26,21]` and `[15,19,19,9]`, medals 7/10. Record 439 has `[6,6,6,6]` and `[20,13,13,6]`, medals 7/6. Levels come from selected 28-byte curves and encounter/phase state, capped above at 99. These facts do not name those assembled robots. A faithful local fixture should store its medal, levels, panels and mixed parts explicitly, rather than substitute our four default complete robots.

### Collision and part selection

#### A contact selects an actor before it selects a part

**STATIC.** Projectile/effect storage has 20 records of `0x5C` bytes at `W+0x638`, organized as five per actor; the fifth participates in impact/effect copies. Treating them as 20 interchangeable bullets misses original capacity limits. Update `0x08009694` dispatches active objects by type through `0x08328158`. [Combat review][combat-review].

Collision `0x0800B9EC` requires object-active and collision-enabled flags. It uses a direction-dependent actor order from `W+0x1B8C` / `W+0x1B90`, skipping inactive, excluded-state, same-team and already-hit actors. An object flag determines whether the actor scan stops after the hit. The exact half-open contact condition is, with `px`/`py` the object's signed position plus two signed offset pairs, `ax` actor x, `ay` actor bottom y, `h` signed actor height, and `w`/`ph` unsigned object dimensions:

- `px - 7 <= ax < px + 8 + w`
- `py <= ay < py + h - 1 + ph`

This tests the actor's collision body; it does **not** ask whether the projectile geometrically struck its visible head or left forearm. Only after overlap does ordinary hit resolution choose an armor slot. [Exact predicate][combat-reconstruction], [collision consumer](../../medabots-decompile/analysis/raw/functions/0800b9ec.c).

#### Head damage is possible before limbs break

**STATIC, independently byte-checked.** `0x0800D32C` builds a destroyed-limb mask, using right/left/legs bits 4/2/1 from `0x08059098`. It loads four byte weights from `0x0805909C + 4*mask`:

| Destroyed limbs | Mask | Head | Right arm | Left arm | Legs | Total before preferences/bias |
| --------------- | ---: | ---: | --------: | -------: | ---: | ----------------------------: |
| None            |    0 |    5 |        30 |       30 |   30 |                            95 |
| Legs            |    1 |   10 |        40 |       40 |    0 |                            90 |
| Left            |    2 |   10 |        40 |        0 |   40 |                            90 |
| Left + legs     |    3 |   15 |        70 |        0 |    0 |                            85 |
| Right           |    4 |   10 |         0 |       40 |   40 |                            90 |
| Right + legs    |    5 |   15 |         0 |       70 |    0 |                            85 |
| Right + left    |    6 |   15 |         0 |        0 |   70 |                            85 |
| All three       |    7 |  100 |         0 |        0 |    0 |                           100 |

The weights are **not percentages**: intact parts sum 95, not 100. A preference handler can double flagged weights; the third argument contributes an unsigned 16 additive head weight. Three successive battle-RNG bytes are summed and reduced modulo the unsigned 16 cumulative total. Thus neither a geometric head shield nor a uniform random limb picker matches the original. Even `5/95` is only a weight ratio; the fixed byte stream, its call order and modulo reduction determine actual realized selection frequencies. [Selection C][part-selection-c], [selection Thumb][part-selection-asm], [RNG review][ai-review].

**OBSERVED.** In the unattended natural battle, actor 0 changed from `45/35/35/50` at frame 5400 to `36/11/25/0` at frame 12000: the head had already lost 9 HP while both arms retained positive HP. This is direct corroboration that the absolute shield assumption is false for this ROM. The nonmonotonic left-arm values elsewhere in the run must not be mislabeled as continuous damage; healing or other state changes require their own trace. [Runtime observations][runtime].

**STATIC.** When the selector's second argument exceeds 3 it assigns `slot = argument - 4` directly, without that random procedure. Which attack families use each forced value remains **UNKNOWN** in this slice. Do not assume every hit must pass the weighted table. [Selection instructions][part-selection-asm].

#### Preferences and guard selection

**STATIC.** The preference-function table at `0x08328298` includes handlers that flag action categories (`0x0800D4C8`, `0x0800D504`), maximal current HP (`0x0800D540`), minimal positive current HP (`0x0800D5D8`), a non-`0xFF` action-profile property (`0x0800D674`), and maximal equipped byte 4 rank (`0x0800D6B0`). These are consumer-backed arithmetic descriptions, not verified English medal personality names. Mapping the selected preference index to all named medals remains **UNKNOWN**. [Max-HP preference](../../medabots-decompile/analysis/raw/functions/0800d540.c), [min-HP preference](../../medabots-decompile/analysis/raw/functions/0800d5d8.c), [rank preference](../../medabots-decompile/analysis/raw/functions/0800d6b0.c).

**STATIC, instruction-checked.** Guarded hits call `0x0800D2C0`, which scans slots 1, 2, 3, chooses the **largest current HP**, and uses head only when that maximum is 0. Equal positive values choose the later slot because its comparison accepts equality: legs beat left, left beats right. This protects the head specifically on this guard path while any limb survives; it is not global immunity. [Guard selector C][guard-selector-c], [guard selector Thumb][guard-selector-asm].

### Damage, guard, reactions and destruction

#### Normal damage formula

**STATIC.** `0x0800D858` has five actual arguments: target actor ID, selected slot, unsigned 8 power, unsigned 8 modifierA, unsigned 8 modifierB. Extra apparent parameters in Ghidra callers are not evidence of a wider ABI.

1. `attack = floor((50 + modifierA + modifierB) * power / 50)`.
2. `reduction = floor((partDefense + statusDefense) * (50 + legAdjustment + profileAdjustment) / 50)`.
3. Subtract and narrow to **signed 16**.
4. Return at least 2.

The divisions precede subtraction and signed narrowing; a float formula rounded only at the end is different. [Reviewed formula][combat-reconstruction], [formula instructions](../../medabots-decompile/analysis/raw/functions/0800d858.asm).

`partDefense` is selected part byte 3. `legAdjustment` reads `0x08095894[5 - legs.byte9]`; the six adjustment values are `[10,8,6,4,2,0]`. `profileAdjustment` comes from actor-specific prebattle stat storage. `statusDefense` is actor byte `+0x56` only when `+0x51 == 0`. For outgoing projectiles, the two attack modifiers are equipment/leg and medal-derived stats. Action category 0 selects leg byte 7, category 1 byte 6, category 2 byte 8, each through the same reversed-rank adjustment table. Keep these numeric categories until their labels are verified. [Constructor](../../medabots-decompile/analysis/raw/functions/080160c8.c), [combat review][combat-review].

**INFERRED arithmetic fixture, not an observed hit.** Part 0 head power 40 against part 0 head defense 3, with both attack modifiers and all additional defense adjustments zero, yields 37. Against part 0 left defense 6 it yields 34. That fixture cannot be generalized to all actual starting-battle hits: equipped legs/medal/status determine the nonzero modifiers.

#### Guard is directional and modifies power before defense

**STATIC.** `0x0800BAF8` enters its guard branch only with guard active and target facing different from the projectile's direction value. A shot arriving from behind follows an unguarded path. Guard chooses the high-HP limb, quarters **power before the damage formula**, then uses its own reaction handler. The common formula still has a minimum 2; special type `0x2D` explicitly supplies 1 guard damage, 2 normal, 3 amplified. A universal `finalDamage *= 0.25` is incorrect. [Hit resolver][hit-resolver], [guard reaction](../../medabots-decompile/analysis/raw/functions/0800c4d8.c).

**STATIC.** The amplified branch multiplies power by 1.5 before byte truncation and clamps resulting damage to at least 3. Active attacks, particular movement/facing conditions and statuses can select that branch; it is not simply a critical-hit RNG roll. An object flag and types `0x23/0x24` can double power before conversion. Reflection/counter branches and status-only types execute before ordinary damage. These ordering differences are strategically meaningful. Full names and behavior for every affected type remain **UNKNOWN**. [Hit resolver][hit-resolver].

#### Reactions are states, not one knockback vector

**STATIC.** `0x0800C2C4` clears guard and can cancel the target's active action objects. Damage above 30, a fatal head hit, amplified damage and particular statuses influence strong-reaction selection. It delegates additional eligibility to `0x0800D9A8` and state tables, then chooses states 7/10 or 30/32 for particular projectile/status interactions. It resets attacks, dash-related fields and other transient controls. Guard reaction `0x0800C4D8` generally selects state 16, but fatal-head/state conditions can select 10. [Normal reaction](../../medabots-decompile/analysis/raw/functions/0800c2c4.c), [guard reaction](../../medabots-decompile/analysis/raw/functions/0800c4d8.c).

**UNKNOWN.** Full knockback distances, immunity windows, recovery input rules, all reaction durations and status conversions are not completely recovered here. A configurable stagger duration and single velocity impulse can approximate the result, but must be labeled an approximation until matched against controlled original traces.

#### HP application and KO

**STATIC.** `0x0800C8C8` first computes each old HP display value as integer `oldHP*12/maxHP`, preserving at least 1 display unit while oldHP remains positive. It subtracts signed damage through a halfword, reloads signed 16 and clamps values below 1 to 0. Zero armor triggers slot destruction and clears slot status fields. It is not an explicit overflow-damage spill into a second part. [HP reconstruction][combat-reconstruction], [HP consumer][hp-c].

For eligible non-status 3 actors below full meter, this path adds integer `damage/3` to the underlying gauge and caps it 51. The reviewed arithmetic uses the computed damage parameter, not a prior clamp to remaining HP; do not automatically substitute actual armor lost on overkill. The caller and effect ordering still matter. [HP reconstruction][combat-reconstruction].

When head HP reaches 0, the actor is disabled and stops normal input, its actions are reset, and state 10 begins. Main actors 0/1 immediately set the battle input lock and defeat presentation stage 1; partners do not set those global latches. The replacement records change equipment identity and appearance. See [broken-leg movement](#broken-legs-install-replacement-equipment) and the broken-arm action below. [HP consumer][hp-c], [attack gates](../../medabots-decompile/analysis/raw/functions/08005c10.c).

**UNKNOWN / emulation caveat.** An inherited-register store at `0x0800C984` appears to write to address 0/1 on reviewed paths. The sibling's path-sensitive audit preserves machine behavior rather than guessing an intended pointer. This is not a mechanic to reproduce with unsafe native memory writes in JavaScript, and it prevents declaring the reconstructed C a complete source replacement. [Store audit](../../medabots-decompile/docs/combat-r9-store.md).

#### Broken arms retain a weak frame attack

**STATIC; not yet measured in a damaged-arm runtime experiment.** The destroyed weapon is replaced by a weak frame attack. It is incorrect to describe every arm action as unavailable at zero armor.

Replacement arm records 30/31 have action type 34, raw power 1 and refill 16. Their five-byte action-eligibility rows at `0x08089DF8` are both `[0,232,0,0,234]`: head has no stream, but right and left do. The arm branches in `0x08005C10` check status and readiness, without requiring positive arm HP. The head branch separately requires positive head HP and remaining uses.

Right streams 232/233 and left streams 234/235 have two eight-update frames. They enable the primary event at frame 0/tick 0, with no travelling secondary object. The constructor produces attack-object type 45 (`0x2D`), which performs actor contact through `0x08009A70` / `0x0800B9EC`. Both collision frames use an enabled 27×6-pixel region with raw right-facing table offset `(-14,5)`, before facing reflection and actor/animation offsets; the object's visual animation has two four-update frames and does not loop.

The hit resolver gives this object **2 normal damage, 3 amplified damage, or 1 guarded damage** directly. Its raw power value is therefore not its final damage. Action readiness resets to zero and requires 20 **eligible refill updates** at 16 per update to reach 320; that does not mean a new action is available 20 total frames after the input, since animation and refill gates still apply. AI use, exact contact placement in all poses, and damaged-arm observed timings remain open checks.

Sources: [attack eligibility](../../medabots-decompile/analysis/raw/functions/08005c10.c), [right action](../../medabots-decompile/analysis/raw/functions/08008610.c), [left action](../../medabots-decompile/analysis/raw/functions/08008a8c.c), [constructor](../../medabots-decompile/analysis/raw/functions/080160c8.c), [contact handler](../../medabots-decompile/analysis/raw/functions/08009a70.c), [damage branch](../../medabots-decompile/analysis/raw/functions/0800baf8.c). Dispatch/data checkpoints: `0x0832B3C4`, `0x08328158`, `0x0832AA64`, `0x0832A294`.

### Medaforce

#### Gauge and automatic charging

**STATIC.** Underlying gauge `actor+0xA8` caps at 51. Display byte `+0xA7` approaches it by 1 each eligible call to `0x08017DAC`. The activation gate reads the **display byte**, so smoothing participates in eligibility; it is not safe to move all of this interpolation into a purely cosmetic renderer if exact input timing is wanted. [Gauge consumer][gauge-display], [activation][special-start].

Three confirmed gain paths:

1. **Damage received:** eligible HP application adds integer damage/3, cap 51; excludes status 3. [HP reconstruction][combat-reconstruction].
2. **Readiness-idle passive gain:** `0x080192E0` advances counter `+0xAA` when its scan found no nonfull action record with a nonzero refill increment; after the counter exceeds 40 it resets 0 and adds 1 gauge. The boolean is set even if an active-slot check prevents that record's refill. This is 41 eligible calls, not 40, and it is not simply “standing still.” Other global/status gates apply. [Refill C][refill-c], [refill Thumb](../../medabots-decompile/analysis/raw/functions/080192e0.asm).
3. **Sustained idle charging effect:** state 0 handler `0x080065D8` requests a charging pose at state timer 170 if eligible, then constructs an object through `0x08016D50` while idle timer≥170 and gauge is below 51. The constructor creates type `0x25`; handler `0x08009888` increments its timer and adds 1 gauge every 16 effect updates. Leaving idle, reaching full gauge, result lock and statuses can remove the effect. [Idle state](../../medabots-decompile/analysis/raw/functions/080065d8.c), [effect constructor](../../medabots-decompile/analysis/raw/functions/08016d50.c), [charging object](../../medabots-decompile/analysis/raw/functions/08009888.c).

**INFERRED.** Compatible passive and idle-effect paths can contribute during the same broader idle period. A precise wall-clock “time to full” needs starting counters, refill progress, phase/update order, interruptions and display lag. It should be measured, not replaced with `51*16` or a held-key charge rate. No dedicated hold-to-charge input is established by these paths. **UNKNOWN:** all other gauge-changing weapon/status effects and whether dealing damage itself grants gauge through another path.

#### Activation and effect selection

**STATIC.** New Select (`0x0004`) triggers `0x08005B34` only when not guarding/state 9, no normal action/Medaforce, appropriate eligibility tables/effect/status checks pass, and display gauge is 51. Ordinary activation sets action flag `+0xA6`, starts animation, and sets `W+0x1CAA = actorID+1`. This changes the normal update path. [Activation][special-start].

Initializer `0x0801BF54` clears the 20 attack-object slots, cancels actors' current attack substates, changes palette presentation and prepares the special sequence. At a later body animation stage, `0x0801C3DC` selects an effect using **medal ID** `actor+0x38`; medal 11 instead draws a battle byte modulo 11. It creates a separate effect record, clears gauge/display to 0, resets all three action readiness counters, and clears the global activation flag. This is more than spawning one powerful character projectile. [Special initializer](../../medabots-decompile/analysis/raw/functions/0801bf54.c), [special sequence](../../medabots-decompile/analysis/raw/functions/0801c3dc.c), [medal assignment][initialize].

**UNKNOWN.** Every medal's English special name, effect physics, status/damage behavior, duration, counters and cancellation cases remain incomplete. The current `REACTOR BURST` and one-special-per-character design must not be represented as recovered original moves. Global activation pause/cancellation is authoritative behavior, unlike the prototype's presentation-only strong-hit freeze.

### AI, tactical panels and randomness

#### The original AI also produces inputs

**STATIC.** `0x08010F10` generates actor 1 input when no second human is present, then actors 2/3, skipping disabled actors. `0x08011024` builds desired key bits, selects target/movement/attack, writes held keys, derives pressed as `(previous XOR desired) AND desired`, and stores previous. Actors then share the same state/input machinery as humans; AI does not directly mutate damage to attack. The existing normalized-command boundary is compatible in principle, but AI would need to emit the original combinations and edge behavior for fidelity. [AI review][ai-review], [AI reconstruction][ai-reconstruction].

#### Five tactical panels, delayed application

**STATIC.** Five configured panel IDs per medal are copied to actor `+0x14F..+0x153`; the first becomes active. R (`0x0100`) cycles the partner's selected index 0…4, wrapping or resetting to 0 when the chosen entry is `0xFF`. The switch timer is set 1 and incremented in the same call; active panel changes when it reaches 12. Thus it applies on the eleventh invocation counting the press call, after 10 further uninterrupted updates. UI and audio accompany the switch. [Panel reconstruction][ai-reconstruction], [AI review][ai-review].

The prototype's `ATTACK_LEADER / PROTECT_LEADER / AGGRESSIVE` cycle is not a recovered original list. Full panel names and matching semantics need the original panel UI binding. Numeric distinctions are established for several branches:

- Panel 1 prefers right action; 2 left; 3 head while uses remain; 4 suppresses head use.
- Panel 6 and decimal 29 prioritize the opposing main actor in the audited target path; decimal 30 selects its partner.
- Panel 17 disables generated input in `0x08011024`.
- Other selectors use equipment/condition-specific helpers; do not assign them English names from intuition.

**Caution:** source documents sometimes omit a hex prefix. Profile-variant ranges below are explicitly hexadecimal, while target-panel 29/30 above are decimal as represented by their audited branch descriptions. Recheck individual Thumb immediates when transcribing panel enums. [AI review][ai-review], [target selection](../../medabots-decompile/analysis/raw/functions/080110ec.c), [action selection](../../medabots-decompile/analysis/raw/functions/080118c8.c).

#### Numeric profiles and targeting

**STATIC.** Profile group is `5*dominantStat + min(floor(medalLevel/10),4)`, where dominantStat is the first strictly greatest of three medal-derived stats, all zero choosing 0. Panels `0x29..0x2D`, `0x2E..0x32`, `0x33..0x37` choose variants 1…5. Standard parameters are 15 groups×6 variants×7 bytes at `0x08059695`. Overrides start `0x08059648`; 11 seven-byte rows are structurally inferred. Cooldown records at `0x0805990C` are 15×6×4 unsigned 16 values; the last value is multiplied 10. Table 0/variant 0 cooldown values are `[60,40,60,30]` before that multiplication. Numeric parameter fields retain neutral labels until all consumers are reviewed. [Numeric extraction][ai-tables], [profile reconstruction][ai-reconstruction].

Fallback nearest-target selection scans actor IDs 0…3, requires active exactly 1 and different team, and minimizes signed 16 Manhattan distance `abs(dx)+abs(dy)`; ties retain the earlier actor. Another profile choice targets the opposing main actor directly. Selected panels override these fallbacks. [AI review][ai-review], [nearest target](../../medabots-decompile/analysis/raw/functions/08014130.c).

Movement has persistent commands and timers. Near equal height (strictly less than 16 px difference), correction bounds are x8/424; otherwise 24/408. One timer is `(randomByte+10)&15`, another `(randomByte+30)&15`: both can be 0, and neither means “10 or 30 plus a random 0…15.” Terrain prediction and action-specific navigation remain incomplete. [AI review][ai-review].

#### Attack decisions

**STATIC.** Generic action selection draws a battle byte modulo 3 for the first slot, then cyclically tries the other two. Each slot must pass eligibility and a type-specific predicate; no eligible slot returns `0xFF`. Head usage has a conservation gate against elapsed time and remaining charges. Actual attack output also checks per-slot AI cooldown, readiness 320, target facing and action restrictions; it emits B/Up+B/Down+B. Some attack families hold input for 200 counts based on another random-byte branch. This is not three independent per-tick attack probabilities. [AI review][ai-review], [attack policy](../../medabots-decompile/analysis/raw/functions/080112bc.c), [action eligibility](../../medabots-decompile/analysis/raw/functions/08011a20.c).

**UNKNOWN.** Complete navigation, every tactical preference and attack-type predicate, reaction delays under all states, and measured difficulty behavior are not recovered. Our current 150 ms reaction, preferred distance 4.4 world units, aggression 0.83 and guard probability 0.14 are prototype tuning, not original data. [Current balanced AI](../game-data/ai/balanced.jsonc), [current controller](../src/battle-session/ai-controller.ts).

#### Randomness is a fixed stream with branch-sensitive consumption

**STATIC.** Battle RNG `0x08017B20` reads a byte from a 256-byte ROM stream at `0x083283DC`, then increments an 8-bit index at `0x03001094`, wrapping after 256 calls. The first four values are 71, 174, 3, 243. The stream is not a permutation: 1 is duplicated and 17 absent. Preview/loadout routine `0x08004894` increments the same index without reading it; the reviewed battle initializer does not reset it. Prior menu/preview activity therefore affects battle randomness. [RNG reconstruction][ai-reconstruction], [numeric stream][ai-tables], [RNG review][ai-review].

Part selection consumes three consecutive values; timeout consumes one only at an otherwise exact tie; AI branches consume additional values conditionally. A deterministic port needs original stream position and update/call order, not just any seeded PRNG that produces reproducible output. The current seeded core is a useful architectural boundary but is not automatically sequence-compatible.

A separate menu generator uses two 32-bit words and a signed lookup table; it is not the battle generator. Its relevance is battle setup and menu-dependent state, not a reason to replace the flat command interface. Exact boot/link seeding and all writers remain partly unresolved. [RNG review][ai-review].

### Timer, defeat and result

#### Immediate rule decision versus presentation

**STATIC.** Main head destruction records the defeated actor immediately and locks input. The subsequent presentation uses distinct stages: stage 1 timer 5 requests an update-suppression mode; at 60 it captures camera and advances; camera stage 2 interpolates toward the defeated actor over 15 updates. Other presentation stages use 30-update waits. Defeat actor state 15 shows text at timer 100, disables the actor at 160, and camera later moves toward defeatedID XOR 1. The full stage 4→state 15 trigger remains untraced. These counts are not all additive elapsed battle ticks, because different update subsets run during the sequence. [Combat review][combat-review], [scene battle handler](../../medabots-decompile/analysis/raw/functions/0800291c.c), [defeat actor state](../../medabots-decompile/analysis/raw/functions/0800949c.c).

**OBSERVED.** The unattended initial battle's outcome switched to 1 at observer frame 13197 and it returned to main scene 2 at 13676 with winner 1. This corroborates end-to-end result flow, not every transition interpretation or damage formula. [Runtime observations][runtime].

#### Timeout has ordered tiebreaks, not total-team armor

**STATIC.** Timer handler `0x080030A8` decrements remaining seconds once per 60 eligible calls and at zero locks inputs and starts timeout outcome 9. Result selection `0x08020900` compares, in order, returning at the first difference:

1. Number of living combatants on side 0/2 versus side 1/3.
2. Number of surviving parts on main actor 0 versus 1.
3. Number of surviving parts on partner 2 versus 3.
4. Integer percentage of main actor total remaining HP relative to its own starting total.
5. Integer percentage of main actor head HP relative to its own starting head HP.
6. **Lower** main-actor medal level.
7. A battle-RNG bit; odd chooses side 0, even side 1.

The percentage results are narrowed to bytes. Partner armor percentage is not an additional final criterion. No draw return exists in this audited routine. This differs materially from our `finishAtTimeout()` cross-multiplication of both actors' armor with equal-score draw. [Timeout C][timeout-c], [timeout instructions](../../medabots-decompile/analysis/raw/functions/08020900.asm), [medal-level assignment][initialize], [current result logic](../src/battle-core/results.ts).

Exit `0x080207EC` normally sets winner to defeatedID XOR 1; timeout uses the selector. `0x08020854` exports 16 part-survival bytes plus a time-derived value for subsequent result/reward logic. Rewards, inventory losses and progression are outside a reusable battle feature even when their original consumer is documented. [Combat review][combat-review], [result/persistence review](../../medabots-decompile/docs/rewards-progression.md).

### Numeric equipment appendix

The following is a compact factual transcription of all 128 extracted records, grouped by ID for navigation. A row is **not** a canonical assembled character. `H/R/L` cells use `type; HP / power / defense / refill`, with head uses appended. Legs use `type; HP / defense / speed-index; attack-ranks; defense-rank`. All values are **STATIC** raw equipment values interpreted only through established consumers. Placeholders 30/31 remain listed for completeness but are not ordinary valid formation choices. Source: [all part records][parts], [extractor field evidence][extract-combat].

|  ID | Head                         | Right arm            | Left arm             | Legs                       |
| --: | ---------------------------- | -------------------- | -------------------- | -------------------------- |
|   0 | 2; 45 / 40 / 3 / 7; uses 3   | 0; 35 / 5 / 4 / 7    | 1; 35 / 12 / 6 / 4   | 0; 50 / 3 / 3; 5, 0, 0; 0  |
|   1 | 29; 50 / 40 / 4 / 4; uses 3  | 7; 35 / 7 / 5 / 10   | 8; 35 / 19 / 7 / 7   | 1; 50 / 4 / 4; 0, 5, 0; 0  |
|   2 | 29; 40 / 41 / 5 / 4; uses 4  | 1; 25 / 9 / 5 / 10   | 0; 25 / 11 / 7 / 10  | 0; 40 / 5 / 4; 3, 0, 0; 2  |
|   3 | 16; 20 / 6 / 4 / 4; uses 2   | 18; 25 / 5 / 5 / 4   | 18; 25 / 7 / 7 / 4   | 1; 35 / 4 / 5; 0, 0, 3; 1  |
|   4 | 26; 35 / 32 / 4 / 10; uses 6 | 7; 35 / 5 / 6 / 10   | 8; 35 / 17 / 8 / 7   | 1; 45 / 4 / 4; 0, 3, 0; 2  |
|   5 | 30; 45 / 17 / 4 / 4; uses 3  | 0; 40 / 3 / 5 / 7    | 1; 40 / 10 / 7 / 4   | 0; 50 / 4 / 3; 3, 0, 1; 1  |
|   6 | 5; 65 / 24 / 7 / 4; uses 3   | 2; 65 / 24 / 6 / 4   | 3; 65 / 35 / 8 / 1   | 2; 55 / 6 / 1; 4, 2, 0; 1  |
|   7 | 21; 35 / 12 / 8 / 4; uses 2  | 22; 25 / 3 / 7 / 4   | 30; 60 / 8 / 9 / 1   | 6; 80 / 7 / 1; 0, 0, 5; 1  |
|   8 | 20; 50 / 0 / 8 / 16; uses 3  | 20; 50 / 0 / 7 / 16  | 20; 50 / 0 / 10 / 10 | 2; 40 / 7 / 2; 0, 1, 4; 0  |
|   9 | 27; 50 / 0 / 7 / 4; uses 5   | 27; 50 / 0 / 6 / 4   | 27; 50 / 0 / 8 / 4   | 6; 60 / 6 / 3; 0, 0, 4; 1  |
|  10 | 12; 30 / 22 / 7 / 13; uses 4 | 12; 30 / 9 / 6 / 13  | 12; 30 / 13 / 9 / 7  | 2; 30 / 6 / 3; 0, 4, 0; 1  |
|  11 | 3; 60 / 30 / 0 / 4; uses 2   | 3; 60 / 12 / 0 / 4   | 3; 60 / 18 / 0 / 1   | 4; 105 / 2 / 1; 3, 0, 0; 3 |
|  12 | 25; 30 / 30 / 7 / 10; uses 7 | 25; 30 / 12 / 6 / 10 | 25; 30 / 18 / 9 / 4  | 2; 30 / 6 / 3; 0, 1, 0; 4  |
|  13 | 25; 35 / 32 / 4 / 10; uses 6 | 7; 30 / 7 / 3 / 13   | 7; 30 / 15 / 5 / 13  | 1; 45 / 4 / 5; 0, 3, 0; 1  |
|  14 | 17; 30 / 17 / 9 / 1; uses 6  | 17; 30 / 7 / 8 / 1   | 17; 30 / 10 / 11 / 1 | 7; 45 / 8 / 3; 0, 1, 4; 0  |
|  15 | 11; 30 / 16 / 2 / 7; uses 6  | 11; 30 / 7 / 2 / 7   | 11; 30 / 10 / 2 / 4  | 4; 100 / 2 / 2; 0, 3, 0; 3 |
|  16 | 0; 30 / 17 / 4 / 16; uses 8  | 0; 30 / 5 / 4 / 7    | 0; 30 / 10 / 6 / 7   | 0; 45 / 4 / 4; 5, 0, 0; 0  |
|  17 | 2; 60 / 30 / 0 / 4; uses 2   | 2; 60 / 12 / 0 / 4   | 2; 60 / 18 / 0 / 1   | 4; 115 / 0 / 1; 3, 0, 0; 3 |
|  18 | 28; 30 / 0 / 7 / 7; uses 5   | 28; 30 / 0 / 6 / 7   | 28; 30 / 0 / 8 / 4   | 6; 55 / 6 / 3; 0, 0, 4; 1  |
|  19 | 10; 25 / 18 / 5 / 10; uses 5 | 10; 25 / 8 / 5 / 10  | 10; 25 / 11 / 7 / 7  | 1; 40 / 5 / 6; 0, 3, 0; 1  |
|  20 | 19; 25 / 0 / 4 / 7; uses 3   | 6; 20 / 64 / 3 / 4   | 6; 20 / 96 / 4 / 1   | 0; 45 / 4 / 3; 2, 0, 2; 1  |
|  21 | 9; 30 / 32 / 3 / 10; uses 3  | 9; 30 / 13 / 3 / 10  | 9; 30 / 19 / 4 / 4   | 5; 25 / 3 / 4; 1, 3, 0; 2  |
|  22 | 13; 40 / 20 / 8 / 10; uses 4 | 13; 40 / 8 / 7 / 10  | 13; 40 / 12 / 10 / 4 | 7; 55 / 7 / 2; 0, 4, 0; 2  |
|  23 | 5; 50 / 20 / 7 / 4; uses 4   | 5; 50 / 8 / 6 / 4    | 5; 50 / 12 / 9 / 1   | 7; 60 / 6 / 1; 3, 1, 0; 2  |
|  24 | 4; 45 / 50 / 1 / 4; uses 4   | 15; 70 / 6 / 2 / 4   | 23; 35 / 3 / 3 / 1   | 3; 45 / 1 / 6; 2, 0, 1; 2  |
|  25 | 31; 80 / 0 / 7 / 0; uses 0   | 32; 80 / 0 / 6 / 0   | 33; 80 / 0 / 9 / 0   | 6; 80 / 6 / 1; 0, 0, 5; 0  |
|  26 | 15; 75 / 16 / 2 / 4; uses 5  | 15; 75 / 6 / 2 / 4   | 15; 75 / 9 / 3 / 1   | 3; 55 / 2 / 5; 1, 0, 0; 5  |
|  27 | 24; 45 / 12 / 2 / 7; uses 4  | 24; 45 / 5 / 2 / 7   | 24; 45 / 7 / 3 / 4   | 3; 45 / 2 / 6; 1, 0, 3; 1  |
|  28 | 14; 20 / 85 / 3 / 4; uses 3  | 14; 20 / 34 / 3 / 4  | 14; 20 / 51 / 4 / 1  | 5; 20 / 3 / 4; 1, 3, 0; 2  |
|  29 | 4; 45 / 58 / 3 / 4; uses 2   | 0; 30 / 7 / 3 / 7    | 1; 30 / 14 / 5 / 4   | 0; 55 / 3 / 4; 4, 0, 0; 1  |
|  30 | 34; 0 / 0 / 0 / 32; uses 0   | 34; 0 / 1 / 0 / 16   | 34; 0 / 1 / 0 / 16   | 0; 0 / 0 / 2; 0, 0, 0; 0   |
|  31 | 34; 0 / 0 / 0 / 32; uses 0   | 34; 0 / 1 / 0 / 16   | 34; 0 / 1 / 0 / 16   | 0; 0 / 0 / 2; 0, 0, 0; 0   |

## Camera, HUD, characters, and visual presentation

### Separate original pixels from modern art direction

**OBSERVED.** The original is a scrolling, side-view **2D sprite game**, displayed at 240×160. The supplied cartoon-style 2.5D image is a separate target. Three.js can reproduce composition, proportions, poses, timing, and color relationships, but smooth 3D models with toon lighting are not literally the original sprite rendering.

For future work, track two acceptance dimensions separately:

1. **Behavioral fidelity:** positions, selection rules, action timing, collision, and outcomes match measured original cases.
2. **Presentation fidelity:** view composition, screen-space character size, camera behavior, HUD placement, silhouettes, key poses, effects, and information timing match an identified original frame or sequence.

This prevents a more detailed 3D model from being mistaken for a more faithful battle. Decide explicitly how 3:2 composition is presented on a 16:9 browser: letterboxing, a reference-sized central gameplay view, or a documented wider-view adaptation. Automatically showing more of the field changes awareness and encounter feel.

### Normal camera and outcome camera

**STATIC; full trajectories have not been runtime-verified here.** `0x08017194` gives a stronger reference than assuming the whole arena is always framed:

- The local main-actor index is `W+EB3`.
- In normal stages 0/1, vertical camera target follows that actor's bottom Y.
- A horizontal look-ahead field `W+1CB0` approaches **+48 or −48** according to facing, changing **2 pixels per eligible call**.
- A further horizontal offset `W+1B88` is added and decays toward zero. Its complete causes are not established here; do not label every such displacement camera shake.
- Camera center is bounded to **X120…312** and **Y80…288**, matching a 240×160 window within the 432×368 field.
- Actor render positions subtract the camera center and add viewport center **(120, 80)**, together with the actor's separate render offsets.
- Defeat stages can center on the defeated actor, interpolate between stored centers over 15 update counts, hold, then move toward the opposing main actor. Timeout has its own presentation branch.

A facing reversal can therefore shift the look-ahead across a 96-pixel range over 48 eligible calls; this is a table/code-derived prediction, not a measured camera easing curve. There is no evidence here for the prototype's adaptive all-combatant zoom or a perspective camera.

The outer battle scene also prepares background scroll values. One stage-dependent branch uses quarter-scale camera offsets, another uses full offsets; another vertical component divides a camera offset by six. Some layers also have their own scroll counter. This supports layered parallax, but exact artwork-to-layer binding and every per-stage scroll rule remain incomplete.

Sources: [camera C](../../medabots-decompile/analysis/raw/functions/08017194.c), [camera Thumb](../../medabots-decompile/analysis/raw/functions/08017194.asm), [initial look-ahead](../../medabots-decompile/analysis/raw/functions/080017fc.c), [scroll preparation](../../medabots-decompile/analysis/raw/functions/08000ae8.c).

### HUD composition and actor assignment

**OBSERVED**, corroborated by the corner-coordinate table and HUD consumers. Active-battle captures at frames 6000, 9000, and 12000 show compact armor widgets and gauges in all four corners, H/R/L readiness bars at bottom center, a tactical icon near the top, and small world-space team/status markers. They do **not** show the prototype's four large cards, continuous numeric HP labels, central `03:00` display, character names, or `2 VS 2` banner in those sampled fighting frames. This is a bounded observation, not proof such text never appears in another phase.

Original corner order differs from the prototype's top-left/team-A and top-right/team-B grouping:

```text
Partner actor 2                                      Partner actor 3
parts / meter / head uses     tactical panel       head uses / meter / parts

                  scrolling 240×160 gameplay
                 local leader is camera subject

Leader actor 0                      H readiness       Leader actor 1
parts / meter / head uses           R readiness     head uses / meter / parts
                                   L readiness
```

**STATIC.** Sixteen `(x,y)` anchors read directly from table `0x0805A5BE` are grouped as four parts per actor. They are native-pixel anchors, not percentages or widget bounding rectangles:

| Actor / corner   | Head       | Right      | Left       | Legs       |
| ---------------- | ---------- | ---------- | ---------- | ---------- |
| 0 / bottom-left  | (11, 139)  | (17, 143)  | (5, 143)   | (11, 147)  |
| 1 / bottom-right | (221, 139) | (227, 143) | (215, 143) | (221, 147) |
| 2 / top-left     | (11, 5)    | (17, 9)    | (5, 9)     | (11, 13)   |
| 3 / top-right    | (221, 5)   | (227, 9)   | (215, 9)   | (221, 13)  |

Sources: [HUD emission and coordinate-table consumer](../../medabots-decompile/analysis/raw/functions/08002acc.c), [part-widget animation](../../medabots-decompile/analysis/raw/functions/08017b38.c), [recorded battle run](../../medabots-decompile/.local-tools/runtime-observations/generated/battle-node0-partner-18000-final/). The source run stores frames as PPM; transient PNG conversions used for inspection remain under this project's ignored `.artifacts/original-battle-research/`.

### What each gauge actually communicates

| Information                     | Recovered representation                                                                                                 | Fidelity consequence                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Four-part armor condition       | `floor(currentHP*12/maxHP)` selects condition bands; positive HP is distinguished from destruction.                      | Reproduce discrete part state, not only four continuous progress bars.                                     |
| Condition bands                 | Ratio units 9…12 → state 0; 5…8 → state 1; positive below 5 → state 2; zero HP → state 3.                                | Palette meanings need asset/runtime correlation; do not assign red/yellow/green solely from state numbers. |
| Damage feedback                 | Widget position animation and alternation between old/new condition state; separate floating part/amount display.        | HUD changes have their own presentation timing.                                                            |
| H/R/L readiness                 | Controlled leader's three readiness counters, threshold 320; drawer quantizes in steps of eight into five tiles per row. | These are weapon readiness, not armor or Medaforce.                                                        |
| Head uses                       | Remaining/max head-use bytes select cartridge-like graphics in a seven-tile row.                                         | Ammo must be visible separately from readiness.                                                            |
| Medaforce                       | Underlying halfword `+A8`, display byte `+A7`, cap 51; display moves one toward the value per eligible update.           | Activation reads displayed fullness, so this particular lag affects rules.                                 |
| Tactical panel / player markers | Partner panel selection plus blue/red and letter/arrow-like world indicators in sampled frames.                          | Exact icon dictionary, label meaning, and all status variants remain unbound.                              |

**STATIC detail:** damage display preparation `0x0800CAA4` starts a per-part animation at `W+DB0 + (actor*4+part)*8`. `0x08017B38` can alternate old/new conditions during animation-counter values 14…25, settles the new state at 26, and clears at 38; it can terminate sooner when condition did not change. These are counter landmarks, not a measured universal 38-frame hitflash. Floating display `0x080180FC` has separate counters and positioning above actor height; complete icon/number semantics require further annotation.

The readiness drawer's tilemap writes start at `0x0202845A`, then advance one 32-tile row per action, with five tiles per bar. Its tilemap layout supports a native **40-pixel bar**; the observed labels align H, R, L at bottom center. Keep uncertainty about glyph/palette mapping separate from the confirmed counter source.

Sources: [HP condition classifier](../../medabots-decompile/analysis/raw/functions/0800caa4.c), [condition animation](../../medabots-decompile/analysis/raw/functions/08017b38.c), [floating display](../../medabots-decompile/analysis/raw/functions/080180fc.c), [readiness and tilemap drawer](../../medabots-decompile/analysis/raw/functions/080192e0.c), [head-ammo drawer](../../medabots-decompile/analysis/raw/functions/08017fc4.c), [Medaforce display](../../medabots-decompile/analysis/raw/functions/08017dac.c).

### Character construction and animation

**STATIC.** Preview constructor `0x08004118` composes independent head/right/left/leg equipment, with attachment metadata and leg height. Relevant banks include pose selectors `0x080824F0`, part metadata through `0x08329664`, tile indices through `0x08329704`, graphic pointers `0x08324784`, and leg heights through `0x08329A24`. Twelve-byte pose metadata provides attachment coordinates. Facing can swap head attachment pairs and mirror X as `−(x+32)`.

This supports a composition-based renderer, but it is a **preview** routine. It does not prove every battle animation uses identical attachment or facing rules. The battle renderer also submits four per-actor part placements with facing-dependent draw ordering; body and right-arm animation can advance independently. A single whole-robot bob or rigid arm swing is not enough to match action poses.

Rectangle emitter `0x08022C6C` uses a descriptor with size, shape, palette bank, and row/column counts, then emits a grid of GBA objects. Sprite sizes include square 8/16/32/64, horizontal and vertical rectangles; the visible clipping bounds are 240×160. The shader-like concerns of Three.js do not exist in this implementation. The transferable facts are composition, layering, silhouette, offsets, and timing.

Sources: [graphics review](../../medabots-decompile/docs/graphics-resources.md), [preview constructor](../../medabots-decompile/analysis/raw/functions/08004118.c), [battle sprite submissions](../../medabots-decompile/analysis/raw/functions/08002acc.c), [OAM packing excerpt](../../medabots-decompile/reconstruction/sprites.c).

**OBSERVED visual notes, limited to the inspected starting battle:** the yellow starting robot has strongly separated torso/waist/legs, a dark face/eye area, white/light joint contrasts, large weapon forearms, and extended action poses. The battle images include mixed enemy/partner equipment, with clear colored armor and dark joint gaps. This is a different reference from the existing cartoon-inspired all-four-character showcase. We have not established complete Rokusho, Arcbeetle, or Warbandit original equipment/animation sheets.

For each future character preset, register: four proven part IDs and names; medal/level; native bounds/foot width; head/body/arm/leg attachment points; silhouette and colors from a named original observation; facing behavior; idle/walk/dash/jump/fall/guard/attack/hit/KO key poses; and broken-part replacement appearance. A screenshot of a mixed enemy is not a canonical whole-character model sheet.

### Arena appearance and effects

**OBSERVED for the initial encounter only.** Active stage-0 captures show pale stone platforms and carved columns, broken arches, vine/vegetation accents, green ground, and a warm orange/yellow distant sky. The camera reveals different portions as the leader moves. Frame 5400 in the entry run is still a referee/intro scene with a metal backdrop, despite actor HP already being initialized. Do not mistake it for the actual field artwork.

Visible combat feedback includes bright yellow/orange shot effects, compact shadows, status/damage indicators, poses, and blinking/disappearing elements. Collision geometry and artwork are separate: the visible thick platform underside is not evidence of solid-ceiling collision. The tail visibility of the basic projectile is an established gameplay object behavior, not a generic particle lifetime.

**UNKNOWN:** complete stage names and backgrounds for all 19 fields; all palette cycles; hitflash colors by weapon/armor state; every breakage particle and sound; full status icon dictionary; special effects, fade curves, background motion, and layer priorities across all stages. The background script inventory proves an interpreter and control records, not an already named battle-effects catalog. [Background scripting](../../medabots-decompile/docs/background-scripting.md), [resource loader](../../medabots-decompile/docs/graphics-resources.md).

**ADAPTATION:** retain original screen-space scale and pose timing when building new Three.js geometry. Register smoothing, outlines, expanded aspect ratio, shadows, camera shake, and presentation-only freezes as separate choices wherever original equivalence has not been demonstrated. No ROM sprites, palettes, audio recordings, or reconstructed implementation files have been copied into the playable game by this investigation.

## Audio and battle lifecycle presentation

### Audio seam

**STATIC; audible identities remain UNKNOWN.** The source recovers separate music/effect directories (`0x080A6B84` / `0x080A6FF4`), sample banks, sequenced tracks, priorities, and DMA-driven sample playback. The bounded inventories contain 32 music headers and 98 effect headers, with inferred directory limits rather than universal runtime bounds.

Effect replacement depends on priority; even a rejected replacement consumes its stream pointer. Zero-delay sequence controls can execute in the same audio update. This means “play one sound for every event” may differ audibly under congestion. However, the complete note decoder, pitch/envelope/sample format, and mapping from IDs to heard battle sounds are not established. Do not name a numeric effect “Metabee gunshot” from a nearby call alone.

A future sound reference should record the initiating battle event/state, sound ID, observed start/end, interruption/priority behavior, and the role of the sound. Newly composed sounds can serve the same informational role; loading original extracted samples is a separate asset decision. [Audio review](../../medabots-decompile/docs/audio.md), [audio directory inventory](../../medabots-decompile/data/generated/audio/directories.json).

### Countdown, pause, and result presentation

**STATIC.** Startup `0x08020260` initializes remaining time to **180** and its subcounter to zero. `0x080030A8` decrements one at each 60 eligible calls; it enters timeout logic when zero is reached. It is not a wall-clock deadline. `0x080031D8` has a 30-remaining warning and last-five countdown resource/sound calls; some countdown text is cleared at subcounter 20. Resource identity and exact displayed wording still require visual correlation.

The outer battle scene handles Start requests and pause state, including audio calls and update suppression. Medaforce/outcome paths also change which update groups run. Treating every freeze as renderer-only time dilation would alter readiness, timer, and actor behavior. Conversely, not every display animation is authoritative. Trace the specific gate rather than adopting one global freeze policy.

Leader head loss decides the outcome before the entire defeat presentation finishes. Existing observation: battle scene begins at frame 5238; action play starts later, around 5458; the unattended leader defeat latch changes at 13197; scene returns to persistent/result handling at 13676. This one run does not establish a universal round duration, because AI, setup history, random stream position, damage and interruptions matter.

The source has campaign results, rewards, XP and save transitions. Only their battle boundary is relevant here: record winner, why it ended, final part state, and time. Our future full game can own subsequent consequences. Do not add campaign or networking while applying this reference.

Sources: [timer initialization](../../medabots-decompile/analysis/raw/functions/08020260.c), [countdown tick](../../medabots-decompile/analysis/raw/functions/080030a8.c), [warnings](../../medabots-decompile/analysis/raw/functions/080031d8.c), [battle scene/pause](../../medabots-decompile/analysis/raw/functions/08000ae8.c), [runtime lifecycle](../../medabots-decompile/docs/runtime-observations.md).

## Differences to resolve in this prototype

This is a migration register, **not an implementation made by this task**. File references describe baseline `e809465`; update them when battle behavior changes. Prioritize complete measured cases over adding speculative abstractions.

| Area               | Current implementation                                                                                         | Evidence-led change or decision                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Command vocabulary | `CombatantCommand` has jump edge but no jump-held state or vertical tap edges.                                 | Preserve enough original input information to reproduce release curves, chords, and leg moves. Keep commands flat/serializable.                                   |
| Simulation cadence | Exactly 60 Hz, continuous kinematic values.                                                                    | Decide original display cadence versus a documented 60 Hz approximation; retain original eligible-update counts and integer narrowing where they affect behavior. |
| Actor order        | Team-major state construction.                                                                                 | Explicitly preserve original 0, 1, 2, 3 order in fidelity scenarios.                                                                                              |
| Walking/dash       | Acceleration 74, friction 66; Metabee speed 7.3 and dash speed 18 in world units; fixed dash windows/cooldown. | Original per-mode quarter-pixel movement, state transitions and residuals; choose an explicit pixel/world conversion.                                             |
| Jump               | Gravity 32, initial Metabee jump velocity 17.2; one ballistic arc.                                             | Table-selected short/medium/full movement with carry, fixed fall, leg-specific actions, and collision each request.                                               |
| Arena              | One 32×16-unit industrial field with four flat platforms.                                                      | First match field-0 geometry and camera; then add all documented surface/terrain types and other fields.                                                          |
| Drop/actor contact | Timed drop collision bypass; grounded-only horizontal separation.                                              | Original drop loops, slope joins, support/stacking, pushing, and dash impact.                                                                                     |
| Armor/hits         | Geometric per-part AABBs; head protected; Metabee armor totals 1900.                                           | Actor collision followed by original selection/damage rules; initial part-0 total is 165. Armor scaling alone cannot preserve the original fight.                 |
| Damage             | Configured flat damage and guard multiplier 0.28.                                                              | Defense/leg/medal/status inputs, intermediate integer operations, directional guard and special branches.                                                         |
| Attacks            | Shared startup/active/recovery plus cooldown.                                                                  | Distinct readiness, uses, independent animation channels, event phases, action-specific input commitment and follow-up latch.                                     |
| Projectiles        | Swept checks, lifetime and speed from generic definitions.                                                     | Family-specific motion, object-slot capacity, contact windows and separate visual expiration.                                                                     |
| Broken parts       | Arm actions disabled; visibility plus fixed leg multipliers.                                                   | Install replacement records: weak arm contact attack, fixed leg speed row 2, ordinary jump curves. Measure remaining transitions and reactions.                   |
| Medaforce          | 100 maximum, hold charge at 24/s, generic damage gains and per-character special.                              | 51-unit original gauge paths, display gate, medal-based effect and authoritative activation flow.                                                                 |
| AI                 | Three named strategies, probabilistic reaction logic and seeded PRNG.                                          | Original five equipped panels, delayed application, profile values, input production and branch-sensitive random stream.                                          |
| Timeout            | Team armor percentage; equality gives draw.                                                                    | Original ordered criteria and random final tie resolution, if original rule fidelity is chosen.                                                                   |
| Camera             | Adaptive orthographic framing of active combatants.                                                            | Local-leader scrolling/look-ahead; resolve shared-screen four-human extension separately.                                                                         |
| HUD                | Four full combatant cards, timer and full-name labels.                                                         | Compact original corner topology, categorical part status, ammo, controlled actor readiness, panel/marker semantics.                                              |
| Art/audio          | Procedural cartoon models and synthesized effects.                                                             | Capture original proportions/pose/effect timing first; maintain explicit modern rendering and new-asset choices.                                                  |

Current sources: [commands and snapshots](../src/battle-core/types.ts), [movement](../src/battle-core/movement.ts), [collision](../src/battle-core/collisions.ts), [combat](../src/battle-core/combat.ts), [damage](../src/battle-core/damage.ts), [projectiles](../src/battle-core/projectiles.ts), [timeout](../src/battle-core/results.ts), [rules JSONC](../game-data/rules/battle-rules.jsonc), [Metabee legs](../game-data/characters/metabee/parts/legs.jsonc), [AI](../src/battle-session/ai-controller.ts), [renderer](../src/render/renderer.ts), [HUD](../src/ui/hud.ts).

The useful existing boundaries remain: browser-independent battle rules; input/AI producing normalized commands; a local session driving simulation; immutable validated content; detached snapshots/events; Three.js/HTML consuming results. Original display-gauge lag, random cursor, input tap counters, animation phases that spawn attacks, and any authoritative special freeze would need persistent simulation state. Future networking can transport that state later; it is not part of this research task.

## Verification record and reproduction

### Checks performed for this document

The sibling workspace was inspected read-only. This pass wrote its reports, temporary image conversions, and fresh emulator output under this project's ignored `.artifacts/original-battle-research/`, not into the decompilation source or the game's assets.

| Check                          | Result and scope                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ROM identity                   | Recomputed SHA-256 matches the recorded image; size/header evidence agrees.                                                                                                                                        |
| Movement verifier              | Reran the existing verifier against actual stored mGBA CSVs: 56 ground +107 vertical +24 carry/steering positions match; landing-input check passes.                                                               |
| Attack verifier                | Reran the existing verifier: 72 travelling-object positions, readiness, uses, recoil, concurrent movement, four initialization phases and follow-up latch checks pass.                                             |
| Equipment regeneration         | All 128 extracted part records and table metadata match stored JSON; all 32 appendix rows were checked against the four slot records, including every transcribed field.                                           |
| Stage regeneration             | Called the bounded extractor against the original bytes and compared all 19 complete records with stored JSON; exact equality. Includes 57 source platform records and 76 spawn pairs.                             |
| Direct data/code checks        | Independently read the head-weight and HUD-coordinate tables; reviewed their consumers and relevant assembly.                                                                                                      |
| Visual inspection              | Inspected real captures at 5400/6000/9000/12000, including native and nearest-neighbor enlarged views; entry frame 5400 is distinguished from fighting.                                                            |
| Fresh natural-input experiment | Ran mGBA for 5, 560 frames with the original clear-jump-full schedule, without RAM/ROM mutation. Compared 54 post-frame rows ×12 fields = **648 matching values** against the existing run, from frames 5470…5523. |
| Fresh jump result              | Takeoff bottom Y311, X81, maximum rise 108, landing at frame 5523 after 53 movement updates; initial HP remains unchanged throughout the compared span.                                                            |

The fresh CSV SHA-256 is `d862b2ac9cc2cb705e1fad0b73fa1239a523bd59c05a9f2c8239e17305826097`. Log byte equality is not required across observer revisions with extra columns; the explicit compared fields were state, state timer, X/Y, four HP values, jump curve/hold/duration, and water slowdown.

These checks do **not** validate every damage input, non-default leg, water/slippery/conveyor path, dynamic-platform trajectory, homing weapon, Medaforce effect, named character, sound, or link session. Passing Python extraction tests is not proof of a gameplay interpretation. No prototype behavior was modified, so this documentation task did not rerun unrelated browser-game regression tests.

### Reproduce a fresh run without changing the source workspace

From this repository root, with the sibling's observer already built:

```sh
mkdir -p .artifacts/original-battle-research
../medabots-decompile/.local-tools/runtime-observations/observe_mgba \
  '../medabots-decompile/Medabots AX - Metabee Ver. (Europe) (En,Fr,De,Es,It).gba' \
  .artifacts/original-battle-research/fresh-clear-jump-full \
  5560 \
  ../medabots-decompile/tools/physics-schedules/clear-jump-full.schedule
```

Choose a new output directory to preserve an earlier experiment. The observer uses natural button schedules, HLE BIOS, a run-local save, post-frame CSV sampling, and 300-frame image intervals. Startup/formation takes thousands of frames; do not assume the first logged battle-scene frame is already playable.

The original verification tools have fixed sibling output directories. In this investigation they were imported with Python bytecode writing disabled and their `OUT` path redirected before `main()` was called. Their inputs remained the existing original observations. Refer to the source tools for exact assertions rather than inventing new expected values from the prototype. [Movement verifier](../../medabots-decompile/tools/verify_physics_runtime.py), [attack verifier](../../medabots-decompile/tools/verify_attack_runtime.py), [observer source](../../medabots-decompile/tools/observe_mgba.c), [schedule catalog](../../medabots-decompile/tools/physics-schedules/README.md).

### Provenance checkpoints

There is no Git revision available for the supplied decompilation directory. The ROM hash plus these inspected source/data hashes identify this investigation's inputs more reliably than a path alone:

| File in sibling workspace          | SHA-256                                                            |
| ---------------------------------- | ------------------------------------------------------------------ |
| `reconstruction/movement.c`        | `7e4c5ff83334442e7dc3a6b39f36584e67de5f8078629fa611aa902cd64deac2` |
| `reconstruction/combat.c`          | `b2b4df580802211a8bc9cbad68fc1c0cf9d2730202c21d2e1a98499f190c0253` |
| `tools/verify_physics_runtime.py`  | `4dd155685b2bc1053b7d71a128eaafcdbdb0dad802dfbdab3f94837df3d174a6` |
| `tools/verify_attack_runtime.py`   | `3c87b0bb55da591df348e2d34fc565ed14970096dee2113d3103afda9b88ede7` |
| `data/generated/stages/index.json` | `f91dd80481661389dfa873e278ef8ce52712559f3001e02befa55c1e7b9353fc` |
| `data/generated/combat/parts.json` | `fa9287f2248e354c9d734782a556d8314e6bc2f3d6cd1feab7b1b4831159d6f6` |

A broader local manifest of 3, 251 inspected source/evidence candidate files was recorded for drift detection; a file being inventoried does not mean every instruction was reviewed. Retain hashes when rerunning, and explain whether a changed hash is source correction, regenerated formatting, or a different ROM.

## Unresolved work and acceptance criteria

### Highest-value next investigations

| ID  | Open question                                                                      | Next source / experiment                                                                         | Completion evidence                                                                                |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| U01 | Runtime behavior and appearance of broken parts; remaining transition/status gates | Replacement IDs 30/31 and static weak-arm/speed/jump findings above; natural damaged-part inputs | Before/after movement traces, weak-arm contact/timing/AI use, visuals and status/water transitions |
| U02 | Complete guard, hitstun, knockback, immunity and recovery behavior                 | `0800BAF8`, `0800C2C4`, `0800C4D8`, reaction states                                              | Front/rear guarded hits, known damage inputs, frame-by-frame displacement/action eligibility       |
| U03 | Full damage/selection validation                                                   | Actor contact, preferences, status and damage consumers                                          | Original hits with recorded RNG cursor, attacker modifiers, chosen part, and exact HP delta        |
| U04 | Water, slopes, sliding and conveyors                                               | Stage movement/terrain consumers; fields 6…14                                                    | Controlled travel/reversal/jump traces per leg family and material                                 |
| U05 | Dynamic-platform trajectories and rider transport                                  | `0801A390` initializer and its runtime update consumers                                          | Initial record→position trace; standing rider, jump/drop, boundary and collision cases             |
| U06 | Remaining weapon families and homing                                               | Type dispatcher `08328158`, aiming `0800DC00`, action predicates                                 | Per-family ranges, startup/events, target selection, collision rules, and expiry                   |
| U07 | Every medal's Medaforce                                                            | `08005B34`, `0801BF54`, `0801C3DC`, effect records                                               | Meter gain/lag, activation gates, authoritative freeze, effect and recovery measurements           |
| U08 | Names and complete character sets                                                  | Formation UI, text IDs, slot tables, pose/resource banks                                         | Verified four-slot ID/name/visual bindings for Metabee, Rokusho, Arcbeetle and Warbandit           |
| U09 | Original AI and panel names                                                        | Profile tables and every panel/weapon predicate                                                  | Panel ID→observed policy/name; repeatable navigation and reaction scenarios                        |
| U10 | Complete HUD and camera sequences                                                  | `08017194`, `08017B38`, `080180FC`, tile/palette consumers                                       | State-annotated captures of turning, jumping, damage, fullness, pause, KO and timeout              |
| U11 | All arena artwork and collision bindings                                           | Stage ID, graphics tables, encounter loader                                                      | Nineteen named field records with observed artwork/layers and geometry agreement                   |
| U12 | Audio identities and timing                                                        | Directory IDs and battle call sites                                                              | Event→heard cue mapping, priorities, loops and interruption behavior                               |
| U13 | Refresh/update relationship and slowdown                                           | Main wait, special/pause and optional throttled paths                                            | Instrumented elapsed VBlanks versus actor/timer/animation calls                                    |
| U14 | RNG initialization and history sensitivity                                         | All writes to `03001094`, menu previews, link initialization                                     | Captured prebattle cursor and a reproduced input-to-outcome stream                                 |
| U15 | Original multiplayer contract                                                      | Link setup, controller assignment and room-equivalent lifecycle                                  | Two-instance observation, not only a decoded serial buffer                                         |

These are gaps to investigate, not permission to fill unknowns with plausible standard platform-game rules. The source's own [unresolved list](../../medabots-decompile/docs/unresolved.md) remains relevant and should be updated alongside discoveries in that workspace when a later task authorizes it.

### Small fidelity scenarios before broad conversion

**ADAPTATION test plan.** Implement against source-derived fixtures, not tests that merely mirror new code:

1. Starting leg 0 in clear field 0: walk, release, reverse, dash sequence, all three jumps, carry after release, and jump accepted during landing.
2. A held/released jump that encounters the actual upper-left platform versus the clear X81 corridor.
3. Ready and not-ready B chords; right/left/head milestones; independent movement; right follow-up latch and four animation phases.
4. One controlled actor contact with captured random cursor and all limbs intact; verify chosen part and nonzero head eligibility.
5. Same attack against front guard, rear guard, a destroyed limb, and a fatal main/partner head; verify replacement-arm attacks and broken-leg movement.
6. Original meter idle/passive/hit gain, display catch-up, Select eligibility, readiness reset, and special update suppression.
7. Each timeout comparison level, including the lower-medal-level and final random tiebreak.
8. Camera reversal/look-ahead, field bounds, compact HUD actor mapping, head ammo, readiness and damaged-part states.

For every case, record setup, exact equipped IDs/medal/level, stage, initial positions, input masks, initial random cursor, eligible update number, expected post-update state, and expected visible phase. Keep visual assertions tolerant of the chosen 3D rendering while making gameplay assertions exact in original integer units.

## Maintaining this reference

Add a claim with a stable topic ID, rather than replacing an unknown silently. A useful entry is:

| Field             | Required content                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Claim ID          | For example `MOV-JUMP-01`, `HIT-SELECT-01`, `HUD-ARMOR-01`                                            |
| Behavior          | One precise statement, including exceptions                                                           |
| Evidence status   | STATIC / OBSERVED / INFERRED / UNKNOWN; never inferred from task completion                           |
| Source identity   | ROM hash, source/data file, function address/table range, and relevant branch                         |
| Units and types   | Pixels, quarter-pixels, update counts; signedness/narrowing and evaluation order                      |
| Observation       | Schedule, frame interval, equipment, stage, initial state, log hash; or explicitly “not yet measured” |
| Prototype mapping | File/data entry and whether it matches, approximates, or intentionally differs                        |
| Validation        | Reproducible check and its expected result                                                            |
| Open questions    | Specific unresolved dependency or next experiment                                                     |

When evidence contradicts a previous conclusion, preserve the correction and its reason. Do not turn a game's displayed power value into final damage, a stored curve length into consumed airtime, an initialized actor into active gameplay, or a palette/state index into a name without tracing the consumer. Keep ROM assets and raw code as source evidence in the analysis workspace; this document is the behavioral reference for independently implemented battle work.

[combat-review]: ../../medabots-decompile/docs/combat.md
[combat-reconstruction]: ../../medabots-decompile/reconstruction/combat.c
[attack-review]: ../../medabots-decompile/docs/attack-timing.md
[attack-runtime]: ../../medabots-decompile/data/generated/attack-animation/runtime-verification.json
[runtime]: ../../medabots-decompile/docs/runtime-observations.md
[loadouts]: ../../medabots-decompile/docs/loadouts.md
[initialize]: ../../medabots-decompile/analysis/raw/functions/080017fc.c
[hp-c]: ../../medabots-decompile/analysis/raw/functions/0800c8c8.c
[timeout-c]: ../../medabots-decompile/analysis/raw/functions/08020900.c
[extract-combat]: ../../medabots-decompile/tools/extract_combat.py
[parts]: ../../medabots-decompile/data/generated/combat/parts.json
[tables]: ../../medabots-decompile/data/generated/combat/tables.json
[opponents-review]: ../../medabots-decompile/docs/opponents.md
[opponents]: ../../medabots-decompile/data/generated/combat/opponents.json
[part-selection-c]: ../../medabots-decompile/analysis/raw/functions/0800d32c.c
[part-selection-asm]: ../../medabots-decompile/analysis/raw/functions/0800d32c.asm
[guard-selector-c]: ../../medabots-decompile/analysis/raw/functions/0800d2c0.c
[guard-selector-asm]: ../../medabots-decompile/analysis/raw/functions/0800d2c0.asm
[hit-resolver]: ../../medabots-decompile/analysis/raw/functions/0800baf8.c
[refill-c]: ../../medabots-decompile/analysis/raw/functions/080192e0.c
[gauge-display]: ../../medabots-decompile/analysis/raw/functions/08017dac.c
[special-start]: ../../medabots-decompile/analysis/raw/functions/08005b34.c
[ai-review]: ../../medabots-decompile/docs/ai-randomness.md
[ai-reconstruction]: ../../medabots-decompile/reconstruction/ai_random.c
[ai-tables]: ../../medabots-decompile/data/generated/combat/ai-random-tables.json
