package com.tripwise.trip.application.service;

import com.tripwise.common.exception.ForbiddenException;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.trip.infrastructure.persistence.repository.TripRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeleteTripUseCaseTest {

    @Mock
    private TripAuthorizationService tripAuthorizationService;

    @Mock
    private TripRepository tripRepository;

    @InjectMocks
    private DeleteTripUseCase deleteTripUseCase;

    @Test
    void execute_WithHappyPath_ShouldDeleteTrip() {
        // Arrange
        Trip trip = Trip.builder()
                .id(100L)
                .destination("Nha Trang")
                .build();

        when(tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L)).thenReturn(trip);

        // Act
        deleteTripUseCase.execute("owner@example.com", 100L);

        // Assert
        verify(tripRepository).delete(trip);
    }

    @Test
    void execute_AuthorizationFailed_ShouldPropagateException() {
        // Arrange
        when(tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L))
                .thenThrow(new ForbiddenException("Bạn không có quyền truy cập thông tin chuyến đi này"));

        // Act & Assert
        assertThrows(ForbiddenException.class, () -> deleteTripUseCase.execute("owner@example.com", 100L));
        verify(tripRepository, never()).delete(any());
    }
}
