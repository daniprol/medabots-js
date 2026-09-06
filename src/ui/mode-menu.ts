import { button, element } from './dom';

export function createModeMenu(root: HTMLElement, local: () => void, online: () => void) {
  const screen = element('section', 'mode-screen');
  screen.dataset.testid = 'mode-menu';
  const panel = element('div', 'mode-panel');
  panel.append(
    element('span', 'eyebrow', 'MEDABOTS / ROBATTLE ARENA'),
    element('h1', '', 'CHOOSE YOUR BATTLE'),
    element('p', '', 'Pick your Medabot. Break their armor.'),
  );
  const choices = element('div', 'mode-choices');
  const single = button('', local, 'mode-card');
  single.append(
    element('span', 'eyebrow', 'ON THIS COMPUTER'),
    element('strong', '', 'Single player / Local'),
    element('span', '', 'Battle the AI or share a keyboard and controllers with friends.'),
  );
  const multiplayer = button('', online, 'mode-card');
  multiplayer.append(
    element('span', 'eyebrow', 'ACROSS THE NETWORK'),
    element('strong', '', 'Online multiplayer'),
    element('span', '', 'Find a server. Create or join a 1 vs 1, 2 vs 2, or 3 vs 3 battle.'),
  );
  choices.append(single, multiplayer);
  panel.append(choices);
  screen.append(panel);
  root.append(screen);
  return {
    dispose() {
      screen.remove();
    },
  };
}
