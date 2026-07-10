package com.tripwise.place.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tripwise.common.exception.BusinessException;
import com.tripwise.place.application.dto.StagingPlaceDetailResponse;
import com.tripwise.place.application.dto.StagingPlaceModerationResponse;
import com.tripwise.place.application.dto.StagingPlaceSearchQuery;
import com.tripwise.place.infrastructure.persistence.PlaceStagingModerationJdbcRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StagingPlaceModerationService {

    private final PlaceStagingModerationJdbcRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public Page<StagingPlaceModerationResponse> search(
            StagingPlaceSearchQuery query,
            Pageable pageable,
            String sortBy,
            String sortDirection
    ) {
        return repository.search(query, pageable, sortBy, sortDirection);
    }

    @Transactional(readOnly = true)
    public StagingPlaceDetailResponse getDetail(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new BusinessException("Staging record not found: " + id, "NOT_FOUND"));
    }

    @Transactional
    public void approveAsNew(Long id) {
        getDetail(id); // exists check
        repository.updateModeration(id, "APPROVED_FOR_APPLY", "NO_MATCH", false);
        updateDecisionInPayload(id, "APPROVED_FOR_APPLY", null);
    }

    @Transactional
    public void reject(Long id) {
        getDetail(id); // exists check
        repository.updateModeration(id, "REJECTED", "NO_MATCH", false);
        updateDecisionInPayload(id, "REJECT_CANDIDATE", null);
    }

    @Transactional
    public void markDuplicate(Long id, Long candidateId, Long existingPlaceId) {
        StagingPlaceDetailResponse detail = getDetail(id);
        
        // 1. Approve selected candidate
        if (candidateId != null) {
            repository.updateCandidateDecision(candidateId, "CONFIRMED_DUPLICATE");
        }
        
        // 2. Reject other candidates
        detail.getCandidates().forEach(c -> {
            if (candidateId == null || !c.getId().equals(candidateId)) {
                repository.updateCandidateDecision(c.getId(), "CONFIRMED_DISTINCT");
            }
        });
        
        // 3. Mark staging place as duplicate skip
        repository.updateModeration(id, "REJECTED", "CONFIRMED_DUPLICATE", false);
        updateDecisionInPayload(id, "DUPLICATE_SKIP", existingPlaceId);
    }

    @Transactional
    public Long approveAndPublish(Long id) {
        // 1. Fetch staging record
        StagingPlaceDetailResponse detail = getDetail(id);
        StagingPlaceModerationResponse staging = detail.getStagingPlace();

        // 2. Applied check
        String currentPayload = repository.getMappingPayload(id);
        ObjectNode node;
        try {
            if (currentPayload == null || currentPayload.isBlank() || currentPayload.equals("null")) {
                node = objectMapper.createObjectNode();
            } else {
                node = (ObjectNode) objectMapper.readTree(currentPayload);
            }
        } catch (Exception e) {
            throw new BusinessException("Failed to parse mapping payload: " + e.getMessage(), "PAYLOAD_ERROR");
        }

        if (node.has("applied") && node.get("applied").asBoolean()) {
            throw new BusinessException("Staging record is already applied", "ALREADY_APPLIED");
        }

        // 3. Validation guards
        if ("REJECTED".equals(staging.getModerationStatus())) {
            throw new BusinessException("Cannot publish a rejected staging record", "INVALID_STATUS");
        }
        if ("CONFIRMED_DUPLICATE".equals(staging.getDedupStatus())) {
            throw new BusinessException("Cannot publish a duplicate staging record", "INVALID_STATUS");
        }
        if (staging.getLatitude() == null || staging.getLongitude() == null) {
            throw new BusinessException("Staging record coordinates cannot be null", "INVALID_COORDINATES");
        }
        if (staging.getLatitude() < -90 || staging.getLatitude() > 90 || staging.getLongitude() < -180 || staging.getLongitude() > 180) {
            throw new BusinessException("Staging record coordinates are out of bounds", "INVALID_COORDINATES");
        }
        
        String placeTypeDraft = staging.getPlaceTypeDraft();
        if (placeTypeDraft == null || (!placeTypeDraft.equals("FOOD") && !placeTypeDraft.equals("HOTEL") && !placeTypeDraft.equals("ATTRACTION") && !placeTypeDraft.equals("SERVICE"))) {
            throw new BusinessException("Staging record place type draft is invalid: " + placeTypeDraft, "INVALID_TYPE");
        }
        
        String source = staging.getSource();
        if (source == null || (!source.equals("FOURSQUARE_OS_PLACES") && !source.equals("OSM_GEOFABRIK"))) {
            throw new BusinessException("Staging record source is invalid: " + source, "INVALID_SOURCE");
        }

        String name = staging.getName();
        if (!isAcceptableName(name, placeTypeDraft)) {
            throw new BusinessException("Staging record name is not acceptable: " + name, "INVALID_NAME");
        }

        // 4. Duplicate Guard checking
        if (!"HOTEL".equals(placeTypeDraft)) {
            // Check by source + source_external_id in places
            Optional<PlaceStagingModerationJdbcRepository.ExistingPublicRecord> existingOpt =
                    repository.findPlaceBySourceAndExternalId(source, staging.getSourcePlaceId());
            if (existingOpt.isPresent()) {
                PlaceStagingModerationJdbcRepository.ExistingPublicRecord existing = existingOpt.get();
                String errMsg = String.format("A public PLACE already exists with same source/external ID: id=%d, name='%s', sourcePlaceId='%s'",
                        existing.existingPublicId(), existing.existingName(), existing.existingSourcePlaceId());
                throw new BusinessException(errMsg, "DUPLICATE_CANDIDATE_FOUND", org.springframework.http.HttpStatus.BAD_REQUEST, existing);
            }
            
            // Check by normalized name + city/province + close distance (< 500m) in places
            List<PlaceStagingModerationJdbcRepository.PotentialDuplicatePlace> nearbyPlaces = 
                    repository.findPlacesWithinRadius(staging.getLongitude(), staging.getLatitude(), 500.0);
            String normS = PlaceStagingModerationJdbcRepository.normalizeNameForDedup(name);
            for (PlaceStagingModerationJdbcRepository.PotentialDuplicatePlace p : nearbyPlaces) {
                String normD = PlaceStagingModerationJdbcRepository.normalizeNameForDedup(p.name());
                double dist = PlaceStagingModerationJdbcRepository.haversineDistance(staging.getLatitude(), staging.getLongitude(), p.lat(), p.lng());
                double sim = PlaceStagingModerationJdbcRepository.calculateNameSimilarity(normS, normD);
                if (dist < 500.0 && (normS.equals(normD) || normS.contains(normD) || normD.contains(normS) || sim >= 0.4)) {
                    throw new BusinessException("Duplicate candidate found in places (ID=" + p.id() + ", Name='" + p.name() + "', distance=" + Math.round(dist) + "m)", "DUPLICATE_CANDIDATE_FOUND");
                }
            }
        } else {
            // Check by normalized name + city + close distance (< 500m) in hotels
            List<PlaceStagingModerationJdbcRepository.PotentialDuplicateHotel> nearbyHotels = 
                    repository.findHotelsWithinRadius(staging.getLongitude(), staging.getLatitude(), 500.0);
            String normS = PlaceStagingModerationJdbcRepository.normalizeNameForDedup(name);
            for (PlaceStagingModerationJdbcRepository.PotentialDuplicateHotel h : nearbyHotels) {
                String normD = PlaceStagingModerationJdbcRepository.normalizeNameForDedup(h.name());
                double dist = PlaceStagingModerationJdbcRepository.haversineDistance(staging.getLatitude(), staging.getLongitude(), h.lat(), h.lng());
                double sim = PlaceStagingModerationJdbcRepository.calculateNameSimilarity(normS, normD);
                if (dist < 500.0 && (normS.equals(normD) || normS.contains(normD) || normD.contains(normS) || sim >= 0.4)) {
                    throw new BusinessException("Duplicate candidate found in hotels (ID=" + h.id() + ", Name='" + h.name() + "', distance=" + Math.round(dist) + "m)", "DUPLICATE_CANDIDATE_FOUND");
                }
            }
        }

        // 5. Insert into public database and update staging
        Long publicId;
        String publicType;
        if ("HOTEL".equals(placeTypeDraft)) {
            publicId = repository.insertHotel(
                    name,
                    staging.getLocality(),
                    staging.getLongitude(),
                    staging.getLatitude(),
                    staging.getAddress()
            );
            publicType = "HOTEL";
        } else {
            // Resolve category slug
            final String finalSlug = "FOOD".equals(placeTypeDraft) ? "food" : "entertainment";
            Long categoryId = repository.findCategoryIdBySlug(finalSlug)
                    .orElseThrow(() -> new BusinessException("Category not found for slug: " + finalSlug, "CATEGORY_NOT_FOUND"));

            publicId = repository.insertPlace(
                    name,
                    staging.getLocality(),
                    staging.getRegion(),
                    categoryId,
                    staging.getLongitude(),
                    staging.getLatitude(),
                    staging.getAddress(),
                    staging.getAddress(),
                    source,
                    staging.getSourcePlaceId(),
                    placeTypeDraft
            );
            publicType = "PLACE";

            // Insert place data source reference
            repository.insertPlaceDataSource(
                    publicId,
                    source,
                    staging.getSourcePlaceId(),
                    "Imported from " + source + " staging queue via Admin Approve & Publish"
            );
        }

        // 6. Update mapping_payload
        node.put("applied", true);
        node.put("appliedAt", Instant.now().toString());
        node.put("moderationDecision", "APPROVE_AND_PUBLISH");
        node.put("publishedAt", Instant.now().toString());
        node.put("publishedPublicType", publicType);
        node.put("publishedPublicId", publicId);
        try {
            repository.updateMappingPayload(id, objectMapper.writeValueAsString(node));
        } catch (Exception e) {
            throw new BusinessException("Failed to update mapping payload: " + e.getMessage(), "PAYLOAD_ERROR");
        }

        // 7. Update staging record moderation/needs review
        repository.updateModeration(id, "APPROVED_FOR_APPLY", "NO_MATCH", false);

        return publicId;
    }

    public boolean isAcceptableName(String name, String sType) {
        if (name == null || name.strip().length() < 3) {
            return false;
        }
        String lowerName = name.toLowerCase(java.util.Locale.ROOT);
        
        // 1. Generic terms
        java.util.Set<String> genericTerms = java.util.Set.of(
            "unnamed", "beachfront", "annex", "khách sạn", "khach san", 
            "nhà hàng", "nha hang", "quán ăn", "quan an", "cà phê", 
            "ca phe", "coffee", "restaurant", "bar", "pub"
        );
        if (genericTerms.contains(lowerName)) {
            return false;
        }
        
        // 2. Starts with digits and street-like patterns
        if (lowerName.matches("^\\d+\\s+[a-zA-Z\\s]+$")) {
            return false;
        }
        
        // 3. Encoding errors
        if (lowerName.contains("\u00ef") || lowerName.contains("\u00bf") || lowerName.contains("\u00bd")) {
            return false;
        }
        
        // 4. Skip code-like names
        if (name.matches("^[A-Z0-9]+$") && name.chars().anyMatch(Character::isDigit)) {
            return false;
        }
        for (String word : name.split("\\s+")) {
            if (word.matches("^[A-Z]{2,4}\\d{1,3}$")) {
                return false;
            }
        }
        
        // 5. Generic infra if FOOD
        if ("FOOD".equals(sType)) {
            java.util.Set<String> genericInfra = java.util.Set.of("bến cảng", "harbor", "port", "dock", "pier", "bến tàu", "bến xe", "nhà ga", "sân bay", "ga tàu");
            if (genericInfra.stream().anyMatch(lowerName::contains)) {
                return false;
            }
        }
        
        // 6. One-word ambiguous names
        java.util.Set<String> ambiguousSingleWords = java.util.Set.of("emerald", "annex", "beachfront", "diamond", "ruby", "gold", "silver", "sapphire", "plaza", "center", "villa", "resort", "hotel", "motel", "hostel", "apartment", "apartments", "condo", "suite", "suites");
        if (name.split("\\s+").length == 1 && ambiguousSingleWords.contains(lowerName)) {
            return false;
        }
        
        return true;
    }

    private void updateDecisionInPayload(Long id, String decision, Long existingPlaceId) {
        try {
            String currentPayload = repository.getMappingPayload(id);
            ObjectNode node;
            if (currentPayload == null || currentPayload.isBlank() || currentPayload.equals("null")) {
                node = objectMapper.createObjectNode();
            } else {
                node = (ObjectNode) objectMapper.readTree(currentPayload);
            }
            node.put("moderationDecision", decision);
            node.put("moderatedAt", Instant.now().toString());
            if (existingPlaceId != null) {
                node.put("duplicateOfPlaceId", existingPlaceId);
            }
            
            repository.updateMappingPayload(id, objectMapper.writeValueAsString(node));
        } catch (Exception e) {
            throw new BusinessException("Failed to update mapping payload: " + e.getMessage(), "PAYLOAD_ERROR");
        }
    }
}
