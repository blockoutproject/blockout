package com.blockout.users.models.mappers;

import com.blockout.users.models.UserFavorite;
import com.blockout.users.models.dto.UserFavoriteDto;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class UserFavoriteMapperImpl implements UserFavoriteMapper {

    @Override
    public UserFavoriteDto toDto(UserFavorite favorite) {
        if (favorite == null) return null;

        return UserFavoriteDto.builder()
                .entityType(favorite.getEntityType())
                .entityId(favorite.getEntityId())
                .build();
    }

    @Override
    public List<UserFavoriteDto> toDtoList(List<UserFavorite> favorites) {
        if (favorites == null) return null;

        return favorites.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }
}