package com.tripwise.itinerary.infrastructure.persistence.service;

import com.tripwise.itinerary.domain.ItineraryDayPlan;
import com.tripwise.itinerary.domain.ItineraryItemPlan;
import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.itinerary.domain.entity.ItineraryDay;
import com.tripwise.itinerary.domain.entity.ItineraryItem;
import com.tripwise.itinerary.infrastructure.persistence.repository.ItineraryDayRepository;
import com.tripwise.itinerary.infrastructure.persistence.repository.ItineraryItemRepository;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.trip.domain.entity.Trip;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItineraryPersistenceService {

    private ItineraryDayRepository itineraryDayRepository;
    private ItineraryItemRepository itineraryItemRepository;

    @Transactional
    public List<ItineraryDay> saveItinerary(Trip trip, List<ItineraryDayPlan> dayPlans, Map<Long, Place> placeMap) {
        itineraryDayRepository.deleteByTripId(trip.getId());

        List<ItineraryDay> savedDays = new ArrayList<>();

        for (ItineraryDayPlan dayPlan : dayPlans) {
            ItineraryDay day = ItineraryDay.builder()
                    .trip(trip)
                    .dayNumber(dayPlan.getDayNumber())
                    .dayTitle("Ngay " + dayPlan.getDayNumber())
                    .weatherSummary(dayPlan.getWeatherSummary())
                    .totalDistanceMeters(0)
                    .totalDurationSeconds(0)
                    .build();

            ItineraryDay savedDay = itineraryDayRepository.save(day);

            int orderIndex = 0;
            int totalDistance = 0;
            int totalDuration = 0;

            for (ItineraryItemPlan itemPlan : dayPlan.getItems()) {
                Place place = itemPlan.getPlace();
                if (place == null) {
                    continue;
                }

                int distanceFromPrev = itemPlan.getDistanceFromPreviousMeters() != null
                        ? itemPlan.getDistanceFromPreviousMeters()
                        : 0;
                int durationFromPrev = itemPlan.getDurationFromPreviousSeconds() != null
                        ? itemPlan.getDurationFromPreviousSeconds()
                        : 0;

                ItineraryItem item = ItineraryItem.builder()
                        .itineraryDay(savedDay)
                        .place(place)
                        .orderIndex(orderIndex)
                        .startTime(itemPlan.getStartTime())
                        .endTime(itemPlan.getEndTime())
                        .timeSlot(itemPlan.getSlot())
                        .reason(buildReason(place, itemPlan.getSlot()))
                        .estimatedCost(place.getEstimatedCost() != null ? place.getEstimatedCost() : BigDecimal.ZERO)
                        .distanceFromPreviousMeters(distanceFromPrev)
                        .durationFromPreviousSeconds(durationFromPrev)
                        .build();

                itineraryItemRepository.save(item);
                orderIndex++;
                totalDistance += distanceFromPrev;
                totalDuration += durationFromPrev;
            }

            savedDay.setTotalDistanceMeters(totalDistance);
            savedDay.setTotalDurationSeconds(totalDuration);
            itineraryDayRepository.save(savedDay);
            savedDays.add(savedDay);
        }

        return savedDays;
    }

    @Transactional(readOnly = true)
    public List<ItineraryDay> getItineraryByTripId(Long tripId) {
        return itineraryDayRepository.findByTripIdWithItems(tripId);
    }

    @Transactional(readOnly = true)
    public List<ItineraryDay> getItineraryByTripIdWithPlaces(Long tripId) {
        return itineraryDayRepository.findByTripIdWithItemsAndPlaces(tripId);
    }

    @Transactional
    public void deleteItineraryByTripId(Long tripId) {
        itineraryDayRepository.deleteByTripId(tripId);
    }

    private String buildReason(Place place, TimeSlot slot) {
        StringBuilder sb = new StringBuilder();
        sb.append(place.getName());
        if (slot != null) {
            switch (slot) {
                case MORNING -> sb.append(" - ly tuong cho buoi sang");
                case AFTERNOON -> sb.append(" - phu hop buoi chieu");
                case EVENING -> sb.append(" - tuyet voi cho buoi toi");
            }
        }
        return sb.toString();
    }
}
