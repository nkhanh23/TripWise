package com.tripwise.auth.infrastructure.security;

import com.tripwise.common.api.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/test")
class TestProtectedController {

    @GetMapping("/protected")
    ApiResponse<Map<String, Object>> protectedEndpoint(Authentication authentication) {
        return ApiResponse.success(
                Map.of(
                        "authenticated", authentication != null && authentication.isAuthenticated(),
                        "username", authentication == null ? "" : authentication.getName()
                )
        );
    }
}
