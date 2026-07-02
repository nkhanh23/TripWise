package com.tripwise.weather.infrastructure;

import com.tripwise.common.exception.BusinessException;
import com.tripwise.common.exception.ExternalServiceException;
import com.tripwise.weather.domain.WeatherForecast;
import com.tripwise.weather.infrastructure.config.WeatherProperties;
import com.tripwise.weather.infrastructure.dto.OpenMeteoForecastResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class WeatherClient {

    private final RestClient restClient;

    @Autowired
    public WeatherClient(WeatherProperties weatherProperties, RestClient.Builder restClientBuilder) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) weatherProperties.getTimeout().toMillis());
        requestFactory.setReadTimeout((int) weatherProperties.getTimeout().toMillis());

        this.restClient = restClientBuilder
                .baseUrl(weatherProperties.getApiUrl())
                .requestFactory(requestFactory)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    WeatherClient(RestClient restClient) {
        this.restClient = restClient;
    }

    public WeatherForecast getForecast(double latitude, double longitude, LocalDate startDate, LocalDate endDate) {
        validateLatitude(latitude);
        validateLongitude(longitude);
        validateDateRange(startDate, endDate);

        try {
            log.info("Calling Open-Meteo API for coordinates ({}, {}) from {} to {}",
                    latitude, longitude, startDate, endDate);

            OpenMeteoForecastResponse response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/forecast")
                            .queryParam("latitude", latitude)
                            .queryParam("longitude", longitude)
                            .queryParam("start_date", startDate)
                            .queryParam("end_date", endDate)
                            .queryParam("daily",
                                    "temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code")
                            .queryParam("timezone", "auto")
                            .build())
                    .retrieve()
                    .body(OpenMeteoForecastResponse.class);

            return mapResponse(response);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to get forecast from Open-Meteo: {}", ex.getMessage(), ex);
            throw new ExternalServiceException("Lỗi khi kết nối với Open-Meteo API: " + ex.getMessage());
        }
    }

    private WeatherForecast mapResponse(OpenMeteoForecastResponse response) {
        if (response == null
                || response.getLatitude() == null
                || response.getLongitude() == null
                || response.getTimezone() == null
                || response.getDaily() == null) {
            throw new ExternalServiceException("Open-Meteo returned an empty or invalid response");
        }

        OpenMeteoForecastResponse.DailyData daily = response.getDaily();
        if (daily.getTime() == null
                || daily.getTemperature2mMin() == null
                || daily.getTemperature2mMax() == null
                || daily.getPrecipitationProbabilityMax() == null
                || daily.getWeatherCode() == null) {
            throw new ExternalServiceException("Open-Meteo returned incomplete daily forecast data");
        }

        int size = daily.getTime().size();
        if (size == 0
                || daily.getTemperature2mMin().size() != size
                || daily.getTemperature2mMax().size() != size
                || daily.getPrecipitationProbabilityMax().size() != size
                || daily.getWeatherCode().size() != size) {
            throw new ExternalServiceException("Open-Meteo returned inconsistent daily forecast data");
        }

        List<WeatherForecast.DailyForecast> dailyForecasts = new ArrayList<>(size);
        for (int index = 0; index < size; index++) {
            dailyForecasts.add(new WeatherForecast.DailyForecast(
                    daily.getTime().get(index),
                    daily.getTemperature2mMin().get(index),
                    daily.getTemperature2mMax().get(index),
                    daily.getPrecipitationProbabilityMax().get(index),
                    daily.getWeatherCode().get(index)
            ));
        }

        return new WeatherForecast(
                response.getLatitude(),
                response.getLongitude(),
                response.getTimezone(),
                dailyForecasts
        );
    }

    private void validateLatitude(double latitude) {
        if (latitude < -90 || latitude > 90) {
            throw new BusinessException("latitude phải nằm trong khoảng từ -90 đến 90",
                    "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }
    }

    private void validateLongitude(double longitude) {
        if (longitude < -180 || longitude > 180) {
            throw new BusinessException("longitude phải nằm trong khoảng từ -180 đến 180",
                    "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new BusinessException("startDate và endDate không được để trống",
                    "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }
        if (endDate.isBefore(startDate)) {
            throw new BusinessException("endDate phải lớn hơn hoặc bằng startDate",
                    "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }
    }
}
