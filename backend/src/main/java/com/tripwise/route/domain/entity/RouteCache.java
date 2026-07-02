package com.tripwise.route.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Locale;

@Entity
@Table(name = "route_cache")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteCache {

    private static final int COORDINATE_SCALE = 6;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cache_key", nullable = false, unique = true, length = 255)
    private String cacheKey;

    @Column(name = "geometry", nullable = false, columnDefinition = "TEXT")
    private String geometry;

    @Column(name = "distance_meters", nullable = false)
    private Double distanceMeters;

    @Column(name = "duration_seconds", nullable = false)
    private Double durationSeconds;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public boolean isExpired(Instant now) {
        return !expiresAt.isAfter(now);
    }

    public static String buildCacheKey(
            double originLat,
            double originLng,
            double destinationLat,
            double destinationLng,
            String profile
    ) {
        return String.join(":",
                normalizeCoordinate(originLng),
                normalizeCoordinate(originLat),
                normalizeCoordinate(destinationLng),
                normalizeCoordinate(destinationLat),
                normalizeProfile(profile));
    }

    private static String normalizeCoordinate(double value) {
        return BigDecimal.valueOf(value)
                .setScale(COORDINATE_SCALE, RoundingMode.HALF_UP)
                .toPlainString();
    }

    private static String normalizeProfile(String profile) {
        return profile == null ? "" : profile.trim().toLowerCase(Locale.ROOT);
    }
}
