import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { CharacterDefinition } from '../content/schemas';
import type { RobotModel } from './models/primitives';

export async function loadGLB(
  visual: Extract<CharacterDefinition['visual'], { type: 'gltf' }>,
): Promise<RobotModel> {
  const gltf = await new GLTFLoader().loadAsync(visual.url);
  const root = new THREE.Group();
  root.name = 'Robot';
  root.add(gltf.scene);

  const node = (name: string) => {
    const obj = gltf.scene.getObjectByName(name);

    if (!obj) {
      throw new Error(`${visual.url}: missing configured node "${name}"`);
    }

    return obj;
  };
  const groups = {} as Pick<RobotModel, 'head' | 'leftArm' | 'rightArm' | 'legs' | 'innerFrame'>;

  for (const key of ['head', 'leftArm', 'rightArm', 'legs', 'innerFrame'] as const) {
    const original = node(visual.nodes[key]);
    const parent = original.parent!;
    const group = new THREE.Group();
    group.position.copy(original.position);
    group.quaternion.copy(original.quaternion);
    group.scale.copy(original.scale);
    original.position.set(0, 0, 0);
    original.quaternion.identity();
    original.scale.setScalar(1);
    parent.add(group);
    group.add(original);
    groups[key] = group;
  }

  gltf.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return { root, core: new THREE.Group(), ...groups, feet: [] };
}
