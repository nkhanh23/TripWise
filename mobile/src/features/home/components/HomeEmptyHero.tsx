import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  onCreateTrip: () => void;
};

export const HomeEmptyHero = memo(function HomeEmptyHero({ onCreateTrip }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background.surfaceVariant,
          borderColor: colors.border.default,
        },
      ]}>
      {/* Icon Circle */}
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: colors.background.surface },
        ]}>
        <MaterialIcons color={colors.brand.primary} name="travel-explore" size={32} />
      </View>

      {/* Heading & Subtitle */}
      <Text style={[styles.title, { color: colors.text.primary }]}>
        {t('home.emptyHeroTitle')}
      </Text>
      <AppText style={styles.subtitle}>
        {t('home.emptyHeroSubtitle')}
      </AppText>

      {/* Create Trip CTA */}
      <Pressable
        accessibilityHint={t('home.createTrip')}
        accessibilityLabel={t('home.createTrip')}
        accessibilityRole="button"
        onPress={onCreateTrip}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.brand.primary },
          pressed && styles.buttonPressed,
        ]}>
        <MaterialIcons color={colors.text.inverse} name="add" size={20} />
        <Text style={[styles.buttonText, { color: colors.text.inverse }]}>
          {t('home.createTrip')}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: radius.control, // 16px matching Stitch rounded-xl
    borderWidth: 1,
    elevation: 2,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 64,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 64,
  },
  title: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.xl,
    maxWidth: 280,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 4,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
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
