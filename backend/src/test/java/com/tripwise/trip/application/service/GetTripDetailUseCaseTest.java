package com.tripwise.trip.application.service;

import com.tripwise.itinerary.application.dto.ItineraryResponse;
import com.tripwise.itinerary.application.service.GetItineraryDetailUseCase;
import com.tripwise.common.exception.ForbiddenException;
import com.tripwise.trip.application.dto.TripDetailResponse;
import com.tripwise.trip.application.mapper.TripMapper;
import com.tripwise.trip.domain.entity.Trip;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GetTripDetailUseCaseTest {

    @Mock
    private TripAuthorizationService tripAuthorizationService;

    @Mock
    private TripMapper tripMapper;

    @Mock
    private GetItineraryDetailUseCase getItineraryDetailUseCase;

    @InjectMocks
    private GetTripDetailUseCase getTripDetailUseCase;

    @Test
    void execute_WithHappyPath_ShouldReturnDetail() {
        // Arrange
        Trip trip = Trip.builder()
                .id(100L)
                .destination("Nha Trang")
                .build();

        TripDetailResponse detailResponse = TripDetailResponse.builder()
                .id(100L)
                .destination("Nha Trang")
                .build();
        ItineraryResponse itineraryResponse = ItineraryResponse.builder().build();

        when(tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L)).thenReturn(trip);
        when(tripMapper.toDetailResponse(trip)).thenReturn(detailResponse);
        when(getItineraryDetailUseCase.execute(100L)).thenReturn(itineraryResponse);

        // Act
        TripDetailResponse result = getTripDetailUseCase.execute("owner@example.com", 100L);

        // Assert
        assertNotNull(result);
        assertEquals("Nha Trang", result.getDestination());
        assertEquals(itineraryResponse, result.getItinerary());
        verify(tripAuthorizationService).authorizeAndGetTrip("owner@example.com", 100L);
        verify(getItineraryDetailUseCase).execute(100L);
    }

    @Test
    void execute_AuthorizationFailed_ShouldPropagateException() {
        // Arrange
        when(tripAuthorizationService.authorizeAndGetTrip("owner@example.com", 100L))
                .thenThrow(new ForbiddenException("Bạn không có quyền truy cập thông tin chuyến đi này"));

        // Act & Assert
        assertThrows(ForbiddenException.class, () -> getTripDetailUseCase.execute("owner@example.com", 100L));
    }
}
