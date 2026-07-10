package com.tripwise.place.application.dto;

import java.util.List;

public record AutoModerationPreview(
    String province,
    String city,
    int totalStaging,
    int autoApprove,
    int autoDuplicate,
    int autoReject,
    int adminReview,
    List<PreviewRecord> records
) {
    public record PreviewRecord(
        Long stagingId,
        String name,
        String decision,
        String subCategory
    ) {}
}
