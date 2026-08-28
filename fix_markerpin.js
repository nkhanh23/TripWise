const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', 'utf8');

text = text.replace(
  /function MarkerPin\(\{[\s\S]*?\}\) \{/g,
  `function MarkerPin({
  onPress,
  place,
  selected,
  dimmed,
}: {
  onPress: () => void;
  place: ExploreMapPlace;
  selected: boolean;
  dimmed: boolean;
}) {`
);

// We need to restore the first one if we messed it up, but let's just replace it.
// Oh wait, if there are multiple matches, it will break.
// Let's just do it cleanly.

// Only replace the one that doesn't have dimmed: boolean
const lines = text.split('\n');
const startIdx = lines.findIndex(l => l.includes('function MarkerPin({'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('}) {'));

if (startIdx !== -1 && endIdx !== -1) {
    const signature = lines.slice(startIdx, endIdx + 1).join('\n');
    if (!signature.includes('dimmed')) {
        lines.splice(startIdx, endIdx - startIdx + 1, `function MarkerPin({
  onPress,
  place,
  selected,
  dimmed,
}: {
  onPress: () => void;
  place: ExploreMapPlace;
  selected: boolean;
  dimmed: boolean;
}) {`);
    }
}

fs.writeFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', lines.join('\n'));
console.log('Fixed MarkerPin signature');
