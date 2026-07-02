package com.tripwise.auth.infrastructure.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "tripwise.jwt")
public class JwtProperties {

    @NotBlank
    @Size(min = 32, message = "JWT secret must be at least 32 characters long")
    private String secret;

    @NotNull
    private Duration accessTokenExpiration = Duration.ofMinutes(15);

    @NotNull
    private Duration refreshTokenExpiration = Duration.ofDays(7);
}
