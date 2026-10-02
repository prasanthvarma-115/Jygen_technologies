(() => {
  const html = document.documentElement;
  const nativePages = ('onpageswap' in window) && ('onpagereveal' in window) && location.protocol !== 'file:';
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pagePath = path => path.replace(/\/index\.html$/, '/');
  let navigating = false;
  let sectionBusy = false;

  if (!nativePages) {
    html.classList.add('jygen-transition-fallback');
    if (!html.classList.contains('jygen-opening-load')) html.classList.add('jygen-entry-fade');
  }
  const resolveTarget = hash => {
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch { return null; }
  };
  const swapSection = (target, updateURL, savedTop) => {
    if (sectionBusy) return;
    sectionBusy = true;
    html.classList.remove('jygen-entry-fade');
    html.classList.add('jygen-section-transition');
    const finish = () => {
      html.classList.remove('jygen-section-transition', 'jygen-section-leaving');
      sectionBusy = false;
    };
    const update = () => {
      const header = document.querySelector('.site-header');
      header?.classList.remove('is-hidden');
      const scope = target?.closest('.site-piece') || target;
      scope?.querySelectorAll('.reveal, .reveal-target').forEach(el => el.classList.add('is-visible'));
      scope?.classList.add('jygen-section-ready');
      const offset = header?.getBoundingClientRect().height || 0;
      const top = savedTop ?? (target ? Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset - 12) : 0);
      if (updateURL) {
        history.replaceState({ ...history.state, jygenSectionTop: window.scrollY }, '', location.href);
        history.scrollRestoration = 'manual';
        history.pushState({ jygenSectionTop: top }, '', updateURL);
      }
      // Reposition inside the snapshot/fade; never animate through intervening sections.
      window.scrollTo({ top, left: 0, behavior: 'instant' });
      if (target) {
        const focusTarget = target.querySelector('h1, h2') || target;
        if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
        focusTarget.focus({ preventScroll: true });
      }
    };
    if (reducedMotion()) { update(); finish(); return; }
    if (document.startViewTransition) {
      try {
        const transition = document.startViewTransition(update);
        transition.finished.then(finish, finish);
        return;
      } catch { /* Fall back when snapshots are unavailable. */ }
    }
    html.classList.add('jygen-section-leaving');
    setTimeout(() => {
      update();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        html.classList.remove('jygen-section-leaving');
        setTimeout(finish, 420);
      }));
    }, 180);
  };
  window.addEventListener('pageshow', () => {
    navigating = false;
    sectionBusy = false;
    html.classList.remove('jygen-page-leaving', 'jygen-section-transition', 'jygen-section-leaving');
  });
  window.addEventListener('popstate', event => {
    if (typeof event.state?.jygenSectionTop === 'number') {
      swapSection(resolveTarget(location.hash), null, event.state.jygenSectionTop);
    }
  });
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !['http:', 'https:', 'file:'].includes(url.protocol)) return;
    if (pagePath(url.pathname) === pagePath(location.pathname) && url.search === location.search) {
      if (!url.hash) return;
      const target = resolveTarget(url.hash);
      if (!target) return;
      event.preventDefault();
      if (!navigating) swapSection(target, url.href === location.href ? null : url.href);
      return;
    }
    if (nativePages || reducedMotion()) return;
    if (!url.pathname.endsWith('/') && !/\.html$/.test(url.pathname)) return;
    event.preventDefault();
    if (navigating || sectionBusy) return;
    navigating = true;
    html.classList.remove('jygen-entry-fade');
    html.classList.add('jygen-page-leaving');
    setTimeout(() => location.assign(url.href), 220);
    // Restore visibility if the browser cancels navigation.
    setTimeout(() => { html.classList.remove('jygen-page-leaving'); navigating = false; }, 2400);
  });
})();
