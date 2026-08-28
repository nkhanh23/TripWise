const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  "  const {\n    places, status, category: selectedCategory, setCategory: setSelectedCategory,\n    onRegionChangeComplete, retry,\n  } = useExploreDiscovery(repository, initialPlaces, initialStatus);",
  "  const {\n    places,\n    status: networkStatus,\n    category: selectedCategory,\n    confirmedCategory,\n    hasBackgroundError,\n    setCategory: setSelectedCategory,\n    onRegionChangeComplete,\n    retry,\n  } = useExploreDiscovery(repository, initialPlaces, initialStatus);\n\n  const normalizedStatus = normalizeStatus(networkStatus);\n  const effectiveStatus: ExploreUIStatus = isMapMoving ? 'moving' : normalizedStatus;\n  const hasUsablePlaces = places.length > 0;\n  const showBlockingError = normalizedStatus === 'error' && !hasUsablePlaces;\n  const showConfirmedCategory = normalizedStatus === 'refreshing' || hasBackgroundError;\n  const displayCategory = showConfirmedCategory ? confirmedCategory : selectedCategory;\n  const markersDimmed = confirmedCategory !== selectedCategory && (normalizedStatus === 'refreshing' || hasBackgroundError);"
);

// We need to replace `status === 'initial-loading'` etc. with `normalizedStatus`!
text = text.replace(/status === 'initial-loading'/g, "normalizedStatus === 'initial-loading'");
text = text.replace(/status === 'refreshing'/g, "normalizedStatus === 'refreshing'");
text = text.replace(/status === 'error'/g, "normalizedStatus === 'error'");
text = text.replace(/status === 'ready'/g, "normalizedStatus === 'ready'");
text = text.replace(/status !== 'initial-loading'/g, "normalizedStatus !== 'initial-loading'");
text = text.replace(/status !== 'error'/g, "normalizedStatus !== 'error'");

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed variables');
