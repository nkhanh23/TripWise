package com.tripwise.trip.infrastructure.persistence.repository;

import com.tripwise.BaseIntegrationTest;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.trip.domain.enums.TripStatus;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.Role;
import com.tripwise.user.domain.enums.UserStatus;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@Transactional
class TripRepositoryTest extends BaseIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TripRepository tripRepository;

    @Test
    void shouldSaveAndFindTrip() {
        // Arrange
        User user = userRepository.save(User.builder()
                .email("trip.owner@example.com")
                .passwordHash("hashed_password")
                .fullName("Trip Owner")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());

        Trip trip = Trip.builder()
                .user(user)
                .destination("Nha Trang")
                .startDate(LocalDate.of(2026, 7, 1))
                .days(3)
                .nights(2)
                .budget("MID_RANGE")
                .travelStyle("LEISURE")
                .interests(List.of("beach", "seafood"))
                .preferences("No night clubs")
                .status(TripStatus.DRAFT)
                .aiMetadata(Map.of("model", "gemini-1.5-pro", "version", 1))
                .build();
        Trip savedTrip = tripRepository.saveAndFlush(trip);

        // Act
        Optional<Trip> foundTrip = tripRepository.findById(savedTrip.getId());

        // Assert
        assertThat(foundTrip).isPresent();
        assertThat(foundTrip.get().getDestination()).isEqualTo("Nha Trang");
        assertThat(foundTrip.get().getDays()).isEqualTo(3);
        assertThat(foundTrip.get().getNights()).isEqualTo(2);
        assertThat(foundTrip.get().getInterests()).containsExactly("beach", "seafood");
        assertThat(foundTrip.get().getAiMetadata()).containsEntry("model", "gemini-1.5-pro");
        assertThat(foundTrip.get().getCreatedAt()).isNotNull();
    }

    @Test
    void shouldFindByUserIdOrderByCreatedAtDesc() {
        // Arrange
        User user = userRepository.save(User.builder()
                .email("trip.owner2@example.com")
                .passwordHash("hashed_password")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());

        Trip trip1 = Trip.builder()
                .user(user)
                .destination("Nha Trang")
                .days(3)
                .nights(2)
                .status(TripStatus.DRAFT)
                .build();
        tripRepository.save(trip1);

        Trip trip2 = Trip.builder()
                .user(user)
                .destination("Da Lat")
                .days(2)
                .nights(1)
                .status(TripStatus.SAVED)
                .build();
        tripRepository.saveAndFlush(trip2);

        // Act
        Page<Trip> tripPage = tripRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 10));

        // Assert
        assertThat(tripPage.getContent()).hasSize(2);
        assertThat(tripPage.getContent().get(0).getDestination()).isEqualTo("Da Lat"); // sorted by createdAt desc
        assertThat(tripPage.getContent().get(1).getDestination()).isEqualTo("Nha Trang");
    }
}
