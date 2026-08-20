import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { TravelerAvatar } from '../types';

type Props = {
  budgetSpent: string;
  budgetTotal: string;
  budgetPercent: number;
  travelers?: TravelerAvatar[];
  savedPlacesCount: number;
  onViewMap?: () => void;
};

export const TripSummaryBentoCard = memo(function TripSummaryBentoCard({
  budgetSpent,
  budgetTotal,
  budgetPercent,
  travelers = [],
  savedPlacesCount,
  onViewMap,
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
      {/* 1. Budget Status Column */}
      <View style={[styles.column, { borderRightColor: colors.border.subtle, borderRightWidth: 1 }]}>
        <Text style={[styles.sectionLabel, { color: colors.text.muted }]}>
          {t('tripDetail.budgetStatus')}
        </Text>
        <View style={styles.budgetRow}>
          <Text style={[styles.budgetMain, { color: colors.text.primary }]}>{budgetSpent}</Text>
          <Text style={[styles.budgetSub, { color: colors.text.secondary }]}>/ {budgetTotal}</Text>
        </View>
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: colors.background.surfaceVariant },
          ]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.brand.primary,
                width: `${Math.min(100, Math.max(0, budgetPercent))}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* 2. Companions Column */}
      <View style={[styles.column, { borderRightColor: colors.border.subtle, borderRightWidth: 1 }]}>
        <Text style={[styles.sectionLabel, { color: colors.text.muted }]}>
          {t('tripDetail.companions')}
        </Text>
        <View style={styles.avatarsRow}>
          {travelers.slice(0, 3).map((traveler, index) => (
            <View
              key={traveler.id}
              style={[
                styles.avatarWrap,
                {
                  backgroundColor:
                    traveler.colorVariant === 'tertiary'
                      ? effectiveTheme === 'dark'
                        ? '#5C1D1D'
                        : '#FFDAD5'
                      : effectiveTheme === 'dark'
                      ? '#1E354D'
                      : '#D8E4F2',
                  borderColor: colors.background.surface,
                  marginLeft: index === 0 ? 0 : -8,
                },
              ]}>
              {traveler.avatarUrl ? (
                <Image source={{ uri: traveler.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text
                  style={[
                    styles.avatarInitials,
                    {
                      color:
                        traveler.colorVariant === 'tertiary'
                          ? effectiveTheme === 'dark'
                            ? '#FFDAD5'
                            : '#410001'
                          : effectiveTheme === 'dark'
                          ? '#D8E4F2'
                          : '#111D26',
                    },
                  ]}>
                  {traveler.initials}
                </Text>
              )}
            </View>
          ))}
          {travelers.length > 3 ? (
            <View
              style={[
                styles.avatarWrap,
                {
                  backgroundColor: effectiveTheme === 'dark' ? '#1E3A5F' : '#D8E2FF',
                  borderColor: colors.background.surface,
                  marginLeft: -8,
                },
              ]}>
              <Text style={[styles.avatarMoreText, { color: colors.brand.primary }]}>
                +{travelers.length - 3}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.avatarWrap,
                {
                  backgroundColor: effectiveTheme === 'dark' ? '#1E3A5F' : '#D8E2FF',
                  borderColor: colors.background.surface,
                  marginLeft: -8,
                },
              ]}>
              <Text style={[styles.avatarMoreText, { color: colors.brand.primary }]}>+2</Text>
            </View>
          )}
        </View>
      </View>

      {/* 3. Saved Places Column */}
      <View style={styles.column}>
        <Text style={[styles.sectionLabel, { color: colors.text.muted }]}>
          {t('tripDetail.savedPlaces')}
        </Text>
        <View style={styles.placesRow}>
          <MaterialIcons color={colors.brand.primary} name="location-on" size={16} />
          <Text style={[styles.placesCount, { color: colors.text.primary }]}>
            {savedPlacesCount} Locations
          </Text>
        </View>
        <Pressable
          accessibilityHint={t('tripDetail.viewMap')}
          accessibilityLabel={t('tripDetail.viewMap')}
          accessibilityRole="button"
          hitSlop={6}
          onPress={onViewMap}
          style={({ pressed }) => [styles.viewMapButton, pressed && styles.pressed]}>
          <Text style={[styles.viewMapText, { color: colors.brand.primary }]}>
            {t('tripDetail.viewMap')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: -24,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    zIndex: 10,
  },
  column: {
    flex: 1,
    gap: 4,
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  budgetRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 2,
  },
  budgetMain: {
    fontSize: 15,
    fontWeight: typography.fontWeight.bold,
  },
  budgetSub: {
    fontSize: 11,
  },
  progressTrack: {
    borderRadius: radius.pill,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  avatarsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 28,
  },
  avatarWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 26,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 26,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarInitials: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  avatarMoreText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  placesRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  placesCount: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  viewMapButton: {
    marginTop: 2,
  },
  viewMapText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.75,
  },
});
