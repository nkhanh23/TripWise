package com.tripwise.place.application.service.simulation;

import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class MediumConfidenceDuplicateReviewRule implements AutoModerationRule {
    @Override
    public boolean evaluate(StagingPlaceDetailResponse detail) {
        if (detail.getCandidates() == null || detail.getCandidates().isEmpty()) {
            return false;
        }
        boolean hasMedium = detail.getCandidates().stream()
                .anyMatch(c -> "MEDIUM".equals(c.getMatchConfidence()));
        boolean hasHigh = detail.getCandidates().stream()
                .anyMatch(c -> "HIGH".equals(c.getMatchConfidence()));
        return hasMedium && !hasHigh;
    }

    @Override
    public SimulationCategory getCategory() {
        return SimulationCategory.NEEDS_ADMIN_REVIEW;
    }

    @Override
    public String getSubCategory(StagingPlaceDetailResponse detail) {
        return "Duplicate confidence MEDIUM";
    }
}
