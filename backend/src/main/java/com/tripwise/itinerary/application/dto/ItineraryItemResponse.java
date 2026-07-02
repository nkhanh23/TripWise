package com.tripwise.itinerary.application.dto;

import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.place.application.dto.PlaceResponse;
import com.tripwise.transport.application.dto.TransportSuggestionResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItineraryItemResponse {
    private Integer orderIndex;
    private LocalTime startTime;
    private LocalTime endTime;
    private TimeSlot timeSlot;
    private String reason;
    private String aiDescription;
    private BigDecimal estimatedCost;
    private Integer distanceFromPreviousMeters;
    private Integer durationFromPreviousSeconds;
    private TransportSuggestionResponse transportSuggestion;
    private PlaceResponse place;
}
