import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  destination: string;
  dateLabel: string;
  heroImageUrl: string;
};

export const TripDetailHero = memo(function TripDetailHero({
  destination,
  dateLabel,
  heroImageUrl,
}: Props) {
  return (
    <View style={styles.container}>
      <Image
        accessibilityLabel={destination}
        accessibilityRole="image"
        source={{ uri: heroImageUrl }}
        style={styles.heroImage}
      />
      {/* Bottom Gradient overlay */}
      <View style={styles.gradientOverlay}>
        <View style={styles.contentWrap}>
          <Text numberOfLines={2} style={styles.destinationTitle}>
            {destination}
          </Text>
          <View style={styles.metaRow}>
            <MaterialIcons color={colors.brand.primary} name="calendar-today" size={15} />
            <Text style={styles.metaText}>{dateLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.surfaceVariant,
    height: 250,
    position: 'relative',
    width: '100%',
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  gradientOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  contentWrap: {
    gap: spacing.xs,
  },
  destinationTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  metaRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  metaText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
});
