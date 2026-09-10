import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  isRateLimited?: boolean;
  onRetry: () => void;
};

export function EventErrorState({ isRateLimited = false, onRetry }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const title = isRateLimited
    ? t('intelligence.events.rateLimitedTitle')
    : t('intelligence.events.errorTitle');

  const subtitle = isRateLimited
    ? t('intelligence.events.rateLimitedSubtitle')
    : t('intelligence.events.errorSubtitle');

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
      <MaterialIcons
        color={isRateLimited ? colors.brand.yellow : colors.state.error}
        name={isRateLimited ? 'hourglass-empty' : 'error-outline'}
        size={32}
      />
      <Text
        style={[
          styles.title,
          { color: isRateLimited ? colors.text.primary : colors.state.error },
        ]}>
        {title}
      </Text>
      <AppText style={styles.subtitle}>
        {subtitle}
      </AppText>
      <Pressable
        accessibilityHint={t('common.retry')}
        accessibilityLabel={t('common.retry')}
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
    elevation: 4,
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    width: '90%',
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.xs,
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
    paddingHorizontal: spacing.xl,
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
