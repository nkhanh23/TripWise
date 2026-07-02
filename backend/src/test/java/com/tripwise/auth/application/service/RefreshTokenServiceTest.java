package com.tripwise.auth.application.service;

import com.tripwise.auth.application.dto.LoginResponse;
import com.tripwise.auth.domain.entity.RefreshToken;
import com.tripwise.auth.infrastructure.persistence.repository.RefreshTokenRepository;
import com.tripwise.auth.infrastructure.security.JwtProperties;
import com.tripwise.auth.infrastructure.security.JwtTokenService;
import com.tripwise.common.exception.UnauthorizedException;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.Role;
import com.tripwise.user.domain.enums.UserStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private JwtTokenService jwtTokenService;

    @Mock
    private JwtProperties jwtProperties;

    private final Clock clock = Clock.fixed(Instant.parse("2026-07-01T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void issueRefreshToken_ShouldSaveHashedTokenAndReturnRawToken() {
        RefreshTokenService refreshTokenService = new RefreshTokenService(
                refreshTokenRepository,
                jwtTokenService,
                jwtProperties,
                clock,
                new SecureRandom()
        );

        User user = activeUser();
        when(jwtProperties.getRefreshTokenExpiration()).thenReturn(Duration.ofDays(7));

        String rawToken = refreshTokenService.issueRefreshToken(user);

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());

        assertThat(rawToken).isNotBlank();
        assertThat(captor.getValue().getUser()).isEqualTo(user);
        assertThat(captor.getValue().getTokenHash()).isEqualTo(refreshTokenService.hashToken(rawToken));
        assertThat(captor.getValue().getExpiresAt()).isEqualTo(Instant.parse("2026-07-08T00:00:00Z"));
    }

    @Test
    void rotateRefreshToken_ShouldRevokeOldTokenAndIssueNewTokens() {
        RefreshTokenService refreshTokenService = new RefreshTokenService(
                refreshTokenRepository,
                jwtTokenService,
                jwtProperties,
                clock,
                new SecureRandom()
        );

        User user = activeUser();
        RefreshToken storedToken = RefreshToken.builder()
                .id(10L)
                .user(user)
                .tokenHash(refreshTokenService.hashToken("old-refresh-token"))
                .expiresAt(Instant.parse("2026-07-08T00:00:00Z"))
                .build();

        when(jwtProperties.getRefreshTokenExpiration()).thenReturn(Duration.ofDays(7));
        when(jwtProperties.getAccessTokenExpiration()).thenReturn(Duration.ofMinutes(15));
        when(jwtTokenService.generateAccessToken(user)).thenReturn("new-access-token");
        when(refreshTokenRepository.findByTokenHash(refreshTokenService.hashToken("old-refresh-token")))
                .thenReturn(Optional.of(storedToken));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LoginResponse response = refreshTokenService.rotateRefreshToken("old-refresh-token");

        assertThat(storedToken.getRevokedAt()).isEqualTo(Instant.parse("2026-07-01T00:00:00Z"));
        assertThat(response.getAccessToken()).isEqualTo("new-access-token");
        assertThat(response.getRefreshToken()).isNotBlank().isNotEqualTo("old-refresh-token");
        verify(refreshTokenRepository, atLeast(2)).save(any(RefreshToken.class));
    }

    @Test
    void rotateRefreshToken_ShouldRejectRevokedTokenAndRevokeActiveFamily() {
        RefreshTokenService refreshTokenService = new RefreshTokenService(
                refreshTokenRepository,
                jwtTokenService,
                jwtProperties,
                clock,
                new SecureRandom()
        );

        User user = activeUser();
        RefreshToken storedToken = RefreshToken.builder()
                .id(11L)
                .user(user)
                .tokenHash(refreshTokenService.hashToken("revoked-token"))
                .expiresAt(Instant.parse("2026-07-08T00:00:00Z"))
                .revokedAt(Instant.parse("2026-07-01T00:00:00Z"))
                .build();

        when(refreshTokenRepository.findByTokenHash(refreshTokenService.hashToken("revoked-token")))
                .thenReturn(Optional.of(storedToken));

        assertThatThrownBy(() -> refreshTokenService.rotateRefreshToken("revoked-token"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Refresh token has been revoked");

        verify(refreshTokenRepository).revokeAllActiveTokensByUserId(eq(user.getId()), eq(Instant.parse("2026-07-01T00:00:00Z")));
    }

    @Test
    void rotateRefreshToken_ShouldRejectExpiredToken() {
        RefreshTokenService refreshTokenService = new RefreshTokenService(
                refreshTokenRepository,
                jwtTokenService,
                jwtProperties,
                clock,
                new SecureRandom()
        );

        User user = activeUser();
        RefreshToken storedToken = RefreshToken.builder()
                .id(12L)
                .user(user)
                .tokenHash(refreshTokenService.hashToken("expired-token"))
                .expiresAt(Instant.parse("2026-06-30T23:59:59Z"))
                .build();

        when(refreshTokenRepository.findByTokenHash(refreshTokenService.hashToken("expired-token")))
                .thenReturn(Optional.of(storedToken));

        assertThatThrownBy(() -> refreshTokenService.rotateRefreshToken("expired-token"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Refresh token has expired");

        verify(refreshTokenRepository).save(storedToken);
    }

    @Test
    void rotateRefreshToken_ShouldRejectUnknownToken() {
        RefreshTokenService refreshTokenService = new RefreshTokenService(
                refreshTokenRepository,
                jwtTokenService,
                jwtProperties,
                clock,
                new SecureRandom()
        );

        when(refreshTokenRepository.findByTokenHash(refreshTokenService.hashToken("missing-token")))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> refreshTokenService.rotateRefreshToken("missing-token"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid refresh token");
    }

    @Test
    void revokeRefreshToken_ShouldMarkTokenAsRevoked() {
        RefreshTokenService refreshTokenService = new RefreshTokenService(
                refreshTokenRepository,
                jwtTokenService,
                jwtProperties,
                clock,
                new SecureRandom()
        );

        User user = activeUser();
        RefreshToken storedToken = RefreshToken.builder()
                .id(13L)
                .user(user)
                .tokenHash(refreshTokenService.hashToken("logout-token"))
                .expiresAt(Instant.parse("2026-07-08T00:00:00Z"))
                .build();

        when(refreshTokenRepository.findByTokenHash(refreshTokenService.hashToken("logout-token")))
                .thenReturn(Optional.of(storedToken));

        refreshTokenService.revokeRefreshToken("logout-token");

        assertThat(storedToken.getRevokedAt()).isEqualTo(Instant.parse("2026-07-01T00:00:00Z"));
        verify(refreshTokenRepository).save(storedToken);
    }

    @Test
    void revokeRefreshToken_ShouldRejectAlreadyRevokedToken() {
        RefreshTokenService refreshTokenService = new RefreshTokenService(
                refreshTokenRepository,
                jwtTokenService,
                jwtProperties,
                clock,
                new SecureRandom()
        );

        User user = activeUser();
        RefreshToken storedToken = RefreshToken.builder()
                .id(14L)
                .user(user)
                .tokenHash(refreshTokenService.hashToken("revoked-logout-token"))
                .expiresAt(Instant.parse("2026-07-08T00:00:00Z"))
                .revokedAt(Instant.parse("2026-07-01T00:00:00Z"))
                .build();

        when(refreshTokenRepository.findByTokenHash(refreshTokenService.hashToken("revoked-logout-token")))
                .thenReturn(Optional.of(storedToken));

        assertThatThrownBy(() -> refreshTokenService.revokeRefreshToken("revoked-logout-token"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Refresh token has been revoked");
    }

    private User activeUser() {
        return User.builder()
                .id(1L)
                .email("traveler@tripwise.com")
                .passwordHash("hashedPassword")
                .fullName("Trip Wise")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();
    }
}
