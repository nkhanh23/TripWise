package com.tripwise.place.infrastructure.persistence.repository;

import com.tripwise.BaseIntegrationTest;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.domain.entity.PlaceCategory;
import com.tripwise.place.domain.model.PlaceType;
import com.tripwise.place.domain.model.VerificationStatus;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceRepositoryTest extends BaseIntegrationTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory();

    @Autowired
    private PlaceCategoryRepository placeCategoryRepository;

    @Autowired
    private PlaceRepository placeRepository;

    @Test
    void shouldPersistPlaceWithGeographyPointAndTags() {
        PlaceCategory category = placeCategoryRepository.save(
                PlaceCategory.builder()
                        .name("Test Category")
                        .slug("test-category")
                        .build()
        );

        Place place = Place.builder()
                .name("Hon Chong")
                .city("Nha Trang")
                .category(category)
                .location(point(109.2024, 12.2761))
                .description("Scenic coastal attraction")
                .estimatedCost(new BigDecimal("50000"))
                .durationMinutes(90)
                .indoor(false)
                .isActive(true)
                .isVerified(true)
                .verificationStatus(VerificationStatus.VERIFIED)
                .placeType(PlaceType.ATTRACTION)
                .qualityScore(95)
                .isRecommendable(true)
                .source("MANUAL_SEED")
                .priceLevel("MEDIUM")
                .rating(new BigDecimal("4.6"))
                .tags(Set.of("scenic", "coastal"))
                .build();

        Place savedPlace = placeRepository.saveAndFlush(place);

        assertThat(savedPlace.getId()).isNotNull();

        Place foundPlace = placeRepository.findById(savedPlace.getId()).orElseThrow();
        assertThat(foundPlace.getLocation()).isNotNull();
        assertThat(foundPlace.getLocation().getX()).isEqualTo(109.2024);
        assertThat(foundPlace.getLocation().getY()).isEqualTo(12.2761);
        assertThat(foundPlace.getTags()).containsExactlyInAnyOrder("scenic", "coastal");
        assertThat(foundPlace.getCategory().getId()).isEqualTo(category.getId());
        assertThat(foundPlace.getVerificationStatus()).isEqualTo(VerificationStatus.VERIFIED);
        assertThat(foundPlace.getPlaceType()).isEqualTo(PlaceType.ATTRACTION);
        assertThat(foundPlace.getQualityScore()).isEqualTo(95);
        assertThat(foundPlace.getIsRecommendable()).isTrue();
    }

    @Test
    void shouldFindActivePlacesWithinRadius() {
        PlaceCategory category = placeCategoryRepository.findBySlug("beach")
                .orElseGet(() -> placeCategoryRepository.save(
                        PlaceCategory.builder()
                                .name("Beach")
                                .slug("beach")
                                .build()
                ));

        placeRepository.save(Place.builder()
                .name("Tran Phu Beach")
                .city("Nha Trang")
                .category(category)
                .location(point(109.1967, 12.2388))
                .estimatedCost(BigDecimal.ZERO)
                .durationMinutes(120)
                .indoor(false)
                .isActive(true)
                .isVerified(true)
                .build());

        placeRepository.save(Place.builder()
                .name("Far Away Place")
                .city("Nha Trang")
                .category(category)
                .location(point(109.3000, 12.3000))
                .estimatedCost(BigDecimal.ZERO)
                .durationMinutes(120)
                .indoor(false)
                .isActive(true)
                .isVerified(true)
                .build());

        placeRepository.flush();

        List<Place> nearbyPlaces = placeRepository.findActivePlacesWithinRadius(109.1962, 12.2381, 1000);

        assertThat(nearbyPlaces)
                .extracting(Place::getName)
                .contains("Tran Phu Beach")
                .doesNotContain("Far Away Place");
    }

    private static Point point(double longitude, double latitude) {
        Point point = GEOMETRY_FACTORY.createPoint(new Coordinate(longitude, latitude));
        point.setSRID(4326);
        return point;
    }
}
