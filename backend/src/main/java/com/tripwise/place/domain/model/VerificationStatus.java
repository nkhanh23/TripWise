package com.tripwise.place.domain.model;

public enum VerificationStatus {
    PENDING,
    AUTO_APPROVED,
    VERIFIED,
    REJECTED;

    public boolean isRecommendable() {
        return this == AUTO_APPROVED || this == VERIFIED;
    }
}
