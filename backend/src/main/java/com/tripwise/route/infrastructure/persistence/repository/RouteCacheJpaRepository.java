package com.tripwise.route.infrastructure.persistence.repository;

import com.tripwise.route.domain.entity.RouteCache;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface RouteCacheJpaRepository extends JpaRepository<RouteCache, Long> {

    Optional<RouteCache> findFirstByCacheKeyAndExpiresAtAfter(String cacheKey, Instant now);
}
