package com.tripwise.itinerary.application.mapper;

import com.tripwise.itinerary.application.dto.ItineraryDayResponse;
import com.tripwise.itinerary.application.dto.ItineraryItemResponse;
import com.tripwise.itinerary.application.dto.ItineraryResponse;
import com.tripwise.itinerary.domain.entity.ItineraryDay;
import com.tripwise.itinerary.domain.entity.ItineraryItem;
import com.tripwise.place.application.mapper.PlaceMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ItineraryResponseMapper {

    private final PlaceMapper placeMapper;

    public ItineraryResponse toResponse(List<ItineraryDay> itineraryDays) {
        return ItineraryResponse.builder()
                .days(itineraryDays.stream().map(this::toDayResponse).toList())
                .build();
    }

    public ItineraryDayResponse toDayResponse(ItineraryDay itineraryDay) {
        return ItineraryDayResponse.builder()
                .dayNumber(itineraryDay.getDayNumber())
                .dayTitle(itineraryDay.getDayTitle())
                .weatherSummary(itineraryDay.getWeatherSummary())
                .totalDistanceMeters(itineraryDay.getTotalDistanceMeters())
                .totalDurationSeconds(itineraryDay.getTotalDurationSeconds())
                .items(itineraryDay.getItems().stream().map(this::toItemResponse).toList())
                .build();
    }

    public ItineraryItemResponse toItemResponse(ItineraryItem itineraryItem) {
        return ItineraryItemResponse.builder()
                .orderIndex(itineraryItem.getOrderIndex())
                .startTime(itineraryItem.getStartTime())
                .endTime(itineraryItem.getEndTime())
                .timeSlot(itineraryItem.getTimeSlot())
                .reason(itineraryItem.getReason())
                .aiDescription(itineraryItem.getAiDescription())
                .estimatedCost(itineraryItem.getEstimatedCost())
                .distanceFromPreviousMeters(itineraryItem.getDistanceFromPreviousMeters())
                .durationFromPreviousSeconds(itineraryItem.getDurationFromPreviousSeconds())
                .place(placeMapper.toResponse(itineraryItem.getPlace()))
                .build();
    }
}
