import type { RuntimeAbility } from '../content/catalog';
import type { PartSlot } from '../content/schemas';
import { battleRandom } from './random';
import { installStatus, recoverySeverity, repairPart, supportPower } from './statuses';
import type { BattleContext, CombatantSnapshot } from './types';

export function isSupport(ability: RuntimeAbility) {
  const type = ability.original.actionType;
  return (
    ability.abilityKind !== 'special' && ((type >= 15 && type <= 21) || (type >= 27 && type <= 30))
  );
}
export function resolveSupport(
  context: BattleContext,
  source: CombatantSnapshot,
  ability: RuntimeAbility,
  slot: PartSlot | 'special',
) {
  const type = ability.original.actionType;
  const magnitude = supportPower(context, source, type === 16 ? 12 : ability.damage);
  const friends = context.state.combatants.filter(
    (actor) => actor.teamId === source.teamId && !actor.knockedOut,
  );
  friends.sort(
    (a, b) =>
      recoverySeverity(b) - recoverySeverity(a) ||
      Number(b.role === 'leader') - Number(a.role === 'leader'),
  );
  const target = friends[0] ?? source;
  if (type === 15 || type === 18) {
    const recipient = friends.find((actor) => !actor.beneficialStatus) ?? target;
    installStatus(
      context,
      recipient,
      source,
      type === 15 ? 'defense' : 'regeneration',
      Math.max(2, magnitude),
    );
  } else if (type === 16) {
    installStatus(context, source, source, 'full-defense', magnitude);
  } else if (type === 17) {
    repairPart(context, target, Math.max(2, magnitude));
  } else if (type === 19) {
    const recipient = friends.find((actor) =>
      Object.entries(actor.parts).some(([key, part]) => key !== 'head' && part.destroyed),
    );
    if (recipient) {
      // Revive selects a limb using the same draw as repairPart; scale its own maximum armor.
      const cursor = context.state.randomCursor;
      const limbs = ['rightArm', 'leftArm', 'legs'] as const;
      const start = battleRandom(context) % 3;
      const limb = [0, 1, 2]
        .map((offset) => limbs[(start + offset) % 3]!)
        .find((key) => recipient.parts[key].destroyed)!;
      context.state.randomCursor = cursor;
      repairPart(
        context,
        recipient,
        supportPower(context, source, Math.floor(recipient.parts[limb].maxArmor / 4)),
        true,
      );
    }
  } else if (type === 20) {
    const recipient =
      friends.find((actor) => actor.id !== source.id && actor.harmfulStatus) ?? source;
    recipient.harmfulStatus = null;
  } else if (type === 21) {
    for (const enemy of context.state.combatants.filter(
      (actor) => actor.teamId !== source.teamId,
    )) {
      installStatus(context, enemy, source, 'meter-control', magnitude);
    }
  } else if ((type === 27 || type === 28) && slot !== 'special') {
    const candidates = context.content.rules[context.setup.rulesId]!.original.transformCandidates;
    const pool =
      type === 27
        ? candidates.change
        : slot === 'head'
          ? candidates.attackHead
          : candidates.attackArm;
    const id = pool[battleRandom(context) % pool.length]!;
    const replacement = Object.values(context.content.parts).find(
      (part) => part.slot === slot && part.originalId === id,
    )!;
    source.parts[slot].definitionId = replacement.id;
    source.parts[slot].transformationTicks = 900;
  } else if (type === 29 || type === 30) {
    for (const actor of friends) {
      installStatus(context, actor, source, type === 29 ? 'scouting' : 'speed', magnitude);
    }
  }
}
