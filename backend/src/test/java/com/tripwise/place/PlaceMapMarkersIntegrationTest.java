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

    @Test
    void shouldOnlyReturnCleanAttractionMarkersByDefault() {
        Long categoryId = jdbcTemplate.queryForObject(
                "SELECT id FROM place_categories ORDER BY id LIMIT 1",
                Long.class
        );

        jdbcTemplate.update(
                """
                INSERT INTO places (
                    name,
                    city,
                    province,
                    category_id,
                    location,
                    estimated_cost,
                    duration_minutes,
                    indoor,
                    is_active,
                    is_verified,
                    verification_status,
                    place_type,
                    quality_score,
                    is_recommendable,
                    source,
                    raw_tags
                )
                VALUES
                    (
                        'Marker Filter Attraction Verified',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.0001 21.0001)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        TRUE,
                        'VERIFIED',
                        'ATTRACTION',
                        94,
                        TRUE,
                        'OSM_GEOFABRIK',
                        '{"tourism":"attraction"}'::jsonb
                    ),
                    (
                        'Marker Filter Attraction Auto Approved',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.0002 21.0002)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'AUTO_APPROVED',
                        'ATTRACTION',
                        90,
                        TRUE,
                        'OSM_GEOFABRIK',
                        '{"tourism":"viewpoint"}'::jsonb
                    ),
                    (
                        'Marker Filter Pending Attraction',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.0003 21.0003)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'PENDING',
                        'ATTRACTION',
                        70,
                        FALSE,
                        'OSM_GEOFABRIK',
                        '{"tourism":"attraction"}'::jsonb
                    ),
                    (
                        'Marker Filter Rejected Attraction',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.0004 21.0004)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'REJECTED',
                        'ATTRACTION',
                        20,
                        FALSE,
                        'OSM_GEOFABRIK',
                        '{"tourism":"attraction"}'::jsonb
                    ),
                    (
                        'Marker Filter Food Auto Approved',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.0005 21.0005)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'AUTO_APPROVED',
                        'FOOD',
                        91,
                        TRUE,
                        'OSM_GEOFABRIK',
                        '{"amenity":"restaurant"}'::jsonb
                    ),
                    (
                        'Marker Filter Hotel Auto Approved',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.0006 21.0006)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'AUTO_APPROVED',
                        'HOTEL',
                        93,
                        TRUE,
                        'OSM_GEOFABRIK',
                        '{"tourism":"hotel"}'::jsonb
                    )
                """,
                categoryId,
                categoryId,
                categoryId,
                categoryId,
                categoryId,
                categoryId
        );

        JsonNode response = restTemplate.getForObject(
                "/api/v1/places/map-markers?minLat=20.999&minLng=105.999&maxLat=21.001&maxLng=106.001&limit=20",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        java.util.List<String> names = response.path("data").findValuesAsText("name");

        assertThat(names)
                .containsExactlyInAnyOrder(
                        "Marker Filter Attraction Verified",
                        "Marker Filter Attraction Auto Approved"
                )
                .doesNotContain(
                        "Marker Filter Pending Attraction",
                        "Marker Filter Rejected Attraction",
                        "Marker Filter Food Auto Approved",
                        "Marker Filter Hotel Auto Approved"
                );
    }

    @Test
    void shouldMatchHoChiMinhAliasesInMarkerQuery() {
        Long categoryId = jdbcTemplate.queryForObject(
                "SELECT id FROM place_categories ORDER BY id LIMIT 1",
                Long.class
        );

        jdbcTemplate.update(
                """
                INSERT INTO places (
                    name,
                    city,
                    province,
                    category_id,
                    location,
                    estimated_cost,
                    duration_minutes,
                    indoor,
                    is_active,
                    is_verified,
                    verification_status,
                    place_type,
                    quality_score,
                    is_recommendable,
                    source,
                    raw_tags
                )
                VALUES
                    (
                        'HCM Alias Marker Ho Chi Minh City',
                        'Ho Chi Minh City',
                        NULL,
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.7101 10.7901)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'AUTO_APPROVED',
                        'ATTRACTION',
                        91,
                        TRUE,
                        'OSM_GEOFABRIK',
                        '{"tourism":"attraction"}'::jsonb
                    ),
                    (
                        'HCM Alias Marker Thu Duc',
                        'Thủ Đức',
                        'Hồ Chí Minh',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.7601 10.8201)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'AUTO_APPROVED',
                        'ATTRACTION',
                        91,
                        TRUE,
                        'OSM_GEOFABRIK',
                        '{"tourism":"attraction"}'::jsonb
                    ),
                    (
                        'HCM Alias Marker Pending Hidden',
                        'Thành phố Hồ Chí Minh',
                        NULL,
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.7201 10.8001)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'PENDING',
                        'ATTRACTION',
                        70,
                        FALSE,
                        'OSM_GEOFABRIK',
                        '{"tourism":"attraction"}'::jsonb
                    )
                """,
                categoryId,
                categoryId,
                categoryId
        );

        JsonNode response = restTemplate.getForObject(
                "/api/v1/places/map-markers?minLat=10.70&minLng=106.65&maxLat=10.85&maxLng=106.82"
                        + "&city=H%E1%BB%93%20Ch%C3%AD%20Minh&placeType=ATTRACTION&limit=20",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data").findValuesAsText("name"))
                .contains("HCM Alias Marker Ho Chi Minh City", "HCM Alias Marker Thu Duc")
                .doesNotContain("HCM Alias Marker Pending Hidden");
    }
}
