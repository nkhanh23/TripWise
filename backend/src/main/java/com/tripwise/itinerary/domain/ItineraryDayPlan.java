package com.tripwise.itinerary.domain;

import lombok.Value;

import java.util.List;

@Value
public class ItineraryDayPlan {
    int dayNumber;
    String weatherSummary;
    List<ItineraryItemPlan> items;

    public ItineraryDayPlan(int dayNumber, String weatherSummary, List<ItineraryItemPlan> items) {
        this.dayNumber = dayNumber;
        this.weatherSummary = weatherSummary;
        this.items = items;
    }

    public ItineraryDayPlan(int dayNumber, List<ItineraryItemPlan> items) {
        this(dayNumber, null, items);
    }
}
