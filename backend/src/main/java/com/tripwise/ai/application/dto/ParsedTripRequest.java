package com.tripwise.ai.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedTripRequest {
    private String destination;
    private Integer numDays;
    private Integer numNights;
    private String budgetLevel;
    private List<String> interests;
    private String preferences;
}
