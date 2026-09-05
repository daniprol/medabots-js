# Character art research

Research date: 2026-09-05. The project's supplied local reference image (`graphics_reference.png`, excluded from release archives) is the primary art direction. External illustrations and licensed model photographs were inspected as reference only; they are not game assets.

## Direction

The largest improvement comes from sculpting each silhouette, face, and armor panel individually. The supplied image combines short bodies, oversized weapon forearms, narrow articulated waists, angular helmets, dark joint gaps, and expressive combat poses. Broad uninterrupted color areas and selective seams make these shapes readable at battle scale. This is an observation of the supplied reference, not a claim about a canonical model sheet.

Keep the current procedural Three.js approach, but use custom beveled profile extrusions for shell armor, layered cheek and brow plates, tapered limbs, and actual gun bores. Round joints belong inside the armor. A shared rounded body with differently colored accessories cannot capture the distinctions.

## Reference observations

### Metabee / Metal Beetle

The licensed model has an egg-shaped yellow helmet with a strong central crest, two widely spaced black trumpet-like head weapons, a recessed black face containing separate green eyes, and a white chin. A white vertical breastplate sits between yellow torso sides. The broad white pelvis has horizontal vent-like forms. Large gold shin shells flare around slimmer joints; split white feet end in dark claw forms. The arms are asymmetric gun housings. Kotobukiya explicitly supplies four expressive visors and head/arm firing effects, reinforcing the importance of expression and weapon articulation. These shape notes are observations of the product photographs. [Kotobukiya Metabee product and gallery](https://www.kotobukiya.co.jp/product/detail/p4934054066209/), [official full-body photograph](https://shop.kotobukiya.co.jp/img/goods/L/KP163X_metabee_01.jpg).

For this prototype: make the brow and cheek cuts sharper to match the supplied cartoon target; preserve the white chest/pelvis, two clear cannon mouths, separate eyes, broad lower legs, and short waist. These are design recommendations.

### Rokusho / Head Scissors

The licensed model has two large dark blue curved horns, a white helmet with a blue crown panel, red eyes inside a black mask, a pointed chin, and swept blade-like shoulder armor. White hip skirts and thin articulated lower legs separate it from Metabee. Dark blue joints and toe tips punctuate the white silhouette. Its canonical arms differ: Kotobukiya names the right arm's sword and left arm's hammer. The product also includes alternative antennae and expressive visors. Shape observations are from the photographs; the weapon distinction is explicit in the description. [Kotobukiya Rokusho product](https://www.kotobukiya.co.jp/product/detail/p4934054066254/), [official gallery and description](https://shop.kotobukiya.co.jp/shop/g/g4934054066254/), [full-body photograph](https://shop.kotobukiya.co.jp/img/goods/L/KP201X_rokusyou_01.jpg).

For this prototype: retain the supplied reference's blue swept crest and blade-oriented arms. Use tapering geometry, a small angular chest, swept shoulder plates, longer legs, and a low attacking stance. Treat the paired blades as this project's interpretation.

### Arcbeetle and Warbandit: an important reference discrepancy

The supplied image's names and silhouettes do not match the licensed references. Kotobukiya's Arcbeetle is the red/orange machine with a long silver forward horn, green visor, yellow cylindrical weapons, and large angular shoulders. It has a second long white chest projection and clustered cylindrical feet. [Kotobukiya Arcbeetle product](https://www.kotobukiya.co.jp/product/detail/p4934054027569/), [official full-body photograph](https://shop.kotobukiya.co.jp/img/goods/L/4934054027569_1.jpg).

Bandai's official four-character lineup shows Warbandit with a gold face, blue face window, red-and-white radial pipe mane, large brown forearms, gold/red lower-body panels, and broad feet. The supplied image's gold radial machine resembles this identity, while its red lance machine resembles the licensed Arcbeetle. This comparison is a visual inference from the labeled product lineups, not an assertion that the supplied image is an official design sheet. [Bandai Medarot Perfect Collection](https://www.bandai.co.jp/candy/products/2019/4549660423836000.html), [official lineup photograph](https://www.bandai.co.jp/candy/published/bnc_files/product/i8L/000000253768KmL0LZE3hqaYzaCq7nbjXdYWbFNDmahPii8L.jpg).

Implementation decision: preserve the project's requested gold/radial **Arcbeetle** and red/orange/lance **Warbandit**, following the supplied target and existing gameplay identities. They are deliberate reference-inspired interpretations, not exact canonical reproductions. Sculpt the radial character wider and heavier, with a fan of pipes behind a compact face and large dark barrel clusters. Give the lance character a sharply projected horn, boxier red armor, cylindrical gold details, and an aggressive wide stance.

## Three.js implementation recommendations

1. **Sculpt armor as silhouettes.** `Shape` plus `ExtrudeGeometry` provides explicit extrusion depth and bevel size/thickness/segments. Author a few small profile helpers in rendering code for helmets, cheeks, chest, shoulder wings, shins, and blades. Use low bevel counts so the shape stays crisp and inexpensive. The geometry API supports these parameters; the proposed modeling workflow is our recommendation. [Three.js ExtrudeGeometry](https://threejs.org/docs/pages/ExtrudeGeometry.html).
2. **Use restrained toon shading.** `MeshToonMaterial` supports a gradient map. The official documentation requires nearest filtering for this texture and says it represents non-color data. A shared three-step gradient, one directional light, and a softer hemisphere fill are appropriate starting points. Adjust the fill to retain visible bands without blackening the colored armor. [Three.js MeshToonMaterial](https://threejs.org/docs/pages/MeshToonMaterial.html).
3. **Keep outlines simple.** A slightly enlarged dark back-face shell is suitable for closed armor meshes already controlled by this code. Avoid applying an outline to every tiny seam, transparent effect, or coplanar eye panel. Three.js provides material-side control and an official WebGL `OutlineEffect` if a uniform alternative later becomes necessary. Prefer the existing simpler technique while it looks clean. [Three.js Material](https://threejs.org/docs/pages/Material.html), [Three.js OutlineEffect](https://threejs.org/docs/pages/OutlineEffect.html).
4. **Layer the face physically.** Place the black mask slightly behind the brow and cheeks; place separate luminous eye shapes above it. Preserve a visible gap between the eyes. Recess gun bores inside a contrasting ring. These are modeling recommendations based on the inspected reference images.
5. **Pose large parts, preserve gameplay.** Keep armor under the existing head/arm/leg groups and expose the inner frame on destruction. Add shoulder recoil, bent knees, leg counter-swing, and a small forward torso lean from existing snapshot state. Keep collision shapes and damage entirely in battle-core.
6. **Inspect at actual display size.** Compare each bot in the roster, HUD portrait, and full arena. The supplied reference rewards visible faces and readable weapons, so use a mild three-quarter visual orientation inside the fixed side-view gameplay. Reduce surface detail if it becomes noise at battle distance. These are presentation recommendations, not battle-rule changes.

No proprietary models, textures, sprites, or game files are required. Source images used during research remain temporary inspection artifacts rather than bundled assets.
