package com.tripwise.itinerary.domain.entity;

import com.tripwise.common.infrastructure.persistence.entity.BaseEntity;
import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.place.domain.entity.Place;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalTime;

@Entity
@Table(name = "itinerary_items",
       uniqueConstraints = @UniqueConstraint(columnNames = {"itinerary_day_id", "order_index"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItineraryItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "itinerary_day_id", nullable = false)
    private ItineraryDay itineraryDay;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "time_slot", nullable = false, length = 20)
    private TimeSlot timeSlot;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "ai_description", columnDefinition = "TEXT")
    private String aiDescription;

    @Column(name = "estimated_cost", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal estimatedCost = BigDecimal.ZERO;

    @Column(name = "distance_from_previous_meters", nullable = false)
    @Builder.Default
    private Integer distanceFromPreviousMeters = 0;

    @Column(name = "duration_from_previous_seconds", nullable = false)
    @Builder.Default
    private Integer durationFromPreviousSeconds = 0;
}
