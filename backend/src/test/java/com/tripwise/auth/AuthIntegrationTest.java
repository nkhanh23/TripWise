package com.tripwise.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.BaseIntegrationTest;
import com.tripwise.auth.domain.entity.RefreshToken;
import com.tripwise.auth.infrastructure.persistence.repository.RefreshTokenRepository;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AuthIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @BeforeEach
    void cleanUp() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void fullAuthLifecycleShouldWork() throws Exception {
        String email = "traveler@tripwise.com";
        String password = "password123";

        ResponseEntity<String> registerResponse = post("/api/v1/auth/register", Map.of(
                "email", email,
                "password", password,
                "fullName", "Trip Wise"
        ));
        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<String> loginResponse = post("/api/v1/auth/login", Map.of(
                "email", email,
                "password", password
        ));
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        JsonNode loginJson = objectMapper.readTree(loginResponse.getBody());
        String accessToken = loginJson.path("data").path("accessToken").asText();
        String refreshToken = loginJson.path("data").path("refreshToken").asText();
        assertThat(accessToken).isNotBlank();
        assertThat(refreshToken).isNotBlank();

        ResponseEntity<String> meResponse = get("/api/v1/auth/me", bearerHeaders(accessToken));
        assertThat(meResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode meJson = objectMapper.readTree(meResponse.getBody());
        assertThat(meJson.path("data").path("email").asText()).isEqualTo(email);
        assertThat(meJson.path("data").has("passwordHash")).isFalse();

        ResponseEntity<String> refreshResponse = post("/api/v1/auth/refresh", Map.of(
                "refreshToken", refreshToken
        ));
        assertThat(refreshResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        JsonNode refreshJson = objectMapper.readTree(refreshResponse.getBody());
        String rotatedRefreshToken = refreshJson.path("data").path("refreshToken").asText();
        assertThat(rotatedRefreshToken).isNotBlank().isNotEqualTo(refreshToken);

        ResponseEntity<String> oldRefreshReuseResponse = post("/api/v1/auth/refresh", Map.of(
                "refreshToken", refreshToken
        ));
        assertThat(oldRefreshReuseResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<String> logoutResponse = post("/api/v1/auth/logout", Map.of(
                "refreshToken", rotatedRefreshToken
        ));
        assertThat(logoutResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> refreshAfterLogoutResponse = post("/api/v1/auth/refresh", Map.of(
                "refreshToken", rotatedRefreshToken
        ));
        assertThat(refreshAfterLogoutResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void duplicateEmailShouldBeRejected() throws Exception {
        Map<String, Object> request = Map.of(
                "email", "duplicate@tripwise.com",
                "password", "password123",
                "fullName", "Trip Wise"
        );

        ResponseEntity<String> firstResponse = post("/api/v1/auth/register", request);
        ResponseEntity<String> secondResponse = post("/api/v1/auth/register", request);

        assertThat(firstResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(secondResponse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void wrongPasswordShouldBeRejected() throws Exception {
        post("/api/v1/auth/register", Map.of(
                "email", "wrong-password@tripwise.com",
                "password", "password123",
                "fullName", "Trip Wise"
        ));

        ResponseEntity<String> response = post("/api/v1/auth/login", Map.of(
                "email", "wrong-password@tripwise.com",
                "password", "wrong-password"
        ));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void protectedEndpointShouldRequireAuthentication() {
        ResponseEntity<String> response = get("/api/v1/auth/me", new HttpHeaders());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void invalidAccessTokenShouldBeRejected() {
        ResponseEntity<String> response = get("/api/v1/auth/me", bearerHeaders("invalid-token"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void expiredRefreshTokenShouldBeRejected() throws Exception {
        post("/api/v1/auth/register", Map.of(
                "email", "expired@tripwise.com",
                "password", "password123",
                "fullName", "Trip Wise"
        ));

        ResponseEntity<String> loginResponse = post("/api/v1/auth/login", Map.of(
                "email", "expired@tripwise.com",
                "password", "password123"
        ));

        JsonNode loginJson = objectMapper.readTree(loginResponse.getBody());
        String refreshToken = loginJson.path("data").path("refreshToken").asText();

        RefreshToken storedRefreshToken = refreshTokenRepository.findAll().stream()
                .findFirst()
                .orElseThrow();
        storedRefreshToken.setExpiresAt(Instant.now().minusSeconds(60));
        refreshTokenRepository.save(storedRefreshToken);

        ResponseEntity<String> refreshResponse = post("/api/v1/auth/refresh", Map.of(
                "refreshToken", refreshToken
        ));

        assertThat(refreshResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        JsonNode refreshJson = objectMapper.readTree(refreshResponse.getBody());
        assertThat(refreshJson.path("message").asText()).isEqualTo("Refresh token has expired");
    }

    private ResponseEntity<String> post(String path, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(path, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
    }

    private ResponseEntity<String> get(String path, HttpHeaders headers) {
        return restTemplate.exchange(path, HttpMethod.GET, new HttpEntity<>(headers), String.class);
    }

    private HttpHeaders bearerHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }
}
