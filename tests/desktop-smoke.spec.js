const { test, expect } = require('@playwright/test');
const { resolvePublicPath } = require('../scripts/serve-preview.cjs');

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
  test('预览服务只允许公开页面与资源', async () => {
    expect(resolvePublicPath('/index.html')).toMatch(/index\.html$/);
    expect(resolvePublicPath('/notes.html')).toMatch(/notes\.html$/);
    expect(resolvePublicPath('/assets/data/archive.js')).toMatch(/archive\.js$/);
    expect(resolvePublicPath('/.git/HEAD')).toBeNull();
    expect(resolvePublicPath('/content/godfather-trilogy-notes-v4.md')).toBeNull();
    expect(resolvePublicPath('/scripts/build-content.cjs')).toBeNull();
    expect(resolvePublicPath('/%2e%2e/package.json')).toBeNull();
  });

  test('加载资源并完成核心交互', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/教父/);
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

    await expect(page.locator('#chapters')).toHaveCount(0);
    await expect(page.locator('#chapterGrid')).toHaveCount(0);
    await expect(page.locator('.hero-poster')).toHaveCount(3);
    await expect(page.locator('.hero-poster img').first()).toHaveAttribute('src', /assets\/posters\/godfather/);
    expect(await page.locator('.hero-poster img').evaluateAll((images) => images.map((image) => image.getAttribute('src')))).toEqual([
      'assets/posters/godfather1.jpg',
      'assets/posters/godfather2.jpg',
      'assets/posters/godfather3.jpg'
    ]);
    await expect(page.locator('.hero-media img[src*="michael-alone"]')).toHaveCount(0);
    await expect(page.locator('#portalImageCount')).toHaveText('80');

    const poster = page.locator('.hero-poster img').first();
    await poster.click({ force: true });
    await expect(page.locator('#corleoneImageViewer')).toHaveAttribute('open', '');
    await expect(page.locator('#imageViewerDimensions')).toContainText('×');
    await expect(page.locator('[data-viewer-action="actual"]')).toHaveCount(0);
    await page.locator('[data-viewer-action="zoom-in"]').click();
    await expect(page.locator('#imageViewerDimensions')).toContainText('×');
    await page.locator('[data-viewer-action="fullscreen"]').click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await expect(page.locator('[data-viewer-action="fullscreen"]')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    await poster.click({ force: true });
    const closeState = await page.evaluate(() => {
      window.__viewerCloseStart = performance.now();
      document.querySelector('[data-viewer-action="close"]').click();
      return new Promise((resolve) => requestAnimationFrame(() => resolve({
        elapsed: performance.now() - window.__viewerCloseStart,
        open: document.querySelector('#corleoneImageViewer')?.open,
        locked: document.body.classList.contains('image-viewer-open'),
        closing: document.querySelector('#corleoneImageViewer')?.classList.contains('is-closing')
      })));
    });
    expect(closeState.elapsed).toBeLessThan(200);
    expect(closeState.open).toBe(false);
    expect(closeState.locked).toBe(false);
    expect(closeState.closing).toBe(false);
    await page.evaluate(() => window.CorleoneImageViewer.open(document.querySelector('.hero-poster img')));
    await expect(page.locator('#corleoneImageViewer')).toHaveAttribute('open', '');
    await expect(page.locator('#corleoneImageViewer')).not.toHaveClass(/is-closing/);
    await page.evaluate(() => document.querySelector('#corleoneImageViewer').click());
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    await page.evaluate(() => window.CorleoneImageViewer.open(document.querySelector('.hero-poster img')));
    await expect(page.locator('#corleoneImageViewer')).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');

    await expect(page.locator('#ruleGrid .rule-card')).toHaveCount(3);
    await expect(page.locator('#quoteIndex .quote-index-button')).toHaveCount(9);
    const quoteLabels = await page.locator('#quoteIndex .quote-index-label').allTextContents();
    expect(new Set(quoteLabels).size).toBe(9);
    expect(quoteLabels).toEqual(await page.evaluate(() => window.CORLEONE_ARCHIVE.quotes.map((quote) => quote.translation || quote.original)));
    await expect(page.locator('#thesis')).toHaveCount(0);
    await expect(page.locator('#motifGrid [data-motif="motif-02"]')).toContainText('洗礼');
    await expect(page.locator('#characters [data-person]')).toHaveCount(44);
    await expect(page.locator('#timelineItems .timeline-item')).toHaveCount(14);
    await expect(page.locator('.timeline-track')).toHaveCount(1);
    await expect(page.locator('.timeline-track .timeline-line')).toHaveCount(1);
    expect(await page.locator('.timeline-items .timeline-item').evaluateAll((items) => new Set(items.map((item) => item.offsetTop)).size)).toBe(1);
    const timelineGeometry = await page.evaluate(() => {
      const line = document.querySelector('.timeline-line').getBoundingClientRect();
      const dots = [...document.querySelectorAll('.timeline-item .timeline-dot')];
      const first = dots[0].getBoundingClientRect();
      const last = dots.at(-1).getBoundingClientRect();
      const firstCenter = { x: first.left + first.width / 2, y: first.top + first.height / 2 };
      const lastCenter = { x: last.left + last.width / 2, y: last.top + last.height / 2 };
      const lineCenterY = line.top + line.height / 2;
      return { start: Math.abs(line.left - firstCenter.x), end: Math.abs(line.right - lastCenter.x), firstY: Math.abs(lineCenterY - firstCenter.y), lastY: Math.abs(lineCenterY - lastCenter.y) };
    });
    expect(timelineGeometry.start).toBeLessThan(2);
    expect(timelineGeometry.end).toBeLessThan(2);
    expect(timelineGeometry.firstY).toBeLessThan(2);
    expect(timelineGeometry.lastY).toBeLessThan(2);
    const timelineLabels = await page.evaluate(() => window.CORLEONE_ARCHIVE.timeline.map((item) => ({ label: item.label, event: item.event })));
    expect(timelineLabels.some(({ label, event }) => label !== event)).toBe(true);
    const timelineScroller = page.locator('.timeline-scroll');
    await timelineScroller.scrollIntoViewIfNeeded();
    const timelineBox = await timelineScroller.boundingBox();
    await page.mouse.move(timelineBox.x + 300, timelineBox.y + 80);
    await page.mouse.down();
    await page.mouse.move(timelineBox.x + 80, timelineBox.y + 80);
    await page.mouse.up();
    await expect.poll(() => timelineScroller.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    await page.mouse.move(timelineBox.x + 300, timelineBox.y + 80);
    await page.mouse.down();
    await page.mouse.move(timelineBox.x + 80, timelineBox.y - 40);
    await page.mouse.up();
    await expect(timelineScroller).not.toHaveClass(/is-dragging/);
    const releasedScrollLeft = await timelineScroller.evaluate((node) => node.scrollLeft);
    await page.mouse.move(timelineBox.x + 260, timelineBox.y + 80);
    await page.waitForTimeout(120);
    await expect.poll(() => timelineScroller.evaluate((node) => node.scrollLeft)).toBe(releasedScrollLeft);
    await expect(page.locator('#motifGrid .motif')).toHaveCount(12);
    await expect(page.locator('#historyGrid .history-card')).toHaveCount(2);
    await expect(page.locator('#historyGrid img')).toHaveCount(0);
    await expect(page.locator('.history-intro a')).toHaveAttribute('href', 'notes.html#chapter-09-heading');
    const historyContracts = await page.evaluate(() => window.CORLEONE_ARCHIVE.history.map((item) => {
      const template = document.createElement('template');
      template.innerHTML = item.html;
      return { id: item.id, text: template.content.textContent };
    }));
    const normalizeHistoryText = (text) => text.replace(/\s+/g, ' ').replace(/\s+([，。；：、！？])/g, '$1').trim();
    for (const history of historyContracts) {
      await expect.poll(() => page.locator(`#${history.id} .history-card-copy`).innerText().then(normalizeHistoryText)).toBe(normalizeHistoryText(history.text));
    }
    const historyRects = await page.locator('#historyGrid > .history-card').evaluateAll((cards) => cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, width: rect.width };
    }));
    expect(historyRects[1].top).toBeGreaterThanOrEqual(historyRects[0].bottom);
    expect(historyRects.every((rect) => rect.width > 900)).toBe(true);
    const historyGeometry = await page.locator('#historyGrid > .history-card').evaluateAll((cards) => cards.map((card) => {
      const aside = card.querySelector('.history-card-aside').getBoundingClientRect();
      const meta = card.querySelector('.history-card-meta').getBoundingClientRect();
      const title = card.querySelector('h3').getBoundingClientRect();
      const copy = card.querySelector('.history-card-copy');
      const lastContent = copy.lastElementChild.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      return { asideHeight: aside.height, cardHeight: cardRect.height, titleGap: title.top - meta.bottom, copyOverflow: copy.scrollHeight > copy.clientHeight + 1, contentBottomInsideCard: lastContent.bottom <= cardRect.bottom + 1 };
    }));
    expect(historyGeometry.every(({ asideHeight, cardHeight, titleGap, copyOverflow, contentBottomInsideCard }) => asideHeight < cardHeight && titleGap >= 0 && titleGap < 36 && !copyOverflow && contentBottomInsideCard)).toBe(true);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    await page.waitForTimeout(450);
    await expect.poll(() => page.locator('#historyGrid > .history-card').first().evaluate((card) => Number(getComputedStyle(card).opacity))).toBe(0);
    const firstHistoryCard = page.locator('#historyGrid > .history-card').first();
    await firstHistoryCard.scrollIntoViewIfNeeded();
    await expect.poll(() => firstHistoryCard.evaluate((card) => Number(getComputedStyle(card).opacity))).toBe(1);
    const historyTransition = await firstHistoryCard.evaluate((card) => ({ duration: getComputedStyle(card).transitionDuration, properties: getComputedStyle(card).transitionProperty }));
    expect(historyTransition.duration).not.toBe('0s');
    expect(historyTransition.properties).toContain('opacity');
    for (const card of await page.locator('#historyGrid > .history-card').all()) {
      await card.scrollIntoViewIfNeeded();
      await expect.poll(() => card.evaluate((node) => Number(getComputedStyle(node).opacity))).toBe(1);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    await page.waitForTimeout(450);
    await expect.poll(() => firstHistoryCard.evaluate((card) => Number(getComputedStyle(card).opacity))).toBe(0);
    await firstHistoryCard.scrollIntoViewIfNeeded();
    await expect.poll(() => firstHistoryCard.evaluate((card) => Number(getComputedStyle(card).opacity))).toBe(1);
    await page.locator('.history-intro a').click();
    await expect(page).toHaveURL(/notes\.html#chapter-09-heading$/);
    await expect(page.locator('#chapter-09-heading')).toBeVisible();
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('#ruleGrid .rule-card.is-open')).toHaveCount(1);
    await expect(page.locator('#ruleGrid [role="tab"]')).toHaveCount(3);
    await expect(page.locator('#rule-panel')).toBeVisible();
    const ruleContracts = await page.evaluate(() => window.CORLEONE_ARCHIVE.rules.map((rule) => {
      const template = document.createElement('template');
      template.innerHTML = rule.html;
      return { id: rule.id, text: template.content.textContent };
    }));
    const normalizeRuleText = (text) => text.replace(/\s+/g, ' ').replace(/\s+([，。；：、！？])/g, '$1').trim();
    for (const rule of ruleContracts) {
      await page.locator(`#${rule.id}`).click();
      await expect(page.locator(`#${rule.id}`)).toHaveAttribute('aria-selected', 'true');
      await expect.poll(() => page.locator('#rule-panel .rule-panel-content').innerText().then(normalizeRuleText)).toBe(normalizeRuleText(rule.text));
    }
    await page.evaluate((ids) => ids.forEach((id) => document.getElementById(id).click()), ruleContracts.map((rule) => rule.id));
    const lastRule = ruleContracts.at(-1);
    await expect(page.locator(`#${lastRule.id}`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#ruleGrid [role="tab"][aria-selected="true"]')).toHaveCount(1);
    await expect(page.locator('#ruleGrid [role="tab"][tabindex="0"]')).toHaveCount(1);
    await expect.poll(() => page.locator('#rule-panel').getAttribute('data-rule-id')).toBe(lastRule.id);
    await expect.poll(() => page.locator('#rule-panel .rule-panel-content').innerText().then(normalizeRuleText)).toBe(normalizeRuleText(lastRule.text));
    const secondRule = page.locator('#ruleGrid .rule-card').nth(1);
    const firstRule = page.locator('#ruleGrid .rule-card').first();
    const firstRuleId = await firstRule.getAttribute('id');
    const secondRuleId = await secondRule.getAttribute('id');
    await secondRule.click();
    await expect(secondRule).toHaveClass(/is-open/);
    await expect(firstRule).not.toHaveClass(/is-open/);
    await expect(page.locator('#rule-panel')).toContainText((await page.evaluate((id) => window.CORLEONE_ARCHIVE.rules.find((rule) => rule.id === id).title, secondRuleId)));
    await secondRule.press('ArrowLeft');
    await expect(firstRule).toHaveClass(/is-open/);
    await expect(firstRule).toBeFocused();
    await secondRule.press('End');
    await expect(page.locator('#ruleGrid .rule-card').last()).toBeFocused();
    await page.locator('#ruleGrid .rule-card').last().press('Home');
    await expect(firstRule).toBeFocused();
    await expect(page.locator('#timelineItems .timeline-item').first()).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#timelineItems .timeline-item').last().click();
    await expect(page.locator('#timelineItems .timeline-item').last()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#timelineItems .timeline-item').first()).toHaveAttribute('aria-pressed', 'false');
    const timelineFirst = page.locator('#timelineItems .timeline-item').first();
    const timelineLast = page.locator('#timelineItems .timeline-item').last();
    await timelineFirst.focus();
    await page.keyboard.press('End');
    await expect(timelineLast).toBeFocused();
    await expect(page.locator('#timelineFocus')).toContainText(timelineLabels.at(-1).event);
    await page.keyboard.press('Home');
    await expect(timelineFirst).toBeFocused();
    await expect(page.locator('#timelineFocus')).toContainText(timelineLabels[0].event);

    await page.locator('#quote-09').click();
    await expect(page.locator('#quote-09')).toHaveClass(/is-active/);
    const characterGroups = page.locator('#characterFilters [data-character-filter]:not([data-character-filter="all"])');
    const firstCharacterGroup = characterGroups.first();
    const secondCharacterGroup = characterGroups.nth(1);
    const firstCharacterGroupId = await firstCharacterGroup.getAttribute('data-character-filter');
    const secondCharacterGroupId = await secondCharacterGroup.getAttribute('data-character-filter');
    const secondCharacterGroupCount = await page.locator(`#characters [data-group="${secondCharacterGroupId}"]`).count();
    await page.evaluate(([firstId, secondId]) => {
      document.querySelector(`[data-character-filter="${firstId}"]`).click();
      document.querySelector(`[data-character-filter="${secondId}"]`).click();
    }, [firstCharacterGroupId, secondCharacterGroupId]);
    await expect(page.locator('#characters [data-person]:not([hidden])')).toHaveCount(secondCharacterGroupCount);
    await page.locator('#characterFilters [data-character-filter="all"]').click();

    const personCard = page.locator('#characters [data-person]').first();
    const secondPersonCard = page.locator('#characters [data-person]').nth(1);
    const personTarget = await page.evaluate(() => window.CORLEONE_ARCHIVE.people[0].target);
    await personCard.click();
    const reader = page.locator('#reader');
    await expect(reader).toHaveClass(/is-open/);
    await expect(reader).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#readerBody p').first()).toBeVisible();
    await expect(page.locator('#reader .reader-media')).toHaveCount(0);
    await expect(page.locator('#readerBody img').first()).toBeVisible();
    await expect(page.locator('#readerFullscreen')).toBeVisible();
    expect(await page.locator('#readerPanel').evaluate((panel) => panel.getBoundingClientRect().width / window.innerWidth)).toBeGreaterThan(.85);
    expect(await page.locator('#readerBody img').first().evaluate((image) => {
      const rect = image.getBoundingClientRect();
      return getComputedStyle(image).objectFit === 'contain' && Math.abs(rect.width / rect.height - image.naturalWidth / image.naturalHeight) < .03;
    })).toBe(true);
    expect(await page.locator('#readerPanel').evaluate((panel) => panel.scrollHeight > panel.clientHeight)).toBe(true);
    await page.locator('#readerPanel').evaluate((panel) => { panel.scrollTop = panel.scrollHeight; });
    await expect.poll(() => page.locator('#readerPanel').evaluate((panel) => panel.scrollTop)).toBeGreaterThan(0);
    await expect(page.locator('#readerClose')).toBeFocused();
    const readerImages = page.locator('#readerBody img');
    const readerImageCount = await readerImages.count();
    expect(readerImageCount).toBeGreaterThan(0);
    for (let index = 0; index < readerImageCount; index += 1) {
      await page.keyboard.press('Tab');
      await expect(readerImages.nth(index)).toBeFocused();
    }
    await page.keyboard.press('Tab');
    await expect(page.locator('#readerFullLink')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#readerFullscreen')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#readerClose')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(reader).not.toHaveClass(/is-open/, { timeout: 2_000 });
    await expect(personCard).toBeFocused();

    await personCard.click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(180);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(210);
    await secondPersonCard.click();
    await page.waitForTimeout(240);
    await expect(reader).toHaveClass(/is-open/);
    await expect(reader).toHaveAttribute('aria-hidden', 'false');
    await page.keyboard.press('Escape');
    await expect(reader).not.toHaveClass(/is-open/, { timeout: 2_000 });

    await personCard.click();
    await expect(page.locator('#reader')).toHaveClass(/is-open/);
    await page.locator('#readerFullscreen').click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await expect(page.locator('#readerFullscreen')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#readerFullscreen').click();
    await expect(page.locator('#readerFullscreen')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#readerFullLink')).toHaveAttribute('href', `notes.html#${personTarget}`);
    await page.keyboard.press('Escape');
    await expect(page.locator('#reader')).not.toHaveClass(/is-open/, { timeout: 2_000 });

    const quote = page.locator('#quoteText');
    const initialQuote = await quote.textContent();
    await page.locator('#nextQuote').click();
    await expect(quote).not.toHaveText(initialQuote);
    await expect(page.locator('#notes-portal')).toBeVisible();
    await expect(page.locator('a[href="notes.html"]').first()).toBeVisible();
    await personCard.click();
    await page.locator('#readerFullLink').click();
    await expect(page).toHaveURL(new RegExp(`notes\\.html#${personTarget}$`));
    await expect.poll(() => page.locator(`#${personTarget}`).evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.top >= 0 && rect.top <= window.innerHeight;
    })).toBe(true);
    await expect(page.locator('#modeToggle')).toHaveCount(0);
    await expectDiagnosticsClean(diagnostics);
  });

  test('图片查看器覆盖海报、动态图片与嵌套档案弹窗', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect.poll(() => page.locator('#rule-panel').evaluate((panel) => getComputedStyle(panel).transitionDuration)).toBe('0s');
    await expect(page.locator('#historyGrid .history-card-copy').first()).toBeVisible();
    await expect.poll(() => page.locator('#historyGrid .history-card').first().evaluate((card) => getComputedStyle(card).transitionDuration)).toBe('0s');
    await page.locator('#ruleGrid .rule-card').nth(1).click();
    await expect(page.locator('#rule-panel')).not.toHaveClass(/is-switching/);

    await page.evaluate(() => {
      const image = document.createElement('img');
      image.id = 'dynamicViewerImage';
      image.alt = '动态测试影像';
      image.src = 'assets/posters/godfather1.jpg';
      document.body.append(image);
    });
    await expect(page.locator('#dynamicViewerImage')).toHaveAttribute('data-image-viewer-ready', 'true');
    await page.locator('#dynamicViewerImage').click();
    await expect(page.locator('#corleoneImageViewer')).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');

    const delayedExitPoster = page.locator('.hero-poster img').nth(1);
    await page.locator('#dynamicViewerImage').click();
    await page.locator('[data-viewer-action="fullscreen"]').click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await page.evaluate(() => {
      const nativeExit = document.exitFullscreen.bind(document);
      let release;
      window.__nativeViewerExit = nativeExit;
      window.__releaseViewerExit = async () => {
        await nativeExit();
        release?.();
      };
      document.exitFullscreen = () => new Promise((resolve) => { release = resolve; });
    });
    await page.keyboard.press('Escape');
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    await page.evaluate(() => window.CorleoneImageViewer.open(document.querySelectorAll('.hero-poster img')[1]));
    await page.evaluate(() => window.CorleoneImageViewer.close());
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    await page.evaluate(() => window.__releaseViewerExit());
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
    await page.evaluate(() => { document.exitFullscreen = window.__nativeViewerExit; delete window.__nativeViewerExit; delete window.__releaseViewerExit; });
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    await expect(delayedExitPoster).toBeFocused();

    const rejectedExitPoster = page.locator('.hero-poster img').first();
    await rejectedExitPoster.click();
    await page.locator('[data-viewer-action="fullscreen"]').click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await page.evaluate(() => {
      window.__nativeViewerExit = document.exitFullscreen.bind(document);
      document.exitFullscreen = () => Promise.reject(new Error('test rejected exit'));
    });
    await page.keyboard.press('Escape');
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    await expect(page.locator('body')).not.toHaveClass(/image-viewer-open/);
    await page.evaluate(async () => {
      document.exitFullscreen = window.__nativeViewerExit;
      await window.__nativeViewerExit();
      delete window.__nativeViewerExit;
    });
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);

    const posterSources = await page.locator('.hero-poster img').evaluateAll((images) => images.map((image) => image.src));
    for (let index = 0; index < posterSources.length; index += 1) {
      const poster = page.locator('.hero-poster img').nth(index);
      await poster.click();
      await expect(page.locator('#corleoneImageViewer')).toHaveAttribute('open', '');
      await expect(page.locator('.image-viewer-image')).toHaveAttribute('src', posterSources[index]);
      await page.keyboard.press('Escape');
      await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    }

    const personCard = page.locator('#characters [data-person]').first();
    await personCard.click();
    const reader = page.locator('#reader');
    const readerImage = page.locator('#readerBody img').first();
    await readerImage.click();
    await expect(page.locator('#corleoneImageViewer')).toHaveAttribute('open', '');
    await page.locator('[data-viewer-action="fullscreen"]').click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    await expect(reader).toHaveClass(/is-open/);
    await expect(readerImage).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(reader).not.toHaveClass(/is-open/);

    await personCard.click();
    await page.locator('#readerFullscreen').click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('readerPanel');
    const fullscreenReaderImage = page.locator('#readerBody img').first();
    await fullscreenReaderImage.click();
    await expect(page.locator('#corleoneImageViewer')).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    await expect(reader).toHaveClass(/is-open/);
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('readerPanel');
    await expect(fullscreenReaderImage).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(reader).not.toHaveClass(/is-open/);

    await page.locator('.hero-poster img').first().click();
    const viewerPanel = page.locator('.image-viewer-shell');
    await viewerPanel.evaluate((panel) => { panel.requestFullscreen = () => Promise.reject(new Error('test fallback')); });
    await page.locator('[data-viewer-action="fullscreen"]').click();
    await expect(viewerPanel).toHaveClass(/is-simulated-fullscreen/);
    await expect(page.locator('[data-viewer-action="fullscreen"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-viewer-action="fullscreen"]').click();
    await expect(viewerPanel).not.toHaveClass(/is-simulated-fullscreen/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    await expectDiagnosticsClean(diagnostics);
  });

  test('图片查看器缩放保持焦点并可触达四边', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const diagnostics = collectDiagnostics(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('.hero-poster img').first().click();
    await expect(page.locator('[data-viewer-action="actual"]')).toHaveCount(0);
    const fitWidth = await page.locator('.image-viewer-image').evaluate((image) => image.getBoundingClientRect().width);
    await page.locator('[data-viewer-action="zoom-in"]').click();
    await page.locator('[data-viewer-action="zoom-in"]').click();
    await page.locator('[data-viewer-action="zoom-in"]').click();
    const zoomed = await page.locator('.image-viewer-stage').evaluate((stage) => {
      const image = stage.querySelector('.image-viewer-image');
      const imageRect = image.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const style = getComputedStyle(stage);
      const padding = { left: parseFloat(style.paddingLeft), right: parseFloat(style.paddingRight), top: parseFloat(style.paddingTop), bottom: parseFloat(style.paddingBottom) };
      const center = { x: stageRect.left + stage.clientWidth / 2, y: stageRect.top + stage.clientHeight / 2 };
      stage.scrollLeft = 0;
      stage.scrollTop = 0;
      const start = image.getBoundingClientRect();
      stage.scrollLeft = stage.scrollWidth - stage.clientWidth;
      stage.scrollTop = stage.scrollHeight - stage.clientHeight;
      const end = image.getBoundingClientRect();
      return {
        width: imageRect.width,
        centered: Math.abs(imageRect.left + imageRect.width / 2 - center.x) < 3 && Math.abs(imageRect.top + imageRect.height / 2 - center.y) < 3,
        scrollable: stage.scrollWidth > stage.clientWidth && stage.scrollHeight > stage.clientHeight,
        edgesReachable: start.left >= stageRect.left + padding.left - 1 && start.top >= stageRect.top + padding.top - 1 && end.right <= stageRect.right - padding.right + 1 && end.bottom <= stageRect.bottom - padding.bottom + 1
      };
    });
    expect(zoomed.width / fitWidth).toBeGreaterThan(1.9);
    expect(zoomed.width / fitWidth).toBeLessThan(2.01);
    expect(zoomed.centered).toBe(true);
    expect(zoomed.scrollable).toBe(true);
    expect(zoomed.edgesReachable).toBe(true);
    const anchorBefore = await page.locator('.image-viewer-stage').evaluate((stage) => {
      const image = stage.querySelector('.image-viewer-image');
      const imageRect = image.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const imageLeft = imageRect.left - stageRect.left + stage.scrollLeft;
      const imageTop = imageRect.top - stageRect.top + stage.scrollTop;
      return { x: (stage.scrollLeft + stage.clientWidth / 2 - imageLeft) / imageRect.width, y: (stage.scrollTop + stage.clientHeight / 2 - imageTop) / imageRect.height };
    });
    await page.locator('[data-viewer-action="zoom-out"]').click();
    const anchorAfter = await page.locator('.image-viewer-stage').evaluate((stage) => {
      const image = stage.querySelector('.image-viewer-image');
      const imageRect = image.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const imageLeft = imageRect.left - stageRect.left + stage.scrollLeft;
      const imageTop = imageRect.top - stageRect.top + stage.scrollTop;
      return { x: (stage.scrollLeft + stage.clientWidth / 2 - imageLeft) / imageRect.width, y: (stage.scrollTop + stage.clientHeight / 2 - imageTop) / imageRect.height };
    });
    expect(Math.abs(anchorAfter.x - anchorBefore.x)).toBeLessThan(.03);
    expect(Math.abs(anchorAfter.y - anchorBefore.y)).toBeLessThan(.03);
    await page.locator('[data-viewer-action="fit"]').click();
    await expect(page.locator('#imageViewerDimensions')).toContainText('×');
    await page.keyboard.press('Escape');
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    await expectDiagnosticsClean(diagnostics);
    await page.close();
  });

  test('首页搜索会激活模块并把正文结果送入全文页', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    await page.addInitScript(() => {
      const key = 'desktop-smoke-search-hit-targets';
      const watch = () => new MutationObserver((records) => {
        const targets = new Set(JSON.parse(sessionStorage.getItem(key) || '[]'));
        records.forEach((record) => {
          if (record.attributeName === 'class' && record.target.classList.contains('search-hit') && record.target.id) targets.add(record.target.id);
        });
        sessionStorage.setItem(key, JSON.stringify([...targets]));
      }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });
      if (document.documentElement) watch();
      else document.addEventListener('DOMContentLoaded', watch, { once: true });
    });
    await page.goto('/', { waitUntil: 'networkidle' });

    const chapterData = await page.evaluate(() => {
      const chapter = window.CORLEONE_ARCHIVE.chapters[2];
      return { target: `${chapter.id}-heading`, title: chapter.title, index: window.CORLEONE_ARCHIVE.search.findIndex((item) => item.kind === 'chapter' && item.id === chapter.id) };
    });
    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill(chapterData.title);
    await Promise.all([
      page.waitForURL(new RegExp(`notes\\.html#${chapterData.target}$`)),
      page.locator(`[data-search-index="${chapterData.index}"]`).click()
    ]);
    await expect.poll(() => page.evaluate((target) => JSON.parse(sessionStorage.getItem('desktop-smoke-search-hit-targets') || '[]').includes(target), chapterData.target)).toBe(true);
    await page.goto('/', { waitUntil: 'networkidle' });

    const ruleData = await page.evaluate(() => ({ id: window.CORLEONE_ARCHIVE.rules[1].id, title: window.CORLEONE_ARCHIVE.rules[1].title, index: window.CORLEONE_ARCHIVE.search.findIndex((item) => item.kind === 'rule' && item.id === window.CORLEONE_ARCHIVE.rules[1].id) }));
    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill(ruleData.title);
    await page.locator(`[data-search-index="${ruleData.index}"]`).click();
    await expect(page.locator(`#${ruleData.id}`)).toHaveClass(/is-open/);

    const historyData = await page.evaluate(() => ({ id: window.CORLEONE_ARCHIVE.history[1].id, title: window.CORLEONE_ARCHIVE.history[1].title, index: window.CORLEONE_ARCHIVE.search.findIndex((item) => item.kind === 'history' && item.id === window.CORLEONE_ARCHIVE.history[1].id) }));
    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill(historyData.title);
    await page.locator(`[data-search-index="${historyData.index}"]`).click();
    await expect(page.locator(`#${historyData.id}`)).toHaveClass(/search-hit/);
    await expect.poll(() => page.locator(`#${historyData.id}`).evaluate((node) => node.getBoundingClientRect().top >= document.querySelector('header').getBoundingClientRect().bottom)).toBe(true);

    await page.evaluate(() => {
      window.CORLEONE_ARCHIVE.search = [
        ...Array.from({ length: 10 }, (_, index) => ({ kind: 'passage', id: `synthetic-${index}`, target: `synthetic-${index}`, title: `段落 ${index}`, text: '家庭模块正文命中' })),
        { kind: 'quote', id: 'synthetic-quote', target: 'synthetic-quote', title: '引文记录', text: '家庭模块正文命中' }
      ];
    });
    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill('家庭模块');
    await expect(page.locator('#searchResults .search-result')).toHaveCount(9);
    await expect(page.locator('#searchResults small').filter({ hasText: '引文' })).toHaveCount(1);
    await expect(page.locator('#searchResults small').filter({ hasText: '正文' })).toHaveCount(8);
    await page.keyboard.press('Escape');
    await page.goto('/', { waitUntil: 'networkidle' });

    const quoteData = await page.evaluate(() => ({ original: window.CORLEONE_ARCHIVE.quotes[4].original, id: window.CORLEONE_ARCHIVE.quotes[4].id, index: window.CORLEONE_ARCHIVE.search.findIndex((item) => item.kind === 'quote' && item.id === window.CORLEONE_ARCHIVE.quotes[4].id) }));
    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill(quoteData.original);
    await page.locator(`[data-search-index="${quoteData.index}"]`).click();
    await expect(page.locator(`#${quoteData.id}`)).toHaveClass(/is-active/);

    const timelineData = await page.evaluate(() => ({ id: window.CORLEONE_ARCHIVE.timeline[3].id, text: window.CORLEONE_ARCHIVE.timeline[3].event.slice(0, 8), event: window.CORLEONE_ARCHIVE.timeline[3].event.slice(0, 8), index: window.CORLEONE_ARCHIVE.search.findIndex((item) => item.kind === 'timeline' && item.id === window.CORLEONE_ARCHIVE.timeline[3].id) }));
    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill(timelineData.text);
    await page.locator(`[data-search-index="${timelineData.index}"]`).click();
    await expect(page.locator(`#${timelineData.id}`)).toHaveClass(/is-active/);
    await expect(page.locator('#timelineFocus')).toContainText(timelineData.event);

    await page.locator('#searchToggle').click();
    await expect(page.locator('#searchInput')).toBeFocused();
    await page.locator('#searchInput').fill('不存在的档案词条');
    await expect(page.locator('#searchMeta')).toHaveText('没有找到匹配记录');
    await page.keyboard.press('Tab');
    await expect(page.locator('#searchClose')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#searchInput')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#searchPanel')).toHaveAttribute('aria-hidden', 'true');

    const passageTarget = await page.evaluate(() => window.CORLEONE_ARCHIVE.search.find((item) => item.kind === 'passage' && item.text.includes('托马西诺庇护'))?.target);
    expect(passageTarget).toBeTruthy();
    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill('托马西诺庇护');
    await Promise.all([
      page.waitForURL(new RegExp(`notes\\.html#${passageTarget}$`)),
      page.locator('.search-result').first().click()
    ]);
    await expect.poll(() => page.evaluate((target) => JSON.parse(sessionStorage.getItem('desktop-smoke-search-hit-targets') || '[]').includes(target), passageTarget)).toBe(true);
    await expect.poll(() => page.locator(`#${passageTarget}`).evaluate((node) => node.getBoundingClientRect().top >= document.querySelector('.notes-header').getBoundingClientRect().bottom)).toBe(true);
    await expectDiagnosticsClean(diagnostics);
  });

  test('桌面文字层级与引文展示保持语义行组', async ({ page }) => {
    test.setTimeout(120_000);
    const diagnostics = collectDiagnostics(page);
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1024, height: 900 }
    ];
    const titleSelectors = [
      '#notes-portal h2',
      '#rules .section-title',
      '#timeline .section-title',
      '#characters .section-title',
      '#history .section-title',
      '#motifs .section-title',
      '#finale h2'
    ];
    const measureTitle = async (selector) => page.locator(selector).evaluate((title) => {
      const titleRect = title.getBoundingClientRect();
      const lines = [...title.querySelectorAll(':scope > .title-line')];
      const parentRect = title.parentElement.getBoundingClientRect();
      const edgeTolerance = parseFloat(getComputedStyle(title).fontSize) * .15 + 1;
      return {
        text: title.textContent.replace(/\s+/g, ''),
        lines: lines.map((line) => {
          const range = document.createRange();
          range.selectNodeContents(line);
          const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
          const rect = line.getBoundingClientRect();
          const rangeRect = rects.reduce((bounds, item) => ({
            left: Math.min(bounds.left, item.left),
            top: Math.min(bounds.top, item.top),
            right: Math.max(bounds.right, item.right),
            bottom: Math.max(bounds.bottom, item.bottom)
          }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
          return { text: line.textContent, rectCount: rects.length, width: rect.width, rangeRect, edgeTolerance, titleRect: { left: titleRect.left, top: titleRect.top, right: titleRect.right, bottom: titleRect.bottom }, parentRect: { left: parentRect.left, right: parentRect.right, top: parentRect.top, bottom: parentRect.bottom }, characters: [...line.textContent].length };
        })
      };
    });
    const lineFitsTitleAndParent = (line) => line.rectCount === 1
      && line.width > 0
      && line.rangeRect.left >= Math.max(line.titleRect.left, line.parentRect.left) - 1
      && line.rangeRect.top >= line.parentRect.top - line.edgeTolerance
      && line.rangeRect.right <= Math.min(line.titleRect.right, line.parentRect.right) + 1
      && line.rangeRect.bottom <= line.parentRect.bottom + line.edgeTolerance
      && line.characters > 1;
    const homeFontRoles = [
      { label: '首页主导航', selector: '.top-nav a', minimum: 13.5 },
      { label: '首页操作按钮', selector: '.button', minimum: 13 },
      { label: '时间轴标签', selector: '.timeline-item small', minimum: 12 },
      { label: '时间轴操作入口', selector: '.timeline-item p', minimum: 13 },
      { label: '引文来源', selector: '.quote-source', minimum: 12 },
      { label: '引文索引按钮', selector: '.quote-index-button', minimum: 12 },
      { label: '引文索引文字', selector: '.quote-index-label', minimum: 12 },
      { label: '人物辅助标签', selector: '.character-body small', minimum: 11 },
      { label: '人物辅助说明', selector: '.character-body p', minimum: 13 },
      { label: '符号辅助说明', selector: '.motif p', minimum: 13 },
      { label: '全文入口统计', selector: '.notes-portal-meta span', minimum: 12 },
      { label: '史实继续阅读入口', selector: '.history-intro > a', minimum: 13 },
      { label: '首页页脚', selector: '.site-footer', minimum: 12 }
    ];
    const notesFontRoles = [
      { label: '全文品牌标题', selector: '.brand-copy strong', minimum: 14 },
      { label: '全文品牌副标题', selector: '.brand-copy span', minimum: 11 },
      { label: '全文主导航', selector: '.notes-nav a', minimum: 14 },
      { label: '全文返回入口', selector: '.notes-return', minimum: 13 },
      { label: '全文页 kicker', selector: '.notes-kicker', minimum: 11 },
      { label: '目录标题', selector: '.note-toc-head', minimum: 11 },
      { label: '目录一级条目', selector: '.note-toc a[data-depth="2"]', minimum: 14 },
      { label: '目录三级条目', selector: '.note-toc a[data-depth="3"]', minimum: 13 },
      { label: '全文工具栏元信息', selector: '.note-toolbar-meta', minimum: 12 },
      { label: '全文继续阅读入口', selector: '.note-toolbar a', minimum: 13 },
      { label: '全文统计标签', selector: '.notes-stats span', minimum: 12 }
    ];
    const measureFontRoles = async (roles) => page.evaluate((definitions) => definitions.map(({ label, selector, minimum }) => {
      const nodes = [...document.querySelectorAll(selector)];
      const sizes = nodes.flatMap((node) => {
        const textParents = new Set();
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        let textNode;
        while ((textNode = walker.nextNode())) {
          if (textNode.data.trim() && textNode.parentElement) textParents.add(textNode.parentElement);
        }
        const elements = textParents.size ? [...textParents] : [node];
        return elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
      });
      return { label, selector, minimum, count: nodes.length, sizes };
    }), roles);
    const assertFontRoles = (results, viewportWidth) => {
      results.forEach((result) => {
        expect(result.count, `${viewportWidth} ${result.label} selector`).toBeGreaterThan(0);
        expect(result.sizes.every((size) => size >= result.minimum), `${viewportWidth} ${result.label} font size`).toBe(true);
      });
    };

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('#ruleGrid .rule-card')).toHaveCount(3);
      await expect(page.locator('#timelineItems .timeline-item')).toHaveCount(14);
      await expect(page.locator('#characters [data-person]')).toHaveCount(44);
      await expect(page.locator('#historyGrid .history-card')).toHaveCount(2);
      await expect(page.locator('#motifGrid .motif')).toHaveCount(12);
      for (const selector of titleSelectors) {
        const title = await measureTitle(selector);
        expect(title.lines.length, `${viewport.width} ${selector} line count`).toBeGreaterThan(0);
        expect(title.lines.every(lineFitsTitleAndParent), `${viewport.width} ${selector} line geometry`).toBe(true);
      }
      const homeEnvironment = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        dpr: window.devicePixelRatio,
        fonts: document.fonts.status,
        declaredFont: getComputedStyle(document.querySelector('.section-title')).fontFamily,
        actualFont: '浏览器 CSSOM 未暴露实际字体，按声明字体栈记录',
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      }));
      expect(homeEnvironment).toMatchObject({ innerWidth: viewport.width, innerHeight: viewport.height, horizontalOverflow: false });
      expect(homeEnvironment.dpr).toBeGreaterThan(0);
      expect(homeEnvironment.fonts).toBe('loaded');
      expect(homeEnvironment.declaredFont).toBeTruthy();
      assertFontRoles(await measureFontRoles(homeFontRoles), viewport.width);
      await page.locator('#searchToggle').click();
      await expect(page.locator('#searchPanel')).toHaveClass(/is-open/);
      await page.locator('#searchInput').fill('教父');
      await expect(page.locator('.search-result').first()).toBeVisible();
      await expect.poll(() => page.locator('.search-shell').evaluate((shell) => {
        const style = getComputedStyle(shell);
        return style.opacity === '1' && style.transform === 'none';
      })).toBe(true);
      const searchGeometry = await page.evaluate(() => {
        const shell = document.querySelector('.search-shell');
        const shellRect = shell.getBoundingClientRect();
        const results = [...document.querySelectorAll('.search-result')];
        const textSizes = results.flatMap((result) => ['strong', 'span', 'small'].map((selector) => {
          const node = result.querySelector(selector);
          return node ? { selector, size: Number.parseFloat(getComputedStyle(node).fontSize), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, scrollHeight: node.scrollHeight, whiteSpace: getComputedStyle(node).whiteSpace, textOverflow: getComputedStyle(node).textOverflow } : null;
        }).filter(Boolean));
        const resultOverflow = results.some((result) => {
          const rect = result.getBoundingClientRect();
          const title = result.querySelector('strong');
          const kind = result.querySelector('small');
          return rect.left < shellRect.left - 1 || rect.right > shellRect.right + 1
            || [title, kind].some((node) => node && node.scrollHeight > node.clientHeight + 1);
        });
        return {
          resultCount: results.length,
          shellHorizontalOverflow: shell.scrollWidth > shell.clientWidth + 1,
          resultOverflow,
          textSizes
        };
      });
      expect(searchGeometry.resultCount, `${viewport.width} search results`).toBeGreaterThan(0);
      expect(searchGeometry.shellHorizontalOverflow, `${viewport.width} search shell horizontal overflow`).toBe(false);
      expect(searchGeometry.resultOverflow, `${viewport.width} search result clipping`).toBe(false);
      expect(searchGeometry.textSizes.every(({ size }) => size > 0), `${viewport.width} search text visibility`).toBe(true);
      expect(searchGeometry.textSizes.filter(({ selector }) => selector === 'span').every(({ size }) => size >= 12), `${viewport.width} search excerpt font size`).toBe(true);
      expect(searchGeometry.textSizes.filter(({ selector }) => selector === 'small').every(({ size }) => size >= 11), `${viewport.width} search type font size`).toBe(true);
      expect(searchGeometry.textSizes.filter(({ selector }) => selector === 'span').every(({ width, height }) => width > 0 && height > 0), `${viewport.width} search excerpt visibility`).toBe(true);
      expect(searchGeometry.textSizes.filter(({ selector }) => selector === 'span').every(({ whiteSpace, textOverflow }) => whiteSpace === 'nowrap' && textOverflow === 'ellipsis'), `${viewport.width} search excerpt clipping contract`).toBe(true);
      await page.locator('#searchClose').click();
      await expect(page.locator('#searchPanel')).not.toHaveClass(/is-open/);
      const quoteIndexLabelLines = await page.locator('.quote-index-label').evaluateAll((labels) => labels.map((label) => {
        const lines = new Map();
        const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        let node;
        while ((node = walker.nextNode())) {
          for (let index = 0; index < node.length; index += 1) {
            if (/\s/.test(node.data[index])) continue;
            range.setStart(node, index);
            range.setEnd(node, index + 1);
            const rect = [...range.getClientRects()].find((item) => item.width > 0 && item.height > 0);
            if (!rect) continue;
            const key = Math.round(rect.top * 10) / 10;
            if (!lines.has(key)) lines.set(key, []);
            lines.get(key).push(node.data[index]);
          }
        }
        return [...lines.values()].map((line) => line.join(''));
      }));
      expect(quoteIndexLabelLines.every((lines) => lines.length <= 2 && lines.every((line) => [...line].length > 1)), `${viewport.width} quote index label geometry`).toBe(true);
      expect(quoteIndexLabelLines[5].at(-1), `${viewport.width} quote-06 index label ending`).not.toBe('去！');
      test.info().annotations.push({ type: 'viewport-baseline', description: `home ${JSON.stringify(homeEnvironment)}` });
      await page.goto('/notes.html', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const heroTitle = await measureTitle('.notes-hero h1');
      expect(heroTitle.lines.every(lineFitsTitleAndParent), `${viewport.width} notes hero geometry`).toBe(true);
      const chapterHeadingLines = await page.locator('.note-content h1, .note-content h2[id^="chapter-"], .note-content h3').evaluateAll((headings) => headings.map((heading) => {
        const textNodes = [];
        const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
        let textNode;
        while ((textNode = walker.nextNode())) textNodes.push(textNode);
        const lines = new Map();
        const range = document.createRange();
        textNodes.forEach((node) => {
          for (let index = 0; index < node.length; index += 1) {
            if (/\s/.test(node.data[index])) continue;
            range.setStart(node, index);
            range.setEnd(node, index + 1);
            const rect = [...range.getClientRects()].find((item) => item.width > 0 && item.height > 0);
            if (!rect) continue;
            const key = Math.round(rect.top * 10) / 10;
            if (!lines.has(key)) lines.set(key, []);
            lines.get(key).push(node.data[index]);
          }
        });
        return [...lines.values()].map((line) => line.join(''));
      }));
      expect(chapterHeadingLines.length).toBeGreaterThan(0);
      expect(chapterHeadingLines.every((lines) => lines.length > 0 && lines.every((line) => [...line].length > 1)), `${viewport.width} chapter heading line geometry`).toBe(true);
      const notesEnvironment = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        dpr: window.devicePixelRatio,
        fonts: document.fonts.status,
        declaredFont: getComputedStyle(document.querySelector('.note-content')).fontFamily,
        actualFont: '浏览器 CSSOM 未暴露实际字体，按声明字体栈记录',
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      }));
      expect(notesEnvironment).toMatchObject({ innerWidth: viewport.width, innerHeight: viewport.height, horizontalOverflow: false });
      expect(notesEnvironment.dpr).toBeGreaterThan(0);
      expect(notesEnvironment.fonts).toBe('loaded');
      expect(notesEnvironment.declaredFont).toBeTruthy();
      assertFontRoles(await measureFontRoles(notesFontRoles), viewport.width);
      const notesHeaderGeometry = await page.evaluate(() => {
        const regions = ['.brand', '.notes-nav', '.notes-return'].map((selector) => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return { selector, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        });
        const overlaps = [];
        for (let index = 0; index < regions.length; index += 1) {
          for (let next = index + 1; next < regions.length; next += 1) {
            const current = regions[index];
            const other = regions[next];
            if (current.left < other.right - 1 && current.right > other.left + 1 && current.top < other.bottom - 1 && current.bottom > other.top + 1) {
              overlaps.push(`${current.selector}:${other.selector}`);
            }
          }
        }
        return { overlaps, regions };
      });
      expect(notesHeaderGeometry.overlaps, `${viewport.width} notes header overlap`).toEqual([]);
      await page.locator('.note-sidebar').scrollIntoViewIfNeeded();
      const readActiveToc = () => page.locator('#noteToc').evaluate((toc) => {
        const active = toc.querySelector('a.is-active')?.getBoundingClientRect();
        const rail = toc.getBoundingClientRect();
        return {
          href: toc.querySelector('a.is-active')?.getAttribute('href') || '',
          scrollTop: toc.scrollTop,
          top: active?.top ?? 0,
          bottom: active?.bottom ?? 0,
          visible: Boolean(active && active.top >= rail.top - 1 && active.bottom <= rail.bottom + 1)
        };
      });
      let previousActiveToc = null;
      let stableActiveTocSamples = 0;
      await expect.poll(async () => {
        const state = await readActiveToc();
        const isStable = state.visible && previousActiveToc
          && state.href === previousActiveToc.href
          && Math.abs(state.scrollTop - previousActiveToc.scrollTop) < .5
          && Math.abs(state.top - previousActiveToc.top) < .5
          && Math.abs(state.bottom - previousActiveToc.bottom) < .5;
        stableActiveTocSamples = isStable ? stableActiveTocSamples + 1 : 0;
        previousActiveToc = state;
        return stableActiveTocSamples >= 2;
      }).toBe(true);
      await page.locator('#noteToc').evaluate((toc) => { toc.scrollTop = toc.scrollHeight; });
      const readTocEnd = () => page.locator('#noteToc').evaluate((toc) => {
        const last = toc.querySelector('a:last-of-type')?.getBoundingClientRect();
        return {
          atEnd: toc.scrollTop + toc.clientHeight >= toc.scrollHeight - 1,
          lastInViewport: Boolean(last && last.top >= -1 && last.bottom <= window.innerHeight + 1),
          scrollTop: toc.scrollTop,
          lastTop: last?.top ?? 0,
          lastBottom: last?.bottom ?? 0
        };
      });
      let previousTocEnd = null;
      let stableTocEndSamples = 0;
      await expect.poll(async () => {
        const state = await readTocEnd();
        const isStable = state.atEnd && state.lastInViewport && previousTocEnd
          && Math.abs(state.scrollTop - previousTocEnd.scrollTop) < .5
          && Math.abs(state.lastTop - previousTocEnd.lastTop) < .5
          && Math.abs(state.lastBottom - previousTocEnd.lastBottom) < .5;
        stableTocEndSamples = isStable ? stableTocEndSamples + 1 : 0;
        previousTocEnd = state;
        return stableTocEndSamples >= 2;
      }).toBe(true);
      const tocGeometry = await page.locator('#noteToc').evaluate((toc) => {
        const links = [...toc.querySelectorAll('a')];
        const rail = toc.getBoundingClientRect();
        const last = links.at(-1)?.getBoundingClientRect();
        const textOverflow = links.some((link) => {
          const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
          const range = document.createRange();
          let textNode;
          while ((textNode = walker.nextNode())) {
            if (!textNode.data.trim()) continue;
            range.selectNodeContents(textNode);
            for (const rect of range.getClientRects()) {
              if (rect.width > 0 && (rect.left < rail.left - 1 || rect.right > rail.right + 1)) return true;
            }
          }
          return false;
        });
        return {
          linkCount: links.length,
          scrollHeight: toc.scrollHeight,
          clientHeight: toc.clientHeight,
          reachedEnd: toc.scrollTop + toc.clientHeight >= toc.scrollHeight - 1,
          lastLinkInside: Boolean(last && last.bottom <= rail.bottom + 1),
          lastLinkInViewport: Boolean(last && last.top >= -1 && last.bottom <= window.innerHeight + 1),
          tocHorizontalOverflow: toc.scrollWidth > toc.clientWidth + 1,
          tocLinkHorizontalOverflow: links.some((link) => {
            const rect = link.getBoundingClientRect();
            return rect.left < rail.left - 1 || rect.right > rail.right + 1;
          }),
          tocTextHorizontalOverflow: textOverflow
        };
      });
      expect(tocGeometry.linkCount, `${viewport.width} notes toc link count`).toBeGreaterThan(44);
      expect(tocGeometry.reachedEnd, `${viewport.width} notes toc reaches end`).toBe(true);
      expect(tocGeometry.lastLinkInside, `${viewport.width} notes toc last link`).toBe(true);
      expect(tocGeometry.lastLinkInViewport, `${viewport.width} notes toc last link viewport`).toBe(true);
      expect(tocGeometry.tocHorizontalOverflow, `${viewport.width} notes toc horizontal overflow`).toBe(false);
      expect(tocGeometry.tocLinkHorizontalOverflow, `${viewport.width} notes toc link horizontal overflow`).toBe(false);
      expect(tocGeometry.tocTextHorizontalOverflow, `${viewport.width} notes toc text horizontal overflow`).toBe(false);
      test.info().annotations.push({ type: 'viewport-baseline', description: `notes ${JSON.stringify({ ...notesEnvironment, toc: tocGeometry, header: notesHeaderGeometry })}` });
    }

    const quotes = await page.evaluate(() => window.CORLEONE_ARCHIVE.quotes.map(({ id, translation, original, source, group, explanation }) => ({ id, translation, original, source, group, explanation })));
    const expectedQuoteLineGroups = {
      'quote-01': ['我会给他一个他无法拒绝的条件'],
      'quote-02': ['一个不抽时间陪伴家人的男人', '永远算不上真正的男人'],
      'quote-03': ['亲近你的朋友', '但要更亲近你的敌人'],
      'quote-04': ['永远不要恨你的敌人', '那会影响你的判断'],
      'quote-05': ['伟大的人并非生来伟大', '而是在成长中造就伟大'],
      'quote-06': ['当我以为我已经抽身了', '他们又把我硬生生拽了回去！'],
      'quote-07': ['金融是一把枪', '政治则是知晓何时扣动扳机'],
      'quote-08': ['他们越富有就越危险'],
      'quote-09': ['我们比全美钢铁公司还要大']
    };
    const checkQuoteViewport = async (viewport) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.setViewportSize(viewport);
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const viewportLineGroups = [];
      for (let index = 0; index < quotes.length; index += 1) {
        const quote = quotes[index];
        await page.locator(`[data-quote-index="${index}"]`).click();
        await expect.poll(() => page.locator('#quoteText').getAttribute('data-quote-id')).toBe(quote.id);
        await expect.poll(() => page.locator('#quoteText').evaluate((node) => getComputedStyle(node).transform)).toBe('none');
        const state = await page.locator('#quoteText').evaluate((node) => {
          const quoteRect = node.getBoundingClientRect();
          const verticalTolerance = parseFloat(getComputedStyle(node).fontSize) * .15 + 1;
          return {
            display: node.textContent.replace(/\s+/g, ''),
            accessible: node.getAttribute('aria-label'),
            quoteRect: { left: quoteRect.left, top: quoteRect.top, right: quoteRect.right, bottom: quoteRect.bottom },
            verticalTolerance,
            lines: [...node.querySelectorAll('.quote-line')].map((line) => {
              const range = document.createRange();
              range.selectNodeContents(line);
              const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
              const rangeRect = rects.reduce((bounds, rect) => ({
                left: Math.min(bounds.left, rect.left),
                top: Math.min(bounds.top, rect.top),
                right: Math.max(bounds.right, rect.right),
                bottom: Math.max(bounds.bottom, rect.bottom)
              }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
              return { text: line.textContent, rectCount: rects.length, rangeRect };
            }),
            translation: document.getElementById('quoteTranslation').textContent,
            source: document.getElementById('quoteSource').textContent,
            explanation: document.getElementById('quoteExplanation').textContent
          };
        });
        expect(state.display).toBe(quote.translation.replace(/[，。]/g, ''));
        expect(state.accessible).toBe(quote.translation);
        expect(state.lines.length).toBeGreaterThanOrEqual(1);
        expect(state.lines.length).toBeLessThanOrEqual(3);
        expect(state.lines.map((line) => line.text)).toEqual(expectedQuoteLineGroups[quote.id]);
        expect(state.lines.every((line) => line.rectCount === 1 && [...line.text].length > 1
          && line.rangeRect.left >= state.quoteRect.left - 1
          && line.rangeRect.top >= state.quoteRect.top - state.verticalTolerance
          && line.rangeRect.right <= state.quoteRect.right + 1
          && line.rangeRect.bottom <= state.quoteRect.bottom + state.verticalTolerance)).toBe(true);
        expect(state.translation).toBe(quote.original);
        expect(state.source).toBe(`${quote.source} / ${quote.group}`);
        expect(state.explanation).toBe(quote.explanation);
        const ariaSnapshot = await page.locator('#quoteText').ariaSnapshot();
        expect(ariaSnapshot.split(quote.translation)).toHaveLength(2);
        await expect(page.locator('.quote-mark--open')).toHaveText('“');
        await expect(page.locator('.quote-mark--close')).toHaveText('”');
        const quoteMarkGeometry = await page.evaluate(() => {
          const main = document.querySelector('.quote-main').getBoundingClientRect();
          const quote = document.querySelector('#quoteText').getBoundingClientRect();
          const openNode = document.querySelector('.quote-mark--open');
          const closeNode = document.querySelector('.quote-mark--close');
          const open = openNode.getBoundingClientRect();
          const close = closeNode.getBoundingClientRect();
          const center = (rect) => rect.top + rect.height / 2;
          return {
            leftInset: open.left - main.left,
            rightInset: main.right - close.right,
            openWidth: open.width,
            closeWidth: close.width,
            openCenter: center(open),
            closeCenter: center(close),
            quoteCenter: center(quote),
            openTransform: getComputedStyle(openNode).transform,
            closeTransform: getComputedStyle(closeNode).transform
          };
        });
        expect(Math.abs(quoteMarkGeometry.leftInset - quoteMarkGeometry.rightInset)).toBeLessThan(1);
        expect(Math.abs(quoteMarkGeometry.openWidth - quoteMarkGeometry.closeWidth)).toBeLessThan(1);
        expect(Math.abs(quoteMarkGeometry.openCenter - quoteMarkGeometry.closeCenter)).toBeLessThan(1);
        expect(Math.abs(quoteMarkGeometry.openCenter - quoteMarkGeometry.quoteCenter)).toBeLessThan(1);
        expect(quoteMarkGeometry.openTransform).toBe('none');
        expect(quoteMarkGeometry.closeTransform).toBe('none');
        viewportLineGroups.push(state.lines.map((line) => line.text));
      }

      await page.locator('[data-quote-index="1"]').click();
      await page.locator('[data-quote-index="6"]').click();
      await expect.poll(() => page.locator('#quoteText').getAttribute('data-quote-id')).toBe('quote-07');
      await expect(page.locator('#quoteText')).toHaveAttribute('aria-label', quotes[6].translation);
      await expect(page.locator('#quoteTranslation')).toHaveText(quotes[6].original);
      await expect(page.locator('#quoteSource')).toHaveText(`${quotes[6].source} / ${quotes[6].group}`);
      await expect(page.locator('#quoteExplanation')).toHaveText(quotes[6].explanation);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('[data-quote-index="7"]').click();
      await expect(page.locator('#quoteText')).toHaveAttribute('data-quote-id', 'quote-08');
      await expect(page.locator('#quoteText')).toHaveAttribute('aria-label', quotes[7].translation);
      await expect(page.locator('#quoteTranslation')).toHaveText(quotes[7].original);
      await expect(page.locator('#quoteSource')).toHaveText(`${quotes[7].source} / ${quotes[7].group}`);
      await expect(page.locator('#quoteExplanation')).toHaveText(quotes[7].explanation);
      await expect(page.locator('#quoteText')).not.toHaveClass(/is-switching/);
      return viewportLineGroups;
    };
    const baselineQuoteLineGroups = await checkQuoteViewport(viewports[0]);
    for (const viewport of viewports.slice(1)) {
      await expect(checkQuoteViewport(viewport)).resolves.toEqual(baselineQuoteLineGroups);
    }
    await expectDiagnosticsClean(diagnostics);
  });

  test('全文页保留原文并维护跨章节目录定位', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    await page.goto('/notes.html', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/全文 \/ 教父/);
    await expect(page.locator('#noteContent .note-chapter')).toHaveCount(12);
    await expect(page.locator('#noteContent h4')).toHaveCount(44);
    expect(await page.locator('#noteToc a').count()).toBeGreaterThan(44);
    await expect(page.locator('#noteContent')).toContainText('《教父》三部曲全景笔记');
    await expect(page.locator('#noteContent')).toContainText('视听语言与电影符号系统');
    await expect(page.locator('#notesImageCount')).toHaveText('80');
    expect(await page.locator('#chapter-03 img[src*="assets/posters/"]').first().getAttribute('src')).toBe('assets/posters/godfather1.jpg');
    expect(await page.locator('#chapter-04 img[src*="assets/posters/"]').first().getAttribute('src')).toBe('assets/posters/godfather2.jpg');
    expect(await page.locator('#chapter-05 img[src*="assets/posters/"]').first().getAttribute('src')).toBe('assets/posters/godfather3.jpg');
    await expect(page.locator('#noteContent img[data-image-viewer-ready="true"]')).toHaveCount(await page.locator('#noteContent img').count());
    const noteImage = page.locator('#noteContent img').first();
    await noteImage.click({ force: true });
    await expect(page.locator('#corleoneImageViewer')).toHaveAttribute('open', '');
    await page.locator('[data-viewer-action="fullscreen"]').click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    const directoryTargets = await page.locator('#directory a[href^="#"]').evaluateAll((links) => links.map((link) => link.hash.slice(1)));
    expect(directoryTargets).toHaveLength(10);
    expect(await page.evaluate((targets) => targets.every((target) => document.querySelectorAll(`#${CSS.escape(target)}`).length === 1), directoryTargets)).toBe(true);

    const sourceTargets = await page.evaluate(() => window.CORLEONE_ARCHIVE.search
      .filter((item) => ['chapter', 'person', 'passage'].includes(item.kind))
      .map((item) => item.target));
    const invalidTargets = await page.evaluate((targets) => targets.filter((target) => !target || document.querySelectorAll(`#${CSS.escape(target)}`).length !== 1), sourceTargets);
    expect(invalidTargets).toEqual([]);
    const duplicateIds = await page.locator('[id]').evaluateAll((nodes) => {
      const ids = nodes.map((node) => node.id).filter(Boolean);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    expect(duplicateIds).toEqual([]);

    const table = page.locator('#noteContent table').first();
    const tableHeading = await table.evaluate((node) => {
      const headings = [...node.closest('.note-chapter').querySelectorAll('h2, h3')];
      let current = headings[0];
      headings.forEach((heading) => { if (heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) current = heading; });
      return current.id;
    });
    await table.scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator(`#noteToc a[href="#${tableHeading}"]`).evaluate((node) => node.classList.contains('is-active'))).toBe(true);
    await expect.poll(() => page.locator('#noteToc a.is-active').evaluate((node) => {
      const link = node.getBoundingClientRect();
      const rail = document.getElementById('noteToc').getBoundingClientRect();
      return link.top >= rail.top && link.bottom <= rail.bottom;
    })).toBe(true);
    await expect.poll(() => table.evaluate((node) => getComputedStyle(node).opacity)).toBe('1');

    const personTarget = await page.evaluate(() => window.CORLEONE_ARCHIVE.people[0].target);
    await page.goto(`/notes.html#${personTarget}`, { waitUntil: 'networkidle' });
    await expect.poll(() => page.locator(`#${personTarget}`).evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const headerBottom = document.querySelector('.notes-header').getBoundingClientRect().bottom;
      return rect.top >= headerBottom && rect.top <= window.innerHeight;
    })).toBe(true);
    await expect(page.locator('#noteToc a.is-active')).toHaveAttribute('href', /^#chapter-06-/);

    await page.locator('#noteContent table').first().scrollIntoViewIfNeeded();
    await expect(page.locator('#noteToc a[href="#chapter-07-heading"]')).toHaveClass(/is-active/);
    await page.locator('#chapter-03-heading').evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'auto' }));
    await expect(page.locator('#chapter-03-heading')).toBeInViewport();
    await expect(page.locator('#noteToc a.is-active')).toHaveAttribute('href', /^#chapter-03-/);
    await expect.poll(() => page.locator('#noteToc a.is-active').evaluate((node) => {
      const link = node.getBoundingClientRect();
      const rail = document.getElementById('noteToc').getBoundingClientRect();
      return link.top >= rail.top && link.bottom <= rail.bottom;
    })).toBe(true);

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
          const decoded = await Promise.race([
            node.decode().then(() => true).catch(() => false),
            new Promise((resolve) => setTimeout(() => resolve(false), 4_000))
          ]);
          return decoded === true;
        } catch { return false; }
      };
      return Promise.all(nodes.map(decode));
    });
    expect(imageStatus.every(Boolean)).toBe(true);
    await page.goto('/notes.html#%E0%A4%A', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/notes\.html$/);
    await expect(page.locator('#modeToggle')).toHaveCount(0);
    await expectDiagnosticsClean(diagnostics);
  });

  test('全文角色标注保真、简称映射并在当前页打开人物卡', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    await page.goto('/notes.html', { waitUntil: 'networkidle' });
    const expectedText = await page.evaluate(() => window.CORLEONE_ARCHIVE.sections.map((section) => {
      const template = document.createElement('template');
      template.innerHTML = section.html;
      return template.content.textContent;
    }).join(''));
    expect(await page.locator('#noteContent').textContent()).toBe(expectedText);

    const expectedLinks = await page.evaluate(() => window.CORLEONE_ARCHIVE.sections.flatMap((section) => {
      const template = document.createElement('template');
      template.innerHTML = section.html;
      return [...template.content.querySelectorAll('a')].map((link) => ({ href: link.getAttribute('href'), target: link.getAttribute('target'), rel: link.getAttribute('rel') }));
    }));
    const actualLinks = await page.locator('#noteContent a').evaluateAll((links) => links.map((link) => ({ href: link.getAttribute('href'), target: link.getAttribute('target'), rel: link.getAttribute('rel') })));
    expect(actualLinks).toEqual(expectedLinks);

    await expect(page.locator('.person-mention')).not.toHaveCount(0);
    await expect(page.locator('#chapter-06-part-49 .person-mention')).not.toHaveCount(0);
    await expect(page.locator('.person-mention[data-person="person-01"]').filter({ hasText: 'Don Vito' })).toHaveCount(1);
    await expect(page.locator('#chapter-09-block-008 .person-mention[data-person="person-43"]')).toHaveCount(0);
    await expect(page.locator('#chapter-04-block-008 .person-mention[data-person="person-15"]')).toHaveCount(0);
    await expect(page.locator('#chapter-06-block-350 .person-mention[data-person="person-01"]')).toHaveCount(0);
    await expect(page.locator('#chapter-06-block-292 .person-mention[data-person="person-15"]')).toHaveCount(0);
    expect(await page.locator('#chapter-04-block-030').evaluate((block) => {
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      let textNode;
      while ((textNode = walker.nextNode())) if (textNode.data.includes('文森佐·潘坦捷利')) return true;
      return false;
    })).toBe(true);
    await expect(page.locator('#chapter-04-block-016 .person-mention').filter({ hasText: '罗萨托' })).toHaveCount(0);
    for (const personId of ['person-25', 'person-26', 'person-27']) {
      await expect(page.locator(`#chapter-02-block-009 .person-mention[data-person="${personId}"]`)).toHaveCount(0);
    }
    await expect(page.locator('#chapter-06-block-329 .person-mention[data-person="person-15"]')).toHaveCount(0);
    const expectedAliasMappings = [['布拉西', 'person-13'], ['芳丹', 'person-20'], ['本纳瑟拉', 'person-22'], ['格林', 'person-30'], ['吉尔代', 'person-41']];
    expect(await page.evaluate((expected) => expected.every(([name, personId]) => window.CORLEONE_ARCHIVE.people.find((person) => person.id === personId)?.mentions.includes(name)), expectedAliasMappings)).toBe(true);
    for (const [name, personId] of [['维托', 'person-01'], ['索洛佐', 'person-23'], ['康妮', 'person-06'], ['麦克', 'person-02'], ['本纳瑟拉', 'person-22'], ['巴西尼', 'person-25'], ['沃尔茨', 'person-28'], ['罗斯', 'person-31'], ['欧拉', 'person-32'], ['吉尔里', 'person-37'], ['吕凯西', 'person-40'], ['莫斯卡', 'person-44']]) {
      const locator = page.locator('.person-mention').filter({ hasText: new RegExp(`^${name}$`) });
      await expect(locator).not.toHaveCount(0);
      expect(await locator.evaluateAll((buttons, expectedId) => buttons.every((button) => button.dataset.person === expectedId), personId)).toBe(true);
    }
    expect(await page.locator('.person-mention').evaluateAll((buttons) => !buttons.some((button) => ['柯里昂', '教父', '汤姆逊', '约翰尼'].includes(button.textContent)))).toBe(true);
    await expect(page.locator('.person-mention').filter({ hasText: /^麦克拉斯基$/ }).first()).toHaveAttribute('data-person', 'person-24');
    await expect(page.locator('.person-mention').filter({ hasText: /^凯恩斯齐格$/ }).first()).toHaveAttribute('data-person', 'person-42');
    expect(await page.locator('.person-mention[data-person="person-27"]').evaluateAll((buttons) => {
      const names = new Set(buttons.map((button) => button.textContent));
      return names.has('维克多·斯特拉奇') && names.has('卡迈恩·库尼奥');
    })).toBe(true);
    expect(await page.locator('.person-mention').evaluateAll((buttons) => {
      const mentions = buttons.map((button) => button.getAttribute('data-mention'));
      return new Set(mentions).size === mentions.length && buttons.every((button) => button.textContent === button.getAttribute('aria-label').replace(/^查看/, '').replace(/的人物介绍$/, ''));
    })).toBe(true);
    const style = await page.locator('.person-mention').filter({ hasText: /^维托$/ }).first().evaluate((button) => {
      const computed = getComputedStyle(button);
      return { color: computed.color, background: computed.backgroundColor, decoration: computed.textDecorationLine, border: computed.borderBottomWidth };
    });
    expect(style.decoration).toContain('underline');
    expect(Number.parseFloat(style.border)).toBeGreaterThanOrEqual(1);
    expect(style.background).not.toBe('rgba(0, 0, 0, 0)');

    const expectedIds = await page.evaluate(() => window.CORLEONE_ARCHIVE.sections.flatMap((section) => {
      const template = document.createElement('template');
      template.innerHTML = section.html;
      return [...template.content.querySelectorAll('[id]')].map((element) => element.id);
    }));
    const currentIds = await page.locator('#noteContent [id]').evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(new Set(currentIds).size).toBe(currentIds.length);
    expect(currentIds.filter((id) => expectedIds.includes(id))).toEqual(expectedIds);

    const trigger = page.locator('.person-mention[data-person="person-01"]').filter({ hasText: /^维托$/ }).first();
    await trigger.scrollIntoViewIfNeeded();
    const waitForStableTrigger = () => trigger.evaluate((element) => new Promise((resolve, reject) => {
      let previous = null;
      let stableSamples = 0;
      const started = performance.now();
      const sample = () => {
        const current = Math.round(element.getBoundingClientRect().top * 100) / 100;
        stableSamples = current === previous ? stableSamples + 1 : 0;
        previous = current;
        if (stableSamples >= 4) { resolve(current); return; }
        if (performance.now() - started > 4000) { reject(new Error('人物标注几何未稳定')); return; }
        requestAnimationFrame(sample);
      };
      sample();
    }));
    await waitForStableTrigger();
    const before = await trigger.evaluate((element) => ({ href: location.href, length: history.length, scrollY: window.scrollY, top: Math.round(element.getBoundingClientRect().top * 100) / 100 }));
    const triggerBox = await trigger.boundingBox();
    if (!triggerBox) throw new Error('人物标注不可见');
    await page.mouse.click(triggerBox.x + triggerBox.width / 2, triggerBox.y + triggerBox.height / 2);
    await expect(page.locator('#personDetail')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#personDetailTitle')).toContainText('维托·柯里昂');
    expect(await page.evaluate(() => ({ inert: [document.querySelector('.notes-header'), document.querySelector('.notes-main'), document.querySelector('.back-top')].every((element) => element?.inert), overflow: document.body.style.overflow }))).toEqual({ inert: true, overflow: 'hidden' });
    await expect(page.locator('#personDetailBody')).not.toBeEmpty();
    await expect(page).toHaveURL(before.href);
    expect(await page.evaluate(() => history.length)).toBe(before.length);
    expect(await page.evaluate(() => {
      const template = document.createElement('template');
      const person = window.CORLEONE_ARCHIVE.people.find((item) => item.id === 'person-01');
      template.innerHTML = person.html;
      template.content.querySelector('h2')?.remove();
      return template.content.textContent;
    })).toBe(await page.locator('#personDetailBody').textContent());
    await expect(page.locator('#personDetailClose')).toHaveCount(0);
    await expect(page.locator('.person-detail-close')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('#personDetail')))).toBe(true);
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('.person-detail-close')).toBeFocused();

    const detailImage = page.locator('#personDetailBody img').first();
    if (await detailImage.count()) {
      await detailImage.click();
      await expect(page.locator('#corleoneImageViewer')).toHaveAttribute('open', '');
      await page.keyboard.press('Escape');
      await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
      await expect(page.locator('#personDetail')).toHaveAttribute('aria-hidden', 'false');
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('#personDetail')).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => ({ inert: [document.querySelector('.notes-header'), document.querySelector('.notes-main'), document.querySelector('.back-top')].some((element) => element?.inert), overflow: document.body.style.overflow }))).toEqual({ inert: false, overflow: '' });
    await waitForStableTrigger();
    const after = await trigger.evaluate((element) => ({ href: location.href, length: history.length, scrollY: window.scrollY, top: Math.round(element.getBoundingClientRect().top * 100) / 100 }));
    expect(after).toEqual(before);
    await trigger.press('Enter');
    await expect(page.locator('#personDetail')).toHaveAttribute('aria-hidden', 'false');
    await page.keyboard.press('Escape');
    await expect(page.locator('#personDetail')).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.press('Space');
    await expect(page.locator('#personDetail')).toHaveAttribute('aria-hidden', 'false');
    await page.locator('.person-detail-backdrop').click({ position: { x: 4, y: 4 } });
    await expect(page.locator('#personDetail')).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.press('Enter');
    await expect(page.locator('#personDetail')).toHaveAttribute('aria-hidden', 'false');
    await page.locator('.person-detail-close').click();
    await expect(page.locator('#personDetail')).toBeHidden();
    await expect(trigger).toBeFocused();

    const rapidTrigger = page.locator('#chapter-02-block-002 .person-mention[data-person="person-02"]').filter({ hasText: /^麦克$/ }).first();
    expect(await trigger.evaluate((element) => element.closest('[id]')?.id)).toBe(await rapidTrigger.evaluate((element) => element.closest('[id]')?.id));
    await trigger.press('Enter');
    await expect(page.locator('#personDetailTitle')).toContainText('维托·柯里昂');
    const raceState = await page.evaluate(() => {
      const findMention = (personId, text) => [...document.querySelectorAll(`.person-mention[data-person="${personId}"]`)].find((element) => element.textContent === text);
      const second = [...document.querySelectorAll('#chapter-02-block-002 .person-mention[data-person="person-02"]')].find((element) => element.textContent === '麦克');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      const beforeReopen = { closing: document.querySelector('#personDetail')?.classList.contains('is-closing'), hidden: document.querySelector('#personDetail')?.hidden };
      second?.click();
      return beforeReopen;
    });
    expect(raceState).toEqual({ closing: true, hidden: false });
    await expect(page.locator('#personDetail')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#personDetail')).toHaveClass(/is-open/);
    await expect(page.locator('#personDetailTitle')).toContainText('麦克·柯里昂');
    await expect.poll(() => page.locator('.person-detail-panel').evaluate((panel) => ({ opacity: getComputedStyle(panel).opacity, transform: getComputedStyle(panel).transform }))).toEqual({ opacity: '1', transform: 'none' });
    expect(await page.evaluate(() => {
      const person = window.CORLEONE_ARCHIVE.people.find((item) => item.id === 'person-02');
      const template = document.createElement('template');
      template.innerHTML = person.html;
      template.content.querySelector('h2')?.remove();
      return template.content.textContent;
    })).toBe(await page.locator('#personDetailBody').textContent());
    await expect(page.locator('.person-detail-close')).toBeFocused();
    expect(await page.evaluate(() => ({ inert: document.querySelector('.notes-main')?.inert, overflow: document.body.style.overflow }))).toEqual({ inert: true, overflow: 'hidden' });
    await page.keyboard.press('Escape');
    await expect(page.locator('#personDetail')).toBeHidden();
    await expect(page.locator('#personDetail')).toHaveAttribute('aria-hidden', 'true');
    expect(await page.evaluate(() => ({ inert: document.querySelector('.notes-main')?.inert, overflow: document.body.style.overflow }))).toEqual({ inert: false, overflow: '' });
    await expect(rapidTrigger).toBeFocused();
    await expectDiagnosticsClean(diagnostics);
  });

  test('首页人物深链仍安全处理未知参数并支持合法兼容 URL', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    await page.goto('/index.html?person=unknown&keep=1#characters', { waitUntil: 'networkidle' });
    await expect(page.locator('#reader')).not.toHaveClass(/is-open/);
    await expect(page).toHaveURL(/index\.html\?person=unknown&keep=1#characters$/);
    await page.goto('/index.html?person=person-01&keep=1#characters', { waitUntil: 'networkidle' });
    await expect(page.locator('#reader')).toHaveClass(/is-open/);
    await expect(page).toHaveURL(/index\.html\?keep=1#characters$/);
    await expect(page.locator('#readerTitleMain')).toContainText('维托·柯里昂');
    await page.locator('#readerClose').click();
    await expect(page.locator('#reader')).not.toHaveClass(/is-open/);
    await expect(page.locator('#characters [data-person="person-01"]')).toBeFocused();
    await expectDiagnosticsClean(diagnostics);
  });

  test('暖纸与暗书房主题在桌面视口保持层级和可读性', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    const viewports = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1024, height: 900 }];
    const snapshot = async (route) => page.evaluate((route) => {
      const parseColor = (value) => {
        const match = value.match(/rgba?\(([^)]+)\)/);
        if (!match) return null;
        const channels = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
        return { r: channels[0], g: channels[1], b: channels[2], a: channels[3] ?? 1 };
      };
      const paper = { r: 241, g: 231, b: 212, a: 1 };
      const composite = (foreground, background) => {
        if (!foreground) return background;
        if (foreground.a >= 1) return foreground;
        const alpha = foreground.a;
        return {
          r: foreground.r * alpha + background.r * (1 - alpha),
          g: foreground.g * alpha + background.g * (1 - alpha),
          b: foreground.b * alpha + background.b * (1 - alpha),
          a: 1
        };
      };
      const resolveBackground = (element) => {
        const layers = [];
        for (let current = element; current; current = current.parentElement) {
          const color = parseColor(getComputedStyle(current).backgroundColor);
          if (color && color.a > 0) layers.unshift(color);
        }
        return layers.reduce((background, layer) => composite(layer, background), paper);
      };
      const luminance = (color) => [color.r, color.g, color.b].map((channel) => {
        const value = channel / 255;
        return value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
      }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      const contrast = (foreground, background) => {
        const light = Math.max(luminance(foreground), luminance(background));
        const dark = Math.min(luminance(foreground), luminance(background));
        return (light + .05) / (dark + .05);
      };
      const readPair = (foregroundSelector, backgroundSelector) => {
        const foreground = document.querySelector(foregroundSelector);
        const background = document.querySelector(backgroundSelector);
        if (!foreground || !background) return null;
        const foregroundStyle = getComputedStyle(foreground);
        const backgroundColor = resolveBackground(background);
        const foregroundColor = composite(parseColor(foregroundStyle.color), backgroundColor);
        return { foreground: foregroundStyle.color, background: getComputedStyle(background).backgroundColor, ratio: contrast(foregroundColor, backgroundColor) };
      };
      const rootStyle = getComputedStyle(document.documentElement);
      const bodyStyle = getComputedStyle(document.body);
      const readBackground = (selector) => getComputedStyle(document.querySelector(selector)).backgroundColor;
      const noteBackground = resolveBackground(document.querySelector('.note-content') || document.body);
      return {
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        overflow: document.documentElement.scrollWidth <= innerWidth + 1,
        fonts: document.fonts.status,
        tokens: ['--archive-paper', '--archive-ink', '--archive-study', '--archive-action'].reduce((values, token) => ({ ...values, [token]: rootStyle.getPropertyValue(token).trim() }), {}),
        body: { color: bodyStyle.color, background: bodyStyle.backgroundColor, backgroundImage: bodyStyle.backgroundImage },
        backgrounds: ['.hero', '.rules-section', '.timeline-section', '.quote-section', '.characters-section', '.history-section', '#motifs', '.finale'].filter((selector) => document.querySelector(selector)).map((selector) => ({ selector, value: readBackground(selector) })),
        pairs: route === 'index.html' ? {
          hero: readPair('.hero h1', '.hero'),
          quote: readPair('.quote-block blockquote', '.quote-section'),
          action: readPair('.section-kicker', '.rules-section')
        } : {
          body: { foreground: bodyStyle.color, background: noteBackground, ratio: contrast(composite(parseColor(bodyStyle.color), noteBackground), noteBackground) },
          mention: readPair('.person-mention', '.note-content'),
          heading: readPair('.note-content h1', 'body')
        }
      };
    }, route);

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/index.html', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const indexTheme = await snapshot('index.html');
      expect(indexTheme.overflow).toBe(true);
      expect(indexTheme.fonts).toBe('loaded');
      expect(indexTheme.tokens['--archive-paper']).toBe('#f1e7d4');
      expect(indexTheme.tokens['--archive-study']).toBe('#191512');
      expect(indexTheme.backgrounds.map(({ value }) => value)).not.toContain('rgb(29, 48, 41)');
      expect(indexTheme.pairs.hero.ratio).toBeGreaterThanOrEqual(3);
      expect(indexTheme.pairs.quote.ratio).toBeGreaterThanOrEqual(4.5);
      expect(indexTheme.pairs.action.ratio).toBeGreaterThanOrEqual(4.5);
      const selectedFilter = await page.locator('[data-character-filter="all"]').evaluate((element) => {
        const parse = (value) => value.match(/rgba?\(([^)]+)\)/)[1].split(',').map((part) => Number.parseFloat(part.trim()));
        const luminance = (r, g, b) => [r, g, b].map((channel) => channel / 255).map((value) => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
        const [fr, fg, fb] = parse(getComputedStyle(element).color);
        const [br, bg, bb] = parse(getComputedStyle(element).backgroundColor);
        const light = Math.max(luminance(fr, fg, fb), luminance(br, bg, bb));
        const dark = Math.min(luminance(fr, fg, fb), luminance(br, bg, bb));
        return { ratio: (light + .05) / (dark + .05), filter: getComputedStyle(document.querySelector('.character-card img')).filter };
      });
      expect(selectedFilter.ratio).toBeGreaterThanOrEqual(4.5);
      expect(selectedFilter.filter).toBe('none');

      await page.goto('/notes.html', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const notesTheme = await snapshot('notes.html');
      expect(notesTheme.overflow).toBe(true);
      expect(notesTheme.fonts).toBe('loaded');
      expect(notesTheme.pairs.body.ratio).toBeGreaterThanOrEqual(4.5);
      expect(notesTheme.pairs.heading.ratio).toBeGreaterThanOrEqual(3);
      expect(notesTheme.pairs.mention.ratio).toBeGreaterThanOrEqual(4.5);
      await page.evaluate(() => window.CorleoneImageViewer.open(document.querySelector('.note-content img')));
      const viewerPair = await page.locator('#corleoneImageViewer .image-viewer-shell').evaluate((element) => {
        const foreground = getComputedStyle(element).color;
        const background = getComputedStyle(element).backgroundColor;
        const parse = (value) => value.match(/rgba?\(([^)]+)\)/)[1].split(',').map((part) => Number.parseFloat(part.trim()));
        const [fr, fg, fb] = parse(foreground);
        const [br, bg, bb] = parse(background);
        const luminance = (r, g, b) => [r, g, b].map((channel) => channel / 255).map((value) => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
        const light = Math.max(luminance(fr, fg, fb), luminance(br, bg, bb));
        const dark = Math.min(luminance(fr, fg, fb), luminance(br, bg, bb));
        return { foreground, background, ratio: (light + .05) / (dark + .05) };
      });
      expect(viewerPair.ratio).toBeGreaterThanOrEqual(4.5);
      await page.keyboard.press('Escape');
      await expect(page.locator('#corleoneImageViewer')).not.toHaveAttribute('open', '');
    }
    await expectDiagnosticsClean(diagnostics);
  });

  test('角色名称标注跳过跨节点与受保护内容并支持减弱动效', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      let archiveValue;
      Object.defineProperty(window, 'CORLEONE_ARCHIVE', {
        configurable: true,
        get: () => archiveValue,
        set: (value) => {
          archiveValue = {
            ...value,
            sections: value.sections.map((section, index) => index === 0 ? {
              ...section,
              html: `${section.html}
<p id="mention-fixture-plain">Don Vito</p>
<p id="mention-fixture-same-block">Don Vito 与麦克</p>
<p id="mention-fixture-boundary">Don Vitone 教父</p>
<p id="mention-fixture-cross"><strong>Don</strong> <em>Vito</em></p>
<p id="mention-fixture-strong-split">麦克<strong>拉斯基</strong></p>
<p id="mention-fixture-em-split">汤姆<em>逊</em></p>
<p id="mention-fixture-link"><a href="#mention-fixture-link-target">Don Vito</a></p>
<p id="mention-fixture-code"><code>Don Vito</code></p>
<p id="mention-fixture-audited-aliases">布拉西 芳丹 本纳瑟拉 格林 吉尔代</p>`
            } : section)
          };
        }
      });
    });
    await page.goto('/notes.html#mention-fixture-plain', { waitUntil: 'networkidle' });
    await expect(page.locator('#mention-fixture-plain .person-mention')).toHaveCount(1);
    await expect(page.locator('#mention-fixture-same-block .person-mention')).toHaveCount(2);
    await expect(page.locator('#mention-fixture-boundary .person-mention')).toHaveCount(0);
    await expect(page.locator('#mention-fixture-cross .person-mention')).toHaveCount(0);
    await expect(page.locator('#mention-fixture-strong-split .person-mention')).toHaveCount(0);
    await expect(page.locator('#mention-fixture-em-split .person-mention')).toHaveCount(0);
    await expect(page.locator('#mention-fixture-link .person-mention')).toHaveCount(0);
    await expect(page.locator('#mention-fixture-code .person-mention')).toHaveCount(0);
    for (const [name, personId] of [['布拉西', 'person-13'], ['芳丹', 'person-20'], ['本纳瑟拉', 'person-22'], ['格林', 'person-30'], ['吉尔代', 'person-41']]) {
      const alias = page.locator('#mention-fixture-audited-aliases .person-mention').filter({ hasText: new RegExp(`^${name}$`) });
      await expect(alias).toHaveCount(1);
      await expect(alias).toHaveAttribute('data-person', personId);
    }
    const mentionCount = await page.locator('.person-mention').count();
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await expect(page.locator('.person-mention')).toHaveCount(mentionCount);
    const reducedPrimaryTrigger = page.locator('#mention-fixture-same-block .person-mention').filter({ hasText: /^Don Vito$/ });
    await reducedPrimaryTrigger.click();
    await expect(page.locator('#personDetail')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#personDetailTitle')).toContainText('维托·柯里昂');
    const reducedRapidTrigger = page.locator('#mention-fixture-same-block .person-mention').filter({ hasText: /^麦克$/ });
    const reducedRaceState = await page.evaluate(() => {
      const second = [...document.querySelectorAll('#mention-fixture-same-block .person-mention[data-person="person-02"]')].find((element) => element.textContent === '麦克');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      const beforeReopen = { closing: document.querySelector('#personDetail')?.classList.contains('is-closing'), hidden: document.querySelector('#personDetail')?.hidden };
      second?.click();
      return beforeReopen;
    });
    expect(reducedRaceState).toEqual({ closing: true, hidden: false });
    await expect(page.locator('#personDetailTitle')).toContainText('麦克·柯里昂');
    await expect.poll(() => page.locator('.person-detail-panel').evaluate((panel) => ({ opacity: getComputedStyle(panel).opacity, transform: getComputedStyle(panel).transform }))).toEqual({ opacity: '1', transform: 'none' });
    expect(await page.evaluate(() => {
      const person = window.CORLEONE_ARCHIVE.people.find((item) => item.id === 'person-02');
      const template = document.createElement('template');
      template.innerHTML = person.html;
      template.content.querySelector('h2')?.remove();
      return template.content.textContent;
    })).toBe(await page.locator('#personDetailBody').textContent());
    await expect(page.locator('#personDetail')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#personDetail')).toHaveClass(/is-open/);
    await expect(page.locator('.person-detail-close')).toBeFocused();
    expect(await page.locator('.notes-main').evaluate((element) => element.inert)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#personDetail')).toBeHidden();
    await expect(page.locator('#personDetail')).toHaveAttribute('aria-hidden', 'true');
    expect(await page.evaluate(() => ({ inert: document.querySelector('.notes-main')?.inert, overflow: document.body.style.overflow }))).toEqual({ inert: false, overflow: '' });
    await expect(reducedRapidTrigger).toBeFocused();
    await expectDiagnosticsClean(diagnostics);
  });
});
