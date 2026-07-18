package com.blockout.users.favorite.persistence;

import com.blockout.users.favorite.application.FavoriteView;
import com.blockout.users.models.entities.UserFavorite;
import com.blockout.users.shared.mapping.UsersMapperConfig;
import org.mapstruct.Mapper;

/** Maps favorite persistence state to immutable application projections. */
@Mapper(config = UsersMapperConfig.class)
public interface FavoritePersistenceMapper {

    FavoriteView toView(UserFavorite favorite);
}
