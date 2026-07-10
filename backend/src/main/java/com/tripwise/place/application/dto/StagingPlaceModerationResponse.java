package com.tripwise.place.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StagingPlaceModerationResponse {
    private Long id;
    private Long importRunId;
    private String name;
    private String placeTypeDraft;
    private Double latitude;
    private Double longitude;
    private String region;
    private String locality;
    private String address;
    private String source;
    private String sourcePlaceId;
    private String dedupStatus;
    private String coordinateStatus;
    private String validationStatus;
    private String moderationStatus;
    private Boolean needsAdminReview;
    private Boolean applied;
    private String rawPayload;
    private Instant createdAt;
    private Instant updatedAt;
}
