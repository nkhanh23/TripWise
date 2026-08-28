const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  /{normalizedStatus === 'error' \? <ExploreErrorState onRetry={handleRetry} \/> : null}/,
  `{showBlockingError ? <ExploreErrorState onRetry={handleRetry} /> : null}\n\n      {hasBackgroundError && hasUsablePlaces ? (\n        <View style={styles.backgroundErrorWrap}>\n          <Pressable\n            accessibilityHint="Thử tải lại dữ liệu địa điểm"\n            accessibilityLabel="Thử lại tải dữ liệu bản đồ"\n            accessibilityRole="button"\n            onPress={handleRetry}\n            style={[\n              styles.backgroundErrorButton,\n              {\n                backgroundColor: colors.background.surface,\n                borderColor: colors.border.default,\n              },\n            ]}>\n            <MaterialIcons color={colors.state.error} name="refresh" size={18} />\n          </Pressable>\n        </View>\n      ) : null}`
);

text = text.replace(
  /\{normalizedStatus === 'ready' && filteredPlaces\.length === 0 \? \(\s*<ExploreEmptyState onReset=\{handleResetFilters\} \/>\s*\) : null\}/,
  "{normalizedStatus === 'ready' && filteredPlaces.length === 0 && !hasBackgroundError ? (\n        <ExploreEmptyState onReset={handleResetFilters} />\n      ) : null}"
);

text = text.replace(
  /\{filteredPlaces\.length > 0 && normalizedStatus !== 'initial-loading' \? \(/,
  "{filteredPlaces.length > 0 && normalizedStatus !== 'initial-loading' && !showBlockingError ? ("
);

// add styles
text = text.replace(
  /loadingOverlay: \{/,
  "refreshIndicatorWrap: {\n    alignItems: 'center',\n    position: 'absolute',\n    right: spacing.lg,\n    top: spacing.xl * 4,\n    zIndex: 25,\n  },\n  refreshIndicator: {\n    alignItems: 'center',\n    borderRadius: radius.pill,\n    borderWidth: 1,\n    elevation: 3,\n    height: 36,\n    justifyContent: 'center',\n    width: 36,\n  },\n  backgroundErrorWrap: {\n    alignItems: 'center',\n    position: 'absolute',\n    right: spacing.lg,\n    top: spacing.xl * 4,\n    zIndex: 26,\n  },\n  backgroundErrorButton: {\n    alignItems: 'center',\n    borderRadius: radius.pill,\n    borderWidth: 1,\n    elevation: 3,\n    height: 36,\n    justifyContent: 'center',\n    width: 36,\n  },\n  loadingOverlay: {"
);

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed JSX');
