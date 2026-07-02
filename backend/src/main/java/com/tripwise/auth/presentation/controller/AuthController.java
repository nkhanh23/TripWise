package com.tripwise.auth.presentation.controller;

import com.tripwise.auth.application.dto.LoginRequest;
import com.tripwise.auth.application.dto.LoginResponse;
import com.tripwise.auth.application.dto.LogoutRequest;
import com.tripwise.auth.application.dto.RefreshRequest;
import com.tripwise.auth.application.dto.RegisterRequest;
import com.tripwise.auth.application.service.AuthService;
import com.tripwise.auth.application.service.GetCurrentUserUseCase;
import com.tripwise.auth.application.service.LogoutUseCase;
import com.tripwise.common.api.ApiResponse;
import com.tripwise.user.application.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Authentication and current user endpoints")
public class AuthController {

    private final AuthService authService;
    private final GetCurrentUserUseCase getCurrentUserUseCase;
    private final LogoutUseCase logoutUseCase;

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Authenticate with email and password to receive access and refresh tokens.")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse loginResponse = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", loginResponse));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh token", description = "Rotate a refresh token and issue a new access token pair.")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        LoginResponse loginResponse = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", loginResponse));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout", description = "Revoke a refresh token and end the current session chain.")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody LogoutRequest request) {
        logoutUseCase.execute(request);
        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }

    @PostMapping("/register")
    @Operation(summary = "Register", description = "Create a new TripWise user account.")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse userResponse = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully", userResponse));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user", description = "Return the authenticated user's profile.")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(Authentication authentication) {
        UserResponse userResponse = getCurrentUserUseCase.execute(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Current user fetched successfully", userResponse));
    }
}
