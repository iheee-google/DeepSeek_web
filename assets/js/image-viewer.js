(() => {
  const state = {
    dialog: null,
    panel: null,
    stage: null,
    image: null,
    title: null,
    dimensions: null,
    status: null,
    trigger: null,
    mode: 'fit',
    scale: 1
  };

  const icon = (name) => `<i data-lucide="${name}"></i>`;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function hydrateIcons() {
    window.lucide?.createIcons({ attrs: { 'aria-hidden': 'true' } });
  }

  function imageLabel(image) {
    const explicit = image.getAttribute('alt')?.trim();
    if (explicit) return explicit;
    const figureCaption = image.closest('figure')?.querySelector('figcaption')?.textContent?.trim();
    if (figureCaption) return figureCaption;
    const container = image.closest('[data-person], .history-card, .motif, .character-card, .feature-media, .hero-poster');
    const heading = container?.querySelector('h2, h3, h4, figcaption')?.textContent?.trim();
    return heading || '档案影像';
  }

  function ensureViewer() {
    if (state.dialog) return state.dialog;
    const dialog = document.createElement('dialog');
    dialog.className = 'image-viewer';
    dialog.id = 'corleoneImageViewer';
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'imageViewerTitle');
    dialog.innerHTML = `
      <div class="image-viewer-shell">
        <div class="image-viewer-toolbar">
          <div class="image-viewer-heading">
            <small>image / archive</small>
            <strong id="imageViewerTitle">档案影像</strong>
            <span id="imageViewerDimensions">适应窗口</span>
          </div>
          <div class="image-viewer-actions">
            <button class="image-viewer-button" type="button" data-viewer-action="fit" title="适应窗口">${icon('scan')}<span>适应窗口</span></button>
            <button class="image-viewer-button" type="button" data-viewer-action="actual" title="原始尺寸">${icon('square-dashed-mouse-pointer')}<span>原始尺寸</span></button>
            <button class="image-viewer-button" type="button" data-viewer-action="zoom-out" title="缩小">${icon('zoom-out')}<span>缩小</span></button>
            <button class="image-viewer-button" type="button" data-viewer-action="zoom-in" title="放大">${icon('zoom-in')}<span>放大</span></button>
            <button class="image-viewer-button" type="button" data-viewer-action="fullscreen" aria-pressed="false" title="进入全屏">${icon('maximize-2')}<span>全屏</span></button>
            <button class="image-viewer-button image-viewer-button--close" type="button" data-viewer-action="close" aria-label="关闭图片查看器" title="关闭">${icon('x')}<span>关闭</span></button>
          </div>
        </div>
        <div class="image-viewer-stage" tabindex="0" aria-label="图片查看区域">
          <img class="image-viewer-image" alt="">
          <span class="image-viewer-status" aria-live="polite">100%</span>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    state.dialog = dialog;
    state.panel = dialog.querySelector('.image-viewer-shell');
    state.stage = dialog.querySelector('.image-viewer-stage');
    state.image = dialog.querySelector('.image-viewer-image');
    state.title = dialog.querySelector('#imageViewerTitle');
    state.dimensions = dialog.querySelector('#imageViewerDimensions');
    state.status = dialog.querySelector('.image-viewer-status');

    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeViewer();
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeViewer();
    });
    dialog.addEventListener('load', () => applyImageMode(), true);
    state.image.addEventListener('load', () => {
      state.dimensions.textContent = `${state.image.naturalWidth} × ${state.image.naturalHeight}`;
      applyImageMode();
    });
    state.image.addEventListener('error', () => {
      state.dimensions.textContent = '影像加载失败';
      state.status.textContent = '无法加载';
    });
    state.stage.addEventListener('dblclick', () => setMode(state.mode === 'fit' ? 'actual' : 'fit'));
    state.image.addEventListener('click', (event) => {
      event.stopPropagation();
      setMode(state.mode === 'fit' ? 'actual' : 'fit');
    });
    dialog.querySelectorAll('[data-viewer-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.viewerAction;
        if (action === 'close') closeViewer();
        if (action === 'fit') setMode('fit');
        if (action === 'actual') setMode('actual');
        if (action === 'zoom-in') zoomBy(1.25);
        if (action === 'zoom-out') zoomBy(.8);
        if (action === 'fullscreen') toggleFullscreen();
      });
    });
    document.addEventListener('fullscreenchange', updateFullscreenButton);
    hydrateIcons();
    return dialog;
  }

  function sourceFor(image) {
    return image.currentSrc || image.getAttribute('src') || image.getAttribute('data-src') || '';
  }

  function setMode(mode) {
    if (!state.image) return;
    state.mode = mode;
    if (mode === 'fit') {
      state.scale = 1;
      state.stage.classList.remove('is-actual', 'is-scaled');
      state.image.style.removeProperty('width');
      state.image.style.removeProperty('height');
      state.status.textContent = '适应窗口';
    } else {
      state.scale = 1;
      state.stage.classList.add('is-actual');
      applyImageMode();
    }
    state.stage.scrollTo({ top: 0, left: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }

  function applyImageMode() {
    if (!state.image || state.mode === 'fit' || !state.image.naturalWidth) return;
    const width = Math.round(state.image.naturalWidth * state.scale);
    const height = Math.round(state.image.naturalHeight * state.scale);
    state.stage.classList.toggle('is-scaled', state.scale !== 1);
    state.image.style.width = `${width}px`;
    state.image.style.height = `${height}px`;
    state.status.textContent = `${Math.round(state.scale * 100)}%`;
  }

  function zoomBy(factor) {
    if (!state.image) return;
    if (state.mode === 'fit') {
      state.mode = 'actual';
      state.stage.classList.add('is-actual');
    }
    state.scale = Math.min(4, Math.max(.25, state.scale * factor));
    applyImageMode();
  }

  function updateFullscreenButton() {
    if (!state.dialog) return;
    const button = state.dialog.querySelector('[data-viewer-action="fullscreen"]');
    const active = document.fullscreenElement === state.panel || state.panel?.classList.contains('is-simulated-fullscreen');
    button.setAttribute('aria-pressed', String(active));
    button.title = active ? '退出全屏' : '进入全屏';
    button.innerHTML = `${icon(active ? 'minimize-2' : 'maximize-2')}<span>${active ? '退出全屏' : '全屏'}</span>`;
    hydrateIcons();
  }

  async function toggleFullscreen() {
    ensureViewer();
    if (document.fullscreenElement === state.panel) {
      await document.exitFullscreen?.();
      return;
    }
    if (state.panel.classList.contains('is-simulated-fullscreen')) {
      state.panel.classList.remove('is-simulated-fullscreen');
      updateFullscreenButton();
      return;
    }
    try {
      if (state.panel.requestFullscreen) await state.panel.requestFullscreen();
      else throw new Error('Fullscreen API unavailable');
    } catch {
      state.panel.classList.add('is-simulated-fullscreen');
      updateFullscreenButton();
    }
  }

  function openViewer(image) {
    const source = sourceFor(image);
    if (!source) return;
    ensureViewer();
    state.trigger = image;
    state.title.textContent = imageLabel(image);
    state.dimensions.textContent = '读取影像尺寸…';
    state.status.textContent = '适应窗口';
    state.image.src = source;
    state.image.alt = imageLabel(image);
    state.mode = 'fit';
    state.scale = 1;
    state.stage.classList.remove('is-actual', 'is-scaled');
    state.image.style.removeProperty('width');
    state.image.style.removeProperty('height');
    state.stage.scrollTop = 0;
    state.stage.scrollLeft = 0;
    state.panel.classList.remove('is-simulated-fullscreen');
    updateFullscreenButton();
    if (!state.dialog.open) state.dialog.showModal();
    document.body.classList.add('image-viewer-open');
    requestAnimationFrame(() => state.stage.focus({ preventScroll: true }));
  }

  function closeViewer() {
    if (!state.dialog?.open) return;
    const exitPromise = document.fullscreenElement === state.panel ? document.exitFullscreen?.() : null;
    state.panel.classList.remove('is-simulated-fullscreen');
    state.dialog.close();
    document.body.classList.remove('image-viewer-open');
    const trigger = state.trigger;
    state.trigger = null;
    if (!trigger?.isConnected) return;
    const restoreFocus = () => window.setTimeout(() => trigger.focus({ preventScroll: true }), reduceMotion.matches ? 0 : 40);
    if (exitPromise?.finally) exitPromise.finally(restoreFocus);
    else restoreFocus();
  }

  function isViewerImage(image) {
    return image && !image.closest('#corleoneImageViewer') && image.dataset.imageViewer !== 'false';
  }

  function decorateImages(root = document) {
    const images = [];
    if (root.matches?.('img')) images.push(root);
    root.querySelectorAll?.('img').forEach((image) => images.push(image));
    images.forEach((image) => {
      if (!isViewerImage(image) || image.dataset.imageViewerReady) return;
      image.dataset.imageViewerReady = 'true';
      if (image.closest('a, button')) return;
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', `放大查看：${imageLabel(image)}`);
    });
  }

  document.addEventListener('click', (event) => {
    const image = event.target.closest?.('img');
    if (!isViewerImage(image)) return;
    event.preventDefault();
    event.stopPropagation();
    openViewer(image);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (state.dialog?.open && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeViewer();
      return;
    }
    const image = event.target.closest?.('img');
    if (!isViewerImage(image) || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    openViewer(image);
  }, true);

  decorateImages();
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) decorateImages(node);
  }))).observe(document.body, { childList: true, subtree: true });

  window.CorleoneImageViewer = {
    close: closeViewer,
    isOpen: () => Boolean(state.dialog?.open),
    open: openViewer
  };
})();
