package com.tripwise.place;

import com.tripwise.BaseIntegrationTest;
import com.tripwise.place.application.dto.PlaceImportMode;
import com.tripwise.place.application.dto.PlaceImportReport;
import com.tripwise.place.application.service.PlaceImportService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceImportServiceIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private PlaceImportService placeImportService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @TempDir
    Path tempDir;

    @Test
    void shouldInsertNewPlacesAndDeduplicateNearbyMatchesDuringFullSync() throws IOException {
        Path inputFile = tempDir.resolve("nationwide-import.ndjson");
        Files.writeString(inputFile, """
                {"sourceExternalId":"geo-run-1","name":"Nui Co Tien Test","province":"Khanh Hoa","city":"Nha Trang","district":"Vinh Hoa","displayAddress":"Vinh Hoa, Nha Trang","latitude":12.2925,"longitude":109.2064,"description":"Diem ngam canh test","durationMinutes":90,"estimatedCost":25000,"tags":["viewpoint"],"rawTags":{"tourism":"viewpoint"}}
                {"name":"Chợ Đầm","province":"Khanh Hoa","city":"Nha Trang","latitude":12.25480,"longitude":109.19005,"rawTags":{"amenity":"marketplace"}}
                {"sourceExternalId":"geo-run-unsupported","name":"Rail Switch Test","province":"Khanh Hoa","city":"Nha Trang","latitude":12.2000,"longitude":109.1900,"rawTags":{"railway":"switch"}}
                """);

        PlaceImportReport report = placeImportService.importFile(
                inputFile,
                "TEST_OSM_IMPORT_A",
                PlaceImportMode.FULL_SYNC,
                120.0,
                false
        );

        assertThat(report.processedCount()).isEqualTo(3);
        assertThat(report.insertedCount()).isEqualTo(1);
        assertThat(report.updatedCount()).isZero();
        assertThat(report.deduplicatedCount()).isEqualTo(1);
        assertThat(report.skippedCount()).isEqualTo(1);
        assertThat(report.errorCount()).isEqualTo(1);
        assertThat(report.staleMarkedCount()).isZero();

        Integer insertedPlaces = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM places
                WHERE source = 'TEST_OSM_IMPORT_A'
                  AND source_external_id = 'geo-run-1'
                  AND name = 'Nui Co Tien Test'
                  AND place_type = 'ATTRACTION'
                  AND verification_status = 'AUTO_APPROVED'
                  AND is_recommendable = TRUE
                  AND quality_score >= 80
                """,
                Integer.class
        );

        assertThat(insertedPlaces).isEqualTo(1);

        Integer duplicateCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM places
                WHERE name = 'Chợ Đầm'
                """,
                Integer.class
        );

        assertThat(duplicateCount).isEqualTo(1);

        Integer dataSourceRows = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM place_data_sources
                WHERE source_name = 'TEST_OSM_IMPORT_A'
                """,
                Integer.class
        );

        assertThat(dataSourceRows).isEqualTo(2);

        Integer importRunRows = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM place_import_runs
                WHERE source_name = 'TEST_OSM_IMPORT_A'
                  AND status = 'SUCCESS'
                  AND inserted_count = 1
                  AND deduplicated_count = 1
                  AND skipped_count = 1
                  AND error_count = 1
                """,
                Integer.class
        );

        assertThat(importRunRows).isEqualTo(1);
    }

    @Test
    void shouldSkipRejectedNoiseAndKeepFoodSeparatedFromAttractions() throws IOException {
        Path inputFile = tempDir.resolve("noise-filter-import.ndjson");
        Files.writeString(inputFile, """
                {"sourceExternalId":"noise-1","name":"Chung tay bảo vệ môi trường","province":"Khanh Hoa","city":"Nha Trang","latitude":12.2501,"longitude":109.1901,"rawTags":{"tourism":"artwork"}}
                {"sourceExternalId":"noise-2","name":"0 km","province":"Khanh Hoa","city":"Nha Trang","latitude":12.2502,"longitude":109.1902,"rawTags":{"tourism":"attraction"}}
                {"sourceExternalId":"noise-3","name":"04 Nguyễn Huy Tự","province":"Khanh Hoa","city":"Nha Trang","latitude":12.2503,"longitude":109.1903,"rawTags":{"amenity":"restaurant"}}
                {"sourceExternalId":"noise-4","name":"0971685111","province":"Khanh Hoa","city":"Nha Trang","latitude":12.2504,"longitude":109.1904,"rawTags":{"amenity":"bar"}}
                {"sourceExternalId":"service-low-1","name":"Old Fountain Spot","province":"Khanh Hoa","city":"Nha Trang","latitude":12.25045,"longitude":109.19045,"rawTags":{"amenity":"fountain"}}
                {"sourceExternalId":"food-1","name":"Bun Ca Sua Test","province":"Khanh Hoa","city":"Nha Trang","displayAddress":"123 Tran Phu","description":"Quan an dac san","latitude":12.2505,"longitude":109.1905,"tags":["bun-ca"],"rawTags":{"amenity":"restaurant"}}
                {"sourceExternalId":"attraction-1","name":"Hon Chong Scenic Spot","province":"Khanh Hoa","city":"Nha Trang","displayAddress":"Pham Van Dong","description":"Diem ngam canh noi tieng","latitude":12.2650,"longitude":109.2010,"tags":["viewpoint"],"rawTags":{"tourism":"attraction","leisure":"park"}}
                """);

        PlaceImportReport report = placeImportService.importFile(
                inputFile,
                "TEST_OSM_IMPORT_FILTERING",
                PlaceImportMode.FULL_SYNC,
                80.0,
                false
        );

        assertThat(report.processedCount()).isEqualTo(7);
        assertThat(report.insertedCount()).isEqualTo(3);
        assertThat(report.skippedCount()).isEqualTo(4);

        Integer rejectedNoiseRows = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM places
                WHERE source = 'TEST_OSM_IMPORT_FILTERING'
                  AND source_external_id IN ('noise-1', 'noise-2', 'noise-3', 'noise-4')
                """,
                Integer.class
        );

        assertThat(rejectedNoiseRows).isZero();

        Integer foodRows = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM places
                WHERE source = 'TEST_OSM_IMPORT_FILTERING'
                  AND source_external_id = 'food-1'
                  AND place_type = 'FOOD'
                  AND verification_status = 'PENDING'
                  AND is_recommendable = FALSE
                """,
                Integer.class
        );

        assertThat(foodRows).isEqualTo(1);

        Integer rejectedServiceRows = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM places
                WHERE source = 'TEST_OSM_IMPORT_FILTERING'
                  AND source_external_id = 'service-low-1'
                  AND place_type = 'SERVICE'
                  AND verification_status = 'REJECTED'
                  AND is_recommendable = FALSE
                  AND reject_reason IS NOT NULL
                """,
                Integer.class
        );

        assertThat(rejectedServiceRows).isEqualTo(1);

        Integer attractionRows = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM places
                WHERE source = 'TEST_OSM_IMPORT_FILTERING'
                  AND source_external_id = 'attraction-1'
                  AND place_type = 'ATTRACTION'
                  AND verification_status = 'AUTO_APPROVED'
                  AND is_recommendable = TRUE
                """,
                Integer.class
        );

        assertThat(attractionRows).isEqualTo(1);
    }

    @Test
    void shouldPromoteSparseStrongAttractionsButKeepWeakHistoricRecordsPending() throws IOException {
        Path inputFile = tempDir.resolve("promotion-balance-import.ndjson");
        Files.writeString(inputFile, """
                {"sourceExternalId":"strong-attraction-1","name":"Mui Doi Viewpoint","latitude":12.7450,"longitude":109.4300,"rawTags":{"tourism":"viewpoint"}}
                {"sourceExternalId":"strong-attraction-2","name":"Bai Nom Beach","latitude":12.8700,"longitude":109.3900,"rawTags":{"natural":"beach"}}
                {"sourceExternalId":"weak-historic-1","name":"Bia Tuong Niem Ven Nui","latitude":12.5100,"longitude":109.1800,"rawTags":{"historic":"memorial"}}
                {"sourceExternalId":"artwork-1","name":"Pho Tuong Nghe Thuat","latitude":12.5200,"longitude":109.1700,"rawTags":{"tourism":"artwork"}}
                """);

        PlaceImportReport report = placeImportService.importFile(
                inputFile,
                "TEST_OSM_IMPORT_PROMOTION",
                PlaceImportMode.FULL_SYNC,
                80.0,
                false
        );

        assertThat(report.processedCount()).isEqualTo(4);
        assertThat(report.insertedCount()).isEqualTo(4);
        assertThat(report.skippedCount()).isZero();

        Integer strongAttractionRows = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM places
                WHERE source = 'TEST_OSM_IMPORT_PROMOTION'
                  AND source_external_id IN ('strong-attraction-1', 'strong-attraction-2')
                  AND place_type = 'ATTRACTION'
                  AND verification_status = 'AUTO_APPROVED'
                  AND is_recommendable = TRUE
                  AND quality_score >= 80
                """,
                Integer.class
        );

        assertThat(strongAttractionRows).isEqualTo(2);

        Integer weakHistoricRows = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM places
                WHERE source = 'TEST_OSM_IMPORT_PROMOTION'
                  AND source_external_id = 'weak-historic-1'
                  AND place_type = 'ATTRACTION'
                  AND verification_status = 'PENDING'
                  AND is_recommendable = FALSE
                  AND quality_score >= 50
                  AND quality_score < 80
                """,
                Integer.class
        );

        assertThat(weakHistoricRows).isEqualTo(1);

        Integer artworkRows = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM places
                WHERE source = 'TEST_OSM_IMPORT_PROMOTION'
                  AND source_external_id = 'artwork-1'
                  AND place_type = 'SERVICE'
                  AND verification_status = 'REJECTED'
                  AND is_recommendable = FALSE
                """,
                Integer.class
        );

        assertThat(artworkRows).isEqualTo(1);
    }

    @Test
    void shouldDeactivateMissingSourceOwnedPlacesOnSubsequentFullSync() throws IOException {
        Path firstInput = tempDir.resolve("full-sync-first.ndjson");
        Files.writeString(firstInput, """
                {"sourceExternalId":"geo-sync-1","name":"Sync Waterfall Test","province":"Khanh Hoa","city":"Nha Trang","latitude":12.4310,"longitude":109.2045,"rawTags":{"natural":"waterfall"}}
                """);

        PlaceImportReport firstReport = placeImportService.importFile(
                firstInput,
                "TEST_OSM_IMPORT_SYNC",
                PlaceImportMode.FULL_SYNC,
                100.0,
                false
        );

        assertThat(firstReport.insertedCount()).isEqualTo(1);

        Path secondInput = tempDir.resolve("full-sync-second.ndjson");
        Files.writeString(secondInput, "");

        PlaceImportReport secondReport = placeImportService.importFile(
                secondInput,
                "TEST_OSM_IMPORT_SYNC",
                PlaceImportMode.FULL_SYNC,
                100.0,
                false
        );

        assertThat(secondReport.processedCount()).isZero();
        assertThat(secondReport.staleMarkedCount()).isEqualTo(1);

        Integer inactiveRows = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM places
                WHERE source = 'TEST_OSM_IMPORT_SYNC'
                  AND source_external_id = 'geo-sync-1'
                  AND is_active = FALSE
                  AND stale_at IS NOT NULL
                """,
                Integer.class
        );

        assertThat(inactiveRows).isEqualTo(1);
    }
}
