package com.blockout.users.models.mappers;

import org.springframework.stereotype.Component;

import com.blockout.users.models.CustomUser;
import com.blockout.users.models.dto.CustomUserDTO;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CustomUserMapper {

    private final UserFavoriteMapper userFavoriteMapper;

    public CustomUserDTO toDto(CustomUser user) {
        if (user == null) return null;

        return CustomUserDTO.builder()
                .id(user.getId())
                .auth0Id(user.getAuth0Id())
                .email(user.getEmail())
                .pseudo(user.getPseudo())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .pictureUrl(user.getPictureUrl())
                .phoneNumber(user.getPhoneNumber())
                .active(user.getActive())
                .createdAt(user.getCreatedAt())
                .lastUpdate(user.getLastUpdate())
                .favorites(userFavoriteMapper.toDtoList(user.getFavorites()))
                .build();
    }
}