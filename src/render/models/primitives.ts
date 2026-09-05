import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export const ink = '#152237';
const gradient = new THREE.DataTexture(new Uint8Array([55, 120, 200, 255]), 4, 1, THREE.RedFormat);
gradient.colorSpace = THREE.NoColorSpace;
gradient.generateMipmaps = false;
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
    shell.scale.setScalar(1.035);
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
  rig?: {
    knees: THREE.Group[];
    innerLegs: THREE.Group[];
    innerKnees: THREE.Group[];
    innerArms: THREE.Group[];
  };
};
