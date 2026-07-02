package com.tripwise.route.domain.entity;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class RouteCacheTest {

    @Test
    void buildCacheKey_ShouldNormalizeCoordinatesAndProfile() {
        String cacheKey = RouteCache.buildCacheKey(
                12.24040049,
                109.19670049,
                12.25210051,
                109.21050051,
                "  DRIVING "
        );

        assertThat(cacheKey).isEqualTo("109.196700:12.240400:109.210501:12.252101:driving");
    }

    @Test
    void isExpired_ShouldReturnTrueWhenExpirationEqualsNow() {
        Instant now = Instant.parse("2026-07-02T08:00:00Z");
        RouteCache routeCache = RouteCache.builder()
                .expiresAt(now)
                .build();

        assertThat(routeCache.isExpired(now)).isTrue();
    }

    @Test
    void isExpired_ShouldReturnFalseWhenExpirationIsAfterNow() {
        Instant now = Instant.parse("2026-07-02T08:00:00Z");
        RouteCache routeCache = RouteCache.builder()
                .expiresAt(now.plusSeconds(1))
                .build();

        assertThat(routeCache.isExpired(now)).isFalse();
    }
}
