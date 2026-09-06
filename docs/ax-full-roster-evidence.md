# Full AX roster: implementation evidence

This continuation closes the numeric roster and action-data gaps for the European Metabee build. It separates source facts from localization cross-references and remake choices. The source still does not provide a tested reconstruction of every weapon handler. A selectable name plus accurate armor is not proof of a faithfully implemented Medabot.

ROM SHA-256: `20d77b6d1540908b1f1f2b27fede5d539a0f5edd198f93e7ecbe025a0891ca9a`. IDs are zero-based decimal. All original numeric facts were read from the sibling repository or consumer-selected tables; no original artwork or ROM binary is included in this document.

## Actionable outputs

- `.artifacts/full-roster-data.json`: 30 named equipment sets; all 120 real part records; 300 facing-specific body/action streams; their primary/secondary event offsets; reachable object constructors and offsets; 35 action dispatch records; 50 object dispatch addresses; all 1,188 medal-level stat rows; medal targeting preferences; complete-set encounter medal counts.
- `.artifacts/extract-full-roster.py`: repeatable numeric extractor for the principal records. The object-constructor and preference additions were independently read from the addresses documented below; preserve those fields if replacing this research artifact.
- `../medabots-decompile/data/generated/combat/parts.json` and `medal-levels.json` are the source numeric inputs. The artifact deliberately remains ignored; production should use validated JSONC definitions.

## Identity mapping and visual direction

