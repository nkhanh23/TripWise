const fs = require('fs');

let text = fs.readFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', 'utf8');

text = text.replace(
  /export const ExploreMapCanvas = memo\(function ExploreMapCanvas\(\{[\s\S]*?\}: Props\) \{/,
  `export const ExploreMapCanvas = memo(function ExploreMapCanvas({
  status,
  markersDimmed,
  onMovementStateChange,
  markerItems,
  selectedPlaceId,
  onSelectPlace,
  onSelectCluster,
  onDismissSelection,
  onRegionChangeComplete,
}: Props) {`
);

fs.writeFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', text);
console.log('Fixed props in ExploreMapCanvas');
