const fs = require('fs');

function patch(file, replacements) {
  let code = fs.readFileSync(file, 'utf8');
  for (const [s, r] of replacements) {
    code = code.replace(s, r);
  }
  fs.writeFileSync(file, code);
}

patch('src/features/auth/AuthProvider.tsx', [
  ['authRepository\\n      .restoreSession()', '(() => { console.log("[PERF] START " + performance.now()); return authRepository.restoreSession(); })()'],
  ['void applyUser(session?.user ?? null);', 'console.log("[PERF] SESSION_RESTORED " + performance.now()); void applyUser(session?.user ?? null);'],
  ['const profile = await profileRepository.getOwnProfile(user.id);', 'console.log("[PERF] PROFILE_FETCH_START " + performance.now()); const profile = await profileRepository.getOwnProfile(user.id); console.log("[PERF] PROFILE_FETCH_END " + performance.now());']
]);

patch('src/navigation/AppNavigator.tsx', [
  ['if (target === "app") {\\n    return <AuthenticatedNavigator />;', 'if (target === "app") {\\n    console.log("[PERF] APP_NAVIGATOR_RENDERED " + performance.now());\\n    return <AuthenticatedNavigator />;']
]);

patch('src/features/home/HomeScreen.tsx', [
  ['export const HomeScreen = memo(function HomeScreen({', 'export const HomeScreen = memo(function HomeScreen({\\n  ...props\\n}) { console.log("[PERF] HOME_SCREEN_RENDERED " + performance.now()); return <HomeScreenImpl {...props} />}); function HomeScreenImpl({']
]);

console.log("Done");
