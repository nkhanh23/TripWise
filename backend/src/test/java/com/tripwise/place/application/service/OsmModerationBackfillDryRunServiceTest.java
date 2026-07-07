package com.tripwise.place.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.place.application.dto.PlaceModerationBackfillScope;
import com.tripwise.place.infrastructure.config.PlaceModerationBackfillMode;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceFilter;
import com.tripwise.place.infrastructure.persistence.PlaceImportJdbcRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OsmModerationBackfillDryRunServiceTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final PlaceModerationBackfillScope DEFAULT_SCOPE = PlaceModerationBackfillScope.builder()
            .sourceName("OSM_GEOFABRIK")
            .build();

    @Test
    void shouldSummarizeDryRunWithoutUpdatingDatabase() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository,
                evaluator,
                new ObjectMapper()
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(4L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);

            consumer.accept(record(1L, "good-1", "Mui Doi Viewpoint", Map.of("tourism", "viewpoint")));
            consumer.accept(record(2L, "food-1", "Bun Ca Sua", Map.of("amenity", "restaurant")));
            consumer.accept(record(3L, "noise-1", "0971685111", Map.of("amenity", "bar")));
            consumer.accept(record(
                    4L,
                    "guard-1",
                    "Bia Tuong Niem",
                    "Nha Trang",
                    Set.of(),
                    Map.of("historic", "memorial"),
                    null,
                    null,
                    null,
                    null
            ));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(
                org.mockito.ArgumentMatchers.eq(DEFAULT_SCOPE),
                org.mockito.ArgumentMatchers.eq(0),
                org.mockito.ArgumentMatchers.any()
        );

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 50);

        assertThat(report.totalSourceRecords()).isEqualTo(4);
        assertThat(report.checkedRecords()).isEqualTo(4);
        assertThat(report.wouldAutoApproved()).isEqualTo(2);
        assertThat(report.wouldPending()).isEqualTo(1);
        assertThat(report.wouldRejected()).isEqualTo(1);
        assertThat(report.wouldAttraction()).isEqualTo(2);
        assertThat(report.wouldFood()).isEqualTo(1);
        assertThat(report.wouldHotel()).isZero();
        assertThat(report.wouldService()).isZero();
        assertThat(report.recommendableCount()).isEqualTo(2);
        assertThat(report.countByPromotionGuardReason())
                .containsEntry("Weak historic type without trust signal: memorial", 1L);
        assertThat(report.countByRejectReason())
                .containsEntry("Name looks like a phone number", 1L);
        assertThat(report.topWouldAutoApproved()).hasSize(2);
        assertThat(report.topWouldPendingDueToGuard()).hasSize(1);
        assertThat(report.topWouldRejected()).hasSize(1);
        assertThat(report.evaluatedRecords()).hasSize(4);
        assertThat(report.evaluatedRecords())
                .anySatisfy(record -> {
                    assertThat(record.sourceExternalId()).isEqualTo("good-1");
                    assertThat(record.predictedVerificationStatus()).isEqualTo("AUTO_APPROVED");
                    assertThat(record.rawTagsJson()).contains("viewpoint");
                });
        assertThat(report.scopeCity()).isNull();
        assertThat(report.noDbUpdateExecuted()).isTrue();
    }

    @Test
    void shouldAutoApproveHighQualityFoodDuringDryRunBackfill() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository,
                evaluator,
                OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(5L, "food-auto-1", "Bun Bo Hue", Map.of("amenity", "restaurant")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(eq(DEFAULT_SCOPE), eq(0), any());

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 20);

        assertThat(report.wouldAutoApproved()).isEqualTo(1);
        assertThat(report.wouldFood()).isEqualTo(1);
        assertThat(report.recommendableCount()).isEqualTo(1);
        assertThat(report.evaluatedRecords()).singleElement().satisfies(record -> {
            assertThat(record.predictedPlaceType()).isEqualTo("FOOD");
            assertThat(record.predictedVerificationStatus()).isEqualTo("AUTO_APPROVED");
            assertThat(record.predictedRecommendable()).isTrue();
        });
    }

    @Test
    void shouldKeepBarPendingDuringDryRunBackfillFoodRule() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository,
                evaluator,
                OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(6L, "food-bar-1", "Sky Bar Riverside", Map.of("amenity", "bar")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(eq(DEFAULT_SCOPE), eq(0), any());

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 20);

        assertThat(report.wouldAutoApproved()).isZero();
        assertThat(report.wouldPending()).isEqualTo(1);
        assertThat(report.evaluatedRecords()).singleElement().satisfies(record -> {
            assertThat(record.predictedPlaceType()).isEqualTo("FOOD");
            assertThat(record.predictedVerificationStatus()).isEqualTo("PENDING");
            assertThat(record.predictedRecommendable()).isFalse();
        });
    }

    @Test
    void shouldBlockLodgingLikeFoodCandidateWithoutFoodCue() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository,
                evaluator,
                OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(700L, "food-lodging-1", "SnapStay Hoi An", Map.of("amenity", "cafe")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(eq(DEFAULT_SCOPE), eq(0), any());

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 20);

        assertThat(report.wouldAutoApproved()).isZero();
        assertThat(report.wouldPending()).isEqualTo(1);
        assertThat(report.evaluatedRecords()).singleElement().satisfies(record -> {
            assertThat(record.predictedVerificationStatus()).isEqualTo("PENDING");
            assertThat(record.promotionGuardReason()).contains("Lodging keyword");
        });
    }

    @Test
    void shouldBlockCinemaLikeFoodCandidateWithoutFoodCue() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository,
                evaluator,
                OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(701L, "food-cinema-1", "GenZ Cinema Bac Ninh", Map.of("amenity", "cafe")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(eq(DEFAULT_SCOPE), eq(0), any());

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 20);

        assertThat(report.wouldAutoApproved()).isZero();
        assertThat(report.wouldPending()).isEqualTo(1);
        assertThat(report.evaluatedRecords()).singleElement().satisfies(record -> {
            assertThat(record.predictedVerificationStatus()).isEqualTo("PENDING");
            assertThat(record.promotionGuardReason()).contains("Entertainment keyword");
        });
    }

    @Test
    void shouldBlockShopLikeFoodCandidateWithoutFoodCue() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository,
                evaluator,
                OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(702L, "food-shop-1", "Shop 34", Map.of("amenity", "cafe")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(eq(DEFAULT_SCOPE), eq(0), any());

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 20);

        assertThat(report.wouldAutoApproved()).isZero();
        assertThat(report.wouldPending()).isEqualTo(1);
        assertThat(report.evaluatedRecords()).singleElement().satisfies(record -> {
            assertThat(record.predictedVerificationStatus()).isEqualTo("PENDING");
            assertThat(record.promotionGuardReason()).contains("Shop/store keyword");
        });
    }

    @Test
    void shouldNotBlanketBlockCoffeeShopWithFoodCue() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository,
                evaluator,
                OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(703L, "food-coffee-shop-1", "The Coffee Shop", Map.of("amenity", "cafe")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(eq(DEFAULT_SCOPE), eq(0), any());

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 20);

        assertThat(report.wouldAutoApproved()).isEqualTo(1);
        assertThat(report.wouldPending()).isZero();
        assertThat(report.evaluatedRecords()).singleElement().satisfies(record -> {
            assertThat(record.predictedVerificationStatus()).isEqualTo("AUTO_APPROVED");
            assertThat(record.promotionGuardReason()).isNull();
        });
    }

    @Test
    void shouldBlockBusinessLikeFoodCandidatesButKeepLegitimateFoodNames() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository,
                evaluator,
                OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(10L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(1000L, "food-guard-1", "ACC Panel mien nam", Map.of("amenity", "fast_food")));
            consumer.accept(record(
                    1001L,
                    "food-guard-2",
                    "Vina Talents - Khai Sang Tai Nang Viet",
                    Map.of("amenity", "cafe")
            ));
            consumer.accept(record(1002L, "food-guard-3", "Tinh Dau Loi An", Map.of("amenity", "restaurant")));
            consumer.accept(record(1003L, "food-guard-4", "Cua hang dien thoai ABC", Map.of("amenity", "restaurant")));
            consumer.accept(record(1004L, "food-allow-1", "Cua Hang Kem Baskin-Robbins", Map.of("amenity", "restaurant")));
            consumer.accept(record(1005L, "food-allow-2", "Ca Phe San Vuon Ca Koi", Map.of("amenity", "cafe")));
            consumer.accept(record(1006L, "food-allow-3", "Bun Bo O Huyen", Map.of("amenity", "restaurant")));
            consumer.accept(record(1007L, "food-allow-4", "18 BEER CLUB", Map.of("amenity", "restaurant")));
            consumer.accept(record(1008L, "food-pending-bar", "Broma Not A Bar", Map.of("amenity", "bar")));
            consumer.accept(record(1009L, "food-generic-1", "Quan an", Map.of("amenity", "restaurant")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(eq(DEFAULT_SCOPE), eq(0), any());

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 30);

        assertThat(report.wouldAutoApproved()).isEqualTo(4);
        assertThat(report.wouldPending()).isEqualTo(6);
        assertThat(report.countByPromotionGuardReason())
                .containsEntry("Business-like keyword in FOOD name: panel", 1L)
                .containsEntry("Business-like keyword in FOOD name: tai nang", 1L)
                .containsEntry("Non-food retail keyword in FOOD name: tinh dau", 1L)
                .containsEntry("Non-food retail keyword in FOOD name: dien thoai", 1L)
                .containsEntry("Generic food name", 1L);
        assertThat(report.evaluatedRecords())
                .anySatisfy(record -> {
                    if ("food-guard-1".equals(record.sourceExternalId())) {
                        assertThat(record.predictedVerificationStatus()).isEqualTo("PENDING");
                        assertThat(record.predictedRecommendable()).isFalse();
                        assertThat(record.promotionGuardReason()).isEqualTo("Business-like keyword in FOOD name: panel");
                    }
                })
                .anySatisfy(record -> {
                    if ("food-guard-2".equals(record.sourceExternalId())) {
                        assertThat(record.predictedVerificationStatus()).isEqualTo("PENDING");
                        assertThat(record.promotionGuardReason()).isEqualTo("Business-like keyword in FOOD name: tai nang");
                    }
                })
                .anySatisfy(record -> {
                    if ("food-guard-3".equals(record.sourceExternalId())) {
                        assertThat(record.predictedVerificationStatus()).isEqualTo("PENDING");
                        assertThat(record.promotionGuardReason()).isEqualTo("Non-food retail keyword in FOOD name: tinh dau");
                    }
                })
                .anySatisfy(record -> {
                    if ("food-guard-4".equals(record.sourceExternalId())) {
                        assertThat(record.predictedVerificationStatus()).isEqualTo("PENDING");
                        assertThat(record.promotionGuardReason()).isEqualTo("Non-food retail keyword in FOOD name: dien thoai");
                    }
                })
                .anySatisfy(record -> {
                    if ("food-allow-1".equals(record.sourceExternalId())) {
                        assertThat(record.predictedVerificationStatus()).isEqualTo("AUTO_APPROVED");
                        assertThat(record.predictedRecommendable()).isTrue();
                        assertThat(record.promotionGuardReason()).isNull();
                    }
                })
                .anySatisfy(record -> {
                    if ("food-allow-2".equals(record.sourceExternalId())) {
                        assertThat(record.predictedVerificationStatus()).isEqualTo("AUTO_APPROVED");
                        assertThat(record.predictedRecommendable()).isTrue();
                    }
                })
                .anySatisfy(record -> {
                    if ("food-allow-3".equals(record.sourceExternalId())) {
                        assertThat(record.predictedVerificationStatus()).isEqualTo("AUTO_APPROVED");
                    }
                })
                .anySatisfy(record -> {
                    if ("food-allow-4".equals(record.sourceExternalId())) {
                        assertThat(record.predictedVerificationStatus()).isEqualTo("AUTO_APPROVED");
                        assertThat(record.promotionGuardReason()).isNull();
                    }
                })
                .anySatisfy(record -> {
                    if ("food-pending-bar".equals(record.sourceExternalId())) {
                        assertThat(record.predictedVerificationStatus()).isEqualTo("PENDING");
                        assertThat(record.predictedRecommendable()).isFalse();
                        assertThat(record.promotionGuardReason()).isNull();
                    }
                })
                .anySatisfy(record -> {
                    if ("food-generic-1".equals(record.sourceExternalId())) {
                        assertThat(record.predictedVerificationStatus()).isEqualTo("PENDING");
                        assertThat(record.promotionGuardReason()).isEqualTo("Generic food name");
                    }
                });
    }

    @Test
    void shouldNotCountUnknownCityAsCompletenessSignalDuringBackfill() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository,
                evaluator,
                OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(2L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);

            consumer.accept(record(
                    10L,
                    "unknown-city",
                    "Cong vien Song Hau",
                    "Unknown",
                    Set.of("check-in", "park"),
                    Map.of("leisure", "park"),
                    null,
                    "Ninh Kieu",
                    null,
                    null
            ));
            consumer.accept(record(
                    11L,
                    "real-city",
                    "Cong vien Song Hau",
                    "Can Tho",
                    Set.of("check-in", "park"),
                    Map.of("leisure", "park"),
                    null,
                    "Ninh Kieu",
                    null,
                    null
            ));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(
                org.mockito.ArgumentMatchers.eq(DEFAULT_SCOPE),
                org.mockito.ArgumentMatchers.eq(0),
                org.mockito.ArgumentMatchers.any()
        );

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 50);

        assertThat(report.evaluatedRecords())
                .anySatisfy(evaluated -> {
                    if ("unknown-city".equals(evaluated.sourceExternalId())) {
                        assertThat(evaluated.city()).isEqualTo("Unknown");
                        assertThat(evaluated.predictedQualityScore()).isEqualTo(78);
                        assertThat(evaluated.predictedVerificationStatus()).isEqualTo("PENDING");
                    }
                })
                .anySatisfy(evaluated -> {
                    if ("real-city".equals(evaluated.sourceExternalId())) {
                        assertThat(evaluated.city()).isEqualTo("Can Tho");
                        assertThat(evaluated.predictedQualityScore()).isEqualTo(80);
                        assertThat(evaluated.predictedVerificationStatus()).isEqualTo("AUTO_APPROVED");
                    }
                });
    }

    @Test
    void shouldIgnoreDerivedTagsDuringBackfillRecompute() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository,
                evaluator,
                OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);

            consumer.accept(record(
                    20L,
                    "derived-tags",
                    "Cong vien Song Hau",
                    "Can Tho",
                    Set.of("check-in", "park"),
                    Map.of("leisure", "park"),
                    null,
                    "Ninh Kieu",
                    null,
                    null
            ));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(
                org.mockito.ArgumentMatchers.eq(DEFAULT_SCOPE),
                org.mockito.ArgumentMatchers.eq(0),
                org.mockito.ArgumentMatchers.any()
        );

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 50);

        assertThat(report.wouldAutoApproved()).isZero();
        assertThat(report.wouldPending()).isEqualTo(1);
        assertThat(report.evaluatedRecords()).singleElement().satisfies(evaluated -> {
            assertThat(evaluated.tags()).containsExactlyInAnyOrder("check-in", "park");
            assertThat(evaluated.predictedQualityScore()).isEqualTo(78);
            assertThat(evaluated.predictedVerificationStatus()).isEqualTo("PENDING");
        });
    }

    @Test
    void shouldThrowWhenApplyModeWithApplyFalse() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository, evaluator, OBJECT_MAPPER
        );

        assertThatThrownBy(() -> service.validateExecutionMode(PlaceModerationBackfillMode.APPLY, false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APPLY mode requires apply=true");
    }

    @Test
    void shouldThrowWhenApplyTrueWithNonApplyMode() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository, evaluator, OBJECT_MAPPER
        );

        assertThatThrownBy(() -> service.validateExecutionMode(PlaceModerationBackfillMode.DRY_RUN, true))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("apply=true requires mode=APPLY");
    }

    @Test
    void shouldThrowWhenApplyForNonOsmSource() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository, evaluator, OBJECT_MAPPER
        );

        assertThatThrownBy(() -> service.runApply(
                PlaceModerationBackfillScope.builder().sourceName("MANUAL_SEED").build(),
                0,
                50
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APPLY mode is restricted to source=OSM_GEOFABRIK");
    }

    @Test
    void shouldAutoApproveTourismAttractionInDryRun() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository, evaluator, OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(1000L, "attraction-1", "Thap Ba Po Nagar", Map.of("tourism", "attraction")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(
                eq(DEFAULT_SCOPE), eq(0), any());

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 50);

        assertThat(report.wouldAutoApproved()).isEqualTo(1);
        assertThat(report.wouldAttraction()).isEqualTo(1);
        assertThat(report.recommendableCount()).isEqualTo(1);
        assertThat(report.evaluatedRecords()).singleElement().satisfies(record -> {
            assertThat(record.predictedPlaceType()).isEqualTo("ATTRACTION");
            assertThat(record.predictedVerificationStatus()).isEqualTo("AUTO_APPROVED");
            assertThat(record.predictedRecommendable()).isTrue();
            assertThat(record.strongTourismSignal()).isTrue();
        });
    }

    @Test
    void shouldNotAutoApproveJunkNameAttractionInDryRun() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository, evaluator, OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(2000L, "junk-1", "???", Map.of("tourism", "attraction")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(
                eq(DEFAULT_SCOPE), eq(0), any());

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 50);

        assertThat(report.wouldAutoApproved()).isZero();
        assertThat(report.evaluatedRecords()).singleElement().satisfies(record -> {
            assertThat(record.predictedVerificationStatus()).isEqualTo("REJECTED");
            assertThat(record.predictedRecommendable()).isFalse();
        });
        assertThat(report.noDbUpdateExecuted()).isTrue();
    }

    @Test
    void shouldKeepTourismAttractionWithLowQualityPending() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository, evaluator, OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(new PlaceImportJdbcRepository.BackfillSourcePlaceRecord(
                    1001L, "OSM_GEOFABRIK", "attraction-low", "Dia Danh Nho",
                    null, null, null, null, null,
                    null, null, null, 60, false, true,
                    null, "PENDING", null, 0, false, null,
                    OBJECT_MAPPER.valueToTree(Map.of("tourism", "attraction")).toString(), Set.of()
            ));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(
                eq(DEFAULT_SCOPE), eq(0), any());

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 50);

        assertThat(report.wouldAutoApproved()).isZero();
        assertThat(report.wouldPending()).isEqualTo(1);
        assertThat(report.evaluatedRecords()).singleElement().satisfies(record -> {
            assertThat(record.predictedPlaceType()).isEqualTo("ATTRACTION");
            assertThat(record.predictedVerificationStatus()).isEqualTo("PENDING");
            assertThat(record.predictedRecommendable()).isFalse();
        });
    }

    @Test
    void shouldNotCallUpdateBatchDuringDryRun() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository, evaluator, OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(100L, "dry-test", "Test Place", Map.of("tourism", "attraction")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(
                eq(DEFAULT_SCOPE), eq(0), any()
        );

        var report = service.runDryRun(DEFAULT_SCOPE, 0, 50);

        assertThat(report.noDbUpdateExecuted()).isTrue();
        verify(repository, never()).updatePlaceModerationBatch(any(), any());
    }

    @Test
    void shouldCallUpdateBatchDuringApplyForOsmSource() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository, evaluator, OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(2L);
        when(repository.updatePlaceModerationBatch(eq("OSM_GEOFABRIK"), any())).thenReturn(2);

        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(100L, "good-1", "Mui Doi Viewpoint", Map.of("tourism", "viewpoint")));
            consumer.accept(record(101L, "food-1", "Bun Ca Sua", Map.of("amenity", "restaurant")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(
                eq(DEFAULT_SCOPE), eq(0), any()
        );

        var report = service.runApply(DEFAULT_SCOPE, 0, 50);

        assertThat(report.noDbUpdateExecuted()).isFalse();
        assertThat(report.updatedCount()).isEqualTo(2);
        assertThat(report.checkedRecords()).isEqualTo(2);
        verify(repository, atLeastOnce()).updatePlaceModerationBatch(eq("OSM_GEOFABRIK"), any());
    }

    @Test
    void shouldWriteRejectedPlaceTypeInApplyUpdate() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository, evaluator, OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        when(repository.updatePlaceModerationBatch(eq("OSM_GEOFABRIK"), any())).thenReturn(1);

        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(200L, "rejected-1", "0971685111", Map.of("amenity", "bar")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(
                eq(DEFAULT_SCOPE), eq(0), any()
        );

        service.runApply(DEFAULT_SCOPE, 0, 50);

        org.mockito.ArgumentCaptor<List> captor = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(repository).updatePlaceModerationBatch(eq("OSM_GEOFABRIK"), captor.capture());

        List<PlaceImportJdbcRepository.ModerationUpdateCommand> commands = captor.getValue();
        assertThat(commands).hasSize(1);
        PlaceImportJdbcRepository.ModerationUpdateCommand cmd = commands.getFirst();
        assertThat(cmd.placeType()).isEqualTo("REJECTED");
        assertThat(cmd.verificationStatus()).isEqualTo("REJECTED");
        assertThat(cmd.recommendable()).isFalse();
        assertThat(cmd.rejectReason()).contains("Name looks like a phone number");
    }

    @Test
    void shouldHandleNullRejectReasonInApplyUpdate() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository, evaluator, OBJECT_MAPPER
        );

        when(repository.countPlacesForModerationBackfill(DEFAULT_SCOPE)).thenReturn(1L);
        when(repository.updatePlaceModerationBatch(eq("OSM_GEOFABRIK"), any())).thenReturn(1);

        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(300L, "auto-1", "Mui Doi Viewpoint", Map.of("tourism", "viewpoint")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(
                eq(DEFAULT_SCOPE), eq(0), any()
        );

        service.runApply(DEFAULT_SCOPE, 0, 50);

        org.mockito.ArgumentCaptor<List> captor = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(repository).updatePlaceModerationBatch(eq("OSM_GEOFABRIK"), captor.capture());

        List<PlaceImportJdbcRepository.ModerationUpdateCommand> commands = captor.getValue();
        assertThat(commands).hasSize(1);
        PlaceImportJdbcRepository.ModerationUpdateCommand cmd = commands.getFirst();
        assertThat(cmd.placeType()).isEqualTo("ATTRACTION");
        assertThat(cmd.verificationStatus()).isEqualTo("AUTO_APPROVED");
        assertThat(cmd.recommendable()).isTrue();
        assertThat(cmd.rejectReason()).isNull();
    }

    @Test
    void shouldIncludeDryRunScopeMetadataInReport() {
        PlaceImportJdbcRepository repository = mock(PlaceImportJdbcRepository.class);
        PlaceModerationEvaluator evaluator = new PlaceModerationEvaluator(new OsmPlaceFilter());
        OsmModerationBackfillDryRunService service = new OsmModerationBackfillDryRunService(
                repository, evaluator, OBJECT_MAPPER
        );

        PlaceModerationBackfillScope scope = PlaceModerationBackfillScope.builder()
                .sourceName("OSM_GEOFABRIK")
                .city("Hồ Chí Minh")
                .currentPlaceType("FOOD")
                .currentVerificationStatus("PENDING")
                .currentRecommendable(Boolean.FALSE)
                .knownLocationOnly(true)
                .build();

        when(repository.countPlacesForModerationBackfill(scope)).thenReturn(1L);
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            java.util.function.Consumer<PlaceImportJdbcRepository.BackfillSourcePlaceRecord> consumer =
                    invocation.getArgument(2, java.util.function.Consumer.class);
            consumer.accept(record(400L, "food-hcm-1", "Bun Bo", Map.of("amenity", "restaurant")));
            return null;
        }).when(repository).scanSourcePlacesForModerationBackfill(eq(scope), eq(0), any());

        var report = service.runDryRun(scope, 0, 10);

        assertThat(report.scopeCity()).isEqualTo("Hồ Chí Minh");
        assertThat(report.scopeCurrentPlaceType()).isEqualTo("FOOD");
        assertThat(report.scopeCurrentVerificationStatus()).isEqualTo("PENDING");
        assertThat(report.scopeCurrentRecommendable()).isFalse();
        assertThat(report.scopeKnownLocationOnly()).isTrue();
        assertThat(service.formatReport(report)).contains("scopeKnownLocationOnly=true");
        assertThat(service.formatReport(report)).contains("scopeCity=Hồ Chí Minh");
    }

    private PlaceImportJdbcRepository.BackfillSourcePlaceRecord record(
            long id,
            String sourceExternalId,
            String name,
            Map<String, String> rawTags
    ) {
        return record(
                id,
                sourceExternalId,
                name,
                "Nha Trang",
                Set.of(),
                rawTags,
                "Tran Phu, Nha Trang",
                null,
                null,
                "Cong vien cong cong ven song"
        );
    }

    private PlaceImportJdbcRepository.BackfillSourcePlaceRecord record(
            long id,
            String sourceExternalId,
            String name,
            String city,
            Set<String> tags,
            Map<String, String> rawTags,
            String displayAddress,
            String district,
            String ward,
            String description
    ) {
        return new PlaceImportJdbcRepository.BackfillSourcePlaceRecord(
                id,
                "OSM_GEOFABRIK",
                sourceExternalId,
                name,
                "Khanh Hoa",
                city,
                district,
                ward,
                displayAddress,
                12.25,
                109.19,
                description,
                60,
                false,
                true,
                null,
                "PENDING",
                null,
                0,
                false,
                null,
                OBJECT_MAPPER.valueToTree(rawTags).toString(),
                tags
        );
    }
}
