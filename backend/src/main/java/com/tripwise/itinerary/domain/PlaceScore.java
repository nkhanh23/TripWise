package com.tripwise.itinerary.domain;

import com.tripwise.place.domain.entity.Place;
import lombok.Value;

@Value
public class PlaceScore implements Comparable<PlaceScore> {
    Place place;
    double totalScore;
    double interestScore;
    double budgetScore;
    double ratingScore;
    double distancePenalty;

    @Override
    public int compareTo(PlaceScore o) {
        // Sort in descending order (highest score first)
        return Double.compare(o.totalScore, this.totalScore);
    }
}
