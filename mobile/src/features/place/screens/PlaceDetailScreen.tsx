import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import type { PlaceIntelligenceRepository } from '../../../integration/placeIntelligenceContract';
import type { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { PlaceGallery } from '../components/PlaceGallery';
import { PlaceHeader } from '../components/PlaceHeader';
import { PlaceQuickActions } from '../components/PlaceQuickActions';
import { getMockPlaceDetail } from '../data/mockPlaceDetail';
import { usePlaceIntelligence } from '../hooks/usePlaceIntelligence';
import type { PlaceDetailData, PlaceDetailStatus } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaceDetail'> & {
  initialStatus?: PlaceDetailStatus;
  customData?: PlaceDetailData;
  fixtureMode?: boolean;
  intelligenceRepository?: PlaceIntelligenceRepository;
};

export function PlaceDetailScreen({
  route,
  navigation,
  initialStatus = 'ready',
  customData,
  fixtureMode = false,
  intelligenceRepository,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const placeId = route?.params?.placeId ?? '';

  const [status, setStatus] = useState<PlaceDetailStatus>(initialStatus);
  const [isSaved, setIsSaved] = useState(false);
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [showAllHours, setShowAllHours] = useState(false);

  // Hook into live place intelligence facts
  const {
    status: intelStatus,
    intelligence,
    freshness,
    isFallback,
    refetch: refetchIntel,
  } = usePlaceIntelligence(placeId, intelligenceRepository);

  const placeData = useMemo(() => {
    if (customData) return customData;
    if (fixtureMode) return getMockPlaceDetail(placeId);

    // In live mode, construct a base PlaceDetailData only if intelligence facts have arrived
    if (intelligence) {
      return {
        id: placeId,
        name: t('place.detailTitle'),
        category: 'attractions' as const,
        categoryLabel: t('place.detailTitle'),
        subtitle: undefined,
        rating: intelligence.rating ?? 0,
        reviewCount: intelligence.userRatingCount ?? 0,
        address: '',
        openStatus: '',
        openingHours: '',
        closingNotice: '',
        entryFee: t('intelligence.unavailable'),
        entryFeeNote: undefined,
        description: t('intelligence.reviewDescription'),
        heroImageUrl: '',
        galleryImageUrls: [],
        tags: [],
        reviews: [],
      };
    }
    return null;
  }, [customData, fixtureMode, intelligence, placeId, t]);

  const effectiveRating = intelligence?.rating ?? placeData?.rating ?? 0;
  const effectiveReviewCount = intelligence?.userRatingCount ?? placeData?.reviewCount ?? 0;

  const handleToggleSave = useCallback(() => {
    setIsSaved((prev) => !prev);
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  }, [navigation]);

  const handleRetry = useCallback(() => {
    setStatus('ready');
    refetchIntel();
  }, [refetchIntel]);

  const handleDirections = useCallback(() => {
    if (placeData) {
      navigation.navigate('RoutePreview', {
        destinationId: placeData.id,
        destinationName: placeData.name,
      });
    }
  }, [navigation, placeData]);

  const handleUnavailableAction = useCallback(() => {
    Alert.alert(t('common.unavailableTitle'), t('common.unavailableMessage'));
  }, [t]);

  // 1. Loading State
  if (status === 'loading' || (!customData && !fixtureMode && (intelStatus === 'loading'))) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background.surface }]}>
        <ActivityIndicator
          accessibilityLabel={t('common.loading')}
          color={colors.brand.primary}
          size="large"
        />
      </View>
    );
  }

  // 2. Error State
  if (status === 'error' || (status !== 'not-found' && !placeData && intelStatus === 'error')) {
    return (
      <View
        accessibilityRole="alert"
        style={[styles.centerContainer, { backgroundColor: colors.background.surface }]}>
        <MaterialIcons color={colors.state.error} name="error-outline" size={40} />
        <Text style={[styles.errorTitle, { color: colors.state.error }]}>
          {t('place.errorTitle')}
        </Text>
        <AppText style={styles.errorSubtitle}>
          {t('place.errorSubtitle')}
        </AppText>
        <Pressable
          accessibilityHint={t('common.retry')}
          accessibilityLabel={t('common.retry')}
          accessibilityRole="button"
          onPress={handleRetry}
          style={[styles.retryButton, { backgroundColor: colors.brand.primary }]}>
          <Text style={[styles.retryButtonText, { color: colors.text.inverse }]}>
            {t('common.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  // 3. Not Found State
  if (!placeData || status === 'not-found') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background.surface }]}>
        <MaterialIcons color={colors.text.muted} name="search-off" size={40} />
        <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
          {t('place.notFound')}
        </Text>
        <AppText style={styles.errorSubtitle}>
          {t('place.notFoundSubtitle')}
        </AppText>
        <Pressable
          accessibilityHint={t('common.back')}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          onPress={handleBack}
          style={[styles.retryButton, { backgroundColor: colors.brand.primary }]}>
          <MaterialIcons color={colors.text.inverse} name="arrow-back" size={16} />
          <Text style={[styles.retryButtonText, { color: colors.text.inverse }]}>
            {t('common.back')}
          </Text>
        </Pressable>
      </View>
    );
  }

  // Business status mapping
  const businessStatusText = intelligence
    ? intelligence.businessStatus === 'OPERATIONAL'
      ? t('intelligence.businessStatus.operational')
      : intelligence.businessStatus === 'CLOSED_TEMPORARILY'
      ? t('intelligence.businessStatus.closedTemporarily')
      : intelligence.businessStatus === 'CLOSED_PERMANENTLY'
      ? t('intelligence.businessStatus.closedPermanently')
      : t('intelligence.businessStatus.unknown')
    : null;

  const businessStatusColor = intelligence
    ? intelligence.businessStatus === 'OPERATIONAL'
      ? colors.state.success
      : intelligence.businessStatus === 'CLOSED_TEMPORARILY'
      ? colors.state.warning
      : intelligence.businessStatus === 'CLOSED_PERMANENTLY'
      ? colors.state.error
      : colors.text.muted
    : colors.text.muted;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background.surface }]}>
      {/* Floating Top Navigation Header */}
      <PlaceHeader
        isSaved={isSaved}
        onBack={handleBack}
        onShare={handleUnavailableAction}
        onToggleSave={handleToggleSave}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Gallery */}
        <PlaceGallery
          galleryUrls={placeData.galleryImageUrls}
          heroImageUrl={placeData.heroImageUrl}
          placeName={placeData.name}
        />

        {/* Content Sheet Body */}
        <View
          style={[
            styles.contentSheet,
            {
              backgroundColor: colors.background.surface,
                      },
          ]}>
          {/* Intelligence Transient Error Banner with Retry */}
          {intelStatus === 'error' ? (
            <View
              accessibilityRole="alert"
              style={[styles.intelAlertBanner, { backgroundColor: colors.background.surfaceVariant, borderColor: colors.border.default }]}>
              <MaterialIcons color={colors.text.secondary} name="warning" size={16} />
              <Text style={[styles.intelAlertText, { color: colors.text.secondary }]}>
                {t('place.errorSubtitle')}
              </Text>
              <Pressable
                accessibilityHint={t('common.retry')}
                accessibilityLabel={t('common.retry')}
                accessibilityRole="button"
                onPress={() => refetchIntel()}
                style={styles.alertRetryBtn}>
                <Text style={[styles.alertRetryText, { color: colors.text.secondary }]}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Stale Fallback Notice */}
          {isFallback || freshness === 'STALE' ? (
            <Pressable
              accessibilityHint={t('intelligence.refreshHint')}
              accessibilityLabel={t('intelligence.staleFallback')}
              accessibilityRole="button"
              onPress={() => refetchIntel()}
              style={[
                styles.staleNotice,
                { backgroundColor: colors.background.surfaceVariant, borderColor: colors.border.default },
              ]}>
              <MaterialIcons color={colors.text.muted} name="cached" size={16} />
              <Text style={[styles.staleNoticeText, { color: colors.text.secondary }]}>
                {t('intelligence.staleFallback')}
              </Text>
            </Pressable>
          ) : null}

          {/* Title & Rating */}
          <View style={styles.titleSection}>
            {/* Live Intelligence Badges Row */}
            <View style={styles.intelligenceBadgesRow}>
              {/* Business Status Badge */}
              {businessStatusText ? (
                <View
                  accessibilityLabel={businessStatusText}
                  accessibilityRole="text"
                  style={[styles.statusBadge, { backgroundColor: colors.background.surfaceVariant }]}>
                  <View style={[styles.statusDot, { backgroundColor: businessStatusColor }]} />
                  <Text style={[styles.statusText, { color: businessStatusColor }]}>
                    {businessStatusText}
                  </Text>
                </View>
              ) : null}

              {/* Freshness Badge */}
              {freshness ? (
                <View
                  accessibilityLabel={freshness === 'FRESH' ? t('intelligence.fresh') : t('intelligence.stale')}
                  accessibilityRole="text"
                  style={[
                    styles.freshnessBadge,
                    {
                      backgroundColor:
                        freshness === 'FRESH'
                          ? colors.background.surfaceVariant
                          : colors.background.surfaceVariant,
                    },
                  ]}>
                  <MaterialIcons
                    color={freshness === 'FRESH' ? colors.state.success : colors.text.muted}
                    name={freshness === 'FRESH' ? 'bolt' : 'cached'}
                    size={12}
                  />
                  <Text
                    style={[
                      styles.freshnessText,
                      { color: freshness === 'FRESH' ? colors.state.success : colors.text.muted },
                    ]}>
                    {freshness === 'FRESH' ? t('intelligence.fresh') : t('intelligence.stale')}
                  </Text>
                </View>
              ) : null}

              {/* Provenance Disclosure */}
              <View
                accessibilityLabel={t('intelligence.sourceGooglePlaces')}
                accessibilityRole="text"
                style={[styles.provenanceBadge, { backgroundColor: colors.background.surfaceVariant }]}>
                <Text style={[styles.provenanceText, { color: colors.text.muted }]}>
                  {t('intelligence.sourceGooglePlaces')}
                </Text>
              </View>
            </View>

            <View style={styles.titleRow}>
              <Text numberOfLines={2} style={[styles.placeTitle, { color: colors.text.primary }]}>
                {placeData.name}
              </Text>
              {effectiveRating > 0 ? (
                <View
                  style={[
                    styles.ratingBadge,
                    { backgroundColor: colors.background.surfaceVariant },
                  ]}>
                  <MaterialIcons color={colors.brand.yellow} name="star" size={14} />
                  <Text style={[styles.ratingValue, { color: colors.brand.yellow }]}>
                    {effectiveRating}
                  </Text>
                </View>
              ) : null}
            </View>

            {placeData.subtitle ? (
              <Text style={[styles.subtitleText, { color: colors.text.secondary }]}>
                {placeData.subtitle}
              </Text>
            ) : null}

            {/* Tag Pills */}
            <View style={styles.tagsRow}>
              {placeData.tags.map((tag) => (
                <View
                  key={tag.label}
                  style={[
                    styles.tagPill,
                    { backgroundColor: colors.background.surfaceVariant },
                  ]}>
                  <MaterialIcons color={colors.brand.primary} name={tag.iconName} size={14} />
                  <Text style={[styles.tagLabel, { color: colors.text.secondary }]}>
                    {tag.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Quick Actions Bento */}
          <PlaceQuickActions
            onAdd={handleUnavailableAction}
            onCall={handleUnavailableAction}
            onRoute={handleDirections}
            onWebsite={handleUnavailableAction}
          />

          {/* About Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.text.primary }]}>
              {t('place.overview')}
            </Text>
            <AppText numberOfLines={showFullAbout ? undefined : 3} style={styles.aboutText}>
              {placeData.description}
            </AppText>
            <Pressable
              accessibilityHint={t(showFullAbout ? 'place.showLess' : 'place.readMore')}
              accessibilityLabel={t(showFullAbout ? 'place.showLess' : 'place.readMore')}
              accessibilityRole="button"
              style={{ minHeight: 44, justifyContent: 'center' }}
              onPress={() => setShowFullAbout((prev) => !prev)}>
              <Text style={[styles.readMoreText, { color: colors.brand.primary }]}>
                {t(showFullAbout ? 'place.showLess' : 'place.readMore')}
              </Text>
            </Pressable>
          </View>

          {/* Details Cards (Opening Hours & Entry Fee) */}
          <View style={styles.detailsGrid}>
            {/* Opening Hours Card */}
            <View
              style={[
                styles.detailCard,
                { backgroundColor: colors.background.surfaceVariant },
              ]}>
              <MaterialIcons color={colors.brand.primary} name="schedule" size={22} />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailTitle, { color: colors.text.muted }]}>
                  {t('place.openingHours')}
                </Text>

                {/* Honest hours rendering */}
                {intelligence && intelligence.openingHours === null ? (
                  <Text style={[styles.detailMain, { color: colors.text.muted }]}>
                    {t('intelligence.hoursUnavailable')}
                  </Text>
                ) : intelligence?.openingHours ? (
                  <>
                    <Text style={[styles.detailMain, { color: colors.text.primary }]}>
                      {intelligence.openingHours.openNow !== undefined
                        ? intelligence.openingHours.openNow
                          ? t('place.openNow')
                          : t('place.closed')
                        : placeData.openStatus || t('place.openingHours')}
                    </Text>
                    {intelligence.openingHours.weekdayDescriptions &&
                    intelligence.openingHours.weekdayDescriptions.length > 0 ? (
                      <Pressable
                        accessibilityHint={t('place.weeklyScheduleHint')}
                        accessibilityLabel={t('place.weeklySchedule')}
                        accessibilityRole="button"
                        style={{ minHeight: 44, justifyContent: 'center' }}
                        onPress={() => setShowAllHours((prev) => !prev)}>
                        <Text style={[styles.detailSub, { color: colors.brand.primary }]}>
                          {t(showAllHours ? 'place.hideSchedule' : 'place.weeklySchedule')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={[styles.detailMain, { color: colors.text.primary }]}>
                      {placeData.openStatus || t('place.openingHours')}
                    </Text>
                    {placeData.closingNotice ? (
                      <Text style={[styles.detailSub, { color: colors.text.secondary }]}>
                        {placeData.closingNotice}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
            </View>

            <View
              style={[
                styles.detailCard,
                { backgroundColor: colors.background.surfaceVariant },
              ]}>
              <MaterialIcons color={colors.brand.primary} name="confirmation-number" size={22} />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailTitle, { color: colors.text.muted }]}>
                  {t('place.entryFee')}
                </Text>
                <Text style={[styles.detailMain, { color: colors.text.primary }]}>
                  {placeData.entryFee}
                </Text>
                {placeData.entryFeeNote ? (
                  <Text style={[styles.detailSub, { color: colors.text.secondary }]}>
                    {placeData.entryFeeNote}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Expanded Weekday Opening Hours */}
          {showAllHours && intelligence?.openingHours?.weekdayDescriptions ? (
            <View
              style={[
                styles.weeklyHoursCard,
                { backgroundColor: colors.background.surfaceVariant },
              ]}>
              {intelligence.openingHours.weekdayDescriptions.map((desc, idx) => (
                <Text key={idx} style={[styles.weekdayText, { color: colors.text.secondary }]}>
                  {desc}
                </Text>
              ))}
            </View>
          ) : null}

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: colors.text.primary }]}>
              {t('place.address')}
            </Text>
            {placeData.address ? (
              <View style={styles.addressRow}>
                <MaterialIcons color={colors.state.error} name="location-on" size={16} />
                <Text style={[styles.addressText, { color: colors.text.secondary }]}>
                  {placeData.address}
                </Text>
              </View>
            ) : null}

            {/* Simulated Vector Mini Map */}
            <View
              style={[
                styles.miniMap,
                { backgroundColor: colors.background.surfaceVariant },
              ]}>
              <View
                style={[
                  styles.miniMapGrid,
                  { backgroundColor: colors.background.surface },
                ]}
              />
              <View
                style={[
                  styles.miniMapPin,
                  { backgroundColor: colors.background.surface },
                ]}>
                <MaterialIcons color={colors.state.error} name="location-on" size={24} />
              </View>
            </View>
          </View>

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={[styles.sectionHeading, { color: colors.text.primary }]}>
                {t('place.reviews')}
              </Text>
              {effectiveReviewCount > 0 ? (
                <Text style={[styles.seeAllText, { color: colors.brand.primary }]}>
                  {t('place.reviewCount', { count: effectiveReviewCount.toLocaleString() })}
                </Text>
              ) : null}
            </View>

            <View style={styles.reviewsList}>
              {placeData.reviews.map((rev) => (
                <View
                  key={rev.id}
                  style={[
                    styles.reviewCard,
                    { backgroundColor: colors.background.surfaceVariant },
                  ]}>
                  <View style={styles.reviewAuthorRow}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: colors.brand.primary },
                      ]}>
                      <Text style={[styles.avatarText, { color: colors.text.inverse }]}>
                        {rev.avatarLetter}
                      </Text>
                    </View>
                    <View style={styles.authorInfo}>
                      <Text style={[styles.authorName, { color: colors.text.primary }]}>
                        {rev.author}
                      </Text>
                      <View style={styles.reviewStarsRow}>
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <MaterialIcons
                            color={colors.brand.yellow}
                            key={i}
                            name="star"
                            size={14}
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={[styles.reviewTime, { color: colors.text.muted }]}>
                      {rev.timeAgo}
                    </Text>
                  </View>
                  <AppText style={styles.reviewContent}>{rev.content}</AppText>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom CTA */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background.surface,
            borderTopColor: colors.border.default,
          },
        ]}>
        <Pressable
          accessibilityHint={t('place.directionsHint')}
          accessibilityLabel={t('place.getDirections')}
          accessibilityRole="button"
          onPress={handleDirections}
          style={({ pressed }) => [
            styles.ctaButton,
            { backgroundColor: colors.brand.primary },
            pressed && styles.ctaButtonPressed,
          ]}>
          <MaterialIcons color={colors.text.inverse} name="navigation" size={20} />
          <Text style={[styles.ctaText, { color: colors.text.inverse }]}>
            {t('place.getDirections')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  contentSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 8,
    marginTop: -28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  intelAlertBanner: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  intelAlertText: {
    flex: 1,
    fontSize: 12,
  },
  alertRetryBtn: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  alertRetryText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  staleNotice: {
    minHeight: 44,
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  staleNoticeText: {
    flex: 1,
    fontSize: 11,
  },
  titleSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  intelligenceBadgesRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  statusText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
  },
  freshnessBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  freshnessText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.semibold,
  },
  provenanceBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  provenanceText: {
    fontSize: 10,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  placeTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    marginRight: spacing.sm,
  },
  ratingBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingValue: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  subtitleText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  tagPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHeading: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  aboutText: {
    fontSize: typography.bodySmall,
    lineHeight: 22,
  },
  readMoreText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  detailCard: {
    alignItems: 'center',
    borderRadius: radius.card,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  detailInfo: {
    flex: 1,
    gap: 1,
  },
  detailTitle: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  detailMain: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  detailSub: {
    fontSize: 11,
    marginTop: 2,
  },
  weeklyHoursCard: {
    borderRadius: radius.card,
    gap: 4,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  weekdayText: {
    fontSize: 12,
  },
  addressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.sm,
  },
  addressText: {
    flex: 1,
    fontSize: typography.bodySmall,
  },
  miniMap: {
    alignItems: 'center',
    borderRadius: radius.card,
    height: 120,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  miniMapGrid: {
    height: 8,
    opacity: 0.6,
    position: 'absolute',
    width: '100%',
  },
  miniMapPin: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 3,
    height: 44,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    width: 44,
  },
  reviewsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  seeAllText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  reviewsList: {
    gap: spacing.md,
  },
  reviewCard: {
    borderRadius: radius.card,
    gap: spacing.xs,
    padding: spacing.md,
  },
  reviewAuthorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  authorInfo: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewTime: {
    fontSize: 11,
  },
  reviewContent: {
    fontSize: 12,
    lineHeight: 18,
  },
  bottomBar: {
    borderTopWidth: 1,
    bottom: 0,
    elevation: 10,
    left: 0,
    padding: spacing.md,
    position: 'absolute',
    right: 0,
  },
  ctaButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    height: 48,
    justifyContent: 'center',
    width: '100%',
  },
  ctaButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
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
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
});
