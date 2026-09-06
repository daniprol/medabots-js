import type { RuntimeAbility } from '../content/catalog';
import { movePixels } from './ax-movement';
import { overlaps, worldRegion } from './collisions';
import { applyDamage } from './damage';
import { selectHitPart } from './part-selection';
import { spawnProjectile } from './projectiles';
import type { AttackState, BattleContext, CombatantCommand, CombatantSnapshot } from './types';

export function updateAttack(
  context: BattleContext,
  actor: CombatantSnapshot,
  command: CombatantCommand,
) {
  if (actor.knockedOut) {
    return;
  }
  const rules = context.content.rules[context.setup.rulesId]!;
  if (actor.supportTicks > 0 && --actor.supportTicks === 0) {
    actor.supportStatus = 'none';
    actor.supportMagnitude = 0;
  }
  if (actor.invulnerabilityTicks > 0) {
    actor.invulnerabilityTicks--;
  }
  let pendingRefill = false;
  for (const slot of ['head', 'rightArm', 'leftArm'] as const) {
    const part = actor.parts[slot];
    const ability = partAbility(context, actor, slot);
    const exhausted = slot === 'head' && part.uses >= ability.maxUses;
    const increment = exhausted
      ? 0
      : part.destroyed && slot !== 'head'
        ? 16
        : ability.original.refill;
    if (part.readiness < 320 && increment > 0) {
      pendingRefill = true;
      if (actor.attack?.slot !== slot) {
        part.readiness = Math.min(320, part.readiness + increment);
      }
    }
    part.cooldownTicks = Math.ceil((320 - part.readiness) / Math.max(1, increment));
  }
  if (!pendingRefill) {
    if (++actor.passiveChargeTicks >= rules.original.passiveChargeTicks) {
      actor.passiveChargeTicks = 0;
      actor.specialMeter = Math.min(51, actor.specialMeter + 1);
    }
  }
  actor.guarding = command.guardHeld && !actor.attack && actor.staggerTicks === 0;
  const idle =
    actor.grounded &&
    !actor.attack &&
    !actor.guarding &&
    command.moveX === 0 &&
    !command.jumpPressed;
  actor.idleTicks = idle ? actor.idleTicks + 1 : 0;
  actor.charging = actor.idleTicks >= rules.original.idleChargeTicks && actor.specialMeter < 51;
  if (
    actor.charging &&
    (actor.idleTicks - rules.original.idleChargeTicks + 1) % rules.original.chargePulseTicks === 0
  ) {
    actor.specialMeter = Math.min(51, actor.specialMeter + 1);
  }
  if (actor.displayMeter < actor.specialMeter) {
    actor.displayMeter++;
  } else if (actor.displayMeter > actor.specialMeter) {
    actor.displayMeter--;
  }

  if (!actor.attack && !actor.guarding && actor.staggerTicks === 0) {
    const slot = command.specialPressed
      ? 'special'
      : command.headPressed
        ? 'head'
        : command.rightArmPressed
          ? 'rightArm'
          : command.leftArmPressed
            ? 'leftArm'
            : null;
    if (slot) {
      startAttack(context, actor, slot);
    }
  }
  if (actor.attack?.slot === 'rightArm' && command.rightArmPressed && actor.attack.age > 1) {
    actor.attack.comboBuffered = true;
  }
  advanceAttack(context, actor, command);
}

export function partAbility(
  context: BattleContext,
  actor: CombatantSnapshot,
  slot: 'head' | 'rightArm' | 'leftArm',
) {
  if (actor.parts[slot].destroyed && slot !== 'head') {
    return context.content.abilities['frame-attack']!;
  }
  return context.content.abilities[
    context.content.parts[actor.parts[slot].definitionId]!.abilityId!
  ]!;
}

function startAttack(context: BattleContext, actor: CombatantSnapshot, slot: AttackState['slot']) {
  if (slot === 'legs') {
    return;
  }
  const special = slot === 'special';
  const ability = special
    ? context.content.abilities[context.content.characters[actor.characterId]!.specialAbilityId]!
    : partAbility(context, actor, slot);
  if (special ? actor.displayMeter < 51 : actor.parts[slot].readiness < 320) {
    return;
  }
  if (slot === 'head' && (actor.parts.head.destroyed || actor.parts.head.uses >= ability.maxUses)) {
    return;
  }
  actor.attack = {
    abilityId: ability.id,
    slot,
    age: 0,
    fired: false,
    contactFired: false,
    initialized: false,
    chargeTicks: 0,
    releasing: false,
    headBias: actor.supportStatus === 'scouting' ? actor.supportMagnitude : 0,
    comboStage: 0,
    comboBuffered: false,
    hitIds: [],
  };
  actor.charging = false;
  actor.idleTicks = 0;
  if (!special) {
    actor.parts[slot].uses++;
    actor.parts[slot].readiness = ability.original.readinessReset;
  } else {
    context.state.specialFreezeTicks = ability.original.shotTick + 1;
    context.state.projectiles = [];
    for (const other of context.state.combatants) {
      if (other.id !== actor.id) {
        other.attack = null;
      }
    }
  }
  context.events.push({
    type: special ? 'specialActivated' : 'attackStarted',
    tick: context.state.tick,
    combatantId: actor.id,
    abilityId: ability.id,
    x: actor.x,
    y: actor.y + 2,
    facing: actor.facing,
  });
}

