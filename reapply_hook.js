const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', 'utf8');

text = text.replace(
  'const [category, setCategory] = useState<ExploreCategory>(initialCategory);',
  'const [category, setCategory] = useState<ExploreCategory>(initialCategory);\n  const [confirmedCategory, setConfirmedCategory] = useState<ExploreCategory>(initialCategory);\n  const [hasBackgroundError, setHasBackgroundError] = useState(false);'
);

text = text.replace(
  "setStatus(placesRef.current.length > 0 ? 'refreshing' : 'initial-loading');",
  "setStatus(placesRef.current.length > 0 ? 'refreshing' : 'initial-loading');\n        setHasBackgroundError(false);"
);

text = text.replace(
  "setPlaces(results);\n        setStatus('ready');",
  "setPlaces(results);\n        if (!fixtureMode) setConfirmedCategory(targetCategory);\n        setStatus('ready');"
);

text = text.replace(
  "if (placesRef.current.length > 0) {\n          setStatus('ready');\n        } else {\n          setStatus('error');\n        }",
  "if (placesRef.current.length > 0) {\n          setStatus('ready');\n          setHasBackgroundError(true);\n        } else {\n          setStatus('error');\n        }"
);

text = text.replace(
  "status,\n    category,\n    setCategory,",
  "status,\n    category,\n    confirmedCategory,\n    hasBackgroundError,\n    setCategory,"
);

fs.writeFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', text);
console.log('Re-applied changes to useExploreDiscovery');
