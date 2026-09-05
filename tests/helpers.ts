import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'jsonc-parser';
import {
  buildContentCatalog,
  type RawDocument,
  type ContentCatalog,
} from '../src/content/build-content-catalog';
import {
  createBattle,
  emptyCommand,
  type BattleSetup,
  type BattleSnapshot,
  type CommandFrame,
  type CombatantCommand,
} from '../src/battle-core';
export function rawContent(dir = 'game-data'): RawDocument[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? rawContent(join(dir, entry.name))
      : entry.name.endsWith('.jsonc')
        ? [{ path: join(dir, entry.name), text: readFileSync(join(dir, entry.name), 'utf8') }]
        : [],
  );
}
export const documents = rawContent();
export const content = buildContentCatalog(documents);
export const setup: BattleSetup = content.matches['local-default']!;
export function fixture(change: (def: Record<string, any>) => void = () => {}) {
  return buildContentCatalog(
    documents.map((doc) => {
      const def = parse(doc.text);
      change(def);
      return { ...doc, text: JSON.stringify(def) };
    }),
  );
}
export function closeArena(partnerTarget = false) {
  return fixture((def) => {
    if (def.kind === 'arena')
      def.spawns = [
        { x: -2, y: 0 },
        { x: -13, y: 0 },
        { x: partnerTarget ? 14 : 2, y: 0 },
        { x: partnerTarget ? 2 : 14, y: 0 },
      ];
  });
}
export function frame(
  tick: number,
  commands: Record<string, Partial<CombatantCommand>> = {},
  s: BattleSetup = setup,
): CommandFrame {
  return {
    tick,
    commands: Object.fromEntries(
      s.teams
        .flatMap((t) => t.combatants)
        .map((c) => [c.instanceId, { ...emptyCommand(), ...commands[c.instanceId] }]),
    ),
  };
}
export function runBattleScenario({
  content: c = content,
  setup: s = setup,
  maxTicks = 10800,
  commandFrames,
}: {
  content?: ContentCatalog;
  setup?: BattleSetup;
  maxTicks?: number;
  commandFrames?: (snapshot: BattleSnapshot) => CommandFrame;
}) {
  const battle = createBattle({ setup: s, content: c });
  const recent: CommandFrame[] = [];
  const events = [];
  try {
    for (let i = 1; i <= maxTicks && !battle.getResult(); i++) {
      const f = commandFrames?.(battle.getSnapshot()) ?? frame(i, {}, s);
      recent.push(f);
      if (recent.length > 4) recent.shift();
      battle.step(f);
      events.push(...battle.drainEvents());
    }
  } catch (error) {
    throw new Error(
      `Seed ${s.seed}, tick ${battle.getSnapshot().tick}\nRecent frames ${JSON.stringify(recent)}\nSnapshot ${JSON.stringify(battle.getSnapshot())}`,
      { cause: error },
    );
  }
  return { battle, snapshot: battle.getSnapshot(), result: battle.getResult(), events };
}
