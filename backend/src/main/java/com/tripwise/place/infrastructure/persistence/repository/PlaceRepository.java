package com.tripwise.place.infrastructure.persistence.repository;

import com.tripwise.place.domain.entity.Place;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlaceRepository extends JpaRepository<Place, Long>, JpaSpecificationExecutor<Place> {

    @Override
    @EntityGraph(attributePaths = {"category"})
    Page<Place> findAll(org.springframework.data.jpa.domain.Specification<Place> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "tags"})
    List<Place> findAllByIdIn(List<Long> ids);

    @EntityGraph(attributePaths = {"category", "tags"})
    @Query("""
            SELECT p
            FROM Place p
            WHERE p.id = :placeId
              AND p.isActive = true
              AND p.isVerified = true
            """)
    Optional<Place> findPublicDetailById(Long placeId);

    @EntityGraph(attributePaths = {"category", "tags"})
    List<Place> findAllByCityIgnoreCaseAndIsActiveTrueAndIsVerifiedTrue(String city);

    List<Place> findAllByCityIgnoreCaseAndIsActiveTrueOrderByNameAsc(String city);

    @Query(value = """
            SELECT p.*
            FROM places p
            WHERE p.is_active = true
              AND ST_DWithin(
                  p.location,
                  ST_GeogFromText(CONCAT('SRID=4326;POINT(', :longitude, ' ', :latitude, ')')),
                  :radiusMeters
              )
            ORDER BY ST_Distance(
                p.location,
                ST_GeogFromText(CONCAT('SRID=4326;POINT(', :longitude, ' ', :latitude, ')'))
            ) ASC
            """, nativeQuery = true)
    List<Place> findActivePlacesWithinRadius(double longitude, double latitude, double radiusMeters);

    @Query(value = """
            SELECT p.id AS placeId,
                   ST_Distance(
                       p.location,
                       ST_GeogFromText(CONCAT('SRID=4326;POINT(', :longitude, ' ', :latitude, ')'))
                   ) AS distanceMeters
            FROM places p
            WHERE p.is_active = true
              AND p.is_verified = true
              AND (:categoryId IS NULL OR p.category_id = :categoryId)
              AND ST_DWithin(
                  p.location,
                  ST_GeogFromText(CONCAT('SRID=4326;POINT(', :longitude, ' ', :latitude, ')')),
                  :radiusMeters
              )
            ORDER BY distanceMeters ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<PlaceDistanceProjection> findActiveVerifiedPlaceDistancesWithinRadius(
            double longitude,
            double latitude,
            double radiusMeters,
            Long categoryId,
            int limit
    );

    interface PlaceDistanceProjection {
        Long getPlaceId();
        Double getDistanceMeters();
    }
}
