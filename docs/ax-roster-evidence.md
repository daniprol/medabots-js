# AX roster, action names, and field identity evidence

This addendum records findings from the European Metabee ROM used by the [battle reference](original-battle-reference.md). It establishes equipment names, action labels, medals, and field families that were previously unresolved. It does **not** establish the canonical character identity of every assembled part set or complete implementations of every weapon and Medaforce.

ROM SHA-256: `20d77b6d1540908b1f1f2b27fede5d539a0f5edd198f93e7ecbe025a0891ca9a`. All IDs below are decimal; addresses are hexadecimal. All names are English. Sources are in the sibling `medabots-decompile` directory. This document contains factual transcriptions and descriptions, not extracted game artwork or copied implementation code.

## Equipment names: 120 usable parts

**Static consumer evidence:** the formation renderer [0803BF2C](../../medabots-decompile/analysis/raw/functions/0803bf2c.c) indexes the language pointer bank at `0832F674`, then a four-slot pointer bank, then the actual equipped part ID. English resolves to `0832EEA4`, with slot banks:

| Slot      | English name pointer bank |
| --------- | ------------------------- |
| Head      | `0832ECC4`                |
| Right arm | `0832EDB4`                |
| Left arm  | `0832ED3C`                |
| Legs      | `0832EE2C`                |

Each selected resource supplies 256 raw bytes to the BIOS FastSet wrapper: eight 8×8, 4bpp tiles. Rendering these eight tiles horizontally produces a 64×8 name strip. This agrees with the independently observed initial formation screen: Missile / Revolver / SubmachineGun / Ochitsuka. The name strips were reconstructed only in ignored research artifacts and visually read; no original imagery is added to the game or this document.

The table groups equal numeric IDs across the four independent slot banks. “Part set” is a research convenience, not proof of an original character-name field. IDs 30 and 31 are excluded: the renderer uses its placeholder branch, and those numeric records serve destroyed/placeholder equipment. The original text resource 68 independently advertises 120 Medaparts and 12 medals.

Capitalization and spacing below are lightly normalized for readability. Two difficult readings, PateriVulcan and Pertoauto, remain explicitly provisional; consult the source strips before treating their spelling as canonical.

| Set ID | Head          | Right arm     | Left arm      | Legs         |
| ------ | ------------- | ------------- | ------------- | ------------ |
| 0      | Missile       | Revolver      | SubmachineGun | Ochitsuka    |
| 1      | Antenna       | Sword         | PiPo Hammer   | Tatacker     |
| 2      | Variablehair  | PateriVulcan  | Short Shot    | Flare Gather |
| 3      | Holy Helm     | Donor         | Translate     | Petticoat    |
| 4      | Hunter        | Flexor sword  | Straw Hammer  | Sharp Edge   |
| 5      | Tension Up    | Shoot Barrel  | Range Shooter | Abductor     |
| 6      | Deathbreak    | Deathmissile  | DeathLaser    | Deathcrawler |
| 7      | Fracture      | Past Touch    | Past Feel     | Umbilical    |
| 8      | Guardian      | Canceller     | Recovery      | Ace Hooves   |
| 9      | Pretty Face   | Pride Viper   | Desire Bison  | Queendresser |
| 10     | Hatchin       | Catch         | Twist         | Swick        |
| 11     | Tyranolaser   | Megalaser     | Gigalaser     | Roller tank  |
| 12     | Spyder trap   | Cheaper trap  | Cheap trap    | Multi-leg    |
| 13     | Cover-Up      | Ninja Dagger  | Ninja Blade   | Tiptoe       |
| 14     | All repair    | Cure Hand     | Repair Arm    | Purple Fin   |
| 15     | Flip          | Flap          | Flop          | Flavor       |
| 16     | Head Cannon   | Aim Rifle     | Battle Rifle  | Hover        |
| 17     | Missile Base  | Intermissile  | Guidemissile  | Limp tank    |
| 18     | Sala-Head     | Sala-Hand     | Sala-Arm      | Sala-Tail    |
| 19     | Light circuit | Light Jab     | Light Blow    | Quick Alert  |
| 20     | Helmet        | Helmight      | Helming       | Helchaos     |
| 21     | BlastGun      | Fire Gun      | Flame Gun     | Red Tail     |
| 22     | New Wave      | Clinch Wave   | Nibble Wave   | Fishtail     |
| 23     | Power Driver  | Plus Driver   | Minus Driver  | Smacker      |
| 24     | Grave Lane    | Judge Shield  | Crime Shirk   | Pertoauto    |
| 25     | Doggu         | Dog attack    | Dog attack    | Dokan        |
| 26     | Clear shield  | Knight shield | Great shield  | Trojan Horse |
| 27     | Pan           | Pun           | Keen          | Squashbasher |
| 28     | Beck Smile    | Dondon Punch  | Dopa Punch    | Manafly      |
| 29     | Prominence    | Ignition      | Explode       | Firework     |

### Canonical identities: the remaining boundary

The supplied research still does not prove a complete 30-name canonical robot roster. Do not rename every numeric set using an unchecked fan list or assume portrait IDs equal robot IDs. The ROM battle equipment model composes independent parts.

| Existing prototype character | Candidate set | Evidence and limitation                                                                                                                                                                 |
| ---------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metabee                      | 0             | Starting playable set, corroborated in an actual formation screenshot. Canonical identity still requires the visual/name cross-check; the four equipment names themselves are verified. |
| Rokusho                      | 1             | Antenna / Sword / PiPo Hammer / Tatacker. Strong identification lead, not a recovered ROM character-name binding.                                                                       |
| Warbandit                    | 5             | Tension Up / Shoot Barrel / Range Shooter / Abductor. Strong lead; notably these are ranged attacks, so the prototype's melee interpretation should not be treated as AX fidelity.      |
| Arcbeetle                    | 29            | Prominence / Ignition / Explode / Firework. Also the four-part ending reward and ending preview set. Strong lead, not a recovered canonical-name binding.                               |

The ending selection is independently traced in [story progression](../../medabots-decompile/docs/story-progression.md): the reward grants all four part-29 items and [08051C9C](../../medabots-decompile/analysis/raw/functions/08051c9c.c) composes their preview. The dialogue calls it a new model without stating its name.

## Action-type labels: verified numeric mapping

[08029AD8](../../medabots-decompile/analysis/raw/functions/08029ad8.c) reads the selected part record's first byte and indexes the slot-specific text mapping through `0832DB2C`. Its head/right/left pointers all resolve to `0809DD08`, whose 35 u16 entries are exactly 0 through 34. Legs resolve to `0809DD4E`, whose eight entries are 35 through 42. [08028480](../../medabots-decompile/analysis/raw/functions/08028480.c) passes that result to the localized text loader; placeholder records force text 34.

The English wording is independently transcribed in [text-transcriptions.tsv](../../medabots-decompile/data/text-transcriptions.tsv). Consequently this is a consumer-proven action-label mapping, not a guess based on neighboring strings. A label proves identity, not the complete mechanics or timing of the handler.

