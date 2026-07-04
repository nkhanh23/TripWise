package com.tripwise.place.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MapPlacesQuery {

    private Double minLatitude;
    private Double minLongitude;
    private Double maxLatitude;
    private Double maxLongitude;
    private String province;
    private String city;
    private Long categoryId;
    private List<String> tags;
    private String verificationStatus;
    private BigDecimal minRating;
    private Integer limit;
}
