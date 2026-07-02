package com.tripwise.trip.application.service;

import com.tripwise.common.exception.ForbiddenException;
import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.common.exception.UnauthorizedException;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.trip.infrastructure.persistence.repository.TripRepository;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.UserStatus;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripAuthorizationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TripRepository tripRepository;

    @InjectMocks
    private TripAuthorizationService tripAuthorizationService;

    private User activeUser;
    private User otherUser;

    @BeforeEach
    void setUp() {
        activeUser = User.builder()
                .id(1L)
                .email("owner@example.com")
                .status(UserStatus.ACTIVE)
                .build();
        otherUser = User.builder()
                .id(2L)
                .email("other@example.com")
                .status(UserStatus.ACTIVE)
                .build();
    }

    @Test
    void authorizeAndGetTrip_WithHappyPath_ShouldReturnTrip() {
        // Arrange
        Trip trip = Trip.builder()
                .id(100L)
                .user(activeUser)
                .destination("Nha Trang")
                .build();

        when(userRepository.findByEmail("owner@example.com")).thenReturn(Optional.of(activeUser));
        when(tripRepository.findById(100L)).thenReturn(Optional.of(trip));

        // Act
        Trip result = tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L);

        // Assert
        assertNotNull(result);
        assertEquals(100L, result.getId());
        assertEquals("Nha Trang", result.getDestination());
        verify(tripRepository).findById(100L);
    }

    @Test
    void authorizeAndGetTrip_TripNotFound_ShouldThrowResourceNotFoundException() {
        // Arrange
        when(userRepository.findByEmail("owner@example.com")).thenReturn(Optional.of(activeUser));
        when(tripRepository.findById(100L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L));
    }

    @Test
    void authorizeAndGetTrip_NotOwner_ShouldThrowForbiddenException() {
        // Arrange
        Trip trip = Trip.builder()
                .id(100L)
                .user(otherUser) // Owned by other user
                .destination("Nha Trang")
                .build();

        when(userRepository.findByEmail("owner@example.com")).thenReturn(Optional.of(activeUser));
        when(tripRepository.findById(100L)).thenReturn(Optional.of(trip));

        // Act & Assert
        assertThrows(ForbiddenException.class, () -> tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L));
    }

    @Test
    void authorizeAndGetTrip_UserInactive_ShouldThrowUnauthorizedException() {
        // Arrange
        User inactiveUser = User.builder()
                .id(1L)
                .email("owner@example.com")
                .status(UserStatus.INACTIVE)
                .build();

        when(userRepository.findByEmail("owner@example.com")).thenReturn(Optional.of(inactiveUser));

        // Act & Assert
        assertThrows(UnauthorizedException.class, () -> tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L));
    }

    @Test
    void authorizeAndGetTrip_UserNotFound_ShouldThrowUnauthorizedException() {
        // Arrange
        when(userRepository.findByEmail("owner@example.com")).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(UnauthorizedException.class, () -> tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L));
    }
}
