package com.tripwise.trip.application;

import com.tripwise.BaseIntegrationTest;
import com.tripwise.ai.application.dto.ParsedTripRequest;
import com.tripwise.ai.application.service.ParseTripRequirementUseCase;
import com.tripwise.ai.infrastructure.GeminiClient;
import com.tripwise.itinerary.application.dto.GeneratedItineraryResponse;
import com.tripwise.itinerary.application.service.GenerateItineraryUseCase;
import com.tripwise.common.exception.ForbiddenException;
import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.trip.application.dto.CreateTripRequest;
import com.tripwise.trip.application.dto.TripDetailResponse;
import com.tripwise.trip.application.dto.TripResponse;
import com.tripwise.trip.application.service.DeleteTripUseCase;
import com.tripwise.trip.application.service.GetTripDetailUseCase;
import com.tripwise.trip.application.service.ListUserTripsUseCase;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.Role;
import com.tripwise.user.domain.enums.UserStatus;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ActiveProfiles("test")
@Transactional
class TripLifecycleIT extends BaseIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GenerateItineraryUseCase generateItineraryUseCase;

    @Autowired
    private GetTripDetailUseCase getTripDetailUseCase;

    @Autowired
    private ListUserTripsUseCase listUserTripsUseCase;

    @Autowired
    private DeleteTripUseCase deleteTripUseCase;

    @MockBean
    private ParseTripRequirementUseCase parseTripRequirementUseCase;

    @MockBean
    private GeminiClient geminiClient;

    @Test
    void testFullTripLifecycleAndAuthorization() {
        // 1. Create trip owner and another user
        User owner = userRepository.saveAndFlush(User.builder()
                .email("owner.lifecycle@example.com")
                .passwordHash("hashed")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());

        User nonOwner = userRepository.saveAndFlush(User.builder()
                .email("nonowner.lifecycle@example.com")
                .passwordHash("hashed")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());

        // 2. Mock AI requirement parser
        ParsedTripRequest parsed = ParsedTripRequest.builder()
                .destination("Nha Trang")
                .numDays(3)
                .numNights(2)
                .budgetLevel("MID_RANGE")
                .interests(List.of("beach"))
                .preferences("No night clubs")
                .build();
        when(parseTripRequirementUseCase.execute(anyString())).thenReturn(parsed);
        when(geminiClient.generateContent(anyString())).thenReturn("""
                [
                  {
                    "dayNumber": 1,
                    "orderIndex": 0,
                    "aiDescription": "Phù hợp để mở đầu hành trình với không gian biển thoáng đãng."
                  }
                ]
                """);

        // 3. Create trip
        CreateTripRequest createRequest = new CreateTripRequest("Tôi muốn đi Nha Trang 3 ngày");
        GeneratedItineraryResponse createdTrip = generateItineraryUseCase.execute(owner.getEmail(), createRequest);

        assertThat(createdTrip).isNotNull();
        assertThat(createdTrip.getId()).isNotNull();
        assertThat(createdTrip.getDestination()).isEqualTo("Nha Trang");

        // 4. List trips - owner should see 1 trip, non-owner should see 0
        Page<TripResponse> ownerTrips = listUserTripsUseCase.execute(owner.getEmail(), PageRequest.of(0, 10));
        assertThat(ownerTrips.getContent()).hasSize(1);
        assertThat(ownerTrips.getContent().get(0).getId()).isEqualTo(createdTrip.getId());

        Page<TripResponse> nonOwnerTrips = listUserTripsUseCase.execute(nonOwner.getEmail(), PageRequest.of(0, 10));
        assertThat(nonOwnerTrips.getContent()).isEmpty();

        // 5. Get detail - owner should be authorized
        TripDetailResponse tripDetail = getTripDetailUseCase.execute(owner.getEmail(), createdTrip.getId());
        assertThat(tripDetail).isNotNull();
        assertThat(tripDetail.getDestination()).isEqualTo("Nha Trang");
        assertThat(tripDetail.getItinerary()).isNotNull();
        assertThat(tripDetail.getItinerary().getDays()).isNotEmpty();
        assertThat(tripDetail.getItinerary().getDays()).hasSize(3);
        assertThat(tripDetail.getItinerary().getDays())
                .extracting(day -> day.getDayNumber())
                .containsExactly(1, 2, 3);
        assertThat(tripDetail.getItinerary().getDays().getFirst().getItems()).isNotEmpty();
        assertThat(tripDetail.getItinerary().getDays().getFirst().getItems().getFirst().getAiDescription()).isNotBlank();
        tripDetail.getItinerary().getDays().forEach(day ->
                assertThat(day.getItems())
                        .isSortedAccordingTo(Comparator.comparing(item -> item.getOrderIndex())));

        // 6. Get detail - non-owner should be FORBIDDEN
        assertThrows(ForbiddenException.class, () -> 
                getTripDetailUseCase.execute(nonOwner.getEmail(), createdTrip.getId())
        );

        // 7. Delete trip - non-owner should be FORBIDDEN
        assertThrows(ForbiddenException.class, () ->
                deleteTripUseCase.execute(nonOwner.getEmail(), createdTrip.getId())
        );

        // 8. Delete trip - owner should be authorized
        deleteTripUseCase.execute(owner.getEmail(), createdTrip.getId());

        // 9. Get detail - owner should get NOT FOUND now
        assertThrows(ResourceNotFoundException.class, () ->
                getTripDetailUseCase.execute(owner.getEmail(), createdTrip.getId())
        );
    }

    @Test
    void testTripGeneration_ShouldSucceedWhenAiDescriptionsFail() {
        User owner = userRepository.saveAndFlush(User.builder()
                .email("owner.fallback@example.com")
                .passwordHash("hashed")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());

        ParsedTripRequest parsed = ParsedTripRequest.builder()
                .destination("Nha Trang")
                .numDays(2)
                .numNights(1)
                .budgetLevel("MID_RANGE")
                .interests(List.of("beach"))
                .preferences("Quiet places")
                .build();
        when(parseTripRequirementUseCase.execute(anyString())).thenReturn(parsed);
        when(geminiClient.generateContent(anyString())).thenThrow(new RuntimeException("timeout"));

        GeneratedItineraryResponse createdTrip = generateItineraryUseCase.execute(
                owner.getEmail(),
                new CreateTripRequest("TÃ´i muá»‘n Ä‘i Nha Trang 2 ngÃ y yÃªn tÄ©nh")
        );

        assertThat(createdTrip).isNotNull();
        assertThat(createdTrip.getItineraryDays()).hasSize(2);
        assertThat(createdTrip.getItineraryDays())
                .allSatisfy(day -> assertThat(day.getItems()).isNotEmpty());
        assertThat(createdTrip.getItineraryDays().stream()
                .flatMap(day -> day.getItems().stream())
                .map(item -> item.getAiDescription()))
                .allMatch(description -> description == null || description.isBlank());
    }
}
