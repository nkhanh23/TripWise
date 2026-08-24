import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import { useTranslation } from '../../../i18n';
import type { ImageAttribution as ImageAttributionData } from '../../../integration/contracts';
import { radius, spacing, typography } from '../../../theme/tokens';

type Props = { attribution?: ImageAttributionData };

export function ImageAttribution({ attribution }: Props) {
  const { t } = useTranslation();
  if (!attribution) return null;
  const text = [attribution.displayName, attribution.license].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityHint={t('images.attributionHint')}
      accessibilityLabel={`${t('images.attribution')}: ${text}`}
      accessibilityRole="link"
      onPress={(event) => {
        event.stopPropagation();
        void Linking.openURL(attribution.sourceUrl);
      }}
      style={styles.container}>
      <MaterialIcons color="#FFFFFF" name="info-outline" size={11} />
      <Text numberOfLines={1} style={styles.text}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    borderRadius: radius.pill,
    bottom: spacing.xs,
    flexDirection: 'row',
    gap: 3,
    maxWidth: '75%',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    position: 'absolute',
    right: spacing.xs,
    zIndex: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: typography.fontWeight.semibold,
  },
});
