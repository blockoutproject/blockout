package com.blockout.users.models.mappers;

import com.blockout.users.models.UserFavorite;
import com.blockout.users.models.dto.UserFavoriteDto;

import java.util.List;

public interface UserFavoriteMapper {
    UserFavoriteDto toDto(UserFavorite favorite);
    List<UserFavoriteDto> toDtoList(List<UserFavorite> favorites);
}