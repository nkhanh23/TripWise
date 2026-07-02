package com.tripwise.e2e;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.BaseIntegrationTest;
import com.tripwise.ai.infrastructure.GeminiClient;
import com.tripwise.ai.infrastructure.dto.GeminiRequest;
import com.tripwise.ai.infrastructure.dto.GeminiResponse;
import com.tripwise.route.domain.RouteResult;
import com.tripwise.route.infrastructure.OsrmClient;
import com.tripwise.weather.infrastructure.WeatherClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ActiveProfiles("test")
class TripGenerationE2ETest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private GeminiClient geminiClient;

    @MockBean
    private OsrmClient osrmClient;

    @MockBean
    private WeatherClient weatherClient;

    @BeforeEach
    void cleanUp() {
        jdbcTemplate.execute("TRUNCATE TABLE itinerary_items, itinerary_days, trips, refresh_tokens, users, route_cache, weather_cache RESTART IDENTITY CASCADE");
    }

    @Test
    void fullTripGenerationFlow_ShouldWorkEndToEnd() throws Exception {
        stubExternalDependencies();

        String ownerEmail = "traveler.e2e@tripwise.com";
        String ownerPassword = "password123";
        register(ownerEmail, ownerPassword, "E2E Traveler");
        String ownerAccessToken = loginAndGetAccessToken(ownerEmail, ownerPassword);

        String viewerEmail = "viewer.e2e@tripwise.com";
        String viewerPassword = "password123";
        register(viewerEmail, viewerPassword, "Viewer User");
        String viewerAccessToken = loginAndGetAccessToken(viewerEmail, viewerPassword);

        ResponseEntity<String> generateResponse = post(
                "/api/v1/trips/generate",
                Map.of("request", "Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển và ẩm thực"),
                bearerHeaders(ownerAccessToken)
        );

        assertThat(generateResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        JsonNode generateJson = objectMapper.readTree(generateResponse.getBody());
        Long tripId = generateJson.path("data").path("id").asLong();

        assertThat(generateJson.path("success").asBoolean()).isTrue();
        assertThat(generateJson.path("data").path("destination").asText()).isEqualTo("Nha Trang");
        assertThat(generateJson.path("data").path("days").asInt()).isEqualTo(3);
        assertThat(generateJson.path("data").path("nights").asInt()).isEqualTo(2);
        assertThat(generateJson.path("data").path("status").asText()).isEqualTo("GENERATED");
        assertThat(generateJson.path("data").path("itineraryDays")).hasSize(3);
        assertThat(generateJson.path("data").path("itineraryDays").get(0).path("items").isEmpty()).isFalse();
        assertThat(generateJson.path("data").path("itineraryDays").get(0).path("items").get(0).path("aiDescription").asText()).isNotBlank();
        assertThat(generateJson.path("data").path("itineraryDays").get(0).path("items").get(0).path("place").path("name").asText()).isNotBlank();

        ResponseEntity<String> ownerListResponse = get("/api/v1/trips", bearerHeaders(ownerAccessToken));
        assertThat(ownerListResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode ownerListJson = objectMapper.readTree(ownerListResponse.getBody());
        assertThat(ownerListJson.path("data").path("content")).hasSize(1);
        assertThat(ownerListJson.path("data").path("content").get(0).path("id").asLong()).isEqualTo(tripId);

        ResponseEntity<String> ownerDetailResponse = get("/api/v1/trips/" + tripId, bearerHeaders(ownerAccessToken));
        assertThat(ownerDetailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode ownerDetailJson = objectMapper.readTree(ownerDetailResponse.getBody());
        assertThat(ownerDetailJson.path("data").path("id").asLong()).isEqualTo(tripId);
        assertThat(ownerDetailJson.path("data").path("itinerary").path("days")).hasSize(3);
        assertThat(ownerDetailJson.path("data").path("itinerary").path("days").get(0).path("items").get(0).path("transportSuggestion").path("mode").asText()).isNotBlank();

        ResponseEntity<String> forbiddenDetailResponse = get("/api/v1/trips/" + tripId, bearerHeaders(viewerAccessToken));
        assertThat(forbiddenDetailResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<String> forbiddenDeleteResponse = delete("/api/v1/trips/" + tripId, bearerHeaders(viewerAccessToken));
        assertThat(forbiddenDeleteResponse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        assertThat(count("SELECT COUNT(*) FROM trips")).isEqualTo(1);
        assertThat(count("SELECT COUNT(*) FROM itinerary_days")).isEqualTo(3);
        assertThat(count("SELECT COUNT(*) FROM itinerary_items")).isGreaterThan(0);
        assertThat(count("SELECT COUNT(*) FROM route_cache")).isGreaterThan(0);
        assertThat(count("SELECT COUNT(*) FROM weather_cache")).isZero();

        ResponseEntity<String> deleteResponse = delete("/api/v1/trips/" + tripId, bearerHeaders(ownerAccessToken));
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> detailAfterDeleteResponse = get("/api/v1/trips/" + tripId, bearerHeaders(ownerAccessToken));
        assertThat(detailAfterDeleteResponse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<String> ownerListAfterDeleteResponse = get("/api/v1/trips", bearerHeaders(ownerAccessToken));
        JsonNode ownerListAfterDeleteJson = objectMapper.readTree(ownerListAfterDeleteResponse.getBody());
        assertThat(ownerListAfterDeleteJson.path("data").path("content")).isEmpty();

        verify(geminiClient, atLeastOnce()).generateContent(any(GeminiRequest.class));
        verify(geminiClient).generateContent(anyString());
        verify(osrmClient, atLeastOnce()).getRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble(), eq("driving"));
        verifyNoInteractions(weatherClient);
    }

    private void stubExternalDependencies() {
        when(geminiClient.generateContent(any(GeminiRequest.class)))
                .thenReturn(createGeminiResponse("""
                        {
                          "destination": "Nha Trang",
                          "numDays": 3,
                          "numNights": 2,
                          "budgetLevel": "MID_RANGE",
                          "interests": ["beach", "food"],
                          "preferences": "biển, ẩm thực"
                        }
                        """));

        when(geminiClient.generateContent(anyString()))
                .thenReturn("""
                        [
                          {
                            "dayNumber": 1,
                            "orderIndex": 0,
                            "aiDescription": "Phù hợp để mở đầu hành trình với điểm đến nổi bật, dễ tiếp cận và hợp sở thích biển."
                          },
                          {
                            "dayNumber": 2,
                            "orderIndex": 0,
                            "aiDescription": "Gợi ý cân bằng giữa trải nghiệm tham quan và nhịp nghỉ ngơi trong ngày thứ hai."
                          },
                          {
                            "dayNumber": 3,
                            "orderIndex": 0,
                            "aiDescription": "Thích hợp để khép lại chuyến đi bằng một điểm tham quan đặc trưng của Nha Trang."
                          }
                        ]
                        """);

        when(osrmClient.getRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble(), eq("driving")))
                .thenReturn(new RouteResult(
                        1500.0,
                        420.0,
                        "{\"type\":\"LineString\",\"coordinates\":[[109.19,12.23],[109.20,12.24]]}"
                ));
    }

    private GeminiResponse createGeminiResponse(String text) {
        GeminiResponse response = new GeminiResponse();
        GeminiResponse.Candidate candidate = new GeminiResponse.Candidate();
        GeminiResponse.Content content = new GeminiResponse.Content();
        GeminiResponse.Part part = new GeminiResponse.Part();
        part.setText(text);
        content.setParts(List.of(part));
        candidate.setContent(content);
        response.setCandidates(List.of(candidate));
        return response;
    }

    private void register(String email, String password, String fullName) {
        ResponseEntity<String> response = post("/api/v1/auth/register", Map.of(
                "email", email,
                "password", password,
                "fullName", fullName
        ));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    private String loginAndGetAccessToken(String email, String password) throws Exception {
        ResponseEntity<String> response = post("/api/v1/auth/login", Map.of(
                "email", email,
                "password", password
        ));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode json = objectMapper.readTree(response.getBody());
        String accessToken = json.path("data").path("accessToken").asText();
        assertThat(accessToken).isNotBlank();
        return accessToken;
    }

    private Integer count(String sql) {
        return jdbcTemplate.queryForObject(sql, Integer.class);
    }

    private ResponseEntity<String> post(String path, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(path, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
    }

    private ResponseEntity<String> post(String path, Object body, HttpHeaders headers) {
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(path, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
    }

    private ResponseEntity<String> get(String path, HttpHeaders headers) {
        return restTemplate.exchange(path, HttpMethod.GET, new HttpEntity<>(headers), String.class);
    }

    private ResponseEntity<String> delete(String path, HttpHeaders headers) {
        return restTemplate.exchange(path, HttpMethod.DELETE, new HttpEntity<>(headers), String.class);
    }

    private HttpHeaders bearerHeaders(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return headers;
    }
}
