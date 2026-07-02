package com.tripwise.trip.application.service;

import com.tripwise.common.exception.ForbiddenException;
import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.common.exception.UnauthorizedException;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.trip.infrastructure.persistence.repository.TripRepository;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.UserStatus;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TripAuthorizationService {

    private final UserRepository userRepository;
    private final TripRepository tripRepository;

    @Transactional(readOnly = true)
    public Trip authorizeAndGetTrip(String userEmail, Long tripId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("User account is not active");
        }

        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip không tồn tại"));

        if (!trip.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("Bạn không có quyền truy cập thông tin chuyến đi này");
        }

        return trip;
    }
}
