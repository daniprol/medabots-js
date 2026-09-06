import * as THREE from 'three';

import type { ArenaDefinition } from '../content/schemas';
import { TILE_SURFACE_HEIGHTS } from '../content/tile-shapes';

/** Extrude the same visible surface profile as the tile data, including sloping runs. */
export function slopedPlatform(
  arena: ArenaDefinition,
  platform: ArenaDefinition['platforms'][number],
  front: THREE.Material,
  stone: THREE.Material,
) {
  const row = Math.round(46 - platform.y);
  const firstColumn = Math.round(platform.x - platform.width / 2 + 27);
  const profile: THREE.Vector2[] = [];
  for (let pixel = 0; pixel <= platform.width * 8; pixel++) {
    const sample = Math.min(pixel, platform.width * 8 - 1);
    const shape = arena.original.tiles[row]![firstColumn + Math.floor(sample / 8)]! & 7;
    const height = TILE_SURFACE_HEIGHTS[shape - 1]![sample % 8]!;
    profile.push(
      new THREE.Vector2(platform.x - platform.width / 2 + pixel / 8, platform.y - height / 8),
    );
  }
  const shape = new THREE.Shape();
  shape.moveTo(profile[0]!.x, profile[0]!.y);
  for (const point of profile.slice(1)) {
    shape.lineTo(point.x, point.y);
  }
  for (const point of [...profile].reverse()) {
    shape.lineTo(point.x, point.y - 1.05);
  }
  shape.closePath();
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false }),
    stone,
  );
  body.position.z = -1.7;
  group.add(body);

  const positions: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const left = profile[i]!;
    const right = profile[i + 1]!;
    const vertices = [
      [left.x, left.y, i, 1],
      [left.x, left.y - 1.05, i, 0],
      [right.x, right.y, i + 1, 1],
      [right.x, right.y, i + 1, 1],
      [left.x, left.y - 1.05, i, 0],
      [right.x, right.y - 1.05, i + 1, 0],
    ];
    for (const [x, y, u, v] of vertices) {
      positions.push(x!, y!, 0.72);
      uvs.push(u! / 64, v!);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry, front));
  return group;
}
