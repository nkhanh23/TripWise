package com.tripwise.place.application.dto;

import java.util.List;
import java.util.Map;

public record ExplainReport(
    String province,
    String city,
    int totalStaging,
    int totalNeedsAdminReview,
    Map<String, Integer> failureBreakdown,
    Map<String, Integer> combinationBreakdown,
    Map<String, Integer> categoryBreakdown,
    Map<String, Integer> placeTypeBreakdown,
    List<Recommendation> recommendations
) {
    public record Recommendation(
        String recommendation,
        String reason,
        int expectedReduction
    ) {}
}