export function advanceAttack(
  context: BattleContext,
  actor: CombatantSnapshot,
  command: CombatantCommand,
) {
  const attack = actor.attack;
  if (!attack) {
    return;
  }
  const ability = context.content.abilities[attack.abilityId]!;
  if (!attack.initialized) {
    if ((context.state.tick & 3) !== actor.actorIndex) {
      return;
    }
    attack.initialized = true;
  }
  const age = attack.age++;
  const original = ability.original;
  const timing = original.comboStages[attack.comboStage - 1] ?? original;
  if (original.family === 'scouting' || original.family === 'charge') {
    if (age === original.shotTick) {
      const legs = context.content.parts[actor.parts.legs.definitionId]!;
      const magnitude = Math.trunc(
        (ability.damage *
          (50 +
            (actor.parts.legs.destroyed ? 0 : legs.attackRanks[2]! * 2) +
            context.content.medals[actor.medalId]!.levels[actor.medalLevel - 1]!.support)) /
          50,
      );
      context.state.supportEffects.push({
        id: `support-${context.nextEntityId++}`,
        ownerId: actor.id,
        teamId: actor.teamId,
        family: original.family,
        magnitude,
        remainingTicks: original.family === 'scouting' ? 16 : 25,
      });
    }
  } else if (attack.slot === 'head' && original.actionType === 4) {
    if (age >= original.actionTicks && !attack.releasing) {
      if (command.attackHeld) {
        attack.chargeTicks++;
        return;
      }
      attack.releasing = true;
      attack.initialized = false;
      attack.age = 0;
      return;
    }
    if (attack.releasing && age === 0) {
      spawnProjectile(context, actor, ability, attack.chargeTicks >= 90 ? 2 : 1);
    }
    if (attack.releasing && age >= 3) {
      actor.attack = null;
    }
    return;
  } else {
    if (age === timing.contactTick && !attack.contactFired) {
      resolveMeleeHits(context, actor, attack, ability);
      attack.contactFired = true;
    }
    if (age === timing.shotTick && ability.delivery === 'projectile' && !attack.fired) {
      const count = original.family === 'barrage' ? 4 : 1;
      for (let index = 0; index < count; index++) {
        spawnProjectile(context, actor, ability, 1, index);
      }
      if (attack.slot === 'special') {
        context.state.specialFreezeTicks = 0;
        actor.specialMeter = 0;
        actor.displayMeter = 0;
        for (const part of Object.values(actor.parts)) {
          part.readiness = 0;
        }
      }
      attack.fired = true;
    }
  }
  if (attack.slot === 'head' && original.actionType === 2 && age >= 26 && age <= 30) {
    movePixels(context, actor, -actor.facing * (31 - age), 0);
  }
  if (attack.age >= timing.actionTicks) {
    if (
      attack.slot === 'rightArm' &&
      attack.comboBuffered &&
      attack.comboStage < original.comboStages.length &&
      [0, 7].includes(original.actionType)
    ) {
      attack.comboStage++;
      attack.comboBuffered = false;
      attack.age = 0;
      attack.initialized = false;
      attack.contactFired = false;
      attack.fired = false;
      attack.hitIds = [];
      actor.parts.rightArm.readiness = attack.comboStage === 1 ? 106 : 0;
    } else {
      actor.attack = null;
    }
  }
}

function resolveMeleeHits(
  context: BattleContext,
  attacker: CombatantSnapshot,
  attack: AttackState,
  ability: RuntimeAbility,
) {
  const hitbox = worldRegion(attacker, {
    ...ability.hitbox,
    x: 1.8,
    width: 3.375,
    height: ability.delivery === 'melee' ? 1.5 : 0.75,
  });
  for (const target of context.state.combatants) {
    if (
      target.teamId === attacker.teamId ||
      target.knockedOut ||
      attack.hitIds.includes(target.id) ||
      target.invulnerabilityTicks > 0
    ) {
      continue;
    }
    const body = { x: target.x, y: target.y + 2, width: 2, height: 4 };
    if (overlaps(body, hitbox)) {
      attack.hitIds.push(target.id);
      applyDamage(
        context,
        target,
        selectHitPart(
          context,
          target,
          target.guarding && target.facing !== attacker.facing,
          attack.headBias,
          attacker,
        ),
        attacker,
        ability,
        attacker.facing,
      );
    }
  }
}
