package com.tripwise.place.application.dto;

import java.util.List;

public record ExplainExclusiveReport(
    String province,
    String city,
    int totalStaging,
    int totalNeedsAdminReview,
    List<ExclusiveBucket> buckets,
    List<String> recommendations
) {
    public record ExclusiveBucket(
        String name,
        int recordCount,
        double percentage,
        List<Long> sampleStagingIds,
        String safetyLabel,
        String safetyStars,
        String difficultyLabel,
        String difficultyStars,
        int roiScore
    ) {}
}
