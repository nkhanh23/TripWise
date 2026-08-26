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
  ['void profileRepository\\n        .getOwnProfile(currentUserId)', '(() => { console.log("[PERF] PROFILE_FETCH_START " + performance.now()); return profileRepository.getOwnProfile(currentUserId); })()'],
  ['.then((profile) => {', '.then((profile) => { console.log("[PERF] PROFILE_FETCH_END " + performance.now());']
]);

patch('src/navigation/MainTabs.tsx', [
  ['export function MainTabs() {', 'export function MainTabs() { React.useEffect(() => { console.log("[PERF] APP_SHELL_READY " + performance.now()); }, []);'],
  ['import { useTranslation } from "react-i18next";', 'import { useTranslation } from "react-i18next";\\nimport React from "react";']
]);

console.log("Patched");
