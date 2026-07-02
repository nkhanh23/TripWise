package com.tripwise;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "tripwise.rate-limit.enabled=false"
)
@Testcontainers(disabledWithoutDocker = true)
public abstract class BaseIntegrationTest {

    // Using postgis image instead of standard postgresql because the project uses PostGIS
    @Container
    protected static final PostgreSQLContainer<?> postgreSQLContainer = 
            new PostgreSQLContainer<>(DockerImageName.parse("postgis/postgis:15-3.4-alpine")
                    .asCompatibleSubstituteFor("postgres"))
            .withDatabaseName("tripwise_test")
            .withUsername("test_user")
            .withPassword("test_password");

    @DynamicPropertySource
    static void registerPgProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgreSQLContainer::getJdbcUrl);
        registry.add("spring.datasource.username", postgreSQLContainer::getUsername);
        registry.add("spring.datasource.password", postgreSQLContainer::getPassword);
        // H2 should not be used if Postgres is active, so we force PostgreSQL dialect
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
    }
}
