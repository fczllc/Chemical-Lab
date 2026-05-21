import { expect, test } from '@playwright/test';

test.describe('Achievement read-only regression', () => {
  test('achievement cards do not render action buttons', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const loader = document.getElementById('global-loader');
      return loader?.classList.contains('hidden');
    }, { timeout: 15000 });

    await page.getByTestId('nav-achievements').click();
    await expect(page.locator('#achievements-grid')).toBeVisible();

    const audit = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#achievements article[data-achievement-id]')];
      const violations: string[] = [];
      for (const card of cards) {
        const actions = [...card.querySelectorAll('[data-achievement-action]')];
        if (actions.length > 0) {
          const id = card.getAttribute('data-achievement-id') || 'unknown';
          const texts = actions.map((a) => (a as HTMLElement).textContent?.trim() || '').join(', ');
          violations.push(`${id}: found ${actions.length} action(s) [${texts}]`);
        }
      }
      return {
        cardCount: cards.length,
        violationCount: violations.length,
        violations: violations.slice(0, 10)
      };
    });

    expect(audit.cardCount).toBeGreaterThan(0);
    expect(audit.violationCount).toBe(0);
    expect(audit.violations).toEqual([]);
  });
});
