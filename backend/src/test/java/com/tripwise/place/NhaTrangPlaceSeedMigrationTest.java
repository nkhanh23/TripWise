package com.tripwise.place;

import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class NhaTrangPlaceSeedMigrationTest extends BaseIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldSeedVerifiedNhaTrangPlacesWithTags() {
        Integer totalPlaces = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM places WHERE city = 'Nha Trang'",
                Integer.class
        );
        Integer verifiedPlaces = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM places WHERE city = 'Nha Trang' AND is_verified = TRUE",
                Integer.class
        );
        Integer taggedPlaces = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT place_id) FROM place_tags",
                Integer.class
        );

        List<String> requiredPlaces = jdbcTemplate.queryForList(
                """
                SELECT name
                FROM places
                WHERE name IN (
                    'Trần Phú Beach',
                    'Tháp Bà Pô Nagar',
                    'Chùa Long Sơn',
                    'VinWonders Nha Trang',
                    'Chợ Xóm Mới'
                )
                ORDER BY name
                """,
                String.class
        );

        assertThat(totalPlaces).isBetween(20, 30);
        assertThat(verifiedPlaces).isEqualTo(totalPlaces);
        assertThat(taggedPlaces).isEqualTo(totalPlaces);
        assertThat(requiredPlaces).containsExactly(
                "Chợ Xóm Mới",
                "Chùa Long Sơn",
                "Tháp Bà Pô Nagar",
                "Trần Phú Beach",
                "VinWonders Nha Trang"
        );
    }
}
