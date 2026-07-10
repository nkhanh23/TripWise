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

class RuleAuditIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM external_place_dedup_candidates");
        jdbcTemplate.update("DELETE FROM external_place_category_staging");
        jdbcTemplate.update("DELETE FROM external_place_staging");
        jdbcTemplate.update("DELETE FROM place_import_runs WHERE source_name = 'AUDIT_TEST'");
    }

    @Test
    void shouldRunRuleAuditAndReturnAllSections() {
        // 1. Seed Import Run
        jdbcTemplate.update("""
                INSERT INTO place_import_runs (source_name, input_file, import_mode, status, release_date)
                VALUES ('AUDIT_TEST', 'test.osm.pbf', 'UPSERT_ONLY', 'SUCCESS', '2026-06-11'::date)
                """);
        Long importRunId = jdbcTemplate.queryForObject(
                "SELECT id FROM place_import_runs WHERE source_name = 'AUDIT_TEST'",
                Long.class
        );

        // 2. Seed Staging Records
        // Record 1: Ambiguous place type (placeTypeDraft not in KNOWN_TYPES)
        jdbcTemplate.update("""
                INSERT INTO external_place_staging (
                    id, import_run_id, source, source_place_id, name, place_type_draft,
                    latitude, longitude, geom, coordinate_status, validation_status,
                    moderation_status, needs_admin_review, raw_payload, mapping_payload,
                    region, locality
                )
                VALUES (?, ?, 'OSM_GEOFABRIK', 'osm-1', 'Restaurant A', 'PENDING_ADMIN_REVIEW',
                        12.25, 109.2, ST_GeogFromText('SRID=4326;POINT(109.2 12.25)'),
                        'VALID', 'VALID', 'PENDING_ADMIN_REVIEW', TRUE, '{}'::jsonb, '{}'::jsonb,
                        'Khánh Hòa', 'Nha Trang')
                """, 201L, importRunId);
        jdbcTemplate.update("""
                INSERT INTO external_place_category_staging (staging_place_id, source_category_id, category_label, category_path, is_primary)
                VALUES (201, 'cat-1', 'Restaurant', 'Food > Restaurant', TRUE)
                """);

        // Record 2: Duplicate confidence MEDIUM
        jdbcTemplate.update("""
                INSERT INTO external_place_staging (
                    id, import_run_id, source, source_place_id, name, place_type_draft,
                    latitude, longitude, geom, coordinate_status, validation_status,
                    moderation_status, needs_admin_review, raw_payload, mapping_payload,
                    region, locality
                )
                VALUES (?, ?, 'OSM_GEOFABRIK', 'osm-2', 'Cafe A', 'FOOD',
                        12.26, 109.21, ST_GeogFromText('SRID=4326;POINT(109.21 12.26)'),
                        'VALID', 'VALID', 'PENDING_ADMIN_REVIEW', TRUE, '{}'::jsonb, '{}'::jsonb,
                        'Khánh Hòa', 'Nha Trang')
                """, 202L, importRunId);
        jdbcTemplate.update("""
                INSERT INTO external_place_category_staging (staging_place_id, source_category_id, category_label, category_path, is_primary)
                VALUES (202, 'cat-2', 'Cafe', 'Food > Cafe', TRUE)
                """);
        Long existingPlaceId = jdbcTemplate.queryForObject(
                "SELECT id FROM places LIMIT 1",
                Long.class
        );
        jdbcTemplate.update("""
                INSERT INTO external_place_dedup_candidates (
                    staging_place_id, existing_place_id, match_type, match_confidence,
                    distance_meters, name_similarity, category_similarity, evidence
                )
                VALUES (?, ?, 'DEDUP', 'MEDIUM', 15.0, 0.95, 0.9, '{}'::jsonb)
                """, 202L, existingPlaceId);

        // Record 3: Duplicate confidence LOW
        jdbcTemplate.update("""
                INSERT INTO external_place_staging (
                    id, import_run_id, source, source_place_id, name, place_type_draft,
                    latitude, longitude, geom, coordinate_status, validation_status,
                    moderation_status, needs_admin_review, raw_payload, mapping_payload,
                    region, locality
                )
                VALUES (?, ?, 'FOURSQUARE_OS_PLACES', 'fsq-1', 'Bakery B', 'FOOD',
                        12.27, 109.22, ST_GeogFromText('SRID=4326;POINT(109.22 12.27)'),
                        'VALID', 'VALID', 'PENDING_ADMIN_REVIEW', TRUE, '{}'::jsonb, '{}'::jsonb,
                        'Khánh Hòa', 'Nha Trang')
                """, 203L, importRunId);
        jdbcTemplate.update("""
                INSERT INTO external_place_category_staging (staging_place_id, source_category_id, category_label, category_path, is_primary)
                VALUES (203, 'cat-3', 'Bakery', 'Food > Bakery', TRUE)
                """);
        jdbcTemplate.update("""
                INSERT INTO external_place_dedup_candidates (
                    staging_place_id, existing_place_id, match_type, match_confidence,
                    distance_meters, name_similarity, category_similarity, evidence
                )
                VALUES (?, ?, 'DEDUP', 'LOW', 200.0, 0.5, 0.6, '{}'::jsonb)
                """, 203L, existingPlaceId);

        // Record 4: Other review reason (known type, no dupes, valid, but auto-approve failed)
        jdbcTemplate.update("""
                INSERT INTO external_place_staging (
                    id, import_run_id, source, source_place_id, name, place_type_draft,
                    latitude, longitude, geom, coordinate_status, validation_status,
                    moderation_status, needs_admin_review, raw_payload, mapping_payload,
                    region, locality
                )
                VALUES (?, ?, 'OSM_GEOFABRIK', 'osm-4', 'Coffee Shop C', 'FOOD',
                        12.28, 109.23, ST_GeogFromText('SRID=4326;POINT(109.23 12.28)'),
                        'VALID', 'VALID', 'PENDING_ADMIN_REVIEW', TRUE, '{}'::jsonb, '{}'::jsonb,
                        'Khánh Hòa', 'Nha Trang')
                """, 204L, importRunId);
        jdbcTemplate.update("""
                INSERT INTO external_place_category_staging (staging_place_id, source_category_id, category_label, category_path, is_primary)
                VALUES (204, 'cat-4', 'Coffee Shop', 'Food > Coffee Shop', TRUE)
                """);

        // Record 5: Ambiguous place type - null type
        jdbcTemplate.update("""
                INSERT INTO external_place_staging (
                    id, import_run_id, source, source_place_id, name, place_type_draft,
                    latitude, longitude, geom, coordinate_status, validation_status,
                    moderation_status, needs_admin_review, raw_payload, mapping_payload,
                    region, locality
                )
                VALUES (?, ?, 'OSM_GEOFABRIK', 'osm-5', 'Tea House D', 'ATTRACTION',
                        12.29, 109.24, ST_GeogFromText('SRID=4326;POINT(109.24 12.29)'),
                        'VALID', 'VALID', 'PENDING_ADMIN_REVIEW', TRUE, '{}'::jsonb, '{}'::jsonb,
                        'Khánh Hòa', 'Nha Trang')
                """, 205L, importRunId);
        jdbcTemplate.update("""
                INSERT INTO external_place_category_staging (staging_place_id, source_category_id, category_label, category_path, is_primary)
                VALUES (205, 'cat-5', 'Tea House', 'Food > Tea House', TRUE)
                """);

        // 3. Call the audit endpoint
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAsAdmin());
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging/rule-audit?province=Khánh Hòa&city=Nha Trang",
                HttpMethod.POST,
                requestEntity,
                JsonNode.class
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody().path("success").asBoolean()).isTrue();

        JsonNode data = response.getBody().path("data");

        // 4. Verify overall
        assertThat(data.path("overall").path("totalStaging").asInt()).isEqualTo(5);
        assertThat(data.path("overall").path("autoApprove").asInt()).isEqualTo(0);
        assertThat(data.path("overall").path("autoDuplicate").asInt()).isEqualTo(0);
        assertThat(data.path("overall").path("autoReject").asInt()).isEqualTo(0);
        assertThat(data.path("overall").path("adminReview").asInt()).isEqualTo(5);

        // 5. Verify breakdown by rule
        JsonNode ruleBreakdown = data.path("breakdownByRule");
        assertThat(ruleBreakdown.isArray()).isTrue();

        int ambiguousCount = 0;
        int mediumDupCount = 0;
        int lowDupCount = 0;
        int otherCount = 0;
        for (JsonNode item : ruleBreakdown) {
            String rule = item.path("rule").asText();
            int count = item.path("count").asInt();
            if (rule.equals("Ambiguous place type")) ambiguousCount += count;
            else if (rule.contains("MEDIUM")) mediumDupCount += count;
            else if (rule.contains("LOW")) lowDupCount += count;
            else if (rule.equals("Other review reason")) otherCount += count;
        }
        assertThat(ambiguousCount).isEqualTo(2);
        assertThat(mediumDupCount).isEqualTo(1);
        assertThat(lowDupCount).isEqualTo(1);
        assertThat(otherCount).isEqualTo(1);

        // 6. Verify breakdown by placeTypeDraft
        JsonNode ptBreakdown = data.path("breakdownByPlaceTypeDraft");
        assertThat(ptBreakdown.isArray()).isTrue();
        int foodCount = 0;
        for (JsonNode item : ptBreakdown) {
            if (item.path("placeTypeDraft").asText().equals("FOOD")) foodCount = item.path("count").asInt();
        }
        assertThat(foodCount).isEqualTo(3);

        // 7. Verify breakdown by category
        JsonNode catBreakdown = data.path("breakdownByCategory");
        assertThat(catBreakdown.isArray()).isTrue();
        assertThat(catBreakdown).hasSize(5);

        // 8. Verify breakdown by source
        JsonNode srcBreakdown = data.path("breakdownBySource");
        assertThat(srcBreakdown.isArray()).isTrue();
        int osmCount = 0;
        int fsqCount = 0;
        for (JsonNode item : srcBreakdown) {
            if (item.path("source").asText().equals("OSM_GEOFABRIK")) osmCount = item.path("count").asInt();
            if (item.path("source").asText().equals("FOURSQUARE_OS_PLACES")) fsqCount = item.path("count").asInt();
        }
        assertThat(osmCount).isEqualTo(4);
        assertThat(fsqCount).isEqualTo(1);

        // 9. Verify Rule x Category matrix
        JsonNode matrix = data.path("ruleCategoryMatrix");
        assertThat(matrix.isArray()).isTrue();
        assertThat(matrix).hasSize(4);

        for (JsonNode matrixItem : matrix) {
            String rule = matrixItem.path("rule").asText();
            JsonNode categories = matrixItem.path("categories");
            assertThat(categories.isArray()).isTrue();

            if (rule.equals("Ambiguous place type")) {
                assertThat(categories).hasSize(2);
            }
        }

        // 10. Verify recommendations
        JsonNode recommendations = data.path("recommendations");
        assertThat(recommendations.isArray()).isTrue();
        assertThat(recommendations).hasSize(5);

        for (JsonNode rec : recommendations) {
            assertThat(rec.path("category").asText()).isNotEmpty();
            assertThat(rec.path("recommendation").asText()).isNotEmpty();
            assertThat(rec.path("reason").asText()).isNotEmpty();
        }
    }

    @Test
    void shouldReturnEmptyForNoPendingRecords() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAsAdmin());
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging/rule-audit?province=Khánh Hòa&city=Nha Trang",
                HttpMethod.POST,
                requestEntity,
                JsonNode.class
        );

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode data = response.getBody().path("data");
        assertThat(data.path("overall").path("totalStaging").asInt()).isEqualTo(0);
        assertThat(data.path("breakdownByRule").isArray()).isTrue();
        assertThat(data.path("breakdownByRule")).isEmpty();
        assertThat(data.path("breakdownByCategory").isArray()).isTrue();
        assertThat(data.path("breakdownByCategory")).isEmpty();
        assertThat(data.path("recommendations").isArray()).isTrue();
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
