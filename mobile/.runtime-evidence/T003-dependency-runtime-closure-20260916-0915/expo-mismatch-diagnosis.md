# Expo mismatch diagnosis

Classification: UNPUBLISHED_OR_INCONSISTENT_EXPECTATION.

- Configured registry is https://registry.npmjs.org/.
- Registry proves expo@57.0.23 and expo-notifications@57.0.19 exist.
- Current package.json, package-lock and installed tree intentionally resolve expo@57.0.22 and expo-notifications@57.0.18.
- Current installed expo@57.0.22 bundledNativeModules.json explicitly declares expo-notifications ~57.0.18.
- That same expo package declares @expo/cli ^57.0.24; the installed nested CLI is @expo/cli@57.0.24.
- The CLI compatibility check requests expo ~57.0.23 and expo-notifications ~57.0.19, conflicting materially with installed Expo 57.0.22 metadata and the reviewed public SDK-57 evidence.

No dependency version was changed. Forcing the CLI request would alter the accepted SDK-57 dependency set without a consistent local compatibility contract. The correct status is BLOCKED_EXPO_VERSION_METADATA.
