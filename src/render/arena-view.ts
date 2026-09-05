import * as THREE from 'three';

import type { ArenaDefinition } from '../content/schemas';
import { batchStatic } from './batch-static';
import { box, mesh, ball, tube, v, material } from './models/primitives';

export function createArena(definition: ArenaDefinition) {
  const root = new THREE.Group();
  const distant = new THREE.Group();
  root.add(distant);

  // Large, soft layers stay low-contrast so the four armor silhouettes read clearly.
  for (let i = 0; i < 10; i++) {
    const x = -31 + i * 7;
    const peak = mesh(
      distant,
      new THREE.ConeGeometry(7 + (i % 3), 9 + (i % 4) * 2, 4),
      '#72a6c0',
      x,
      1,
      -17,
      false,
    );
    peak.rotation.y = 0.5;
  }

  for (let i = 0; i < 15; i++) {
    const x = -27 + i * 4.2;
    const height = 5 + ((i * 7) % 9);
    box(
      distant,
      i % 2 ? '#91b7c9' : '#7ba4bc',
      x,
      height / 2 - 1,
      -10 - (i % 3) * 2,
      2.3,
      height,
      2.5,
    );
    box(distant, '#b1cbd5', x, height - 1, -10 - (i % 3) * 2, 2.5, 0.3, 2.7);

    for (let j = 0; j < 4; j++) {
      box(distant, '#b1d6e2', x - 0.57 + j * 0.38, height - 2, -8.7 - (i % 3) * 2, 0.16, 0.8, 0.04);
    }

    tube(distant, '#729aac', v(x + 0.8, height - 1, -11), v(x + 0.8, height + 2, -11), 0.12);
  }

  for (let i = 0; i < 8; i++) {
    const x = -25 + i * 7;

    for (let j = 0; j < 3; j++) {
      ball(distant, '#dff5ff', x + j, 11 + (i % 3), -19, 3, 1.3 + j * 0.4, 1.5);
    }
  }

  for (const side of [-1, 1]) {
    const x = side * 17;
    box(root, '#405775', x, 5, -1, 1.6, 14, 2.3);

    for (let y = 0; y < 11; y += 2) {
      box(root, '#6a8294', x, y, -0.1, 1.85, 0.25, 2.5);
      box(root, '#e9b849', x - side * 0.5, y + 0.7, 1.2, 0.22, 1.1, 0.06);
    }

    tube(root, '#2f4560', v(x, 1, -1), v(x - side * 5, 4, -1), 0.13);
    box(root, '#506580', x - side * 1.8, 10, -1, 5.5, 0.75, 2.3);
    box(root, '#f2c044', x - side * 1.8, 10.1, 0.2, 5.5, 0.13, 0.1);
  }

  for (const p of definition.platforms) {
    const group = new THREE.Group();
    group.position.set(p.x, p.y, 0);
    root.add(group);
    box(group, '#43506a', 0, -0.44, 0, p.width, 0.78, 3.5);
    box(group, '#f0e4b8', 0, -0.05, 0.03, p.width, 0.13, 3.6);
    box(group, '#697a8d', 0, -0.46, 1.79, p.width - 0.14, 0.54, 0.12);
    box(group, '#243649', 0, -0.79, 0, p.width - 0.6, 0.13, 3.1);

    for (let x = -p.width / 2 + 0.6; x < p.width / 2; x += 2.4) {
      box(group, '#35455c', x, -0.46, 1.89, 0.07, 0.48, 0.03);
      ball(group, '#a1b4be', x + 0.16, -0.26, 1.9, 0.08, 0.08, 0.035);
    }

    for (const side of [-1, 1]) {
      const x = side * (p.width / 2 - 0.65);
      box(group, '#202c41', x, -0.43, 1.9, 1.05, 0.52, 0.04);

      const stripe = box(group, '#f6c64f', x, -0.43, 1.94, 0.32, 0.62, 0.02);
      stripe.rotation.z = -0.6;
    }

    if (p.y > 0) {
      tube(group, '#30465d', v(-p.width / 2 + 0.2, -0.8, -0.5), v(0, -1.5, -0.5), 0.09);
      tube(group, '#30465d', v(p.width / 2 - 0.2, -0.8, -0.5), v(0, -1.5, -0.5), 0.09);
      box(group, '#72e6fa', 0, -0.56, 1.9, p.width * 0.35, 0.035, 0.03);
    }
  }

  // Foreground footings and service panels.
  for (let x = -15; x < 16; x += 4) {
    box(root, '#253b53', x, -1.8, 0.5, 3.8, 1.7, 2.9);
    box(root, '#536c7c', x, -1.6, 2.01, 2.8, 1, 0.12);
    box(root, '#101f34', x, -1.6, 2.09, 2.2, 0.65, 0.1);
  }

  for (const side of [-1, 1]) {
    box(root, '#b98d46', side * 14, -0.1, 3, 1.5, 1.4, 1);
    box(root, '#4b5760', side * 14, -0.1, 3.54, 1.14, 1.07, 0.06);
  }

  distant.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      // Removing an outline mutates children; iterate a copy to avoid skipping entries.
      // oxlint-disable-next-line unicorn/no-useless-spread
      for (const child of [...o.children]) {
        if (child instanceof THREE.Mesh) {
          o.remove(child);
        }
      }

      o.castShadow = false;
    }
  });

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 80),
    new THREE.MeshBasicMaterial({ color: '#8acdf2' }),
  );
  sky.position.set(0, 15, -30);
  root.add(sky);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(definition.width, 5), material('#d4d7cb'));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.005, 0);
  floor.receiveShadow = true;
  root.add(floor);
  root.remove(distant);
  batchStatic(root);
  batchStatic(distant);
  root.add(distant);

  return { root, distant };
}
