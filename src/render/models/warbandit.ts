import * as THREE from 'three';

import { armor, shell, muzzle, seam, rivet, fingerFist } from './armor';
import { legArmor } from './leg-armor';
import { mesh, tube, v, ink } from './primitives';
import { robotFrame, finishModel } from './robot-frame';

/** Red lance design follows graphics_reference.png; see docs/character-art-research.md. */
export function warbandit(color = '#c93229', accent = '#f29b22') {
  const model = robotFrame();
  shell(model.head, color, [
    [-0.42, 0.27, 0.25, 0],
    [-0.28, 0.44, 0.34, 0],
    [0.16, 0.47, 0.37, 0],
    [0.38, 0.37, 0.27, -0.04],
    [0.45, 0.18, 0.12, -0.04],
  ]);
  armor(
    model.head,
    '#641d26',
    [
      [-0.38, 0.02],
      [0.38, 0.02],
      [0.37, -0.23],
      [0.22, -0.32],
      [-0.22, -0.32],
      [-0.37, -0.23],
    ],
    0.06,
    0,
    0,
    0.385,
    0.016,
  );
  armor(
    model.head,
    '#133c39',
    [
      [-0.32, -0.045],
      [0.32, -0.045],
      [0.28, -0.22],
      [-0.28, -0.22],
    ],
    0.016,
    0,
    0,
    0.428,
    0.007,
  );
  armor(
    model.head,
    '#42dc7c',
    [
      [-0.28, -0.07],
      [0.28, -0.07],
      [0.255, -0.15],
      [0.07, -0.15],
      [0.03, -0.2],
      [-0.24, -0.2],
    ],
    0.016,
    0,
    0,
    0.45,
    0.006,
  );
  seam(
    model.head,
    [
      [-0.22, -0.095, 0.467],
      [0.19, -0.095, 0.467],
    ],
    '#b6ffd3',
    0.009,
  );
  armor(
    model.head,
    '#c5c7e5',
    [
      [-0.24, -0.27],
      [-0.07, -0.27],
      [-0.04, -0.32],
      [0.17, -0.32],
      [0.19, -0.26],
      [0.27, -0.27],
      [0.2, -0.43],
      [-0.22, -0.43],
    ],
    0.16,
    0,
    0,
    0.33,
    0.024,
  );
  armor(
    model.head,
    accent,
    [
      [-0.33, 0.18],
      [-0.39, 0.35],
      [-0.2, 0.52],
      [0.16, 0.55],
      [0.38, 0.38],
      [0.31, 0.17],
    ],
    0.32,
    0,
    0,
    -0.13,
    0.03,
  );
  seam(
    model.head,
    [
      [0.12, 0.48, 0.064],
      [0.24, 0.34, 0.064],
      [0.23, 0.21, 0.064],
    ],
    '#9e4d18',
    0.011,
  );

  for (const side of [-1, 1]) {
    armor(
      model.head,
      color,
      [
        [side * 0.33, 0.16],
        [side * 0.48, 0.12],
        [side * 0.46, -0.26],
        [side * 0.31, -0.33],
      ],
      0.2,
      0,
      0,
      0.3,
      0.035,
    );
    ventSlot(model.head, side * 0.4, -0.13, 0.42);
    rivet(model.head, side * 0.32, 0.24, 0.21, '#3f2430');
  }

  // A broad triangular horn with a bright upper ridge, not a round cone.
  const horn = new THREE.Group();
  horn.position.set(0, 0.21, 0.31);
  horn.rotation.x = -0.06;
  model.head.add(horn);

  const g = new THREE.BufferGeometry();
  const verts = [-0.24, -0.08, 0, 0.24, -0.08, 0, 0, 0.2, 0, 0, 0.045, 1.58];
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex([0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3]);
  g.computeVertexNormals();

  // Separate triangles preserve the crisp three-sided cartoon lance.
  const geometry = g.toNonIndexed();
  g.dispose();
  geometry.computeVertexNormals();
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      new Float32Array(geometry.getAttribute('position').count * 2),
      2,
    ),
  );
  mesh(horn, geometry, '#a7add8');

  for (const point of [v(-0.24, -0.08, 0), v(0.24, -0.08, 0)]) {
    tube(horn, ink, point, v(0, 0.045, 1.58), 0.009);
  }

  seam(
    horn,
    [
      [0, 0.2, 0],
      [0, 0.045, 1.58],
    ],
    '#ecebff',
    0.017,
  );
  shell(model.core, color, [
    [1.05, 0.26, 0.22, 0],
    [1.23, 0.38, 0.29, 0],
    [1.63, 0.43, 0.28, 0],
    [1.72, 0.3, 0.22, 0],
  ]);
  armor(
    model.core,
    '#c6c8e5',
    [
      [-0.25, 1.6],
      [0.25, 1.6],
      [0.3, 1.36],
      [0.18, 1.18],
      [-0.18, 1.18],
      [-0.3, 1.36],
    ],
    0.14,
    0,
    0,
    0.29,
    0.035,
  );
  armor(
    model.core,
    '#566079',
    [
      [-0.12, 1.51],
      [0.12, 1.51],
      [0.14, 1.35],
      [-0.14, 1.35],
    ],
    0.06,
    0,
    0,
    0.39,
    0.012,
  );
  armor(
    model.core,
    '#68e888',
    [
      [-0.075, 1.47],
      [0.075, 1.47],
      [0.075, 1.38],
      [-0.075, 1.38],
    ],
    0.016,
    0,
    0,
    0.43,
    0.006,
  );
  armor(
    model.core,
    '#c0c1dc',
    [
      [-0.21, 1.1],
      [0.21, 1.1],
      [0.28, 0.94],
      [0.16, 0.74],
      [-0.16, 0.74],
      [-0.28, 0.94],
    ],
    0.2,
    0,
    0,
    0.22,
    0.024,
  );

  for (const side of [-1, 1]) {
    armor(
      model.core,
      color,
      [
        [side * 0.23, 1.1],
        [side * 0.44, 0.99],
        [side * 0.41, 0.8],
        [side * 0.23, 0.81],
      ],
      0.27,
      0,
      0,
      -0.03,
      0.028,
    );
  }

  for (const [i, arm] of [model.leftArm, model.rightArm].entries()) {
    const side = i === 0 ? -1 : 1;
    armor(
      arm,
      accent,
      [
        [-0.27, -0.14],
        [0.23, -0.14],
        [0.35, 0.12],
        [0.18, 0.29],
        [-0.21, 0.22],
        [-0.34, 0.09],
      ],
      0.46,
      0,
      0,
      0,
      0.04,
    );
    armor(
      arm,
      '#f7ac33',
      [
        [side * -0.05, 0.12],
        [side * 0.39, 0.38],
        [side * 0.63, 0.4],
        [side * 0.55, 0.16],
        [side * 0.22, -0.03],
      ],
      0.18,
      0,
      0,
      -0.055,
      0.027,
    );
    armor(
      arm,
      '#772629',
      [
        [side * 0.15, 0.15],
        [side * 0.39, 0.31],
        [side * 0.49, 0.31],
        [side * 0.33, 0.15],
      ],
      0.019,
      0,
      0,
      0.057,
      0.008,
    );
    rivet(arm, side * 0.2, 0.025, 0.27, '#ae5219');
    tube(arm, '#c6c5e0', v(0, -0.13, 0.02), v(side * 0.06, -0.28, 0.15), 0.11);

    const forearm = new THREE.Group();
    forearm.position.set(side * 0.04, -0.32, 0.24);
    arm.add(forearm);
    muzzle(forearm, '#a42b2a', 0, 0, -0.22, 0.23, 0.38);
    muzzle(forearm, accent, 0, 0, 0.05, 0.25, 0.22);

    if (i === 0) {
      fingerFist(forearm, '#c6c6e6', 0, -0.015, 0.37, 0.94);
    } else {
      muzzle(forearm, '#f6b53d', 0, 0, 0.26, 0.17, 0.22);
      muzzle(forearm, '#efad36', 0, 0.21, -0.1, 0.14, 0.19);
    }

    seam(
      forearm,
      [
        [-0.18, 0.08, -0.12],
        [-0.18, 0.08, 0.03],
      ],
      '#641b27',
      0.013,
    );
  }

  legArmor(model, color, '#c4c4df', 'knight');

  for (const knee of model.rig!.knees) {
    armor(
      knee,
      accent,
      [
        [-0.19, 0.015],
        [0.19, 0.015],
        [0.17, -0.1],
        [-0.17, -0.1],
      ],
      0.1,
      0,
      -0.01,
      0.24,
      0.025,
    );

    for (const x of [-0.13, 0.13]) {
      muzzle(knee, accent, x, -0.4, 0.3, 0.105, 0.25);
    }
  }

  return finishModel(model);
}

function ventSlot(p: THREE.Object3D, x: number, y: number, z: number) {
  armor(
    p,
    '#781e27',
    [
      [-0.025, -0.095],
      [0.025, -0.095],
      [0.025, 0.095],
      [-0.025, 0.095],
    ],
    0.014,
    x,
    y,
    z,
    0.005,
  );
}
