package com.tripwise.place.infrastructure.persistence.specification;

import com.tripwise.place.domain.entity.Place;
import jakarta.persistence.criteria.SetJoin;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public final class PlaceSpecifications {

    private PlaceSpecifications() {
    }

    public static Specification<Place> isActiveAndVerified() {
        return (root, query, criteriaBuilder) -> criteriaBuilder.and(
                criteriaBuilder.isTrue(root.get("isActive")),
                criteriaBuilder.isTrue(root.get("isVerified"))
        );
    }

    public static Specification<Place> hasCity(String city) {
        if (isBlank(city)) {
            return null;
        }

        String normalizedCity = city.trim().toLowerCase();
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(criteriaBuilder.lower(root.get("city")), normalizedCity);
    }

    public static Specification<Place> hasCategoryId(Long categoryId) {
        if (categoryId == null) {
            return null;
        }

        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("category").get("id"), categoryId);
    }

    public static Specification<Place> hasAnyTag(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return null;
        }

        List<String> normalizedTags = tags.stream()
                .filter(tag -> !isBlank(tag))
                .map(tag -> tag.trim().toLowerCase())
                .distinct()
                .toList();

        if (normalizedTags.isEmpty()) {
            return null;
        }

        return (root, query, criteriaBuilder) -> {
            query.distinct(true);
            SetJoin<Place, String> tagsJoin = root.joinSet("tags");
            var inClause = criteriaBuilder.in(criteriaBuilder.lower(tagsJoin));
            normalizedTags.forEach(inClause::value);
            return inClause;
        };
    }

    public static Specification<Place> hasPriceLevel(String priceLevel) {
        if (isBlank(priceLevel)) {
            return null;
        }

        String normalizedPriceLevel = priceLevel.trim().toLowerCase();
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(criteriaBuilder.lower(root.get("priceLevel")), normalizedPriceLevel);
    }

    public static Specification<Place> matchesKeyword(String keyword) {
        if (isBlank(keyword)) {
            return null;
        }

        String keywordPattern = "%" + keyword.trim().toLowerCase() + "%";
        return (root, query, criteriaBuilder) -> criteriaBuilder.or(
                criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), keywordPattern),
                criteriaBuilder.like(criteriaBuilder.lower(criteriaBuilder.coalesce(root.get("description"), "")), keywordPattern)
        );
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
