import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '../../../components/AppText';
import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { useTheme } from '../../../theme';
import { mockPopularDestinations } from '../data/mockWizardData';
import type { DestinationOption } from '../types';

type Props = {
  selectedDestination: DestinationOption | null;
  customDestinationName: string;
  onSelectDestination: (destination: DestinationOption) => void;
  onChangeCustomName: (name: string) => void;
  error?: string | null;
};

export const StepDestination = memo(function StepDestination({
  selectedDestination,
  customDestinationName,
  onSelectDestination,
  onChangeCustomName,
  error,
}: Props) {
  const { colors, effectiveTheme } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState(customDestinationName || '');

  const filteredDestinations = useMemo(() => {
    if (!searchQuery.trim()) {
      return mockPopularDestinations;
    }
    const q = searchQuery.toLowerCase();
    return mockPopularDestinations.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    onChangeCustomName(text);
  };

  const handleSelect = (dest: DestinationOption) => {
    setSearchQuery(dest.name);
    onSelectDestination(dest);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {/* Subtitle description */}
      <AppText style={[styles.subtitle, { color: colors.text.secondary }]}>
        Choose your dream destination or type any city to explore.
      </AppText>

      {/* Search Bar Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.background.canvas, borderColor: colors.border.default }]}>
          <MaterialIcons
            color={colors.brand.primary}
            name="location-on"
            size={20}
            style={styles.searchIcon}
          />
          <TextInput
            accessibilityHint="Nháº­p tÃªn thÃ nh phá»‘ hoáº·c quá»‘c gia báº¡n muá»‘n tá»›i"
            accessibilityLabel="Äiá»ƒm Ä‘áº¿n du lá»‹ch"
            autoCapitalize="words"
            autoCorrect={false}
            onChangeText={handleSearchChange}
            placeholder="Search city, e.g. Bangkok, Tokyo..."
            placeholderTextColor={colors.text.muted}
            returnKeyType="done"
            style={[styles.input, { color: colors.text.primary }]}
            value={searchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              accessibilityHint="XÃ³a tÃ¬m kiáº¿m Ä‘iá»ƒm Ä‘áº¿n"
              accessibilityLabel="XÃ³a Ä‘iá»ƒm Ä‘áº¿n"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => handleSearchChange('')}
              style={styles.clearButton}>
              <MaterialIcons color={colors.text.muted} name="close" size={16} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Error Alert */}
      {error ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <MaterialIcons color={colors.brand.red} name="error-outline" size={16} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Section Heading */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Popular Destinations</Text>
        <Text style={[styles.sectionCount, { color: colors.text.muted }]}>
          {filteredDestinations.length} available
        </Text>
      </View>

      {/* Destination Cards Grid */}
      <View style={styles.grid}>
        {filteredDestinations.map((dest) => {
          const isSelected =
            selectedDestination?.id === dest.id ||
            searchQuery.trim().toLowerCase() === dest.name.toLowerCase();

          return (
            <Pressable
              accessibilityHint={`Chá»n Ä‘iá»ƒm Ä‘áº¿n ${dest.name}, ${dest.country}`}
              accessibilityLabel={`${dest.name}, ${dest.country}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={dest.id}
              onPress={() => handleSelect(dest)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.background.canvas, borderColor: colors.border.default },
                isSelected && [styles.cardSelected, { borderColor: colors.brand.primary, backgroundColor: effectiveTheme === 'dark' ? 'rgba(77, 150, 255, 0.1)' : '#F3F8FF' }],
                pressed && styles.cardPressed,
              ]}>
              <Image
                accessibilityLabel={dest.name}
                accessibilityRole="image"
                source={{ uri: dest.imageUrl }}
                style={styles.cardImage}
              />
              {dest.tag ? (
                <View style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>{dest.tag}</Text>
                </View>
              ) : null}

              <View style={styles.cardInfo}>
                <View style={styles.cardTitleRow}>
                  <Text numberOfLines={1} style={[styles.cardName, { color: colors.text.primary }]}>
                    {dest.name}
                  </Text>
                  {isSelected ? (
                    <MaterialIcons
                      color={colors.brand.primary}
                      name="check-circle"
                      size={18}
                    />
                  ) : null}
                </View>
                <Text style={[styles.cardCountry, { color: colors.text.secondary }]}>{dest.country}</Text>
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
    color: colors.text.secondary,
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
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
    color: colors.text.primary,
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
    color: colors.brand.red,
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
    color: colors.text.primary,
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  sectionCount: {
    color: colors.text.muted,
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    width: '47.5%',
  },
  cardSelected: {
    borderColor: colors.brand.primary,
    borderWidth: 2,
    backgroundColor: '#F3F8FF',
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  cardImage: {
    backgroundColor: colors.background.surfaceVariant,
    height: 100,
    width: '100%',
  },
  tagBadge: {
    backgroundColor: 'rgba(28, 27, 27, 0.8)',
    borderRadius: radius.pill,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: 'absolute',
    top: 8,
  },
  tagBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
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
    color: colors.text.primary,
    flex: 1,
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
  },
  cardCountry: {
    color: colors.text.secondary,
    fontSize: 12,
  },
});


