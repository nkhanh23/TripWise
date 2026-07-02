package com.tripwise.trip.application.service;

import com.tripwise.itinerary.application.dto.ItineraryResponse;
import com.tripwise.itinerary.application.service.GetItineraryDetailUseCase;
import com.tripwise.trip.application.dto.TripDetailResponse;
import com.tripwise.trip.application.mapper.TripMapper;
import com.tripwise.trip.domain.entity.Trip;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GetTripDetailUseCase {

    private final TripAuthorizationService tripAuthorizationService;
    private final TripMapper tripMapper;
    private final GetItineraryDetailUseCase getItineraryDetailUseCase;

    @Transactional(readOnly = true)
    public TripDetailResponse execute(String userEmail, Long tripId) {
        Trip trip = tripAuthorizationService.authorizeAndGetTrip(userEmail, tripId);
        TripDetailResponse response = tripMapper.toDetailResponse(trip);
        ItineraryResponse itineraryResponse = getItineraryDetailUseCase.execute(tripId);
        response.setItinerary(itineraryResponse);
        return response;
    }
}
