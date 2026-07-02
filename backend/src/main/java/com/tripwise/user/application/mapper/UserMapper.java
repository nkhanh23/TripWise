package com.tripwise.user.application.mapper;

import com.tripwise.user.application.dto.UserResponse;
import com.tripwise.user.domain.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface UserMapper {
    UserResponse toResponse(User user);
}
