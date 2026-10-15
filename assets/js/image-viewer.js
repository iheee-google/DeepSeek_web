(() => {
  const state = {
    dialog: null,
    panel: null,
    stage: null,
    canvas: null,
    image: null,
    title: null,
    dimensions: null,
    status: null,
    trigger: null,
    closeTimer: null,
    closeSequence: 0,
    fullscreenExitPromise: null,
    scale: 1
  };

  const icon = (name) => `<i data-lucide="${name}"></i>`;
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
            <button class="image-viewer-button" type="button" data-viewer-action="zoom-out" title="缩小">${icon('zoom-out')}<span>缩小</span></button>
            <button class="image-viewer-button" type="button" data-viewer-action="zoom-in" title="放大">${icon('zoom-in')}<span>放大</span></button>
            <button class="image-viewer-button" type="button" data-viewer-action="fullscreen" aria-pressed="false" title="进入全屏">${icon('maximize-2')}<span>全屏</span></button>
            <button class="image-viewer-button image-viewer-button--close" type="button" data-viewer-action="close" aria-label="关闭图片查看器" title="关闭">${icon('x')}<span>关闭</span></button>
          </div>
        </div>
        <div class="image-viewer-stage" tabindex="0" aria-label="图片查看区域">
          <div class="image-viewer-canvas">
            <img class="image-viewer-image" alt="">
          </div>
          <span class="image-viewer-status" aria-live="polite">100%</span>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    state.dialog = dialog;
    state.panel = dialog.querySelector('.image-viewer-shell');
    state.stage = dialog.querySelector('.image-viewer-stage');
    state.canvas = dialog.querySelector('.image-viewer-canvas');
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
    state.image.addEventListener('load', () => {
      state.dimensions.textContent = `${state.image.naturalWidth} × ${state.image.naturalHeight}`;
      syncImageLayout();
    });
    state.image.addEventListener('error', () => {
      state.dimensions.textContent = '影像加载失败';
      state.status.textContent = '无法加载';
    });
    dialog.querySelectorAll('[data-viewer-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.viewerAction;
        if (action === 'close') closeViewer();
        if (action === 'fit') setMode('fit');
        if (action === 'zoom-in') zoomBy(1.25);
        if (action === 'zoom-out') zoomBy(.8);
        if (action === 'fullscreen') toggleFullscreen();
      });
    });
    document.addEventListener('fullscreenchange', () => {
      updateFullscreenButton();
      if (!state.dialog?.open || !state.image.naturalWidth) return;
      const anchor = captureAnchor();
      requestAnimationFrame(() => syncImageLayout(anchor));
    });
    window.addEventListener('resize', () => {
      if (!state.dialog?.open || !state.image.naturalWidth) return;
      const anchor = captureAnchor();
      requestAnimationFrame(() => syncImageLayout(anchor));
    });
    hydrateIcons();
    return dialog;
  }

  function sourceFor(image) {
    return image.currentSrc || image.getAttribute('src') || image.getAttribute('data-src') || '';
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function stageContentSize() {
    const styles = getComputedStyle(state.stage);
    return {
      width: Math.max(1, state.stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight)),
      height: Math.max(1, state.stage.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom))
    };
  }

  function fitSize() {
    const available = stageContentSize();
    const ratio = Math.min(1, available.width / state.image.naturalWidth, available.height / state.image.naturalHeight);
    return {
      width: state.image.naturalWidth * ratio,
      height: state.image.naturalHeight * ratio,
      available
    };
  }

  function captureAnchor() {
    if (!state.image?.naturalWidth || !state.image.getBoundingClientRect().width) return null;
    const stageRect = state.stage.getBoundingClientRect();
    const imageRect = state.image.getBoundingClientRect();
    const imageLeft = imageRect.left - stageRect.left + state.stage.scrollLeft;
    const imageTop = imageRect.top - stageRect.top + state.stage.scrollTop;
    const centerX = state.stage.scrollLeft + state.stage.clientWidth / 2;
    const centerY = state.stage.scrollTop + state.stage.clientHeight / 2;
    return {
      x: clamp((centerX - imageLeft) / imageRect.width, 0, 1),
      y: clamp((centerY - imageTop) / imageRect.height, 0, 1)
    };
  }

  function scrollToAnchor(anchor) {
    const stageRect = state.stage.getBoundingClientRect();
    const imageRect = state.image.getBoundingClientRect();
    const imageLeft = imageRect.left - stageRect.left + state.stage.scrollLeft;
    const imageTop = imageRect.top - stageRect.top + state.stage.scrollTop;
    const desiredLeft = imageLeft + anchor.x * imageRect.width - state.stage.clientWidth / 2;
    const desiredTop = imageTop + anchor.y * imageRect.height - state.stage.clientHeight / 2;
    state.stage.scrollLeft = clamp(desiredLeft, 0, state.stage.scrollWidth - state.stage.clientWidth);
    state.stage.scrollTop = clamp(desiredTop, 0, state.stage.scrollHeight - state.stage.clientHeight);
  }

  function syncImageLayout(anchor = null) {
    if (!state.image?.naturalWidth || !state.canvas) return;
    const fit = fitSize();
    const width = Math.round(fit.width * state.scale);
    const height = Math.round(fit.height * state.scale);
    const isZoomed = state.scale > 1 && (width > fit.available.width + 1 || height > fit.available.height + 1);
    state.stage.classList.toggle('is-zoomed', isZoomed);
    state.canvas.style.width = `${isZoomed ? width + fit.available.width : fit.available.width}px`;
    state.canvas.style.height = `${isZoomed ? height + fit.available.height : fit.available.height}px`;
    if (state.scale === 1) {
      state.image.style.removeProperty('width');
      state.image.style.removeProperty('height');
    } else {
      state.image.style.width = `${width}px`;
      state.image.style.height = `${height}px`;
    }
    state.status.textContent = `${Math.round(state.scale * 100)}%`;
    if (isZoomed && anchor) scrollToAnchor(anchor);
    else if (isZoomed) {
      state.stage.scrollLeft = (state.stage.scrollWidth - state.stage.clientWidth) / 2;
      state.stage.scrollTop = (state.stage.scrollHeight - state.stage.clientHeight) / 2;
    } else {
      state.stage.scrollLeft = 0;
      state.stage.scrollTop = 0;
    }
  }

  function setMode(mode) {
    if (!state.image?.naturalWidth) return;
    if (mode === 'fit') {
      state.scale = 1;
      syncImageLayout();
    }
  }

  function zoomBy(factor) {
    if (!state.image?.naturalWidth) return;
    const anchor = captureAnchor();
    state.scale = clamp(state.scale * factor, 1, 4);
    syncImageLayout(anchor);
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
      requestAnimationFrame(() => syncImageLayout(captureAnchor()));
      return;
    }
    try {
      if (state.panel.requestFullscreen) await state.panel.requestFullscreen();
      else throw new Error('Fullscreen API unavailable');
    } catch {
      state.panel.classList.add('is-simulated-fullscreen');
      updateFullscreenButton();
      requestAnimationFrame(() => syncImageLayout(captureAnchor()));
    }
  }

  function openViewer(image) {
    const source = sourceFor(image);
    if (!source) return;
    ensureViewer();
    const token = ++state.closeSequence;
    const pendingFullscreenExit = state.fullscreenExitPromise;
    if (state.closeTimer) {
      window.clearTimeout(state.closeTimer);
      state.closeTimer = null;
    }
    state.dialog.classList.remove('is-closing');
    state.trigger = image;
    state.title.textContent = imageLabel(image);
    state.dimensions.textContent = '读取影像尺寸…';
    state.status.textContent = '适应窗口';
    state.image.src = source;
    state.image.alt = imageLabel(image);
    state.scale = 1;
    state.stage.classList.remove('is-zoomed');
    state.canvas.style.removeProperty('width');
    state.canvas.style.removeProperty('height');
    state.image.style.removeProperty('width');
    state.image.style.removeProperty('height');
    state.stage.scrollTop = 0;
    state.stage.scrollLeft = 0;
    state.panel.classList.remove('is-simulated-fullscreen');
    updateFullscreenButton();
    const showViewer = () => {
      if (token !== state.closeSequence) return;
      if (!state.dialog.open) state.dialog.showModal();
      document.body.classList.add('image-viewer-open');
      requestAnimationFrame(() => {
        if (token !== state.closeSequence || !state.dialog.open) return;
        syncImageLayout();
        state.stage.focus({ preventScroll: true });
      });
    };
    if (pendingFullscreenExit) {
      pendingFullscreenExit.finally(() => {
        if (state.fullscreenExitPromise === pendingFullscreenExit) state.fullscreenExitPromise = null;
      }).then(showViewer, showViewer);
    } else showViewer();
  }

  function closeViewer() {
    if (!state.dialog || (!state.dialog.open && !state.trigger)) return;
    const token = ++state.closeSequence;
    if (state.closeTimer) {
      window.clearTimeout(state.closeTimer);
      state.closeTimer = null;
    }
    const trigger = state.trigger;
    state.trigger = null;
    state.panel.classList.remove('is-simulated-fullscreen', 'is-closing');
    if (document.fullscreenElement === state.panel && !state.fullscreenExitPromise) {
      try {
        const exitPromise = document.exitFullscreen?.();
        state.fullscreenExitPromise = Promise.resolve(exitPromise).catch(() => {}).finally(() => {
          if (token === state.closeSequence) state.fullscreenExitPromise = null;
        });
      } catch {
        // 全屏退出失败时仍完成图片查看器自身的关闭状态。
        state.fullscreenExitPromise = null;
      }
    }
    if (state.dialog.open) state.dialog.close();
    document.body.classList.remove('image-viewer-open');
    const restoreTriggerFocus = () => {
      if (token === state.closeSequence && trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
    window.requestAnimationFrame(restoreTriggerFocus);
    if (state.fullscreenExitPromise) {
      state.fullscreenExitPromise.finally(() => window.requestAnimationFrame(restoreTriggerFocus));
    }
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
      event.stopImmediatePropagation();
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
