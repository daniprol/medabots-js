# AX AI and weapon implementation evidence

This is an implementation supplement to [the battle reference](original-battle-reference.md) and [the roster evidence](ax-roster-evidence.md), reviewed against the local EU Metabee ROM's address-named function exports on 2026-09-06. Numbers are simulation updates or original world pixels unless stated otherwise. Source-derived rules below are **static findings**, not emulator-validated behavior, except where the earlier documents explicitly identify a recorded trace. Raw Ghidra output has missing arguments, tail-call mistakes, and unrecovered jump tables; never mechanically translate it as trustworthy C.

The ignored research artifact `.artifacts/ax-behavior-data.json` holds the numeric action attributes, object-handler pointers, AI predicates, transformation candidates, recovery tie orders, Break waveform, and the existing AI profile/cooldown extraction. It contains facts, not graphical ROM assets. This document is the durable source map.

## Action types and dispatch

The localized action labels are consumer-linked through `08029AD8` and the identity text-index table `0809DD08`; see [the verified mapping](ax-roster-evidence.md#action-type-labels-verified-numeric-mapping). Object dispatcher `08328158` has distinct runtime types beyond the 35 equipment action types. Its caller is [08009694](../../medabots-decompile/analysis/raw/functions/08009694.c). AI predicates come from `083282B8`, read by [080118C8](../../medabots-decompile/analysis/raw/functions/080118c8.c).

The shared four-byte attribute record is at `0809816C + type*4`. Byte 0 is category: 0 grappling, 1 shooting, 2 support, 255 blank; byte 2 supplies nominal range in eight-pixel units; byte 3 supplies object movement speed. Range255 is a sentinel-looking value whose actual interpretation depends on the handler; do not impose a universal 2040-pixel lifetime. Byte1 groups status/application behaviors and must not be confused with category. [Constructors](../../medabots-decompile/analysis/raw/functions/080160c8.c), [head/left constructor](../../medabots-decompile/analysis/raw/functions/080168f4.c), [AI range consumer](../../medabots-decompile/analysis/raw/functions/0801595c.c).

| Type | Action        | Category / range / speed | Logical behavior                                                                          | Object handler | AI predicate |
| ---: | ------------- | ------------------------ | ----------------------------------------------------------------------------------------- | -------------- | ------------ |
|    0 | Rifle         | 1 / 12 / 3               | Straight shot; right-arm combo has separate later object types                            | 08009A84       | 08011CD0     |
|    1 | Gatling Gun   | 1 / 20 / 4               | Straight shot                                                                             | 08009A84       | 08011CD0     |
|    2 | Missile       | 1 / 30 / 4               | Steering projectile, source angle and arrival comparison                                  | 0800DC00       | 08011D00     |
|    3 | Laser         | 1 / 255 / 5              | Charge-capable optical shot; penetrates eligible unguarded impacts according to hit table | 08009E64       | 08011CD0     |
|    4 | Beam          | 1 / 255 / 4              | Charge-capable optical shot                                                               | 08009E64       | 08011CD0     |
|    5 | Break         | 1 / 25 / 3               | Straight X motion with 22-sample vertical waveform                                        | 08009FD8       | 08011CD0     |
|    6 | Sacrifice     | 1 / 255 / 5              | Destroys the firing part when effect becomes active, then shot                            | 08009D6C       | 08012298     |
|    7 | Sword         | 0 / 5 / 3                | Contact plus short released effect; right-arm combo family                                | 08009A84       | 08011CBC     |
|    8 | Hammer        | 0 / 4 / 3                | Contact plus short traveling effect                                                       | 0800A15C       | 08011CBC     |
|    9 | Fire          | 0 / 6 / 3                | Contact; ordinary damage then burning status                                              | 08009F54       | 08011CBC     |
|   10 | Thunder       | 0 / 6 / 3                | Contact; ordinary damage then stun when eligible                                          | 0800A2FC       | 08011CBC     |
|   11 | Freeze        | 0 / 5 / 3                | Contact/lingering effect; ordinary damage then freeze when eligible                       | 0800AD40       | 08011CBC     |
|   12 | Hold          | 0 / 4 / 3                | Contact/vertical moving effect; ordinary damage plus slowing status                       | 0800ADE4       | 08011CBC     |
|   13 | Wave          | 0 / 6 / 3                | Contact; ordinary damage plus same slowing status as Hold                                 | 0800A7AC       | 08011CBC     |
|   14 | Destroy       | 0 / 4 / 3                | Ordinary hit path; front guard suppresses damage entirely                                 | 08009A84       | 08011CBC     |
|   15 | Defense       | 2 / 255 / 3              | Friendly seeking effect grants defense magnitude                                          | 0800AEBC       | 08012304     |
|   16 | Full Defense  | 2 / 255 / 3              | Self effect grants timed ordinary-hit immunity                                            | 0800B154       | 080122C8     |
|   17 | Recovery      | 2 / 255 / 3              | Friendly seeking effect restores one injured surviving part                               | 0800AEBC       | 080123D8     |
|   18 | Minute Recov  | 2 / 255 / 3              | Friendly seeking effect installs periodic recovery                                        | 0800AEBC       | 08012504     |
|   19 | Revive        | 2 / 255 / 3              | Friendly seeking effect restores one destroyed limb; never a KO head                      | 0800AEBC       | 0801269C     |
|   20 | Symptom Clr   | 2 / 255 / 3              | Friendly seeking effect clears harmful status during impact animation                     | 0800AEBC       | 080127A0     |
|   21 | Medaforce Ctl | 2 / 255 / 3              | Applies meter-blocking status to both enemies                                             | 0800B1F4       | 08012820     |
|   22 | Confusion     | 2 / 20 / 4               | Enemy projectile; no ordinary damage, rotates directional controls                        | 0800A380       | 08011CD0     |
|   23 | Ineffective   | 2 / 15 / 4               | Seeking enemy projectile; blocks ordinary weapon use                                      | 0800A850       | 08011FD0     |
|   24 | Indefensible  | 2 / 20 / 4               | Seeking enemy projectile; prevents guard                                                  | 0800A850       | 08011FD0     |
|   25 | No-grap trap  | 2 / 6 / 1                | Arcing enemy projectile attaches a trap for the next grappling action                     | 0800A598       | 08011CD0     |
|   26 | No-shot trap  | 2 / 6 / 1                | Arcing enemy projectile attaches a trap for the next shooting action                      | 0800A598       | 08011CD0     |
|   27 | Change        | 2 / 255 / 3              | Temporarily changes firing part to a table-selected part                                  | 0800E140       | 0801288C     |
|   28 | Atk Change    | 2 / 255 / 3              | Same principle with slot-specific attack candidate lists                                  | 0800E1BC       | 0801288C     |
|   29 | Scouting      | 2 / 10 / 3               | Team support: increases head selection weight                                             | 0800B3B8       | 08012304     |
|   30 | Extra Charge  | 2 / 10 / 3               | Team support: increases speed index by3                                                   | 0800B63C       | 08012304     |
|   31 | Void Explode  | 2 / 10 / 3               | Passive head effect absorbs type2 missiles                                                | 08009A84       | 08010F08     |
|   32 | Void Optic    | 2 / 10 / 3               | Passive right-arm effect absorbs types3/4/35/36                                           | 08009A84       | 08010F08     |
|   33 | Void Gravity  | 2 / 10 / 3               | Passive left-arm effect absorbs type5 Break                                               | 08009A84       | 08010F08     |
|   34 | Blank/frame   | 255 / 3 / 1              | Weak frame attack; actual constructor/hit type45 must be preserved                        | 08009A84       | 08011CBC     |

Every eight-digit handler above names `../../medabots-decompile/analysis/raw/functions/<lowercase-address>.c`. The tiny `08010F08` predicate is not present as a raw C file. Directly inspected Thumb bytes `00 20 70 47` encode `movs r0,#0; bx lr`: passive types31..33 always fail the AI action predicate.

## Object lifetime and damage ordering

[0800BAF8](../../medabots-decompile/analysis/raw/functions/0800baf8.c) handles passive absorption first, then status-only branches, then ordinary guarded/unguarded damage, then status application, then impact-object handling. This order matters: a status-only projectile does not also cause the generic minimum2 damage.

- Void matches are **slot-specific equipped action-type checks**, not a generic armor resistance percentage. On match, [0800C18C](../../medabots-decompile/analysis/raw/functions/0800c18c.c), [0800C1F4](../../medabots-decompile/analysis/raw/functions/0800c1f4.c), or [0800C25C](../../medabots-decompile/analysis/raw/functions/0800c25c.c) enter object phase3 and copy the effect into the victim's effect slot; the ordinary damage branch is skipped. These functions do not change ownership or reverse direction: calling this “reflection” would overstate the recovered code.
- Destroy14 against a front-facing active guard suppresses its damage. This is distinct from ordinary quarter-power guard damage. No unconditional instant-destruction rule is present in this reviewed resolver; its high power comes from its equipment record.
- Sacrifice6 explicitly sets the firing part's HP to0 and equips the broken-frame record in [0800CC4C](../../medabots-decompile/analysis/raw/functions/0800cc4c.c), called by [08009D6C](../../medabots-decompile/analysis/raw/functions/08009d6c.c). It is not merely recoil damage or a meter cost.
- Ordinary front guard skips the post-hit fire/stun/freeze/slow additions. Thunder/Freeze are amplified hits against an already stunned/frozen enemy and do not reapply their special reaction in that branch. Existing stun/freeze is cleared by [0800C2C4](../../medabots-decompile/analysis/raw/functions/0800c2c4.c).
- Laser3 and charged Laser35 have special guard impact behavior. The impact-continuation table at `0805915C` controls whether the logical shot persists after hitting a target; hit flags prevent repeatedly hitting the same actor. Do not translate every optical shot into an infinite repeated damage beam. [Hit resolver](../../medabots-decompile/analysis/raw/functions/0800baf8.c).
- Normal collision order is spatially sorted, not always actor ID: [0800CE18](../../medabots-decompile/analysis/raw/functions/0800ce18.c) builds ascending-X and descending-X actor lists, retaining earlier actor IDs on equal X. [0800B9EC](../../medabots-decompile/analysis/raw/functions/0800b9ec.c) selects the facing-specific list.
- Five object slots belong to each actor, with the fifth used for effect copies. A global pool cap20 alone is not exact object capacity. Action acceptance [08005C10](../../medabots-decompile/analysis/raw/functions/08005c10.c) tests that actor's own slots before accepting B.

[Break5](../../medabots-decompile/analysis/raw/functions/08009fd8.c) increments its age first, then for age>1 subtracts waveform `floor((age-1)/2)%22` from Y. Signed samples at `0805907C` are `[-5,-4,-3,-2,-1,0,1,2,3,4,5,5,4,3,2,1,0,-1,-2,-3,-4,-5]`. X advances speed3. Collision checks are active while travel<=range*7; removal occurs at travel>=range*8, with blinking in between. Hammer8 and traps25/26 share the range*7 versus range*8 distinction. [Hammer](../../medabots-decompile/analysis/raw/functions/0800a15c.c), [traps](../../medabots-decompile/analysis/raw/functions/0800a598.c).

Trap projectile Y motion after incrementing age is `-trunc((20-age)/4)` for age<20; `trunc((age-20)/4)` for age20..39; +5 thereafter. Its horizontal speed is1. It attaches on collision; it is not a stationary arena mine. Seeking status shots23/24 fly straight for their first five updates, then use the integer angle table with a four-degree turn cap. Their arrival/angle target tests remain a dedicated routine, [0800A850](../../medabots-decompile/analysis/raw/functions/0800a850.c), rather than nearest-distance homing.

[Freeze11](../../medabots-decompile/analysis/raw/functions/0800ad40.c) keeps checking an unattached effect until age>39. [Hold12](../../medabots-decompile/analysis/raw/functions/0800ade4.c) moves its unhit effect Y+2 for age<20, Y-2 for20..39, and expires after39. Fire9, Thunder10 and Wave13 use their animation streams and contact phase rather than that same universal movement. Animation geometry and release timing must still be joined to each equipment set.

## Status model and exact counters

There are two independent status slots, not an arbitrary stack: beneficial `actor+51` with magnitude`+56` and timer`+62`, harmful `+52` with magnitude`+58` and timer`+60`. Empty ID is255. Setter mode0/1 installs ordinary beneficial/harmful status; modes2/other install a locked version. An ordinary effect cannot replace an existing locked status of the same group. [08018C84](../../medabots-decompile/analysis/raw/functions/08018c84.c).

For ordinary support powers, `m = trunc(power * (50 + legSupportAdjustment + medalSupportStat) / 50)`. The ROM bytes at `08095894` are `[10,8,6,4,2,0]`, but the consumer reads `table[5-rank]`, equivalently `08095899-rank`: the effective adjustment for ranks0..5 is **`[0,2,4,6,8,10]`**, exactly as for ordinary attacks. Duration multiplication is assigned to signed16 storage; do not silently turn these into unrestricted floats.

| Group      |  ID | Effect                  | Duration / magnitude                                                                 |
| ---------- | --: | ----------------------- | ------------------------------------------------------------------------------------ |
| Beneficial |   0 | Defense                 | 600 updates; add low byte of magnitude to struck-part defense before defense scaling |
| Beneficial |   1 | Full Defense            | `60*m`; its effect constructor uses base12, not the configured part power            |
| Beneficial |   2 | Minute Recovery         | 900 updates; periodic healing magnitude `max(2,m)`                                   |
| Beneficial |   3 | Scouting                | 600 updates; add magnitude to head selection weight                                  |
| Beneficial |   4 | Extra Charge            | `60*m`; speed bonus3, cleared when replaced or expired                               |
| Beneficial |   5 | Medaforce-specific buff | `60*m`; meaning is outside the ordinary action setter                                |
| Harmful    |   0 | Burning                 | 720 updates; magnitude is trunc(accepted ordinary damage/4)                          |
| Harmful    |   1 | Thunder stun            | 60 updates; no magnitude required                                                    |
| Harmful    |   2 | Hold/Wave slow          | 900 updates; speed penalty3                                                          |
| Harmful    |   3 | Medaforce Control       | `60*m`; both enemies affected                                                        |
| Harmful    |   4 | Confusion               | `60*m`; direction remapping                                                          |
| Harmful    |   5 | Ineffective             | `60*m`; blocks ordinary equipped attacks, allows the frame exception                 |
| Harmful    |   6 | Indefensible            | `60*m`; guard cannot start and existing held guard exits                             |
| Harmful    |   7 | No-grap trap            | 600 updates; next category0 attack triggers                                          |
| Harmful    |   8 | No-shot trap            | 600 updates; next category1 attack triggers                                          |
| Harmful    |   9 | Double Trap             | 720 updates; next category0 or1 attack triggers                                      |
| Harmful    |  10 | Freeze                  | 60 updates; no magnitude required                                                    |

Table evidence is the [setter](../../medabots-decompile/analysis/raw/functions/08018c84.c), [hit resolver](../../medabots-decompile/analysis/raw/functions/0800baf8.c), [support receiver](../../medabots-decompile/analysis/raw/functions/0800b8b8.c), [Full Defense constructor/update](../../medabots-decompile/analysis/raw/functions/0800b154.c), and [meter-control effect](../../medabots-decompile/analysis/raw/functions/0800b1f4.c). “Beneficial”/“harmful” are descriptive names for the two actual channels.

[08019534](../../medabots-decompile/analysis/raw/functions/08019534.c) decrements status timers only for active, non-disabled actors, and has HP-animation pause gates (`+6A/+6B` while `+FD` remains set). Thus fixed wall-clock expiry is not identical to this counter behavior. There is no independent timer stack for multiple burns.

**Burning:** retain the struck part in`+69`; if its armor drops below2 choose another eligible part. While harmful timer>120, prepare the periodic hit at `(globalFrame+110)%180==0`; apply at `(globalFrame+90)%180==0`. The latter subtracts magnitude from the selected part and clamps armor to **at least1**. Burning alone cannot destroy a part. [Preparation](../../medabots-decompile/analysis/raw/functions/08018ef0.c), [application](../../medabots-decompile/analysis/raw/functions/08018f50.c).

**Minute Recovery:** retain a selected part in`+68`; retarget if full or destroyed. While beneficial timer>120, prepare at `(globalFrame+20)%180==0`; heal at `globalFrame%180==0`, capped to the selected part's maximum. These phases are global-frame anchored, not “three seconds after this cast.” [Preparation](../../medabots-decompile/analysis/raw/functions/08018ae4.c), [application](../../medabots-decompile/analysis/raw/functions/08018b6c.c).

**Trap trigger:** [08016E4C](../../medabots-decompile/analysis/raw/functions/08016e4c.c) receives the firing part slot and action type. If its category matches the attached trap, the **same firing part** receives the low byte of status magnitude as direct damage; ordinary attack/defense scaling is bypassed. It establishes a hit reaction, consumes the status, sets reaction counter8 (10 for Flight/Float), and returns1 to its caller. The actor must be alive and that part must have positive HP. The callers are the [right constructor](../../medabots-decompile/analysis/raw/functions/080160c8.c) and [head/left constructor](../../medabots-decompile/analysis/raw/functions/080168f4.c). They invoke the trigger before making the logical object active: initial contact objects for equipped types0..14, and also the secondary object for Freeze11. This places the trigger at an animation event, not initial B acceptance.

**Confusion:** [08005860](../../medabots-decompile/analysis/raw/functions/08005860.c) maps directional pressed and held bits according to `(remainingTimer>>6)&3`. Phase0 rotates Right→Down→Left→Up→Right; phase1 reverses both axes; phase2 rotates Right→Up→Left→Down→Right; phase3 leaves directions unchanged. It preserves A/B/L/R/Select/Start. This affects Up+B/Down+B as well as movement; merely reversing moveX loses part of the behavior.

**Stun/freeze:** [08005C10](../../medabots-decompile/analysis/raw/functions/08005c10.c) blocks attacks and [08005B34](../../medabots-decompile/analysis/raw/functions/08005b34.c) blocks special startup for harmful1/10. Reaction state31 [0800905C](../../medabots-decompile/analysis/raw/functions/0800905c.c) reduces remaining timer by12 on its configured input alternation branch. This is mash/recovery behavior requiring its own state, not simply a60-tick generic stagger.

**Meter Control:** blocks passive refill, idle charging, damage-gain and special activation, rather than draining the existing meter. [Passive refill](../../medabots-decompile/analysis/raw/functions/080192e0.c), [charge effect](../../medabots-decompile/analysis/raw/functions/08009888.c), [damage gain](../../medabots-decompile/analysis/raw/functions/0800c8c8.c), [activation](../../medabots-decompile/analysis/raw/functions/08005b34.c).

## Recovery, revival, transformation

[Recovery17](../../medabots-decompile/analysis/raw/functions/0800e2f8.c) heals exactly one surviving injured part. Score every part using `floor(currentHP*12/maxHP)`: full or destroyed→0; score9..11→priority1; score5..8→priority2; score0..4 with positive HP→priority3. Keep only maximal-priority candidates. One shared random byte modulo6 chooses a tie order from `08328140`:

```
H R L G    H R G L    H L R G
H L G R    H G R L    H G L R
```

Thus a tied eligible head always wins; the limb order varies. Heal `max(2,trunc(power*(50+legSupport+medalSupport)/50))`, capped at max HP. Minute Recovery uses the same priority selector to store its next target, [0800E410](../../medabots-decompile/analysis/raw/functions/0800e410.c). These are not uniform random-part heals or total-team armor restoration.

[Revive19](../../medabots-decompile/analysis/raw/functions/0800e26c.c) requires head HP!=0. Draw `rng%3`, cyclically examine right/left/legs from that starting index, and revive the first destroyed limb. Queue its restoration; [08019A70](../../medabots-decompile/analysis/raw/functions/08019a70.c) sets HP to `min(maxHP,trunc(floor(maxHP/4)*(50+legSupport+medalSupport)/50))` and equips the stored original part. Active attack state can delay the replacement. Its power byte is **not** the restoration percentage. KO partners are not resurrected by this ordinary action.

[Change27](../../medabots-decompile/analysis/raw/functions/0800e140.c) and [Atk Change28](../../medabots-decompile/analysis/raw/functions/0800e1bc.c) act at effect frame2's terminal tick. They select a part ID from ROM tables, replace only the firing slot without HP initialization, and set transformation timer900. The original part IDs retained are9 for Change and18 for Atk Change. Candidate sets:

- Change, any slot, `080591FC`: `0,1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,17,19,20,21,22,23,24,25,26,27,28`.
- Atk Change head, `08059217`: `0,6,10,11,15,16,17,19,21,22,23,24,28`.
- Atk Change either arm, `08059224`/`08059236`: `0,1,2,4,5,6,10,11,13,15,16,17,19,20,21,22,23,28`.

Select by one shared byte modulo27/13/18. At remaining121 the timer can stall if the part is currently acting; then replacement warning begins. Remaining20/15/10/5 alternates original/transformed equipment, and0 restores original. [Status/update consumer](../../medabots-decompile/analysis/raw/functions/08019534.c). This needs separate equipped-runtime IDs and immutable content definitions. Modifying loaded part definitions would be incorrect.

## AI is input generation every actor update

There is no general150ms reaction scheduler. [08010F10](../../medabots-decompile/analysis/raw/functions/08010f10.c) visits AI actors1,2,3 in that order (actor1 only if not the second human); [08011024](../../medabots-decompile/analysis/raw/functions/08011024.c) clears desired keys, chooses a target, runs movement, then attacks. Finally `pressed=(previous XOR desired)&desired`, `held=desired`, `previous=desired`. Multiple AI calls in one original update consume the **same** 256-byte battle stream as part selection and damage-related randomness. A separate per-AI PRNG can be deterministic but is not original parity.

Store persistent per-actor AI state: previous desired bits, target, movement command/countdown, jump-hold/obstacle counters, three action cooldowns, inter-press counter, charge-hold/slot, combo latch, guard-reaction counter, special delay, panel/selected panel/delayed switch, and temporary tactical override counters. All are ordinary serializable values; original offset names need not leak into public APIs.

### Profiles and cooldowns

[08015890](../../medabots-decompile/analysis/raw/functions/08015890.c) chooses `group=5*dominantOffensiveStat+min(floor(medalLevel/10),4)`. Dominant stat is shooting/grappling/support, retaining the first strictly greatest entry; ties prefer earlier. Fifteen groups contain six variants of seven numeric bytes at`08059695`; overrides are seven-byte records at`08059648`. Profile members populate target preference, threat reaction fields, and movement/cooldown fields; not every byte has a safe semantic name yet.

[08014004](../../medabots-decompile/analysis/raw/functions/08014004.c) reads the default four-u16 row at`0805990C + group*48`: grappling, shooting, support cooldown and special-delay value. Multiply the fourth by10. Panels41..45 replace shooting cooldown with variant1..5;46..50 replace grappling;51..55 replace support. Panel10 halves support cooldown; panel8 halves grappling and shooting. Override profiles set all three category cooldowns to profile byte4 and special delay to byte5*10.

The action's category chooses a cooldown, but **only the currently selected slot's countdown is decremented** in [080112BC](../../medabots-decompile/analysis/raw/functions/080112bc.c). It does not decrement every slot once each frame. After an accepted action, the corresponding cooldown is loaded; panels1/2/3 set their preferred right/left/head slot to10 instead. A one-update inter-press counter guarantees release edges. For an unmodified level1 shooting-dominant actor, the default category cooldown row is `[60,40,60]`, special-delay base300, and the seven-byte profile is all0. Level1 does not automatically grant the threat-guard behavior found in higher profile variants.

### Targeting and action selection

[080110EC](../../medabots-decompile/analysis/raw/functions/080110ec.c) uses numeric panels6/29 for enemy leader and30 for enemy partner when not disabled. Other specialized panels31..40 delegate equipment/condition predicates. Standard fallback profile field`+142==0` selects minimum Manhattan X/Y distance among active enemies in actor order; equal distance retains earlier ID. Nonzero preference chooses opposing leader. [Nearest helper](../../medabots-decompile/analysis/raw/functions/08014130.c) uses signed16 coordinate differences; its own loop does not separately filter disabled actors.

At `(actorId*4+globalFrame)&31==0`, the attack routine may temporarily test the target's partner. It faces the chosen target before B, postponing by a movement command if necessary. The source-target mutation may be undone by unsuccessful predicate fallback. Do not make target changes unconditional global AI decisions.

[080118C8](../../medabots-decompile/analysis/raw/functions/080118c8.c) is an ordered policy:

1. Panel8 prefers intact Rifle/Sword right arm. Panel1 prefers intact right arm, panel2 intact left, panel3 head with uses.
2. These preferred branches run their type predicate; if that predicate rejects, several branches return255 immediately rather than falling through to a generic alternative.
3. Otherwise consume one battle byte modulo3, cyclically test head/right/left from that slot, and accept the first whose head-conservation gate and type predicate pass. A predicate may itself consume additional bytes and change target.
4. Chosen slot must still pass its own countdown and readiness320. Rejection at those later gates has already consumed selection randomness.

[08011A20](../../medabots-decompile/analysis/raw/functions/08011a20.c) head conservation: panel4 or uses0 forbids head. Apart from Revive19 and head-preferring panel3, ordinary head actions require elapsed seconds >= `u8((maxUses-uses+1)*floor(120/(maxUses+1)))`. Recovery17/18 instead checks [08011AA8](../../medabots-decompile/analysis/raw/functions/08011aa8.c): an intact arm with the same action type suppresses head use; otherwise a surviving injured friendly part below5/12HP is needed (panel10 narrows partner checks). Range estimation uses a separate180-based head-availability gate; do not conflate it with120-based action conservation.

### Predicate behavior by family

- Types7..14 and34: [08011CBC](../../medabots-decompile/analysis/raw/functions/08011cbc.c) calls the geometric helper with no random gate. Types0/1/3/4/5/22/25/26: [08011CD0](../../medabots-decompile/analysis/raw/functions/08011cd0.c) consumes one byte, requires low2bits0, then same helper. Type6 uses low4bits0 instead, [08012298](../../medabots-decompile/analysis/raw/functions/08012298.c).
- Geometric helper [08011B7C](../../medabots-decompile/analysis/raw/functions/08011b7c.c): `abs(dx)<rangeByte*8` strictly; source actor centerY is feetY-height/2; target feet must satisfy `centerY-16 < targetFeetY < centerY+targetHeight+15`. If initial target fails, it may test its non-disabled partner and retain the successful replacement.
- Missile2 [08011D00](../../medabots-decompile/analysis/raw/functions/08011d00.c): random low2bits0, vertical band plus angular and projected-distance tests, with60% nominal range. Status seeking23/24 [08011FD0](../../medabots-decompile/analysis/raw/functions/08011fd0.c): same random gate but different permitted angles and80% range. Their raw second-target branches have suspicious decompiler target references; validate assembly before copying.
- Full Defense16 [080122C8](../../medabots-decompile/analysis/raw/functions/080122c8.c): random low4bits0; self alive with no beneficial status; targets self.
- Defense15/Scouting29/Extra Charge30 [08012304](../../medabots-decompile/analysis/raw/functions/08012304.c): ordinary panel consumes first byte for self/partner order, second byte requires low4bits0; tests both teammates for alive/no-beneficial-status. Panel10 prioritizes partner and changes random gating using an action classification table.
- Recovery17 [080123D8](../../medabots-decompile/analysis/raw/functions/080123d8.c): if selected slot countdown0 and random low2bits!=0, set cooldown25 (15 under panel10) and reject. Otherwise compare each teammate's maximal recovery severity via [08012634](../../medabots-decompile/analysis/raw/functions/08012634.c); higher wins, tie favors leader, panel10 explicitly prefers injured leader.
- Minute Recovery18 [08012504](../../medabots-decompile/analysis/raw/functions/08012504.c): same severity comparison, but disqualifies a teammate already holding any beneficial status.
- Revive19 [0801269C](../../medabots-decompile/analysis/raw/functions/0801269c.c): ordinary self/partner ordering uses first byte; second requires low2bits0; choose an alive teammate with a destroyed non-head part. Panel10 has its own partner-priority branch.
- Symptom Clr20 [080127A0](../../medabots-decompile/analysis/raw/functions/080127a0.c): target affected alive partner first, then affected self; no random probability.
- Medaforce Ctl21 [08012820](../../medabots-decompile/analysis/raw/functions/08012820.c): random low4bits0; some alive enemy has displayed meter>44 and no existing harmful3.
- Change27/Atk Change28 [0801288C](../../medabots-decompile/analysis/raw/functions/0801288c.c): random lowbit0, firing part has no active transformation timer.

Rifle/Sword right-arm combo latching is favored on odd global frames, or always under panel8. Laser/Beam3/4 may consume another random byte and start a200-count held-B routine when odd. Separate self-support holding can keep B for80 counts. Implement edge creation from held state so charging and combos cannot emit a fresh independent press on every update. [080112BC](../../medabots-decompile/analysis/raw/functions/080112bc.c).

### Movement, threats, special use

[08012BEC](../../medabots-decompile/analysis/raw/functions/08012bec.c) preserves command0=right,1=left,2=stationary,3=guard with a byte countdown. Existing countdown emits its held command and decrements. When zero, [08013030](../../medabots-decompile/analysis/raw/functions/08013030.c) selects a new command; this large function has unrecovered jumps, so the whole policy cannot be called verified.

Concrete safe rules:

- In a strict±16px target-height band, boundary correction applies at x<=8 /x>=424; otherwise x<=24 /x>=408. It overrides current direction and sets `(rng+10)&15`, which can be0.
- Threat detector [08015040](../../medabots-decompile/analysis/raw/functions/08015040.c) is enabled by profile`+143`. Returned codes2/3 indicate threat orientation; AI turns first if needed, otherwise increments `+145` toward profile threshold`+144`, then commands guard for1 update. This is a reaction threshold, not one random guard probability.
- Persistent obstacle contact`+11C` can count past12, then on actor's `(frame&3)==actorId` phase emit A and set jump-hold counter12. Panels21/27 emit Down instead. Its ground/target/leg tests continue in [08013DA0](../../medabots-decompile/analysis/raw/functions/08013da0.c) and [08015470](../../medabots-decompile/analysis/raw/functions/08015470.c).
- Range hint [0801595C](../../medabots-decompile/analysis/raw/functions/0801595c.c) takes maximum eligible action range, halves Missile range and multiplies status23/24 range by0.7. If some equipment remains but no qualifying attacking action exists, result65535 drives support/retreat behavior; if no equipment remains, result24.
- Panel5 places the actor between own leader and its nearest enemy, with32..96px spacing bounds. Panels6/7 can approach the opposite side of an enemy relative to the friendly partner, maintaining a30..40px flank band. Their full branch exit behavior needs assembly reconstruction.
- Panel9 retreats toward a field edge opposite enemy mean X. Panel11 selects random movement/guard commands; panel16 stays away until meter full. These are actual stateful panel specializations, not synonyms for “aggressive.”

[080128C0](../../medabots-decompile/analysis/raw/functions/080128c0.c) special logic requires full displayed meter51 and panel!=15. On first availability: panel14 delay1; panel16 delay10; panel10 with Mermaid medal2 delay10; otherwise delay=`rng+profileSpecialDelay`. Decrement immediately, test the medal-specific predicate at zero; unsuccessful test retries after20 updates (1 for panel14). The caller checks actor-owned object capacity and facing before Select. This establishes deliberate special use, not automatic activation at full meter.

Partner panel changes [0801870C](../../medabots-decompile/analysis/raw/functions/0801870c.c) cycle five equipped slots, skip/reset at255, start display counter1 and increment it the same call, applying the new active panel at counter12. Do not instantly apply a name-only strategy change. Original medal panel availability is separate content from the numeric AI policy.

## All eight leg families

The [leg-move review](../../medabots-decompile/docs/leg-moves.md) and its cited raw handlers establish the following. The later roster mapping verifies the English names against the type-index consumer.

| Type | Family         | Distinct controls and movement                                                                                                                                           |
| ---: | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|    0 | Dual Leg (SHT) | Down double tap crouches while held; Up double tap backhops opposite facing,30-sample vertical curve and speed-table column8                                             |
|    1 | Dual Leg (GRP) | Same crouch/backhop; horizontal double tap enters6px forward burst for timer0..11, stop at12, idle>=13                                                                   |
|    2 | Multi Leg      | Up or Down double tap grounded starts44-sample special jump,120px clear-space height                                                                                     |
|    3 | Vehicle        | Up or Down double tap initiates backward4px retreat, held-direction/counter gated                                                                                        |
|    4 | Tank           | Same retreat control family; equipment speed/defense and terrain differ                                                                                                  |
|    5 | Flight         | Different short/medium/full jump curves30/40/50; air horizontal2px or4dash; one extra A jump; aerial Up double tap7px forward burst, Down double tap down2 then forward6 |
|    6 | Float          | Different jump curves40/60/80; air control2/4px; ordinary falling3px; aerial Up double tap hover while held up to timer120; Down double tap descent10px                  |
|    7 | Diving         | Submerged Up double tap ascend10px, exiting water starts jump; water-specific speed row bonus and exclusions                                                             |

Up/Down double taps use independent16-count windows, normally decrementing on the initiating call. Flight/Float aerial horizontal double tap uses8, not16. Guard, active attacks, water slowdown and state transitions gate these maneuvers. Generic double-tap logic alone cannot replace every family.

Backhop is **not** a generic two-pixel-per-update jump: [08008190](../../medabots-decompile/analysis/raw/functions/08008190.c) uses the speed row's column8 horizontally and table`08058CA6` vertically. For rank3 this averages2px backward, totaling60 requested pixels across30 calls; clear-space rise78px, ending16px above takeoff before possible falling. The earlier simplified implementation's manually selected rise/fall distances are not source parity.

## Focused implementation checks

These tests reduce the main risks without requiring a general replay engine:

1. Original stream index and exact AI desired/pressed keys across a short recorded seeded scenario; assert shared RNG consumption count after each actor.
2. Rifle predicate rejection still consumes its random byte; preferred-panel rejection does not silently try every other slot.
3. Head conservation with three uses: ordinary eligibility thresholds30/60/90 elapsed seconds; head-preferring panel bypass; Recovery head conservation differs.
4. Friendly Recovery cannot heal a destroyed limb; Revive cannot resurrect a KO head; tied severity selects head before randomized limbs.
5. Full Defense absorbs ordinary damage while harmful status-only attacks still follow their earlier resolver branches.
6. Burning never destroys a1HP part; regeneration and burning align to global180-update phases.
7. No-grap trap permits shooting/support, triggers on grappling and damages that action's part once; No-shot is inverse; Double Trap covers both.
8. Confusion maps both movement and attack direction chords; each64-counter phase differs.
9. Passive Void tests exact slot and action type, and does not reflect ownership.
10. Transform preserves HP, changes runtime equipped identity for900-count lifecycle, respects active-action expiry delay, then restores original part.
11. Flight/Float air maneuvers, Multi Leg special jump and Diving emerge path use their distinct curves/termination.
12. Every complete AI match and all-support teams remain playable without claiming the unrecovered navigation branches match the original.

The original special handlers and all12 medal power records are already indexed in [roster evidence](ax-roster-evidence.md#medals-and-medaforce-names). Full original-AI parity still requires closing `08013030`'s unrecovered jump paths, exact terrain/threat helpers, all target-preference panels, and medal-specific special predicates. All weapon parity additionally needs per-equipment animation channels, per-frame contact rectangles, exact optical/missile impact phases, reaction-state recovery, and source-faithful object capacity. A complete roster with approximate versions of these mechanics should be labeled accordingly.

## Follow-up: Giga Break, Plus Counter, All Recovery

The following closes three ambiguous special names using their actual consumers. These are static findings, with the unusual All Recovery argument flow independently checked in Thumb instructions.

### Giga Break is a timed ordinary-weapon power buff

[0801DB88](../../medabots-decompile/analysis/raw/functions/0801db88.c) creates its presentation elements at special-local counter0, computes `m` through [0801FAAC](../../medabots-decompile/analysis/raw/functions/0801faac.c), then calls `setStatus(caster,5,2,m)`. Setter mode2 installs a **locked beneficial status5**, replacing any current beneficial status. The record for effect5 is `[1,3,20,0]`: magnitude is `trunc(20*(50+casterGrapplingStat)/50)` with **no leg adjustment**. The status timer is `60*m` updates. A grappling stat10 therefore gives magnitude24 and timer1440; the magnitude controls duration, not a24-point attack increase. [Status setter](../../medabots-decompile/analysis/raw/functions/08018c84.c).

Both [080160C8](../../medabots-decompile/analysis/raw/functions/080160c8.c) and [080168F4](../../medabots-decompile/analysis/raw/functions/080168f4.c) snapshot `caster.beneficialStatus==5` into ordinary logical-object byte6. [0800BAF8](../../medabots-decompile/analysis/raw/functions/0800baf8.c) checks that captured flag and doubles **base power**, before charged-optical doubling, amplified-hit multiplication, byte narrowing and ordinary damage/guard formulas. Existing launched shots retain their captured flag if the status later expires. Incoming normal power20 with the buff becomes40 before defense; multiplying final damage by2 is wrong. The buff does not inherently inflict an attack or apply damage to everyone.

[0801FA60](../../medabots-decompile/analysis/raw/functions/0801fa60.c) also records the same flag into special-object byte4. However the reviewed [special hit resolver](../../medabots-decompile/analysis/raw/functions/0801f3f0.c) and [special damage formula](../../medabots-decompile/analysis/raw/functions/0800da88.c) do not read that field. **No doubling of Medaforce damage is established by this chain.** Do not invent that effect because the flag exists. Locked status remains protected from ordinary beneficial replacement until expiry; another locked effect can replace it.

### Plus Counter restores head ammunition

[0801DD78](../../medabots-decompile/analysis/raw/functions/0801dd78.c) creates **four friendly seeking objects**. [0801F724](../../medabots-decompile/analysis/raw/functions/0801f724.c) scans active same-team actors for collision; [0801F820](../../medabots-decompile/analysis/raw/functions/0801f820.c) routes effect6 to [0801F8B4](../../medabots-decompile/analysis/raw/functions/0801f8b4.c). Each accepted object increments that recipient's current head uses by **exactly1**, capped to head maximum uses, then enters its impact phase. It does not heal armor, increase maximum uses, reflect attacks, or create a retaliation stance. Although its record's power byte is4, the four projectile deliveries—not a support-scaled arithmetic restore4—provide the effect.

[0801DE5C](../../medabots-decompile/analysis/raw/functions/0801de5c.c) assigns each object's seeking target using both teammates' missing head-use counts, clamped4, and a100-byte distribution table at `0805CADC`. Four launch angles at`0805CAD4` are `[0,300,240,180]`, at a40px radius. Let `a=min(ownerMax-ownerUses,4)`, `b=min(partnerMax-partnerUses,4)` and object index`i=0..3`. Table offset is `20*a+4*b+(ownerX<partnerX ? 3-i : i)`; table0 targets owner,1 targets partner. If owner is inactive, force`a=0,b=4`; if partner is inactive force`a=4,b=0`. The artifact's `plusCounter` entry preserves the exact rows.

Its [movement](../../medabots-decompile/analysis/raw/functions/0801e01c.c) has a short outward contribution for local counters<16 and a5px integer-angle homing component. Collision is allowed with **any active teammate**, not only the assigned seeking target, so another friendly robot can intercept a delivery. Four instantaneous ammo additions split evenly between teammates are a useful approximation but not this original behavior. The special has no damage counterattack in this audited route.

### All Recovery heals every surviving part, with a recipient-state quirk

[0801D064](../../medabots-decompile/analysis/raw/functions/0801d064.c) creates eight orbiting elements at local counter0. At **counter90**, it calls [0801D35C](../../medabots-decompile/analysis/raw/functions/0801d35c.c) separately for caster and same-team partner. A disabled recipient is skipped. [0800CD58](../../medabots-decompile/analysis/raw/functions/0800cd58.c) adds one computed amount to **each** recipient part with nonzero armor, capped to that part's maximum. It skips destroyed parts and cannot revive a knocked-out partner. The amount is not divided across four parts and there is no single-most-injured-part selection here.

A potentially surprising source behavior is real in the reviewed instructions: `0801D398..39A` writes **recipient actor ID** into special-object byte9; `0801D3F6` loads that byte into r0; `0801D3F8` calls `0801FAAC`. The helper reads **that actor's byte+3E**, selects the corresponding special record at`0809589C`, reads its power and category, and uses that actor's own matching medal stat. It does **not** receive the caster ID in this call. [Call-site assembly](../../medabots-decompile/analysis/raw/functions/0801d35c.asm), [helper assembly](../../medabots-decompile/analysis/raw/functions/0801faac.asm).

Consequently, the exact amount for recipient`r` is:

```
special = specialRecords[r.lastActivatedSpecialId]
amount = trunc(special.power * (50 + r.medalStat[special.category]) / 50)
```

Byte`+3E` is set to the resolved effect ID when that actor activates a special in [0801C3DC](../../medabots-decompile/analysis/raw/functions/0801c3dc.c), including Alien's random resolution. For the current Mermaid caster it is2, giving ordinary All Recovery power20 with caster support. For the partner, it can refer to a different previously activated effect; do not silently substitute the partner's equipped medal ID or the caster's support stat. Initial byte+3E is0 under normal battle entry: [08000AE8](../../medabots-decompile/analysis/raw/functions/08000ae8.c) calls [080013AC](../../medabots-decompile/analysis/raw/functions/080013ac.c) with setup counter0/1; its BIOS CpuSet control `0x05002000` fills8192 words with zero at `02010000` then `02018000`. The four actor records lie in the first cleared span. [080017FC](../../medabots-decompile/analysis/raw/functions/080017fc.c) does not install another value into actor+3E. Thus a partner who has never activated a special uses effect0 power20/shooting in this formula. This is an implementation-relevant instruction path, not an emulator-validated balance claim.

If a remake deliberately standardizes All Recovery to caster-scaled power20 for both teammates, record that as an intentional behavior difference. It should not be described as exact source parity.

### Related special distinctions confirmed in the same audit

- **Power Drain8:** its damage path records `min(damage,struckPartCurrentHP)` before HP subtraction in [0801FA2C](../../medabots-decompile/analysis/raw/functions/0801fa2c.c). Only unguarded impacts (`object+36==0`) later turn into return effect12; [0801E284](../../medabots-decompile/analysis/raw/functions/0801e284.c) performs that transition after the hit animation. Friendly collision for effect12 is restricted to its caster ID. [0801F864](../../medabots-decompile/analysis/raw/functions/0801f864.c) heals the caster's single highest-severity surviving part by the recorded amount using ordinary Recovery selection. It does not instantly heal all caster parts, heal a destroyed part, or return healing after a guarded hit.
- **Double Trap4:** [0801F694](../../medabots-decompile/analysis/raw/functions/0801f694.c) installs harmful9 with setter mode3, so it is locked against ordinary harmful replacement, timer720 and magnitude based on special40/support without leg adjustments. It causes no ordinary contact damage before the triggered weapon action.
- **Meltian9:** [0801F604](../../medabots-decompile/analysis/raw/functions/0801f604.c) installs harmful burning0 with mode3 and special-scaled magnitude `trunc(15*(50+casterGrapplingStat)/50)`. This replaces ordinary Fire's damage/4 magnitude; it shares the720-update/nonlethal periodic-burn channel. The special hit resolver returns after this status branch, so no additional generic normal damage should be assumed.
- **Confusion10:** at its local counter90, [0801EE54](../../medabots-decompile/analysis/raw/functions/0801ee54.c) uses the **caster** in `0801FAAC` and installs locked harmful4 on both living opponents. Its duration is `60*trunc(4*(50+casterSupportStat)/50)`. Unlike All Recovery, this effect has no recipient-power argument quirk.
