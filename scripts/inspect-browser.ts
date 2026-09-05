import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('.artifacts', { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173');
await page.getByTestId('match-setup').waitFor();
await page.screenshot({ path: '.artifacts/setup.png' });
await page.getByRole('button', { name: '⚙  CONTROLS', exact: true }).click();
await page.getByRole('button', { name: '3 players · one keyboard', exact: true }).click();
await page.screenshot({ path: '.artifacts/controls.png' });
await page.getByRole('button', { name: 'APPLY CONTROLS', exact: false }).click();
await page.getByRole('button', { name: 'START ROBATTLE', exact: false }).click();
await page.getByTestId('battle-hud').waitFor();
await page.keyboard.down('d');
await page.waitForFunction(() => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants[0]!.x > -4);
await page.keyboard.up('d');
await page.keyboard.press('w');
await page.waitForFunction(() => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants[0]!.y > 1);
await page.keyboard.press('f');
await page.screenshot({ path: '.artifacts/battle.png' });
await page.evaluate(() => window.__BATTLE_DEBUG__!.pause());
console.log(
  JSON.stringify(
    {
      errors,
      snapshot: await page.evaluate(() => ({
        tick: window.__BATTLE_DEBUG__!.getSnapshot()!.tick,
        combatants: window.__BATTLE_DEBUG__!.getSnapshot()!.combatants.map((c) => ({
          id: c.id,
          x: c.x,
          y: c.y,
          attack: c.attack,
          head: c.parts.head.currentArmor,
        })),
      })),
    },
    null,
    2,
  ),
);
await browser.close();
