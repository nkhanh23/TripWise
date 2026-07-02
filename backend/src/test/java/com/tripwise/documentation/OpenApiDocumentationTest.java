package com.tripwise.documentation;

import com.tripwise.auth.infrastructure.persistence.repository.RefreshTokenRepository;
import com.tripwise.hotel.infrastructure.persistence.repository.HotelRepository;
import com.tripwise.itinerary.infrastructure.persistence.repository.ItineraryItemRepository;
import com.tripwise.place.infrastructure.persistence.repository.PlaceRepository;
import com.tripwise.route.infrastructure.persistence.repository.RouteCacheJpaRepository;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import com.tripwise.weather.infrastructure.persistence.repository.WeatherCacheJpaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.autoconfigure.exclude=" +
                "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration," +
                "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration," +
                "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration," +
                "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration",
        "management.endpoint.health.group.readiness.include=readinessState, diskSpace",
        "tripwise.jwt.secret=test_secret_key_with_minimum_length_32_chars",
        "tripwise.jwt.access-token-expiration=PT15M",
        "tripwise.rate-limit.enabled=false",
        "tripwise.security.docs-public-enabled=true"
})
@AutoConfigureMockMvc
class OpenApiDocumentationTest {

    @Autowired
    private MockMvc mockMvc;

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

    @MockBean
    private HotelRepository hotelRepository;

    @MockBean
    private ItineraryItemRepository itineraryItemRepository;

    @Test
    void apiDocs_ShouldExposeOpenApiSpecification() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.openapi").value("3.0.1"))
                .andExpect(jsonPath("$.info.title").value("TripWise API"))
                .andExpect(jsonPath("$.info.version").value("v1"))
                .andExpect(jsonPath("$.paths['/api/v1/auth/login']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/trips/generate']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/places']").exists());
    }

    @Test
    void swaggerUi_ShouldBePubliclyAccessible() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Swagger UI")));
    }
}
