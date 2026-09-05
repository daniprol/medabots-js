import { chassis, ball, plate, box, tube, v } from './primitives';
export function rokusho(color = '#eef3ff', accent = '#285ce0') {
  const m = chassis(color, accent, '#ff493c');
  plate(
    m.head,
    '#2857da',
    [
      [-0.17, 0.16],
      [-0.23, 0.62],
      [0.04, 1.03],
      [0.29, 0.75],
      [0.14, 0.1],
    ],
    0.31,
    -0.12,
  );
  for (const side of [-1, 1]) {
    const crest = plate(
      m.head,
      '#eff5ff',
      [
        [side * 0.26, 0.15],
        [side * 0.54, 0.23],
        [side * 0.75, 0.91],
        [side * 0.35, 0.68],
      ],
      0.19,
      -0.01,
    );
    crest.rotation.z = side * -0.08;
    plate(
      m.head,
      '#456fed',
      [
        [side * 0.37, 0.26],
        [side * 0.49, 0.34],
        [side * 0.6, 0.73],
        [side * 0.39, 0.55],
      ],
      0.025,
      0.19,
    );
  }
  for (const arm of [m.leftArm, m.rightArm]) {
    ball(arm, '#e8f1ff', 0, 0.06, 0, 0.6, 0.43, 0.56);
    box(arm, '#275de0', 0, 0.04, 0.23, 0.28, 0.14, 0.17);
    tube(arm, '#d8e1f4', v(0, -0.12, 0), v(0, -0.27, 0.48), 0.16);
    plate(
      arm,
      '#d6f8ff',
      [
        [-0.14, -0.31],
        [0.14, -0.31],
        [0.09, 1.1],
        [0, 1.65],
        [-0.09, 1.1],
      ],
      0.095,
      0.4,
    ).rotation.x = Math.PI / 2;
    box(arm, '#2d58ce', 0, -0.24, 0.4, 0.35, 0.25, 0.26);
  }
  return m;
}
