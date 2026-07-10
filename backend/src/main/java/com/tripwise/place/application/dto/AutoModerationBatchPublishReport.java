package com.tripwise.place.application.dto;

import java.util.List;

public record AutoModerationBatchPublishReport(
    String province,
    String city,
    int totalScanned,
    int eligible,
    int published,
    int skipped,
    int failed,
    long executionTimeMs,
    int totalChunks,
    int successfulChunks,
    int failedChunks,
    List<ChunkStats> chunkStats,
    List<PublishedRecord> publishedRecords
) {
    public record ChunkStats(
        int chunkIndex,
        int size,
        int published,
        int failed,
        long durationMs
    ) {}

    public record PublishedRecord(
        Long stagingId,
        String name,
        String placeType,
        Long publicPlaceId,
        String publicPlaceType,
        long durationMs
    ) {}
}