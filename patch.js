const fs = require('fs');
let content = fs.readFileSync('mobile/src/features/saved/hooks/useSavedPlaces.ts', 'utf8');

content = content.replace(
  'import { SupabaseSavedPlacesRepository } from \'../../../integration/remote/supabaseSavedPlacesRepository\';',
  'import { SupabaseSavedPlacesRepository } from \'../../../integration/remote/supabaseSavedPlacesRepository\';\nimport { SupabasePlaceMetadataRepository } from \'../../../integration/remote/supabasePlaceMetadataRepository\';\nimport type { PlaceMetadataRepository } from \'../../../integration/repositories\';'
);

content = content.replace(
  'photoRepository?: PlacePhotoRepository;',
  'photoRepository?: PlacePhotoRepository;\n  metadataRepository?: PlaceMetadataRepository;'
);

content = content.replace(
  '{ customPlaces, repository, photoRepository } = {}',
  '{ customPlaces, repository, photoRepository, metadataRepository } = {}'
);

content = content.replace(
  'const effectivePhotoRepository = useMemo(() => {',
  'const effectiveMetadataRepository = useMemo(() => {\n    if (normalizedCustomPlaces || isFixture) return metadataRepository;\n    return metadataRepository ?? new SupabasePlaceMetadataRepository(supabase);\n  }, [normalizedCustomPlaces, isFixture, metadataRepository]);\n\n  const effectivePhotoRepository = useMemo(() => {'
);

content = content.replace(
  'const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});',
  'const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});\n  const [ratings, setRatings] = useState<Record<string, number>>({});'
);

content = content.replace(
  'const itemsWithPhotos: SavedPlaceUIItem[] = useMemo(() => {',
  'const itemsWithRichData: SavedPlaceUIItem[] = useMemo(() => {'
);

content = content.replace(
  'imageUrl: photoUrls[item.googlePlaceId] || item.imageUrl,',
  'imageUrl: photoUrls[item.googlePlaceId] || item.imageUrl,\n      rating: ratings[item.googlePlaceId] ?? item.rating,'
);

content = content.replace(
  '}, [activePlaces, photoUrls]);',
  '}, [activePlaces, photoUrls, ratings]);'
);

content = content.replace(
  'savedPlaces: itemsWithPhotos,',
  'savedPlaces: itemsWithRichData,'
);

content = content.replace(
  '// Fetch photos in background for items missing photos',
  '// Fetch metadata in background\n      if (effectiveMetadataRepository) {\n        for (const item of page.items) {\n          if (ratings[item.googlePlaceId] === undefined) {\n            void effectiveMetadataRepository\n              .getMetadata(item.googlePlaceId, controller.signal)\n              .then((meta) => {\n                if (meta.rating !== undefined && !controller.signal.aborted) {\n                  setRatings((prev) => ({ ...prev, [item.googlePlaceId]: meta.rating! }));\n                }\n              })\n              .catch(() => {});\n          }\n        }\n      }\n\n      // Fetch photos in background for items missing photos'
);

content = content.replace(
  'if (effectivePhotoRepository) {\n          for (const item of page.items) {\n            void effectivePhotoRepository\n              .getPhoto({ googlePlaceId: item.googlePlaceId }, controller.signal)\n              .then((photo) => {\n                if (photo.photoUri && !controller.signal.aborted) {\n                  setPhotoUrls((prev) => ({ ...prev, [item.googlePlaceId]: photo.photoUri! }));\n                }\n              })\n              .catch(() => {\n                // Non-blocking\n              });\n          }\n        }',
  'if (effectiveMetadataRepository) {\n          for (const item of page.items) {\n            void effectiveMetadataRepository\n              .getMetadata(item.googlePlaceId, controller.signal)\n              .then((meta) => {\n                if (meta.rating !== undefined && !controller.signal.aborted) {\n                  setRatings((prev) => ({ ...prev, [item.googlePlaceId]: meta.rating! }));\n                }\n              })\n              .catch(() => {});\n          }\n        }\n\n        if (effectivePhotoRepository) {\n          for (const item of page.items) {\n            void effectivePhotoRepository\n              .getPhoto({ googlePlaceId: item.googlePlaceId }, controller.signal)\n              .then((photo) => {\n                if (photo.photoUri && !controller.signal.aborted) {\n                  setPhotoUrls((prev) => ({ ...prev, [item.googlePlaceId]: photo.photoUri! }));\n                }\n              })\n              .catch(() => {\n                // Non-blocking\n              });\n          }\n        }'
);

fs.writeFileSync('mobile/src/features/saved/hooks/useSavedPlaces.ts', content, 'utf8');
console.log('patched successfully');
