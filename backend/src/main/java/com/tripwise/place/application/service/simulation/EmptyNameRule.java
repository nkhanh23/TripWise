package com.tripwise.place.application.service.simulation;

import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class EmptyNameRule implements AutoModerationRule {
    @Override
    public boolean evaluate(StagingPlaceDetailResponse detail) {
        return detail.getStagingPlace() == null ||
                detail.getStagingPlace().getName() == null ||
                detail.getStagingPlace().getName().strip().isEmpty();
    }

    @Override
    public SimulationCategory getCategory() {
        return SimulationCategory.AUTO_REJECT;
    }

    @Override
    public String getSubCategory(StagingPlaceDetailResponse detail) {
        return "Empty name";
    }
}
