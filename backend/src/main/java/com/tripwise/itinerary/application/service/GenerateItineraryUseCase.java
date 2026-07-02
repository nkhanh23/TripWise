package com.tripwise.itinerary.application.service;

import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.itinerary.application.dto.GeneratedItineraryResponse;
import com.tripwise.itinerary.application.mapper.GeneratedItineraryResponseMapper;
import com.tripwise.itinerary.domain.ItineraryDayPlan;
import com.tripwise.itinerary.domain.entity.ItineraryDay;
import com.tripwise.itinerary.domain.service.ItineraryGroupingService;
import com.tripwise.itinerary.infrastructure.persistence.service.ItineraryPersistenceService;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.route.application.service.CalculateRouteUseCase;
import com.tripwise.route.domain.RouteResult;
import com.tripwise.trip.application.dto.CreateTripRequest;
import com.tripwise.trip.application.dto.TripResponse;
import com.tripwise.trip.application.service.CreateTripUseCase;
import com.tripwise.trip.application.service.TripAuthorizationService;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.weather.application.service.WeatherAdjustmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GenerateItineraryUseCase {

    private static final String DEFAULT_ROUTE_PROFILE = "driving";

    private final CreateTripUseCase createTripUseCase;
    private final TripAuthorizationService tripAuthorizationService;
    private final SelectCandidatePlacesUseCase selectCandidatePlacesUseCase;
    private final ItineraryGroupingService itineraryGroupingService;
    private final ItineraryPersistenceService itineraryPersistenceService;
    private final GenerateDescriptionUseCase generateDescriptionUseCase;
    private final GeneratedItineraryResponseMapper generatedItineraryResponseMapper;
    private final CalculateRouteUseCase calculateRouteUseCase;
    private final WeatherAdjustmentService weatherAdjustmentService;

    @Value("${tripwise.itinerary.places-per-day:4}")
    private int placesPerDay;

    public GeneratedItineraryResponse execute(String userEmail, CreateTripRequest request) {
        TripResponse tripResponse = createTripUseCase.execute(userEmail, request);

        Trip trip = tripAuthorizationService.authorizeAndGetTrip(userEmail, tripResponse.getId());
        List<Place> candidatePlaces = selectCandidatePlacesUseCase.execute(trip.getId());
        if (candidatePlaces.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy địa điểm phù hợp để tạo lịch trình cho điểm đến này");
        }

        Map<String, RouteResult> routeCache = new HashMap<>();
        List<ItineraryDayPlan> dayPlans = itineraryGroupingService.groupPlaces(
                candidatePlaces,
                trip.getDays(),
                placesPerDay,
                (origin, destination) -> routeCache.computeIfAbsent(
                        buildRouteMemoKey(origin, destination),
                        ignored -> calculateRouteBetween(origin, destination)
                )
        );
        List<ItineraryDayPlan> adjustedDayPlans = weatherAdjustmentService.adjust(trip, dayPlans);

        Map<Long, Place> placeMap = candidatePlaces.stream()
                .collect(Collectors.toMap(Place::getId, Function.identity()));
        itineraryPersistenceService.saveItinerary(trip, adjustedDayPlans, placeMap);

        List<ItineraryDay> savedItineraryDays = itineraryPersistenceService.getItineraryByTripIdWithPlaces(trip.getId());
        generateDescriptionUseCase.execute(trip, savedItineraryDays);
        return generatedItineraryResponseMapper.toResponse(trip, savedItineraryDays);
    }

    private RouteResult calculateRouteBetween(Place origin, Place destination) {
        return calculateRouteUseCase.execute(
                origin.getLocation().getY(),
                origin.getLocation().getX(),
                destination.getLocation().getY(),
                destination.getLocation().getX(),
                DEFAULT_ROUTE_PROFILE
        );
    }

    private String buildRouteMemoKey(Place origin, Place destination) {
        return origin.getId() + "->" + destination.getId() + ":" + DEFAULT_ROUTE_PROFILE;
    }
}
