import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { UserProfile } from '../types';

type Props = {
  profile: UserProfile;
  tripsCount: number;
  savedCount: number;
  countriesCount: number;
  onEditPress: () => void;
};

export const ProfileHeader = memo(function ProfileHeader({
  profile,
  tripsCount,
  savedCount,
  countriesCount,
  onEditPress,
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
      {/* 1. Top Identity Row */}
      <View style={styles.identityRow}>
        {/* Avatar with Camera Badge */}
        <View style={styles.avatarContainer}>
          {profile.avatarUrl ? (
            <Image
              accessibilityLabel={profile.displayName}
              accessibilityRole="image"
              source={{ uri: profile.avatarUrl }}
              style={[
                styles.avatar,
                {
                  borderColor: effectiveTheme === 'dark'
                    ? colors.background.surfaceVariant
                    : colors.brand.primaryContainer,
                },
              ]}
            />
          ) : (
            <View
              accessibilityLabel={profile.displayName}
              accessibilityRole="image"
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                {
                  backgroundColor: colors.background.surfaceVariant,
                  borderColor: colors.brand.primaryContainer,
                },
              ]}>
              <MaterialIcons color={colors.brand.primary} name="person" size={40} />
            </View>
          )}
          <View
            style={[
              styles.cameraBadge,
              { backgroundColor: colors.brand.primary },
            ]}>
            <MaterialIcons color={colors.text.inverse} name="camera-alt" size={14} />
          </View>
        </View>

        {/* User Info Column */}
        <View style={styles.infoColumn}>
          <Text
            numberOfLines={1}
            style={[styles.displayName, { color: colors.text.primary }]}>
            {profile.displayName}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.emailText, { color: colors.text.secondary }]}>
            {profile.email}
          </Text>

          {/* Edit Profile Outlined Button */}
          <Pressable
            accessibilityHint="Open profile editor"
            accessibilityLabel={t('profile.editProfile')}
            accessibilityRole="button"
            onPress={onEditPress}
            style={({ pressed }) => [
              styles.editButton,
              { borderColor: colors.border.default },
              pressed && styles.pressed,
            ]}>
            <Text
              style={[
                styles.editButtonText,
                { color: colors.text.primary },
              ]}>
              {t('profile.editProfile')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Statistics Row */}
      <View
        style={[
          styles.statsRow,
          { borderTopColor: colors.border.subtle },
        ]}>
        {/* Trips Stat */}
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.brand.primary }]}>
            {tripsCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
            {t('profile.tripsCount')}
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border.subtle }]} />

        {/* Saved Stat */}
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.brand.primary }]}>
            {savedCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
            {t('profile.savedCount')}
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border.subtle }]} />

        {/* Countries Stat */}
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.brand.primary }]}>
            {countriesCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
            {t('profile.countriesCount')}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  avatarContainer: {
    height: 80,
    position: 'relative',
    width: 80,
  },
  avatar: {
    borderRadius: 40,
    borderWidth: 3,
    height: 80,
    width: 80,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    bottom: 0,
    elevation: 2,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 26,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  displayName: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 2,
  },
  emailText: {
    fontSize: typography.bodySmall,
    marginBottom: spacing.sm,
  },
  editButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  statsRow: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: typography.bodySmall,
    marginTop: 2,
  },
  statDivider: {
    height: '70%',
    width: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});
