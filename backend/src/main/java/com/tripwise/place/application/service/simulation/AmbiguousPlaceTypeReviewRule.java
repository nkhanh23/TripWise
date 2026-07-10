package com.tripwise.place.application.service.simulation;

import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.dto.StagingPlaceModerationResponse;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class AmbiguousPlaceTypeReviewRule implements AutoModerationRule {
    private static final Set<String> KNOWN_TYPES = Set.of("ATTRACTION", "FOOD", "HOTEL", "SERVICE");

    @Override
    public boolean evaluate(StagingPlaceDetailResponse detail) {
        StagingPlaceModerationResponse staging = detail.getStagingPlace();
        if (staging == null) return true;
        String type = staging.getPlaceTypeDraft();
        return type == null || type.isBlank() || !KNOWN_TYPES.contains(type.toUpperCase());
    }

    @Override
    public SimulationCategory getCategory() {
        return SimulationCategory.NEEDS_ADMIN_REVIEW;
    }

    @Override
    public String getSubCategory(StagingPlaceDetailResponse detail) {
        return "Ambiguous place type";
    }
}
