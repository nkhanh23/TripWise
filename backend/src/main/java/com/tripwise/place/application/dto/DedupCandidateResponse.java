package com.tripwise.place.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DedupCandidateResponse {
    private Long id;
    private Long existingPlaceId;
    private Long matchedStagingPlaceId;
    private String matchType;
    private String matchConfidence;
    private Double distanceMeters;
    private Double nameSimilarity;
    private Double categorySimilarity;
    private String evidence;
    private String decision;
    
    // Matched public place details
    private String existingPlaceName;
    private String existingPlaceType;
    private String existingPlaceCity;
}
