package com.tripwise.user.application.dto;

import com.tripwise.user.domain.enums.Role;
import com.tripwise.user.domain.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String email;
    private String fullName;
    private Role role;
    private UserStatus status;
    private Instant createdAt;
    private Instant updatedAt;
}
