import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
/** Bake a static scene layer into one draw call per material. */
export function batchStatic(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const originalGeometries = new Set<THREE.BufferGeometry>();
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const geometry = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    const entries = batches.get(o.material) ?? [];
    entries.push(geometry);
    batches.set(o.material, entries);
    originalGeometries.add(o.geometry);
  });
  group.clear();
  for (const [mat, geometries] of batches) {
    const geometry = mergeGeometries(geometries);
    if (geometry) group.add(new THREE.Mesh(geometry, mat));
    geometries.forEach((g) => g.dispose());
  }
  originalGeometries.forEach((g) => g.dispose());
}
