package com.tripwise.place.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPlaceReviewResponse {

    private Long id;
    private String name;
    private String source;
    private String sourceExternalId;
    private String province;
    private String city;
    private String district;
    private String ward;
    private String placeType;
    private String verificationStatus;
    private Boolean recommendable;
    private Integer qualityScore;
    private String rejectReason;
    private Integer durationMinutes;
    private Double latitude;
    private Double longitude;
    private Set<String> tags;
    private String rawTags;
    private Instant updatedAt;
}
