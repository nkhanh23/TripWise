package com.tripwise.weather.application.service;

import com.tripwise.itinerary.domain.ItineraryDayPlan;
import com.tripwise.itinerary.domain.ItineraryItemPlan;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.weather.domain.WeatherForecast;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeatherAdjustmentService {

    private static final String FORECAST_UNAVAILABLE_SUMMARY = "Chua co du lieu thoi tiet, giu lich trinh hien tai.";
    private static final String CLEAR_DAY_SUMMARY = "Thoi tiet thuan loi cho hoat dong ngoai troi.";
    private static final String LIGHT_RAIN_SUMMARY = "Co kha nang mua, nen linh hoat giua hoat dong trong nha va ngoai troi.";
    private static final String HEAVY_RAIN_SUMMARY = "Mua lon, uu tien hoat dong trong nha va can nhac doi diem ngoai troi.";
    private static final String STORM_SUMMARY = "Canh bao giong bao, han che hoat dong ngoai troi va theo doi thoi tiet sat gio di.";

    private final GetWeatherForecastUseCase getWeatherForecastUseCase;

    public List<ItineraryDayPlan> adjust(Trip trip, List<ItineraryDayPlan> dayPlans) {
        if (trip == null || dayPlans == null || dayPlans.isEmpty()) {
            return List.of();
        }

        if (trip.getStartDate() == null) {
            return annotateWithoutForecast(dayPlans);
        }

        Optional<CoordinateSummary> coordinateSummary = calculateCoordinateSummary(dayPlans);
        if (coordinateSummary.isEmpty()) {
            return annotateWithoutForecast(dayPlans);
        }

        LocalDate startDate = trip.getStartDate();
        LocalDate endDate = startDate.plusDays(dayPlans.size() - 1L);

        WeatherForecast forecast = getWeatherForecastUseCase.execute(
                trip.getDestination(),
                coordinateSummary.get().latitude(),
                coordinateSummary.get().longitude(),
                startDate,
                endDate
        );

        Map<LocalDate, WeatherForecast.DailyForecast> forecastByDate = forecast.dailyForecasts().stream()
                .collect(Collectors.toMap(WeatherForecast.DailyForecast::date, dailyForecast -> dailyForecast));

        List<MutableDayPlan> mutableDayPlans = dayPlans.stream()
                .map(dayPlan -> toMutableDayPlan(dayPlan, startDate, forecastByDate))
                .collect(Collectors.toCollection(ArrayList::new));

        applyWholeDaySwaps(mutableDayPlans);

        return mutableDayPlans.stream()
                .sorted(Comparator.comparingInt(MutableDayPlan::dayNumber))
                .map(day -> new ItineraryDayPlan(day.dayNumber(), day.summary(), List.copyOf(day.items())))
                .toList();
    }

    private List<ItineraryDayPlan> annotateWithoutForecast(List<ItineraryDayPlan> dayPlans) {
        return dayPlans.stream()
                .map(dayPlan -> new ItineraryDayPlan(dayPlan.getDayNumber(), FORECAST_UNAVAILABLE_SUMMARY, dayPlan.getItems()))
                .toList();
    }

    private MutableDayPlan toMutableDayPlan(
            ItineraryDayPlan dayPlan,
            LocalDate startDate,
            Map<LocalDate, WeatherForecast.DailyForecast> forecastByDate
    ) {
        LocalDate forecastDate = startDate.plusDays(dayPlan.getDayNumber() - 1L);
        WeatherForecast.DailyForecast dailyForecast = forecastByDate.get(forecastDate);
        WeatherCondition weatherCondition = classifyWeather(dailyForecast);
        return new MutableDayPlan(
                dayPlan.getDayNumber(),
                new ArrayList<>(dayPlan.getItems()),
                buildBaseSummary(weatherCondition),
                weatherCondition,
                countOutdoorPlaces(dayPlan.getItems()),
                countIndoorPlaces(dayPlan.getItems()),
                hasBeachActivity(dayPlan.getItems())
        );
    }

    private void applyWholeDaySwaps(List<MutableDayPlan> dayPlans) {
        Set<Integer> swappedDayNumbers = new java.util.HashSet<>();

        List<MutableDayPlan> rainyDays = dayPlans.stream()
                .filter(this::shouldMoveOutdoorActivities)
                .sorted(Comparator.comparingInt((MutableDayPlan day) -> day.condition().priority()).reversed())
                .toList();

        for (MutableDayPlan rainyDay : rainyDays) {
            if (swappedDayNumbers.contains(rainyDay.dayNumber())) {
                continue;
            }

            Optional<MutableDayPlan> sunnyDayCandidate = dayPlans.stream()
                    .filter(day -> day.dayNumber() != rainyDay.dayNumber())
                    .filter(day -> !swappedDayNumbers.contains(day.dayNumber()))
                    .filter(day -> isBetterWeatherCandidate(day, rainyDay))
                    .filter(day -> rainyDay.outdoorCount() > day.outdoorCount())
                    .max(Comparator
                            .comparingInt((MutableDayPlan day) -> day.condition().priority())
                            .reversed()
                            .thenComparingInt(MutableDayPlan::indoorCount)
                            .thenComparingInt(day -> -day.outdoorCount()));

            if (sunnyDayCandidate.isEmpty()) {
                rainyDay.setSummary(appendSuggestion(rainyDay.summary(), rainyDay.condition()));
                continue;
            }

            MutableDayPlan sunnyDay = sunnyDayCandidate.get();
            List<ItineraryItemPlan> rainyItems = new ArrayList<>(rainyDay.items());
            rainyDay.setItems(new ArrayList<>(sunnyDay.items()));
            sunnyDay.setItems(rainyItems);

            rainyDay.setSummary(appendSwapNote(rainyDay.summary(), sunnyDay.dayNumber(), true));
            sunnyDay.setSummary(appendSwapNote(sunnyDay.summary(), rainyDay.dayNumber(), false));

            swappedDayNumbers.add(rainyDay.dayNumber());
            swappedDayNumbers.add(sunnyDay.dayNumber());
        }
    }

    private boolean shouldMoveOutdoorActivities(MutableDayPlan dayPlan) {
        return (dayPlan.condition() == WeatherCondition.HEAVY_RAIN || dayPlan.condition() == WeatherCondition.STORM)
                && dayPlan.outdoorCount() > dayPlan.indoorCount()
                && dayPlan.hasBeachActivity();
    }

    private boolean isBetterWeatherCandidate(MutableDayPlan candidate, MutableDayPlan rainyDay) {
        return candidate.condition().priority() < rainyDay.condition().priority()
                && (candidate.condition() == WeatherCondition.CLEAR || candidate.condition() == WeatherCondition.LIGHT_RAIN);
    }

    private String appendSuggestion(String summary, WeatherCondition condition) {
        if (condition == WeatherCondition.STORM) {
            return summary + " Nen doi sang diem trong nha neu nguoi dung muon giu ngay di.";
        }
        if (condition == WeatherCondition.HEAVY_RAIN) {
            return summary + " Nen uu tien diem trong nha va doi bai bien sang ngay nang hon neu co the.";
        }
        return summary;
    }

    private String appendSwapNote(String summary, int relatedDayNumber, boolean rainyDay) {
        if (rainyDay) {
            return summary + " Da chuyen hoat dong ngoai troi sang ngay " + relatedDayNumber + " de giam rui ro thoi tiet.";
        }
        return summary + " Da nhan hoat dong ngoai troi tu ngay " + relatedDayNumber + " vi thoi tiet thuan loi hon.";
    }

    private WeatherCondition classifyWeather(WeatherForecast.DailyForecast dailyForecast) {
        if (dailyForecast == null) {
            return WeatherCondition.UNAVAILABLE;
        }

        int weatherCode = dailyForecast.weatherCode();
        int precipitationProbability = dailyForecast.precipitationProbabilityMax();

        if (weatherCode == 95 || weatherCode == 96 || weatherCode == 99) {
            return WeatherCondition.STORM;
        }
        if (precipitationProbability >= 70 || Set.of(63, 65, 80, 81, 82).contains(weatherCode)) {
            return WeatherCondition.HEAVY_RAIN;
        }
        if (precipitationProbability >= 40 || Set.of(51, 53, 55, 56, 57, 61).contains(weatherCode)) {
            return WeatherCondition.LIGHT_RAIN;
        }
        if (precipitationProbability < 30 && Set.of(0, 1, 2).contains(weatherCode)) {
            return WeatherCondition.CLEAR;
        }
        return WeatherCondition.UNAVAILABLE;
    }

    private String buildBaseSummary(WeatherCondition weatherCondition) {
        return switch (weatherCondition) {
            case CLEAR -> CLEAR_DAY_SUMMARY;
            case LIGHT_RAIN -> LIGHT_RAIN_SUMMARY;
            case HEAVY_RAIN -> HEAVY_RAIN_SUMMARY;
            case STORM -> STORM_SUMMARY;
            case UNAVAILABLE -> FORECAST_UNAVAILABLE_SUMMARY;
        };
    }

    private Optional<CoordinateSummary> calculateCoordinateSummary(List<ItineraryDayPlan> dayPlans) {
        List<Point> points = dayPlans.stream()
                .flatMap(dayPlan -> dayPlan.getItems().stream())
                .map(ItineraryItemPlan::getPlace)
                .map(Place::getLocation)
                .filter(location -> location != null)
                .toList();

        if (points.isEmpty()) {
            log.debug("Skipping weather adjustment because itinerary has no place coordinates");
            return Optional.empty();
        }

        double averageLatitude = points.stream().mapToDouble(Point::getY).average().orElse(0.0);
        double averageLongitude = points.stream().mapToDouble(Point::getX).average().orElse(0.0);
        return Optional.of(new CoordinateSummary(averageLatitude, averageLongitude));
    }

    private int countOutdoorPlaces(List<ItineraryItemPlan> items) {
        return (int) items.stream()
                .map(ItineraryItemPlan::getPlace)
                .filter(place -> place != null && !Boolean.TRUE.equals(place.getIndoor()))
                .count();
    }

    private int countIndoorPlaces(List<ItineraryItemPlan> items) {
        return (int) items.stream()
                .map(ItineraryItemPlan::getPlace)
                .filter(place -> place != null && Boolean.TRUE.equals(place.getIndoor()))
                .count();
    }

    private boolean hasBeachActivity(List<ItineraryItemPlan> items) {
        return items.stream()
                .map(ItineraryItemPlan::getPlace)
                .filter(place -> place != null)
                .anyMatch(this::isBeachPlace);
    }

    private boolean isBeachPlace(Place place) {
        if (place.getCategory() != null) {
            String categoryName = normalize(place.getCategory().getName());
            String categorySlug = normalize(place.getCategory().getSlug());
            if (categoryName.contains("beach") || categorySlug.contains("beach")) {
                return true;
            }
        }

        return place.getTags().stream()
                .map(this::normalize)
                .anyMatch(tag -> tag.contains("beach") || tag.contains("bien"));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private enum WeatherCondition {
        CLEAR(0),
        LIGHT_RAIN(1),
        HEAVY_RAIN(2),
        STORM(3),
        UNAVAILABLE(4);

        private final int priority;

        WeatherCondition(int priority) {
            this.priority = priority;
        }

        public int priority() {
            return priority;
        }
    }

    private record CoordinateSummary(double latitude, double longitude) {
    }

    private static final class MutableDayPlan {
        private final int dayNumber;
        private final WeatherCondition condition;
        private final int outdoorCount;
        private final int indoorCount;
        private final boolean hasBeachActivity;
        private List<ItineraryItemPlan> items;
        private String summary;

        private MutableDayPlan(
                int dayNumber,
                List<ItineraryItemPlan> items,
                String summary,
                WeatherCondition condition,
                int outdoorCount,
                int indoorCount,
                boolean hasBeachActivity
        ) {
            this.dayNumber = dayNumber;
            this.items = items;
            this.summary = summary;
            this.condition = condition;
            this.outdoorCount = outdoorCount;
            this.indoorCount = indoorCount;
            this.hasBeachActivity = hasBeachActivity;
        }

        int dayNumber() {
            return dayNumber;
        }

        List<ItineraryItemPlan> items() {
            return items;
        }

        void setItems(List<ItineraryItemPlan> items) {
            this.items = items;
        }

        String summary() {
            return summary;
        }

        void setSummary(String summary) {
            this.summary = summary;
        }

        WeatherCondition condition() {
            return condition;
        }

        int outdoorCount() {
            return outdoorCount;
        }

        int indoorCount() {
            return indoorCount;
        }

        boolean hasBeachActivity() {
            return hasBeachActivity;
        }
    }
}
