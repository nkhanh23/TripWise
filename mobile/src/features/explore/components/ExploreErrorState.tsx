import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  onRetry: () => void;
};

export function ExploreErrorState({ onRetry }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.card,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
      ]}>
      <MaterialIcons color={colors.state.error} name="error-outline" size={32} />
      <Text style={[styles.title, { color: colors.state.error }]}>
        {t('explore.errorTitle')}
      </Text>
      <AppText style={styles.subtitle}>
        {t('explore.errorSubtitle')}
      </AppText>
      <Pressable
        accessibilityHint="Thử tải lại dữ liệu bản đồ"
        accessibilityLabel="Thử lại"
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retryButton,
          { backgroundColor: colors.brand.primary },
          pressed && styles.retryButtonPressed,
        ]}>
        <Text style={[styles.retryButtonText, { color: colors.text.inverse }]}>
          {t('common.retry')}
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
  retryButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
});
