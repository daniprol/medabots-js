import type { BattleSnapshot, CombatantSnapshot } from '../battle-core';
import { recoverySeverity } from '../battle-core/statuses';
import type { ContentCatalog } from '../content/catalog';
import type { AIState } from './ai-controller';

export type AttackSlot = 'head' | 'rightArm' | 'leftArm';
const SLOTS: AttackSlot[] = ['head', 'rightArm', 'leftArm'];

/** Original ordered slot policy: a rejected preferred action need not fall through. */
export function chooseAIAction(
  snapshot: BattleSnapshot,
  actor: CombatantSnapshot,
  target: CombatantSnapshot,
  content: ContentCatalog,
  memory: AIState,
  random: () => number,
): AttackSlot | null {
  const friends = snapshot.combatants.filter(
    (friend) => friend.teamId === actor.teamId && !friend.knockedOut,
  );
  const elapsed = Math.floor(
    (content.rules[snapshot.rulesId]!.roundTicks - snapshot.remainingTicks) / 60,
  );
  const eligible = (slot: AttackSlot) => {
    const part = actor.parts[slot];
    const ability =
      content.abilities[
        part.destroyed && slot !== 'head'
          ? 'frame-attack'
          : content.parts[part.definitionId]!.abilityId!
      ]!;
    const type = ability.original.actionType;
    if (type >= 31 && type <= 33) {
      return false;
    }
    if (slot === 'head') {
      if (part.destroyed || actor.panel === 4 || part.uses >= ability.maxUses) {
        return false;
      }
      if (type === 17 || type === 18) {
        if (
          ['rightArm', 'leftArm'].some((key) => {
            const arm = actor.parts[key as AttackSlot];
            return (
              !arm.destroyed &&
              content.abilities[content.parts[arm.definitionId]!.abilityId!]!.original
                .actionType === type
            );
          })
        ) {
          return false;
        }
        if (!friends.some((friend) => recoverySeverity(friend) === 3)) {
          return false;
        }
      } else if (
        type !== 19 &&
        actor.panel !== 3 &&
        elapsed < (((part.uses + 1) * Math.floor(120 / (ability.maxUses + 1))) & 255)
      ) {
        return false;
      }
    }
    const geometric = () =>
      Math.abs(target.x - actor.x) < ability.original.rangePixels / 7 &&
      target.y > actor.y - 3.875 &&
      target.y < actor.y + 3.875;
    if ([7, 8, 9, 10, 11, 12, 13, 14, 34].includes(type)) {
      return geometric();
    }
    if ([0, 1, 2, 3, 4, 5, 22, 23, 24, 25, 26].includes(type)) {
      return (random() & 3) === 0 && geometric();
    }
    if (type === 6) {
      return (random() & 15) === 0 && geometric();
    }
    if (type === 16) {
      return (random() & 15) === 0 && !actor.beneficialStatus;
    }
    if ([15, 29, 30].includes(type)) {
      random();
      return (random() & 15) === 0 && friends.some((friend) => !friend.beneficialStatus);
    }
    if (type === 17 || type === 18) {
      if (!memory.cooldowns[slot] && (random() & 3) !== 0) {
        memory.cooldowns[slot] = actor.panel === 10 ? 15 : 25;
        return false;
      }
      return friends.some(
        (friend) => recoverySeverity(friend) > 0 && (type === 17 || !friend.beneficialStatus),
      );
    }
    if (type === 19) {
      random();
      return (
        (random() & 3) === 0 &&
        friends.some((friend) =>
          Object.entries(friend.parts).some(([key, part]) => key !== 'head' && part.destroyed),
        )
      );
    }
    if (type === 20) {
      return friends.some((friend) => friend.harmfulStatus !== null);
    }
    if (type === 21) {
      return (
        (random() & 15) === 0 &&
        snapshot.combatants.some(
          (enemy) =>
            enemy.teamId !== actor.teamId &&
            !enemy.knockedOut &&
            enemy.displayMeter > 44 &&
            enemy.harmfulStatus?.kind !== 'meter-control',
        )
      );
    }
    if (type === 27 || type === 28) {
      return (random() & 1) === 0 && part.transformationTicks === 0;
    }
    return false;
  };
  const preferred =
    actor.panel === 1 || actor.panel === 8
      ? 'rightArm'
      : actor.panel === 2
        ? 'leftArm'
        : actor.panel === 3
          ? 'head'
          : null;
  if (preferred && !actor.parts[preferred].destroyed) {
    return eligible(preferred) ? preferred : null;
  }
  const start = random() % 3;
  for (let offset = 0; offset < 3; offset++) {
    const slot = SLOTS[(start + offset) % 3]!;
    if (eligible(slot)) {
      return slot;
    }
  }
  return null;
}
