import type { BattleResult, BattleSetup } from '../battle-core';
import type { ContentCatalog } from '../content/catalog';
import type { Assignments } from '../input/bindings';
import { BattleAudio } from '../render/audio';
import { BattleRenderer } from '../render/renderer';
import { controlsStrip } from '../ui/controls';
import { element, button } from '../ui/dom';
import { createHUD } from '../ui/hud';
import { pauseOverlay, resultOverlay } from '../ui/overlays';
import { LocalBattleSession } from './local-battle-session';

export type MountBattleOptions = {
  root: HTMLElement;
  setup: BattleSetup;
  assignments: Assignments;
  content: ContentCatalog;
  onComplete: (result: BattleResult) => void;
  onReturnToSetup?: () => void;
  onRematch?: () => void;
};

export function mountLocalBattle(options: MountBattleOptions) {
  const { root, setup, content } = options;
  const screen = element('section', 'battle-screen');
  root.append(screen);

  const viewport = element('div', 'viewport');
  screen.append(viewport);

  const session = new LocalBattleSession(setup, options.assignments, content);
  const assignments = session.assignments;
  const renderer = new BattleRenderer(
    viewport,
    content,
    session.current,
    Object.entries(assignments)
      .filter(([, a]) => a.type !== 'ai')
      .map(([id]) => id),
  );
  const portraits = Object.fromEntries(
    session.current.combatants.map((c) => [c.characterId, renderer.portrait(c.characterId)]),
  );
  const hud = createHUD(screen, content, session.current, assignments, portraits, () =>
    session.pause(),
  );
  const controls = controlsStrip(content, assignments);
  screen.append(controls);

  const audio = new BattleAudio();
  const sound = button(
    'SOUND ON',
    () => {
      sound.textContent = audio.toggle() ? 'SOUND ON' : 'SOUND OFF';
    },
    'sound-button',
  );
  sound.setAttribute('aria-label', 'Toggle sound');
  screen.append(sound);
  window.addEventListener('keydown', audio.unlock);
  window.addEventListener('pointerdown', audio.unlock);
  audio.unlock();

  let pause: ReturnType<typeof pauseOverlay> | undefined;
  let result: ReturnType<typeof resultOverlay> | undefined;
  let completed = false;
  let raf = 0;
  let last: number | undefined;
  let resultDelay = 0;
  let disposed = false;
  let lastHudTick = -1;
  let idleFrames = 0;
  const toSetup = () => options.onReturnToSetup?.();

  function animate(now: number) {
    if (disposed) {
      return;
    }

    // Start from the first RAF timestamp: a slow mount can finish after its queued frame timestamp.
    const delta = last === undefined ? 0 : Math.max(0, Math.min((now - last) / 1000, 0.1));
    last = now;
    session.advance(delta);

    const events = session.drainEvents();
    audio.play(events);

    if ((!session.paused && resultDelay < 1) || idleFrames++ % 10 === 0) {
      renderer.render(
        session.previous,
        session.current,
        session.paused || session.current.result ? 1 : session.alpha,
        session.paused ? 0 : delta,
        events,
      );
    }

    if (session.current.tick !== lastHudTick) {
      hud.update(session.current);
      lastHudTick = session.current.tick;
    }

    if (session.paused) {
      if (!pause) {
        pause = pauseOverlay(screen, () => session.resume(), toSetup);
      }

      pause.update(session.pauseReason);
    } else {
      pause?.dispose();
      pause = undefined;
    }

    if (session.current.result) {
      if (!completed) {
        completed = true;
        options.onComplete(session.getResult()!);

        if (disposed) {
          return;
        }
      }

      resultDelay += delta;

      if (resultDelay > 0.75 && !result) {
        result = resultOverlay(screen, session.getResult()!, () => options.onRematch?.(), toSetup);
      }
    }

    raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate);

  return {
    getSnapshot: () => session.getSnapshot(),
    pause: () => session.pause(),
    resume: () => session.resume(),
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      session.dispose();
      audio.dispose();
      window.removeEventListener('keydown', audio.unlock);
      window.removeEventListener('pointerdown', audio.unlock);
      renderer.dispose();
      hud.dispose();
      pause?.dispose();
      result?.dispose();
      screen.remove();
    },
  };
}
