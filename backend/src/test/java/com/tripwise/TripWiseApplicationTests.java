package com.tripwise;

import com.tripwise.auth.infrastructure.persistence.repository.RefreshTokenRepository;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import com.tripwise.route.infrastructure.persistence.repository.RouteCacheJpaRepository;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import com.tripwise.weather.infrastructure.persistence.repository.WeatherCacheJpaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;

@SpringBootTest(properties = {
    "spring.autoconfigure.exclude=" +
    "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration," +
    "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration," +
    "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration," +
    "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration",
    "management.endpoint.health.group.readiness.include=readinessState, diskSpace",
    "tripwise.jwt.secret=test_secret_key_with_minimum_length_32_chars",
    "tripwise.jwt.access-token-expiration=PT15M"
})
class TripWiseApplicationTests {

    @MockBean
    private JpaMetamodelMappingContext jpaMappingContext;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private RefreshTokenRepository refreshTokenRepository;

    @MockBean
    private PlaceRepository placeRepository;

    @MockBean
    private com.tripwise.trip.infrastructure.persistence.repository.TripRepository tripRepository;

    @MockBean
    private RouteCacheJpaRepository routeCacheJpaRepository;

    @MockBean
    private WeatherCacheJpaRepository weatherCacheJpaRepository;

    @Test
    void contextLoads() {
    }


}
