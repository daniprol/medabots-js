import * as THREE from 'three';

import { armor, shell, eyes, muzzle, seam, rivet, vent, fingerFist, ivory, joint } from './armor';
import { legArmor } from './leg-armor';
import { ball, tube, v, ink } from './primitives';
import { robotFrame, finishModel } from './robot-frame';

export function metabee(color = '#edac19', accent = '#f2f1df') {
  const model = robotFrame();
  // A beetle-carapace helmet: domed crown, cut-away face, heavy brow and separate jaw.
  shell(model.head, color, [
    [-0.43, 0.25, 0.24, 0],
    [-0.28, 0.44, 0.34, 0],
    [0.12, 0.5, 0.39, 0],
    [0.34, 0.43, 0.31, -0.015],
    [0.48, 0.19, 0.15, -0.015],
    [0.49, 0.02, 0.04, 0],
  ]);
  armor(
    model.head,
    ink,
    [
      [-0.38, 0.035],
      [0, -0.045],
      [0.38, 0.035],
      [0.32, -0.25],
      [0, -0.34],
      [-0.32, -0.25],
    ],
    0.035,
    0,
    0,
    0.412,
    0.016,
  );
  eyes(model.head, '#5cf58a', 0.455, 0.32);
  armor(
    model.head,
    color,
    [
      [-0.36, 0.1],
      [-0.27, 0.37],
      [0, 0.48],
      [0.27, 0.37],
      [0.36, 0.1],
      [0, -0.015],
    ],
    0.09,
    0,
    0,
    0.37,
    0.027,
  );
  seam(
    model.head,
    [
      [0, 0.42, 0.446],
      [0, 0.15, 0.447],
      [0, 0.008, 0.448],
    ],
    '#93600d',
    0.009,
  );
  armor(
    model.head,
    accent,
    [
      [-0.25, -0.28],
      [0, -0.35],
      [0.25, -0.28],
      [0.2, -0.43],
      [0, -0.48],
      [-0.2, -0.43],
    ],
    0.14,
    0,
    0,
    0.36,
    0.022,
  );

  for (const side of [-1, 1]) {
    armor(
      model.head,
      color,
      [
        [side * 0.34, 0.03],
        [side * 0.48, 0.12],
        [side * 0.48, -0.2],
        [side * 0.35, -0.4],
        [side * 0.27, -0.33],
      ],
      0.16,
      0,
      0,
      0.33,
      0.025,
    );
    seam(
      model.head,
      [
        [side * 0.43, -0.1, 0.427],
        [side * 0.43, -0.22, 0.427],
        [side * 0.34, -0.32, 0.44],
      ],
      '#a66f12',
    );
    rivet(model.head, side * 0.43, -0.05, 0.425, '#f1cb63');

    const mount = new THREE.Group();
    mount.position.set(side * 0.27, 0.39, -0.025);
    mount.rotation.set(-0.6, side * 0.15, 0);
    model.head.add(mount);
    muzzle(mount, '#dc9616', 0, 0, -0.1, 0.15, 0.2);

    const gun = muzzle(mount, '#202b42', 0, 0, 0.03, 0.195, 0.47);

    for (const z of [0.12, 0.27]) {
      for (const side of [-1, 1]) {
        ball(gun, '#080f20', side * 0.17, 0.065, z, 0.045, 0.095, 0.1);
      }
    }

    seam(
      gun,
      [
        [-0.1, 0.15, 0.11],
        [-0.1, 0.15, 0.34],
      ],
      '#5b6b85',
      0.012,
    );
  }

  // The white breastplate and vented pelvis are signature shapes, not generic chest lights.
  shell(model.core, color, [
    [1.09, 0.28, 0.24, 0],
    [1.23, 0.4, 0.3, 0],
    [1.59, 0.43, 0.3, -0.03],
    [1.73, 0.3, 0.23, -0.02],
  ]);
  armor(
    model.core,
    ivory,
    [
      [-0.24, 1.66],
      [0.24, 1.66],
      [0.25, 1.36],
      [0.17, 1.24],
      [-0.17, 1.24],
      [-0.25, 1.36],
    ],
    0.12,
    0,
    0,
    0.3,
    0.04,
  );
  armor(
    model.core,
    '#bccacb',
    [
      [-0.12, 1.45],
      [0.12, 1.45],
      [0.12, 1.38],
      [-0.12, 1.38],
    ],
    0.035,
    0,
    0,
    0.391,
    0.008,
  );

  for (const x of [-0.05, 0.05]) {
    rivet(model.core, x, 1.52, 0.385, ivory);
  }

  armor(
    model.core,
    accent,
    [
      [-0.23, 1.05],
      [0.23, 1.05],
      [0.27, 0.91],
      [0.21, 0.75],
      [0, 0.7],
      [-0.21, 0.75],
      [-0.27, 0.91],
    ],
    0.16,
    0,
    0,
    0.23,
    0.035,
  );

  for (const y of [0.83, 0.94]) {
    armor(
      model.core,
      '#bfcece',
      [
        [-0.17, -0.027],
        [0.17, -0.027],
        [0.17, 0.027],
        [-0.17, 0.027],
      ],
      0.025,
      0,
      y,
      0.33,
      0.012,
    );
  }

  for (const side of [-1, 1]) {
    armor(
      model.core,
      color,
      [
        [side * 0.25, 1.1],
        [side * 0.41, 1.06],
        [side * 0.43, 0.84],
        [side * 0.28, 0.9],
      ],
      0.26,
      0,
      0,
      0,
      0.022,
    );
  }

  for (const [i, arm] of [model.leftArm, model.rightArm].entries()) {
    const side = i === 0 ? -1 : 1;
    armor(
      arm,
      color,
      [
        [-0.26, -0.07],
        [0.25, -0.07],
        [0.32, 0.09],
        [0.19, 0.21],
        [-0.19, 0.21],
        [-0.31, 0.1],
      ],
      0.47,
      side * 0.02,
      0.02,
      0,
      0.035,
    );
    seam(
      arm,
      [
        [-0.22, 0.13, 0.264],
        [0.2, 0.13, 0.264],
        [0.26, 0.03, 0.264],
      ],
      '#a56f0e',
    );
    rivet(arm, side * 0.23, 0.04, 0.27);
    tube(arm, ivory, v(0, -0.1, 0.03), v(side * 0.025, -0.28, 0.18), 0.115);

    const forearm = new THREE.Group();
    forearm.position.set(side * 0.03, -0.28, 0.23);
    arm.add(forearm);
    armor(
      forearm,
      i === 0 ? ivory : color,
      [
        [-0.21, -0.15],
        [0.21, -0.15],
        [0.23, 0.16],
        [-0.23, 0.16],
      ],
      0.5,
      0,
      0,
      0,
      0.045,
    );

    if (i === 0) {
      muzzle(forearm, '#394760', 0, 0.035, 0.24, 0.105, 0.32);
      vent(forearm, -0.14, -0.03, 0.285, 0.08);
      fingerFist(forearm, ivory, 0.08, -0.16, 0.19, 0.6);
    } else {
      for (const side of [-1, 1]) {
        muzzle(forearm, '#26344d', side * 0.115, 0.06, 0.25, 0.09, 0.24);
      }

      fingerFist(forearm, ivory, 0, -0.17, 0.27, 0.7);
    }

    armor(
      forearm,
      '#f6d367',
      [
        [-0.17, 0.14],
        [0.17, 0.14],
        [0.17, 0.18],
        [-0.17, 0.18],
      ],
      0.32,
      0,
      0,
      0,
      0.006,
    );
  }

  legArmor(model, color, accent, 'round');

  for (const knee of model.rig!.knees) {
    for (const side of [-1, 1]) {
      armor(
        knee,
        joint,
        [
          [side * 0.1, -0.51],
          [side * 0.24, -0.52],
          [side * 0.17, -0.34],
        ],
        0.21,
        0,
        0,
        0.44,
        0.008,
      );
    }

    seam(
      knee,
      [
        [0, -0.35, 0.53],
        [0, -0.49, 0.605],
      ],
      '#71828b',
      0.01,
    );
  }

  return finishModel(model);
}
