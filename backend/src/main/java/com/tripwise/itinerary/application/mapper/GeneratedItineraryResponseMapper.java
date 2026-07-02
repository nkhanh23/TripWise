package com.tripwise.itinerary.application.mapper;

import com.tripwise.itinerary.application.dto.GeneratedItineraryResponse;
import com.tripwise.itinerary.application.dto.ItineraryResponse;
import com.tripwise.itinerary.domain.entity.ItineraryDay;
import com.tripwise.trip.domain.entity.Trip;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class GeneratedItineraryResponseMapper {

    private final ItineraryResponseMapper itineraryResponseMapper;

    public GeneratedItineraryResponse toResponse(Trip trip, List<ItineraryDay> itineraryDays) {
        ItineraryResponse itineraryResponse = itineraryResponseMapper.toResponse(itineraryDays);
        return GeneratedItineraryResponse.builder()
                .id(trip.getId())
                .destination(trip.getDestination())
                .startDate(trip.getStartDate())
                .days(trip.getDays())
                .nights(trip.getNights())
                .budget(trip.getBudget())
                .travelStyle(trip.getTravelStyle())
                .interests(trip.getInterests())
                .preferences(trip.getPreferences())
                .status(trip.getStatus())
                .aiMetadata(trip.getAiMetadata())
                .createdAt(trip.getCreatedAt())
                .updatedAt(trip.getUpdatedAt())
                .itineraryDays(itineraryResponse.getDays())
                .build();
    }
}
