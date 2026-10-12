const { test, expect } = require('@playwright/test');

function collectDiagnostics(page) {
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
  return { consoleErrors, pageErrors, failedResponses };
}

async function expectDiagnosticsClean(diagnostics) {
  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.failedResponses).toEqual([]);
}

test.describe('柯里昂档案桌面端', () => {
  test('加载资源并完成核心交互', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
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
      return Promise.all(sources.map(async (source) => (await fetch(source, { cache: 'no-store' })).ok));
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
    await page.locator('#ruleGrid .rule-trigger').nth(1).click();
    await expect(page.locator('#ruleGrid .rule-card').nth(1)).not.toHaveClass(/is-open/);

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
    await expect(page.locator('#notes-portal')).toBeVisible();
    await expect(page.locator('a[href="notes.html"]').first()).toBeVisible();
    await expect(page.locator('#modeToggle')).toHaveCount(0);
    await expectDiagnosticsClean(diagnostics);
  });

  test('首页搜索会激活模块并把正文结果送入全文页', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    await page.goto('/', { waitUntil: 'networkidle' });

    const ruleData = await page.evaluate(() => ({ id: window.CORLEONE_ARCHIVE.rules[1].id, title: window.CORLEONE_ARCHIVE.rules[1].title, index: window.CORLEONE_ARCHIVE.search.findIndex((item) => item.kind === 'rule' && item.id === window.CORLEONE_ARCHIVE.rules[1].id) }));
    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill(ruleData.title);
    await page.locator(`[data-search-index="${ruleData.index}"]`).click();
    await expect(page.locator(`#${ruleData.id}`)).toHaveClass(/is-open/);

    const quoteData = await page.evaluate(() => ({ original: window.CORLEONE_ARCHIVE.quotes[0].original, index: window.CORLEONE_ARCHIVE.search.findIndex((item) => item.kind === 'quote' && item.id === window.CORLEONE_ARCHIVE.quotes[0].id) }));
    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill(quoteData.original);
    await page.locator(`[data-search-index="${quoteData.index}"]`).click();
    await expect(page.locator('#quote-01')).toHaveClass(/is-active/);

    const timelineData = await page.evaluate(() => ({ id: window.CORLEONE_ARCHIVE.timeline[0].id, text: window.CORLEONE_ARCHIVE.timeline[0].era, event: window.CORLEONE_ARCHIVE.timeline[0].event.slice(0, 8), index: window.CORLEONE_ARCHIVE.search.findIndex((item) => item.kind === 'timeline' && item.id === window.CORLEONE_ARCHIVE.timeline[0].id) }));
    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill(timelineData.text);
    await page.locator(`[data-search-index="${timelineData.index}"]`).click();
    await expect(page.locator(`#${timelineData.id}`)).toHaveClass(/is-active/);
    await expect(page.locator('#timelineFocus')).toContainText(timelineData.event);

    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill('托马西诺庇护');
    await page.locator('.search-result').first().click();
    await expect(page).toHaveURL(/notes\.html#chapter-03-block-031$/);
    await expect(page.locator('#chapter-03-block-031')).toHaveClass(/search-hit/);
    await expectDiagnosticsClean(diagnostics);
  });

  test('全文页保留原文并维护跨章节目录定位', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    await page.goto('/notes.html', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/全文档案/);
    await expect(page.locator('#noteContent .note-chapter')).toHaveCount(12);
    await expect(page.locator('#noteContent h4')).toHaveCount(44);
    expect(await page.locator('#noteToc a').count()).toBeGreaterThan(44);
    await expect(page.locator('#noteContent')).toContainText('《教父》三部曲全景笔记');
    await expect(page.locator('#noteContent')).toContainText('视听语言与电影符号系统');

    const sourceTargets = await page.evaluate(() => window.CORLEONE_ARCHIVE.search
      .filter((item) => ['chapter', 'person', 'passage'].includes(item.kind))
      .map((item) => item.target));
    const invalidTargets = await page.evaluate((targets) => targets.filter((target) => !target || document.querySelectorAll(`#${CSS.escape(target)}`).length !== 1), sourceTargets);
    expect(invalidTargets).toEqual([]);

    const table = page.locator('#noteContent table').first();
    const tableHeading = await table.evaluate((node) => {
      const headings = [...node.closest('.note-chapter').querySelectorAll('h2, h3')];
      let current = headings[0];
      headings.forEach((heading) => { if (heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) current = heading; });
      return current.id;
    });
    await table.scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator(`#noteToc a[href="#${tableHeading}"]`).evaluate((node) => node.classList.contains('is-active'))).toBe(true);
    await expect.poll(() => table.evaluate((node) => getComputedStyle(node).opacity)).toBe('1');

    const personTarget = await page.evaluate(() => window.CORLEONE_ARCHIVE.people[0].target);
    await page.goto(`/notes.html#${personTarget}`, { waitUntil: 'networkidle' });
    await expect.poll(() => page.locator(`#${personTarget}`).evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.top >= 0 && rect.top <= window.innerHeight;
    })).toBe(true);
    await expect(page.locator('#noteToc a.is-active')).toHaveAttribute('href', /^#chapter-06-/);

    await page.goto('/notes.html#chapter-03-heading', { waitUntil: 'networkidle' });
    await expect(page.locator('#noteToc a[href="#chapter-03-heading"]')).toHaveClass(/is-active/);

    const imageStatus = await page.locator('#noteContent img').evaluateAll(async (nodes) => {
      const decode = async (node) => {
        node.loading = 'eager';
        if (!node.complete || !node.naturalWidth) {
          await Promise.race([
            new Promise((resolve) => {
              node.addEventListener('load', resolve, { once: true });
              node.addEventListener('error', resolve, { once: true });
            }),
            new Promise((resolve) => setTimeout(resolve, 4_000))
          ]);
        }
        if (!node.naturalWidth) return false;
        try {
          await Promise.race([node.decode(), new Promise((resolve) => setTimeout(resolve, 4_000))]);
        } catch { return false; }
        return node.naturalWidth > 0;
      };
      return Promise.all(nodes.map(decode));
    });
    expect(imageStatus.every(Boolean)).toBe(true);
    await expect(page.locator('#modeToggle')).toHaveCount(0);
    await expectDiagnosticsClean(diagnostics);
  });
});
