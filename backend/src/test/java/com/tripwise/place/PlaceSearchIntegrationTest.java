package com.tripwise.place;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceSearchIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldSearchPlacesByProvinceAndKeywordWithMapReadyFields() {
        JsonNode response = restTemplate.getForObject(
                "/api/v1/places?province=Khanh%20Hoa&city=Nha%20Trang&keyword=Long&page=0&size=10&sortBy=popularityScore&sortDirection=desc",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data").path("content")).isNotEmpty();

        JsonNode firstPlace = response.path("data").path("content").get(0);
        assertThat(firstPlace.path("name").asText()).containsIgnoringCase("Long");
        assertThat(firstPlace.path("province").asText()).isEqualTo("Khanh Hoa");
        assertThat(firstPlace.path("city").asText()).isEqualTo("Nha Trang");
        assertThat(firstPlace.has("verificationStatus")).isTrue();
        assertThat(firstPlace.has("popularityScore")).isTrue();
        assertThat(firstPlace.has("primaryImageUrl")).isTrue();
    }

    @Test
    void shouldFilterPlacesByVerificationStatusAndMinRating() {
        JsonNode response = restTemplate.getForObject(
                "/api/v1/places?verificationStatus=VERIFIED&minRating=4.0&page=0&size=10&sortBy=rating&sortDirection=desc",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data").path("content")).isNotEmpty();
        response.path("data").path("content").forEach(place -> {
            assertThat(place.path("verificationStatus").asText()).isEqualTo("VERIFIED");
            assertThat(place.path("rating").decimalValue()).isGreaterThanOrEqualTo(new java.math.BigDecimal("4.0"));
        });
    }

    @Test
    void shouldSearchPlacesWhenOptionalFiltersAreOmitted() {
        JsonNode response = restTemplate.getForObject(
                "/api/v1/places?page=0&size=5&sortBy=name&sortDirection=asc",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("message").asText()).isEqualTo("Places fetched successfully");
        assertThat(response.path("data").path("content")).isNotEmpty();
        assertThat(response.path("data").path("size").asInt()).isEqualTo(5);
    }

    @Test
    void shouldMatchHoChiMinhAliasesInPublicSearch() {
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
                        'HCM Alias Search Ho Chi Minh City',
                        'Ho Chi Minh City',
                        NULL,
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.7001 10.7801)'),
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
                        '{"tourism":"attraction"}'::jsonb
                    ),
                    (
                        'HCM Alias Search Thanh Pho HCM',
                        'Thành phố Hồ Chí Minh',
                        NULL,
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.7002 10.7802)'),
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
                        '{"tourism":"attraction"}'::jsonb
                    ),
                    (
                        'HCM Alias Search Thu Duc',
                        'Thủ Đức',
                        'Hồ Chí Minh',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.7003 10.7803)'),
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
                        '{"tourism":"attraction"}'::jsonb
                    ),
                    (
                        'HCM Alias Search Pending Hidden',
                        'Ho Chi Minh City',
                        'Hồ Chí Minh',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.7004 10.7804)'),
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
                categoryId,
                categoryId
        );

        JsonNode cityResponse = restTemplate.getForObject(
                "/api/v1/places?city=H%E1%BB%93%20Ch%C3%AD%20Minh&keyword=HCM%20Alias%20Search&page=0&size=20&sortBy=name&sortDirection=asc",
                JsonNode.class
        );
        JsonNode provinceResponse = restTemplate.getForObject(
                "/api/v1/places?province=H%E1%BB%93%20Ch%C3%AD%20Minh&keyword=HCM%20Alias%20Search&page=0&size=20&sortBy=name&sortDirection=asc",
                JsonNode.class
        );
        JsonNode nhaTrangResponse = restTemplate.getForObject(
                "/api/v1/places?city=Nha%20Trang&keyword=HCM%20Alias%20Search&page=0&size=20&sortBy=name&sortDirection=asc",
                JsonNode.class
        );

        assertThat(cityResponse.path("success").asBoolean()).isTrue();
        assertThat(cityResponse.path("data").path("totalElements").asInt()).isEqualTo(3);
        assertThat(cityResponse.path("data").findValuesAsText("name"))
                .contains(
                        "HCM Alias Search Ho Chi Minh City",
                        "HCM Alias Search Thanh Pho HCM",
                        "HCM Alias Search Thu Duc"
                )
                .doesNotContain("HCM Alias Search Pending Hidden");

        assertThat(provinceResponse.path("success").asBoolean()).isTrue();
        assertThat(provinceResponse.path("data").path("totalElements").asInt()).isEqualTo(3);
        assertThat(provinceResponse.path("data").findValuesAsText("name"))
                .contains(
                        "HCM Alias Search Ho Chi Minh City",
                        "HCM Alias Search Thanh Pho HCM",
                        "HCM Alias Search Thu Duc"
                )
                .doesNotContain("HCM Alias Search Pending Hidden");

        assertThat(nhaTrangResponse.path("success").asBoolean()).isTrue();
        assertThat(nhaTrangResponse.path("data").path("content")).isEmpty();
    }

    @Test
    void shouldHidePendingNonRecommendablePlacesFromPublicSearch() {
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
                    quality_score,
                    is_recommendable,
                    source,
                    raw_tags
                )
                VALUES (
                    'Pending Hidden Place',
                    'Nha Trang',
                    'Khanh Hoa',
                    ?,
                    ST_GeogFromText('SRID=4326;POINT(109.19 12.25)'),
                    0,
                    60,
                    FALSE,
                    TRUE,
                    FALSE,
                    'PENDING',
                    10,
                    FALSE,
                    'OSM_GEOFABRIK',
                    '{}'::jsonb
                )
                """,
                categoryId
        );

        JsonNode response = restTemplate.getForObject(
                "/api/v1/places?keyword=Pending%20Hidden%20Place&page=0&size=10&sortBy=name&sortDirection=asc",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data").path("content")).isEmpty();
    }

    @Test
    void shouldHideNonRecommendableFoodPlacesFromPublicSearch() {
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
                VALUES (
                    'Hidden Food Place',
                    'Nha Trang',
                    'Khanh Hoa',
                    ?,
                    ST_GeogFromText('SRID=4326;POINT(109.18 12.24)'),
                    0,
                    60,
                    FALSE,
                    TRUE,
                    FALSE,
                    'AUTO_APPROVED',
                    'FOOD',
                    92,
                    FALSE,
                    'OSM_GEOFABRIK',
                    '{"amenity":"restaurant"}'::jsonb
                )
                """,
                categoryId
        );

        JsonNode response = restTemplate.getForObject(
                "/api/v1/places?keyword=Hidden%20Food%20Place&page=0&size=10&sortBy=name&sortDirection=asc",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data").path("content")).isEmpty();
    }

    @Test
    void shouldOnlyReturnCleanAttractionsByDefaultInPublicSearch() {
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
                        'Explore Filter Attraction Verified',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(105.0001 20.0001)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        TRUE,
                        'VERIFIED',
                        'ATTRACTION',
                        95,
                        TRUE,
                        'OSM_GEOFABRIK',
                        '{"tourism":"attraction"}'::jsonb
                    ),
                    (
                        'Explore Filter Attraction Auto Approved',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(105.0002 20.0002)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'AUTO_APPROVED',
                        'ATTRACTION',
                        88,
                        TRUE,
                        'OSM_GEOFABRIK',
                        '{"tourism":"viewpoint"}'::jsonb
                    ),
                    (
                        'Explore Filter Pending Attraction',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(105.0003 20.0003)'),
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
                        'Explore Filter Rejected Attraction',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(105.0004 20.0004)'),
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
                        'Explore Filter Food Auto Approved',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(105.0005 20.0005)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'AUTO_APPROVED',
                        'FOOD',
                        92,
                        TRUE,
                        'OSM_GEOFABRIK',
                        '{"amenity":"restaurant"}'::jsonb
                    ),
                    (
                        'Explore Filter Hotel Auto Approved',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(105.0006 20.0006)'),
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
                "/api/v1/places?keyword=Explore%20Filter&page=0&size=10&sortBy=name&sortDirection=asc",
                JsonNode.class
        );

        assertThat(response.path("success").asBoolean()).isTrue();
        assertThat(response.path("data").path("totalElements").asInt()).isEqualTo(2);

        java.util.List<String> names = response.path("data").path("content").findValuesAsText("name");
        assertThat(names)
                .containsExactly(
                        "Explore Filter Attraction Auto Approved",
                        "Explore Filter Attraction Verified"
                )
                .doesNotContain(
                        "Explore Filter Pending Attraction",
                        "Explore Filter Rejected Attraction",
                        "Explore Filter Food Auto Approved",
                        "Explore Filter Hotel Auto Approved"
                );
    }
}
