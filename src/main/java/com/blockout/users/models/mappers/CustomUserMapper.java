package com.blockout.users.models.mappers;

import org.mapstruct.Mapper;

import com.blockout.users.models.CustomUser;
import com.blockout.users.models.dto.CustomUserDto;

@Mapper(componentModel = "spring", uses = {UserFavoriteMapper.class})
public interface CustomUserMapper {
    CustomUserDto toDto(CustomUser user);
}