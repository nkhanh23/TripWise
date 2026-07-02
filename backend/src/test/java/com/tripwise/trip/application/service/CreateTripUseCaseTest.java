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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreateTripUseCaseTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TripRepository tripRepository;

    @Mock
    private ParseTripRequirementUseCase parseTripRequirementUseCase;

    @Mock
    private TripMapper tripMapper;

    @InjectMocks
    private CreateTripUseCase createTripUseCase;

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
    void execute_WithHappyPath_ShouldCreateAndSaveTrip() {
        // Arrange
        CreateTripRequest request = new CreateTripRequest("Tôi muốn đi Nha Trang 3 ngày");
        ParsedTripRequest parsed = ParsedTripRequest.builder()
                .destination("Nha Trang")
                .numDays(3)
                .numNights(2)
                .budgetLevel("MID_RANGE")
                .interests(List.of("beach"))
                .preferences("No night clubs")
                .build();

        Trip tripToSave = Trip.builder()
                .id(100L)
                .user(activeUser)
                .destination("Nha Trang")
                .days(3)
                .nights(2)
                .budget("MID_RANGE")
                .interests(List.of("beach"))
                .preferences("No night clubs")
                .status(TripStatus.GENERATED)
                .build();

        TripResponse expectedResponse = TripResponse.builder()
                .id(100L)
                .destination("Nha Trang")
                .days(3)
                .nights(2)
                .budget("MID_RANGE")
                .interests(List.of("beach"))
                .preferences("No night clubs")
                .status(TripStatus.GENERATED)
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(activeUser));
        when(parseTripRequirementUseCase.execute("Tôi muốn đi Nha Trang 3 ngày")).thenReturn(parsed);
        when(tripRepository.save(any(Trip.class))).thenReturn(tripToSave);
        when(tripMapper.toResponse(tripToSave)).thenReturn(expectedResponse);

        // Act
        TripResponse result = createTripUseCase.execute("test@example.com", request);

        // Assert
        assertNotNull(result);
        assertEquals("Nha Trang", result.getDestination());
        assertEquals(3, result.getDays());
        assertEquals(2, result.getNights());
        assertEquals(TripStatus.GENERATED, result.getStatus());

        verify(userRepository).findByEmail("test@example.com");
        verify(parseTripRequirementUseCase).execute("Tôi muốn đi Nha Trang 3 ngày");
        verify(tripRepository).save(any(Trip.class));
        verify(tripMapper).toResponse(tripToSave);
    }

    @Test
    void execute_UserNotFound_ShouldThrowUnauthorizedException() {
        // Arrange
        CreateTripRequest request = new CreateTripRequest("Tôi muốn đi Nha Trang 3 ngày");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(UnauthorizedException.class, () -> createTripUseCase.execute("test@example.com", request));
        verifyNoInteractions(parseTripRequirementUseCase, tripRepository, tripMapper);
    }

    @Test
    void execute_UserInactive_ShouldThrowUnauthorizedException() {
        // Arrange
        User inactiveUser = User.builder()
                .id(2L)
                .email("inactive@example.com")
                .status(UserStatus.INACTIVE)
                .build();

        CreateTripRequest request = new CreateTripRequest("Tôi muốn đi Nha Trang 3 ngày");
        when(userRepository.findByEmail("inactive@example.com")).thenReturn(Optional.of(inactiveUser));

        // Act & Assert
        assertThrows(UnauthorizedException.class, () -> createTripUseCase.execute("inactive@example.com", request));
        verifyNoInteractions(parseTripRequirementUseCase, tripRepository, tripMapper);
    }
}
