import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import type { WizardStepNumber } from '../types';

type Props = {
  currentStep: WizardStepNumber;
  totalSteps?: number;
  onBack: () => void;
  onCancel?: () => void;
};

const STEP_TITLES: Record<WizardStepNumber, string> = {
  1: 'Where are you going?',
  2: 'When is your trip?',
  3: 'What are your interests?',
  4: 'Budget & Group size',
  5: 'Review & Generate',
};

export const WizardProgressBar = memo(function WizardProgressBar({
  currentStep,
  totalSteps = 5,
  onBack,
  onCancel,
}: Props) {
  return (
    <View style={styles.container}>
      {/* Top Controls Row */}
      <View style={styles.topRow}>
        <Pressable
          accessibilityHint="Quay lại bước trước"
          accessibilityLabel="Quay lại bước trước"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <MaterialIcons color={colors.text.primary} name="arrow-back" size={20} />
        </Pressable>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            Step {currentStep} of {totalSteps}
          </Text>
        </View>

        {onCancel ? (
          <Pressable
            accessibilityHint="Hủy và thoát trình tạo chuyến đi"
            accessibilityLabel="Đóng trình tạo chuyến đi"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onCancel}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <MaterialIcons color={colors.text.secondary} name="close" size={20} />
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      {/* Segmented Indicator Bar */}
      <View style={styles.barTrack}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <View
              key={stepNum}
              style={[
                styles.barSegment,
                isCompleted && styles.barSegmentCompleted,
                isCurrent && styles.barSegmentCurrent,
              ]}
            />
          );
        })}
      </View>

      {/* Title */}
      <Text style={styles.stepTitle}>{STEP_TITLES[currentStep]}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.surface,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.background.surfaceVariant,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stepBadge: {
    backgroundColor: '#D8E2FF',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  stepBadgeText: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  spacer: {
    width: 36,
  },
  barTrack: {
    flexDirection: 'row',
    gap: 6,
    height: 4,
    marginTop: 2,
  },
  barSegment: {
    backgroundColor: colors.outlineVariant,
    borderRadius: radius.pill,
    flex: 1,
    height: '100%',
  },
  barSegmentCompleted: {
    backgroundColor: colors.brand.primary,
  },
  barSegmentCurrent: {
    backgroundColor: colors.brand.primary,
  },
  stepTitle: {
    color: colors.text.primary,
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
