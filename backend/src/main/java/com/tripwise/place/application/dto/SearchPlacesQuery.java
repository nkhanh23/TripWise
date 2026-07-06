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
public class SearchPlacesQuery {

    private String province;
    private String city;
    private String placeType;
    private Long categoryId;
    private List<String> tags;
    private String priceLevel;
    private String verificationStatus;
    private BigDecimal minRating;
    private String keyword;
}
