import * as THREE from 'three';

/** A small presentation-only light stroke, shared by all Vertical Line objects. */
export function slashTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 384;
  const context = canvas.getContext('2d')!;
  context.lineCap = 'round';
  for (const [width, color, blur] of [
    [28, '#21a9df66', 24],
    [12, '#8afaff', 12],
    [4, '#ffffff', 4],
  ] as const) {
    context.beginPath();
    context.moveTo(28, 12);
    context.bezierCurveTo(118, 104, 118, 280, 28, 372);
    context.strokeStyle = color;
    context.lineWidth = width;
    context.shadowBlur = blur;
    context.shadowColor = '#46e7ff';
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