| Action type | Displayed label | Action type | Displayed label |
| ----------- | --------------- | ----------- | --------------- |
| 0           | Rifle           | 18          | Minute Recov    |
| 1           | Gatling Gun     | 19          | Revive          |
| 2           | Missile         | 20          | Symptom Clr     |
| 3           | Laser           | 21          | Medaforce Ctl   |
| 4           | Beam            | 22          | Confusion       |
| 5           | Break           | 23          | Ineffective     |
| 6           | Sacrifice       | 24          | Indefensible    |
| 7           | Sword           | 25          | No-grap trap    |
| 8           | Hammer          | 26          | No-shot trap    |
| 9           | Fire            | 27          | Change          |
| 10          | Thunder         | 28          | Atk Change      |
| 11          | Freeze          | 29          | Scouting        |
| 12          | Hold            | 30          | Extra Charge    |
| 13          | Wave            | 31          | Void Explode    |
| 14          | Destroy         | 32          | Void Optic      |
| 15          | Defense         | 33          | Void Gravity    |
| 16          | Full Defense    | 34          | (blank)         |
| 17          | Recovery        | —           | —               |

Leg types 0–7 are Dual Leg (SHT), Dual Leg (GRP), Multi Leg, Vehicle, Tank, Flight, Float, and Diving respectively. These names correspond to the movement families in the main reference.

### Four prototype candidates: actual equipment behavior labels

| Set | Head type / label | Right type / label | Left type / label | Leg type / label   |
| --- | ----------------- | ------------------ | ----------------- | ------------------ |
| 0   | 2 / Missile       | 0 / Rifle          | 1 / Gatling Gun   | 0 / Dual Leg (SHT) |
| 1   | 29 / Scouting     | 7 / Sword          | 8 / Hammer        | 1 / Dual Leg (GRP) |
| 5   | 30 / Extra Charge | 0 / Rifle          | 1 / Gatling Gun   | 0 / Dual Leg (SHT) |
| 29  | 4 / Beam          | 0 / Rifle          | 1 / Gatling Gun   | 0 / Dual Leg (SHT) |

In particular, set 1's head is **Scouting**, not a missile. Porting every head as a projectile would preserve neither its ability nor its intended use. The defense, recovery, revive, traps, transformation, and immunity labels likewise identify mechanics the initial three-kind projectile/melee/special model does not yet reproduce.

## Medals and Medaforce names

The same formation renderer selects English medal names through `0832ECB0 → 0832EBAC`, with index `medal ID + 1`; index 0 is the empty placeholder. The twelve resulting name strips were visually read. [0802E3A8](../../medabots-decompile/analysis/raw/functions/0802e3a8.c) resolves the selected medal's description through `0809F4D8 + (medal ID + 1) × 4`. Those text IDs are 43–54. They match the special labels below.

The actual battle activation [0801C3DC](../../medabots-decompile/analysis/raw/functions/0801c3dc.c) selects the medal ID as the special effect ID. Alien/ID 11 first draws a random byte modulo 11, yielding one of effects 0–10. [0801C734](../../medabots-decompile/analysis/raw/functions/0801c734.c) dispatches active effects through pointer bank `083285C8`. Thumb pointer bit 0 has been cleared in the function addresses below.

| Medal ID | Medal name | Medaforce label | Handler                                                                | Raw special record |
| -------- | ---------- | --------------- | ---------------------------------------------------------------------- | ------------------ |
| 0        | Kabuto     | Barrage         | [0801C7B4](../../medabots-decompile/analysis/raw/functions/0801c7b4.c) | `[1, 0, 20, 1]`    |
| 1        | Kuwagata   | Vertical Line   | [0801CE90](../../medabots-decompile/analysis/raw/functions/0801ce90.c) | `[1, 0, 80, 0]`    |
| 2        | Mermaid    | All Recovery    | [0801D064](../../medabots-decompile/analysis/raw/functions/0801d064.c) | `[1, 4, 20, 2]`    |
| 3        | ?          | Question        | [0801D414](../../medabots-decompile/analysis/raw/functions/0801d414.c) | `[1, 3, 20, 1]`    |
| 4        | Spider     | Double Trap     | [0801D748](../../medabots-decompile/analysis/raw/functions/0801d748.c) | `[1, 1, 40, 2]`    |
| 5        | Bear       | Giga Break      | [0801DB88](../../medabots-decompile/analysis/raw/functions/0801db88.c) | `[1, 3, 20, 0]`    |
| 6        | Monkey     | Plus Counter    | [0801DD78](../../medabots-decompile/analysis/raw/functions/0801dd78.c) | `[1, 5, 4, 2]`     |
| 7        | Devil      | Demolition      | [0801E168](../../medabots-decompile/analysis/raw/functions/0801e168.c) | `[1, 6, 60, 1]`    |
| 8        | Unicorn    | Power Drain     | [0801E284](../../medabots-decompile/analysis/raw/functions/0801e284.c) | `[1, 4, 10, 2]`    |
| 9        | Phoenix    | Meltian         | [0801EAF8](../../medabots-decompile/analysis/raw/functions/0801eaf8.c) | `[1, 2, 15, 0]`    |
| 10       | Ghost      | Confusion       | [0801ECE0](../../medabots-decompile/analysis/raw/functions/0801ece0.c) | `[1, 2, 4, 2]`     |
| 11       | Alien      | Random Change   | `0801C730` (empty dispatch entry)                                      | `[1, 7, 0, 2]`     |

The raw four-byte records begin at `0809589C`. [0801FAAC](../../medabots-decompile/analysis/raw/functions/0801faac.c) and [0800DA88](../../medabots-decompile/analysis/raw/functions/0800da88.c) consume record byte 2 as base power and byte 3 as the source stat selector. Do not call byte 1 a status or damage category without its own consumer trace. Special power is scaled by the selected battle-stat modifier; it is not simply a character-specific fixed damage number. Byte 3 selector values 0/1/2 select different imported stat bytes. Their complete naming and per-effect use need further review.

### Bounded handler observations

These observations are static source findings, not fresh emulator verification of every special. Helper calls, exact animation-driven durations, collision rectangles, and status side effects must still be verified before claiming full parity.

- **Barrage, 0:** creates four subeffects at startup. [0801C890](../../medabots-decompile/analysis/raw/functions/0801c890.c) updates their curved/homing motion, with steering work phased by `(battle counter & 3) == subeffect index`. Both enemy actors participate in target selection. This is not one oversized straight projectile.
- **Vertical Line, 1:** creates a paired visual effect and runs collision through the first element. During its active phase it advances horizontally by six original pixels per eligible update, until outside `[-64, 496]`. Exact startup and active bounds depend on its animation state.
- **All Recovery, 2:** starts eight orbiting presentation elements. At effect counter 90 it targets the two same-team actors. [0801D35C](../../medabots-decompile/analysis/raw/functions/0801d35c.c) calls [0800CD58](../../medabots-decompile/analysis/raw/functions/0800cd58.c), which increases each _nonzero_ part's current armor and clamps to its original maximum. Zero-armor parts are skipped: this path does not revive destroyed parts. The value helper is called with the target actor ID in this export; do not replace it with an assumed caster-only power formula before checking the ABI and runtime state.
- **Question, 3:** creates effects at counters 0, 20, and 40, using three reusable subeffect slots. It has a respawn/reuse path after counter 40. Its exact stopping rule is in subordinate helpers, so no fixed duration is assigned here.
- **Double Trap, 4:** starts with a short horizontal movement, then uses angle/target helpers after counter 20. On contact [0801F694](../../medabots-decompile/analysis/raw/functions/0801f694.c) attaches to a target and passes status index 9 to the status setter. The label alone does not establish every trap trigger or duration.
- **Giga Break, 5:** uses a caster-following primary effect plus a second presentation component, and calls the status setter with index 5 on startup. It is not yet proven to be a conventional projectile attack.
- **Plus Counter, 6:** creates four subeffects and also calls [0801F724](../../medabots-decompile/analysis/raw/functions/0801f724.c), a separate contact path. Reflect/counter semantics require that helper's full audit; its label is not sufficient proof.
- **Demolition, 7:** advances a single active visual/collision effect horizontally by six original pixels per update. Its hit consumer has an explicit directional guard rejection branch for effect 7.
- **Power Drain, 8:** creates four subeffects. Its hit path records the actual armor drained, capped at the struck part's current armor; a later state turns the element into effect 12 directed back at the caster. The exact restoration consumer remains to be audited.
- **Meltian, 9:** creates four elements at counters 0, 4, 7, and 9, advances them horizontally by two pixels, and samples a signed vertical curve using a half-rate index. Its special contact helper applies status index 0 and spawns a following effect. The exact status duration and periodic damage are not established here.
- **Confusion, 10:** starts eight orbiting elements and at counter 90 targets both enemy actors. [0801EE54](../../medabots-decompile/analysis/raw/functions/0801ee54.c) passes status index 4 to the status setter for living opponents.
- **Random Change, 11:** activation resolves to a random effect 0–10 before effect dispatch. The ID-11 dispatch entry itself is an empty return, not the random-selection mechanism.

