import { emptyCommand, type BattleSnapshot, type CombatantCommand } from '../battle-core';
import { nextRandom } from '../battle-core/random';
import type { ContentCatalog, RuntimeAI } from '../content/build-content-catalog';
export type AIState = { rng: number; nextReaction: number; command: CombatantCommand };
export const createAIState = (seed: number): AIState => ({
  rng: seed >>> 0,
  nextReaction: 0,
  command: emptyCommand(),
});
export function aiCommand(
  snapshot: BattleSnapshot,
  id: string,
  content: ContentCatalog,
  profile: RuntimeAI,
  memory: AIState,
): CombatantCommand {
  const c = snapshot.combatants.find((c) => c.id === id)!;
  if (c.knockedOut) return emptyCommand();
  if (snapshot.tick < memory.nextReaction)
    return {
      ...emptyCommand(),
      moveX: memory.command.moveX,
      guardHeld: memory.command.guardHeld,
      chargeHeld: memory.command.chargeHeld,
      dropHeld: memory.command.dropHeld,
    };
  memory.nextReaction = snapshot.tick + profile.reactionTicks;
  const random = () => {
    const r = nextRandom(memory.rng);
    memory.rng = r.state;
    return r.value;
  };
  const ownLeader = snapshot.combatants.find((t) => t.teamId === c.teamId && t.role === 'leader')!;
  const enemies = snapshot.combatants.filter((t) => t.teamId !== c.teamId && !t.knockedOut);
  const score = (t: typeof c) =>
    Math.abs(t.x - c.x) * profile.strategyWeights.proximity +
    Math.abs(t.y - c.y) * 2 -
    (c.strategy === 'ATTACK_LEADER' && t.role === 'leader'
      ? profile.strategyWeights.leader * 5
      : 0) +
    (c.strategy === 'PROTECT_LEADER' ? Math.abs(t.x - ownLeader.x) * 1.5 : 0) -
    profile.strategyWeights.weakness * (1 - t.parts.head.currentArmor / t.parts.head.maxArmor) * 5;
  enemies.sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id));
  const target = enemies[0];
  if (!target) return emptyCommand();
  const dx = target.x - c.x,
    dy = target.y - c.y;
  const distance = Math.abs(dx);
  const arm = content.abilities[content.parts[c.parts.rightArm.definitionId]!.abilityId!]!;
  const melee = arm.delivery === 'melee';
  const preferred = melee
    ? Math.max(0.7, arm.hitbox.x + arm.hitbox.width / 2 - 0.75)
    : profile.preferredDistance;
  const command = emptyCommand();
  if (c.strategy === 'PROTECT_LEADER' && Math.abs(c.x - ownLeader.x) > 6 && distance > 5)
    command.moveX = Math.sign(ownLeader.x - c.x) as -1 | 1;
  else if (distance > preferred + 0.4 || (Math.sign(dx) !== c.facing && distance > 0.4))
    command.moveX = Math.sign(dx) as -1 | 1;
  else if (!melee && distance < 2.3) command.moveX = -Math.sign(dx) as -1 | 1;
  command.jumpPressed = c.grounded && dy > profile.jumpThreshold;
  command.dropHeld = c.grounded && dy < -1.5;
  if (c.grounded && Math.abs(c.vx) < 0.3 && distance > preferred + 2 && random() < 0.25)
    command.jumpPressed = true;
  const threatened =
    (distance < 3 && !!target.attack) ||
    snapshot.projectiles.some(
      (p) => p.teamId !== c.teamId && Math.abs(p.x - c.x) < 3 && Math.abs(p.y - (c.y + 1.4)) < 1,
    );
  command.guardHeld = threatened && random() < profile.guardProbability;
  const canHit = Math.abs(dy) < 1.3 && distance < (melee ? 3.1 : 15) && Math.sign(dx) === c.facing;
  const available = (['head', 'leftArm', 'rightArm', 'rightArm'] as const).filter((slot) => {
    const part = c.parts[slot];
    const ability = content.abilities[content.parts[part.definitionId]!.abilityId!]!;
    return (
      !part.destroyed &&
      part.cooldownTicks === 0 &&
      (ability.maxUses === 0 || part.uses < ability.maxUses)
    );
  });
  if (canHit && !command.guardHeld && random() < profile.aggression) {
    const choice = available[Math.floor(random() * available.length)];
    command.headPressed = choice === 'head';
    command.leftArmPressed = choice === 'leftArm';
    command.rightArmPressed = choice === 'rightArm';
    command.specialPressed = c.specialMeter >= content.rules[snapshot.rulesId]!.specialMaximum;
  }
  command.chargeHeld =
    (!canHit || available.length === 0) &&
    c.grounded &&
    distance < preferred + 1 &&
    c.specialMeter < content.rules[snapshot.rulesId]!.specialMaximum &&
    !command.guardHeld;
  memory.command = command;
  return command;
}
