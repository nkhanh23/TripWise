package com.tripwise.place.application.dto;

import java.util.List;

public record AutoModerationExecutionReport(
    int totalScanned,
    int publishedAutomatically,
    int markedDuplicate,
    int rejected,
    int skippedForAdminReview,
    int failed,
    long executionTimeMs,
    List<ExecutionRecord> records
) {
    public record ExecutionRecord(
        Long stagingId,
        String name,
        String decision,
        String actionExecuted,
        String executionStatus,
        String failureReason,
        long executionDurationMs
    ) {}
}
