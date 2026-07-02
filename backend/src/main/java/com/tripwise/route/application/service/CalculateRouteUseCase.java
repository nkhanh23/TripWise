package com.tripwise.route.application.service;

import com.tripwise.common.exception.ExternalServiceException;
import com.tripwise.route.domain.RouteResult;
import com.tripwise.route.domain.entity.RouteCache;
import com.tripwise.route.domain.repository.RouteCacheRepository;
import com.tripwise.route.infrastructure.OsrmClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CalculateRouteUseCase {

    private static final Duration ROUTE_CACHE_TTL = Duration.ofDays(7);
    private static final Map<String, Double> FALLBACK_SPEED_METERS_PER_SECOND = Map.of(
            "driving", 11.11d,
            "walking", 1.39d,
            "cycling", 4.17d
    );

    private final RouteCacheRepository routeCacheRepository;
    private final OsrmClient osrmClient;

    public RouteResult execute(double originLat, double originLng, double destinationLat, double destinationLng, String profile) {
        Instant now = Instant.now();

        Optional<RouteCache> cachedRoute = routeCacheRepository.findValidRoute(
                originLat,
                originLng,
                destinationLat,
                destinationLng,
                profile,
                now
        );
        if (cachedRoute.isPresent()) {
            log.debug("Route cache hit for profile {}", normalizeProfile(profile));
            RouteCache routeCache = cachedRoute.orElseThrow();
            return new RouteResult(
                    routeCache.getDistanceMeters(),
                    routeCache.getDurationSeconds(),
                    routeCache.getGeometry()
            );
        }

        try {
            RouteResult routeResult = osrmClient.getRoute(originLat, originLng, destinationLat, destinationLng, profile);
            routeCacheRepository.save(RouteCache.builder()
                    .cacheKey(RouteCache.buildCacheKey(originLat, originLng, destinationLat, destinationLng, profile))
                    .geometry(routeResult.geometry())
                    .distanceMeters(routeResult.distanceMeters())
                    .durationSeconds(routeResult.durationSeconds())
                    .expiresAt(now.plus(ROUTE_CACHE_TTL))
                    .build());
            return routeResult;
        } catch (ExternalServiceException ex) {
            log.warn("OSRM unavailable for profile {}. Falling back to straight-line estimate: {}",
                    normalizeProfile(profile), ex.getMessage());
            return buildFallbackRoute(originLat, originLng, destinationLat, destinationLng, profile);
        }
    }

    private RouteResult buildFallbackRoute(
            double originLat,
            double originLng,
            double destinationLat,
            double destinationLng,
            String profile
    ) {
        double distanceMeters = calculateHaversineDistance(originLat, originLng, destinationLat, destinationLng);
        double speedMetersPerSecond = FALLBACK_SPEED_METERS_PER_SECOND.getOrDefault(normalizeProfile(profile), 11.11d);
        double durationSeconds = distanceMeters / speedMetersPerSecond;

        return new RouteResult(
                distanceMeters,
                durationSeconds,
                buildStraightLineGeometry(originLat, originLng, destinationLat, destinationLng)
        );
    }

    private String buildStraightLineGeometry(double originLat, double originLng, double destinationLat, double destinationLng) {
        return String.format(Locale.US,
                "{\"type\":\"LineString\",\"coordinates\":[[%s,%s],[%s,%s]]}",
                Double.toString(originLng),
                Double.toString(originLat),
                Double.toString(destinationLng),
                Double.toString(destinationLat)
        );
    }

    private String normalizeProfile(String profile) {
        return profile == null ? "" : profile.trim().toLowerCase(Locale.ROOT);
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371000 * c;
    }
}
