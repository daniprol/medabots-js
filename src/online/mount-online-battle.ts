import { emptyCommand } from '../battle-core';
import type { ContentCatalog } from '../content/catalog';
import type { Assignments } from '../input/bindings';
import { InputManager } from '../input/input-manager';
import { BattleAudio } from '../render/audio';
import { BattleRenderer } from '../render/renderer';
import { controlsStrip } from '../ui/controls';
import { button, element, teamName } from '../ui/dom';
import type { FighterSource } from '../ui/fighter-card';
import { createHUD } from '../ui/hud';
import type { BattleConnection } from './battle-connection';
import { ONLINE_CONFIG } from './config';
import { BattleInput, copyCommand } from './protocol';
import { SnapshotBuffer } from './snapshot-buffer';

export function mountOnlineBattle(
  root: HTMLElement,
  connection: BattleConnection,
  content: ContentCatalog,
  assignment: Assignments[string],
  leave: () => void,
) {
  const room = connection.room;
  const player = room.state.players.get(room.sessionId)!;
  const initial = connection.snapshot!;
  const assignments: Assignments = { [player.combatantId]: assignment };
  const sources: Record<string, FighterSource> = Object.fromEntries(
    Array.from(room.state.players, ([id, p]) => [
      p.combatantId,
      id === room.sessionId ? assignment : { type: 'remote' as const, name: p.name },
    ]),
  );
  const screen = element('section', 'battle-screen');
  const viewport = element('div', 'viewport');
  screen.append(viewport);
  root.append(screen);
  const renderer = new BattleRenderer(viewport, content, initial, [player.combatantId]);
  const portraits = Object.fromEntries(
    initial.combatants.map((actor) => [actor.characterId, renderer.portrait(actor.characterId)]),
  );
  let menu: HTMLElement | undefined;
  let controlsEnabled = true;
  const input = new InputManager(assignments, content);
  const wire = room.input({ type: BattleInput });
  const neutralize = () => {
    input.clear();
    if (connection.status === 'connected') {
      Object.assign(wire.data, emptyCommand());
      wire.send();
    }
  };
  const showMenu = () => {
    if (menu) {
      return;
    }
    controlsEnabled = false;
    neutralize();
    menu = element('section', 'modal-backdrop');
    const panel = element('div', 'modal-panel');
    panel.append(
      element('h1', '', 'ONLINE BATTLE'),
      element('p', '', 'The battle continues while this menu is open.'),
      button(
        'Resume controls',
        () => {
          menu?.remove();
          menu = undefined;
          input.clear();
          controlsEnabled = true;
        },
        'button primary',
      ),
      button('Leave battle', leave, 'button ghost'),
    );
    menu.append(panel);
    screen.append(menu);
  };
  const hud = createHUD(screen, content, initial, sources, portraits, showMenu, 'Menu');
  screen.append(controlsStrip(content, assignments));
  const status = element('div', 'online-battle-status');
  status.setAttribute('role', 'status');
  const statusLabel = element('span');
  const countdown = element('strong', 'online-countdown-number');
  status.append(statusLabel, countdown);
  status.hidden = true;
  screen.append(status);
  const audio = new BattleAudio();
  const sound = button(
    'SOUND ON',
    () => {
      sound.textContent = audio.toggle() ? 'SOUND ON' : 'SOUND OFF';
    },
    'sound-button',
  );
  screen.append(sound);
  window.addEventListener('keydown', audio.unlock);
  window.addEventListener('pointerdown', audio.unlock);
  audio.unlock();
  const blur = () => {
    controlsEnabled = false;
    neutralize();
  };
  const focus = () => {
    input.clear();
    controlsEnabled = !menu;
  };
  const visibility = () => {
    if (document.hidden) {
      blur();
    } else {
      focus();
    }
  };
  window.addEventListener('blur', blur);
  window.addEventListener('focus', focus);
  document.addEventListener('visibilitychange', visibility);

  const buffer = new SnapshotBuffer(
    room.state.simulationHz,
    ONLINE_CONFIG.interpolationDelayMs,
    ONLINE_CONFIG.maxSnapshotBuffer,
  );
  buffer.push(initial, performance.now());
  let lastStatus = connection.status;
  const unsubscribe = connection.subscribe(() => {
    if (connection.status !== lastStatus) {
      input.clear();
      buffer.clear();
      lastStatus = connection.status;
    }
    if (connection.snapshot) {
      buffer.push(connection.snapshot, performance.now());
    }
  });
  const inputTimer = window.setInterval(() => {
    const missing = input.poll();
    const command = input.read(player.combatantId);
    if (command?.pause) {
      showMenu();
    }
    if (connection.status === 'connected' && room.state.phase === 'fighting') {
      Object.assign(
        wire.data,
        controlsEnabled && !document.hidden && !missing.length && command
          ? copyCommand(command.command)
          : emptyCommand(),
      );
      wire.send();
    }
    input.endTick();
    const message =
      connection.status === 'reconnecting'
        ? 'Connection lost · Reconnecting…'
        : connection.status === 'closed'
          ? 'Disconnected · Use Menu to return to the server browser'
          : room.state.phase === 'preparing'
            ? 'Loading arena…'
            : room.state.phase === 'countdown'
              ? 'BATTLE STARTS IN'
              : missing.length
                ? 'Controller disconnected · Reconnect it to continue'
                : Array.from(room.state.players.values()).some((p) => !p.connected)
                  ? 'A player is reconnecting…'
                  : '';
    const countdownText =
      connection.status === 'connected' && room.state.phase === 'countdown'
        ? String(room.state.countdown)
        : '';
    // Avoid repeatedly announcing the same message at the input sampling rate.
    if (statusLabel.textContent !== message) {
      statusLabel.textContent = message;
    }
    if (countdown.textContent !== countdownText) {
      countdown.textContent = countdownText;
    }
    status.dataset.phase = connection.status === 'connected' ? room.state.phase : connection.status;
    status.hidden = !message;
  }, 1000 / room.state.inputHz);

  let raf = 0;
  let last = performance.now();
  let result: HTMLElement | undefined;
  let loaded = false;
  function animate(now: number) {
    const sample = buffer.sample(now);
    const renderedTick = sample
      ? sample.previous.tick + (sample.current.tick - sample.previous.tick) * sample.alpha
      : -Infinity;
    const events = connection.drainEvents(renderedTick);
    const delta = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (sample) {
      renderer.render(sample.previous, sample.current, sample.alpha, delta, events);
    }
    if (!loaded && sample) {
      loaded = true;
      room.send('loaded', true);
    }
    audio.play(events);
    if (connection.snapshot) {
      hud.update(connection.snapshot);
    }
    if (!result && (room.state.phase === 'complete' || room.state.phase === 'abandoned')) {
      controlsEnabled = false;
      neutralize();
      menu?.remove();
      menu = undefined;
      result = element('section', 'modal-backdrop result-backdrop');
      result.dataset.testid = 'online-results';
      const panel = element('div', 'modal-panel result-panel');
      const winner = connection.snapshot?.result;
      panel.append(
        element(
          'h1',
          '',
          room.state.phase === 'abandoned'
            ? 'BATTLE ENDED'
            : winner?.winnerTeamId
              ? `${teamName(winner.winnerTeamId)} WINS`
              : 'DRAW',
        ),
        element(
          'p',
          '',
          room.state.notice ||
            (winner?.reason === 'leader-head-destroyed'
              ? 'Enemy leader disabled.'
              : 'Time expired. Battle decided by remaining armor.'),
        ),
        button('Return to server browser', leave, 'button primary'),
      );
      result.append(panel);
      screen.append(result);
    }
    raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate);
  return {
    dispose() {
      clearInterval(inputTimer);
      cancelAnimationFrame(raf);
      unsubscribe();
      neutralize();
      input.dispose();
      renderer.dispose();
      hud.dispose();
      audio.dispose();
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('keydown', audio.unlock);
      window.removeEventListener('pointerdown', audio.unlock);
      screen.remove();
    },
  };
}
