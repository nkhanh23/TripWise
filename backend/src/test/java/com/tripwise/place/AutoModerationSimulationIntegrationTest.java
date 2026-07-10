package com.tripwise.place;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class AutoModerationSimulationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM external_place_dedup_candidates");
        jdbcTemplate.update("DELETE FROM external_place_category_staging");
        jdbcTemplate.update("DELETE FROM external_place_staging");
        jdbcTemplate.update("DELETE FROM place_import_runs WHERE id IN (17, 999)");
    }

    @Test
    void shouldRunSimulationAndAggregateStats() {
        // 1. Seed Import Run
        jdbcTemplate.update("""
                INSERT INTO import_runs (id, source, release_date, status, created_at, updated_at)
                VALUES (17, 'OSM_GEOFABRIK', '2026-06-11'::date, 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """);

        // 2. Seed Staging Records
        // Record 1: AUTO_REJECT (Invalid coordinate)
        jdbcTemplate.update("""
                INSERT INTO external_place_staging (
                    id, import_run_id, source_release_date, latitude, longitude, geom, 
                    needs_admin_review, raw_payload, mapping_payload, created_at, updated_at, 
                    country_code, region, locality, address, place_type_draft, 
                    source, source_place_id, dedup_status, source_row_hash, name, 
                    normalized_name, coordinate_status, validation_status, moderation_status
                )
                VALUES (
                    101, 17, '2026-06-11'::date, 12.25, 109.2, ST_GeogFromText('SRID=4326;POINT(109.2 12.25)'),
                    TRUE, '{}'::jsonb, '{"applied": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    'VN', 'Khánh Hòa', 'Nha Trang', '123 Tran Phu', 'FOOD',
                    'OSM_GEOFABRIK', 'fsq-101', 'PENDING', 'hash-101', 'Staging Sushi Nha Trang',
                    'staging sushi nha trang', 'INVALID', 'VALID', 'PENDING_ADMIN_REVIEW'
                )
                """);

        // Record 2: NEEDS_ADMIN_REVIEW (Duplicate confidence MEDIUM)
        jdbcTemplate.update("""
                INSERT INTO external_place_staging (
                    id, import_run_id, source_release_date, latitude, longitude, geom, 
                    needs_admin_review, raw_payload, mapping_payload, created_at, updated_at, 
                    country_code, region, locality, address, place_type_draft, 
                    source, source_place_id, dedup_status, source_row_hash, name, 
                    normalized_name, coordinate_status, validation_status, moderation_status
                )
                VALUES (
                    102, 17, '2026-06-11'::date, 12.25, 109.2, ST_GeogFromText('SRID=4326;POINT(109.2 12.25)'),
                    TRUE, '{}'::jsonb, '{"applied": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    'VN', 'Khánh Hòa', 'Nha Trang', '123 Tran Phu', 'FOOD',
                    'OSM_GEOFABRIK', 'fsq-102', 'PENDING', 'hash-102', 'Staging Cafe Nha Trang',
                    'staging cafe nha trang', 'VALID', 'VALID', 'PENDING_ADMIN_REVIEW'
                )
                """);
        jdbcTemplate.update("""
                INSERT INTO external_place_category_staging (staging_place_id, source_category_id, category_label, category_path, is_primary)
                VALUES (102, 'cat-123', 'Cafe', 'Food > Cafe', TRUE)
                """);

        Long existingPlaceId = jdbcTemplate.queryForObject(
                "SELECT id FROM places LIMIT 1",
                Long.class
        );
        jdbcTemplate.update("""
                INSERT INTO external_place_dedup_candidates (
                    id, staging_place_id, existing_place_id, match_type, match_confidence, 
                    distance_meters, name_similarity, category_similarity, evidence, decision
                )
                VALUES (
                    502, 102, ?, 'DEDUP', 'MEDIUM', 15.0, 0.95, 0.9, '{}'::jsonb, 'PENDING'
                )
                """, existingPlaceId);

        // 3. Auth Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAsAdmin());
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        // 4. Test POST Simulation
        ResponseEntity<JsonNode> simRes = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging/simulation?province=Khánh Hòa&city=Nha Trang",
                HttpMethod.POST,
                requestEntity,
                JsonNode.class
        );

        assertThat(simRes.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(simRes.getBody().path("success").asBoolean()).isTrue();

        JsonNode data = simRes.getBody().path("data");
        assertThat(data.path("totalStaging").asInt()).isEqualTo(2);
        assertThat(data.path("autoReject").asInt()).isEqualTo(1);
        assertThat(data.path("adminReview").asInt()).isEqualTo(1);
        assertThat(data.path("autoApprove").asInt()).isEqualTo(0);
        assertThat(data.path("autoDuplicate").asInt()).isEqualTo(0);

        assertThat(data.path("rejectBreakdown").path("Invalid coordinate").asInt()).isEqualTo(1);
        assertThat(data.path("reviewBreakdown").path("Duplicate confidence MEDIUM").asInt()).isEqualTo(1);
    }

    private String loginAsAdmin() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
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
