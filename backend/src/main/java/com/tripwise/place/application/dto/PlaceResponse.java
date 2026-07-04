package com.tripwise.place.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceResponse {

    private Long id;
    private String name;
    private String province;
    private String city;
    private String district;
    private String ward;
    private String displayAddress;
    private Long categoryId;
    private String categoryName;
    private String categorySlug;
    private String description;
    private BigDecimal estimatedCost;
    private Integer durationMinutes;
    private Boolean indoor;
    private Boolean verified;
    private String priceLevel;
    private BigDecimal rating;
    private String verificationStatus;
    private BigDecimal popularityScore;
    private String primaryImageUrl;
    private Double latitude;
    private Double longitude;
    private Double distanceMeters;
    private Set<String> tags;
}
