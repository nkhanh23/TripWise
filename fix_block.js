const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  /{normalizedStatus === 'initial-loading' \? \([\s\S]*?\) : null}/,
  `{normalizedStatus === 'initial-loading' ? (
        <View
          accessibilityLabel="Đang tải dữ liệu bản đồ"
          accessibilityRole="progressbar"
          style={[styles.loadingOverlay, { backgroundColor: colors.overlay.scrim }]}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      ) : null}`
);

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed block');
