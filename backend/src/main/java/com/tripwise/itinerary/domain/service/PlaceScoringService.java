package com.tripwise.itinerary.domain.service;

import com.tripwise.itinerary.domain.PlaceScore;
import com.tripwise.place.domain.entity.Place;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Set;

@Service
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaceScoringService {

    @Value("${tripwise.scoring.weight.interest:4.0}")
    @Builder.Default
    private double interestWeight = 4.0;

    @Value("${tripwise.scoring.weight.budget:3.0}")
    @Builder.Default
    private double budgetWeight = 3.0;

    @Value("${tripwise.scoring.weight.rating:2.0}")
    @Builder.Default
    private double ratingWeight = 2.0;

    @Value("${tripwise.scoring.weight.distance:1.0}")
    @Builder.Default
    private double distanceWeight = 1.0;

    @Value("${tripwise.scoring.distance.max-meters:15000.0}")
    @Builder.Default
    private double maxDistanceMeters = 15000.0;

    public PlaceScore score(Place place, Set<String> userInterests, String userBudget, Double refLat, Double refLon) {
        // 1. Interest match score (0.0 to 1.0)
        double interestScore = calculateInterestScore(place, userInterests);

        // 2. Budget match score (0.0 to 1.0)
        double budgetScore = calculateBudgetScore(place, userBudget);

        // 3. Rating score (0.0 to 1.0)
        double ratingScore = calculateRatingScore(place);

        // 4. Distance penalty (0.0 to 1.0)
        double distancePenalty = calculateDistancePenalty(place, refLat, refLon);

        // Calculate total score
        double totalScore = (interestScore * interestWeight) +
                             (budgetScore * budgetWeight) +
                             (ratingScore * ratingWeight) -
                             (distancePenalty * distanceWeight);

        return new PlaceScore(place, totalScore, interestScore, budgetScore, ratingScore, distancePenalty);
    }

    private double calculateInterestScore(Place place, Set<String> userInterests) {
        if (userInterests == null || userInterests.isEmpty() || place.getTags() == null || place.getTags().isEmpty()) {
            return 0.0;
        }
        long matchCount = place.getTags().stream()
                .filter(tag -> userInterests.stream().anyMatch(interest -> interest.equalsIgnoreCase(tag)))
                .count();
        return (double) matchCount / userInterests.size();
    }

    private double calculateBudgetScore(Place place, String userBudget) {
        if (userBudget == null || place.getPriceLevel() == null) {
            return 0.5; // neutral
        }

        String budget = userBudget.toUpperCase();
        String priceLevel = place.getPriceLevel().toUpperCase();

        if (budget.equals("BUDGET")) {
            if (priceLevel.equals("LOW")) return 1.0;
            if (priceLevel.equals("MEDIUM")) return 0.4;
            return 0.0;
        } else if (budget.equals("MID_RANGE")) {
            if (priceLevel.equals("MEDIUM")) return 1.0;
            if (priceLevel.equals("LOW")) return 0.7;
            return 0.3;
        } else if (budget.equals("LUXURY")) {
            if (priceLevel.equals("HIGH")) return 1.0;
            if (priceLevel.equals("MEDIUM")) return 0.7;
            return 0.5;
        }

        return 0.5;
    }

    private double calculateRatingScore(Place place) {
        BigDecimal rating = place.getRating();
        if (rating == null) {
            return 0.6; // average default rating
        }
        return Math.min(Math.max(rating.doubleValue(), 0.0), 5.0) / 5.0;
    }

    private double calculateDistancePenalty(Place place, Double refLat, Double refLon) {
        if (refLat == null || refLon == null || place.getLocation() == null) {
            return 0.0;
        }
        double placeLon = place.getLocation().getX();
        double placeLat = place.getLocation().getY();
        double distance = calculateHaversineDistance(refLat, refLon, placeLat, placeLon);
        return Math.min(distance / maxDistanceMeters, 1.0);
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return 6371000 * c; // returns distance in meters
    }
}
