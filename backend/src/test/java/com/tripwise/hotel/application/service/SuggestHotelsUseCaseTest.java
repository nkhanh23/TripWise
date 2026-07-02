package com.tripwise.hotel.application.service;

import com.tripwise.common.exception.BusinessException;
import com.tripwise.hotel.application.dto.HotelResponse;
import com.tripwise.hotel.application.dto.HotelSuggestionQuery;
import com.tripwise.hotel.domain.entity.Hotel;
import com.tripwise.hotel.infrastructure.persistence.repository.HotelRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SuggestHotelsUseCaseTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory();

    @Mock
    private HotelRepository hotelRepository;

    @InjectMocks
    private SuggestHotelsUseCase suggestHotelsUseCase;

    @Test
    void execute_WhenOnlyCityProvided_ShouldReturnTopHotelsForCity() {
        when(hotelRepository.findTop20ByCityIgnoreCaseAndIsActiveTrueOrderByStarRatingDescNameAsc("Nha Trang"))
                .thenReturn(List.of(hotel(1L, "Sheraton Nha Trang Hotel & Spa", "HIGH", 5, 109.2028, 12.2472)));

        List<HotelResponse> result = suggestHotelsUseCase.execute(HotelSuggestionQuery.builder()
                .city("Nha Trang")
                .build());

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getName()).isEqualTo("Sheraton Nha Trang Hotel & Spa");
        assertThat(result.getFirst().getLatitude()).isEqualTo(12.2472);
        assertThat(result.getFirst().getLongitude()).isEqualTo(109.2028);
        verify(hotelRepository).findTop20ByCityIgnoreCaseAndIsActiveTrueOrderByStarRatingDescNameAsc("Nha Trang");
    }

    @Test
    void execute_WhenBudgetAndStarRatingProvided_ShouldFilterByBoth() {
        when(hotelRepository
                .findTop20ByCityIgnoreCaseAndPriceLevelIgnoreCaseAndStarRatingGreaterThanEqualAndIsActiveTrueOrderByStarRatingDescNameAsc(
                        "Nha Trang", "MEDIUM", 4))
                .thenReturn(List.of(hotel(2L, "Liberty Central Nha Trang", "MEDIUM", 4, 109.1987, 12.2365)));

        List<HotelResponse> result = suggestHotelsUseCase.execute(HotelSuggestionQuery.builder()
                .city("Nha Trang")
                .budget("medium")
                .starRating(4)
                .build());

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getPriceLevel()).isEqualTo("MEDIUM");
        assertThat(result.getFirst().getStarRating()).isEqualTo(4);
        verify(hotelRepository)
                .findTop20ByCityIgnoreCaseAndPriceLevelIgnoreCaseAndStarRatingGreaterThanEqualAndIsActiveTrueOrderByStarRatingDescNameAsc(
                        "Nha Trang", "MEDIUM", 4);
    }

    @Test
    void execute_WhenOnlyBudgetProvided_ShouldNormalizeInputsAndFilterByBudget() {
        when(hotelRepository.findTop20ByCityIgnoreCaseAndPriceLevelIgnoreCaseAndIsActiveTrueOrderByStarRatingDescNameAsc(
                "Nha Trang", "LOW"))
                .thenReturn(List.of(hotel(3L, "Budget Stay", "LOW", 3, 109.1901, 12.2302)));

        List<HotelResponse> result = suggestHotelsUseCase.execute(HotelSuggestionQuery.builder()
                .city("  Nha Trang  ")
                .budget(" low ")
                .build());

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getPriceLevel()).isEqualTo("LOW");
        verify(hotelRepository)
                .findTop20ByCityIgnoreCaseAndPriceLevelIgnoreCaseAndIsActiveTrueOrderByStarRatingDescNameAsc(
                        "Nha Trang", "LOW");
    }

    @Test
    void execute_WhenOnlyStarRatingProvided_ShouldFilterByMinimumStarRating() {
        when(hotelRepository.findTop20ByCityIgnoreCaseAndStarRatingGreaterThanEqualAndIsActiveTrueOrderByStarRatingDescNameAsc(
                "Nha Trang", 5))
                .thenReturn(List.of(hotel(4L, "Sea View Resort", "HIGH", 5, 109.2040, 12.2450)));

        List<HotelResponse> result = suggestHotelsUseCase.execute(HotelSuggestionQuery.builder()
                .city("Nha Trang")
                .starRating(5)
                .build());

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getStarRating()).isEqualTo(5);
        verify(hotelRepository)
                .findTop20ByCityIgnoreCaseAndStarRatingGreaterThanEqualAndIsActiveTrueOrderByStarRatingDescNameAsc(
                        "Nha Trang", 5);
    }

    @Test
    void execute_WhenBudgetInvalid_ShouldThrowBusinessException() {
        assertThrows(BusinessException.class, () -> suggestHotelsUseCase.execute(HotelSuggestionQuery.builder()
                .city("Nha Trang")
                .budget("luxury")
                .build()));

        verifyNoMoreInteractions(hotelRepository);
    }

    @Test
    void execute_WhenCityBlank_ShouldThrowBusinessException() {
        assertThrows(BusinessException.class, () -> suggestHotelsUseCase.execute(HotelSuggestionQuery.builder()
                .city(" ")
                .build()));

        verifyNoMoreInteractions(hotelRepository);
    }

    private Hotel hotel(Long id, String name, String priceLevel, int starRating, double longitude, double latitude) {
        return Hotel.builder()
                .id(id)
                .name(name)
                .city("Nha Trang")
                .location(point(longitude, latitude))
                .priceLevel(priceLevel)
                .starRating(starRating)
                .googleMapsUrl("https://maps.example/" + id)
                .description("Hotel " + id)
                .isActive(true)
                .build();
    }

    private Point point(double longitude, double latitude) {
        Point point = GEOMETRY_FACTORY.createPoint(new Coordinate(longitude, latitude));
        point.setSRID(4326);
        return point;
    }
}
