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
  return { hasNav: !!nav, routes: nav?.getState()?.routes?.map(r => r.name) };
})()
