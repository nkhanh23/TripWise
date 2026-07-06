package com.tripwise.place.application.service;

import com.tripwise.place.domain.model.PlaceType;
import com.tripwise.place.domain.model.VerificationStatus;

public record PlaceModerationPreview(
        PlaceType placeType,
        String normalizedCategory,
        int qualityScore,
        int tourismRelevanceScore,
        int completenessScore,
        boolean strongTourismSignal,
        VerificationStatus verificationStatus,
        boolean recommendable,
        String rejectReason,
        String promotionGuardReason
) {

    public boolean isRejectedByFilter() {
        return placeType == PlaceType.REJECTED;
    }
}
