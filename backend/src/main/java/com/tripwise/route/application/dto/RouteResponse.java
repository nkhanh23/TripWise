package com.tripwise.route.application.dto;

public record RouteResponse(
        double distanceMeters,
        double durationSeconds,
        String geometry
) {
}
