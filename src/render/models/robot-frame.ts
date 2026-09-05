import * as THREE from 'three';

import { batchStatic } from '../batch-static';
import { armor, joint, steel } from './armor';
import { ball, tube, v, type RobotModel } from './primitives';

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
  const core = group('Core');
  const head = group('Head');
  const leftArm = group('LeftArm');
  const rightArm = group('RightArm');
  const legs = group('Legs');
  const innerFrame = group('InnerFrame');
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

  const feet: THREE.Group[] = [];
  const knees: THREE.Group[] = [];
  const innerLegs: THREE.Group[] = [];
  const innerKnees: THREE.Group[] = [];
  const innerArms: THREE.Group[] = [];

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

/** Batch only rigid leaves; the visible armor groups and joint pivots remain independently movable. */
export function finishModel(model: RobotModel) {
  for (const g of [model.head, model.core, model.leftArm, model.rightArm]) {
    batchStatic(g);
  }

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

  for (const arm of model.rig!.innerArms) {
    batchStatic(arm);
  }

  return model;
}
