package com.tripwise.itinerary.application.service;

import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.itinerary.application.dto.GeneratedItineraryResponse;
import com.tripwise.itinerary.application.dto.ItineraryDayResponse;
import com.tripwise.itinerary.application.mapper.GeneratedItineraryResponseMapper;
import com.tripwise.itinerary.domain.ItineraryDayPlan;
import com.tripwise.itinerary.domain.ItineraryItemPlan;
import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.itinerary.domain.entity.ItineraryDay;
import com.tripwise.itinerary.domain.entity.ItineraryItem;
import com.tripwise.itinerary.domain.service.ItineraryGroupingService;
import com.tripwise.itinerary.infrastructure.persistence.service.ItineraryPersistenceService;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.route.application.service.CalculateRouteUseCase;
import com.tripwise.trip.application.dto.CreateTripRequest;
import com.tripwise.trip.application.dto.TripResponse;
import com.tripwise.trip.application.service.CreateTripUseCase;
import com.tripwise.trip.application.service.TripAuthorizationService;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.trip.domain.enums.TripStatus;
import com.tripwise.weather.application.service.WeatherAdjustmentService;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenerateItineraryUseCaseTest {

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @Mock
    private CreateTripUseCase createTripUseCase;

    @Mock
    private TripAuthorizationService tripAuthorizationService;

    @Mock
    private SelectCandidatePlacesUseCase selectCandidatePlacesUseCase;

    @Mock
    private ItineraryGroupingService itineraryGroupingService;

    @Mock
    private ItineraryPersistenceService itineraryPersistenceService;

    @Mock
    private CalculateRouteUseCase calculateRouteUseCase;

    @Mock
    private WeatherAdjustmentService weatherAdjustmentService;

    @Mock
    private GenerateDescriptionUseCase generateDescriptionUseCase;

    @Mock
    private GeneratedItineraryResponseMapper generatedItineraryResponseMapper;

    @InjectMocks
    private GenerateItineraryUseCase generateItineraryUseCase;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(generateItineraryUseCase, "placesPerDay", 4);
    }

    private Point createPoint(double lon, double lat) {
        return geometryFactory.createPoint(new Coordinate(lon, lat));
    }

    @Test
    void execute_ShouldGenerateAndReturnFullItinerary() {
        CreateTripRequest request = new CreateTripRequest("Tôi muốn đi Nha Trang 2 ngày");
        TripResponse tripResponse = TripResponse.builder()
                .id(100L)
                .destination("Nha Trang")
                .days(2)
                .nights(1)
                .status(TripStatus.GENERATED)
                .build();
        Trip trip = Trip.builder()
                .id(100L)
                .destination("Nha Trang")
                .days(2)
                .nights(1)
                .status(TripStatus.GENERATED)
                .build();
        Place place = Place.builder()
                .id(10L)
                .name("Trần Phú Beach")
                .city("Nha Trang")
                .durationMinutes(120)
                .build();
        List<Place> candidatePlaces = List.of(place);
        List<ItineraryDayPlan> dayPlans = List.of(new ItineraryDayPlan(1, List.of(
                new ItineraryItemPlan(place, TimeSlot.MORNING, LocalTime.of(8, 0), LocalTime.of(10, 0))
        )));
        List<ItineraryDay> savedDays = List.of(ItineraryDay.builder()
                .dayNumber(1)
                .items(List.of(ItineraryItem.builder()
                        .orderIndex(0)
                        .place(place)
                        .timeSlot(TimeSlot.MORNING)
                        .startTime(LocalTime.of(8, 0))
                        .endTime(LocalTime.of(10, 0))
                        .build()))
                .build());
        GeneratedItineraryResponse expectedResponse = GeneratedItineraryResponse.builder()
                .id(100L)
                .destination("Nha Trang")
                .itineraryDays(List.of(ItineraryDayResponse.builder().dayNumber(1).build()))
                .build();

        when(createTripUseCase.execute("owner@example.com", request)).thenReturn(tripResponse);
        when(tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L)).thenReturn(trip);
        when(selectCandidatePlacesUseCase.execute(100L)).thenReturn(candidatePlaces);
        when(itineraryGroupingService.groupPlaces(eq(candidatePlaces), eq(2), eq(4), any())).thenReturn(dayPlans);
        when(weatherAdjustmentService.adjust(trip, dayPlans)).thenReturn(dayPlans);
        when(itineraryPersistenceService.getItineraryByTripIdWithPlaces(100L)).thenReturn(savedDays);
        when(generatedItineraryResponseMapper.toResponse(trip, savedDays)).thenReturn(expectedResponse);

        GeneratedItineraryResponse result = generateItineraryUseCase.execute("owner@example.com", request);

        assertThat(result).isEqualTo(expectedResponse);
        verify(itineraryPersistenceService).saveItinerary(eq(trip), eq(dayPlans),
                argThat((Map<Long, Place> placeMap) -> placeMap.size() == 1 && placeMap.containsKey(10L)));
        verify(generateDescriptionUseCase).execute(trip, savedDays);
    }

    @Test
    void execute_WhenNoCandidatePlaces_ShouldThrowNotFound() {
        CreateTripRequest request = new CreateTripRequest("Tôi muốn đi Atlantis 2 ngày");
        TripResponse tripResponse = TripResponse.builder().id(100L).build();
        Trip trip = Trip.builder().id(100L).days(2).build();

        when(createTripUseCase.execute("owner@example.com", request)).thenReturn(tripResponse);
        when(tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L)).thenReturn(trip);
        when(selectCandidatePlacesUseCase.execute(100L)).thenReturn(List.of());

        assertThrows(ResourceNotFoundException.class,
                () -> generateItineraryUseCase.execute("owner@example.com", request));
    }

    @Test
    void execute_WhenGroupingReturnsNoPlans_ShouldStillPersistEmptyItinerary() {
        CreateTripRequest request = new CreateTripRequest("TÃ´i muá»‘n Ä‘i Nha Trang 2 ngÃ y");
        TripResponse tripResponse = TripResponse.builder().id(100L).build();
        Trip trip = Trip.builder().id(100L).days(2).destination("Nha Trang").build();
        Place place = Place.builder().id(10L).name("Bai Dai").build();
        GeneratedItineraryResponse expectedResponse = GeneratedItineraryResponse.builder()
                .id(100L)
                .destination("Nha Trang")
                .itineraryDays(List.of())
                .build();

        when(createTripUseCase.execute("owner@example.com", request)).thenReturn(tripResponse);
        when(tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L)).thenReturn(trip);
        when(selectCandidatePlacesUseCase.execute(100L)).thenReturn(List.of(place));
        when(itineraryGroupingService.groupPlaces(eq(List.of(place)), eq(2), eq(4), any())).thenReturn(List.of());
        when(weatherAdjustmentService.adjust(trip, List.of())).thenReturn(List.of());
        when(itineraryPersistenceService.getItineraryByTripIdWithPlaces(100L)).thenReturn(List.of());
        when(generatedItineraryResponseMapper.toResponse(trip, List.of())).thenReturn(expectedResponse);

        GeneratedItineraryResponse result = generateItineraryUseCase.execute("owner@example.com", request);

        assertThat(result).isEqualTo(expectedResponse);
        verify(itineraryPersistenceService).saveItinerary(eq(trip), eq(List.of()),
                argThat((Map<Long, Place> placeMap) -> placeMap.size() == 1 && placeMap.containsKey(10L)));
        verify(generateDescriptionUseCase).execute(trip, List.of());
    }

    @Test
    void execute_ShouldProvideRealRouteCalculatorToGroupingService() {
        CreateTripRequest request = new CreateTripRequest("route aware itinerary");
        TripResponse tripResponse = TripResponse.builder().id(100L).build();
        Trip trip = Trip.builder().id(100L).days(1).destination("Nha Trang").build();
        Place origin = Place.builder()
                .id(10L)
                .name("Origin")
                .location(createPoint(109.19, 12.24))
                .durationMinutes(60)
                .build();
        Place destination = Place.builder()
                .id(11L)
                .name("Destination")
                .location(createPoint(109.20, 12.25))
                .durationMinutes(60)
                .build();
        List<Place> candidatePlaces = List.of(origin, destination);
        List<ItineraryDayPlan> dayPlans = List.of();
        GeneratedItineraryResponse expectedResponse = GeneratedItineraryResponse.builder()
                .id(100L)
                .destination("Nha Trang")
                .itineraryDays(List.of())
                .build();

        when(createTripUseCase.execute("owner@example.com", request)).thenReturn(tripResponse);
        when(tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L)).thenReturn(trip);
        when(selectCandidatePlacesUseCase.execute(100L)).thenReturn(candidatePlaces);
        when(calculateRouteUseCase.execute(12.24, 109.19, 12.25, 109.2, "driving"))
                .thenReturn(new com.tripwise.route.domain.RouteResult(1500, 300, null));
        when(itineraryGroupingService.groupPlaces(eq(candidatePlaces), eq(1), eq(4), any()))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    java.util.function.BiFunction<Place, Place, com.tripwise.route.domain.RouteResult> routeProvider =
                            invocation.getArgument(3);
                    com.tripwise.route.domain.RouteResult route = routeProvider.apply(origin, destination);
                    assertThat(route.distanceMeters()).isEqualTo(1500);
                    assertThat(route.durationSeconds()).isEqualTo(300);
                    return dayPlans;
                });
        when(weatherAdjustmentService.adjust(trip, dayPlans)).thenReturn(dayPlans);
        when(itineraryPersistenceService.getItineraryByTripIdWithPlaces(100L)).thenReturn(List.of());
        when(generatedItineraryResponseMapper.toResponse(trip, List.of())).thenReturn(expectedResponse);

        GeneratedItineraryResponse result = generateItineraryUseCase.execute("owner@example.com", request);

        assertThat(result).isEqualTo(expectedResponse);
        verify(calculateRouteUseCase).execute(12.24, 109.19, 12.25, 109.2, "driving");
    }

    @Test
    void execute_ShouldPersistWeatherAdjustedPlan() {
        CreateTripRequest request = new CreateTripRequest("weather aware itinerary");
        TripResponse tripResponse = TripResponse.builder().id(100L).build();
        Trip trip = Trip.builder()
                .id(100L)
                .days(1)
                .destination("Nha Trang")
                .build();
        Place place = Place.builder()
                .id(10L)
                .name("Tran Phu Beach")
                .city("Nha Trang")
                .durationMinutes(120)
                .build();
        List<Place> candidatePlaces = List.of(place);
        List<ItineraryDayPlan> groupedPlans = List.of(
                new ItineraryDayPlan(1, List.of(
                        new ItineraryItemPlan(place, TimeSlot.MORNING, LocalTime.of(8, 0), LocalTime.of(10, 0))
                ))
        );
        List<ItineraryDayPlan> adjustedPlans = List.of(
                new ItineraryDayPlan(1, "Thoi tiet thuan loi cho hoat dong ngoai troi.", groupedPlans.getFirst().getItems())
        );
        GeneratedItineraryResponse expectedResponse = GeneratedItineraryResponse.builder()
                .id(100L)
                .destination("Nha Trang")
                .itineraryDays(List.of())
                .build();

        when(createTripUseCase.execute("owner@example.com", request)).thenReturn(tripResponse);
        when(tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L)).thenReturn(trip);
        when(selectCandidatePlacesUseCase.execute(100L)).thenReturn(candidatePlaces);
        when(itineraryGroupingService.groupPlaces(eq(candidatePlaces), eq(1), eq(4), any())).thenReturn(groupedPlans);
        when(weatherAdjustmentService.adjust(trip, groupedPlans)).thenReturn(adjustedPlans);
        when(itineraryPersistenceService.getItineraryByTripIdWithPlaces(100L)).thenReturn(List.of());
        when(generatedItineraryResponseMapper.toResponse(trip, List.of())).thenReturn(expectedResponse);

        GeneratedItineraryResponse result = generateItineraryUseCase.execute("owner@example.com", request);

        assertThat(result).isEqualTo(expectedResponse);
        verify(itineraryPersistenceService).saveItinerary(eq(trip), eq(adjustedPlans), any());
    }
}
