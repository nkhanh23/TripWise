package com.tripwise.place.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tripwise.common.exception.BusinessException;
import com.tripwise.place.application.dto.DedupCandidateResponse;
import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.dto.StagingPlaceModerationResponse;
import com.tripwise.place.application.dto.StagingPlaceSearchQuery;
import com.tripwise.place.infrastructure.persistence.PlaceStagingModerationJdbcRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StagingPlaceModerationServiceTest {

    @Mock
    private PlaceStagingModerationJdbcRepository repository;

    private ObjectMapper objectMapper;
    private StagingPlaceModerationService service;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new StagingPlaceModerationService(repository, objectMapper);
    }

    @Test
    void shouldSearchStagingPlaces() {
        StagingPlaceSearchQuery query = StagingPlaceSearchQuery.builder().city("Nha Trang").build();
        PageRequest pageRequest = PageRequest.of(0, 10);
        Page<StagingPlaceModerationResponse> page = new PageImpl<>(List.of());

        when(repository.search(query, pageRequest, "id", "asc")).thenReturn(page);

        Page<StagingPlaceModerationResponse> result = service.search(query, pageRequest, "id", "asc");
        assertThat(result).isNotNull();
        verify(repository).search(query, pageRequest, "id", "asc");
    }

    @Test
    void shouldGetDetail() {
        StagingPlaceDetailResponse detail = StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder().id(1L).name("Test Place").build())
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));

        StagingPlaceDetailResponse result = service.getDetail(1L);
        assertThat(result).isNotNull();
        assertThat(result.getStagingPlace().getName()).isEqualTo("Test Place");
    }

    @Test
    void shouldThrowWhenDetailNotFound() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getDetail(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Staging record not found: 1");
    }

    @Test
    void shouldApproveAsNew() {
        StagingPlaceDetailResponse detail = StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder().id(1L).build())
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("{\"applied\": false}");

        service.approveAsNew(1L);

        verify(repository).updateModeration(1L, "APPROVED_FOR_APPLY", "NO_MATCH", false);
        verify(repository).updateMappingPayload(eq(1L), anyString());
    }

    @Test
    void shouldReject() {
        StagingPlaceDetailResponse detail = StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder().id(1L).build())
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("null");

        service.reject(1L);

        verify(repository).updateModeration(1L, "REJECTED", "NO_MATCH", false);
        verify(repository).updateMappingPayload(eq(1L), anyString());
    }

    @Test
    void shouldMarkDuplicate() {
        DedupCandidateResponse candidate1 = DedupCandidateResponse.builder().id(10L).build();
        DedupCandidateResponse candidate2 = DedupCandidateResponse.builder().id(20L).build();

        StagingPlaceDetailResponse detail = StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder().id(1L).build())
                .candidates(List.of(candidate1, candidate2))
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn(null);

        service.markDuplicate(1L, 10L, 999L);

        verify(repository).updateCandidateDecision(10L, "CONFIRMED_DUPLICATE");
        verify(repository).updateCandidateDecision(20L, "CONFIRMED_DISTINCT");
        verify(repository).updateModeration(1L, "REJECTED", "CONFIRMED_DUPLICATE", false);
        verify(repository).updateMappingPayload(eq(1L), anyString());
    }

    @Test
    void shouldMarkDuplicateWithNullCandidateId() {
        DedupCandidateResponse candidate1 = DedupCandidateResponse.builder().id(10L).build();
        DedupCandidateResponse candidate2 = DedupCandidateResponse.builder().id(20L).build();

        StagingPlaceDetailResponse detail = StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder().id(1L).build())
                .candidates(List.of(candidate1, candidate2))
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn(null);

        service.markDuplicate(1L, null, 999L);

        verify(repository, never()).updateCandidateDecision(any(), eq("CONFIRMED_DUPLICATE"));
        verify(repository).updateCandidateDecision(10L, "CONFIRMED_DISTINCT");
        verify(repository).updateCandidateDecision(20L, "CONFIRMED_DISTINCT");
        verify(repository).updateModeration(1L, "REJECTED", "CONFIRMED_DUPLICATE", false);
        verify(repository).updateMappingPayload(eq(1L), anyString());
    }

    // --- approveAndPublish tests ---

    private StagingPlaceDetailResponse createPublishableStaging() {
        return StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder()
                        .id(1L)
                        .name("Sushi Nha Trang")
                        .placeTypeDraft("FOOD")
                        .latitude(12.25)
                        .longitude(109.2)
                        .source("FOURSQUARE_OS_PLACES")
                        .sourcePlaceId("fsq-101")
                        .moderationStatus("PENDING_ADMIN_REVIEW")
                        .dedupStatus("NO_MATCH")
                        .locality("Nha Trang")
                        .region("Khánh Hòa")
                        .address("123 Tran Phu")
                        .build())
                .build();
    }

    private StagingPlaceDetailResponse createPublishableHotelStaging() {
        return StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder()
                        .id(2L)
                        .name("Nha Trang Beach Hotel")
                        .placeTypeDraft("HOTEL")
                        .latitude(12.26)
                        .longitude(109.19)
                        .source("OSM_GEOFABRIK")
                        .sourcePlaceId("osm-101")
                        .moderationStatus("PENDING_ADMIN_REVIEW")
                        .dedupStatus("NO_MATCH")
                        .locality("Nha Trang")
                        .region("Khánh Hòa")
                        .address("456 Beach Road")
                        .build())
                .build();
    }

    @Test
    void shouldApproveAndPublishFoodPlace() {
        StagingPlaceDetailResponse detail = createPublishableStaging();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("{\"applied\": false}");
        when(repository.findPlaceBySourceAndExternalId("FOURSQUARE_OS_PLACES", "fsq-101")).thenReturn(Optional.empty());
        when(repository.findPlacesWithinRadius(109.2, 12.25, 500.0)).thenReturn(List.of());
        when(repository.findCategoryIdBySlug("food")).thenReturn(Optional.of(10L));
        when(repository.insertPlace(
                eq("Sushi Nha Trang"), eq("Nha Trang"), eq("Khánh Hòa"), eq(10L),
                eq(109.2), eq(12.25), eq("123 Tran Phu"), eq("123 Tran Phu"),
                eq("FOURSQUARE_OS_PLACES"), eq("fsq-101"), eq("FOOD")
        )).thenReturn(100L);

        Long publicId = service.approveAndPublish(1L);

        assertThat(publicId).isEqualTo(100L);
        verify(repository).insertPlaceDataSource(eq(100L), eq("FOURSQUARE_OS_PLACES"), eq("fsq-101"), anyString());
        verify(repository).updateMappingPayload(eq(1L), anyString());
        verify(repository).updateModeration(eq(1L), eq("APPROVED_FOR_APPLY"), eq("NO_MATCH"), eq(false));
    }

    @Test
    void shouldApproveAndPublishHotel() {
        StagingPlaceDetailResponse detail = createPublishableHotelStaging();

        when(repository.findById(2L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(2L)).thenReturn("{\"applied\": false}");
        when(repository.findHotelsWithinRadius(109.19, 12.26, 500.0)).thenReturn(List.of());
        when(repository.insertHotel(
                eq("Nha Trang Beach Hotel"), eq("Nha Trang"), eq(109.19), eq(12.26), eq("456 Beach Road")
        )).thenReturn(200L);

        Long publicId = service.approveAndPublish(2L);

        assertThat(publicId).isEqualTo(200L);
        verify(repository).updateMappingPayload(eq(2L), anyString());
        verify(repository).updateModeration(eq(2L), eq("APPROVED_FOR_APPLY"), eq("NO_MATCH"), eq(false));
    }

    @Test
    void shouldThrowWhenAlreadyApplied() {
        StagingPlaceDetailResponse detail = createPublishableStaging();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("{\"applied\": true}");

        assertThatThrownBy(() -> service.approveAndPublish(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already applied");
    }

    @Test
    void shouldThrowWhenRejected() {
        StagingPlaceDetailResponse detail = StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder()
                        .id(1L).name("Test").placeTypeDraft("FOOD")
                        .latitude(12.25).longitude(109.2)
                        .source("FOURSQUARE_OS_PLACES").sourcePlaceId("fsq-101")
                        .moderationStatus("REJECTED").build())
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("{\"applied\": false}");

        assertThatThrownBy(() -> service.approveAndPublish(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("rejected");
    }

    @Test
    void shouldThrowWhenConfirmedDuplicate() {
        StagingPlaceDetailResponse detail = StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder()
                        .id(1L).name("Test").placeTypeDraft("FOOD")
                        .latitude(12.25).longitude(109.2)
                        .source("FOURSQUARE_OS_PLACES").sourcePlaceId("fsq-101")
                        .moderationStatus("PENDING_ADMIN_REVIEW")
                        .dedupStatus("CONFIRMED_DUPLICATE").build())
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("{\"applied\": false}");

        assertThatThrownBy(() -> service.approveAndPublish(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("duplicate");
    }

    @Test
    void shouldThrowWhenInvalidCoordinates() {
        StagingPlaceDetailResponse detail = StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder()
                        .id(1L).name("Test").placeTypeDraft("FOOD")
                        .latitude(200.0).longitude(109.2)
                        .source("FOURSQUARE_OS_PLACES").sourcePlaceId("fsq-101")
                        .moderationStatus("PENDING_ADMIN_REVIEW").build())
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("{\"applied\": false}");

        assertThatThrownBy(() -> service.approveAndPublish(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("coordinates");
    }

    @Test
    void shouldThrowWhenInvalidPlaceType() {
        StagingPlaceDetailResponse detail = StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder()
                        .id(1L).name("Test").placeTypeDraft("INVALID_TYPE")
                        .latitude(12.25).longitude(109.2)
                        .source("FOURSQUARE_OS_PLACES").sourcePlaceId("fsq-101")
                        .moderationStatus("PENDING_ADMIN_REVIEW").build())
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("{\"applied\": false}");

        assertThatThrownBy(() -> service.approveAndPublish(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("place type draft");
    }

    @Test
    void shouldThrowWhenInvalidSource() {
        StagingPlaceDetailResponse detail = StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder()
                        .id(1L).name("Test").placeTypeDraft("FOOD")
                        .latitude(12.25).longitude(109.2)
                        .source("UNKNOWN_SOURCE").sourcePlaceId("fsq-101")
                        .moderationStatus("PENDING_ADMIN_REVIEW").build())
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("{\"applied\": false}");

        assertThatThrownBy(() -> service.approveAndPublish(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("source");
    }

    @Test
    void shouldThrowWhenInvalidName() {
        StagingPlaceDetailResponse detail = StagingPlaceDetailResponse.builder()
                .stagingPlace(StagingPlaceModerationResponse.builder()
                        .id(1L).name("??").placeTypeDraft("FOOD")
                        .latitude(12.25).longitude(109.2)
                        .source("FOURSQUARE_OS_PLACES").sourcePlaceId("fsq-101")
                        .moderationStatus("PENDING_ADMIN_REVIEW").build())
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("{\"applied\": false}");

        assertThatThrownBy(() -> service.approveAndPublish(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("name");
    }

    @Test
    void shouldThrowWhenDuplicateBySourceAndExternalId() {
        StagingPlaceDetailResponse detail = createPublishableStaging();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("{\"applied\": false}");
        PlaceStagingModerationJdbcRepository.ExistingPublicRecord existing =
                new PlaceStagingModerationJdbcRepository.ExistingPublicRecord(
                        "PLACE", 999L, "Duplicate Place", "Nha Trang", "Khanh Hoa", "FOURSQUARE_OS_PLACES", "fsq-101"
                );
        when(repository.findPlaceBySourceAndExternalId("FOURSQUARE_OS_PLACES", "fsq-101")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.approveAndPublish(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void shouldThrowWhenDuplicateByNearbyPlace() {
        StagingPlaceDetailResponse detail = createPublishableStaging();

        PlaceStagingModerationJdbcRepository.PotentialDuplicatePlace nearby = 
                new PlaceStagingModerationJdbcRepository.PotentialDuplicatePlace(
                        99L, "Sushi Nha Trang", "Nha Trang", "Khánh Hòa", 12.251, 109.201
                );

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("{\"applied\": false}");
        when(repository.findPlaceBySourceAndExternalId("FOURSQUARE_OS_PLACES", "fsq-101")).thenReturn(Optional.empty());
        when(repository.findPlacesWithinRadius(109.2, 12.25, 500.0)).thenReturn(List.of(nearby));

        assertThatThrownBy(() -> service.approveAndPublish(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Duplicate candidate found in places");
        verify(repository, never()).insertPlace(any(), any(), any(), any(), anyDouble(), anyDouble(), any(), any(), any(), any(), any());
    }

    @Test
    void shouldThrowWhenCategoryNotFound() {
        StagingPlaceDetailResponse detail = createPublishableStaging();

        when(repository.findById(1L)).thenReturn(Optional.of(detail));
        when(repository.getMappingPayload(1L)).thenReturn("{\"applied\": false}");
        when(repository.findPlaceBySourceAndExternalId("FOURSQUARE_OS_PLACES", "fsq-101")).thenReturn(Optional.empty());
        when(repository.findPlacesWithinRadius(109.2, 12.25, 500.0)).thenReturn(List.of());
        when(repository.findCategoryIdBySlug("food")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.approveAndPublish(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Category not found");
    }
}
