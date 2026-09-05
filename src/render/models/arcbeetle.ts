import { chassis, cannonArm, tube, v, plate, box } from './primitives';
export function arcbeetle(color = '#ffc338', accent = '#ed7325') {
  const m = chassis(color, accent, '#6dd8ff', 1.16);
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI;
    const x = Math.cos(a),
      y = Math.sin(a);
    tube(
      m.head,
      '#c64125',
      v(x * 0.39, y * 0.35 - 0.04, -0.37),
      v(x * 0.77, y * 0.84 + 0.1, -0.5),
      0.13,
    );
    tube(
      m.head,
      '#f5f1d9',
      v(x * 0.71, y * 0.76 + 0.1, -0.5),
      v(x * 0.91, y * 1.1 + 0.15, -0.51),
      0.11,
    );
  }
  plate(
    m.head,
    '#ffe574',
    [
      [-0.3, 0.26],
      [0, 0.54],
      [0.3, 0.26],
      [0.2, 0.07],
      [-0.2, 0.07],
    ],
    0.13,
    0.41,
  );
  box(m.head, '#fffbc9', 0, 0.21, 0.57, 0.17, 0.14, 0.04);
  cannonArm(m.leftArm, '#cf5e23', '#ffcf3b', true);
  cannonArm(m.rightArm, '#cf5e23', '#ffcf3b', true);
  m.leftArm.scale.setScalar(1.14);
  m.rightArm.scale.setScalar(1.14);
  return m;
}
