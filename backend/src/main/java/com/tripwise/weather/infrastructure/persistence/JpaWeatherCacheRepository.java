package com.tripwise.weather.infrastructure.persistence;

import com.tripwise.weather.domain.entity.WeatherCache;
import com.tripwise.weather.domain.repository.WeatherCacheRepository;
import com.tripwise.weather.infrastructure.persistence.repository.WeatherCacheJpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public class JpaWeatherCacheRepository implements WeatherCacheRepository {

    private final WeatherCacheJpaRepository weatherCacheJpaRepository;

    public JpaWeatherCacheRepository(WeatherCacheJpaRepository weatherCacheJpaRepository) {
        this.weatherCacheJpaRepository = weatherCacheJpaRepository;
    }

    @Override
    public Optional<WeatherCache> findValidForecast(String city, LocalDate forecastDate, Instant now) {
        return weatherCacheJpaRepository.findFirstByCityAndForecastDateAndExpiresAtAfter(
                WeatherCache.normalizeCity(city),
                forecastDate,
                now
        );
    }

    @Override
    public List<WeatherCache> findValidForecasts(String city, LocalDate startDate, LocalDate endDate, Instant now) {
        return weatherCacheJpaRepository.findByCityAndForecastDateBetweenAndExpiresAtAfterOrderByForecastDateAsc(
                WeatherCache.normalizeCity(city),
                startDate,
                endDate,
                now
        );
    }

    @Override
    public List<WeatherCache> findForecasts(String city, LocalDate startDate, LocalDate endDate) {
        return weatherCacheJpaRepository.findByCityAndForecastDateBetweenOrderByForecastDateAsc(
                WeatherCache.normalizeCity(city),
                startDate,
                endDate
        );
    }

    @Override
    public WeatherCache save(WeatherCache weatherCache) {
        String normalizedCity = WeatherCache.normalizeCity(weatherCache.getCity());
        weatherCache.setCity(normalizedCity);

        weatherCacheJpaRepository.findFirstByCityAndForecastDate(normalizedCity, weatherCache.getForecastDate())
                .ifPresent(existing -> weatherCache.setId(existing.getId()));

        return weatherCacheJpaRepository.save(weatherCache);
    }
}
