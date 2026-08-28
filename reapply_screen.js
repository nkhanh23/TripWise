const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  'const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);',
  'const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);\n  const [isMapMoving, setIsMapMoving] = useState(false);'
);

text = text.replace(
  'const normalizedStatus = normalizeStatus(networkStatus);\n  const hasUsablePlaces = places.length > 0;',
  "const normalizedStatus = normalizeStatus(networkStatus);\n  const effectiveStatus: ExploreUIStatus = isMapMoving ? 'moving' : normalizedStatus;\n  const hasUsablePlaces = places.length > 0;"
);

text = text.replace(
  'const displayCategory = showConfirmedCategory ? confirmedCategory : selectedCategory;',
  "const displayCategory = showConfirmedCategory ? confirmedCategory : selectedCategory;\n  const markersDimmed = confirmedCategory !== selectedCategory && (normalizedStatus === 'refreshing' || hasBackgroundError);"
);

text = text.replace(
  'const handleSelectPlace = useCallback((place: ExploreMapPlace) => {\n    setSelectedPlaceId(place.id);\n  }, []);',
  'const handleSelectPlace = useCallback((place: ExploreMapPlace) => {\n    if (markersDimmed) return;\n    setSelectedPlaceId(place.id);\n  }, [markersDimmed]);'
);

text = text.replace(
  'const handleSelectCluster = useCallback((cluster: ClusterMarkerModel) => {\n    if (cluster.places.length === 0) return;\n    setSelectedPlaceId(cluster.places[0].id);\n  }, []);',
  'const handleSelectCluster = useCallback((cluster: ClusterMarkerModel) => {\n    if (markersDimmed || cluster.places.length === 0) return;\n    setSelectedPlaceId(cluster.places[0].id);\n  }, [markersDimmed]);'
);

text = text.replace(
  'onDismissSelection={handleDismissSelection}\n          onSelectCluster={handleSelectCluster}\n          onSelectPlace={handleSelectPlace}\n          onRegionChangeComplete={onRegionChangeComplete}\n          selectedPlaceId={selectedPlaceId}\n          status={normalizedStatus}',
  'markerItems={markerItems}\n          markersDimmed={markersDimmed}\n          onDismissSelection={handleDismissSelection}\n          onMovementStateChange={setIsMapMoving}\n          onSelectCluster={handleSelectCluster}\n          onSelectPlace={handleSelectPlace}\n          onRegionChangeComplete={onRegionChangeComplete}\n          selectedPlaceId={selectedPlaceId}\n          status={effectiveStatus}'
);

text = text.replace(
  "markerItems={markerItems}\n          markerItems={markerItems}\n          markersDimmed={markersDimmed}",
  "markerItems={markerItems}\n          markersDimmed={markersDimmed}"
);

text = text.replace(
  "{selectedPlace && normalizedStatus !== 'initial-loading' ? (",
  "{selectedPlace && normalizedStatus !== 'initial-loading' && !markersDimmed ? ("
);

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Re-applied changes to ExploreScreen');
