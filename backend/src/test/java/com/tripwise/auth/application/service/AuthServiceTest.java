package com.tripwise.auth.application.service;

import com.tripwise.auth.application.dto.LoginRequest;
import com.tripwise.auth.application.dto.LoginResponse;
import com.tripwise.auth.application.dto.RegisterRequest;
import com.tripwise.auth.infrastructure.security.JwtProperties;
import com.tripwise.auth.infrastructure.security.JwtTokenService;
import com.tripwise.common.exception.ConflictException;
import com.tripwise.common.exception.UnauthorizedException;
import com.tripwise.user.application.dto.UserResponse;
import com.tripwise.user.application.mapper.UserMapper;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.Role;
import com.tripwise.user.domain.enums.UserStatus;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private UserMapper userMapper;

    @Mock
    private JwtTokenService jwtTokenService;

    @Mock
    private JwtProperties jwtProperties;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private AuthService authService;

    @Test
    void register_ShouldReturnUserResponse_WhenEmailIsUnique() {
        // Arrange
        RegisterRequest request = RegisterRequest.builder()
                .email("test@example.com")
                .password("password123")
                .fullName("Test User")
                .build();

        User savedUser = User.builder()
                .id(1L)
                .email(request.getEmail())
                .passwordHash("hashedPassword")
                .fullName(request.getFullName())
                .role(Role.USER)
                .build();

        UserResponse userResponse = UserResponse.builder()
                .id(1L)
                .email(request.getEmail())
                .fullName(request.getFullName())
                .role(Role.USER)
                .build();

        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(request.getPassword())).thenReturn("hashedPassword");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(userMapper.toResponse(savedUser)).thenReturn(userResponse);

        // Act
        UserResponse result = authService.register(request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_ShouldThrowConflictException_WhenEmailExists() {
        // Arrange
        RegisterRequest request = RegisterRequest.builder()
                .email("test@example.com")
                .password("password123")
                .fullName("Test User")
                .build();

        when(userRepository.existsByEmail(request.getEmail())).thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Email already exists");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void login_ShouldReturnAccessToken_WhenCredentialsAreValid() {
        LoginRequest request = LoginRequest.builder()
                .email("test@example.com")
                .password("password123")
                .build();

        User user = User.builder()
                .id(1L)
                .email(request.getEmail())
                .passwordHash("hashedPassword")
                .fullName("Test User")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();

        when(userRepository.findByEmail(request.getEmail())).thenReturn(java.util.Optional.of(user));
        when(passwordEncoder.matches(request.getPassword(), user.getPasswordHash())).thenReturn(true);
        when(jwtTokenService.generateAccessToken(user)).thenReturn("jwt-token");
        when(refreshTokenService.issueRefreshToken(user)).thenReturn("refresh-token");
        when(jwtProperties.getAccessTokenExpiration()).thenReturn(java.time.Duration.ofMinutes(15));

        LoginResponse result = authService.login(request);

        assertThat(result).isNotNull();
        assertThat(result.getAccessToken()).isEqualTo("jwt-token");
        assertThat(result.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(result.getTokenType()).isEqualTo("Bearer");
        assertThat(result.getExpiresIn()).isEqualTo(900);
    }

    @Test
    void refresh_ShouldDelegateToRefreshTokenService() {
        com.tripwise.auth.application.dto.RefreshRequest request = com.tripwise.auth.application.dto.RefreshRequest.builder()
                .refreshToken("old-refresh-token")
                .build();

        LoginResponse response = LoginResponse.builder()
                .accessToken("new-access-token")
                .refreshToken("new-refresh-token")
                .tokenType("Bearer")
                .expiresIn(900)
                .build();

        when(refreshTokenService.rotateRefreshToken("old-refresh-token")).thenReturn(response);

        LoginResponse result = authService.refresh(request);

        assertThat(result.getAccessToken()).isEqualTo("new-access-token");
        assertThat(result.getRefreshToken()).isEqualTo("new-refresh-token");
    }

    @Test
    void login_ShouldThrowUnauthorizedException_WhenEmailDoesNotExist() {
        LoginRequest request = LoginRequest.builder()
                .email("missing@example.com")
                .password("password123")
                .build();

        when(userRepository.findByEmail(request.getEmail())).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid email or password");
    }

    @Test
    void login_ShouldThrowUnauthorizedException_WhenPasswordIsInvalid() {
        LoginRequest request = LoginRequest.builder()
                .email("test@example.com")
                .password("wrong-password")
                .build();

        User user = User.builder()
                .id(1L)
                .email(request.getEmail())
                .passwordHash("hashedPassword")
                .status(UserStatus.ACTIVE)
                .build();

        when(userRepository.findByEmail(request.getEmail())).thenReturn(java.util.Optional.of(user));
        when(passwordEncoder.matches(request.getPassword(), user.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid email or password");
    }

    @Test
    void login_ShouldThrowUnauthorizedException_WhenUserIsInactive() {
        LoginRequest request = LoginRequest.builder()
                .email("test@example.com")
                .password("password123")
                .build();

        User user = User.builder()
                .id(1L)
                .email(request.getEmail())
                .passwordHash("hashedPassword")
                .status(UserStatus.INACTIVE)
                .build();

        when(userRepository.findByEmail(request.getEmail())).thenReturn(java.util.Optional.of(user));
        when(passwordEncoder.matches(request.getPassword(), user.getPasswordHash())).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("User account is not active");
    }
}
