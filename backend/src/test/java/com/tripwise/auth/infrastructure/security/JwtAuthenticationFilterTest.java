package com.tripwise.auth.infrastructure.security;

import com.tripwise.common.exception.GlobalExceptionHandler;
import com.tripwise.common.security.SecurityConfig;
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

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
        TestProtectedController.class,
        com.tripwise.presentation.HealthController.class
})
@Import({
        SecurityConfig.class,
        JwtAuthenticationFilter.class,
        JwtAuthenticationEntryPoint.class,
        GlobalExceptionHandler.class
})
class JwtAuthenticationFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Test
    void protectedEndpointShouldReturn401WhenTokenMissing() throws Exception {
        mockMvc.perform(get("/api/v1/test/protected")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void protectedEndpointShouldReturn401WhenTokenInvalid() throws Exception {
        when(jwtTokenService.validateToken("invalid-token")).thenReturn(false);

        mockMvc.perform(get("/api/v1/test/protected")
                        .header("Authorization", "Bearer invalid-token")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid or expired access token"));
    }

    @Test
    void protectedEndpointShouldReturn200WhenTokenValid() throws Exception {
        UserDetails userDetails = User.builder()
                .username("traveler@tripwise.com")
                .password("hashedPassword")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_USER")))
                .build();

        when(jwtTokenService.validateToken("valid-token")).thenReturn(true);
        when(jwtTokenService.extractEmail("valid-token")).thenReturn("traveler@tripwise.com");
        when(userDetailsService.loadUserByUsername("traveler@tripwise.com")).thenReturn(userDetails);

        mockMvc.perform(get("/api/v1/test/protected")
                        .header("Authorization", "Bearer valid-token")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.authenticated").value(true))
                .andExpect(jsonPath("$.data.username").value("traveler@tripwise.com"));
    }

    @Test
    void publicEndpointShouldRemainAccessibleWithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/health")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"));
    }
}