Special collision is its own path: [0801F2E0](../../medabots-decompile/analysis/raw/functions/0801f2e0.c) performs actor-body overlap and [0801F3F0](../../medabots-decompile/analysis/raw/functions/0801f3f0.c) selects a part and applies special-specific reactions. It must not silently inherit every normal projectile rule. The shared damage calculation quarters special base power when guarded and applies defense afterward; amplified cases scale base power by 1.5 with byte narrowing. Minimum damage and guard rejection depend on the consuming path.

## Field families: all 19 field IDs

The field family names are now linked through actual consumers rather than inferred from scenery. [08030F5C](../../medabots-decompile/analysis/raw/functions/08030f5c.c) selects node labels using the phase-dependent bank at `0832E83C`. For phase 0 this points to `080A07BC`: nodes 0–5 map to English text IDs 62–67, naming Ancient Ruins, Seashore, Lake, Factory, Polar Region, and Forest. The initial trial descriptions use 55–60 and corroborate the same order. Node 6 uses text 61, naming the Robattle Championship.

[0803A400](../../medabots-decompile/analysis/raw/functions/0803a400.c) computes the actual field ID from the node family table at `080A1A3A` and three-entry variant table at `080A1A48`. Nodes 7–13 repeat the seven families. Field 18 is the single championship field.

| Field IDs  | Verified family | Original variant selector         |
| ---------- | --------------- | --------------------------------- |
| 0, 1, 2    | Ancient Ruins   | 0, 1, 2                           |
| 3, 4, 5    | Seashore        | 0, 1, 2                           |
| 6, 7, 8    | Lake            | 0, 1, 2                           |
| 9, 10, 11  | Factory         | 0, 1, 2                           |
| 12, 13, 14 | Polar Region    | 0, 1, 2                           |
| 15, 16, 17 | Forest          | 0, 1, 2                           |
| 18         | Championship    | All three selectors resolve to 18 |

“Ancient Ruins I/II/III” or similar labels would be a useful remake menu convention, not recovered original names. Likewise, the scene family does not by itself prove every backdrop color, prop, weather condition, or exact platform animation. Use the existing collision maps and actual battle screenshots for those details.

## Reproducible outputs and limits

The ignored research artifact `.artifacts/original-battle-research/roster-mapping.json` contains the 120 equipment names and resource addresses, verified numeric part stats and action labels, all twelve medals and specials, and all nineteen field identities. Canonical robot-name candidates are deliberately separate from the factual equipment records, whose `canonicalCharacterName` remains null.

The corresponding ignored name-strip sheets are visual research aids only. No ROM graphics, palettes, tiles, or decompiled code should be copied into the playable remaster. The committed document can be used independently of those images; all source tables and consumers are cited above.

Before claiming complete roster parity, still establish all canonical robot identities, resolve the two uncertain spellings, verify special statuses and timing in emulator scenarios, and implement the non-projectile support/transform/trap mechanics. Substituting generic attacks for these labeled mechanisms would be an adaptation, not exact AX gameplay.

## Implementation follow-up: Scouting and Extra Charge

These are static, consumer-traced findings. The numerical action/event streams were freshly read from the same ROM; the new support activation offsets below are derived from the update order rather than measured in a new emulator run.

### Dispatch and exact magnitude

The head-action dispatch in [08008D6C](../../medabots-decompile/analysis/raw/functions/08008d6c.c) maps types 29 and 30 to [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c), which completes when the body animation finishes. The logical object dispatch bank `08328158` maps type 29 to [0800B3B8](../../medabots-decompile/analysis/raw/functions/0800b3b8.c) and type 30 to [0800B63C](../../medabots-decompile/analysis/raw/functions/0800b63c.c).

Both objects capture their magnitude inputs when created by [080168F4](../../medabots-decompile/analysis/raw/functions/080168f4.c):

- Object `+3E`: selected head part's power byte.
- Object `+3C`: leg support adjustment. Both type-29/type-30 attribute records at `0809816C + type × 4` begin with selector 2. That selects leg record byte 8 as rank, then reads `08095899 - rank`. Ranks 0–5 therefore yield adjustments 0, 2, 4, 6, 8, 10.
- Object `+3D`: the caster's support stat, the third byte of the medal-level record's four `stat_bytes`. [08039B08](../../medabots-decompile/analysis/raw/functions/08039b08.c) establishes the import from the actual medal/level record to `030010E1` and its per-actor counterparts.

The magnitude passed to the status setter is:

```text
magnitude = trunc(power × (50 + legSupportAdjustment + medalSupportStat) / 50)
```

The result is narrowed to signed 16 bits at the call boundary. This does not read the targets' defense and does not directly restore armor, readiness, or Medaforce.

| Example loadout / medal | Power | Leg support rank / adjustment | Medal support stat | Magnitude |
| ----------------------- | ----- | ----------------------------- | ------------------ | --------- |
| Set 1, Kuwagata level 1 | 40    | 0 / 0                         | 2                  | 41        |
| Set 5, Kabuto level 1   | 17    | 1 / 2                         | 2                  | 18        |

These are explicit example medal assignments, not a claim that any assembled equipment set permanently owns that medal. Changing the medal level or leg part changes the result.

### Scouting: team head-selection bias

At effect phase 2, frame 4, tick 0, type 29 calls [08018C84](../../medabots-decompile/analysis/raw/functions/08018c84.c) for both same-team actor slots with status index 3, status group 0, and the calculated magnitude. There is no range test. The setter independently rejects an inactive/knocked-out actor, a battle already ending, or replacement of a protected existing group-0 status. Otherwise it replaces that group's previous status, stores `actor+51 = 3`, stores the magnitude at `+56`, and sets its timer at `+62` to **600**.

Normal attack constructors copy that magnitude into object `+4`. The normal hit path [0800BAF8](../../medabots-decompile/analysis/raw/functions/0800baf8.c) supplies it to the weighted part selector, which **adds it to the head weight** after the medal preference multipliers. Thus a magnitude of 41 adds 41 weight units; it does not promise a 41% hit chance. A normal object created while the status is active retains its copied bias after the caster's status expires. [0801FA60](../../medabots-decompile/analysis/raw/functions/0801fa60.c) copies half the magnitude into special objects' head-selection bias instead.

