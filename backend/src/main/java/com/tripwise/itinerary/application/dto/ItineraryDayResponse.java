package com.tripwise.itinerary.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItineraryDayResponse {
    private Integer dayNumber;
    private String dayTitle;
    private String weatherSummary;
    private Integer totalDistanceMeters;
    private Integer totalDurationSeconds;
    private List<ItineraryItemResponse> items;
}
