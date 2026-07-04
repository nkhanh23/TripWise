package com.tripwise.place.application.dto;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

public record PlaceImportRecord(
        String sourceExternalId,
        String name,
        String province,
        String city,
        String district,
        String ward,
        String displayAddress,
        String categorySlug,
        Double latitude,
        Double longitude,
        String description,
        BigDecimal estimatedCost,
        Integer durationMinutes,
        Boolean indoor,
        Boolean active,
        String priceLevel,
        String verificationStatus,
        Set<String> tags,
        Map<String, String> rawTags
) {
}
