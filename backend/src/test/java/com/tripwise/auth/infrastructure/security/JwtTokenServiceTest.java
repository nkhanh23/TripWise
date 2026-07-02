package com.tripwise.auth.infrastructure.security;

import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.Role;
import com.tripwise.user.domain.enums.UserStatus;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenServiceTest {

    private static final String SECRET = "test_secret_key_with_minimum_length_32_chars";

    @Test
    void generateAccessTokenShouldContainExpectedClaims() {
        JwtTokenService jwtTokenService = createService(Duration.ofMinutes(15), Instant.parse("2026-07-01T00:00:00Z"));
        User user = buildUser();

        String token = jwtTokenService.generateAccessToken(user);

        assertThat(token).isNotBlank();
        assertThat(jwtTokenService.validateToken(token)).isTrue();
        assertThat(jwtTokenService.extractUserId(token)).isEqualTo(user.getId());
        assertThat(jwtTokenService.extractEmail(token)).isEqualTo(user.getEmail());
    }

    @Test
    void validateTokenShouldReturnFalseWhenTokenExpired() {
        JwtTokenService expiredTokenService = createService(Duration.ofSeconds(-1), Instant.parse("2026-07-01T00:00:00Z"));
        User user = buildUser();

        String expiredToken = expiredTokenService.generateAccessToken(user);

        JwtTokenService validator = createService(Duration.ofMinutes(15), Instant.parse("2026-07-01T00:00:00Z"));

        assertThat(validator.validateToken(expiredToken)).isFalse();
    }

    @Test
    void validateTokenShouldReturnFalseWhenTokenTampered() {
        JwtTokenService jwtTokenService = createService(Duration.ofMinutes(15), Instant.parse("2026-07-01T00:00:00Z"));
        User user = buildUser();
        String token = jwtTokenService.generateAccessToken(user);
        String tamperedToken = token.substring(0, token.length() - 2) + "aa";

        assertThat(jwtTokenService.validateToken(tamperedToken)).isFalse();
    }

    private JwtTokenService createService(Duration expiration, Instant instant) {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(SECRET);
        properties.setAccessTokenExpiration(expiration);

        JwtTokenService jwtTokenService = new JwtTokenService(
                properties,
                Clock.fixed(instant, ZoneOffset.UTC)
        );
        jwtTokenService.initialize();
        return jwtTokenService;
    }

    private User buildUser() {
        return User.builder()
                .id(1L)
                .email("traveler@tripwise.com")
                .passwordHash("hashed-password")
                .fullName("Trip Wise")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();
    }
}
