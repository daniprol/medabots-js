import { chassis, cannonArm, tube, v, plate, ball } from './primitives';
export function warbandit(color = '#e74830', accent = '#ffab29') {
  const m = chassis(color, accent, '#61ff84', 1.04);
  plate(
    m.head,
    '#fdaa2a',
    [
      [-0.35, 0.14],
      [-0.39, 0.43],
      [0, 0.62],
      [0.4, 0.4],
      [0.35, 0.09],
    ],
    0.26,
    -0.04,
  );
  tube(m.head, '#b0b5e7', v(0, 0.22, 0.43), v(0, 0.43, 2.03), 0.23, 0);
  tube(m.head, '#e1dcff', v(0, 0.26, 0.42), v(0, 0.43, 2.03), 0.1, 0);
  cannonArm(m.rightArm, '#f1a626', '#bd2930');
  ball(m.leftArm, '#ff9b24', 0, 0, 0, 0.76, 0.64, 0.61);
  tube(m.leftArm, '#b73232', v(0, -0.15, 0), v(0, -0.3, 0.41), 0.22);
  ball(m.leftArm, '#d8d9f8', 0, -0.3, 0.58, 0.37, 0.36, 0.43);
  for (const side of [-1, 1])
    plate(
      m.core,
      '#f99d24',
      [
        [side * 0.42, 1.56],
        [side * 0.91, 1.85],
        [side * 0.74, 1.29],
        [side * 0.5, 1.17],
      ],
      0.21,
      -0.13,
    );
  return m;
}
