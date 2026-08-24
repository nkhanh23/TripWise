import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { UpcomingTripData } from '../types';
import { ImageAttribution } from '../../images/components/ImageAttribution';

type Props = {
  trip: UpcomingTripData;
  onPressViewItinerary: (tripId: string) => void;
};

export const HomeUpcomingCard = memo(function HomeUpcomingCard({
  trip,
  onPressViewItinerary,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
      ]}>
      {/* Cover Image */}
      <View style={styles.imageContainer}>
        {trip.imageUrl ? (
          <Image
            accessibilityLabel={trip.title}
            accessibilityRole="image"
            resizeMode="cover"
            source={{ uri: trip.imageUrl }}
            style={styles.image}
          />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: colors.background.surfaceVariant },
            ]}>
            <MaterialIcons color={colors.brand.primary} name="landscape" size={48} />
          </View>
        )}

        <ImageAttribution attribution={trip.resolvedImage?.attribution} />

        {/* Days Badge */}
        {trip.badgeText ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  effectiveTheme === 'dark'
                    ? 'rgba(30, 41, 59, 0.92)'
                    : 'rgba(255, 255, 255, 0.92)',
              },
            ]}>
            <MaterialIcons color={colors.state.error} name="schedule" size={14} />
            <Text style={[styles.badgeText, { color: colors.text.primary }]}>
              {trip.badgeText}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text.primary }]}>
          {trip.title}
        </Text>

        <View style={styles.metaRow}>
          <MaterialIcons color={colors.text.secondary} name="calendar-today" size={14} />
          <Text style={[styles.dateText, { color: colors.text.secondary }]}>
            {trip.dateLabel}
          </Text>
        </View>

        {/* View Itinerary Button */}
        <Pressable
          accessibilityHint={t('home.viewItinerary')}
          accessibilityLabel={`${t('home.viewItinerary')}: ${trip.title}`}
          accessibilityRole="button"
          onPress={() => onPressViewItinerary(trip.id)}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.brand.primary },
            pressed && styles.buttonPressed,
          ]}>
          <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
            {t('home.viewItinerary')}
          </Text>
          <MaterialIcons color={colors.text.inverse} name="arrow-forward" size={18} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.control, // 16px matching Stitch rounded-xl
    borderWidth: 1,
    elevation: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  imageContainer: {
    height: 136,
    position: 'relative',
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  badge: {
    alignItems: 'center',
    borderRadius: radius.input,
    elevation: 2,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  dateText: {
    fontSize: typography.bodySmall,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 46,
    justifyContent: 'center',
    width: '100%',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
});
