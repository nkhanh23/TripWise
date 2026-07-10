package com.tripwise.place.application.service.simulation;

import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import org.springframework.stereotype.Component;

@Component
public class InvalidValidationRule implements AutoModerationRule {
    @Override
    public boolean evaluate(StagingPlaceDetailResponse detail) {
        return detail.getStagingPlace() != null && "INVALID".equals(detail.getStagingPlace().getValidationStatus());
    }

    @Override
    public SimulationCategory getCategory() {
        return SimulationCategory.AUTO_REJECT;
    }

    @Override
    public String getSubCategory(StagingPlaceDetailResponse detail) {
        return "Invalid validation";
    }
}
