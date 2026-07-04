package com.tripwise.place.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceMapMarkerResponse {

    private Long id;
    private String name;
    private String province;
    private String city;
    private String categoryName;
    private String categorySlug;
    private BigDecimal rating;
    private String primaryImageUrl;
    private String verificationStatus;
    private BigDecimal popularityScore;
    private Double latitude;
    private Double longitude;
}
