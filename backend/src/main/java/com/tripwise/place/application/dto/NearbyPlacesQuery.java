package com.tripwise.place.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearbyPlacesQuery {

    private Double latitude;
    private Double longitude;
    private Double radiusMeters;
    private Long categoryId;
    private Integer limit;
}
