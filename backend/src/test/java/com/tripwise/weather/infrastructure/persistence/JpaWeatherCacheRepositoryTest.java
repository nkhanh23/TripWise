package com.tripwise.weather.infrastructure.persistence;

import com.tripwise.weather.domain.entity.WeatherCache;
import com.tripwise.weather.domain.repository.WeatherCacheRepository;
import com.tripwise.weather.infrastructure.persistence.repository.WeatherCacheJpaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@EntityScan(basePackageClasses = WeatherCache.class)
@EnableJpaRepositories(basePackageClasses = WeatherCacheJpaRepository.class)
@Import(JpaWeatherCacheRepository.class)
class JpaWeatherCacheRepositoryTest {

    @Autowired
    private WeatherCacheRepository weatherCacheRepository;

    @Test
    void shouldReturnCachedForecastWhenNotExpired() {
        Instant now = Instant.parse("2026-07-02T09:00:00Z");
        LocalDate forecastDate = LocalDate.of(2026, 7, 2);

        weatherCacheRepository.save(WeatherCache.builder()
                .city("Nha Trang")
                .forecastDate(forecastDate)
                .tempMin(25)
                .tempMax(31)
                .rainProbability(40)
                .weatherCode("61")
                .expiresAt(now.plusSeconds(6 * 60 * 60))
                .build());

        Optional<WeatherCache> result = weatherCacheRepository.findValidForecast("nha trang", forecastDate, now);

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getTempMin()).isEqualTo(25);
        assertThat(result.orElseThrow().getWeatherCode()).isEqualTo("61");
    }

    @Test
    void shouldReturnEmptyWhenForecastIsExpired() {
        Instant now = Instant.parse("2026-07-02T09:00:00Z");
        LocalDate forecastDate = LocalDate.of(2026, 7, 2);

        weatherCacheRepository.save(WeatherCache.builder()
                .city("nha trang")
                .forecastDate(forecastDate)
                .tempMin(25)
                .tempMax(31)
                .rainProbability(40)
                .weatherCode("61")
                .expiresAt(now.minusSeconds(1))
                .build());

        Optional<WeatherCache> result = weatherCacheRepository.findValidForecast("nha trang", forecastDate, now);

        assertThat(result).isEmpty();
    }

    @Test
    void shouldReturnEmptyWhenForecastExpiresExactlyAtLookupTime() {
        Instant now = Instant.parse("2026-07-02T09:00:00Z");
        LocalDate forecastDate = LocalDate.of(2026, 7, 2);

        weatherCacheRepository.save(WeatherCache.builder()
                .city("nha trang")
                .forecastDate(forecastDate)
                .tempMin(25)
                .tempMax(31)
                .rainProbability(40)
                .weatherCode("61")
                .expiresAt(now)
                .build());

        Optional<WeatherCache> result = weatherCacheRepository.findValidForecast("nha trang", forecastDate, now);

        assertThat(result).isEmpty();
    }

    @Test
    void shouldNormalizeCityOnSaveAndLookup() {
        Instant now = Instant.parse("2026-07-02T09:00:00Z");
        LocalDate forecastDate = LocalDate.of(2026, 7, 2);

        WeatherCache saved = weatherCacheRepository.save(WeatherCache.builder()
                .city("  NHA TRANG ")
                .forecastDate(forecastDate)
                .tempMin(25)
                .tempMax(31)
                .rainProbability(40)
                .weatherCode("61")
                .expiresAt(now.plusSeconds(6 * 60 * 60))
                .build());

        Optional<WeatherCache> result = weatherCacheRepository.findValidForecast("nha trang", forecastDate, now);

        assertThat(saved.getCity()).isEqualTo("nha trang");
        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getCity()).isEqualTo("nha trang");
    }

    @Test
    void shouldReturnValidForecastsForDateRange() {
        Instant now = Instant.parse("2026-07-02T09:00:00Z");
        weatherCacheRepository.save(WeatherCache.builder()
                .city("nha trang")
                .forecastDate(LocalDate.of(2026, 7, 2))
                .tempMin(25)
                .tempMax(31)
                .rainProbability(40)
                .weatherCode("61")
                .expiresAt(now.plusSeconds(6 * 60 * 60))
                .build());
        weatherCacheRepository.save(WeatherCache.builder()
                .city("nha trang")
                .forecastDate(LocalDate.of(2026, 7, 3))
                .tempMin(24)
                .tempMax(30)
                .rainProbability(20)
                .weatherCode("1")
                .expiresAt(now.plusSeconds(6 * 60 * 60))
                .build());

        var result = weatherCacheRepository.findValidForecasts(
                "Nha Trang",
                LocalDate.of(2026, 7, 2),
                LocalDate.of(2026, 7, 3),
                now
        );

        assertThat(result).hasSize(2);
        assertThat(result.getFirst().getForecastDate()).isEqualTo(LocalDate.of(2026, 7, 2));
        assertThat(result.get(1).getForecastDate()).isEqualTo(LocalDate.of(2026, 7, 3));
    }

    @Test
    void shouldReturnCachedForecastsEvenIfExpiredWhenUsingFallbackLookup() {
        Instant now = Instant.parse("2026-07-02T09:00:00Z");
        weatherCacheRepository.save(WeatherCache.builder()
                .city("nha trang")
                .forecastDate(LocalDate.of(2026, 7, 2))
                .tempMin(25)
                .tempMax(31)
                .rainProbability(40)
                .weatherCode("61")
                .expiresAt(now.minusSeconds(1))
                .build());

        var result = weatherCacheRepository.findForecasts(
                "Nha Trang",
                LocalDate.of(2026, 7, 2),
                LocalDate.of(2026, 7, 2)
        );

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getForecastDate()).isEqualTo(LocalDate.of(2026, 7, 2));
    }

    @Test
    void shouldNotReturnForecastForDifferentDate() {
        Instant now = Instant.parse("2026-07-02T09:00:00Z");

        weatherCacheRepository.save(WeatherCache.builder()
                .city("nha trang")
                .forecastDate(LocalDate.of(2026, 7, 2))
                .tempMin(25)
                .tempMax(31)
                .rainProbability(40)
                .weatherCode("61")
                .expiresAt(now.plusSeconds(6 * 60 * 60))
                .build());

        Optional<WeatherCache> result = weatherCacheRepository.findValidForecast(
                "nha trang",
                LocalDate.of(2026, 7, 3),
                now
        );

        assertThat(result).isEmpty();
    }

    @Test
    void shouldUpdateExistingForecastForSameCityAndDate() {
        Instant now = Instant.parse("2026-07-02T09:00:00Z");
        LocalDate forecastDate = LocalDate.of(2026, 7, 2);

        WeatherCache firstSave = weatherCacheRepository.save(WeatherCache.builder()
                .city("nha trang")
                .forecastDate(forecastDate)
                .tempMin(25)
                .tempMax(31)
                .rainProbability(40)
                .weatherCode("61")
                .expiresAt(now.plusSeconds(60))
                .build());

        WeatherCache secondSave = weatherCacheRepository.save(WeatherCache.builder()
                .city("Nha Trang")
                .forecastDate(forecastDate)
                .tempMin(26)
                .tempMax(32)
                .rainProbability(20)
                .weatherCode("1")
                .expiresAt(now.plusSeconds(120))
                .build());

        Optional<WeatherCache> result = weatherCacheRepository.findValidForecast("nha trang", forecastDate, now);

        assertThat(secondSave.getId()).isEqualTo(firstSave.getId());
        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getTempMin()).isEqualTo(26);
        assertThat(result.orElseThrow().getTempMax()).isEqualTo(32);
        assertThat(result.orElseThrow().getWeatherCode()).isEqualTo("1");
    }
}
