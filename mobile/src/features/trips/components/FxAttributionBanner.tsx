import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useCallback } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing } from '../../../theme/tokens';

type Props = {
  attribution: string;
  attributionUrl: string;
  hasProviderAttribution: boolean;
  ratesState: 'fresh' | 'stale' | 'unavailable' | 'none';
};

export const FxAttributionBanner = memo(function FxAttributionBanner({
  attribution,
  attributionUrl,
  hasProviderAttribution,
  ratesState,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const handleOpenUrl = useCallback(() => {
    if (attributionUrl) {
      void Linking.openURL(attributionUrl).catch(() => {});
    }
  }, [attributionUrl]);

  if (ratesState === 'none') return null;

  return (
    <View style={styles.container}>
      {/* Notice for Stale or Unavailable Rates */}
      {ratesState === 'unavailable' ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.noticeBox,
            {
              backgroundColor: colors.background.surfaceVariant,
              borderColor: colors.state.error,
            },
          ]}>
          <MaterialIcons color={colors.state.error} name="cloud-off" size={16} />
          <Text style={[styles.noticeText, { color: colors.text.secondary }]}>
            {t('tripExpenses.ratesUnavailableNotice')}
          </Text>
        </View>
      ) : ratesState === 'stale' ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.noticeBox,
            {
              backgroundColor: colors.background.surfaceVariant,
              borderColor: colors.state.warning,
            },
          ]}>
          <MaterialIcons
            color={colors.state.warning}
            name="history"
            size={16}
          />
          <Text style={[styles.noticeText, { color: colors.text.secondary }]}>
            {t('tripExpenses.ratesStaleNotice')}
          </Text>
        </View>
      ) : null}

      {/* Required Attribution Link */}
      {hasProviderAttribution ? (
        <Pressable
          accessibilityHint={t('images.attributionHint')}
          accessibilityLabel={attribution}
          accessibilityRole="link"
          hitSlop={8}
          onPress={handleOpenUrl}
          style={styles.attributionRow}>
          <Text style={[styles.attributionText, { color: colors.text.muted }]}>{attribution}</Text>
          <MaterialIcons color={colors.text.muted} name="open-in-new" size={12} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  noticeBox: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
  noticeText: {
    fontSize: 11,
    flex: 1,
  },
  attributionRow: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    minHeight: 24,
    paddingVertical: 2,
  },
  attributionText: {
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});
