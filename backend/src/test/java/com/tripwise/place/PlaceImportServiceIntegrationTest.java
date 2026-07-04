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
                  AND verification_status = 'UNVERIFIED'
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
