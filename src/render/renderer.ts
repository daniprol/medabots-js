import * as THREE from 'three';

import type { BattleSnapshot, BattleEvent } from '../battle-core';
import type { ContentCatalog } from '../content/catalog';
import { createArena } from './arena-view';
import { CharacterView, disposeModel } from './character-view';
import { slashTexture } from './effect-textures';
import { Effects } from './effects';
import { spritePortrait } from './sprite-assets';

export class BattleRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-15, 15, 10, -10, 0.1, 140);
  private views = new Map<string, CharacterView>();
  private projectiles = new Map<string, THREE.Mesh>();
  private labels = new Map<string, HTMLElement>();
  private shadows = new Map<string, THREE.Mesh>();
  private effects: Effects;
  private arena;
  private observer: ResizeObserver;
  private width = 1;
  private height = 1;
  private time = 0;
  private lookAhead = 0;
  private sharedCenterY = 15;
  private sharedHalfWidth = 27;
  private focusId: string;
  private shared: boolean;
  private slashGeometry = new THREE.PlaneGeometry(3.5, 10);
  private slashMap = slashTexture();
  private shotGeometry = new THREE.SphereGeometry(1, 16, 8);
  private shadowGeometry = new THREE.PlaneGeometry(2.5, 0.7);
  private shadowTexture: THREE.CanvasTexture;

  constructor(
    private container: HTMLElement,
    private content: ContentCatalog,
    snapshot: BattleSnapshot,
    humans: string[],
  ) {
    this.shared = humans.length > 1;
    this.focusId = humans[0] ?? 'A1';
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor('#b9cfbf');
    this.renderer.domElement.setAttribute('aria-label', 'HD-2D Medabots battle arena');
    container.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight('#fff2d9', '#65868c', 2));
    const sunlight = new THREE.DirectionalLight('#ffe7b6', 1.6);
    sunlight.position.set(-12, 28, 15);
    this.scene.add(sunlight);
    const rim = new THREE.DirectionalLight('#b4e5ec', 0.65);
    rim.position.set(8, 14, -8);
    this.scene.add(rim);
    this.arena = createArena(content.arenas[snapshot.arenaId]!);
    this.scene.add(this.arena.root);
    this.effects = new Effects(this.scene, content);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 16, 0, 64, 16, 64);
    gradient.addColorStop(0, '#19362b99');
    gradient.addColorStop(1, '#19362b00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 32);
    this.shadowTexture = new THREE.CanvasTexture(canvas);
    for (const actor of snapshot.combatants) {
      const view = new CharacterView(content.characters[actor.characterId]!);
      this.views.set(actor.id, view);
      this.scene.add(view.root);
      const label = document.createElement('div');
      label.className = `robot-label ${actor.teamId === snapshot.combatants[0]!.teamId ? 'cyan' : 'coral'}`;
      label.dataset.testid = `combatant-label-${actor.id}`;
      label.textContent = `${actor.role === 'leader' ? '◆ ' : ''}${actor.id}${humans.includes(actor.id) ? ' · YOU' : ''}`;
      container.append(label);
      this.labels.set(actor.id, label);
      const shadow = new THREE.Mesh(
        this.shadowGeometry,
        new THREE.MeshBasicMaterial({
          map: this.shadowTexture,
          transparent: true,
          depthWrite: false,
        }),
      );
      this.scene.add(shadow);
      this.shadows.set(actor.id, shadow);
    }
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
  }

  private resize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.renderer.setSize(this.width, this.height);
    const halfWidth = this.shared ? this.sharedHalfWidth : 15;
    const halfHeight = (halfWidth * this.height) / Math.max(1, this.width);
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  render(
    previous: BattleSnapshot,
    current: BattleSnapshot,
    alpha: number,
    dt: number,
    events: BattleEvent[] = [],
  ) {
    dt = THREE.MathUtils.clamp(dt, 0, 0.1);
    this.time += dt;
    this.effects.emit(events);
    this.effects.update(dt);
    const blend = THREE.MathUtils.clamp(alpha, 0, 1);
    this.arena.update(previous, current, blend);
    const focus =
      current.combatants.find((actor) => actor.id === this.focusId) ?? current.combatants[0]!;
    if (this.shared) {
      const living = current.combatants.filter((actor) => !actor.knockedOut);
      if (living.length) {
        const lowest = Math.min(...living.map((actor) => actor.y));
        const highest = Math.max(...living.map((actor) => actor.y + 4.5));
        const aspect = this.width / Math.max(1, this.height);
        const halfHeight = Math.max(27 / aspect, (highest - lowest) / 2 + 5);
        const targetY = Math.max(15, (highest + lowest) / 2);
        this.sharedCenterY = THREE.MathUtils.damp(this.sharedCenterY, targetY, 5, dt);
        // Widen promptly for separated players; close in gently after they regroup.
        const targetWidth = halfHeight * aspect;
        this.sharedHalfWidth = THREE.MathUtils.damp(
          this.sharedHalfWidth,
          targetWidth,
          targetWidth > this.sharedHalfWidth ? 10 : 2,
          dt,
        );
        this.camera.left = -this.sharedHalfWidth;
        this.camera.right = this.sharedHalfWidth;
        this.camera.top = this.sharedHalfWidth / aspect;
        this.camera.bottom = -this.camera.top;
        this.camera.updateProjectionMatrix();
      }
    }
    this.lookAhead = THREE.MathUtils.damp(this.lookAhead, focus.facing * 6, 4, dt);
    const centerX = this.shared ? 0 : THREE.MathUtils.clamp(focus.x + this.lookAhead, -12, 12);
    const centerY = this.shared
      ? this.sharedCenterY
      : THREE.MathUtils.clamp(focus.y, 9.875, 35.875);
    const shake = this.effects.shake;
    this.camera.position.set(
      centerX + Math.sin(this.time * 117) * shake,
      centerY + Math.cos(this.time * 91) * shake,
      50,
    );
    this.camera.lookAt(centerX, centerY, 0);
    this.camera.updateMatrixWorld();
    this.arena.distant.position.set(centerX * 0.22, centerY * 0.06, 0);
    for (const actor of current.combatants) {
      const old = previous.combatants.find((candidate) => candidate.id === actor.id) ?? actor;
      const view = this.views.get(actor.id)!;
      if (this.effects.freezeSeconds <= 0) {
        view.update(old, actor, blend, dt, false);
      }
      const position = view.root.position
        .clone()
        .add(new THREE.Vector3(0, 4.55, 0))
        .project(this.camera);
      const label = this.labels.get(actor.id)!;
      const x = THREE.MathUtils.clamp((position.x * 0.5 + 0.5) * this.width, 40, this.width - 40);
      const y = THREE.MathUtils.clamp(
        (-position.y * 0.5 + 0.5) * this.height,
        92,
        this.height - 115,
      );
      label.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)`;
      label.style.opacity = actor.knockedOut ? '0' : Math.abs(position.x) > 1 ? '.45' : '1';
      const shadow = this.shadows.get(actor.id)!;
      shadow.position.set(
        view.root.position.x,
        actor.grounded ? actor.y + 0.03 : Math.max(0, actor.y - 2),
        0.22,
      );
      shadow.visible = !actor.knockedOut;
      shadow.scale.setScalar(actor.grounded ? 1 : 0.6);
    }
    const active = new Set(current.projectiles.map((projectile) => projectile.id));
    for (const [id, mesh] of this.projectiles) {
      if (!active.has(id)) {
        this.scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
        this.projectiles.delete(id);
      }
    }
    for (const projectile of current.projectiles) {
      const ability = this.content.abilities[projectile.abilityId]!;
      let mesh = this.projectiles.get(projectile.id);
      if (!mesh) {
        const slash = ability.original.family === 'vertical-line';
        mesh = new THREE.Mesh(
          slash ? this.slashGeometry : this.shotGeometry,
          new THREE.MeshBasicMaterial({
            color: slash ? '#ffffff' : ability.color,
            map: slash ? this.slashMap : null,
            transparent: true,
            depthWrite: false,
            toneMapped: false,
            side: THREE.DoubleSide,
          }),
        );
        if (!slash) {
          mesh.scale.set(
            ability.original.family === 'barrage'
              ? 0.5
              : ability.original.family === 'beam'
                ? 1.7
                : 0.65,
            ability.original.family === 'barrage' ? 0.4 : 0.15,
            0.1,
          );
        }
        this.scene.add(mesh);
        this.projectiles.set(projectile.id, mesh);
      }
      if (ability.original.family === 'vertical-line') {
        mesh.scale.x = projectile.facing;
      }
      (mesh.material as THREE.MeshBasicMaterial).opacity = projectile.hitTicks
        ? projectile.hitTicks / 32
        : 1;
      const old =
        previous.projectiles.find((candidate) => candidate.id === projectile.id) ?? projectile;
      mesh.position.set(
        THREE.MathUtils.lerp(old.x, projectile.x, blend),
        THREE.MathUtils.lerp(old.y, projectile.y, blend),
        1,
      );
    }
    this.renderer.render(this.scene, this.camera);
  }

  portrait(characterId: string) {
    return spritePortrait(this.content.characters[characterId]!);
  }

  dispose() {
    this.observer.disconnect();
    this.effects.dispose();
    for (const view of this.views.values()) {
      view.dispose();
    }
    for (const label of this.labels.values()) {
      label.remove();
    }
    for (const mesh of this.projectiles.values()) {
      (mesh.material as THREE.Material).dispose();
    }
    for (const mesh of this.shadows.values()) {
      (mesh.material as THREE.Material).dispose();
    }
    disposeModel(this.arena.root);
    this.arena.dispose();
    this.shotGeometry.dispose();
    this.slashGeometry.dispose();
    this.slashMap.dispose();
    this.shadowGeometry.dispose();
    this.shadowTexture.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
