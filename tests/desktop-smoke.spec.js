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
    await page.locator('[data-viewer-action="actual"]').click();
    expect(await page.locator('.image-viewer-image').evaluate((image) => Math.abs(image.getBoundingClientRect().width / image.getBoundingClientRect().height - image.naturalWidth / image.naturalHeight) < .01)).toBe(true);
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
    await expect(page.locator('#motifGrid .motif')).toHaveCount(12);
    await expect(page.locator('#historyGrid .history-card')).toHaveCount(2);
    await page.locator('#ruleGrid .rule-trigger').nth(1).click();
    await expect(page.locator('#ruleGrid .rule-card').nth(1)).toHaveClass(/is-open/);
    await page.locator('#ruleGrid .rule-trigger').nth(1).click();
    await expect(page.locator('#ruleGrid .rule-card').nth(1)).not.toHaveClass(/is-open/);

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

  test('图片查看器原始尺寸可滚动触达全部边缘', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const diagnostics = collectDiagnostics(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('.hero-poster img').first().click();
    await page.locator('[data-viewer-action="actual"]').click();
    const actual = await page.locator('.image-viewer-stage').evaluate((stage) => {
      const image = stage.querySelector('.image-viewer-image');
      const imageRect = image.getBoundingClientRect();
      return { width: imageRect.width, height: imageRect.height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, scrollWidth: stage.scrollWidth, scrollHeight: stage.scrollHeight, clientWidth: stage.clientWidth, clientHeight: stage.clientHeight };
    });
    expect(actual.width).toBe(actual.naturalWidth);
    expect(actual.height).toBe(actual.naturalHeight);
    expect(actual.scrollWidth).toBeGreaterThan(actual.clientWidth);
    expect(actual.scrollHeight).toBeGreaterThan(actual.clientHeight);
    expect(await page.locator('.image-viewer-stage').evaluate((stage) => {
      const image = stage.querySelector('.image-viewer-image');
      const viewport = stage.getBoundingClientRect();
      const style = getComputedStyle(stage);
      const padding = { left: parseFloat(style.paddingLeft), right: parseFloat(style.paddingRight), top: parseFloat(style.paddingTop), bottom: parseFloat(style.paddingBottom) };
      stage.scrollLeft = 0;
      stage.scrollTop = 0;
      const start = image.getBoundingClientRect();
      stage.scrollLeft = stage.scrollWidth - stage.clientWidth;
      stage.scrollTop = stage.scrollHeight - stage.clientHeight;
      const end = image.getBoundingClientRect();
      return start.left >= viewport.left + padding.left - 1 && start.top >= viewport.top + padding.top - 1 && end.right <= viewport.right - padding.right + 1 && end.bottom <= viewport.bottom - padding.bottom + 1;
    })).toBe(true);
    await page.locator('[data-viewer-action="zoom-in"]').click();
    await page.locator('[data-viewer-action="zoom-in"]').click();
    await page.locator('[data-viewer-action="zoom-in"]').click();
    const doubled = await page.locator('.image-viewer-image').evaluate((image) => ({ width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }));
    expect(doubled.width / doubled.naturalWidth).toBeGreaterThan(1.9);
    expect(doubled.width / doubled.naturalWidth).toBeLessThan(2.01);
    expect(doubled.height / doubled.naturalHeight).toBeGreaterThan(1.9);
    expect(doubled.height / doubled.naturalHeight).toBeLessThan(2.01);
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

  test('全文页保留原文并维护跨章节目录定位', async ({ page }) => {
    const diagnostics = collectDiagnostics(page);
    await page.goto('/notes.html', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/全文档案/);
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
