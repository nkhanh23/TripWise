package com.tripwise.place.infrastructure.persistence;

import com.tripwise.place.application.dto.PlaceModerationBackfillScope;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceImportJdbcRepositoryKnownLocationOnlyTest {

    private PlaceImportJdbcRepository repository;
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        DataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:known-location-only;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
                "sa",
                ""
        );
        jdbcTemplate = new JdbcTemplate(dataSource);
        repository = new PlaceImportJdbcRepository(
                new NamedParameterJdbcTemplate(dataSource),
                jdbcTemplate
        );

        jdbcTemplate.execute("DROP TABLE IF EXISTS places");
        jdbcTemplate.execute("""
                CREATE TABLE places (
                    id BIGINT PRIMARY KEY,
                    source VARCHAR(64) NOT NULL,
                    province VARCHAR(255),
                    city VARCHAR(255),
                    place_type VARCHAR(64),
                    verification_status VARCHAR(64),
                    is_recommendable BOOLEAN
                )
                """);

        insertPlace(1L, "Ha Noi", null);
        insertPlace(2L, null, "Da Nang");
        insertPlace(3L, null, null);
        insertPlace(4L, null, "Unknown");
        insertPlace(5L, "Unknown", null);
        insertPlace(6L, "   ", " ");
        insertPlace(7L, "  unknown  ", null);
        insertPlace(8L, null, " null ");
        insertPlace(9L, "Khanh Hoa", "Unknown");
    }

    @Test
    void knownLocationOnlyFalseShouldKeepExistingBehavior() {
        long count = repository.countPlacesForModerationBackfill(baseScope(false));

        assertThat(count).isEqualTo(9);
    }

    @Test
    void knownLocationOnlyTrueShouldIncludeOnlyRowsWithKnownProvinceOrCity() {
        long count = repository.countPlacesForModerationBackfill(baseScope(true));

        assertThat(count).isEqualTo(3);
    }

    private PlaceModerationBackfillScope baseScope(boolean knownLocationOnly) {
        return PlaceModerationBackfillScope.builder()
                .sourceName("OSM_GEOFABRIK")
                .currentPlaceType("FOOD")
                .currentVerificationStatus("PENDING")
                .currentRecommendable(Boolean.FALSE)
                .knownLocationOnly(knownLocationOnly)
                .build();
    }

    private void insertPlace(long id, String province, String city) {
        jdbcTemplate.update("""
                        INSERT INTO places (
                            id,
                            source,
                            province,
                            city,
                            place_type,
                            verification_status,
                            is_recommendable
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                id,
                "OSM_GEOFABRIK",
                province,
                city,
                "FOOD",
                "PENDING",
                false
        );
    }
}