[08019534](../../medabots-decompile/analysis/raw/functions/08019534.c) decrements the status timer on eligible actor updates and clears status `+51` to 255 when it expires. Its hit/display latch can defer that decrement, so 600 is an authoritative counter duration rather than an unconditional wall-clock duration. Applying another ordinary group-0 status replaces Scouting; effects do not stack merely because two teammates cast them.

### Extra Charge: team movement-speed rank boost

At effect phase 1, frame 4, tick 0, type 30 calls the same setter for both same-team actor slots with status index 4, group 0. It uses the same eligibility and replacement rules. The setter stores `actor+51 = 4`, the magnitude at `+56`, and the signed-16 timer `+62 = magnitude × 60`. It sets movement bonus byte `+5E` to **3**.

[0801BCB8](../../medabots-decompile/analysis/raw/functions/0801bcb8.c) computes effective movement rank as:

```text
clamp(baseLegSpeedRank − movementPenalty + movementBonus, 0, 7)
```

Diving legs underwater add their existing +2 before that clamp. Thus the example set-5 boost uses rank 6 instead of rank 3 for **1,080 eligible counter updates**. It changes the existing movement-table lookup, not a continuously multiplied velocity. On timer expiration, `08019534` clears the bonus byte. Replacing Extra Charge with another group-0 status also clears that bonus in the setter. The name does **not** mean instant weapon refill or Medaforce gain in this implementation.

### When the support actually activates

Object animation pointers are at `0832A294`, indexed by `objectType × 5 + effectPhase`. Records have the already-established eight-byte duration/frame/offset layout. The battle loop [0800291C](../../medabots-decompile/analysis/raw/functions/0800291c.c) runs actor/status updates, then actor animation event construction, then object updates. A new object therefore executes its first handler update on its creation tick. [0801656C](../../medabots-decompile/analysis/raw/functions/0801656c.c) advances its frame tick after that handler.

| Object and phase         | Frame durations                  | Relevant action                                                                                    |
| ------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Scouting 29, phase 1     | 2, 2, 2, 2, 2, 2; loop marker    | Frame 3's last update changes to phase 2 and resets its frame/tick.                                |
| Scouting 29, phase 2     | 2, 2, 2, 2, 10, 20; end          | Frame 4/tick 0 applies the status.                                                                 |
| Extra Charge 30, phase 1 | 4, 4, 4, 12, 12, 24; loop marker | Frame 4/tick 0 applies status; frame 5's last update explicitly removes the object before looping. |

Taking the first object handler call as offset 0, Scouting applies its status at offset **15** from secondary-object creation; Extra Charge applies it at offset **24**. Combined with the character event streams below, those are **49** and **48** updates from body-animation initialization respectively. This can be later than the character's attack animation ending. Preserve pending logical support effects independently of the character's current attack state. These offsets assume the normal update path without an intervening global special freeze or other gate.

## Implementation follow-up: action timings for sets 1, 5, and 29

The fresh numeric extraction is retained in ignored `.artifacts/original-battle-research/roster-timings.json`. It includes both facings, source addresses, raw event records, all three right-arm stages, relevant object phases, and Beam release streams. The five-byte action map at `08089DF8 + partID × 5` remains the source; the same table must be selected separately for each equipped part slot.

Offsets below start at **animation initialization**, not the physical B press. Original phase-gated initialization can add 0–3 eligible updates. Event offsets are the preceding animation durations plus the event's frame-local tick. They identify logical object creation, not a guaranteed target hit.

| Set / action                     | Base stream  | Frame durations | Total   | Primary event | Secondary event |
| -------------------------------- | ------------ | --------------- | ------- | ------------- | --------------- |
| 1 head Scouting                  | 152          | 4, 8, 20, 4     | 36      | 4             | 34              |
| 1 right Sword, first             | 226          | 4, 4, 8         | 16      | 4             | None            |
| 1 right Sword, second            | 222          | 8, 4, 4, 4      | 20      | 6             | None            |
| 1 right Sword, third             | 122          | 4, 4, 4, 16     | 28      | 8             | None            |
| 1 left Hammer                    | 124          | 4, 4, 12        | 20      | 2             | None            |
| 5 head Extra Charge              | 150          | 8, 8, 16        | 32      | 12            | 24              |
| 5 right, first / second / third  | 38 / 40 / 42 | 8, 8 each       | 16 each | 0             | 2               |
| 5 left Gatling Gun               | 44           | 8, 4, 4, 8      | 24      | 0             | 2               |
| 29 head Beam, initial            | 208          | 8, 4, 16        | 28      | 12            | None            |
| 29 right, first / second / third | 38 / 40 / 42 | 8, 8 each       | 16 each | 0             | 2               |
| 29 left Gatling Gun              | 44           | 8, 4, 4, 8      | 24      | 0             | 2               |
| Beam head release                | 214          | 4               | 4       | None          | 0               |

Add facing 0/1 to each base stream. Both facings have the same durations and event timing for these entries, although their sprite offsets differ. A right-arm combo's stage transition is still subject to its action handler and buffered B input; reading three rows is not permission to fire all three on one press.

Set 1's Sword and Hammer objects have eight-update primary animation sequences (four two-update records). Their collision eligibility and per-frame rectangles are object-table data; the primary creation offset is not proof of eight unconditional damage updates. Each target may still be accepted/rejected by the normal collision consumer.

### Readiness and ammunition

Head/left readiness resets to 0. A first right-arm action of type 0 or 7 resets to 213. Refill is paused for that actively attacking slot and resumed after action completion, independently of still-active projectiles or support visuals. Other occupancy gates can still prevent a new action after readiness fills.

| Set | Head / right / left refill increments | Head uses | Eligible refill updates from the reset value |
| --- | ------------------------------------- | --------- | -------------------------------------------- |
| 1   | 4 / 10 / 7                            | 3         | 80 / 11 / 46                                 |
| 5   | 4 / 7 / 4                             | 3         | 80 / 16 / 80                                 |
| 29  | 4 / 7 / 4                             | 2         | 80 / 16 / 80                                 |

These counts are mathematical refill counts, not B-to-next-shot durations. Head readiness remains zero after ammunition is exhausted. Types 29 and 30 consume head uses normally; only action types 27/28 take the separate transformation exception in the reviewed action-acceptance code.

### Beam charging and release

Head type 4 dispatches [08008AF4](../../medabots-decompile/analysis/raw/functions/08008af4.c), not the ordinary head completion handler. Its initial stream 208 creates the stationary primary Beam effect at offset 12. The constructor sets `actor+A2 = 1`; after initial body animation completion, the handler increments charge counter `+A0` when `+A2` is nonzero. Reaching counter **90** changes the primary effect from type 4 to charged type 36 and resets its effect animation.

The actor stays in its head action until B is released. On release, it records whether charge was at least 90, requests body stream **214** (plus facing), and emits the secondary Beam on that release stream's first event. That animation request is subject to the same phase-gated initialization. Releasing B before the initial 28-update animation finishes still waits for the completion branch; this is not a cancel. After the four-update release animation, the head action ends and readiness can refill.

The constructor changes a released secondary effect to type 36 when the charged flag is set. [0800BAF8](../../medabots-decompile/analysis/raw/functions/0800baf8.c) doubles the base power of type 35/36 before ordinary damage arithmetic, including subsequent byte narrowing. Thus set 29's Beam base power is **58 uncharged / 116 charged**, before medal/leg modifiers, defense, guard, and amplified-hit rules. This is not a 1.5× charge multiplier.

