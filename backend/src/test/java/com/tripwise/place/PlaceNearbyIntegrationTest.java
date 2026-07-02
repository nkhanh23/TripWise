package com.tripwise.place;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceNearbyIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldReturnNearbyPlacesSortedByDistance() {
        JsonNode response = restTemplate.getForObject(
                "/api/v1/places/nearby?lat=12.2405&lng=109.1967&radius=3000&limit=5",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data")).isNotEmpty();
        assertThat(response.path("data").get(0).path("distanceMeters").asDouble())
                .isLessThanOrEqualTo(response.path("data").get(1).path("distanceMeters").asDouble());
    }

    @Test
    void shouldFilterNearbyPlacesByCategory() {
        Long beachCategoryId = jdbcTemplate.queryForObject(
                "SELECT id FROM place_categories WHERE slug = 'beach'",
                Long.class
        );

        JsonNode response = restTemplate.getForObject(
                "/api/v1/places/nearby?lat=12.2405&lng=109.1967&radius=5000&categoryId=" + beachCategoryId + "&limit=10",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        response.path("data").forEach(place ->
                assertThat(place.path("categoryId").asLong()).isEqualTo(beachCategoryId)
        );
    }
}
