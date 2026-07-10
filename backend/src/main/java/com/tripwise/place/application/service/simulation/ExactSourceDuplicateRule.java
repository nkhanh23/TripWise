package com.tripwise.place.application.service.simulation;

import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class ExactSourceDuplicateRule implements AutoModerationRule {
    @Override
    public boolean evaluate(StagingPlaceDetailResponse detail) {
        return detail.getExistingPublicDuplicate() != null;
    }

    @Override
    public SimulationCategory getCategory() {
        return SimulationCategory.AUTO_DUPLICATE;
    }

    @Override
    public String getSubCategory(StagingPlaceDetailResponse detail) {
        return "Exact source";
    }
}
