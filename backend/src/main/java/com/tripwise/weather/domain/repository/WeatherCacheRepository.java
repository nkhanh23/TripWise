package com.tripwise.weather.domain.repository;

import com.tripwise.weather.domain.entity.WeatherCache;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WeatherCacheRepository {

    Optional<WeatherCache> findValidForecast(String city, LocalDate forecastDate, Instant now);

    List<WeatherCache> findValidForecasts(String city, LocalDate startDate, LocalDate endDate, Instant now);

    List<WeatherCache> findForecasts(String city, LocalDate startDate, LocalDate endDate);

    WeatherCache save(WeatherCache weatherCache);
}
