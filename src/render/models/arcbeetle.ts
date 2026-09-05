import * as THREE from 'three';

import { armor, shell, muzzle, seam, rivet, ivory, joint } from './armor';
import { legArmor } from './leg-armor';
import { tube, v } from './primitives';
import { robotFrame, finishModel } from './robot-frame';

/** Gold radial design follows graphics_reference.png; see docs/character-art-research.md. */
export function arcbeetle(color = '#edb52c', accent = '#d95622') {
  const model = robotFrame();
  model.leftArm.position.x = -0.67;
  model.rightArm.position.x = 0.67;
  model.rig!.innerArms[0]!.position.x = -0.67;
  model.rig!.innerArms[1]!.position.x = 0.67;

  // The pipe mane is arranged behind the head, leaving the face a single clean shape.
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.04 + (i * 0.92) / 6);
    const x = Math.cos(a);
    const y = Math.sin(a);
    const from = v(x * 0.38, y * 0.26 - 0.06, -0.27);
    const elbow = v(x * 0.76, y * 0.7 + 0.04, -0.32);
    const tip = v(x * 1.03, y * 1.09 + 0.1, -0.33);
    tube(model.head, '#9e2d24', from, elbow, 0.095, 0.1);
    tube(model.head, '#dd4030', from.clone().lerp(elbow, 0.16), elbow, 0.078, 0.085);
    tube(model.head, ivory, elbow, tip, 0.089, 0.074);

    const collar = new THREE.Group();
    collar.position.copy(elbow);
    collar.quaternion.setFromUnitVectors(v(0, 0, 1), tip.clone().sub(elbow).normalize());
    model.head.add(collar);
    muzzle(collar, '#f2c03e', 0, 0, -0.075, 0.115, 0.12);
  }

  shell(model.head, color, [
    [-0.42, 0.25, 0.25, 0],
    [-0.25, 0.45, 0.35, 0],
    [0.15, 0.52, 0.4, 0],
    [0.41, 0.38, 0.29, -0.02],
    [0.48, 0.13, 0.11, -0.015],
  ]);
  armor(
    model.head,
    '#174080',
    [
      [-0.37, 0.0],
      [0, -0.065],
      [0.37, 0],
      [0.31, -0.25],
      [0, -0.34],
      [-0.31, -0.25],
    ],
    0.03,
    0,
    0,
    0.425,
    0.012,
  );

  // A segmented blue mouth/visor is deliberately different from Metabee's paired eyes.
  for (const side of [-1, 1]) {
    armor(
      model.head,
      '#d4f8ff',
      [
        [side * 0.045, -0.1],
        [side * 0.3, -0.045],
        [side * 0.25, -0.2],
        [side * 0.065, -0.27],
      ],
      0.015,
      0,
      0,
      0.459,
      0.007,
    );
  }

  armor(
    model.head,
    '#ffe08c',
    [
      [-0.38, 0.08],
      [-0.31, 0.32],
      [-0.13, 0.39],
      [-0.1, 0.5],
      [0.1, 0.5],
      [0.13, 0.39],
      [0.31, 0.32],
      [0.38, 0.08],
      [0.22, -0.025],
      [0, 0.07],
      [-0.22, -0.025],
    ],
    0.08,
    0,
    0,
    0.382,
    0.028,
  );
  armor(
    model.head,
    '#fff0a1',
    [
      [-0.08, 0.18],
      [0.08, 0.18],
      [0.12, 0.24],
      [0, 0.3],
      [-0.12, 0.24],
    ],
    0.027,
    0,
    0,
    0.445,
    0.012,
  );

  for (const side of [-1, 1]) {
    armor(
      model.head,
      color,
      [
        [side * 0.34, 0.06],
        [side * 0.49, 0.13],
        [side * 0.47, -0.24],
        [side * 0.24, -0.39],
        [side * 0.25, -0.22],
      ],
      0.16,
      0,
      0,
      0.32,
      0.024,
    );
    rivet(model.head, side * 0.4, 0.19, 0.408, '#e9a729');
    rivet(model.head, side * 0.42, -0.15, 0.422, '#e9a729');
    armor(
      model.head,
      '#efd77f',
      [
        [side * 0.18, -0.32],
        [side * 0.31, -0.3],
        [side * 0.23, -0.44],
        [side * 0.04, -0.48],
      ],
      0.15,
      0,
      0,
      0.3,
      0.025,
    );
  }

  shell(model.core, '#832f25', [
    [1.03, 0.28, 0.22, 0],
    [1.21, 0.42, 0.31, 0],
    [1.61, 0.49, 0.33, 0],
    [1.73, 0.35, 0.25, 0],
  ]);

  for (const side of [-1, 1]) {
    armor(
      model.core,
      accent,
      [
        [side * 0.18, 1.72],
        [side * 0.45, 1.59],
        [side * 0.36, 1.22],
        [side * 0.2, 1.18],
      ],
      0.14,
      0,
      0,
      0.28,
      0.025,
    );
  }

  armor(
    model.core,
    '#f2d773',
    [
      [-0.18, 1.67],
      [0.18, 1.67],
      [0.21, 1.31],
      [0, 1.16],
      [-0.21, 1.31],
    ],
    0.13,
    0,
    0,
    0.32,
    0.03,
  );
  seam(
    model.core,
    [
      [-0.12, 1.61, 0.413],
      [0, 1.48, 0.417],
      [0.12, 1.61, 0.413],
    ],
    '#a57e2c',
  );
  armor(
    model.core,
    '#edce63',
    [
      [-0.29, 1.07],
      [0.29, 1.07],
      [0.35, 0.79],
      [0.14, 0.72],
      [-0.14, 0.72],
      [-0.35, 0.79],
    ],
    0.23,
    0,
    0,
    0.15,
    0.035,
  );
  armor(
    model.core,
    '#a23626',
    [
      [-0.1, 1.04],
      [0.1, 1.04],
      [0.13, 0.82],
      [0, 0.75],
      [-0.13, 0.82],
    ],
    0.08,
    0,
    0,
    0.31,
    0.02,
  );

  for (const [i, arm] of [model.leftArm, model.rightArm].entries()) {
    const side = i === 0 ? -1 : 1;
    armor(
      arm,
      color,
      [
        [-0.3, -0.08],
        [0.25, -0.08],
        [0.43, 0.24],
        [0.24, 0.34],
        [-0.2, 0.21],
      ],
      0.5,
      side * 0.04,
      0.04,
      0,
      0.045,
    );
    armor(
      arm,
      '#ffd475',
      [
        [side * 0.03, 0.15],
        [side * 0.43, 0.33],
        [side * 0.59, 0.29],
        [side * 0.35, -0.02],
      ],
      0.18,
      0,
      0,
      -0.05,
      0.027,
    );
    seam(
      arm,
      [
        [side * 0.12, 0.17, 0.29],
        [side * 0.3, 0.26, 0.29],
        [side * 0.36, 0.18, 0.29],
      ],
      '#914614',
      0.014,
    );
    rivet(arm, side * 0.17, 0.1, 0.3);
    tube(arm, joint, v(0, -0.12, 0.02), v(side * 0.02, -0.27, 0.16), 0.13);

    const gun = new THREE.Group();
    gun.position.set(side * 0.04, -0.31, 0.24);
    arm.add(gun);
    shell(gun, '#63382b', [
      [-0.28, 0.22, 0.3, 0.03],
      [-0.2, 0.32, 0.34, 0.02],
      [0.17, 0.34, 0.34, 0.02],
      [0.28, 0.2, 0.25, 0.02],
    ]);
    armor(
      gun,
      '#945137',
      [
        [-0.18, -0.3],
        [0.18, -0.3],
        [0.32, -0.15],
        [0.32, 0.15],
        [0.16, 0.3],
        [-0.16, 0.3],
        [-0.32, 0.15],
        [-0.32, -0.15],
      ],
      0.08,
      0,
      0,
      0.36,
      0.025,
    );

    for (let j = 0; j < 4; j++) {
      const a = (j * Math.PI) / 2 + Math.PI / 4;
      const x = Math.cos(a) * 0.18;
      const y = Math.sin(a) * 0.18;
      muzzle(gun, '#35283a', x, y, 0.38, 0.105, 0.19);
      muzzle(gun, '#dd6528', x, y, 0.53, 0.091, 0.047);
    }

    armor(
      gun,
      color,
      [
        [-0.21, 0.16],
        [0.21, 0.16],
        [0.17, 0.25],
        [-0.17, 0.25],
      ],
      0.31,
      0,
      0,
      -0.04,
      0.018,
    );
  }

  legArmor(model, '#e9bb45', '#e0cf77', 'heavy');

  for (const knee of model.rig!.knees) {
    armor(
      knee,
      '#703927',
      [
        [-0.18, -0.11],
        [0.18, -0.11],
        [0.14, -0.35],
        [-0.14, -0.35],
      ],
      0.12,
      0,
      -0.02,
      0.23,
      0.02,
    );
    rivet(knee, 0, -0.23, 0.31, '#c5923c');
  }

  return finishModel(model);
}
