import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../../components/AppText";
import type { ExplorePlace } from "../../explore/types";
import { useTranslation } from "../../../i18n";
import { useTheme } from "../../../theme";
import { radius, spacing, typography } from "../../../theme/tokens";
import type { TripDayItinerary } from "../types";

type Props = {
  place: ExplorePlace | null;
  visible: boolean;
  days: TripDayItinerary[];
  initialDayId?: string;
  onClose: () => void;
  onConfirm: (data: {
    place: ExplorePlace;
    dayId: string;
    time: string;
    durationMinutes: number;
    note?: string;
  }) => void;
};

const TIME_OPTIONS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "20:00",
];

const DURATION_OPTIONS = [
  { key: "30m", minutes: 30 },
  { key: "1h", minutes: 60 },
  { key: "1h30m", minutes: 90 },
  { key: "2h", minutes: 120 },
  { key: "3h", minutes: 180 },
];

export function AddPlaceConfirmationSheet({
  place,
  visible,
  days,
  initialDayId,
  onClose,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [selectedDayId, setSelectedDayId] = useState<string>(
    initialDayId ?? days[0]?.id ?? "day_1",
  );
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [selectedDuration, setSelectedDuration] = useState<number>(90);
  const [note, setNote] = useState<string>("");

  // Dropdown open states
  const [showDayPicker, setShowDayPicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  if (!place || !visible) {
    return null;
  }

  const selectedDay = days.find((d) => d.id === selectedDayId) ?? days[0];

  const handleConfirm = () => {
    onConfirm({
      place,
      dayId: selectedDayId,
      time: selectedTime,
      durationMinutes: selectedDuration,
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        {/* Scrim tap to dismiss */}
        <Pressable
          accessibilityHint={t("common.close")}
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.scrim, { backgroundColor: colors.overlay.scrim }]}
        />

        {/* Bottom Sheet Container */}
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.background.surface,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          {/* Grabber handle */}
          <View style={styles.grabberWrapper}>
            <View
              style={[
                styles.grabber,
                { backgroundColor: colors.border.default },
              ]}
            />
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Sheet Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerInfo}>
                <AppText
                  style={[styles.placeName, { color: colors.text.primary }]}
                >
                  {place.name}
                </AppText>
                <View style={styles.locationRow}>
                  <MaterialIcons
                    color={colors.icon.secondary}
                    name="location-on"
                    size={16}
                  />
                  <AppText
                    numberOfLines={1}
                    style={[
                      styles.locationText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {place.address}
                  </AppText>
                </View>
              </View>

              {/* Rating Badge */}
              <View
                style={[
                  styles.ratingBadge,
                  {
                    backgroundColor: colors.background.surfaceVariant,
                    borderColor: colors.border.subtle,
                  },
                ]}
              >
                <MaterialIcons
                  color={colors.brand.primary}
                  name="star"
                  size={14}
                />
                <AppText
                  style={[styles.ratingScore, { color: colors.text.primary }]}
                >
                  {place.rating.toFixed(1)}
                </AppText>
              </View>
            </View>

            {/* Place Thumbnail */}
            {place.imageUrl ? (
              <View
                style={[
                  styles.imageWrapper,
                  { backgroundColor: colors.background.surfaceVariant },
                ]}
              >
                <Image
                  resizeMode="cover"
                  source={{ uri: place.imageUrl }}
                  style={styles.image}
                />
              </View>
            ) : null}

            {/* Selection Grid: Day & Time */}
            <View style={styles.selectionGrid}>
              {/* Day Selector */}
              <View style={styles.gridColumn}>
                <AppText
                  style={[styles.fieldLabel, { color: colors.text.secondary }]}
                >
                  {t("addPlace.dayLabel")}
                </AppText>
                <Pressable
                  accessibilityHint={t("addPlace.dayLabel")}
                  accessibilityLabel={`${t("addPlace.dayLabel")}: ${selectedDay?.dateLabel ?? selectedDayId}`}
                  accessibilityRole="combobox"
                  onPress={() => {
                    setShowDayPicker(!showDayPicker);
                    setShowTimePicker(false);
                  }}
                  style={[
                    styles.selectorInput,
                    {
                      backgroundColor: colors.background.surfaceVariant,
                      borderColor: showDayPicker
                        ? colors.brand.primary
                        : colors.border.subtle,
                    },
                  ]}
                >
                  <AppText
                    numberOfLines={1}
                    style={[
                      styles.selectorText,
                      { color: colors.text.primary },
                    ]}
                  >
                    {selectedDay?.dateLabel ??
                      `Day ${selectedDay?.dayNumber ?? 1}`}
                  </AppText>
                  <MaterialIcons
                    color={colors.icon.secondary}
                    name={showDayPicker ? "expand-less" : "expand-more"}
                    size={20}
                  />
                </Pressable>
              </View>

              {/* Time Selector */}
              <View style={styles.gridColumn}>
                <AppText
                  style={[styles.fieldLabel, { color: colors.text.secondary }]}
                >
                  {t("addPlace.timeLabel")}
                </AppText>
                <Pressable
                  accessibilityHint={t("addPlace.timeLabel")}
                  accessibilityLabel={`${t("addPlace.timeLabel")}: ${selectedTime}`}
                  accessibilityRole="combobox"
                  onPress={() => {
                    setShowTimePicker(!showTimePicker);
                    setShowDayPicker(false);
                  }}
                  style={[
                    styles.selectorInput,
                    {
                      backgroundColor: colors.background.surfaceVariant,
                      borderColor: showTimePicker
                        ? colors.brand.primary
                        : colors.border.subtle,
                    },
                  ]}
                >
                  <AppText
                    style={[
                      styles.selectorText,
                      { color: colors.text.primary },
                    ]}
                  >
                    {selectedTime}
                  </AppText>
                  <MaterialIcons
                    color={colors.icon.secondary}
                    name={showTimePicker ? "expand-less" : "expand-more"}
                    size={20}
                  />
                </Pressable>
              </View>
            </View>

            {/* Day Dropdown Picker List */}
            {showDayPicker ? (
              <View
                style={[
                  styles.dropdownContainer,
                  {
                    backgroundColor: colors.background.surface,
                    borderColor: colors.border.default,
                  },
                ]}
              >
                {days.map((day) => {
                  const isDaySelected = day.id === selectedDayId;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={day.id}
                      onPress={() => {
                        setSelectedDayId(day.id);
                        setShowDayPicker(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        {
                          backgroundColor: isDaySelected
                            ? colors.background.surfaceVariant
                            : "transparent",
                        },
                      ]}
                    >
                      <AppText
                        style={[
                          styles.dropdownItemText,
                          {
                            color: isDaySelected
                              ? colors.brand.primary
                              : colors.text.primary,
                            fontWeight: isDaySelected
                              ? typography.fontWeight.bold
                              : typography.fontWeight.regular,
                          },
                        ]}
                      >
                        {day.dateLabel || `Day ${day.dayNumber}`}
                      </AppText>
                      {isDaySelected ? (
                        <MaterialIcons
                          color={colors.brand.primary}
                          name="check"
                          size={18}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* Time Dropdown Picker List */}
            {showTimePicker ? (
              <View
                style={[
                  styles.dropdownContainer,
                  {
                    backgroundColor: colors.background.surface,
                    borderColor: colors.border.default,
                    maxHeight: 180,
                  },
                ]}
              >
                <ScrollView nestedScrollEnabled>
                  {TIME_OPTIONS.map((timeOption) => {
                    const isTimeSelected = timeOption === selectedTime;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={timeOption}
                        onPress={() => {
                          setSelectedTime(timeOption);
                          setShowTimePicker(false);
                        }}
                        style={[
                          styles.dropdownItem,
                          {
                            backgroundColor: isTimeSelected
                              ? colors.background.surfaceVariant
                              : "transparent",
                          },
                        ]}
                      >
                        <AppText
                          style={[
                            styles.dropdownItemText,
                            {
                              color: isTimeSelected
                                ? colors.brand.primary
                                : colors.text.primary,
                              fontWeight: isTimeSelected
                                ? typography.fontWeight.bold
                                : typography.fontWeight.regular,
                            },
                          ]}
                        >
                          {timeOption}
                        </AppText>
                        {isTimeSelected ? (
                          <MaterialIcons
                            color={colors.brand.primary}
                            name="check"
                            size={18}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Estimated Duration Selector */}
            <View style={styles.sectionBlock}>
              <AppText
                style={[styles.fieldLabel, { color: colors.text.secondary }]}
              >
                {t("addPlace.durationLabel")}
              </AppText>
              <View style={styles.durationRow}>
                {DURATION_OPTIONS.map((opt) => {
                  const isSelected = opt.minutes === selectedDuration;
                  const labelKey = `addPlace.durations.${opt.key}`;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={opt.key}
                      onPress={() => setSelectedDuration(opt.minutes)}
                      style={[
                        styles.durationPill,
                        {
                          backgroundColor: isSelected
                            ? colors.brand.primaryContainer
                            : colors.background.surface,
                          borderColor: isSelected
                            ? colors.brand.primaryContainer
                            : colors.border.default,
                        },
                      ]}
                    >
                      <AppText
                        style={[
                          styles.durationPillText,
                          {
                            color: isSelected
                              ? colors.text.inverse
                              : colors.text.primary,
                            fontWeight: isSelected
                              ? typography.fontWeight.bold
                              : typography.fontWeight.regular,
                          },
                        ]}
                      >
                        {t(labelKey)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Notes Multiline TextInput */}
            <View style={styles.sectionBlock}>
              <AppText
                style={[styles.fieldLabel, { color: colors.text.secondary }]}
              >
                {t("addPlace.notesLabel")}
              </AppText>
              <TextInput
                accessibilityHint={t("addPlace.notesPlaceholder")}
                accessibilityLabel={t("addPlace.notesLabel")}
                maxLength={300}
                multiline
                numberOfLines={3}
                onChangeText={setNote}
                placeholder={t("addPlace.notesPlaceholder")}
                placeholderTextColor={colors.text.muted}
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: colors.background.surfaceVariant,
                    borderColor: colors.border.subtle,
                    color: colors.text.primary,
                  },
                ]}
                value={note}
              />
            </View>
          </ScrollView>

          {/* Sticky Bottom CTA */}
          <View
            style={[
              styles.ctaContainer,
              {
                backgroundColor: colors.background.surface,
                borderTopColor: colors.border.subtle,
              },
            ]}
          >
            <Pressable
              accessibilityHint={t("addPlace.addToItinerary")}
              accessibilityLabel={t("addPlace.addToItinerary")}
              accessibilityRole="button"
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.ctaButton,
                {
                  backgroundColor: colors.brand.primary,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <MaterialIcons color={colors.text.inverse} name="add" size={20} />
              <AppText
                style={[styles.ctaButtonText, { color: colors.text.inverse }]}
              >
                {t("addPlace.addToItinerary")}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  grabberWrapper: {
    alignItems: "center",
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  grabber: {
    borderRadius: radius.pill,
    height: 4,
    width: 40,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  placeName: {
    fontSize: typography.title,
    fontWeight: typography.fontWeight.bold,
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: spacing.xs,
  },
  locationText: {
    flex: 1,
    fontSize: typography.body,
  },
  ratingBadge: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 0.5,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  ratingScore: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  imageWrapper: {
    borderRadius: radius.control,
    height: 128,
    overflow: "hidden",
    width: "100%",
  },
  image: {
    height: "100%",
    width: "100%",
  },
  selectionGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  gridColumn: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  selectorInput: {
    alignItems: "center",
    borderRadius: radius.input,
    borderWidth: 1,
    flexDirection: "row",
    height: 48,
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  selectorText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.semibold,
  },
  dropdownContainer: {
    borderRadius: radius.input,
    borderWidth: 1,
    marginTop: -spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dropdownItemText: {
    fontSize: typography.body,
  },
  sectionBlock: {
    gap: spacing.xs,
  },
  durationRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  durationPill: {
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  durationPillText: {
    fontSize: typography.bodySmall,
  },
  notesInput: {
    borderRadius: radius.input,
    borderWidth: 1,
    fontSize: typography.body,
    height: 80,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlignVertical: "top",
  },
  ctaContainer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  ctaButton: {
    alignItems: "center",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.sm,
    height: 50,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaButtonText: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
});
