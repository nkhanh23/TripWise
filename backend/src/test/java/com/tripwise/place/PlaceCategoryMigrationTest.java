package com.tripwise.place;

import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceCategoryMigrationTest extends BaseIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldCreateAndSeedPlaceCategories() {
        Integer categoryCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM place_categories",
                Integer.class
        );

        List<String> slugs = jdbcTemplate.queryForList(
                "SELECT slug FROM place_categories ORDER BY slug",
                String.class
        );

        assertThat(categoryCount).isEqualTo(8);
        assertThat(slugs).containsExactly(
                "beach",
                "check-in",
                "culture",
                "entertainment",
                "food",
                "nature",
                "shopping",
                "spiritual"
        );
    }
}
