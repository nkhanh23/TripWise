package com.tripwise.place.infrastructure.ingestion;

import com.tripwise.place.application.dto.PlaceImportRecord;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class OsmPlaceCategoryMapper {

    private final OsmPlaceFilter osmPlaceFilter;

    public OsmPlaceCategoryMapper(OsmPlaceFilter osmPlaceFilter) {
        this.osmPlaceFilter = osmPlaceFilter;
    }

    public Optional<String> resolveCategorySlug(PlaceImportRecord record) {
        OsmPlaceFilterResult result = osmPlaceFilter.filter(record);
        return result.isRejected() ? Optional.empty() : Optional.ofNullable(result.normalizedCategory());
    }
}
