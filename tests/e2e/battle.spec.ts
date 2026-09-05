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
test('setup discovers controls and quick start enters the arena without console errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await expect(page.getByLabel('A1 controller')).toHaveValue('keyboard-1');
  await expect(
    page.getByLabel('A2 controller').locator('option[value="keyboard-1"]'),
  ).toBeDisabled();
  await expect(page.getByLabel('A2 controller').locator('option[value="keyboard-3"]')).toHaveCount(
    1,
  );
  await page.getByRole('button', { name: 'QUICK START', exact: true }).click();
  await expect(page.getByTestId('battle-hud')).toBeVisible();
  await expect(page.getByTestId('fighter-A1')).toContainText('KEY 1');
  await expect(page.getByTestId('fighter-A2')).toContainText('CPU');
  await expect
    .poll(() => page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!.tick))
    .toBeGreaterThan(10);
  expect(errors).toEqual([]);
});
test('three profiles assign without conflicts; two keyboards move and attack independently; blur pauses', async ({
  page,
}) => {
  await page.getByLabel('B1 controller').selectOption('keyboard-2');
  await page.getByLabel('B2 controller').selectOption('keyboard-3');
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
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyJ', cancelable: true }));
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
  await page.getByRole('button', { name: 'QUICK START', exact: true }).click();
  await expect(page.getByTestId('timer')).toHaveText('03:00');
});
