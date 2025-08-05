package com.blockout.users.models.mappers;

import com.blockout.users.models.CustomUser;
import com.blockout.users.models.dto.CustomUserDto;
import org.springframework.stereotype.Component;

@Component
public class CustomUserMapperImpl implements CustomUserMapper {

    private final UserFavoriteMapper userFavoriteMapper;

    public CustomUserMapperImpl(UserFavoriteMapper userFavoriteMapper) {
        this.userFavoriteMapper = userFavoriteMapper;
    }

    @Override
    public CustomUserDto toDto(CustomUser user) {
        if (user == null) return null;

        return CustomUserDto.builder()
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