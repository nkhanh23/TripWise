package com.tripwise.place.application.dto;

import java.util.List;
import java.util.Map;

public record PublishVerificationReport(
    String province,
    String city,
    int totalPending,
    int eligible,
    int publishable,
    int blocked,
    double successRatePct,
    long executionTimeMs,
    Map<String, Integer> blockBreakdown,
    List<BlockedRecord> blockedSamples,
    List<String> topBlockers
) {
    public record BlockedRecord(
        Long stagingId,
        String name,
        String placeType,
        String reason,
        String detail
    ) {}
}