[08009E64](../../medabots-decompile/analysis/raw/functions/08009e64.c) is shared by Laser/Beam and their charged variants. Its moving secondary uses the captured speed byte, performs overlap before/after each discrete move, and expires outside the extended original arena bounds. Exact visual widths and reaction durations still come from the relevant object tables and hit consumers.

## Medal preference correction: starter heads are not selected uniformly

The weighted hit selector's preference depends on the **attacker's medal**, not the equipped head's numeric part ID. [0800D32C](../../medabots-decompile/analysis/raw/functions/0800d32c.c) reads byte 1 of the medal's four-byte record at `0809589C`, then dispatches through `08328298` to mark preferred target parts before doubling their weights.

Kabuto medal 0 and Kuwagata medal 1 both select preference 0. Its tiny function `0800D4C0` is omitted from the raw C exports, but its original Thumb bytes are `01 20 C8 70 70 47`: it writes 1 to the fourth byte of the preference array and returns. Therefore preference 0 marks **legs**. It is not an empty function. For an intact target, the baseline weights become **head 5, right arm 30, left arm 30, legs 60** before Scouting head bias. With magnitude 41 Scouting they become **46, 30, 30, 60**. RNG modulo and preference logic still mean these are weights, not guaranteed observed frequencies.

## Implementation follow-up: moving platforms

This section resolves the motion fields in the existing 57-record platform inventory. It is a static source/Thumb-checked interpretation, not a new emulator trajectory measurement. All three slots are processed in ascending order before actor movement by [0800291C](../../medabots-decompile/analysis/raw/functions/0800291c.c).

### Record layout and movement

[0801A390](../../medabots-decompile/analysis/raw/functions/0801a390.c) reads eleven signed-16 ROM words per slot at `0806B168 + (field × 3 + slot) × 22` into the 24-byte runtime record at `W+D68 + slot × 24`.

| ROM word | Runtime offset | Meaning established by consumer                                         |
| -------- | -------------- | ----------------------------------------------------------------------- |
| 0        | `+00`          | Active flag, low byte                                                   |
| 1        | —              | Sprite/resource selector; only slot 0 triggers the shared resource load |
| 2        | `+02`          | Initial x, multiplied by 8                                              |
| 3        | `+04`          | Initial y, multiplied by 8; subtract 1 for fields 12/13                 |
| 4        | `+0A`          | Minimum coordinate on the movement axis, multiplied by 8                |
| 5        | `+0C`          | Maximum coordinate on the movement axis, multiplied by 8                |
| 6        | `+01`          | Direction: 1 right, 2 left, 3 up, 4 down                                |
| 7        | `+0F`          | Retained byte; not a demonstrated movement speed                        |
| 8        | `+10`          | Width multiplied by 8 and narrowed to a byte                            |
| 9        | `+12`          | Retained word; no motion meaning established                            |
| 10       | `+14`          | Retained word; no motion meaning established                            |

[0801A128](../../medabots-decompile/analysis/raw/functions/0801a128.c), corroborated by its [Thumb export](../../medabots-decompile/analysis/raw/functions/0801a128.asm), moves an active platform by **exactly one original world pixel per eligible update** along its direction. After moving, it calls rider transport. Reaching or passing the appropriate bound flips direction and sets runtime wait byte `+0E` to **40**. Each subsequent waiting update decrements that byte without moving; the update after it reaches zero resumes movement. There is no acceleration, easing, sine path, speed read from ROM word 7, or endpoint teleport in this consumer.

Eleven of the 57 slots are active, all 48 pixels wide:

| Field / slot | Initial x,y | Direction | Axis bounds | Full steady cycle, including waits |
| ------------ | ----------- | --------- | ----------- | ---------------------------------- |
| 2 / 0        | 192,216     | Down      | y 216–296   | 240 updates                        |
| 9 / 0        | 144,152     | Down      | y 152–272   | 320 updates                        |
| 9 / 1        | 240,272     | Up        | y 152–272   | 320 updates                        |
| 10 / 0       | 128,168     | Down      | y 168–240   | 224 updates                        |
| 10 / 1       | 256,240     | Up        | y 168–240   | 224 updates                        |
| 11 / 0       | -8,216      | Down      | y 216–288   | 224 updates                        |
| 11 / 1       | 392,288     | Up        | y 216–288   | 224 updates                        |
| 11 / 2       | 192,144     | Down      | y 144–344   | 480 updates                        |
| 12 / 0       | 144,231     | Right     | x 144–240   | 272 updates                        |
| 13 / 0       | -56,215     | Right     | x -56–96    | 384 updates                        |
| 13 / 1       | 440,215     | Left      | x 288–440   | 384 updates                        |

Cycle lengths are derived as twice the endpoint distance plus two 40-update waits. Off-field initial positions are intentional data: platforms do not use actors' x=8…424 clamp. The ignored `.artifacts/original-battle-research/platform-motion.json` preserves all 57 raw records, including inactive slots, source addresses, and their decoded movement fields.

### Grounding, landing, and rider transport

[0800E8D8](../../medabots-decompile/analysis/raw/functions/0800e8d8.c) treats an actor as supported by an active platform when `actor.bottom + 1 == platform.y` and its foot interval overlaps the platform's inclusive interval `[x, x + width - 1]`.

The downward clipping helper [080109AC](../../medabots-decompile/analysis/raw/functions/080109ac.c) has an important source-order detail: it stops on the **first active horizontally overlapping platform**, then checks its y against the supplied downward start/travel. It does not scan all overlapping slots to choose the nearest acceptable surface. If that first platform is above the supplied start, it returns the previously clipped travel without considering a later slot. The branch to the common return was verified in [Thumb](../../medabots-decompile/analysis/raw/functions/080109ac.asm). Preserve slot order if testing exact original cases; a physically “improved” nearest-platform search changes behavior.

After each one-pixel platform move, [0801A204](../../medabots-decompile/analysis/raw/functions/0801a204.c) tests all four actors:

1. For vertical movement it reconstructs the old platform y by reversing the just-applied one-pixel step. For horizontal movement y is unchanged, and overlap uses the **new** horizontal platform interval.
2. The actor must be active, have `bottom + 1` at that old y, and overlap using its actual half foot width.
3. A static map surface at the actor center and that y prevents platform transport.
4. For horizontal transport it also samples one foot edge for static support. Without the actor's previous transport flag `+96`, this is the edge in the movement direction; with the flag set, it uses the opposite edge.
5. An accepted rider receives a one-pixel movement through the ordinary collision function, not a direct position assignment. The actor's transport flag is then set; otherwise that invocation clears it.

The function processes each platform independently and overwrites the actor flag per invocation. Waiting platforms do not call transport. It does not establish a persistent parent-child attachment between a robot and a platform. Vertical riders may encounter other actors or the top boundary through the ordinary collision rules.

Fields 12 and 13 have an extra material behavior: the terrain consumer explicitly treats standing on their dynamic platforms as **slippery**, even when the sampled underlying tile is not an ice tile.

## Implementation follow-up: terrain arithmetic

Terrain modifies already table-derived integer movement requests and their existing quarter-pixel residual. It is not a replacement acceleration/friction model. [0800E518](../../medabots-decompile/analysis/raw/functions/0800e518.c) consumes the one-call `actor+E8` terrain flag and invokes [0800F938](../../medabots-decompile/analysis/raw/functions/0800f938.c). Idle/walk/dash explicitly request this processing; idle supplies direction 0 and amount 0 so retained sliding can continue without input.

