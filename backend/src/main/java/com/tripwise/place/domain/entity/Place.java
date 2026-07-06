package com.tripwise.place.domain.entity;

import com.tripwise.common.infrastructure.persistence.entity.BaseEntity;
import com.tripwise.place.domain.model.PlaceType;
import com.tripwise.place.domain.model.VerificationStatus;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.locationtech.jts.geom.Point;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "places")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Place extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(length = 100)
    private String province;

    @Column(length = 100)
    private String district;

    @Column(length = 100)
    private String ward;

    @Column(name = "display_address", length = 255)
    private String displayAddress;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private PlaceCategory category;

    @Column(nullable = false, columnDefinition = "geography(Point,4326)")
    private Point location;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "estimated_cost", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal estimatedCost = BigDecimal.ZERO;

    @Column(name = "duration_minutes", nullable = false)
    @Builder.Default
    private Integer durationMinutes = 60;

    @Column(nullable = false)
    @Builder.Default
    private Boolean indoor = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private Boolean isVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 30)
    @Builder.Default
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "place_type", length = 30)
    private PlaceType placeType;

    @Column(name = "quality_score", nullable = false)
    @Builder.Default
    private Integer qualityScore = 0;

    @Column(name = "is_recommendable", nullable = false)
    @Builder.Default
    private Boolean isRecommendable = false;

    @Column(name = "reject_reason", length = 255)
    private String rejectReason;

    @Column(name = "price_level", length = 20)
    private String priceLevel;

    @Column(precision = 2, scale = 1)
    private BigDecimal rating;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String source = "MANUAL";

    @Column(name = "source_external_id", length = 255)
    private String sourceExternalId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_tags", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, String> rawTags = Map.of();

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "stale_at")
    private Instant staleAt;

    @ElementCollection
    @CollectionTable(name = "place_tags", joinColumns = @JoinColumn(name = "place_id"))
    @Column(name = "tag", nullable = false, length = 50)
    @Builder.Default
    private Set<String> tags = new LinkedHashSet<>();
}
