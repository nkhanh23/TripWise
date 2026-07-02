package com.tripwise.itinerary.domain.entity;

import com.tripwise.common.infrastructure.persistence.entity.BaseEntity;
import com.tripwise.trip.domain.entity.Trip;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "itinerary_days",
       uniqueConstraints = @UniqueConstraint(columnNames = {"trip_id", "day_number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItineraryDay extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(name = "day_number", nullable = false)
    private Integer dayNumber;

    @Column(name = "day_title", length = 255)
    private String dayTitle;

    @Column(name = "weather_summary", length = 255)
    private String weatherSummary;

    @Column(name = "total_distance_meters", nullable = false)
    @Builder.Default
    private Integer totalDistanceMeters = 0;

    @Column(name = "total_duration_seconds", nullable = false)
    @Builder.Default
    private Integer totalDurationSeconds = 0;

    @OneToMany(mappedBy = "itineraryDay", cascade = CascadeType.ALL, orphanRemoval = true,
               fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<ItineraryItem> items = new ArrayList<>();

    public void addItem(ItineraryItem item) {
        items.add(item);
        item.setItineraryDay(this);
    }

    public void removeItem(ItineraryItem item) {
        items.remove(item);
        item.setItineraryDay(null);
    }
}
