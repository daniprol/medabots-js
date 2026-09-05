import { chromium } from '@playwright/test';
import { content } from '../tests/helpers';
import { aiCommand, createAIState } from '../src/battle-session/ai-controller';
import type { InputAction } from '../src/content/schemas';
import type { BattleSnapshot, CombatantCommand } from '../src/battle-core';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto('http://localhost:5173');
await page.getByTestId('match-setup').waitFor();
function actions(c: CombatantCommand): InputAction[] {
  const result: InputAction[] = [];
  if (c.moveX < 0) result.push('moveLeft');
  if (c.moveX > 0) result.push('moveRight');
  if (c.jumpPressed) result.push('jump');
  if (c.dropHeld) result.push('dropThroughPlatform');
  if (c.rightArmPressed) result.push('rightArm');
  if (c.leftArmPressed) result.push('leftArm');
  if (c.headPressed) result.push('head');
  if (c.guardHeld) result.push('guard');
  if (c.chargeHeld) result.push('chargeSpecial');
  if (c.specialPressed) result.push('activateSpecial');
  return result;
}
for (const slots of [['A1'], ['A1', 'B1']]) {
  await page.evaluate(
    (slots) =>
      window.__BATTLE_DEBUG__!.restart({
        roundTimeMs: 30000,
        assignments: Object.fromEntries(
          ['A1', 'A2', 'B1', 'B2'].map((id) => [
            id,
            slots.includes(id)
              ? { type: 'keyboard', profileId: id === 'A1' ? 'keyboard-1' : 'keyboard-2' }
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
  while (!s.result) {
    const keys = slots.flatMap((id) =>
      actions(aiCommand(s, id, content, content.ai['ai-balanced']!, memory[id]!)).map(
        (action) =>
          content.keyboards[id === 'A1' ? 'keyboard-1' : 'keyboard-2']!.bindings[action][0]!,
      ),
    );
    await page.evaluate(
      ({ down, up }) => {
        for (const code of up)
          window.dispatchEvent(new KeyboardEvent('keyup', { code, cancelable: true }));
        for (const code of down)
          window.dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true }));
      },
      { down: keys.filter((k) => !held.includes(k)), up: held.filter((k) => !keys.includes(k)) },
    );
    held = keys;
    if (s.tick > 180 && !captured) {
      await page.screenshot({ path: `.artifacts/play-${slots.length}p.png` });
      captured = true;
    }
    await page.waitForFunction((tick) => {
      const s = window.__BATTLE_DEBUG__!.getSnapshot();
      return !!s?.result || (s?.tick ?? 0) >= tick + 3;
    }, s.tick);
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
