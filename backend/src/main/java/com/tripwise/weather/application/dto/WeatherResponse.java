package com.tripwise.weather.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeatherResponse {

    private String city;
    private double latitude;
    private double longitude;
    private String timezone;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<DailyWeatherResponse> dailyForecasts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyWeatherResponse {
        private LocalDate date;
        private double temperatureMinCelsius;
        private double temperatureMaxCelsius;
        private int precipitationProbabilityMax;
        private int weatherCode;
    }
}
