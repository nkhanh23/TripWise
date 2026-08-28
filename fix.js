const fs = require('fs');

// 1. ExploreScreen.tsx
const exploreScreenFile = 'mobile/src/features/explore/ExploreScreen.tsx';
let exploreScreen = fs.readFileSync(exploreScreenFile, 'utf8');
const search1 = exploreScreen.indexOf(`{normalizedStatus === 'refreshing' ? (`);
if (search1 !== -1) {
  let startIdx = exploreScreen.lastIndexOf('      ', search1);
  if (startIdx === -1) startIdx = search1;
  const endSearch = `) : null}`;
  let endIdx = exploreScreen.indexOf(endSearch, search1);
  if (endIdx !== -1) {
    let finalEnd = exploreScreen.indexOf('\n', endIdx);
    if (finalEnd === -1) finalEnd = endIdx + endSearch.length;
    else finalEnd += 1;
    exploreScreen = exploreScreen.slice(0, startIdx) + exploreScreen.slice(finalEnd);
    fs.writeFileSync(exploreScreenFile, exploreScreen);
    console.log('Removed refreshing indicator from ExploreScreen.tsx');
  }
}

// 2. useExploreDiscovery.ts
const discoveryFile = 'mobile/src/features/explore/hooks/useExploreDiscovery.ts';
let discovery = fs.readFileSync(discoveryFile, 'utf8');
const debounceStr = `      if (debounceRef.current) clearTimeout(debounceRef.current);
      const capturedCategory = category;
      debounceRef.current = setTimeout(() => void load(nextRegion, capturedCategory), DEBOUNCE_MS);`;
const debounceStrCRLF = debounceStr.replace(/\n/g, '\r\n');
if (discovery.includes(debounceStr)) {
  const replacement = `      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
      sequence.current += 1;
      const capturedCategory = category;
      debounceRef.current = setTimeout(() => void load(nextRegion, capturedCategory), DEBOUNCE_MS);`;
  discovery = discovery.replace(debounceStr, replacement);
  fs.writeFileSync(discoveryFile, discovery);
  console.log('Fixed race condition in useExploreDiscovery.ts (LF)');
} else if (discovery.includes(debounceStrCRLF)) {
  const replacement = `      if (debounceRef.current) clearTimeout(debounceRef.current);\r\n      abortRef.current?.abort();\r\n      sequence.current += 1;\r\n      const capturedCategory = category;\r\n      debounceRef.current = setTimeout(() => void load(nextRegion, capturedCategory), DEBOUNCE_MS);`;
  discovery = discovery.replace(debounceStrCRLF, replacement);
  fs.writeFileSync(discoveryFile, discovery);
  console.log('Fixed race condition in useExploreDiscovery.ts (CRLF)');
}

// 3. ExploreMapCanvas.tsx
const canvasFile = 'mobile/src/features/explore/components/ExploreMapCanvas.tsx';
let canvas = fs.readFileSync(canvasFile, 'utf8');
let markerSearch = `<NativeMarker
                calloutEnabled={false}
                coordinate={hint.coordinate}
                key={hint.id}
                tracksViewChanges={false}>`;
let markerSearchCRLF = markerSearch.replace(/\n/g, '\r\n');
if (canvas.includes(markerSearch)) {
  let markerReplacement = `<NativeMarker
                accessibilityElementsHidden
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                calloutEnabled={false}
                coordinate={hint.coordinate}
                key={hint.id}
                tracksViewChanges={false}>`;
  canvas = canvas.replace(markerSearch, markerReplacement);
  fs.writeFileSync(canvasFile, canvas);
  console.log('Added accessibility props to NativeMarker in ExploreMapCanvas.tsx (LF)');
} else if (canvas.includes(markerSearchCRLF)) {
  let markerReplacement = `<NativeMarker\r\n                accessibilityElementsHidden\r\n                accessible={false}\r\n                importantForAccessibility="no-hide-descendants"\r\n                calloutEnabled={false}\r\n                coordinate={hint.coordinate}\r\n                key={hint.id}\r\n                tracksViewChanges={false}>`;
  canvas = canvas.replace(markerSearchCRLF, markerReplacement);
  fs.writeFileSync(canvasFile, canvas);
  console.log('Added accessibility props to NativeMarker in ExploreMapCanvas.tsx (CRLF)');
}

