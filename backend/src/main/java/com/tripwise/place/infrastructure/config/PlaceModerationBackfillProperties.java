package com.tripwise.place.infrastructure.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "tripwise.place-moderation-backfill")
public class PlaceModerationBackfillProperties {

    private boolean enabled = false;

    @NotBlank
    private String sourceName = "OSM_GEOFABRIK";

    private String province;

    private String city;

    private String currentPlaceType;

    private String currentVerificationStatus;

    private Boolean currentRecommendable;

    private PlaceModerationBackfillMode mode = PlaceModerationBackfillMode.DRY_RUN;

    private boolean apply = false;

    @Min(0)
    private int scanLimit = 0;

    @Min(1)
    private int topLimit = 50;

    private String exportJsonFile;
}
