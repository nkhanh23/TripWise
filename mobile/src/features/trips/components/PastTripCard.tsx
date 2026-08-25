import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import { ImageAttribution } from "../../images/components/ImageAttribution";
import { getResolvedImageSource } from "../../images/resolvedImageSource";
import type { TripSummary } from "../types";

type Props = {
  trip: TripSummary;
  onPress: (tripId: string) => void;
};

export const PastTripCard = memo(function PastTripCard({
  trip,
  onPress,
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityHint="Xem lại hình ảnh và thông tin chuyến đi đã qua"
      accessibilityLabel={`${trip.title}, ${trip.dateLabel}`}
      accessibilityRole="button"
      onPress={() => onPress(trip.id)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background.surfaceVariant,
          borderColor: colors.border.default,
        },
        pressed && styles.pressed,
      ]}
    >
      {trip.coverImageUrl ? (
        <View style={styles.coverContainer}>
          <Image
            accessibilityLabel={`${trip.title} cover photo`}
            resizeMode="cover"
            source={getResolvedImageSource(trip.coverImageUrl, trip.coverImage)}
            style={styles.coverImage}
          />
          <ImageAttribution attribution={trip.coverImage?.attribution} />
        </View>
      ) : null}

      {/* Title */}
      <Text
        numberOfLines={1}
        style={[styles.titleText, { color: colors.text.primary }]}
      >
        {trip.title}
      </Text>

      {/* Date metadata */}
      <View style={styles.dateRow}>
        <MaterialIcons
          color={colors.text.secondary}
          name="event-available"
          size={14}
        />
        <Text style={[styles.dateText, { color: colors.text.secondary }]}>
          {trip.dateLabel}
        </Text>
      </View>

      {/* Footer link */}
      <View
        style={[styles.footerRow, { borderTopColor: colors.border.subtle }]}
      >
        <Text style={[styles.actionText, { color: colors.text.secondary }]}>
          {trip.actionLabel ?? "Review Photos"}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  coverContainer: {
    position: "relative",
  },
  card: {
    borderRadius: radius.input, // 8px matching Stitch rounded-lg
    borderWidth: 1,
    gap: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  coverImage: {
    borderRadius: radius.input,
    height: 80,
    marginBottom: spacing.xs,
    width: "100%",
  },
  titleText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  dateRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginBottom: spacing.xs,
  },
  dateText: {
    fontSize: typography.bodySmall,
  },
  footerRow: {
    alignItems: "flex-end",
    borderTopWidth: 1,
    paddingTop: spacing.xs,
  },
  actionText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
