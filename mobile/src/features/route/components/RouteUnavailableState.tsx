import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type { TransportMode } from '../types';

type Props = {
  onSwitchTransport: (mode: TransportMode) => void;
  onBack: () => void;
};

export const RouteUnavailableState = memo(function RouteUnavailableState({
  onSwitchTransport,
  onBack,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
      ]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: effectiveTheme === 'dark' ? '#332914' : '#FFF4E5' },
        ]}>
        <MaterialIcons color={colors.brand.yellow} name="warning-amber" size={28} />
      </View>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        {t('route.unavailableTitle')}
      </Text>
      <AppText style={styles.subtitle}>
        {t('route.unavailableSubtitle')}
      </AppText>

      <View style={styles.buttonGroup}>
        <Pressable
          accessibilityHint="Chuyển sang lộ trình bằng phương tiện công cộng (Transit)"
          accessibilityLabel="Thử phương tiện Transit"
          accessibilityRole="button"
          onPress={() => onSwitchTransport('transit')}
          style={[styles.primaryButton, { backgroundColor: colors.brand.primary }]}>
          <Text style={[styles.primaryButtonText, { color: colors.text.inverse }]}>
            {t('route.tryTransit')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityHint="Quay lại màn hình trước"
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          onPress={onBack}
          style={[
            styles.secondaryButton,
            { backgroundColor: colors.background.surfaceVariant },
          ]}>
          <Text style={[styles.secondaryButtonText, { color: colors.text.primary }]}>
            {t('common.back')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 52,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 52,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
});
