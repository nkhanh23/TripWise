const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', 'utf8');

const hintsCode = `\n\nexport function buildExplorationHints(region: ExploreMapRegion) {\n  return [\n    { id: 'hint-1', coordinate: { latitude: region.latitude + 0.01, longitude: region.longitude + 0.01 }, opacity: 0.8, scale: 1 },\n    { id: 'hint-2', coordinate: { latitude: region.latitude - 0.01, longitude: region.longitude - 0.01 }, opacity: 0.8, scale: 1 },\n    { id: 'hint-3', coordinate: { latitude: region.latitude + 0.01, longitude: region.longitude - 0.01 }, opacity: 0.8, scale: 1 },\n    { id: 'hint-4', coordinate: { latitude: region.latitude - 0.01, longitude: region.longitude + 0.01 }, opacity: 0.8, scale: 1 },\n    { id: 'hint-5', coordinate: { latitude: region.latitude + 0.02, longitude: region.longitude }, opacity: 0.8, scale: 1 },\n    { id: 'hint-6', coordinate: { latitude: region.latitude - 0.02, longitude: region.longitude }, opacity: 0.8, scale: 1 },\n    { id: 'hint-7', coordinate: { latitude: region.latitude, longitude: region.longitude + 0.02 }, opacity: 0.8, scale: 1 },\n    { id: 'hint-8', coordinate: { latitude: region.latitude, longitude: region.longitude - 0.02 }, opacity: 0.8, scale: 1 },\n  ];\n}\nexport type ExploreRegionChangeDetails = { isGesture?: boolean };\n`;
text += hintsCode;

text = text.replace(
  /type Props = \{/,
  "type Props = {\n  markersDimmed: boolean;\n  onMovementStateChange: (isMoving: boolean) => void;"
);

text = text.replace(
  /export const ExploreMapCanvas = memo\(function ExploreMapCanvas\(\{/,
  "export const ExploreMapCanvas = memo(function ExploreMapCanvas({\n  markersDimmed,\n  onMovementStateChange,"
);

text = text.replace(
  /dimmed=\{selectedPlaceId !== null && item\.id !== selectedPlaceId\}/g,
  "dimmed={markersDimmed || (selectedPlaceId !== null && item.id !== selectedPlaceId)}"
);
text = text.replace(
  /dimmed=\{selectedPlaceId !== null && cluster\.places\.every\(\(p\) => p\.id !== selectedPlaceId\)\}/g,
  "dimmed={markersDimmed || (selectedPlaceId !== null && cluster.places.every((p) => p.id !== selectedPlaceId))}"
);

// We need to reapply handlePanDrag and handleRegionChangeComplete
text = text.replace(
  /const handlePanDrag = useCallback\(\(\) => \{\n    setHintsVisible\(true\);\n  \}, \[\]\);/,
  "const handlePanDrag = useCallback(() => {\n    setHintsVisible(true);\n    onMovementStateChange(true);\n  }, [onMovementStateChange]);"
);

text = text.replace(
  /const handleRegionChangeComplete = useCallback\(\n    \(region: ExploreMapRegion, details\?: \{ isGesture\?: boolean \}\) => \{/,
  "const handleRegionChangeComplete = useCallback(\n    (region: ExploreMapRegion, details?: { isGesture?: boolean }) => {\n      onMovementStateChange(false);"
);

text = text.replace(
  /onRegionChangeComplete\(region\);\n    \},\n    \[onRegionChangeComplete\],/,
  "onRegionChangeComplete(region);\n    },\n    [onMovementStateChange, onRegionChangeComplete],"
);


fs.writeFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', text);
console.log('Added hints and fixed markersDimmed');
