package com.tripwise.weather.domain.entity;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class WeatherCacheTest {

    @Test
    void normalizeCity_ShouldTrimAndLowercase() {
        assertThat(WeatherCache.normalizeCity("  Nha Trang  ")).isEqualTo("nha trang");
    }

    @Test
    void isExpired_ShouldReturnTrueWhenExpiresAtEqualsNow() {
        Instant now = Instant.parse("2026-07-02T09:00:00Z");
        WeatherCache weatherCache = WeatherCache.builder()
                .expiresAt(now)
                .build();

        assertThat(weatherCache.isExpired(now)).isTrue();
    }

    @Test
    void isExpired_ShouldReturnFalseWhenExpiresAtIsAfterNow() {
        Instant now = Instant.parse("2026-07-02T09:00:00Z");
        WeatherCache weatherCache = WeatherCache.builder()
                .expiresAt(now.plusSeconds(1))
                .build();

        assertThat(weatherCache.isExpired(now)).isFalse();
    }
}
