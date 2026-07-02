package com.tripwise.route.infrastructure;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.common.exception.BusinessException;
import com.tripwise.common.exception.ExternalServiceException;
import com.tripwise.route.domain.RouteResult;
import com.tripwise.route.infrastructure.config.OsrmProperties;
import com.tripwise.route.infrastructure.dto.OsrmRouteResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Locale;
import java.util.Set;

@Slf4j
@Component
public class OsrmClient {

    private static final Set<String> SUPPORTED_PROFILES = Set.of("driving", "walking", "cycling");

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public OsrmClient(OsrmProperties osrmProperties, ObjectMapper objectMapper, RestClient.Builder restClientBuilder) {
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) osrmProperties.getTimeout().toMillis());
        requestFactory.setReadTimeout((int) osrmProperties.getTimeout().toMillis());

        this.restClient = restClientBuilder
                .baseUrl(osrmProperties.getApiUrl())
                .requestFactory(requestFactory)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    OsrmClient(RestClient restClient, ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    public RouteResult getRoute(double lat1, double lng1, double lat2, double lng2, String profile) {
        validateLatitude("lat1", lat1);
        validateLongitude("lng1", lng1);
        validateLatitude("lat2", lat2);
        validateLongitude("lng2", lng2);

        String normalizedProfile = normalizeProfile(profile);

        try {
            log.info("Calling OSRM API with profile {}", normalizedProfile);
            OsrmRouteResponse response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/route/v1/{profile}/{lng1},{lat1};{lng2},{lat2}")
                            .queryParam("overview", "full")
                            .queryParam("geometries", "geojson")
                            .build(normalizedProfile, lng1, lat1, lng2, lat2))
                    .retrieve()
                    .body(OsrmRouteResponse.class);

            if (response == null
                    || response.getRoutes() == null
                    || response.getRoutes().isEmpty()
                    || response.getRoutes().getFirst().getDistance() == null
                    || response.getRoutes().getFirst().getDuration() == null
                    || response.getRoutes().getFirst().getGeometry() == null) {
                throw new ExternalServiceException("OSRM returned an empty or invalid response");
            }

            OsrmRouteResponse.RouteData routeData = response.getRoutes().getFirst();
            return new RouteResult(
                    routeData.getDistance(),
                    routeData.getDuration(),
                    serializeGeometry(routeData.getGeometry())
            );
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to get route from OSRM API with profile {}: {}", normalizedProfile, ex.getMessage(), ex);
            throw new ExternalServiceException("Lỗi khi kết nối với OSRM API: " + ex.getMessage());
        }
    }

    private String serializeGeometry(OsrmRouteResponse.GeometryData geometryData) {
        try {
            return objectMapper.writeValueAsString(geometryData);
        } catch (JsonProcessingException ex) {
            throw new ExternalServiceException("Không thể parse geometry từ OSRM response");
        }
    }

    private String normalizeProfile(String profile) {
        if (profile == null || profile.isBlank()) {
            throw new BusinessException("Profile route không được để trống", "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }

        String normalizedProfile = profile.trim().toLowerCase(Locale.ROOT);
        if (!SUPPORTED_PROFILES.contains(normalizedProfile)) {
            throw new BusinessException("Profile route không hợp lệ", "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }

        return normalizedProfile;
    }

    private void validateLatitude(String field, double latitude) {
        if (latitude < -90 || latitude > 90) {
            throw new BusinessException(field + " phải nằm trong khoảng từ -90 đến 90", "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }
    }

    private void validateLongitude(String field, double longitude) {
        if (longitude < -180 || longitude > 180) {
            throw new BusinessException(field + " phải nằm trong khoảng từ -180 đến 180", "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        }
    }
}
