import * as THREE from 'three';

import type { ContentCatalog } from '../content/catalog';
import { CharacterView } from './character-view';

const portraits = new WeakMap<object, string>();

/** A single small WebGL view for the roster screen; no battle session runs here. */
export class RosterPreview {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1.9, 1.9, 2.1, -2.1, 0.1, 20);
  private character: CharacterView;
  private observer: ResizeObserver;
  private raf = 0;
  private started = performance.now();

  constructor(
    private container: HTMLElement,
    private content: ContentCatalog,
    id: string,
  ) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor(0, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-label', 'Selected Medabot 3D preview');
    container.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight('#eafaff', '#7388ae', 0.75));

    const sun = new THREE.DirectionalLight('#fff4e1', 2.3);
    sun.position.set(-4, 6, 5);
    this.scene.add(sun);
    this.camera.position.set(0, 2.7, 8);
    this.camera.lookAt(0, 1.65, 0);
    this.character = new CharacterView(content.characters[id]!);
    this.scene.add(this.character.root);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();

    const render = (now: number) => {
      const t = (now - this.started) / 1000;
      this.character.model.root.rotation.y = 0.66 + Math.sin(t * 0.65) * 0.1;

      const model = this.character.model;
      model.root.position.y = Math.sin(t * 2) * 0.012;
      model.head.rotation.y = -0.15;
      model.leftArm.rotation.set(0.2, -0.16, -0.08);
      model.rightArm.rotation.set(-0.08, 0.32, 0.12);

      if (model.rig) {
        for (const [i, hip] of model.feet.entries()) {
          hip.rotation.z = i === 0 ? 0.13 : -0.1;
          hip.rotation.x = i === 0 ? 0.08 : -0.18;
          model.rig.knees[i]!.rotation.x = i === 0 ? 0.12 : 0.28;
          model.rig.innerLegs[i]!.quaternion.copy(hip.quaternion);
          model.rig.innerKnees[i]!.quaternion.copy(model.rig.knees[i]!.quaternion);
        }
      }

      for (const [i, arm] of [model.leftArm, model.rightArm].entries()) {
        model.rig?.innerArms[i]?.quaternion.copy(arm.quaternion);
      }

      this.renderer.render(this.scene, this.camera);
      this.raf = requestAnimationFrame(render);
    };
    this.raf = requestAnimationFrame(render);
  }

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);

    const halfHeight = Math.max(1.85, (1.4 * h) / Math.max(w, 1));
    const halfWidth = (halfHeight * w) / Math.max(h, 1);
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.updateProjectionMatrix();
  }

  select(id: string) {
    this.scene.remove(this.character.root);
    this.character.dispose();
    this.character = new CharacterView(this.content.characters[id]!);
    this.scene.add(this.character.root);
  }

  portraits() {
    const results: Record<string, string> = {};
    const camera = new THREE.OrthographicCamera(-1.05, 1.05, 1.24, -1.24, 0.1, 20);
    camera.position.set(0, 2.25, 8);
    camera.lookAt(0, 2.04, 0);

    for (const definition of Object.values(this.content.characters)) {
      let png = portraits.get(definition);

      if (!png) {
        const view = new CharacterView(definition);
        view.model.root.rotation.y = -0.2;
        this.character.root.visible = false;
        this.scene.add(view.root);
        this.renderer.setSize(220, 260, false);
        this.renderer.render(this.scene, camera);
        png = this.renderer.domElement.toDataURL();
        portraits.set(definition, png);
        this.scene.remove(view.root);
        view.dispose();
        this.character.root.visible = true;
      }

      results[definition.id] = png;
    }

    this.resize();

    return results;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.character.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
