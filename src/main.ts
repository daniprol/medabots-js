import './ui/styles.css';
import { loadBundledContent } from './content/load-bundled-content';
import { createBattle, type BattleSetup, type BattleSnapshot } from './battle-core';
import { BattleRenderer } from './render/renderer';
import { createMatchSetup, quickAssignments } from './ui/match-setup';
import { mountLocalBattle } from './battle-session/mount-local-battle';
import type { Assignments } from './input/bindings';
import { element } from './ui/dom';
import type { ContentCatalog } from './content/build-content-catalog';
export type BattleDebug = {
  getSnapshot: () => BattleSnapshot | null;
  restart: (options?: {
    roundTimeMs?: number;
    assignments?: Assignments;
    setup?: BattleSetup;
  }) => void;
  returnToSetup: () => void;
  pause: () => void;
  resume: () => void;
};
declare global {
  interface Window {
    __BATTLE_DEBUG__?: BattleDebug;
  }
}
const root = document.querySelector<HTMLDivElement>('#app')!;
try {
  const content = loadBundledContent();
  const defaultSetup: BattleSetup = content.matches['local-default']!;
  let saved = quickAssignments();
  let currentSetup = defaultSetup;
  let activeContent = content;
  let mounted: ReturnType<typeof mountLocalBattle> | undefined;
  let disposeSetup: (() => void) | undefined;
  function start(assignments: Assignments, setup = currentSetup, gameContent = activeContent) {
    disposeSetup?.();
    disposeSetup = undefined;
    mounted?.dispose();
    saved = structuredClone(assignments);
    currentSetup = setup;
    activeContent = gameContent;
    mounted = mountLocalBattle({
      root,
      setup,
      assignments,
      content: gameContent,
      onComplete: () => {},
      onReturnToSetup: showSetup,
      onRematch: () => start(saved),
    });
  }
  function showSetup() {
    mounted?.dispose();
    mounted = undefined;
    disposeSetup?.();
    currentSetup = defaultSetup;
    activeContent = content;
    const viewport = element('div', 'viewport setup-viewport');
    root.append(viewport);
    const snapshot = createBattle({ setup: defaultSetup, content }).getSnapshot();
    const preview = structuredClone(snapshot);
    preview.combatants.forEach((c, i) => {
      c.x = [5.1, 11.2, 8.2, 14][i]!;
      c.y = i % 2 === 0 ? 0 : 4;
      c.facing = -1;
    });
    const renderer = new BattleRenderer(viewport, content, preview, []);
    const portraits = Object.fromEntries(
      snapshot.combatants.map((c) => [c.characterId, renderer.portrait(c.characterId)]),
    );
    let raf = 0,
      last = performance.now();
    function animate(now: number) {
      renderer.render(preview, preview, 1, Math.min((now - last) / 1000, 0.05));
      last = now;
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    const ui = createMatchSetup(
      root,
      content,
      defaultSetup,
      portraits,
      (a) => start(a, defaultSetup, content),
      saved,
    );
    disposeSetup = () => {
      cancelAnimationFrame(raf);
      ui.dispose();
      renderer.dispose();
      viewport.remove();
    };
  }
  if (import.meta.env.DEV) {
    window.__BATTLE_DEBUG__ = {
      getSnapshot: () => mounted?.getSnapshot() ?? null,
      restart: (options = {}) => {
        let gameContent: ContentCatalog = content;
        const setup = options.setup ?? currentSetup;
        if (options.roundTimeMs !== undefined) {
          if (
            !Number.isFinite(options.roundTimeMs) ||
            options.roundTimeMs < 100 ||
            options.roundTimeMs > 600000
          )
            throw new Error('Debug roundTimeMs must be 100–600000');
          gameContent = {
            ...content,
            rules: {
              ...content.rules,
              [setup.rulesId]: {
                ...content.rules[setup.rulesId]!,
                roundTimeMs: options.roundTimeMs,
                roundTicks: Math.ceil((options.roundTimeMs * 60) / 1000),
              },
            },
          };
        }
        start(options.assignments ?? saved, setup, gameContent);
      },
      returnToSetup: showSetup,
      pause: () => mounted?.pause(),
      resume: () => mounted?.resume(),
    };
  }
  showSetup();
} catch (error) {
  const panel = element('section', 'error-panel');
  panel.append(
    element('h1', '', 'Unable to load Robattle'),
    element('pre', '', error instanceof Error ? error.message : String(error)),
  );
  root.replaceChildren(panel);
  console.error(error);
}
