import * as THREE from 'three';
import type { RuntimeAbility } from '../content/build-content-catalog';
import type { CharacterDefinition } from '../content/schemas';
import type { CombatantSnapshot } from '../battle-core';
import { metabee } from './models/metabee';
import { rokusho } from './models/rokusho';
import { arcbeetle } from './models/arcbeetle';
import { warbandit } from './models/warbandit';
import { loadGLB } from './model-loader';
import type { RobotModel } from './models/primitives';
const builders = { metabee, rokusho, arcbeetle, warbandit };
export class CharacterView {
  readonly root = new THREE.Group();
  model: RobotModel;
  private disposed = false;
  private baseHeadY: number;
  private baseLeft = new THREE.Euler();
  private baseRight = new THREE.Euler();
  private visualTime = 0;
  constructor(def: CharacterDefinition) {
    this.model =
      def.visual.type === 'procedural'
        ? builders[def.visual.model](def.visual.color, def.visual.accent)
        : metabee();
    this.root.add(this.model.root);
    this.baseHeadY = this.model.head.position.y;
    this.baseLeft.copy(this.model.leftArm.rotation);
    this.baseRight.copy(this.model.rightArm.rotation);
    if (def.visual.type === 'gltf')
      void loadGLB(def.visual)
        .then((model) => {
          if (this.disposed) {
            disposeModel(model.root);
            return;
          }
          this.root.remove(this.model.root);
          disposeModel(this.model.root);
          this.model = model;
          this.root.add(model.root);
          this.baseHeadY = model.head.position.y;
          this.baseLeft.copy(model.leftArm.rotation);
          this.baseRight.copy(model.rightArm.rotation);
        })
        .catch((error) => {
          console.error('Character model could not load', error);
        });
  }
  update(
    previous: CombatantSnapshot,
    current: CombatantSnapshot,
    alpha: number,
    delta: number,
    freeze: boolean,
    ability?: RuntimeAbility,
  ) {
    if (!freeze) this.visualTime += delta;
    const t = this.visualTime;
    const m = this.model;
    this.root.position.set(
      THREE.MathUtils.lerp(previous.x, current.x, alpha),
      THREE.MathUtils.lerp(previous.y, current.y, alpha),
      current.id.endsWith('2') ? -0.35 : 0.25,
    );
    m.root.rotation.y = THREE.MathUtils.lerp(
      m.root.rotation.y,
      current.facing * 0.92,
      Math.min(1, delta * 22),
    );
    m.root.rotation.z = current.knockedOut
      ? -0.9
      : current.dashTicks > 0
        ? -0.15 * current.facing
        : Math.abs(current.vx) > 1
          ? -0.055 * current.facing
          : 0;
    m.root.position.y = current.knockedOut ? -0.1 : Math.sin(t * 3) * 0.025;
    m.head.visible = !current.parts.head.destroyed;
    m.leftArm.visible = !current.parts.leftArm.destroyed;
    m.rightArm.visible = !current.parts.rightArm.destroyed;
    m.legs.visible = !current.parts.legs.destroyed;
    m.head.position.y = this.baseHeadY + Math.sin(t * 4) * 0.025;
    const run = Math.abs(current.vx) > 0.8 && current.grounded;
    for (const [i, foot] of m.feet.entries()) {
      foot.rotation.x = run
        ? Math.sin(t * 17 + i * Math.PI) * 0.42
        : current.grounded
          ? 0
          : i === 0
            ? -0.35
            : 0.25;
      foot.position.y = run ? Math.max(0, Math.sin(t * 17 + i * Math.PI)) * 0.08 : 0;
    }
    m.leftArm.rotation.copy(this.baseLeft);
    m.rightArm.rotation.copy(this.baseRight);
    if (current.guarding) {
      m.leftArm.rotation.x = -0.75;
      m.rightArm.rotation.x = -0.75;
      m.leftArm.rotation.z = -0.35;
      m.rightArm.rotation.z = 0.35;
    } else if (current.attack) {
      const swing = Math.sin(Math.min(current.attack.age / 16, 1) * Math.PI);
      const arm = current.attack.slot === 'leftArm' ? m.leftArm : m.rightArm;
      arm.rotation.x = -swing * 0.4;
      if (ability?.delivery === 'melee') {
        arm.rotation.y = Math.sin(current.attack.age / 8) * 0.8;
        arm.rotation.z = Math.sin(current.attack.age / 8) * 0.3;
      } else if (current.attack.slot === 'leftArm') arm.rotation.x = 0.85;
      arm.position.z = -swing * 0.1;
    } else {
      m.leftArm.rotation.x = Math.sin(t * 3) * 0.04;
      m.rightArm.rotation.x = -Math.sin(t * 3) * 0.04;
    }
    m.core.scale.setScalar(current.charging ? 1 + Math.sin(t * 30) * 0.02 : 1);
  }
  dispose() {
    this.disposed = true;
    disposeModel(this.root);
  }
}
export function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) geometries.add(o.geometry);
  });
  geometries.forEach((g) => g.dispose());
}
