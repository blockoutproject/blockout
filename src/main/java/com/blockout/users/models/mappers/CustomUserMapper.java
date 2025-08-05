package com.blockout.users.models.mappers;

import com.blockout.users.models.CustomUser;
import com.blockout.users.models.dto.CustomUserDto;

public interface CustomUserMapper {
    CustomUserDto toDto(CustomUser user);
}