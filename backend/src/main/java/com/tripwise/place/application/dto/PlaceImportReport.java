package com.tripwise.place.application.dto;

public record PlaceImportReport(
        long runId,
        int processedCount,
        int insertedCount,
        int updatedCount,
        int deduplicatedCount,
        int skippedCount,
        int errorCount,
        int staleMarkedCount,
        String notes
) {
}
