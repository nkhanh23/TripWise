package com.tripwise.place.infrastructure.persistence.repository;

import com.tripwise.place.domain.entity.PlaceCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlaceCategoryRepository extends JpaRepository<PlaceCategory, Long> {

    Optional<PlaceCategory> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<PlaceCategory> findAllByOrderByNameAsc();
}
