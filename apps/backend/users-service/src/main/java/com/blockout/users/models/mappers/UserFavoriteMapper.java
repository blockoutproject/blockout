package com.blockout.users.models.mappers;

import com.blockout.users.models.dto.UserFavoriteDTO;
import com.blockout.users.models.entities.UserFavorite;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

@Component
public class UserFavoriteMapper {

    public UserFavoriteDTO toDto(UserFavorite favorite) {
        if (favorite == null) return null;

        return UserFavoriteDTO.builder()
                .entityType(favorite.getEntityType())
                .entityId(favorite.getEntityId())
                .build();
    }

    public List<UserFavoriteDTO> toDtoList(List<UserFavorite> favorites) {
        if (favorites == null) return null;

        return favorites.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }
}