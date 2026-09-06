import { describe, expect, it } from 'vitest';

import { createBattle, emptyCommand } from '../src/battle-core';
import { spawnProjectile, updateProjectiles } from '../src/battle-core/projectiles';
import { activateMedaforce, resolveSpecialSupport } from '../src/battle-core/specials';
import {
  installStatus,
  repairPart,
  statusCommand,
  triggerTrap,
  updateStatuses,
} from '../src/battle-core/statuses';
import { resolveSupport } from '../src/battle-core/support-effects';
import type { BattleContext } from '../src/battle-core/types';
import { resolveWeaponHit } from '../src/battle-core/weapon-impact';
import { content, setup } from './helpers';

function fixture(): BattleContext {
  return {
    content,
    setup,
    state: createBattle({ content, setup }).getSnapshot(),
    events: [],
    nextEntityId: 1,
    rngState: setup.seed,
  };
}
const abilityOf = (type: number) =>
  Object.values(content.abilities).find(
    (ability) => ability.abilityKind !== 'special' && ability.original.actionType === type,
  )!;

describe('full AX equipment behavior', () => {
  it('has 30 distinct four-part loadouts, 120 original parts and 12 complete medals', () => {
    expect(Object.keys(content.characters)).toHaveLength(30);
    expect(Object.keys(content.parts)).toHaveLength(120);
    expect(Object.keys(content.medals)).toHaveLength(12);
    expect(
      new Set(Object.values(content.characters).map((character) => character.originalSetId)).size,
    ).toBe(30);
    for (let type = 0; type < 35; type++) {
      expect(abilityOf(type), `action ${type}`).toBeDefined();
    }
  });
  it('status shots attach their effect without minimum-damage armor loss', () => {
    const context = fixture();
    const [source, target] = context.state.combatants;
    const before = target!.parts.head.currentArmor;
    resolveWeaponHit(context, target!, 'head', source!, abilityOf(22), 1);
    expect(target!.parts.head.currentArmor).toBe(before);
    expect(target!.harmfulStatus?.kind).toBe('confusion');
  });
  it('burning cannot destroy a part and ticks on the global cadence', () => {
    const context = fixture();
    const actor = context.state.combatants[0]!;
    actor.parts.rightArm.currentArmor = 3;
    installStatus(context, actor, actor, 'burning', 20, 'rightArm');
    context.state.tick = 89;
    updateStatuses(context, actor);
    expect(actor.parts.rightArm.currentArmor).toBe(3);
    context.state.tick = 90;
    updateStatuses(context, actor);
    expect(actor.parts.rightArm.currentArmor).toBe(1);
    expect(actor.parts.rightArm.destroyed).toBe(false);
  });
  it('a trap damages the matching firing arm exactly once and ignores other categories', () => {
    const context = fixture();
    const [source, target] = context.state.combatants;
    installStatus(context, target!, source!, 'melee-trap', 12);
    expect(triggerTrap(context, target!, 'rightArm', abilityOf(0))).toBe(false);
    const before = target!.parts.rightArm.currentArmor;
    expect(triggerTrap(context, target!, 'rightArm', abilityOf(7))).toBe(true);
    expect(target!.parts.rightArm.currentArmor).toBe(before - 12);
    expect(triggerTrap(context, target!, 'rightArm', abilityOf(7))).toBe(false);
  });
  it('Recovery heals an injured surviving part, while Revive restores only destroyed limbs', () => {
    const context = fixture();
    const actor = context.state.combatants[0]!;
    actor.parts.head.currentArmor = 10;
    actor.parts.rightArm.currentArmor = 0;
    actor.parts.rightArm.destroyed = true;
    repairPart(context, actor, 12);
    expect(actor.parts.head.currentArmor).toBe(22);
    expect(actor.parts.rightArm.destroyed).toBe(true);
    resolveSupport(context, actor, abilityOf(19), 'head');
    expect(actor.parts.rightArm.destroyed).toBe(false);
    expect(actor.parts.rightArm.currentArmor).toBeGreaterThan(0);
    actor.parts.head.currentArmor = 0;
    actor.knockedOut = true;
    repairPart(context, actor, 100, true);
    expect(actor.parts.head.currentArmor).toBe(0);
  });
  it('ordinary damage is blocked by Full Defense, but harmful status can still attach', () => {
    const context = fixture();
    const [source, target] = context.state.combatants;
    installStatus(context, target!, target!, 'full-defense', 12);
    const hp = target!.parts.head.currentArmor;
    resolveWeaponHit(context, target!, 'head', source!, abilityOf(0), 1);
    expect(target!.parts.head.currentArmor).toBe(hp);
    resolveWeaponHit(context, target!, 'head', source!, abilityOf(24), 1);
    expect(target!.harmfulStatus?.kind).toBe('indefensible');
  });
  it('passive optical absorption uses the equipped right arm and does not reflect a beam', () => {
    const context = fixture();
    const [source, target] = context.state.combatants;
    target!.parts.rightArm.definitionId = 'gorem-2-right-arm';
    const hp = target!.parts.head.currentArmor;
    resolveWeaponHit(context, target!, 'head', source!, abilityOf(4), 1);
    expect(target!.parts.head.currentArmor).toBe(hp);
    expect(context.state.projectiles).toHaveLength(0);
  });
  it('transformation preserves armor, uses a new runtime part, and expires without changing content', () => {
    const context = fixture();
    const actor = context.state.combatants[0]!;
    const id = actor.parts.rightArm.definitionId;
    actor.parts.rightArm.currentArmor = 12;
    resolveSupport(context, actor, abilityOf(27), 'rightArm');
    expect(actor.parts.rightArm.currentArmor).toBe(12);
    expect(actor.parts.rightArm.transformationTicks).toBe(900);
    for (let tick = 1; tick <= 900; tick++) {
      context.state.tick = tick;
      updateStatuses(context, actor);
    }
    expect(actor.parts.rightArm.definitionId).toBe(id);
    expect(content.parts[id]!.armor).toBe(35);
  });
  it('confusion rotates directional attack chords, not just horizontal movement', () => {
    const context = fixture();
    const actor = context.state.combatants[0]!;
    installStatus(context, actor, actor, 'confusion', 1);
    actor.harmfulStatus!.remainingTicks = 32;
    const command = statusCommand(actor, { ...emptyCommand(), moveX: 1, rightArmPressed: true });
    expect(command.moveX).toBe(0);
    expect(command.dropHeld).toBe(true);
    expect(command.leftArmPressed).toBe(true);
    expect(command.rightArmPressed).toBe(false);
  });
  it('Laser passes through a hit target once, while Beam stops', () => {
    for (const type of [3, 4]) {
      const context = fixture();
      const [source, target] = context.state.combatants;
      source!.x = -4;
      source!.y = 0;
      target!.x = -1;
      target!.y = 0;
      spawnProjectile(context, source!, abilityOf(type));
      context.state.tick = 1;
      updateProjectiles(context);
      expect(context.state.projectiles.length).toBe(type === 3 ? 1 : 0);
      if (type === 3) {
        expect(context.state.projectiles[0]!.hitIds).toContain(target!.id);
      }
    }
  });
  it('Giga Break captures doubled weapon power in projectiles until its locked buff expires', () => {
    const context = fixture();
    const actor = context.state.combatants[0]!;
    activateMedaforce(context, actor, content.abilities['medaforce-5']!);
    expect(actor.beneficialStatus?.kind).toBe('amplify');
    expect(actor.beneficialStatus?.locked).toBe(true);
    spawnProjectile(context, actor, abilityOf(0));
    expect(context.state.projectiles[0]!.powerMultiplier).toBe(2);
  });
  it('Plus Counter restores four head uses, bounded by ammunition capacity', () => {
    const context = fixture();
    const actor = context.state.combatants[0]!;
    const friend = context.state.combatants.find(
      (other) => other.teamId === actor.teamId && other.id !== actor.id,
    )!;
    actor.parts.head.uses = 3;
    friend.parts.head.uses = 2;
    resolveSpecialSupport(context, actor, content.abilities['medaforce-6']!);
    expect(actor.parts.head.uses + friend.parts.head.uses).toBe(1);
    resolveSpecialSupport(context, actor, content.abilities['medaforce-6']!);
    expect(actor.parts.head.uses + friend.parts.head.uses).toBe(0);
  });
  it('All Recovery waits 90 updates and uses each recipient’s last activated special', () => {
    const context = fixture();
    const actor = context.state.combatants[0]!;
    const friend = context.state.combatants.find(
      (other) => other.teamId === actor.teamId && other.id !== actor.id,
    )!;
    friend.parts.head.currentArmor = 1;
    friend.parts.leftArm.currentArmor = 0;
    friend.parts.leftArm.destroyed = true;
    activateMedaforce(context, actor, content.abilities['medaforce-2']!);
    expect(context.state.supportEffects[0]!.remainingTicks).toBe(90);
    expect(friend.parts.head.currentArmor).toBe(1);
    expect(actor.lastActivatedSpecialId).toBe('medaforce-2');
    expect(friend.lastActivatedSpecialId).toBe('medaforce-0');
    resolveSpecialSupport(context, actor, content.abilities['medaforce-2']!);
    const stats = content.medals[friend.medalId]!.levels[friend.medalLevel - 1]!;
    expect(friend.parts.head.currentArmor).toBe(
      Math.min(friend.parts.head.maxArmor, 1 + Math.trunc((20 * (50 + stats.shooting)) / 50)),
    );
    expect(friend.parts.leftArm.destroyed).toBe(true);
  });
  it.each(Array.from({ length: 12 }, (_, index) => index))(
    'Medaforce %i activates and clears the startup freeze',
    (id) => {
      const context = fixture();
      const actor = context.state.combatants[0]!;
      actor.specialMeter = 51;
      actor.displayMeter = 51;
      context.state.specialFreezeTicks = 60;
      activateMedaforce(context, actor, content.abilities[`medaforce-${id}`]!);
      expect(actor.specialMeter).toBe(0);
      expect(context.state.specialFreezeTicks).toBe(0);
      expect(JSON.parse(JSON.stringify(context.state))).toEqual(context.state);
    },
  );
});
