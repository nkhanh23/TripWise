package com.tripwise.route.domain;

public record RouteResult(
        double distanceMeters,
        double durationSeconds,
        String geometry
) {
}
