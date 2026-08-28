const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', 'utf8');

text = text.replace(
  "const [category, setCategoryState] = useState<ExploreCategory>('all');",
  "const [category, setCategoryState] = useState<ExploreCategory>('all');\n  const [confirmedCategory, setConfirmedCategory] = useState<ExploreCategory>('all');\n  const [hasBackgroundError, setHasBackgroundError] = useState(false);"
);

// We also need to fix `setConfirmedCategory` being called in `load`!
text = text.replace(
  "setPlaces(results);\n        setStatus('ready');",
  "setPlaces(results);\n        if (!fixtureMode) setConfirmedCategory(targetCategory);\n        setStatus('ready');"
);

text = text.replace(
  "if (placesRef.current.length > 0) {\n          setStatus('ready');\n        } else {\n          setStatus('error');\n        }",
  "if (placesRef.current.length > 0) {\n          setStatus('ready');\n          setHasBackgroundError(true);\n        } else {\n          setStatus('error');\n        }"
);

text = text.replace(
  "setStatus(placesRef.current.length > 0 ? 'refreshing' : 'loading');",
  "setStatus(placesRef.current.length > 0 ? 'refreshing' : 'loading');\n        setHasBackgroundError(false);"
);

fs.writeFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', text);
console.log('Fixed useExploreDiscovery declarations');
