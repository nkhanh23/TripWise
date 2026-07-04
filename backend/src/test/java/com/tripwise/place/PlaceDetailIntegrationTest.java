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
    void shouldReturnPublicPlaceDetailByIdWithNationwideFields() {
        Long placeId = jdbcTemplate.queryForObject(
                """
                SELECT id
                FROM places
                WHERE city = 'Nha Trang'
                  AND verification_status = 'VERIFIED'
                  AND is_active = TRUE
                ORDER BY id
                LIMIT 1
                """,
                Long.class
        );

        JsonNode response = restTemplate.getForObject("/api/v1/places/" + placeId, JsonNode.class);

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data").path("id").asLong()).isEqualTo(placeId);
        assertThat(response.path("data").path("name").asText()).isNotBlank();
        assertThat(response.path("data").path("city").asText()).isEqualTo("Nha Trang");
        assertThat(response.path("data").path("province").asText()).isEqualTo("Khanh Hoa");
        assertThat(response.path("data").path("categorySlug").asText()).isNotBlank();
        assertThat(response.path("data").path("verificationStatus").asText()).isEqualTo("VERIFIED");
        assertThat(response.path("data").path("description").asText()).isNotBlank();
        assertThat(response.path("data").path("latitude").isNumber()).isTrue();
        assertThat(response.path("data").path("longitude").isNumber()).isTrue();
    }
}
