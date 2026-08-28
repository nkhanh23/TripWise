import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '../../../components/AppText';
import { colors, radius, spacing, typography } from '../../../theme/tokens';
import {
  mockBudgetOptions,
  mockGroupOptions,
  mockPaceOptions,
  mockTravelStyles,
} from '../data/mockWizardData';
import type { CreateTripWizardState } from '../types';

type Props = {
  state: CreateTripWizardState;
  onChangeTitle: (title: string) => void;
};

export const StepSummary = memo(function StepSummary({ state, onChangeTitle }: Props) {
  const destName = state.destination?.name || state.customDestinationName || 'Destination';
  const formattedAddress = state.destination?.formattedAddress || '';
  const heroImage = state.destination?.imageUrl || null;

  const selectedStylesData = mockTravelStyles.filter((s) =>
    state.selectedStyles.includes(s.id)
  );
  const paceData = mockPaceOptions.find((p) => p.id === state.pace);
  const budgetData = mockBudgetOptions.find((b) => b.id === state.budget);
  const groupData = mockGroupOptions.find((g) => g.id === state.groupType);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <AppText style={styles.subtitle}>
        Review your trip parameters and customize your plan title.
      </AppText>

      {/* Trip Title Editable Box */}
      <View style={styles.titleSection}>
        <Text style={styles.inputLabel}>Trip Name</Text>
        <View style={styles.titleInputWrap}>
          <MaterialIcons
            color={colors.brand.primary}
            name="edit"
            size={18}
            style={styles.editIcon}
          />
          <TextInput
            accessibilityHint="Nhập tên đặt cho chuyến đi của bạn"
            accessibilityLabel="Tên chuyến đi"
            onChangeText={onChangeTitle}
            placeholder="e.g. Bangkok Culinary Adventure"
            placeholderTextColor={colors.text.muted}
            style={styles.titleInput}
            value={state.tripTitle}
          />
        </View>
      </View>

      {/* Hero Destination Banner */}
      <View style={styles.heroCard}>
        {heroImage ? (
          <Image
            accessibilityLabel={destName}
            accessibilityRole="image"
            source={{ uri: heroImage }}
            style={styles.heroImage}
          />
        ) : (
          <View style={[styles.heroImage, { backgroundColor: '#E2E8F0' }]} />
        )}
        <View style={styles.heroOverlay}>
          <View style={styles.heroBadge}>
            <MaterialIcons color="#FFFFFF" name="location-on" size={14} />
            <Text style={styles.heroBadgeText}>
              {destName}
              {formattedAddress ? `, ${formattedAddress}` : ''}
            </Text>
          </View>

          <View style={styles.heroDatesRow}>
            <MaterialIcons color="#FFFFFF" name="calendar-today" size={14} />
            <Text style={styles.heroDatesText}>
              {state.startDate} – {state.endDate} ({state.durationDays} Days)
            </Text>
          </View>
        </View>
      </View>

      {/* Summary Grid Items */}
      <View style={styles.summaryGrid}>
        {/* Selected Interests */}
        <View style={styles.summaryBox}>
          <View style={styles.boxHeader}>
            <MaterialIcons color={colors.brand.primary} name="interests" size={18} />
            <Text style={styles.boxTitle}>Interests</Text>
          </View>
          <View style={styles.chipWrap}>
            {selectedStylesData.map((style) => (
              <View key={style.id} style={styles.interestChip}>
                <MaterialIcons
                  color={colors.brand.primary}
                  name={style.iconName}
                  size={14}
                />
                <Text style={styles.interestChipText}>{style.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Travel Pace & Budget Row */}
        <View style={styles.row}>
          <View style={[styles.summaryBox, styles.halfBox]}>
            <View style={styles.boxHeader}>
              <MaterialIcons color={colors.brand.primary} name="bolt" size={18} />
              <Text style={styles.boxTitle}>Pace</Text>
            </View>
            <Text style={styles.boxValue}>{paceData?.label || 'Moderate'}</Text>
            <Text style={styles.boxSub}>{paceData?.dailyPlacesLabel}</Text>
          </View>

          <View style={[styles.summaryBox, styles.halfBox]}>
            <View style={styles.boxHeader}>
              <MaterialIcons color={colors.brand.primary} name="payments" size={18} />
              <Text style={styles.boxTitle}>Budget</Text>
            </View>
            <Text style={styles.boxValue}>{budgetData?.label || 'Standard'}</Text>
            <Text style={styles.boxSub}>{budgetData?.rangeText}</Text>
          </View>
        </View>

        {/* Group Type */}
        <View style={styles.summaryBox}>
          <View style={styles.boxHeader}>
            <MaterialIcons
              color={colors.brand.primary}
              name={groupData?.iconName || 'groups'}
              size={18}
            />
            <Text style={styles.boxTitle}>Travel Party</Text>
          </View>
          <Text style={styles.boxValue}>
            {groupData?.label || 'Couple'} ({groupData?.travelerCountLabel})
          </Text>
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
  titleSection: {
    gap: 4,
    marginBottom: spacing.md,
  },
  inputLabel: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  titleInputWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  editIcon: {
    marginRight: spacing.sm,
  },
  titleInput: {
    color: colors.text.primary,
    flex: 1,
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    height: '100%',
    paddingVertical: 0,
  },
  heroCard: {
    borderRadius: radius.card,
    elevation: 4,
    height: 140,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  heroOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    padding: spacing.md,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
  },
  heroDatesRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  heroDatesText: {
    color: '#F0EDED',
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  summaryGrid: {
    gap: spacing.sm,
  },
  summaryBox: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    gap: 6,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfBox: {
    flex: 1,
  },
  boxHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  boxTitle: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  interestChip: {
    alignItems: 'center',
    backgroundColor: '#E8F1FC',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  interestChipText: {
    color: colors.brand.primary,
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  boxValue: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  boxSub: {
    color: colors.text.secondary,
    fontSize: 11,
  },
});
