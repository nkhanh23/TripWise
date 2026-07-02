package com.tripwise.trip.application.service;

import com.tripwise.ai.application.dto.ParsedTripRequest;
import com.tripwise.ai.application.service.ParseTripRequirementUseCase;
import com.tripwise.common.exception.UnauthorizedException;
import com.tripwise.trip.application.dto.CreateTripRequest;
import com.tripwise.trip.application.dto.TripResponse;
import com.tripwise.trip.application.mapper.TripMapper;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.trip.domain.enums.TripStatus;
import com.tripwise.trip.infrastructure.persistence.repository.TripRepository;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.UserStatus;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class CreateTripUseCase {

    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    private final ParseTripRequirementUseCase parseTripRequirementUseCase;
    private final TripMapper tripMapper;

    @Transactional
    public TripResponse execute(String userEmail, CreateTripRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("User account is not active");
        }

        // Call AI service to parse raw request
        ParsedTripRequest parsedRequest = parseTripRequirementUseCase.execute(request.getRequest());

        // Create Trip entity
        Trip trip = Trip.builder()
                .user(user)
                .destination(parsedRequest.getDestination())
                .days(parsedRequest.getNumDays())
                .nights(parsedRequest.getNumNights() != null ? parsedRequest.getNumNights() : 0)
                .budget(parsedRequest.getBudgetLevel())
                .interests(parsedRequest.getInterests())
                .preferences(parsedRequest.getPreferences())
                .status(TripStatus.GENERATED)
                .aiMetadata(Map.of("rawRequest", request.getRequest()))
                .build();

        Trip savedTrip = tripRepository.save(trip);

        return tripMapper.toResponse(savedTrip);
    }
}
