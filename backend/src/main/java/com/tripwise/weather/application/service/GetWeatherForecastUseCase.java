package com.tripwise.weather.application.service;

import com.tripwise.common.exception.BusinessException;
import com.tripwise.common.exception.ExternalServiceException;
import com.tripwise.weather.domain.WeatherForecast;
import com.tripwise.weather.domain.entity.WeatherCache;
import com.tripwise.weather.domain.repository.WeatherCacheRepository;
import com.tripwise.weather.infrastructure.WeatherClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class GetWeatherForecastUseCase {

    private static final Duration WEATHER_CACHE_TTL = Duration.ofHours(6);
    private static final String UNAVAILABLE_TIMEZONE = "unavailable";

    private final WeatherCacheRepository weatherCacheRepository;
    private final WeatherClient weatherClient;

    public WeatherForecast execute(
            String city,
            double latitude,
            double longitude,
            LocalDate startDate,
            LocalDate endDate
    ) {
        validateCity(city);
        validateLatitude(latitude);
        validateLongitude(longitude);
        validateDateRange(startDate, endDate);

        Instant now = Instant.now();
        int requestedDays = countRequestedDays(startDate, endDate);

        List<WeatherCache> validCachedForecasts = weatherCacheRepository.findValidForecasts(city, startDate, endDate, now);
        if (validCachedForecasts.size() == requestedDays) {
            log.debug("Weather cache hit for city {} from {} to {}", normalizeCity(city), startDate, endDate);
            return mapFromCache(latitude, longitude, validCachedForecasts);
        }

        try {
            WeatherForecast forecast = weatherClient.getForecast(latitude, longitude, startDate, endDate);
            persistForecast(city, forecast, now);
            return forecast;
        } catch (ExternalServiceException ex) {
            log.warn("Weather API unavailable for city {} from {} to {}. Trying cached fallback: {}",
                    normalizeCity(city), startDate, endDate, ex.getMessage());

            List<WeatherCache> cachedForecasts = weatherCacheRepository.findForecasts(city, startDate, endDate);
            if (cachedForecasts.size() == requestedDays) {
                return mapFromCache(latitude, longitude, cachedForecasts);
            }

            return new WeatherForecast(latitude, longitude, UNAVAILABLE_TIMEZONE, List.of());
        }
    }

    private void persistForecast(String city, WeatherForecast forecast, Instant now) {
        for (WeatherForecast.DailyForecast dailyForecast : forecast.dailyForecasts()) {
            weatherCacheRepository.save(WeatherCache.builder()
                    .city(city)
                    .forecastDate(dailyForecast.date())
                    .tempMin((int) Math.round(dailyForecast.temperatureMinCelsius()))
                    .tempMax((int) Math.round(dailyForecast.temperatureMaxCelsius()))
                    .rainProbability(dailyForecast.precipitationProbabilityMax())
                    .weatherCode(Integer.toString(dailyForecast.weatherCode()))
                    .expiresAt(now.plus(WEATHER_CACHE_TTL))
                    .build());
        }
    }

    private WeatherForecast mapFromCache(double latitude, double longitude, List<WeatherCache> cachedForecasts) {
        List<WeatherForecast.DailyForecast> dailyForecasts = cachedForecasts.stream()
                .map(forecast -> new WeatherForecast.DailyForecast(
                        forecast.getForecastDate(),
                        forecast.getTempMin(),
                        forecast.getTempMax(),
                        forecast.getRainProbability(),
                        Integer.parseInt(forecast.getWeatherCode())
                ))
                .toList();

        return new WeatherForecast(latitude, longitude, UNAVAILABLE_TIMEZONE, dailyForecasts);
    }

    private int countRequestedDays(LocalDate startDate, LocalDate endDate) {
        return Math.toIntExact(startDate.datesUntil(endDate.plusDays(1)).count());
    }

    private void validateCity(String city) {
        if (city == null || city.isBlank()) {
            throw new BusinessException("city không được để trống", "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }
    }

    private String normalizeCity(String city) {
        return city.trim().toLowerCase(Locale.ROOT);
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
