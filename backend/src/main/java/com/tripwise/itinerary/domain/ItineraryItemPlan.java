package com.tripwise.itinerary.domain;

import com.tripwise.place.domain.entity.Place;
import lombok.AllArgsConstructor;
import lombok.Value;

import java.time.LocalTime;

@Value
@AllArgsConstructor
public class ItineraryItemPlan {
    Place place;
    TimeSlot slot;
    LocalTime startTime;
    LocalTime endTime;
    Integer distanceFromPreviousMeters;
    Integer durationFromPreviousSeconds;

    public ItineraryItemPlan(Place place, TimeSlot slot, LocalTime startTime, LocalTime endTime) {
        this(place, slot, startTime, endTime, 0, 0);
    }
}