### Material lookup and order

[0800FDD8](../../medabots-decompile/analysis/raw/functions/0800fdd8.c) samples the center tile in the eight-pixel row containing `bottom+1`; if its byte is zero, it scans nonzero tiles under the foot width. It is not an exact point-on-surface test. Apply the following operations in order:

1. For locomotion types other than Multi Leg (2), Tank (4), and Float (6), shapes 2–4 apply +3 quarter-pixels downhill-right / -3 uphill-left; shapes 5–7 reverse that sign. The addition goes through [0800FB54](../../medabots-decompile/analysis/raw/functions/0800fb54.c) and the actor's existing `+4E` residual.
2. For those same locomotion types, raw material bytes `0x21…0x2F` subtract one from the byte-sized requested amount. The empty-shape byte `0x20` is outside the tested interval.
3. Process slipperiness when the material byte is `0x10…0x1F`, or a dynamic platform supports the actor on field 12/13. Tank (4), Float (6), and Diving (7) skip slipperiness.
4. Clamp a resulting negative signed-byte amount to zero.
5. If the resulting movement direction is nonzero and the amount is less than two, apply an additional **+2 quarter-pixels** using the same residual helper. The [Thumb call](../../medabots-decompile/analysis/raw/functions/0800f938.asm) preserves the existing amount in register r3; the raw C export omits that fourth argument at this call site.

That final half-pixel adjustment means “slow terrain = speed minus one” is only an approximation. It also means a tiny released/reversed ice movement must preserve direction and residual state before rounding.

### Slippery accumulator

Let `A` be signed-16 `actor+EA`, and `d` the signed requested integer displacement after slope/slow processing: negative for left, positive for right, zero for no direction. The consumer uses these cases:

| Condition                 | Accumulator change               | Output displacement before later adjustment |
| ------------------------- | -------------------------------- | ------------------------------------------- |
| `A > 0` and `d <= 0`      | Add -1 if d=0; otherwise add d-1 | `trunc(A / 32)` using the updated A         |
| `A < 0` and `d >= 0`      | Add +1 if d=0; otherwise add d+1 | `trunc(A / 32)` using the updated A         |
| A and d are both positive | Retain the larger of A and 32d   | d                                           |
| A and d are both negative | Retain the smaller of A and 32d  | d                                           |
| A=0                       | Set A to 32d                     | d                                           |

The output's sign selects the movement direction when nonzero. Its magnitude is used as the byte-sized movement amount. The accumulator is then clamped to **[-128,128]**. Same-direction movement does not always output `A/32`: that division belongs to the opposing/release branches. This distinction preserves the original retained momentum on later reversal without inventing continuous acceleration.

The residual helper splits its signed quarter adjustment using truncation toward zero, then applies its signed remainder to the existing residual. Rightward requests add the remainder; leftward requests subtract it. Residual crossing at `<=0` or `>=8` wraps by four and adjusts the integer result with the corresponding direction-dependent sign. Byte narrowing and those asymmetric thresholds are the same important arithmetic boundary used by the original movement wrappers.

The non-terrain fallback [0800FC0C](../../medabots-decompile/analysis/raw/functions/0800fc0c.c) exits if a nonzero material byte or platform support is found. Otherwise its executed tail clears `+EA` to zero; earlier intermediate arithmetic does not survive that final store. This is narrower than an unconditional “normal terrain clears inertia” rule.

### Downhill sliding and conveyors after the state handler

[0800FC94](../../medabots-decompile/analysis/raw/functions/0800fc94.c) runs after the actor's movement state handler. It returns immediately only for jump state 3 and defeat state 10; it has no separate general grounded-state check.

- Ice slope bytes `0x12…0x14` and `0x1A…0x1C` add two quarter-pixels of rightward sliding. `0x15…0x17` and `0x1D…0x1F` subtract two quarter-pixels for leftward sliding. Residual crossing causes a one-pixel collision move. The opposite-signed slippery accumulator is also nudged two units toward zero. Tank (4), Float (6), and Diving (7) skip these slope effects.
- Conveyor bytes `0x31…0x3F` apply a one-pixel rightward collision move; `0x41…0x4F` apply a one-pixel leftward move. Float (6) is immune. The zero-shape bytes `0x30` and `0x40` are excluded by the actual range tests.

Thus conveyors and slope sliding are additional post-state displacements, not factors multiplied into player speed. Preserve the sampled material and original state gates instead of adding a generic grounded-only conveyor rule. Exact terrain/transport runtime fixtures remain desirable; the source arithmetic above resolves the previously unnamed consumers without claiming those emulator scenarios have already been run.

## Implementation follow-up: medal stats and damage

This section resolves the anonymous medal stat bytes and the important difference between normal damage and Medaforce damage. These are static consumer/table findings; the special startup offsets below still need an emulator trace before they should be described as measured timings.

### Medal lookup for every level

[08039B08](../../medabots-decompile/analysis/raw/functions/08039b08.c) looks up an eight-byte record at `0x08095BCC + 8 × (99 × medalId + level - 1)`. It does not calculate stat growth from a linear formula. Bytes 0–1 are the next-level cost; bytes 2–5 are, in order, **shooting, grappling, support, defense**. The last two bytes are unused by this consumer. [080017FC](../../medabots-decompile/analysis/raw/functions/080017fc.c) copies the loaded values into the combatant, while the attack constructors establish which offensive stat each action uses.

| Medal          | Level | Shooting | Grappling | Support | Defense |
| -------------- | ----- | -------- | --------- | ------- | ------- |
| Kabuto, ID 0   | 1     | 10       | 4         | 2       | 4       |
| Kabuto, ID 0   | 5     | 15       | 6         | 3       | 6       |
| Kabuto, ID 0   | 10    | 21       | 10        | 6       | 10      |
| Kuwagata, ID 1 | 1     | 4        | 10        | 2       | 4       |
| Kuwagata, ID 1 | 5     | 6        | 15        | 3       | 6       |
| Kuwagata, ID 1 | 10    | 10       | 21        | 6       | 10      |

The ignored `damage-specials.json` artifact records all 1,188 rows with these semantic names and source addresses. Every row was independently compared with the sibling's [numeric medal extraction](../../medabots-decompile/data/generated/combat/medal-levels.json). Use the lookup for levels 1–99; extrapolating a curve from the starter values changes the original stats.

### Ordinary attacks include equipped-leg adjustments

The [right-arm constructor](../../medabots-decompile/analysis/raw/functions/080160c8.c) and [head/left-arm constructor](../../medabots-decompile/analysis/raw/functions/080168f4.c) use an action attribute selector: 1 selects shooting, 0 grappling, and 2 support. The associated leg rank comes from byte 6, 7, or 8 respectively of the equipped leg's 12-byte record. Defensive leg rank is byte 9. The six-byte table at `08095894`, indexed backward from `08095899`, maps ranks 0–5 to adjustments **0, 2, 4, 6, 8, 10**.

The normal [damage consumer](../../medabots-decompile/analysis/raw/functions/0800d858.c) calculates:

```text
attack = trunc(power × (50 + offensiveMedalStat + offensiveLegAdjustment) / 50)
defense = trunc((struckPartDefense + defenseStatus) ×
                (50 + defensiveMedalStat + defensiveLegAdjustment) / 50)
damage = max(2, signed16(attack - defense))
```

