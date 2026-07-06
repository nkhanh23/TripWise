package com.tripwise.place.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPlaceReviewQuery {

    private String source;
    private String province;
    private String city;
    private String placeType;
    private String verificationStatus;
    private Boolean recommendable;
    private String keyword;
}
