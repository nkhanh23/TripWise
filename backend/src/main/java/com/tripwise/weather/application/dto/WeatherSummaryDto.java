package com.tripwise.weather.application.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * A lightweight, immutable DTO representing weather forecast summaries.
 * Optimized with short property names to minimize JSON payload size and token consumption for Gemini API.
 */
public record WeatherSummaryDto(
        double latitude,
        double longitude,
        String timezone,
        List<DailyWeatherSummary> dailyForecasts
) {
    /**
     * Nested lightweight daily weather record.
     */
    public record DailyWeatherSummary(
            LocalDate date,
            double tempMin,
            double tempMax,
            int rainProb,
            int weatherCode
    ) {
    }
}
