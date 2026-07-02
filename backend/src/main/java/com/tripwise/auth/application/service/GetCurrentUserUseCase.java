package com.tripwise.auth.application.service;

import com.tripwise.common.exception.UnauthorizedException;
import com.tripwise.user.application.dto.UserResponse;
import com.tripwise.user.application.mapper.UserMapper;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.UserStatus;
import com.tripwise.user.infrastructure.persistence.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GetCurrentUserUseCase {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public UserResponse execute(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("User account is not active");
        }

        return userMapper.toResponse(user);
    }
}
