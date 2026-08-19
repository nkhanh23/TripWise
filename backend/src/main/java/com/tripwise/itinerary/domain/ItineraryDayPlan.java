package com.tripwise.itinerary.domain;

import lombok.Value;

import java.util.List;

@Value
public class ItineraryDayPlan {
    int dayNumber;
    String weatherSummary;
    Integer weatherCode;
    Integer rainProbability;
    Double tempMin;
    Double tempMax;
    List<ItineraryItemPlan> items;

    public ItineraryDayPlan(
            int dayNumber,
            String weatherSummary,
            Integer weatherCode,
            Integer rainProbability,
            Double tempMin,
            Double tempMax,
            List<ItineraryItemPlan> items
    ) {
        this.dayNumber = dayNumber;
        this.weatherSummary = weatherSummary;
        this.weatherCode = weatherCode;
        this.rainProbability = rainProbability;
        this.tempMin = tempMin;
        this.tempMax = tempMax;
        this.items = items;
    }

    public ItineraryDayPlan(int dayNumber, String weatherSummary, List<ItineraryItemPlan> items) {
        this(dayNumber, weatherSummary, null, null, null, null, items);
    }

    public ItineraryDayPlan(int dayNumber, List<ItineraryItemPlan> items) {
        this(dayNumber, null, null, null, null, null, items);
    }
}
