import { test, expect } from '@playwright/test';

import type { BattleDebug } from '../../src/main';
declare global {
  interface Window {
    __BATTLE_DEBUG__?: BattleDebug;
  }
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('match-setup')).toBeVisible();
});
test('setup discovers controls and the default roster enters the arena without console errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  await page.getByRole('button', { name: '⚙  CONTROLS', exact: true }).click();
  await expect(page.getByLabel('A1 controller')).toHaveValue('keyboard-solo');
  await expect(
    page.getByLabel('A2 controller').locator('option[value="keyboard-solo"]'),
  ).toHaveJSProperty('disabled', true);
  await expect(page.getByLabel('A2 controller').locator('option[value="keyboard-3"]')).toHaveCount(
    1,
  );
  await page.getByRole('button', { name: 'APPLY CONTROLS', exact: false }).click();
  await page.getByRole('button', { name: 'START ROBATTLE', exact: false }).click();
  await expect(page.getByTestId('battle-hud')).toBeVisible();
  await expect(page.getByTestId('fighter-A1')).toContainText('KEY solo');
  await expect(page.getByTestId('fighter-A2')).toContainText('CPU');
  await expect
    .poll(() => page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!.tick))
    .toBeGreaterThan(10);
  // Regress a negative first-frame delta that inverted the camera after slow WebGL initialization.
  const labels = await page.getByTestId(/^combatant-label-/).evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, right: box.right, bottom: box.bottom };
    }),
  );
  expect(labels).toHaveLength(4);
  for (const label of labels) {
    expect(label.x).toBeGreaterThanOrEqual(0);
    expect(label.y).toBeGreaterThanOrEqual(0);
    expect(label.right).toBeLessThanOrEqual(1440);
    expect(label.bottom).toBeLessThanOrEqual(900);
  }
  expect(errors).toEqual([]);
});
test('three profiles assign without conflicts; two keyboards move and attack independently; blur pauses', async ({
  page,
}) => {
  await page.getByRole('button', { name: '⚙  CONTROLS', exact: true }).click();
  await page.getByRole('button', { name: '3 players · one keyboard', exact: true }).click();
  await expect(page.getByLabel('A2 controller')).toHaveValue('keyboard-3');
  await page.getByRole('button', { name: 'APPLY CONTROLS', exact: false }).click();
  await page.getByRole('button', { name: 'START ROBATTLE', exact: false }).click();
  await expect(page.getByTestId('battle-hud')).toBeVisible();
  const start = await page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!);
  await page.keyboard.down('d');
  await page.keyboard.down('ArrowLeft');
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants.find((c) => c.id === 'A1')!.x,
      ),
    )
    .toBeGreaterThan(start.combatants[0]!.x + 1);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants.find((c) => c.id === 'B1')!.x,
      ),
    )
    .toBeLessThan(start.combatants[2]!.x - 1);
  await page.keyboard.up('d');
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('w');
  await expect
    .poll(() => page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants[0]!.y))
    .toBeGreaterThan(0.2);
  // A complete keydown/keyup before the next tick still starts the attack.
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyF', cancelable: true }));
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants[0]!.parts.rightArm.uses,
      ),
    )
    .toBe(1);
  await expect(page.getByTestId('timer')).not.toHaveText('03:00');
  await page.keyboard.down('d');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: 'ROBATTLE PAUSED' })).toBeVisible();
  const tick = await page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!.tick);
  await page.getByRole('button', { name: 'RESUME ROBATTLE', exact: false }).click();
  await page.keyboard.up('d');
  await expect
    .poll(() => page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!.tick))
    .toBeGreaterThan(tick + 12);
  await expect
    .poll(() => page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants[0]!.vx))
    .toBe(0);
});
test('deterministic short match shows results, rematches, and returns to setup', async ({
  page,
}) => {
  // This flow initializes four WebGL scenes; allow software-rendered CI to compile them.
  test.setTimeout(120000);
  await page.evaluate(() => window.__BATTLE_DEBUG__!.restart({ roundTimeMs: 1000 }));
  await expect(page.getByTestId('battle-results')).toBeVisible();
  const winner = await page.evaluate(
    () => window.__BATTLE_DEBUG__!.getSnapshot()!.result!.winnerTeamId,
  );
  await expect(
    page.getByRole('heading', {
      name: winner ? `${winner.replace('-', ' ').toUpperCase()} WINS` : 'DRAW',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'REMATCH', exact: false }).click();
  await expect(page.getByTestId('battle-results')).toHaveCount(0);
  await expect(page.getByTestId('battle-hud')).toBeVisible();
  await page.evaluate(() => window.__BATTLE_DEBUG__!.pause());
  await expect(page.getByRole('heading', { name: 'ROBATTLE PAUSED' })).toBeVisible();
  await page.getByRole('button', { name: 'RETURN TO SETUP', exact: true }).click();
  await expect(page.getByTestId('match-setup')).toBeVisible();
  await page.getByRole('button', { name: 'START ROBATTLE', exact: false }).click();
  await expect(page.getByTestId('timer')).toHaveText('03:00');
});

test('character selection and session key editing survive a battle and return to setup', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Choose Rokusho', exact: true }).click();
  await expect(page.getByTestId('character-details')).toContainText('Rokusho');
  await expect(
    page.getByRole('button', { name: 'Select A1 leader: Rokusho', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '⚙  CONTROLS', exact: true }).click();
  await page.getByRole('button', { name: 'Rebind Right arm / Primary', exact: true }).click();
  await page.keyboard.press('z');
  await expect(
    page.getByRole('button', { name: 'Rebind Right arm / Primary', exact: true }),
  ).toHaveText('Z');
  await page.getByRole('button', { name: 'APPLY CONTROLS', exact: false }).click();
  await page.getByRole('button', { name: 'START ROBATTLE', exact: false }).click();
  await expect(page.getByTestId('fighter-A1')).toContainText('Rokusho');
  await page.keyboard.press('z');
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants[0]!.parts.rightArm.uses,
      ),
    )
    .toBe(1);
  await page.keyboard.down('ArrowRight');
  await expect
    .poll(() => page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants[0]!.x))
    .toBeGreaterThan(-8);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'RETURN TO SETUP', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Select A1 leader: Rokusho', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '⚙  CONTROLS', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Rebind Right arm / Primary', exact: true }),
  ).toHaveText('Z');
  await page.getByRole('button', { name: 'RESET', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Rebind Right arm / Primary', exact: true }),
  ).toHaveText('F');
  await page.getByRole('button', { name: 'CANCEL', exact: true }).click();
  await page.getByRole('button', { name: '⚙  CONTROLS', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Rebind Right arm / Primary', exact: true }),
  ).toHaveText('Z');
});
