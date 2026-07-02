package com.tripwise.trip.application.service;

import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.trip.infrastructure.persistence.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DeleteTripUseCase {

    private final TripAuthorizationService tripAuthorizationService;
    private final TripRepository tripRepository;

    @Transactional
    public void execute(String userEmail, Long tripId) {
        Trip trip = tripAuthorizationService.authorizeAndGetTrip(userEmail, tripId);
        tripRepository.delete(trip);
    }
}
