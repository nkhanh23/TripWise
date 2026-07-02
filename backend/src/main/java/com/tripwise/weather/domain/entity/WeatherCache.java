package com.tripwise.weather.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;

@Entity
@Table(name = "weather_cache")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeatherCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "city", nullable = false, length = 100)
    private String city;

    @Column(name = "forecast_date", nullable = false)
    private LocalDate forecastDate;

    @Column(name = "temp_min", nullable = false)
    private Integer tempMin;

    @Column(name = "temp_max", nullable = false)
    private Integer tempMax;

    @Column(name = "rain_probability", nullable = false)
    private Integer rainProbability;

    @Column(name = "weather_code", nullable = false, length = 50)
    private String weatherCode;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public boolean isExpired(Instant now) {
        return !expiresAt.isAfter(now);
    }

    public static String normalizeCity(String city) {
        return city == null ? "" : city.trim().toLowerCase(Locale.ROOT);
    }
}
