package com.tripwise.place.application.service.simulation;

import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class HighConfidenceSpatialDuplicateRule implements AutoModerationRule {
    @Override
    public boolean evaluate(StagingPlaceDetailResponse detail) {
        if (detail.getCandidates() == null) return false;
        return detail.getCandidates().stream()
                .anyMatch(c -> "HIGH".equals(c.getMatchConfidence()) && !"CROSS_SOURCE_STAGING".equals(c.getMatchType()));
    }

    @Override
    public SimulationCategory getCategory() {
        return SimulationCategory.AUTO_DUPLICATE;
    }

    @Override
    public String getSubCategory(StagingPlaceDetailResponse detail) {
        return "Spatial";
    }
}
