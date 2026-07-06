package com.tripwise.place;

import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceNationwideSchemaMigrationTest extends BaseIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldExpandPlacesTableForNationwideCoreMetadata() {
        List<String> placeColumns = jdbcTemplate.queryForList(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'places'
                  AND column_name IN (
                      'province',
                      'district',
                      'ward',
                      'display_address',
                      'is_recommendable',
                      'source',
                      'source_external_id',
                      'raw_tags',
                      'quality_score',
                      'reject_reason',
                      'place_type',
                      'verification_status',
                      'last_synced_at',
                      'stale_at'
                  )
                ORDER BY column_name
                """,
                String.class
        );

        assertThat(placeColumns).containsExactly(
                "district",
                "display_address",
                "is_recommendable",
                "last_synced_at",
                "place_type",
                "province",
                "quality_score",
                "raw_tags",
                "reject_reason",
                "source",
                "source_external_id",
                "stale_at",
                "verification_status",
                "ward"
        );

        Integer verifiedSeedPlaces = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM places
                WHERE city = 'Nha Trang'
                  AND source = 'MANUAL_SEED'
                  AND verification_status = 'VERIFIED'
                  AND is_recommendable = TRUE
                  AND raw_tags = '{}'::jsonb
                """,
                Integer.class
        );

        assertThat(verifiedSeedPlaces).isGreaterThan(0);
    }

    @Test
    void shouldCreateNationwidePlaceSupportingTables() {
        List<String> supportingTables = jdbcTemplate.queryForList(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name IN (
                      'place_enrichments',
                      'place_images',
                      'place_editorial_contents',
                      'place_popularity_metrics',
                      'place_data_sources'
                  )
                ORDER BY table_name
                """,
                String.class
        );

        assertThat(supportingTables).containsExactly(
                "place_data_sources",
                "place_editorial_contents",
                "place_enrichments",
                "place_images",
                "place_popularity_metrics"
        );
    }

    @Test
    void shouldCreateNationwideIndexesAndConstraints() {
        List<String> requiredIndexes = jdbcTemplate.queryForList(
                """
                SELECT indexname
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND indexname IN (
                      'uq_places_source_external_id',
                      'idx_places_province_city_category_active',
                      'idx_places_recommendable_active',
                      'idx_places_verification_status_active',
                      'idx_places_source_last_synced_at',
                      'idx_places_raw_tags_gin',
                      'uq_place_images_primary_per_place',
                      'idx_place_popularity_metrics_popularity'
                  )
                ORDER BY indexname
                """,
                String.class
        );

        assertThat(requiredIndexes).containsExactly(
                "idx_place_popularity_metrics_popularity",
                "idx_places_province_city_category_active",
                "idx_places_raw_tags_gin",
                "idx_places_recommendable_active",
                "idx_places_source_last_synced_at",
                "idx_places_verification_status_active",
                "uq_place_images_primary_per_place",
                "uq_places_source_external_id"
        );

        Integer verificationConstraintCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM pg_constraint
                WHERE conname = 'ck_places_verification_status'
                """,
                Integer.class
        );

        assertThat(verificationConstraintCount).isEqualTo(1);
    }
}
