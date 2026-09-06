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
  await host.getByText('Player name & controls', { exact: true }).click();
  await host.getByLabel('Player name').fill('Host fighter');
  await host.getByLabel('Online match size').selectOption('1');
  await host.getByRole('button', { name: 'Create battle' }).click();
  await expect(host.getByTestId('online-waiting')).toBeVisible();
  await expect(host.getByTestId('online-waiting')).toContainText('1 / 2 players');
  await guest.getByText('Player name & controls', { exact: true }).click();
  await guest.getByLabel('Player name').fill('Guest fighter');
  await guest.getByRole('button', { name: /Your character:/ }).click();
  await guest.getByRole('button', { name: 'Choose Rokusho', exact: true }).click();
  await guest
    .getByRole('article')
    .filter({ hasText: 'Host fighter' })
    .getByRole('button', { name: 'Join battle' })
    .click();
  await expect(guest.getByTestId('online-waiting')).toContainText('2 / 2 players');
  await expect(host.getByTestId('online-waiting')).toContainText('Guest fighter');
  await host.screenshot({ path: '.artifacts/online-waiting-room.png' });
  await host.getByRole('button', { name: 'Ready to battle' }).click();
  await expect(host.getByRole('heading', { name: 'WAITING FOR OTHERS' })).toBeVisible();
  await expect(guest.getByTestId('online-slot-A1')).toContainText('✓ Ready');
  await expect(host.getByTestId('online-slot-B1')).toContainText('○ Not ready');
  await expect(
    host.getByTestId('online-slot-B1').getByRole('img', { name: 'Rokusho' }),
  ).toBeVisible();
  await expect(host.getByRole('button', { name: '✓ You’re ready' })).toBeDisabled();
  await host.screenshot({ path: '.artifacts/online-ready-room.png' });
  await guest.getByRole('button', { name: 'Ready to battle' }).click();
  await expect(host.getByText('BATTLE STARTS IN', { exact: true })).toBeVisible();
  await host.screenshot({ path: '.artifacts/online-countdown.png' });
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

test('portrait selection and six lobby slots fit small screens with a visible ready action', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /Online multiplayer/ }).click();
  const picker = page.getByRole('button', { name: /Your character:/ });
  await picker.click();
  const dialog = page.getByRole('dialog', { name: 'Choose your Medabot' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Choose Metabee', exact: true })).toBeFocused();
  await page.screenshot({ path: '.artifacts/online-character-picker-phone.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(picker).toBeFocused();
  await picker.click();
  await dialog.getByRole('button', { name: 'Choose Rokusho', exact: true }).click();
  await expect(picker).toHaveAccessibleName('Your character: Rokusho. Change Medabot');
  await expect(picker.getByRole('img', { name: 'Rokusho' })).toBeVisible();
  await picker.click();
  await expect(dialog.getByRole('button', { name: 'Choose Rokusho', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(dialog.getByRole('button', { name: 'Choose Metabee', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.keyboard.press('Escape');
  expect(
    await page.getByTestId('online-browser').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: '.artifacts/online-browser-phone.png', fullPage: true });
  await page.getByLabel('Online match size').selectOption('3');
  await page.getByRole('button', { name: 'Create battle' }).click();
  const room = page.getByTestId('online-waiting');
  await expect(room.getByRole('article')).toHaveCount(6);
  await expect(room.getByRole('heading', { name: 'WAITING FOR PLAYERS' })).toBeVisible();
  await expect(room).toContainText('5 more players needed');
  await expect(room).toContainText('1 / 6 players');
  await expect(room.getByText('Open slot', { exact: true })).toHaveCount(5);
  const portrait = page.getByTestId('online-slot-A1').getByRole('img', { name: 'Rokusho' });
  await expect
    .poll(() =>
      portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  const ready = page.getByRole('button', { name: 'Ready to battle' });
  await expect(ready).toBeInViewport();
  expect(await room.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await ready.click();
  await expect(page.getByTestId('online-slot-A1')).toContainText('✓ Ready');
  await expect(room).toContainText('1 / 6 ready');
  await expect(room.getByRole('heading', { name: 'WAITING FOR PLAYERS' })).toBeVisible();
  const lastSlot = await page.getByTestId('online-slot-B3').boundingBox();
  const actionBar = await room.getByRole('group', { name: 'Room actions' }).boundingBox();
  expect(lastSlot!.y + lastSlot!.height).toBeLessThanOrEqual(actionBar!.y);
  await page.screenshot({ path: '.artifacts/online-lobby-phone.png' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByTestId('online-slot-B3')).toBeInViewport();
  await expect(page.getByRole('button', { name: '✓ You’re ready' })).toBeInViewport();
  expect(await room.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: '.artifacts/online-lobby-handheld.png' });
  await page.getByRole('button', { name: 'Leave room', exact: true }).click();
  await expect(page.getByTestId('online-browser')).toBeVisible();
});

test('online play works when browser storage is denied', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage is blocked', 'SecurityError');
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Online multiplayer/ }).click();
  await expect(page.getByRole('button', { name: 'Create battle' })).toBeEnabled();
  await page.getByText('Add a server', { exact: true }).click();
  await page.getByLabel('Server name', { exact: true }).fill('Session server');
  await page.getByLabel('New server URL').fill('http://127.0.0.1:2567');
  await page.getByRole('button', { name: 'Save server' }).click();
  await expect(page.getByLabel('Server', { exact: true })).toHaveValue('http://127.0.0.1:2567');
  await page.getByRole('button', { name: 'Create battle' }).click();
  await expect(page.getByTestId('online-waiting')).toBeVisible();
  await page.getByRole('button', { name: 'Leave room', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create battle' })).toBeEnabled();
});
