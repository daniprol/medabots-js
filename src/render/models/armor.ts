import * as THREE from 'three';
import { mesh, ink, tube, v, ball, type RobotModel } from './primitives';
import { batchStatic } from '../batch-static';

export const ivory = '#f0f3ed';
export const steel = '#7b8c9e';
export const joint = '#243348';
type Point = readonly [number, number];

/** A drawn armor outline becomes a shallow, bevelled solid; never a gameplay collider. */
export function armor(
  parent: THREE.Object3D,
  color: string,
  points: readonly Point[],
  depth: number,
  x = 0,
  y = 0,
  z = 0,
  bevel = 0.025,
) {
  const shape = new THREE.Shape();
  points.forEach(([px, py], i) => (i ? shape.lineTo(px, py) : shape.moveTo(px, py)));
  shape.closePath();
  // Depth includes the bevel, so overlaid face details can use the actual front surface.
  const bevelDepth = Math.min(bevel, depth * 0.45);
  const extrusionDepth = depth - 2 * bevelDepth;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: extrusionDepth,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelThickness: bevelDepth,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 3,
  });
  geometry.translate(0, 0, -extrusionDepth / 2);
  geometry.computeBoundingBox();
  const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  return mesh(parent, geometry, color, x + center.x, y + center.y, z + center.z);
}

/** Sixteen-sided cross sections make a deliberately sculpted shell with broad toon-shaded planes. */
export function shell(
  parent: THREE.Object3D,
  color: string,
  rings: readonly (readonly [number, number, number, number])[],
  x = 0,
  y = 0,
  z = 0,
) {
  const positions: number[] = [],
    indices: number[] = [],
    uvs: number[] = [];
  const sides = 16;
  for (const [height, rx, rz, offset] of rings)
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      positions.push(Math.sin(a) * rx, height, Math.cos(a) * rz + offset);
      uvs.push(i / sides, height);
    }
  for (let j = 0; j < rings.length - 1; j++)
    for (let i = 0; i < sides; i++) {
      const a = j * sides + i,
        b = j * sides + ((i + 1) % sides),
        c = a + sides,
        d = b + sides;
      indices.push(a, b, c, b, d, c);
    }
  for (let i = 1; i < sides - 1; i++) {
    indices.push(0, i + 1, i);
    const o = (rings.length - 1) * sides;
    indices.push(o, o + i, o + i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  return mesh(parent, geometry, color, x + center.x, y + center.y, z + center.z);
}

export function seam(
  parent: THREE.Object3D,
  points: readonly (readonly [number, number, number])[],
  color = ink,
  radius = 0.009,
) {
  for (let i = 1; i < points.length; i++)
    tube(parent, color, v(...points[i - 1]!), v(...points[i]!), radius);
}
export function disc(
  parent: THREE.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  radius: number,
  depth = 0.018,
) {
  const m = mesh(
    parent,
    new THREE.CylinderGeometry(radius, radius, depth, 12),
    color,
    x,
    y,
    z,
    false,
  );
  m.rotation.x = Math.PI / 2;
  return m;
}
export function rivet(parent: THREE.Object3D, x: number, y: number, z: number, color = steel) {
  disc(parent, ink, x, y, z, 0.031);
  disc(parent, color, x, y, z + 0.012, 0.018);
}
export function vent(parent: THREE.Object3D, x: number, y: number, z: number, width = 0.12) {
  for (let i = 0; i < 3; i++)
    armor(
      parent,
      ink,
      [
        [-width / 2, -0.012],
        [width / 2, -0.012],
        [width / 2, 0.012],
        [-width / 2, 0.012],
      ],
      0.008,
      x,
      y + i * 0.046,
      z,
      0,
    );
}

/** Hollow muzzle with a recessed bore, contrasting rim and inner wall. Points along local +Z. */
export function muzzle(
  parent: THREE.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  radius: number,
  length: number,
) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const body = mesh(
    g,
    new THREE.CylinderGeometry(radius, radius * 0.92, length, 12, 1, true),
    color,
    0,
    0,
    length / 2,
  );
  body.rotation.x = Math.PI / 2;
  const rim = mesh(
    g,
    new THREE.TorusGeometry(radius * 0.84, radius * 0.14, 4, 16),
    color,
    0,
    0,
    length,
  );
  rim.rotation.z = Math.PI / 16;
  const inside = mesh(
    g,
    new THREE.CylinderGeometry(radius * 0.7, radius * 0.55, radius * 0.65, 12, 1, true),
    ink,
    0,
    0,
    length - radius * 0.33,
    false,
  );
  inside.rotation.x = Math.PI / 2;
  disc(g, '#070d1a', 0, 0, length - radius * 0.64, radius * 0.7, 0.008);
  return g;
}
export function fingerFist(
  parent: THREE.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  size = 1,
) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(size);
  parent.add(g);
  armor(
    g,
    color,
    [
      [-0.16, -0.13],
      [0.14, -0.13],
      [0.2, -0.04],
      [0.16, 0.14],
      [-0.13, 0.16],
      [-0.19, 0.05],
    ],
    0.24,
    0,
    0,
    0,
    0.025,
  );
  for (let i = 0; i < 3; i++)
    armor(
      g,
      color,
      [
        [-0.04, -0.065],
        [0.04, -0.065],
        [0.04, 0.055],
        [-0.04, 0.065],
      ],
      0.09,
      -0.1 + i * 0.1,
      0.015,
      0.16,
      0.014,
    );
  armor(
    g,
    color,
    [
      [-0.055, -0.09],
      [0.05, -0.085],
      [0.07, 0.075],
      [-0.05, 0.065],
    ],
    0.12,
    -0.19,
    -0.02,
    0.04,
    0.02,
  );
}
export function eyes(parent: THREE.Object3D, color: string, z: number, wide = 0.34) {
  for (const side of [-1, 1]) {
    // Author mirrored vertices rather than a negative object scale: baked triangle winding stays correct.
    const points: Point[] = [
      [0.055, -0.1],
      [wide, -0.015],
      [wide - 0.025, -0.16],
      [0.115, -0.205],
    ];
    armor(
      parent,
      color,
      points.map(([x, y]) => [x * side, y] as const),
      0.012,
      0,
      0,
      z,
      0,
    );
    armor(
      parent,
      '#e8fff0',
      [
        [0.12, -0.095],
        [wide - 0.05, -0.04],
        [wide - 0.065, -0.071],
        [0.12, -0.128],
      ].map(([x, y]) => [x! * side, y!] as const),
      0.006,
      0,
      0,
      z + 0.015,
      0,
    );
  }
}

