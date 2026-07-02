package com.tripwise.hotel;

import com.tripwise.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class NhaTrangHotelSeedMigrationTest extends BaseIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldSeedNhaTrangHotelsWithStarRatingsAndPriceLevels() {
        Integer totalHotels = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM hotels WHERE city = 'Nha Trang'",
                Integer.class
        );
        Integer activeHotels = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM hotels WHERE city = 'Nha Trang' AND is_active = TRUE",
                Integer.class
        );
        Integer geocodedHotels = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM hotels WHERE city = 'Nha Trang' AND location IS NOT NULL",
                Integer.class
        );
        Integer highStarHotels = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM hotels WHERE city = 'Nha Trang' AND star_rating >= 4",
                Integer.class
        );

        List<String> priceLevels = jdbcTemplate.queryForList(
                "SELECT DISTINCT price_level FROM hotels WHERE city = 'Nha Trang' ORDER BY price_level",
                String.class
        );

        List<String> requiredHotels = jdbcTemplate.queryForList(
                """
                SELECT name
                FROM hotels
                WHERE name IN (
                    'InterContinental Nha Trang',
                    'Sheraton Nha Trang Hotel & Spa',
                    'Vinpearl Resort Nha Trang',
                    'Liberty Central Nha Trang',
                    'Aaron Hotel Nha Trang'
                )
                ORDER BY name
                """,
                String.class
        );

        assertThat(totalHotels).isBetween(10, 15);
        assertThat(activeHotels).isEqualTo(totalHotels);
        assertThat(geocodedHotels).isEqualTo(totalHotels);
        assertThat(highStarHotels).isGreaterThanOrEqualTo(6);
        assertThat(priceLevels).containsExactly("HIGH", "LOW", "MEDIUM");
        assertThat(requiredHotels).containsExactly(
                "Aaron Hotel Nha Trang",
                "InterContinental Nha Trang",
                "Liberty Central Nha Trang",
                "Sheraton Nha Trang Hotel & Spa",
                "Vinpearl Resort Nha Trang"
        );
    }
}
