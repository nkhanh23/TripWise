package com.tripwise.weather.presentation;

import com.tripwise.common.api.ApiResponse;
import com.tripwise.weather.application.dto.WeatherResponse;
import com.tripwise.weather.application.service.GetWeatherForecastByCityUseCase;
import com.tripwise.weather.domain.WeatherForecast;
import com.tripwise.weather.presentation.dto.WeatherQueryRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/weather")
public class WeatherController {

    private final GetWeatherForecastByCityUseCase getWeatherForecastByCityUseCase;

    @GetMapping("/{city}")
    public ResponseEntity<ApiResponse<WeatherResponse>> getWeatherForecast(
            @PathVariable @NotBlank(message = "city must not be blank") String city,
            @Valid WeatherQueryRequest request
    ) {
        WeatherForecast weatherForecast = getWeatherForecastByCityUseCase.execute(
                city,
                request.getStartDate(),
                request.getEndDate()
        );

        WeatherResponse response = WeatherResponse.builder()
                .city(city)
                .latitude(weatherForecast.latitude())
                .longitude(weatherForecast.longitude())
                .timezone(weatherForecast.timezone())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .dailyForecasts(weatherForecast.dailyForecasts().stream()
                        .map(dailyForecast -> WeatherResponse.DailyWeatherResponse.builder()
                                .date(dailyForecast.date())
                                .temperatureMinCelsius(dailyForecast.temperatureMinCelsius())
                                .temperatureMaxCelsius(dailyForecast.temperatureMaxCelsius())
                                .precipitationProbabilityMax(dailyForecast.precipitationProbabilityMax())
                                .weatherCode(dailyForecast.weatherCode())
                                .build())
                        .toList())
                .build();

        return ResponseEntity.ok(ApiResponse.success("Weather forecast retrieved successfully", response));
    }
}
