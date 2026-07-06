package com.tripwise.place;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class AdminPlaceReviewIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldReturnPaginatedAdminReviewResultsForHoChiMinhAliases() {
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
                    reject_reason,
                    source,
                    source_external_id,
                    raw_tags
                )
                VALUES
                    (
                        'Admin Review HCM Pending City',
                        'Ho Chi Minh City',
                        NULL,
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.7001 10.7801)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'PENDING',
                        'ATTRACTION',
                        74,
                        FALSE,
                        'NEEDS_REVIEW',
                        'OSM_GEOFABRIK',
                        'osm/node/hcm-1',
                        '{"tourism":"attraction"}'::jsonb
                    ),
                    (
                        'Admin Review HCM Pending Thu Duc',
                        'Thủ Đức',
                        'Hồ Chí Minh',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.7601 10.8201)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'PENDING',
                        'ATTRACTION',
                        71,
                        FALSE,
                        'NEEDS_REVIEW',
                        'OSM_GEOFABRIK',
                        'osm/node/hcm-2',
                        '{"tourism":"viewpoint"}'::jsonb
                    ),
                    (
                        'Admin Review HCM Auto Approved',
                        'Thành phố Hồ Chí Minh',
                        NULL,
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.7201 10.7901)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'AUTO_APPROVED',
                        'ATTRACTION',
                        88,
                        TRUE,
                        NULL,
                        'OSM_GEOFABRIK',
                        'osm/node/hcm-3',
                        '{"tourism":"attraction"}'::jsonb
                    ),
                    (
                        'Admin Review HCM Manual Seed',
                        'Hồ Chí Minh',
                        'Hồ Chí Minh',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(106.7301 10.8001)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        TRUE,
                        'VERIFIED',
                        'ATTRACTION',
                        95,
                        TRUE,
                        NULL,
                        'MANUAL_SEED',
                        'manual/hcm-1',
                        '{"tourism":"museum"}'::jsonb
                    )
                """,
                categoryId,
                categoryId,
                categoryId,
                categoryId
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAsAdmin());
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/v1/admin/places/review?city=H%E1%BB%93%20Ch%C3%AD%20Minh&source=OSM_GEOFABRIK"
                        + "&verificationStatus=PENDING&placeType=ATTRACTION&page=0&size=2&sortBy=qualityScore&sortDirection=desc",
                HttpMethod.GET,
                requestEntity,
                JsonNode.class
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.path("success").asBoolean()).isTrue();
        assertThat(body.path("data").path("size").asInt()).isEqualTo(2);
        assertThat(body.path("data").path("totalElements").asInt()).isEqualTo(2);
        assertThat(body.path("data").path("content")).hasSize(2);
        assertThat(body.path("data").findValuesAsText("name"))
                .containsExactly("Admin Review HCM Pending City", "Admin Review HCM Pending Thu Duc");
    }

    @Test
    void shouldRespectPageSizeAndReturnOtherStatusesWhenRequested() {
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
                    source_external_id,
                    raw_tags
                )
                VALUES
                    (
                        'Admin Review Page Limit One',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(109.1901 12.2401)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'REJECTED',
                        'ATTRACTION',
                        12,
                        FALSE,
                        'OSM_GEOFABRIK',
                        'osm/node/page-1',
                        '{"tourism":"attraction"}'::jsonb
                    ),
                    (
                        'Admin Review Page Limit Two',
                        'Nha Trang',
                        'Khanh Hoa',
                        ?,
                        ST_GeogFromText('SRID=4326;POINT(109.1902 12.2402)'),
                        0,
                        60,
                        FALSE,
                        TRUE,
                        FALSE,
                        'REJECTED',
                        'ATTRACTION',
                        10,
                        FALSE,
                        'OSM_GEOFABRIK',
                        'osm/node/page-2',
                        '{"tourism":"attraction"}'::jsonb
                    )
                """,
                categoryId,
                categoryId
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAsAdmin());
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/v1/admin/places/review?keyword=Admin%20Review%20Page%20Limit&verificationStatus=REJECTED&size=1&page=0",
                HttpMethod.GET,
                requestEntity,
                JsonNode.class
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.path("data").path("size").asInt()).isEqualTo(1);
        assertThat(body.path("data").path("totalElements").asInt()).isEqualTo(2);
        assertThat(body.path("data").path("content")).hasSize(1);
        assertThat(body.path("data").path("content").get(0).path("verificationStatus").asText()).isEqualTo("REJECTED");
    }

    private String loginAsAdmin() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> request = new HttpEntity<>(
                "{\"email\":\"admin@example.com\",\"password\":\"123456\"}",
                headers
        );

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/v1/admin/login",
                HttpMethod.POST,
                request,
                JsonNode.class
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = response.getBody();
        assertThat(body).isNotNull();
        return body.path("data").path("accessToken").asText();
    }
}
