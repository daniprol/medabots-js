import { chassis, cannonArm, tube, v, box } from './primitives';
export function metabee(color = '#f4b923', accent = '#f7f3df') {
  const m = chassis(color, accent, '#69ffb1');
  for (const side of [-1, 1]) {
    tube(m.head, '#f5c044', v(side * 0.32, 0.27, -0.02), v(side * 0.4, 0.48, 0.08), 0.21);
    tube(m.head, '#26324b', v(side * 0.4, 0.43, 0.02), v(side * 0.4, 0.72, 0.73), 0.17);
    tube(m.head, '#090e1b', v(side * 0.4, 0.68, 0.63), v(side * 0.4, 0.75, 0.8), 0.125);
    box(m.head, '#ffe891', side * 0.31, 0.22, 0.41, 0.3, 0.22, 0.17);
  }
  cannonArm(m.leftArm, '#eeb226', '#f4f3e8');
  cannonArm(m.rightArm, '#eeb226', '#f4f3e8');
  return m;
}
