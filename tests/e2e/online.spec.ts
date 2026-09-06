import { test, expect } from '@playwright/test';

test('entry menu separates local play and saves custom servers', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('mode-menu')).toBeVisible();
  await page.screenshot({ path: '.artifacts/online-mode-menu.png' });
  await page.getByRole('button', { name: /Online multiplayer/ }).click();
  await expect(page.getByTestId('online-browser')).toBeVisible();
  await page.getByText('Add a server', { exact: true }).click();
  await page.getByLabel('Server name', { exact: true }).fill('Local test server');
  await page.getByLabel('New server URL').fill('ws://127.0.0.1:2567');
  await page.getByRole('button', { name: 'Save server' }).click();
  await expect(page.getByLabel('Server', { exact: true })).toHaveValue('http://127.0.0.1:2567');
  await expect(page.getByRole('button', { name: 'Create battle' })).toBeEnabled();
  await page.screenshot({ path: '.artifacts/online-server-browser.png', fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: /Online multiplayer/ }).click();
  await expect(page.getByLabel('Server', { exact: true }).locator('option')).toContainText([
    'Localhost',
    'Local test server',
  ]);
  await page.getByRole('button', { name: 'Back to main menu' }).click();
  await page.getByRole('button', { name: /Single player \/ Local/ }).click();
  await expect(page.getByTestId('match-setup')).toBeVisible();
  await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  await expect(page.getByTestId('mode-menu')).toBeVisible();
});

test('two browsers create, discover, ready, play and leave the same authoritative battle', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const errors: string[] = [];
  for (const page of [host, guest]) {
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: /Online multiplayer/ }).click();
    await expect(page.getByRole('button', { name: 'Create battle' })).toBeEnabled();
  }
  await host.getByLabel('Player name').fill('Host fighter');
  await host.getByLabel('Online match size').selectOption('1');
  await host.getByRole('button', { name: 'Create battle' }).click();
  await expect(host.getByTestId('online-waiting')).toBeVisible();
  await expect(host.getByTestId('online-waiting')).toContainText('1 / 2 players');
  await guest.getByLabel('Player name').fill('Guest fighter');
  await guest.getByLabel('Your character').selectOption({ label: 'Rokusho' });
  await guest
    .getByRole('article')
    .filter({ hasText: 'Host fighter' })
    .getByRole('button', { name: 'Join battle' })
    .click();
  await expect(guest.getByTestId('online-waiting')).toContainText('2 / 2 players');
  await expect(host.getByTestId('online-waiting')).toContainText('Guest fighter');
  await host.screenshot({ path: '.artifacts/online-waiting-room.png' });
  await host.getByRole('button', { name: 'Ready to battle' }).click();
  await expect(host.getByRole('heading', { name: 'WAITING FOR PLAYERS' })).toBeVisible();
  await guest.getByRole('button', { name: 'Ready to battle' }).click();
  await expect(host.getByTestId('battle-hud')).toBeVisible();
  await expect(guest.getByTestId('battle-hud')).toBeVisible();
  await expect(host.getByTestId('fighter-B1')).toContainText('Guest fighter');
  await expect(guest.getByTestId('fighter-A1')).toContainText('Host fighter');
  await expect(host.getByTestId('timer')).not.toHaveText('03:00');
  await host.bringToFront();
  await expect(host.getByTestId('fighter-A1')).toContainText('KEY solo');
  const before = await host.getByTestId('combatant-label-A1').getAttribute('style');
  await host.keyboard.down('ArrowRight');
  await expect
    .poll(() => host.getByTestId('combatant-label-A1').getAttribute('style'))
    .not.toBe(before);
  await host.keyboard.up('ArrowRight');
  await host.keyboard.press('g');
  await expect
    .poll(() => guest.getByTestId('combatant-label-A1').getAttribute('style'))
    .not.toBeNull();
  await host.screenshot({ path: '.artifacts/online-battle.png' });
  await host.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(host.getByText('The battle continues while this menu is open.')).toBeVisible();
  await host.getByRole('button', { name: 'Leave battle', exact: true }).click();
  await expect(host.getByTestId('online-browser')).toBeVisible();
  await expect(guest.getByTestId('online-results')).toContainText('Host fighter left');
  await guest.getByRole('button', { name: 'Return to server browser' }).click();
  await expect(guest.getByTestId('online-browser')).toBeVisible();
  expect(errors).toEqual([]);
  await Promise.all([hostContext.close(), guestContext.close()]);
});
