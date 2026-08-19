package com.tripwise.weather.infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.common.exception.ExternalServiceException;
import com.tripwise.weather.domain.WeatherForecast;
import com.tripwise.weather.infrastructure.dto.OpenMeteoForecastResponse;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OpenMeteoAdapterTest {

    @Mock
    private RestClient restClient;

    @Mock
    private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private ObjectMapper objectMapper;

    private CircuitBreaker circuitBreaker;
    private OpenMeteoAdapter openMeteoAdapter;

    @BeforeEach
    void setUp() {
        // Build a strict local CircuitBreaker to verify behavior
        CircuitBreakerConfig cbConfig = CircuitBreakerConfig.custom()
                .failureRateThreshold(50)
                .waitDurationInOpenState(Duration.ofSeconds(1))
                .slidingWindowSize(2)
                .recordExceptions(Exception.class)
                .build();
        CircuitBreakerRegistry registry = CircuitBreakerRegistry.of(cbConfig);
        circuitBreaker = registry.circuitBreaker("openMeteoSearchTest");

        openMeteoAdapter = new OpenMeteoAdapter(restClient, redisTemplate, objectMapper, circuitBreaker);
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldReturnFromCache_WhenCacheHit() throws Exception {
        // Arrange
        String cacheKey = "tripwise:weather:raw:12.2388:109.1967:2026-07-02:2026-07-03";
        String cachedJson = "{\"latitude\":12.24,\"longitude\":109.2,\"timezone\":\"Asia/Ho_Chi_Minh\"}";
        
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(cacheKey)).thenReturn(cachedJson);

        OpenMeteoForecastResponse mockResponse = new OpenMeteoForecastResponse();
        mockResponse.setLatitude(12.24);
        mockResponse.setLongitude(109.2);
        mockResponse.setTimezone("Asia/Ho_Chi_Minh");
        OpenMeteoForecastResponse.DailyData dailyData = new OpenMeteoForecastResponse.DailyData();
        dailyData.setTime(List.of(LocalDate.of(2026, 7, 2)));
        dailyData.setTemperature2mMin(List.of(24.0));
        dailyData.setTemperature2mMax(List.of(31.0));
        dailyData.setPrecipitationProbabilityMax(List.of(10));
        dailyData.setWeatherCode(List.of(1));
        mockResponse.setDaily(dailyData);

        when(objectMapper.readValue(cachedJson, OpenMeteoForecastResponse.class)).thenReturn(mockResponse);

        // Act
        WeatherForecast forecast = openMeteoAdapter.getForecast(12.2388, 109.1967, LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 3));

        // Assert
        assertThat(forecast).isNotNull();
        assertThat(forecast.latitude()).isEqualTo(12.24);
        verify(redisTemplate).opsForValue();
        verifyNoInteractions(restClient);
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldCallApiAndCache_WhenCacheMiss() throws Exception {
        // Arrange
        String cacheKey = "tripwise:weather:raw:12.2388:109.1967:2026-07-02:2026-07-03";
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(cacheKey)).thenReturn(null);

        OpenMeteoForecastResponse mockResponse = new OpenMeteoForecastResponse();
        mockResponse.setLatitude(12.24);
        mockResponse.setLongitude(109.2);
        mockResponse.setTimezone("Asia/Ho_Chi_Minh");
        OpenMeteoForecastResponse.DailyData dailyData = new OpenMeteoForecastResponse.DailyData();
        dailyData.setTime(List.of(LocalDate.of(2026, 7, 2)));
        dailyData.setTemperature2mMin(List.of(24.0));
        dailyData.setTemperature2mMax(List.of(31.0));
        dailyData.setPrecipitationProbabilityMax(List.of(10));
        dailyData.setWeatherCode(List.of(1));
        mockResponse.setDaily(dailyData);

        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OpenMeteoForecastResponse.class)).thenReturn(mockResponse);
        when(objectMapper.writeValueAsString(mockResponse)).thenReturn("jsonString");

        // Act
        WeatherForecast forecast = openMeteoAdapter.getForecast(12.2388, 109.1967, LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 3));

        // Assert
        assertThat(forecast).isNotNull();
        assertThat(forecast.latitude()).isEqualTo(12.24);
        verify(valueOperations).set(eq(cacheKey), eq("jsonString"), anyLong(), any(TimeUnit.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldThrowExternalServiceException_WhenApiFails() {
        // Arrange
        String cacheKey = "tripwise:weather:raw:12.2388:109.1967:2026-07-02:2026-07-03";
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(cacheKey)).thenReturn(null);

        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OpenMeteoForecastResponse.class)).thenThrow(new RuntimeException("API error"));

        // Act & Assert
        assertThatThrownBy(() -> openMeteoAdapter.getForecast(12.2388, 109.1967, LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 3)))
                .isInstanceOf(ExternalServiceException.class)
                .hasMessageContaining("Lỗi khi kết nối với Open-Meteo API");
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldOpenCircuitBreaker_AfterRepeatedFailures() {
        // Arrange
        String cacheKey = "tripwise:weather:raw:12.2388:109.1967:2026-07-02:2026-07-03";
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(cacheKey)).thenReturn(null);

        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OpenMeteoForecastResponse.class)).thenThrow(new RuntimeException("API error"));

        // First failure
        assertThatThrownBy(() -> openMeteoAdapter.getForecast(12.2388, 109.1967, LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 3)))
                .isInstanceOf(ExternalServiceException.class);

        // Second failure
        assertThatThrownBy(() -> openMeteoAdapter.getForecast(12.2388, 109.1967, LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 3)))
                .isInstanceOf(ExternalServiceException.class);

        // State should be OPEN
        assertThat(circuitBreaker.getState()).isEqualTo(CircuitBreaker.State.OPEN);

        // Third call should fail fast
        assertThatThrownBy(() -> openMeteoAdapter.getForecast(12.2388, 109.1967, LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 3)))
                .isInstanceOf(ExternalServiceException.class)
                .hasMessageContaining("Circuit Breaker OPEN");
    }
}
