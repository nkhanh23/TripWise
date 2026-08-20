import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { PastTripCard } from '../components/PastTripCard';
import { TripsEmptyState } from '../components/TripsEmptyState';
import { TWTripCard } from '../components/TWTripCard';
import { getMockTripSections } from '../data/mockTrips';
import type { TripSectionData, TripSummary, TripsUIStatus } from '../types';

type Props = {
  initialStatus?: TripsUIStatus;
  customSections?: TripSectionData[];
  onSelectTrip?: (tripId: string) => void;
  onCreateTrip?: () => void;
};

export function MyTripsScreen({
  initialStatus = 'ready',
  customSections,
  onSelectTrip,
  onCreateTrip,
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [status, setStatus] = useState<TripsUIStatus>(initialStatus);

  const sections = useMemo(() => {
    if (customSections) return customSections;
    return getMockTripSections();
  }, [customSections]);

  const isEmpty = useMemo(() => {
    return sections.every((sec) => sec.data.length === 0);
  }, [sections]);

  const handleTripPress = useCallback(
    (tripId: string) => {
      if (onSelectTrip) {
        onSelectTrip(tripId);
      } else {
        navigation.navigate('TripDetail', { tripId });
      }
    },
    [onSelectTrip, navigation]
  );

  const handleCreateTrip = useCallback(() => {
    if (onCreateTrip) {
      onCreateTrip();
    } else {
      navigation.navigate('Plan');
    }
  }, [onCreateTrip, navigation]);

  const handleRetry = useCallback(() => {
    setStatus('ready');
  }, []);

  const keyExtractor = useCallback((item: TripSummary) => item.id, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: TripSectionData }) => {
      const localizedSectionTitle =
        section.type === 'upcoming'
          ? t('trips.upcoming')
          : t('trips.past');

      return (
        <View
          style={[
            styles.sectionHeaderWrap,
            {
              backgroundColor: colors.background.surface,
              borderBottomColor: colors.border.default,
            },
          ]}>
          <View style={styles.sectionHeaderTitleRow}>
            <MaterialIcons
              color={section.type === 'upcoming' ? colors.brand.primary : colors.text.secondary}
              name={section.iconName}
              size={20}
            />
            <Text style={[styles.sectionHeaderText, { color: colors.text.primary }]}>
              {localizedSectionTitle}
            </Text>
          </View>
        </View>
      );
    },
    [colors, t]
  );

  const renderItem = useCallback(
    ({ item, section }: { item: TripSummary; section: TripSectionData }) => {
      if (section.type === 'upcoming') {
        return <TWTripCard onPress={handleTripPress} trip={item} />;
      }
      return <PastTripCard onPress={handleTripPress} trip={item} />;
    },
    [handleTripPress]
  );

  const listHeader = useMemo(() => {
    return (
      <View style={styles.screenHeadingWrap}>
        <Text style={[styles.screenTitle, { color: colors.text.primary }]}>
          {t('trips.title')}
        </Text>
        <AppText style={styles.screenSubtitle}>
          {t('trips.subtitle')}
        </AppText>
      </View>
    );
  }, [colors, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.surface }]}>
      {/* 1. Top App Bar */}
      <View
        style={[
          styles.topAppBar,
          {
            backgroundColor: colors.background.surface,
            borderBottomColor: colors.border.default,
            paddingTop: Math.max(insets.top, spacing.sm),
          },
        ]}>
        <View style={styles.topBarLeft}>
          <Pressable
            accessibilityHint="Menu"
            accessibilityLabel="Menu"
            accessibilityRole="button"
            style={styles.iconButton}>
            <MaterialIcons color={colors.brand.primary} name="menu" size={24} />
          </Pressable>
          <Text style={[styles.brandTitle, { color: colors.brand.primary }]}>
            {t('auth.welcome.brand')}
          </Text>
        </View>

        <Pressable
          accessibilityHint="Tìm kiếm chuyến đi"
          accessibilityLabel="Tìm kiếm"
          accessibilityRole="button"
          style={styles.iconButton}>
          <MaterialIcons color={colors.brand.primary} name="search" size={24} />
        </Pressable>
      </View>

      {/* 2. Main Content States */}
      {status === 'loading' ? (
        <View
          accessibilityLabel="Đang tải danh sách chuyến đi"
          accessibilityRole="progressbar"
          style={styles.centerContainer}>
          <ActivityIndicator color={colors.brand.primary} size="large" />
        </View>
      ) : null}

      {status === 'error' ? (
        <View accessibilityRole="alert" style={styles.centerContainer}>
          <MaterialIcons color={colors.state.error} name="error-outline" size={40} />
          <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
            {t('trips.errorTitle')}
          </Text>
          <AppText style={styles.errorSubtitle}>
            {t('trips.errorSubtitle')}
          </AppText>
          <Pressable
            accessibilityHint="Thử tải lại danh sách chuyến đi"
            accessibilityLabel="Thử lại"
            accessibilityRole="button"
            onPress={handleRetry}
            style={[styles.retryButton, { backgroundColor: colors.brand.primary }]}>
            <Text style={[styles.retryButtonText, { color: colors.text.inverse }]}>
              {t('common.retry')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {status === 'ready' && isEmpty ? (
        <View style={styles.emptyContainer}>
          {listHeader}
          <TripsEmptyState onCreateTrip={handleCreateTrip} />
        </View>
      ) : null}

      {status === 'ready' && !isEmpty ? (
        <SectionList
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          sections={sections}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      ) : null}

      {/* 3. Floating Action Button (FAB) */}
      {status === 'ready' && !isEmpty ? (
        <Pressable
          accessibilityHint="Tạo chuyến đi mới"
          accessibilityLabel="Tạo chuyến đi"
          accessibilityRole="button"
          onPress={handleCreateTrip}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.brand.primary },
            pressed && styles.fabPressed,
          ]}>
          <MaterialIcons color={colors.text.inverse} name="add" size={22} />
          <Text style={[styles.fabText, { color: colors.text.inverse }]}>
            {t('trips.createTrip')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topAppBar: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    zIndex: 10,
  },
  topBarLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: -0.5,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  screenHeadingWrap: {
    gap: 4,
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
  },
  screenSubtitle: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  sectionHeaderWrap: {
    borderBottomWidth: 1,
    marginBottom: spacing.md,
    marginTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionHeaderTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sectionHeaderText: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  listContent: {
    paddingBottom: 120,
    paddingHorizontal: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  centerContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  errorSubtitle: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  fab: {
    alignItems: 'center',
    borderRadius: radius.pill,
    bottom: 90,
    elevation: 6,
    flexDirection: 'row',
    gap: 6,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    position: 'absolute',
    right: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    zIndex: 50,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  fabText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
});
