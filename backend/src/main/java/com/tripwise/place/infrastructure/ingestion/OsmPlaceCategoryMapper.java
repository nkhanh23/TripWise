package com.tripwise.place.infrastructure.ingestion;

import com.tripwise.place.application.dto.PlaceImportRecord;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class OsmPlaceCategoryMapper {

    public Optional<String> resolveCategorySlug(PlaceImportRecord record) {
        String explicitSlug = normalize(record.categorySlug());
        if (explicitSlug != null) {
            return Optional.of(explicitSlug);
        }

        Map<String, String> rawTags = record.rawTags();
        if (rawTags == null || rawTags.isEmpty()) {
            return Optional.empty();
        }

        String tourism = normalize(rawTags.get("tourism"));
        if (tourism != null) {
            if (matchesAny(tourism, "museum", "gallery", "artwork")) {
                return Optional.of("culture");
            }
            if (matchesAny(tourism, "theme_park", "zoo", "aquarium", "amusement_arcade")) {
                return Optional.of("entertainment");
            }
            if (matchesAny(tourism, "viewpoint", "attraction", "picnic_site", "information")) {
                return Optional.of("check-in");
            }
            if (matchesAny(tourism, "beach_resort")) {
                return Optional.of("beach");
            }
        }

        String natural = normalize(rawTags.get("natural"));
        if (natural != null) {
            if (matchesAny(natural, "beach", "coastline")) {
                return Optional.of("beach");
            }
            if (matchesAny(natural, "waterfall", "cave", "peak", "bay", "hot_spring", "wood", "scrub", "cape", "cliff", "valley")) {
                return Optional.of("nature");
            }
        }

        String leisure = normalize(rawTags.get("leisure"));
        if (leisure != null) {
            if (matchesAny(leisure, "park", "garden", "nature_reserve")) {
                return Optional.of("nature");
            }
            if (matchesAny(leisure, "water_park", "amusement_arcade", "sports_centre", "stadium", "playground", "golf_course", "marina")) {
                return Optional.of("entertainment");
            }
        }

        String historic = normalize(rawTags.get("historic"));
        if (historic != null) {
            return Optional.of("culture");
        }

        String amenity = normalize(rawTags.get("amenity"));
        if (amenity != null) {
            if (matchesAny(amenity, "marketplace")) {
                return Optional.of("shopping");
            }
            if (matchesAny(amenity, "place_of_worship")) {
                return Optional.of("spiritual");
            }
            if (matchesAny(amenity, "restaurant", "cafe", "fast_food", "pub", "bar", "food_court", "ice_cream")) {
                return Optional.of("food");
            }
            if (matchesAny(amenity, "cinema", "theatre", "nightclub", "casino")) {
                return Optional.of("entertainment");
            }
            if (matchesAny(amenity, "library")) {
                return Optional.of("culture");
            }
            if (matchesAny(amenity, "fountain")) {
                return Optional.of("check-in");
            }
        }

        String religion = normalize(rawTags.get("religion"));
        if (religion != null) {
            return Optional.of("spiritual");
        }

        String building = normalize(rawTags.get("building"));
        if (building != null && matchesAny(building, "temple", "church", "pagoda", "cathedral", "shrine", "mosque")) {
            return Optional.of("spiritual");
        }

        String shop = normalize(rawTags.get("shop"));
        if (shop != null && matchesAny(shop, "mall", "department_store", "gift", "souvenir", "supermarket", "craft", "art")) {
            return Optional.of("shopping");
        }

        return Optional.empty();
    }

    private boolean matchesAny(String value, String... expectedValues) {
        if (value == null) {
            return false;
        }
        for (String expectedValue : expectedValues) {
            if (value.equals(expectedValue)) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
    }
}
