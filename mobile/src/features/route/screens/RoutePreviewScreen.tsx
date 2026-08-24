import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/AppText';
import { useTranslation } from '../../../i18n';
import type { RootStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import { RouteMapCanvas } from '../components/RouteMapCanvas';
import { VerifiedRoutePreviewMap } from '../components/VerifiedRoutePreviewMap';
import { RouteStepList } from '../components/RouteStepList';
import { RouteSummaryCard } from '../components/RouteSummaryCard';
import { RouteUnavailableState } from '../components/RouteUnavailableState';
import { TWTransportSelector } from '../components/TWTransportSelector';
import { getMockRoute } from '../data/mockRoutes';
import type { MockRouteData, RouteUIStatus, TransportMode } from '../types';
import type { Route } from '../../../integration/contracts';
import { OsrmRouteRepository } from '../../../integration/remote/publicProviderRepositories';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutePreview'> & {
  initialStatus?: RouteUIStatus;
  initialMode?: TransportMode;
  customRoute?: MockRouteData;
  fixtureMode?: boolean;
};

export function RoutePreviewScreen({
  route,
  navigation,
  initialStatus = 'ready',
  initialMode = 'transit',
  customRoute,
  fixtureMode,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, effectiveTheme } = useTheme();
  const { t } = useTranslation();

  const destinationId = route?.params?.destinationId ?? '';
  const destinationName = route?.params?.destinationName ?? t('route.destination');
  const originName = route?.params?.originName ?? t('route.currentLocation');
  const realCoordinates = useMemo(() => route?.params?.coordinates ?? [], [route?.params?.coordinates]);
  const hasRealRouteRequest = realCoordinates.length >= 2;
  // Mock routes are available only to explicit fixtures/tests. A production
  // navigation without two verified coordinates must remain unavailable rather
  // than presenting fabricated route metrics or geometry.
  const isFixture = Boolean(fixtureMode || customRoute);

  const effectiveInitialMode = hasRealRouteRequest ? 'driving' : initialMode;
  const [selectedMode, setSelectedMode] = useState<TransportMode>(effectiveInitialMode);
  const [status, setStatus] = useState<RouteUIStatus>(
    hasRealRouteRequest ? 'loading' : (isFixture ? initialStatus : 'unavailable')
  );
  const [realRoute, setRealRoute] = useState<Route | null>(null);
  const [calculatedRoute, setCalculatedRoute] = useState<MockRouteData | null>(() =>
    customRoute ?? (isFixture && initialStatus === 'ready' ? getMockRoute(destinationId, effectiveInitialMode) : null)
  );

  const currentRoute = customRoute ?? calculatedRoute;

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRealRoute = useCallback((mode: TransportMode) => {
    if (!hasRealRouteRequest) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (mode !== 'driving') {
      abortControllerRef.current = null;
      setRealRoute(null);
      setStatus('unavailable');
      return;
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setStatus('loading');
    void new OsrmRouteRepository().getRoute({ profile: 'driving', coordinates: realCoordinates }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setRealRoute(result);
        setStatus('ready');
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setRealRoute(null);
        if (error instanceof Error && error.message === 'noRoute') {
          setStatus('unavailable');
        } else {
          setStatus('error');
        }
      });
  }, [hasRealRouteRequest, realCoordinates]);

  useEffect(() => {
    if (!hasRealRouteRequest) return undefined;
    const timer = setTimeout(() => {
      fetchRealRoute(effectiveInitialMode);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchRealRoute, hasRealRouteRequest, effectiveInitialMode]);

  const fetchRoute = useCallback(
    (mode: TransportMode) => {
      if (hasRealRouteRequest) {
        fetchRealRoute(mode);
        return;
      }
      if (isFixture) {
        setStatus('loading');
        const result = getMockRoute(destinationId, mode);
        if (result) {
          setCalculatedRoute(result);
          setStatus('ready');
        } else {
          setCalculatedRoute(null);
          setStatus('unavailable');
        }
        return;
      }
      setCalculatedRoute(null);
      setRealRoute(null);
      setStatus('unavailable');
    },
    [destinationId, fetchRealRoute, hasRealRouteRequest, isFixture]
  );

  const handleSelectMode = useCallback(
    (mode: TransportMode) => {
      setSelectedMode(mode);
      fetchRoute(mode);
    },
    [fetchRoute]
  );

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  }, [navigation]);

  const handleRetry = useCallback(() => {
    fetchRoute(selectedMode);
  }, [fetchRoute, selectedMode]);

  // List header containing Address box + Transport selector + Summary card
  const listHeader = useMemo(() => {
    return (
      <View style={styles.sheetBody}>
        {/* Origin / Destination Box */}
        <View
          style={[
            styles.addressBox,
            { backgroundColor: colors.background.surfaceVariant },
          ]}>
          <View
            style={[
              styles.verticalDashedLine,
              { backgroundColor: colors.border.default },
            ]}
          />

          {/* Origin Row */}
          <View style={styles.addressRow}>
            <View
              style={[
                styles.originDotOuter,
                { backgroundColor: effectiveTheme === 'dark' ? '#1E3A5F' : '#D8E2FF' },
              ]}>
              <View
                style={[
                  styles.originDotInner,
                  { backgroundColor: colors.brand.primary },
                ]}
              />
            </View>
            <View
              style={[
                styles.addressInputPill,
                {
                  backgroundColor: colors.background.surface,
                  borderColor: colors.border.default,
                },
              ]}>
              <Text
                numberOfLines={1}
                style={[styles.addressText, { color: colors.text.primary }]}>
                {originName}
              </Text>
            </View>
          </View>

          {/* Destination Row */}
          <View style={styles.addressRow}>
            <View style={styles.destPinWrap}>
              <MaterialIcons color={colors.state.error} name="location-on" size={16} />
            </View>
            <View
              style={[
                styles.addressInputPill,
                {
                  backgroundColor: colors.background.surface,
                  borderColor: colors.border.default,
                },
              ]}>
              <Text
                numberOfLines={1}
                style={[styles.addressText, { color: colors.text.primary }]}>
                {destinationName}
              </Text>
            </View>
          </View>
        </View>

        {/* Transport Mode Chips Selector */}
        <TWTransportSelector onSelectMode={handleSelectMode} selectedMode={selectedMode} />

        {/* Route Summary Card */}
        {currentRoute && status === 'ready' && !hasRealRouteRequest ? (
          <RouteSummaryCard route={currentRoute} />
        ) : null}
        {realRoute && status === 'ready' ? (
          <View style={styles.realSummary}>
            <Text style={[styles.stepsHeading, { color: colors.text.primary }]}>Driving</Text>
            <Text style={{ color: colors.text.secondary }}>
              {(realRoute.distanceMeters / 1000).toFixed(1)} km • {Math.ceil(realRoute.durationSeconds / 60)} min
            </Text>
          </View>
        ) : null}

        {/* Steps Section Heading */}
        {currentRoute && status === 'ready' && !hasRealRouteRequest ? (
          <View style={styles.stepsHeadingRow}>
            <Text style={[styles.stepsHeading, { color: colors.text.primary }]}>
              {t('route.steps')} ({currentRoute.steps.length} {t('route.stepsCount')})
            </Text>
          </View>
        ) : null}
      </View>
    );
  }, [
    originName,
    destinationName,
    selectedMode,
    currentRoute,
    status,
    handleSelectMode,
    colors,
    effectiveTheme,
    t,
    hasRealRouteRequest,
    realRoute,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.surface }]}>
      {/* 1. Floating Top Navigation Bar */}
      <View style={[styles.topBar, { top: Math.max(insets.top, spacing.sm) }]}>
        <Pressable
          accessibilityHint={t('common.back')}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor:
                effectiveTheme === 'dark'
                  ? 'rgba(30, 31, 36, 0.92)'
                  : 'rgba(255, 255, 255, 0.92)',
            },
            pressed && styles.pressed,
          ]}>
          <MaterialIcons color={colors.text.primary} name="arrow-back" size={20} />
        </Pressable>
        <View
          style={[
            styles.topBarCenter,
            {
              backgroundColor:
                effectiveTheme === 'dark'
                  ? 'rgba(30, 31, 36, 0.92)'
                  : 'rgba(255, 255, 255, 0.92)',
            },
          ]}>
          <Text
            numberOfLines={1}
            style={[styles.topBarTitle, { color: colors.text.primary }]}>
            {t('route.title')} {destinationName}
          </Text>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      {/* 2. Top Map Canvas */}
      {realRoute ? (
        <VerifiedRoutePreviewMap route={realRoute} stops={realCoordinates} />
      ) : isFixture && currentRoute && !hasRealRouteRequest ? (
        <RouteMapCanvas route={currentRoute} />
      ) : null}

      {/* 3. Bottom Sheet Content with Virtualized Directions */}
      <View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: colors.background.surface,
            borderTopColor: colors.border.default,
          },
        ]}>
        {/* Loading State */}
        {status === 'loading' ? (
          <View
            accessibilityLabel={t('common.loading')}
            accessibilityRole="progressbar"
            style={styles.centerContainer}>
            <ActivityIndicator color={colors.brand.primary} size="large" />
          </View>
        ) : null}

        {/* Error State */}
        {status === 'error' ? (
          <View accessibilityRole="alert" style={styles.centerContainer}>
            <MaterialIcons color={colors.state.error} name="error-outline" size={40} />
            <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
              {t('route.errorTitle')}
            </Text>
            <AppText style={styles.errorSubtitle}>
              {t('route.errorSubtitle')}
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
        ) : null}

        {/* Route Unavailable State */}
        {status === 'unavailable' ? (
          <RouteUnavailableState onBack={handleBack} onSwitchTransport={handleSelectMode} />
        ) : null}

        {/* Ready Route Content */}
        {status === 'ready' && hasRealRouteRequest ? (
          listHeader
        ) : null}
        {status === 'ready' && currentRoute && !hasRealRouteRequest ? (
          <RouteStepList headerComponent={listHeader} steps={currentRoute.steps} />
        ) : null}
      </View>

      {/* 4. Fixed Bottom CTA */}
      {status === 'ready' && (currentRoute || realRoute) ? (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background.surface,
              borderTopColor: colors.border.default,
            },
          ]}>
          <Pressable
            accessibilityHint={t('route.startRoute')}
            accessibilityLabel={t('route.startRoute')}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: colors.brand.primary },
              pressed && styles.ctaPressed,
            ]}>
            <MaterialIcons color={colors.text.inverse} name="navigation" size={20} />
            <Text style={[styles.ctaText, { color: colors.text.inverse }]}>
              {t('route.startRoute')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    zIndex: 40,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 4,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    width: 40,
  },
  topBarCenter: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 4,
    flex: 1,
    height: 40,
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  topBarTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.bold,
  },
  topBarSpacer: {
    width: 40,
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 8,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxHeight: '85%',
    paddingBottom: 72,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 20,
  },
  sheetBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  addressBox: {
    borderRadius: radius.card,
    gap: spacing.sm,
    padding: spacing.md,
    position: 'relative',
  },
  verticalDashedLine: {
    height: 24,
    left: 21,
    position: 'absolute',
    top: 36,
    width: 2,
    zIndex: 1,
  },
  addressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    zIndex: 2,
  },
  originDotOuter: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  originDotInner: {
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  destPinWrap: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  addressInputPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  addressText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  stepsHeadingRow: {
    marginTop: spacing.md,
  },
  stepsHeading: {
    fontSize: typography.titleSmall,
    fontWeight: typography.fontWeight.bold,
  },
  bottomBar: {
    borderTopWidth: 1,
    bottom: 0,
    elevation: 12,
    left: 0,
    padding: spacing.md,
    position: 'absolute',
    right: 0,
    zIndex: 30,
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
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontSize: typography.body,
    fontWeight: typography.fontWeight.bold,
  },
  centerContainer: {
    alignItems: 'center',
    minHeight: 200,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  realSummary: {
    gap: spacing.xs,
    marginTop: spacing.md,
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
    height: 40,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
