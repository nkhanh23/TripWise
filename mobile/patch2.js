const fs = require('fs');
function patch(file, replacements) {
  let code = fs.readFileSync(file, 'utf8');
  for (const [s, r] of replacements) {
    code = code.replace(s, r);
  }
  fs.writeFileSync(file, code);
}
patch('src/navigation/MainTabs.tsx', [
  ['export function MainTabs() {', 'export function MainTabs() { console.log("[PERF] APP_SHELL_READY " + performance.now());']
]);
console.log("Done2");
