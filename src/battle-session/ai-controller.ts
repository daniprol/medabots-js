import { emptyCommand, type BattleSnapshot, type CombatantCommand } from '../battle-core';
import { nextRandom } from '../battle-core/random';
import type { ContentCatalog, RuntimeAI } from '../content/catalog';

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
  const combatant = snapshot.combatants.find((combatant) => combatant.id === id)!;

  if (combatant.knockedOut) {
    return emptyCommand();
  }

  if (snapshot.tick < memory.nextReaction) {
    return {
      ...emptyCommand(),
      moveX: memory.command.moveX,
      guardHeld: memory.command.guardHeld,
      chargeHeld: memory.command.chargeHeld,
      dropHeld: memory.command.dropHeld,
    };
  }

  memory.nextReaction = snapshot.tick + profile.reactionTicks;

  const random = () => {
    const r = nextRandom(memory.rng);
    memory.rng = r.state;

    return r.value;
  };
  const ownLeader = snapshot.combatants.find(
    (candidate) => candidate.teamId === combatant.teamId && candidate.role === 'leader',
  )!;
  const enemies = snapshot.combatants.filter(
    (candidate) => candidate.teamId !== combatant.teamId && !candidate.knockedOut,
  );
  const score = (candidate: typeof combatant) =>
    Math.abs(candidate.x - combatant.x) * profile.strategyWeights.proximity +
    Math.abs(candidate.y - combatant.y) * 2 -
    (combatant.strategy === 'ATTACK_LEADER' && candidate.role === 'leader'
      ? profile.strategyWeights.leader * 5
      : 0) +
    (combatant.strategy === 'PROTECT_LEADER' ? Math.abs(candidate.x - ownLeader.x) * 1.5 : 0) -
    profile.strategyWeights.weakness *
      (1 - candidate.parts.head.currentArmor / candidate.parts.head.maxArmor) *
      5;
  enemies.sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id));

  const target = enemies[0];

  if (!target) {
    return emptyCommand();
  }

  const targetOffsetX = target.x - combatant.x;
  const targetOffsetY = target.y - combatant.y;
  const distance = Math.abs(targetOffsetX);
  const arm = content.abilities[content.parts[combatant.parts.rightArm.definitionId]!.abilityId!]!;
  const melee = arm.delivery === 'melee';
  const preferred = melee
    ? Math.max(0.7, arm.hitbox.x + arm.hitbox.width / 2 - 0.75)
    : profile.preferredDistance;
  const command = emptyCommand();

  if (
    combatant.strategy === 'PROTECT_LEADER' &&
    Math.abs(combatant.x - ownLeader.x) > 6 &&
    distance > 5
  ) {
    command.moveX = Math.sign(ownLeader.x - combatant.x) as -1 | 1;
  } else if (
    distance > preferred + 0.4 ||
    (Math.sign(targetOffsetX) !== combatant.facing && distance > 0.4)
  ) {
    command.moveX = Math.sign(targetOffsetX) as -1 | 1;
  } else if (!melee && distance < 2.3) {
    command.moveX = -Math.sign(targetOffsetX) as -1 | 1;
  }

  command.jumpPressed = combatant.grounded && targetOffsetY > profile.jumpThreshold;
  command.dropHeld = combatant.grounded && targetOffsetY < -1.5;

  if (
    combatant.grounded &&
    Math.abs(combatant.vx) < 0.3 &&
    distance > preferred + 2 &&
    random() < 0.25
  ) {
    command.jumpPressed = true;
  }

  const threatened =
    (distance < 3 && !!target.attack) ||
    snapshot.projectiles.some(
      (projectile) =>
        projectile.teamId !== combatant.teamId &&
        Math.abs(projectile.x - combatant.x) < 3 &&
        Math.abs(projectile.y - (combatant.y + 1.4)) < 1,
    );
  command.guardHeld = threatened && random() < profile.guardProbability;

  const canHit =
    Math.abs(targetOffsetY) < 1.3 &&
    distance < (melee ? 3.1 : 15) &&
    Math.sign(targetOffsetX) === combatant.facing;
  const available = (['head', 'leftArm', 'rightArm', 'rightArm'] as const).filter((slot) => {
    const part = combatant.parts[slot];
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
    command.specialPressed =
      combatant.specialMeter >= content.rules[snapshot.rulesId]!.specialMaximum;
  }

  command.chargeHeld =
    (!canHit || available.length === 0) &&
    combatant.grounded &&
    distance < preferred + 1 &&
    combatant.specialMeter < content.rules[snapshot.rulesId]!.specialMaximum &&
    !command.guardHeld;
  memory.command = command;

  return command;
}
