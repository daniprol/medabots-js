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
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('A1 controller')).toHaveValue('keyboard-solo');
  await expect(
    page.getByRole('dialog').getByLabel('A2 controller').locator('option[value="keyboard-solo"]'),
  ).toHaveJSProperty('disabled', true);
  await expect(
    page.getByRole('dialog').getByLabel('A2 controller').locator('option[value="keyboard-3"]'),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Done', exact: false }).click();
  await page.getByRole('button', { name: 'Start Robattle', exact: false }).click();
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
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  await page.getByRole('button', { name: 'Players', exact: true }).click();
  await page.getByLabel('Player setup', { exact: true }).selectOption('shared-three');
  await expect(page.getByRole('dialog').getByLabel('A2 controller')).toHaveValue('keyboard-3');
  await page.getByRole('button', { name: 'Done', exact: false }).click();
  await page.getByRole('button', { name: 'Start Robattle', exact: false }).click();
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
    .toBeLessThan(start.combatants.find((actor) => actor.id === 'B1')!.x - 1);
  await page.keyboard.up('d');
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('g');
  await expect
    .poll(() => page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants[0]!.y))
    .toBeGreaterThan(0.2);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants[0]!.parts.rightArm.readiness,
      ),
    )
    .toBe(320);
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
  await page.getByRole('button', { name: 'Start Robattle', exact: false }).click();
  await expect(page.getByTestId('timer')).toHaveText('03:00');
});

test('returning from a match with omitted assignments fills the other slots with AI', async ({
  page,
}) => {
  await page.evaluate(() =>
    window.__BATTLE_DEBUG__!.restart({
      assignments: { A1: { type: 'keyboard', profileId: 'keyboard-solo' } },
    }),
  );
  await expect(page.getByTestId('fighter-A2')).toContainText('CPU');
  await page.evaluate(() => window.__BATTLE_DEBUG__!.returnToSetup());
  await expect(page.getByTestId('match-setup')).toBeVisible();
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('A2 controller')).toHaveValue('ai');
});

test('character selection and session key editing survive a battle and return to setup', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Choose Rokusho', exact: true }).click();
  await expect(page.getByTestId('character-details')).toContainText('Rokusho');
  await expect(
    page.getByRole('button', { name: 'Select A1 leader: Rokusho', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  await page.getByRole('button', { name: 'Rebind Attack', exact: true }).click();
  await page.keyboard.press('z');
  await expect(page.getByRole('button', { name: 'Rebind Attack', exact: true })).toHaveText('Z');
  await page.getByRole('button', { name: 'Done', exact: false }).click();
  await page.getByRole('button', { name: 'Start Robattle', exact: false }).click();
  await expect(page.getByTestId('fighter-A1')).toContainText('Rokusho');
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants[0]!.parts.rightArm.readiness,
      ),
    )
    .toBe(320);
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
    .toBeGreaterThan(-20);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'RETURN TO SETUP', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Select A1 leader: Rokusho', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rebind Attack', exact: true })).toHaveText('Z');
  await page.getByRole('button', { name: 'Reset these keys', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rebind Attack', exact: true })).toHaveText('F');
  await page.getByRole('button', { name: 'Close controls', exact: true }).click();
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rebind Attack', exact: true })).toHaveText('Z');
});

test('the complete roster and large control guide fit a mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: /^Choose / })).toHaveCount(30);
  await page.getByRole('button', { name: 'Choose Brass', exact: true }).click();
  await expect(page.getByTestId('character-details')).toContainText('Brass');
  expect(
    await page.getByTestId('match-setup').evaluate((node) => node.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rebind Attack', exact: true })).toHaveText('F');
  const keys = await page
    .getByRole('button', { name: 'Rebind Attack', exact: true })
    .evaluate((node) => ({
      size: parseFloat(getComputedStyle(node).fontSize),
      height: node.getBoundingClientRect().height,
    }));
  expect(keys.size).toBeGreaterThanOrEqual(20);
  expect(keys.height).toBeGreaterThanOrEqual(44);
  const dialog = page.getByRole('dialog');
  expect(await dialog.evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Players', exact: true }).click();
  await page.getByLabel('Player setup', { exact: true }).selectOption('shared-two');
  await expect(page.getByRole('dialog').getByLabel('B1 controller')).toHaveValue('keyboard-2');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('team sizes, field preview and per-robot difficulty survive battle navigation', async ({
  page,
}) => {
  test.setTimeout(120000);
  const menu = page.getByTestId('match-setup');
  await menu.getByLabel('Match size', { exact: true }).selectOption('3');
  await expect(menu.getByRole('button', { name: /^Select / })).toHaveCount(6);
  await menu.getByLabel('A3 AI difficulty').selectOption('ai-easy');
  await menu.getByLabel('B3 AI difficulty').selectOption('ai-aggressive');
  await menu.getByLabel('B1 controller', { exact: true }).selectOption('keyboard-3');
  await menu.getByLabel('Battle field', { exact: true }).selectOption({ label: 'Factory 1' });
  await expect(page.getByTestId('arena-preview')).toHaveAttribute(
    'aria-label',
    'Factory 1 battlefield preview',
  );
  await page.getByRole('button', { name: 'Start Robattle', exact: true }).click();
  await expect(page.getByTestId('battle-hud')).toContainText('3 VS 3');
  await expect(page.getByTestId('fighter-A3')).toContainText('CPU · Easy');
  await expect(page.getByTestId('fighter-B3')).toContainText('CPU · Hard');
  await expect(page.getByTestId('fighter-B1')).toContainText('KEY 3');
  await expect
    .poll(() => page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants.length))
    .toBe(6);
  const bar = page.getByRole('meter', { name: 'A3 HEAD armor', exact: true });
  await expect(bar).toHaveAttribute('aria-valuenow', /\d+/);
  const headBounds = await bar.boundingBox();
  const legBounds = await page
    .getByRole('meter', { name: 'A3 LEGS armor', exact: true })
    .boundingBox();
  expect(headBounds!.width).toBeGreaterThan(50);
  expect(legBounds!.y - headBounds!.y).toBeGreaterThan(40);

  const labelSize = await page
    .getByTestId('fighter-A3')
    .evaluate((node) => parseFloat(getComputedStyle(node.querySelector('.armor-row')!).fontSize));
  expect(labelSize).toBeGreaterThanOrEqual(14);
  await page.evaluate(() => window.__BATTLE_DEBUG__!.returnToSetup());
  await expect(menu.getByLabel('A3 AI difficulty')).toHaveValue('ai-easy');
  await menu.getByLabel('Match size', { exact: true }).selectOption('1');
  await expect(menu.getByRole('button', { name: /^Select / })).toHaveCount(2);
  await page.getByRole('button', { name: 'Start Robattle', exact: true }).click();
  await expect(page.getByTestId('battle-hud')).toContainText('1 VS 1');
  await page.keyboard.press('s');
  await expect
    .poll(() => page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!.tick))
    .toBeGreaterThan(20);
  await page.evaluate(() => window.__BATTLE_DEBUG__!.restart({ roundTimeMs: 1000 }));
  await expect(page.getByTestId('battle-results')).toBeVisible();
});
