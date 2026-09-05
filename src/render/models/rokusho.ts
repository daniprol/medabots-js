import * as THREE from 'three';

import { armor, shell, eyes, seam, rivet, fingerFist, ivory } from './armor';
import { legArmor } from './leg-armor';
import { ball, tube, v, ink } from './primitives';
import { robotFrame, finishModel } from './robot-frame';

export function rokusho(color = '#e4ecf7', accent = '#2552be') {
  const model = robotFrame();
  shell(model.head, color, [
    [-0.4, 0.19, 0.2, 0],
    [-0.25, 0.39, 0.32, 0],
    [0.1, 0.44, 0.36, 0],
    [0.31, 0.35, 0.28, -0.025],
    [0.4, 0.14, 0.15, -0.02],
  ]);
  armor(
    model.head,
    ink,
    [
      [-0.35, 0.035],
      [0, -0.03],
      [0.35, 0.035],
      [0.28, -0.21],
      [0, -0.29],
      [-0.28, -0.21],
    ],
    0.035,
    0,
    0,
    0.376,
    0.014,
  );
  eyes(model.head, '#f54c4b', 0.416, 0.3);
  armor(
    model.head,
    ivory,
    [
      [-0.31, 0.12],
      [-0.19, 0.31],
      [0, 0.23],
      [0.19, 0.31],
      [0.31, 0.12],
      [0, -0.01],
    ],
    0.11,
    0,
    0,
    0.34,
    0.02,
  );
  armor(
    model.head,
    color,
    [
      [-0.24, -0.25],
      [0, -0.31],
      [0.24, -0.25],
      [0.15, -0.4],
      [0, -0.48],
      [-0.15, -0.4],
    ],
    0.15,
    0,
    0,
    0.31,
    0.025,
  );
  seam(
    model.head,
    [
      [0, -0.31, 0.416],
      [0, -0.43, 0.406],
    ],
    '#71819a',
  );
  // Two sweeping stag-beetle antennae frame a single deep-blue crown blade.
  armor(
    model.head,
    accent,
    [
      [-0.15, 0.18],
      [-0.18, 0.53],
      [-0.05, 0.92],
      [0.03, 1.14],
      [0.23, 0.91],
      [0.19, 0.54],
      [0.13, 0.18],
    ],
    0.24,
    0,
    0,
    -0.11,
    0.022,
  );
  armor(
    model.head,
    '#477be1',
    [
      [-0.045, 0.35],
      [0.01, 0.93],
      [0.15, 0.84],
      [0.105, 0.4],
    ],
    0.014,
    0,
    0,
    0.033,
    0.004,
  );

  for (const side of [-1, 1]) {
    armor(
      model.head,
      color,
      [
        [side * 0.27, 0.18],
        [side * 0.53, 0.27],
        [side * 0.75, 0.81],
        [side * 0.73, 1.0],
        [side * 0.53, 0.79],
        [side * 0.38, 0.54],
      ],
      0.18,
      0,
      0,
      -0.075,
      0.026,
    );
    armor(
      model.head,
      accent,
      [
        [side * 0.4, 0.45],
        [side * 0.53, 0.57],
        [side * 0.66, 0.9],
        [side * 0.53, 0.77],
      ],
      0.022,
      0,
      0,
      0.034,
      0.008,
    );
    armor(
      model.head,
      ivory,
      [
        [side * 0.3, 0.0],
        [side * 0.44, 0.16],
        [side * 0.47, -0.11],
        [side * 0.3, -0.33],
        [side * 0.23, -0.23],
      ],
      0.15,
      0,
      0,
      0.3,
      0.02,
    );
    rivet(model.head, side * 0.39, -0.1, 0.397, '#aabacd');
    ball(model.core, accent, side * 0.35, 1.52, 0, 0.29, 0.32, 0.35);
  }

  shell(model.core, accent, [
    [1.15, 0.23, 0.2, 0],
    [1.4, 0.32, 0.24, 0],
    [1.66, 0.28, 0.21, 0],
  ]);
  armor(
    model.core,
    ivory,
    [
      [-0.23, 1.7],
      [0.23, 1.7],
      [0.38, 1.41],
      [0.24, 1.19],
      [0, 1.14],
      [-0.24, 1.19],
      [-0.38, 1.41],
    ],
    0.13,
    0,
    0,
    0.25,
    0.045,
  );
  seam(
    model.core,
    [
      [-0.29, 1.37, 0.347],
      [0, 1.49, 0.354],
      [0.29, 1.37, 0.347],
    ],
    '#72829d',
  );
  armor(
    model.core,
    accent,
    [
      [-0.045, 1.68],
      [0.045, 1.68],
      [0.08, 1.57],
      [0, 1.5],
      [-0.08, 1.57],
    ],
    0.023,
    0,
    0,
    0.34,
    0.008,
  );
  armor(
    model.core,
    ivory,
    [
      [-0.1, 1.11],
      [0.1, 1.11],
      [0.15, 0.78],
      [0, 0.64],
      [-0.15, 0.78],
    ],
    0.16,
    0,
    0,
    0.24,
    0.035,
  );

  for (const side of [-1, 1]) {
    armor(
      model.core,
      color,
      [
        [side * 0.13, 1.09],
        [side * 0.33, 1.04],
        [side * 0.49, 0.77],
        [side * 0.26, 0.71],
        [side * 0.18, 0.83],
      ],
      0.19,
      0,
      0,
      0.03,
      0.025,
    );
  }

  for (const [i, arm] of [model.leftArm, model.rightArm].entries()) {
    const side = i === 0 ? -1 : 1;
    armor(
      arm,
      color,
      [
        [-0.23, -0.12],
        [0.2, -0.12],
        [0.26, 0.11],
        [0, 0.22],
        [-0.24, 0.08],
      ],
      0.37,
      0,
      0,
      0,
      0.035,
    );
    armor(
      arm,
      ivory,
      [
        [side * 0.02, 0.1],
        [side * 0.41, 0.22],
        [side * 0.65, 0.56],
        [side * 0.31, 0.43],
        [side * -0.04, 0.24],
      ],
      0.15,
      0,
      0,
      -0.04,
      0.022,
    );
    armor(
      arm,
      accent,
      [
        [side * 0.12, 0.21],
        [side * 0.39, 0.29],
        [side * 0.5, 0.44],
        [side * 0.24, 0.34],
      ],
      0.025,
      0,
      0,
      0.054,
      0.005,
    );
    tube(arm, accent, v(0, -0.12, 0.02), v(side * 0.04, -0.29, 0.12), 0.1);

    const forearm = new THREE.Group();
    forearm.position.set(side * 0.03, -0.31, 0.22);
    arm.add(forearm);
    armor(
      forearm,
      color,
      [
        [-0.14, -0.13],
        [0.17, -0.13],
        [0.23, 0.07],
        [0.11, 0.17],
        [-0.16, 0.13],
      ],
      0.46,
      0,
      0,
      0,
      0.045,
    );
    armor(
      forearm,
      accent,
      [
        [-0.12, 0.12],
        [0.13, 0.12],
        [0.14, 0.05],
        [-0.12, 0.05],
      ],
      0.38,
      0,
      0,
      0,
      0.02,
    );
    fingerFist(forearm, ivory, 0, -0.03, 0.32, 0.66);

    const blade = new THREE.Group();
    blade.position.set(0, 0.075, 0.25);
    blade.rotation.x = Math.PI / 2;
    forearm.add(blade);

    const length = i === 0 ? 0.88 : 1.18;
    armor(
      blade,
      '#b9ddfa',
      [
        [-0.11, 0],
        [0.12, 0],
        [0.1, length * 0.7],
        [0, length],
        [-0.1, length * 0.7],
      ],
      0.065,
      0,
      0,
      0,
      0.008,
    );
    armor(
      blade,
      '#f6fdff',
      [
        [0, 0.03],
        [0.12, 0.03],
        [0.1, length * 0.7],
        [0, length],
      ],
      0.01,
      0,
      0,
      0.043,
      0,
    );
    seam(
      blade,
      [
        [0, 0.03, 0.055],
        [0, length - 0.04, 0.055],
      ],
      '#5189be',
      0.008,
    );
    rivet(forearm, -0.1, 0, 0.26);
  }

  legArmor(model, color, ivory, 'blade');

  for (const knee of model.rig!.knees) {
    for (const side of [-1, 1]) {
      armor(
        knee,
        accent,
        [
          [side * 0.1, -0.49],
          [side * 0.23, -0.48],
          [side * 0.16, -0.34],
        ],
        0.2,
        0,
        0,
        0.42,
        0.012,
      );
    }
  }

  return finishModel(model);
}
