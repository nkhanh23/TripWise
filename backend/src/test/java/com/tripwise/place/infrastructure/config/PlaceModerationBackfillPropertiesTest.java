package com.tripwise.place.infrastructure.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.context.ConfigurationPropertiesAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceModerationBackfillPropertiesTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(org.springframework.boot.autoconfigure.AutoConfigurations.of(
                    ConfigurationPropertiesAutoConfiguration.class
            ))
            .withUserConfiguration(TestConfiguration.class);

    @Test
    void shouldDefaultKnownLocationOnlyToFalse() {
        contextRunner.run(context -> {
            PlaceModerationBackfillProperties properties = context.getBean(PlaceModerationBackfillProperties.class);
            assertThat(properties.isKnownLocationOnly()).isFalse();
        });
    }

    @Test
    void shouldBindKnownLocationOnlyFromProperty() {
        contextRunner
                .withPropertyValues(
                        "tripwise.place-moderation-backfill.source-name=OSM_GEOFABRIK",
                        "tripwise.place-moderation-backfill.known-location-only=true"
                )
                .run(context -> {
                    PlaceModerationBackfillProperties properties = context.getBean(PlaceModerationBackfillProperties.class);
                    assertThat(properties.isKnownLocationOnly()).isTrue();
                });
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(PlaceModerationBackfillProperties.class)
    static class TestConfiguration {
    }
}