Here `power`, the attacker's stat, and the attacker's leg adjustment are narrowed to unsigned bytes at this boundary. `defenseStatus` is the low byte of status magnitude `+56` only when status group 0's ID at `+51` equals 0; otherwise it is zero. Guard, vulnerability, and charged-beam power changes happen before this calculation. For positive starter values, truncation is ordinary floor division.

Set 0 has shooting leg rank 5 and set 1 has grappling leg rank 5, so their appropriate ordinary attacks receive a **+10** leg adjustment in addition to their level-1 medal stat. Both have defense leg rank 0. The actual part-defense bytes, in head/right/left/legs order, are set 0 `[3,4,6,3]` and set 1 `[4,5,7,4]`.

| Attacker / attack | Raw power | Power after attack-side calculation | Damage against set 1's right arm, Kuwagata level 1 |
| ----------------- | --------- | ----------------------------------- | -------------------------------------------------- |
| Set 0 / head      | 40        | 56                                  | 51                                                 |
| Set 0 / right arm | 5         | 7                                   | 2                                                  |
| Set 0 / left arm  | 12        | 16                                  | 11                                                 |
| Set 1 / right arm | 7         | 9                                   | 4                                                  |
| Set 1 / left arm  | 19        | 26                                  | 21                                                 |

The examples assume matching level-1 Kabuto/Kuwagata medals, no temporary defense status, and neither guard nor vulnerability. They are arithmetic fixtures, not claims about which part a projectile will select. Head selection remains weighted as documented above.

### Medaforce uses a different damage calculation

[0800DA88](../../medabots-decompile/analysis/raw/functions/0800da88.c) reads the attacker's selected Medaforce record at `0809589C + 4 × effectId`. Record byte 2 is base power, and byte 3 is the same offensive-stat selector. **Neither the attacking nor defending leg adjustment participates in this function.**

```text
attack = trunc(adjustedSpecialPower × (50 + offensiveMedalStat) / 50)
defense = trunc((struckPartDefense + defenseStatus) × (50 + defensiveMedalStat) / 50)
damage = max(2, signed16(attack - defense))
```

Vulnerability changes special power to `floor(3 × power / 2)`, narrowed to a byte; guard uses `power >> 2`. Further caller-side conditions should remain separate from this arithmetic function.

| Effect           | Base power / stat | Level-1 attack-side power | Example unguarded damage                            |
| ---------------- | ----------------- | ------------------------- | --------------------------------------------------- |
| Barrage, 0       | 20 / shooting     | 24 with Kabuto            | 20, 19, 17, 20 against set 1's head/right/left/legs |
| Vertical Line, 1 | 80 / grappling    | 96 with Kuwagata          | 93, 92, 90, 93 against set 0's head/right/left/legs |

These numbers explain why porting ordinary damage scaling to specials, or treating a special's base power as its final damage, produces different results.

## Implementation follow-up: Barrage and Vertical Line

### Shared activation, pause, and launch

The [activation consumer](../../medabots-decompile/analysis/raw/functions/08005b34.c) requires a Select press edge and displayed meter `+A7 == 51`, plus state/attack/guard eligibility. It starts body action `0x12`, marks the caster's special state, and sets the shared cutscene flag. [0801BF54](../../medabots-decompile/analysis/raw/functions/0801bf54.c) clears the ordinary attack-object pool and cancels ordinary attacks. This is an original simulation pause, not merely a renderer freeze.

For the examined leg sets 0, 1, 5, and 29, action `0x12` maps to body stream 36. Its frame durations are `[4,8,4,8,24,8,4,24]`. The [battle update ordering](../../medabots-decompile/analysis/raw/functions/08002fc8.c) advances body animation before the [cutscene consumer](../../medabots-decompile/analysis/raw/functions/0801c3dc.c) checks it. Frame 3 starts the shared presentation effect; entering frame 7 starts the selected logical Medaforce and clears the shared pause. At that point displayed/internal meter and the three normal-action readiness values are reset to zero.

Counting the initialization update as offset 0 gives frame-3 entry at offset **15** and the logical effect's construction at offset **59**. These are derived animation-relative offsets, not a claim that the Select input always launches exactly 59 simulation ticks later: the initial battle phase gate can add 0–3 updates, and interruptions/global state need separate runtime verification. The effect counter is 0 on construction; its first movement/collision update uses counter 1. The caster remains in its last, 24-update body frame after the other combatants resume.

### Barrage: four independently colliding homing objects

The [Barrage handler](../../medabots-decompile/analysis/raw/functions/0801c7b4.c), [constructor](../../medabots-decompile/analysis/raw/functions/0801cd94.c), and [motion consumer](../../medabots-decompile/analysis/raw/functions/0801c890.c) establish four logical projectiles, each with base power 20. All four are constructed at effect counter 0 around the caster's center, where center y is bottom minus half the actor's height, truncated toward zero.

| Facing | Spawn angles for objects 0–3 | Integer center-relative spawn offsets |
| ------ | ---------------------------- | ------------------------------------- |
| Right  | 315°, 345°, 15°, 45°         | (8,-8), (11,-3), (11,3), (8,8)        |
| Left   | 225°, 195°, 165°, 135°       | (-8,-8), (-11,-3), (-11,3), (-8,8)    |

The spawn radius is 12 pixels using the original signed sine lookup. **Spawn angle is not initial movement heading:** movement starts at 0° for right-facing attacks and 180° for left-facing attacks.

For effect counters `t < 20`, an initial spread term augments the homing motion. The horizontal term is `±(4 - floor(t / 5))`. The vertical terms for objects 0–3 are respectively `floor(t / 2) - 10`, `floor(t / 7) - 3`, `3 - floor(t / 7)`, and `10 - floor(t / 2)`. These terms stop at counter 20.

Steering runs only when `(battleCounter & 3) == objectIndex`, distributing the four projectiles across battle phases. The first steering update can choose a heading without the later turn cap; subsequent updates limit turning to **16 degrees** toward the selected heading. The selection logic compares the two enemy actors using heading/arrival estimates and a forward-half-plane test. It is more specific than “home on the closest enemy.” Exact tie, angle-wrap, and zero-component division cases remain to be validated before claiming a complete port of target selection.

Base movement is `trunc(5 × sine[heading+90] / 128)` horizontally and `trunc(5 × sine[heading] / 128)` vertically. Add the spread term, then clamp x displacement to **[-4,4]** and y displacement to **[-5,5]** pixels per update. The ignored artifact contains all 360 signed lookup values from `0805C344`; they match `floor(127 × sin(degrees))` at integer degree positions. Use the recorded integers for reproducible cross-runtime behavior rather than depending on floating-point trigonometry.

The active animation has three four-update frames, looping. Its raw hit rectangle for the recorded right-facing frame is offset `(11,8)`, size **13×15**, combined with draw offset `(-16,-16)`. Do not treat a visual sprite's entire extent as the collision region. The [collision consumer](../../medabots-decompile/analysis/raw/functions/0801f2e0.c) checks the logical object **before** movement, resolves the first eligible enemy in its ordered search, and delegates the impact to [0801F3F0](../../medabots-decompile/analysis/raw/functions/0801f3f0.c). An accepted hit switches that object into its non-colliding hit phase, whose four eight-update frames last 32 updates. The four projectiles can therefore cause separate accepted impacts; one projectile is not a repeated area-damage field.

Objects are removed outside x **[-64,496]** or y **[-64,432]**. No fixed active-lifetime counter was found in this handler; inventing a short projectile timeout changes this behavior.

