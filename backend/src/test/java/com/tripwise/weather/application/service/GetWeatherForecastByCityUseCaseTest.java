package com.tripwise.weather.application.service;

import com.tripwise.common.exception.BusinessException;
import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.domain.entity.PlaceCategory;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import com.tripwise.weather.domain.WeatherForecast;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GetWeatherForecastByCityUseCaseTest {

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private GetWeatherForecastUseCase getWeatherForecastUseCase;

    @InjectMocks
    private GetWeatherForecastByCityUseCase getWeatherForecastByCityUseCase;

    @Test
    void execute_ShouldResolveCoordinatesFromVerifiedPlacesAndReturnForecast() {
        PlaceCategory category = PlaceCategory.builder().name("Beach").slug("beach").build();
        when(placeRepository.findAllByCityIgnoreCaseAndIsActiveTrueAndIsVerifiedTrue("Nha Trang"))
                .thenReturn(List.of(
                        place(1L, category, 109.19, 12.24),
                        place(2L, category, 109.21, 12.26)
                ));

        WeatherForecast expectedForecast = new WeatherForecast(
                12.25,
                109.2,
                "Asia/Bangkok",
                List.of(new WeatherForecast.DailyForecast(LocalDate.of(2026, 7, 10), 25, 30, 20, 1))
        );
        when(getWeatherForecastUseCase.execute(eq("Nha Trang"), anyDouble(), anyDouble(),
                eq(LocalDate.of(2026, 7, 10)), eq(LocalDate.of(2026, 7, 11))))
                .thenReturn(expectedForecast);

        WeatherForecast result = getWeatherForecastByCityUseCase.execute(
                "Nha Trang",
                LocalDate.of(2026, 7, 10),
                LocalDate.of(2026, 7, 11)
        );

        assertThat(result).isEqualTo(expectedForecast);
        verify(getWeatherForecastUseCase).execute(eq("Nha Trang"), anyDouble(), anyDouble(),
                eq(LocalDate.of(2026, 7, 10)), eq(LocalDate.of(2026, 7, 11)));
    }

    @Test
    void execute_WhenNoVerifiedPlaces_ShouldThrowNotFound() {
        when(placeRepository.findAllByCityIgnoreCaseAndIsActiveTrueAndIsVerifiedTrue("Nha Trang"))
                .thenReturn(List.of());

        assertThrows(ResourceNotFoundException.class, () -> getWeatherForecastByCityUseCase.execute(
                "Nha Trang",
                LocalDate.of(2026, 7, 10),
                LocalDate.of(2026, 7, 11)
        ));
    }

    @Test
    void execute_WhenRangeExceedsLimit_ShouldThrowBusinessException() {
        assertThrows(BusinessException.class, () -> getWeatherForecastByCityUseCase.execute(
                "Nha Trang",
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 7, 20)
        ));
    }

    @Test
    void execute_WhenPlacesHaveNoCoordinates_ShouldThrowNotFound() {
        PlaceCategory category = PlaceCategory.builder().name("Beach").slug("beach").build();
        when(placeRepository.findAllByCityIgnoreCaseAndIsActiveTrueAndIsVerifiedTrue("Nha Trang"))
                .thenReturn(List.of(
                        Place.builder()
                                .id(1L)
                                .name("No Coordinate Place")
                                .city("Nha Trang")
                                .category(category)
                                .location(null)
                                .durationMinutes(90)
                                .indoor(false)
                                .tags(Set.of("beach"))
                                .build()
                ));

        assertThrows(ResourceNotFoundException.class, () -> getWeatherForecastByCityUseCase.execute(
                "Nha Trang",
                LocalDate.of(2026, 7, 10),
                LocalDate.of(2026, 7, 11)
        ));
    }

    @Test
    void execute_WhenEndDateBeforeStartDate_ShouldThrowBusinessException() {
        assertThrows(BusinessException.class, () -> getWeatherForecastByCityUseCase.execute(
                "Nha Trang",
                LocalDate.of(2026, 7, 12),
                LocalDate.of(2026, 7, 10)
        ));
    }

    private Place place(Long id, PlaceCategory category, double lon, double lat) {
        return Place.builder()
                .id(id)
                .name("Place " + id)
                .city("Nha Trang")
                .category(category)
                .location(createPoint(lon, lat))
                .durationMinutes(90)
                .indoor(false)
                .tags(Set.of("beach"))
                .build();
    }

    private Point createPoint(double lon, double lat) {
        return geometryFactory.createPoint(new Coordinate(lon, lat));
    }
}
