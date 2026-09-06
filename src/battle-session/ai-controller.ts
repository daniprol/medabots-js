import { emptyCommand, type BattleSnapshot, type CombatantCommand } from '../battle-core';
import { recoverySeverity } from '../battle-core/statuses';
import type { ContentCatalog, RuntimeAI, RuntimeAbility } from '../content/catalog';
import { chooseAIAction, type AttackSlot } from './ai-weapons';

export type AIState = {
  rng: number;
  previous: CombatantCommand;
  moveX: -1 | 0 | 1;
  moveTicks: number;
  jumpTicks: number;
  heldAttackTicks: number;
  releaseTicks: number;
  guardReaction: number;
  obstacleTicks: number;
  lastX: number;
  specialDelay: number;
  cooldowns: Record<AttackSlot, number>;
};
export const createAIState = (seed: number): AIState => ({
  rng: seed & 255,
  previous: emptyCommand(),
  moveX: 0,
  moveTicks: 0,
  jumpTicks: 0,
  heldAttackTicks: 0,
  releaseTicks: 0,
  guardReaction: 0,
  obstacleTicks: 0,
  lastX: 0,
  specialDelay: -1,
  cooldowns: { head: 0, rightArm: 0, leftArm: 0 },
});

/** AI emits ordinary held/edge commands; its randomness can share the authoritative stream. */
export function aiCommand(
  snapshot: BattleSnapshot,
  id: string,
  content: ContentCatalog,
  profile: RuntimeAI,
  memory: AIState,
  draw?: () => number,
): CombatantCommand {
  const actor = snapshot.combatants.find((candidate) => candidate.id === id)!;
  const command = emptyCommand();
  if (actor.knockedOut || snapshot.specialFreezeTicks > 0) {
    return command;
  }
  const random =
    draw ??
    (() => {
      const value = content.rules[snapshot.rulesId]!.original.battleRandom[memory.rng & 255]!;
      memory.rng = (memory.rng + 1) & 255;
      return value;
    });
  const medal = content.medals[actor.medalId]!.levels[actor.medalLevel - 1]!;
  const ranks = [medal.shooting, medal.grappling, medal.support];
  const dominant = ranks.indexOf(Math.max(...ranks));
  const group = dominant * 5 + Math.min(4, Math.floor(actor.medalLevel / 10));
  const variant = profile.variant;
  const behavior = profile.original.profiles[group]![variant]!;
  const delays = profile.original.cooldowns[group]![0]!;
  const enemies = snapshot.combatants.filter(
    (candidate) => candidate.teamId !== actor.teamId && !candidate.knockedOut,
  );
  enemies.sort(
    (a, b) =>
      Math.abs(a.x - actor.x) +
        Math.abs(a.y - actor.y) -
        (Math.abs(b.x - actor.x) + Math.abs(b.y - actor.y)) || a.actorIndex - b.actorIndex,
  );
  const target =
    (actor.panel === 30
      ? enemies.find((enemy) => enemy.role === 'partner')
      : [6, 29].includes(actor.panel) || behavior[0]
        ? enemies.find((enemy) => enemy.role === 'leader')
        : undefined) ?? enemies[0];
  if (!target) {
    return command;
  }

  const abilityFor = (slot: AttackSlot): RuntimeAbility =>
    content.abilities[
      actor.parts[slot].destroyed && slot !== 'head'
        ? 'frame-attack'
        : content.parts[actor.parts[slot].definitionId]!.abilityId!
    ]!;
  const offensive = (['head', 'rightArm', 'leftArm'] as const)
    .map(abilityFor)
    .filter((ability) => ability.original.category <= 1 || ability.original.family === 'frame');
  const range = offensive.length
    ? Math.min(15, Math.max(...offensive.map((ability) => ability.original.rangePixels / 8)))
    : 10;
  const distance = Math.abs(target.x - actor.x);
  const dy = target.y - actor.y;
  if (memory.moveTicks-- <= 0) {
    memory.moveTicks = (random() + 10) & 15;
    const direction = Math.sign(target.x - actor.x) as -1 | 1;
    memory.moveX =
      distance > range * 0.65
        ? direction
        : distance < Math.min(3, range * 0.3)
          ? (-direction as -1 | 1)
          : 0;
    if (!offensive.length) {
      memory.moveX = distance < 8 ? (-direction as -1 | 1) : 0;
    }
    if (actor.panel === 9) {
      memory.moveX = -direction as -1 | 1;
    }
    if (actor.panel === 5) {
      const leader = snapshot.combatants.find(
        (candidate) => candidate.teamId === actor.teamId && candidate.role === 'leader',
      )!;
      memory.moveX = Math.sign((leader.x + target.x) / 2 - actor.x) as -1 | 0 | 1;
    }
  }
  const xPixels = actor.x * 8 + 216;
  const boundary = Math.abs(dy) < 2 ? 8 : 24;
  if (xPixels <= boundary) {
    memory.moveX = 1;
  }
  if (xPixels >= 432 - boundary) {
    memory.moveX = -1;
  }
  command.moveX = memory.moveX;
  memory.obstacleTicks =
    command.moveX !== 0 && Math.abs(actor.x - memory.lastX) < 0.04 ? memory.obstacleTicks + 1 : 0;
  memory.lastX = actor.x;
  if (actor.grounded && !actor.attack && (dy > 1.5 || memory.obstacleTicks > 12)) {
    command.jumpPressed = !memory.previous.jumpHeld;
    if (command.jumpPressed) {
      memory.jumpTicks = 12;
    }
  }
  if (actor.grounded && dy < -2) {
    command.dropHeld = true;
    command.jumpPressed = !memory.previous.jumpHeld;
  }
  command.jumpHeld = memory.jumpTicks-- > 0 && !command.dropHeld;
  if (behavior[1]) {
    const threat = snapshot.projectiles.find(
      (shot) =>
        shot.teamId !== actor.teamId &&
        Math.abs(shot.x - actor.x) < 5 &&
        Math.abs(shot.y - (actor.y + 2)) < 2,
    );
    const threatened = !!threat || (distance < 4 && !!target.attack);
    memory.guardReaction = threatened ? memory.guardReaction + 1 : 0;
    const threatDirection = threat ? Math.sign(threat.x - actor.x) : Math.sign(target.x - actor.x);
    if (threatened && threatDirection !== actor.facing) {
      command.moveX = threatDirection as -1 | 1;
    } else {
      command.guardHeld = threatened && memory.guardReaction >= behavior[2]!;
    }
  }
  if (actor.attack) {
    if (memory.heldAttackTicks > 0) {
      command.attackHeld = true;
      memory.heldAttackTicks--;
    } else if (
      actor.attack.slot === 'rightArm' &&
      abilityFor('rightArm').original.comboStages.length &&
      snapshot.tick & 1
    ) {
      command.rightArmPressed = !memory.previous.attackHeld;
    }
  } else if (memory.releaseTicks > 0) {
    memory.releaseTicks--;
  } else if (!command.guardHeld) {
    const selected = chooseAIAction(snapshot, actor, target, content, memory, random);
    if (selected) {
      const ability = abilityFor(selected);
      if (memory.cooldowns[selected] > 0) {
        memory.cooldowns[selected]--;
      } else if (actor.parts[selected].readiness >= 320) {
        const directional =
          ability.original.category <= 1 ||
          [22, 23, 24, 25, 26].includes(ability.original.actionType);
        if (directional && Math.sign(target.x - actor.x) !== actor.facing && distance > 0.1) {
          command.moveX = Math.sign(target.x - actor.x) as -1 | 1;
        } else {
          command.headPressed = selected === 'head';
          command.leftArmPressed = selected === 'leftArm';
          command.rightArmPressed = selected === 'rightArm';
          const category = ability.original.category === 255 ? 0 : ability.original.category;
          memory.cooldowns[selected] =
            [1, 2, 3][['rightArm', 'leftArm', 'head'].indexOf(selected)] === actor.panel
              ? 10
              : delays[category]!;
          if ([3, 4].includes(ability.original.actionType) && random() & 1) {
            memory.heldAttackTicks = 200;
          }
          memory.releaseTicks = 1;
        }
      }
    }
  }
  if (actor.displayMeter >= 51 && actor.panel !== 15 && !actor.attack) {
    if (memory.specialDelay < 0) {
      memory.specialDelay =
        actor.panel === 14 ? 1 : actor.panel === 16 ? 10 : random() + delays[3]! * 10;
    }
    if (--memory.specialDelay <= 0) {
      const special = content.abilities[content.characters[actor.characterId]!.specialAbilityId]!;
      const useful =
        special.original.family === 'all-recovery'
          ? snapshot.combatants.some(
              (friend) => friend.teamId === actor.teamId && recoverySeverity(friend) > 0,
            )
          : distance < range + 5;
      command.specialPressed = useful;
      memory.specialDelay = useful ? -1 : 20;
    }
  } else if (actor.displayMeter < 51) {
    memory.specialDelay = -1;
  }
  command.attackHeld ||= command.rightArmPressed || command.headPressed || command.leftArmPressed;
  command.upHeld = command.headPressed;
  command.dropHeld ||= command.leftArmPressed;
  command.upPressed = command.upHeld && !memory.previous.upHeld;
  command.downPressed = command.dropHeld && !memory.previous.dropHeld;
  memory.previous = { ...command };
  return command;
}
