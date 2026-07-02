package com.tripwise.route.application.service;

import com.tripwise.common.exception.BusinessException;
import com.tripwise.common.exception.ExternalServiceException;
import com.tripwise.route.domain.RouteResult;
import com.tripwise.route.domain.entity.RouteCache;
import com.tripwise.route.domain.repository.RouteCacheRepository;
import com.tripwise.route.infrastructure.OsrmClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CalculateRouteUseCaseTest {

    @Mock
    private RouteCacheRepository routeCacheRepository;

    @Mock
    private OsrmClient osrmClient;

    @InjectMocks
    private CalculateRouteUseCase calculateRouteUseCase;

    @Test
    void execute_WhenCacheHit_ShouldReturnCachedRouteAndSkipOsrm() {
        RouteCache cachedRoute = RouteCache.builder()
                .cacheKey(RouteCache.buildCacheKey(12.2404, 109.1967, 12.2521, 109.2105, "driving"))
                .geometry("{\"type\":\"LineString\",\"coordinates\":[[109.1967,12.2404],[109.2105,12.2521]]}")
                .distanceMeters(1823.4)
                .durationSeconds(365.2)
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        when(routeCacheRepository.findValidRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble(), anyString(), any(Instant.class)))
                .thenReturn(Optional.of(cachedRoute));

        RouteResult result = calculateRouteUseCase.execute(12.2404, 109.1967, 12.2521, 109.2105, "driving");

        assertThat(result.distanceMeters()).isEqualTo(1823.4);
        assertThat(result.durationSeconds()).isEqualTo(365.2);
        assertThat(result.geometry()).isEqualTo(cachedRoute.getGeometry());
        verify(osrmClient, never()).getRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble(), anyString());
        verify(routeCacheRepository, never()).save(any(RouteCache.class));
    }

    @Test
    void execute_WhenCacheMissAndOsrmSucceeds_ShouldSaveAndReturnRoute() {
        RouteResult osrmResult = new RouteResult(
                1823.4,
                365.2,
                "{\"type\":\"LineString\",\"coordinates\":[[109.1967,12.2404],[109.2105,12.2521]]}"
        );
        when(routeCacheRepository.findValidRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble(), anyString(), any(Instant.class)))
                .thenReturn(Optional.empty());
        when(osrmClient.getRoute(12.2404, 109.1967, 12.2521, 109.2105, "driving"))
                .thenReturn(osrmResult);

        RouteResult result = calculateRouteUseCase.execute(12.2404, 109.1967, 12.2521, 109.2105, "driving");

        assertThat(result).isEqualTo(osrmResult);

        ArgumentCaptor<RouteCache> routeCacheCaptor = ArgumentCaptor.forClass(RouteCache.class);
        verify(routeCacheRepository).save(routeCacheCaptor.capture());
        RouteCache savedRouteCache = routeCacheCaptor.getValue();
        assertThat(savedRouteCache.getCacheKey())
                .isEqualTo(RouteCache.buildCacheKey(12.2404, 109.1967, 12.2521, 109.2105, "driving"));
        assertThat(savedRouteCache.getDistanceMeters()).isEqualTo(1823.4);
        assertThat(savedRouteCache.getDurationSeconds()).isEqualTo(365.2);
        assertThat(savedRouteCache.getGeometry()).isEqualTo(osrmResult.geometry());
        assertThat(savedRouteCache.getExpiresAt()).isAfter(Instant.now());
    }

    @Test
    void execute_WhenOsrmFails_ShouldReturnFallbackRouteWithoutSavingCache() {
        when(routeCacheRepository.findValidRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble(), anyString(), any(Instant.class)))
                .thenReturn(Optional.empty());
        when(osrmClient.getRoute(12.2404, 109.1967, 12.2521, 109.2105, "walking"))
                .thenThrow(new ExternalServiceException("OSRM timeout"));

        RouteResult result = calculateRouteUseCase.execute(12.2404, 109.1967, 12.2521, 109.2105, "walking");

        assertThat(result.distanceMeters()).isPositive();
        assertThat(result.durationSeconds()).isPositive();
        assertThat(result.geometry()).contains("\"type\":\"LineString\"");
        assertThat(result.geometry()).contains("[109.1967,12.2404]");
        verify(routeCacheRepository, never()).save(any(RouteCache.class));
    }

    @Test
    void execute_WhenOsrmFails_ShouldUseProfileSpecificFallbackSpeed() {
        when(routeCacheRepository.findValidRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble(), anyString(), any(Instant.class)))
                .thenReturn(Optional.empty());
        when(osrmClient.getRoute(12.2404, 109.1967, 12.2521, 109.2105, "walking"))
                .thenThrow(new ExternalServiceException("OSRM timeout"));
        when(osrmClient.getRoute(12.2404, 109.1967, 12.2521, 109.2105, "cycling"))
                .thenThrow(new ExternalServiceException("OSRM timeout"));

        RouteResult walkingResult = calculateRouteUseCase.execute(12.2404, 109.1967, 12.2521, 109.2105, "walking");
        RouteResult cyclingResult = calculateRouteUseCase.execute(12.2404, 109.1967, 12.2521, 109.2105, "cycling");

        assertThat(walkingResult.distanceMeters()).isEqualTo(cyclingResult.distanceMeters());
        assertThat(walkingResult.durationSeconds()).isGreaterThan(cyclingResult.durationSeconds());
        verify(routeCacheRepository, never()).save(any(RouteCache.class));
    }

    @Test
    void execute_WhenInvalidInput_ShouldBubbleBusinessException() {
        when(routeCacheRepository.findValidRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble(), anyString(), any(Instant.class)))
                .thenReturn(Optional.empty());
        when(osrmClient.getRoute(95.0, 109.1967, 12.2521, 109.2105, "driving"))
                .thenThrow(new BusinessException("lat1 không hợp lệ", "VALIDATION_ERROR"));

        assertThrows(BusinessException.class,
                () -> calculateRouteUseCase.execute(95.0, 109.1967, 12.2521, 109.2105, "driving"));
        verify(routeCacheRepository, never()).save(any(RouteCache.class));
    }
}
