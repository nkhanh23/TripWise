package com.tripwise;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class TripWiseDatabaseIT extends BaseIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void containerShouldStartAndBeReady() {
        // Assert that the container is running
        assertThat(postgreSQLContainer.isRunning()).isTrue();

        // Perform a simple query to ensure the database is accessible
        Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        assertThat(result).isEqualTo(1);
    }
}
