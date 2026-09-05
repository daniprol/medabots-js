import { armor, shell, seam, rivet, joint } from './armor';
import type { RobotModel } from './primitives';

export function legArmor(
  model: RobotModel,
  color: string,
  accent: string,
  style: 'round' | 'blade' | 'heavy' | 'knight',
) {
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1;
    const hip = model.feet[i]!;
    const knee = model.rig!.knees[i]!;
    const broad = style === 'heavy' ? 1.18 : style === 'blade' ? 0.85 : 1;
    armor(
      hip,
      accent,
      [
        [-0.14, -0.3],
        [0.14, -0.3],
        [0.18, -0.1],
        [0.13, 0.015],
        [-0.13, 0.015],
        [-0.18, -0.1],
      ],
      0.3,
      0,
      -0.025,
      0,
      0.035,
    );
    armor(
      knee,
      color,
      [
        [-0.18, -0.02],
        [-0.2, -0.23],
        [-0.13, -0.38],
        [0.15, -0.38],
        [0.23, -0.23],
        [0.17, 0.04],
      ],
      0.34,
      0,
      -0.025,
      0.05,
      0.035,
    ).scale.x = broad;
    armor(
      knee,
      accent,
      [
        [-0.14, 0.04],
        [0.14, 0.04],
        [0.13, -0.09],
        [0, -0.16],
        [-0.13, -0.09],
      ],
      0.06,
      0,
      -0.035,
      0.25,
      0.015,
    );
    seam(knee, [
      [side * 0.15, -0.08, 0.247],
      [side * 0.15, -0.21, 0.247],
      [side * 0.075, -0.29, 0.247],
    ]);

    // Broad, tapered toe with separate sole and ankle -- not a rectangular shoe.
    const foot = shell(
      knee,
      accent,
      [
        [-0.035, 0.2 * broad, 0.36, 0],
        [0.025, 0.25 * broad, 0.4, 0],
        [0.12, 0.23 * broad, 0.32, -0.045],
        [0.18, 0.14, 0.2, -0.1],
      ],
      0,
      -0.5,
      0.23,
    );
    armor(
      knee,
      color,
      [
        [-0.15, -0.04],
        [0.15, -0.04],
        [0.18, 0.035],
        [0.1, 0.125],
        [-0.1, 0.125],
        [-0.18, 0.035],
      ],
      0.12,
      0,
      -0.42,
      0.46,
      0.022,
    );
    seam(
      knee,
      [
        [-0.19 * broad, -0.49, 0.44],
        [0, -0.51, 0.57],
        [0.19 * broad, -0.49, 0.44],
      ],
      joint,
      0.012,
    );

    if (style === 'blade') {
      armor(
        knee,
        '#1f4dba',
        [
          [0, 0.13],
          [0.09, -0.08],
          [0, -0.25],
          [-0.075, -0.09],
        ],
        0.035,
        0,
        -0.15,
        0.285,
        0.012,
      );
    }

    if (style === 'heavy') {
      rivet(knee, side * 0.17, -0.1, 0.28);
    }

    foot.name = 'ToeArmor';
  }
}
