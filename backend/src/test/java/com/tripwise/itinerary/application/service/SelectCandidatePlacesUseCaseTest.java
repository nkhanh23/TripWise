package com.tripwise.itinerary.application.service;

import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.itinerary.domain.PlaceScore;
import com.tripwise.itinerary.domain.service.PlaceScoringService;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.domain.entity.PlaceCategory;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.trip.infrastructure.persistence.repository.TripRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SelectCandidatePlacesUseCaseTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private PlaceScoringService placeScoringService;

    @InjectMocks
    private SelectCandidatePlacesUseCase selectCandidatePlacesUseCase;

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    private Trip trip;

    @BeforeEach
    void setUp() {
        selectCandidatePlacesUseCase.setPlacesPerDay(2); // Set to 2 for easier testing: 3 days * 2 = 6 target count
        trip = Trip.builder()
                .id(100L)
                .destination("Nha Trang")
                .days(3)
                .budget("MID_RANGE")
                .interests(List.of("beach"))
                .build();
    }

    private Point createPoint(double lon, double lat) {
        return geometryFactory.createPoint(new Coordinate(lon, lat));
    }

    @Test
    void execute_WithHappyPath_ShouldSelectCorrectCountAndEnsureDiversity() {
        // Arrange
        PlaceCategory cat1 = PlaceCategory.builder().id(1L).name("Beach").build();
        PlaceCategory cat2 = PlaceCategory.builder().id(2L).name("Culture").build();

        // 3 places in cat1
        Place p1 = Place.builder().id(1L).name("P1").category(cat1).location(createPoint(109.1, 12.1)).build();
        Place p2 = Place.builder().id(2L).name("P2").category(cat1).location(createPoint(109.1, 12.1)).build();
        Place p3 = Place.builder().id(3L).name("P3").category(cat1).location(createPoint(109.1, 12.1)).build();

        // 3 places in cat2
        Place p4 = Place.builder().id(4L).name("P4").category(cat2).location(createPoint(109.2, 12.2)).build();
        Place p5 = Place.builder().id(5L).name("P5").category(cat2).location(createPoint(109.2, 12.2)).build();
        Place p6 = Place.builder().id(6L).name("P6").category(cat2).location(createPoint(109.2, 12.2)).build();

        List<Place> places = List.of(p1, p2, p3, p4, p5, p6);

        when(tripRepository.findById(100L)).thenReturn(Optional.of(trip));
        when(placeRepository.findAllByCityIgnoreCaseAndIsActiveTrueAndIsVerifiedTrue("Nha Trang")).thenReturn(places);

        // Mock scores
        // Cat1 scores: p1=10, p2=9, p3=8
        when(placeScoringService.score(eq(p1), anySet(), anyString(), anyDouble(), anyDouble()))
                .thenReturn(new PlaceScore(p1, 10.0, 1.0, 1.0, 1.0, 0.0));
        when(placeScoringService.score(eq(p2), anySet(), anyString(), anyDouble(), anyDouble()))
                .thenReturn(new PlaceScore(p2, 9.0, 1.0, 1.0, 1.0, 0.0));
        when(placeScoringService.score(eq(p3), anySet(), anyString(), anyDouble(), anyDouble()))
                .thenReturn(new PlaceScore(p3, 8.0, 1.0, 1.0, 1.0, 0.0));

        // Cat2 scores: p4=7, p5=6, p6=5
        when(placeScoringService.score(eq(p4), anySet(), anyString(), anyDouble(), anyDouble()))
                .thenReturn(new PlaceScore(p4, 7.0, 1.0, 1.0, 1.0, 0.0));
        when(placeScoringService.score(eq(p5), anySet(), anyString(), anyDouble(), anyDouble()))
                .thenReturn(new PlaceScore(p5, 6.0, 1.0, 1.0, 1.0, 0.0));
        when(placeScoringService.score(eq(p6), anySet(), anyString(), anyDouble(), anyDouble()))
                .thenReturn(new PlaceScore(p6, 5.0, 1.0, 1.0, 1.0, 0.0));

        // Act
        // Target: 3 days * 2 places/day = 6 places
        List<Place> result = selectCandidatePlacesUseCase.execute(100L);

        // Assert
        assertEquals(6, result.size());
        // Since we have round-robin:
        // Round 1: Top of cat1 (p1), Top of cat2 (p4) -> p1, p4
        // Round 2: Next of cat1 (p2), Next of cat2 (p5) -> p2, p5
        // Round 3: Next of cat1 (p3), Next of cat2 (p6) -> p3, p6
        // Result order should be: p1, p4, p2, p5, p3, p6
        assertEquals("P1", result.get(0).getName());
        assertEquals("P4", result.get(1).getName());
        assertEquals("P2", result.get(2).getName());
        assertEquals("P5", result.get(3).getName());
        assertEquals("P3", result.get(4).getName());
        assertEquals("P6", result.get(5).getName());
    }

    @Test
    void execute_TripNotFound_ShouldThrowResourceNotFoundException() {
        // Arrange
        when(tripRepository.findById(100L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> selectCandidatePlacesUseCase.execute(100L));
    }

    @Test
    void execute_NoMatchingPlaces_ShouldReturnEmptyList() {
        // Arrange
        when(tripRepository.findById(100L)).thenReturn(Optional.of(trip));
        when(placeRepository.findAllByCityIgnoreCaseAndIsActiveTrueAndIsVerifiedTrue("Nha Trang"))
                .thenReturn(Collections.emptyList());

        // Act
        List<Place> result = selectCandidatePlacesUseCase.execute(100L);

        // Assert
        assertTrue(result.isEmpty());
        verifyNoInteractions(placeScoringService);
    }

    @Test
    void execute_WhenAvailablePlacesLessThanTarget_ShouldReturnAllWithoutDuplicates() {
        PlaceCategory category = PlaceCategory.builder().id(1L).name("Beach").build();
        Place p1 = Place.builder().id(1L).name("P1").category(category).location(createPoint(109.1, 12.1)).build();
        Place p2 = Place.builder().id(2L).name("P2").category(category).location(createPoint(109.2, 12.2)).build();

        when(tripRepository.findById(100L)).thenReturn(Optional.of(trip));
        when(placeRepository.findAllByCityIgnoreCaseAndIsActiveTrueAndIsVerifiedTrue("Nha Trang"))
                .thenReturn(List.of(p1, p2));
        when(placeScoringService.score(eq(p1), anySet(), anyString(), anyDouble(), anyDouble()))
                .thenReturn(new PlaceScore(p1, 10.0, 1.0, 1.0, 1.0, 0.0));
        when(placeScoringService.score(eq(p2), anySet(), anyString(), anyDouble(), anyDouble()))
                .thenReturn(new PlaceScore(p2, 9.0, 1.0, 1.0, 1.0, 0.0));

        List<Place> result = selectCandidatePlacesUseCase.execute(100L);

        assertEquals(2, result.size());
        assertEquals(Set.of(1L, 2L), result.stream().map(Place::getId).collect(java.util.stream.Collectors.toSet()));
    }

    @Test
    void execute_WhenPlaceCategoryIsNull_ShouldUseFallbackCategoryBucket() {
        PlaceCategory category = PlaceCategory.builder().id(1L).name("Beach").build();
        Place categorizedPlace = Place.builder().id(1L).name("P1").category(category).location(createPoint(109.1, 12.1)).build();
        Place uncategorizedPlace = Place.builder().id(2L).name("P2").category(null).location(createPoint(109.2, 12.2)).build();

        when(tripRepository.findById(100L)).thenReturn(Optional.of(trip));
        when(placeRepository.findAllByCityIgnoreCaseAndIsActiveTrueAndIsVerifiedTrue("Nha Trang"))
                .thenReturn(List.of(categorizedPlace, uncategorizedPlace));
        when(placeScoringService.score(eq(categorizedPlace), anySet(), anyString(), anyDouble(), anyDouble()))
                .thenReturn(new PlaceScore(categorizedPlace, 10.0, 1.0, 1.0, 1.0, 0.0));
        when(placeScoringService.score(eq(uncategorizedPlace), anySet(), anyString(), anyDouble(), anyDouble()))
                .thenReturn(new PlaceScore(uncategorizedPlace, 9.0, 1.0, 1.0, 1.0, 0.0));

        List<Place> result = selectCandidatePlacesUseCase.execute(100L);

        assertEquals(2, result.size());
        assertEquals(Set.of("P1", "P2"), result.stream().map(Place::getName).collect(java.util.stream.Collectors.toSet()));
    }

    @Test
    void execute_ShouldNormalizeTripInterestsToLowercaseBeforeScoring() {
        Place place = Place.builder().id(1L).name("P1").location(createPoint(109.1, 12.1)).build();
        trip.setInterests(List.of("Beach", "FOOD"));

        when(tripRepository.findById(100L)).thenReturn(Optional.of(trip));
        when(placeRepository.findAllByCityIgnoreCaseAndIsActiveTrueAndIsVerifiedTrue("Nha Trang"))
                .thenReturn(List.of(place));
        when(placeScoringService.score(eq(place), anySet(), anyString(), anyDouble(), anyDouble()))
                .thenReturn(new PlaceScore(place, 10.0, 1.0, 1.0, 1.0, 0.0));

        selectCandidatePlacesUseCase.execute(100L);

        verify(placeScoringService).score(eq(place), eq(Set.of("beach", "food")), eq("MID_RANGE"), anyDouble(), anyDouble());
    }
}
