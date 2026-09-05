import type { RuntimeAbility } from '../content/catalog';
import { hitPart, worldRegion } from './collisions';
import { applyDamage } from './damage';
import { spawnProjectile } from './projectiles';
import { TICKS_PER_SECOND } from './timing';
import type { AttackState, BattleContext, CombatantCommand, CombatantSnapshot } from './types';

export function updateAttack(
  context: BattleContext,
  combatant: CombatantSnapshot,
  command: CombatantCommand,
) {
  tickCooldowns(combatant);

  if (combatant.knockedOut) {
    return;
  }

  updateGuardAndCharge(context, combatant, command);

  if (
    !combatant.attack &&
    !combatant.guarding &&
    !combatant.charging &&
    combatant.staggerTicks === 0
  ) {
    tryStartAttack(context, combatant, command);
  }

  advanceAttack(context, combatant);
}

function tickCooldowns(combatant: CombatantSnapshot) {
  for (const part of Object.values(combatant.parts)) {
    if (part.cooldownTicks > 0) {
      part.cooldownTicks--;
    }
  }

  if (combatant.staggerTicks > 0) {
    combatant.staggerTicks--;
  }
}

function updateGuardAndCharge(
  context: BattleContext,
  combatant: CombatantSnapshot,
  command: CombatantCommand,
) {
  const rules = context.content.rules[context.setup.rulesId]!;
  const ready = !combatant.attack && combatant.staggerTicks === 0;
  combatant.guarding = command.guardHeld && ready;
  combatant.charging = command.chargeHeld && combatant.grounded && ready && !combatant.guarding;

  if (combatant.charging) {
    combatant.specialMeter = Math.min(
      rules.specialMaximum,
      combatant.specialMeter + rules.chargePerSecond / TICKS_PER_SECOND,
    );
  }
}

/** Input priority is intentional when several attacks are pressed on the same tick. */
function requestedAttackSlot(command: CombatantCommand): AttackState['slot'] | null {
  if (command.specialPressed) {
    return 'special';
  }

  if (command.headPressed) {
    return 'head';
  }

  if (command.rightArmPressed) {
    return 'rightArm';
  }

  if (command.leftArmPressed) {
    return 'leftArm';
  }

  return null;
}

function tryStartAttack(
  context: BattleContext,
  combatant: CombatantSnapshot,
  command: CombatantCommand,
) {
  const slot = requestedAttackSlot(command);

  if (!slot) {
    return;
  }

  const part = slot === 'special' ? null : combatant.parts[slot];
  const abilityId =
    slot === 'special'
      ? context.content.characters[combatant.characterId]!.specialAbilityId
      : context.content.parts[part!.definitionId]!.abilityId;
  const ability = abilityId ? context.content.abilities[abilityId] : undefined;

  if (!ability || combatant.specialMeter < ability.specialCost) {
    return;
  }

  if (
    part &&
    (part.destroyed ||
      part.cooldownTicks > 0 ||
      (ability.maxUses > 0 && part.uses >= ability.maxUses))
  ) {
    return;
  }

  combatant.specialMeter -= ability.specialCost;
  combatant.attack = { abilityId: ability.id, slot, age: 0, fired: false, hitIds: [] };

  if (part) {
    part.uses++;
    part.cooldownTicks = ability.startupTicks + ability.activeTicks + ability.recoveryTicks;
  }

  context.events.push({
    type: slot === 'special' ? 'specialActivated' : 'attackStarted',
    tick: context.state.tick,
    combatantId: combatant.id,
    abilityId: ability.id,
    x: combatant.x,
    y: combatant.y + 1.4,
    facing: combatant.facing,
  });
}

function advanceAttack(context: BattleContext, combatant: CombatantSnapshot) {
  const attack = combatant.attack;

  if (!attack) {
    return;
  }

  const ability = context.content.abilities[attack.abilityId]!;
  const activeEnd = ability.startupTicks + ability.activeTicks;
  const isActive = attack.age >= ability.startupTicks && attack.age < activeEnd;

  if (isActive) {
    if (ability.delivery === 'projectile' && !attack.fired) {
      spawnProjectile(context, combatant, ability);
      attack.fired = true;
    } else if (ability.delivery === 'melee') {
      resolveMeleeHits(context, combatant, attack, ability);
    }
  }

  attack.age++;

  if (attack.age >= activeEnd + ability.recoveryTicks) {
    combatant.attack = null;
  }
}

function resolveMeleeHits(
  context: BattleContext,
  attacker: CombatantSnapshot,
  attack: AttackState,
  ability: RuntimeAbility,
) {
  const hitbox = worldRegion(attacker, ability.hitbox);

  for (const target of context.state.combatants) {
    if (
      target.teamId === attacker.teamId ||
      target.knockedOut ||
      attack.hitIds.includes(target.id)
    ) {
      continue;
    }

    const part = hitPart(
      target,
      context.content.characters[target.characterId]!.hitRegions,
      hitbox,
    );

    if (part) {
      attack.hitIds.push(target.id);
      applyDamage(context, target, part, attacker, ability, attacker.facing);
    }
  }
}