The original [US Metabee instruction booklet, printed page 22](https://www.videogamemanual.com/gba/Medabots%20AX%20-%20Metabee%20Ver.%20%28USA%29.pdf#page=23) explicitly names the 25 Metabee-version robots. Its part charts on printed pages 24–36 independently corroborate many part names and values. This is a primary manual hosted by an archival mirror. It does not itself bind every displayed robot name to a numeric ROM set.

The [community AX roster](https://medabots.fandom.com/wiki/Medabots_AX/Medabots) supplies the 30-name ordering and four-part identity tuples. Those tuples were compared with all four source-extracted name banks in [the preceding evidence](ax-roster-evidence.md). This is a localization/identity cross-reference, not an authority for mechanics. The four Rokusho-exclusive localized names remain dependent on that cross-reference; they are marked below. The source includes their numerical parts even in the supplied Metabee build.

Same-numbered parts form these familiar complete sets, but the engine equips four independent IDs. Do not treat an enemy portrait, story character, medal, or encounter ID as a robot-set ID.

| Set | Remake display name | Identity status                                       | Visual motif; verify detailed art separately                |
| --- | ------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| 0   | Metabee             | Name in primary Metabee manual; tuple cross-reference | Gold rhinoceros-beetle gunfighter; twin black cannons       |
| 1   | Rokusho             | Other version protagonist; tuple confirmed            | White stag-beetle swordsman; red visor                      |
| 2   | Brass               | Name in primary Metabee manual; tuple cross-reference | Sailor-uniform robot; Brass is the named Sailor-Multi       |
| 3   | Neutranurse         | Name in primary Metabee manual; tuple cross-reference | Nurse robot; medical cap and skirt                          |
| 4   | Sumilidon           | Name in primary Metabee manual; tuple cross-reference | Saber-toothed cat; long forearm blade                       |
| 5   | Warbandit           | Name in primary Metabee manual; tuple cross-reference | Lion gunfighter; radial mane and cylindrical barrels        |
| 6   | Mega-Emperor        | Name in primary Metabee manual; tuple cross-reference | Large artillery robot; multiple legs and heavy weapons      |
| 7   | Babbyblu            | Name in primary Metabee manual; tuple cross-reference | Floating angelic baby; halo, shoulder wings, umbilical tail |
| 8   | Acehorn             | Name in primary Metabee manual; tuple cross-reference | Unicorn; horn and four hooves                               |
| 9   | Cleobattler         | Name in primary Metabee manual; tuple cross-reference | Cleopatra; headdress and floating dress silhouette          |
| 10  | Octoclam            | Name in primary Metabee manual; tuple cross-reference | Octopus; rounded head and tentacle legs                     |
| 11  | Totalizer           | Name in primary Metabee manual; tuple cross-reference | Turtle; armored shell and tank tread base                   |
| 12  | Spidar              | Community localization; numeric tuple confirmed       | Spider; many articulated legs                               |
| 13  | Nin-Ninja           | Name in primary Metabee manual; tuple cross-reference | Ninja; head wrap and two blades                             |
| 14  | Oceana              | Name in primary Metabee manual; tuple cross-reference | Mermaid; fish-tail lower body                               |
| 15  | Snowbro             | Name in primary Metabee manual; tuple cross-reference | Snow figure; rounded body and tank-type lower body          |
| 16  | Krosserdog          | Name in primary Metabee manual; tuple cross-reference | Dog gunfighter; pointed ears                                |
| 17  | Giggly Jelly        | Community localization; numeric tuple confirmed       | Jellyfish; dome and tank-type lower body                    |
| 18  | Saldron             | Name in primary Metabee manual; tuple cross-reference | Salamander; long floating tail                              |
| 19  | Peppercat           | Name in primary Metabee manual; tuple cross-reference | Cat; pointed ears and tail                                  |
| 20  | Belzelga            | Name in primary Metabee manual; tuple cross-reference | Devil; horns and spiked armor                               |
| 21  | Phoenix             | Name in primary Metabee manual; tuple cross-reference | Phoenix; wings and bird tail                                |
| 22  | Orkamar             | Community localization; numeric tuple confirmed       | Orca; marine silhouette and swimming tail                   |
| 23  | Sharkkan            | Name in primary Metabee manual; tuple cross-reference | Shark; dorsal fin and swimming tail                         |
| 24  | Monoklar            | Community localization; numeric tuple confirmed       | Masked thief; wheeled vehicle lower body                    |
| 25  | Gorem-2             | Name in primary Metabee manual; tuple cross-reference | Dogu clay idol; floating lower body                         |
| 26  | Knight Armor        | Name in primary Metabee manual; tuple cross-reference | Knight; shield arms and vehicle base                        |
| 27  | Face Lantern        | Name in primary Metabee manual; tuple cross-reference | Jack-o-lantern; pumpkin head and vehicle base               |
| 28  | Crimson King        | Name in primary Metabee manual; tuple cross-reference | Chicken; comb and wing-like arms                            |
| 29  | Arcbeetle           | Name in primary Metabee manual; tuple cross-reference | Long-horned beetle; orange/red armor and cannon arms        |

The motif column is an art brief, not a recovered palette or pixel-accurate silhouette. It must not be used to label invented recolors as faithful original designs. For Babbyblu, the halo, wings and umbilical silhouette are also corroborated by the [Primity Baby design description](https://medarot.meowcorp.us/wiki/Primity_Baby). No original images should be shipped by the remake.

### Localized part-name cautions

The US manual and earlier EU visual transcriptions do not always agree: set 16 legs are printed **Howzer** in the US manual versus the earlier **Hover** reading; set 24 left/legs print **Crime Stick / Protoauto**, versus **Crime Shirk / Pertoauto**; set 28 head/legs print **Peck Strike / Wanafly**, versus **Beck Smile / Manafly**. Set 25 prints **Dogu / Dohtack / Dohtatack**. These may include region differences or visual transcription errors. Numeric IDs and records are unambiguous; do not silently present every provisional spelling as canonical.

## Complete part statistics

Each record is 12 bytes. Slot 0=head, 1=right arm, 2=left arm, 3=legs. Source tables begin `08095294`, `08095414`, `08095594`, `08095714`, respectively. There are 32 records per slot, but 30/31 are frame/placeholder records, not additional selectable robots. The 120 playable records below are copied as numeric facts from [parts.json](../../medabots-decompile/data/generated/combat/parts.json), whose fields are traced by [equipment initialization](../../medabots-decompile/analysis/raw/functions/080189c8.c), [readiness updates](../../medabots-decompile/analysis/raw/functions/080192e0.c), and [damage construction](../../medabots-decompile/analysis/raw/functions/080160c8.c).

Armor=record byte 1; power=byte 2; defense=byte 3; head uses=byte 5; refill=byte 10. Power on support parts is a support magnitude input, not damage. Legs use byte 4+1 as the initial speed-table row. Non-leg byte 4 participates in selection rank; its name must not be generalized to movement speed. Leg ranks are byte 6/7/8 (shooting/grappling/support), byte 9 defense. Rank-to-adjustment is `0,2,4,6,8,10` for rank 0–5.

| Set / robot       | Slot     | Action type / name | Armor | Power | Defense | Head uses | Refill per update |
| ----------------- | -------- | ------------------ | ----: | ----: | ------: | --------: | ----------------: |
| 0 / Metabee       | head     | 2 / Missile        |    45 |    40 |       3 |         3 |                 7 |
| 0 / Metabee       | rightArm | 0 / Rifle          |    35 |     5 |       4 |         — |                 7 |
| 0 / Metabee       | leftArm  | 1 / Gatling Gun    |    35 |    12 |       6 |         — |                 4 |
| 0 / Metabee       | legs     | 0 / Dual Leg (SHT) |    50 |     — |       3 |         — |                 — |
| 1 / Rokusho       | head     | 29 / Scouting      |    50 |    40 |       4 |         3 |                 4 |
| 1 / Rokusho       | rightArm | 7 / Sword          |    35 |     7 |       5 |         — |                10 |
| 1 / Rokusho       | leftArm  | 8 / Hammer         |    35 |    19 |       7 |         — |                 7 |
| 1 / Rokusho       | legs     | 1 / Dual Leg (GRP) |    50 |     — |       4 |         — |                 — |
| 2 / Brass         | head     | 29 / Scouting      |    40 |    41 |       5 |         4 |                 4 |
| 2 / Brass         | rightArm | 1 / Gatling Gun    |    25 |     9 |       5 |         — |                10 |
| 2 / Brass         | leftArm  | 0 / Rifle          |    25 |    11 |       7 |         — |                10 |
| 2 / Brass         | legs     | 0 / Dual Leg (SHT) |    40 |     — |       5 |         — |                 — |
| 3 / Neutranurse   | head     | 16 / Full Defense  |    20 |     6 |       4 |         2 |                 4 |
| 3 / Neutranurse   | rightArm | 18 / Minute Recov  |    25 |     5 |       5 |         — |                 4 |
| 3 / Neutranurse   | leftArm  | 18 / Minute Recov  |    25 |     7 |       7 |         — |                 4 |
| 3 / Neutranurse   | legs     | 1 / Dual Leg (GRP) |    35 |     — |       4 |         — |                 — |
| 4 / Sumilidon     | head     | 26 / No-shot trap  |    35 |    32 |       4 |         6 |                10 |
| 4 / Sumilidon     | rightArm | 7 / Sword          |    35 |     5 |       6 |         — |                10 |
| 4 / Sumilidon     | leftArm  | 8 / Hammer         |    35 |    17 |       8 |         — |                 7 |
| 4 / Sumilidon     | legs     | 1 / Dual Leg (GRP) |    45 |     — |       4 |         — |                 — |
| 5 / Warbandit     | head     | 30 / Extra Charge  |    45 |    17 |       4 |         3 |                 4 |
| 5 / Warbandit     | rightArm | 0 / Rifle          |    40 |     3 |       5 |         — |                 7 |
| 5 / Warbandit     | leftArm  | 1 / Gatling Gun    |    40 |    10 |       7 |         — |                 4 |
| 5 / Warbandit     | legs     | 0 / Dual Leg (SHT) |    50 |     — |       4 |         — |                 — |
| 6 / Mega-Emperor  | head     | 5 / Break          |    65 |    24 |       7 |         3 |                 4 |
| 6 / Mega-Emperor  | rightArm | 2 / Missile        |    65 |    24 |       6 |         — |                 4 |
| 6 / Mega-Emperor  | leftArm  | 3 / Laser          |    65 |    35 |       8 |         — |                 1 |
| 6 / Mega-Emperor  | legs     | 2 / Multi Leg      |    55 |     — |       6 |         — |                 — |
| 7 / Babbyblu      | head     | 21 / Medaforce Ctl |    35 |    12 |       8 |         2 |                 4 |
| 7 / Babbyblu      | rightArm | 22 / Confusion     |    25 |     3 |       7 |         — |                 4 |
| 7 / Babbyblu      | leftArm  | 30 / Extra Charge  |    60 |     8 |       9 |         — |                 1 |
| 7 / Babbyblu      | legs     | 6 / Float          |    80 |     — |       7 |         — |                 — |
| 8 / Acehorn       | head     | 20 / Symptom Clr   |    50 |     0 |       8 |         3 |                16 |
| 8 / Acehorn       | rightArm | 20 / Symptom Clr   |    50 |     0 |       7 |         — |                16 |
| 8 / Acehorn       | leftArm  | 20 / Symptom Clr   |    50 |     0 |      10 |         — |                10 |
| 8 / Acehorn       | legs     | 2 / Multi Leg      |    40 |     — |       7 |         — |                 — |
| 9 / Cleobattler   | head     | 27 / Change        |    50 |     0 |       7 |         5 |                 4 |
| 9 / Cleobattler   | rightArm | 27 / Change        |    50 |     0 |       6 |         — |                 4 |
| 9 / Cleobattler   | leftArm  | 27 / Change        |    50 |     0 |       8 |         — |                 4 |
| 9 / Cleobattler   | legs     | 6 / Float          |    60 |     — |       6 |         — |                 — |
| 10 / Octoclam     | head     | 12 / Hold          |    30 |    22 |       7 |         4 |                13 |
| 10 / Octoclam     | rightArm | 12 / Hold          |    30 |     9 |       6 |         — |                13 |
| 10 / Octoclam     | leftArm  | 12 / Hold          |    30 |    13 |       9 |         — |                 7 |
| 10 / Octoclam     | legs     | 2 / Multi Leg      |    30 |     — |       6 |         — |                 — |
| 11 / Totalizer    | head     | 3 / Laser          |    60 |    30 |       0 |         2 |                 4 |
| 11 / Totalizer    | rightArm | 3 / Laser          |    60 |    12 |       0 |         — |                 4 |
| 11 / Totalizer    | leftArm  | 3 / Laser          |    60 |    18 |       0 |         — |                 1 |
| 11 / Totalizer    | legs     | 4 / Tank           |   105 |     — |       2 |         — |                 — |
| 12 / Spidar       | head     | 25 / No-grap trap  |    30 |    30 |       7 |         7 |                10 |
| 12 / Spidar       | rightArm | 25 / No-grap trap  |    30 |    12 |       6 |         — |                10 |
| 12 / Spidar       | leftArm  | 25 / No-grap trap  |    30 |    18 |       9 |         — |                 4 |
| 12 / Spidar       | legs     | 2 / Multi Leg      |    30 |     — |       6 |         — |                 — |
| 13 / Nin-Ninja    | head     | 25 / No-grap trap  |    35 |    32 |       4 |         6 |                10 |
| 13 / Nin-Ninja    | rightArm | 7 / Sword          |    30 |     7 |       3 |         — |                13 |
| 13 / Nin-Ninja    | leftArm  | 7 / Sword          |    30 |    15 |       5 |         — |                13 |
| 13 / Nin-Ninja    | legs     | 1 / Dual Leg (GRP) |    45 |     — |       4 |         — |                 — |
| 14 / Oceana       | head     | 17 / Recovery      |    30 |    17 |       9 |         6 |                 1 |
| 14 / Oceana       | rightArm | 17 / Recovery      |    30 |     7 |       8 |         — |                 1 |
| 14 / Oceana       | leftArm  | 17 / Recovery      |    30 |    10 |      11 |         — |                 1 |
| 14 / Oceana       | legs     | 7 / Diving         |    45 |     — |       8 |         — |                 — |
| 15 / Snowbro      | head     | 11 / Freeze        |    30 |    16 |       2 |         6 |                 7 |
| 15 / Snowbro      | rightArm | 11 / Freeze        |    30 |     7 |       2 |         — |                 7 |
| 15 / Snowbro      | leftArm  | 11 / Freeze        |    30 |    10 |       2 |         — |                 4 |
| 15 / Snowbro      | legs     | 4 / Tank           |   100 |     — |       2 |         — |                 — |
| 16 / Krosserdog   | head     | 0 / Rifle          |    30 |    17 |       4 |         8 |                16 |
| 16 / Krosserdog   | rightArm | 0 / Rifle          |    30 |     5 |       4 |         — |                 7 |
| 16 / Krosserdog   | leftArm  | 0 / Rifle          |    30 |    10 |       6 |         — |                 7 |
| 16 / Krosserdog   | legs     | 0 / Dual Leg (SHT) |    45 |     — |       4 |         — |                 — |
| 17 / Giggly Jelly | head     | 2 / Missile        |    60 |    30 |       0 |         2 |                 4 |
| 17 / Giggly Jelly | rightArm | 2 / Missile        |    60 |    12 |       0 |         — |                 4 |
| 17 / Giggly Jelly | leftArm  | 2 / Missile        |    60 |    18 |       0 |         — |                 1 |
| 17 / Giggly Jelly | legs     | 4 / Tank           |   115 |     — |       0 |         — |                 — |
| 18 / Saldron      | head     | 28 / Atk Change    |    30 |     0 |       7 |         5 |                 7 |
| 18 / Saldron      | rightArm | 28 / Atk Change    |    30 |     0 |       6 |         — |                 7 |
| 18 / Saldron      | leftArm  | 28 / Atk Change    |    30 |     0 |       8 |         — |                 4 |
| 18 / Saldron      | legs     | 6 / Float          |    55 |     — |       6 |         — |                 — |
| 19 / Peppercat    | head     | 10 / Thunder       |    25 |    18 |       5 |         5 |                10 |
| 19 / Peppercat    | rightArm | 10 / Thunder       |    25 |     8 |       5 |         — |                10 |
| 19 / Peppercat    | leftArm  | 10 / Thunder       |    25 |    11 |       7 |         — |                 7 |
| 19 / Peppercat    | legs     | 1 / Dual Leg (GRP) |    40 |     — |       5 |         — |                 — |
| 20 / Belzelga     | head     | 19 / Revive        |    25 |     0 |       4 |         3 |                 7 |
| 20 / Belzelga     | rightArm | 6 / Sacrifice      |    20 |    64 |       3 |         — |                 4 |
| 20 / Belzelga     | leftArm  | 6 / Sacrifice      |    20 |    96 |       4 |         — |                 1 |
| 20 / Belzelga     | legs     | 0 / Dual Leg (SHT) |    45 |     — |       4 |         — |                 — |
| 21 / Phoenix      | head     | 9 / Fire           |    30 |    32 |       3 |         3 |                10 |
| 21 / Phoenix      | rightArm | 9 / Fire           |    30 |    13 |       3 |         — |                10 |
| 21 / Phoenix      | leftArm  | 9 / Fire           |    30 |    19 |       4 |         — |                 4 |
| 21 / Phoenix      | legs     | 5 / Flight         |    25 |     — |       3 |         — |                 — |
| 22 / Orkamar      | head     | 13 / Wave          |    40 |    20 |       8 |         4 |                10 |
| 22 / Orkamar      | rightArm | 13 / Wave          |    40 |     8 |       7 |         — |                10 |
| 22 / Orkamar      | leftArm  | 13 / Wave          |    40 |    12 |      10 |         — |                 4 |
| 22 / Orkamar      | legs     | 7 / Diving         |    55 |     — |       7 |         — |                 — |
| 23 / Sharkkan     | head     | 5 / Break          |    50 |    20 |       7 |         4 |                 4 |
| 23 / Sharkkan     | rightArm | 5 / Break          |    50 |     8 |       6 |         — |                 4 |
| 23 / Sharkkan     | leftArm  | 5 / Break          |    50 |    12 |       9 |         — |                 1 |
| 23 / Sharkkan     | legs     | 7 / Diving         |    60 |     — |       6 |         — |                 — |
| 24 / Monoklar     | head     | 4 / Beam           |    45 |    50 |       1 |         4 |                 4 |
| 24 / Monoklar     | rightArm | 15 / Defense       |    70 |     6 |       2 |         — |                 4 |
| 24 / Monoklar     | leftArm  | 23 / Ineffective   |    35 |     3 |       3 |         — |                 1 |
| 24 / Monoklar     | legs     | 3 / Vehicle        |    45 |     — |       1 |         — |                 — |
| 25 / Gorem-2      | head     | 31 / Void Explode  |    80 |     0 |       7 |         0 |                 0 |
| 25 / Gorem-2      | rightArm | 32 / Void Optic    |    80 |     0 |       6 |         — |                 0 |
| 25 / Gorem-2      | leftArm  | 33 / Void Gravity  |    80 |     0 |       9 |         — |                 0 |
| 25 / Gorem-2      | legs     | 6 / Float          |    80 |     — |       6 |         — |                 — |
| 26 / Knight Armor | head     | 15 / Defense       |    75 |    16 |       2 |         5 |                 4 |
| 26 / Knight Armor | rightArm | 15 / Defense       |    75 |     6 |       2 |         — |                 4 |
| 26 / Knight Armor | leftArm  | 15 / Defense       |    75 |     9 |       3 |         — |                 1 |
| 26 / Knight Armor | legs     | 3 / Vehicle        |    55 |     — |       2 |         — |                 — |
| 27 / Face Lantern | head     | 24 / Indefensible  |    45 |    12 |       2 |         4 |                 7 |
| 27 / Face Lantern | rightArm | 24 / Indefensible  |    45 |     5 |       2 |         — |                 7 |
| 27 / Face Lantern | leftArm  | 24 / Indefensible  |    45 |     7 |       3 |         — |                 4 |
| 27 / Face Lantern | legs     | 3 / Vehicle        |    45 |     — |       2 |         — |                 — |
| 28 / Crimson King | head     | 14 / Destroy       |    20 |    85 |       3 |         3 |                 4 |
| 28 / Crimson King | rightArm | 14 / Destroy       |    20 |    34 |       3 |         — |                 4 |
| 28 / Crimson King | leftArm  | 14 / Destroy       |    20 |    51 |       4 |         — |                 1 |
| 28 / Crimson King | legs     | 5 / Flight         |    20 |     — |       3 |         — |                 — |
| 29 / Arcbeetle    | head     | 4 / Beam           |    45 |    58 |       3 |         2 |                 4 |
| 29 / Arcbeetle    | rightArm | 0 / Rifle          |    30 |     7 |       3 |         — |                 7 |
| 29 / Arcbeetle    | leftArm  | 1 / Gatling Gun    |    30 |    14 |       5 |         — |                 4 |
| 29 / Arcbeetle    | legs     | 0 / Dual Leg (SHT) |    55 |     — |       3 |         — |                 — |

| Set               | Total armor | Leg family         | Speed row | Shooting / grappling / support ranks | Defense rank |
| ----------------- | ----------: | ------------------ | --------: | ------------------------------------ | -----------: |
| 0 / Metabee       |         165 | 0 / Dual Leg (SHT) |         3 | [5, 0, 0]                            |            0 |
| 1 / Rokusho       |         170 | 1 / Dual Leg (GRP) |         4 | [0, 5, 0]                            |            0 |
| 2 / Brass         |         130 | 0 / Dual Leg (SHT) |         4 | [3, 0, 0]                            |            2 |
| 3 / Neutranurse   |         105 | 1 / Dual Leg (GRP) |         5 | [0, 0, 3]                            |            1 |
| 4 / Sumilidon     |         150 | 1 / Dual Leg (GRP) |         4 | [0, 3, 0]                            |            2 |
| 5 / Warbandit     |         175 | 0 / Dual Leg (SHT) |         3 | [3, 0, 1]                            |            1 |
| 6 / Mega-Emperor  |         250 | 2 / Multi Leg      |         1 | [4, 2, 0]                            |            1 |
| 7 / Babbyblu      |         200 | 6 / Float          |         1 | [0, 0, 5]                            |            1 |
| 8 / Acehorn       |         190 | 2 / Multi Leg      |         2 | [0, 1, 4]                            |            0 |
| 9 / Cleobattler   |         210 | 6 / Float          |         3 | [0, 0, 4]                            |            1 |
| 10 / Octoclam     |         120 | 2 / Multi Leg      |         3 | [0, 4, 0]                            |            1 |
| 11 / Totalizer    |         285 | 4 / Tank           |         1 | [3, 0, 0]                            |            3 |
| 12 / Spidar       |         120 | 2 / Multi Leg      |         3 | [0, 1, 0]                            |            4 |
| 13 / Nin-Ninja    |         140 | 1 / Dual Leg (GRP) |         5 | [0, 3, 0]                            |            1 |
| 14 / Oceana       |         135 | 7 / Diving         |         3 | [0, 1, 4]                            |            0 |
| 15 / Snowbro      |         190 | 4 / Tank           |         2 | [0, 3, 0]                            |            3 |
| 16 / Krosserdog   |         135 | 0 / Dual Leg (SHT) |         4 | [5, 0, 0]                            |            0 |
| 17 / Giggly Jelly |         295 | 4 / Tank           |         1 | [3, 0, 0]                            |            3 |
| 18 / Saldron      |         145 | 6 / Float          |         3 | [0, 0, 4]                            |            1 |
| 19 / Peppercat    |         115 | 1 / Dual Leg (GRP) |         6 | [0, 3, 0]                            |            1 |
| 20 / Belzelga     |         110 | 0 / Dual Leg (SHT) |         3 | [2, 0, 2]                            |            1 |
| 21 / Phoenix      |         115 | 5 / Flight         |         4 | [1, 3, 0]                            |            2 |
| 22 / Orkamar      |         175 | 7 / Diving         |         2 | [0, 4, 0]                            |            2 |
| 23 / Sharkkan     |         210 | 7 / Diving         |         1 | [3, 1, 0]                            |            2 |
| 24 / Monoklar     |         195 | 3 / Vehicle        |         6 | [2, 0, 1]                            |            2 |
| 25 / Gorem-2      |         320 | 6 / Float          |         1 | [0, 0, 5]                            |            0 |
| 26 / Knight Armor |         280 | 3 / Vehicle        |         5 | [1, 0, 0]                            |            5 |
| 27 / Face Lantern |         180 | 3 / Vehicle        |         6 | [1, 0, 3]                            |            1 |
| 28 / Crimson King |          80 | 5 / Flight         |         4 | [1, 3, 0]                            |            2 |
| 29 / Arcbeetle    |         160 | 0 / Dual Leg (SHT) |         4 | [4, 0, 0]                            |            1 |

## Full action timing, not one universal startup

The five-byte mapping at `08089DF8 + 5×partId` gives head, first right, second right, third right, and left animation stream IDs. Facing adds 0/1; stream pointers are at `08329AC4`. Seven-byte event records at `08085BB8 + 7×streamId` select primary/secondary frame and frame-local tick. All 300 facing-specific records were bounded through their terminators; these particular streams terminate rather than loop. [Attack timing](../../medabots-decompile/docs/attack-timing.md) documents the consumer and runtime checks for the original first set.

The table gives animation duration after initialization, not input-to-ready duration. Initialization may wait 0–3 battle updates. Readiness refill remains separate. Right follow-ups are reachable for action types 0 and 7; other mapped second/third streams are not evidence that every weapon has a combo. Laser/Beam hold/release and other handler gates may extend or change the action.

| Set               | Head | Right 1 / 2 / 3 | Left |
| ----------------- | ---: | --------------- | ---: |
| 0 / Metabee       |   32 | 16 / 16 / 16    |   24 |
| 1 / Rokusho       |   36 | 16 / 20 / 28    |   20 |
| 2 / Brass         |   36 | 16 / — / —      |   24 |
| 3 / Neutranurse   |   48 | 28 / — / —      |   28 |
| 4 / Sumilidon     |   28 | 16 / 16 / 28    |   20 |
| 5 / Warbandit     |   32 | 16 / 16 / 16    |   24 |
| 6 / Mega-Emperor  |   28 | 56 / — / —      |   24 |
| 7 / Babbyblu      |   60 | 32 / — / —      |   32 |
| 8 / Acehorn       |   36 | 36 / — / —      |   36 |
| 9 / Cleobattler   |   40 | 48 / — / —      |   48 |
| 10 / Octoclam     |   44 | 24 / — / —      |   24 |
| 11 / Totalizer    |   28 | 24 / — / —      |   24 |
| 12 / Spidar       |   28 | 16 / — / —      |   16 |
| 13 / Nin-Ninja    |   28 | 16 / 20 / 28    |   20 |
| 14 / Oceana       |   24 | 24 / — / —      |   24 |
| 15 / Snowbro      |   32 | 40 / — / —      |   28 |
| 16 / Krosserdog   |   16 | 16 / 16 / 16    |   24 |
| 17 / Giggly Jelly |   32 | 56 / — / —      |   56 |
| 18 / Saldron      |   40 | 48 / — / —      |   48 |
| 19 / Peppercat    |   36 | 36 / — / —      |   36 |
| 20 / Belzelga     |   24 | 16 / — / —      |   16 |
| 21 / Phoenix      |   40 | 32 / — / —      |   32 |
| 22 / Orkamar      |   40 | 32 / — / —      |   40 |
| 23 / Sharkkan     |   28 | 24 / — / —      |   24 |
| 24 / Monoklar     |   28 | 48 / — / —      |   28 |
| 25 / Gorem-2      |    8 | 8 / — / —       |    8 |
| 26 / Knight Armor |   24 | 24 / — / —      |   24 |
| 27 / Face Lantern |   36 | 20 / — / —      |   20 |
| 28 / Crimson King |   40 | 48 / — / —      |   48 |
| 29 / Arcbeetle    |   28 | 16 / 16 / 16    |   24 |

The artifact records event offsets, original body offsets, and terminal markers, enabling content import without baking guessed timings into battle logic. For example, Rokusho uses right stages **16 / 20 / 28**, while Sumilidon uses **16 / 16 / 28**. Reusing the first stage for all follow-ups changes their commitments.

### Action IDs are not always object IDs

The object constructor table pointer at `0832B3C4 + 4×partId` supplies five action categories, 16 bytes each (eight per facing). Categories are head, left, right 1, right 2, right 3. In each facing entry byte 1 is primary object type, signed bytes 2/3 its local offset, byte 5 secondary type, signed bytes 6/7 its offset. [Right constructor](../../medabots-decompile/analysis/raw/functions/080160c8.c) and [head/left constructor](../../medabots-decompile/analysis/raw/functions/080168f4.c) additionally compose part/body pose offsets and reject absent streams.

- Rifle follow-ups use object 41 then 42.
- Rokusho/Nin-Ninja sword follow-ups use 38 then 39; Sumilidon uses 40 then 39.
- Phoenix right uses object **43**, although its action type is **9 / Fire**.
- Constructor bytes for unreachable follow-up categories are retained as raw evidence with `reachableAction: false`; do not instantiate those entries.

## Handler map for implementing every weapon family

This is a verified dispatch-address inventory, not a claim that each function has been completely ported. The right/head/left action tables are `08327F9C / 083280B4 / 08328028`; the active object table is `08328158`. Their callers are [right dispatch](../../medabots-decompile/analysis/raw/functions/08008610.c), [head dispatch](../../medabots-decompile/analysis/raw/functions/08008d6c.c), [left dispatch](../../medabots-decompile/analysis/raw/functions/08008a8c.c), and [object dispatch](../../medabots-decompile/analysis/raw/functions/08009694.c). Thumb function-pointer bit 0 is removed below.

Profile bytes at `0809816C + 4×actionType` are `[attribute, auxiliary, rangeUnit, speedPixels]`; all three action-slot pointers at `0832D80C` select that same bank. Attribute 0=grappling, 1=shooting, 2=support, 255=blank. Auxiliary semantics require its consumer. Range and speed are inputs to family-specific handlers; 255 does not mean a universal 2,040-pixel projectile range.

| Type / label       | Right handler                                                          | Head / left handler                                                                                                                             | Object handler                                                         | Profile bytes    |
| ------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------- |
| 0 / Rifle          | [080088D4](../../medabots-decompile/analysis/raw/functions/080088d4.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [08009A84](../../medabots-decompile/analysis/raw/functions/08009a84.c) | [1, 255, 12, 3]  |
| 1 / Gatling Gun    | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [08009A84](../../medabots-decompile/analysis/raw/functions/08009a84.c) | [1, 255, 20, 4]  |
| 2 / Missile        | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008D9C](../../medabots-decompile/analysis/raw/functions/08008d9c.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800DC00](../../medabots-decompile/analysis/raw/functions/0800dc00.c) | [1, 255, 30, 4]  |
| 3 / Laser          | [08008674](../../medabots-decompile/analysis/raw/functions/08008674.c) | [08008AF4](../../medabots-decompile/analysis/raw/functions/08008af4.c) / [08008AF4](../../medabots-decompile/analysis/raw/functions/08008af4.c) | [08009E64](../../medabots-decompile/analysis/raw/functions/08009e64.c) | [1, 255, 255, 5] |
| 4 / Beam           | [08008674](../../medabots-decompile/analysis/raw/functions/08008674.c) | [08008AF4](../../medabots-decompile/analysis/raw/functions/08008af4.c) / [08008AF4](../../medabots-decompile/analysis/raw/functions/08008af4.c) | [08009E64](../../medabots-decompile/analysis/raw/functions/08009e64.c) | [1, 255, 255, 4] |
| 5 / Break          | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [08009FD8](../../medabots-decompile/analysis/raw/functions/08009fd8.c) | [1, 255, 25, 3]  |
| 6 / Sacrifice      | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [08009D6C](../../medabots-decompile/analysis/raw/functions/08009d6c.c) | [1, 255, 255, 5] |
| 7 / Sword          | [080088D4](../../medabots-decompile/analysis/raw/functions/080088d4.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [08009A84](../../medabots-decompile/analysis/raw/functions/08009a84.c) | [0, 255, 5, 3]   |
| 8 / Hammer         | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800A15C](../../medabots-decompile/analysis/raw/functions/0800a15c.c) | [0, 255, 4, 3]   |
| 9 / Fire           | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [08009F54](../../medabots-decompile/analysis/raw/functions/08009f54.c) | [0, 1, 6, 3]     |
| 10 / Thunder       | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800A2FC](../../medabots-decompile/analysis/raw/functions/0800a2fc.c) | [0, 1, 6, 3]     |
| 11 / Freeze        | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800AD40](../../medabots-decompile/analysis/raw/functions/0800ad40.c) | [0, 1, 5, 3]     |
| 12 / Hold          | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800ADE4](../../medabots-decompile/analysis/raw/functions/0800ade4.c) | [0, 1, 4, 3]     |
| 13 / Wave          | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800A7AC](../../medabots-decompile/analysis/raw/functions/0800a7ac.c) | [0, 1, 6, 3]     |
| 14 / Destroy       | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [08009A84](../../medabots-decompile/analysis/raw/functions/08009a84.c) | [0, 255, 4, 3]   |
| 15 / Defense       | [080087C0](../../medabots-decompile/analysis/raw/functions/080087c0.c) | [08008C5C](../../medabots-decompile/analysis/raw/functions/08008c5c.c) / [08008C5C](../../medabots-decompile/analysis/raw/functions/08008c5c.c) | [0800AEBC](../../medabots-decompile/analysis/raw/functions/0800aebc.c) | [2, 0, 255, 3]   |
| 16 / Full Defense  | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800B154](../../medabots-decompile/analysis/raw/functions/0800b154.c) | [2, 0, 255, 3]   |
| 17 / Recovery      | [080087C0](../../medabots-decompile/analysis/raw/functions/080087c0.c) | [08008C5C](../../medabots-decompile/analysis/raw/functions/08008c5c.c) / [08008C5C](../../medabots-decompile/analysis/raw/functions/08008c5c.c) | [0800AEBC](../../medabots-decompile/analysis/raw/functions/0800aebc.c) | [2, 255, 255, 3] |
| 18 / Minute Recov  | [080087C0](../../medabots-decompile/analysis/raw/functions/080087c0.c) | [08008C5C](../../medabots-decompile/analysis/raw/functions/08008c5c.c) / [08008C5C](../../medabots-decompile/analysis/raw/functions/08008c5c.c) | [0800AEBC](../../medabots-decompile/analysis/raw/functions/0800aebc.c) | [2, 0, 255, 3]   |
| 19 / Revive        | [080087C0](../../medabots-decompile/analysis/raw/functions/080087c0.c) | [08008C5C](../../medabots-decompile/analysis/raw/functions/08008c5c.c) / [08008C5C](../../medabots-decompile/analysis/raw/functions/08008c5c.c) | [0800AEBC](../../medabots-decompile/analysis/raw/functions/0800aebc.c) | [2, 255, 255, 3] |
| 20 / Symptom Clr   | [080087C0](../../medabots-decompile/analysis/raw/functions/080087c0.c) | [08008C5C](../../medabots-decompile/analysis/raw/functions/08008c5c.c) / [08008C5C](../../medabots-decompile/analysis/raw/functions/08008c5c.c) | [0800AEBC](../../medabots-decompile/analysis/raw/functions/0800aebc.c) | [2, 255, 255, 3] |
| 21 / Medaforce Ctl | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800B1F4](../../medabots-decompile/analysis/raw/functions/0800b1f4.c) | [2, 1, 255, 3]   |
| 22 / Confusion     | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800A380](../../medabots-decompile/analysis/raw/functions/0800a380.c) | [2, 1, 20, 4]    |
| 23 / Ineffective   | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800A850](../../medabots-decompile/analysis/raw/functions/0800a850.c) | [2, 1, 15, 4]    |
| 24 / Indefensible  | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800A850](../../medabots-decompile/analysis/raw/functions/0800a850.c) | [2, 1, 20, 4]    |
| 25 / No-grap trap  | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800A598](../../medabots-decompile/analysis/raw/functions/0800a598.c) | [2, 1, 6, 1]     |
| 26 / No-shot trap  | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800A598](../../medabots-decompile/analysis/raw/functions/0800a598.c) | [2, 1, 6, 1]     |
| 27 / Change        | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800E140](../../medabots-decompile/analysis/raw/functions/0800e140.c) | [2, 255, 255, 3] |
| 28 / Atk Change    | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800E1BC](../../medabots-decompile/analysis/raw/functions/0800e1bc.c) | [2, 255, 255, 3] |
| 29 / Scouting      | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800B3B8](../../medabots-decompile/analysis/raw/functions/0800b3b8.c) | [2, 0, 10, 3]    |
| 30 / Extra Charge  | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [0800B63C](../../medabots-decompile/analysis/raw/functions/0800b63c.c) | [2, 0, 10, 3]    |
| 31 / Void Explode  | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [08009A84](../../medabots-decompile/analysis/raw/functions/08009a84.c) | [2, 2, 10, 3]    |
| 32 / Void Optic    | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [08009A84](../../medabots-decompile/analysis/raw/functions/08009a84.c) | [2, 2, 10, 3]    |
| 33 / Void Gravity  | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [08009A84](../../medabots-decompile/analysis/raw/functions/08009a84.c) | [2, 2, 10, 3]    |
| 34 / blank         | [08008640](../../medabots-decompile/analysis/raw/functions/08008640.c) | [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) / [08008ABC](../../medabots-decompile/analysis/raw/functions/08008abc.c) | [08009A84](../../medabots-decompile/analysis/raw/functions/08009a84.c) | [255, 255, 3, 1] |

