package com.tripwise.place.application.service.simulation;

import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class LowConfidenceDuplicateReviewRule implements AutoModerationRule {
    @Override
    public boolean evaluate(StagingPlaceDetailResponse detail) {
        if (detail.getCandidates() == null || detail.getCandidates().isEmpty()) {
            return false;
        }
        return detail.getCandidates().stream()
                .allMatch(c -> "LOW".equals(c.getMatchConfidence()));
    }

    @Override
    public SimulationCategory getCategory() {
        return SimulationCategory.NEEDS_ADMIN_REVIEW;
    }

    @Override
    public String getSubCategory(StagingPlaceDetailResponse detail) {
        return "Duplicate confidence LOW";
    }
}
