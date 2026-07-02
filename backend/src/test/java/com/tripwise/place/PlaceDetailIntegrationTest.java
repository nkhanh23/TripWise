package com.tripwise.place;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceDetailIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldReturnPublicPlaceDetailById() {
        Long placeId = jdbcTemplate.queryForObject(
                "SELECT id FROM places WHERE name = 'Chùa Long Sơn' AND city = 'Nha Trang'",
                Long.class
        );

        JsonNode response = restTemplate.getForObject("/api/v1/places/" + placeId, JsonNode.class);

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data").path("id").asLong()).isEqualTo(placeId);
        assertThat(response.path("data").path("name").asText()).isEqualTo("Chùa Long Sơn");
        assertThat(response.path("data").path("categorySlug").asText()).isEqualTo("spiritual");
        assertThat(response.path("data").path("description").asText()).isNotBlank();
    }
}
