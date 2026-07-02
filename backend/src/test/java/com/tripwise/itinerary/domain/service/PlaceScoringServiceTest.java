package com.tripwise.itinerary.domain.service;

import com.tripwise.itinerary.domain.PlaceScore;
import com.tripwise.place.domain.entity.Place;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class PlaceScoringServiceTest {

    private PlaceScoringService placeScoringService;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @BeforeEach
    void setUp() {
        placeScoringService = PlaceScoringService.builder()
                .interestWeight(4.0)
                .budgetWeight(3.0)
                .ratingWeight(2.0)
                .distanceWeight(1.0)
                .maxDistanceMeters(10000.0) // 10km
                .build();
    }

    private Point createPoint(double lon, double lat) {
        return geometryFactory.createPoint(new Coordinate(lon, lat));
    }

    @Test
    void score_WithMatchingInterests_ShouldGiveCorrectInterestScore() {
        // Arrange
        Place place = Place.builder()
                .tags(Set.of("beach", "nature", "swimming"))
                .rating(BigDecimal.valueOf(4.5))
                .priceLevel("LOW")
                .location(createPoint(109.2, 12.2))
                .build();

        // Match 2 out of 3 user interests -> 2/3 = 0.6667
        Set<String> userInterests = Set.of("beach", "culture", "swimming");

        // Act
        PlaceScore score = placeScoringService.score(place, userInterests, "BUDGET", 12.2, 109.2);

        // Assert
        assertEquals(2.0 / 3.0, score.getInterestScore(), 0.0001);
    }

    @Test
    void score_WithDifferentBudgets_ShouldScoreAccordingly() {
        // Arrange
        Place lowPricePlace = Place.builder().priceLevel("LOW").build();
        Place mediumPricePlace = Place.builder().priceLevel("MEDIUM").build();
        Place highPricePlace = Place.builder().priceLevel("HIGH").build();

        // Act & Assert
        // BUDGET user
        assertEquals(1.0, placeScoringService.score(lowPricePlace, Set.of(), "BUDGET", null, null).getBudgetScore());
        assertEquals(0.4, placeScoringService.score(mediumPricePlace, Set.of(), "BUDGET", null, null).getBudgetScore());
        assertEquals(0.0, placeScoringService.score(highPricePlace, Set.of(), "BUDGET", null, null).getBudgetScore());

        // MID_RANGE user
        assertEquals(1.0, placeScoringService.score(mediumPricePlace, Set.of(), "MID_RANGE", null, null).getBudgetScore());
        assertEquals(0.7, placeScoringService.score(lowPricePlace, Set.of(), "MID_RANGE", null, null).getBudgetScore());
        assertEquals(0.3, placeScoringService.score(highPricePlace, Set.of(), "MID_RANGE", null, null).getBudgetScore());

        // LUXURY user
        assertEquals(1.0, placeScoringService.score(highPricePlace, Set.of(), "LUXURY", null, null).getBudgetScore());
        assertEquals(0.7, placeScoringService.score(mediumPricePlace, Set.of(), "LUXURY", null, null).getBudgetScore());
        assertEquals(0.5, placeScoringService.score(lowPricePlace, Set.of(), "LUXURY", null, null).getBudgetScore());
    }

    @Test
    void score_WithRating_ShouldNormalizeRating() {
        // Arrange
        Place placeWithRating = Place.builder().rating(BigDecimal.valueOf(4.5)).build();
        Place placeWithoutRating = Place.builder().rating(null).build();

        // Act & Assert
        assertEquals(0.9, placeScoringService.score(placeWithRating, Set.of(), "MID_RANGE", null, null).getRatingScore());
        assertEquals(0.6, placeScoringService.score(placeWithoutRating, Set.of(), "MID_RANGE", null, null).getRatingScore());
    }

    @Test
    void score_WithDistancePenalty_ShouldDeductScore() {
        // Arrange
        // Nha Trang City Center coordinate roughly: 12.2404, 109.1967
        double refLat = 12.2404;
        double refLon = 109.1967;

        // Place is roughly 5km away: 12.2404, 109.2427 is roughly 5km East
        Place place5km = Place.builder()
                .location(createPoint(109.2427, 12.2404))
                .build();

        // Place is at the center
        Place place0km = Place.builder()
                .location(createPoint(109.1967, 12.2404))
                .build();

        // Act
        PlaceScore score0km = placeScoringService.score(place0km, Set.of(), "MID_RANGE", refLat, refLon);
        PlaceScore score5km = placeScoringService.score(place5km, Set.of(), "MID_RANGE", refLat, refLon);

        // Assert
        assertEquals(0.0, score0km.getDistancePenalty(), 0.001);
        // 5km / 10km max distance -> penalty should be around 0.5
        assertEquals(0.5, score5km.getDistancePenalty(), 0.05);
        assertTrue(score0km.getTotalScore() > score5km.getTotalScore());
    }

    @Test
    void score_Sorting_ShouldSortDescending() {
        // Arrange
        Place p1 = Place.builder().name("Place 1").rating(BigDecimal.valueOf(3.0)).build();
        Place p2 = Place.builder().name("Place 2").rating(BigDecimal.valueOf(5.0)).build();
        Place p3 = Place.builder().name("Place 3").rating(BigDecimal.valueOf(4.0)).build();

        PlaceScore s1 = placeScoringService.score(p1, Set.of(), "MID_RANGE", null, null);
        PlaceScore s2 = placeScoringService.score(p2, Set.of(), "MID_RANGE", null, null);
        PlaceScore s3 = placeScoringService.score(p3, Set.of(), "MID_RANGE", null, null);

        List<PlaceScore> scores = new ArrayList<>(List.of(s1, s2, s3));

        // Act
        Collections.sort(scores);

        // Assert
        assertEquals("Place 2", scores.get(0).getPlace().getName()); // highest rating -> highest score
        assertEquals("Place 3", scores.get(1).getPlace().getName());
        assertEquals("Place 1", scores.get(2).getPlace().getName());
    }

    @Test
    void score_WithUnknownBudget_ShouldFallbackToNeutralBudgetScore() {
        Place place = Place.builder()
                .priceLevel("HIGH")
                .rating(BigDecimal.valueOf(4.0))
                .build();

        PlaceScore score = placeScoringService.score(place, Set.of("beach"), "UNKNOWN", null, null);

        assertEquals(0.5, score.getBudgetScore());
    }

    @Test
    void score_WithVeryFarDistance_ShouldCapPenaltyAtOne() {
        Place farAwayPlace = Place.builder()
                .location(createPoint(110.1967, 13.2404))
                .build();

        PlaceScore score = placeScoringService.score(farAwayPlace, Set.of(), "MID_RANGE", 12.2404, 109.1967);

        assertEquals(1.0, score.getDistancePenalty(), 0.0001);
    }

    @Test
    void score_WithNoTagsOrInterests_ShouldReturnZeroInterestScore() {
        Place placeWithoutTags = Place.builder()
                .tags(null)
                .build();

        PlaceScore score = placeScoringService.score(placeWithoutTags, Collections.emptySet(), "MID_RANGE", null, null);

        assertEquals(0.0, score.getInterestScore());
    }
}
