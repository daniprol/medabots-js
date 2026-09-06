import * as THREE from 'three';

import type { BattleSnapshot } from '../battle-core';
import type { ArenaDefinition } from '../content/schemas';
import { arenaBackdrop } from './arena-art';
import { batchStatic } from './batch-static';
import { slopedPlatform } from './platform-view';

const PALETTES = {
  ruins: ['#dbc6a4', '#9a8161', '#7b9560'],
  forest: ['#bba27d', '#736044', '#57835a'],
  aquatic: ['#e5d9b7', '#9b9483', '#67bcc8'],
  industrial: ['#c5d4d9', '#607b8d', '#e0b451'],
  ice: ['#e1f6f7', '#8faabf', '#b7eef0'],
  volcanic: ['#ba9276', '#79544f', '#e58d51'],
};

export function createArena(definition: ArenaDefinition) {
  const root = new THREE.Group();
  const distant = new THREE.Group();
  root.add(distant);
  const palette = PALETTES[definition.original.theme];
  const stone = new THREE.MeshLambertMaterial({ color: palette[0] });
  const dark = new THREE.MeshLambertMaterial({ color: palette[1] });
  const moss = new THREE.MeshLambertMaterial({ color: palette[2] });
  const addBox = (
    parent: THREE.Group,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const art = arenaBackdrop(definition);
  const backdrop = new THREE.TextureLoader().load(art.url);
  backdrop.repeat.set(art.width, art.height);
  backdrop.offset.set(art.x, 1 - art.y - art.height);
  const platformAtlas = new THREE.TextureLoader().load('/assets/arenas/hd2d/platform-atlas.png');
  platformAtlas.colorSpace = THREE.SRGBColorSpace;
  platformAtlas.wrapS = THREE.RepeatWrapping;
  platformAtlas.repeat.set(1, 0.327);
  platformAtlas.offset.y =
    definition.original.theme === 'ice'
      ? 0.005
      : definition.original.theme === 'industrial'
        ? 0.337
        : 0.668;
  const surfaceMaterial = new THREE.MeshBasicMaterial({
    map: platformAtlas,
    color: '#f8efdb',
    toneMapped: false,
  });
  const frontFace = (x: number, y: number, width: number, height: number) => {
    const geometry = new THREE.PlaneGeometry(width, height);
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, (uv.getX(i) * width) / 8);
    }
    const mesh = new THREE.Mesh(geometry, surfaceMaterial);
    mesh.position.set(x, y, 0.79);
    root.add(mesh);
  };
  backdrop.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(128, 64),
    new THREE.MeshBasicMaterial({
      map: backdrop,
      color: definition.original.theme === 'ice' ? '#bfdced' : '#ffffff',
      toneMapped: false,
    }),
  );
  sky.position.set(0, 23, -24);
  distant.add(sky);

  for (const platform of definition.platforms) {
    const top = platform.y;
    const row = Math.round(46 - platform.y);
    const startColumn = Math.round(platform.x - platform.width / 2 + 27);
    const slopes = definition.original.tiles[row]!.slice(
      startColumn,
      startColumn + platform.width,
    ).some((tile) => (tile & 7) > 1);
    if (slopes) {
      root.add(slopedPlatform(definition, platform, surfaceMaterial, stone));
    } else {
      addBox(root, dark, platform.x, top - 0.65, -0.5, platform.width, 1.15, 2.4);
      addBox(root, stone, platform.x, top - 0.12, -0.45, platform.width + 0.03, 0.24, 2.55);
      addBox(root, moss, platform.x, top + 0.015, -0.7, platform.width, 0.04, 1.9);
      frontFace(platform.x, top - 0.6, platform.width, 1.05);
    }
    for (let offset = -platform.width / 2 + 1.2; offset < platform.width / 2; offset += 2.5) {
      addBox(root, stone, platform.x + offset, top - 0.67, 0.73, 0.025, 0.84, 0.025);
      if (!slopes && definition.original.theme !== 'industrial') {
        addBox(
          root,
          moss,
          platform.x + offset + 0.25,
          top - 0.25,
          0.76,
          0.16,
          0.35 + (Math.abs(offset) % 0.45),
          0.04,
        );
      }
    }
    if (platform.width > 12 && top > 2) {
      for (const x of [platform.x - platform.width * 0.43, platform.x + platform.width * 0.43]) {
        addBox(root, dark, x, top / 2 - 0.5, -1.3, 0.9, top, 1.4);
        addBox(root, stone, x, top - 1.4, -0.45, 1.2, 0.35, 0.5);
      }
    }
  }

  const waterY = definition.original.waterY;
  if (waterY !== null) {
    const height = (368 - waterY) / 8;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(54, height),
      new THREE.MeshBasicMaterial({
        color: '#70ccd9',
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
    );
    water.position.set(0, height / 2, 1.2);
    root.add(water);
    addBox(
      root,
      new THREE.MeshBasicMaterial({ color: '#d1ffff', transparent: true, opacity: 0.6 }),
      0,
      height,
      1.3,
      54,
      0.04,
      0.01,
    );
  }
  root.remove(distant);
  batchStatic(root);
  batchStatic(distant);
  root.add(distant);
  const movingPlatforms = new Map<string, THREE.Group>();
  for (const definitionPlatform of definition.original.movingPlatforms) {
    const group = new THREE.Group();
    const width = definitionPlatform.width / 8;
    addBox(group, dark, 0, -0.32, -0.3, width, 0.6, 2);
    addBox(group, stone, 0, -0.04, -0.3, width, 0.08, 2.1);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.5), surfaceMaterial);
    front.position.set(0, -0.31, 0.72);
    group.add(front);
    root.add(group);
    movingPlatforms.set(definitionPlatform.id, group);
  }
  const update = (previous: BattleSnapshot, current: BattleSnapshot, alpha: number) => {
    for (const platform of current.platforms) {
      const old = previous.platforms.find((candidate) => candidate.id === platform.id) ?? platform;
      const view = movingPlatforms.get(platform.id)!;
      view.position.set(
        (THREE.MathUtils.lerp(old.x, platform.x, alpha) + platform.width / 2 - 216) / 8,
        (368 - THREE.MathUtils.lerp(old.y, platform.y, alpha)) / 8,
        0,
      );
    }
  };
  return {
    root,
    distant,
    update,
    dispose: () => {
      backdrop.dispose();
      platformAtlas.dispose();
    },
  };
}
