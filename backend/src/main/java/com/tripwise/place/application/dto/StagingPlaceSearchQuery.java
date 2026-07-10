package com.tripwise.place.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StagingPlaceSearchQuery {
    private Long importRunId;
    private String province;
    private String city;
    private String moderationStatus;
    private String dedupStatus;
    private String placeTypeDraft;
    private String keyword;
}