### Vertical Line: two visual pieces, one damaging object

The [Vertical Line handler](../../medabots-decompile/analysis/raw/functions/0801ce90.c) and [constructor](../../medabots-decompile/analysis/raw/functions/0801cf68.c) create two visual effect entries at caster-center x plus or minus **16 pixels**, with caster-center y. Only the primary entry has collision enabled. The secondary follows the primary's animation and position, so the two pieces must not deal two hits.

The primary uses draw offset `(-16,-40)` and an active hit rectangle offset `(4,0)`, size **28×80** in the recorded right-facing data. The secondary's draw offset is `(-16,24)`. The active animation loops four eight-update frames. Starting at effect counter 1, the handler advances animation, checks collision, then moves a still-active primary **six pixels horizontally** in its facing direction. It has no homing or vertical movement in this handler.

The first accepted collision switches the pair into a stationary, non-colliding hit animation lasting four eight-update frames. The secondary is removed when the primary finishes. A traveling primary is removed if x exceeds 496 or drops below -64. Thus Vertical Line is one tall, traveling logical hitbox with power 80, not a sequence of independently damaging melee strikes.

The artifact `.artifacts/original-battle-research/damage-specials.json` preserves these raw animation durations, draw offsets, hit rectangles, source addresses, and formula fixtures. Remaining verification work is narrowly identified: emulator startup/collision traces, Barrage's exact target/angle corner cases, and fully composed mirrored hit rectangles. None of those uncertainties changes the verified power values, projectile counts, six-pixel Vertical Line speed, or the absence of leg bonuses from special damage.

## Implementation follow-up: slope traversal and surface collision

The ordinary [movement dispatcher](../../medabots-decompile/analysis/raw/functions/0800e518.c), verified against its [Thumb export](../../medabots-decompile/analysis/raw/functions/0800e518.asm), handles horizontal travel one world pixel at a time. It does not move the entire horizontal displacement and then snap to a floor. The exact sequence for every accepted horizontal pixel is:

| Direction | Horizontal change | Uphill test at the new center                        | Downhill test after any uphill adjustment                  |
| --------- | ----------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Left      | x -= 1            | `(x,bottom)` is a surface of shape 2–4: request up 1 | `(x+1,bottom+1)` is a surface of shape 5–7: request down 1 |
| Right     | x += 1            | `(x,bottom)` is a surface of shape 5–7: request up 1 | `(x-1,bottom+1)` is a surface of shape 2–4: request down 1 |

The downhill branch requires actor byte `+CF == 0`. The uphill branch has no such gate. The downhill y coordinate uses the **current** bottom after the earlier adjustment. These tests use the center, not the leading foot edge, and invoke the ordinary up/down collision helpers recursively. There is no general maximum-step-height search, eight-pixel step climbing, or arbitrary floor snap in this horizontal path. A one-pixel downhill request may be clipped to zero when the next slope sample has the same height.

`+CF` is not the ordinary airborne/jump flag. The explicit writes in the movement handlers are in [0800846C](../../medabots-decompile/analysis/raw/functions/0800846c.c), leg-type-5 aerial forward burst state 25, and [080084DC](../../medabots-decompile/analysis/raw/functions/080084dc.c), its diagonal dive state 26. They set it to 1 immediately around their movement calls and reset it to 0 afterward. Ordinary jump/fall therefore retains slope descent following when the exact surface test matches. Gating all slope following on `grounded`, or suppressing downhill adjustment for every jump, introduces a broader restriction than the original.

[0800F23C](../../medabots-decompile/analysis/raw/functions/0800f23c.c) returns a shape only when the queried point lies exactly on its surface. Negative y returns zero. Shape 1 is a surface only when `y & 7 == 0`; shapes 2–7 compare `y & 7` against the entry at `080594A8 + (shape-2) × 8 + (x & 7)`. These six height rows are:

| Shape | Surface y offsets across its eight pixels |
| ----- | ----------------------------------------- |
| 2     | 0, 0, 0, 1, 1, 1, 2, 2                    |
| 3     | 2, 3, 3, 3, 4, 4, 4, 5                    |
| 4     | 5, 5, 6, 6, 6, 7, 7, 7                    |
| 5     | 7, 7, 7, 6, 6, 6, 5, 5                    |
| 6     | 5, 4, 4, 4, 3, 3, 3, 2                    |
| 7     | 2, 2, 1, 1, 1, 0, 0, 0                    |

### Vertical clipping and foot order

An upward request uses [0800EB48](../../medabots-decompile/analysis/raw/functions/0800eb48.c). It limits the actor's top to **-32**, then checks overlapping actors overhead while advancing upward pixel by pixel. It does **not** test static tile ceilings or platform undersides. A downward request uses [08010490](../../medabots-decompile/analysis/raw/functions/08010490.c): limit bottom to 367, clip against static map surfaces, then dynamic platforms, then other actors. The original C export omits a preserved fourth argument at the dynamic-platform call; the clipped travel remains an input.

Static downward clipping starts at `bottom+1`. [080105C4](../../medabots-decompile/analysis/raw/functions/080105c4.c) scans candidate tile rows from top to bottom and candidate columns left to right, beginning at `centerX - floor(footWidth/2)`. It includes `floor((leftX mod 8 + footWidth)/8)+1` columns, clipping negative starting columns. For each candidate row, [080106A0](../../medabots-decompile/analysis/raw/functions/080106a0.c) first tests the **center tile**, before any foot-span fallback:

- A flat center surface is accepted at row offset zero.
- A sloping center is accepted when the current row offset is at or above its table height, returning that center's table height. If already below that slope surface, it rejects this row instead of choosing another foot column.
- With an empty center, or a flat center that did not qualify, it scans the foot span left to right. This is endpoint support logic, not a minimum-height search across every foot pixel. Shapes 3 and 6 have no fallback case. Shape 1 requires row offset zero; shapes 2/7 handle upper endpoints at offset zero; shapes 4/5 handle lower endpoints at offset seven. Diagonal neighboring tiles suppress endpoints belonging to a continuing slope: 2 checks upper-left for 4; 7 checks upper-right for 5; 4 checks lower-right for 2 or 1; 5 checks lower-left for 7 or 1. Bounds checks precede these neighboring reads.

[08010538](../../medabots-decompile/analysis/raw/functions/08010538.c) accepts a returned surface only within the requested downward travel. Otherwise it advances to the next tile row or preserves the original request.

Static grounding in [0800F2C4](../../medabots-decompile/analysis/raw/functions/0800f2c4.c) likewise tests center `(x,bottom+1)` first with exact surface equality. Its foot-span fallback is conditional: the center must be empty or an unqualified flat tile, and the raw tile in the next row beneath the center must be zero. It then checks columns left to right with the corresponding endpoint/neighbor rules. Replacing this with unconditional “any foot pixel touches any slope” broadens support beyond the original.

### Static geometry does not form side walls

The horizontal blocker [0800ED1C](../../medabots-decompile/analysis/raw/functions/0800ed1c.c) checks other actors, their overlap/pushing/dash interactions, and their stable slot ordering. The dispatcher separately prevents horizontal movement past centers x=8 and x=424. Neither invokes a static tile side-wall collision test. Combined with the upward helper's lack of map/underside collision and the downward surface clipping, this establishes **surface-only static traversal** in these consumers. Rendering a thick platform must not turn its sides or underside into solid collision boxes. This conclusion concerns the map movement path; actor blocking and explicit arena boundaries remain authoritative constraints.
