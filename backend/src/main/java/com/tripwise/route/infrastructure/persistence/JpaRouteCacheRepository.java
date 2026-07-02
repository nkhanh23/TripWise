package com.tripwise.route.infrastructure.persistence;

import com.tripwise.route.domain.entity.RouteCache;
import com.tripwise.route.domain.repository.RouteCacheRepository;
import com.tripwise.route.infrastructure.persistence.repository.RouteCacheJpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public class JpaRouteCacheRepository implements RouteCacheRepository {

    private final RouteCacheJpaRepository routeCacheJpaRepository;

    public JpaRouteCacheRepository(RouteCacheJpaRepository routeCacheJpaRepository) {
        this.routeCacheJpaRepository = routeCacheJpaRepository;
    }

    @Override
    public Optional<RouteCache> findValidRoute(
            double originLat,
            double originLng,
            double destinationLat,
            double destinationLng,
            String profile,
            Instant now
    ) {
        String cacheKey = RouteCache.buildCacheKey(originLat, originLng, destinationLat, destinationLng, profile);
        return routeCacheJpaRepository.findFirstByCacheKeyAndExpiresAtAfter(cacheKey, now);
    }

    @Override
    public RouteCache save(RouteCache routeCache) {
        return routeCacheJpaRepository.save(routeCache);
    }
}
