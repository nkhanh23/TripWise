package com.tripwise.weather.application.service;

import com.tripwise.itinerary.domain.ItineraryDayPlan;
import com.tripwise.itinerary.domain.ItineraryItemPlan;
import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.domain.entity.PlaceCategory;
import com.tripwise.trip.domain.entity.Trip;
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
import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WeatherAdjustmentServiceTest {

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    @Mock
    private GetWeatherForecastUseCase getWeatherForecastUseCase;

    @InjectMocks
    private WeatherAdjustmentService weatherAdjustmentService;

    @Test
    void adjust_WhenRainyBeachDayAndSunnyIndoorDay_ShouldSwapActivitiesBetweenDays() {
        PlaceCategory beachCategory = PlaceCategory.builder().name("Beach").slug("beach").build();
        PlaceCategory museumCategory = PlaceCategory.builder().name("Museum").slug("museum").build();

        Place beach = place(1L, "Tran Phu Beach", false, beachCategory, setOf("beach"));
        Place island = place(2L, "Hon Chong", false, beachCategory, setOf("viewpoint"));
        Place museum = place(3L, "Alexandre Yersin Museum", true, museumCategory, setOf("museum"));

        Trip trip = Trip.builder()
                .destination("Nha Trang")
                .startDate(LocalDate.of(2026, 7, 10))
                .days(2)
                .build();

        ItineraryDayPlan rainyDay = new ItineraryDayPlan(1, List.of(
                new ItineraryItemPlan(beach, TimeSlot.MORNING, LocalTime.of(8, 0), LocalTime.of(10, 0)),
                new ItineraryItemPlan(island, TimeSlot.AFTERNOON, LocalTime.of(13, 30), LocalTime.of(15, 0))
        ));
        ItineraryDayPlan sunnyDay = new ItineraryDayPlan(2, List.of(
                new ItineraryItemPlan(museum, TimeSlot.MORNING, LocalTime.of(8, 0), LocalTime.of(10, 0))
        ));

        when(getWeatherForecastUseCase.execute(eq("Nha Trang"), anyDouble(), anyDouble(),
                eq(LocalDate.of(2026, 7, 10)), eq(LocalDate.of(2026, 7, 11))))
                .thenReturn(new WeatherForecast(
                        12.25,
                        109.2,
                        "Asia/Bangkok",
                        List.of(
                                new WeatherForecast.DailyForecast(LocalDate.of(2026, 7, 10), 25, 29, 85, 65),
                                new WeatherForecast.DailyForecast(LocalDate.of(2026, 7, 11), 26, 31, 10, 1)
                        )
                ));

        List<ItineraryDayPlan> adjustedPlans = weatherAdjustmentService.adjust(trip, List.of(rainyDay, sunnyDay));

        assertThat(adjustedPlans).hasSize(2);
        assertThat(adjustedPlans.getFirst().getItems()).extracting(item -> item.getPlace().getName())
                .containsExactly("Alexandre Yersin Museum");
        assertThat(adjustedPlans.get(1).getItems()).extracting(item -> item.getPlace().getName())
                .containsExactly("Tran Phu Beach", "Hon Chong");
        assertThat(adjustedPlans.getFirst().getWeatherSummary()).contains("Da chuyen hoat dong ngoai troi");
        assertThat(adjustedPlans.get(1).getWeatherSummary()).contains("Da nhan hoat dong ngoai troi");
    }

    @Test
    void adjust_WhenTripHasNoStartDate_ShouldAnnotateWithoutCallingForecastService() {
        Trip trip = Trip.builder()
                .destination("Nha Trang")
                .days(1)
                .build();
        PlaceCategory beachCategory = PlaceCategory.builder().name("Beach").slug("beach").build();
        Place beach = place(1L, "Tran Phu Beach", false, beachCategory, setOf("beach"));

        List<ItineraryDayPlan> adjustedPlans = weatherAdjustmentService.adjust(
                trip,
                List.of(new ItineraryDayPlan(1, List.of(
                        new ItineraryItemPlan(beach, TimeSlot.MORNING, LocalTime.of(8, 0), LocalTime.of(10, 0))
                )))
        );

        assertThat(adjustedPlans).hasSize(1);
        assertThat(adjustedPlans.getFirst().getWeatherSummary()).contains("Chua co du lieu thoi tiet");
        verify(getWeatherForecastUseCase, never()).execute(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void adjust_WhenStormDayHasNoBetterCandidate_ShouldKeepDayAndAppendSuggestion() {
        PlaceCategory beachCategory = PlaceCategory.builder().name("Beach").slug("beach").build();
        Place beach = place(1L, "Tran Phu Beach", false, beachCategory, setOf("beach"));

        Trip trip = Trip.builder()
                .destination("Nha Trang")
                .startDate(LocalDate.of(2026, 7, 10))
                .days(1)
                .build();

        ItineraryDayPlan stormyDay = new ItineraryDayPlan(1, List.of(
                new ItineraryItemPlan(beach, TimeSlot.MORNING, LocalTime.of(8, 0), LocalTime.of(10, 0))
        ));

        when(getWeatherForecastUseCase.execute(eq("Nha Trang"), anyDouble(), anyDouble(),
                eq(LocalDate.of(2026, 7, 10)), eq(LocalDate.of(2026, 7, 10))))
                .thenReturn(new WeatherForecast(
                        12.25,
                        109.2,
                        "Asia/Bangkok",
                        List.of(new WeatherForecast.DailyForecast(LocalDate.of(2026, 7, 10), 24, 28, 95, 95))
                ));

        List<ItineraryDayPlan> adjustedPlans = weatherAdjustmentService.adjust(trip, List.of(stormyDay));

        assertThat(adjustedPlans).hasSize(1);
        assertThat(adjustedPlans.getFirst().getItems()).extracting(item -> item.getPlace().getName())
                .containsExactly("Tran Phu Beach");
        assertThat(adjustedPlans.getFirst().getWeatherSummary()).contains("Canh bao giong bao");
        assertThat(adjustedPlans.getFirst().getWeatherSummary()).contains("Nen doi sang diem trong nha");
    }

    @Test
    void adjust_WhenNoPlaceCoordinates_ShouldAnnotateWithoutCallingForecastService() {
        PlaceCategory museumCategory = PlaceCategory.builder().name("Museum").slug("museum").build();
        Place placeWithoutLocation = Place.builder()
                .id(10L)
                .name("Museum Without Coordinates")
                .city("Nha Trang")
                .category(museumCategory)
                .location(null)
                .durationMinutes(60)
                .indoor(true)
                .tags(setOf("museum"))
                .build();

        Trip trip = Trip.builder()
                .destination("Nha Trang")
                .startDate(LocalDate.of(2026, 7, 10))
                .days(1)
                .build();

        List<ItineraryDayPlan> adjustedPlans = weatherAdjustmentService.adjust(
                trip,
                List.of(new ItineraryDayPlan(1, List.of(
                        new ItineraryItemPlan(placeWithoutLocation, TimeSlot.MORNING, LocalTime.of(8, 0), LocalTime.of(9, 0))
                )))
        );

        assertThat(adjustedPlans).hasSize(1);
        assertThat(adjustedPlans.getFirst().getWeatherSummary()).contains("Chua co du lieu thoi tiet");
        verify(getWeatherForecastUseCase, never()).execute(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    private Place place(Long id, String name, boolean indoor, PlaceCategory category, LinkedHashSet<String> tags) {
        return Place.builder()
                .id(id)
                .name(name)
                .city("Nha Trang")
                .category(category)
                .location(createPoint(109.18 + id * 0.01, 12.23 + id * 0.01))
                .durationMinutes(90)
                .indoor(indoor)
                .tags(tags)
                .build();
    }

    private LinkedHashSet<String> setOf(String value) {
        LinkedHashSet<String> tags = new LinkedHashSet<>();
        tags.add(value);
        return tags;
    }

    private Point createPoint(double lon, double lat) {
        return geometryFactory.createPoint(new Coordinate(lon, lat));
    }
}
