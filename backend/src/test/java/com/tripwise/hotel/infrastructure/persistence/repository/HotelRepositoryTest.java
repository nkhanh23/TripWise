package com.tripwise.hotel.infrastructure.persistence.repository;

import com.tripwise.BaseIntegrationTest;
import com.tripwise.hotel.domain.entity.Hotel;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class HotelRepositoryTest extends BaseIntegrationTest {

    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory();

    @Autowired
    private HotelRepository hotelRepository;

    @Test
    void shouldPersistHotelWithGeographyPoint() {
        Hotel hotel = Hotel.builder()
                .name("Sunrise Hotel")
                .city("Nha Trang")
                .location(point(109.1967, 12.2388))
                .priceLevel("medium")
                .starRating(4)
                .googleMapsUrl("https://maps.example/hotel")
                .description("Central hotel near the beach")
                .isActive(true)
                .build();

        Hotel savedHotel = hotelRepository.saveAndFlush(hotel);

        assertThat(savedHotel.getId()).isNotNull();

        Hotel foundHotel = hotelRepository.findById(savedHotel.getId()).orElseThrow();
        assertThat(foundHotel.getLocation()).isNotNull();
        assertThat(foundHotel.getLocation().getX()).isEqualTo(109.1967);
        assertThat(foundHotel.getLocation().getY()).isEqualTo(12.2388);
        assertThat(foundHotel.getPriceLevel()).isEqualTo("medium");
        assertThat(foundHotel.getStarRating()).isEqualTo(4);
        assertThat(foundHotel.getCreatedAt()).isNotNull();
        assertThat(foundHotel.getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldFindOnlyActiveHotelsByCityOrderedByName() {
        hotelRepository.save(Hotel.builder()
                .name("Blue Bay Hotel")
                .city("Nha Trang")
                .location(point(109.1980, 12.2400))
                .priceLevel("high")
                .starRating(5)
                .isActive(true)
                .build());

        hotelRepository.save(Hotel.builder()
                .name("Amber Stay")
                .city("nha trang")
                .location(point(109.1900, 12.2300))
                .priceLevel("low")
                .starRating(3)
                .isActive(true)
                .build());

        hotelRepository.save(Hotel.builder()
                .name("Closed Hotel")
                .city("Nha Trang")
                .location(point(109.2100, 12.2500))
                .priceLevel("medium")
                .starRating(4)
                .isActive(false)
                .build());

        hotelRepository.save(Hotel.builder()
                .name("Da Nang Hotel")
                .city("Da Nang")
                .location(point(108.2208, 16.0544))
                .priceLevel("medium")
                .starRating(4)
                .isActive(true)
                .build());

        hotelRepository.flush();

        List<Hotel> hotels = hotelRepository.findAllByCityIgnoreCaseAndIsActiveTrueOrderByNameAsc("NHA TRANG");

        assertThat(hotels)
                .extracting(Hotel::getName)
                .containsExactly("Amber Stay", "Blue Bay Hotel");
    }

    private static Point point(double longitude, double latitude) {
        Point point = GEOMETRY_FACTORY.createPoint(new Coordinate(longitude, latitude));
        point.setSRID(4326);
        return point;
    }
}
