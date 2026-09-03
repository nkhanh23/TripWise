import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { CreateTripGenerationPresentation } from './CreateTripGenerationPresentation';
import { FPS, LIFECYCLE_BOUNDARIES } from './timeline';

type Props = {
  destination: string;
  durationDays: number;
  onClose: () => void;
};

const SEEK_FRAMES = [24, 95, 110, 120, 151] as const;

/**
 * Development-only inspector for the real F000–F151 presentation. This owns
 * its Animated.Value and deliberately has no lifecycle, repository, or
 * navigation dependency.
 */
export function CreateTripMotionPreview({ destination, durationDays, onClose }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [frameAnim] = useState(() => new Animated.Value(0));
  const [frame, setFrame] = useState(0);

  const stop = useCallback(() => frameAnim.stopAnimation(), [frameAnim]);

  const seek = useCallback((nextFrame: number) => {
    stop();
    frameAnim.setValue(nextFrame);
    setFrame(nextFrame);
  }, [frameAnim, stop]);

  const replay = useCallback(() => {
    stop();
    frameAnim.setValue(0);
    setFrame(0);
    Animated.timing(frameAnim, {
      toValue: LIFECYCLE_BOUNDARIES.GENERATION_LATCH,
      duration: (LIFECYCLE_BOUNDARIES.GENERATION_LATCH / FPS) * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setFrame(LIFECYCLE_BOUNDARIES.GENERATION_LATCH);
    });
  }, [frameAnim, stop]);

  const close = useCallback(() => {
    stop();
    onClose();
  }, [onClose, stop]);

  useEffect(() => () => frameAnim.stopAnimation(), [frameAnim]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background.surface }]}>
      <CreateTripGenerationPresentation
        colors={colors}
        destination={destination}
        durationDays={durationDays}
        frameAnim={frameAnim}
      />
      <View style={[styles.controls, { backgroundColor: colors.background.surface, borderTopColor: colors.border.default }]}>
        <Text accessibilityLiveRegion="polite" style={[styles.frameLabel, { color: colors.text.secondary }]} testID="motion-preview-frame">
          {t('planner.motionPreviewFrame', { frame: String(frame).padStart(3, '0') })}
        </Text>
        <View style={styles.controlRow}>
          <PreviewControl label={t('planner.motionPreviewReplay')} onPress={replay} colors={colors} />
          {SEEK_FRAMES.map((seekFrame) => (
            <PreviewControl
              key={seekFrame}
              label={t('planner.motionPreviewSeek', { frame: String(seekFrame).padStart(3, '0') })}
              onPress={() => seek(seekFrame)}
              colors={colors}
            />
          ))}
          <PreviewControl label={t('planner.motionPreviewReset')} onPress={() => seek(0)} colors={colors} />
          <PreviewControl label={t('common.close')} onPress={close} colors={colors} />
        </View>
      </View>
    </View>
  );
}

type ControlProps = {
  colors: ReturnType<typeof useTheme>['colors'];
  label: string;
  onPress: () => void;
};

function PreviewControl({ colors, label, onPress }: ControlProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.control, { backgroundColor: colors.background.surfaceVariant, borderColor: colors.border.subtle }, pressed && styles.pressed]}>
      <Text style={[styles.controlLabel, { color: colors.text.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    alignItems: 'center',
    borderRadius: radius.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  controlLabel: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  controls: {
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  frameLabel: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  screen: {
    flex: 1,
  },
});
