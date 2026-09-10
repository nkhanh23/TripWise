import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';

export function EventEmptyState() {
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
      <MaterialIcons color={colors.text.muted} name="event-busy" size={32} />
      <Text style={[styles.title, { color: colors.text.primary }]}>
        {t('intelligence.events.emptyTitle')}
      </Text>
      <AppText style={styles.subtitle}>
        {t('intelligence.events.emptySubtitle')}
      </AppText>
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
});
