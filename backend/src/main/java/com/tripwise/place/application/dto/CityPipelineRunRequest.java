package com.tripwise.place.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CityPipelineRunRequest {

    @NotBlank(message = "Source is required (FOURSQUARE_OS_PLACES or OSM_GEOFABRIK)")
    @Pattern(regexp = "^(FOURSQUARE_OS_PLACES|OSM_GEOFABRIK)$", message = "Source must be FOURSQUARE_OS_PLACES or OSM_GEOFABRIK")
    private String source;

    @NotBlank(message = "Province is required")
    private String province;

    @NotBlank(message = "City is required")
    private String city;

    private String inputPath;

    private Long importRunId;

    @Builder.Default
    private String releaseDate = "2026-06-11";

    private String bbox;

    private Integer limit;

    @Builder.Default
    @Pattern(regexp = "^(all|import|dedup|moderation|report)$", message = "Step must be one of: all, import, dedup, moderation, report")
    private String step = "all";

    @Builder.Default
    private boolean dryRun = true;

    private boolean confirmWriteStaging;

    private void validateNoPublicApply() {
        String illegal = null;
        if (source != null) {
            String lower = source.toLowerCase();
            if (lower.contains("publish") || lower.contains("applypublic") || lower.contains("writepublic")) {
                illegal = source;
            }
        }
        if (illegal != null) {
            throw new IllegalArgumentException("Illegal parameter detected: '" + illegal + "'. Pipeline does not support writing to public tables.");
        }
    }
}
