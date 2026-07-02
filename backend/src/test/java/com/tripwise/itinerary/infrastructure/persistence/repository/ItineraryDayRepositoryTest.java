package com.tripwise.itinerary.infrastructure.persistence.repository;

import com.tripwise.BaseIntegrationTest;
import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.itinerary.domain.entity.ItineraryDay;
import com.tripwise.itinerary.domain.entity.ItineraryItem;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.domain.entity.PlaceCategory;
import com.tripwise.place.infrastructure.persistence.repository.PlaceCategoryRepository;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.trip.domain.enums.TripStatus;
import com.tripwise.trip.infrastructure.persistence.repository.TripRepository;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.Role;
import com.tripwise.user.domain.enums.UserStatus;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@Transactional
class ItineraryDayRepositoryTest extends BaseIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private PlaceCategoryRepository placeCategoryRepository;

    @Autowired
    private PlaceRepository placeRepository;

    @Autowired
    private ItineraryDayRepository itineraryDayRepository;

    @Autowired
    private ItineraryItemRepository itineraryItemRepository;

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    private User user;
    private Trip trip;
    private Place place1;
    private Place place2;

    @BeforeEach
    void setUp() {
        user = userRepository.save(User.builder()
                .email("itinerary.test@example.com")
                .passwordHash("hashed_password")
                .fullName("Itinerary Test User")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build());

        trip = tripRepository.save(Trip.builder()
                .user(user)
                .destination("Nha Trang")
                .startDate(LocalDate.of(2026, 7, 1))
                .days(2)
                .nights(1)
                .budget("MID_RANGE")
                .status(TripStatus.DRAFT)
                .build());

        PlaceCategory category = placeCategoryRepository.save(
                PlaceCategory.builder().name("Beach").slug("beach").build());

        place1 = placeRepository.save(Place.builder()
                .name("Bai Dai")
                .city("Nha Trang")
                .category(category)
                .location(geometryFactory.createPoint(new Coordinate(109.15, 12.25)))
                .estimatedCost(BigDecimal.valueOf(50000))
                .durationMinutes(90)
                .indoor(false)
                .isActive(true)
                .isVerified(true)
                .build());

        place2 = placeRepository.save(Place.builder()
                .name("Nha Trang Cathedral")
                .city("Nha Trang")
                .category(category)
                .location(geometryFactory.createPoint(new Coordinate(109.19, 12.24)))
                .estimatedCost(BigDecimal.valueOf(30000))
                .durationMinutes(60)
                .indoor(true)
                .isActive(true)
                .isVerified(true)
                .build());
    }

    @Test
    void shouldSaveAndFindItineraryDay() {
        // Arrange
        ItineraryDay day = ItineraryDay.builder()
                .trip(trip)
                .dayNumber(1)
                .dayTitle("Ngày 1 - Biển và Văn hóa")
                .totalDistanceMeters(5000)
                .totalDurationSeconds(7200)
                .build();

        // Act
        ItineraryDay savedDay = itineraryDayRepository.saveAndFlush(day);
        Optional<ItineraryDay> foundDay = itineraryDayRepository.findById(savedDay.getId());

        // Assert
        assertThat(foundDay).isPresent();
        assertThat(foundDay.get().getTrip().getId()).isEqualTo(trip.getId());
        assertThat(foundDay.get().getDayNumber()).isEqualTo(1);
        assertThat(foundDay.get().getDayTitle()).isEqualTo("Ngày 1 - Biển và Văn hóa");
        assertThat(foundDay.get().getTotalDistanceMeters()).isEqualTo(5000);
        assertThat(foundDay.get().getCreatedAt()).isNotNull();
    }

    @Test
    void shouldSaveItineraryItemWithCascadeFromDay() {
        // Arrange
        ItineraryDay day = itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip)
                .dayNumber(1)
                .dayTitle("Ngày 1")
                .totalDistanceMeters(0)
                .totalDurationSeconds(0)
                .build());

        ItineraryItem item = ItineraryItem.builder()
                .itineraryDay(day)
                .place(place1)
                .orderIndex(0)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(9, 30))
                .timeSlot(TimeSlot.MORNING)
                .reason("Bai Dai - lý tưởng cho buổi sáng")
                .estimatedCost(BigDecimal.valueOf(50000))
                .distanceFromPreviousMeters(0)
                .durationFromPreviousSeconds(0)
                .build();

        // Act
        itineraryItemRepository.saveAndFlush(item);
        List<ItineraryItem> items = itineraryItemRepository.findByItineraryDayIdOrderByOrderIndexAsc(day.getId());

        // Assert
        assertThat(items).hasSize(1);
        assertThat(items.get(0).getPlace().getName()).isEqualTo("Bai Dai");
        assertThat(items.get(0).getTimeSlot()).isEqualTo(TimeSlot.MORNING);
        assertThat(items.get(0).getStartTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(items.get(0).getEndTime()).isEqualTo(LocalTime.of(9, 30));
        assertThat(items.get(0).getOrderIndex()).isEqualTo(0);
    }

    @Test
    void shouldFindByTripIdOrderByDayNumberAsc() {
        // Arrange
        ItineraryDay day1 = itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(2).dayTitle("Ngày 2")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());
        ItineraryDay day2 = itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(1).dayTitle("Ngày 1")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());

        // Act
        List<ItineraryDay> days = itineraryDayRepository.findByTripIdOrderByDayNumberAsc(trip.getId());

        // Assert
        assertThat(days).hasSize(2);
        assertThat(days.get(0).getDayNumber()).isEqualTo(1);
        assertThat(days.get(1).getDayNumber()).isEqualTo(2);
    }

    @Test
    void shouldFindByTripIdWithItems() {
        // Arrange
        ItineraryDay day = itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(1).dayTitle("Ngày 1")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());

        itineraryItemRepository.save(ItineraryItem.builder()
                .itineraryDay(day).place(place1).orderIndex(0)
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(9, 30))
                .timeSlot(TimeSlot.MORNING).build());
        itineraryItemRepository.save(ItineraryItem.builder()
                .itineraryDay(day).place(place2).orderIndex(1)
                .startTime(LocalTime.of(13, 30)).endTime(LocalTime.of(14, 30))
                .timeSlot(TimeSlot.AFTERNOON).build());

        // Act
        List<ItineraryDay> days = itineraryDayRepository.findByTripIdWithItems(trip.getId());

        // Assert
        assertThat(days).hasSize(1);
        assertThat(days.get(0).getItems()).hasSize(2);
    }

    @Test
    void shouldFindByTripIdWithItemsAndPlaces() {
        ItineraryDay day = itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(1).dayTitle("Ngày 1")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());

        itineraryItemRepository.save(ItineraryItem.builder()
                .itineraryDay(day).place(place1).orderIndex(0)
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(9, 30))
                .timeSlot(TimeSlot.MORNING).build());
        itineraryItemRepository.save(ItineraryItem.builder()
                .itineraryDay(day).place(place2).orderIndex(1)
                .startTime(LocalTime.of(13, 30)).endTime(LocalTime.of(14, 30))
                .timeSlot(TimeSlot.AFTERNOON).build());

        List<ItineraryDay> days = itineraryDayRepository.findByTripIdWithItemsAndPlaces(trip.getId());

        assertThat(days).hasSize(1);
        assertThat(days.get(0).getItems()).hasSize(2);
        assertThat(days.get(0).getItems().get(0).getPlace().getName()).isEqualTo("Bai Dai");
        assertThat(days.get(0).getItems().get(1).getPlace().getName()).isEqualTo("Nha Trang Cathedral");
    }

    @Test
    void shouldFindByTripIdAndDayNumber() {
        // Arrange
        itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(1).dayTitle("Ngày 1")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());

        // Act
        Optional<ItineraryDay> found = itineraryDayRepository.findByTripIdAndDayNumber(trip.getId(), 1);

        // Assert
        assertThat(found).isPresent();
        assertThat(found.get().getDayNumber()).isEqualTo(1);
    }

    @Test
    void shouldFindByDayIdWithPlace() {
        // Arrange
        ItineraryDay day = itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(1).dayTitle("Ngày 1")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());

        itineraryItemRepository.save(ItineraryItem.builder()
                .itineraryDay(day).place(place1).orderIndex(0)
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(9, 0))
                .timeSlot(TimeSlot.MORNING).build());

        // Act
        List<ItineraryItem> items = itineraryItemRepository.findByDayIdWithPlace(day.getId());

        // Assert
        assertThat(items).hasSize(1);
        assertThat(items.get(0).getPlace()).isNotNull();
        assertThat(items.get(0).getPlace().getName()).isEqualTo("Bai Dai");
    }

    @Test
    void shouldFindByTripIdWithPlaceAndDay() {
        // Arrange
        ItineraryDay day = itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(1).dayTitle("Ngày 1")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());

        itineraryItemRepository.save(ItineraryItem.builder()
                .itineraryDay(day).place(place1).orderIndex(0)
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(9, 0))
                .timeSlot(TimeSlot.MORNING).build());
        itineraryItemRepository.save(ItineraryItem.builder()
                .itineraryDay(day).place(place2).orderIndex(1)
                .startTime(LocalTime.of(13, 30)).endTime(LocalTime.of(14, 30))
                .timeSlot(TimeSlot.AFTERNOON).build());

        // Act
        List<ItineraryItem> items = itineraryItemRepository.findByTripIdWithPlaceAndDay(trip.getId());

        // Assert
        assertThat(items).hasSize(2);
        assertThat(items.get(0).getPlace().getName()).isEqualTo("Bai Dai");
        assertThat(items.get(1).getPlace().getName()).isEqualTo("Nha Trang Cathedral");
    }

    @Test
    void shouldDeleteByTripId() {
        // Arrange
        ItineraryDay day = itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(1).dayTitle("Ngày 1")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());
        itineraryItemRepository.save(ItineraryItem.builder()
                .itineraryDay(day).place(place1).orderIndex(0)
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(9, 0))
                .timeSlot(TimeSlot.MORNING).build());

        // Act
        itineraryDayRepository.deleteByTripId(trip.getId());
        itineraryItemRepository.flush();

        // Assert
        List<ItineraryDay> days = itineraryDayRepository.findByTripIdOrderByDayNumberAsc(trip.getId());
        assertThat(days).isEmpty();
    }

    @Test
    void shouldCountByTripId() {
        // Arrange
        itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(1).dayTitle("Ngày 1")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());
        itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(2).dayTitle("Ngày 2")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());

        // Act
        long count = itineraryDayRepository.countByTripId(trip.getId());

        // Assert
        assertThat(count).isEqualTo(2);
    }

    @Test
    void shouldCascadeDeleteItemsWhenDayDeleted() {
        // Arrange
        ItineraryDay day = itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(1).dayTitle("Ngày 1")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());
        itineraryItemRepository.save(ItineraryItem.builder()
                .itineraryDay(day).place(place1).orderIndex(0)
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(9, 0))
                .timeSlot(TimeSlot.MORNING).build());
        itineraryItemRepository.save(ItineraryItem.builder()
                .itineraryDay(day).place(place2).orderIndex(1)
                .startTime(LocalTime.of(13, 30)).endTime(LocalTime.of(14, 30))
                .timeSlot(TimeSlot.AFTERNOON).build());

        // Act
        itineraryDayRepository.delete(day);
        itineraryDayRepository.flush();

        // Assert
        List<ItineraryItem> items = itineraryItemRepository.findByItineraryDayIdOrderByOrderIndexAsc(day.getId());
        assertThat(items).isEmpty();
    }

    @Test
    void shouldEnforceUniqueTripDayConstraint() {
        // Arrange
        itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(1).dayTitle("Ngày 1")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());
        itineraryDayRepository.flush();

        // Act & Assert
        try {
            itineraryDayRepository.save(ItineraryDay.builder()
                    .trip(trip).dayNumber(1).dayTitle("Ngày 1 Again")
                    .totalDistanceMeters(0).totalDurationSeconds(0).build());
            itineraryDayRepository.flush();
            // Should not reach here
            assertThat(false).isTrue(); // Fail if no exception
        } catch (Exception e) {
            assertThat(e).isInstanceOf(Exception.class);
        }
    }

    @Test
    void shouldEnforceUniqueDayOrderConstraint() {
        // Arrange
        ItineraryDay day = itineraryDayRepository.save(ItineraryDay.builder()
                .trip(trip).dayNumber(1).dayTitle("Ngày 1")
                .totalDistanceMeters(0).totalDurationSeconds(0).build());
        itineraryItemRepository.save(ItineraryItem.builder()
                .itineraryDay(day).place(place1).orderIndex(0)
                .startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(9, 0))
                .timeSlot(TimeSlot.MORNING).build());
        itineraryItemRepository.flush();

        // Act & Assert
        try {
            itineraryItemRepository.save(ItineraryItem.builder()
                    .itineraryDay(day).place(place2).orderIndex(0)
                    .startTime(LocalTime.of(13, 30)).endTime(LocalTime.of(14, 30))
                    .timeSlot(TimeSlot.AFTERNOON).build());
            itineraryItemRepository.flush();
            // Should not reach here
            assertThat(false).isTrue();
        } catch (Exception e) {
            assertThat(e).isInstanceOf(Exception.class);
        }
    }
}
