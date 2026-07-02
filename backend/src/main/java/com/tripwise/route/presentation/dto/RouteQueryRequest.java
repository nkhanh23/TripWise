package com.tripwise.route.presentation.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class RouteQueryRequest {

    @NotNull(message = "originLat is required")
    @DecimalMin(value = "-90.0", message = "originLat must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "originLat must be between -90 and 90")
    private Double originLat;

    @NotNull(message = "originLng is required")
    @DecimalMin(value = "-180.0", message = "originLng must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "originLng must be between -180 and 180")
    private Double originLng;

    @NotNull(message = "destLat is required")
    @DecimalMin(value = "-90.0", message = "destLat must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "destLat must be between -90 and 90")
    private Double destLat;

    @NotNull(message = "destLng is required")
    @DecimalMin(value = "-180.0", message = "destLng must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "destLng must be between -180 and 180")
    private Double destLng;

    @NotBlank(message = "profile is required")
    @Pattern(
            regexp = "(?i)driving|walking|cycling",
            message = "profile must be one of: driving, walking, cycling"
    )
    private String profile;
}
