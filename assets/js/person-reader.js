(() => {
  function renderPersonHtml(data, fallbackHtml = '') {
    const html = data?.html || fallbackHtml;
    if (!html) return '';
    const fragment = document.createElement('div');
    fragment.innerHTML = html;
    fragment.querySelector('h2')?.remove();
    fragment.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    return fragment.innerHTML;
  }

  window.CorleonePersonReader = Object.freeze({
    renderHtml: renderPersonHtml
  });
})();
