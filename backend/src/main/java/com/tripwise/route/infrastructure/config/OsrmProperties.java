package com.tripwise.route.infrastructure.config;

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
@ConfigurationProperties(prefix = "tripwise.osrm")
public class OsrmProperties {

    @NotBlank
    private String apiUrl = "https://router.project-osrm.org";

    @NotNull
    private Duration timeout = Duration.ofSeconds(3);
}
