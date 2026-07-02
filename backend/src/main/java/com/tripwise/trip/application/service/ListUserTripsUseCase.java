package com.tripwise.trip.application.service;

import com.tripwise.common.exception.UnauthorizedException;
import com.tripwise.trip.application.dto.TripResponse;
import com.tripwise.trip.application.mapper.TripMapper;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.trip.infrastructure.persistence.repository.TripRepository;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.UserStatus;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ListUserTripsUseCase {

    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    private final TripMapper tripMapper;

    @Transactional(readOnly = true)
    public Page<TripResponse> execute(String userEmail, Pageable pageable) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("User account is not active");
        }

        Page<Trip> trips = tripRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);

        return trips.map(tripMapper::toResponse);
    }
}
