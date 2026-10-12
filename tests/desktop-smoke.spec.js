const { test, expect } = require('@playwright/test');

test.describe('柯里昂档案桌面端', () => {
  test('加载资源并完成核心交互', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const failedResponses = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/柯里昂档案/);
    await expect(page.locator('.hero h1')).toBeVisible();
    await expect(page.locator('svg.lucide').first()).toBeVisible();
    const duplicateIds = await page.locator('[id]').evaluateAll((nodes) => {
      const ids = nodes.map((node) => node.id).filter(Boolean);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    expect(duplicateIds).toEqual([]);

    const imageStatus = await page.evaluate(async () => {
      const sources = [...new Set([...document.images].map((node) => node.currentSrc || node.src).filter(Boolean))];
      return Promise.all(sources.map(async (source) => {
        const response = await fetch(source, { cache: 'no-store' });
        return response.ok;
      }));
    });
    expect(imageStatus.every(Boolean)).toBe(true);

    const faithFilter = page.locator('[data-filter="faith"]');
    const faithCount = await page.locator('.chapter-card[data-category~="faith"]').count();
    await faithFilter.click();
    await expect(page.locator('#chapterCount')).toHaveText(`${String(faithCount).padStart(2, '0')} chapters`);
    await expect(page.locator('.chapter-card:not([hidden])')).toHaveCount(faithCount);

    await page.locator('[data-filter="all"]').click();
    await expect(page.locator('#chapterCount')).toHaveText('10 chapters');
    await expect(page.locator('.chapter-card:not([hidden])')).toHaveCount(10);
    await expect(page.locator('#ruleGrid .rule-card')).toHaveCount(3);
    await expect(page.locator('#quoteIndex .quote-index-button')).toHaveCount(9);
    await expect(page.locator('#characters [data-person]')).toHaveCount(44);
    await expect(page.locator('#historyGrid .history-card')).toHaveCount(2);
    await page.locator('#ruleGrid .rule-trigger').nth(1).click();
    await expect(page.locator('#ruleGrid .rule-card').nth(1)).toHaveClass(/is-open/);
    await page.locator('#quote-09').click();
    await expect(page.locator('#quote-09')).toHaveClass(/is-active/);
    const firstCharacterGroup = page.locator('#characterFilters [data-character-filter]:not([data-character-filter="all"])').first();
    const firstCharacterGroupCount = await page.locator(`#characters [data-group="${await firstCharacterGroup.getAttribute('data-character-filter')}"]`).count();
    await firstCharacterGroup.click();
    await expect(page.locator('#characters [data-person]:not([hidden])')).toHaveCount(firstCharacterGroupCount);
    await page.locator('#characterFilters [data-character-filter="all"]').click();

    const firstChapter = page.locator('#chapterGrid .chapter-card').first();
    await firstChapter.click();
    const reader = page.locator('#reader');
    await expect(reader).toHaveClass(/is-open/);
    await expect(reader).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#readerTitle')).toContainText('权力的加冕');
    await expect(page.locator('#readerBody p').first()).toBeVisible();
    await expect(page.locator('#readerBody')).toContainText('婚礼');
    const openDuplicateIds = await page.locator('[id]').evaluateAll((nodes) => {
      const ids = nodes.map((node) => node.id).filter(Boolean);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    expect(openDuplicateIds).toEqual([]);
    await expect(page.locator('#readerClose')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#readerFullLink')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#readerClose')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(reader).not.toHaveClass(/is-open/, { timeout: 2_000 });
    await expect(firstChapter).toBeFocused();

    const quote = page.locator('#quoteText');
    const initialQuote = await quote.textContent();
    await page.locator('#nextQuote').click();
    await expect(quote).not.toHaveText(initialQuote);

    await expect(page.locator('#full-note')).toBeVisible();
    await expect(page.locator('#noteStart')).toBeVisible();
    await expect(page.locator('#modeToggle')).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedResponses).toEqual([]);
  });

  test('完整正文结构与检索定位', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    const failedResponses = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('#noteContent .note-chapter')).toHaveCount(12);
    await expect(page.locator('#noteContent h4')).toHaveCount(44);
    await expect(page.locator('#chapter-06 h4.person-heading')).toHaveCount(44);
    await expect(page.locator('.note-nav')).toHaveCount(10);
    await expect(page.locator('#timelineItems .timeline-item')).toHaveCount(14);
    await expect(page.locator('#motifGrid .motif')).toHaveCount(12);
    const invalidSearchTargets = await page.evaluate(() => window.CORLEONE_ARCHIVE.search
      .map((item) => item.target)
      .filter((target) => !target || document.querySelectorAll(`#${CSS.escape(target)}`).length !== 1));
    expect(invalidSearchTargets).toEqual([]);
    await expect(page.locator('#noteContent')).toContainText('《教父》三部曲全景笔记');
    await expect(page.locator('#noteContent')).toContainText('视听语言与电影符号系统');
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      const target = document.getElementById('chapter-03-block-031');
      window.scrollTo(0, target ? window.scrollY + target.getBoundingClientRect().top - window.innerHeight * .45 : 0);
    });
    await expect.poll(() => page.locator('#chapter-03-block-031').evaluate((node) => getComputedStyle(node).opacity)).toBe('1');
    await page.evaluate(() => {
      const target = document.querySelector('#noteContent table');
      window.scrollTo(0, target ? window.scrollY + target.getBoundingClientRect().top - window.innerHeight * .45 : 0);
    });
    await expect.poll(() => page.locator('#noteContent table').evaluate((node) => getComputedStyle(node).opacity)).toBe('1');
    await expect(page.locator('#noteToc a[href="#chapter-07-heading"]')).toHaveClass(/is-active/);
    await page.evaluate(() => {
      const target = document.getElementById('motifs');
      window.scrollTo(0, target ? window.scrollY + target.getBoundingClientRect().top - 160 : 0);
    });
    await expect.poll(() => page.locator('[data-nav="motifs"]').evaluate((node) => node.classList.contains('is-active'))).toBe(true);

    const faithCards = page.locator('#chapterGrid .chapter-card[data-category~="faith"]');
    await page.locator('[data-filter="faith"]').click();
    await expect(page.locator('.chapter-card:not([hidden])')).toHaveCount(await faithCards.count());
    const familyCards = page.locator('#chapterGrid .chapter-card[data-category~="family"]');
    await page.evaluate(() => {
      document.querySelector('#chapters [data-filter="power"]').click();
      document.querySelector('#chapters [data-filter="family"]').click();
    });
    await expect(page.locator('.chapter-card:not([hidden])')).toHaveCount(await familyCards.count());

    await page.locator('#searchToggle').click();
    await expect(page.locator('#searchPanel')).toHaveClass(/is-open/);
    await expect(page.locator('#searchInput')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#searchClose')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#searchInput')).toBeFocused();
    await page.locator('#searchInput').fill('未收录的词');
    await expect(page.locator('.search-result')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('#searchToggle')).toBeFocused();

    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill('弗雷多');
    await expect(page.locator('.search-result').first()).toContainText('弗雷多');
    await page.locator('.search-result').first().click();
    await expect(page.locator('#searchPanel')).not.toHaveClass(/is-open/);
    await expect(page.locator('#chapter-06 h4[data-person="person-04"]')).toHaveClass(/search-hit/);
    await expect.poll(() => page.locator('#chapter-06 h4[data-person="person-04"]').evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.top >= 0 && rect.top <= window.innerHeight;
    })).toBe(true);

    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill('托马西诺庇护');
    await expect(page.locator('.search-result').first()).toContainText('托马西诺庇护');
    await page.locator('.search-result').first().click();
    await expect(page.locator('#chapter-03-block-031')).toHaveClass(/search-hit/);

    await page.locator('.character-card[data-person="person-01"]').click();
    await expect(page.locator('#readerTitle')).toContainText('维托');
    await expect(page.locator('#readerBody')).toContainText('人物小传');
    await page.locator('#readerFullLink').click();
    await expect(page.locator('#reader')).not.toHaveClass(/is-open/, { timeout: 2_000 });
    await expect.poll(() => page.locator('#chapter-06 h4[data-person="person-01"]').evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.top >= 0 && rect.top <= window.innerHeight;
    })).toBe(true);
    await page.locator('#chapter-06 h4.person-heading').first().click();
    await expect(page.locator('#readerTitle')).toContainText('维托');
    await page.keyboard.press('Escape');
    await expect(page.locator('#reader')).not.toHaveClass(/is-open/, { timeout: 2_000 });

    await expect(page.locator('#modeToggle')).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedResponses).toEqual([]);
  });
});
