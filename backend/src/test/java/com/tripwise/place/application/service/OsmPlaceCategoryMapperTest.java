package com.tripwise.place.application.service;

import com.tripwise.place.application.dto.PlaceImportRecord;
import com.tripwise.place.infrastructure.ingestion.OsmPlaceCategoryMapper;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class OsmPlaceCategoryMapperTest {

    private final OsmPlaceCategoryMapper mapper = new OsmPlaceCategoryMapper(new com.tripwise.place.infrastructure.ingestion.OsmPlaceFilter());

    @Test
    void shouldPreferExplicitCategorySlug() {
        PlaceImportRecord record = new PlaceImportRecord(
                "ext-1",
                "Test Place",
                "Khanh Hoa",
                "Nha Trang",
                null,
                null,
                null,
                "nature",
                12.2,
                109.1,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                Set.of(),
                Map.of("tourism", "museum")
        );

        assertThat(mapper.resolveCategorySlug(record)).contains("nature");
    }

    @Test
    void shouldMapSupportedOsmTagsToExistingTripWiseCategories() {
        PlaceImportRecord record = new PlaceImportRecord(
                null,
                "Bao Tang Bien",
                "Khanh Hoa",
                "Nha Trang",
                null,
                null,
                null,
                null,
                12.25,
                109.18,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                Set.of(),
                Map.of("tourism", "museum")
        );

        assertThat(mapper.resolveCategorySlug(record)).contains("culture");
    }

    @Test
    void shouldReturnEmptyForUnsupportedTags() {
        PlaceImportRecord record = new PlaceImportRecord(
                null,
                "Unsupported",
                "Khanh Hoa",
                "Nha Trang",
                null,
                null,
                null,
                null,
                12.25,
                109.18,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                Set.of(),
                Map.of("railway", "switch")
        );

        assertThat(mapper.resolveCategorySlug(record)).isEmpty();
    }
}
