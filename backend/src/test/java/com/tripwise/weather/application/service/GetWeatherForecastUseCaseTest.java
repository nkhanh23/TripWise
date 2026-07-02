package com.tripwise.weather.application.service;

import com.tripwise.common.exception.BusinessException;
import com.tripwise.common.exception.ExternalServiceException;
import com.tripwise.weather.domain.WeatherForecast;
import com.tripwise.weather.domain.entity.WeatherCache;
import com.tripwise.weather.domain.repository.WeatherCacheRepository;
import com.tripwise.weather.infrastructure.WeatherClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GetWeatherForecastUseCaseTest {

    @Mock
    private WeatherCacheRepository weatherCacheRepository;

    @Mock
    private WeatherClient weatherClient;

    @InjectMocks
    private GetWeatherForecastUseCase getWeatherForecastUseCase;

    @Test
    void execute_WhenCacheHit_ShouldReturnCachedForecastAndSkipApi() {
        List<WeatherCache> cachedForecasts = List.of(
                WeatherCache.builder()
                        .city("nha trang")
                        .forecastDate(LocalDate.of(2026, 7, 2))
                        .tempMin(25)
                        .tempMax(31)
                        .rainProbability(30)
                        .weatherCode("1")
                        .expiresAt(Instant.now().plusSeconds(3600))
                        .build(),
                WeatherCache.builder()
                        .city("nha trang")
                        .forecastDate(LocalDate.of(2026, 7, 3))
                        .tempMin(24)
                        .tempMax(30)
                        .rainProbability(45)
                        .weatherCode("61")
                        .expiresAt(Instant.now().plusSeconds(3600))
                        .build()
        );

        when(weatherCacheRepository.findValidForecasts(anyString(), any(LocalDate.class), any(LocalDate.class), any(Instant.class)))
                .thenReturn(cachedForecasts);

        WeatherForecast result = getWeatherForecastUseCase.execute(
                "Nha Trang",
                12.2388,
                109.1967,
                LocalDate.of(2026, 7, 2),
                LocalDate.of(2026, 7, 3)
        );

        assertThat(result.dailyForecasts()).hasSize(2);
        assertThat(result.dailyForecasts().getFirst().date()).isEqualTo(LocalDate.of(2026, 7, 2));
        assertThat(result.dailyForecasts().getFirst().weatherCode()).isEqualTo(1);
        verify(weatherClient, never()).getForecast(anyDouble(), anyDouble(), any(LocalDate.class), any(LocalDate.class));
        verify(weatherCacheRepository, never()).save(any(WeatherCache.class));
    }

    @Test
    void execute_WhenCacheMiss_ShouldCallApiSaveForecastsAndReturnResult() {
        when(weatherCacheRepository.findValidForecasts(anyString(), any(LocalDate.class), any(LocalDate.class), any(Instant.class)))
                .thenReturn(List.of());

        WeatherForecast apiForecast = new WeatherForecast(
                12.2388,
                109.1967,
                "Asia/Bangkok",
                List.of(
                        new WeatherForecast.DailyForecast(LocalDate.of(2026, 7, 2), 25.2, 31.4, 20, 1),
                        new WeatherForecast.DailyForecast(LocalDate.of(2026, 7, 3), 24.8, 30.9, 45, 61)
                )
        );
        when(weatherClient.getForecast(12.2388, 109.1967, LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 3)))
                .thenReturn(apiForecast);

        WeatherForecast result = getWeatherForecastUseCase.execute(
                "Nha Trang",
                12.2388,
                109.1967,
                LocalDate.of(2026, 7, 2),
                LocalDate.of(2026, 7, 3)
        );

        assertThat(result).isEqualTo(apiForecast);

        ArgumentCaptor<WeatherCache> weatherCacheCaptor = ArgumentCaptor.forClass(WeatherCache.class);
        verify(weatherCacheRepository, times(2)).save(weatherCacheCaptor.capture());
        List<WeatherCache> savedForecasts = weatherCacheCaptor.getAllValues();
        assertThat(savedForecasts.getFirst().getCity()).isEqualTo("Nha Trang");
        assertThat(savedForecasts.getFirst().getForecastDate()).isEqualTo(LocalDate.of(2026, 7, 2));
        assertThat(savedForecasts.getFirst().getTempMin()).isEqualTo(25);
        assertThat(savedForecasts.getFirst().getTempMax()).isEqualTo(31);
        assertThat(savedForecasts.getFirst().getWeatherCode()).isEqualTo("1");
        assertThat(savedForecasts.getFirst().getExpiresAt()).isAfter(Instant.now());
    }

    @Test
    void execute_WhenCacheIsPartial_ShouldCallApiAndRefreshWholeRange() {
        when(weatherCacheRepository.findValidForecasts(anyString(), any(LocalDate.class), any(LocalDate.class), any(Instant.class)))
                .thenReturn(List.of(
                        WeatherCache.builder()
                                .city("nha trang")
                                .forecastDate(LocalDate.of(2026, 7, 2))
                                .tempMin(25)
                                .tempMax(31)
                                .rainProbability(30)
                                .weatherCode("1")
                                .expiresAt(Instant.now().plusSeconds(3600))
                                .build()
                ));

        WeatherForecast apiForecast = new WeatherForecast(
                12.2388,
                109.1967,
                "Asia/Bangkok",
                List.of(
                        new WeatherForecast.DailyForecast(LocalDate.of(2026, 7, 2), 25.2, 31.4, 20, 1),
                        new WeatherForecast.DailyForecast(LocalDate.of(2026, 7, 3), 24.8, 30.9, 45, 61)
                )
        );
        when(weatherClient.getForecast(12.2388, 109.1967, LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 3)))
                .thenReturn(apiForecast);

        WeatherForecast result = getWeatherForecastUseCase.execute(
                "Nha Trang",
                12.2388,
                109.1967,
                LocalDate.of(2026, 7, 2),
                LocalDate.of(2026, 7, 3)
        );

        assertThat(result).isEqualTo(apiForecast);
        verify(weatherClient).getForecast(12.2388, 109.1967, LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 3));
        verify(weatherCacheRepository, times(2)).save(any(WeatherCache.class));
    }

    @Test
    void execute_WhenApiFailsAndCachedFallbackExists_ShouldReturnCachedForecast() {
        when(weatherCacheRepository.findValidForecasts(anyString(), any(LocalDate.class), any(LocalDate.class), any(Instant.class)))
                .thenReturn(List.of());
        when(weatherClient.getForecast(12.2388, 109.1967, LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 3)))
                .thenThrow(new ExternalServiceException("Open-Meteo timeout"));
        when(weatherCacheRepository.findForecasts(anyString(), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(
                        WeatherCache.builder()
                                .city("nha trang")
                                .forecastDate(LocalDate.of(2026, 7, 2))
                                .tempMin(25)
                                .tempMax(31)
                                .rainProbability(20)
                                .weatherCode("1")
                                .expiresAt(Instant.now().minusSeconds(1))
                                .build(),
                        WeatherCache.builder()
                                .city("nha trang")
                                .forecastDate(LocalDate.of(2026, 7, 3))
                                .tempMin(24)
                                .tempMax(30)
                                .rainProbability(45)
                                .weatherCode("61")
                                .expiresAt(Instant.now().minusSeconds(1))
                                .build()
                ));

        WeatherForecast result = getWeatherForecastUseCase.execute(
                "Nha Trang",
                12.2388,
                109.1967,
                LocalDate.of(2026, 7, 2),
                LocalDate.of(2026, 7, 3)
        );

        assertThat(result.dailyForecasts()).hasSize(2);
        assertThat(result.dailyForecasts().get(1).weatherCode()).isEqualTo(61);
        verify(weatherCacheRepository, never()).save(any(WeatherCache.class));
    }

    @Test
    void execute_WhenApiFailsAndNoCachedFallback_ShouldReturnUnavailableForecast() {
        when(weatherCacheRepository.findValidForecasts(anyString(), any(LocalDate.class), any(LocalDate.class), any(Instant.class)))
                .thenReturn(List.of());
        when(weatherClient.getForecast(anyDouble(), anyDouble(), any(LocalDate.class), any(LocalDate.class)))
                .thenThrow(new ExternalServiceException("Open-Meteo timeout"));
        when(weatherCacheRepository.findForecasts(anyString(), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of());

        WeatherForecast result = getWeatherForecastUseCase.execute(
                "Nha Trang",
                12.2388,
                109.1967,
                LocalDate.of(2026, 7, 2),
                LocalDate.of(2026, 7, 3)
        );

        assertThat(result.dailyForecasts()).isEmpty();
        assertThat(result.timezone()).isEqualTo("unavailable");
    }

    @Test
    void execute_WhenCityIsBlank_ShouldThrowBusinessException() {
        assertThrows(BusinessException.class, () -> getWeatherForecastUseCase.execute(
                " ",
                12.2388,
                109.1967,
                LocalDate.of(2026, 7, 2),
                LocalDate.of(2026, 7, 3)
        ));
    }

    @Test
    void execute_WhenLatitudeIsInvalid_ShouldThrowBusinessException() {
        assertThrows(BusinessException.class, () -> getWeatherForecastUseCase.execute(
                "Nha Trang",
                120.0,
                109.1967,
                LocalDate.of(2026, 7, 2),
                LocalDate.of(2026, 7, 3)
        ));
    }

    @Test
    void execute_WhenEndDateBeforeStartDate_ShouldThrowBusinessException() {
        assertThrows(BusinessException.class, () -> getWeatherForecastUseCase.execute(
                "Nha Trang",
                12.2388,
                109.1967,
                LocalDate.of(2026, 7, 3),
                LocalDate.of(2026, 7, 2)
        ));
    }

    @Test
    void execute_WhenLongitudeIsInvalid_ShouldThrowBusinessException() {
        assertThrows(BusinessException.class, () -> getWeatherForecastUseCase.execute(
                "Nha Trang",
                12.2388,
                181.0,
                LocalDate.of(2026, 7, 2),
                LocalDate.of(2026, 7, 3)
        ));
    }
}
