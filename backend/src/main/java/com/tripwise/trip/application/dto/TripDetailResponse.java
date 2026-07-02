package com.tripwise.trip.application.dto;

import com.tripwise.itinerary.application.dto.ItineraryResponse;
import com.tripwise.trip.domain.enums.TripStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripDetailResponse {
    private Long id;
    private String destination;
    private LocalDate startDate;
    private Integer days;
    private Integer nights;
    private String budget;
    private String travelStyle;
    private List<String> interests;
    private String preferences;
    private TripStatus status;
    private Map<String, Object> aiMetadata;
    private ItineraryResponse itinerary;
    private Instant createdAt;
    private Instant updatedAt;
}