/** Shared bare frame only. Every character supplies its own external armor. */
export function robotFrame(): RobotModel {
  const root = new THREE.Group();
  root.name = 'Robot';
  const group = (name: string) => {
    const g = new THREE.Group();
    g.name = name;
    root.add(g);
    return g;
  };
  const core = group('Core'),
    head = group('Head'),
    leftArm = group('LeftArm'),
    rightArm = group('RightArm'),
    legs = group('Legs'),
    innerFrame = group('InnerFrame');
  head.position.y = 2.03;
  leftArm.position.set(-0.57, 1.54, 0);
  rightArm.position.set(0.57, 1.54, 0);
  tube(innerFrame, joint, v(0, 0.83, 0), v(0, 1.87, 0), 0.13);
  ball(innerFrame, steel, 0, 1.85, 0, 0.23, 0.25, 0.24);
  armor(
    innerFrame,
    joint,
    [
      [-0.25, -0.1],
      [0.25, -0.1],
      [0.31, 0.1],
      [-0.31, 0.1],
    ],
    0.38,
    0,
    0.93,
    0,
  );
  const feet: THREE.Group[] = [],
    knees: THREE.Group[] = [],
    innerLegs: THREE.Group[] = [],
    innerKnees: THREE.Group[] = [],
    innerArms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.31, 0.94, 0);
    legs.add(hip);
    feet.push(hip);
    const knee = new THREE.Group();
    knee.position.set(0, -0.38, -0.035);
    hip.add(knee);
    knees.push(knee);
    const frameLeg = new THREE.Group();
    frameLeg.position.copy(hip.position);
    innerFrame.add(frameLeg);
    innerLegs.push(frameLeg);
    ball(frameLeg, steel, 0, 0, 0, 0.24, 0.24, 0.24);
    tube(frameLeg, joint, v(0, -0.04, 0), v(0, -0.38, -0.035), 0.08);
    const frameKnee = new THREE.Group();
    frameKnee.position.copy(knee.position);
    frameLeg.add(frameKnee);
    innerKnees.push(frameKnee);
    ball(frameKnee, steel, 0, 0, 0, 0.22, 0.22, 0.23);
    tube(frameKnee, joint, v(0, -0.04, 0), v(0, -0.42, 0.06), 0.07);
    armor(
      frameKnee,
      steel,
      [
        [-0.12, -0.06],
        [0.12, -0.06],
        [0.1, 0.08],
        [-0.1, 0.08],
      ],
      0.37,
      0,
      -0.48,
      0.16,
      0.014,
    );
    const arm = new THREE.Group();
    arm.position.set(side * 0.57, 1.54, 0);
    innerFrame.add(arm);
    innerArms.push(arm);
    ball(arm, joint, 0, 0, 0, 0.28, 0.28, 0.28);
    tube(arm, steel, v(0, -0.06, 0), v(side * 0.04, -0.27, 0.09), 0.08);
    ball(arm, joint, side * 0.04, -0.27, 0.09, 0.21, 0.21, 0.21);
    tube(arm, steel, v(side * 0.04, -0.27, 0.09), v(side * 0.04, -0.31, 0.43), 0.07);
  }
  return {
    root,
    core,
    head,
    leftArm,
    rightArm,
    legs,
    innerFrame,
    feet,
    rig: { knees, innerLegs, innerKnees, innerArms },
  };
}
export function legArmor(
  model: RobotModel,
  color: string,
  accent: string,
  style: 'round' | 'blade' | 'heavy' | 'knight',
) {
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1,
      hip = model.feet[i]!,
      knee = model.rig!.knees[i]!;
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
    if (style === 'blade')
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
    if (style === 'heavy') rivet(knee, side * 0.17, -0.1, 0.28);
    foot.name = 'ToeArmor';
  }
}

/** Batch only rigid leaves; the visible armor groups and joint pivots remain independently movable. */
export function finishModel(model: RobotModel) {
  for (const g of [model.head, model.core, model.leftArm, model.rightArm]) batchStatic(g);
  for (const hip of model.feet) {
    const knee = hip.children.find((c) => c instanceof THREE.Group) as THREE.Group;
    hip.remove(knee);
    batchStatic(hip);
    batchStatic(knee);
    hip.add(knee);
  }
  for (const hip of model.rig!.innerLegs) {
    const knee = hip.children.find((c) => c instanceof THREE.Group) as THREE.Group;
    hip.remove(knee);
    batchStatic(hip);
    batchStatic(knee);
    hip.add(knee);
  }
  for (const arm of model.rig!.innerArms) batchStatic(arm);
  return model;
}
