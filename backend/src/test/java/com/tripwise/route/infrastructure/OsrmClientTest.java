package com.tripwise.route.infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.common.exception.BusinessException;
import com.tripwise.common.exception.ExternalServiceException;
import com.tripwise.route.domain.RouteResult;
import com.tripwise.route.infrastructure.dto.OsrmRouteResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OsrmClientTest {

    @Mock
    private RestClient restClient;

    @Mock
    private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RestClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    private OsrmClient osrmClient;

    @BeforeEach
    void setUp() {
        osrmClient = new OsrmClient(restClient, new ObjectMapper());
    }

    @Test
    void getRoute_ShouldReturnDistanceDurationAndGeometry() {
        OsrmRouteResponse response = new OsrmRouteResponse();
        response.setCode("Ok");

        OsrmRouteResponse.GeometryData geometryData = new OsrmRouteResponse.GeometryData();
        geometryData.setType("LineString");
        geometryData.setCoordinates(List.of(
                List.of(109.1967, 12.2404),
                List.of(109.2105, 12.2521)
        ));

        OsrmRouteResponse.RouteData routeData = new OsrmRouteResponse.RouteData();
        routeData.setDistance(1823.4);
        routeData.setDuration(365.2);
        routeData.setGeometry(geometryData);
        response.setRoutes(List.of(routeData));

        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OsrmRouteResponse.class)).thenReturn(response);

        RouteResult result = osrmClient.getRoute(12.2404, 109.1967, 12.2521, 109.2105, "driving");

        assertThat(result.distanceMeters()).isEqualTo(1823.4);
        assertThat(result.durationSeconds()).isEqualTo(365.2);
        assertThat(result.geometry()).contains("\"type\":\"LineString\"");
        assertThat(result.geometry()).contains("[109.1967,12.2404]");
    }

    @Test
    void getRoute_WhenResponseHasNoRoutes_ShouldThrowExternalServiceException() {
        OsrmRouteResponse response = new OsrmRouteResponse();
        response.setCode("Ok");
        response.setRoutes(List.of());

        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OsrmRouteResponse.class)).thenReturn(response);

        assertThrows(ExternalServiceException.class,
                () -> osrmClient.getRoute(12.2404, 109.1967, 12.2521, 109.2105, "driving"));
    }

    @Test
    void getRoute_WhenResponseIsNull_ShouldThrowExternalServiceException() {
        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OsrmRouteResponse.class)).thenReturn(null);

        assertThrows(ExternalServiceException.class,
                () -> osrmClient.getRoute(12.2404, 109.1967, 12.2521, 109.2105, "driving"));
    }

    @Test
    void getRoute_WhenRouteGeometryIsMissing_ShouldThrowExternalServiceException() {
        OsrmRouteResponse response = new OsrmRouteResponse();
        response.setCode("Ok");

        OsrmRouteResponse.RouteData routeData = new OsrmRouteResponse.RouteData();
        routeData.setDistance(1823.4);
        routeData.setDuration(365.2);
        routeData.setGeometry(null);
        response.setRoutes(List.of(routeData));

        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OsrmRouteResponse.class)).thenReturn(response);

        assertThrows(ExternalServiceException.class,
                () -> osrmClient.getRoute(12.2404, 109.1967, 12.2521, 109.2105, "driving"));
    }

    @Test
    void getRoute_WhenOsrmReturnsServerError_ShouldThrowExternalServiceException() {
        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(Function.class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(OsrmRouteResponse.class)).thenThrow(new RuntimeException("503 Service Unavailable"));

        assertThrows(ExternalServiceException.class,
                () -> osrmClient.getRoute(12.2404, 109.1967, 12.2521, 109.2105, "walking"));
    }

    @Test
    void getRoute_WhenLatitudeIsInvalid_ShouldThrowBusinessException() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> osrmClient.getRoute(95.0, 109.1967, 12.2521, 109.2105, "driving"));

        assertThat(exception.getErrorCode()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void getRoute_WhenProfileIsInvalid_ShouldThrowBusinessException() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> osrmClient.getRoute(12.2404, 109.1967, 12.2521, 109.2105, "flying"));

        assertThat(exception.getErrorCode()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void getRoute_WhenLongitudeIsInvalid_ShouldThrowBusinessException() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> osrmClient.getRoute(12.2404, 181.0, 12.2521, 109.2105, "driving"));

        assertThat(exception.getErrorCode()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void getRoute_WhenProfileIsBlank_ShouldThrowBusinessException() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> osrmClient.getRoute(12.2404, 109.1967, 12.2521, 109.2105, "   "));

        assertThat(exception.getErrorCode()).isEqualTo("VALIDATION_ERROR");
    }
}
