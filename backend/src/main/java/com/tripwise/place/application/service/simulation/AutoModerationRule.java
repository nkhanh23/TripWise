package com.tripwise.place.application.service.simulation;

import com.tripwise.place.application.dto.StagingPlaceDetailResponse;

public interface AutoModerationRule {
    boolean evaluate(StagingPlaceDetailResponse detail);
    SimulationCategory getCategory();
    String getSubCategory(StagingPlaceDetailResponse detail);
}
