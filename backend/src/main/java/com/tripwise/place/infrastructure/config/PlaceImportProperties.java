package com.tripwise.place.infrastructure.config;

import com.tripwise.place.application.dto.PlaceImportMode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "tripwise.place-import")
public class PlaceImportProperties {

    private boolean enabled = false;

    @NotBlank
    private String sourceName = "OSM_GEOFABRIK";

    private String inputFile;

    private PlaceImportMode importMode = PlaceImportMode.FULL_SYNC;

    @DecimalMin(value = "1.0")
    private double dedupeRadiusMeters = 150.0;

    private boolean failOnMappingError = false;
}
