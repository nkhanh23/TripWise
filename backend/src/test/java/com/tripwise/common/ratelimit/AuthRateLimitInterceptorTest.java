package com.tripwise.common.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.auth.application.dto.LoginResponse;
import com.tripwise.auth.application.dto.RegisterRequest;
import com.tripwise.auth.application.service.AuthService;
import com.tripwise.auth.application.service.GetCurrentUserUseCase;
import com.tripwise.auth.application.service.LogoutUseCase;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationEntryPoint;
import com.tripwise.auth.infrastructure.security.JwtAuthenticationFilter;
import com.tripwise.auth.infrastructure.security.JwtTokenService;
import com.tripwise.auth.presentation.controller.AuthController;
import com.tripwise.common.exception.GlobalExceptionHandler;
import com.tripwise.common.security.SecurityConfig;
import com.tripwise.user.application.dto.UserResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.concurrent.atomic.AtomicInteger;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        value = AuthController.class,
        properties = {
                "tripwise.rate-limit.enabled=true",
                "tripwise.rate-limit.login.capacity=5",
                "tripwise.rate-limit.login.window=PT1M",
                "tripwise.rate-limit.register.capacity=3",
                "tripwise.rate-limit.register.window=PT1M"
        }
)
@Import({
        SecurityConfig.class,
        GlobalExceptionHandler.class,
        JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class,
        RateLimitConfig.class,
        AuthRateLimitInterceptor.class
})
class AuthRateLimitInterceptorTest {

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
    void loginShouldReturn429OnSixthRequestFromSameIp() throws Exception {
        when(authService.login(any())).thenReturn(LoginResponse.builder()
                .accessToken("access-token")
                .refreshToken("refresh-token")
                .tokenType("Bearer")
                .expiresIn(900)
                .build());

        String body = """
                {"email":"limit@example.com","password":"password123"}
                """;

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .header("X-Forwarded-For", "203.0.113.10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Forwarded-For", "203.0.113.10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.errorCode").value("TOO_MANY_REQUESTS"));
    }

    @Test
    void registerShouldReturn429OnFourthRequestFromSameIp() throws Exception {
        AtomicInteger counter = new AtomicInteger(1);
        when(authService.register(any(RegisterRequest.class))).thenAnswer(invocation ->
                UserResponse.builder()
                        .id((long) counter.getAndIncrement())
                        .email("rate" + counter.get() + "@example.com")
                        .fullName("Rate Limited User")
                        .build()
        );

        for (int i = 0; i < 3; i++) {
            RegisterRequest request = RegisterRequest.builder()
                    .email("user" + i + "@example.com")
                    .password("password123")
                    .fullName("Rate Limited User")
                    .build();

            mockMvc.perform(post("/api/v1/auth/register")
                            .header("X-Forwarded-For", "203.0.113.11")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }

        RegisterRequest fourthRequest = RegisterRequest.builder()
                .email("user4@example.com")
                .password("password123")
                .fullName("Rate Limited User")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .header("X-Forwarded-For", "203.0.113.11")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fourthRequest)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.errorCode").value("TOO_MANY_REQUESTS"));
    }
}
