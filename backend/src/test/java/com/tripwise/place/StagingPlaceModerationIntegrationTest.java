package com.tripwise.place;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripwise.BaseIntegrationTest;
import com.tripwise.place.presentation.controller.StagingPlaceModerationController;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class StagingPlaceModerationIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM place_data_sources WHERE notes LIKE 'Imported from%'");
        jdbcTemplate.update("DELETE FROM external_place_dedup_candidates");
        jdbcTemplate.update("DELETE FROM external_place_category_staging");
        jdbcTemplate.update("DELETE FROM external_place_staging");
        jdbcTemplate.update("DELETE FROM places WHERE source = 'FOURSQUARE_OS_PLACES' AND source_external_id IN ('fsq-pub-901', 'fsq-already-903', 'fsq-rejected-904', 'fsq-dup-905')");
        jdbcTemplate.update("DELETE FROM hotels WHERE name = 'Publish Test Hotel'");
        jdbcTemplate.update("DELETE FROM place_import_runs WHERE id IN (17, 999, 998, 997, 996, 995)");
    }

    @Test
    void shouldSearchAndModerateStagingPlaces() {
        // 1. Seed Import Run
        jdbcTemplate.update("""
                INSERT INTO import_runs (id, source, release_date, status, created_at, updated_at)
                VALUES (17, 'FOURSQUARE_OS_PLACES', '2026-06-11'::date, 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """);

        // 2. Seed Staging Records
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
                    'FOURSQUARE_OS_PLACES', 'fsq-101', 'PENDING', 'hash-101', 'Staging Sushi Nha Trang',
                    'staging sushi nha trang', 'VALID', 'VALID', 'PENDING_ADMIN_REVIEW'
                )
                """);

        // 3. Seed Category Staging
        jdbcTemplate.update("""
                INSERT INTO external_place_category_staging (staging_place_id, source_category_id, category_label, category_path, is_primary)
                VALUES (101, 'cat-123', 'Sushi Restaurant', 'Food > Sushi', TRUE)
                """);

        // 4. Seed Dedup Candidate
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
                    501, 101, ?, 'DEDUP', 'HIGH', 15.0, 0.95, 0.9, '{}'::jsonb, 'PENDING'
                )
                """, existingPlaceId);

        // 5. Auth Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAsAdmin());
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        // Test GET Search
        ResponseEntity<JsonNode> searchRes = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging?importRunId=17&city=Nha Trang&moderationStatus=PENDING_ADMIN_REVIEW&page=0&size=5",
                HttpMethod.GET,
                requestEntity,
                JsonNode.class
        );
        assertThat(searchRes.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(searchRes.getBody().path("success").asBoolean()).isTrue();
        assertThat(searchRes.getBody().path("data").path("content").get(0).path("name").asText()).isEqualTo("Staging Sushi Nha Trang");

        // Test GET Detail
        ResponseEntity<JsonNode> detailRes = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging/101",
                HttpMethod.GET,
                requestEntity,
                JsonNode.class
        );
        assertThat(detailRes.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(detailRes.getBody().path("data").path("stagingPlace").path("name").asText()).isEqualTo("Staging Sushi Nha Trang");
        assertThat(detailRes.getBody().path("data").path("categories").get(0).path("categoryLabel").asText()).isEqualTo("Sushi Restaurant");
        assertThat(detailRes.getBody().path("data").path("candidates").get(0).path("existingPlaceId").asLong()).isEqualTo(existingPlaceId);

        // Test POST Approve as New
        ResponseEntity<JsonNode> approveRes = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging/101/approve-as-new",
                HttpMethod.POST,
                requestEntity,
                JsonNode.class
        );
        assertThat(approveRes.getStatusCode().is2xxSuccessful()).isTrue();
        
        // Verify database update for Approve
        Map<String, Object> updatedApprove = jdbcTemplate.queryForMap(
                "SELECT moderation_status, dedup_status, needs_admin_review, mapping_payload FROM external_place_staging WHERE id = 101"
        );
        assertThat(updatedApprove.get("moderation_status")).isEqualTo("APPROVED_FOR_APPLY");
        assertThat(updatedApprove.get("dedup_status")).isEqualTo("NO_MATCH");
        assertThat(updatedApprove.get("needs_admin_review")).isEqualTo(false);
        assertThat(updatedApprove.get("mapping_payload").toString()).contains("APPROVED_FOR_APPLY");

        // Reset to pending for reject test
        jdbcTemplate.update("UPDATE external_place_staging SET moderation_status = 'PENDING_ADMIN_REVIEW', needs_admin_review = TRUE WHERE id = 101");

        // Test POST Reject
        ResponseEntity<JsonNode> rejectRes = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging/101/reject",
                HttpMethod.POST,
                requestEntity,
                JsonNode.class
        );
        assertThat(rejectRes.getStatusCode().is2xxSuccessful()).isTrue();
        Map<String, Object> updatedReject = jdbcTemplate.queryForMap(
                "SELECT moderation_status, needs_admin_review, mapping_payload FROM external_place_staging WHERE id = 101"
        );
        assertThat(updatedReject.get("moderation_status")).isEqualTo("REJECTED");
        assertThat(updatedReject.get("mapping_payload").toString()).contains("REJECT_CANDIDATE");

        // Reset to pending for duplicate test
        jdbcTemplate.update("UPDATE external_place_staging SET moderation_status = 'PENDING_ADMIN_REVIEW', needs_admin_review = TRUE WHERE id = 101");

        // Test POST Mark Duplicate
        HttpHeaders postHeaders = new HttpHeaders();
        postHeaders.setBearerAuth(loginAsAdmin());
        postHeaders.setContentType(MediaType.APPLICATION_JSON);
        StagingPlaceModerationController.MarkDuplicateRequest duplicateRequest =
                new StagingPlaceModerationController.MarkDuplicateRequest(501L, existingPlaceId);
        HttpEntity<StagingPlaceModerationController.MarkDuplicateRequest> postEntity =
                new HttpEntity<>(duplicateRequest, postHeaders);

        ResponseEntity<JsonNode> duplicateRes = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging/101/mark-duplicate",
                HttpMethod.POST,
                postEntity,
                JsonNode.class
        );
        assertThat(duplicateRes.getStatusCode().is2xxSuccessful()).isTrue();
        
        Map<String, Object> updatedDuplicate = jdbcTemplate.queryForMap(
                "SELECT moderation_status, dedup_status, needs_admin_review, mapping_payload FROM external_place_staging WHERE id = 101"
        );
        assertThat(updatedDuplicate.get("moderation_status")).isEqualTo("REJECTED");
        assertThat(updatedDuplicate.get("dedup_status")).isEqualTo("CONFIRMED_DUPLICATE");
        assertThat(updatedDuplicate.get("mapping_payload").toString()).contains("DUPLICATE_SKIP");

        String candidateDecision = jdbcTemplate.queryForObject(
                "SELECT decision FROM external_place_dedup_candidates WHERE id = 501",
                String.class
                );
        assertThat(candidateDecision).isEqualTo("CONFIRMED_DUPLICATE");
    }

    @Test
    void shouldApproveAndPublishFoodPlace() {
        // 1. Seed Import Run
        jdbcTemplate.update("""
                INSERT INTO place_import_runs (id, source, release_date, status, created_at, updated_at)
                VALUES (999, 'FOURSQUARE_OS_PLACES', '2026-06-11'::date, 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """);

        // 2. Seed Staging Record (PENDING_ADMIN_REVIEW, FOOD, valid coords)
        jdbcTemplate.update("""
                INSERT INTO external_place_staging (
                    id, import_run_id, source_release_date, latitude, longitude, geom,
                    needs_admin_review, raw_payload, mapping_payload, created_at, updated_at,
                    country_code, region, locality, address, place_type_draft,
                    source, source_place_id, dedup_status, source_row_hash, name,
                    normalized_name, coordinate_status, validation_status, moderation_status
                )
                VALUES (
                    901, 999, '2026-06-11'::date, 12.25, 109.2, ST_GeogFromText('SRID=4326;POINT(109.2 12.25)'),
                    TRUE, '{}'::jsonb, '{"applied": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    'VN', 'Khánh Hòa', 'Nha Trang', '777 Publish Test Street', 'FOOD',
                    'FOURSQUARE_OS_PLACES', 'fsq-pub-901', 'NO_MATCH', 'hash-pub-901', 'Publish Test Sushi',
                    'publish test sushi', 'VALID', 'VALID', 'PENDING_ADMIN_REVIEW'
                )
                """);

        // 3. Get current places count
        long placesBefore = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM places", Long.class);

        // 4. Auth and call approve-and-publish
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAsAdmin());
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<JsonNode> publishRes = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging/901/approve-and-publish",
                HttpMethod.POST,
                requestEntity,
                JsonNode.class
        );
        assertThat(publishRes.getStatusCode().is2xxSuccessful()).isTrue();
        Long publishedId = publishRes.getBody().path("data").asLong();
        assertThat(publishedId).isPositive();

        // 5. Verify places count increased by 1
        long placesAfter = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM places", Long.class);
        assertThat(placesAfter).isEqualTo(placesBefore + 1);

        // 6. Verify staging record
        Map<String, Object> updatedStaging = jdbcTemplate.queryForMap(
                "SELECT moderation_status, dedup_status, needs_admin_review, mapping_payload FROM external_place_staging WHERE id = 901"
        );
        assertThat(updatedStaging.get("moderation_status")).isEqualTo("APPROVED_FOR_APPLY");
        assertThat(updatedStaging.get("needs_admin_review")).isEqualTo(false);
        String payload = updatedStaging.get("mapping_payload").toString();
        assertThat(payload).contains("\"applied\": true");
        assertThat(payload).contains("\"publishedPublicType\": \"PLACE\"");
        assertThat(payload).contains("\"publishedPublicId\": " + publishedId);

        // 7. Verify public place record
        Map<String, Object> place = jdbcTemplate.queryForMap(
                "SELECT id, name, is_recommendable, quality_score, verification_status, place_type FROM places WHERE id = ?",
                publishedId
        );
        assertThat(place.get("name")).isEqualTo("Publish Test Sushi");
        assertThat(place.get("is_recommendable")).isEqualTo(true);
        assertThat(place.get("quality_score")).isEqualTo(85);
        assertThat(place.get("verification_status")).isEqualTo("VERIFIED");
        assertThat(place.get("place_type")).isEqualTo("FOOD");
    }

    @Test
    void shouldApproveAndPublishHotel() {
        // 1. Seed Import Run
        jdbcTemplate.update("""
                INSERT INTO place_import_runs (id, source, release_date, status, created_at, updated_at)
                VALUES (998, 'OSM_GEOFABRIK', '2026-06-11'::date, 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """);

        // 2. Seed Staging Record (HOTEL)
        jdbcTemplate.update("""
                INSERT INTO external_place_staging (
                    id, import_run_id, source_release_date, latitude, longitude, geom,
                    needs_admin_review, raw_payload, mapping_payload, created_at, updated_at,
                    country_code, region, locality, address, place_type_draft,
                    source, source_place_id, dedup_status, source_row_hash, name,
                    normalized_name, coordinate_status, validation_status, moderation_status
                )
                VALUES (
                    902, 998, '2026-06-11'::date, 12.26, 109.19, ST_GeogFromText('SRID=4326;POINT(109.19 12.26)'),
                    TRUE, '{}'::jsonb, '{"applied": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    'VN', 'Khánh Hòa', 'Nha Trang', '888 Publish Hotel St', 'HOTEL',
                    'OSM_GEOFABRIK', 'osm-pub-902', 'NO_MATCH', 'hash-pub-902', 'Publish Test Hotel',
                    'publish test hotel', 'VALID', 'VALID', 'PENDING_ADMIN_REVIEW'
                )
                """);

        // 3. Get current hotels count
        long hotelsBefore = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hotels", Long.class);

        // 4. Auth and publish
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAsAdmin());
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<JsonNode> publishRes = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging/902/approve-and-publish",
                HttpMethod.POST,
                requestEntity,
                JsonNode.class
        );
        assertThat(publishRes.getStatusCode().is2xxSuccessful()).isTrue();
        Long publishedId = publishRes.getBody().path("data").asLong();
        assertThat(publishedId).isPositive();

        // 5. Verify hotels count increased by 1
        long hotelsAfter = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hotels", Long.class);
        assertThat(hotelsAfter).isEqualTo(hotelsBefore + 1);

        // 6. Verify staging record
        Map<String, Object> updatedStaging = jdbcTemplate.queryForMap(
                "SELECT moderation_status, mapping_payload FROM external_place_staging WHERE id = 902"
        );
        String payload = updatedStaging.get("mapping_payload").toString();
        assertThat(payload).contains("\"applied\": true");
        assertThat(payload).contains("\"publishedPublicType\": \"HOTEL\"");
        assertThat(payload).contains("\"publishedPublicId\": " + publishedId);
    }

    @Test
    void shouldRejectPublishWhenAlreadyApplied() {
        // Seed a staging record that's already applied
        jdbcTemplate.update("""
                INSERT INTO place_import_runs (id, source, release_date, status, created_at, updated_at)
                VALUES (997, 'FOURSQUARE_OS_PLACES', '2026-06-11'::date, 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """);
        jdbcTemplate.update("""
                INSERT INTO external_place_staging (
                    id, import_run_id, source_release_date, latitude, longitude, geom,
                    needs_admin_review, raw_payload, mapping_payload, created_at, updated_at,
                    country_code, region, locality, address, place_type_draft,
                    source, source_place_id, dedup_status, source_row_hash, name,
                    normalized_name, coordinate_status, validation_status, moderation_status
                )
                VALUES (
                    903, 997, '2026-06-11'::date, 12.25, 109.2, ST_GeogFromText('SRID=4326;POINT(109.2 12.25)'),
                    FALSE, '{}'::jsonb, '{"applied": true}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    'VN', 'Khánh Hòa', 'Nha Trang', 'Applied Test', 'FOOD',
                    'FOURSQUARE_OS_PLACES', 'fsq-already-903', 'NO_MATCH', 'hash-903', 'Already Applied Place',
                    'already applied place', 'VALID', 'VALID', 'APPROVED_FOR_APPLY'
                )
                """);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAsAdmin());
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<JsonNode> publishRes = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging/903/approve-and-publish",
                HttpMethod.POST,
                requestEntity,
                JsonNode.class
        );
        assertThat(publishRes.getStatusCode().is4xxClientError()).isTrue();
        assertThat(publishRes.getBody().path("message").asText()).containsIgnoringCase("already applied");
    }

    @Test
    void shouldRejectPublishWhenRejected() {
        jdbcTemplate.update("""
                INSERT INTO place_import_runs (id, source, release_date, status, created_at, updated_at)
                VALUES (996, 'FOURSQUARE_OS_PLACES', '2026-06-11'::date, 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """);
        jdbcTemplate.update("""
                INSERT INTO external_place_staging (
                    id, import_run_id, source_release_date, latitude, longitude, geom,
                    needs_admin_review, raw_payload, mapping_payload, created_at, updated_at,
                    country_code, region, locality, address, place_type_draft,
                    source, source_place_id, dedup_status, source_row_hash, name,
                    normalized_name, coordinate_status, validation_status, moderation_status
                )
                VALUES (
                    904, 996, '2026-06-11'::date, 12.25, 109.2, ST_GeogFromText('SRID=4326;POINT(109.2 12.25)'),
                    FALSE, '{}'::jsonb, '{"applied": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    'VN', 'Khánh Hòa', 'Nha Trang', 'Rejected Test', 'FOOD',
                    'FOURSQUARE_OS_PLACES', 'fsq-rejected-904', 'NO_MATCH', 'hash-904', 'Rejected Place',
                    'rejected place', 'VALID', 'VALID', 'REJECTED'
                )
                """);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAsAdmin());
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<JsonNode> publishRes = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging/904/approve-and-publish",
                HttpMethod.POST,
                requestEntity,
                JsonNode.class
        );
        assertThat(publishRes.getStatusCode().is4xxClientError()).isTrue();
        assertThat(publishRes.getBody().path("message").asText()).containsIgnoringCase("rejected");
    }

    @Test
    void shouldRejectPublishWhenConfirmedDuplicate() {
        jdbcTemplate.update("""
                INSERT INTO place_import_runs (id, source, release_date, status, created_at, updated_at)
                VALUES (995, 'FOURSQUARE_OS_PLACES', '2026-06-11'::date, 'COMPLETED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """);
        jdbcTemplate.update("""
                INSERT INTO external_place_staging (
                    id, import_run_id, source_release_date, latitude, longitude, geom,
                    needs_admin_review, raw_payload, mapping_payload, created_at, updated_at,
                    country_code, region, locality, address, place_type_draft,
                    source, source_place_id, dedup_status, source_row_hash, name,
                    normalized_name, coordinate_status, validation_status, moderation_status
                )
                VALUES (
                    905, 995, '2026-06-11'::date, 12.25, 109.2, ST_GeogFromText('SRID=4326;POINT(109.2 12.25)'),
                    FALSE, '{}'::jsonb, '{"applied": false}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    'VN', 'Khánh Hòa', 'Nha Trang', 'Duplicate Test', 'FOOD',
                    'FOURSQUARE_OS_PLACES', 'fsq-dup-905', 'CONFIRMED_DUPLICATE', 'hash-905', 'Duplicate Place',
                    'duplicate place', 'VALID', 'VALID', 'PENDING_ADMIN_REVIEW'
                )
                """);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAsAdmin());
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<JsonNode> publishRes = restTemplate.exchange(
                "/api/v1/admin/place-moderation/staging/905/approve-and-publish",
                HttpMethod.POST,
                requestEntity,
                JsonNode.class
        );
        assertThat(publishRes.getStatusCode().is4xxClientError()).isTrue();
        assertThat(publishRes.getBody().path("message").asText()).containsIgnoringCase("duplicate");
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
