import { chromium } from '@playwright/test';

import type { BattleSnapshot, CombatantCommand } from '../src/battle-core';
import { aiCommand, createAIState } from '../src/battle-session/ai-controller';
import type { InputAction } from '../src/content/schemas';
import { content } from '../tests/helpers';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

page.setDefaultTimeout(30000);

const errors: string[] = [];

page.on('pageerror', (e) => {
  errors.push(e.message);
  console.error('Browser error', e.message);
});

page.on('console', (m) => {
  if (m.type() === 'error') {
    errors.push(m.text());
  }
});

await page.goto('http://localhost:5173');

await page.getByTestId('match-setup').waitFor();

function actions(c: CombatantCommand): InputAction[] {
  const result: InputAction[] = [];

  if (c.moveX < 0) {
    result.push('moveLeft');
  }

  if (c.moveX > 0) {
    result.push('moveRight');
  }

  if (c.jumpPressed) {
    result.push('jump');
  }

  if (c.dropHeld) {
    result.push('dropThroughPlatform');
  }

  if (c.rightArmPressed) {
    result.push('rightArm');
  }

  if (c.leftArmPressed) {
    result.push('leftArm');
  }

  if (c.headPressed) {
    result.push('head');
  }

  if (c.guardHeld) {
    result.push('guard');
  }

  if (c.chargeHeld) {
    result.push('chargeSpecial');
  }

  if (c.specialPressed) {
    result.push('activateSpecial');
  }

  return result;
}

for (const slots of [['A1'], ['A1', 'B1']]) {
  await page.evaluate(
    (slots) =>
      window.__BATTLE_DEBUG__!.restart({
        roundTimeMs: 90000,
        assignments: Object.fromEntries(
          ['A1', 'A2', 'B1', 'B2'].map((id) => [
            id,
            slots.includes(id)
              ? {
                  type: 'keyboard',
                  profileId:
                    slots.length === 1
                      ? 'keyboard-solo'
                      : id === 'A1'
                        ? 'keyboard-1'
                        : 'keyboard-2',
                }
              : { type: 'ai', aiProfileId: 'ai-balanced' },
          ]),
        ),
      }),
    slots,
  );

  const memory = Object.fromEntries(slots.map((id, i) => [id, createAIState(818 + i)]));
  let held: string[] = [];
  let s = await page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!);
  let captured = false;
  let reportedTick = -300;

  while (!s.result) {
    if (s.tick - reportedTick >= 300) {
      console.log(
        JSON.stringify({
          players: slots,
          tick: s.tick,
          positions: s.combatants.map((c) => [c.id, c.x, c.y]),
          errors,
        }),
      );
      reportedTick = s.tick;
    }

    for (const c of s.combatants) {
      const limbsIntact =
        !c.parts.leftArm.destroyed || !c.parts.rightArm.destroyed || !c.parts.legs.destroyed;

      if (limbsIntact && c.parts.head.currentArmor !== c.parts.head.maxArmor) {
        throw new Error(`Head protection failed for ${c.id} at tick ${s.tick}`);
      }
    }

    const keys = slots.flatMap((id) =>
      actions(aiCommand(s, id, content, content.ai['ai-balanced']!, memory[id]!)).map(
        (action) =>
          content.keyboards[
            slots.length === 1 ? 'keyboard-solo' : id === 'A1' ? 'keyboard-1' : 'keyboard-2'
          ]!.bindings[action][0]!,
      ),
    );
    await page.evaluate(
      ({ down, up }) => {
        for (const code of up) {
          window.dispatchEvent(new KeyboardEvent('keyup', { code, cancelable: true }));
        }

        for (const code of down) {
          window.dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true }));
        }
      },
      { down: keys.filter((k) => !held.includes(k)), up: held.filter((k) => !keys.includes(k)) },
    );
    held = keys;

    if (s.tick > 180 && !captured) {
      await page.screenshot({ path: `.artifacts/play-${slots.length}p.png` });
      console.log(
        'Visible positions',
        await page.locator('.robot-label').evaluateAll((nodes) =>
          nodes.map((n) => ({
            text: n.textContent,
            transform: (n as HTMLElement).style.transform,
          })),
        ),
      );
      captured = true;
    }

    await page
      .waitForFunction(
        (tick) => {
          const s = window.__BATTLE_DEBUG__!.getSnapshot();

          return !!s?.result || (s?.tick ?? 0) >= tick + 3;
        },
        s.tick,
        { timeout: 15000 },
      )
      .catch(async (error) => {
        console.error(
          'Stalled battle',
          await page.locator('body').innerText(),
          await page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()),
        );
        throw error;
      });
    s = (await page.evaluate(() => window.__BATTLE_DEBUG__!.getSnapshot()!)) as BattleSnapshot;
  }

  await page.getByTestId('battle-results').waitFor();
  console.log(
    JSON.stringify({
      players: slots,
      result: {
        winnerTeamId: s.result?.winnerTeamId,
        reason: s.result?.reason,
        elapsedTicks: s.result?.elapsedTicks,
      },
      errors,
    }),
  );
  await page.getByRole('button', { name: 'RETURN TO SETUP', exact: true }).click();
  await page.getByTestId('match-setup').waitFor();
}

await browser.close();
