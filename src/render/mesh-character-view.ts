import * as THREE from 'three';

import type { CombatantSnapshot } from '../battle-core';
import type { RuntimeAbility } from '../content/catalog';
import type { CharacterDefinition } from '../content/schemas';
import { loadGLB } from './model-loader';
import { arcbeetle } from './models/arcbeetle';
import { metabee } from './models/metabee';
import type { RobotModel } from './models/primitives';
import { rokusho } from './models/rokusho';
import { warbandit } from './models/warbandit';

const builders = { metabee, rokusho, arcbeetle, warbandit };

export class MeshCharacterView {
  readonly root = new THREE.Group();
  model: RobotModel;
  private disposed = false;
  private visualTime = 0;
  private headBase = new THREE.Vector3();
  private armBases: THREE.Vector3[] = [];
  private armRotations: THREE.Euler[] = [];
  private hipBases: THREE.Vector3[] = [];

  constructor(definition: CharacterDefinition) {
    this.model =
      definition.visual.type === 'procedural'
        ? builders[definition.visual.model](definition.visual.color, definition.visual.accent)
        : metabee();
    this.root.add(this.model.root);
    this.captureRestPose();

    if (definition.visual.type === 'gltf') {
      void loadGLB(definition.visual)
        .then((model) => {
          if (this.disposed) {
            disposeModel(model.root);

            return;
          }

          this.root.remove(this.model.root);
          disposeModel(this.model.root);
          this.model = model;
          this.root.add(model.root);
          this.captureRestPose();
        })
        .catch((error) => console.error('Character model could not load', error));
    }
  }

  private captureRestPose() {
    this.headBase.copy(this.model.head.position);
    this.armBases = [this.model.leftArm, this.model.rightArm].map((g) => g.position.clone());
    this.armRotations = [this.model.leftArm, this.model.rightArm].map((g) => g.rotation.clone());
    this.hipBases = this.model.feet.map((g) => g.position.clone());
  }

  update(
    previous: CombatantSnapshot,
    current: CombatantSnapshot,
    alpha: number,
    delta: number,
    freeze: boolean,
    ability?: RuntimeAbility,
  ) {
    if (!freeze) {
      this.visualTime += delta;
    }

    const time = this.visualTime;
    const model = this.model;
    this.root.position.set(
      THREE.MathUtils.lerp(previous.x, current.x, alpha),
      THREE.MathUtils.lerp(previous.y, current.y, alpha),
      current.id.endsWith('2') ? -0.35 : 0.25,
    );

    const running = Math.abs(current.vx) > 0.8 && current.grounded;
    const speed = current.dashTicks > 0 ? 1.4 : 1;
    const stride = time * (current.dashTicks > 0 ? 23 : 16);
    model.root.rotation.y = THREE.MathUtils.lerp(
      model.root.rotation.y,
      current.facing * 1.02,
      Math.min(1, delta * 22),
    );
    model.root.rotation.z = current.knockedOut
      ? -0.95
      : current.dashTicks > 0
        ? -0.15 * current.facing
        : running
          ? -0.055 * current.facing
          : 0;
    model.root.position.y = current.knockedOut
      ? -0.15
      : running
        ? Math.abs(Math.sin(stride)) * 0.025
        : Math.sin(time * 3) * 0.012;
    model.head.visible = !current.parts.head.destroyed;
    model.leftArm.visible = !current.parts.leftArm.destroyed;
    model.rightArm.visible = !current.parts.rightArm.destroyed;
    model.legs.visible = !current.parts.legs.destroyed;
    model.head.position.copy(this.headBase);
    model.head.position.y += Math.sin(time * 3) * 0.008;

    if (model.rig) {
      model.head.rotation.y = -current.facing * 0.28;
      model.head.rotation.x = current.charging ? 0.07 : 0;
    }

    for (const [i, hip] of model.feet.entries()) {
      hip.position.copy(this.hipBases[i]!);
      hip.rotation.x = running
        ? Math.sin(stride + i * Math.PI) * 0.52 * speed
        : current.grounded
          ? -0.06
          : i === 0
            ? -0.55
            : 0.38;
      hip.rotation.z = (i === 0 ? 1 : -1) * (current.guarding ? 0.14 : 0.065);

      const knee = model.rig?.knees[i];

      if (knee) {
        knee.rotation.x = running
          ? Math.max(0, Math.cos(stride + i * Math.PI)) * 0.75
          : current.grounded
            ? current.guarding
              ? 0.35
              : 0.12
            : i === 0
              ? 0.85
              : 1.05;
      }

      const frameHip = model.rig?.innerLegs[i];
      const frameKnee = model.rig?.innerKnees[i];

      if (frameHip) {
        frameHip.position.copy(hip.position);
        frameHip.quaternion.copy(hip.quaternion);
      }

      if (frameKnee && knee) {
        frameKnee.quaternion.copy(knee.quaternion);
      }
    }

    for (const [i, arm] of [model.leftArm, model.rightArm].entries()) {
      arm.position.copy(this.armBases[i]!);
      arm.rotation.copy(this.armRotations[i]!);

      const side = i === 0 ? -1 : 1;
      arm.rotation.y += current.facing * 0.12;
      arm.rotation.z += side * (running ? 0.05 : 0.07);
      arm.rotation.x += running
        ? Math.sin(stride + i * Math.PI + Math.PI) * 0.12
        : Math.sin(time * 3 + i) * 0.025;

      if (!current.grounded) {
        arm.rotation.x -= 0.12;
        arm.rotation.z += side * 0.12;
      }

      if (current.charging) {
        arm.rotation.x = 0.32;
        arm.rotation.z = side * 0.2;
      }

      if (current.guarding) {
        arm.rotation.x = -0.64;
        arm.rotation.y = -side * 0.35;
        arm.rotation.z = -side * 0.22;
      } else if (current.attack && ability) {
        const attack = current.attack;
        const selected =
          attack.slot === 'special' ||
          (i === 0 ? attack.slot === 'leftArm' : attack.slot === 'rightArm');
        const progress = THREE.MathUtils.clamp(
          (attack.age - ability.original.contactTick) /
            Math.max(1, ability.original.actionTicks - ability.original.contactTick),
          0,
          1,
        );
        const windup = Math.min(1, attack.age / Math.max(1, ability.original.contactTick));

        if (selected && ability.delivery === 'melee') {
          arm.rotation.y =
            current.facing *
            (attack.age < ability.original.contactTick
              ? -0.75 * windup
              : -0.75 + Math.sin((Math.min(1, progress * 2) * Math.PI) / 2) * 1.8);
          arm.rotation.x = -0.13 - Math.sin(progress * Math.PI) * 0.22;
          arm.rotation.z = side * (0.15 + Math.sin(progress * Math.PI) * 0.2);
        } else if (selected) {
          const recoil = Math.sin(Math.min(1, progress * 3) * Math.PI);
          arm.position.z -= recoil * 0.13;
          arm.rotation.x = -recoil * 0.16;
        }

        if (attack.slot === 'head' && model.rig) {
          model.head.rotation.x = -Math.sin(progress * Math.PI) * 0.1;
        }
      }

      const frame = model.rig?.innerArms[i];

      if (frame) {
        frame.position.copy(arm.position);
        frame.quaternion.copy(arm.quaternion);
      }
    }

    model.core.scale.setScalar(current.charging ? 1 + Math.sin(time * 22) * 0.015 : 1);
  }

  dispose() {
    this.disposed = true;
    disposeModel(this.root);
  }
}

export function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometries.add(o.geometry);
    }
  });
  geometries.forEach((g) => g.dispose());
}
