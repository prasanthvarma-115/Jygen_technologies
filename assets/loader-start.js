(() => {
  const key = 'jygen-opening-loader-seen';
  const navigation = performance.getEntriesByType('navigation')[0];
  const refresh = navigation?.type === 'reload';
  let show = navigation?.type !== 'back_forward';
  try {
    show = show && (refresh || sessionStorage.getItem(key) !== '1');
    if (show) sessionStorage.setItem(key, '1');
  } catch {
    // If storage is unavailable, show on refresh or initial navigation.
    show = navigation?.type !== 'back_forward';
  }
  if (show) document.documentElement.classList.add('jygen-opening-load');
})();
