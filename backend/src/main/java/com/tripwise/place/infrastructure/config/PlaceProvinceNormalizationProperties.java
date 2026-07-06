package com.tripwise.place.infrastructure.config;

import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "tripwise.province-normalization")
public class PlaceProvinceNormalizationProperties {

    private boolean enabled = false;

    private String sourceName = "OSM_GEOFABRIK";

    private PlaceModerationBackfillMode mode = PlaceModerationBackfillMode.DRY_RUN;

    private boolean apply = false;

    @Min(1)
    private int sampleLimit = 100;

    private String exportJsonFile;
}
