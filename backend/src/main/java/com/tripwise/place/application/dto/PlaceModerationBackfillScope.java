package com.tripwise.place.application.dto;

import lombok.Builder;

@Builder
public record PlaceModerationBackfillScope(
        String sourceName,
        String province,
        String city,
        String currentPlaceType,
        String currentVerificationStatus,
        Boolean currentRecommendable,
        boolean knownLocationOnly
) {
}
