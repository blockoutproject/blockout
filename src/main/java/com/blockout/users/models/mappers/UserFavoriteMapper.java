package com.blockout.users.models.mappers;

import com.blockout.users.models.UserFavorite;
import com.blockout.users.models.dto.UserFavoriteDto;

import java.util.List;
import java.util.stream.Collectors;

public class UserFavoriteMapper {

    public UserFavoriteDto toDto(UserFavorite favorite) {
        if (favorite == null) return null;

        return UserFavoriteDto.builder()
                .entityType(favorite.getEntityType())
                .entityId(favorite.getEntityId())
                .build();
    }

    public List<UserFavoriteDto> toDtoList(List<UserFavorite> favorites) {
        if (favorites == null) return null;

        return favorites.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }
}