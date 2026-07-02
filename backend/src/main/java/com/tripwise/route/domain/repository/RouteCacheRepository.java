package com.tripwise.route.domain.repository;

import com.tripwise.route.domain.entity.RouteCache;

import java.time.Instant;
import java.util.Optional;

public interface RouteCacheRepository {

    Optional<RouteCache> findValidRoute(
            double originLat,
            double originLng,
            double destinationLat,
            double destinationLng,
            String profile,
            Instant now
    );

    RouteCache save(RouteCache routeCache);
}
