package com.tripwise.route.presentation;

import com.tripwise.common.api.ApiResponse;
import com.tripwise.route.application.dto.RouteResponse;
import com.tripwise.route.application.service.CalculateRouteUseCase;
import com.tripwise.route.domain.RouteResult;
import com.tripwise.route.presentation.dto.RouteQueryRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/routes")
@Tag(name = "Routes", description = "Route, distance, duration, and geometry endpoints")
public class RouteController {

    private final CalculateRouteUseCase calculateRouteUseCase;

    @GetMapping
    @Operation(summary = "Calculate route", description = "Calculate route distance, duration, and geometry between two coordinates.")
    public ResponseEntity<ApiResponse<RouteResponse>> getRoute(@Valid RouteQueryRequest request) {
        RouteResult routeResult = calculateRouteUseCase.execute(
                request.getOriginLat(),
                request.getOriginLng(),
                request.getDestLat(),
                request.getDestLng(),
                request.getProfile()
        );

        RouteResponse response = new RouteResponse(
                routeResult.distanceMeters(),
                routeResult.durationSeconds(),
                routeResult.geometry()
        );

        return ResponseEntity.ok(ApiResponse.success("Route calculated successfully", response));
    }
}
