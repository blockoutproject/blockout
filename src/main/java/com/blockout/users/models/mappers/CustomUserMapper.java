package com.blockout.users.models.mappers;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.blockout.users.models.CustomUser;
import com.blockout.users.models.dto.CustomUserDto;

@Mapper(componentModel = "spring", uses = {UserFavoriteMapper.class})
public interface CustomUserMapper {
    @Mapping(source = "favorites", target = "favorites")
    CustomUserDto toDto(CustomUser user);
}