import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  onReset: () => void;
};

export function ExploreEmptyState({ onReset }: Props) {
  const { colors } = useTheme();
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
      <MaterialIcons color={colors.text.muted} name="search-off" size={32} />
      <Text style={[styles.title, { color: colors.text.primary }]}>
        {t('explore.emptyTitle')}
      </Text>
      <AppText style={styles.subtitle}>
        {t('explore.emptySubtitle')}
      </AppText>
      <Pressable
        accessibilityHint={t('explore.clearFilters')}
        accessibilityLabel={t('explore.clearFilters')}
        accessibilityRole="button"
        onPress={onReset}
        style={({ pressed }) => [
          styles.resetButton,
          { backgroundColor: colors.brand.primary },
          pressed && styles.resetButtonPressed,
        ]}>
        <Text style={[styles.resetButtonText, { color: colors.text.inverse }]}>
          {t('explore.clearFilters')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    bottom: spacing.xxl,
    elevation: 6,
    gap: spacing.xs,
    left: spacing.lg,
    padding: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 35,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginTop: 2,
  },
  subtitle: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  resetButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  resetButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  resetButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
});
