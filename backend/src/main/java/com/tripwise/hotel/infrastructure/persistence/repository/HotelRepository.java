package com.tripwise.hotel.infrastructure.persistence.repository;

import com.tripwise.hotel.domain.entity.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HotelRepository extends JpaRepository<Hotel, Long> {

    List<Hotel> findAllByCityIgnoreCaseAndIsActiveTrueOrderByNameAsc(String city);

    List<Hotel> findTop20ByCityIgnoreCaseAndIsActiveTrueOrderByStarRatingDescNameAsc(String city);

    List<Hotel> findTop20ByCityIgnoreCaseAndPriceLevelIgnoreCaseAndIsActiveTrueOrderByStarRatingDescNameAsc(
            String city,
            String priceLevel
    );

    List<Hotel> findTop20ByCityIgnoreCaseAndStarRatingGreaterThanEqualAndIsActiveTrueOrderByStarRatingDescNameAsc(
            String city,
            Integer starRating
    );

    List<Hotel> findTop20ByCityIgnoreCaseAndPriceLevelIgnoreCaseAndStarRatingGreaterThanEqualAndIsActiveTrueOrderByStarRatingDescNameAsc(
            String city,
            String priceLevel,
            Integer starRating
    );
}
