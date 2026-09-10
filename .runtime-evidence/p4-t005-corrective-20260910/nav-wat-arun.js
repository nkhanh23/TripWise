(() => {
  const hook = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  let nav;
  function walk(f) {
    if (!f) return;
    if (f.memoizedProps?.navigation) {
      nav = f.memoizedProps.navigation;
    }
    walk(f.child);
    walk(f.sibling);
  }
  for (const id of hook.renderers.keys()) {
    for (const r of hook.getFiberRoots(id)) {
      walk(r.current);
    }
  }
  if (!nav) return { error: 'NO_NAV' };
  nav.navigate('PlaceDetail', { placeId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY' });
  return { navigated: true };
})()
