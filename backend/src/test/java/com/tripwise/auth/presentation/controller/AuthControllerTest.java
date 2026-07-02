package com.tripwise.auth.presentation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.auth.application.dto.LoginRequest;
import com.tripwise.auth.application.dto.LoginResponse;
import com.tripwise.auth.application.dto.LogoutRequest;
import com.tripwise.auth.application.dto.RefreshRequest;
import com.tripwise.auth.application.dto.RegisterRequest;
import com.tripwise.auth.application.service.AuthService;
import com.tripwise.auth.application.service.GetCurrentUserUseCase;
import com.tripwise.auth.application.service.LogoutUseCase;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationFilter;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationEntryPoint;
import com.tripwise.auth.infrastructure.security.JwtTokenService;
import com.tripwise.common.exception.UnauthorizedException;
import com.tripwise.common.exception.GlobalExceptionHandler;
import com.tripwise.common.security.SecurityConfig;
import com.tripwise.user.application.dto.UserResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = AuthController.class, properties = "tripwise.rate-limit.enabled=false")
@Import({SecurityConfig.class, GlobalExceptionHandler.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private GetCurrentUserUseCase getCurrentUserUseCase;

    @MockBean
    private LogoutUseCase logoutUseCase;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    void login_ShouldReturn200_WhenCredentialsAreValid() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("test@example.com")
                .password("password123")
                .build();

        LoginResponse response = LoginResponse.builder()
                .accessToken("jwt-token")
                .refreshToken("refresh-token")
                .tokenType("Bearer")
                .expiresIn(900)
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.data.accessToken").value("jwt-token"))
                .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.expiresIn").value(900));
    }

    @Test
    void login_ShouldReturn401_WhenCredentialsAreInvalid() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("test@example.com")
                .password("wrong-password")
                .build();

        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new UnauthorizedException("Invalid email or password"));

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void register_ShouldReturn201_WhenRequestIsValid() throws Exception {
        // Arrange
        RegisterRequest request = RegisterRequest.builder()
                .email("test@example.com")
                .password("password123")
                .fullName("Test User")
                .build();

        UserResponse userResponse = UserResponse.builder()
                .id(1L)
                .email("test@example.com")
                .fullName("Test User")
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(userResponse);

        // Act & Assert
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("User registered successfully"))
                .andExpect(jsonPath("$.data.email").value("test@example.com"));
    }

    @Test
    void register_ShouldReturn400_WhenEmailIsInvalid() throws Exception {
        // Arrange
        RegisterRequest request = RegisterRequest.builder()
                .email("invalid-email")
                .password("password123")
                .fullName("Test User")
                .build();

        // Act & Assert
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void login_ShouldReturn400_WhenEmailIsInvalid() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("invalid-email")
                .password("password123")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void getCurrentUser_ShouldReturn200_WhenJwtIsValid() throws Exception {
        UserDetails userDetails = User.builder()
                .username("traveler@tripwise.com")
                .password("hashedPassword")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_USER")))
                .build();

        UserResponse response = UserResponse.builder()
                .id(1L)
                .email("traveler@tripwise.com")
                .fullName("Trip Wise")
                .build();

        when(jwtTokenService.validateToken("valid-token")).thenReturn(true);
        when(jwtTokenService.extractEmail("valid-token")).thenReturn("traveler@tripwise.com");
        when(userDetailsService.loadUserByUsername("traveler@tripwise.com")).thenReturn(userDetails);
        when(getCurrentUserUseCase.execute("traveler@tripwise.com")).thenReturn(response);

        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer valid-token")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Current user fetched successfully"))
                .andExpect(jsonPath("$.data.email").value("traveler@tripwise.com"))
                .andExpect(jsonPath("$.data.fullName").value("Trip Wise"));
    }

    @Test
    void getCurrentUser_ShouldReturn401_WhenJwtIsMissing() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void refresh_ShouldReturn200_WhenRefreshTokenIsValid() throws Exception {
        RefreshRequest request = RefreshRequest.builder()
                .refreshToken("valid-refresh-token")
                .build();

        LoginResponse response = LoginResponse.builder()
                .accessToken("new-access-token")
                .refreshToken("new-refresh-token")
                .tokenType("Bearer")
                .expiresIn(900)
                .build();

        when(authService.refresh(any(RefreshRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Token refreshed successfully"))
                .andExpect(jsonPath("$.data.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.data.refreshToken").value("new-refresh-token"));
    }

    @Test
    void refresh_ShouldReturn401_WhenRefreshTokenIsInvalid() throws Exception {
        RefreshRequest request = RefreshRequest.builder()
                .refreshToken("revoked-refresh-token")
                .build();

        when(authService.refresh(any(RefreshRequest.class)))
                .thenThrow(new UnauthorizedException("Refresh token has been revoked"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Refresh token has been revoked"));
    }

    @Test
    void refresh_ShouldReturn400_WhenRefreshTokenIsBlank() throws Exception {
        RefreshRequest request = RefreshRequest.builder()
                .refreshToken("")
                .build();

        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void logout_ShouldReturn200_WhenRefreshTokenIsValid() throws Exception {
        LogoutRequest request = LogoutRequest.builder()
                .refreshToken("valid-refresh-token")
                .build();

        mockMvc.perform(post("/api/v1/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Logout successful"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void logout_ShouldReturn401_WhenRefreshTokenIsInvalid() throws Exception {
        LogoutRequest request = LogoutRequest.builder()
                .refreshToken("invalid-refresh-token")
                .build();

        org.mockito.Mockito.doThrow(new UnauthorizedException("Invalid refresh token"))
                .when(logoutUseCase).execute(any(LogoutRequest.class));

        mockMvc.perform(post("/api/v1/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Invalid refresh token"));
    }

    @Test
    void logout_ShouldReturn400_WhenRefreshTokenIsBlank() throws Exception {
        LogoutRequest request = LogoutRequest.builder()
                .refreshToken("")
                .build();

        mockMvc.perform(post("/api/v1/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }
}
