import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export const ink = '#152237';
const gradient = new THREE.DataTexture(new Uint8Array([95, 170, 235, 255]), 4, 1, THREE.RedFormat);
gradient.needsUpdate = true;
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
const materials = new Map<string, THREE.MeshToonMaterial>();
export const material = (color: string) => {
  let m = materials.get(color);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: gradient });
    materials.set(color, m);
  }
  return m;
};
const outline = new THREE.MeshBasicMaterial({ color: ink, side: THREE.BackSide });
export function mesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: string,
  x = 0,
  y = 0,
  z = 0,
  outlined = true,
) {
  const m = new THREE.Mesh(geometry, material(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  if (outlined) {
    const shell = new THREE.Mesh(geometry, outline);
    shell.scale.setScalar(1.045);
    m.add(shell);
  }
  return m;
}
export const box = (
  p: THREE.Object3D,
  c: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
) => mesh(p, new RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * 0.13), c, x, y, z);
export function ball(
  p: THREE.Object3D,
  c: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
) {
  const m = mesh(p, new THREE.SphereGeometry(0.5, 12, 8), c, x, y, z);
  m.scale.set(w, h, d);
  return m;
}
export function tube(
  p: THREE.Object3D,
  c: string,
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  tipRadius = radius,
) {
  const delta = to.clone().sub(from);
  const m = mesh(p, new THREE.CylinderGeometry(tipRadius, radius, delta.length(), 10), c);
  m.position.copy(from).add(to).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return m;
}
export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export function plate(p: THREE.Object3D, c: string, points: number[][], depth: number, z: number) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? shape.lineTo(x!, y!) : shape.moveTo(x!, y!)));
  shape.closePath();
  const m = mesh(p, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), c, 0, 0, z);
  return m;
}
export type RobotModel = {
  root: THREE.Group;
  core: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  legs: THREE.Group;
  innerFrame: THREE.Group;
  feet: THREE.Group[];
};
export function chassis(color: string, accent: string, eye: string, bulk = 1): RobotModel {
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
  head.position.y = 1.99;
  leftArm.position.set(-0.62, 1.4, 0);
  rightArm.position.set(0.62, 1.4, 0);
  ball(core, color, 0, 1.36, 0, 0.92 * bulk, 0.83, 0.66);
  plate(
    core,
    accent,
    [
      [-0.38, 1.55],
      [0.38, 1.55],
      [0.27, 1.16],
      [0, 1.05],
      [-0.27, 1.16],
    ],
    0.07,
    0.3,
  );
  box(core, ink, 0, 1.36, 0.39, 0.32, 0.23, 0.09);
  box(core, eye, 0, 1.36, 0.45, 0.19, 0.1, 0.035);
  box(core, '#eff2e8', 0, 0.94, 0, 0.64, 0.28, 0.5);
  box(core, color, 0, 0.91, 0.28, 0.32, 0.37, 0.13);
  ball(head, color, 0, 0, 0, 1.18 * bulk, 0.97, 1.02);
  plate(
    head,
    ink,
    [
      [-0.47, 0.08],
      [-0.33, -0.25],
      [0, -0.34],
      [0.33, -0.25],
      [0.47, 0.08],
      [0, -0.04],
    ],
    0.075,
    0.43,
  );
  plate(
    head,
    eye,
    [
      [-0.34, -0.05],
      [-0.07, -0.13],
      [-0.13, -0.23],
      [-0.31, -0.18],
    ],
    0.026,
    0.522,
  );
  plate(
    head,
    eye,
    [
      [0.34, -0.05],
      [0.07, -0.13],
      [0.13, -0.23],
      [0.31, -0.18],
    ],
    0.026,
    0.522,
  );
  plate(
    head,
    '#fff6dc',
    [
      [-0.25, -0.31],
      [0, -0.38],
      [0.25, -0.31],
      [0.2, -0.5],
      [-0.2, -0.5],
    ],
    0.12,
    0.35,
  );
  for (const side of [-1, 1]) {
    ball(head, color, side * 0.5, -0.16, 0.13, 0.3, 0.42, 0.48);
    box(head, accent, side * 0.52, -0.13, 0.34, 0.16, 0.16, 0.12);
    tube(innerFrame, ink, v(side * 0.35, 0.22, 0), v(side * 0.3, 0.9, 0), 0.1);
    ball(innerFrame, '#8496a6', side * 0.35, 0.5, 0.02, 0.24, 0.24, 0.24);
    tube(innerFrame, ink, v(side * 0.45, 1.4, 0), v(side * 0.85, 1.06, 0.1), 0.1);
    ball(innerFrame, '#8496a6', side * 0.74, 1.15, 0, 0.25, 0.25, 0.25);
  }
  const feet: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.x = side * 0.34;
    legs.add(leg);
    feet.push(leg);
    ball(leg, accent, 0, 0.68, 0, 0.42, 0.49, 0.45);
    box(leg, color, 0, 0.42, 0.08, 0.43, 0.5, 0.48);
    box(leg, accent, 0, 0.17, 0.2, 0.55, 0.29, 0.82);
    box(leg, color, 0, 0.28, 0.24, 0.38, 0.25, 0.38);
  }
  return { root, core, head, leftArm, rightArm, legs, innerFrame, feet };
}
export function cannonArm(group: THREE.Group, color: string, accent: string, heavy = false) {
  ball(group, color, 0, 0.04, 0, 0.68, 0.53, 0.64);
  box(group, accent, 0, -0.19, 0.13, 0.39, 0.43, 0.41);
  tube(group, color, v(0, -0.22, 0.05), v(0, -0.22, 0.72), heavy ? 0.27 : 0.22);
  tube(group, ink, v(0, -0.22, 0.64), v(0, -0.22, 0.87), heavy ? 0.23 : 0.17);
  if (heavy)
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      tube(
        group,
        '#e86924',
        v(Math.cos(a) * 0.12, -0.22 + Math.sin(a) * 0.12, 0.78),
        v(Math.cos(a) * 0.12, -0.22 + Math.sin(a) * 0.12, 0.92),
        0.066,
      );
    }
  else tube(group, '#92a0b6', v(0, -0.22, 0.855), v(0, -0.22, 0.9), 0.105);
}
