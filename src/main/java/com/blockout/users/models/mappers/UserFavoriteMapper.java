package com.blockout.users.models.mappers;

import com.blockout.users.models.UserFavorite;
import com.blockout.users.models.dto.UserFavoriteDto;

import java.util.List;

import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserFavoriteMapper {
    UserFavoriteDto toDto(UserFavorite favorite);
    List<UserFavoriteDto> toDtoList(List<UserFavorite> favorites);
}