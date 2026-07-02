package com.tripwise.weather.infrastructure.persistence.repository;

import com.tripwise.weather.domain.entity.WeatherCache;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WeatherCacheJpaRepository extends JpaRepository<WeatherCache, Long> {

    Optional<WeatherCache> findFirstByCityAndForecastDateAndExpiresAtAfter(
            String city,
            LocalDate forecastDate,
            Instant now
    );

    Optional<WeatherCache> findFirstByCityAndForecastDate(
            String city,
            LocalDate forecastDate
    );

    List<WeatherCache> findByCityAndForecastDateBetweenAndExpiresAtAfterOrderByForecastDateAsc(
            String city,
            LocalDate startDate,
            LocalDate endDate,
            Instant now
    );

    List<WeatherCache> findByCityAndForecastDateBetweenOrderByForecastDateAsc(
            String city,
            LocalDate startDate,
            LocalDate endDate
    );
}
