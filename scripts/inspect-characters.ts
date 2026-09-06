import { mkdir } from 'node:fs/promises';

import { chromium } from '@playwright/test';

await mkdir('.artifacts', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.setDefaultTimeout(30000);

const errors: string[] = [];

page.on('pageerror', (error) => {
  errors.push(error.message);
  console.error(error.message);
});

page.on('console', (m) => {
  if (m.type() === 'error') {
    errors.push(m.text());
    console.error(m.text());
  }
});

try {
  await page.goto('http://localhost:5173');
  await page.getByTestId('match-setup').waitFor();

  for (const name of ['Metabee', 'Rokusho', 'Arcbeetle', 'Warbandit']) {
    await page.getByRole('button', { name: `Choose ${name}`, exact: true }).click();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => {
            document.querySelector('canvas')?.getContext('webgl2')?.finish();
            requestAnimationFrame(() => resolve());
          }),
        ),
    );
    await page.screenshot({ path: `.artifacts/character-${name.toLowerCase()}.png` });
  }

  await page.getByRole('button', { name: 'Choose Metabee', exact: true }).click();
  await page.getByRole('button', { name: 'START ROBATTLE', exact: false }).click();
  await page.getByTestId('battle-hud').waitFor();
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__BATTLE_DEBUG__!.getSnapshot()!.combatants[0]!.x > -5);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('g');
  await page.keyboard.press('f');
  await page.waitForFunction(() => window.__BATTLE_DEBUG__!.getSnapshot()!.tick >= 180);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => {
          document.querySelector('canvas')?.getContext('webgl2')?.finish();
          requestAnimationFrame(() => resolve());
        }),
      ),
  );
  await page.screenshot({ path: '.artifacts/characters-in-battle.png' });
  await page.evaluate(() => window.__BATTLE_DEBUG__!.pause());
  console.log(
    JSON.stringify({
      errors,
      tick: await page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!.tick),
    }),
  );

  if (errors.length) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
