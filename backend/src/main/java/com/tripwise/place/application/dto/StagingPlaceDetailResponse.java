package com.tripwise.place.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StagingPlaceDetailResponse {
    private StagingPlaceModerationResponse stagingPlace;
    private List<CategoryResponse> categories;
    private List<DedupCandidateResponse> candidates;
    private com.tripwise.place.infrastructure.persistence.PlaceStagingModerationJdbcRepository.ExistingPublicRecord existingPublicDuplicate;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryResponse {
        private String sourceCategoryId;
        private String categoryLabel;
        private String categoryPath;
        private Boolean isPrimary;
    }
}
