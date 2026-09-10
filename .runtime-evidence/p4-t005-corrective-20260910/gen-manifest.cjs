const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const files = [
  'mobile/src/features/explore/ExploreScreen.tsx',
  'mobile/src/features/explore/components/EventCandidateCard.tsx',
  'mobile/src/features/explore/components/EventPreviewSheet.tsx',
  'mobile/src/features/explore/components/EventEmptyState.tsx',
  'mobile/src/features/explore/components/EventErrorState.tsx',
  'mobile/src/features/explore/components/ExplorePlacePreview.tsx',
  'mobile/src/features/explore/components/ExplorePlaceListItem.tsx',
  'mobile/src/features/explore/components/ExploreSearchBar.tsx',
  'mobile/src/features/explore/components/ExploreViewToggle.tsx',
  'mobile/src/features/explore/hooks/useEventIntelligence.ts',
  'mobile/src/features/place/screens/PlaceDetailScreen.tsx',
  'mobile/src/features/place/components/PlaceHeader.tsx',
  'mobile/src/features/place/components/PlaceQuickActions.tsx',
  'mobile/src/features/place/hooks/usePlaceIntelligence.ts',
  'mobile/src/integration/intelligenceComposition.ts',
  'mobile/src/navigation/MainTabs.tsx',
  'mobile/src/navigation/AppNavigator.tsx',
  'mobile/src/i18n/en.ts',
  'mobile/src/i18n/vi.ts',
  'mobile/tests/intelligence-ui-review.test.tsx',
  'mobile/tests/ExploreScreen.test.tsx',
  'mobile/tests/PlaceDetailScreen.test.tsx',
  'mobile/tests/ExploreProductionScreen.test.tsx'
];

const rootDir = 'd:\\Dev\\TripWise';
const manifest = {
  timestamp: new Date().toISOString(),
  algorithm: 'sha256',
  files: {}
};

for (const rel of files) {
  const full = path.join(rootDir, rel);
  if (fs.existsSync(full)) {
    const buf = fs.readFileSync(full);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    manifest.files[rel.replace(/\\/g, '/')] = {
      sha256: hash,
      sizeBytes: buf.length
    };
  } else {
    manifest.files[rel.replace(/\\/g, '/')] = { error: 'NOT_FOUND' };
  }
}

fs.writeFileSync(
  path.join(rootDir, '.runtime-evidence', 'p4-t005-corrective-20260910', 'source-hashes.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);
console.log('Manifest written with', Object.keys(manifest.files).length, 'files.');
