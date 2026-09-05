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
  let toonMaterial = materials.get(color);

  if (!toonMaterial) {
    toonMaterial = new THREE.MeshToonMaterial({ color, gradientMap: gradient });
    materials.set(color, toonMaterial);
  }

  return toonMaterial;
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
  const surface = new THREE.Mesh(geometry, material(color));
  surface.position.set(x, y, z);
  surface.castShadow = true;
  surface.receiveShadow = true;
  parent.add(surface);

  if (outlined) {
    const shell = new THREE.Mesh(geometry, outline);
    shell.scale.setScalar(1.035);
    surface.add(shell);
  }

  return surface;
}

export const box = (
  parent: THREE.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
) =>
  mesh(
    parent,
    new RoundedBoxGeometry(width, height, depth, 1, Math.min(width, height, depth) * 0.13),
    color,
    x,
    y,
    z,
  );

export function ball(
  parent: THREE.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
) {
  const surface = mesh(parent, new THREE.SphereGeometry(0.5, 12, 8), color, x, y, z);
  surface.scale.set(width, height, depth);

  return surface;
}

export function tube(
  parent: THREE.Object3D,
  color: string,
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  tipRadius = radius,
) {
  const delta = to.clone().sub(from);
  const surface = mesh(
    parent,
    new THREE.CylinderGeometry(tipRadius, radius, delta.length(), 10),
    color,
  );
  surface.position.copy(from).add(to).multiplyScalar(0.5);
  surface.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());

  return surface;
}

export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function plate(
  parent: THREE.Object3D,
  color: string,
  points: number[][],
  depth: number,
  z: number,
) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? shape.lineTo(x!, y!) : shape.moveTo(x!, y!)));
  shape.closePath();

  const surface = mesh(
    parent,
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
    color,
    0,
    0,
    z,
  );

  return surface;
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
