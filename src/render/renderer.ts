import * as THREE from 'three';
import type { BattleSnapshot, BattleEvent } from '../battle-core';
import type { ContentCatalog } from '../content/build-content-catalog';
import { createArena } from './arena-view';
import { CharacterView, disposeModel } from './character-view';
import { Effects } from './effects';
import { material } from './models/primitives';
const portraitCache = new WeakMap<object, string>();
export class BattleRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-18, 18, 10, -10, 0.1, 120);
  private views = new Map<string, CharacterView>();
  private projectiles = new Map<string, THREE.Mesh>();
  private effects: Effects;
  private arena;
  private resizeObserver: ResizeObserver;
  private width = 1;
  private height = 1;
  private worldWidth: number;
  private time = 0;
  private shotGeometry = new THREE.SphereGeometry(1, 10, 6);
  private labels = new Map<string, HTMLElement>();
  private rings = new Map<string, THREE.Mesh>();
  private shadows = new Map<string, THREE.Mesh>();
  private shadowGeometry = new THREE.CircleGeometry(0.73, 24);
  private shadowMaterial = new THREE.MeshBasicMaterial({
    color: '#172a40',
    transparent: true,
    opacity: 0.23,
    depthWrite: false,
  });
  private auraGeometry = new THREE.TorusGeometry(0.86, 0.035, 5, 36);
  constructor(
    private container: HTMLElement,
    private content: ContentCatalog,
    snapshot: BattleSnapshot,
    private humans: string[],
  ) {
    this.worldWidth = content.arenas[snapshot.arenaId]!.width + 1;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor('#8acdf2');
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'Three-dimensional Robattle arena');
    this.container.append(this.renderer.domElement);
    this.camera.position.set(0, 10.1, 42);
    this.camera.lookAt(0, 6.1, 0);
    this.scene.add(new THREE.HemisphereLight('#eefaff', '#697998', 1.8));
    const sun = new THREE.DirectionalLight('#fff5d5', 2.2);
    sun.position.set(-10, 20, 16);
    sun.castShadow = false;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -10;
    sun.shadow.normalBias = 0.035;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight('#7bddff', 1.4);
    rim.position.set(5, 8, -7);
    this.scene.add(rim);
    this.arena = createArena(content.arenas[snapshot.arenaId]!);
    this.scene.add(this.arena.root);
    this.effects = new Effects(this.scene, content);
    for (const c of snapshot.combatants) {
      const view = new CharacterView(content.characters[c.characterId]!);
      this.views.set(c.id, view);
      this.scene.add(view.root);
      const label = document.createElement('div');
      label.className = `robot-label ${c.teamId === snapshot.combatants[0]!.teamId ? 'cyan' : 'coral'}`;
      label.textContent = `${c.role === 'leader' ? '◆ ' : ''}${c.id}${humans.includes(c.id) ? ' · YOU' : ''}`;
      this.container.append(label);
      this.labels.set(c.id, label);
      const ring = new THREE.Mesh(
        this.auraGeometry,
        new THREE.MeshBasicMaterial({ color: '#6feaff', transparent: true, opacity: 0.7 }),
      );
      ring.visible = false;
      this.scene.add(ring);
      this.rings.set(c.id, ring);
      const shadow = new THREE.Mesh(this.shadowGeometry, this.shadowMaterial);
      shadow.rotation.x = -Math.PI / 2;
      shadow.scale.set(1.15, 0.7, 1);
      this.scene.add(shadow);
      this.shadows.set(c.id, shadow);
    }
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }
  private resize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.renderer.setSize(this.width, this.height);
    const aspect = this.width / this.height;
    const worldWidth = Math.max(this.worldWidth, 17 * aspect);
    const worldHeight = worldWidth / aspect;
    this.camera.left = -worldWidth / 2;
    this.camera.right = worldWidth / 2;
    this.camera.top = worldHeight / 2;
    this.camera.bottom = -worldHeight / 2;
    this.camera.updateProjectionMatrix();
  }
  render(
    previous: BattleSnapshot,
    current: BattleSnapshot,
    alpha: number,
    dt: number,
    events: BattleEvent[] = [],
  ) {
    this.time += dt;
    this.effects.emit(events);
    const freeze = this.effects.freezeSeconds > 0;
    this.effects.update(dt);
    const blend = THREE.MathUtils.clamp(alpha, 0, 1);
    const animationDt = this.effects.finalSlowSeconds > 0 ? dt * 0.22 : dt;
    const placedLabels: { x: number; y: number }[] = [];
    for (const c of current.combatants) {
      const old = previous.combatants.find((p) => p.id === c.id) ?? c;
      const view = this.views.get(c.id)!;
      if (!freeze)
        view.update(
          old,
          c,
          blend,
          animationDt,
          false,
          c.attack ? this.content.abilities[c.attack.abilityId] : undefined,
        );
      const shadow = this.shadows.get(c.id)!;
      shadow.position.set(
        view.root.position.x,
        (c.grounded ? c.y : 0) + 0.025,
        view.root.position.z,
      );
      shadow.visible = !c.knockedOut;
      const label = this.labels.get(c.id)!;
      const p = view.root.position
        .clone()
        .add(new THREE.Vector3(0, 3.5, 0))
        .project(this.camera);
      const labelX = (p.x * 0.5 + 0.5) * this.width;
      let labelY = (-p.y * 0.5 + 0.5) * this.height;
      while (
        placedLabels.some(
          (other) => Math.abs(other.x - labelX) < 90 && Math.abs(other.y - labelY) < 23,
        )
      )
        labelY -= 24;
      placedLabels.push({ x: labelX, y: labelY });
      label.style.transform = `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`;
      label.style.opacity = c.knockedOut ? '.3' : '1';
      const ring = this.rings.get(c.id)!;
      ring.visible = c.guarding || c.charging;
      ring.position.copy(view.root.position).add(new THREE.Vector3(0, 1.25, 0.8));
      ring.scale.setScalar(c.guarding ? 1.55 : 1.25 + Math.sin(this.time * 9) * 0.1);
      ring.rotation.z = this.time * 2;
      (ring.material as THREE.MeshBasicMaterial).color.set(c.guarding ? '#66d8ff' : '#ffce54');
    }
    const active = new Set(current.projectiles.map((p) => p.id));
    for (const [id, mesh] of this.projectiles)
      if (!active.has(id)) {
        this.scene.remove(mesh);
        this.projectiles.delete(id);
      }
    for (const p of current.projectiles) {
      const a = this.content.abilities[p.abilityId]!;
      let mesh = this.projectiles.get(p.id);
      if (!mesh) {
        mesh = new THREE.Mesh(this.shotGeometry, material(a.color));
        mesh.scale.set(a.hitbox.width * 0.8, a.hitbox.height * 0.45, 0.13);
        this.scene.add(mesh);
        this.projectiles.set(p.id, mesh);
      }
      const old = previous.projectiles.find((o) => o.id === p.id) ?? p;
      mesh.position.set(
        THREE.MathUtils.lerp(old.x, p.x, blend),
        THREE.MathUtils.lerp(old.y, p.y, blend),
        1,
      );
    }
    const focus = current.combatants.reduce((n, c) => n + c.x, 0) / 4;
    this.arena.distant.position.x = -focus * 0.035;
    const shake = this.effects.shake;
    this.camera.position.x = Math.sin(this.time * 117) * shake;
    this.camera.position.y = 10.1 + Math.cos(this.time * 91) * shake;
    this.renderer.render(this.scene, this.camera);
  }
  portrait(characterId: string): string {
    const cached = portraitCache.get(this.content.characters[characterId]!);
    if (cached) return cached;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#142b42');
    const light = new THREE.DirectionalLight('#fff3d5', 3);
    light.position.set(-3, 5, 8);
    scene.add(light, new THREE.HemisphereLight('#e3f6ff', '#63829b', 3));
    const view = new CharacterView(this.content.characters[characterId]!);
    view.model.root.rotation.y = -0.32;
    scene.add(view.root);
    const camera = new THREE.OrthographicCamera(-0.95, 0.95, 1.12, -1.12, 0.1, 20);
    camera.position.set(0, 2.15, 8);
    camera.lookAt(0, 1.8, 0);
    const size = this.renderer.getSize(new THREE.Vector2());
    this.renderer.setSize(160, 190, false);
    this.renderer.render(scene, camera);
    const image = this.renderer.domElement.toDataURL();
    this.renderer.setSize(size.x, size.y, false);
    view.dispose();
    portraitCache.set(this.content.characters[characterId]!, image);
    return image;
  }
  dispose() {
    this.resizeObserver.disconnect();
    this.effects.dispose();
    for (const view of this.views.values()) view.dispose();
    for (const label of this.labels.values()) label.remove();
    for (const ring of this.rings.values()) (ring.material as THREE.Material).dispose();
    disposeModel(this.arena.root);
    this.shotGeometry.dispose();
    this.auraGeometry.dispose();
    this.shadowGeometry.dispose();
    this.shadowMaterial.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
