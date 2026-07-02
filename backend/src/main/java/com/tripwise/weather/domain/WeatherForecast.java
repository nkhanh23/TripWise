package com.tripwise.weather.domain;

import java.time.LocalDate;
import java.util.List;

public record WeatherForecast(
        double latitude,
        double longitude,
        String timezone,
        List<DailyForecast> dailyForecasts
) {

    public record DailyForecast(
            LocalDate date,
            double temperatureMinCelsius,
            double temperatureMaxCelsius,
            int precipitationProbabilityMax,
            int weatherCode
    ) {
    }
}
