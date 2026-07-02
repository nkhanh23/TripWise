package com.tripwise.ai.infrastructure.config;

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
@ConfigurationProperties(prefix = "tripwise.gemini")
public class GeminiProperties {

    @NotBlank
    private String apiKey;

    @NotBlank
    private String apiUrl = "https://generativelanguage.googleapis.com/v1beta";

    @NotBlank
    private String model = "gemini-1.5-flash";

    @NotNull
    private Duration timeout = Duration.ofSeconds(30);
}
