import React, { memo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../../../theme';
import { colors, spacing, typography, radius } from '../../../theme/tokens';
import { AppText } from '../../../components/AppText';
import type { DestinationOption } from '../types';
import { useDestinationSearch } from '../destinationSearch';

import type { DestinationSearchRepository } from '../../../integration/repositories/DestinationSearchRepository';

type Props = {
  selectedDestination: DestinationOption | null;
  customDestinationName: string;
  onSelectDestination: (destination: DestinationOption) => void;
  onChangeCustomName: (name: string) => void;
  error?: string | null;
  repository: DestinationSearchRepository;
};

export const StepDestination = memo(function StepDestination({
  selectedDestination,
  customDestinationName,
  onSelectDestination,
  onChangeCustomName,
  error,
  repository,
}: Props) {
  const { colors: themeColors, effectiveTheme } = useTheme();
  const { query, setQuery, results, loading, error: searchError } = useDestinationSearch(repository, customDestinationName);

  const handleSearchChange = (text: string) => {
    setQuery(text);
    onChangeCustomName(text);
  };

  const handleSelect = (dest: DestinationOption) => {
    setQuery(dest.name);
    onChangeCustomName(dest.name);
    onSelectDestination(dest);
  };

  const displayError = error || searchError;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {/* Subtitle description */}
      <AppText style={[styles.subtitle, { color: themeColors.text.secondary }]}>
        Choose your dream destination or type any city to explore.
      </AppText>

      {/* Search Bar Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: themeColors.background.canvas, borderColor: themeColors.border.default }]}>
          <MaterialIcons
            color={themeColors.brand.primary}
            name="location-on"
            size={20}
            style={styles.searchIcon}
          />
          <TextInput
            accessibilityLabel="Destination"
            autoCapitalize="words"
            autoCorrect={false}
            onChangeText={handleSearchChange}
            placeholder="Search city, e.g. Singapore, Tokyo..."
            placeholderTextColor={themeColors.text.muted}
            returnKeyType="done"
            style={[styles.input, { color: themeColors.text.primary }]}
            value={query}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear destination"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => handleSearchChange('')}
              style={styles.clearButton}>
              <MaterialIcons color={themeColors.text.muted} name="close" size={16} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Error Alert */}
      {displayError ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <MaterialIcons color={themeColors.brand.red} name="error-outline" size={16} />
          <Text style={styles.errorText}>{displayError}</Text>
        </View>
      ) : null}

      {/* Section Heading */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>Search Results</Text>
        <Text style={[styles.sectionCount, { color: themeColors.text.muted }]}>
          {loading ? 'Searching...' : `${results.length} available`}
        </Text>
      </View>

      {loading && (
        <ActivityIndicator size="small" color={themeColors.brand.primary} style={{ marginTop: 20 }} />
      )}

      {/* Destination Cards Grid */}
      <View style={styles.grid}>
          {!loading && results.map((dest: DestinationOption) => {
          const isSelected = selectedDestination?.id === dest.id;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={dest.id}
              onPress={() => handleSelect(dest)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: themeColors.background.canvas, borderColor: themeColors.border.default },
                isSelected && [styles.cardSelected, { borderColor: themeColors.brand.primary, backgroundColor: effectiveTheme === 'dark' ? 'rgba(77, 150, 255, 0.1)' : '#F3F8FF' }],
                pressed && styles.cardPressed,
              ]}>
              <View style={styles.cardInfo}>
                <View style={styles.cardTitleRow}>
                  <Text numberOfLines={1} style={[styles.cardName, { color: themeColors.text.primary }]}>
                    {dest.name}
                  </Text>
                  {isSelected ? (
                    <MaterialIcons
                      color={themeColors.brand.primary}
                      name="check-circle"
                      size={18}
                    />
                  ) : null}
                </View>
                <Text style={[styles.cardCountry, { color: themeColors.text.secondary }]}>{dest.country}</Text>
              </View>
            </Pressable>
          );
        })}
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
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchBar: {
    alignItems: 'center',
    borderRadius: radius.pill,
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
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.body,
    height: '100%',
    paddingVertical: 0,
  },
  clearButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
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
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  sectionCount: {
    fontSize: 12,
  },
  grid: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    width: '100%',
  },
  cardSelected: {
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  cardInfo: {
    gap: 2,
    padding: spacing.sm,
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardName: {
    flex: 1,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  cardCountry: {
    fontSize: 12,
  },
});
