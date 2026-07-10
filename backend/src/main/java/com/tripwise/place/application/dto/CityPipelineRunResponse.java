package com.tripwise.place.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CityPipelineRunResponse {
    private Long id;
    private String source;
    private String province;
    private String city;
    private String inputPath;
    private Long importRunId;
    private String releaseDate;
    private String bbox;
    private Integer limitCount;
    private String step;
    private boolean dryRun;
    private boolean confirmWriteStaging;
    private String status;
    private String summaryText;
    private String adminQueueUrl;
    private Instant startedAt;
    private Instant finishedAt;
    private String errorMessage;
    private Instant createdAt;
    private Instant updatedAt;
}
