import * as THREE from 'three';

import type { BattleEvent } from '../battle-core';
import type { ContentCatalog } from '../content/catalog';
import { material } from './models/primitives';

type Particle = {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  kind: 'spark' | 'dust' | 'debris' | 'slash';
};

export class Effects {
  private particles: Particle[] = [];
  private sphere = new THREE.IcosahedronGeometry(1, 0);
  private cube = new THREE.BoxGeometry(1, 1, 1);
  private ring = new THREE.TorusGeometry(1, 0.06, 4, 20, Math.PI * 1.5);
  shake = 0;
  freezeSeconds = 0;
  finalSlowSeconds = 0;

  constructor(
    private scene: THREE.Scene,
    private content: ContentCatalog,
  ) {}

  emit(events: BattleEvent[]) {
    for (const event of events) {
      const color = event.abilityId ? this.content.abilities[event.abilityId]!.color : '#ffe799';

      if (event.type === 'hit' || event.type === 'partDestroyed') {
        this.shake = event.strong ? 0.18 : 0.065;

        if (event.strong) {
          this.freezeSeconds = 0.065;
        }

        for (let i = 0; i < (event.type === 'partDestroyed' ? 15 : 9); i++) {
          this.add(
            event.x,
            event.y,
            i === 0 ? '#ffffff' : color,
            event.type === 'partDestroyed' ? 'debris' : 'spark',
            i === 0 ? 0.4 : 0.1,
          );
        }
      }

      if (event.type === 'landed' || event.type === 'dashed') {
        for (let i = 0; i < 6; i++) {
          this.add(event.x + (Math.random() - 0.5), event.y + 0.12, '#f3ead2', 'dust', 0.22);
        }
      }

      if (event.type === 'projectileSpawned') {
        for (let i = 0; i < 5; i++) {
          this.add(event.x, event.y, color, 'spark', i === 0 ? 0.42 : 0.13);
        }
      }

      if (
        event.type === 'attackStarted' &&
        event.abilityId &&
        this.content.abilities[event.abilityId]!.delivery === 'melee'
      ) {
        this.add(event.x + (event.facing ?? 1) * 1.3, event.y, color, 'slash', 1.2);
      }

      if (event.type === 'specialActivated') {
        for (let i = 0; i < 20; i++) {
          this.add(event.x, event.y, color, 'spark', 0.2);
        }

        this.add(event.x + (event.facing ?? 1) * 1.4, event.y, color, 'slash', 2.3);
      }

      if (event.type === 'combatantKnockedOut') {
        for (let i = 0; i < 12; i++) {
          this.add(event.x, event.y + 1, '#b2b9c9', 'dust', 0.38);
        }
      }

      if (event.type === 'roundEnded') {
        this.finalSlowSeconds = 0.7;
      }
    }
  }

  private add(x: number, y: number, color: string, kind: Particle['kind'], size: number) {
    if (this.particles.length >= 160) {
      const old = this.particles.shift()!;
      this.scene.remove(old.mesh);
      (old.mesh.material as THREE.Material).dispose();
    }

    const mat =
      kind === 'debris'
        ? material(color).clone()
        : new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(
      kind === 'slash' ? this.ring : kind === 'debris' ? this.cube : this.sphere,
      mat,
    );
    mesh.position.set(x, y, 1.4);
    mesh.scale.setScalar(size);

    if (kind === 'slash') {
      mesh.rotation.z = Math.random() * 2;
      mesh.scale.y = 0.62 * size;
    }

    this.scene.add(mesh);

    const life = kind === 'slash' ? 0.23 : kind === 'dust' ? 0.55 : 0.25 + Math.random() * 0.3;
    this.particles.push({
      mesh,
      vx: (Math.random() - 0.5) * 9,
      vy: 2 + Math.random() * 6,
      vz: (Math.random() - 0.5) * 2,
      life,
      maxLife: life,
      kind,
    });
  }

  update(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 0.5);
    this.freezeSeconds = Math.max(0, this.freezeSeconds - dt);
    this.finalSlowSeconds = Math.max(0, this.finalSlowSeconds - dt);
    this.particles = this.particles.filter((p) => {
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();

        return false;
      }

      if (p.kind !== 'slash') {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= dt * (p.kind === 'dust' ? 2 : 20);

        if (p.kind === 'debris') {
          p.mesh.rotation.x += dt * 8;
        }
      }

      if (p.kind === 'dust') {
        p.mesh.scale.multiplyScalar(1 + dt * 1.5);
      }

      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife;

      return true;
    });
  }

  dispose() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }

    this.particles = [];
    this.sphere.dispose();
    this.cube.dispose();
    this.ring.dispose();
  }
}
