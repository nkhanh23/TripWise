package com.tripwise.auth.presentation.controller;

import com.tripwise.auth.application.dto.LoginRequest;
import com.tripwise.auth.application.dto.LoginResponse;
import com.tripwise.auth.application.service.AuthService;
import com.tripwise.common.api.ApiResponse;
import com.tripwise.common.exception.UnauthorizedException;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.Role;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Authentication", description = "Admin-specific authentication endpoints")
public class AdminController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    @Operation(summary = "Admin login", description = "Authenticate with admin credentials. Only users with ADMIN role are allowed.")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Invalid email or password");
        }

        LoginResponse loginResponse = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Admin login successful", loginResponse));
    }
}
