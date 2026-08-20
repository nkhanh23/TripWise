# Implementation Notes — React Native Mobile UI

> **Authority:** Engineering guidelines for mapping TripWise UI designs into the active React Native + TypeScript + Expo client. Android is the current implementation/runtime target.

## 1. Active source boundaries

- Visual source of truth: latest Google Stitch assets.
- Implementation source of truth: `mobile/package.json`, `mobile/app.json`, `mobile/tsconfig.json`, `mobile/src/**/*.ts(x)`.
- Navigation: React Navigation 7, not Expo Router.
- Flutter/Dart artifacts under `mobile/lib/`, `mobile/test/` and `pubspec.*` are legacy/conflicting files, not production source.

## 2. Feature-first structure

- `mobile/src/app/`: bootstrap and providers.
- `mobile/src/navigation/`: typed navigators and param lists.
- `mobile/src/theme/`: typed design tokens.
- `mobile/src/components/`: shared React Native primitives/components.
- `mobile/src/features/<feature>/`: screens, feature components, hooks/services/data boundaries.
- `mobile/tests/`: Jest and React Native Testing Library tests.

## 3. Component rules

1. Functional TypeScript components with typed props.
2. Use `StyleSheet.create` and centralized tokens; no copied DOM/CSS.
3. Keep existing names such as `AppText`/`Screen`; use planned `TW*` prefix only where roadmap/design spec calls for a reusable component.
4. Do not create screen-specific duplicates when an existing component can support a typed variant.
5. Keep Supabase/API queries outside JSX in service/repository/hook boundaries.
6. Respect `SafeAreaProvider`/safe-area edges and keyboard behavior.

## 4. State and performance

- Scope state close to its consumers; avoid app-wide context for transient screen state.
- Use `FlatList`/`SectionList` with stable keys for growing collections.
- Apply `React.memo`, `useMemo`, `useCallback` only when they reduce measurable rerenders/cost.
- Keep map canvas/markers isolated from high-frequency sheet and selection updates.
- Cleanup effects, listeners, timers and async work.
- Prefer transform/opacity/native-friendly animations; avoid expensive JS-thread work.

## 5. Pre-implementation checklist

1. Read `PHASES_FE.md` and `HANDOFF_FE.md`.
2. Confirm current source/navigation before inventing paths or libraries.
3. Source tokens from `design-system.md` and current `mobile/src/theme/` implementation.
4. Map components through `component-spec.md` and the active `stitch-to-react-native-mapping-report.md`.
5. Follow `mobile-navigation-flow.md` and actual typed navigator.
6. Run repository commands: `npm run lint`, `npm run typecheck`, `npm test`, `npx expo-doctor`.

Do not begin backend integration from a UI-only phase.
