import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { colors, radius, spacing, typography } from '../../../theme/tokens';

type Props = {
  startDate: string;
  endDate: string;
  durationDays: number;
  onChangeStartDate: (date: string) => void;
  onChangeEndDate: (date: string) => void;
  onSelectQuickDuration: (days: number) => void;
  error?: string | null;
};

const QUICK_DURATIONS = [
  { label: '3 days (Weekend)', days: 3 },
  { label: '5 days', days: 5 },
  { label: '7 days (1 Week)', days: 7 },
  { label: '10 days', days: 10 },
  { label: '14 days (2 Weeks)', days: 14 },
];

export const StepDates = memo(function StepDates({
  startDate,
  endDate,
  durationDays,
  onChangeStartDate,
  onChangeEndDate,
  onSelectQuickDuration,
  error,
}: Props) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <AppText style={styles.subtitle}>
        Select your travel dates or pick a quick duration.
      </AppText>

      {/* Date Inputs Container */}
      <View style={styles.dateInputsRow}>
        {/* Start Date */}
        <View style={styles.inputColumn}>
          <Text style={styles.inputLabel}>Start Date</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons
              color={colors.brand.primary}
              name="calendar-today"
              size={18}
              style={styles.fieldIcon}
            />
            <TextInput
              accessibilityHint="Nhập ngày bắt đầu chuyến đi định dạng YYYY-MM-DD"
              accessibilityLabel="Ngày bắt đầu"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              onChangeText={onChangeStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text.muted}
              style={styles.textInput}
              value={startDate}
            />
          </View>
        </View>

        {/* End Date */}
        <View style={styles.inputColumn}>
          <Text style={styles.inputLabel}>End Date</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons
              color={colors.brand.primary}
              name="event"
              size={18}
              style={styles.fieldIcon}
            />
            <TextInput
              accessibilityHint="Nhập ngày kết thúc chuyến đi định dạng YYYY-MM-DD"
              accessibilityLabel="Ngày kết thúc"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              onChangeText={onChangeEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text.muted}
              style={styles.textInput}
              value={endDate}
            />
          </View>
        </View>
      </View>

      {/* Error Alert */}
      {error ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <MaterialIcons color={colors.brand.red} name="error-outline" size={16} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Quick Duration Options */}
      <View style={styles.quickSection}>
        <Text style={styles.sectionTitle}>Quick Durations</Text>
        <View style={styles.quickChipsWrap}>
          {QUICK_DURATIONS.map((preset) => {
            const isSelected = durationDays === preset.days;
            return (
              <Pressable
                accessibilityHint={`Chọn thời gian chuyến đi ${preset.label}`}
                accessibilityLabel={preset.label}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={preset.days}
                onPress={() => onSelectQuickDuration(preset.days)}
                style={({ pressed }) => [
                  styles.quickChip,
                  isSelected && styles.quickChipSelected,
                  pressed && styles.pressed,
                ]}>
                <MaterialIcons
                  color={isSelected ? '#FFFFFF' : colors.text.secondary}
                  name="schedule"
                  size={14}
                />
                <Text
                  style={[
                    styles.quickChipText,
                    isSelected && styles.quickChipTextSelected,
                  ]}>
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Duration Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <MaterialIcons color={colors.brand.primary} name="event-available" size={20} />
          <Text style={styles.summaryTitle}>Trip Duration</Text>
          <View style={styles.daysBadge}>
            <Text style={styles.daysBadgeText}>{durationDays} Days</Text>
          </View>
        </View>

        <View style={styles.rangeRow}>
          <View style={styles.rangePoint}>
            <Text style={styles.rangePointLabel}>Departure</Text>
            <Text style={styles.rangePointValue}>{startDate || 'Select date'}</Text>
          </View>
          <MaterialIcons color={colors.text.muted} name="arrow-forward" size={18} />
          <View style={styles.rangePoint}>
            <Text style={styles.rangePointLabel}>Return</Text>
            <Text style={styles.rangePointValue}>{endDate || 'Select date'}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  inputColumn: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  inputWrapper: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  fieldIcon: {
    marginRight: 6,
  },
  textInput: {
    color: colors.text.primary,
    flex: 1,
    fontSize: 13,
    height: '100%',
    paddingVertical: 0,
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: '#FDE8E8',
    borderRadius: radius.input,
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  errorText: {
    color: colors.brand.red,
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  quickSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  quickChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  quickChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  quickChipSelected: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  quickChipText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  quickChipTextSelected: {
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: '#F6F3F2',
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    color: colors.text.primary,
    flex: 1,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    marginLeft: 6,
  },
  daysBadge: {
    backgroundColor: '#D8E2FF',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  daysBadgeText: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  rangeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rangePoint: {
    alignItems: 'center',
    gap: 2,
  },
  rangePointLabel: {
    color: colors.text.muted,
    fontSize: 11,
  },
  rangePointValue: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