Read family-specific collision and status consumers as well as motion. Recovery, regeneration, revival, ailment clearing, defense fields, traps, transformation and nullification must not become generic damage projectiles solely to make the roster selectable. The original [ordinary hit consumer](../../medabots-decompile/analysis/raw/functions/0800baf8.c) branches on these families before normal damage. Existing Barrage/Vertical Line findings are in [the earlier evidence](ax-roster-evidence.md#implementation-follow-up-barrage-and-vertical-line).

## Medals: independent composition, real encounter presets

There is no universal robot-to-medal binding in the battle equipment model. Complete-set rows in the [440-record opponent table](../../medabots-decompile/data/generated/combat/opponents.json) provide defensible local-match presets. Counts below include repeated encounters; they are not probability weights. A dash means no full `[id,id,id,id]` tuple in this particular build’s table, not that the robot cannot exist.

| Set               | Observed complete-set medal ID: count |
| ----------------- | ------------------------------------- |
| 0 / Metabee       | —                                     |
| 1 / Rokusho       | —                                     |
| 2 / Brass         | 0: 21                                 |
| 3 / Neutranurse   | 2: 19                                 |
| 4 / Sumilidon     | 1: 19                                 |
| 5 / Warbandit     | 0: 19                                 |
| 6 / Mega-Emperor  | 7: 5                                  |
| 7 / Babbyblu      | 10: 5                                 |
| 8 / Acehorn       | 8: 4                                  |
| 9 / Cleobattler   | 11: 22                                |
| 10 / Octoclam     | 7: 1                                  |
| 11 / Totalizer    | 0: 12                                 |
| 12 / Spidar       | 4: 6                                  |
| 13 / Nin-Ninja    | 4: 12, 1: 4                           |
| 14 / Oceana       | 2: 6, 8: 3                            |
| 15 / Snowbro      | 1: 15, 5: 2                           |
| 16 / Krosserdog   | 6: 10, 0: 2                           |
| 17 / Giggly Jelly | —                                     |
| 18 / Saldron      | 11: 5                                 |
| 19 / Peppercat    | 5: 14                                 |
| 20 / Belzelga     | —                                     |
| 21 / Phoenix      | 9: 25                                 |
| 22 / Orkamar      | 5: 12, 7: 1                           |
| 23 / Sharkkan     | —                                     |
| 24 / Monoklar     | 7: 8, 10: 12                          |
| 25 / Gorem-2      | 8: 18                                 |
| 26 / Knight Armor | —                                     |
| 27 / Face Lantern | 8: 6                                  |
| 28 / Crimson King | 7: 10, 5: 5                           |
| 29 / Arcbeetle    | —                                     |

Medal IDs: 0 Kabuto, 1 Kuwagata, 2 Mermaid, 3 ?, 4 Spider, 5 Bear, 6 Monkey, 7 Devil, 8 Unicorn, 9 Phoenix, 10 Ghost, 11 Alien. Choosing a preset for an absent full-set encounter is a remake decision; label it accordingly. Do not claim a generic Kabuto fallback is canonical.

All 99 levels for all 12 medals are present in [medal-levels.json](../../medabots-decompile/data/generated/combat/medal-levels.json); stat bytes are shooting, grappling, support, defense. Do not extrapolate a shared growth curve. The artifact contains every numeric row and source address.

### Target-part preferences for all twelve medals

The [part-selection consumer](../../medabots-decompile/analysis/raw/functions/0800d32c.c) reads the attacker medal record’s **byte 1** at `0809589C + 4×medalId` and indexes the **eight-entry** handler bank at `08328298`. It does not index this bank directly by medal ID. Values 8–11 there would read into an adjacent unrelated table. This closes a key source boundary for importing the other ten medals.

| Medal        | Preference selector | Doubled target weights               | Handler                                                                |
| ------------ | ------------------: | ------------------------------------ | ---------------------------------------------------------------------- |
| 0 / Kabuto   |                   0 | legs                                 | `0800D4C0` (small Thumb stub)                                          |
| 1 / Kuwagata |                   0 | legs                                 | `0800D4C0` (small Thumb stub)                                          |
| 2 / Mermaid  |                   4 | lowest positive current armor (ties) | [0800D5D8](../../medabots-decompile/analysis/raw/functions/0800d5d8.c) |
| 3 / ?        |                   3 | highest current armor (ties)         | [0800D540](../../medabots-decompile/analysis/raw/functions/0800d540.c) |
| 4 / Spider   |                   1 | non-support action parts             | [0800D4C8](../../medabots-decompile/analysis/raw/functions/0800d4c8.c) |
| 5 / Bear     |                   3 | highest current armor (ties)         | [0800D540](../../medabots-decompile/analysis/raw/functions/0800d540.c) |
| 6 / Monkey   |                   5 | action profile byte1 !=255           | [0800D674](../../medabots-decompile/analysis/raw/functions/0800d674.c) |
| 7 / Devil    |                   6 | highest part byte4 rank (ties)       | [0800D6B0](../../medabots-decompile/analysis/raw/functions/0800d6b0.c) |
| 8 / Unicorn  |                   4 | lowest positive current armor (ties) | [0800D5D8](../../medabots-decompile/analysis/raw/functions/0800d5d8.c) |
| 9 / Phoenix  |                   2 | support action parts                 | [0800D504](../../medabots-decompile/analysis/raw/functions/0800d504.c) |
| 10 / Ghost   |                   2 | support action parts                 | [0800D504](../../medabots-decompile/analysis/raw/functions/0800d504.c) |
| 11 / Alien   |                   7 | none                                 | `0800D78C` (small Thumb stub)                                          |

`0800D4C0` writes 1 to preference array index 3 (legs), then returns. `0800D78C` returns without changing the cleared array. Highest/lowest selectors preserve ties; lowest excludes zero-armor limbs. Rank preference compares source part-record byte 4 and ignores destroyed non-head parts. Profile-based preferences only inspect head/right/left, not legs. These preferences alter selection weights; they do not directly choose a guaranteed hit region.

## Remaining research boundaries

1. The four Rokusho-exclusive localized names need a primary visual/manual name binding; their complete equipment tuples are already established.
2. Per-frame collision rectangles, source offsets composed with all body/part poses, and every status-handler ABI still require targeted audits.
3. Support/trap/transform/nullification behavior must be tested against original runtime traces before claiming complete weapon parity.
4. Source-complete opponent AI means reproducing panel evaluation, weapon-specific eligibility, action ordering, shared random consumption and navigation; stronger heuristic AI alone is not the original algorithm.
5. Exact colors, proportions and animation coverage for all 26 newly illustrated robots require an art review against original appearances. A motif list cannot substitute for this review.

Useful implementation order: import immutable numeric definitions and exact timing stages; implement action families with behavior tests; apply all medal stat/preference profiles; then validate complete encounters across stage and locomotion families. Keep unverified behavior explicit in the fidelity status document.
