package com.tripwise.place.infrastructure.ingestion;

public record OsmPlaceFilterResult(
        OsmPlaceType placeType,
        String normalizedCategory,
        String rejectReason,
        int qualityScore,
        int tourismRelevanceScore,
        int completenessScore,
        boolean strongTourismSignal,
        String promotionGuardReason
) {

    public boolean isRejected() {
        return placeType == OsmPlaceType.REJECTED;
    }

    public boolean isPromotionGuarded() {
        return promotionGuardReason != null;
    }
}
