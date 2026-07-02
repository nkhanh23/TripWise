package com.tripwise.weather.infrastructure.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class OpenMeteoForecastResponse {

    private Double latitude;
    private Double longitude;
    private String timezone;
    private DailyData daily;

    @Data
    public static class DailyData {
        private List<LocalDate> time;

        @JsonProperty("temperature_2m_min")
        private List<Double> temperature2mMin;

        @JsonProperty("temperature_2m_max")
        private List<Double> temperature2mMax;

        @JsonProperty("precipitation_probability_max")
        private List<Integer> precipitationProbabilityMax;

        @JsonProperty("weather_code")
        private List<Integer> weatherCode;
    }
}
