package com.tripwise.itinerary.domain.service;

import com.tripwise.itinerary.domain.ItineraryDayPlan;
import com.tripwise.itinerary.domain.ItineraryItemPlan;
import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.route.domain.RouteResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ItineraryGroupingServiceTest {

    private ItineraryGroupingService itineraryGroupingService;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @BeforeEach
    void setUp() {
        itineraryGroupingService = new ItineraryGroupingService();
    }

    private Point createPoint(double lon, double lat) {
        return geometryFactory.createPoint(new Coordinate(lon, lat));
    }

    @Test
    void groupPlaces_WithHappyPath_ShouldGroupCorrectlyByProximity() {
        // Arrange
        // Group A: 3 places close to each other (around center A)
        Place p1 = Place.builder().id(1L).name("A1").location(createPoint(109.10, 12.10)).durationMinutes(60).build();
        Place p2 = Place.builder().id(2L).name("A2").location(createPoint(109.11, 12.11)).durationMinutes(60).build();
        Place p3 = Place.builder().id(3L).name("A3").location(createPoint(109.09, 12.09)).durationMinutes(60).build();

        // Group B: 3 places close to each other (around center B, far from A)
        Place p4 = Place.builder().id(4L).name("B1").location(createPoint(109.80, 12.80)).durationMinutes(60).build();
        Place p5 = Place.builder().id(5L).name("B2").location(createPoint(109.81, 12.81)).durationMinutes(60).build();
        Place p6 = Place.builder().id(6L).name("B3").location(createPoint(109.79, 12.79)).durationMinutes(60).build();

        List<Place> places = List.of(p1, p2, p3, p4, p5, p6);

        // Act
        // 2 days, 3 places per day
        List<ItineraryDayPlan> plans = itineraryGroupingService.groupPlaces(places, 2, 3);

        // Assert
        assertEquals(2, plans.size());

        ItineraryDayPlan day1 = plans.get(0);
        ItineraryDayPlan day2 = plans.get(1);

        assertEquals(3, day1.getItems().size());
        assertEquals(3, day2.getItems().size());

        // Verify that A1, A2, A3 are grouped together in one day, and B1, B2, B3 in the other
        // Let's check first elements' prefix to differentiate groups
        String firstPrefix = day1.getItems().get(0).getPlace().getName().substring(0, 1);
        String secondPrefix = day2.getItems().get(0).getPlace().getName().substring(0, 1);

        assertNotEquals(firstPrefix, secondPrefix);

        // Verify that all items in day1 share the same prefix (belong to same cluster)
        assertTrue(day1.getItems().stream().allMatch(item -> item.getPlace().getName().startsWith(firstPrefix)));
        assertTrue(day2.getItems().stream().allMatch(item -> item.getPlace().getName().startsWith(secondPrefix)));
    }

    @Test
    void groupPlaces_RouteOptimization_ShouldOrderLocationsByProximity() {
        // Arrange
        // P1 is the seed. P2 is close to P1. P3 is far from P1 but closer to P2 than P1 is.
        // Seed first, then nearest: P1 -> P2 -> P3
        Place p1 = Place.builder().id(1L).name("P1").location(createPoint(109.0, 12.0)).durationMinutes(60).build();
        Place p2 = Place.builder().id(2L).name("P2").location(createPoint(109.0, 12.1)).durationMinutes(60).build();
        Place p3 = Place.builder().id(3L).name("P3").location(createPoint(109.0, 12.15)).durationMinutes(60).build();

        List<Place> places = List.of(p1, p2, p3);

        // Act
        List<ItineraryDayPlan> plans = itineraryGroupingService.groupPlaces(places, 1, 3);

        // Assert
        assertEquals(1, plans.size());
        List<ItineraryItemPlan> items = plans.get(0).getItems();
        assertEquals(3, items.size());

        // Nearest neighbor route: P1 (seed) -> P2 -> P3
        assertEquals("P1", items.get(0).getPlace().getName());
        assertEquals("P2", items.get(1).getPlace().getName());
        assertEquals("P3", items.get(2).getPlace().getName());
        assertEquals(0, items.get(0).getDistanceFromPreviousMeters());
        assertTrue(items.get(1).getDistanceFromPreviousMeters() > 0);
        assertTrue(items.get(2).getDistanceFromPreviousMeters() > 0);
    }

    @Test
    void groupPlaces_WithRouteProvider_ShouldUseRouteDistanceForOrderingAndMetrics() {
        Place p1 = Place.builder().id(1L).name("P1").location(createPoint(109.0, 12.0)).durationMinutes(60).build();
        Place p2 = Place.builder().id(2L).name("P2").location(createPoint(109.1, 12.1)).durationMinutes(60).build();
        Place p3 = Place.builder().id(3L).name("P3").location(createPoint(109.2, 12.2)).durationMinutes(60).build();

        List<ItineraryDayPlan> plans = itineraryGroupingService.groupPlaces(
                List.of(p1, p2, p3),
                1,
                3,
                (origin, destination) -> {
                    String key = origin.getName() + "->" + destination.getName();
                    return switch (key) {
                        case "P1->P2" -> new RouteResult(9000, 600, null);
                        case "P1->P3" -> new RouteResult(500, 60, null);
                        case "P3->P2" -> new RouteResult(700, 75, null);
                        case "P2->P3" -> new RouteResult(700, 75, null);
                        case "P3->P1" -> new RouteResult(500, 60, null);
                        case "P2->P1" -> new RouteResult(9000, 600, null);
                        default -> new RouteResult(20000, 1200, null);
                    };
                }
        );

        List<ItineraryItemPlan> items = plans.get(0).getItems();
        assertEquals("P1", items.get(0).getPlace().getName());
        assertEquals("P3", items.get(1).getPlace().getName());
        assertEquals("P2", items.get(2).getPlace().getName());
        assertEquals(0, items.get(0).getDistanceFromPreviousMeters());
        assertEquals(500, items.get(1).getDistanceFromPreviousMeters());
        assertEquals(60, items.get(1).getDurationFromPreviousSeconds());
        assertEquals(700, items.get(2).getDistanceFromPreviousMeters());
        assertEquals(75, items.get(2).getDurationFromPreviousSeconds());
    }

    @Test
    void groupPlaces_Scheduling_ShouldAssignSlotAndCalculateCorrectTimes() {
        // Arrange
        Place p1 = Place.builder().id(1L).name("P1").location(createPoint(109.0, 12.0)).durationMinutes(90).build(); // 90 min
        Place p2 = Place.builder().id(2L).name("P2").location(createPoint(109.0, 12.1)).durationMinutes(120).build(); // 120 min
        Place p3 = Place.builder().id(3L).name("P3").location(createPoint(109.0, 12.2)).durationMinutes(60).build(); // 60 min

        List<Place> places = List.of(p1, p2, p3);

        // Act
        List<ItineraryDayPlan> plans = itineraryGroupingService.groupPlaces(places, 1, 3);

        // Assert
        List<ItineraryItemPlan> items = plans.get(0).getItems();
        assertEquals(3, items.size());

        // Place 1 -> MORNING (08:00 - 09:30)
        ItineraryItemPlan item1 = items.get(0);
        assertEquals(TimeSlot.MORNING, item1.getSlot());
        assertEquals(LocalTime.of(8, 0), item1.getStartTime());
        assertEquals(LocalTime.of(9, 30), item1.getEndTime());

        // Place 2 -> AFTERNOON (13:30 - 15:30)
        ItineraryItemPlan item2 = items.get(1);
        assertEquals(TimeSlot.AFTERNOON, item2.getSlot());
        assertEquals(LocalTime.of(13, 30), item2.getStartTime());
        assertEquals(LocalTime.of(15, 30), item2.getEndTime());

        // Place 3 -> EVENING (18:00 - 19:00)
        ItineraryItemPlan item3 = items.get(2);
        assertEquals(TimeSlot.EVENING, item3.getSlot());
        assertEquals(LocalTime.of(18, 0), item3.getStartTime());
        assertEquals(LocalTime.of(19, 0), item3.getEndTime());
    }

    @Test
    void groupPlaces_With4PlacesInSameDay_ShouldScheduleSequentiallyInMorning() {
        // Arrange
        Place p1 = Place.builder().id(1L).name("P1").location(createPoint(109.0, 12.0)).durationMinutes(60).build();
        Place p2 = Place.builder().id(2L).name("P2").location(createPoint(109.0, 12.05)).durationMinutes(60).build();
        Place p3 = Place.builder().id(3L).name("P3").location(createPoint(109.0, 12.1)).durationMinutes(60).build();
        Place p4 = Place.builder().id(4L).name("P4").location(createPoint(109.0, 12.15)).durationMinutes(60).build();

        List<Place> places = List.of(p1, p2, p3, p4);

        // Act
        List<ItineraryDayPlan> plans = itineraryGroupingService.groupPlaces(places, 1, 4);

        // Assert
        List<ItineraryItemPlan> items = plans.get(0).getItems();
        assertEquals(4, items.size());

        // P1 -> MORNING (08:00 - 09:00)
        assertEquals(TimeSlot.MORNING, items.get(0).getSlot());
        assertEquals(LocalTime.of(8, 0), items.get(0).getStartTime());
        assertEquals(LocalTime.of(9, 0), items.get(0).getEndTime());

        // P2 -> MORNING (09:30 - 10:30) (ends + 30m buffer)
        assertEquals(TimeSlot.MORNING, items.get(1).getSlot());
        assertEquals(LocalTime.of(9, 30), items.get(1).getStartTime());
        assertEquals(LocalTime.of(10, 30), items.get(1).getEndTime());

        // P3 -> AFTERNOON (13:30 - 14:30)
        assertEquals(TimeSlot.AFTERNOON, items.get(2).getSlot());

        // P4 -> EVENING (18:00 - 19:00)
        assertEquals(TimeSlot.EVENING, items.get(3).getSlot());
    }

    @Test
    void groupPlaces_WhenNumDaysIsInvalid_ShouldReturnEmptyList() {
        Place place = Place.builder().id(1L).name("P1").location(createPoint(109.0, 12.0)).build();

        List<ItineraryDayPlan> plans = itineraryGroupingService.groupPlaces(List.of(place), 0, 3);

        assertTrue(plans.isEmpty());
    }

    @Test
    void groupPlaces_WhenPlacesLessThanDays_ShouldKeepRemainingDaysEmpty() {
        Place p1 = Place.builder().id(1L).name("P1").location(createPoint(109.0, 12.0)).durationMinutes(60).build();
        Place p2 = Place.builder().id(2L).name("P2").location(createPoint(109.1, 12.1)).durationMinutes(60).build();

        List<ItineraryDayPlan> plans = itineraryGroupingService.groupPlaces(List.of(p1, p2), 4, 2);

        assertEquals(4, plans.size());
        assertEquals(1, plans.get(0).getItems().size());
        assertEquals(1, plans.get(1).getItems().size());
        assertTrue(plans.get(2).getItems().isEmpty());
        assertTrue(plans.get(3).getItems().isEmpty());
    }

    @Test
    void groupPlaces_WhenPlaceCountExceedsCapacity_ShouldStillAssignEveryPlace() {
        List<Place> places = List.of(
                Place.builder().id(1L).name("P1").location(createPoint(109.0, 12.0)).durationMinutes(60).build(),
                Place.builder().id(2L).name("P2").location(createPoint(109.01, 12.01)).durationMinutes(60).build(),
                Place.builder().id(3L).name("P3").location(createPoint(109.02, 12.02)).durationMinutes(60).build(),
                Place.builder().id(4L).name("P4").location(createPoint(109.8, 12.8)).durationMinutes(60).build(),
                Place.builder().id(5L).name("P5").location(createPoint(109.81, 12.81)).durationMinutes(60).build()
        );

        List<ItineraryDayPlan> plans = itineraryGroupingService.groupPlaces(places, 2, 2);

        assertEquals(2, plans.size());
        int totalAssigned = plans.stream().mapToInt(plan -> plan.getItems().size()).sum();
        assertEquals(5, totalAssigned);
    }
}
