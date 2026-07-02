package com.tripwise.presentation;

import com.tripwise.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Health", description = "Service health endpoints")
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "Health check", description = "Return application health status.")
    public ApiResponse<Map<String, String>> checkHealth() {
        return ApiResponse.success(Map.of("status", "UP"));
    }
}
