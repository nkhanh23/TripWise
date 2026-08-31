import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import type { ThemePalette } from '../../../theme/types';
import { radius, spacing, typography } from '../../../theme/tokens';
import { AbstractTripBuildCanvas } from './AbstractTripBuildCanvas';
import {
  GENERATION_SHEET_TRANSITION_END,
  GENERATION_SHEET_TRANSITION_START,
} from './generationPresentationFrames';

type Props = {
  colors: ThemePalette;
  destination: string;
  durationDays: number;
  frameAnim: Animated.Value;
};

/**
 * F000–F151 generation-only composition. It is presentation-only: frame
 * animation never starts a request and F151 transforms clamp into a hold.
 */
export function CreateTripGenerationPresentation({ colors, destination, durationDays, frameAnim }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const sheetTransition = frameAnim.interpolate({
    inputRange: [GENERATION_SHEET_TRANSITION_START, GENERATION_SHEET_TRANSITION_END],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const headingTranslateY = sheetTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const sheetTranslateY = sheetTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });
  const understandingOpacity = sheetTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const understandingTranslateY = sheetTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });
  const itineraryOpacity = sheetTransition;
  const itineraryTranslateY = sheetTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 0],
  });

  return (
    <View
      accessibilityLabel={t('planner.generating')}
      accessibilityRole="progressbar"
      style={[styles.screen, { backgroundColor: colors.background.surface, paddingTop: Math.max(insets.top, spacing.sm) }]}>
      <View style={styles.header}>
        <View style={[styles.brandMark, { backgroundColor: colors.background.surfaceVariant, borderColor: colors.border.subtle }]}>
          <MaterialIcons color={colors.brand.primary} name="explore" size={20} />
        </View>
        <AppText style={[styles.brand, { color: colors.text.primary }]}>TripWise</AppText>
      </View>

      <Animated.View style={[styles.headingBlock, { transform: [{ translateY: headingTranslateY }] }]}>
        <Text numberOfLines={2} style={[styles.heading, { color: colors.text.primary }]}>
          {t('planner.generatingTitle', { destination })}
        </Text>
      </Animated.View>

      <View style={styles.canvasSlot}>
        <AbstractTripBuildCanvas colors={colors} durationDays={durationDays} frameAnim={frameAnim} />
      </View>

      <Animated.View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: colors.background.surfaceVariant,
            borderColor: colors.border.subtle,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}>
        <View style={[styles.sheetMotif, { backgroundColor: colors.brand.primary }]} />
        <View style={styles.sheetCopy}>
          <Animated.View style={[styles.sheetSlot, { opacity: understandingOpacity, transform: [{ translateY: understandingTranslateY }] }]}>
            <AppText style={[styles.sheetTitle, { color: colors.text.primary }]}>
              {t('planner.generationUnderstanding')}
            </AppText>
          </Animated.View>
          <Animated.View style={[styles.sheetSlot, { opacity: itineraryOpacity, transform: [{ translateY: itineraryTranslateY }] }]}>
            <AppText style={[styles.sheetTitle, { color: colors.text.primary }]}>
              {t('planner.itineraryBuilding')}
            </AppText>
            <AppText style={[styles.sheetDetail, { color: colors.text.secondary }]}>
              {t('planner.itineraryBuildingDetail')}
            </AppText>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: 'auto',
    minHeight: 82,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  brand: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  brandMark: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  canvasSlot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 340,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  heading: {
    fontSize: typography.title,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'left',
  },
  headingBlock: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  screen: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  sheetCopy: {
    flex: 1,
    minHeight: 44,
  },
  sheetDetail: {
    fontSize: typography.bodySmall,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  sheetMotif: {
    borderRadius: radius.pill,
    height: 28,
    width: 5,
  },
  sheetSlot: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheetTitle: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
});