# HD-2D art provenance

The runtime artwork was generated for this prototype using the built-in image-generation tool, then integrated as textures and atlas regions. No ROM sprite, original background tile, official model, or original sound recording is included.

Franchise character designs remain third-party intellectual property. New drawings do not confer rights to those designs; see [NOTICE](../NOTICE.md). This page records provenance, not legal clearance.

## Assets and briefs

| Runtime asset                                   | Brief / role                                                                                                                                                                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `characters/hd2d/medabots-atlas.png`            | Four character rows, four side-facing cel poses each: idle, run, jump, attack. The supplied local graphics reference guided linework, chibi proportions and colors. Explicit pixel rectangles prevent neighboring poses bleeding into the rendered frame. |
| `characters/hd2d/arcbeetle-warbandit-atlas.png` | Corrected canonical identities: long silver-horned Arcbeetle and orange/yellow radial-maned Warbandit. Newly drawn pose atlas.                                                                                                                            |
| `arenas/hd2d/ruins-distance.png`                | Panoramic warm ancient ruins, layered mountains and forest, soft distant detail, clean side-view battle backdrop.                                                                                                                                         |
| `arenas/hd2d/environment-atlas.png`             | Six panoramic field-family paintings: seashore, lake, factory, polar region, forest, championship. New scenery, not traced original pixel backgrounds.                                                                                                    |
| `arenas/hd2d/platform-atlas.png`                | Three texture strips: mossy carved sandstone, factory steel with hazard accents, icy stone. Three.js geometry supplies platform depth and follows the original numerical surface profiles.                                                                |

Paths are relative to `public/assets/`. The original generation output is retained outside the repository by the tool; selected project assets are copied into this directory. Browser screenshots depict this prototype.

The supplied target had Arcbeetle/Warbandit design labels reversed relative to the canonical references. The correction uses [Arcbeetle's character-book illustration](https://medarot.meowcorp.us/w/index.php?title=File%3AArcbeetle_UCB_Artwork.jpg) and a [Warbandit design reference](https://www.zerochan.net/Warbandit). Reference images were used for study in ignored research artifacts; they are not bundled runtime assets. The original equipment-name cross-check is documented separately in [AX evidence](ax-roster-evidence.md).

## Corrective generation prompts

The initial atlas/background briefs above summarize the generation requests. These later corrective prompts are retained verbatim for reproducibility; generated output still requires visual inspection and atlas-bound checks.

### Character identity correction

Create a production game sprite atlas for a polished HD-2D unofficial Medabots AX fan remake. References 1 and 2 are design references ONLY: first is Warbandit/Warbonnet with orange/yellow lion mane radial silver cylinders, blue visor, brown-orange barrel gauntlets; second is Arcbeetle with very long straight silver forward horn, red/orange armor, cyan visor, gold cylindrical shoulder/arm/foot barrels. Reference 3 is only the desired crisp cel-art rendering style, not the character identities. Draw NEW artwork, not copies of the reference poses. EXACT LAYOUT: transparent RGBA canvas 1536x768, FOUR columns and TWO rows of equal 384x384 cells. TOP ROW ARCBEETLE, BOTTOM ROW WARBANDIT. Each row shows 4 full body poses in order: standing ready, running forward, airborne jump knees bent, forward gun attack. ALL 8 sprites face RIGHT with a side/very slight three-quarter view, consistent compact cartoon proportions 2.6 heads tall. Each sprite must fit completely inside its own cell with at least 28 transparent pixels on ALL FOUR edges; NO limb, horn, barrel or effect may cross the cell boundary. Align feet near the bottom safe margin, preserve size across poses. Do not put shadows, ground, text, panels, labels, frames or markings behind sprites. Clean accurate silhouettes, bold fine charcoal outlines, 2-3 tone saturated cel shading, restrained small highlights, original cartoon personality, readable at 100 pixels high. No gradients on armor, no 3D plastic rendering, no photorealism, no soft blurry edges. Arcbeetle is ranged with gold gun barrels, not claws. Warbandit has NO long horn. Transparent spaces between sprites are essential for atlas sampling. Do not copy any text from references.

### Transparency correction attempt

Edit this sprite atlas: remove the entire white and light-gray checkerboard background and make it actual TRANSPARENT ALPHA, not a drawn transparency checkerboard. Preserve all eight robots, their exact positions, design, colors and sharp outlines. Preserve all pixels inside the robots. Remove the yellow muzzle flashes at the far right of the top and bottom attack sprites too; the game renders muzzle flashes separately. Output PNG with genuine transparent background, no checkerboard, no white rectangle, no floor, no cast shadows. Keep the same atlas layout and aspect ratio. Do not change or redraw character designs.

The edit returned RGB with a painted checkerboard, so it was unsuitable as a transparent game texture. It was not accepted as final runtime art.

### Fresh transparent atlas request

Generate a TRANSPARENT PNG game sprite sheet with an actual alpha channel. The background must be empty transparent pixels, not gray checkerboard painted into an RGB image. Eight isolated full-body Medabots cartoon sprites, four columns two rows, 2:1 canvas. Top row ARCBEETLE (red and orange armor, extremely long straight silver horn pointing right, turquoise visor, gold cylinders on shoulders and barrel arms, gold cylindrical feet). Bottom row WARBANDIT (orange-yellow lion helmet with five short radial gray cylinders forming mane, blue visor, brown-orange rifle/gatling forearms, orange yellow skirt and heavy boots, no horn). Pose order each row: idle, running, jumping with tucked legs, aiming gun forward. All face right, compact chunky chibi proportions 2.6 heads tall, 2D premium anime cel art, sharp dark outlines, 2-tone flat color shadows, clear readable silhouettes. Keep every sprite complete with large empty margins inside its equal cell. No muzzle flashes. No floor. No shadows outside the characters. No background drawing whatsoever. Do not draw transparency checkerboard. No text. Exact character designs from Medabots cartoon. This sheet is a game texture so real background transparency is the most important output requirement.

## Presentation code

Sprite sampling, mirroring, breathing, pose selection and broken-region tinting happen in `src/render/character-view.ts`. Soft contact shadows and the Vertical Line light stroke are small Canvas-generated presentation textures. Three.js constructs the platforms and background depth layers. Camera shake, sparks, flashes and debris consume battle events; persistent damage and projectiles come from snapshots.

This is a four-pose art pass. Independent destroyed-frame art, full original animation coverage, additional roster art and closer original stage decoration remain unfinished; see [fidelity status](ax-remaster-status.md).
