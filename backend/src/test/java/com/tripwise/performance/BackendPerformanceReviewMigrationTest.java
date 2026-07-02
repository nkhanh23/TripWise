package com.tripwise.performance;

import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BackendPerformanceReviewMigrationTest extends BaseIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldCreatePerformanceIndexesFromMigrationV15() {
        List<String> indexes = jdbcTemplate.queryForList("""
                SELECT indexname
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND indexname IN (
                      'idx_places_city_active_verified_ci',
                      'idx_trips_user_created_at_desc',
                      'idx_hotels_city_active_star_name_ci',
                      'idx_hotels_city_price_active_star_name_ci'
                  )
                """, String.class);

        assertThat(indexes).containsExactlyInAnyOrder(
                "idx_places_city_active_verified_ci",
                "idx_trips_user_created_at_desc",
                "idx_hotels_city_active_star_name_ci",
                "idx_hotels_city_price_active_star_name_ci"
        );
    }
}
