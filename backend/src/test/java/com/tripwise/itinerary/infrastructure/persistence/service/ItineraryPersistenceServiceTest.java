package com.tripwise.itinerary.infrastructure.persistence.service;

import com.tripwise.itinerary.domain.ItineraryDayPlan;
import com.tripwise.itinerary.domain.ItineraryItemPlan;
import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.itinerary.domain.entity.ItineraryDay;
import com.tripwise.itinerary.domain.entity.ItineraryItem;
import com.tripwise.itinerary.infrastructure.persistence.repository.ItineraryDayRepository;
import com.tripwise.itinerary.infrastructure.persistence.repository.ItineraryItemRepository;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.domain.entity.PlaceCategory;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.trip.domain.enums.TripStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ItineraryPersistenceServiceTest {

    @Mock
    private ItineraryDayRepository itineraryDayRepository;

    @Mock
    private ItineraryItemRepository itineraryItemRepository;

    @InjectMocks
    private ItineraryPersistenceService itineraryPersistenceService;

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    private Trip trip;
    private Place place1;
    private Place place2;

    @BeforeEach
    void setUp() {
        trip = Trip.builder()
                .id(1L)
                .destination("Nha Trang")
                .days(2)
                .nights(1)
                .status(TripStatus.DRAFT)
                .build();

        PlaceCategory category = PlaceCategory.builder().id(1L).name("Beach").build();

        place1 = Place.builder()
                .id(10L)
                .name("Bai Dai")
                .city("Nha Trang")
                .category(category)
                .location(createPoint(109.15, 12.25))
                .estimatedCost(BigDecimal.valueOf(50000))
                .durationMinutes(90)
                .indoor(false)
                .isActive(true)
                .isVerified(true)
                .build();

        place2 = Place.builder()
                .id(11L)
                .name("Nha Trang Cathedral")
                .city("Nha Trang")
                .category(category)
                .location(createPoint(109.19, 12.24))
                .estimatedCost(BigDecimal.valueOf(30000))
                .durationMinutes(60)
                .indoor(true)
                .isActive(true)
                .isVerified(true)
                .build();
    }

    private Point createPoint(double lon, double lat) {
        return geometryFactory.createPoint(new Coordinate(lon, lat));
    }

    @Test
    void saveItinerary_WithHappyPath_ShouldSaveDaysAndItems() {
        ItineraryItemPlan itemPlan1 = new ItineraryItemPlan(place1, TimeSlot.MORNING, LocalTime.of(8, 0), LocalTime.of(9, 30), 0, 0);
        ItineraryItemPlan itemPlan2 = new ItineraryItemPlan(place2, TimeSlot.AFTERNOON, LocalTime.of(13, 30), LocalTime.of(14, 30), 4200, 900);

        ItineraryDayPlan dayPlan1 = new ItineraryDayPlan(
                1,
                "Thoi tiet thuan loi cho hoat dong ngoai troi.",
                List.of(itemPlan1, itemPlan2)
        );

        ItineraryDay savedDay = ItineraryDay.builder()
                .id(100L)
                .trip(trip)
                .dayNumber(1)
                .dayTitle("Ngay 1")
                .totalDistanceMeters(0)
                .totalDurationSeconds(0)
                .build();

        when(itineraryDayRepository.save(any(ItineraryDay.class))).thenReturn(savedDay);

        List<ItineraryDay> result = itineraryPersistenceService.saveItinerary(trip, List.of(dayPlan1), Map.of());

        assertThat(result).hasSize(1);

        ArgumentCaptor<ItineraryDay> dayCaptor = ArgumentCaptor.forClass(ItineraryDay.class);
        verify(itineraryDayRepository, times(2)).save(dayCaptor.capture());
        ItineraryDay capturedDay = dayCaptor.getAllValues().get(0);
        assertThat(capturedDay.getTrip()).isEqualTo(trip);
        assertThat(capturedDay.getDayNumber()).isEqualTo(1);
        assertThat(capturedDay.getWeatherSummary()).isEqualTo("Thoi tiet thuan loi cho hoat dong ngoai troi.");

        ArgumentCaptor<ItineraryItem> itemCaptor = ArgumentCaptor.forClass(ItineraryItem.class);
        verify(itineraryItemRepository, times(2)).save(itemCaptor.capture());

        List<ItineraryItem> savedItems = itemCaptor.getAllValues();
        assertThat(savedItems.get(0).getPlace()).isEqualTo(place1);
        assertThat(savedItems.get(0).getTimeSlot()).isEqualTo(TimeSlot.MORNING);
        assertThat(savedItems.get(0).getStartTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(savedItems.get(0).getOrderIndex()).isEqualTo(0);

        assertThat(savedItems.get(1).getPlace()).isEqualTo(place2);
        assertThat(savedItems.get(1).getTimeSlot()).isEqualTo(TimeSlot.AFTERNOON);
        assertThat(savedItems.get(1).getOrderIndex()).isEqualTo(1);
        assertThat(savedItems.get(1).getDistanceFromPreviousMeters()).isEqualTo(4200);
        assertThat(savedItems.get(1).getDurationFromPreviousSeconds()).isEqualTo(900);

        ItineraryDay updatedDay = dayCaptor.getAllValues().get(1);
        assertThat(updatedDay.getTotalDistanceMeters()).isEqualTo(4200);
        assertThat(updatedDay.getTotalDurationSeconds()).isEqualTo(900);
    }

    @Test
    void saveItinerary_WithEmptyDayPlans_ShouldSaveNothing() {
        List<ItineraryDay> result = itineraryPersistenceService.saveItinerary(trip, Collections.emptyList(), Map.of());

        assertThat(result).isEmpty();
        verify(itineraryDayRepository).deleteByTripId(trip.getId());
        verify(itineraryDayRepository, never()).save(any());
        verify(itineraryItemRepository, never()).save(any());
    }

    @Test
    void deleteItineraryByTripId_ShouldCallRepository() {
        itineraryPersistenceService.deleteItineraryByTripId(1L);

        verify(itineraryDayRepository).deleteByTripId(1L);
    }

    @Test
    void getItineraryByTripId_ShouldReturnDaysWithItems() {
        ItineraryDay day = ItineraryDay.builder()
                .id(100L)
                .trip(trip)
                .dayNumber(1)
                .build();

        when(itineraryDayRepository.findByTripIdWithItems(1L)).thenReturn(List.of(day));

        List<ItineraryDay> result = itineraryPersistenceService.getItineraryByTripId(1L);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getDayNumber()).isEqualTo(1);
        verify(itineraryDayRepository).findByTripIdWithItems(1L);
    }

    @Test
    void saveItinerary_ShouldSetCorrectTimeSlotReason() {
        ItineraryItemPlan morningItem = new ItineraryItemPlan(place1, TimeSlot.MORNING, LocalTime.of(8, 0), LocalTime.of(9, 0));
        ItineraryItemPlan eveningItem = new ItineraryItemPlan(place2, TimeSlot.EVENING, LocalTime.of(18, 0), LocalTime.of(19, 0));

        ItineraryDayPlan dayPlan = new ItineraryDayPlan(1, List.of(morningItem, eveningItem));

        ItineraryDay savedDay = ItineraryDay.builder()
                .id(200L)
                .trip(trip)
                .dayNumber(1)
                .build();

        when(itineraryDayRepository.save(any(ItineraryDay.class))).thenReturn(savedDay);

        itineraryPersistenceService.saveItinerary(trip, List.of(dayPlan), Map.of());

        ArgumentCaptor<ItineraryItem> itemCaptor = ArgumentCaptor.forClass(ItineraryItem.class);
        verify(itineraryItemRepository, times(2)).save(itemCaptor.capture());

        List<ItineraryItem> savedItems = itemCaptor.getAllValues();
        assertThat(savedItems.get(0).getReason()).contains("ly tuong cho buoi sang");
        assertThat(savedItems.get(1).getReason()).contains("tuyet voi cho buoi toi");
    }
}
