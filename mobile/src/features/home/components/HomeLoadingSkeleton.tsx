import { memo, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useTheme } from "../../../theme";
import { radius, spacing } from "../../../theme/tokens";

export const HomeLoadingSkeleton = memo(function HomeLoadingSkeleton() {
  const { colors } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacityAnim]);

  const skeletonColor = colors.background.surfaceVariant;

  return (
    <View
      accessibilityLabel="Loading home screen"
      accessibilityRole="progressbar"
      style={styles.container}
    >
      {/* 1. Greeting Skeleton */}
      <View style={styles.greetingSkeleton}>
        <Animated.View
          style={[
            styles.titleSkeleton,
            { backgroundColor: skeletonColor, opacity: opacityAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.subtitleSkeleton,
            { backgroundColor: skeletonColor, opacity: opacityAnim },
          ]}
        />
      </View>

      {/* 2. Hero Section Skeleton */}
      <Animated.View
        style={[
          styles.heroSkeleton,
          { backgroundColor: skeletonColor, opacity: opacityAnim },
        ]}
      />

      {/* 3. Quick Actions Grid Skeleton */}
      <View style={styles.quickActionsSkeleton}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.actionItemSkeleton}>
            <Animated.View
              style={[
                styles.actionCircleSkeleton,
                { backgroundColor: skeletonColor, opacity: opacityAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.actionLabelSkeleton,
                { backgroundColor: skeletonColor, opacity: opacityAnim },
              ]}
            />
          </View>
        ))}
      </View>

      {/* 4. Section Title Skeleton */}
      <Animated.View
        style={[
          styles.sectionTitleSkeleton,
          { backgroundColor: skeletonColor, opacity: opacityAnim },
        ]}
      />

      {/* 5. Asymmetric / Horizontal Cards Skeleton */}
      <View style={styles.cardsRowSkeleton}>
        <Animated.View
          style={[
            styles.cardSkeleton,
            { backgroundColor: skeletonColor, opacity: opacityAnim },
          ]}
        />
        <Animated.View
          style={[
            styles.cardSkeleton,
            { backgroundColor: skeletonColor, opacity: opacityAnim },
          ]}
        />
      </View>

      {/* 6. Another Section Title Skeleton */}
      <Animated.View
        style={[
          styles.sectionTitleSkeleton,
          { backgroundColor: skeletonColor, opacity: opacityAnim },
        ]}
      />

      {/* 7. Vertical List Item Skeletons */}
      <Animated.View
        style={[
          styles.listItemSkeleton,
          { backgroundColor: skeletonColor, opacity: opacityAnim },
        ]}
      />
      <Animated.View
        style={[
          styles.listItemSkeleton,
          { backgroundColor: skeletonColor, opacity: opacityAnim },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  greetingSkeleton: {
    gap: spacing.xs,
  },
  titleSkeleton: {
    borderRadius: radius.sm,
    height: 24,
    width: "60%",
  },
  subtitleSkeleton: {
    borderRadius: radius.sm,
    height: 16,
    width: "40%",
  },
  heroSkeleton: {
    borderRadius: radius.control,
    height: 180,
    width: "100%",
  },
  quickActionsSkeleton: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionItemSkeleton: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
  },
  actionCircleSkeleton: {
    borderRadius: radius.pill,
    height: 48,
    width: 48,
  },
  actionLabelSkeleton: {
    borderRadius: radius.sm,
    height: 12,
    width: 36,
  },
  sectionTitleSkeleton: {
    borderRadius: radius.sm,
    height: 20,
    marginTop: spacing.xs,
    width: 140,
  },
  cardsRowSkeleton: {
    flexDirection: "row",
    gap: spacing.md,
  },
  cardSkeleton: {
    borderRadius: radius.control,
    flex: 1,
    height: 140,
  },
  listItemSkeleton: {
    borderRadius: radius.control,
    height: 72,
    width: "100%",
  },
});
