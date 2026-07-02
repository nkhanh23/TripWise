package com.tripwise.itinerary.infrastructure.persistence.repository;

import com.tripwise.itinerary.domain.entity.ItineraryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItineraryItemRepository extends JpaRepository<ItineraryItem, Long> {

    List<ItineraryItem> findByItineraryDayIdOrderByOrderIndexAsc(Long itineraryDayId);

    @Query("SELECT i FROM ItineraryItem i JOIN FETCH i.place WHERE i.itineraryDay.id = :dayId ORDER BY i.orderIndex ASC")
    List<ItineraryItem> findByDayIdWithPlace(@Param("dayId") Long dayId);

    @Query("SELECT i FROM ItineraryItem i JOIN FETCH i.place p JOIN FETCH i.itineraryDay d WHERE d.trip.id = :tripId ORDER BY d.dayNumber ASC, i.orderIndex ASC")
    List<ItineraryItem> findByTripIdWithPlaceAndDay(@Param("tripId") Long tripId);

    void deleteByItineraryDayId(Long itineraryDayId);

    long countByItineraryDayId(Long itineraryDayId);
}
