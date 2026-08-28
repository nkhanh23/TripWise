const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', 'utf8');

const target = `      if (lastRequestKeyRef.current === requestKey(nextRegion, category)) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);`;

const replacement = `      if (lastRequestKeyRef.current === requestKey(nextRegion, category)) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
      sequence.current += 1;
      lastRequestKeyRef.current = null;`;

text = text.replace(target, replacement);

// try regex if literal failed
if (!text.includes('sequence.current += 1;\n      lastRequestKeyRef.current = null;')) {
    text = text.replace(
        /if \(lastRequestKeyRef\.current === requestKey\(nextRegion, category\)\) return;\s*if \(debounceRef\.current\) clearTimeout\(debounceRef\.current\);/,
        `if (lastRequestKeyRef.current === requestKey(nextRegion, category)) return;\n      if (debounceRef.current) clearTimeout(debounceRef.current);\n      abortRef.current?.abort();\n      sequence.current += 1;\n      lastRequestKeyRef.current = null;`
    );
}

fs.writeFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', text);
console.log('Fixed supersede race');
