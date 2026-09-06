import type { PartSlot } from '../content/schemas';
import { battleRandom } from './random';
import type { BattleContext, CombatantSnapshot } from './types';

const HIT_ORDER: PartSlot[] = ['head', 'rightArm', 'leftArm', 'legs'];

/** Actor contact comes first. Visible sprite limbs never determine which armor is selected. */
export function selectHitPart(
  context: BattleContext,
  target: CombatantSnapshot,
  guarded: boolean,
  headBias = 0,
  source = target,
): PartSlot {
  if (guarded) {
    let selected: PartSlot = 'head';
    let maximum = 0;
    for (const slot of HIT_ORDER.slice(1)) {
      if (target.parts[slot].currentArmor >= maximum && !target.parts[slot].destroyed) {
        maximum = target.parts[slot].currentArmor;
        selected = slot;
      }
    }
    return selected;
  }
  const mask =
    (target.parts.rightArm.destroyed ? 4 : 0) |
    (target.parts.leftArm.destroyed ? 2 : 0) |
    (target.parts.legs.destroyed ? 1 : 0);
  const weights = [...context.content.rules[context.setup.rulesId]!.original.partWeights[mask]!];
  const preferences = context.content.medals[source.medalId]!.preferredParts;
  for (const [index, slot] of HIT_ORDER.entries()) {
    if (preferences.includes(slot)) {
      weights[index] = weights[index]! * 2;
    }
  }
  weights[0] = weights[0]! + headBias;
  let draw =
    (battleRandom(context) + battleRandom(context) + battleRandom(context)) %
    weights.reduce((sum, value) => sum + value, 0);
  for (const [index, weight] of weights.entries()) {
    if (draw < weight) {
      return HIT_ORDER[index]!;
    }
    draw -= weight;
  }
  return 'head';
}
