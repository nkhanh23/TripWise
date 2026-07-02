package com.tripwise.route.infrastructure.persistence;

import com.tripwise.route.domain.entity.RouteCache;
import com.tripwise.route.domain.repository.RouteCacheRepository;
import com.tripwise.route.infrastructure.persistence.repository.RouteCacheJpaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@EntityScan(basePackageClasses = RouteCache.class)
@EnableJpaRepositories(basePackageClasses = RouteCacheJpaRepository.class)
@Import(JpaRouteCacheRepository.class)
class JpaRouteCacheRepositoryTest {

    @Autowired
    private RouteCacheRepository routeCacheRepository;

    @Test
    void shouldReturnCachedRouteWhenNotExpired() {
        Instant now = Instant.parse("2026-07-01T10:15:30Z");
        routeCacheRepository.save(RouteCache.builder()
                .cacheKey(RouteCache.buildCacheKey(12.2404, 109.1967, 12.2521, 109.2105, "driving"))
                .geometry("{\"type\":\"LineString\",\"coordinates\":[[109.1967,12.2404],[109.2105,12.2521]]}")
                .distanceMeters(1823.4)
                .durationSeconds(365.2)
                .expiresAt(now.plusSeconds(7 * 24 * 60 * 60))
                .build());

        Optional<RouteCache> result = routeCacheRepository.findValidRoute(
                12.2404, 109.1967, 12.2521, 109.2105, "driving", now);

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getDistanceMeters()).isEqualTo(1823.4);
        assertThat(result.orElseThrow().getDurationSeconds()).isEqualTo(365.2);
    }

    @Test
    void shouldReturnEmptyWhenCachedRouteIsExpired() {
        Instant now = Instant.parse("2026-07-01T10:15:30Z");
        routeCacheRepository.save(RouteCache.builder()
                .cacheKey(RouteCache.buildCacheKey(12.2404, 109.1967, 12.2521, 109.2105, "walking"))
                .geometry("{\"type\":\"LineString\",\"coordinates\":[[109.1967,12.2404],[109.2105,12.2521]]}")
                .distanceMeters(1900.0)
                .durationSeconds(900.0)
                .expiresAt(now.minusSeconds(1))
                .build());

        Optional<RouteCache> result = routeCacheRepository.findValidRoute(
                12.2404, 109.1967, 12.2521, 109.2105, "walking", now);

        assertThat(result).isEmpty();
    }

    @Test
    void shouldReturnEmptyWhenCachedRouteExpiresExactlyAtLookupTime() {
        Instant now = Instant.parse("2026-07-01T10:15:30Z");
        routeCacheRepository.save(RouteCache.builder()
                .cacheKey(RouteCache.buildCacheKey(12.2404, 109.1967, 12.2521, 109.2105, "driving"))
                .geometry("{\"type\":\"LineString\",\"coordinates\":[[109.1967,12.2404],[109.2105,12.2521]]}")
                .distanceMeters(1823.4)
                .durationSeconds(365.2)
                .expiresAt(now)
                .build());

        Optional<RouteCache> result = routeCacheRepository.findValidRoute(
                12.2404, 109.1967, 12.2521, 109.2105, "driving", now);

        assertThat(result).isEmpty();
    }

    @Test
    void shouldUseNormalizedCoordinatesToReduceCacheMisses() {
        Instant now = Instant.parse("2026-07-01T10:15:30Z");
        routeCacheRepository.save(RouteCache.builder()
                .cacheKey(RouteCache.buildCacheKey(12.2404004, 109.1967004, 12.2521004, 109.2105004, "CYCLING"))
                .geometry("{\"type\":\"LineString\",\"coordinates\":[[109.1967,12.2404],[109.2105,12.2521]]}")
                .distanceMeters(2100.0)
                .durationSeconds(700.0)
                .expiresAt(now.plusSeconds(7 * 24 * 60 * 60))
                .build());

        Optional<RouteCache> result = routeCacheRepository.findValidRoute(
                12.24040049, 109.19670049, 12.25210049, 109.21050049, "cycling", now);

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getCacheKey()).isEqualTo(
                RouteCache.buildCacheKey(12.24040049, 109.19670049, 12.25210049, 109.21050049, "cycling")
        );
    }

    @Test
    void shouldNotReturnRouteFromDifferentProfile() {
        Instant now = Instant.parse("2026-07-01T10:15:30Z");
        routeCacheRepository.save(RouteCache.builder()
                .cacheKey(RouteCache.buildCacheKey(12.2404, 109.1967, 12.2521, 109.2105, "driving"))
                .geometry("{\"type\":\"LineString\",\"coordinates\":[[109.1967,12.2404],[109.2105,12.2521]]}")
                .distanceMeters(1823.4)
                .durationSeconds(365.2)
                .expiresAt(now.plusSeconds(7 * 24 * 60 * 60))
                .build());

        Optional<RouteCache> result = routeCacheRepository.findValidRoute(
                12.2404, 109.1967, 12.2521, 109.2105, "walking", now);

        assertThat(result).isEmpty();
    }
}
