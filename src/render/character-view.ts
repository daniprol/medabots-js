import * as THREE from 'three';

import type { CombatantSnapshot } from '../battle-core';
import type { RuntimeAbility } from '../content/catalog';
import type { CharacterDefinition } from '../content/schemas';
import { MeshCharacterView } from './mesh-character-view';
import { spriteTexture } from './sprite-assets';

type SpritePiece = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  texture: THREE.Texture;
  part: 'head' | 'leftArm' | 'rightArm' | 'legs' | 'core';
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Flat, authored cel artwork. No mesh silhouette or lighting can deform a character. */
class SpriteCharacterView {
  readonly root = new THREE.Group();
  private artwork = new THREE.Group();
  private pieces: SpritePiece[] = [];
  private frame = -1;
  private time = 0;

  constructor(private definition: CharacterDefinition) {
    this.root.add(this.artwork);
    const regions: [SpritePiece['part'], number, number, number, number][] = [
      ['head', 0, 0, 1, 0.43],
      ['leftArm', 0, 0.43, 0.29, 0.25],
      ['core', 0.29, 0.43, 0.38, 0.25],
      ['rightArm', 0.67, 0.43, 0.33, 0.25],
      ['legs', 0, 0.68, 1, 0.32],
    ];
    for (const [part, x, y, width, height] of regions) {
      const texture = spriteTexture(definition).clone();
      texture.needsUpdate = true;
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.04,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.5 * width, 4.5 * height), material);
      mesh.position.set((x + width / 2 - 0.5) * 4.5, (1 - y - height / 2) * 4.5, 0);
      this.artwork.add(mesh);
      this.pieces.push({ mesh, texture, part, x, y, width, height });
    }
    this.setFrame(0);
  }

  private setFrame(frame: number) {
    if (this.frame === frame || this.definition.visual.type !== 'sprite') {
      return;
    }
    this.frame = frame;
    const visual = this.definition.visual;
    const bounds = visual.frames[frame]!;
    const image = spriteTexture(this.definition).image as HTMLImageElement;
    this.artwork.scale.y = bounds.height / visual.frameSize;
    this.artwork.scale.x = bounds.width / visual.frameSize;
    for (const piece of this.pieces) {
      piece.texture.repeat.set(
        (piece.width * bounds.width) / image.width,
        (piece.height * bounds.height) / image.height,
      );
      piece.texture.offset.set(
        (bounds.x + piece.x * bounds.width) / image.width,
        1 - (bounds.y + (piece.y + piece.height) * bounds.height) / image.height,
      );
    }
  }

  update(
    previous: CombatantSnapshot,
    current: CombatantSnapshot,
    alpha: number,
    delta: number,
    freeze: boolean,
    _ability?: RuntimeAbility,
  ) {
    if (!freeze) {
      this.time += delta;
    }
    const running = current.grounded && Math.abs(current.vx) > 0.5;
    this.setFrame(current.attack ? 3 : !current.grounded ? 2 : running ? 1 : 0);
    this.root.position.set(
      THREE.MathUtils.lerp(previous.x, current.x, alpha),
      THREE.MathUtils.lerp(previous.y, current.y, alpha) - 0.04,
      current.role === 'leader' ? 0.65 : 0.4,
    );
    this.artwork.scale.x = Math.abs(this.artwork.scale.x) * current.facing;
    this.artwork.position.y = running
      ? Math.abs(Math.sin(this.time * 22)) * 0.08
      : Math.sin(this.time * 3) * 0.018;
    this.artwork.rotation.z = current.knockedOut
      ? current.facing * -1.25
      : current.guarding
        ? current.facing * 0.05
        : 0;
    for (const piece of this.pieces) {
      const broken = piece.part !== 'core' && current.parts[piece.part].destroyed;
      piece.mesh.material.color.set(
        broken
          ? '#34465b'
          : current.invulnerabilityTicks > 0 && current.invulnerabilityTicks % 2
            ? '#ffe9bd'
            : '#ffffff',
      );
      piece.mesh.material.opacity = current.knockedOut ? 0.55 : 1;
      piece.mesh.visible = !(piece.part === 'head' && current.parts.head.destroyed);
    }
  }

  dispose() {
    for (const piece of this.pieces) {
      piece.texture.dispose();
      piece.mesh.geometry.dispose();
      piece.mesh.material.dispose();
    }
  }
}

export function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

/** Choose presentation from content; the simulation only sees character and part data. */
export class CharacterView {
  private view: SpriteCharacterView | MeshCharacterView;
  readonly root: THREE.Group;

  constructor(definition: CharacterDefinition) {
    this.view =
      definition.visual.type === 'sprite'
        ? new SpriteCharacterView(definition)
        : new MeshCharacterView(definition);
    this.root = this.view.root;
  }

  update(
    previous: CombatantSnapshot,
    current: CombatantSnapshot,
    alpha: number,
    delta: number,
    freeze: boolean,
    ability?: RuntimeAbility,
  ) {
    this.view.update(previous, current, alpha, delta, freeze, ability);
  }

  dispose() {
    this.view.dispose();
  }
}
