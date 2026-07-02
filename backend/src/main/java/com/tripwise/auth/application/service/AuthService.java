package com.tripwise.auth.application.service;

import com.tripwise.auth.application.dto.LoginRequest;
import com.tripwise.auth.application.dto.LoginResponse;
import com.tripwise.auth.application.dto.RefreshRequest;
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
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final JwtTokenService jwtTokenService;
    private final JwtProperties jwtProperties;
    private final RefreshTokenService refreshTokenService;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already exists");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);

        return userMapper.toResponse(savedUser);
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("User account is not active");
        }

        return LoginResponse.builder()
                .accessToken(jwtTokenService.generateAccessToken(user))
                .refreshToken(refreshTokenService.issueRefreshToken(user))
                .tokenType("Bearer")
                .expiresIn(jwtProperties.getAccessTokenExpiration().toSeconds())
                .build();
    }

    @Transactional
    public LoginResponse refresh(RefreshRequest request) {
        return refreshTokenService.rotateRefreshToken(request.getRefreshToken());
    }
}
