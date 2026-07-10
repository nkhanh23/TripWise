package com.tripwise.place;

import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ExternalPlaceStagingMigrationTest extends BaseIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldExtendPlaceImportRunsForExternalSourceDryRuns() {
        List<String> columns = jdbcTemplate.queryForList(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'place_import_runs'
                  AND column_name IN (
                      'release_date',
                      'dataset_path',
                      'dry_run',
                      'total_input_rows',
                      'total_valid_rows',
                      'total_invalid_rows',
                      'metadata'
                  )
                ORDER BY column_name
                """,
                String.class
        );

        assertThat(columns).containsExactly(
                "dataset_path",
                "dry_run",
                "metadata",
                "release_date",
                "total_input_rows",
                "total_invalid_rows",
                "total_valid_rows"
        );
    }

    @Test
    void shouldCreateExternalStagingTables() {
        List<String> tables = jdbcTemplate.queryForList(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name IN (
                      'external_place_staging',
                      'external_place_category_staging',
                      'external_place_dedup_candidates'
                  )
                ORDER BY table_name
                """,
                String.class
        );

        assertThat(tables).containsExactly(
                "external_place_category_staging",
                "external_place_dedup_candidates",
                "external_place_staging"
        );
    }

    @Test
    void shouldCreateExternalStagingIndexesAndConstraints() {
        List<String> indexes = jdbcTemplate.queryForList(
                """
                SELECT indexname
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND indexname IN (
                      'uq_external_place_staging_source_release_place',
                      'uq_external_place_staging_run_place',
                      'idx_external_place_staging_geom_gist',
                      'idx_external_place_staging_moderation_status',
                      'uq_external_place_category_staging_place_category',
                      'idx_external_place_dedup_candidates_decision'
                  )
                ORDER BY indexname
                """,
                String.class
        );

        assertThat(indexes).containsExactly(
                "idx_external_place_dedup_candidates_decision",
                "idx_external_place_staging_geom_gist",
                "idx_external_place_staging_moderation_status",
                "uq_external_place_category_staging_place_category",
                "uq_external_place_staging_run_place",
                "uq_external_place_staging_source_release_place"
        );

        Integer constraintCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM pg_constraint
                WHERE conname IN (
                    'ck_external_place_staging_place_type',
                    'ck_external_place_staging_coordinate_status',
                    'ck_external_place_staging_moderation_status',
                    'ck_external_place_dedup_candidates_decision'
                )
                """,
                Integer.class
        );

        assertThat(constraintCount).isEqualTo(4);
    }
}
