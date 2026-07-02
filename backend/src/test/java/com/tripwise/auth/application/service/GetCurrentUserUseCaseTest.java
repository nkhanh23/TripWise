package com.tripwise.auth.application.service;

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

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GetCurrentUserUseCaseTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private GetCurrentUserUseCase getCurrentUserUseCase;

    @Test
    void execute_ShouldReturnUserResponse_WhenUserExistsAndActive() {
        User user = User.builder()
                .id(1L)
                .email("traveler@tripwise.com")
                .fullName("Trip Wise")
                .passwordHash("hashedPassword")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();

        UserResponse response = UserResponse.builder()
                .id(1L)
                .email("traveler@tripwise.com")
                .fullName("Trip Wise")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();

        when(userRepository.findByEmail("traveler@tripwise.com")).thenReturn(Optional.of(user));
        when(userMapper.toResponse(user)).thenReturn(response);

        UserResponse result = getCurrentUserUseCase.execute("traveler@tripwise.com");

        assertThat(result.getEmail()).isEqualTo("traveler@tripwise.com");
        assertThat(result.getFullName()).isEqualTo("Trip Wise");
    }

    @Test
    void execute_ShouldThrowUnauthorizedException_WhenUserDoesNotExist() {
        when(userRepository.findByEmail("missing@tripwise.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> getCurrentUserUseCase.execute("missing@tripwise.com"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Authenticated user not found");
    }

    @Test
    void execute_ShouldThrowUnauthorizedException_WhenUserIsInactive() {
        User user = User.builder()
                .email("inactive@tripwise.com")
                .passwordHash("hashedPassword")
                .status(UserStatus.INACTIVE)
                .build();

        when(userRepository.findByEmail("inactive@tripwise.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> getCurrentUserUseCase.execute("inactive@tripwise.com"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("User account is not active");
    }
}
