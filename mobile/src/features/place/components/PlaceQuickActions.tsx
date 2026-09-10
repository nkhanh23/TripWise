import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  onRoute?: () => void;
  onWebsite?: () => void;
  onCall?: () => void;
  onAdd?: () => void;
};

export const PlaceQuickActions = memo(function PlaceQuickActions({
  onRoute,
  onWebsite,
  onCall,
  onAdd,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.gridContainer}>
      <Pressable
        accessibilityHint={t('place.directionsHint')}
        accessibilityLabel={t('place.getDirections')}
        accessibilityRole="button"
        onPress={onRoute}
        style={({ pressed }) => [
          styles.actionCard,
          { backgroundColor: colors.background.surfaceVariant },
          pressed && styles.pressed,
        ]}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.background.surface },
          ]}>
          <MaterialIcons color={colors.brand.primary} name="directions" size={22} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.brand.primary }]}>
          {t('place.route')}
        </Text>
      </Pressable>

      <Pressable
        accessibilityHint={t('common.unavailableMessage')}
        accessibilityLabel={t('place.website')}
        accessibilityRole="button"
        onPress={onWebsite}
        style={({ pressed }) => [
          styles.actionCard,
          { backgroundColor: colors.background.surfaceVariant },
          pressed && styles.pressed,
        ]}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.background.surface },
          ]}>
          <MaterialIcons color={colors.text.secondary} name="language" size={22} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text.primary }]}>
          {t('place.website')}
        </Text>
      </Pressable>

      <Pressable
        accessibilityHint={t('common.unavailableMessage')}
        accessibilityLabel={t('place.call')}
        accessibilityRole="button"
        onPress={onCall}
        style={({ pressed }) => [
          styles.actionCard,
          { backgroundColor: colors.background.surfaceVariant },
          pressed && styles.pressed,
        ]}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.background.surface },
          ]}>
          <MaterialIcons color={colors.text.secondary} name="call" size={22} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text.primary }]}>
          {t('place.call')}
        </Text>
      </Pressable>

      <Pressable
        accessibilityHint={t('common.unavailableMessage')}
        accessibilityLabel={t('place.addToTrip')}
        accessibilityRole="button"
        onPress={onAdd}
        style={({ pressed }) => [
          styles.actionCard,
          { backgroundColor: colors.background.surfaceVariant },
          pressed && styles.pressed,
        ]}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.background.surface },
          ]}>
          <MaterialIcons color={colors.text.secondary} name="bookmark-add" size={22} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text.primary }]}>
          {t('place.addToTrip')}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginVertical: spacing.md,
  },
  actionCard: {
    alignItems: 'center',
    borderRadius: radius.card,
    flex: 1,
    gap: 6,
    paddingVertical: spacing.md,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
