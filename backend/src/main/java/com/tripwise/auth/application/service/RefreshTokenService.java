package com.tripwise.auth.application.service;

import com.tripwise.auth.application.dto.LoginResponse;
import com.tripwise.auth.domain.entity.RefreshToken;
import com.tripwise.auth.infrastructure.persistence.repository.RefreshTokenRepository;
import com.tripwise.auth.infrastructure.security.JwtProperties;
import com.tripwise.auth.infrastructure.security.JwtTokenService;
import com.tripwise.common.exception.UnauthorizedException;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.UserStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenService jwtTokenService;
    private final JwtProperties jwtProperties;
    private final Clock clock;
    private final SecureRandom secureRandom;

    @Autowired
    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
                               JwtTokenService jwtTokenService,
                               JwtProperties jwtProperties) {
        this(refreshTokenRepository, jwtTokenService, jwtProperties, Clock.systemUTC(), new SecureRandom());
    }

    RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
                        JwtTokenService jwtTokenService,
                        JwtProperties jwtProperties,
                        Clock clock,
                        SecureRandom secureRandom) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtTokenService = jwtTokenService;
        this.jwtProperties = jwtProperties;
        this.clock = clock;
        this.secureRandom = secureRandom;
    }

    @Transactional
    public String issueRefreshToken(User user) {
        Instant now = clock.instant();
        String rawToken = generateRawToken();

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(hashToken(rawToken))
                .expiresAt(now.plus(jwtProperties.getRefreshTokenExpiration()))
                .build();

        refreshTokenRepository.save(refreshToken);
        return rawToken;
    }

    @Transactional
    public LoginResponse rotateRefreshToken(String rawRefreshToken) {
        Instant now = clock.instant();
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken))
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (refreshToken.isRevoked()) {
            refreshTokenRepository.revokeAllActiveTokensByUserId(refreshToken.getUser().getId(), now);
            throw new UnauthorizedException("Refresh token has been revoked");
        }

        if (refreshToken.isExpired(now)) {
            refreshToken.setRevokedAt(now);
            refreshTokenRepository.save(refreshToken);
            throw new UnauthorizedException("Refresh token has expired");
        }

        User user = refreshToken.getUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            refreshToken.setRevokedAt(now);
            refreshTokenRepository.save(refreshToken);
            throw new UnauthorizedException("User account is not active");
        }

        refreshToken.setRevokedAt(now);
        refreshTokenRepository.save(refreshToken);

        String newRefreshToken = issueRefreshToken(user);

        return LoginResponse.builder()
                .accessToken(jwtTokenService.generateAccessToken(user))
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtProperties.getAccessTokenExpiration().toSeconds())
                .build();
    }

    @Transactional
    public void revokeRefreshToken(String rawRefreshToken) {
        Instant now = clock.instant();
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(hashToken(rawRefreshToken))
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (refreshToken.isRevoked()) {
            throw new UnauthorizedException("Refresh token has been revoked");
        }

        refreshToken.setRevokedAt(now);
        refreshTokenRepository.save(refreshToken);
    }

    String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hashed.length * 2);
            for (byte value : hashed) {
                builder.append(String.format("%02x", value));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm is not available", ex);
        }
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
