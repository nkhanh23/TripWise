package com.tripwise.place;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceMapMarkersIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldReturnLightweightMarkersWithinBoundingBox() {
        Double minLatitude = jdbcTemplate.queryForObject(
                "SELECT MIN(ST_Y(location::geometry)) FROM places WHERE city = 'Nha Trang' AND is_active = TRUE",
                Double.class
        );
        Double maxLatitude = jdbcTemplate.queryForObject(
                "SELECT MAX(ST_Y(location::geometry)) FROM places WHERE city = 'Nha Trang' AND is_active = TRUE",
                Double.class
        );
        Double minLongitude = jdbcTemplate.queryForObject(
                "SELECT MIN(ST_X(location::geometry)) FROM places WHERE city = 'Nha Trang' AND is_active = TRUE",
                Double.class
        );
        Double maxLongitude = jdbcTemplate.queryForObject(
                "SELECT MAX(ST_X(location::geometry)) FROM places WHERE city = 'Nha Trang' AND is_active = TRUE",
                Double.class
        );

        JsonNode response = restTemplate.getForObject(
                "/api/v1/places/map-markers?minLat=" + (minLatitude - 0.01)
                        + "&minLng=" + (minLongitude - 0.01)
                        + "&maxLat=" + (maxLatitude + 0.01)
                        + "&maxLng=" + (maxLongitude + 0.01)
                        + "&verificationStatus=VERIFIED&limit=20",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data")).isNotEmpty();

        JsonNode firstMarker = response.path("data").get(0);
        assertThat(firstMarker.path("id").asLong()).isPositive();
        assertThat(firstMarker.path("name").asText()).isNotBlank();
        assertThat(firstMarker.path("verificationStatus").asText()).isEqualTo("VERIFIED");
        assertThat(firstMarker.path("latitude").isNumber()).isTrue();
        assertThat(firstMarker.path("longitude").isNumber()).isTrue();
        assertThat(firstMarker.path("description").isMissingNode()).isTrue();
    }

    @Test
    void shouldReturnMapMarkersWhenOptionalFiltersAreOmitted() {
        Double minLatitude = jdbcTemplate.queryForObject(
                "SELECT MIN(ST_Y(location::geometry)) FROM places WHERE province = 'Khanh Hoa' AND is_active = TRUE",
                Double.class
        );
        Double maxLatitude = jdbcTemplate.queryForObject(
                "SELECT MAX(ST_Y(location::geometry)) FROM places WHERE province = 'Khanh Hoa' AND is_active = TRUE",
                Double.class
        );
        Double minLongitude = jdbcTemplate.queryForObject(
                "SELECT MIN(ST_X(location::geometry)) FROM places WHERE province = 'Khanh Hoa' AND is_active = TRUE",
                Double.class
        );
        Double maxLongitude = jdbcTemplate.queryForObject(
                "SELECT MAX(ST_X(location::geometry)) FROM places WHERE province = 'Khanh Hoa' AND is_active = TRUE",
                Double.class
        );

        JsonNode response = restTemplate.getForObject(
                "/api/v1/places/map-markers?minLat=" + (minLatitude - 0.01)
                        + "&minLng=" + (minLongitude - 0.01)
                        + "&maxLat=" + (maxLatitude + 0.01)
                        + "&maxLng=" + (maxLongitude + 0.01)
                        + "&limit=10",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("message").asText()).isEqualTo("Place map markers fetched successfully");
        assertThat(response.path("data")).isNotEmpty();
    }
}
