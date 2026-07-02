package com.tripwise.weather.infrastructure;

import com.tripwise.common.exception.BusinessException;
import com.tripwise.common.exception.ExternalServiceException;
import com.tripwise.weather.domain.WeatherForecast;
import com.tripwise.weather.infrastructure.dto.OpenMeteoForecastResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.List;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WeatherClientTest {

    @Mock
    private RestClient restClient;

    @Mock
    private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RestClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    private WeatherClient weatherClient;

    @BeforeEach
    void setUp() {
        weatherClient = new WeatherClient(restClient);
    }

    @Test
    void getForecast_ShouldReturnParsedForecast() {
        OpenMeteoForecastResponse response = new OpenMeteoForecastResponse();
        response.setLatitude(12.2388);
        response.setLongitude(109.1967);
        response.setTimezone("Asia/Bangkok");

        OpenMeteoForecastResponse.DailyData dailyData = new OpenMeteoForecastResponse.DailyData();
        dailyData.setTime(List.of(LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 3)));
        dailyData.setTemperature2mMin(List.of(25.2, 24.8));
        dailyData.setTemperature2mMax(List.of(31.4, 30.9));
        dailyData.setPrecipitationProbabilityMax(List.of(20, 45));
        dailyData.setWeatherCode(List.of(1, 61));
        response.setDaily(dailyData);

        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OpenMeteoForecastResponse.class)).thenReturn(response);

        WeatherForecast forecast = weatherClient.getForecast(
                12.2388,
                109.1967,
                LocalDate.of(2026, 7, 2),
                LocalDate.of(2026, 7, 3)
        );

        assertThat(forecast.latitude()).isEqualTo(12.2388);
        assertThat(forecast.longitude()).isEqualTo(109.1967);
        assertThat(forecast.timezone()).isEqualTo("Asia/Bangkok");
        assertThat(forecast.dailyForecasts()).hasSize(2);
        assertThat(forecast.dailyForecasts().getFirst().date()).isEqualTo(LocalDate.of(2026, 7, 2));
        assertThat(forecast.dailyForecasts().getFirst().temperatureMinCelsius()).isEqualTo(25.2);
        assertThat(forecast.dailyForecasts().getFirst().temperatureMaxCelsius()).isEqualTo(31.4);
        assertThat(forecast.dailyForecasts().getFirst().precipitationProbabilityMax()).isEqualTo(20);
        assertThat(forecast.dailyForecasts().getFirst().weatherCode()).isEqualTo(1);
    }

    @Test
    void getForecast_WhenResponseIsNull_ShouldThrowExternalServiceException() {
        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OpenMeteoForecastResponse.class)).thenReturn(null);

        assertThrows(ExternalServiceException.class,
                () -> weatherClient.getForecast(
                        12.2388,
                        109.1967,
                        LocalDate.of(2026, 7, 2),
                        LocalDate.of(2026, 7, 3)
                ));
    }

    @Test
    void getForecast_WhenDailySectionIsIncomplete_ShouldThrowExternalServiceException() {
        OpenMeteoForecastResponse response = new OpenMeteoForecastResponse();
        response.setLatitude(12.2388);
        response.setLongitude(109.1967);
        response.setTimezone("Asia/Bangkok");

        OpenMeteoForecastResponse.DailyData dailyData = new OpenMeteoForecastResponse.DailyData();
        dailyData.setTime(List.of(LocalDate.of(2026, 7, 2)));
        dailyData.setTemperature2mMin(List.of(25.2));
        dailyData.setTemperature2mMax(List.of(31.4));
        dailyData.setPrecipitationProbabilityMax(null);
        dailyData.setWeatherCode(List.of(1));
        response.setDaily(dailyData);

        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OpenMeteoForecastResponse.class)).thenReturn(response);

        assertThrows(ExternalServiceException.class,
                () -> weatherClient.getForecast(
                        12.2388,
                        109.1967,
                        LocalDate.of(2026, 7, 2),
                        LocalDate.of(2026, 7, 2)
                ));
    }

    @Test
    void getForecast_WhenDailyArraysHaveDifferentLengths_ShouldThrowExternalServiceException() {
        OpenMeteoForecastResponse response = new OpenMeteoForecastResponse();
        response.setLatitude(12.2388);
        response.setLongitude(109.1967);
        response.setTimezone("Asia/Bangkok");

        OpenMeteoForecastResponse.DailyData dailyData = new OpenMeteoForecastResponse.DailyData();
        dailyData.setTime(List.of(LocalDate.of(2026, 7, 2), LocalDate.of(2026, 7, 3)));
        dailyData.setTemperature2mMin(List.of(25.2));
        dailyData.setTemperature2mMax(List.of(31.4, 30.9));
        dailyData.setPrecipitationProbabilityMax(List.of(20, 45));
        dailyData.setWeatherCode(List.of(1, 61));
        response.setDaily(dailyData);

        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OpenMeteoForecastResponse.class)).thenReturn(response);

        assertThrows(ExternalServiceException.class,
                () -> weatherClient.getForecast(
                        12.2388,
                        109.1967,
                        LocalDate.of(2026, 7, 2),
                        LocalDate.of(2026, 7, 3)
                ));
    }

    @Test
    void getForecast_WhenApiFails_ShouldThrowExternalServiceException() {
        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OpenMeteoForecastResponse.class)).thenThrow(new RuntimeException("503 Service Unavailable"));

        assertThrows(ExternalServiceException.class,
                () -> weatherClient.getForecast(
                        12.2388,
                        109.1967,
                        LocalDate.of(2026, 7, 2),
                        LocalDate.of(2026, 7, 3)
                ));
    }

    @Test
    void getForecast_WhenLatitudeIsInvalid_ShouldThrowBusinessException() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> weatherClient.getForecast(
                        95.0,
                        109.1967,
                        LocalDate.of(2026, 7, 2),
                        LocalDate.of(2026, 7, 3)
                ));

        assertThat(exception.getErrorCode()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void getForecast_WhenLongitudeIsInvalid_ShouldThrowBusinessException() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> weatherClient.getForecast(
                        12.2388,
                        -181.0,
                        LocalDate.of(2026, 7, 2),
                        LocalDate.of(2026, 7, 3)
                ));

        assertThat(exception.getErrorCode()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void getForecast_WhenDateRangeIsInvalid_ShouldThrowBusinessException() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> weatherClient.getForecast(
                        12.2388,
                        109.1967,
                        LocalDate.of(2026, 7, 3),
                        LocalDate.of(2026, 7, 2)
                ));

        assertThat(exception.getErrorCode()).isEqualTo("VALIDATION_ERROR");
    }
}
