const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', 'utf8');

const importReplacement = `import { ExploreMotionHint } from './ExploreMotionHint';\nimport { memo, useEffect, useMemo, useCallback, useState } from 'react';`;
text = text.replace(/import \{ memo, useEffect, useMemo \} from 'react';/, importReplacement);

text = text.replace(
  /type Props = \{/,
  'type Props = {\n  markersDimmed: boolean;\n  status: ExploreUIStatus;'
);

text = text.replace(
  /import type \{ ClusterMarkerModel, ExploreMapPlace, ExploreMarkerItem \} from '\.\.\/types';/,
  "import type { ClusterMarkerModel, ExploreMapPlace, ExploreMarkerItem, ExploreUIStatus } from '../types';"
);

text = text.replace(
  /export const ExploreMapCanvas = memo\(function ExploreMapCanvas\(\{/,
  'export const ExploreMapCanvas = memo(function ExploreMapCanvas({\n  status,\n  markersDimmed,'
);

const hookCode = `  const [currentRegion, setCurrentRegion] = useState<ExploreMapRegion>(INITIAL_EXPLORE_REGION);
  
  const handlePanDrag = useCallback(() => {
    onMovementStateChange(true);
  }, [onMovementStateChange]);

  const handleRegionChangeComplete = useCallback(
    (region: ExploreMapRegion, details?: ExploreRegionChangeDetails) => {
      setCurrentRegion(region);
      onMovementStateChange(false);
      if (onRegionChangeComplete) onRegionChangeComplete(region, details);
    },
    [onMovementStateChange, onRegionChangeComplete]
  );

  const hints = useMemo(() => {
    if (status !== 'moving') return [];
    return buildExplorationHints(currentRegion);
  }, [status, currentRegion]);

  const validMarkerCoordinates = useMemo`;

text = text.replace(/const validMarkerCoordinates = useMemo/, hookCode);

text = text.replace(
  /onRegionChangeComplete=\{onRegionChangeComplete\}/,
  'onPanDrag={handlePanDrag}\n        onRegionChangeComplete={handleRegionChangeComplete}'
);

const renderHintsCode = `{hints.map((hint) => (
          <Marker
            coordinate={hint.coordinate}
            key={hint.id}
            tracksViewChanges={false}
          >
            <ExploreMotionHint opacity={hint.opacity} scale={hint.scale} />
          </Marker>
        ))}
        {validMarkerCoordinates.map`;

text = text.replace(/\{validMarkerCoordinates\.map/, renderHintsCode);

text = text.replace(
  /<MarkerPin\s*\n*\s*onPress=\{\(\) => onSelectPlace\(item\.place\)\}\s*\n*\s*place=\{item\.place\}\s*\n*\s*selected=\{item\.place\.id === selectedPlaceId\}\s*\n*\s*\/>/g,
  '<MarkerPin onPress={() => onSelectPlace(item.place)} place={item.place} selected={item.place.id === selectedPlaceId} dimmed={markersDimmed || (selectedPlaceId !== null && item.place.id !== selectedPlaceId)} />'
);

text = text.replace(
  /<ClusterPin cluster=\{item\} \/>/g,
  '<ClusterPin cluster={item} dimmed={markersDimmed || (selectedPlaceId !== null && item.places.every((p) => p.id !== selectedPlaceId))} />'
);

text = text.replace(
  /function MarkerPin\(\{\n  onPress,\n  place,\n  selected,\n\}: \{\n  onPress: \(\) => void;\n  place: ExploreMapPlace;\n  selected: boolean;\n\}\) \{/g,
  'function MarkerPin({ onPress, place, selected, dimmed }: { onPress: () => void; place: ExploreMapPlace; selected: boolean; dimmed: boolean; }) {'
);

text = text.replace(
  /onPress=\{onPress\}\n\s*style=\{styles\.nativeMarkerWrap\}>/g,
  'onPress={dimmed ? undefined : onPress} disabled={dimmed} style={[styles.nativeMarkerWrap, dimmed && { opacity: 0.5 }]}>'
);

text = text.replace(
  /function ClusterPin\(\{ cluster \}: \{ cluster: ClusterMarkerModel \}\) \{/g,
  'function ClusterPin({ cluster, dimmed }: { cluster: ClusterMarkerModel; dimmed: boolean; }) {'
);

text = text.replace(
  /style=\{styles\.clusterCircle\}>/g,
  'style={[styles.clusterCircle, dimmed && { opacity: 0.5 }]}>'
);

if (!text.includes('buildExplorationHints')) {
    text += `\nexport function buildExplorationHints(region: ExploreMapRegion) {
  return [
    { id: 'hint-1', coordinate: { latitude: region.latitude + 0.01, longitude: region.longitude + 0.01 }, opacity: 0.8, scale: 1 },
    { id: 'hint-2', coordinate: { latitude: region.latitude - 0.01, longitude: region.longitude - 0.01 }, opacity: 0.8, scale: 1 },
    { id: 'hint-3', coordinate: { latitude: region.latitude + 0.01, longitude: region.longitude - 0.01 }, opacity: 0.8, scale: 1 },
    { id: 'hint-4', coordinate: { latitude: region.latitude - 0.01, longitude: region.longitude + 0.01 }, opacity: 0.8, scale: 1 },
    { id: 'hint-5', coordinate: { latitude: region.latitude + 0.02, longitude: region.longitude }, opacity: 0.8, scale: 1 },
    { id: 'hint-6', coordinate: { latitude: region.latitude - 0.02, longitude: region.longitude }, opacity: 0.8, scale: 1 },
    { id: 'hint-7', coordinate: { latitude: region.latitude, longitude: region.longitude + 0.02 }, opacity: 0.8, scale: 1 },
    { id: 'hint-8', coordinate: { latitude: region.latitude, longitude: region.longitude - 0.02 }, opacity: 0.8, scale: 1 },
  ];
}\nexport type ExploreRegionChangeDetails = { isGesture?: boolean };\n`;
}

fs.writeFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', text);
console.log('ExploreMapCanvas patch successful.');
