package com.tripwise.weather.infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.common.exception.ExternalServiceException;
import com.tripwise.weather.domain.WeatherForecast;
import com.tripwise.weather.domain.gateway.WeatherGateway;
import com.tripwise.weather.infrastructure.config.WeatherProperties;
import com.tripwise.weather.infrastructure.dto.OpenMeteoForecastResponse;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Infrastructure Adapter for Open-Meteo API weather provider.
 * Implements {@link WeatherGateway} port from Domain layer.
 * Includes Redis caching for raw JSON response and Resilience4j Circuit Breaker.
 */
@Slf4j
@Component
public class OpenMeteoAdapter implements WeatherGateway {

    private static final String CACHE_KEY_PREFIX = "tripwise:weather:raw:";
    private static final Duration CACHE_TTL = Duration.ofHours(6);

    private final RestClient restClient;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final CircuitBreaker circuitBreaker;

    @Autowired
    public OpenMeteoAdapter(WeatherProperties weatherProperties,
                             RestClient.Builder restClientBuilder,
                             StringRedisTemplate redisTemplate,
                             ObjectMapper objectMapper) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) weatherProperties.getTimeout().toMillis());
        requestFactory.setReadTimeout((int) weatherProperties.getTimeout().toMillis());

        this.restClient = restClientBuilder
                .baseUrl(weatherProperties.getApiUrl())
                .requestFactory(requestFactory)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
                
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;

        // Programmatic configuration of Resilience4j Circuit Breaker
        CircuitBreakerConfig cbConfig = CircuitBreakerConfig.custom()
                .failureRateThreshold(50) // Open circuit if >= 50% calls fail
                .waitDurationInOpenState(Duration.ofSeconds(10)) // Wait 10s in OPEN state
                .slidingWindowSize(10) // Size of sliding window
                .recordExceptions(Exception.class) // Count all exceptions as failure
                .build();
        CircuitBreakerRegistry registry = CircuitBreakerRegistry.of(cbConfig);
        this.circuitBreaker = registry.circuitBreaker("openMeteoSearch");
    }

    // Constructor for testing purpose to inject mocked dependencies
    public OpenMeteoAdapter(RestClient restClient,
                             StringRedisTemplate redisTemplate,
                             ObjectMapper objectMapper,
                             CircuitBreaker circuitBreaker) {
        this.restClient = restClient;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.circuitBreaker = circuitBreaker;
    }

    @Override
    public WeatherForecast getForecast(double latitude, double longitude, LocalDate startDate, LocalDate endDate) {
        String cacheKey = generateCacheKey(latitude, longitude, startDate, endDate);
        
        // 1. Try to read raw JSON response from Redis cache first
        try {
            String cachedJson = redisTemplate.opsForValue().get(cacheKey);
            if (cachedJson != null) {
                log.debug("Infrastructure cache hit for key: {}", cacheKey);
                OpenMeteoForecastResponse cachedResponse = objectMapper.readValue(cachedJson, OpenMeteoForecastResponse.class);
                return mapResponse(cachedResponse);
            }
        } catch (Exception e) {
            log.warn("Failed to read raw weather forecast from Redis cache: {}", e.getMessage());
            // Fail-safe: continue to call API if cache fails
        }

        // 2. Call Open-Meteo API wrapped inside Circuit Breaker
        try {
            OpenMeteoForecastResponse response = circuitBreaker.executeSupplier(() -> callOpenMeteoApi(latitude, longitude, startDate, endDate));
            
            // 3. Write raw JSON response to Redis cache
            if (response != null) {
                try {
                    String jsonString = objectMapper.writeValueAsString(response);
                    redisTemplate.opsForValue().set(cacheKey, jsonString, CACHE_TTL.toSeconds(), TimeUnit.SECONDS);
                    log.debug("Successfully cached raw weather forecast for key: {}", cacheKey);
                } catch (Exception e) {
                    log.warn("Failed to write raw weather forecast to Redis cache: {}", e.getMessage());
                }
            }

            return mapResponse(response);
        } catch (io.github.resilience4j.circuitbreaker.CallNotPermittedException e) {
            log.error("Circuit breaker is OPEN for Open-Meteo API: {}", e.getMessage());
            throw new ExternalServiceException("Open-Meteo API bị ngắt mạch (Circuit Breaker OPEN): " + e.getMessage());
        } catch (Exception e) {
            log.error("Failed to get forecast from Open-Meteo: {}", e.getMessage(), e);
            throw new ExternalServiceException("Lỗi khi kết nối với Open-Meteo API: " + e.getMessage());
        }
    }

    private OpenMeteoForecastResponse callOpenMeteoApi(double latitude, double longitude, LocalDate startDate, LocalDate endDate) {
        log.info("Calling Open-Meteo API for coordinates ({}, {}) from {} to {}",
                latitude, longitude, startDate, endDate);

        return restClient.get()
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
    }

    private String generateCacheKey(double latitude, double longitude, LocalDate startDate, LocalDate endDate) {
        return CACHE_KEY_PREFIX + String.format("%.4f:%.4f:%s:%s", latitude, longitude, startDate, endDate);
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
}
