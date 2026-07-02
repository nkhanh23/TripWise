package com.tripwise.trip.domain.entity;

import com.tripwise.common.infrastructure.persistence.entity.BaseEntity;
import com.tripwise.itinerary.domain.entity.ItineraryDay;
import com.tripwise.trip.domain.enums.TripStatus;
import com.tripwise.user.domain.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "trips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trip extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 255)
    private String destination;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(nullable = false)
    private Integer days;

    @Column(nullable = false)
    @Builder.Default
    private Integer nights = 0;

    @Column(length = 50)
    private String budget;

    @Column(name = "travel_style", length = 50)
    private String travelStyle;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "interests", columnDefinition = "text[]")
    private List<String> interests;

    @Column(columnDefinition = "TEXT")
    private String preferences;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private TripStatus status = TripStatus.DRAFT;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_metadata", columnDefinition = "jsonb")
    private Map<String, Object> aiMetadata;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("dayNumber ASC")
    @Builder.Default
    private List<ItineraryDay> itineraryDays = new ArrayList<>();

    public void addItineraryDay(ItineraryDay day) {
        itineraryDays.add(day);
        day.setTrip(this);
    }

    public void removeItineraryDay(ItineraryDay day) {
        itineraryDays.remove(day);
        day.setTrip(null);
    }
}
