package com.blockout.users.favorite.application;

import com.blockout.users.models.entities.UserFavorite;
import com.blockout.users.shared.mapping.UsersMapperConfig;
import org.mapstruct.Mapper;

/** Maps persistence-owned favorite rows to immutable application views. */
@Mapper(config = UsersMapperConfig.class)
public interface FavoritePersistenceMapper {

    /** Maps one persisted favorite without exposing its owner entity. */
    FavoriteView toView(UserFavorite favorite);
}
