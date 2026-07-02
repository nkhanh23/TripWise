package com.tripwise.itinerary.infrastructure.persistence.repository;

import com.tripwise.itinerary.domain.entity.ItineraryDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItineraryDayRepository extends JpaRepository<ItineraryDay, Long> {

    List<ItineraryDay> findByTripIdOrderByDayNumberAsc(Long tripId);

    @Query("SELECT d FROM ItineraryDay d LEFT JOIN FETCH d.items WHERE d.trip.id = :tripId ORDER BY d.dayNumber ASC")
    List<ItineraryDay> findByTripIdWithItems(@Param("tripId") Long tripId);

    @Query("""
            SELECT DISTINCT d
            FROM ItineraryDay d
            LEFT JOIN FETCH d.items i
            LEFT JOIN FETCH i.place p
            LEFT JOIN FETCH p.category
            LEFT JOIN FETCH p.tags
            WHERE d.trip.id = :tripId
            ORDER BY d.dayNumber ASC, i.orderIndex ASC
            """)
    List<ItineraryDay> findByTripIdWithItemsAndPlaces(@Param("tripId") Long tripId);

    Optional<ItineraryDay> findByTripIdAndDayNumber(Long tripId, Integer dayNumber);

    void deleteByTripId(Long tripId);

    long countByTripId(Long tripId);
}
