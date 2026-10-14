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
    await page.locator('[data-viewer-action="close"]').click();
    await expect(page.locator('#corleoneImageViewer')).toHaveClass(/is-closing/);
    await page.evaluate(() => window.CorleoneImageViewer.open(document.querySelector('.hero-poster img')));
    await expect(page.locator('#corleoneImageViewer')).toHaveAttribute('open', '');
    await expect(page.locator('#corleoneImageViewer')).not.toHaveClass(/is-closing/);
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
    await page.goto('/', { waitUntil: 'networkidle' });

    const chapterData = await page.evaluate(() => {
      const chapter = window.CORLEONE_ARCHIVE.chapters[2];
      return { target: `${chapter.id}-heading`, title: chapter.title, index: window.CORLEONE_ARCHIVE.search.findIndex((item) => item.kind === 'chapter' && item.id === chapter.id) };
    });
    await page.locator('#searchToggle').click();
    await page.locator('#searchInput').fill(chapterData.title);
    await page.locator(`[data-search-index="${chapterData.index}"]`).click();
    await expect(page).toHaveURL(new RegExp(`notes\\.html#${chapterData.target}$`));
    await expect(page.locator(`#${chapterData.target}`)).toHaveClass(/search-hit/);
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
    await page.locator('.search-result').first().click();
    await expect(page).toHaveURL(new RegExp(`notes\\.html#${passageTarget}$`));
    await expect(page.locator(`#${passageTarget}`)).toHaveClass(/search-hit/);
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
      test.info().annotations.push({ type: 'viewport-baseline', description: `notes ${JSON.stringify(notesEnvironment)}` });
    }

    const quotes = await page.evaluate(() => window.CORLEONE_ARCHIVE.quotes.map(({ id, translation, original, source, group, explanation }) => ({ id, translation, original, source, group, explanation })));
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
        const state = await page.locator('#quoteText').evaluate((node) => {
          const quoteRect = node.getBoundingClientRect();
          const edgeTolerance = parseFloat(getComputedStyle(node).fontSize) * .15 + 1;
          return {
            display: node.textContent.replace(/\s+/g, ''),
            accessible: node.getAttribute('aria-label'),
            quoteRect: { left: quoteRect.left, top: quoteRect.top, right: quoteRect.right, bottom: quoteRect.bottom },
            edgeTolerance,
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
        expect(state.lines.every((line) => line.rectCount === 1 && [...line.text].length > 1
          && line.rangeRect.left >= state.quoteRect.left - state.edgeTolerance
          && line.rangeRect.top >= state.quoteRect.top - state.edgeTolerance
          && line.rangeRect.right <= state.quoteRect.right + state.edgeTolerance
          && line.rangeRect.bottom <= state.quoteRect.bottom + state.edgeTolerance)).toBe(true);
        expect(state.translation).toBe(quote.original);
        expect(state.source).toBe(`${quote.source} / ${quote.group}`);
        expect(state.explanation).toBe(quote.explanation);
        viewportLineGroups.push(state.lines.map((line) => line.text));
        const ariaSnapshot = await page.locator('#quoteText').ariaSnapshot();
        expect(ariaSnapshot.split(quote.translation)).toHaveLength(2);
      }
      await expect(page.locator('.quote-mark--open')).toHaveText('“');
      await expect(page.locator('.quote-mark--close')).toHaveText('”');
      const quoteMarkGeometry = await page.evaluate(() => {
        const inner = document.querySelector('.quote-inner').getBoundingClientRect();
        const open = document.querySelector('.quote-mark--open').getBoundingClientRect();
        const close = document.querySelector('.quote-mark--close').getBoundingClientRect();
        return { leftInset: open.left - inner.left, rightInset: inner.right - close.right, openWidth: open.width, closeWidth: close.width, openTransform: getComputedStyle(document.querySelector('.quote-mark--open')).transform, closeTransform: getComputedStyle(document.querySelector('.quote-mark--close')).transform };
      });
      expect(Math.abs(quoteMarkGeometry.leftInset - quoteMarkGeometry.rightInset)).toBeLessThan(1);
      expect(Math.abs(quoteMarkGeometry.openWidth - quoteMarkGeometry.closeWidth)).toBeLessThan(1);
      expect(quoteMarkGeometry.openTransform).toBe('none');
      expect(quoteMarkGeometry.closeTransform).toBe('none');

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
});
