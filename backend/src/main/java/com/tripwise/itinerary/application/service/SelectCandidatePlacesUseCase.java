package com.tripwise.itinerary.application.service;

import com.tripwise.common.exception.ResourceNotFoundException;
import com.tripwise.itinerary.domain.PlaceScore;
import com.tripwise.itinerary.domain.service.PlaceScoringService;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import com.tripwise.trip.domain.entity.Trip;
import com.tripwise.trip.infrastructure.persistence.repository.TripRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SelectCandidatePlacesUseCase {

    private TripRepository tripRepository;
    private PlaceRepository placeRepository;
    private PlaceScoringService placeScoringService;

    @Value("${tripwise.itinerary.places-per-day:4}")
    @Builder.Default
    private int placesPerDay = 4;

    @Transactional(readOnly = true)
    public List<Place> execute(Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip không tồn tại"));

        // Query active and verified places in the destination city
        List<Place> matchingPlaces = placeRepository.findAllByCityIgnoreCaseAndIsActiveTrueAndIsVerifiedTrue(trip.getDestination());
        if (matchingPlaces.isEmpty()) {
            return Collections.emptyList();
        }

        // Calculate centroid of matching places to use as reference center
        double avgLat = matchingPlaces.stream()
                .mapToDouble(p -> p.getLocation() != null ? p.getLocation().getY() : 0.0)
                .average()
                .orElse(0.0);
        double avgLon = matchingPlaces.stream()
                .mapToDouble(p -> p.getLocation() != null ? p.getLocation().getX() : 0.0)
                .average()
                .orElse(0.0);

        // Convert trip interests to Set of lowercase strings for tag matching
        Set<String> interests = trip.getInterests() != null ?
                trip.getInterests().stream().map(String::toLowerCase).collect(Collectors.toSet()) :
                Collections.emptySet();

        // Score all places
        List<PlaceScore> scoredPlaces = matchingPlaces.stream()
                .map(place -> placeScoringService.score(place, interests, trip.getBudget(), avgLat, avgLon))
                .collect(Collectors.toList());

        // Target number of candidate places
        int targetCount = trip.getDays() * placesPerDay;

        // Group by category to ensure diversity via Round-Robin selection
        Map<Long, List<PlaceScore>> grouped = scoredPlaces.stream()
                .collect(Collectors.groupingBy(ps -> {
                    if (ps.getPlace().getCategory() != null) {
                        return ps.getPlace().getCategory().getId();
                    }
                    return 0L; // default category ID if null
                }));

        // Sort each category by score descending
        for (List<PlaceScore> catList : grouped.values()) {
            Collections.sort(catList);
        }

        List<Place> selectedPlaces = new ArrayList<>();
        List<Iterator<PlaceScore>> iterators = grouped.values().stream()
                .map(List::iterator)
                .collect(Collectors.toList());

        boolean addedAny;
        do {
            addedAny = false;
            for (Iterator<PlaceScore> it : iterators) {
                if (it.hasNext() && selectedPlaces.size() < targetCount) {
                    selectedPlaces.add(it.next().getPlace());
                    addedAny = true;
                }
            }
        } while (addedAny && selectedPlaces.size() < targetCount);

        return selectedPlaces;
    }
}
