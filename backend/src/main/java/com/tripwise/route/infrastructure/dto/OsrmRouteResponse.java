package com.tripwise.route.infrastructure.dto;

import lombok.Data;

import java.util.List;

@Data
public class OsrmRouteResponse {

    private String code;
    private List<RouteData> routes;

    @Data
    public static class RouteData {
        private Double distance;
        private Double duration;
        private GeometryData geometry;
    }

    @Data
    public static class GeometryData {
        private String type;
        private List<List<Double>> coordinates;
    }
}
