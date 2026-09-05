import { type BattleSetup, type BattleSnapshot } from './battle-core';

import './ui/styles.css';
import './ui/roster.css';
import { millisecondsToTicks } from './battle-core/timing';
import { mountLocalBattle } from './battle-session/mount-local-battle';
import type { ContentCatalog } from './content/catalog';
import { loadBundledContent } from './content/load-bundled-content';
import type { Assignments } from './input/bindings';
import { element } from './ui/dom';
import { createMatchSetup, quickAssignments } from './ui/match-setup';

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
  let savedAssignments = quickAssignments();
  let currentSetup = defaultSetup;
  let activeContent = content;
  let mountedBattle: ReturnType<typeof mountLocalBattle> | undefined;
  let disposeSetup: (() => void) | undefined;

  function start(assignments: Assignments, setup = currentSetup, gameContent = activeContent) {
    disposeSetup?.();
    disposeSetup = undefined;
    mountedBattle?.dispose();
    savedAssignments = structuredClone(assignments);
    currentSetup = setup;
    activeContent = gameContent;
    mountedBattle = mountLocalBattle({
      root,
      setup,
      assignments,
      content: gameContent,
      onComplete: () => {},
      onReturnToSetup: showSetup,
      onRematch: () => start(savedAssignments),
    });
  }

  function showSetup() {
    mountedBattle?.dispose();
    mountedBattle = undefined;
    disposeSetup?.();

    const menuContent = {
      ...content,
      keyboards: activeContent.keyboards,
      gamepads: activeContent.gamepads,
    };
    activeContent = menuContent;

    const setupMenu = createMatchSetup(
      root,
      menuContent,
      content,
      currentSetup,
      (assignments, setup, selectedContent) => start(assignments, setup, selectedContent),
      savedAssignments,
    );
    disposeSetup = () => setupMenu.dispose();
  }

  if (import.meta.env.DEV) {
    window.__BATTLE_DEBUG__ = {
      getSnapshot: () => mountedBattle?.getSnapshot() ?? null,
      restart: (options = {}) => {
        let gameContent: ContentCatalog = content;
        const setup = options.setup ?? currentSetup;

        if (options.roundTimeMs !== undefined) {
          if (
            !Number.isFinite(options.roundTimeMs) ||
            options.roundTimeMs < 100 ||
            options.roundTimeMs > 600000
          ) {
            throw new Error('Debug roundTimeMs must be 100–600000');
          }

          gameContent = {
            ...content,
            rules: {
              ...content.rules,
              [setup.rulesId]: {
                ...content.rules[setup.rulesId]!,
                roundTimeMs: options.roundTimeMs,
                roundTicks: millisecondsToTicks(options.roundTimeMs),
              },
            },
          };
        }

        start(options.assignments ?? savedAssignments, setup, gameContent);
      },
      returnToSetup: showSetup,
      pause: () => mountedBattle?.pause(),
      resume: () => mountedBattle?.resume(),
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
