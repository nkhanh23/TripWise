const fs = require('fs');

function patch(file, replacements) {
  let code = fs.readFileSync(file, 'utf8');
  for (const [s, r] of replacements) {
    code = code.replace(s, r);
  }
  fs.writeFileSync(file, code);
}

patch('src/features/auth/AuthProvider.tsx', [
  ['void applyUser(session?.user ?? null);', 'console.log("[PERF] AUTH_SESSION_READY " + performance.now()); void applyUser(session?.user ?? null);'],
  ['void profileRepository.getOwnProfile(currentUserId)', '(() => { console.log("[PERF] PROFILE_FETCH_START " + performance.now()); return profileRepository.getOwnProfile(currentUserId); })()'],
  ['.then((profile) => {', '.then((profile) => { console.log("[PERF] PROFILE_FETCH_END " + performance.now());']
]);

patch('src/navigation/MainTabs.tsx', [
  ['export function MainTabs() {', 'export function MainTabs() { console.log("[PERF] APP_SHELL_READY " + performance.now());']
]);

patch('src/features/home/HomeScreen.tsx', [
  ['const handleProfile = useCallback(() => {', 'console.log("[PERF] HOME_SHELL_READY " + performance.now());\\n  const handleProfile = useCallback(() => {']
]);

console.log("Done");
