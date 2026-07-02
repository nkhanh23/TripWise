package com.tripwise.auth.application.service;

import com.tripwise.auth.application.dto.LogoutRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LogoutUseCase {

    private final RefreshTokenService refreshTokenService;

    @Transactional
    public void execute(LogoutRequest request) {
        refreshTokenService.revokeRefreshToken(request.getRefreshToken());
    }
}
