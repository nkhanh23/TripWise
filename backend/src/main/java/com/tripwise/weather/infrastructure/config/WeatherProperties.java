package com.tripwise.weather.infrastructure.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "tripwise.weather")
public class WeatherProperties {

    @NotBlank
    private String apiUrl = "https://api.open-meteo.com";

    @NotNull
    private Duration timeout = Duration.ofSeconds(3);
}
