package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.PlaceImportRecord;
import com.tripwise.place.domain.model.PlaceType;
import com.tripwise.place.domain.model.VerificationStatus;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceFilter;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceFilterResult;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

@Component
public class PlaceModerationEvaluator {

    private static final Set<String> SUPPORTED_VERIFICATION_STATUSES = Set.of(
            "PENDING",
            "AUTO_APPROVED",
            "VERIFIED",
            "REJECTED"
    );

    private final OsmPlaceFilter osmPlaceFilter;

    public PlaceModerationEvaluator(OsmPlaceFilter osmPlaceFilter) {
        this.osmPlaceFilter = osmPlaceFilter;
    }

    public PlaceModerationPreview evaluate(PlaceImportRecord record) {
        OsmPlaceFilterResult filterResult = osmPlaceFilter.filter(record);
        if (filterResult.isRejected()) {
            return new PlaceModerationPreview(
                    PlaceType.REJECTED,
                    null,
                    0,
                    0,
                    0,
                    false,
                    VerificationStatus.REJECTED,
                    false,
                    filterResult.rejectReason(),
                    null
            );
        }

        int qualityScore = filterResult.qualityScore();
        VerificationStatus requestedStatus = normalizeVerificationStatus(record.verificationStatus());
        PlaceType placeType = PlaceType.valueOf(filterResult.placeType().name());
        boolean attraction = placeType == PlaceType.ATTRACTION;

        if (qualityScore < 50) {
            return preview(
                    placeType,
                    filterResult,
                    VerificationStatus.REJECTED,
                    false,
                    "Quality score below acceptance threshold: " + qualityScore
            );
        }

        if (!attraction) {
            return preview(placeType, filterResult, VerificationStatus.PENDING, false, null);
        }

        if (filterResult.isPromotionGuarded()) {
            return preview(
                    placeType,
                    filterResult,
                    VerificationStatus.PENDING,
                    false,
                    filterResult.promotionGuardReason()
            );
        }

        if (qualityScore >= 80 && filterResult.strongTourismSignal()) {
            VerificationStatus promotedStatus = requestedStatus == VerificationStatus.VERIFIED
                    ? VerificationStatus.VERIFIED
                    : VerificationStatus.AUTO_APPROVED;
            return preview(placeType, filterResult, promotedStatus, true, null);
        }

        return preview(placeType, filterResult, VerificationStatus.PENDING, false, null);
    }

    private PlaceModerationPreview preview(
            PlaceType placeType,
            OsmPlaceFilterResult filterResult,
            VerificationStatus verificationStatus,
            boolean recommendable,
            String rejectReason
    ) {
        return new PlaceModerationPreview(
                placeType,
                filterResult.normalizedCategory(),
                filterResult.qualityScore(),
                filterResult.tourismRelevanceScore(),
                filterResult.completenessScore(),
                filterResult.strongTourismSignal(),
                verificationStatus,
                recommendable,
                rejectReason,
                filterResult.promotionGuardReason()
        );
    }

    private VerificationStatus normalizeVerificationStatus(String verificationStatus) {
        if (verificationStatus == null || verificationStatus.isBlank()) {
            return VerificationStatus.PENDING;
        }
        String normalized = verificationStatus.trim().toUpperCase(Locale.ROOT);
        return SUPPORTED_VERIFICATION_STATUSES.contains(normalized)
                ? VerificationStatus.valueOf(normalized)
                : VerificationStatus.PENDING;
    }
}
