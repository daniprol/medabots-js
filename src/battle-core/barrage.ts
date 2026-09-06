import type { BattleContext, ProjectileSnapshot } from './types';

/** Integer lookup motion; target selection is still an approximation of AX's arrival test. */
export function moveBarrage(context: BattleContext, projectile: ProjectileSnapshot) {
  const sine = context.content.rules[context.setup.rulesId]!.original.sine;
  if ((context.state.tick & 3) === projectile.index) {
    const target = context.state.combatants
      .filter((actor) => actor.teamId !== projectile.teamId && !actor.knockedOut)
      .sort(
        (first, second) =>
          Math.abs(first.x - projectile.x) +
          Math.abs(first.y + 2 - projectile.y) -
          Math.abs(second.x - projectile.x) -
          Math.abs(second.y + 2 - projectile.y),
      )[0];
    if (target) {
      const dx = Math.round((target.x - projectile.x) * 8);
      const dy = Math.round((projectile.y - target.y - 2) * 8);
      let angle = projectile.heading;
      let error = Infinity;
      for (let candidate = 0; candidate < 360; candidate++) {
        const cos = sine[(candidate + 90) % 360]!;
        const sin = sine[candidate]!;
        const cross = Math.abs(cos * dy - sin * dx);
        if (cos * dx + sin * dy >= 0 && cross < error) {
          angle = candidate;
          error = cross;
        }
      }
      const turn = ((angle - projectile.heading + 540) % 360) - 180;
      projectile.heading = projectile.steered
        ? (projectile.heading + Math.max(-16, Math.min(16, turn)) + 360) % 360
        : angle;
      projectile.steered = true;
    }
  }
  const age = projectile.age;
  const spreadX = age < 20 ? projectile.facing * (4 - Math.floor(age / 5)) : 0;
  const spreadY =
    age < 20
      ? [
          Math.floor(age / 2) - 10,
          Math.floor(age / 7) - 3,
          3 - Math.floor(age / 7),
          10 - Math.floor(age / 2),
        ][projectile.index]!
      : 0;
  projectile.vx = Math.max(
    -4,
    Math.min(4, Math.trunc((5 * sine[(projectile.heading + 90) % 360]!) / 128) + spreadX),
  );
  projectile.vy = -Math.max(
    -5,
    Math.min(5, Math.trunc((5 * sine[projectile.heading]!) / 128) + spreadY),
  );
  projectile.x += projectile.vx / 8;
  projectile.y += projectile.vy / 8;
}
