package com.tripwise.trip.application.service;

import com.tripwise.common.exception.UnauthorizedException;
import com.tripwise.trip.application.dto.TripResponse;
import com.tripwise.trip.application.mapper.TripMapper;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ListUserTripsUseCaseTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TripRepository tripRepository;

    @Mock
    private TripMapper tripMapper;

    @InjectMocks
    private ListUserTripsUseCase listUserTripsUseCase;

    private User activeUser;

    @BeforeEach
    void setUp() {
        activeUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .status(UserStatus.ACTIVE)
                .build();
    }

    @Test
    void execute_WithHappyPath_ShouldReturnPaginatedTrips() {
        // Arrange
        PageRequest pageRequest = PageRequest.of(0, 10);
        Trip trip = Trip.builder()
                .id(100L)
                .destination("Nha Trang")
                .build();
        TripResponse tripResponse = TripResponse.builder()
                .id(100L)
                .destination("Nha Trang")
                .build();

        Page<Trip> tripsPage = new PageImpl<>(List.of(trip), pageRequest, 1);

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(activeUser));
        when(tripRepository.findByUserIdOrderByCreatedAtDesc(1L, pageRequest)).thenReturn(tripsPage);
        when(tripMapper.toResponse(trip)).thenReturn(tripResponse);

        // Act
        Page<TripResponse> result = listUserTripsUseCase.execute("test@example.com", pageRequest);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Nha Trang", result.getContent().get(0).getDestination());

        verify(userRepository).findByEmail("test@example.com");
        verify(tripRepository).findByUserIdOrderByCreatedAtDesc(1L, pageRequest);
        verify(tripMapper).toResponse(trip);
    }

    @Test
    void execute_UserInactive_ShouldThrowUnauthorizedException() {
        // Arrange
        User inactiveUser = User.builder()
                .id(2L)
                .email("inactive@example.com")
                .status(UserStatus.INACTIVE)
                .build();
        PageRequest pageRequest = PageRequest.of(0, 10);
        when(userRepository.findByEmail("inactive@example.com")).thenReturn(Optional.of(inactiveUser));

        // Act & Assert
        assertThrows(UnauthorizedException.class, () -> listUserTripsUseCase.execute("inactive@example.com", pageRequest));
        verifyNoInteractions(tripRepository, tripMapper);
    }
}
